// ============================================================
//  src/workers/indicators.worker.js — CrypView V2
//  Web Worker dédié aux calculs d'indicateurs coûteux.
//
//  Indicateurs déportés :
//    - Ichimoku  (5 séries, O(n) mais large constante)
//    - ADX + DI  (triple smoothing Wilder)
//    - SuperTrend (ATR + logique de tendance)
//    - MACD      (3 EMA imbriquées)
//
//  Protocole de messages :
//    → { requestId: string, key: string, candles: Candle[] }
//    ← { requestId: string, key: string, result: object }
//    ← { requestId: string, key: string, error: string }   (en cas d'erreur)
//
//  Les fonctions importées sont des fonctions pures (aucun effet de bord,
//  aucun accès DOM) — parfaitement adaptées à un Worker.
// ============================================================

import { calcIchimoku }             from '../indicators/ichimoku.js';
import { calcADX, calcMACD }        from '../indicators/oscillators.js';
import { calcSuperTrend }           from '../indicators/volatility.js';

/**
 * Table de dispatch : clé d'indicateur → fonction de calcul.
 * Chaque fonction reçoit un tableau de Candle[] et retourne
 * l'objet de données attendu par ChartIndicators.#applyWorkerResult.
 *
 * @type {Record<string, (candles: Candle[]) => object>}
 */
const CALCULATORS = {
  ichi: (candles) => calcIchimoku(candles),
  adx:  (candles) => calcADX(candles),
  st:   (candles) => calcSuperTrend(candles),
  macd: (candles) => calcMACD(candles),
};

/**
 * Gestionnaire de messages entrants.
 * Exécute le calcul demandé et renvoie le résultat (ou une erreur).
 */
self.onmessage = ({ data }) => {
  const { requestId, key, candles } = data;

  const calc = CALCULATORS[key];
  if (!calc) {
    self.postMessage({ requestId, key, error: `Calculateur inconnu : "${key}"` });
    return;
  }

  try {
    const result = calc(candles);
    self.postMessage({ requestId, key, result });
  } catch (err) {
    self.postMessage({ requestId, key, error: err?.message ?? String(err) });
  }
};
