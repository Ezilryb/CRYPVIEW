// ============================================================
//  src/indicators/index.js — CrypView V2
//  Point d'entrée unique pour tous les indicateurs.
//  Importer depuis ici plutôt que depuis les fichiers individuels.
//
//  Usage :
//    import { calcRSI, calcMACD, calcBB } from '../indicators/index.js';
// ============================================================

// Primitives de calcul partagées
export { closes, sma, ema, wma, stdev } from './moving-averages.js';

// Moyennes mobiles et indicateurs de tendance
// Note : calcVWAP est exporté depuis ./vwap.js (reset journalier 00:00 UTC)
//        et NON depuis ./moving-averages.js (version cumulative incorrecte).
export { calcMA, calcHMA }   from './moving-averages.js';
export { calcVWAP }          from './vwap.js';

// Volatilité
export { calcBB, calcATR, calcKeltner, calcSuperTrend } from './volatility.js';

// Ichimoku (fichier dédié pour sa complexité)
export { calcIchimoku } from './ichimoku.js';

// Oscillateurs et momentum
export {
  calcRSI,
  calcMACD,
  calcStoch,
  calcCCI,
  calcADX,
  calcWilliamsR,
  calcMFI,
  calcMom,
} from './oscillators.js';
