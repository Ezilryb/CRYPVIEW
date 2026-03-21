// ============================================================
//  src/pages/multi.js — CrypView V2.8
//  Moteur générique multi-graphiques (N panneaux).
//
//  v2.7.1 : Alertes de prix
//    - AlertManager partagé (singleton cross-panneaux)
//    - AlertPriceModal (saisie du prix cible)
//    - PriceLines par panneau filtrées par symbole
//    - WS conservé en arrière-plan pour déclencher les alertes
//    - Pause rendering (Footprint/Orderflow) uniquement
//
//  v2.8 : Raccourcis clavier
//    - I → modal indicateurs du panneau actif
//    - Ctrl+Z → défait le dernier tracé du panneau actif
//    - T → cycle timeframe du panneau actif
//    - Échap → annulé par ChartDrawing.js (pas dupliqué)
// ============================================================

import { LightweightCharts } from '../utils/lw.js';
import { BINANCE, TF_TO_MS, RENDER_THROTTLE_MS, IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions, CHART_THEMES } from '../config.js';
import { fetchKlines, parseKlines, loadAllSymbols } from '../api/binance.rest.js';
import { createKlineStream, createTickerStream } from '../api/binance.ws.js';
import { ChartIndicators }   from '../chart/ChartIndicators.js';
import { ChartVolumeProfile } from '../chart/ChartVolumeProfile.js';
import { ChartFootprint }    from '../chart/ChartFootprint.js';
import { ChartOrderflow }    from '../chart/ChartOrderflow.js';
import { ChartDrawing }      from '../chart/ChartDrawing.js';
import { ContextMenu }       from '../components/ContextMenu.js';
import { IndicatorModal }    from '../components/IndicatorModal.js';
import { SymbolSearch }      from '../components/SymbolSearch.js';
import { TimeframeBar, ALL_TF } from '../components/TimeframeBar.js';
import { Header }            from '../components/Header.js';
import { AlertManager }      from '../features/AlertManager.js';
import { AlertPriceModal }   from '../components/AlertPriceModal.js';
import { AlertListModal }    from '../components/AlertListModal.js';
import { showToast }         from '../utils/toast.js';
import { fmtPrice }          from '../utils/format.js';
import { ThemeToggle }       from '../components/ThemeToggle.js';
import { SettingsModal }     from '../components/SettingsModal.js';
import { mountSharedModals } from '../utils/templates.js';

const symBase = sym => sym.replace(/usdt$/i, '').toUpperCase();
const $ = id => document.getElementById(id);

// ── AlertManager — singleton commun à tous les panneaux ──────
// Les alertes sont cross-panneaux : une alerte BTCUSDT se déclenche
// quel que soit le panneau qui affiche BTCUSDT.
const alertManager = new AlertManager('crypview_alerts_v1');

// ══════════════════════════════════════════════════════════════
//  MultiChartView
// ══════════════════════════════════════════════════════════════

export class MultiChartView {
  #instances = [];
  #allSymbols = [];
  #activeIdx  = 0;
  #config;

  #header;
  #ctxMenu;
  #indModal;
  #alertModal    = null;
  #alertListModal = null;
  #themeToggle   = null;
  #settingsModal = null;

