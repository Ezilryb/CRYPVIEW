// ============================================================
//  src/config.js — CrypView V2
//  Source unique de vérité pour toutes les constantes du projet.
//  NE JAMAIS coder ces valeurs en dur ailleurs.
// ============================================================

// ── Endpoints Binance ────────────────────────────────────────
export const BINANCE = {
  REST_BASE:     'https://api.binance.com/api/v3',
  WS_BASE:       'wss://stream.binance.com:9443/ws',

  /** URL REST pour les klines historiques */
  klines: (symbol, interval, limit) =>
    `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,

  /** URL REST pour la liste des symboles */
  EXCHANGE_INFO: 'https://api.binance.com/api/v3/exchangeInfo',

  /** URL WS stream kline */
  wsKline:  (symbol, interval) => `wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`,

  /** URL WS aggTrades (Footprint + Orderflow) */
  wsAgg:    (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`,

  /** URL WS ticker 24h */
  wsTicker: (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@ticker`,

  /** URL WS trades individuels (sidebar) */
  wsTrades: (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@trade`,
};

// ── Reconnexion WebSocket ────────────────────────────────────
export const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_DELAY_MS:          5_000,
  MAX_DELAY_MS:           30_000,
};

// ── Couleurs du thème ────────────────────────────────────────
export const COLORS = {
  GREEN:        '#00ff88',
  RED:          '#ff3d5a',
  GREEN_ALPHA:  '#00ff8835',
  RED_ALPHA:    '#ff3d5a35',
  GREEN_MID:    '#00ff8870',
  RED_MID:      '#ff3d5a70',
  PURPLE:       '#e040fb',
  CYAN:         '#00c8ff',
  ORANGE:       '#ff9900',
  PINK:         '#ff6eb4',
  YELLOW:       '#f7c948',
  LIME:         '#b0ff5c',
  TEAL:         '#00e5cc',
  MUTED:        '#8b949e',
  BG:           '#070a0f',
  BG_SURFACE:   '#13151d',
  GRID:         '#1c2333',
};

// ── Configuration des thèmes ──────────────────────────────────
/**
 * THEME.DEFAULT     : thème appliqué si aucun choix n'est en localStorage
 *                     et si le système ne signale pas de préférence.
 * THEME.STORAGE_KEY : clé localStorage pour persister le choix.
 * THEME.CSS_CLASS   : classe ajoutée sur <html> pour activer le thème clair.
 */
export const THEME = {
  DEFAULT:     'dark',
  STORAGE_KEY: 'crypview-theme',
  CSS_CLASS:   'light-theme',
};

// ── Options LightweightCharts de base ─────────────────────────
// Retourne un objet d'options à passer à createChart()
export function baseChartOptions(el, height) {
  return {
    layout: {
      background:  { color: COLORS.BG },
      textColor:   COLORS.MUTED,
      fontFamily:  "'Space Mono', monospace",
    },
    grid: {
      vertLines: { color: COLORS.GRID },
      horzLines: { color: COLORS.GRID },
    },
    crosshair: {
      mode: 1, // CrosshairMode.Normal — LightweightCharts doit être chargé avant
      vertLine: { color: `${COLORS.GREEN}55`, labelBackgroundColor: '#0d1117' },
      horzLine: { color: `${COLORS.GREEN}55`, labelBackgroundColor: '#0d1117' },
    },
    rightPriceScale: { borderColor: COLORS.GRID },
    timeScale: {
      borderColor:    COLORS.GRID,
      timeVisible:    true,
      secondsVisible: true,
    },
    width:  el.clientWidth,
    height: height || el.clientHeight,
  };
}

// ── Historique ────────────────────────────────────────────────
/** Nombre de bougies à charger selon le timeframe */
export const HISTORY_LIMITS = {
  '1s':    500,
  default: 300,
};

/** Certains TF custom doivent être remappés vers l'API Binance */
export const TF_API_MAP = {
  '1s': '1m',
  '5d': '1d',
};

/** Conversion timeframe → millisecondes (pour Footprint & Orderflow) */
export const TF_TO_MS = {
  '1s':  1_000,
  '1m':  60_000,
  '3m':  180_000,
  '5m':  300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h':  3_600_000,
  '2h':  7_200_000,
  '4h':  14_400_000,
  '6h':  21_600_000,
  '12h': 43_200_000,
  '1d':  86_400_000,
  '3d':  259_200_000,
  '1w':  604_800_000,
  '1M':  2_592_000_000,
};

// ── Throttle rendu Canvas ─────────────────────────────────────
/** Délai max entre deux redraws Footprint / Orderflow (ms) */
export const RENDER_THROTTLE_MS = 100;

/** Mémoire tampon maximale de bougies en RAM */
export const MAX_CANDLES_IN_MEMORY = 800;

