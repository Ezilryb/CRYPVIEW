// ============================================================
//  src/chart/ChartIndicators.js — CrypView V2
//  Moteur de gestion des 19 indicateurs techniques.
// ============================================================

import { LightweightCharts } from '../utils/lw.js';
import { IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions } from '../config.js';
import {
  calcMA, calcHMA, calcVWAP,
  calcBB, calcATR, calcKeltner, calcSuperTrend,
  calcIchimoku,
  calcRSI, calcMACD, calcStoch, calcCCI,
  calcADX, calcWilliamsR, calcMFI, calcMom,
} from '../indicators/index.js';

export class ChartIndicators {
  #chart;
  #cSeries;
  #chartsCol;
  #state = new Map();

  #ichiCache = null;

  onStateChange = (_key, _active) => {};

  constructor(chart, cSeries, chartsCol) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#chartsCol = chartsCol;
  }

  add(key, candles, hooks = {}) {
    const meta = IND_META[key];
    if (!meta || this.isActive(key)) return;

    const ind = { active: true, s: {}, subChart: null, panel: null };
    this.#state.set(key, ind);

    if (key === 'fp') {
      hooks.onActivateFP?.();
    } else if (meta.overlay) {
      this.#mountOverlay(key, ind);
      this.#applyData(key, ind, candles);
    } else {
      this.#mountPanel(key, ind, candles, hooks);
      this.#applyData(key, ind, candles);
    }
    this.onStateChange(key, true);
  }

  remove(key, hooks = {}) {
    const ind = this.#state.get(key);
    if (!ind?.active) return;
    ind.active = false;
    const meta = IND_META[key];

    if (key === 'ichi') this.#ichiCache = null;

    if (key === 'fp') {
      hooks.onDeactivateFP?.();
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
      if (ind.active && key !== 'fp' && key !== 'vp' && key !== 'of') {
        this.#applyData(key, ind, candles);
      }
    }
    this.#refreshBoundaryLines(candles);
  }

  isActive(key)    { return this.#state.get(key)?.active === true; }
  getState(key)    { return this.#state.get(key); }
  getActiveKeys()  { return [...this.#state.entries()].filter(([,v]) => v.active).map(([k]) => k); }

  destroy() {
    this.#ichiCache = null;

    for (const [key, ind] of this.#state) {
      if (!ind.active) continue;
      const meta = IND_META[key];
      if (key === 'fp') continue;
      if (meta?.overlay) {
        if (key !== 'vp') {
          try { Object.values(ind.s).forEach(s => this.#chart?.removeSeries(s)); } catch (_) {}
        }
      } else {
        this.#destroyPanel(ind);
      }
    }
    this.#state.clear();
  }

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
    }
  }

  #unmountOverlay(key, ind) {
    try { Object.values(ind.s).forEach(s => this.#chart.removeSeries(s)); } catch (_) {}
  }

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
    }
  }

  #destroyPanel(ind) {
    if (ind.subChart) { try { ind.subChart.remove(); } catch (_) {} ind.subChart = null; }
    if (ind.panel)    { ind.panel.remove(); ind.panel = null; }
  }

  #applyData(key, ind, candles) {
    if (!candles.length) return;
    try {
      switch (key) {
        case 'ma':   { const d=calcMA(candles);        ind.s.ma20.setData(d.ma20); ind.s.ma50.setData(d.ma50); ind.s.ma200.setData(d.ma200); break; }
        case 'bb':   { const d=calcBB(candles);        ind.s.mid.setData(d.mid); ind.s.upper.setData(d.upper); ind.s.lower.setData(d.lower); break; }
        case 'vwap':                                    ind.s.vwap.setData(calcVWAP(candles)); break;
        case 'hma':                                     ind.s.hma.setData(calcHMA(candles)); break;
        case 'ichi': {
          const lastTime = candles.at(-1).time;
          if (this.#ichiCache?.lastCandleTime !== lastTime) {
            const data = calcIchimoku(candles);
            this.#ichiCache = { lastCandleTime: lastTime, data };
          }
          const d = this.#ichiCache.data;
          try {
            ind.s.tenkan.setData(d.tenkan);
            ind.s.kijun.setData(d.kijun);
            ind.s.senkouA.setData(d.senkouA);
            ind.s.senkouB.setData(d.senkouB);
            ind.s.chikou.setData(d.chikou);
          } catch(_) {}
          break;
        }
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
  }
}
