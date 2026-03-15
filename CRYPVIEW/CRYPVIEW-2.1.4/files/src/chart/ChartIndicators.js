// ============================================================
//  src/chart/ChartIndicators.js — CrypView V2
//  Moteur de gestion des 19 indicateurs techniques.
// ============================================================

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
  #state = new Map(); // Map<string, { active, s, subChart, panel }>

  /** Appelé après chaque add/remove → la page rafraîchit ind-bar + modal. */
  onStateChange = (_key, _active) => {};

  constructor(chart, cSeries, chartsCol) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#chartsCol = chartsCol;
  }

  // ── API publique ──────────────────────────────────────────

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

  /**
   * Libère toutes les ressources sans déclencher onStateChange.
   * Appeler avant de réinstancier la classe (ex: reprise d'onglet en arrière-plan).
   * Règle cursorrules : "Chaque instance doit avoir destroy()."
   */
  destroy() {
    for (const [key, ind] of this.#state) {
      if (!ind.active) continue;
      const meta = IND_META[key];
      if (key === 'fp') continue; // géré par ChartFootprint
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

  // ── Overlays (chart principal) ────────────────────────────

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
        ind.s.kijun   = C.addLineSeries({ color:'#4040e0',              lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.senkouA = C.addLineSeries({ color:'rgba(0,255,136,.25)', lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.senkouB = C.addLineSeries({ color:'rgba(255,61,90,.25)', lineWidth:1, priceLineVisible:false, lastValueVisible:false });
        ind.s.chikou  = C.addLineSeries({ color:'rgba(127,255,255,.55)',lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'kelt':
        ind.s.mid   = C.addLineSeries({ color:'#ffaa00',            lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        ind.s.upper = C.addLineSeries({ color:'rgba(255,170,0,.4)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.lower = C.addLineSeries({ color:'rgba(255,170,0,.4)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'st':
        ind.s.trend = C.addLineSeries({ color:'#00ff88', lineWidth:2, priceLineVisible:false, lastValueVisible:false });
        break;
      // 'vp' → ChartVolumeProfile, aucune série LW ici
    }
  }

  #unmountOverlay(key, ind) {
    if (key === 'vp') return;
    Object.values(ind.s).forEach(s => { try { this.#chart.removeSeries(s); } catch (_) {} });
  }

  // ── Sous-panneaux (charts secondaires) ───────────────────

  #mountPanel(key, ind, candles, hooks) {
    const meta  = IND_META[key];
    const panel = document.createElement('div');
    panel.className = 'ind-panel';
    panel.id        = `panel-${key}`;
    panel.style.height = `${IND_PANEL_HEIGHT}px`;
    panel.innerHTML = `
      <div class="ind-panel-header">
        <span class="ind-panel-label" style="color:${meta.color}">${meta.label}</span>
        <button class="ind-panel-close" aria-label="Fermer ${meta.label}">✕</button>
      </div>
      <div class="ind-chart-div" id="indchart-${key}"></div>`;
    panel.querySelector('.ind-panel-close').addEventListener('click', () => this.remove(key, hooks));
    this.#chartsCol.appendChild(panel);
    ind.panel = panel;

    const div = document.getElementById(`indchart-${key}`);
    const ch  = LightweightCharts.createChart(div, {
      ...baseChartOptions(div, IND_PANEL_HEIGHT - 18),
      rightPriceScale: { borderColor: COLORS.GRID, scaleMargins: { top:.1, bottom:.08 } },
      timeScale: { borderColor: COLORS.GRID, timeVisible:true, secondsVisible:true, visible:false },
    });
    ind.subChart = ch;

    ch.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (!this.#validRange(range)) return;
      try { this.#chart.timeScale().setVisibleLogicalRange(range); } catch (_) {}
      for (const [, o] of this.#state) {
        if (o.subChart && o.subChart !== ch && o.active) {
          try { o.subChart.timeScale().setVisibleLogicalRange(range); } catch (_) {}
        }
      }
    });
    new ResizeObserver(() => ch.applyOptions({ width: div.clientWidth })).observe(div);
    try { const r = this.#chart.timeScale().getVisibleLogicalRange(); if (this.#validRange(r)) ch.timeScale().setVisibleLogicalRange(r); } catch (_) {}

    this.#mountSubSeries(key, ind, ch, candles, hooks);
  }

  #mountSubSeries(key, ind, ch, candles, hooks) {
    switch (key) {
      case 'rsi':
        ind.s.rsi = ch.addLineSeries({ color:'#00c8ff', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.ob  = ch.addLineSeries({ color:'rgba(255,61,90,.35)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.os  = ch.addLineSeries({ color:'rgba(0,255,136,.35)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 });
        break;
      case 'macd':
        ind.s.hist   = ch.addHistogramSeries({ priceScaleId:'right', priceLineVisible:false, lastValueVisible:false });
        ind.s.macd   = ch.addLineSeries({ color:'#ff9900', lineWidth:1.5, priceLineVisible:false, lastValueVisible:false });
        ind.s.signal = ch.addLineSeries({ color:'#00c8ff', lineWidth:1,   priceLineVisible:false, lastValueVisible:false });
        break;
      case 'stoch':
        ind.s.k = ch.addLineSeries({ color:'#ff6eb4', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.d = ch.addLineSeries({ color:'#00c8ff', lineWidth:1,   lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ch.priceScale('right').applyOptions({ autoScale:false, minimum:0, maximum:100 });
        break;
      case 'cci':
        ind.s.cci = ch.addLineSeries({ color:'#f7c948', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
        ind.s.ob  = ch.addLineSeries({ color:'rgba(255,61,90,.35)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        ind.s.os  = ch.addLineSeries({ color:'rgba(0,255,136,.35)', lineWidth:1, lineStyle:2, priceLineVisible:false, lastValueVisible:false });
        break;
      case 'adx':
        ind.s.adx = ch.addLineSeries({ color:'#00e5cc', lineWidth:1.5, priceLineVisible:false, lastValueVisible:true });
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

  // ── Calculs ───────────────────────────────────────────────

  #applyData(key, ind, candles) {
    if (!candles.length) return;
    try {
      switch (key) {
        case 'ma':   { const d=calcMA(candles);        ind.s.ma20.setData(d.ma20); ind.s.ma50.setData(d.ma50); ind.s.ma200.setData(d.ma200); break; }
        case 'bb':   { const d=calcBB(candles);        ind.s.mid.setData(d.mid); ind.s.upper.setData(d.upper); ind.s.lower.setData(d.lower); break; }
        case 'vwap':                                    ind.s.vwap.setData(calcVWAP(candles)); break;
        case 'hma':                                     ind.s.hma.setData(calcHMA(candles)); break;
        case 'ichi': { const d=calcIchimoku(candles); try{ind.s.tenkan.setData(d.tenkan);ind.s.kijun.setData(d.kijun);ind.s.senkouA.setData(d.senkouA);ind.s.senkouB.setData(d.senkouB);ind.s.chikou.setData(d.chikou);}catch(_){} break; }
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
    } catch (_) { /* données insuffisantes */ }
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

  #validRange(r) { return !!(r && r.from != null && r.to != null); }
}
