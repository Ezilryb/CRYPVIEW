// ============================================================
//  src/pages/multi.js — CrypView V2
//  Moteur générique multi-graphiques (N panneaux).
//  Instancié par multi2.js et multi4.js avec une config.
//
//  Config :
//    { count, defaults, stateKey, drawKey, badge, navLinks }
//
//  Règles cursorrules appliquées :
//    - cleanupWS() avant toute nouvelle connexion
//    - destroy() sur chaque instance (WS + ResizeObserver)
//    - Throttle FP/OF max 100ms
//    - Backoff exponentiel WS via WSManager (binance.ws.js)
//    - Toast sur toutes les erreurs
// ============================================================

import { BINANCE, TF_TO_MS, RENDER_THROTTLE_MS, IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions, CHART_THEMES } from '../config.js';
import { fetchKlines, parseKlines, loadAllSymbols } from '../api/binance.rest.js';
import { WSManager } from '../api/binance.ws.js';
import { ChartIndicators }   from '../chart/ChartIndicators.js';
import { ChartVolumeProfile } from '../chart/ChartVolumeProfile.js';
import { ChartFootprint }    from '../chart/ChartFootprint.js';
import { ChartOrderflow }    from '../chart/ChartOrderflow.js';
import { ChartDrawing }      from '../chart/ChartDrawing.js';
import { ContextMenu }       from '../components/ContextMenu.js';
import { IndicatorModal }    from '../components/IndicatorModal.js';
import { SymbolSearch }      from '../components/SymbolSearch.js';
import { TimeframeBar }      from '../components/TimeframeBar.js';
import { Header }            from '../components/Header.js';
import { showToast }         from '../utils/toast.js';
import { fmtPrice }          from '../utils/format.js';
import { ThemeToggle }       from '../components/ThemeToggle.js';
import { SettingsModal }     from '../components/SettingsModal.js';


// ── Helpers ──────────────────────────────────────────────────────
const symBase = sym => sym.replace(/usdt$/i, '').toUpperCase();
const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════════════════════
//  MultiChartView
// ══════════════════════════════════════════════════════════════

export class MultiChartView {
  /** @type {Array<MultiChartInstance>} */
  #instances = [];
  #allSymbols = [];
  #activeIdx  = 0;
  #config;

  // Composants partagés
  #header;
  #ctxMenu;
  #indModal;
  #themeToggle  = null;
  #settingsModal = null;

