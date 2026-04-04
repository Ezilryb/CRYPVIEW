// ============================================================
//  src/components/ObjectTreePanel.js — CrypView V3.5
//  Gestionnaire d'objets : liste tous les tracés et indicateurs
//  du graphique actif avec contrôles visibilité/verrou/suppression.
//  Pattern "Object Tree" à la TradingView.
//
//  Usage :
//    const tree = new ObjectTreePanel();
//    tree.bind(drawing, indicators, {
//      onRemoveIndicator: (key) => indicators.remove(key, hooks),
//    });
//    tree.toggle(); // ouvre / ferme
// ============================================================

import { IND_META } from '../config.js';

const TOOL_ICONS = {
  trendline: '📏',
  fibonacci: '🌀',
  zone:      '🟦',
  rectangle: '▭',
  pitchfork: '⑂',
};

const TOOL_LABELS = {
  trendline: 'Trendline',
  fibonacci: 'Fibonacci',
  zone:      'Zone horiz.',
  rectangle: 'Rectangle',
  pitchfork: 'Pitchfork',
};

export class ObjectTreePanel {
  #el          = null;
  #drawing     = null;
  #indicators  = null;
  #callbacks   = {};
  #visible     = false;

  constructor() {
    this.#inject();
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Attache le panel aux modules du graphique actif.
   * À rappeler à chaque reconnexion (changement de sym/tf).
   * @param {ChartDrawing}    drawing
   * @param {ChartIndicators} indicators
   * @param {{ onRemoveIndicator: (key: string) => void }} callbacks
   */
  bind(drawing, indicators, callbacks = {}) {
    this.#drawing   = drawing;
    this.#indicators = indicators;
    this.#callbacks  = callbacks;

    // Hook drawing changes
    if (drawing) {
      drawing.onItemsChange = () => { if (this.#visible) this.#render(); };
    }

    // Hook indicator state changes (sans écraser le hook existant)
    if (indicators) {
      const prev = indicators.onStateChange;
      indicators.onStateChange = (key, active) => {
        prev?.(key, active);
        if (this.#visible) this.#render();
      };
    }

    if (this.#visible) this.#render();
  }

  /** Ouvre / ferme le panel. @returns {boolean} nouvel état */
  toggle() {
    this.#visible = !this.#visible;
    this.#el.style.display = this.#visible ? 'flex' : 'none';
    if (this.#visible) this.#render();
    return this.#visible;
  }

  setVisible(v) {
    this.#visible = v;
    this.#el.style.display = v ? 'flex' : 'none';
    if (v) this.#render();
  }

  get visible() { return this.#visible; }

  /** Force un re-rendu sans ouvrir le panel. */
  refresh() { if (this.#visible) this.#render(); }

  destroy() { this.#el?.remove(); this.#el = null; }

  // ── Injection DOM ─────────────────────────────────────────

  #inject() {
    const existing = document.getElementById('obj-tree-panel');
    if (existing) { this.#el = existing; return; }

    const el = document.createElement('aside');
    el.id = 'obj-tree-panel';
    el.setAttribute('aria-label', 'Gestionnaire d\'objets');
    el.style.cssText = `
      display:none; flex-direction:column;
      position:fixed; top:60px; right:0;
      width:224px; bottom:0; z-index:450;
      background:var(--panel); border-left:1px solid var(--border);
      overflow:hidden; font-size:10px;
      box-shadow:-6px 0 24px rgba(0,0,0,.5);
    `;

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:9px 12px;border-bottom:1px solid var(--border);flex-shrink:0;
                  background:rgba(0,0,0,.15);">
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:12px;
                     color:var(--accent);letter-spacing:.06em;">Objets</span>
        <button id="obj-tree-close" title="Fermer (O)"
                style="background:none;border:none;color:var(--muted);font-size:15px;
                       cursor:pointer;padding:1px 5px;border-radius:3px;
                       transition:color .15s;"
                aria-label="Fermer le gestionnaire d'objets">✕</button>
      </div>
      <div id="obj-tree-content"
           style="flex:1;overflow-y:auto;padding:4px 0;scrollbar-width:thin;"
           role="list"></div>
      <div style="flex-shrink:0;padding:7px 12px;border-top:1px solid var(--border);
                  font-size:8px;color:var(--muted);letter-spacing:.8px;text-align:center;">
        👁 Masquer · 🔒 Verrouiller · 🗑 Supprimer
      </div>
    `;

    document.body.appendChild(el);
    this.#el = el;

    const closeBtn = document.getElementById('obj-tree-close');
    closeBtn?.addEventListener('click', () => this.setVisible(false));
    closeBtn?.addEventListener('mouseenter', () => { closeBtn.style.color = 'var(--red)'; });
    closeBtn?.addEventListener('mouseleave', () => { closeBtn.style.color = 'var(--muted)'; });

    // Raccourci O pour toggle
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          const modalOpen = [...document.querySelectorAll('.modal-overlay')]
            .some(m => m.style.display === 'block');
          if (!modalOpen) { e.preventDefault(); this.toggle(); }
        }
      }
    });
  }

  // ── Rendu ─────────────────────────────────────────────────

  #render() {
    const content = document.getElementById('obj-tree-content');
    if (!content) return;
    content.innerHTML = '';

    const drawings   = this.#drawing?.getItems() ?? [];
    const activeInds = this.#indicators?.getActiveKeys() ?? [];
    const total      = drawings.length + activeInds.length;

    if (!total) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:28px 12px;text-align:center;color:var(--muted);';
      empty.innerHTML = `
        <div style="font-size:24px;margin-bottom:10px;">📋</div>
        <div style="font-size:10px;">Aucun objet sur ce graphique.</div>
        <div style="font-size:8px;margin-top:6px;line-height:1.6;letter-spacing:.03em;">
          Tracez des lignes ou ajoutez des indicateurs.
        </div>
      `;
      content.appendChild(empty);
      return;
    }

    if (drawings.length) {
      content.appendChild(this.#sectionHeader(`📐 Tracés`, drawings.length));
      // Tri : par type pour regrouper visuellement
      const sorted = [...drawings].sort((a, b) => a.type.localeCompare(b.type));
      sorted.forEach(d => content.appendChild(this.#drawingRow(d)));
    }

    if (activeInds.length) {
      content.appendChild(this.#sectionHeader(`📈 Indicateurs`, activeInds.length));
      activeInds.forEach(key => content.appendChild(this.#indicatorRow(key)));
    }
  }

  #sectionHeader(label, count) {
    const el = document.createElement('div');
    el.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:6px 12px 4px;
      font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;
      border-bottom:1px solid rgba(28,35,51,.6);
      background:rgba(0,0,0,.08);margin-top:4px;
    `;
    el.innerHTML = `<span>${label}</span><span style="background:rgba(139,148,158,.15);
      padding:1px 6px;border-radius:3px;">${count}</span>`;
    return el;
  }

  #drawingRow(d) {
    const row = document.createElement('div');
    row.setAttribute('role', 'listitem');
    row.style.cssText = `
      display:flex;align-items:center;gap:6px;
      padding:5px 8px 5px 12px;transition:background .1s;
      opacity:${d.hidden ? '0.35' : '1'};
    `;
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,.03)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });

    // Icône type
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:12px;flex-shrink:0;';
    icon.textContent = TOOL_ICONS[d.type] ?? '—';

    // Label
    const label = document.createElement('span');
    label.style.cssText = `
      flex:1;color:${d.hidden ? 'var(--muted)' : 'var(--text)'};
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      ${d.hidden ? 'text-decoration:line-through;' : ''}
    `;
    label.textContent = TOOL_LABELS[d.type] ?? d.type;

    if (d.locked) {
      const lockIndicator = document.createElement('span');
      lockIndicator.style.cssText = 'font-size:9px;color:var(--orange);flex-shrink:0;';
      lockIndicator.textContent = '🔒';
      row.append(icon, label, lockIndicator);
    }

    // Boutons d'action
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:1px;flex-shrink:0;opacity:0;transition:opacity .15s;';
    row.addEventListener('mouseenter', () => { actions.style.opacity = '1'; });
    row.addEventListener('mouseleave', () => { actions.style.opacity = '0'; });

    const eyeBtn  = this.#actionBtn(
      d.hidden ? '🙈' : '👁',
      d.hidden ? 'Afficher' : 'Masquer',
      () => this.#drawing?.toggleVisibility(d.id)
    );
    const lockBtn = this.#actionBtn(
      d.locked ? '🔒' : '🔓',
      d.locked ? 'Déverrouiller' : 'Verrouiller',
      () => this.#drawing?.toggleLock(d.id),
      false,
      d.locked ? 'var(--orange)' : null
    );
    const delBtn  = this.#actionBtn('🗑', 'Supprimer', () => {
      if (!d.locked) this.#drawing?.removeById(d.id);
      else showWarning('🔒 Tracé verrouillé — déverrouillez d\'abord.');
    }, true);

    actions.append(eyeBtn, lockBtn, delBtn);

    if (d.locked) {
      row.append(icon, label, document.createElement('span'), actions);
    } else {
      row.append(icon, label, actions);
    }

    return row;
  }

  #indicatorRow(key) {
    const meta = IND_META[key];
    if (!meta) return document.createElement('div');

    const row = document.createElement('div');
    row.setAttribute('role', 'listitem');
    row.style.cssText = `
      display:flex;align-items:center;gap:7px;
      padding:5px 8px 5px 12px;transition:background .1s;
    `;
    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(255,255,255,.03)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });

