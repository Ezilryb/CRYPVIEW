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
// ✅ Corrigé : reset à 00:00 UTC chaque jour
export function calcVWAP(candles) {
  let cumulPV = 0;
  let cumulV  = 0;
  let currentDay = -1;

  return candles.map(c => {
    // c.time est en secondes (Unix) — on extrait le jour UTC
    const day = Math.floor(c.time / 86_400);
    if (day !== currentDay) {
      // Nouveau jour → reset complet
      cumulPV = 0;
      cumulV  = 0;
      currentDay = day;
    }
    const tp = (c.high + c.low + c.close) / 3;
    cumulPV += tp * c.volume;
    cumulV  += c.volume;
    return { time: c.time, value: cumulV ? cumulPV / cumulV : c.close };
  });
}