  constructor(config) {
    this.#config = config;
    const defaultSym = new URLSearchParams(location.search).get('sym') ?? 'btcusdt';

    this.#instances = config.defaults.map((cfg, idx) => new MultiChartInstance({
      idx,
      sym: cfg.sym ?? defaultSym,
      tf:  cfg.tf,
      stateKey:       config.stateKey,
      drawKey:        config.drawKey,
      alertManager,
      onActiveChange: (instIdx) => this.#setActive(instIdx),
      onNeedSave:     ()        => this.#saveState(),
      onCtxMenu:      (instIdx, e) => this.#openCtxMenu(instIdx, e),
    }));
  }

  async init() {
    mountSharedModals();

    this.#header = new Header();
    this.#header.setStatus('connecting');

    this.#allSymbols = await loadAllSymbols();
    this.#loadState();

    if (this.#instances.length >= 2) {
      const s0 = this.#instances[0].sym;
      for (let i = 1; i < this.#instances.length; i++) {
        if (this.#instances[i].sym === s0) {
          const alt = this.#allSymbols.find(s => s.symbol !== s0);
          if (alt) this.#instances[i].sym = alt.symbol;
        }
      }
    }

    this.#buildGrid();
    this.#buildSharedComponents();

    await Promise.all(this.#instances.map(inst => inst.start(this.#allSymbols)));

    this.#updateCompareLabel();
    this.#saveState();
    this.#bindVisibility();
    this.#bindKeyboardShortcuts();
  }

  #buildGrid() {
    const grid = $('multi-grid');
    if (!grid) return;
    grid.innerHTML = '';
    this.#instances.forEach(inst => {
      const panel = document.createElement('div');
      panel.className = 'chart-panel';
      panel.id        = `panel-${inst.idx}`;
      panel.setAttribute('aria-label', `Graphique ${inst.idx + 1}`);
      panel.innerHTML = this.#panelHTML(inst);
      grid.appendChild(panel);
    });
  }

  #panelHTML(inst) {
    const i = inst.idx;
    return `
      <div class="chart-panel-header">
        <div class="tf-btn-wrap" id="tfwrap-${i}" aria-label="Timeframe">
          <button class="tf-current-btn" id="tfbtn-${i}" aria-haspopup="listbox">
            <span id="tf-label-${i}">${inst.tf}</span>
            <span class="tf-arrow" aria-hidden="true">▾</span>
          </button>
          <div class="tf-dropdown" id="tfdrop-${i}" role="listbox" aria-label="Sélection du timeframe">
            <div class="tf-grid" id="tfgrid-${i}"></div>
          </div>
        </div>
        <div class="panel-search-wrap">
          <input class="panel-sym-input" id="input-${i}" type="text"
                 autocomplete="off" spellcheck="false"
                 placeholder="Changer de crypto…"
                 aria-label="Recherche de symbole pour le graphique ${i + 1}">
          <span class="panel-search-icon" aria-hidden="true">⌕</span>
          <div class="panel-dropdown" id="dd-${i}" role="listbox" aria-label="Résultats de recherche"></div>
        </div>
        <div class="panel-price-wrap" aria-live="polite">
          <span class="panel-live" id="price-${i}" aria-label="Prix actuel">—</span>
          <span class="panel-pct"  id="pct-${i}"></span>
        </div>
      </div>
      <div class="ind-bar" id="ind-bar-${i}" aria-label="Indicateurs actifs"></div>
      <div class="chart-area" style="position:relative">
        <div class="chart-area-inner" id="chart-inner-${i}"></div>
        <canvas id="fp-canvas-${i}"
                style="position:absolute;top:0;left:0;pointer-events:none;z-index:3;display:none;"
                aria-hidden="true"></canvas>
        <div id="fp-legend-${i}" class="fp-legend-panel" aria-hidden="true">
          <div><span class="fp-l-ask">▪ Ask</span> <span class="fp-l-bid">▪ Bid</span></div>
          <div><span class="fp-l-imb">★ Imb</span></div>
        </div>
        <div class="draw-canvas" id="draw-canvas-${i}" aria-hidden="true">
          <svg id="draw-svg-${i}"></svg>
        </div>
      </div>`;
  }

  #buildSharedComponents() {
    this.#alertModal    = new AlertPriceModal();
    this.#alertListModal = new AlertListModal(alertManager);

    this.#ctxMenu = new ContextMenu(
      document.getElementById('multi-grid'),
      {
        onOpenIndModal: () => {
          this.#indModal.open();
          this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
        },
        onRemoveAllInd: () => {
          this.#activeInst.removeAllIndicators();
          this.#indModal.render([]);
        },
        onSetTool:       tool => this.#activeInst.setDrawingTool(tool),
        onClearDrawings: ()   => this.#activeInst.clearDrawings(),
        onNavigate:      href => { window.location.href = href; },
        onOpenSettingsModal: () => this.#settingsModal?.open(),
        onManageAlerts: () => this.#alertListModal?.open(),

        // ── Alerte de prix avec modale de saisie ────────────
        onAddAlert: async (clientY) => {
          const inst = this.#activeInst;
          if (!inst?.cSeries) return;

          const panelEl = $(`panel-${inst.idx}`);
          const chartEl = $(`chart-inner-${inst.idx}`);
          const rect    = (chartEl ?? panelEl)?.getBoundingClientRect();
          if (!rect) return;

          const price = inst.cSeries.coordinateToPrice(clientY - rect.top);
          if (price == null || price <= 0) return;

          const perm = await alertManager.requestPermission();
          if (perm === 'denied') return;

          const lastClose = inst.candles.at(-1)?.close ?? price;
          const confirmed = await this.#alertModal.open(inst.sym, price, lastClose);
          if (confirmed === null) return;

          alertManager.add(inst.sym, confirmed, lastClose);
          // La price line est créée via onAlertsChange → inst.syncAlertPriceLines()
        },
      }
    );

    this.#indModal = new IndicatorModal({
      onAdd:    key => {
        this.#activeInst.addIndicator(key);
        this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
      },
      onRemove: key => {
        this.#activeInst.removeIndicator(key);
        this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
      },
      onRemoveAll: () => {
        this.#activeInst.removeAllIndicators();
        this.#indModal.render([]);
      },
    });

    this.#themeToggle  = new ThemeToggle();
    this.#settingsModal = new SettingsModal({
      onThemeChange: (theme) => this.#themeToggle.setTheme(theme),
    });

    // Fermeture des dropdowns TF au clic global
    document.addEventListener('click', () => {
      this.#instances.forEach(inst => inst.timeframeBar?.close());
    });

    this.#header.setBackHref(`page.html?sym=${this.#instances[0].sym}`);

    // Hook global AlertManager → met à jour les price lines de TOUS les panneaux
    alertManager.onAlertsChange = () => {
      this.#instances.forEach(inst => inst.syncAlertPriceLines());
      this.#alertListModal?.refresh();
    };
  }

  get #activeInst() { return this.#instances[this.#activeIdx]; }

  #setActive(idx) {
    this.#activeIdx = idx;
    const inst = this.#instances[idx];
    this.#ctxMenu.setSymbol(inst.sym);
    this.#ctxMenu.setChartLabel(`${inst.tf.toUpperCase()} — ${symBase(inst.sym)}/USDT`);
    this.#ctxMenu.update(
      inst.indicators?.getActiveKeys() ?? [],
      inst.drawing?.getCurrentTool() ?? null
    );
    this.#header.setBackHref(`page.html?sym=${inst.sym}`);
  }

  #openCtxMenu(instIdx, e) {
    this.#setActive(instIdx);
    this.#ctxMenu.update(
      this.#activeInst.indicators?.getActiveKeys() ?? [],
      this.#activeInst.drawing?.getCurrentTool()  ?? null
    );
    const root = $('ctx-menu');
    if (!root) return;
    root.classList.remove('visible');
    const mw = root.offsetWidth  ?? 220;
    const mh = root.offsetHeight ?? 120;
    const x  = Math.min(e.clientX, window.innerWidth  - mw - 8);
    const y  = Math.min(e.clientY, window.innerHeight - mh - 8);
    root.style.left = `${x}px`;
    root.style.top  = `${y}px`;
    root.classList.add('visible');
  }

  #updateCompareLabel() {
    const cl = $('compare-label');
    if (!cl) return;
    cl.innerHTML = '';
    this.#instances.forEach((inst, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className   = 'vs-sep';
        sep.textContent = this.#instances.length === 2 ? 'VS' : '·';
        cl.appendChild(sep);
      }
      const pair = document.createElement('div');
      pair.className = 'cmp-pair';
      pair.innerHTML  = `<span class="cmp-sym">${symBase(inst.sym)}</span>
                         <span class="cmp-tf">${inst.tf}</span>`;
      cl.appendChild(pair);
    });
    const syms = this.#instances.map(i => symBase(i.sym)).join(' · ');
    document.title = `Multi ${this.#config.count} — ${syms} — CrypView`;
    this.#header.setBackHref(`page.html?sym=${this.#instances[0].sym}`);
  }

  #saveState() {
    try {
      const payload = {
        instances: this.#instances.map(inst => ({
          idx:        inst.idx,
          sym:        inst.sym,
          tf:         inst.tf,
          indicators: inst.indicators?.getActiveKeys() ?? [],
        })),
      };
      localStorage.setItem(this.#config.stateKey, JSON.stringify(payload));
    } catch (_) {}
  }

  #loadState() {
    try {
      const raw = localStorage.getItem(this.#config.stateKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.instances)) return;
      parsed.instances.forEach(s => {
        const inst = this.#instances[s.idx];
        if (!inst) return;
        if (s.sym) inst.sym = s.sym;
        if (s.tf)  inst.tf  = s.tf;
        inst._initialIndicators = Array.isArray(s.indicators) ? s.indicators : [];
      });
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════════
  //  RACCOURCIS CLAVIER
  // ══════════════════════════════════════════════════════════

  /**
   * Enregistre les raccourcis clavier globaux pour la vue multi-graphiques.
   * Routés vers le panneau actif (this.#activeInst).
   *
   *   I       → ouvre la modal indicateurs du panneau actif
   *   Ctrl+Z  → défait le dernier tracé du panneau actif
   *   T       → cycle vers le TF suivant du panneau actif
   *   Échap   → géré par ChartDrawing.js (non dupliqué)
   */
  #bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignorer si le focus est dans un champ de saisie
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ignorer si une modale est ouverte
      if ([...document.querySelectorAll('.modal-overlay')]
        .some(el => el.style.display === 'block')) return;

      const inst = this.#activeInst;

      switch (e.key) {
        case 'i':
        case 'I':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.#indModal.open();
            this.#indModal.render(inst?.indicators?.getActiveKeys() ?? []);
          }
          break;

        case 'z':
        case 'Z':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            inst?.drawing?.undoLast();
          }
          break;

        case 't':
        case 'T':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.#cycleActiveTf();
          }
          break;
      }
    });
  }

  /**
   * Passe le panneau actif au timeframe suivant dans ALL_TF (cycle infini).
   * Met à jour le TimeframeBar de ce panneau et déclenche une reconnexion.
   */
  #cycleActiveTf() {
    const inst = this.#activeInst;
    if (!inst) return;
    const idx  = ALL_TF.findIndex(t => t.tf === inst.tf);
    const next = ALL_TF[(idx + 1) % ALL_TF.length].tf;
    // Synchronise l'affichage du bouton TF sans déclencher onChange
    inst.timeframeBar?.setValue(next);
    // Met à jour l'état et reconnecte
    inst.tf = next;
    inst.reconnect(this.#allSymbols);
    // Met à jour le label du ctx-menu
    this.#ctxMenu.setChartLabel(`${next.toUpperCase()} — ${symBase(inst.sym)}/USDT`);
  }

  // ── Gestion visibilité — WS conservé en arrière-plan ───────
  #bindVisibility() {
    /** État des modules canvas mis en pause lors du passage en arrière-plan. */
    let bgState = null;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        // Sauvegarde de l'état des modules canvas et pause
        bgState = this.#instances.map(inst => ({
          fp: inst.footprint?.isActive() ?? false,
          of: inst.orderflow?.isActive() ?? false,
        }));
        this.#instances.forEach((inst, i) => {
          if (bgState[i].fp) inst.footprint?.deactivate();
          if (bgState[i].of) inst.orderflow?.deactivate();
        });
        this.#header.setStatus('offline', 'Arrière-plan — 🔔 alertes actives');

      } else if (bgState !== null) {
        // Restauration des modules canvas (WS jamais coupé)
        this.#instances.forEach((inst, i) => {
          if (bgState[i].fp) inst.footprint?.activate(inst.candles);
          if (bgState[i].of) {
            const indState = inst.indicators?.getState('of');
            inst.orderflow?.activate(inst.candles, indState);
            if (indState) inst.orderflow?.pushToChart(inst.candles, indState);
          }
          inst.syncAlertPriceLines();
        });
        bgState = null;
        this.#header.setStatus('live');
      }
    });

    window.addEventListener('beforeunload', () => {
      this.#instances.forEach(inst => inst.destroy());
      this.#settingsModal?.destroy();
      this.#settingsModal = null;
      this.#themeToggle   = null;
    });
  }
}

