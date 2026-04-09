// ============================================================
//  src/api/geckoterminal.js — CrypView V3.7
//  Client GeckoTerminal — DEX pools search + OHLCV.
//  API publique gratuite, aucune clé requise.
//
//  Endpoints utilisés :
//    GET /api/v2/search/pools?query=PEPE
//    GET /api/v2/networks/{network}/pools/{address}/ohlcv/{timeframe}
//
//  Timeframes supportés : minute, hour, day
//
//  Usage :
//    const pools = await searchDEXPools('PEPE');
//    const candles = await fetchDEXOHLCV('eth', '0xabc...', 'hour');
// ============================================================

const GT_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.DEV)
  ? '/api/gecko/api/v2'                      // proxy Vite en dev local uniquement
  : 'https://api.geckoterminal.com/api/v2';  // direct — GitHub Pages, Vercel, etc.
const GT_HDRS  = { Accept: 'application/json;version=20230302' };

/** Réseaux pris en charge (identifiants GeckoTerminal). */
export const SUPPORTED_NETWORKS = {
  eth:       { label: 'Ethereum',  icon: 'Ξ' },
  bsc:       { label: 'BSC',       icon: '⬡' },
  polygon:   { label: 'Polygon',   icon: '⬡' },
  solana:    { label: 'Solana',    icon: '◎' },
  arbitrum:  { label: 'Arbitrum',  icon: '🔵' },
  base:      { label: 'Base',      icon: '🔵' },
  avalanche: { label: 'Avalanche', icon: '🔺' },
  optimism:  { label: 'Optimism',  icon: '🔴' },
};

/**
 * Recherche de pools DEX par nom de token.
 *
 * @param {string} query  — ex: 'PEPE', 'SHIB', '0xabc...'
 * @param {number} [page=1]
 * @returns {Promise<DEXPool[]>}
 */
