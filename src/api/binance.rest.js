// ============================================================
//  src/api/binance.rest.js — CrypView V2
//  Toutes les requêtes HTTP vers l'API REST Binance.
//  Aucun appel fetch() ne doit exister en dehors de ce fichier.
// ============================================================

import { BINANCE, HISTORY_LIMITS, TF_API_MAP } from '../config.js';

const FALLBACK_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT']
  .map((base) => ({ symbol: base.toLowerCase() + 'usdt', base, quote: 'USDT' }));

/**
 * @param {string} symbol
 * @param {string} timeframe
 * @returns {Promise<RawKline[]>}
 * @throws {Error}
 */
export async function fetchKlines(symbol, timeframe) {
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
    return FALLBACK_SYMBOLS;
  }
}

/**
 * @param {string} symbol
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} [maxTotal=5000]
 * @returns {Promise<AggTrade[]>}
 * @throws {Error}
 */
export async function fetchAggTrades(symbol, startTime, endTime, maxTotal = 5_000) {
  const results      = [];
  const BATCH_LIMIT  = 1_000;
  let   currentStart = startTime;

  while (results.length < maxTotal) {
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

    if (batch.length < limit) break;

    const lastTradeTime = batch[batch.length - 1].T;
    currentStart = lastTradeTime + 1;

    if (currentStart >= endTime) break;
  }

  return results;
}

/**
 * @typedef {Array} RawKline
 */

/**
 * @typedef {Object} Candle
 * @property {number} time
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */

/**
 * @typedef {Object} SymbolInfo
 * @property {string} symbol
 * @property {string} base
 * @property {string} quote
 */

/**
 * @typedef {Object} AggTrade
 * @property {number}  a
 * @property {string}  p
 * @property {string}  q
 * @property {number}  f
 * @property {number}  l
 * @property {number}  T
 * @property {boolean} m
 * @property {boolean} M
 */
