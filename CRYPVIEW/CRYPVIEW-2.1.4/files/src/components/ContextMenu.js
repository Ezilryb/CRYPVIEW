// ============================================================
//  src/components/ContextMenu.js — CrypView V2
//  Menu contextuel du chart avec sous-panneaux (indicateurs,
//  multi-charts, drawing tools).
//
//  Usage :
//    const menu = new ContextMenu(chartContainer, {
//      onOpenIndModal:  () => modal.open(),
//      onRemoveAllInd:  () => indicators.removeAll(),
//      onSetTool:       (tool) => drawing.setTool(tool),
//      onClearDrawings: () => drawing.clear(),
//      onNavigate:      (href) => window.location.href = href,
//    });
//    menu.update(indicators, drawing); // rafraîchit les coches
// ============================================================

export class ContextMenu {
  #root;        // div#ctx-menu
  #subPanels;   // { ind, multi, draw }
  #catEls;      // { ind, multi, draw }
  #openSub = null;
  #callbacks;
  #currentSymbol = 'btcusdt';

  /**
   * @param {HTMLElement} chartContainer — div#chart-container (source du contextmenu)
   * @param {object}      callbacks
   * @param {function}    callbacks.onOpenIndModal
   * @param {function}    callbacks.onRemoveAllInd
   * @param {function(string)} callbacks.onSetTool
   * @param {function}    callbacks.onClearDrawings
   * @param {function(string)} callbacks.onNavigate
   */
  constructor(chartContainer, callbacks) {
    this.#root      = document.getElementById('ctx-menu');
    this.#subPanels = {
      ind:   document.getElementById('sub-ind'),
      multi: document.getElementById('sub-multi'),
      draw:  document.getElementById('sub-draw'),
    };
    this.#catEls = {
      ind:   document.getElementById('cat-ind'),
      multi: document.getElementById('cat-multi'),
      draw:  document.getElementById('cat-draw'),
    };
    this.#callbacks = callbacks;
    this.#bindEvents(chartContainer);
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Met à jour les coches visuelles selon l'état actuel.
   * @param {string[]} activeIndKeys   — clés IND_META actifs
   * @param {string|null} currentTool — outil drawing actif
   */
  update(activeIndKeys, currentTool) {
    document.querySelectorAll('.ctx-item[data-ind]').forEach(el => {
      el.classList.toggle('on', activeIndKeys.includes(el.dataset.ind));
    });
    document.querySelectorAll('#sub-draw .ctx-item[data-tool]').forEach(el => {
      el.classList.toggle('draw-active', currentTool === el.dataset.tool);
    });
  }

  /** Met à jour le libellé du chart actif (multi-charts uniquement). */
  setChartLabel(text) {
    const el = document.getElementById('ctx-chart-label');
    if (el) el.textContent = text;
  }

  /** Met à jour le symbole courant pour la navigation multi-charts. */
  setSymbol(sym) { this.#currentSymbol = sym; }

  close() {
    this.#root.classList.remove('visible');
    this.#closeAllSubs();
  }

  // ── Événements ───────────────────────────────────────────

  #bindEvents(chartContainer) {
    // Ouverture au clic droit sur le chart
    chartContainer.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.#closeAllSubs();
      const mw = this.#root.offsetWidth  ?? 220;
      const mh = this.#root.offsetHeight ?? 120;
      const x  = Math.min(e.clientX, window.innerWidth  - mw - 8);
      const y  = Math.min(e.clientY, window.innerHeight - mh - 8);
      this.#root.style.left = `${x}px`;
      this.#root.style.top  = `${y}px`;
      this.#root.classList.add('visible');
    });

    // Fermeture au clic extérieur
    document.addEventListener('click', e => {
      if (!this.#root.contains(e.target) &&
          !Object.values(this.#subPanels).some(p => p.contains(e.target))) {
        this.close();
      }
    });

    // Échap
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Sous-panneaux des catégories
    for (const [key, cat] of Object.entries(this.#catEls)) {
      cat.addEventListener('click',      e => { e.stopPropagation(); this.#openSubPanel(key); });
      cat.addEventListener('mouseenter', () => { if (this.#openSub !== null) this.#openSubPanel(key); });
    }

    // Actions indicateurs
    document.getElementById('ctx-open-ind-modal')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenIndModal?.();
    });
    document.getElementById('ctx-remove-all')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onRemoveAllInd?.();
    });

    // Navigation multi-charts
    document.getElementById('ctx-back-single')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onNavigate?.(`page.html?sym=${this.#currentSymbol}`);
    });
    document.getElementById('ctx-multi2')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onNavigate?.(`multi2.html?sym=${this.#currentSymbol}`);
    });
    document.getElementById('ctx-multi4')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onNavigate?.(`multi4.html?sym=${this.#currentSymbol}`);
    });

    // Outils de dessin
    document.querySelectorAll('#sub-draw .ctx-item[data-tool]').forEach(el => {
      el.addEventListener('click', () => {
        this.close();
        this.#callbacks.onSetTool?.(el.dataset.tool);
      });
    });
    document.getElementById('ctx-clear-draws')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onClearDrawings?.();
    });
  }

  // ── Sous-panneaux ────────────────────────────────────────

  #openSubPanel(key) {
    if (this.#openSub === key) { this.#closeAllSubs(); return; }
    this.#closeAllSubs();
    this.#openSub = key;
    this.#catEls[key].classList.add('open');
    this.#subPanels[key].classList.add('visible');
    requestAnimationFrame(() => this.#positionSub(key));
  }

  #closeAllSubs() {
    Object.values(this.#subPanels).forEach(p => p.classList.remove('visible'));
    Object.values(this.#catEls).forEach(c => c.classList.remove('open'));
    this.#openSub = null;
  }

  #positionSub(key) {
    const sub = this.#subPanels[key];
    const cat = this.#catEls[key];
    const mr  = this.#root.getBoundingClientRect();
    const cr  = cat.getBoundingClientRect();
    const sw  = sub.offsetWidth  || 240;
    const sh  = sub.offsetHeight || 300;
    let left  = mr.right + 4;
    let top   = cr.top;
    if (left + sw > window.innerWidth  - 8) left = mr.left - sw - 4;
    if (top  + sh > window.innerHeight - 8) top  = window.innerHeight - sh - 8;
    sub.style.left = `${left}px`;
    sub.style.top  = `${Math.max(8, top)}px`;
  }
}
