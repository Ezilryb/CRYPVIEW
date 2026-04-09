// ============================================================
//  src/api/exchanges/okx.js — CrypView V3.7
//  Adaptateur OKX — ticker REST public (aucune clé API).
//
//  Endpoints utilisés :
//    GET https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT
//
//  Format retourné (normalisé) : même structure que bybit.js
// ============================================================

const OKX_REST = 'https://www.okx.com/api/v5/market';

/**
 * Convertit le symbol CrypView (btcusdt) → format OKX (BTC-USDT).
 * @param {string} symbol
 * @returns {string}
 */
function toOKXInstrument(symbol) {
  // 'btcusdt' → 'BTC-USDT'
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT'))  return `${upper.slice(0, -4)}-USDT`;
  if (upper.endsWith('USDC'))  return `${upper.slice(0, -4)}-USDC`;
  if (upper.endsWith('BTC'))   return `${upper.slice(0, -3)}-BTC`;
  return upper; // fallback
}

/**
 * Récupère le ticker spot OKX.
 * Retourne null si la paire n'existe pas sur OKX.
 *
 * @param {string} symbol — ex: 'btcusdt'
 * @returns {Promise<ExchangeTicker|null>}
 */
export async function fetchOKXTicker(symbol) {
  const instId = toOKXInstrument(symbol);
  const url = `${OKX_REST}/ticker?instId=${instId}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
  const data = await res.json();

  if (data.code !== '0' || !data.data?.length) return null;

  const t = data.data[0];
  return {
    exchange:  'okx',
    symbol:    symbol.toUpperCase(),
    price:     parseFloat(t.last),
    bid:       parseFloat(t.bidPx),
    ask:       parseFloat(t.askPx),
    volume24h: parseFloat(t.vol24h),  // en tokens de base
    pct24h:    ((parseFloat(t.last) - parseFloat(t.open24h)) / parseFloat(t.open24h)) * 100,
    timestamp: Date.now(),
  };
}

/**
 * Récupère le ticker de plusieurs symboles (requêtes parallèles).
 * @param {string[]} symbols
 * @returns {Promise<ExchangeTicker[]>}
 */
export async function fetchOKXTickers(symbols) {
  const results = await Promise.allSettled(
    symbols.map(sym => fetchOKXTicker(sym))
  );
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/** @typedef {import('./bybit.js').ExchangeTicker} ExchangeTicker */