    const dot = document.createElement('div');
    dot.style.cssText = `
      width:8px;height:8px;border-radius:50%;flex-shrink:0;
      background:${meta.color};box-shadow:0 0 5px ${meta.color}99;
    `;

    const label = document.createElement('span');
    label.style.cssText = 'flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    label.textContent = meta.label;

    const typeTag = document.createElement('span');
    typeTag.style.cssText = 'font-size:7px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0;';
    typeTag.textContent = meta.overlay ? 'overlay' : 'panel';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-shrink:0;opacity:0;transition:opacity .15s;';
    row.addEventListener('mouseenter', () => { actions.style.opacity = '1'; });
    row.addEventListener('mouseleave', () => { actions.style.opacity = '0'; });

    const delBtn = this.#actionBtn('🗑', `Retirer ${meta.label}`, () => {
      this.#callbacks.onRemoveIndicator?.(key);
    }, true);
    actions.appendChild(delBtn);

    row.append(dot, label, typeTag, actions);
    return row;
  }

  #actionBtn(icon, title, onClick, isDanger = false, color = null) {
    const btn = document.createElement('button');
    btn.title = title;
    btn.textContent = icon;
    btn.setAttribute('aria-label', title);
    btn.style.cssText = `
      background:none;border:none;cursor:pointer;
      font-size:11px;padding:2px 4px;border-radius:3px;
      transition:background .1s;
      color:${color ?? (isDanger ? 'var(--red)' : 'var(--muted)')};
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = isDanger ? 'rgba(255,61,90,.12)' : 'rgba(255,255,255,.08)';
    });
    btn.addEventListener('mouseleave', () => { btn.style.background = ''; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return btn;
  }
}

// Helper local (évite d'importer showToast pour une erreur mineure)
function showWarning(msg) {
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;bottom:80px;right:20px;z-index:9999;
    background:#2a1a00;border:1px solid #ff9900;color:#ff9900;
    padding:8px 14px;border-radius:6px;font-size:11px;
    font-family:'Space Mono',monospace;pointer-events:none;
    animation:fadeIn .2s ease;
  `;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2500);
}
