// ============================================================
//  src/chart/ChartCore.js — CrypView V2
//  Classe TradingChart : cycle de vie complet d'un graphique.
//
//  Correctifs appliqués :
//    - Bug 3 : ajout de changeTo(symbol, tf) — un seul appel REST
//              quelle que soit la combinaison de changements.
//    - Bug 5 : changeTimeframe() reconnecte maintenant ticker + trades
//              pour éviter la désynchronisation des streams indépendants.
// ============================================================

import { LightweightCharts }                  from '../utils/lw.js';
import { COLORS, MAX_CANDLES_IN_MEMORY, baseChartOptions, TF_API_MAP, CHART_THEMES } from '../config.js';
import { fetchKlines, parseKlines }           from '../api/binance.rest.js';
import { createKlineStream, createTickerStream, createTradeStream } from '../api/binance.ws.js';
import { showToast }                          from '../utils/toast.js';
import { fmtPrice, fmtTime }                  from '../utils/format.js';

const RESYNC_BATCH = 50;

export class TradingChart {
  symbol;
  timeframe;
  candles = [];

  chart   = null;
  cSeries = null;
  vSeries = null;

  #wsKline   = null;
  #wsTicker  = null;
  #wsTrades  = null;

  #evictedCount = 0;

  #container      = null;
  #resizeObserver = null;
  #lastPrice      = null;
  #open24         = null;
  #themeHandler   = null;

  constructor(container, symbol, timeframe) {
    this.#container = container;
    this.symbol     = symbol.toLowerCase();
    this.timeframe  = timeframe;
    this.#initChart();
  }

  async start() {
    this.#emit('status', { state: 'loading', symbol: this.symbol, timeframe: this.timeframe });
    await this.#loadHistory();
    this.#connectKlineStream();
    this.#connectTickerStream();
    this.#connectTradeStream();
  }

  // ── Changement de symbole uniquement ─────────────────────
  async changeSymbol(newSymbol) {
    this.symbol       = newSymbol.toLowerCase();
    this.candles      = [];
    this.#evictedCount = 0;
    this.#lastPrice   = null;
    this.#open24      = null;
    await this.start();
  }

  // ── Changement de timeframe uniquement ───────────────────
  // BUG 5 CORRIGÉ : reconnecte ticker + trades pour éviter
  // la désynchronisation des streams indépendants du TF.
  async changeTimeframe(newTf) {
    this.timeframe    = newTf;
    this.candles      = [];
    this.#evictedCount = 0;
    await this.#loadHistory();
    this.#connectKlineStream();
    this.#connectTickerStream();   // ← CORRECTIF Bug 5
    this.#connectTradeStream();    // ← CORRECTIF Bug 5
  }

  // ── Changements simultanés symbole + timeframe ───────────
  // BUG 3 CORRIGÉ : évite le double appel REST qui survenait
  // quand connect() enchaînait changeSymbol() + changeTimeframe().
  // Un seul start() → un seul fetchKlines().
  async changeTo(newSymbol, newTf) {
    this.symbol       = newSymbol.toLowerCase();
    this.timeframe    = newTf;
    this.candles      = [];
    this.#evictedCount = 0;
    this.#lastPrice   = null;
    this.#open24      = null;
    await this.start();
  }

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

  #initChart() {
    if (this.chart) {
      try { this.chart.remove(); } catch (_) {}
    }

    const opts = baseChartOptions(this.#container);
    opts.rightPriceScale.scaleMargins = { top: 0.08, bottom: 0.22 };
    this.chart = LightweightCharts.createChart(this.#container, opts);

    this.cSeries = this.chart.addCandlestickSeries({
      upColor:         COLORS.GREEN,
      downColor:       COLORS.RED,
      borderUpColor:   COLORS.GREEN,
      borderDownColor: COLORS.RED,
      wickUpColor:     COLORS.GREEN_MID,
      wickDownColor:   COLORS.RED_MID,
    });

    this.vSeries = this.chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol',
    });
    this.chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.83, bottom: 0 },
    });

    this.#resizeObserver = new ResizeObserver(() => {
      if (!this.chart) return;
      this.chart.applyOptions({
        width:  this.#container.clientWidth,
        height: this.#container.clientHeight,
      });
    });
    this.#resizeObserver.observe(this.#container);

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

  async #loadHistory() {
    try {
      const raw = await fetchKlines(this.symbol, this.timeframe);
      this.candles      = parseKlines(raw).slice(-MAX_CANDLES_IN_MEMORY);
      this.#evictedCount = 0;

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

      try { this.cSeries.update({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close }); } catch (_) {}
      try {
        this.vSeries.update({
          time:  candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
        });
      } catch (_) {}

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

  #updateCandleBuffer(candle) {
    const last = this.candles.at(-1);

    if (last && last.time === candle.time) {
      this.candles[this.candles.length - 1] = candle;
    } else {
      this.candles.push(candle);

      if (this.candles.length > MAX_CANDLES_IN_MEMORY) {
        this.candles.shift();
        this.#evictedCount++;

        if (this.#evictedCount >= RESYNC_BATCH) {
          this.#resyncChartSeries();
          this.#evictedCount = 0;
        }
      }
    }
  }

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

  #emit(type, detail = {}) {
    this.#container?.dispatchEvent(
      new CustomEvent(`crypview:${type}`, { detail, bubbles: true })
    );
  }
}
