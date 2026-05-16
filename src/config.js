// ============================================================
//  src/config.js — CrypView V2
//  Source unique de vérité pour toutes les constantes du projet.
//  NE JAMAIS coder ces valeurs en dur ailleurs.
// ============================================================

export const BINANCE = {
  REST_BASE:     'https://api.binance.com/api/v3',
  WS_BASE:       'wss://stream.binance.com:9443/ws',

  klines: (symbol, interval, limit) =>
    `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`,

  EXCHANGE_INFO: 'https://api.binance.com/api/v3/exchangeInfo',

  wsKline:  (symbol, interval) => `wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`,

  wsAgg:    (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@aggTrade`,

  wsTicker: (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@ticker`,

  wsTrades: (symbol) => `wss://stream.binance.com:9443/ws/${symbol}@trade`,
};

export const WS_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_DELAY_MS:          5_000,
  MAX_DELAY_MS:           30_000,
};

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

export const THEME = {
  DEFAULT:     'dark',
  STORAGE_KEY: 'crypview-theme',
  CSS_CLASS:   'light-theme',
};

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
      mode: 1,
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

export const HISTORY_LIMITS = {
  '1s':    500,
  default: 300,
};

export const TF_API_MAP = {
  '5d': '1d',
};

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

export const RENDER_THROTTLE_MS = 100;

export const MAX_CANDLES_IN_MEMORY = 800;

export const IND_PANEL_HEIGHT = 125;

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
  ema:   { label: 'EMA 8/13/21',         desc: 'Moyennes mobiles exponentielles multi-périodes',  overlay: true,  color: '#00e0ff',  cat: 'trend'      },
  dema:  { label: 'DEMA (20)',             desc: 'Double EMA — moins de lag',                       overlay: true,  color: '#ff5c8a',  cat: 'trend'      },
  sar:   { label: 'Parabolic SAR',        desc: 'Stop and Reverse (step 0.02)',                    overlay: true,  color: COLORS.ORANGE, cat: 'trend'   },
  don:   { label: 'Donchian (20)',         desc: 'Canaux hauts/bas glissants sur 20 bougies',      overlay: true,  color: '#9b5de5',  cat: 'volatility' },
  linreg:{ label: 'Lin. Reg. Channel',    desc: 'Canal de régression linéaire (50, ×2σ)',         overlay: true,  color: COLORS.YELLOW, cat: 'volatility'},
  pp:    { label: 'Pivot Points',         desc: 'PP · R1/R2/R3 · S1/S2/S3 standard',             overlay: true,  color: '#adb5bd',  cat: 'trend'      },
  obv:   { label: 'OBV',                  desc: 'On-Balance Volume cumulatif',                    overlay: false, color: COLORS.TEAL,   cat: 'volume'   },
  trix:  { label: 'TRIX (18)',            desc: 'Taux de variation de la Triple EMA',              overlay: false, color: COLORS.LIME,   cat: 'momentum' },
  cmf:   { label: 'CMF (20)',             desc: 'Chaikin Money Flow (flux acheteur/vendeur)',      overlay: false, color: '#00b4d8',  cat: 'volume'     },
  squeeze:{ label: 'Squeeze Momentum',     desc: 'LazyBear — compression BB/KC + momentum',       overlay: false, color: '#9b5de5',  cat: 'momentum'   },
  eray:  { label: 'Elder Ray (13)',       desc: 'Bull Power + Bear Power vs EMA(13)',             overlay: false, color: '#4cc9f0',  cat: 'momentum'   },

  oi:      {
    label:   'Open Interest',
    desc:    'Delta OI histogram + ligne absolue — Binance Futures',
    overlay: false,
    color:   '#00c8ff',
    cat:     'volume',
  },
  funding: {
    label:   'Funding Rate',
    desc:    'Taux de financement 8h — vert=bull (négatif), rouge=bear (positif)',
    overlay: false,
    color:   '#ff6eb4',
    cat:     'momentum',
  },
  lsr:     {
    label:   'Long/Short Ratio',
    desc:    'Ratio global comptes longs/shorts — >1 = dominance longs',
    overlay: false,
    color:   '#f7c948',
    cat:     'volume',
  },

  liq: {
    label:   'Liquidation Heatmap',
    desc:    'Heatmap temps réel des liquidations — Binance Futures @forceOrder',
    overlay: true,
    color:   '#ff6b35',
    cat:     'volume',
  },
};

export const EXCHANGE_CONFIG = {
  bybit: { label: 'Bybit', icon: '🟠', enabled: true },
  okx:   { label: 'OKX',   icon: '⬛', enabled: true },
};

export const DEX_CONFIG = {
  enabled:      true,
  apiBase:      'https://api.geckoterminal.com/api/v2',
  networks:     ['eth', 'bsc', 'polygon', 'solana', 'arbitrum', 'base'],
  minLiquidity: 10_000,
};
