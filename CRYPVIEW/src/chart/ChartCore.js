// ============================================================
//  src/chart/ChartCore.js — CrypView V2
//  Classe TradingChart : cycle de vie complet d'un graphique.
//
//  Responsabilités :
//    - Initialisation LightweightCharts
//    - Chargement historique REST
//    - Connexion / reconnexion des WebSockets
//    - Mise à jour du buffer candles[] via Sliding Window
//    - Communication vers la page via CustomEvents (pas de DOM direct)
//    - Nettoyage complet via destroy()
//
//  Ce que cette classe NE fait PAS :
//    - Toucher au DOM (textContent, classList, getElementById…)
//    - Gérer les indicateurs (→ ChartIndicators.js — Phase 3)
//    - Gérer les drawings (→ ChartDrawing.js — Phase 3)
// ============================================================

import { COLORS, MAX_CANDLES_IN_MEMORY, baseChartOptions, TF_API_MAP, CHART_THEMES } from '../config.js';
import { fetchKlines, parseKlines }           from '../api/binance.rest.js';
import { createKlineStream, createTickerStream, createTradeStream } from '../api/binance.ws.js';
import { showToast }                          from '../utils/toast.js';
import { fmtPrice, fmtTime }                  from '../utils/format.js';

// ── Sliding Window ────────────────────────────────────────────
//
// MAX_CANDLES_IN_MEMORY est importé depuis config.js (actuellement 800).
// Pour modifier la limite globale, éditer uniquement config.js.
//
// RESYNC_BATCH : nombre d'évictions accumulées avant de rappeler setData()
// sur les séries LightweightCharts. LW gère son propre tableau interne
// indépendamment de this.candles ; sans resync périodique, la série LW
// grossirait sans limite même si this.candles est borné.
// → 50 est un bon compromis : resync ~toutes les 50 nouvelles bougies fermées,
//   soit plusieurs heures sur un TF 1m, quelques jours sur un TF 1h.
const RESYNC_BATCH = 50;

export class TradingChart {
  // ── État public (lecture seule depuis l'extérieur) ────────
  /** @type {string} Symbole actif en minuscules, ex: 'btcusdt' */
  symbol;
  /** @type {string} Timeframe actif, ex: '1m' */
  timeframe;
  /** @type {Candle[]} Buffer borné à MAX_CANDLES_IN_MEMORY bougies */
  candles = [];

  // ── Références LightweightCharts ─────────────────────────
  /** @type {IChartApi|null} */
  chart   = null;
  /** @type {ISeriesApi|null} Série candlestick principale */
  cSeries = null;
  /** @type {ISeriesApi|null} Série volume histogramme */
  vSeries = null;

  // ── Gestionnaires WebSocket ───────────────────────────────
  #wsKline   = null;   // stream kline (bougies live)
  #wsTicker  = null;   // stream ticker 24h (stats du jour)
  #wsTrades  = null;   // stream trades (sidebar "trades récents")

  // ── Sliding Window — compteur d'évictions ─────────────────
  //
  // Incrémenté à chaque fois qu'une bougie est retirée du début du tableau
  // (this.candles.shift()). Quand il atteint RESYNC_BATCH, on déclenche
  // une resynchronisation complète des séries LightweightCharts via setData()
  // pour purger leur buffer interne, puis on remet le compteur à 0.
  #evictedCount = 0;

  // ── Divers ────────────────────────────────────────────────
  #container      = null;
  #resizeObserver = null;
  #lastPrice      = null;
  #open24         = null;
  #themeHandler   = null;

  /**
   * @param {HTMLElement} container  — Élément DOM qui accueille le graphique
   * @param {string}      symbol     — Symbole Binance initial, ex: 'btcusdt'
   * @param {string}      timeframe  — Timeframe initial, ex: '1s'
   */
  constructor(container, symbol, timeframe) {
    this.#container = container;
    this.symbol     = symbol.toLowerCase();
    this.timeframe  = timeframe;
    this.#initChart();
  }

  // ══════════════════════════════════════════════════════════
  //  API PUBLIQUE
  // ══════════════════════════════════════════════════════════

  /**
   * Démarre le graphique : charge l'historique REST puis ouvre les flux WS.
   * Point d'entrée à appeler juste après le constructeur.
   * @returns {Promise<void>}
   */
  async start() {
    this.#emit('status', { state: 'loading', symbol: this.symbol, timeframe: this.timeframe });
    await this.#loadHistory();
    this.#connectKlineStream();
    this.#connectTickerStream();
    this.#connectTradeStream();
  }

