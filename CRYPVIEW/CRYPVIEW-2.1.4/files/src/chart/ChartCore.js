// ============================================================
//  src/chart/ChartCore.js — CrypView V2
//  Classe TradingChart : cycle de vie complet d'un graphique.
//
//  Responsabilités :
//    - Initialisation LightweightCharts
//    - Chargement historique REST
//    - Connexion / reconnexion des WebSockets
//    - Mise à jour du buffer candles[]
//    - Communication vers la page via CustomEvents (pas de DOM direct)
//    - Nettoyage complet via destroy()
//
//  Ce que cette classe NE fait PAS :
//    - Toucher au DOM (textContent, classList, getElementById…)
//    - Gérer les indicateurs (→ ChartIndicators.js — Phase 3)
//    - Gérer les drawings (→ ChartDrawing.js — Phase 3)
// ============================================================

import { COLORS, MAX_CANDLES_IN_MEMORY, baseChartOptions, TF_API_MAP } from '../config.js';
import { fetchKlines, parseKlines }           from '../api/binance.rest.js';
import { createKlineStream, createTickerStream, createTradeStream } from '../api/binance.ws.js';
import { showToast }                          from '../utils/toast.js';
import { fmtPrice, fmtTime }                  from '../utils/format.js';

export class TradingChart {
  // ── État public (lecture seule depuis l'extérieur) ────────
  /** @type {string} Symbole actif en minuscules, ex: 'btcusdt' */
  symbol;
  /** @type {string} Timeframe actif, ex: '1m' */
  timeframe;
  /** @type {Candle[]} Buffer des bougies chargées en mémoire */
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

  // ── Divers ────────────────────────────────────────────────
  #container      = null;
  #resizeObserver = null;
  #lastPrice      = null;
  #open24         = null;

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
    this.symbol = newSymbol.toLowerCase();
    this.candles = [];
    this.#lastPrice = null;
    this.#open24    = null;
    await this.start();
  }

  /**
   * Change le timeframe et recharge l'historique.
   * Le stream kline est remplacé par un nouveau sur le bon interval.
   * @param {string} newTf — Ex: '4h'
   * @returns {Promise<void>}
   */
  async changeTimeframe(newTf) {
    this.timeframe = newTf;
    this.candles   = [];
    await this.#loadHistory();
    // Remplace le stream kline sans toucher aux streams ticker/trades
    this.#connectKlineStream();
  }

  /**
   * Libère TOUTES les ressources de cette instance.
   * Obligatoire avant de naviguer vers une autre page ou de recréer un graphique.
   *
   * Règle cursorrules : "Chaque instance doit avoir une méthode destroy()
   * qui coupe les WebSockets et les ResizeObservers."
   */
  destroy() {
    this.#wsKline?.destroy();
    this.#wsTicker?.destroy();
    this.#wsTrades?.destroy();
    this.#resizeObserver?.disconnect();
    try { this.chart?.remove(); } catch (_) {}
    this.chart   = null;
    this.cSeries = null;
    this.vSeries = null;
    this.candles = [];
  }

  // ══════════════════════════════════════════════════════════
  //  INITIALISATION INTERNE
  // ══════════════════════════════════════════════════════════

  /**
   * Crée et configure l'instance LightweightCharts dans le container.
   * Appelé une seule fois dans le constructeur.
   */
  #initChart() {
    // Supprime un éventuel chart précédent (ex: appel après destroy partiel)
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

    // Redimensionnement réactif au ResizeObserver
    this.#resizeObserver = new ResizeObserver(() => {
      if (!this.chart) return;
      this.chart.applyOptions({
        width:  this.#container.clientWidth,
        height: this.#container.clientHeight,
      });
    });
    this.#resizeObserver.observe(this.#container);
  }

  // ══════════════════════════════════════════════════════════
  //  CHARGEMENT HISTORIQUE
  // ══════════════════════════════════════════════════════════

  /**
   * Charge les bougies historiques via l'API REST Binance.
   * Alimente cSeries, vSeries et this.candles.
   */
  async #loadHistory() {
    try {
      const raw   = await fetchKlines(this.symbol, this.timeframe);
      this.candles = parseKlines(raw);

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
      // Affiche un message contextuel selon l'origine de l'erreur
      const msg = location.protocol === 'file:'
        ? 'Erreur CORS — utilise un serveur local (http://localhost) pour charger l\'historique.'
        : `Historique indisponible : ${err.message}. Passage en mode live seul.`;
      showToast(msg, 'error');
      this.candles = [];
    }
  }

  // ══════════════════════════════════════════════════════════
  //  FLUX WEBSOCKET
  // ══════════════════════════════════════════════════════════

  /**
   * Ouvre (ou remplace) le stream kline pour le symbole et timeframe courants.
   * Gère la mise à jour du buffer candles[] et l'émission des événements.
   */
  #connectKlineStream() {
    // Détruit l'ancien stream avant d'en créer un nouveau
    this.#wsKline?.destroy();

    // Le stream kline Binance n'accepte pas '1s' nativement en klines WS
    // mais via le stream @kline_1s (dispo depuis 2023)
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

      // Mise à jour des séries LightweightCharts (try/catch obligatoire — les séries
      // peuvent être dans un état invalide lors d'un changement de symbole rapide)
      try { this.cSeries.update({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close }); } catch (_) {}
      try {
        this.vSeries.update({
          time:  candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
        });
      } catch (_) {}

      // Mise à jour du buffer candles en mémoire
      this.#updateCandleBuffer(candle);

      // k.x === true : la bougie vient de se clôturer
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
      // Recalcule la variation % avec le dernier prix connu
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
        price:  parseFloat(data.p),
        qty:    parseFloat(data.q),
        isBuy:  !data.m,          // m=true → le buyer est le maker → ordre de vente
        time:   data.T,
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
   * Maintient la taille max à MAX_CANDLES_IN_MEMORY.
   * @param {Candle} candle
   */
  #updateCandleBuffer(candle) {
    if (this.candles.length && this.candles.at(-1).time === candle.time) {
      // Mise à jour de la dernière bougie en cours (même timestamp)
      this.candles[this.candles.length - 1] = candle;
    } else {
      this.candles.push(candle);
      if (this.candles.length > MAX_CANDLES_IN_MEMORY) this.candles.shift();
    }
  }

  /**
   * Calcule et émet les données de prix formatées (prix courant + variation %).
   * Utilisé par le stream kline ET le stream ticker.
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
   *
   * Convention de nommage : 'crypview:{domaine}:{action}'
   *
   * @param {string} name    — Ex: 'price:update', 'status', 'candle:closed'
   * @param {object} [detail={}]
   */
  #emit(name, detail = {}) {
    this.#container?.dispatchEvent(
      new CustomEvent(`crypview:${name}`, { bubbles: true, detail })
    );
  }
}