  /**
   * @param {{
   *   count:    number,
   *   defaults: Array<{tf:string, sym?:string}>,
   *   stateKey: string,
   *   drawKey:  string,
   *   badge:    string,
   *   navLinks: { single?:boolean, multi2?:boolean, multi4?:boolean }
   * }} config
   */
  constructor(config) {
    this.#config = config;
    const defaultSym = new URLSearchParams(location.search).get('sym') ?? 'btcusdt';

    this.#instances = config.defaults.map((cfg, idx) => new MultiChartInstance({
      idx,
      sym: cfg.sym ?? defaultSym,
      tf:  cfg.tf,
      stateKey: config.stateKey,
      drawKey:  config.drawKey,
      onActiveChange: (instIdx) => this.#setActive(instIdx),
      onNeedSave:     ()        => this.#saveState(),
      onCtxMenu:      (instIdx, e) => this.#openCtxMenu(instIdx, e),
    }));
  }

  // ── Démarrage ────────────────────────────────────────────

  async init() {
    this.#header = new Header();
    this.#header.setStatus('connecting');

    // Charge les symboles + restaure l'état sauvegardé
    this.#allSymbols = await loadAllSymbols();
    this.#loadState();

    // S'assure que 2 panneaux distincts n'ont pas le même symbole
    if (this.#instances.length >= 2) {
      const s0 = this.#instances[0].sym;
      for (let i = 1; i < this.#instances.length; i++) {
        if (this.#instances[i].sym === s0) {
          const alt = this.#allSymbols.find(s => s.symbol !== s0);
          if (alt) this.#instances[i].sym = alt.symbol;
        }
      }
    }

    // Construit la grille HTML
    this.#buildGrid();

    // Composants partagés (après buildGrid pour que les IDs existent)
    this.#buildSharedComponents();

    // Lance chaque panneau en parallèle
    await Promise.all(this.#instances.map(inst => inst.start(this.#allSymbols)));

    this.#updateCompareLabel();
    this.#saveState();

    // Pause automatique sur arrière-plan
    this.#bindVisibility();
  }

  // ── Grille HTML ──────────────────────────────────────────

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

  // ── Composants partagés ──────────────────────────────────

  #buildSharedComponents() {
    // Context menu
    this.#ctxMenu = new ContextMenu(
      document.getElementById('multi-grid'),
      {
        onOpenIndModal:  () => {
          this.#indModal.open();
          this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
        },
        onRemoveAllInd:  () => {
          this.#activeInst.removeAllIndicators();
          this.#indModal.render([]);
        },
        onSetTool:       tool => this.#activeInst.setDrawingTool(tool),
        onClearDrawings: ()   => this.#activeInst.clearDrawings(),
        onNavigate:      href => { window.location.href = href; },
        onOpenSettingsModal: () => this.#settingsModal?.open(),
      }
    );

    // Modal indicateurs : opère sur l'instance active
    this.#indModal = new IndicatorModal({
      onAdd:       key => {
        this.#activeInst.addIndicator(key);
        this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
      },
      onRemove:    key => {
        this.#activeInst.removeIndicator(key);
        this.#indModal.render(this.#activeInst.indicators?.getActiveKeys() ?? []);
      },
      onRemoveAll: () => {
        this.#activeInst.removeAllIndicators();
        this.#indModal.render([]);
      },
    });

    // Thème + Settings modal
    this.#themeToggle  = new ThemeToggle();
    this.#settingsModal = new SettingsModal({
      onThemeChange: (theme) => this.#themeToggle.setTheme(theme),
    });

    // Fermeture TF dropdowns au clic en dehors
    document.addEventListener('click', () => {
      this.#instances.forEach(inst => inst.timeframeBar?.close());
    });

    // Bouton retour
    this.#header.setBackHref(`page.html?sym=${this.#instances[0].sym}`);
  }

  // ── Active instance ──────────────────────────────────────

  get #activeInst() { return this.#instances[this.#activeIdx]; }

  #setActive(idx) {
    this.#activeIdx = idx;
    const inst = this.#instances[idx];
    this.#ctxMenu.setSymbol(inst.sym);
    this.#ctxMenu.setChartLabel(
      `${inst.tf.toUpperCase()} — ${symBase(inst.sym)}/USDT`
    );
    this.#ctxMenu.update(
      inst.indicators?.getActiveKeys() ?? [],
      inst.drawing?.getCurrentTool() ?? null
    );
    // Bouton retour suit l'instance active
    this.#header.setBackHref(`page.html?sym=${inst.sym}`);
  }

  #openCtxMenu(instIdx, e) {
    this.#setActive(instIdx);
    this.#ctxMenu.update(
      this.#activeInst.indicators?.getActiveKeys() ?? [],
      this.#activeInst.drawing?.getCurrentTool()  ?? null
    );
    // Force un réajustement via CustomEvent (ContextMenu écoute contextmenu sur #multi-grid)
    // On déclenche manuellement le positionnement
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

  // ── Compare label ────────────────────────────────────────

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

  // ── Persistence état ─────────────────────────────────────

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

  // ── Visibilité (onglet arrière-plan) ─────────────────────

  #bindVisibility() {
    let paused = false;
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
        paused = true;
        this.#instances.forEach(inst => inst.pause());
        this.#header.setStatus('offline', 'En pause (onglet en arrière-plan)');
      } else if (paused) {
        paused = false;
        this.#header.setStatus('connecting');
        await Promise.all(this.#instances.map(inst => inst.resume(this.#allSymbols)));
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

  // Modules chart
  /** @type {object|null} LightweightCharts instance */
  chart    = null;
  cSeries  = null;
  vSeries  = null;
  candles  = [];

  // Modules CrypView
  /** @type {ChartIndicators|null} */
  indicators = null;
  /** @type {ChartVolumeProfile|null} */
  vp         = null;
  /** @type {ChartFootprint|null} */
  footprint  = null;
  /** @type {ChartOrderflow|null} */
  orderflow  = null;
  /** @type {ChartDrawing|null} */
  drawing    = null;

  // Composants UI
  /** @type {SymbolSearch|null} */
  symbolSearch = null;
  /** @type {TimeframeBar|null} */
  timeframeBar = null;

  // WS
  #wsKline  = null;
  #wsTicker = null;
  #resizeObs = null;
  #lastPrice = null;
  #open24    = null;
  #themeHandler = null;

  // Callbacks vers MultiChartView
  #onActiveChange;
  #onNeedSave;
  #onCtxMenu;

  #stateKey;
  #drawKey;

  /** Indicateurs à activer après le premier chargement (restauration). */
  _initialIndicators = [];

  constructor({ idx, sym, tf, stateKey, drawKey, onActiveChange, onNeedSave, onCtxMenu }) {
    this.idx  = idx;
    this.sym  = sym;
    this.tf   = tf;
    this.#stateKey       = stateKey;
    this.#drawKey        = drawKey;
    this.#onActiveChange = onActiveChange;
    this.#onNeedSave     = onNeedSave;
    this.#onCtxMenu      = onCtxMenu;
  }

  // ── Cycle de vie ─────────────────────────────────────────

  async start(allSymbols) {
    this.#initChart();
    this.#initComponents(allSymbols);
    this.#bindContextMenu();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();
    this.#applyInitialIndicators();
  }

  /** Pause propre : coupe tous les WS sans détruire le DOM. */
  pause() {
    this.#wsKline?.destroy();
    this.#wsTicker?.destroy();
    this.#wsKline  = null;
    this.#wsTicker = null;
    this.footprint?.deactivate();
    this.orderflow?.deactivate();
  }

  /** Reprise après arrière-plan. */
  async resume(allSymbols) {
    this.candles = [];
    this.#lastPrice = null;
    this.#open24    = null;
    this.#initChart();
    this.#rebuildModules();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();
  }

  /** Reconnexion complète (changement sym/TF). */
  async reconnect(allSymbols) {
    // Mémorise les indicateurs actifs
    const wasInd = this.indicators?.getActiveKeys()
      .filter(k => k !== 'fp' && k !== 'of' && k !== 'vp') ?? [];
    const wasFP  = this.footprint?.isActive()  ?? false;
    const wasOF  = this.orderflow?.isActive()  ?? false;
    const wasVP  = this.vp?.isActive()         ?? false;

    this.pause();
    this.indicators?.destroy();
    this.vp?.deactivate();
    this.candles = [];
    this.#lastPrice = null;
    this.#open24    = null;

    this.#initChart();
    this.#rebuildModules();
    await this.#load();
    this.#connectKline();
    this.#connectTicker();

    // Restaure les indicateurs
    for (const key of wasInd) this.addIndicator(key);
    if (wasVP) this.addIndicator('vp');
    if (wasFP) this.addIndicator('fp');
    if (wasOF) this.addIndicator('of');

    this.#onNeedSave();
  }

  /** Libère toutes les ressources définitivement. */
  destroy() {
    document.removeEventListener('crypview:theme:change', this.#themeHandler);
    this.pause();
    this.indicators?.destroy();
    this.vp?.deactivate();
    this.#resizeObs?.disconnect();
    try { this.chart?.remove(); } catch (_) {}
    this.chart = null;
    this.cSeries = null;
    this.vSeries = null;
  }

  // ── Indicateurs ──────────────────────────────────────────

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

  // ── Drawing ──────────────────────────────────────────────

  setDrawingTool(tool) { this.drawing?.setTool(tool); }
  clearDrawings()      { this.drawing?.clear(); }

  // ── Interne — init ───────────────────────────────────────

  #initChart() {
    const el = $(`chart-inner-${this.idx}`);
    if (!el) return;
    if (this.chart) {
      try { this.chart.remove(); } catch (_) {}
    }
    const opts = baseChartOptions(el);
    // Surcharge : timeScale adapté au TF courant + marges de prix pour le volume
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

    // Applique le thème courant dès la création du chart
    const initTheme = localStorage.getItem('crypview-theme') ?? 'dark';
    this.chart.applyOptions(CHART_THEMES[initTheme] ?? CHART_THEMES.dark);

    // Écoute les changements de thème (re-lié car le chart est recréé à chaque #initChart)
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

    // Indicateurs
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
      `${this.#drawKey}_${i}`   // clé localStorage propre à CE panneau
    );

    // Callback indicateurs → sync indBar
    this.indicators.onStateChange = () => {
      this.#updateIndBar();
      this.#onNeedSave();
    };

    // SymbolSearch
    this.symbolSearch = new SymbolSearch(
      $(`input-${i}`),
      $(`dd-${i}`),
      allSymbols,
      { onSelect: sym => {
        this.sym = sym;
        this.reconnect(allSymbols);
      }}
    );
    this.symbolSearch.setValue(this.sym);

    // TimeframeBar
    this.timeframeBar = new TimeframeBar(
      $(`tfwrap-${i}`),
      $(`tf-label-${i}`),
      $(`tfgrid-${i}`),
      this.tf,
      { onChange: tf => {
        this.tf = tf;
        this.reconnect(allSymbols);
      }}
    );
  }

  #rebuildModules() {
    // Reconstruit uniquement les modules Chart (qui dépendent du LW chart détruit)
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
      onActivateFP:   () => {
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

  // ── Interne — données ────────────────────────────────────

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
    } catch (err) {
      showToast(`Historique ${symBase(this.sym)} indisponible`, 'error');
    }
  }

  #connectKline() {
    this.#wsKline?.destroy();
    this.#wsKline = new WSManager(
      `${BINANCE.WS_BASE}/${this.sym}@kline_${this.tf}`,
      msg => this.#onKline(msg),
      { label: `kline-${this.idx}` }
    );
  }

  #connectTicker() {
    this.#wsTicker?.destroy();
    this.#wsTicker = new WSManager(
      `${BINANCE.WS_BASE}/${this.sym}@ticker`,
      msg => {
        this.#open24 = parseFloat(msg.o);
        if (this.#lastPrice) this.#updatePrice(this.#lastPrice);
      },
      { label: `ticker-${this.idx}` }
    );
  }

  #onKline(msg) {
    const k = msg.k;
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

    if (k.x) {
      // Bougie fermée : refresh complet des indicateurs
      this.indicators?.refresh(this.candles);
      if (this.vp?.isActive())       this.vp.redraw(this.candles);
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

  // ── Indicateur bar ───────────────────────────────────────

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

  // ── Context menu (par panneau) ───────────────────────────

  #bindContextMenu() {
    const panel = $(`panel-${this.idx}`);
    if (!panel) return;
    panel.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.#onActiveChange(this.idx);
      this.#onCtxMenu(this.idx, e);
    });
  }

  // ── Restauration des indicateurs ─────────────────────────

  #applyInitialIndicators() {
    if (!Array.isArray(this._initialIndicators)) return;
    this._initialIndicators.forEach(key => this.addIndicator(key));
    this._initialIndicators = [];
  }
}
