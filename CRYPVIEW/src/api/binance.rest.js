// ============================================================
//  src/api/binance.rest.js — CrypView V2
//  Toutes les requêtes HTTP vers l'API REST Binance.
//  Aucun appel fetch() ne doit exister en dehors de ce fichier.
// ============================================================

import { BINANCE, HISTORY_LIMITS, TF_API_MAP } from '../config.js';

// ── Symboles fallback si l'API exchangeInfo est indisponible ──
const FALLBACK_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT']
  .map((base) => ({ symbol: base.toLowerCase() + 'usdt', base, quote: 'USDT' }));

/**
 * Charge les bougies historiques depuis l'API REST Binance.
 * Gère automatiquement l'adaptation du timeframe (1s→1m, 5d→1d).
 *
 * @param {string} symbol    — Ex: 'btcusdt'
 * @param {string} timeframe — Ex: '1s', '5m', '1h'
 * @returns {Promise<RawKline[]>} — Tableau de klines brutes Binance
 * @throws {Error} si la requête échoue ou retourne un tableau vide
 */
export async function fetchKlines(symbol, timeframe) {
  // Adapte les timeframes non natifs (ex: 1s → 1m pour l'API)
  const apiInterval = TF_API_MAP[timeframe] ?? timeframe;
  const limit       = HISTORY_LIMITS[timeframe] ?? HISTORY_LIMITS.default;
  const url         = BINANCE.klines(symbol, apiInterval, limit);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Réponse vide');

  return data;
}

/**
 * Convertit un tableau de klines brutes Binance en objets Candle normalisés.
 *
 * @param {RawKline[]} raw
 * @returns {Candle[]}
 */
export function parseKlines(raw) {
  return raw.map((k) => ({
    time:   Math.floor(k[0] / 1000),
    open:   +k[1],
    high:   +k[2],
    low:    +k[3],
    close:  +k[4],
    volume: +k[5],
  }));
}

/**
 * Charge la liste de tous les symboles USDT actifs sur Binance Spot.
 * En cas d'échec réseau, retourne une liste de fallback pour ne pas bloquer l'UI.
 *
 * @returns {Promise<SymbolInfo[]>}
 */
export async function loadAllSymbols() {
  try {
    const res  = await fetch(BINANCE.EXCHANGE_INFO);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.symbols
      .filter((s) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map((s) => ({ symbol: s.symbol.toLowerCase(), base: s.baseAsset, quote: s.quoteAsset }))
      .sort((a, b) => a.base.localeCompare(b.base));
  } catch {
    // Retour silencieux : l'UI reste fonctionnelle avec les paires majeures
    return FALLBACK_SYMBOLS;
  }
}

/**
 * Charge les transactions agrégées (aggTrades) sur une fenêtre temporelle.
 *
 * Gère automatiquement la pagination par timestamp pour dépasser la limite
 * unitaire de 1 000 résultats de l'API Binance.
 *
 * Stratégie de pagination :
 *   1. Premier appel : startTime + endTime + limit
 *   2. Si 1 000 résultats reçus → nouvel appel avec startTime = lastTrade.T + 1
 *   3. Arrêt si : résultats < limit, endTime atteint, ou maxTotal atteint
 *
 * ⚠️  Binance peut renvoyer des milliers de trades par minute sur les paires
 *      liquides (ex: BTCUSDT). Le paramètre `maxTotal` évite une surcharge mémoire.
 *      Pour un seed Footprint haute-fidélité, 5 000 trades couvrent généralement
 *      les dernières 1 à 50 bougies selon la liquidité de la paire.
 *
 * @param {string} symbol     — Ex: 'btcusdt'
 * @param {number} startTime  — Timestamp de début en ms (Unix)
 * @param {number} endTime    — Timestamp de fin en ms (Unix)
 * @param {number} [maxTotal=5000] — Plafond de trades à récupérer
 * @returns {Promise<AggTrade[]>}
 * @throws {Error} si la requête HTTP échoue (les erreurs réseau silencieuses
 *                 sont gérées par les appelants)
 */
export async function fetchAggTrades(symbol, startTime, endTime, maxTotal = 5_000) {
  const results      = [];
  const BATCH_LIMIT  = 1_000;
  let   currentStart = startTime;

  while (results.length < maxTotal) {
    // Limite effective : min(BATCH_LIMIT, trades restants avant le plafond)
    const limit = Math.min(BATCH_LIMIT, maxTotal - results.length);

    const url = `${BINANCE.REST_BASE}/aggTrades` +
      `?symbol=${symbol.toUpperCase()}` +
      `&startTime=${currentStart}` +
      `&endTime=${endTime}` +
      `&limit=${limit}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const batch = await res.json();
    if (!Array.isArray(batch) || !batch.length) break;

    results.push(...batch);

    // Moins de `limit` résultats → plus aucune donnée dans cette fenêtre
    if (batch.length < limit) break;

    // Avance la fenêtre temporelle au-delà du dernier trade reçu
    const lastTradeTime = batch[batch.length - 1].T;
    currentStart = lastTradeTime + 1;

    // Fenêtre épuisée
    if (currentStart >= endTime) break;
  }

  return results;
}

// ── JSDoc typedefs ────────────────────────────────────────────

/**
 * @typedef {Array} RawKline
 * Format Binance : [openTime, open, high, low, close, volume, ...]
 */

/**
 * @typedef {Object} Candle
 * @property {number} time   — Timestamp Unix en secondes
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * @typedef {Object} SymbolInfo
 * @property {string} symbol — Ex: 'btcusdt'
 * @property {string} base   — Ex: 'BTC'
 * @property {string} quote  — Ex: 'USDT'
 */

/**
 * @typedef {Object} AggTrade
 * Format Binance aggTrades :
 * @property {number}  a — Aggregate tradeId
 * @property {string}  p — Price
 * @property {string}  q — Quantity
 * @property {number}  f — First tradeId
 * @property {number}  l — Last tradeId
 * @property {number}  T — Timestamp en ms
 * @property {boolean} m — isBuyerMaker : true = vendeur agressif (SELL),
 *                         false = acheteur agressif (BUY)
 * @property {boolean} M — Was the trade the best price match?
 */
