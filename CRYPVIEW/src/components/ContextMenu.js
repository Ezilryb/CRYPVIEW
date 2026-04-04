// ============================================================
//  src/components/ContextMenu.js — CrypView V3.1
//  Menu contextuel du chart avec sous-panneaux (indicateurs,
//  multi-charts, drawing tools, alertes).
//  v3.1 : Ajout item Market Screener
//  v3.2 : screener/profiles déplacés dans sub-ind ; binding ctx-open-export ajouté
// ============================================================

export class ContextMenu {
  #root;        // div#ctx-menu
  #subPanels;   // { ind, multi, draw, alerts }
  #catEls;      // { ind, multi, draw, alerts }
  #openSub = null;
  #callbacks;
  #currentSymbol = 'btcusdt';

  /** Coordonnée Y (client) du dernier clic droit — transmise à onAddAlert */
  #lastContextClientY = 0;

  /**
   * @param {HTMLElement} chartContainer
   * @param {object}      callbacks
   * @param {function}    callbacks.onOpenIndModal
   * @param {function}    callbacks.onRemoveAllInd
   * @param {function(string)} callbacks.onSetTool
   * @param {function}    callbacks.onClearDrawings
   * @param {function(string)} callbacks.onNavigate
   * @param {function(number)} [callbacks.onAddAlert]
   * @param {function}         [callbacks.onManageAlerts]
   * @param {function}         [callbacks.onOpenSettingsModal]
   * @param {function}         [callbacks.onOpenScreener]
   * @param {function}         [callbacks.onOpenProfiles]
   * @param {function}         [callbacks.onOpenExport]
   */
  constructor(chartContainer, callbacks) {
    this.#root      = document.getElementById('ctx-menu');
    this.#subPanels = {
      ind:    document.getElementById('sub-ind'),
      multi:  document.getElementById('sub-multi'),
      draw:   document.getElementById('sub-draw'),
      alerts: document.getElementById('sub-alerts'),
    };
    this.#catEls = {
      ind:    document.getElementById('cat-ind'),
      multi:  document.getElementById('cat-multi'),
      draw:   document.getElementById('cat-draw'),
      alerts: document.getElementById('cat-alerts'),
    };
    this.#callbacks = callbacks;
    this.#bindEvents(chartContainer);
  }

  // ── API publique ──────────────────────────────────────────

  update(activeIndKeys, currentTool) {
    document.querySelectorAll('.ctx-item[data-ind]').forEach(el => {
      el.classList.toggle('on', activeIndKeys.includes(el.dataset.ind));
    });
    document.querySelectorAll('#sub-draw .ctx-item[data-tool]').forEach(el => {
      el.classList.toggle('draw-active', currentTool === el.dataset.tool);
    });
  }

  setChartLabel(text) {
    const el = document.getElementById('ctx-chart-label');
    if (el) el.textContent = text;
  }

  setSymbol(sym) { this.#currentSymbol = sym; }

  close() {
    this.#root.classList.remove('visible');
    this.#closeAllSubs();
  }

  // ── Événements ───────────────────────────────────────────

  #bindEvents(chartContainer) {
    // Ouverture au clic droit
    chartContainer.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.#lastContextClientY = e.clientY;
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
          !Object.values(this.#subPanels).some(p => p?.contains(e.target))) {
        this.close();
      }
    });

    // Échap
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

    // Sous-panneaux des catégories
    for (const [key, cat] of Object.entries(this.#catEls)) {
      if (!cat) continue;
      cat.addEventListener('click',      e => { e.stopPropagation(); this.#openSubPanel(key); });
      cat.addEventListener('mouseenter', () => { if (this.#openSub !== null) this.#openSubPanel(key); });
    }

    // ── Indicateurs ───────────────────────────────────────
    document.getElementById('ctx-open-ind-modal')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenIndModal?.();
    });
    document.getElementById('ctx-remove-all')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onRemoveAllInd?.();
    });

    // ── Navigation multi-charts ───────────────────────────
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

    // ── Outils de dessin ──────────────────────────────────
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

    // ── Alertes ───────────────────────────────────────────
    document.getElementById('ctx-add-alert')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onAddAlert?.(this.#lastContextClientY);
    });
    document.getElementById('ctx-manage-alerts')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onManageAlerts?.();
    });

    // ── Market Screener ───────────────────────────────────
    document.getElementById('ctx-open-screener')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenScreener?.();
    });

    // ── Profils ───────────────────────────────────────────
    document.getElementById('ctx-open-profiles')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenProfiles?.();
    });

    // ── Export & Partage ──────────────────────────────────────
    document.getElementById('ctx-open-export')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenExport?.();
    });

    // ── Paramètres ────────────────────────────────────────
    document.getElementById('ctx-open-settings')?.addEventListener('click', () => {
      this.close();
      this.#callbacks.onOpenSettingsModal?.();
    });
  }

  // ── Sous-panneaux ────────────────────────────────────────

  #openSubPanel(key) {
    if (!this.#subPanels[key]) return;
    if (this.#openSub === key) { this.#closeAllSubs(); return; }
    this.#closeAllSubs();
    this.#openSub = key;
    this.#catEls[key].classList.add('open');
    this.#subPanels[key].classList.add('visible');
    requestAnimationFrame(() => this.#positionSub(key));
  }

  #closeAllSubs() {
    Object.values(this.#subPanels).forEach(p => p?.classList.remove('visible'));
    Object.values(this.#catEls).forEach(c => c?.classList.remove('open'));
    this.#openSub = null;
  }

  #positionSub(key) {
    const sub = this.#subPanels[key];
    const cat = this.#catEls[key];
    if (!sub || !cat) return;
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