export async function searchDEXPools(query, page = 1) {
  if (!query.trim()) return [];
  const url = `${GT_BASE}/search/pools?query=${encodeURIComponent(query)}&page=${page}`;
  const res = await fetch(url, {
    headers: GT_HDRS,
    signal:  AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`GeckoTerminal search HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map(parseDEXPool);
}

/**
 * Charge les N derniers OHLCV d'un pool DEX.
 *
 * @param {string}  network     — ex: 'eth', 'bsc', 'solana'
 * @param {string}  poolAddress — adresse du pool
 * @param {'minute'|'hour'|'day'} [timeframe='hour']
 * @param {number}  [limit=300]
 * @returns {Promise<Candle[]>}
 */
export async function fetchDEXOHLCV(network, poolAddress, timeframe = 'hour', limit = 300) {
  const tf  = toGTTimeframe(timeframe);
  const url = `${GT_BASE}/networks/${network}/pools/${poolAddress}/ohlcv/${tf}` +
              `?limit=${Math.min(limit, 1000)}&currency=usd`;

  const res = await fetch(url, {
    headers: GT_HDRS,
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GeckoTerminal OHLCV HTTP ${res.status}`);
  const json = await res.json();
  return parseDEXOHLCV(json);
}

/**
 * Récupère les top pools d'un réseau.
 * @param {string} network
 * @param {number} [page=1]
 * @returns {Promise<DEXPool[]>}
 */
export async function fetchTopPools(network, page = 1) {
  const url = `${GT_BASE}/networks/${network}/trending_pools?page=${page}`;
  const res = await fetch(url, { headers: GT_HDRS, signal: AbortSignal.timeout(8_000) });
  // 404 = réseau non supporté pour le trending (ex: polygon) → retour vide silencieux
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GeckoTerminal trending HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map(parseDEXPool);
}

/**
 * Récupère les pools pour un token spécifique (par adresse de contrat).
 * @param {string} network
 * @param {string} tokenAddress
 * @returns {Promise<DEXPool[]>}
 */
export async function fetchTokenPools(network, tokenAddress) {
  const url = `${GT_BASE}/networks/${network}/tokens/${tokenAddress}/pools?page=1`;
  const res = await fetch(url, { headers: GT_HDRS, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`GeckoTerminal token pools HTTP ${res.status}`);
  const json = await res.json();
  return (json.data ?? []).map(parseDEXPool);
}

// ── Parsers ───────────────────────────────────────────────────

/**
 * Convertit un item de l'API GeckoTerminal en DEXPool normalisé.
 * @param {object} item
 * @returns {DEXPool}
 */
function parseDEXPool(item) {
  const attr = item.attributes ?? {};
  const rel  = item.relationships ?? {};

  // GeckoTerminal structure les IDs pools en "{network}_{address}".
  // Pour /search/pools, relationships.network peut être absent → fallback sur item.id.
  const networkFromId = attr.address
    ? (item.id ?? '').replace(`_${attr.address}`, '')   // ex: "eth_0xabc" → "eth"
    : (item.id ?? '').split('_')[0];
  const networkId = rel.network?.data?.id ?? networkFromId ?? 'unknown';
  const dexId     = rel.dex?.data?.id     ?? '';
  const baseToken = attr.base_token_price_usd  ? 'base'  : null;

  return {
    id:           item.id,
    address:      attr.address ?? '',
    network:      networkId,
    dex:          dexId,
    name:         attr.name ?? '',
    symbol:       (attr.name ?? '').split('/')[0]?.trim() ?? '',
    baseSymbol:   (attr.name ?? '').split('/')[0]?.trim() ?? '',
    quoteSymbol:  (attr.name ?? '').split('/')[1]?.trim() ?? '',
    price:        parseFloat(attr.base_token_price_usd ?? 0),
    priceNative:  parseFloat(attr.base_token_price_native_currency ?? 0),
    volume24h:    parseFloat(attr.volume_usd?.h24 ?? 0),
    liquidity:    parseFloat(attr.reserve_in_usd ?? 0),
    priceChange24h: parseFloat(attr.price_change_percentage?.h24 ?? 0),
    createdAt:    attr.pool_created_at ?? null,
    fdv:          parseFloat(attr.fdv_usd ?? 0),
    txns24h: {
      buys:  parseInt(attr.transactions?.h24?.buys  ?? 0),
      sells: parseInt(attr.transactions?.h24?.sells ?? 0),
    },
  };
}

/**
 * Convertit les données OHLCV GeckoTerminal en Candle[] CrypView.
 * @param {object} json
 * @returns {Candle[]}
 */
export function parseDEXOHLCV(json) {
  const list = json?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list)) return [];

  return list
    .map(([ts, o, h, l, c, v]) => ({
      time:   Math.floor(ts),   // GeckoTerminal retourne déjà en secondes Unix
      open:   parseFloat(o),
      high:   parseFloat(h),
      low:    parseFloat(l),
      close:  parseFloat(c),
      volume: parseFloat(v),
    }))
    .filter(c => c.open > 0 && c.high > 0)
    .sort((a, b) => a.time - b.time);
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Convertit le timeframe CrypView → paramètre GeckoTerminal.
 * @param {string} tf
 * @returns {'minute'|'hour'|'day'}
 */
export function toGTTimeframe(tf) {
  const map = {
    '1s': 'minute', '1m': 'minute', '3m': 'minute',
    '5m': 'minute', '15m': 'minute', '30m': 'minute',
    '1h': 'hour',   '2h': 'hour',    '4h': 'hour',
    '6h': 'hour',   '12h': 'hour',
    '1d': 'day',    '3d': 'day',     '1w': 'day', '1M': 'day',
  };
  return map[tf] ?? 'hour';
}

/**
 * Construit un identifiant unique pour un pool DEX.
 * Format : "network:address" — utilisé comme symbol dans l'app.
 * @param {DEXPool} pool
 * @returns {string}
 */
export function poolToSymbol(pool) {
  return `dex:${pool.network}:${pool.address}`;
}

/**
 * Parse un identifiant pool depuis le format "dex:network:address".
 * @param {string} symbol
 * @returns {{ network: string, address: string } | null}
 */
export function parsePoolSymbol(symbol) {
  if (!symbol.startsWith('dex:')) return null;
  const [, network, address] = symbol.split(':');
  return network && address ? { network, address } : null;
}

// ── JSDoc typedefs ────────────────────────────────────────────

/**
 * @typedef {object} DEXPool
 * @property {string}  id
 * @property {string}  address
 * @property {string}  network
 * @property {string}  dex
 * @property {string}  name        — ex: 'PEPE / WETH'
 * @property {string}  symbol
 * @property {string}  baseSymbol
 * @property {string}  quoteSymbol
 * @property {number}  price       — en USD
 * @property {number}  priceNative
 * @property {number}  volume24h
 * @property {number}  liquidity
 * @property {number}  priceChange24h
 * @property {string|null} createdAt
 * @property {number}  fdv
 * @property {{ buys: number, sells: number }} txns24h
 */

/**
 * @typedef {object} Candle
 * @property {number} time
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 */
