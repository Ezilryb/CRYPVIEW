// ============================================================
//  src/components/AlertCenterModal.js — CrypView V3.0
//  Centre d'alertes : onglets Actives + Historique.
//
//  Usage :
//    const center = new AlertCenterModal(alertManager);
//    center.open();
//    center.refresh(); // appelé par onAlertsChange
// ============================================================

import { fmtPrice, fmtRelative, fmtDateTime } from '../utils/format.js';
import { CONDITION_META }   from '../features/AlertManagerV2.js';

const SNOOZE_OPTIONS = [
  { label: '5 min',  minutes: 5   },
  { label: '15 min', minutes: 15  },
  { label: '30 min', minutes: 30  },
  { label: '1 h',    minutes: 60  },
  { label: '4 h',    minutes: 240 },
];

export class AlertCenterModal {
  #overlay;
  #alertManager;
  #activeTab = 'active';

  /** @param {import('../features/AlertManagerV2').AlertManagerV2}*/
  constructor(alertManager) {
    this.#alertManager = alertManager;
    this.#overlay      = document.getElementById('alert-center-overlay');
    this.#bindStaticEvents();
  }

  open() {
    this.#activeTab = 'active';
    this.#renderTabs();
    this.#render();
    this.#overlay.style.display = 'block';
  }

  close() {
    this.#overlay.style.display = 'none';
  }

  refresh() {
    if (this.#overlay?.style.display === 'block') this.#render();
  }

  #renderTabs() {
    ['active', 'history'].forEach(tab => {
      const btn = document.getElementById(`alert-center-tab-${tab}`);
      if (!btn) return;
      btn.classList.toggle('active', tab === this.#activeTab);
      btn.setAttribute('aria-selected', tab === this.#activeTab ? 'true' : 'false');
    });
  }

  #render() {
    const content = document.getElementById('alert-center-content');
    if (!content) return;
    content.innerHTML = '';

    if (this.#activeTab === 'active') {
      this.#renderActive(content);
    } else {
      this.#renderHistory(content);
    }

    this.#renderStats();
    this.#renderFooterAction();
  }

  #renderStats() {
    const active   = this.#alertManager.getActive();
    const history  = this.#alertManager.getHistory();
    const today    = history.filter(h => h.triggeredAt > Date.now() - 86_400_000).length;
    const snoozed  = active.filter(a => a.snoozedUntil && a.snoozedUntil > Date.now()).length;

    const countEl = document.getElementById('alert-center-count');
    if (countEl) {
      const n = active.length;
      countEl.textContent = `${n} active${n !== 1 ? 's' : ''}`;
      countEl.style.color = n ? 'var(--accent)' : 'var(--muted)';
    }

    const statsEl = document.getElementById('alert-center-stats');
    if (statsEl) {
      const parts = [`${today} déclenchée${today !== 1 ? 's' : ''} aujourd'hui`];
      if (snoozed) parts.push(`${snoozed} snoozée${snoozed !== 1 ? 's' : ''}`);
      statsEl.textContent = parts.join(' · ');
    }
  }

  #renderFooterAction() {
    const btn = document.getElementById('alert-center-action-btn');
    if (!btn) return;

