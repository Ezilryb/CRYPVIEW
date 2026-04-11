// ============================================================
//  src/chart/ChartIndicators.js — CrypView V3.7
//  Moteur de gestion des indicateurs techniques + Futures.
//
//  v3.6 : Ajout des indicateurs Futures (Binance FAPI)
//    - oi      : Open Interest delta + ligne absolue
//    - funding : Funding Rate toutes les 8h
//    - lsr     : Long/Short Ratio global des comptes
//
//  v3.7 : Ajout indicateur Liquidation Heatmap
//    - liq     : Canvas overlay via ChartLiquidations (Binance @forceOrder)
//
//  Changement de signature du constructeur :
//    constructor(chart, cSeries, chartsCol, getSymTf)
//    getSymTf = () => ({ symbol: string, timeframe: string })
//    Requis pour que ChartFutures connaisse le contexte courant.
// ============================================================

import { LightweightCharts } from '../utils/lw.js';
import { IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions } from '../config.js';
import {
  calcMA, calcHMA, calcVWAP,
  calcEMAMulti, calcDEMA,
  calcBB, calcATR, calcKeltner, calcSuperTrend,
  calcDonchian, calcParabolicSAR, calcPivotPoints, calcLinReg, calcSqueeze,
  calcIchimoku,
  calcRSI, calcMACD, calcStoch, calcCCI,
  calcADX, calcWilliamsR, calcMFI, calcMom,
  calcOBV, calcTRIX, calcCMF, calcElderRay,
} from '../indicators/index.js';
import { ChartFutures, mountOISeries, mountFundingSeries, mountLSRSeries } from './ChartFutures.js';

// ── Indicateurs déportés vers le Web Worker ───────────────────
const HEAVY_INDICATORS = new Set(['ichi', 'adx', 'st', 'macd']);
// ── Indicateurs Futures (gérés par ChartFutures, pas #applyData) ─
const FUTURES_INDICATORS = new Set(['oi', 'funding', 'lsr']);
// ── Indicateurs canvas overlay (pas de série LW, gérés via hooks) ─
const CANVAS_INDICATORS = new Set(['liq']);

let _reqCounter = 0;

export class ChartIndicators {
  #chart;
  #cSeries;
  #chartsCol;
  #getSymTf;
  #state = new Map();

  #futures = null;
  #worker  = null;
  #pendingRequests = new Map();

  onStateChange = (_key, _active) => {};

