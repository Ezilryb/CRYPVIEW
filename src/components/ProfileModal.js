// ============================================================
//  src/components/ProfileModal.js — CrypView V3.2
//  Modal de gestion des profils de workspace.
//
//  Onglets :
//    ⚡ Presets    — 6 presets intégrés non supprimables
//    💾 Mes profils — profils custom sauvegardés
//
//  Usage :
//    const modal = new ProfileModal(profileManager, {
//      getCurrentState: () => ({ indicators: [...], tf: '1m' }),
//      onApply:         ({ indicators, tf }) => applyProfile(…),
//    });
//    modal.open();
// ============================================================

import { IND_META } from '../config.js';
import { showToast } from '../utils/toast.js';

export class ProfileModal {
  #overlay;
  #profileManager;
  #callbacks;
  #activeTab = 'presets';

  /**
   * @param {import('../features/ProfileManager').ProfileManager} profileManager
   * @param {{
   *   getCurrentState: () => { indicators: string[], tf: string },
   *   onApply: (data: { indicators: string[], tf: string|null }) => void,
   * }} callbacks
   */
  constructor(profileManager, callbacks) {
    this.#profileManager = profileManager;
    this.#callbacks      = callbacks;
    this.#overlay        = document.getElementById('profile-modal-overlay');
    this.#bindStaticEvents();
  }