// ══════════════════════════════════════════════════════════════
//  MultiChartInstance — un seul panneau dans la grille
// ══════════════════════════════════════════════════════════════

class MultiChartInstance {
  idx;
  sym;
  tf;

  chart    = null;
  cSeries  = null;
  vSeries  = null;
  candles  = [];

  indicators = null;
  vp         = null;
  footprint  = null;
  orderflow  = null;
  drawing    = null;

  symbolSearch = null;
  timeframeBar = null;

  #wsKline  = null;
  #wsTicker = null;
  #resizeObs = null;
  #lastPrice = null;
  #open24    = null;
  #themeHandler = null;

  #onActiveChange;
  #onNeedSave;
  #onCtxMenu;
  #stateKey;
  #drawKey;
  #alertManager;

  /** Map<alertId, PriceLine> spécifique à ce panneau */
  #alertPriceLines = new Map();

  _initialIndicators = [];

  constructor({ idx, sym, tf, stateKey, drawKey, alertManager, onActiveChange, onNeedSave, onCtxMenu }) {
    this.idx           = idx;
    this.sym           = sym;
    this.tf            = tf;
    this.#stateKey     = stateKey;
    this.#drawKey      = drawKey;
    this.#alertManager = alertManager;
    this.#onActiveChange = onActiveChange;
    this.#onNeedSave     = onNeedSave;
    this.#onCtxMenu      = onCtxMenu;
  }

