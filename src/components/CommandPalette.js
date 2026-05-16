// ============================================================
//  src/components/CommandPalette.js — CrypView V3.3
//  Palette de commandes globale : symboles, TF, indicateurs, actions.
//
//  Raccourcis : Ctrl+K (ou Cmd+K) · / (hors champ de saisie)
//
//  v3.3.1 : Patch i18n — utilise getIndMeta() pour afficher les
//    labels et descriptions d'indicateurs traduits.
// ============================================================

import { IND_META } from '../config.js';
import { ALL_TF }   from './TimeframeBar.js';
import { getIndMeta } from '../utils/indMeta.js';

const TF_LABELS = {
  '1s': '1 seconde',  '1m': '1 min',    '3m': '3 min',  '5m': '5 min',
  '15m': '15 min',    '30m': '30 min',  '1h': '1 heure', '2h': '2 h',
  '4h': '4 h',        '6h': '6 h',      '12h': '12 h',  '1d': '1 jour',
  '3d': '3 jours',    '1w': '1 semaine','1M': '1 mois',
};

const STATIC_ACTIONS = [
  { id: 'screener', label: 'Market Screener',      icon: '🔍', group: 'Actions' },
  { id: 'profiles', label: 'Profils & Presets',    icon: '📁', group: 'Actions' },
  { id: 'export',   label: 'Export & Partage',     icon: '📤', group: 'Actions' },
  { id: 'settings', label: 'Paramètres',           icon: '⚙️', group: 'Actions' },
  { id: 'multi2',   label: 'Passer en Multi 2',    icon: '🔲', group: 'Navigation' },
  { id: 'multi4',   label: 'Passer en Multi 4',    icon: '🔲', group: 'Navigation' },
  { id: 'single',   label: 'Vue simple (1 chart)', icon: '📊', group: 'Navigation' },
];

/**
 */
