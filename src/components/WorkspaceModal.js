// ============================================================
//  src/components/WorkspaceModal.js — CrypView V3.5
//  Modal de gestion des espaces de travail.
//  Affiche les workspaces sauvegardés + section de sauvegarde.
//
//  Corrections V3.5.1 :
//    - Guard : évite les éventuels doublons de event listeners
//      sur les boutons de sauvegarde entre deux ouvertures.
//    - #tplSaveSection / #bindSaveEvents : utilise requestAnimationFrame
//      pour garantir que le DOM est prêt avant binding.
// ============================================================

import { showToast } from '../utils/toast.js';

const LAYOUT_LABELS = {
  single:  '1 Chart',
  multi2:  '2 Charts',
  multi4:  '4 Charts (2×2)',
};

export class WorkspaceModal {
  #overlay;
  #manager;
  #callbacks;

  /**
   * @param {import('../features/WorkspaceManager').WorkspaceManager} manager
   * @param {{
   *   getCurrentState: () => { layout: string, panels: object[], syncCrosshair: boolean, syncZoom: boolean },
   *   onApply: (ws: object) => void,
   * }} callbacks
   */
  constructor(manager, callbacks) {
    this.#manager   = manager;
    this.#callbacks = callbacks;
    this.#overlay   = document.getElementById('workspace-modal-overlay');
    this.#bindStaticEvents();
  }

  // ── API publique ──────────────────────────────────────────