  open() {
    this.#activeTab = 'presets';
    this.#renderTabs();
    this.#render();
    this.#overlay.style.display = 'block';
    setTimeout(() => this.#overlay?.querySelector('button')?.focus(), 80);
  }

  close() {
    this.#overlay.style.display = 'none';
  }

  refresh() {
    if (this.#overlay?.style.display === 'block') this.#render();
  }

  #renderTabs() {
    ['presets', 'custom'].forEach(tab => {
      const btn = document.getElementById(`profile-tab-${tab}`);
      if (!btn) return;
      btn.classList.toggle('active', tab === this.#activeTab);
      btn.setAttribute('aria-selected', tab === this.#activeTab ? 'true' : 'false');
      const badge = btn.querySelector('.tab-badge');
      if (badge && tab === 'custom') {
        const n = this.#profileManager.customCount;
        badge.textContent = n;
      }
    });
  }

  #render() {
    const grid = document.getElementById('profile-modal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const profiles = this.#activeTab === 'presets'
      ? this.#profileManager.getBuiltins()
      : this.#profileManager.getCustom();

    if (!profiles.length) {
      grid.appendChild(this.#emptyState());
      return;
    }

    profiles.forEach(p => grid.appendChild(this.#buildCard(p)));

    const footer = document.getElementById('profile-modal-footer-actions');
    if (footer) {
      footer.innerHTML = '';
      if (this.#activeTab === 'custom') {
        footer.appendChild(this.#buildSaveButton());
      }
    }
  }

  #buildCard(profile) {
    const isCustom = profile.type === 'custom';

    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(255,255,255,.02);
      border:1px solid var(--border);
      border-radius:8px; padding:14px 16px;
      display:flex; flex-direction:column; gap:10px;
      transition:border-color .15s, background .15s;
      cursor:default;
    `;
    card.addEventListener('mouseenter', () => {
      card.style.background   = 'rgba(0,255,136,.03)';
      card.style.borderColor  = 'rgba(0,255,136,.25)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background   = 'rgba(255,255,255,.02)';
      card.style.borderColor  = 'var(--border)';
    });

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:10px;';

    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:22px;flex-shrink:0;';
    icon.textContent   = profile.icon;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = 'font-family:\'Syne\',sans-serif;font-weight:800;font-size:13px;color:var(--text);';
    name.textContent   = profile.name;

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:9px;color:var(--muted);margin-top:2px;letter-spacing:.03em;';
    desc.textContent   = profile.description;

    info.append(name, desc);

    const badges = document.createElement('div');
    badges.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;';

    if (profile.tf) {
      const tfBadge = document.createElement('span');
      tfBadge.style.cssText = `
        font-size:9px;padding:2px 7px;border-radius:3px;
        background:rgba(0,200,255,.1);border:1px solid rgba(0,200,255,.25);
        color:#00c8ff;font-weight:700;letter-spacing:.5px;
      `;
      tfBadge.textContent = profile.tf.toUpperCase();
      badges.appendChild(tfBadge);
    }

    if (isCustom && profile.createdAt) {
      const date = document.createElement('span');
      date.style.cssText = 'font-size:8px;color:var(--muted);';
      date.textContent   = new Date(profile.createdAt).toLocaleDateString('fr-FR');
      badges.appendChild(date);
    }

    header.append(icon, info, badges);

    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
    profile.indicators.forEach(key => {
      const meta = IND_META[key];
      if (!meta) return;
      const chip = document.createElement('span');
      chip.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;
        font-size:8px;padding:2px 7px;border-radius:3px;
        background:${meta.color}15;border:1px solid ${meta.color}35;
        color:${meta.color};letter-spacing:.3px;white-space:nowrap;
      `;
      const dot = document.createElement('span');
      dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${meta.color};flex-shrink:0;`;
      chip.append(dot, meta.label.split(' ')[0]);
      chips.appendChild(chip);
    });

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:2px;';

    const applyBtn = document.createElement('button');
    applyBtn.style.cssText = `
      flex:1;background:var(--accent);color:var(--bg);border:none;
      padding:7px 12px;font-family:'Space Mono',monospace;font-size:10px;
      border-radius:4px;cursor:pointer;font-weight:700;
      transition:background .15s;letter-spacing:.04em;
    `;
    applyBtn.textContent = '▶ Appliquer';
    applyBtn.addEventListener('mouseenter', () => { applyBtn.style.background = '#00e57a'; });
    applyBtn.addEventListener('mouseleave', () => { applyBtn.style.background = 'var(--accent)'; });
    applyBtn.addEventListener('click', () => {
      const data = this.#profileManager.apply(profile.id);
      if (!data) return;
      this.#callbacks.onApply?.(data);
      showToast(`✓ Profil « ${profile.icon} ${profile.name} » appliqué`, 'success', 2_500);
      this.close();
    });
    actions.appendChild(applyBtn);

    if (isCustom) {
      const delBtn = document.createElement('button');
      delBtn.style.cssText = `
        background:rgba(255,61,90,.08);border:1px solid rgba(255,61,90,.25);
        color:var(--red);padding:7px 10px;
        font-family:'Space Mono',monospace;font-size:10px;
        border-radius:4px;cursor:pointer;transition:all .15s;
      `;
      delBtn.textContent = '✕';
      delBtn.setAttribute('aria-label', `Supprimer le profil ${profile.name}`);
      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background  = 'rgba(255,61,90,.18)';
        delBtn.style.borderColor = 'var(--red)';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background  = 'rgba(255,61,90,.08)';
        delBtn.style.borderColor = 'rgba(255,61,90,.25)';
      });
      delBtn.addEventListener('click', () => {
        this.#profileManager.remove(profile.id);
        this.#render();
        this.#renderTabs();
        showToast(`Profil « ${profile.name} » supprimé`, 'info', 2_000);
      });
      actions.appendChild(delBtn);
    }

    card.append(header, chips, actions);
    return card;
  }

  #buildSaveButton() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:10px 0 0;border-top:1px solid var(--border);';

    if (this.#profileManager.isFull) {
      const msg = document.createElement('div');
      msg.style.cssText = 'font-size:10px;color:var(--muted);text-align:center;padding:8px;';
      msg.textContent   = `Limite de ${20} profils atteinte — supprimez-en un pour continuer.`;
      wrap.appendChild(msg);
      return wrap;
    }

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;';

    const input = document.createElement('input');
    input.type        = 'text';
    input.placeholder = 'Nom du profil…';
    input.maxLength   = 32;
    input.style.cssText = `
      flex:1;background:var(--bg);border:1px solid var(--border);
      color:var(--text);padding:7px 10px;
      font-family:'Space Mono',monospace;font-size:11px;
      border-radius:4px;outline:none;transition:border-color .15s;
    `;
    input.addEventListener('focus', () => { input.style.borderColor = 'var(--accent)'; });
    input.addEventListener('blur',  () => { input.style.borderColor = 'var(--border)'; });

    const saveBtn = document.createElement('button');
    saveBtn.style.cssText = `
      background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);
      color:var(--accent);padding:7px 14px;
      font-family:'Space Mono',monospace;font-size:10px;
      border-radius:4px;cursor:pointer;transition:all .15s;
      white-space:nowrap;font-weight:700;
    `;
    saveBtn.textContent = '💾 Sauvegarder';
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
        setTimeout(() => { input.style.borderColor = 'var(--border)'; }, 1500);
        return;
      }
      const state   = this.#callbacks.getCurrentState?.() ?? { indicators: [], tf: null };
      const profile = this.#profileManager.save(name, state.indicators, state.tf);
      if (!profile) {
        showToast('Impossible de sauvegarder le profil.', 'error');
        return;
      }
      input.value = '';
      this.#render();
      this.#renderTabs();
      showToast(`✓ Profil « ${profile.name} » sauvegardé`, 'success', 2_500);
    };

    saveBtn.addEventListener('click', doSave);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doSave(); } });

    row.append(input, saveBtn);
    wrap.appendChild(row);
    return wrap;
  }

  #emptyState() {
    const el = document.createElement('div');
    el.style.cssText = `
      grid-column:1/-1;padding:36px 18px;text-align:center;
      color:var(--muted);
    `;
    el.innerHTML = `
      <div style="font-size:28px;margin-bottom:10px">💾</div>
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px">
        Aucun profil sauvegardé
      </div>
      <div style="font-size:10px;line-height:1.7;letter-spacing:.03em;">
        Configurez vos indicateurs puis<br>
        cliquez sur <strong style="color:var(--accent)">💾 Sauvegarder</strong> ci-dessous.
      </div>
    `;
    return el;
  }

  #bindStaticEvents() {
    document.getElementById('profile-modal-close')
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

    ['presets', 'custom'].forEach(tab => {
      document.getElementById(`profile-tab-${tab}`)
        ?.addEventListener('click', () => {
          this.#activeTab = tab;
          this.#renderTabs();
          this.#render();
        });
    });
  }
}
