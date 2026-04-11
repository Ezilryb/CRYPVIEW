// ============================================================
//  src/chart/ChartFutures.js — CrypView V3.6
//  Overlays Futures : OI, Funding Rate, Long/Short Ratio.
//
//  Architecture :
//    - Un seul point d'entrée par indicateur (oi / funding / lsr)
//    - Chaque indicateur crée son propre sous-panneau LW
//    - Données chargées via FAPI REST + actualisées sur chaque
//      clôture de bougie (pas de WS — données basse fréquence)
//    - Fallback gracieux si paire non disponible sur Futures
//
//  Usage :
//    const futures = new ChartFutures(chart, cSeries, chartsCol,
//                      () => ({ symbol, timeframe }));
//    await futures.activate('oi', candles, indState);
//    futures.deactivate('oi', indState);
//    await futures.refresh('oi', candles, indState);
// ============================================================

import { LightweightCharts }     from '../utils/lw.js';
import { baseChartOptions, IND_PANEL_HEIGHT, COLORS } from '../config.js';
import {
  fetchOIHistory, fetchFundingHistory, fetchCurrentFunding,
  fetchLongShortRatio, isFuturesSymbol, fapiPeriod,
} from '../api/binance.fapi.js';
import { showToast } from '../utils/toast.js';
import { fmtPrice }  from '../utils/format.js';

// ── Constantes ───────────────────────────────────────────────
const FUNDING_PRICE_LINE_TITLE = '⚡ Funding';
const FUNDING_INTERVAL_MS      = 3 * 60_000; // rafraîchissement toutes les 3 min

export class ChartFutures {
  #chart;
  #cSeries;
  #chartsCol;
  #getSymTf;

  /** État par clé d'indicateur ('oi' | 'funding' | 'lsr') */
  #state = new Map();

  /** Timer pour le rafraîchissement périodique du funding courant */
  #fundingTimer = null;

  /** Cache de la dernière ligne prix funding */
  #fundingPriceLine = null;

  constructor(chart, cSeries, chartsCol, getSymTf) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#chartsCol = chartsCol;
    this.#getSymTf  = getSymTf;
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Active un indicateur futures.
   * @param {'oi'|'funding'|'lsr'} key
   * @param {Candle[]}             candles
   * @param {object}               indState — objet { active, s, subChart, panel } de ChartIndicators
   */
  async activate(key, candles, indState) {
    const { symbol, timeframe } = this.#getSymTf();
    const sym = symbol.toUpperCase();

    // Vérification silencieuse : paire disponible sur Futures ?
    const hasFutures = await isFuturesSymbol(sym);
    if (!hasFutures) {
      showToast(`⚠ ${sym} n'a pas de marché Futures perpétuel sur Binance.`, 'warning', 5_000);
      return;
    }

    this.#state.set(key, { loading: true });

    try {
      switch (key) {
        case 'oi':
          await this.#loadOI(sym, timeframe, candles, indState);
          break;
        case 'funding':
          await this.#loadFunding(sym, timeframe, candles, indState);
          this.#startFundingRefresh(sym, indState);
          break;
        case 'lsr':
          await this.#loadLSR(sym, timeframe, candles, indState);
          break;
      }
    } catch (err) {
      showToast(`Futures ${key.toUpperCase()} — ${err.message}`, 'warning', 4_000);
    } finally {
      this.#state.set(key, { loading: false });
    }
  }

  /**
   * Désactive un indicateur futures (arrête les timers, nettoie la price line).
   * @param {'oi'|'funding'|'lsr'} key
   */
  deactivate(key) {
    if (key === 'funding') {
      this.#stopFundingRefresh();
      this.#removeFundingPriceLine();
    }
    this.#state.delete(key);
  }