  /**
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} chartsCol
   * @param {function}    [getSymTf] — () => { symbol: string, timeframe: string }
   */
  constructor(chart, cSeries, chartsCol, getSymTf = () => ({ symbol: '', timeframe: '1h' })) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#chartsCol = chartsCol;
    this.#getSymTf  = getSymTf;
    this.#futures   = new ChartFutures(chart, cSeries, chartsCol, getSymTf);
  }

  // ── API publique ──────────────────────────────────────────

  add(key, candles, hooks = {}) {
    const meta = IND_META[key];
    if (!meta || this.isActive(key)) return;

    const ind = { active: true, s: {}, subChart: null, panel: null };
    this.#state.set(key, ind);

    if (key === 'liq') {
      // Canvas overlay géré par ChartLiquidations — aucune série LW créée
      hooks.onActivateLiq?.();

    } else if (key === 'fp') {
      hooks.onActivateFP?.();

    } else if (key === 'vp') {
      hooks.onActivateVP?.();

    } else if (FUTURES_INDICATORS.has(key)) {
      // Crée le panneau LW synchrone, charge les données FAPI en async
      this.#mountPanel(key, ind, candles, hooks);
      this.#futures.activate(key, candles, ind).catch(() => {});

    } else if (meta.overlay) {
      this.#mountOverlay(key, ind);
      this.#applyDataDispatch(key, ind, candles);

    } else {
      this.#mountPanel(key, ind, candles, hooks);
      this.#applyDataDispatch(key, ind, candles);
    }

    this.onStateChange(key, true);
  }

  remove(key, hooks = {}) {
    const ind = this.#state.get(key);
    if (!ind?.active) return;
    ind.active = false;
    const meta = IND_META[key];

    if (key === 'liq') {
      // Délègue la destruction du canvas overlay au hook
      hooks.onDeactivateLiq?.();

    } else if (key === 'fp') {
      hooks.onDeactivateFP?.();

    } else if (key === 'vp') {
      hooks.onDeactivateVP?.();

    } else if (FUTURES_INDICATORS.has(key)) {
      this.#futures.deactivate(key);
      this.#destroyPanel(ind);

    } else if (key === 'of') {
      hooks.onDeactivateOF?.();
      this.#destroyPanel(ind);

    } else if (meta?.overlay) {
      this.#unmountOverlay(key, ind);

    } else {
      this.#destroyPanel(ind);
    }

    ind.s = {};
    this.onStateChange(key, false);
  }

  removeAll(hooks = {}) {
    for (const key of [...this.#state.keys()]) this.remove(key, hooks);
  }

  refresh(candles) {
    if (!candles.length) return;

    for (const [key, ind] of this.#state) {
      if (!ind.active) continue;
      // Ces indicateurs gèrent leur propre cycle de vie (canvas / WS)
      if (key === 'fp' || key === 'vp' || key === 'of' || CANVAS_INDICATORS.has(key)) continue;

      if (FUTURES_INDICATORS.has(key)) {
        // Refresh FAPI silencieux à chaque clôture de bougie
        this.#futures.refresh(key, candles, ind).catch(() => {});
      } else {
        this.#applyDataDispatch(key, ind, candles);
      }
    }

    this.#refreshBoundaryLines(candles);
  }

  isActive(key)    { return this.#state.get(key)?.active === true; }
  getState(key)    { return this.#state.get(key); }
  getActiveKeys()  { return [...this.#state.entries()].filter(([,v]) => v.active).map(([k]) => k); }

  destroy() {
    for (const [key, ind] of this.#state) {
      if (!ind.active) continue;
      const meta = IND_META[key];
      // Canvas overlays et modules avec leur propre cycle de vie
      if (key === 'fp' || key === 'vp' || CANVAS_INDICATORS.has(key)) continue;
      if (FUTURES_INDICATORS.has(key)) {
        this.#futures.deactivate(key);
        this.#destroyPanel(ind);
      } else if (meta?.overlay) {
        try { Object.values(ind.s).forEach(s => this.#chart?.removeSeries(s)); } catch (_) {}
      } else {
        this.#destroyPanel(ind);
      }
    }
    this.#state.clear();
    this.#pendingRequests.clear();

    this.#futures?.destroy();
    this.#futures = null;

    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
  }

  // ── Routage calcul : léger (main thread) vs lourd (worker) ─

  #applyDataDispatch(key, ind, candles) {
    if (!candles.length) return;
    if (HEAVY_INDICATORS.has(key)) {
      this.#applyDataViaWorker(key, ind, candles);
    } else {
      this.#applyData(key, ind, candles);
    }
  }

  // ── Web Worker — cycle de vie ─────────────────────────────

  #initWorker() {
    if (this.#worker) return this.#worker;
    if (typeof Worker === 'undefined') return null;
    try {
      this.#worker = new Worker(
        new URL('../workers/indicators.worker.js', import.meta.url),
        { type: 'module' }
      );
      this.#worker.onmessage = ({ data }) => this.#handleWorkerMessage(data);
      this.#worker.onerror   = (err) => {
        console.warn('[ChartIndicators] Worker error — retour sync :', err.message);
        this.#worker?.terminate();
        this.#worker = null;
        this.#pendingRequests.clear();
      };
    } catch (_) { this.#worker = null; }
    return this.#worker;
  }

  #applyDataViaWorker(key, ind, candles) {
    const worker = this.#initWorker();
    if (!worker) { this.#applyData(key, ind, candles); return; }
    const requestId = `${key}_${++_reqCounter}`;
    this.#pendingRequests.set(requestId, key);
    worker.postMessage({ requestId, key, candles });
  }

  #handleWorkerMessage({ requestId, key, result, error }) {
    if (!this.#pendingRequests.has(requestId)) return;
    this.#pendingRequests.delete(requestId);
    if (error) { console.warn(`[ChartIndicators] Worker "${key}" :`, error); return; }
    const ind = this.#state.get(key);
    if (!ind?.active) return;
    this.#applyWorkerResult(key, ind, result);
  }

  #applyWorkerResult(key, ind, result) {
    try {
      switch (key) {
        case 'ichi':
          try { ind.s.tenkan.setData(result.tenkan);   } catch (_) {}
          try { ind.s.kijun.setData(result.kijun);     } catch (_) {}
          try { ind.s.senkouA.setData(result.senkouA); } catch (_) {}
          try { ind.s.senkouB.setData(result.senkouB); } catch (_) {}
          try { ind.s.chikou.setData(result.chikou);   } catch (_) {}
          break;
        case 'adx':
          try { ind.s.adx.setData(result.adx); ind.s.diP.setData(result.diP); ind.s.diN.setData(result.diN); } catch (_) {}
          break;
        case 'st':
          try { ind.s.trend.setData(result.trend.filter(x => x.value != null)); } catch (_) {}
          break;
        case 'macd':
          try { ind.s.hist.setData(result.hist); ind.s.macd.setData(result.macd); ind.s.signal.setData(result.signal); } catch (_) {}
          break;
      }
    } catch (_) {}
  }

  // ── Montage des séries overlay ────────────────────────────

  #mountOverlay(key, ind) {
    const C = this.#chart;
    switch (key) {
      case 'ma':
        ind.s.ma20  = C.addLineSeries({ color:'#f7c948', lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.ma50  = C.addLineSeries({ color:'#ff9900', lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.ma200 = C.addLineSeries({ color:'#ff3d5a', lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'bb':
        ind.s.mid   = C.addLineSeries({ color:'#7c6fff',               lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        ind.s.upper = C.addLineSeries({ color:'rgba(124,111,255,.45)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.lower = C.addLineSeries({ color:'rgba(124,111,255,.45)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'vwap': ind.s.vwap  = C.addLineSeries({ color:'#00ffcc', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });  break;
      case 'hma':  ind.s.hma   = C.addLineSeries({ color:'#ff6eb4', lineWidth:2,   priceLineVisible:false, lastValueVisible:false }); break;
      case 'ichi':
        ind.s.tenkan  = C.addLineSeries({ color:'#e04040',              lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.kijun   = C.addLineSeries({ color:'#4080e0',              lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.senkouA = C.addLineSeries({ color:'rgba(0,255,136,.35)',  lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.senkouB = C.addLineSeries({ color:'rgba(255,61,90,.35)',  lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.chikou  = C.addLineSeries({ color:'rgba(255,200,0,.7)',   lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'kelt':
        ind.s.mid   = C.addLineSeries({ color:'#ff9900',               lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        ind.s.upper = C.addLineSeries({ color:'rgba(255,153,0,.45)',   lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.lower = C.addLineSeries({ color:'rgba(255,153,0,.45)',   lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'st':
        ind.s.trend = C.addLineSeries({ lineWidth:2, priceLineVisible:false, lastValueVisible:true });
        break;
      case 'ema':
        ind.s.ema8  = C.addLineSeries({ color: '#00bfff', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false });
        ind.s.ema13 = C.addLineSeries({ color: '#7b2fff', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false });
        ind.s.ema21 = C.addLineSeries({ color: '#ff9f43', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false });
        break;
      case 'dema':
        ind.s.dema = C.addLineSeries({ color: '#ff5c8a', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        break;
      case 'sar':
        ind.s.sar = C.addLineSeries({ lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
        break;
      case 'don':
        ind.s.upper = C.addLineSeries({ color: 'rgba(155,93,229,.75)',  lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        ind.s.mid   = C.addLineSeries({ color: 'rgba(155,93,229,.35)',  lineWidth: 1, lineStyle: 3, priceLineVisible: false, lastValueVisible: false });
        ind.s.lower = C.addLineSeries({ color: 'rgba(155,93,229,.75)',  lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        break;
      case 'linreg':
        ind.s.mid   = C.addLineSeries({ color: '#f7c948',              lineWidth: 2,   priceLineVisible: false, lastValueVisible: false });
        ind.s.upper = C.addLineSeries({ color: 'rgba(247,201,72,.45)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        ind.s.lower = C.addLineSeries({ color: 'rgba(247,201,72,.45)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        break;
      case 'pp':
        ind.s.pp = C.addLineSeries({ color: '#adb5bd',  lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true  });
        ind.s.r1 = C.addLineSeries({ color: '#ff6b6b',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        ind.s.r2 = C.addLineSeries({ color: '#ff9999',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        ind.s.r3 = C.addLineSeries({ color: '#ffbaba',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        ind.s.s1 = C.addLineSeries({ color: '#51cf66',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        ind.s.s2 = C.addLineSeries({ color: '#94d82d',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        ind.s.s3 = C.addLineSeries({ color: '#c0eb75',  lineWidth: 1,   lineStyle: 2, priceLineVisible: false, lastValueVisible: true  });
        break;
    }
  }

  #unmountOverlay(key, ind) {
    try { Object.values(ind.s).forEach(s => this.#chart.removeSeries(s)); } catch (_) {}
  }

  // ── Montage des panneaux sous-chart ──────────────────────

  #mountPanel(key, ind, candles, hooks) {
    const panel     = document.createElement('div');
    panel.className = 'ind-panel';
    panel.style.height = `${IND_PANEL_HEIGHT}px`;
    this.#chartsCol?.appendChild(panel);
    ind.panel = panel;

    const subOpts  = baseChartOptions(panel);
    subOpts.height = IND_PANEL_HEIGHT;
    subOpts.rightPriceScale.scaleMargins = { top: 0.1, bottom: 0.1 };
    const ch = LightweightCharts.createChart(panel, subOpts);
    ind.subChart = ch;

    switch (key) {

      // ── Futures ──────────────────────────────────────────
      case 'oi':
        Object.assign(ind.s, mountOISeries(ch));
        this.#addPanelHeader(panel, '📊 Open Interest', '#00c8ff');
        break;

      case 'funding':
        Object.assign(ind.s, mountFundingSeries(ch));
        this.#addPanelHeader(panel, '⚡ Funding Rate (8h)', '#ff6eb4');
        break;

      case 'lsr':
        Object.assign(ind.s, mountLSRSeries(ch));
        this.#addPanelHeader(panel, '⚖ Long/Short Ratio', '#f7c948');
        break;

      // ── Indicateurs classiques ────────────────────────────
      case 'rsi':
        ind.s.rsi = ch.addLineSeries({ color:'#c678dd', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.ob  = ch.addLineSeries({ color:'rgba(255,61,90,.4)',  lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.os  = ch.addLineSeries({ color:'rgba(0,255,136,.4)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 });
        break;
      case 'macd':
        ind.s.hist   = ch.addHistogramSeries({ priceScaleId:'right', priceLineVisible:false, lastValueVisible:false });
        ind.s.macd   = ch.addLineSeries({ color:'#00c8ff', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.signal = ch.addLineSeries({ color:'#ff6eb4', lineWidth:1,   priceLineVisible:false, lastValueVisible:true });
        break;
      case 'stoch':
        ind.s.k = ch.addLineSeries({ color:'#00c8ff', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.d = ch.addLineSeries({ color:'#ff6eb4', lineWidth:1,   priceLineVisible:false, lastValueVisible:true });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 });
        break;
      case 'cci':
        ind.s.cci = ch.addLineSeries({ color:'#f7c948', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.ob  = ch.addLineSeries({ color:'rgba(255,61,90,.4)',  lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.os  = ch.addLineSeries({ color:'rgba(0,255,136,.4)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'adx':
        ind.s.adx = ch.addLineSeries({ color:'#00c8ff', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.diP = ch.addLineSeries({ color:'#00ff88', lineWidth:1,   priceLineVisible:false, lastValueVisible:false });
        ind.s.diN = ch.addLineSeries({ color:'#ff3d5a', lineWidth:1,   priceLineVisible:false, lastValueVisible:false });
        break;
      case 'willr':
        ind.s.willr = ch.addLineSeries({ color:'#b0ff5c', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:-100, maximum:0 });
        break;
      case 'mfi':
        ind.s.mfi = ch.addLineSeries({ color:'#ff5c5c', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 });
        break;
      case 'atr':
        ind.s.atr = ch.addLineSeries({ color:'#00e5cc', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        break;
      case 'mom':
        ind.s.mom = ch.addHistogramSeries({ priceScaleId:'right', priceLineVisible:false, lastValueVisible:false });
        break;
      case 'of':
        ind.s.deltaHist = ch.addHistogramSeries({ priceScaleId:'right', priceLineVisible:false, lastValueVisible:false, base:0 });
        ind.s.cvdLine   = ch.addLineSeries({ color:'#ff9f43', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true, priceScaleId:'cvd' });
        ch.priceScale('cvd').applyOptions({ position:'left', visible:true, borderColor:COLORS.GRID, scaleMargins:{top:.05,bottom:.05} });
        ch.priceScale('right').applyOptions({ scaleMargins:{top:.05,bottom:.05} });
        if (candles.length) {
          const t0 = candles[0].time, t1 = candles.at(-1).time;
          const zero = ch.addLineSeries({ color:'rgba(255,255,255,.12)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false, priceScaleId:'right' });
          try { zero.setData([{time:t0,value:0},{time:t1,value:0}]); } catch(_) {}
          ind.s.zeroLine = zero;
        }
        hooks.onActivateOF?.();
        break;
      case 'obv':
        ind.s.obv = ch.addLineSeries({ color: '#00e5cc', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
        break;
      case 'trix':
        ind.s.hist = ch.addHistogramSeries({ priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, base: 0 });
        break;
      case 'cmf':
        ind.s.cmf = ch.addLineSeries({ color: '#00b4d8', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true });
        if (candles.length) {
          const t0 = candles[0].time, t1 = candles.at(-1).time;
          ind.s.zero = ch.addLineSeries({ color: 'rgba(255,255,255,.15)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
          try { ind.s.zero.setData([{ time: t0, value: 0 }, { time: t1, value: 0 }]); } catch(_) {}
        }
        ch.priceScale('right').applyOptions({ autoScale: false, minimum: -1, maximum: 1 });
        break;
      case 'squeeze':
        ind.s.hist = ch.addHistogramSeries({ priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, base: 0 });
        break;
      case 'eray':
        ind.s.bull = ch.addHistogramSeries({ priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, base: 0 });
        ind.s.bear = ch.addHistogramSeries({ priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false, base: 0 });
        break;
    }
  }

  /**
   * Ajoute un petit header coloré au panneau — distinctif pour les futures.
   * @param {HTMLElement} panel
   * @param {string}      label
   * @param {string}      color
   */
  #addPanelHeader(panel, label, color) {
    const hdr = document.createElement('div');
    hdr.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:18px;z-index:5;
      display:flex;align-items:center;padding:0 8px;
      background:rgba(7,10,15,0.82);border-bottom:1px solid ${color}44;
      font-family:'Space Mono',monospace;font-size:8px;
      color:${color};letter-spacing:.6px;text-transform:uppercase;
      pointer-events:none;
    `;
    hdr.innerHTML = `
      <span style="width:5px;height:5px;border-radius:50%;background:${color};
                   margin-right:5px;flex-shrink:0;"></span>
      ${label}
      <span style="margin-left:auto;font-size:7px;color:rgba(139,148,158,.6);">FAPI</span>
    `;
    panel.appendChild(hdr);
    // Décale le contenu du chart pour ne pas masquer les bougies
    const inner = panel.querySelector('.ind-chart-div');
    if (inner) inner.style.top = '18px';
  }

  #destroyPanel(ind) {
    if (ind.subChart) { try { ind.subChart.remove(); } catch (_) {} ind.subChart = null; }
    if (ind.panel)    { ind.panel.remove(); ind.panel = null; }
  }

  // ── Calcul synchrone (indicateurs légers) ────────────────

  #applyData(key, ind, candles) {
    if (!candles.length) return;
    try {
      switch (key) {
        case 'ma':   { const d=calcMA(candles);        ind.s.ma20.setData(d.ma20); ind.s.ma50.setData(d.ma50); ind.s.ma200.setData(d.ma200); break; }
        case 'bb':   { const d=calcBB(candles);        ind.s.mid.setData(d.mid); ind.s.upper.setData(d.upper); ind.s.lower.setData(d.lower); break; }
        case 'vwap':                                    ind.s.vwap.setData(calcVWAP(candles)); break;
        case 'hma':                                     ind.s.hma.setData(calcHMA(candles)); break;
        case 'kelt': { const d=calcKeltner(candles);   ind.s.mid.setData(d.mid); ind.s.upper.setData(d.upper); ind.s.lower.setData(d.lower); break; }
        case 'st':   { const d=calcSuperTrend(candles); try{ind.s.trend.setData(d.trend.filter(x=>x.value!=null));}catch(_){} break; }
        case 'rsi':                                     ind.s.rsi.setData(calcRSI(candles)); break;
        case 'macd': { const d=calcMACD(candles);      ind.s.hist.setData(d.hist); ind.s.macd.setData(d.macd); ind.s.signal.setData(d.signal); break; }
        case 'stoch':{ const d=calcStoch(candles);     ind.s.k.setData(d.k); ind.s.d.setData(d.d); break; }
        case 'cci':                                     ind.s.cci.setData(calcCCI(candles)); break;
        case 'adx':  { const d=calcADX(candles); try{ind.s.adx.setData(d.adx);ind.s.diP.setData(d.diP);ind.s.diN.setData(d.diN);}catch(_){} break; }
        case 'willr':                                   ind.s.willr.setData(calcWilliamsR(candles)); break;
        case 'mfi':                                     ind.s.mfi.setData(calcMFI(candles)); break;
        case 'atr':                                     ind.s.atr.setData(calcATR(candles)); break;
        case 'mom':                                     ind.s.mom.setData(calcMom(candles)); break;
        case 'ema': {
          const d = calcEMAMulti(candles);
          try { ind.s.ema8.setData(d.ema8);   } catch(_){}
          try { ind.s.ema13.setData(d.ema13); } catch(_){}
          try { ind.s.ema21.setData(d.ema21); } catch(_){}
          break;
        }
        case 'dema': ind.s.dema.setData(calcDEMA(candles)); break;
        case 'sar':  ind.s.sar.setData(calcParabolicSAR(candles)); break;
        case 'don': {
          const d = calcDonchian(candles);
          try { ind.s.upper.setData(d.upper); } catch(_){}
          try { ind.s.mid.setData(d.mid);     } catch(_){}
          try { ind.s.lower.setData(d.lower); } catch(_){}
          break;
        }
        case 'linreg': {
          const d = calcLinReg(candles);
          try { ind.s.mid.setData(d.mid);     } catch(_){}
          try { ind.s.upper.setData(d.upper); } catch(_){}
          try { ind.s.lower.setData(d.lower); } catch(_){}
          break;
        }
        case 'pp': {
          const d = calcPivotPoints(candles);
          if (!d) break;
          const t0 = candles.at(-Math.min(50, candles.length)).time;
          const t1 = candles.at(-1).time;
          const restamp = arr => arr.map((pt, i) => ({ ...pt, time: i === 0 ? t0 : t1 }));
          try { ind.s.pp.setData(restamp(d.pp)); } catch(_){}
          try { ind.s.r1.setData(restamp(d.r1)); ind.s.r2.setData(restamp(d.r2)); ind.s.r3.setData(restamp(d.r3)); } catch(_){}
          try { ind.s.s1.setData(restamp(d.s1)); ind.s.s2.setData(restamp(d.s2)); ind.s.s3.setData(restamp(d.s3)); } catch(_){}
          break;
        }
        case 'obv':  ind.s.obv.setData(calcOBV(candles)); break;
        case 'trix': ind.s.hist.setData(calcTRIX(candles)); break;
        case 'cmf':
          ind.s.cmf.setData(calcCMF(candles));
          if (ind.s.zero && candles.length) {
            try { ind.s.zero.setData([{ time: candles[0].time, value: 0 }, { time: candles.at(-1).time, value: 0 }]); } catch(_){}
          }
          break;
        case 'squeeze': ind.s.hist.setData(calcSqueeze(candles)); break;
        case 'eray': {
          const d = calcElderRay(candles);
          try { ind.s.bull.setData(d.bull); } catch(_){}
          try { ind.s.bear.setData(d.bear); } catch(_){}
          break;
        }
      }
    } catch (_) {}
  }

  #refreshBoundaryLines(candles) {
    const t0 = candles[0].time, t1 = candles.at(-1).time;
    const rsi = this.#state.get('rsi');
    if (rsi?.active) {
      try { rsi.s.ob?.setData([{time:t0,value:70},{time:t1,value:70}]); } catch(_){}
      try { rsi.s.os?.setData([{time:t0,value:30},{time:t1,value:30}]); } catch(_){}
    }
    const cci = this.#state.get('cci');
    if (cci?.active) {
      try { cci.s.ob?.setData([{time:t0,value:100},{time:t1,value:100}]);  } catch(_){}
      try { cci.s.os?.setData([{time:t0,value:-100},{time:t1,value:-100}]); } catch(_){}
    }
    // Rafraîchit la baseline LSR (temps changeant sur nouvelles bougies)
    const lsr = this.#state.get('lsr');
    if (lsr?.active && lsr.s._lsrRaw?.length) {
      const d0 = lsr.s._lsrRaw[0].time;
      const d1 = lsr.s._lsrRaw.at(-1).time;
      try { lsr.s.base?.setData([{ time: d0, value: 0 }, { time: d1, value: 0 }]); } catch(_){}
    }
  }
}
