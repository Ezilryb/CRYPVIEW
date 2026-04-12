// ============================================================
//  src/components/ExchangePremiumBar.js — CrypView V3.7
//  Barre premium multi-exchange affichée sous le header.
//
//  Affiche : prix Binance (référence) · premium Bybit · premium OKX
//  Couleur : vert si premium > 0 (asset plus cher ailleurs), rouge sinon.
//
//  Usage :
//    const bar = new ExchangePremiumBar();
//    bar.mount();                    // injecte le HTML
//    bar.update(aggregator.getAll()); // met à jour l'affichage
//    bar.destroy();
// ============================================================

import { fmtPrice } from '../utils/format.js';

const EXCHANGE_ICONS = {
  binance: '🟡',
  bybit:   '🟠',
  okx:     '⬛',
};

export class ExchangePremiumBar {
  #el       = null;
  #visible  = true;

  /** Injecte le conteneur dans le DOM (après le header). */
  mount() {
    if (document.getElementById('exchange-premium-bar')) return;

    const bar = document.createElement('div');
    bar.id    = 'exchange-premium-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('aria-label', 'Comparaison de prix multi-exchange');
    bar.style.cssText = this.#barStyles();

    bar.innerHTML = `
      <div id="epb-inner"
           style="display:flex;align-items:center;gap:0;overflow-x:auto;
                  scrollbar-width:none;flex:1;min-width:0;">
        <span style="font-size:8px;color:var(--muted);text-transform:uppercase;
                     letter-spacing:.9px;flex-shrink:0;margin-right:8px;">
          Multi-Exchange
        </span>
      </div>
      <button id="epb-toggle"
              title="Masquer la barre multi-exchange"
              style="background:none;border:none;color:var(--muted);font-size:11px;
                     cursor:pointer;padding:0 4px;flex-shrink:0;line-height:1;
                     transition:color .15s;"
              aria-label="Masquer/Afficher la barre multi-exchange">✕</button>
    `;

    // Insère après le header
    const header = document.querySelector('header');
    header?.insertAdjacentElement('afterend', bar);
    this.#el = bar;

    document.getElementById('epb-toggle')?.addEventListener('click', () => {
      this.#visible = !this.#visible;
      if (this.#el) this.#el.style.display = this.#visible ? 'flex' : 'none';
    });

    // Écoute les mises à jour de l'agrégateur
    window.addEventListener('exchange:update', ({ detail }) => {
      this.update(detail.exchanges, detail.bestBid, detail.bestAsk);
    });
  }

  /**
   * Met à jour l'affichage avec les données fraîches.
   * @param {Map<string, AggEntry>} data
   * @param {number|null} bestBid
   * @param {number|null} bestAsk
   */
  update(data, bestBid = null, bestAsk = null) {
    const inner = document.getElementById('epb-inner');
    if (!inner) return;

    // Vide les chips précédentes (garde le label)
    inner.querySelectorAll('.epb-chip').forEach(c => c.remove());

    const binanceEntry = data.get('binance');

    for (const [exchange, entry] of data) {
      const chip = this.#buildChip(exchange, entry, binanceEntry, exchange === 'binance');
      inner.appendChild(chip);
    }

    // Best bid/ask agrégé (si disponible)
    if (bestBid && bestAsk && binanceEntry) {
      const sep = document.createElement('div');
      sep.className = 'epb-chip';
      sep.style.cssText = 'margin-left:12px;font-size:8px;color:var(--muted);flex-shrink:0;';
      const spread = ((bestAsk - bestBid) / binanceEntry.price * 100).toFixed(4);
      sep.innerHTML = `<span style="color:var(--muted)">Best spread:</span>
                       <span style="color:var(--cyan)">&nbsp;${spread}%</span>`;
      inner.appendChild(sep);
    }
  }

  /**
   * Construit un chip d'exchange.
   * @param {string}     exchange
   * @param {AggEntry}   entry
   * @param {AggEntry|null} binance
   * @param {boolean}    isRef — true pour Binance (référence)
   * @returns {HTMLElement}
   */
  #buildChip(exchange, entry, binance, isRef) {
    const chip = document.createElement('div');
    chip.className = 'epb-chip';
    chip.style.cssText = `
      display:inline-flex; align-items:center; gap:5px;
      padding:2px 10px; flex-shrink:0;
      border-right:1px solid var(--border);
      font-family:'Space Mono',monospace;
      ${entry.stale ? 'opacity:.45;' : ''}
    `;

    const icon  = EXCHANGE_ICONS[exchange] ?? '⬜';
    const price = fmtPrice(entry.price);

    if (isRef) {
      chip.innerHTML = `
        <span style="font-size:10px;line-height:1;">${icon}</span>
        <span style="font-size:10px;color:var(--text);font-weight:700;">${price}</span>
        <span style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">${exchange}</span>
      `;
    } else {
      const prem    = entry.premium;
      const premStr = prem !== null ? (prem >= 0 ? '+' : '') + prem.toFixed(3) + '%' : '—';
      const color   = prem === null ? 'var(--muted)'
                    : prem > 0.05  ? 'var(--green)'
                    : prem < -0.05 ? 'var(--red)'
                    : 'var(--muted)';

      chip.innerHTML = `
        <span style="font-size:10px;line-height:1;">${icon}</span>
        <span style="font-size:10px;color:var(--text);">${price}</span>
        <span style="font-size:8px;color:${color};font-weight:700;">${premStr}</span>
        <span style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;">${exchange}</span>
      `;

      // Tooltip spread
      if (entry.spread !== null) {
        chip.title = `Spread ${exchange}: ${entry.spread.toFixed(4)}%`;
      }
    }

    return chip;
  }

  /** Retire la barre du DOM. */
  destroy() {
    this.#el?.remove();
    this.#el = null;
  }

  // ── Styles ────────────────────────────────────────────────

  #barStyles() {
    return [
      'display:flex',
      'align-items:center',
      'padding:3px 14px',
      'border-bottom:1px solid var(--border)',
      'background:var(--panel)',
      'flex-shrink:0',
      'min-height:26px',
      'gap:8px',
      'overflow:hidden',
    ].join(';');
  }
}

/** @typedef {import('../api/ExchangeAggregator.js').AggEntry} AggEntry */
