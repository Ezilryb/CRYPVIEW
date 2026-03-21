// ============================================================
//  src/components/TimeframeBar.js — CrypView V2
//  Sélecteur de timeframe par panneau (multi-charts).
//  Bouton + dropdown avec grille de boutons.
//
//  Usage :
//    const tfBar = new TimeframeBar(wrapEl, labelEl, gridEl, '1h', {
//      onChange: (tf) => reconnectInst(inst, tf),
//    });
//    tfBar.getValue(); // → '1h'
// ============================================================

/** Tous les timeframes supportés par Binance + CrypView. */
export const ALL_TF = [
  { tf: '1s',  label: '1s'    },
  { tf: '1m',  label: '1m'    },
  { tf: '3m',  label: '3m'    },
  { tf: '5m',  label: '5m'    },
  { tf: '15m', label: '15m'   },
  { tf: '30m', label: '30m'   },
  { tf: '1h',  label: '1h'    },
  { tf: '2h',  label: '2h'    },
  { tf: '4h',  label: '4h'    },
  { tf: '6h',  label: '6h'    },
  { tf: '12h', label: '12h'   },
  { tf: '1d',  label: '1d'    },
  { tf: '3d',  label: '3d'    },
  { tf: '1w',  label: '1sem'  },
  { tf: '1M',  label: '1mois' },
];

export class TimeframeBar {
  #wrapEl;
  #labelEl;
  #gridEl;
  #currentTf;
  #callbacks;

  /**
   * @param {HTMLElement} wrapEl   — div.tf-btn-wrap (gère la classe .open)
   * @param {HTMLElement} labelEl  — span#tf-label-N (texte du bouton)
   * @param {HTMLElement} gridEl   — div#tfgrid-N    (reçoit les boutons)
   * @param {string}      currentTf
   * @param {{ onChange: function(string) }} callbacks
   */
  constructor(wrapEl, labelEl, gridEl, currentTf, callbacks) {
    this.#wrapEl    = wrapEl;
    this.#labelEl   = labelEl;
    this.#gridEl    = gridEl;
    this.#currentTf = currentTf;
    this.#callbacks = callbacks;
    this.#buildGrid();
    this.#bindToggle();
  }

  // ── API publique ──────────────────────────────────────────

  getValue() { return this.#currentTf; }

  /** Met à jour le TF actif sans déclencher onChange. */
  setValue(tf) {
    this.#currentTf = tf;
    if (this.#labelEl) this.#labelEl.textContent = tf;
    this.#buildGrid();
  }

  /** Ferme le dropdown. */
  close() { this.#wrapEl?.classList.remove('open'); }

  // ── Construction ─────────────────────────────────────────

  #buildGrid() {
    if (!this.#gridEl) return;
    this.#gridEl.innerHTML = '';
    ALL_TF.forEach(({ tf, label }) => {
      const btn = document.createElement('button');
      btn.className   = `tf-opt${tf === this.#currentTf ? ' active' : ''}`;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', tf === this.#currentTf ? 'true' : 'false');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.#selectTf(tf);
      });
      this.#gridEl.appendChild(btn);
    });
  }

  #selectTf(tf) {
    this.#currentTf = tf;
    if (this.#labelEl) this.#labelEl.textContent = tf;
    this.close();
    this.#buildGrid();
    this.#callbacks.onChange?.(tf);
  }

  #bindToggle() {
    const btn = this.#wrapEl?.querySelector('.tf-current-btn');
    btn?.addEventListener('click', e => {
      e.stopPropagation();
      this.#wrapEl.classList.toggle('open');
    });
  }
}
