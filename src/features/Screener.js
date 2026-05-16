// ============================================================
//  src/features/Screener.js — CrypView V3.1
//  Couche données du Market Screener.
//  Source : Binance GET /api/v3/ticker/24hr (un seul appel REST)
//
//  Métriques calculées :
//    posInRange   — position [0..1] dans la range 24h
//                   (>0.8 = zone résistance / breakout, <0.2 = zone support)
//    rangePct     — amplitude 24h en % (proxy volatilité)
//    distHighPct  — écart en % depuis le sommet 24h
//    score        — composite pour chaque catégorie
// ============================================================

import { BINANCE } from '../config.js';

const MIN_QUOTE_VOL = 500_000;

const NEAR_HIGH_THRESH = 0.80;
const NEAR_LOW_THRESH  = 0.20;

/**
 * @typedef {object} ScreenerRow
 * @property {string}  symbol
 * @property {string}  base
 * @property {number}  price
 * @property {number}  pct
 * @property {number}  vol
 * @property {number}  high
 * @property {number}  low
 * @property {number}  rangePct
 * @property {number}  posInRange
 * @property {number}  distHighPct
 * @property {number}  count
 * @property {number}  scoreMover
 * @property {number}  scoreVol
 * @property {number}  scoreBreakout
 * @property {number}  scoreExtreme
 * @property {number}  scoreVolat
 */

/**
 * @returns {Promise<ScreenerRow[]>}
 */
export async function fetchScreenerData() {
  const res = await fetch(`${BINANCE.REST_BASE}/ticker/24hr`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();

  /** @type {ScreenerRow[]} */
  const rows = [];

  for (const t of raw) {
    if (!t.symbol.endsWith('USDT')) continue;

    const price  = +t.lastPrice;
    const open   = +t.openPrice;
    const high   = +t.highPrice;
    const low    = +t.lowPrice;
    const vol    = +t.quoteVolume;
    const pct    = +t.priceChangePercent;
    const count  = +t.count;

    if (vol < MIN_QUOTE_VOL || price <= 0) continue;

    const range     = high - low;
    const rangePct  = low > 0 ? (range / low) * 100 : 0;
    const posInRange = range > 0 ? (price - low) / range : 0.5;
    const distHighPct = high > 0 ? ((high - price) / high) * 100 : 0;

    rows.push({
      symbol:       t.symbol,
      base:         t.symbol.replace('USDT', ''),
      price,
      pct,
      vol,
      high,
      low,
      rangePct,
      posInRange,
      distHighPct,
      count,
      scoreMover:    Math.abs(pct),
      scoreVol:      vol,
      scoreBreakout: posInRange,
      scoreExtreme:  posInRange >= 0.5
        ? posInRange
        : 1 - posInRange,
      scoreVolat:    rangePct,
    });
  }

  return rows;
}

/**
 * @param {ScreenerRow[]} rows
 * @param {'all'|'gainers'|'losers'|'volume'|'breakout'|'extremes'} tab
 * @param {string} search
 * @returns {ScreenerRow[]}
 */
export function filterRows(rows, tab, search = '') {
  let filtered = rows;

  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filtered = filtered.filter(r => r.base.startsWith(q));
  }

  switch (tab) {
    case 'gainers':
      return filtered.filter(r => r.pct > 0).sort((a, b) => b.pct - a.pct);
    case 'losers':
      return filtered.filter(r => r.pct < 0).sort((a, b) => a.pct - b.pct);
    case 'volume':
      return filtered.sort((a, b) => b.vol - a.vol);
    case 'breakout':
      return filtered
        .filter(r => r.posInRange >= NEAR_HIGH_THRESH)
        .sort((a, b) => b.posInRange - a.posInRange);
    case 'extremes':
      return filtered
        .filter(r => r.posInRange >= NEAR_HIGH_THRESH || r.posInRange <= NEAR_LOW_THRESH)
        .sort((a, b) => b.scoreExtreme - a.scoreExtreme);
    case 'volatile':
      return filtered.sort((a, b) => b.rangePct - a.rangePct);
    default:
      return filtered.sort((a, b) => b.vol - a.vol);
  }
}

/**
 * @param {ScreenerRow[]} rows
 * @param {keyof ScreenerRow} key
 * @param {'asc'|'desc'} dir
 * @returns {ScreenerRow[]}
 */
export function sortRows(rows, key, dir) {
  return [...rows].sort((a, b) => {
    const av = a[key] ?? 0;
    const bv = b[key] ?? 0;
    return dir === 'asc' ? av - bv : bv - av;
  });
}
