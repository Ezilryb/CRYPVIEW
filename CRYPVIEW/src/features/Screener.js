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

/** Volume USDT minimum pour figurer dans le screener */
const MIN_QUOTE_VOL = 500_000; // 500k USDT

/** Seuil de posInRange pour "near high" / "near low" */
const NEAR_HIGH_THRESH = 0.80;
const NEAR_LOW_THRESH  = 0.20;

/**
 * @typedef {object} ScreenerRow
 * @property {string}  symbol
 * @property {string}  base         — ex: 'BTC'
 * @property {number}  price
 * @property {number}  pct          — variation 24h en %
 * @property {number}  vol          — volume en USDT (quoteVolume)
 * @property {number}  high
 * @property {number}  low
 * @property {number}  rangePct     — (high-low)/low × 100
 * @property {number}  posInRange   — 0..1
 * @property {number}  distHighPct  — % en-dessous du sommet 24h
 * @property {number}  count        — nombre de trades 24h
 * @property {number}  scoreMover   — score gainers/losers
 * @property {number}  scoreVol     — score volume
 * @property {number}  scoreBreakout — score breakout (près du high)
 * @property {number}  scoreExtreme  — score extrême (près du low ou high)
 * @property {number}  scoreVolat    — score volatilité (amplitude range)
 */

/**
 * Charge et calcule toutes les métriques du screener.
 * @returns {Promise<ScreenerRow[]>}
 */
export async function fetchScreenerData() {
  const res = await fetch(`${BINANCE.REST_BASE}/ticker/24hr`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();

  /** @type {ScreenerRow[]} */
  const rows = [];

  for (const t of raw) {
    // Filtre : paires USDT uniquement
    if (!t.symbol.endsWith('USDT')) continue;

    const price  = +t.lastPrice;
    const open   = +t.openPrice;
    const high   = +t.highPrice;
    const low    = +t.lowPrice;
    const vol    = +t.quoteVolume;          // en USDT
    const pct    = +t.priceChangePercent;
    const count  = +t.count;

    // Filtre : liquidité minimale
    if (vol < MIN_QUOTE_VOL || price <= 0) continue;

    const range     = high - low;
    const rangePct  = low > 0 ? (range / low) * 100 : 0;
    const posInRange = range > 0 ? (price - low) / range : 0.5;
    const distHighPct = high > 0 ? ((high - price) / high) * 100 : 0;

    // Scores normalisés [0..1] — seront re-normalisés après tri
    // On stocke les valeurs brutes d'abord
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
      // Scores calculés ci-dessous
      scoreMover:    Math.abs(pct),
      scoreVol:      vol,
      scoreBreakout: posInRange,    // plus haut = plus proche du high
      scoreExtreme:  posInRange >= 0.5
        ? posInRange              // côté overbought
        : 1 - posInRange,         // côté oversold (symétrique)
      scoreVolat:    rangePct,
    });
  }

  return rows;
}

// ── Filtres ───────────────────────────────────────────────────

/**
 * Retourne les lignes selon l'onglet actif.
 *
 * @param {ScreenerRow[]} rows
 * @param {'all'|'gainers'|'losers'|'volume'|'breakout'|'extremes'} tab
 * @param {string} search — filtre texte sur base
 * @returns {ScreenerRow[]}
 */
export function filterRows(rows, tab, search = '') {
  let filtered = rows;

  // Filtre texte
  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filtered = filtered.filter(r => r.base.startsWith(q));
  }

  // Filtre par onglet
  switch (tab) {
    case 'gainers':
      return filtered.filter(r => r.pct > 0).sort((a, b) => b.pct - a.pct);
    case 'losers':
      return filtered.filter(r => r.pct < 0).sort((a, b) => a.pct - b.pct);
    case 'volume':
      return filtered.sort((a, b) => b.vol - a.vol);
    case 'breakout':
      // Près du sommet 24h + variation positive
      return filtered
        .filter(r => r.posInRange >= NEAR_HIGH_THRESH)
        .sort((a, b) => b.posInRange - a.posInRange);
    case 'extremes':
      // Overbought (>80%) ou oversold (<20%)
      return filtered
        .filter(r => r.posInRange >= NEAR_HIGH_THRESH || r.posInRange <= NEAR_LOW_THRESH)
        .sort((a, b) => b.scoreExtreme - a.scoreExtreme);
    case 'volatile':
      return filtered.sort((a, b) => b.rangePct - a.rangePct);
    default:
      // Tri par volume par défaut (vue "Tous")
      return filtered.sort((a, b) => b.vol - a.vol);
  }
}

/**
 * Tri générique d'un tableau de ScreenerRow.
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