  /**
   * Change le symbole affiché, réinitialise tout et redémarre.
   * @param {string} newSymbol — Ex: 'ethusdt'
   * @returns {Promise<void>}
   */
  async changeSymbol(newSymbol) {
    this.symbol       = newSymbol.toLowerCase();
    this.candles      = [];
    this.#evictedCount = 0;   // Reset du compteur d'évictions sur changement de contexte
    this.#lastPrice   = null;
    this.#open24      = null;
    await this.start();
  }

  /**
   * Change le timeframe et recharge l'historique.
   * Le stream kline est remplacé par un nouveau sur le bon interval.
   * @param {string} newTf — Ex: '4h'
   * @returns {Promise<void>}
   */
  async changeTimeframe(newTf) {
    this.timeframe    = newTf;
    this.candles      = [];
    this.#evictedCount = 0;   // Reset du compteur d'évictions sur changement de contexte
    await this.#loadHistory();
    // Remplace le stream kline sans toucher aux streams ticker/trades
    this.#connectKlineStream();
  }

  /**
   * Libère TOUTES les ressources de cette instance.
   * Obligatoire avant de naviguer vers une autre page ou de recréer un graphique.
   */
  destroy() {
    document.removeEventListener('crypview:theme:change', this.#themeHandler);
    this.#wsKline?.destroy();
    this.#wsTicker?.destroy();
    this.#wsTrades?.destroy();
    this.#resizeObserver?.disconnect();
    try { this.chart?.remove(); } catch (_) {}
    this.chart        = null;
    this.cSeries      = null;
    this.vSeries      = null;
    this.candles      = [];
    this.#evictedCount = 0;
  }

  // ══════════════════════════════════════════════════════════
  //  INITIALISATION INTERNE
  // ══════════════════════════════════════════════════════════

  /**
   * Crée et configure l'instance LightweightCharts dans le container.
   * Appelé une seule fois dans le constructeur.
   */
  #initChart() {
    if (this.chart) {
      try { this.chart.remove(); } catch (_) {}
    }

    const opts = baseChartOptions(this.#container);
    opts.rightPriceScale.scaleMargins = { top: 0.08, bottom: 0.22 };
    this.chart = LightweightCharts.createChart(this.#container, opts);

    // Série principale : chandeliers japonais
    this.cSeries = this.chart.addCandlestickSeries({
      upColor:         COLORS.GREEN,
      downColor:       COLORS.RED,
      borderUpColor:   COLORS.GREEN,
      borderDownColor: COLORS.RED,
      wickUpColor:     COLORS.GREEN_MID,
      wickDownColor:   COLORS.RED_MID,
    });

    // Série secondaire : volume en histogramme sur axe dédié
    this.vSeries = this.chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol',
    });
    this.chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.83, bottom: 0 },
    });

    // Redimensionnement réactif
    this.#resizeObserver = new ResizeObserver(() => {
      if (!this.chart) return;
      this.chart.applyOptions({
        width:  this.#container.clientWidth,
        height: this.#container.clientHeight,
      });
    });
    this.#resizeObserver.observe(this.#container);

    // Thème initial + listener
    const initTheme = localStorage.getItem('crypview-theme') ?? 'dark';
    this.chart.applyOptions(CHART_THEMES[initTheme] ?? CHART_THEMES.dark);

    if (this.#themeHandler) {
      document.removeEventListener('crypview:theme:change', this.#themeHandler);
    }
    this.#themeHandler = ({ detail }) => {
      this.chart?.applyOptions(CHART_THEMES[detail.theme] ?? CHART_THEMES.dark);
    };
    document.addEventListener('crypview:theme:change', this.#themeHandler);
  }

  // ══════════════════════════════════════════════════════════
  //  CHARGEMENT HISTORIQUE
  // ══════════════════════════════════════════════════════════

  /**
   * Charge les bougies historiques via l'API REST Binance.
   * ── SLIDING WINDOW à l'initialisation ──────────────────────
   * parseKlines() peut retourner jusqu'à 1000 bougies (limite Binance).
   * On tronque immédiatement au dernier MAX_CANDLES_IN_MEMORY éléments
   * avec .slice() pour que le buffer parte déjà dans la limite cible.
   * Cela évite aussi que les indicateurs (VWAP, Ichimoku) calculent sur
   * un historique plus grand que ce que le WS maintiendra ensuite.
   */
  async #loadHistory() {
    try {
      const raw = await fetchKlines(this.symbol, this.timeframe);

      // ── Truncation historique ──────────────────────────────
      // .slice(-N) est O(1) en termes d'allocation : il retourne une vue
      // sur les N derniers éléments sans recopier l'intégralité du tableau.
      // Si raw contient moins de MAX_CANDLES_IN_MEMORY bougies, slice(-N)
      // retourne simplement le tableau complet — aucun effet de bord.
      this.candles      = parseKlines(raw).slice(-MAX_CANDLES_IN_MEMORY);
      this.#evictedCount = 0;   // Nouveau contexte : compteur remis à zéro

      // Alimentation des séries LW avec le tableau déjà borné
      this.cSeries.setData(this.candles.map((c) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      this.vSeries.setData(this.candles.map((c) => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
      })));

      this.#emit('history:loaded', { candles: this.candles });

    } catch (err) {
      const msg = location.protocol === 'file:'
        ? 'Erreur CORS — utilise un serveur local (http://localhost) pour charger l\'historique.'
        : `Historique indisponible : ${err.message}. Passage en mode live seul.`;
      showToast(msg, 'error');
      this.candles      = [];
      this.#evictedCount = 0;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  FLUX WEBSOCKET
  // ══════════════════════════════════════════════════════════

  /**
   * Ouvre (ou remplace) le stream kline pour le symbole et timeframe courants.
   */
  #connectKlineStream() {
    this.#wsKline?.destroy();
    this.#wsKline = createKlineStream(this.symbol, this.timeframe);

    this.#wsKline.onOpen = () => {
      this.#emit('status', { state: 'live' });
    };

    this.#wsKline.onMessage = (data) => {
      const k = data.k;
      if (!k) return;

      const candle = {
        time:   Math.floor(k.t / 1000),
        open:   +k.o,
        high:   +k.h,
        low:    +k.l,
        close:  +k.c,
        volume: +k.v,
      };

      // Mise à jour des séries LW (try/catch : les séries peuvent être dans
      // un état invalide lors d'un changement de symbole rapide)
      try { this.cSeries.update({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close }); } catch (_) {}
      try {
        this.vSeries.update({
          time:  candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
        });
      } catch (_) {}

      // ── Mise à jour du buffer (Sliding Window) ─────────────
      this.#updateCandleBuffer(candle);

      if (k.x) {
        this.#emit('candle:closed', { candle, candles: this.candles });
      }

      this.#emit('price:update', { price: candle.close, open: candle.open });
      this.#updatePriceDisplay(candle.close);
    };

    this.#wsKline.onClose = () => {
      this.#emit('status', { state: 'reconnecting' });
    };

    this.#wsKline.connect();
  }

  /**
   * Ouvre le stream ticker 24h pour les stats du jour (open/high/low/vol/trades).
   */
  #connectTickerStream() {
    this.#wsTicker?.destroy();
    this.#wsTicker = createTickerStream(this.symbol);

    this.#wsTicker.onMessage = (data) => {
      this.#open24 = +data.o;
      this.#emit('ticker:update', {
        open24:   +data.o,
        high24:   +data.h,
        low24:    +data.l,
        vol24:    +data.v,
        trades24: +data.n,
      });
      if (this.#lastPrice !== null) {
        this.#updatePriceDisplay(this.#lastPrice);
      }
    };

    this.#wsTicker.connect();
  }

  /**
   * Ouvre le stream trades individuels pour la sidebar "Trades récents".
   */
  #connectTradeStream() {
    this.#wsTrades?.destroy();
    this.#wsTrades = createTradeStream(this.symbol);

    this.#wsTrades.onMessage = (data) => {
      this.#emit('trade:new', {
        price:         parseFloat(data.p),
        qty:           parseFloat(data.q),
        isBuy:         !data.m,
        time:          data.T,
        timeFormatted: fmtTime(data.T),
      });
    };

    this.#wsTrades.connect();
  }

  // ══════════════════════════════════════════════════════════
  //  HELPERS INTERNES
  // ══════════════════════════════════════════════════════════

  /**
   * Met à jour le buffer candles[] avec la bougie reçue du stream WS.
   *
   * ── Logique Sliding Window ─────────────────────────────────
   *
   * Cas 1 — Bougie en cours (même timestamp que la dernière) :
   *   On écrase l'entrée sur place. Aucune allocation, O(1).
   *
   * Cas 2 — Nouvelle bougie (timestamp différent) :
   *   a. On push() la bougie à la fin du tableau.
   *   b. Si le tableau dépasse MAX_CANDLES_IN_MEMORY, on shift() la bougie
   *      la plus ancienne (index 0). shift() est O(n) sur les Arrays JS natifs
   *      mais reste très rapide pour n ≤ 1000. Pour n >> 10 000 on utiliserait
   *      plutôt un ring-buffer, mais ici le plafond rend shift() acceptable.
   *   c. On incrémente #evictedCount. Quand il atteint RESYNC_BATCH (50),
   *      on resynchronise les séries LightweightCharts via setData() pour
   *      purger leur buffer interne (LW ne connaît pas notre sliding window).
   *
   * Pourquoi la resync LW est-elle nécessaire ?
   *   LightweightCharts maintient son propre tableau interne alimenté par
   *   chaque appel à series.update(). Sans resync, la série LW contiendrait
   *   potentiellement des milliers de points après plusieurs heures de trading,
   *   consommant de la RAM et ralentissant le rendu GPU — exactement le
   *   problème qu'on cherche à éviter côté this.candles.
   *
   * @param {Candle} candle
   */
  #updateCandleBuffer(candle) {
    const last = this.candles.at(-1);

    if (last && last.time === candle.time) {
      // ── Cas 1 : mise à jour de la bougie en cours ─────────
      // Remplacement direct sans modification de la taille du tableau.
      this.candles[this.candles.length - 1] = candle;
    } else {
      // ── Cas 2 : nouvelle bougie clôturée ──────────────────
      this.candles.push(candle);

      if (this.candles.length > MAX_CANDLES_IN_MEMORY) {
        // Retire la bougie la plus ancienne (FIFO)
        this.candles.shift();
        this.#evictedCount++;

        // Resync périodique des séries LightweightCharts :
        // purge leur buffer interne tous les RESYNC_BATCH évictions.
        if (this.#evictedCount >= RESYNC_BATCH) {
          this.#resyncChartSeries();
          this.#evictedCount = 0;
        }
      }
    }
  }

  /**
   * Resynchronise les séries LightweightCharts avec this.candles.
   *
   * Appelle setData() sur cSeries et vSeries pour que le buffer interne de LW
   * reflète exactement la fenêtre glissante courante. Cette opération est O(n)
   * mais n est borné à MAX_CANDLES_IN_MEMORY, et elle n'est déclenchée que
   * tous les RESYNC_BATCH nouvelles bougies — soit un coût marginal.
   *
   * Note : setData() dans LightweightCharts provoque un re-rendu complet de
   * la série, mais LW est optimisé pour cela et l'effet visuel est imperceptible.
   * Les indicateurs (VWAP, Ichimoku) ne sont PAS recalculés ici — leur refresh
   * reste sous la responsabilité de ChartIndicators.js sur événement candle:closed.
   */
  #resyncChartSeries() {
    try {
      this.cSeries?.setData(this.candles.map((c) => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    } catch (_) {}

    try {
      this.vSeries?.setData(this.candles.map((c) => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
      })));
    } catch (_) {}
  }

  /**
   * Calcule et émet les données de prix formatées (prix courant + variation %).
   * @param {number} price
   */
  #updatePriceDisplay(price) {
    price = parseFloat(price);
    const prevPrice = this.#lastPrice;
    this.#lastPrice = price;

    const direction = prevPrice === null ? 'neutral'
      : price > prevPrice ? 'up'
      : price < prevPrice ? 'down'
      : 'neutral';

    let pctChange = null;
    if (this.#open24) {
      pctChange = (price - this.#open24) / this.#open24 * 100;
    }

    this.#emit('price:display', {
      price,
      priceFormatted: fmtPrice(price),
      direction,
      pctChange,
      pctFormatted: pctChange !== null
        ? (pctChange >= 0 ? '+' : '') + pctChange.toFixed(2) + '%'
        : null,
    });
  }

  /**
   * Émet un CustomEvent sur le container HTML pour que la page réagisse.
   * Découple totalement la logique métier de la manipulation DOM.
   * @param {string} type   — Ex: 'candle:closed'
   * @param {object} detail — Payload de l'événement
   */
  #emit(type, detail = {}) {
    this.#container?.dispatchEvent(
      new CustomEvent(`crypview:${type}`, { detail, bubbles: true })
    );
  }
}