  /**
   * Recharge les données après une clôture de bougie ou un changement de symbole/TF.
   * @param {'oi'|'funding'|'lsr'} key
   * @param {Candle[]}             candles
   * @param {object}               indState
   */
  async refresh(key, candles, indState) {
    if (!this.#state.has(key)) return;
    const { symbol, timeframe } = this.#getSymTf();
    const sym = symbol.toUpperCase();
    try {
      switch (key) {
        case 'oi':      await this.#loadOI(sym, timeframe, candles, indState);      break;
        case 'funding': await this.#loadFunding(sym, timeframe, candles, indState); break;
        case 'lsr':     await this.#loadLSR(sym, timeframe, candles, indState);     break;
      }
    } catch (_) {
      // Erreur silencieuse sur refresh — ne pas spammer l'utilisateur
    }
  }

  isLoading(key) { return this.#state.get(key)?.loading ?? false; }

  destroy() {
    this.#stopFundingRefresh();
    this.#removeFundingPriceLine();
    this.#state.clear();
  }

  // ── Open Interest ─────────────────────────────────────────

  async #loadOI(sym, tf, candles, ind) {
    if (!ind?.s) return;
    const period = fapiPeriod(tf);
    const data   = await fetchOIHistory(sym, period, 500);
    if (!data.length) return;

    // ── Calcul du delta OI ──────────────────────────────────
    // delta[i] = oi[i] - oi[i-1]  → positif = nouveau positions ouvertes
    const deltaData = data.slice(1).map((pt, i) => {
      const delta = pt.oi - data[i].oi;
      return {
        time:  pt.time,
        value: delta,
        color: delta >= 0
          ? 'rgba(0,255,136,0.60)'   // Longs/shorts entrent
          : 'rgba(255,61,90,0.60)',   // Positions fermées / liquidations
      };
    });

    // ── Ligne OI absolue (normalisée 0-1 pour co-habiter avec le delta) ──
    const oiValues = data.map(d => d.oi);
    const oiMin    = Math.min(...oiValues);
    const oiMax    = Math.max(...oiValues);
    const oiRange  = oiMax - oiMin || 1;
    const oiLine   = data.map(d => ({
      time:  d.time,
      value: (d.oi - oiMin) / oiRange,  // 0..1
    }));

    try { ind.s.delta?.setData(deltaData); } catch (_) {}
    try { ind.s.line?.setData(oiLine);  }   catch (_) {}

    // Stocke les données brutes pour le tooltip
    ind.s._oiRaw = data;
    this.#updateOIPriceLine(sym, data.at(-1)?.oi);
  }

  /** Affiche l'OI courant comme label dans le sous-panneau (price line à 0) */
  #updateOIPriceLine(sym, currentOI) {
    // Affiché dans le titre du panneau — pas de price line (différentes unités)
    // (réservé pour une future amélioration UI)
  }

  // ── Funding Rate ─────────────────────────────────────────

  async #loadFunding(sym, tf, candles, ind) {
    if (!ind?.s) return;
    const [history, current] = await Promise.all([
      fetchFundingHistory(sym, 200),
      fetchCurrentFunding(sym),
    ]);

    if (!history.length) return;

    // ── Barres funding (toutes les 8h / variable selon paire) ──
    const fundingBars = history.map(pt => ({
      time:  pt.time,
      value: pt.rate,
      color: pt.rate >= 0
        ? `rgba(255,61,90,${Math.min(0.9, 0.3 + Math.abs(pt.rate) * 30)})`  // positif = longs paient → bearish
        : `rgba(0,255,136,${Math.min(0.9, 0.3 + Math.abs(pt.rate) * 30)})`, // négatif = shorts paient → bullish
    }));

    // Ligne zéro (référence)
    const t0 = history[0].time;
    const t1 = history.at(-1).time;
    const zeroLine = [{ time: t0, value: 0 }, { time: t1, value: 0 }];

    try { ind.s.bars?.setData(fundingBars);  } catch (_) {}
    try { ind.s.zero?.setData(zeroLine);     } catch (_) {}

    // ── Price line funding courant sur le chart principal ───
    this.#removeFundingPriceLine();
    if (current.fundingRate !== 0) {
      this.#applyFundingPriceLine(current);
    }