  async start(allSymbols) {
    this.#initChart();
    this.#initComponents(allSymbols);
    this.#bindContextMenu();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();
    this.#applyInitialIndicators();
    this.syncAlertPriceLines();
  }

  pause() {
    this.#wsKline?.destroy();
    this.#wsTicker?.destroy();
    this.#wsKline  = null;
    this.#wsTicker = null;
    this.footprint?.deactivate();
    this.orderflow?.deactivate();
  }

  async resume(allSymbols) {
    this.candles = [];
    this.#lastPrice = null;
    this.#open24    = null;
    this.#initChart();
    this.#rebuildModules();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();
    this.syncAlertPriceLines();
  }

  async reconnect(allSymbols) {
    const wasInd = this.indicators?.getActiveKeys()
      .filter(k => k !== 'fp' && k !== 'of' && k !== 'vp') ?? [];
    const wasFP  = this.footprint?.isActive()  ?? false;
    const wasOF  = this.orderflow?.isActive()  ?? false;
    const wasVP  = this.vp?.isActive()         ?? false;

    this.pause();
    this.indicators?.destroy();
    this.vp?.deactivate();
    this.#clearAlertPriceLines();
    this.candles = [];
    this.#lastPrice = null;
    this.#open24    = null;

    this.#initChart();
    this.#rebuildModules();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();

    for (const key of wasInd) this.addIndicator(key);
    if (wasVP) this.addIndicator('vp');
    if (wasFP) this.addIndicator('fp');
    if (wasOF) this.addIndicator('of');

    this.syncAlertPriceLines();
    this.#onNeedSave();
  }

