// ============================================================
//  src/api/binance.fapi.js — CrypView V3.6
//  Requêtes REST vers l'API Futures Binance (FAPI).
//
//  Sources :
//    fapi.binance.com  → données mark price, funding courant
//    fapi.binance.com/futures/data → historiques OI, LSR
//
//  Aucun appel fetch() ne doit exister en dehors de ce fichier
//  pour les données futures.
// ============================================================

const FAPI_BASE  = 'https://fapi.binance.com/fapi/v1';
const FDATA_BASE = 'https://fapi.binance.com/futures/data';

const TF_TO_FAPI_PERIOD = {
  '1s':  '5m',  '1m':  '5m',  '3m':  '5m',  '5m':  '5m',
  '15m': '15m', '30m': '30m',
  '1h':  '1h',  '2h':  '2h',
  '4h':  '4h',  '6h':  '6h',
  '12h': '12h', '1d':  '1d',
  '3d':  '1d',  '1w':  '1d',  '1M':  '1d',
};

/**
 * @param {string} tf
 * @returns {string}
 */
export function fapiPeriod(tf) {
  return TF_TO_FAPI_PERIOD[tf] ?? '5m';
}

/**
 * @param {string} symbol
 * @param {string} period
 * @param {number} [limit=500]
 * @returns {Promise<OIPoint[]>}
 */
export async function fetchOIHistory(symbol, period = '5m', limit = 500) {
  const url = `${FDATA_BASE}/openInterestHist` +
    `?symbol=${symbol.toUpperCase()}&period=${period}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FAPI OI HTTP ${res.status}`);
  const data = await res.json();

  /** @type {OIPoint[]} */
  return data.map(d => ({
    time:   Math.floor(d.timestamp / 1_000),
    oi:     parseFloat(d.sumOpenInterest),
    oiUsd:  parseFloat(d.sumOpenInterestValue),
  }));
}

/**
 * @param {string} symbol
 * @param {number} [limit=200]
 * @returns {Promise<FundingPoint[]>}
 */
export async function fetchFundingHistory(symbol, limit = 200) {
  const url = `${FAPI_BASE}/fundingRate` +
    `?symbol=${symbol.toUpperCase()}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FAPI Funding HTTP ${res.status}`);
  const data = await res.json();

  return data.map(d => ({
    time:    Math.floor(d.fundingTime / 1_000),
    rate:    parseFloat(d.fundingRate) * 100,
    rateRaw: parseFloat(d.fundingRate),
  }));
}

/**
 * @param {string} symbol
 * @returns {Promise<{ markPrice: number, fundingRate: number, nextFundingTime: number }>}
 */
export async function fetchCurrentFunding(symbol) {
  const url = `${FAPI_BASE}/premiumIndex?symbol=${symbol.toUpperCase()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FAPI PremiumIndex HTTP ${res.status}`);
  const d = await res.json();
  return {
    markPrice:      parseFloat(d.markPrice),
    fundingRate:    parseFloat(d.lastFundingRate) * 100,
    nextFundingTime: d.nextFundingTime,
  };
}

/**
 * @param {string} symbol
 * @param {string} period
 * @param {number} [limit=500]
 * @returns {Promise<LSRPoint[]>}
 */
export async function fetchLongShortRatio(symbol, period = '5m', limit = 500) {
  const url = `${FDATA_BASE}/globalLongShortAccountRatio` +
    `?symbol=${symbol.toUpperCase()}&period=${period}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FAPI LSR HTTP ${res.status}`);
  const data = await res.json();

  return data.map(d => ({
    time:       Math.floor(d.timestamp / 1_000),
    ratio:      parseFloat(d.longShortRatio),
    longPct:    parseFloat(d.longAccount)  * 100,
    shortPct:   parseFloat(d.shortAccount) * 100,
  }));
}

/**
 * @param {string} symbol
 * @returns {Promise<{ oi: number, time: number }>}
 */
export async function fetchCurrentOI(symbol) {
  const url = `${FAPI_BASE}/openInterest?symbol=${symbol.toUpperCase()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FAPI OI current HTTP ${res.status}`);
  const d = await res.json();
  return {
    oi:   parseFloat(d.openInterest),
    time: Math.floor(d.time / 1_000),
  };
}

/**
 * @param {string} symbol
 * @returns {Promise<boolean>}
 */
export async function isFuturesSymbol(symbol) {
  try {
    const url = `${FAPI_BASE}/exchangeInfo`;
    const res = await fetch(url);
    if (!res.ok) return false;
    const d = await res.json();
    const sym = symbol.toUpperCase();
    return d.symbols?.some(s =>
      s.symbol === sym &&
      s.contractType === 'PERPETUAL' &&
      s.status === 'TRADING'
    ) ?? false;
  } catch (_) {
    return false;
  }
}

/**
 * @typedef {Object} OIPoint
 * @property {number} time
 * @property {number} oi
 * @property {number} oiUsd
 */

/**
 * @typedef {Object} FundingPoint
 * @property {number} time
 * @property {number} rate
 * @property {number} rateRaw
 */

/**
 * @typedef {Object} LSRPoint
 * @property {number} time
 * @property {number} ratio
 * @property {number} longPct
 * @property {number} shortPct
 */
