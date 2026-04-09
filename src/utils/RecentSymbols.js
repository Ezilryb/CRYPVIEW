// ============================================================
//  src/utils/RecentSymbols.js — CrypView V3.3
//  Historique des N derniers symboles consultés.
//  Partagé entre CommandPalette et les pages.
// ============================================================

const STORAGE_KEY = 'crypview_recent_symbols_v1';
const MAX         = 12;

export class RecentSymbols {
  /** @type {string[]} symboles lowercase, plus récent en tête */
  #history = [];

  constructor() { this.#load(); }

  /**
   * Enregistre un symbole en tête d'historique.
   * @param {string} symbol — ex: 'btcusdt'
   */
  push(symbol) {
    const sym    = symbol.toLowerCase();
    this.#history = [sym, ...this.#history.filter(s => s !== sym)].slice(0, MAX);
    this.#save();
  }

  /** @returns {string[]} copie de l'historique */
  get all()    { return [...this.#history]; }

  /** @returns {string|null} symbole le plus récent */
  get latest() { return this.#history[0] ?? null; }

  clear() { this.#history = []; this.#save(); }

  #load() {
    try {
      const raw      = localStorage.getItem(STORAGE_KEY);
      this.#history  = raw ? JSON.parse(raw) : [];
    } catch (_) { this.#history = []; }
  }

  #save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#history)); } catch (_) {}
  }
}