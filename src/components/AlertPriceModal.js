// ============================================================
//  src/components/AlertPriceModal.js — CrypView V2.7
//  Modale de création d'alerte de prix.
//  Pré-remplie avec le prix du curseur, entièrement éditable.
//  Affiche la direction (hausse/baisse) selon la saisie.
//
//  Usage :
//    const modal = new AlertPriceModal();
//    const price = await modal.open('btcusdt', 65000, 64800);
//    if (price !== null) alertManager.add(symbol, price, currentPrice);
// ============================================================

import { fmtPrice } from '../utils/format.js';

export class AlertPriceModal {
  #overlay;
  #input;
  #hintEl;
  #symEl;
  #currentEl;
  #confirmBtn;
  #cancelBtn;
  #currentPrice = 0;
  #resolve      = null;

  constructor() {
    this.#overlay    = document.getElementById('alert-modal-overlay');
    this.#input      = document.getElementById('alert-price-input');
    this.#hintEl     = document.getElementById('alert-direction-hint');
    this.#symEl      = document.getElementById('alert-modal-sym');
    this.#currentEl  = document.getElementById('alert-modal-current');
    this.#confirmBtn = document.getElementById('alert-modal-confirm');
    this.#cancelBtn  = document.getElementById('alert-modal-cancel');
    this.#bindEvents();
  }
  
  /**
   * @param {string} symbol
   * @param {number} suggestedPrice
   * @param {number} currentPrice
   * @returns {Promise<number|null>}
   */
  open(symbol, suggestedPrice, currentPrice) {
    return new Promise(resolve => {
      this.#resolve      = resolve;
      this.#currentPrice = currentPrice ?? suggestedPrice;

      const sym = symbol.toUpperCase().replace(/USDT$/, '') + '/USDT';
      if (this.#symEl)     this.#symEl.textContent    = sym;
      if (this.#currentEl) this.#currentEl.textContent =
        `Actuel\u00a0: ${fmtPrice(this.#currentPrice)}`;

      if (this.#input) {
        const dec = suggestedPrice >= 1000 ? 2 : suggestedPrice >= 1 ? 4 : 6;
        this.#input.value = suggestedPrice.toFixed(dec);
        this.#input.step  = String(Math.pow(10, -dec));
        this.#input.style.borderColor = '';
      }

      this.#updateHint(suggestedPrice);
      this.#overlay.style.display = 'block';
      setTimeout(() => { this.#input?.focus(); this.#input?.select(); }, 60);
    });
  }

  close(result = null) {
    if (!this.#resolve) return;
    this.#overlay.style.display = 'none';
    const r = this.#resolve;
    this.#resolve = null;
    r(result);
  }

  #updateHint(price) {
    if (!this.#hintEl) return;
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) { this.#hintEl.innerHTML = ''; return; }

    const up    = p >= this.#currentPrice;
    const arrow = up ? '⬆️' : '⬇️';
    const color = up ? 'var(--green)' : 'var(--red)';
    const delta = Math.abs(p - this.#currentPrice);
    const pct   = this.#currentPrice ? (delta / this.#currentPrice * 100).toFixed(2) : '—';
    const label = up
      ? `Monte au-dessus de ${fmtPrice(p)}`
      : `Descend en-dessous de ${fmtPrice(p)}`;

    this.#hintEl.innerHTML =
      `<span style="color:${color}">${arrow} Se déclenche si ${label}</span>
       <span style="color:var(--muted);display:block;margin-top:3px;font-size:9px">
         Écart&nbsp;: ${fmtPrice(delta)} (${pct}&nbsp;%)
       </span>`;
  }

  #confirm() {
    const val = parseFloat(this.#input?.value);
    if (!val || val <= 0) {
      if (this.#input) {
        this.#input.style.borderColor = 'var(--red)';
        this.#input.focus();
        setTimeout(() => { if (this.#input) this.#input.style.borderColor = ''; }, 1500);
      }
      return;
    }
    this.close(val);
  }

  #bindEvents() {
    document.getElementById('alert-modal-close')
      ?.addEventListener('click', () => this.close(null));
    this.#cancelBtn?.addEventListener('click', () => this.close(null));

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close(null);
    });

    document.addEventListener('keydown', e => {
      if (this.#overlay?.style.display !== 'block') return;
      if (e.key === 'Escape') { e.stopPropagation(); this.close(null); }
      if (e.key === 'Enter')  { e.preventDefault();  this.#confirm();  }
    });

    this.#input?.addEventListener('input', () => this.#updateHint(this.#input.value));
    this.#confirmBtn?.addEventListener('click', () => this.#confirm());
  }
}