  open() {
    this.#render();
    if (this.#overlay) this.#overlay.style.display = 'block';
    // Focus sur le champ de nom après rendu
    requestAnimationFrame(() => {
      document.getElementById('ws-name-input')?.focus();
    });
  }

  close() {
    if (this.#overlay) this.#overlay.style.display = 'none';
  }

  // ── Rendu ─────────────────────────────────────────────────

  #render() {
    const grid    = document.getElementById('ws-modal-grid');
    const counter = document.getElementById('ws-modal-count');
    if (!grid) return;
    grid.innerHTML = '';

    const workspaces = this.#manager.getAll();
    if (counter) {
      counter.textContent = `${workspaces.length} / 15`;
      counter.style.color = this.#manager.isFull ? 'var(--red)' : 'var(--muted)';
    }

    if (!workspaces.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;padding:36px 18px;text-align:center;color:var(--muted);">
          <div style="font-size:28px;margin-bottom:10px">🗂</div>
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;">
            Aucun workspace sauvegardé
          </div>
          <div style="font-size:10px;line-height:1.7;letter-spacing:.03em;">
            Configurez vos panneaux puis cliquez sur<br>
            <strong style="color:var(--accent)">💾 Sauvegarder l'espace actuel</strong> ci-dessous.
          </div>
        </div>`;
    } else {
      workspaces.forEach(ws => grid.appendChild(this.#buildCard(ws)));
    }

    // Section sauvegarde
    const saveSection = document.getElementById('ws-save-section');
    if (saveSection) {
      if (this.#manager.isFull) {
        saveSection.innerHTML = `
          <div style="font-size:10px;color:var(--muted);text-align:center;padding:8px;">
            Limite de 15 workspaces atteinte — supprimez-en un pour continuer.
          </div>`;
      } else {
        saveSection.innerHTML = this.#tplSaveSection();
        // Bind après que le DOM soit mis à jour
        requestAnimationFrame(() => this.#bindSaveEvents());
      }
    }
  }

  // ── Carte workspace ───────────────────────────────────────

  #buildCard(ws) {
    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(255,255,255,.02);
      border:1px solid var(--border);
      border-radius:8px;padding:14px 16px;
      display:flex;flex-direction:column;gap:10px;
      transition:border-color .15s, background .15s;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(0,255,136,.22)';
      card.style.background  = 'rgba(0,255,136,.025)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'var(--border)';
      card.style.background  = 'rgba(255,255,255,.02)';
    });

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;';

    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:24px;flex-shrink:0;';
    icon.textContent   = ws.icon;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = `
      font-family:'Syne',sans-serif;font-weight:800;font-size:13px;
      color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    `;
    name.textContent = ws.name;

    const meta = document.createElement('div');
    meta.style.cssText = 'font-size:9px;color:var(--muted);margin-top:2px;display:flex;gap:6px;align-items:center;';

    const layoutBadge = document.createElement('span');
    layoutBadge.style.cssText = `
      background:rgba(0,200,255,.1);border:1px solid rgba(0,200,255,.2);
      color:#00c8ff;padding:1px 7px;border-radius:3px;
      font-size:8px;font-weight:700;letter-spacing:.4px;
    `;
    layoutBadge.textContent = LAYOUT_LABELS[ws.layout] ?? ws.layout;

    const dateSpan = document.createElement('span');
    const d = new Date(ws.usedAt ?? ws.createdAt);
    dateSpan.textContent = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

    meta.append(layoutBadge, dateSpan);
    info.append(name, meta);
    header.append(icon, info);

    // Chips panneaux
    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
    (ws.panels ?? []).forEach(p => {
      const chip = document.createElement('span');
      chip.style.cssText = `
        font-size:8px;padding:2px 8px;border-radius:3px;
        background:rgba(139,148,158,.1);border:1px solid rgba(139,148,158,.2);
        color:var(--muted);letter-spacing:.3px;
      `;
      const base = (p.sym ?? '').replace(/usdt$/i, '').toUpperCase();
      const inds = (p.indicators ?? []).length ? ` · ${p.indicators.length}⊞` : '';
      chip.textContent = `${base}/${(p.tf ?? '').toUpperCase()}${inds}`;
      chips.appendChild(chip);
    });

    // Sync badges
    const syncRow = document.createElement('div');
    syncRow.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;';
    if (ws.syncCrosshair) syncRow.appendChild(this.#miniChip('🎯 Crosshair'));
    if (ws.syncZoom)      syncRow.appendChild(this.#miniChip('🔍 Zoom'));
    if (syncRow.children.length) chips.appendChild(syncRow);

    // Actions
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;';

    const applyBtn = document.createElement('button');
    applyBtn.style.cssText = `
      flex:1;background:var(--accent);color:var(--bg);border:none;
      padding:8px 12px;font-family:'Space Mono',monospace;font-size:10px;
      border-radius:4px;cursor:pointer;font-weight:700;
      transition:background .15s;letter-spacing:.04em;
    `;
    applyBtn.textContent = '▶ Appliquer';
    applyBtn.addEventListener('mouseenter', () => { applyBtn.style.background = '#00e57a'; });
    applyBtn.addEventListener('mouseleave', () => { applyBtn.style.background = 'var(--accent)'; });
    applyBtn.addEventListener('click', () => {
      const data = this.#manager.apply(ws.id);
      if (!data) return;
      this.#callbacks.onApply?.(data);
      showToast(`✓ Workspace « ${ws.icon} ${ws.name} » appliqué`, 'success', 2_500);
      this.close();
    });

    const delBtn = document.createElement('button');
    delBtn.style.cssText = `
      background:rgba(255,61,90,.08);border:1px solid rgba(255,61,90,.25);
      color:var(--red);padding:8px 12px;font-family:'Space Mono',monospace;
      font-size:10px;border-radius:4px;cursor:pointer;transition:all .15s;
    `;
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `Supprimer ${ws.name}`);
    delBtn.addEventListener('mouseenter', () => {
      delBtn.style.background  = 'rgba(255,61,90,.18)';
      delBtn.style.borderColor = 'var(--red)';
    });
    delBtn.addEventListener('mouseleave', () => {
      delBtn.style.background  = 'rgba(255,61,90,.08)';
      delBtn.style.borderColor = 'rgba(255,61,90,.25)';
    });
    delBtn.addEventListener('click', () => {
      if (!confirm(`Supprimer le workspace « ${ws.name} » ?`)) return;
      this.#manager.remove(ws.id);
      this.#render();
      showToast(`Workspace « ${ws.name} » supprimé`, 'info', 2_000);
    });

    actions.append(applyBtn, delBtn);
    card.append(header, chips, actions);
    return card;
  }

  #miniChip(text) {
    const el = document.createElement('span');
    el.style.cssText = `
      font-size:7px;padding:1px 6px;border-radius:3px;
      background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.15);
      color:var(--accent);letter-spacing:.3px;
    `;
    el.textContent = text;
    return el;
  }

  // ── Section sauvegarde ────────────────────────────────────

  #tplSaveSection() {
    return `
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="ws-name-input" type="text"
               placeholder="Nom du workspace…" maxlength="40"
               autocomplete="off"
               style="flex:1;background:var(--bg);border:1px solid var(--border);
                      color:var(--text);padding:9px 12px;
                      font-family:'Space Mono',monospace;font-size:11px;
                      border-radius:4px;outline:none;transition:border-color .15s;"
               aria-label="Nom du workspace à sauvegarder">
        <button id="ws-save-btn"
                style="background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);
                       color:var(--accent);padding:9px 16px;
                       font-family:'Space Mono',monospace;font-size:10px;
                       border-radius:4px;cursor:pointer;transition:all .15s;
                       white-space:nowrap;font-weight:700;letter-spacing:.04em;"
                aria-label="Sauvegarder l'espace de travail actuel">
          💾 Sauvegarder l'espace actuel
        </button>
      </div>
    `;
  }

  #bindSaveEvents() {
    const input   = document.getElementById('ws-name-input');
    const saveBtn = document.getElementById('ws-save-btn');
    if (!input || !saveBtn) return;

    input.addEventListener('focus', () => { input.style.borderColor = 'var(--accent)'; });
    input.addEventListener('blur',  () => { input.style.borderColor = 'var(--border)'; });

    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.background  = 'rgba(0,255,136,.2)';
      saveBtn.style.borderColor = 'var(--accent)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.background  = 'rgba(0,255,136,.1)';
      saveBtn.style.borderColor = 'rgba(0,255,136,.3)';
    });

    const doSave = () => {
      const name = input.value.trim();
      if (!name) {
        input.style.borderColor = 'var(--red)';
        input.focus();
        setTimeout(() => { input.style.borderColor = 'var(--border)'; }, 1_500);
        return;
      }

      const state = this.#callbacks.getCurrentState?.();
      if (!state) {
        showToast('Impossible de lire l\'état courant.', 'error');
        return;
      }

      const ws = this.#manager.save(name, state);
      if (!ws) {
        showToast('Limite de 15 workspaces atteinte.', 'error');
        return;
      }

      input.value = '';
      this.#render();
      showToast(`✓ Workspace « ${ws.icon} ${ws.name} » sauvegardé`, 'success', 2_500);
    };

    saveBtn.addEventListener('click', doSave);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    });
  }

  // ── Événements statiques ──────────────────────────────────

  #bindStaticEvents() {
    document.getElementById('workspace-modal-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') {
        e.stopPropagation();
        this.close();
      }
    });
  }
}
