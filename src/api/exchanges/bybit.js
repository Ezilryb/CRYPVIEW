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
 * @param {string} symbol
 * @returns {string}
 */
function toBybitSymbol(symbol) {
  return symbol.toUpperCase();
}

/**
 * @param {string} symbol
 * @returns {Promise<ExchangeTicker|null>}
 */
export async function fetchBybitTicker(symbol) {
  const sym = toBybitSymbol(symbol);
  const url = `${BYBIT_REST}/tickers?category=spot&symbol=${sym}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`Bybit HTTP ${res.status}`);
  const data = await res.json();

  if (data.retCode !== 0 || !data.result?.list?.length) return null;

  const t = data.result.list[0];
  return {
    exchange:  'bybit',
    symbol:    sym,
    price:     parseFloat(t.lastPrice),
    bid:       parseFloat(t.bid1Price),
    ask:       parseFloat(t.ask1Price),
    volume24h: parseFloat(t.volume24h),
    pct24h:    parseFloat(t.price24hPcnt) * 100,
    timestamp: Date.now(),
  };
}

/**
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
 * @property {number} pct24h
 * @property {number} timestamp
 */
