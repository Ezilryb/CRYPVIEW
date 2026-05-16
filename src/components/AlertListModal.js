// ============================================================
//  src/components/AlertListModal.js — CrypView V2.7.2
//  Modal de gestion des alertes actives.
//  Affiche la liste des alertes non-déclenchées avec suppression
//  unitaire et suppression globale.
//
//  Usage :
//    const modal = new AlertListModal(alertManager);
//    modal.open();                   // ouvre et rafraîchit
//    modal.refresh();               // rafraîchit sans ouvrir
// ============================================================

import { fmtPrice } from '../utils/format.js';

export class AlertListModal {
  #overlay;
  #alertManager;

  /**
   * @param {AlertManager} alertManager
   */
  constructor(alertManager) {
    this.#alertManager = alertManager;
    this.#overlay      = document.getElementById('alert-list-modal-overlay');
    this.#bindEvents();
  }

  open() {
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

  #render() {
    const list    = document.getElementById('alert-list-items');
    const countEl = document.getElementById('alert-list-count');
    const clearBtn = document.getElementById('alert-list-clear-all');
    if (!list) return;

    const alerts = this.#alertManager.getActive();

    if (countEl) {
      const n = alerts.length;
      countEl.textContent = `${n} alerte${n !== 1 ? 's' : ''} active${n !== 1 ? 's' : ''}`;
    }

    if (clearBtn) {
      clearBtn.style.display = alerts.length >= 2 ? 'block' : 'none';
    }

    list.innerHTML = '';

    if (!alerts.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:28px 18px;text-align:center;color:var(--muted);font-size:11px;line-height:1.7;';
      empty.innerHTML = '<div style="font-size:22px;margin-bottom:10px">🔕</div>Aucune alerte active<br><span style="font-size:9px;letter-spacing:.5px">Clic droit sur le chart → Set Alert</span>';
      list.appendChild(empty);
      return;
    }

    const sorted = [...alerts].sort((a, b) => {
      if (a.direction !== b.direction) return a.direction === 'up' ? -1 : 1;
      return b.price - a.price;
    });

    sorted.forEach(alert => {
      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:12px',
        'padding:10px 16px',
        'border-bottom:1px solid var(--border)',
        'transition:background .1s',
      ].join(';');

      row.onmouseenter = () => { row.style.background = 'rgba(255,255,255,.03)'; };
      row.onmouseleave = () => { row.style.background = ''; };

      const isUp     = alert.direction === 'up';
      const dirColor = isUp ? 'var(--green)' : 'var(--red)';
      const dirIcon  = isUp ? '⬆' : '⬇';
      const dirLabel = isUp ? 'Si prix ≥' : 'Si prix ≤';

      const icon = document.createElement('div');
      icon.style.cssText = `width:28px;height:28px;border-radius:50%;background:${dirColor}18;border:1px solid ${dirColor}44;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:${dirColor};`;
      icon.textContent = dirIcon;

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      const sym = document.createElement('div');
      sym.style.cssText = 'font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.03em;';
      sym.textContent   = alert.symbol.replace('USDT', '/USDT');

      const price = document.createElement('div');
      price.style.cssText = `font-size:13px;font-weight:700;color:var(--text);margin-top:1px;`;
      price.textContent   = fmtPrice(alert.price);

      const hint = document.createElement('div');
      hint.style.cssText = `font-size:9px;color:${dirColor};margin-top:2px;letter-spacing:.4px;`;
      hint.textContent   = dirLabel;

      info.append(sym, price, hint);

      const del = document.createElement('button');
      del.style.cssText = [
        'background:rgba(255,61,90,.08)',
        'border:1px solid rgba(255,61,90,.25)',
        'color:var(--red)',
        'padding:5px 11px',
        'font-family:\'Space Mono\',monospace',
        'font-size:10px',
        'border-radius:4px',
        'cursor:pointer',
        'flex-shrink:0',
        'transition:all .15s',
      ].join(';');
      del.textContent = '✕ Suppr.';
      del.setAttribute('aria-label', `Supprimer l'alerte ${alert.symbol} @ ${fmtPrice(alert.price)}`);
      del.onmouseenter = () => { del.style.background = 'rgba(255,61,90,.18)'; del.style.borderColor = 'var(--red)'; };
      del.onmouseleave = () => { del.style.background = 'rgba(255,61,90,.08)'; del.style.borderColor = 'rgba(255,61,90,.25)'; };

      del.addEventListener('click', () => {
        this.#alertManager.remove(alert.id);
        this.#render();
      });

      row.append(icon, info, del);
      list.appendChild(row);
    });
  }

  #bindEvents() {
    document.getElementById('alert-list-modal-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') this.close();
    });

    document.getElementById('alert-list-clear-all')?.addEventListener('click', () => {
      this.#alertManager.removeAll();
      this.#render();
    });
  }
}
