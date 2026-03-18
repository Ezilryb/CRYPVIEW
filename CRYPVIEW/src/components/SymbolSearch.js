// ============================================================
//  src/components/SymbolSearch.js — CrypView V2
//  Champ de recherche de symbole par panneau (multi-charts).
//  Gère le filtre live, la navigation clavier et le dropdown.
//
//  Usage :
//    const search = new SymbolSearch(inputEl, dropdownEl, symbols, {
//      onSelect: (sym) => reconnectInst(inst, sym),
//    });
//    search.setValue('btcusdt');   // affiche "BTC/USDT"
//    search.setSymbols(allSymbols); // met à jour la liste
// ============================================================

/** Convertit 'btcusdt' → 'BTC' */
const symBase = sym => sym.replace(/usdt$/i, '').toUpperCase();

export class SymbolSearch {
  #input;
  #dropdown;
  #symbols  = [];
  #focusIdx = -1;
  #currentSym;
  #callbacks;

  /**
   * @param {HTMLInputElement}  inputEl
   * @param {HTMLElement}       dropdownEl
   * @param {Array<{symbol:string,base:string}>} symbols
   * @param {{ onSelect: function(string) }} callbacks
   */
  constructor(inputEl, dropdownEl, symbols, callbacks) {
    this.#input     = inputEl;
    this.#dropdown  = dropdownEl;
    this.#symbols   = symbols;
    this.#callbacks = callbacks;
    this.#bindEvents();
  }

  // ── API publique ──────────────────────────────────────────

  /** Affiche le symbole courant dans le champ (format "BTC/USDT"). */
  setValue(sym) {
    this.#currentSym = sym;
    this.#input.value = `${symBase(sym)}/USDT`;
  }

  /** Remplace la liste de symboles disponibles. */
  setSymbols(symbols) {
    this.#symbols = symbols;
  }

  // ── Rendu du dropdown ─────────────────────────────────────

  #render(query) {
    this.#focusIdx = -1;
    const q = query.trim().toUpperCase().replace('/USDT', '');
    const matches = q
      ? this.#symbols.filter(s => s.base.startsWith(q)).slice(0, 28)
      : [];

    if (!matches.length) {
      this.#dropdown.innerHTML = q
        ? '<div class="sym-empty">Aucun résultat</div>'
        : '';
      this.#dropdown.classList.toggle('open', !!q);
      return;
    }

    this.#dropdown.innerHTML = matches
      .map(s => `<div class="sym-opt" data-sym="${s.symbol}">
          <span class="sym-base">${s.base}</span>
          <span class="sym-quote">USDT</span>
        </div>`)
      .join('');
    this.#dropdown.classList.add('open');

    this.#dropdown.querySelectorAll('.sym-opt').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        this.#select(el.dataset.sym);
      });
    });
  }

  #moveFocus(dir) {
    const opts = this.#dropdown.querySelectorAll('.sym-opt');
    if (!opts.length) return;
    opts[this.#focusIdx]?.classList.remove('focused');
    this.#focusIdx = Math.max(0, Math.min(opts.length - 1, this.#focusIdx + dir));
    opts[this.#focusIdx].classList.add('focused');
    opts[this.#focusIdx].scrollIntoView({ block: 'nearest' });
  }

  #select(sym) {
    this.setValue(sym);
    this.#dropdown.classList.remove('open');
    this.#input.blur();
    this.#callbacks.onSelect?.(sym);
  }

  // ── Événements ───────────────────────────────────────────

  #bindEvents() {
    const input = this.#input;

    input.addEventListener('focus', () => {
      input.select();
      this.#render(input.value);
    });

    input.addEventListener('input', e => this.#render(e.target.value));

    input.addEventListener('blur', () => {
      setTimeout(() => {
        this.#dropdown.classList.remove('open');
        // Remet le symbole courant si l'utilisateur n'a pas sélectionné
        if (this.#currentSym) input.value = `${symBase(this.#currentSym)}/USDT`;
      }, 160);
    });

    input.addEventListener('keydown', e => {
      if      (e.key === 'ArrowDown')  { e.preventDefault(); this.#moveFocus(+1); }
      else if (e.key === 'ArrowUp')    { e.preventDefault(); this.#moveFocus(-1); }
      else if (e.key === 'Enter') {
        const focused = this.#dropdown.querySelector('.sym-opt.focused');
        if (focused) {
          this.#select(focused.dataset.sym);
        } else {
          const q = input.value.trim().toUpperCase().replace('/USDT', '');
          const match = this.#symbols.find(s => s.base === q);
          if (match) this.#select(match.symbol);
        }
      }
      else if (e.key === 'Escape') {
        this.#dropdown.classList.remove('open');
        input.blur();
      }
    });
  }
}