/** Hauteur des panneaux d'indicateurs sous le chart principal */
export const IND_PANEL_HEIGHT = 125;

// ── Palettes LightweightCharts par thème ──────────────────────
// Utilisé par ChartCore et MultiChartInstance pour applyOptions()
// lors d'un changement de thème.
export const CHART_THEMES = {
  dark: {
    layout: {
      background: { color: '#070a0f' },
      textColor:   '#8b949e',
    },
    grid: {
      vertLines: { color: '#1c2333' },
      horzLines: { color: '#1c2333' },
    },
    crosshair: {
      vertLine: { color: '#00ff8855', labelBackgroundColor: '#0d1117' },
      horzLine: { color: '#00ff8855', labelBackgroundColor: '#0d1117' },
    },
    rightPriceScale: { borderColor: '#1c2333' },
    timeScale:       { borderColor: '#1c2333' },
  },
  light: {
    layout: {
      background: { color: '#f0f2f5' },
      textColor:   '#57606a',
    },
    grid: {
      vertLines: { color: '#d0d7e3' },
      horzLines: { color: '#d0d7e3' },
    },
    crosshair: {
      vertLine: { color: '#00a85a55', labelBackgroundColor: '#ffffff' },
      horzLine: { color: '#00a85a55', labelBackgroundColor: '#ffffff' },
    },
    rightPriceScale: { borderColor: '#d0d7e3' },
    timeScale:       { borderColor: '#d0d7e3' },
  },
};

// ── Métadonnées des indicateurs ───────────────────────────────
// Utilisé par IndicatorModal et la barre d'indicateurs actifs
export const IND_META = {
  ma:    { label: 'MA 20/50/200',        desc: 'Moyennes mobiles simples',          overlay: true,  color: COLORS.YELLOW,  cat: 'trend'      },
  bb:    { label: 'Bollinger (20)',       desc: 'Bandes de Bollinger',               overlay: true,  color: '#7c6fff',      cat: 'volatility' },
  vwap:  { label: 'VWAP',               desc: 'Volume Weighted Avg Price',          overlay: true,  color: '#00ffcc',      cat: 'trend'      },
  hma:   { label: 'HMA (20)',            desc: 'Hull Moving Average',               overlay: true,  color: COLORS.PINK,    cat: 'trend'      },
  ichi:  { label: 'Ichimoku Cloud',      desc: 'Nuage Ichimoku (9/26/52)',          overlay: true,  color: '#7fffff',      cat: 'trend'      },
  kelt:  { label: 'Keltner Channels',   desc: 'Canaux de Keltner (20)',            overlay: true,  color: COLORS.ORANGE,  cat: 'volatility' },
  st:    { label: 'SuperTrend (10,3)',   desc: 'Suivi de tendance dynamique',       overlay: true,  color: COLORS.GREEN,   cat: 'trend'      },
  rsi:   { label: 'RSI (14)',            desc: 'Relative Strength Index',           overlay: false, color: COLORS.CYAN,    cat: 'momentum'   },
  macd:  { label: 'MACD (12/26/9)',      desc: 'Moving Average Convergence',        overlay: false, color: COLORS.ORANGE,  cat: 'momentum'   },
  stoch: { label: 'Stoch (14)',          desc: 'Oscillateur stochastique',          overlay: false, color: COLORS.PINK,    cat: 'momentum'   },
  cci:   { label: 'CCI (20)',            desc: 'Commodity Channel Index',           overlay: false, color: COLORS.YELLOW,  cat: 'momentum'   },
  adx:   { label: 'ADX + DI (14)',       desc: 'Average Directional Index',         overlay: false, color: COLORS.TEAL,    cat: 'momentum'   },
  willr: { label: 'Williams %R (14)',    desc: 'Williams Percent Range',            overlay: false, color: COLORS.LIME,    cat: 'momentum'   },
  mfi:   { label: 'MFI (14)',           desc: 'Money Flow Index',                  overlay: false, color: '#ff5c5c',      cat: 'volume'     },
  atr:   { label: 'ATR (14)',            desc: 'Average True Range',               overlay: false, color: COLORS.TEAL,    cat: 'volatility' },
  mom:   { label: 'Momentum (10)',       desc: 'Momentum brut',                     overlay: false, color: COLORS.LIME,    cat: 'momentum'   },
  vp:    { label: 'Volume Profile',      desc: 'Profil de volume par prix',         overlay: true,  color: COLORS.PURPLE,  cat: 'volume'     },
  fp:    { label: 'Footprint Chart',     desc: 'Flux acheteur/vendeur par bougie',  overlay: true,  color: COLORS.CYAN,    cat: 'volume'     },
  of:    { label: 'Orderflow Delta/CVD', desc: 'Delta cumulatif du carnet',         overlay: false, color: '#ff9f43',      cat: 'volume'     },
};
