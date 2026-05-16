// ============================================================
//  src/components/TimeframeBar.js — CrypView V2
//  Sélecteur de timeframe par panneau (multi-charts).
//  Supporte deux modes :
//    • dropdown — wrapEl contient un .tf-current-btn
//    • flat     — pas de .tf-current-btn, boutons rendus inline
//
//  Usage :
//    const tfBar = new TimeframeBar(wrapEl, labelEl, gridEl, '1h', {
//      onChange: (tf) => reconnectInst(inst, tf),
//    });
//    tfBar.getValue(); // → '1h'
// ============================================================

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
  /** @type {boolean}*/
  #flat = false;

  /**
   * @param {HTMLElement} wrapEl
   * @param {HTMLElement} labelEl
   * @param {HTMLElement} gridEl
   * @param {string}      currentTf
   * @param {{ onChange: function(string) }} callbacks
   */
  constructor(wrapEl, labelEl, gridEl, currentTf, callbacks) {
    this.#wrapEl    = wrapEl;
    this.#labelEl   = labelEl;
    this.#gridEl    = gridEl;
    this.#currentTf = currentTf;
    this.#callbacks = callbacks;

    this.#flat = !wrapEl?.querySelector('.tf-current-btn');

    this.#buildGrid();
    if (!this.#flat) this.#bindToggle();
  }

  getValue() { return this.#currentTf; }

  setValue(tf) {
    this.#currentTf = tf;
    if (!this.#flat && this.#labelEl) this.#labelEl.textContent = tf;
    this.#buildGrid();
  }

  close() {
    if (!this.#flat) this.#wrapEl?.classList.remove('open');
  }

  #buildGrid() {
    if (!this.#gridEl) return;
    this.#gridEl.innerHTML = '';

    ALL_TF.forEach(({ tf, label }) => {
      const btn = document.createElement('button');
      btn.className = this.#flat
        ? `tf-btn${tf === this.#currentTf ? ' active' : ''}`
        : `tf-opt${tf === this.#currentTf ? ' active' : ''}`;
      btn.dataset.tf = tf;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', tf === this.#currentTf ? 'true' : 'false');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.#selectTf(tf);
      });
      this.#gridEl.appendChild(btn);
    });

    requestAnimationFrame(() => requestAnimationFrame(() => this.#scrollToActive()));
  }

  #selectTf(tf) {
    this.#currentTf = tf;
    if (!this.#flat && this.#labelEl) this.#labelEl.textContent = tf;
    if (!this.#flat) this.close();
    this.#buildGrid();
    this.#callbacks.onChange?.(tf);
  }

  #scrollToActive() {
    const activeBtn = this.#gridEl?.querySelector('.tf-btn.active, .tf-opt.active');
    if (!activeBtn) return;

    activeBtn.scrollIntoView({
      behavior: 'smooth',
      block:    'nearest',
      inline:   'center',
    });
  }

  #bindToggle() {
    const btn = this.#wrapEl?.querySelector('.tf-current-btn');
    btn?.addEventListener('click', e => {
      e.stopPropagation();
      this.#wrapEl.classList.toggle('open');
    });
  }
}
