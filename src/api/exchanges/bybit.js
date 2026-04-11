// ============================================================
//  src/api/exchanges/bybit.js — CrypView V3.7
//  Adaptateur Bybit — ticker REST public (aucune clé API).
//
//  Endpoints utilisés :
//    GET https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT
//
//  Format retourné (normalisé) :
//    { exchange, symbol, price, bid, ask, volume24h, pct24h, timestamp }
// ============================================================

const BYBIT_REST = 'https://api.bybit.com/v5/market';

/**
 * Convertit le symbol CrypView (btcusdt) → format Bybit (BTCUSDT).
 * @param {string} symbol
 * @returns {string}
 */
function toBybitSymbol(symbol) {
  return symbol.toUpperCase();
}

/**
 * Récupère le ticker spot Bybit pour un symbole donné.
 * Retourne null si la paire n'existe pas sur Bybit.
 *
 * @param {string} symbol — ex: 'btcusdt'
 * @returns {Promise<ExchangeTicker|null>}
 */
export async function fetchBybitTicker(symbol) {
  const sym = toBybitSymbol(symbol);
  const url = `${BYBIT_REST}/tickers?category=spot&symbol=${sym}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);
  const data = await res.json();

  // retCode 0 = succès ; liste vide = paire inconnue
  if (data.retCode !== 0 || !data.result?.list?.length) return null;

  const t = data.result.list[0];
  return {
    exchange:  'bybit',
    symbol:    sym,
    price:     parseFloat(t.lastPrice),
    bid:       parseFloat(t.bid1Price),
    ask:       parseFloat(t.ask1Price),
    volume24h: parseFloat(t.volume24h),
    pct24h:    parseFloat(t.price24hPcnt) * 100, // Bybit retourne en décimal (ex: 0.0245)
    timestamp: Date.now(),
  };
}

/**
 * Récupère les tickers de plusieurs symboles en un seul appel.
 * Bybit ne supporte pas encore la liste multi-symboles en spot V5,
 * donc on effectue des requêtes parallèles.
 *
 * @param {string[]} symbols
 * @returns {Promise<ExchangeTicker[]>}
 */
export async function fetchBybitTickers(symbols) {
  const results = await Promise.allSettled(
    symbols.map(sym => fetchBybitTicker(sym))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/**
 * @typedef {object} ExchangeTicker
 * @property {string} exchange
 * @property {string} symbol
 * @property {number} price
 * @property {number} bid
 * @property {number} ask
 * @property {number} volume24h
 * @property {number} pct24h    — en pourcentage (ex: 2.45)
 * @property {number} timestamp
 */