function fuzzy(query, label) {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  let qi  = 0;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export class CommandPalette {
  #overlay   = null;
  #input     = null;
  #results   = null;
  #isOpen    = false;

  #allItems  = [];
  #filtered  = [];
  #activeIdx = -1;

  #callbacks;
  #symbols       = [];
  #recentSymbols = null;
  #getActiveKeys = () => [];
  #getCurrentSym = () => '';
  #getCurrentTf  = () => '';

  constructor(callbacks) {
    this.#callbacks      = callbacks;
    this.#symbols        = callbacks.symbols        ?? [];
    this.#recentSymbols  = callbacks.recentSymbols  ?? null;
    this.#getActiveKeys  = callbacks.getActiveKeys  ?? (() => []);
    this.#getCurrentSym  = callbacks.getCurrentSym  ?? (() => '');
    this.#getCurrentTf   = callbacks.getCurrentTf   ?? (() => '');

    this.#inject();
    this.#bindGlobalShortcut();
  }

  open() {
    if (this.#isOpen) { this.#input.select(); return; }
    this.#isOpen    = true;
    this.#activeIdx = -1;
    this.#input.value = '';
    this.#buildItems();
    this.#filter('');
    this.#overlay.style.display = 'flex';
    requestAnimationFrame(() => this.#input?.focus());
  }

  close() {
    if (!this.#isOpen) return;
    this.#isOpen = false;
    this.#overlay.style.display = 'none';
  }

  setSymbols(symbols) { this.#symbols = symbols; }

  #inject() {
    if (document.getElementById('cmd-palette-overlay')) {
      this.#overlay = document.getElementById('cmd-palette-overlay');
      this.#input   = document.getElementById('cmd-palette-input');
      this.#results = document.getElementById('cmd-palette-results');
      this.#bindLocalEvents();
      return;
    }

    const wrap = document.createElement('div');
    wrap.id = 'cmd-palette-overlay';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Palette de commandes');
    wrap.style.cssText = [
      'display:none',
      'position:fixed',
      'inset:0',
      'z-index:60000',
      'background:rgba(0,0,0,.72)',
      'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)',
      'align-items:flex-start',
      'justify-content:center',
      'padding-top:15vh',
    ].join(';');

    wrap.innerHTML = `
      <div style="
        width:580px;max-width:94vw;
        background:var(--panel);
        border:1px solid var(--border);
        border-radius:10px;
        box-shadow:0 40px 90px rgba(0,0,0,.95);
        overflow:hidden;
        display:flex;flex-direction:column;
        max-height:70vh;
      ">
        <!-- Champ de saisie -->
        <div style="
          display:flex;align-items:center;gap:10px;
          padding:12px 16px;
          border-bottom:1px solid var(--border);
          flex-shrink:0;
        ">
          <span style="color:var(--muted);font-size:16px;flex-shrink:0;">⌕</span>
          <input id="cmd-palette-input" type="text"
                 placeholder="Symbole, indicateur, action… (Ctrl+K pour fermer)"
                 autocomplete="off" spellcheck="false"
                 style="
                   flex:1;background:none;border:none;outline:none;
                   color:var(--text);font-family:'Space Mono',monospace;
                   font-size:13px;letter-spacing:.02em;
                 "
                 aria-label="Recherche globale CrypView" />
          <kbd style="
            font-size:8px;padding:2px 6px;
            border:1px solid var(--border);border-radius:3px;
            color:var(--muted);font-family:'Space Mono',monospace;
            white-space:nowrap;flex-shrink:0;
          ">Échap</kbd>
        </div>

        <!-- Résultats -->
        <div id="cmd-palette-results"
             role="listbox"
             style="
               flex:1;overflow-y:auto;
               scrollbar-width:thin;
               padding:6px 0;
             ">
        </div>

        <!-- Pied de page hints -->
        <div style="
          padding:6px 14px;
          border-top:1px solid var(--border);
          display:flex;gap:16px;
          font-size:9px;color:var(--muted);
          flex-shrink:0;letter-spacing:.04em;
        ">
          <span>↑↓ naviguer</span>
          <span>↵ sélectionner</span>
          <span>Ctrl+K / / pour ouvrir</span>
        </div>
      </div>`;

    document.body.appendChild(wrap);
    this.#overlay = wrap;
    this.#input   = document.getElementById('cmd-palette-input');
    this.#results = document.getElementById('cmd-palette-results');
    this.#bindLocalEvents();
  }

  #buildItems() {
    const items  = [];
    const active = this.#getActiveKeys();
    const curSym = this.#getCurrentSym().toLowerCase();
    const curTf  = this.#getCurrentTf();

    const CAT_MAP = {
      trend:      'Indicateurs — Tendance',
      momentum:   'Indicateurs — Momentum',
      volatility: 'Indicateurs — Volatilité',
      volume:     'Indicateurs — Volume',
    };

    for (const sym of (this.#recentSymbols?.all ?? []).slice(0, 8)) {
      const base = sym.replace(/usdt$/i, '').toUpperCase();
      items.push({
        type: 'symbol', value: sym, group: 'Récents',
        label: `${base} / USDT`,
        sub:   'Récemment consulté',
        icon:  '⏱',
        active: sym === curSym,
      });
    }

    for (const { tf } of ALL_TF) {
      items.push({
        type: 'tf', value: tf, group: 'Timeframes',
        label: tf,
        sub:   TF_LABELS[tf] ?? tf,
        icon:  '📅',
        active: tf === curTf,
      });
    }

    for (const [key] of Object.entries(IND_META)) {
      const meta = getIndMeta(key);
      if (!meta) continue;
      items.push({
        type: 'indicator', key, group: CAT_MAP[meta.cat] ?? 'Indicateurs',
        label:  meta.label,
        sub:    meta.desc,
        icon:   active.includes(key) ? '✓' : '○',
        color:  meta.color,
        active: active.includes(key),
      });
    }

    for (const a of STATIC_ACTIONS) {
      items.push({ type: 'action', id: a.id, group: a.group, label: a.label, icon: a.icon, sub: '' });
    }

    this.#allItems = items;
  }

  #filter(query) {
    const q = query.trim();

    if (!q) {
      this.#filtered = this.#allItems.filter(item =>
        item.group === 'Récents'      ||
        item.group === 'Timeframes'   ||
        item.group === 'Actions'      ||
        item.group === 'Navigation'   ||
        (item.type === 'indicator' && item.active)
      );
    } else {
      const terms = q.toLowerCase().split(' ').filter(Boolean);
      this.#filtered = this.#allItems.filter(item => {
        const hay = `${item.label} ${item.sub ?? ''} ${item.group ?? ''}`.toLowerCase();
        return terms.every(t => hay.includes(t) || fuzzy(t, item.label));
      });

      if (!this.#filtered.some(i => i.type === 'symbol') && this.#symbols.length) {
        const symQ = q.toUpperCase().replace('/USDT', '');
        const hits  = this.#symbols
          .filter(s => s.base.startsWith(symQ))
          .slice(0, 8)
          .map(s => ({
            type: 'symbol', value: s.symbol, group: 'Symboles',
            label: `${s.base} / USDT`, sub: 'Binance Spot', icon: '₿',
          }));
        this.#filtered = [...hits, ...this.#filtered];
      }
    }

    this.#activeIdx = this.#filtered.length ? 0 : -1;
    this.#renderResults();
  }

  #renderResults() {
    this.#results.innerHTML = '';

    if (!this.#filtered.length) {
      this.#results.innerHTML = `<div style="
        padding:24px;text-align:center;
        color:var(--muted);font-size:11px;
      ">Aucun résultat — essayez un autre terme</div>`;
      return;
    }

    const groups = new Map();
    for (const item of this.#filtered) {
      const g = item.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(item);
    }

    let globalIdx = 0;
    for (const [groupName, items] of groups) {
      const header = document.createElement('div');
      header.style.cssText = `
        padding:7px 16px 3px;
        font-size:9px;color:var(--muted);
        text-transform:uppercase;letter-spacing:1.2px;
        font-family:'Space Mono',monospace;
        border-top:${globalIdx === 0 ? 'none' : '1px solid var(--border)'};
        margin-top:${globalIdx === 0 ? '0' : '4px'};
      `;
      header.textContent = groupName;
      this.#results.appendChild(header);

      for (const item of items) {
        const el = this.#buildItemEl(item, globalIdx);
        this.#results.appendChild(el);
        globalIdx++;
      }
    }

    this.#applyHighlight();
  }

  #buildItemEl(item, idx) {
    const el = document.createElement('div');
    el.setAttribute('role', 'option');
    el.dataset.idx = idx;
    el.style.cssText = `
      display:flex;align-items:center;gap:10px;
      padding:7px 16px;cursor:pointer;
      transition:background .08s;
    `;

    const iconEl = document.createElement('div');
    iconEl.style.cssText = `
      width:30px;height:30px;border-radius:6px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;font-size:13px;
      background:${item.color ? item.color + '18' : 'rgba(255,255,255,.035)'};
      ${item.color ? `border:1px solid ${item.color}28;` : ''}
    `;
    iconEl.textContent = item.icon ?? '';

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const lbl = document.createElement('div');
    lbl.style.cssText = `
      font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      color:${item.active && item.type === 'indicator' ? item.color ?? 'var(--accent)' : 'var(--text)'};
    `;
    lbl.textContent = item.label;

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:9px;color:var(--muted);margin-top:1px;';
    sub.textContent = item.sub ?? '';

    info.append(lbl, sub);
    el.append(iconEl, info);

    if (item.active) {
      const badge = document.createElement('span');
      const c     = item.color ?? 'var(--accent)';
      badge.style.cssText = `
        font-size:8px;padding:2px 7px;border-radius:3px;
        background:${item.color ? item.color + '20' : 'rgba(0,255,136,.12)'};
        color:${c};border:1px solid ${item.color ? item.color + '40' : 'rgba(0,255,136,.3)'};
        font-weight:700;letter-spacing:.4px;white-space:nowrap;flex-shrink:0;
      `;
      badge.textContent = item.type === 'tf' || item.type === 'symbol' ? '✓ actuel' : 'ON';
      el.appendChild(badge);
    }

    el.addEventListener('mouseenter', () => {
      this.#activeIdx = idx;
      this.#applyHighlight();
    });
    el.addEventListener('click', () => this.#execute(item));

    return el;
  }

  #applyHighlight() {
    this.#results.querySelectorAll('[data-idx]').forEach(el => {
      el.style.background = parseInt(el.dataset.idx) === this.#activeIdx
        ? 'rgba(0,255,136,.07)' : '';
    });
    const active = this.#results.querySelector(`[data-idx="${this.#activeIdx}"]`);
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  #execute(item) {
    this.close();
    switch (item.type) {
      case 'symbol':    this.#callbacks.onSymbol?.(item.value);    break;
      case 'tf':        this.#callbacks.onTf?.(item.value);        break;
      case 'indicator': this.#callbacks.onToggleInd?.(item.key);   break;
      case 'action':    this.#callbacks.onAction?.(item.id);       break;
    }
  }

  #bindLocalEvents() {
    this.#overlay.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    this.#input.addEventListener('input', e => {
      this.#buildItems();
      this.#filter(e.target.value);
    });

    this.#input.addEventListener('keydown', e => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.#activeIdx = Math.min(this.#activeIdx + 1, this.#filtered.length - 1);
          this.#applyHighlight();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.#activeIdx = Math.max(this.#activeIdx - 1, 0);
          this.#applyHighlight();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.#activeIdx >= 0 && this.#filtered[this.#activeIdx]) {
            this.#execute(this.#filtered[this.#activeIdx]);
          }
          break;
        case 'Escape':
          this.close();
          break;
      }
    });
  }

  #bindGlobalShortcut() {
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.#isOpen ? this.close() : this.open();
        return;
      }
      if (e.key === '/' && !this.#isOpen && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          this.open();
        }
      }
    });
  }
}