    if (this.#activeTab === 'active') {
      const n = this.#alertManager.getActive().length;
      btn.style.display = n ? 'block' : 'none';
      btn.textContent   = `🗑 Tout supprimer (${n})`;
      btn.onclick       = () => {
        if (!confirm(`Supprimer les ${n} alertes actives ?`)) return;
        this.#alertManager.removeAll();
        this.#render();
      };
    } else {
      const n = this.#alertManager.getHistory().length;
      btn.style.display = n ? 'block' : 'none';
      btn.textContent   = `🗑 Vider l'historique`;
      btn.onclick       = () => {
        this.#alertManager.clearHistory();
        this.#render();
      };
    }
  }

  #renderActive(container) {
    const alerts = this.#alertManager.getActive();
    const now    = Date.now();

    if (!alerts.length) {
      container.appendChild(this.#emptyState(
        '🔕', 'Aucune alerte active',
        'Clic droit sur le chart → Alertes → Nouvelle alerte'
      ));
      return;
    }

    const sorted = [...alerts].sort((a, b) => {
      const aSnz = a.snoozedUntil && a.snoozedUntil > now;
      const bSnz = b.snoozedUntil && b.snoozedUntil > now;
      if (aSnz !== bSnz) return aSnz ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    sorted.forEach(alert => container.appendChild(this.#alertCard(alert, now)));
  }

  /** @param {import('../features/AlertManagerV2').AlertV2}*/
  #alertCard(alert, now) {
    const snoozed   = !!(alert.snoozedUntil && alert.snoozedUntil > now);
    const hasRepeat = alert.repeat;
    const triggers  = alert.triggerCount;

    const card = document.createElement('div');
    card.style.cssText = `
      padding:11px 16px; border-bottom:1px solid var(--border);
      transition:background .1s;
      ${snoozed ? 'opacity:.55;' : ''}
    `;
    card.addEventListener('mouseenter', () => { card.style.background = 'rgba(255,255,255,.025)'; });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:5px;';

    const sym = document.createElement('span');
    sym.style.cssText = 'font-family:\'Syne\',sans-serif;font-weight:800;font-size:12px;color:var(--accent);';
    sym.textContent   = alert.symbol.replace('USDT', '/USDT');

    const name = alert.name ? document.createElement('span') : null;
    if (name) {
      name.style.cssText  = 'font-size:10px;color:var(--text);';
      name.textContent    = alert.name;
    }

    const badges = document.createElement('div');
    badges.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:5px;';

    if (snoozed) {
      const snzBadge = this.#badge('💤 Snoozée', 'rgba(139,148,158,.15)', '#8b949e');
      badges.appendChild(snzBadge);
    }
    if (hasRepeat) {
      const repBadge = this.#badge(`↺ ${triggers}×`, 'rgba(0,200,255,.1)', '#00c8ff');
      badges.appendChild(repBadge);
    }
    if (alert.expiresAt) {
      const rem  = Math.max(0, alert.expiresAt - now);
      const label = rem > 3_600_000
        ? `exp. ${Math.ceil(rem / 3_600_000)}h`
        : `exp. ${Math.ceil(rem / 60_000)}min`;
      badges.appendChild(this.#badge(label, 'rgba(247,201,72,.1)', '#f7c948'));
    }

    header.append(sym, ...(name ? [name] : []), badges);

    const condList = document.createElement('div');
    condList.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;';
    alert.conditions.forEach((c, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.style.cssText = 'font-size:9px;color:var(--muted);align-self:center;';
        sep.textContent   = alert.logic === 'AND' ? 'ET' : 'OU';
        condList.appendChild(sep);
      }
      condList.appendChild(this.#condBadge(c));
    });

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

    if (snoozed) {
      const wakeBtn = this.#actionBtn('▶ Réveiller', 'var(--accent)', () => {
        this.#alertManager.wakeUp(alert.id);
        this.#render();
      });
      actions.appendChild(wakeBtn);
    } else {
      const snoozeWrap = document.createElement('div');
      snoozeWrap.style.cssText = 'position:relative;';
      const snoozeBtn = this.#actionBtn('💤 Snooze ▾', '#8b949e');
      const snoozeMenu = document.createElement('div');
      snoozeMenu.style.cssText = `
        display:none; position:absolute; bottom:100%; left:0;
        background:var(--panel); border:1px solid var(--border);
        border-radius:6px; padding:4px 0; z-index:10001;
        box-shadow:0 8px 24px rgba(0,0,0,.7); min-width:110px;
      `;
      SNOOZE_OPTIONS.forEach(opt => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:6px 12px;font-size:10px;cursor:pointer;color:var(--text);transition:background .1s;';
        item.textContent   = opt.label;
        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(0,255,136,.07)'; });
        item.addEventListener('mouseleave', () => { item.style.background = ''; });
        item.addEventListener('click', () => {
          this.#alertManager.snooze(alert.id, opt.minutes);
          snoozeMenu.style.display = 'none';
          this.#render();
        });
        snoozeMenu.appendChild(item);
      });
      snoozeBtn.addEventListener('click', e => {
        e.stopPropagation();
        snoozeMenu.style.display = snoozeMenu.style.display === 'block' ? 'none' : 'block';
      });
      document.addEventListener('click', () => { snoozeMenu.style.display = 'none'; }, { once: false });
      snoozeWrap.append(snoozeBtn, snoozeMenu);
      actions.appendChild(snoozeWrap);
    }

    const delBtn = this.#actionBtn('✕ Supprimer', 'var(--red)', () => {
      this.#alertManager.remove(alert.id);
      this.#render();
    }, true);
    actions.appendChild(delBtn);

    card.append(header, condList, actions);
    return card;
  }

  #renderHistory(container) {
    const history = this.#alertManager.getHistory();

    if (!history.length) {
      container.appendChild(this.#emptyState(
        '📋', 'Aucun déclenchement enregistré',
        'L\'historique des alertes apparaîtra ici'
      ));
      return;
    }

    history.forEach(entry => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:9px 16px;border-bottom:1px solid var(--border);';

      const top = document.createElement('div');
      top.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:3px;';

      const sym = document.createElement('span');
      sym.style.cssText  = 'font-family:\'Syne\',sans-serif;font-weight:800;font-size:11px;color:var(--accent);';
      sym.textContent    = entry.symbol.replace('USDT', '/USDT');

      const name = document.createElement('span');
      name.style.cssText = 'font-size:10px;color:var(--text);';
      name.textContent   = entry.name;

      const time = document.createElement('span');
      time.style.cssText = 'margin-left:auto;font-size:9px;color:var(--muted);';
      time.textContent   = this.#formatDate(entry.triggeredAt);

      const price = document.createElement('span');
      price.style.cssText = 'font-size:10px;color:var(--yellow);font-weight:700;';
      price.textContent   = `@ ${entry.price}`;

      top.append(sym, name, price, time);

      const conds = document.createElement('div');
      conds.style.cssText = 'font-size:9px;color:var(--muted);';
      const logic = entry.logic === 'AND' ? ' ET ' : ' OU ';
      conds.textContent   = entry.conditions?.join(logic) ?? '';

      row.append(top, conds);
      container.appendChild(row);
    });
  }

  #condBadge(cond) {
    const meta  = CONDITION_META[cond.type];
    const icon  = meta?.icon ?? '';
    const label = meta
      ? meta.noValue
        ? `${icon} ${meta.label} ${meta.sub}`
        : `${icon} ${meta.sub} ${cond.value ?? ''}${meta.unit ? ' ' + meta.unit : ''}`
      : cond.type;

    const el = document.createElement('span');
    el.style.cssText = `
      display:inline-flex; align-items:center;
      font-size:9px; padding:2px 7px; border-radius:3px;
      background:rgba(0,200,255,.08); border:1px solid rgba(0,200,255,.2);
      color:#00c8ff; letter-spacing:.3px;
    `;
    el.textContent = label;
    return el;
  }

  #badge(text, bg, color) {
    const el = document.createElement('span');
    el.style.cssText = `
      font-size:8px; padding:2px 7px; border-radius:3px;
      background:${bg}; color:${color}; font-weight:700;
      letter-spacing:.4px; white-space:nowrap;
    `;
    el.textContent = text;
    return el;
  }

  #actionBtn(label, color, onClick = null, isDanger = false) {
    const btn = document.createElement('button');
    btn.style.cssText = `
      font-family:'Space Mono',monospace; font-size:9px;
      padding:4px 10px; border-radius:4px; cursor:pointer;
      border:1px solid ${isDanger ? 'rgba(255,61,90,.3)' : 'var(--border)'};
      background:${isDanger ? 'rgba(255,61,90,.08)' : 'transparent'};
      color:${color}; transition:all .15s; letter-spacing:.4px;
    `;
    btn.textContent = label;
    if (onClick) btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => {
      btn.style.background = isDanger ? 'rgba(255,61,90,.18)' : 'rgba(255,255,255,.05)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = isDanger ? 'rgba(255,61,90,.08)' : 'transparent';
    });
    return btn;
  }

  #emptyState(icon, title, sub) {
    const el = document.createElement('div');
    el.style.cssText = 'padding:36px 18px;text-align:center;color:var(--muted);';
    el.innerHTML = `
      <div style="font-size:28px;margin-bottom:10px">${icon}</div>
      <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:5px">${title}</div>
      <div style="font-size:10px;letter-spacing:.04em">${sub}</div>
    `;
    return el;
  }

  /**
   * @param {number} ts
   * @returns {string}
   */
  #formatDate(ts) {
    const elapsed = Date.now() - ts;
    if (elapsed < 86_400_000) return fmtRelative(ts);
    return fmtDateTime(ts);
  }

  #bindStaticEvents() {
    document.getElementById('alert-center-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') this.close();
    });

    ['active', 'history'].forEach(tab => {
      document.getElementById(`alert-center-tab-${tab}`)
        ?.addEventListener('click', () => {
          this.#activeTab = tab;
          this.#renderTabs();
          this.#render();
        });
    });
  }
}
