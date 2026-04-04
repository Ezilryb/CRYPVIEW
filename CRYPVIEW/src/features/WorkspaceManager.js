// ============================================================
//  src/features/WorkspaceManager.js — CrypView V3.5
//  Gestion des Workspaces (espaces de travail).
//
//  Un workspace capture l'état complet d'une session :
//    - Layout (single / multi2 / multi4)
//    - Par panneau : symbole, timeframe, indicateurs actifs
//    - Paramètres de synchronisation (crosshair, zoom)
//
//  Différence avec ProfileManager :
//    ProfileManager  → configuration d'indicateurs d'un seul chart
//    WorkspaceManager → configuration complète multi-panneaux
//
//  Usage :
//    const wm = new WorkspaceManager();
//    const ws = wm.save('Scalping BTC/ETH', {
//      layout: 'multi2',
//      panels: [{ sym: 'btcusdt', tf: '1m', indicators: ['rsi', 'vwap'] }],
//      syncCrosshair: true, syncZoom: true,
//    });
//    const data = wm.apply(ws.id); // → state object
// ============================================================

const STORAGE_KEY  = 'crypview_workspaces_v1';
const MAX_WORKSPACES = 15;

/**
 * @typedef {object} PanelState
 * @property {string}   sym        — ex: 'btcusdt'
 * @property {string}   tf         — ex: '1m'
 * @property {string[]} indicators — clés IND_META actives
 */

/**
 * @typedef {object} Workspace
 * @property {string}       id
 * @property {string}       name
 * @property {string}       icon
 * @property {'single'|'multi2'|'multi4'} layout
 * @property {PanelState[]} panels
 * @property {boolean}      syncCrosshair
 * @property {boolean}      syncZoom
 * @property {number}       createdAt
 * @property {number}       [usedAt]    — dernière utilisation
 */

export class WorkspaceManager {
  /** @type {Workspace[]} */
  #workspaces = [];

  constructor() {
    this.#load();
  }

  // ── API publique ──────────────────────────────────────────

  /** @returns {Workspace[]} */
  getAll() {
    return [...this.#workspaces].sort((a, b) => (b.usedAt ?? b.createdAt) - (a.usedAt ?? a.createdAt));
  }

  /** @returns {boolean} */
  get isFull() { return this.#workspaces.length >= MAX_WORKSPACES; }

  /** @returns {number} */
  get count() { return this.#workspaces.length; }

  /**
   * Sauvegarde l'état courant comme nouveau workspace.
   * @param {string} name
   * @param {{ layout: string, panels: PanelState[], syncCrosshair?: boolean, syncZoom?: boolean }} state
   * @returns {Workspace|null}
   */
  save(name, state) {
    name = name?.trim();
    if (!name || !Array.isArray(state?.panels) || !state.panels.length) return null;
    if (this.isFull) return null;

    /** @type {Workspace} */
    const ws = {
      id:             `ws_${Date.now()}`,
      name,
      icon:           this.#autoIcon(state.layout, state.panels),
      layout:         state.layout ?? 'single',
      panels:         state.panels.map(p => ({
        sym:        p.sym?.toLowerCase() ?? 'btcusdt',
        tf:         p.tf  ?? '1h',
        indicators: Array.isArray(p.indicators) ? [...p.indicators] : [],
      })),
      syncCrosshair:  state.syncCrosshair ?? true,
      syncZoom:       state.syncZoom ?? true,
      createdAt:      Date.now(),
    };

    this.#workspaces.push(ws);
    this.#persist();
    return ws;
  }

  /**
   * Retourne le workspace à appliquer (et met à jour usedAt).
   * @param {string} id
   * @returns {Workspace|null}
   */
  apply(id) {
    const ws = this.#workspaces.find(w => w.id === id);
    if (!ws) return null;
    ws.usedAt = Date.now();
    this.#persist();
    return { ...ws, panels: ws.panels.map(p => ({ ...p, indicators: [...p.indicators] })) };
  }

  /**
   * Supprime un workspace.
   * @param {string} id
   * @returns {boolean}
   */
  remove(id) {
    const before = this.#workspaces.length;
    this.#workspaces = this.#workspaces.filter(w => w.id !== id);
    if (this.#workspaces.length !== before) { this.#persist(); return true; }
    return false;
  }

  /**
   * Renomme un workspace.
   * @param {string} id
   * @param {string} newName
   */
  rename(id, newName) {
    const ws = this.#workspaces.find(w => w.id === id);
    if (ws && newName?.trim()) {
      ws.name = newName.trim();
      this.#persist();
    }
  }

  // ── Privé ─────────────────────────────────────────────────

  /**
   * Génère un emoji représentatif basé sur le layout et les symboles.
   */
  #autoIcon(layout, panels = []) {
    if (layout === 'multi4') return '🔲';
    if (layout === 'multi2') return '⬛';
    // Pour une vue simple, icône basée sur le premier symbole
    const sym = panels[0]?.sym?.toUpperCase().replace('USDT', '') ?? '';
    const cryptoIcons = { BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '⬡', XRP: '✦', DOGE: '🐶' };
    return cryptoIcons[sym] ?? '📊';
  }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { this.#workspaces = []; return; }
      const parsed = JSON.parse(raw);
      this.#workspaces = Array.isArray(parsed)
        ? parsed.filter(w => w.id && w.name && Array.isArray(w.panels))
        : [];
    } catch (_) {
      this.#workspaces = [];
    }
  }

  #persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#workspaces));
    } catch (_) {}
  }
}
