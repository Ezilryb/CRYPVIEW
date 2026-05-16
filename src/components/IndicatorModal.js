// ============================================================
//  src/components/IndicatorModal.js — CrypView V2
//  Modal de sélection des indicateurs avec onglets et recherche.
//
//  v2.10 (Fix #8) : Remplacement du cache #activeKeys par un
//    getter #getActiveKeys fourni par l'appelant.
//  v2.11 : Patch accessibilité — FocusTrap, markAsDialog,
//    focus initial sur le champ de recherche via FocusTrap.
//  v2.12 : Patch i18n — utilise getIndMeta() pour les labels
//    et descriptions traduits (corrige le bug "RSI non traduit").
// ============================================================

import { IND_META } from '../config.js';
import { FocusTrap, markAsDialog } from '../utils/a11y.js';
import { getIndMeta } from '../utils/indMeta.js';

export class IndicatorModal {
  #overlay;
  #callbacks;
  #currentCat  = 'all';
  #searchQuery = '';
  #trap;

  /** @type {() => string[]} */
  #getActiveKeys;

  /**
   * @param {object}   callbacks
   * @param {() => string[]}    callbacks.getActiveKeys
   * @param {function(string)}  callbacks.onAdd
   * @param {function(string)}  callbacks.onRemove
   * @param {function}          callbacks.onRemoveAll
   */
  constructor(callbacks) {
    this.#overlay   = document.getElementById('ind-modal-overlay');
    this.#callbacks = callbacks;

    this.#getActiveKeys = typeof callbacks.getActiveKeys === 'function'
      ? callbacks.getActiveKeys
      : () => [];

    this.#trap = new FocusTrap(this.#overlay);
    markAsDialog(this.#overlay, this.#overlay?.querySelector('h2, h3'));

    this.#bindStaticEvents();
  }

  open() {
    this.#currentCat  = 'all';
    this.#searchQuery = '';
    const input = document.getElementById('ind-search');
    if (input) input.value = '';
    this.#updateTabAria('all');
    this.render();
    this.#overlay.style.display = 'block';

    this.#trap.activate(input ?? null);
  }

  close() {
    this.#trap.deactivate();
    this.#overlay.style.display = 'none';
  }

  /**
   */
  render() {
    const activeKeys = this.#getActiveKeys();
    const grid = document.getElementById('ind-modal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const q = this.#searchQuery.trim().toLowerCase();

    const entries = Object.entries(IND_META).filter(([key, m]) => {
      if (this.#currentCat !== 'all' && m.cat !== this.#currentCat) return false;
      if (q) {
        const translated = getIndMeta(key);
        const label = (translated?.label ?? m.label).toLowerCase();
        const desc  = (translated?.desc  ?? m.desc).toLowerCase();
        if (!label.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:span 2;text-align:center;padding:30px;color:#5a6a80;font-size:11px;';
      empty.textContent   = 'Aucun indicateur trouvé';
      grid.appendChild(empty);
    } else {
      for (const [key] of entries) {
        const meta = getIndMeta(key);
        if (!meta) continue;
        grid.appendChild(this.#buildCard(key, meta, activeKeys.includes(key)));
      }
    }

    const count = activeKeys.length;
    const el    = document.getElementById('ind-active-count');
    if (el) el.textContent = `${count} indicateur${count !== 1 ? 's' : ''} actif${count !== 1 ? 's' : ''}`;
  }

  #buildCard(key, meta, active) {
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:10px 12px;
      border-radius:7px;cursor:pointer;transition:all .15s;
      border:1px solid ${active ? meta.color + '55' : '#1c2333'};
      background:${active ? meta.color + '0d' : 'rgba(255,255,255,.02)'};`;

    card.onmouseover = () => { card.style.borderColor = meta.color + '88'; card.style.background = meta.color + '15'; };
    card.onmouseout  = () => { card.style.borderColor = active ? meta.color + '55' : '#1c2333'; card.style.background = active ? meta.color + '0d' : 'rgba(255,255,255,.02)'; };

    const dot = document.createElement('div');
    dot.style.cssText = `width:9px;height:9px;border-radius:50%;background:${meta.color};flex-shrink:0;box-shadow:0 0 6px ${meta.color}88;`;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = `font-size:11px;font-weight:700;color:${active ? meta.color : '#e6edf3'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    name.textContent = meta.label;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:9px;color:#8b949e;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    desc.textContent = meta.desc;

    const type = document.createElement('div');
    type.style.cssText = 'font-size:7px;color:#5a6a80;margin-top:2px;text-transform:uppercase;letter-spacing:.6px;';
    type.textContent = meta.overlay ? 'overlay' : 'panneau';

    info.append(name, desc, type);

    const badge = document.createElement('div');
    badge.style.cssText = active
      ? `font-size:8px;padding:2px 6px;border-radius:3px;flex-shrink:0;font-weight:700;letter-spacing:.5px;border:1px solid;background:${meta.color}22;color:${meta.color};border-color:${meta.color}55;`
      : 'font-size:8px;padding:2px 6px;border-radius:3px;flex-shrink:0;font-weight:700;letter-spacing:.5px;border:1px solid;background:transparent;color:#8b949e;border-color:#1c2333;';
    badge.textContent = active ? 'ON' : 'OFF';

    card.append(dot, info, badge);

    card.addEventListener('click', () => {
      active ? this.#callbacks.onRemove?.(key) : this.#callbacks.onAdd?.(key);
    });

    return card;
  }

  #bindStaticEvents() {
    document.getElementById('ind-modal-close')?.addEventListener('click', () => this.close());
    this.#overlay?.addEventListener('click', e => { if (e.target === this.#overlay) this.close(); });

    document.getElementById('ind-search')?.addEventListener('input', e => {
      this.#searchQuery = e.target.value;
      this.render();
    });

    document.querySelectorAll('.ind-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.#currentCat = tab.dataset.cat;
        this.#updateTabAria(tab.dataset.cat);
        this.render();
      });
    });

    document.getElementById('ind-modal-remove-all')?.addEventListener('click', () => {
      this.#callbacks.onRemoveAll?.();
      this.render();
    });
  }

  /**
   * @param {string} activeCat
   */
  #updateTabAria(activeCat) {
    document.querySelectorAll('.ind-tab').forEach(t => {
      const isActive = t.dataset.cat === activeCat;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }
}
