// ============================================================
//  src/indicators/vwap.js — CrypView V2
//  Volume Weighted Average Price — fichier autonome.
//
//  Réexporté depuis moving-averages.js pour compatibilité,
//  disponible ici pour import direct sans charger tous les MA.
// ============================================================

/**
 * Calcule le VWAP cumulatif sur toute la série de bougies.
 * Formule : VWAP = Σ(TP × Volume) / Σ(Volume)
 * où TP = (High + Low + Close) / 3
 *
 * @param {Array<{high:number,low:number,close:number,volume:number,time:number}>} candles
 * @returns {Array<{time:number, value:number}>}
 */
export function calcVWAP(candles) {
  let cumulPV = 0;
  let cumulV  = 0;
  return candles.map(c => {
    const tp = (c.high + c.low + c.close) / 3;
    cumulPV += tp * c.volume;
    cumulV  += c.volume;
    return { time: c.time, value: cumulV ? cumulPV / cumulV : c.close };
  });
}
