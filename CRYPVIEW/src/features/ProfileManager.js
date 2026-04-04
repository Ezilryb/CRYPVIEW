// ============================================================
//  src/features/ProfileManager.js — CrypView V3.2
//  Gestion des profils d'indicateurs et presets de workspace.
//
//  Presets intégrés (non supprimables) :
//    🎯 Scalping   · 📈 Swing   · 📊 Volume
//    🌊 Orderflow  · 🎭 Momentum
//
//  Profils custom (créés par l'utilisateur) :
//    Snapshot de la configuration active (indicateurs + TF).
//
//  Usage :
//    const pm = new ProfileManager();
//    pm.apply('scalping')      → { indicators, tf }
//    pm.save('Mon setup', [...], '1h')
//    pm.remove(id)
//    pm.getAll()               → [...builtins, ...custom]
// ============================================================

const STORAGE_KEY   = 'crypview_profiles_v1';
const MAX_CUSTOM    = 20;

// ── Presets intégrés ──────────────────────────────────────────
/** @type {Profile[]} */
const BUILTINS = [
  {
    id:          'scalping',
    name:        'Scalping',
    icon:        '🎯',
    type:        'builtin',
    description: 'Entrées rapides 1–5 min. MA courtes, VWAP et RSI.',
    indicators:  ['ma', 'vwap', 'rsi'],
    tf:          '1m',
  },
  {
    id:          'swing',
    name:        'Swing',
    icon:        '📈',
    type:        'builtin',
    description: 'Positions H4–Daily. Ichimoku, Bollinger, MACD.',
    indicators:  ['ma', 'bb', 'ichi', 'rsi', 'macd'],
    tf:          '4h',
  },
  {
    id:          'volume',
    name:        'Volume',
    icon:        '📊',
    type:        'builtin',
    description: 'Profil de volume, VWAP et flux monétaire.',
    indicators:  ['vp', 'vwap', 'mfi'],
    tf:          '1h',
  },
  {
    id:          'orderflow',
    name:        'Orderflow',
    icon:        '🌊',
    type:        'builtin',
    description: 'Footprint + Delta CVD pour lire le carnet.',
    indicators:  ['fp', 'of', 'vwap'],
    tf:          '5m',
  },
  {
    id:          'momentum',
    name:        'Momentum',
    icon:        '🎭',
    type:        'builtin',
    description: 'RSI, MACD, Stoch et ADX pour la force directionnelle.',
    indicators:  ['rsi', 'macd', 'stoch', 'adx'],
    tf:          '15m',
  },
  {
    id:          'volatilite',
    name:        'Volatilité',
    icon:        '⚡',
    type:        'builtin',
    description: 'Bollinger, Keltner et ATR pour les compressions.',
    indicators:  ['bb', 'kelt', 'atr', 'vwap'],
    tf:          '30m',
  },
];

/**
 * @typedef {object} Profile
 * @property {string}   id
 * @property {string}   name
 * @property {string}   icon
 * @property {'builtin'|'custom'} type
 * @property {string}   description
 * @property {string[]} indicators  — clés IND_META
 * @property {string}   [tf]        — timeframe suggéré
 * @property {number}   [createdAt]
 */

export class ProfileManager {
  /** @type {Profile[]} */
  #custom = [];

  constructor() {
    this.#load();
  }

  // ── API publique ──────────────────────────────────────────

  /** Tous les profils (builtins d'abord, puis custom). */
  getAll() { return [...BUILTINS, ...this.#custom]; }

  /** Presets intégrés uniquement. */
  getBuiltins() { return [...BUILTINS]; }

  /** Profils utilisateur. */
  getCustom() { return [...this.#custom]; }

  /**
   * Retourne les données applicables d'un profil.
   * @param {string} id
   * @returns {{ indicators: string[], tf: string|null } | null}
   */
  apply(id) {
    const profile = this.getAll().find(p => p.id === id);
    if (!profile) return null;
    return { indicators: [...profile.indicators], tf: profile.tf ?? null };
  }

  /**
   * Sauvegarde la configuration courante comme profil custom.
   * @param {string}   name
   * @param {string[]} indicators
   * @param {string}   [tf]
   * @param {string}   [description]
   * @returns {Profile | null}
   */
  save(name, indicators, tf = null, description = '') {
    name = name.trim();
    if (!name || !indicators.length) return null;
    if (this.#custom.length >= MAX_CUSTOM) return null;

    const profile = {
      id:          `custom_${Date.now()}`,
      name,
      icon:        '💾',
      type:        'custom',
      description: description.trim() || `${indicators.length} indicateur${indicators.length > 1 ? 's' : ''} — ${tf ?? ''}`,
      indicators:  [...indicators],
      tf:          tf ?? null,
      createdAt:   Date.now(),
    };

    this.#custom.push(profile);
    this.#save();
    return profile;
  }

  /**
   * Supprime un profil custom (les builtins sont protégés).
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    const before = this.#custom.length;
    this.#custom = this.#custom.filter(p => p.id !== id);
    if (this.#custom.length === before) return false;
    this.#save();
    return true;
  }

  /** Renomme un profil custom. */
  rename(id, newName) {
    const p = this.#custom.find(c => c.id === id);
    if (!p) return false;
    p.name = newName.trim();
    this.#save();
    return true;
  }

  /** Nombre de profils custom. */
  get customCount() { return this.#custom.length; }

  /** true si le quota est atteint. */
  get isFull() { return this.#custom.length >= MAX_CUSTOM; }

  // ── Persistance ───────────────────────────────────────────

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.#custom = Array.isArray(parsed)
        ? parsed.filter(p => p.id && p.name && Array.isArray(p.indicators))
        : [];
    } catch (_) {
      this.#custom = [];
    }
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#custom));
    } catch (_) {}
  }
}