  destroy() {
    document.removeEventListener('crypview:theme:change', this.#themeHandler);
    this.pause();
    this.indicators?.destroy();
    this.vp?.deactivate();
    this.#clearAlertPriceLines();
    this.#resizeObs?.disconnect();
    try { this.chart?.remove(); } catch (_) {}
    this.chart = null;
    this.cSeries = null;
    this.vSeries = null;
  }

  addIndicator(key) {
    if (!this.indicators) return;
    const hooks = this.#makeHooks();
    this.indicators.add(key, this.candles, hooks);
    this.#updateIndBar();
    this.#onNeedSave();
  }

  removeIndicator(key) {
    if (!this.indicators) return;
    const hooks = this.#makeHooks();
    this.indicators.remove(key, hooks);
    this.#updateIndBar();
    this.#onNeedSave();
  }

  removeAllIndicators() {
    if (!this.indicators) return;
    const hooks = this.#makeHooks();
    this.indicators.removeAll(hooks);
    this.#updateIndBar();
    this.#onNeedSave();
  }

  setDrawingTool(tool) { this.drawing?.setTool(tool); }
  clearDrawings()      { this.drawing?.clear(); }

  // ── PriceLines alertes — spécifiques au panneau ───────────

  /**
   * Synchronise les PriceLines avec les alertes actives pour le symbole
   * de CE panneau. Appelé par le hook alertManager.onAlertsChange.
   */
  syncAlertPriceLines() {
    if (!this.cSeries) return;

    const sym      = this.sym.toUpperCase();
    const active   = this.#alertManager.getActiveForSymbol(sym);
    const activeIds = new Set(active.map(a => a.id));

    // Supprime les lines devenues obsolètes
    for (const [id, line] of this.#alertPriceLines) {
      if (!activeIds.has(id)) {
        try { this.cSeries.removePriceLine(line); } catch (_) {}
        this.#alertPriceLines.delete(id);
      }
    }

    // Crée les lines manquantes
    for (const alert of active) {
      if (!this.#alertPriceLines.has(alert.id)) {
        try {
          const line = this.cSeries.createPriceLine({
            price:            alert.price,
            color:            '#ff9900',
            lineWidth:        1,
            lineStyle:        2, // LineStyle.Dashed
            axisLabelVisible: true,
            title:            '🔔',
          });
          this.#alertPriceLines.set(alert.id, line);
        } catch (_) {}
      }
    }
  }

  /** Supprime toutes les PriceLines de ce panneau. */
  #clearAlertPriceLines() {
    if (!this.cSeries) { this.#alertPriceLines.clear(); return; }
    for (const [, line] of this.#alertPriceLines) {
      try { this.cSeries.removePriceLine(line); } catch (_) {}
    }
    this.#alertPriceLines.clear();
  }

  // ── Chart init ────────────────────────────────────────────

  #initChart() {
    const el = $(`chart-inner-${this.idx}`);
    if (!el) return;
    if (this.chart) { try { this.chart.remove(); } catch (_) {} }
    const opts = baseChartOptions(el);
    opts.timeScale = { borderColor: COLORS.GRID, timeVisible: true, secondsVisible: this.tf === '1s' };
    opts.rightPriceScale.scaleMargins = { top: 0.08, bottom: 0.22 };

    this.chart   = LightweightCharts.createChart(el, opts);
    this.cSeries = this.chart.addCandlestickSeries({
      upColor:        COLORS.GREEN,
      downColor:      COLORS.RED,
      borderUpColor:  COLORS.GREEN,
      borderDownColor:COLORS.RED,
      wickUpColor:    COLORS.GREEN_MID,
      wickDownColor:  COLORS.RED_MID,
    });
    this.vSeries = this.chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    this.chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.83, bottom: 0 } });

    this.#resizeObs?.disconnect();
    this.#resizeObs = new ResizeObserver(() => {
      this.chart?.applyOptions({ width: el.clientWidth, height: el.clientHeight });
    });
    this.#resizeObs.observe(el);

    const initTheme = localStorage.getItem('crypview-theme') ?? 'dark';
    this.chart.applyOptions(CHART_THEMES[initTheme] ?? CHART_THEMES.dark);

    if (this.#themeHandler) {
      document.removeEventListener('crypview:theme:change', this.#themeHandler);
    }
    this.#themeHandler = ({ detail }) => {
      this.chart?.applyOptions(CHART_THEMES[detail.theme] ?? CHART_THEMES.dark);
    };
    document.addEventListener('crypview:theme:change', this.#themeHandler);
  }

  #initComponents(allSymbols) {
    const i = this.idx;
    const container = $(`panel-${i}`);
    const chartsCol = $(`chart-inner-${i}`)?.parentElement ?? container;

    this.indicators  = new ChartIndicators(this.chart, this.cSeries, chartsCol);
    this.vp          = new ChartVolumeProfile(this.chart, this.cSeries, chartsCol);
    this.footprint   = new ChartFootprint(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })
    );
    this.orderflow   = new ChartOrderflow(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })
    );
    this.drawing     = new ChartDrawing(
      this.chart, this.cSeries,
      $(`draw-canvas-${i}`),
      $(`draw-svg-${i}`),
      `${this.#drawKey}_${i}`
    );

    this.indicators.onStateChange = () => {
      this.#updateIndBar();
      this.#onNeedSave();
    };

    this.symbolSearch = new SymbolSearch(
      $(`input-${i}`),
      $(`dd-${i}`),
      allSymbols,
      { onSelect: sym => { this.sym = sym; this.reconnect(allSymbols); } }
    );
    this.symbolSearch.setValue(this.sym);

    this.timeframeBar = new TimeframeBar(
      $(`tfwrap-${i}`),
      $(`tf-label-${i}`),
      $(`tfgrid-${i}`),
      this.tf,
      { onChange: tf => { this.tf = tf; this.reconnect(allSymbols); } }
    );
  }

  #rebuildModules() {
    const i = this.idx;
    const chartsCol = $(`chart-inner-${i}`)?.parentElement ?? $(`panel-${i}`);

    this.indicators?.destroy();
    this.indicators = new ChartIndicators(this.chart, this.cSeries, chartsCol);
    this.vp         = new ChartVolumeProfile(this.chart, this.cSeries, chartsCol);
    this.footprint  = new ChartFootprint(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })
    );
    this.orderflow  = new ChartOrderflow(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })
    );
    this.indicators.onStateChange = () => {
      this.#updateIndBar();
      this.#onNeedSave();
    };
  }

  #makeHooks() {
    return {
      onActivateFP: () => {
        this.footprint.activate(this.candles);
        const legend = $(`fp-legend-${this.idx}`);
        if (legend) legend.classList.add('visible');
      },
      onDeactivateFP: () => {
        this.footprint.deactivate();
        const legend = $(`fp-legend-${this.idx}`);
        if (legend) legend.classList.remove('visible');
      },
      onActivateVP:   () => this.vp.activate(this.candles),
      onDeactivateVP: () => this.vp.deactivate(),
      onActivateOF:   (indState) => this.orderflow.activate(this.candles, indState),
      onDeactivateOF: () => this.orderflow.deactivate(),
    };
  }

  async #load() {
    try {
      const raw = await fetchKlines(this.sym, this.tf);
      this.candles = parseKlines(raw);
      if (!this.candles.length) return;
      this.cSeries.setData(this.candles.map(c => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      this.vSeries.setData(this.candles.map(c => ({
        time: c.time, value: c.volume,
        color: c.close >= c.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
      })));
      this.indicators?.refresh(this.candles);
      if (this.vp?.isActive()) this.vp.redraw(this.candles);
      // PriceLines recréées après setData (setData les efface)
      this.#clearAlertPriceLines();
      this.syncAlertPriceLines();
    } catch (err) {
      showToast(`Historique ${symBase(this.sym)} indisponible`, 'error');
    }
  }

  #connectKline() {
    this.#wsKline?.destroy();
    this.#wsKline = createKlineStream(this.sym, this.tf);
    this.#wsKline.onMessage = (msg) => this.#onKline(msg);
    this.#wsKline.onOpen    = () => {};
    this.#wsKline.connect();
  }

  #connectTicker() {
    this.#wsTicker?.destroy();
    this.#wsTicker = createTickerStream(this.sym);
    this.#wsTicker.onMessage = (msg) => {
      this.#open24 = parseFloat(msg.o);
      if (this.#lastPrice) this.#updatePrice(this.#lastPrice);
    };
    this.#wsTicker.connect();
  }

  #onKline(msg) {
    const k = msg.k;
    if (!k) return;
    const c = {
      time:   Math.floor(k.t / 1000),
      open:   +k.o, high:  +k.h,
      low:    +k.l, close: +k.c,
      volume: +k.v,
    };
    try { this.cSeries.update({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }); } catch (_) {}
    try { this.vSeries.update({ time: c.time, value: c.volume, color: c.close >= c.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA }); } catch (_) {}

    const isNew = !this.candles.length || this.candles[this.candles.length - 1].time !== c.time;
    if (isNew) {
      this.candles.push(c);
      if (this.candles.length > 800) this.candles.shift();
    } else {
      this.candles[this.candles.length - 1] = c;
    }

    // ── Vérification des alertes à chaque tick ────────────
    // Fonctionne même en arrière-plan car le WS reste actif
    this.#alertManager.check(this.sym, c.close);

    if (k.x) {
      this.indicators?.refresh(this.candles);
      if (this.vp?.isActive())        this.vp.redraw(this.candles);
      if (this.footprint?.isActive()) this.footprint.redraw(this.candles);
      if (this.orderflow?.isActive()) {
        this.orderflow.pushToChart(this.candles, this.indicators?.getState('of'));
      }
    } else if (this.vp?.isActive()) {
      this.vp.redraw(this.candles);
    }

    this.#updatePrice(c.close);
  }

  #updatePrice(price) {
    price = parseFloat(price);
    const liveEl = $(`price-${this.idx}`);
    const pctEl  = $(`pct-${this.idx}`);
    if (liveEl) {
      liveEl.style.color = this.#lastPrice !== null
        ? price > this.#lastPrice ? 'var(--green)'
        : price < this.#lastPrice ? 'var(--red)' : 'var(--text)'
        : 'var(--text)';
      liveEl.textContent = fmtPrice(price);
    }
    this.#lastPrice = price;
    if (this.#open24 && pctEl) {
      const pct = (price - this.#open24) / this.#open24 * 100;
      pctEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      pctEl.style.color = pct >= 0 ? 'var(--green)' : 'var(--red)';
    }
  }

  #updateIndBar() {
    const bar = $(`ind-bar-${this.idx}`);
    if (!bar) return;
    bar.innerHTML = '';
    const active = this.indicators?.getActiveKeys() ?? [];
    if (!active.length) { bar.classList.remove('visible'); return; }
    bar.classList.add('visible');
    const lbl = document.createElement('span');
    lbl.className   = 'ind-bar-label';
    lbl.textContent = `${this.tf.toUpperCase()} →`;
    bar.appendChild(lbl);
    active.forEach(key => {
      const meta = IND_META[key];
      if (!meta) return;
      const tag = document.createElement('div');
      tag.className = 'ind-tag';
      tag.innerHTML = `<div class="ind-dot" style="background:${meta.color}"></div>
                       ${meta.label}
                       <span class="ind-remove" aria-label="Retirer ${meta.label}">✕</span>`;
      tag.querySelector('.ind-remove').addEventListener('click', () => this.removeIndicator(key));
      bar.appendChild(tag);
    });
  }

  #bindContextMenu() {
    const panel = $(`panel-${this.idx}`);
    if (!panel) return;
    panel.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.#onActiveChange(this.idx);
      this.#onCtxMenu(this.idx, e);
    });
  }

  #applyInitialIndicators() {
    if (!Array.isArray(this._initialIndicators)) return;
    this._initialIndicators.forEach(key => this.addIndicator(key));
    this._initialIndicators = [];
  }
}
