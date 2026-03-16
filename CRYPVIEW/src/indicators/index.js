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
export { calcMA, calcHMA, calcVWAP }      from './moving-averages.js';

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