    ind.s._currentFunding = current;
    ind.s._nextFundingTime = current.nextFundingTime;
  }

  /**
   * Crée / met à jour la price line "Funding" sur le chart principal.
   * Utilise le markPrice comme prix de référence (ligne invisible),
   * mais affiche le funding en titre pour information contextuelle.
   */
  #applyFundingPriceLine(current) {
    if (!this.#cSeries) return;
    try {
      const isPositive = current.fundingRate >= 0;
      const pct        = current.fundingRate.toFixed(4);
      this.#fundingPriceLine = this.#cSeries.createPriceLine({
        price:            current.markPrice,
        color:            isPositive ? 'rgba(255,61,90,0.55)' : 'rgba(0,255,136,0.55)',
        lineWidth:        1,
        lineStyle:        3,  // dotted
        axisLabelVisible: true,
        title:            `${FUNDING_PRICE_LINE_TITLE} ${isPositive ? '+' : ''}${pct}%`,
      });
    } catch (_) {}
  }

  #removeFundingPriceLine() {
    if (!this.#fundingPriceLine || !this.#cSeries) return;
    try { this.#cSeries.removePriceLine(this.#fundingPriceLine); } catch (_) {}
    this.#fundingPriceLine = null;
  }

  #startFundingRefresh(sym, ind) {
    this.#stopFundingRefresh();
    this.#fundingTimer = setInterval(async () => {
      try {
        const current = await fetchCurrentFunding(sym);
        this.#removeFundingPriceLine();
        this.#applyFundingPriceLine(current);
        if (ind?.s) ind.s._currentFunding = current;
      } catch (_) {}
    }, FUNDING_INTERVAL_MS);
  }

  #stopFundingRefresh() {
    if (this.#fundingTimer !== null) {
      clearInterval(this.#fundingTimer);
      this.#fundingTimer = null;
    }
  }

  // ── Long/Short Ratio ──────────────────────────────────────

  async #loadLSR(sym, tf, candles, ind) {
    if (!ind?.s) return;
    const period = fapiPeriod(tf);
    const data   = await fetchLongShortRatio(sym, period, 500);
    if (!data.length) return;

    const lsrLine = data.map(pt => ({
      time:  pt.time,
      value: pt.ratio,
    }));

    // Zone au-dessus de 1 = dominance longs (teinte verte subtile via histogram)
    const lsrHist = data.map(pt => ({
      time:  pt.time,
      value: pt.ratio - 1,  // centré sur 0
      color: pt.ratio >= 1
        ? 'rgba(0,255,136,0.25)'
        : 'rgba(255,61,90,0.25)',
    }));

    // Baseline 1.0
    const t0 = data[0].time;
    const t1 = data.at(-1).time;
    const baseline = [{ time: t0, value: 0 }, { time: t1, value: 0 }];

    try { ind.s.line?.setData(lsrLine);   } catch (_) {}
    try { ind.s.hist?.setData(lsrHist);   } catch (_) {}
    try { ind.s.base?.setData(baseline);  } catch (_) {}

    ind.s._lsrRaw = data;
  }
}

// ── Helpers de construction de sous-panneaux ─────────────────
// Utilisés par ChartIndicators.js pour créer les séries LW

/**
 * Crée les séries LightweightCharts pour l'OI.
 * @param {IChartApi} ch — sous-chart LW
 * @returns {{ delta: ISeriesApi, line: ISeriesApi }}
 */
export function mountOISeries(ch) {
  const delta = ch.addHistogramSeries({
    priceScaleId:    'right',
    priceLineVisible: false,
    lastValueVisible: false,
    base: 0,
  });

  // Ligne OI normalisée (0..1) sur l'échelle secondaire
  const line = ch.addLineSeries({
    priceScaleId:    'oi_abs',
    color:           'rgba(0,200,255,0.80)',
    lineWidth:       1.5,
    priceLineVisible: false,
    lastValueVisible: true,
    lineStyle:       0,
  });

  ch.priceScale('oi_abs').applyOptions({
    position:      'left',
    visible:       true,
    borderColor:   COLORS.GRID,
    scaleMargins:  { top: 0.05, bottom: 0.05 },
  });

  ch.priceScale('right').applyOptions({
    scaleMargins: { top: 0.2, bottom: 0.1 },
  });

  return { delta, line };
}

/**
 * Crée les séries LightweightCharts pour le Funding Rate.
 * @param {IChartApi} ch
 * @returns {{ bars: ISeriesApi, zero: ISeriesApi }}
 */
export function mountFundingSeries(ch) {
  const bars = ch.addHistogramSeries({
    priceScaleId:    'right',
    priceLineVisible: false,
    lastValueVisible: true,
    base: 0,
  });

  const zero = ch.addLineSeries({
    priceScaleId:    'right',
    color:           'rgba(255,255,255,0.18)',
    lineWidth:       1,
    lineStyle:       2,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  ch.priceScale('right').applyOptions({
    scaleMargins: { top: 0.1, bottom: 0.1 },
  });

  return { bars, zero };
}

/**
 * Crée les séries LightweightCharts pour le Long/Short Ratio.
 * @param {IChartApi} ch
 * @returns {{ line: ISeriesApi, hist: ISeriesApi, base: ISeriesApi }}
 */
export function mountLSRSeries(ch) {
  const hist = ch.addHistogramSeries({
    priceScaleId:    'right',
    priceLineVisible: false,
    lastValueVisible: false,
    base: 0,
  });

  const line = ch.addLineSeries({
    priceScaleId:    'lsr_line',
    color:           '#f7c948',
    lineWidth:       2,
    priceLineVisible: true,
    lastValueVisible: true,
  });

  const base = ch.addLineSeries({
    priceScaleId:    'right',
    color:           'rgba(255,255,255,0.18)',
    lineWidth:       1,
    lineStyle:       2,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  ch.priceScale('lsr_line').applyOptions({
    position:      'left',
    visible:       true,
    borderColor:   COLORS.GRID,
    scaleMargins:  { top: 0.1, bottom: 0.1 },
  });

  ch.priceScale('right').applyOptions({
    scaleMargins: { top: 0.2, bottom: 0.1 },
  });

  return { line, hist, base };
}
