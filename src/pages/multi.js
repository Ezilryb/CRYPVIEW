// ============================================================
//  src/pages/multi.js — CrypView V3.1
//  Moteur générique multi-graphiques (N panneaux).
//  v3.1 : Ajout Market Screener
//
//  Corrections V3.5.1 :
//    - BUG CRITIQUE : this.#setActive = (fn) est illégal en JS
//      (méthode privée non-réassignable → TypeError).
//      Remplacé par this.#_objectTreeCallback = null (champ privé).
//    - #bindObjectTree : utilise #_objectTreeCallback au lieu de
//      tenter de réassigner #setActive.
//    - #bindMTFDrawingSync : REMPLACE (pas wrap) drawing.onItemsChange
//      pour éviter l'empilement à chaque appel de #saveState().
//    - Ajout raccourci clavier W pour les Workspaces.
//    - #bindObjectTree : wrappe indicators.onStateChange par instance
//      une seule fois, proprement.
// ============================================================

import { LightweightCharts } from '../utils/lw.js';
import { BINANCE, TF_TO_MS, RENDER_THROTTLE_MS, IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions, CHART_THEMES, THEME } from '../config.js';
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
import { AlertManagerV2 }    from '../features/AlertManagerV2.js';
import { AlertBuilderModal } from '../components/AlertBuilderModal.js';
import { AlertCenterModal }  from '../components/AlertCenterModal.js';
import { ScreenerModal }     from '../components/ScreenerModal.js';
import { ExportModal }       from '../components/ExportModal.js';
import { ProfileManager }    from '../features/ProfileManager.js';
import { ProfileModal }      from '../components/ProfileModal.js';
import { calcRSI, calcMACD } from '../indicators/oscillators.js';
import { showToast }         from '../utils/toast.js';
import { fmtPrice }          from '../utils/format.js';
import { SettingsModal }     from '../components/SettingsModal.js';
import { mountSharedModals } from '../utils/templates.js';
import { applyTheme }         from '../utils/theme.js';
import { applyRTL }           from '../utils/rtl.js';
import { ChartSync }          from '../utils/ChartSync.js';
import { RecentSymbols }      from '../utils/RecentSymbols.js';
import { CommandPalette }     from '../components/CommandPalette.js';
import { ObjectTreePanel }    from '../components/ObjectTreePanel.js';
import { WorkspaceManager }   from '../features/WorkspaceManager.js';
import { WorkspaceModal }     from '../components/WorkspaceModal.js';
import { ChartLiquidations }  from '../chart/ChartLiquidations.js';
import { ExchangeAggregator } from '../api/ExchangeAggregator.js';
import { ExchangePremiumBar } from '../components/ExchangePremiumBar.js';
import { mountSkipLink }      from '../utils/a11y.js';
import { initI18n }           from '../i18n/i18n.js';
import { applyDOMTranslations } from '../utils/i18n-dom.js';
import { getIndMeta } from '../utils/indMeta.js';

const symBase = sym => sym.replace(/usdt$/i, '').toUpperCase();
const $ = id => document.getElementById(id);

// ── AlertManager — singleton commun à tous les panneaux ──────
const alertManager = new AlertManagerV2();


// ══════════════════════════════════════════════════════════════
//  MultiChartView
// ══════════════════════════════════════════════════════════════

export class MultiChartView {
  #instances = [];
  #allSymbols = [];
  #activeIdx  = 0;
  #config;

  #chartSync     = null;
  #recentSymbols = new RecentSymbols();
  #cmdPalette    = null;

  #header;
  #ctxMenu;
  #indModal;
  #alertModal     = null;
  #alertListModal = null;
  #settingsModal  = null;
  #screenerModal  = null;
  #exportModal    = null;
  #profileManager = null;
  #profileModal   = null;

  // ── V3.5 — Workspace Manager + Object Tree ───────────────
  #workspaceManager = null;
  #workspaceModal   = null;
  #exchAggregator = null;
  #exchBar        = null;
  #objectTree       = null;

  // ── FIX : callback pour notifier l'ObjectTree lors du
  //    changement de panneau actif (remplace la tentative
  //    illégale de réassigner la méthode privée #setActive).
  #_objectTreeCallback = null;

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
    await initI18n();
    applyDOMTranslations();

    // Synchronise la direction RTL/LTR si une locale est déjà persistée
    const storedLocale = localStorage.getItem('crypview_locale');
    if (storedLocale) applyRTL(storedLocale);
    const hideNav = [];
    if (!this.#config.navLinks?.multi2) hideNav.push('ctx-multi2');
    if (!this.#config.navLinks?.multi4) hideNav.push('ctx-multi4');
    if (!this.#config.navLinks?.single) hideNav.push('ctx-back-single');
    mountSharedModals({ hide: hideNav });
    mountSkipLink('main-content');

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

    this.#chartSync = new ChartSync();
    this.#rebuildChartSync();
    this.#buildSyncToolbar();
    this.#initCommandPalette();

    // ── V3.5 : Object Tree ───────────────────────────────────
    this.#objectTree = new ObjectTreePanel();
    this.#bindObjectTree();

    // ── V3.5 : Workspace Manager ─────────────────────────────
    this.#workspaceManager = new WorkspaceManager();
    this.#workspaceModal   = new WorkspaceModal(this.#workspaceManager, {
      getCurrentState: () => this.#captureWorkspaceState(),
      onApply: (ws) => this.#applyWorkspace(ws),
    });
    this.#addWorkspaceButton();

    // ── V3.5 : MTF Drawing Sync ──────────────────────────────
    this.#bindMTFDrawingSync();

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
    this.#alertModal     = new AlertBuilderModal();
    this.#alertListModal = new AlertCenterModal(alertManager);
    this.#exportModal    = new ExportModal();

    this.#screenerModal = new ScreenerModal({
      onSelect: (sym) => {
        this.#activeInst.sym = sym;
        this.#activeInst.reconnect(this.#allSymbols);
      },
    });

    this.#profileManager = new ProfileManager();
    this.#profileModal   = new ProfileModal(this.#profileManager, {
      getCurrentState: () => ({
        indicators: this.#activeInst?.indicators?.getActiveKeys() ?? [],
        tf:         this.#activeInst?.tf ?? null,
      }),
      onApply: ({ indicators: keys, tf }) => {
        const inst = this.#activeInst;
        if (!inst)  return;
        inst.removeAllIndicators();
        for (const key of keys) inst.addIndicator(key);
        if (tf && tf !== inst.tf) {
          inst.tf = tf;
          inst.timeframeBar?.setValue(tf);
          inst.reconnect([]);
        }
      },
    });

    this.#ctxMenu = new ContextMenu(
      document.getElementById('multi-grid'),
      {
        onOpenIndModal: () => {
          this.#indModal.open();
        },
        onRemoveAllInd: () => {
          this.#activeInst.removeAllIndicators();
          this.#indModal.render();
        },
        onSetTool:       tool => this.#activeInst.setDrawingTool(tool),
        onClearDrawings: ()   => this.#activeInst.clearDrawings(),
        onNavigate:      href => { window.location.href = href; },
        onOpenSettingsModal: () => this.#settingsModal?.open(),
        onManageAlerts: () => this.#alertListModal?.open(),
        onOpenScreener: () => this.#screenerModal?.open(),
        onOpenProfiles: () => this.#profileModal?.open(),
        onOpenWorkspaces: () => this.#workspaceModal?.open(),

        onOpenExport: () => {
          const inst = this.#activeInst;
          if (!inst) return;
          this.#exportModal?.open({
            symbol:     inst.sym,
            tf:         inst.tf,
            indicators: inst.indicators?.getActiveKeys() ?? [],
            candles:    inst.candles,
            container:  document.getElementById(`chart-inner-${inst.idx}`)?.parentElement
                        ?? document.getElementById(`panel-${inst.idx}`),
          });
        },

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

          const cfg = await this.#alertModal.open(inst.sym, {
            price,
            pctChange24h: inst.lastPctChange24h ?? null,
            rsi:          inst.alertIndicatorCache?.rsi ?? null,
            macd:         inst.alertIndicatorCache?.macd ?? null,
            candles:      inst.candles,
          });
          if (!cfg) return;
          alertManager.add(cfg);
        },
      }
    );

    this.#indModal = new IndicatorModal({
      getActiveKeys: () => this.#activeInst?.indicators?.getActiveKeys() ?? [],

      onAdd: key => {
        this.#activeInst.addIndicator(key);
        this.#indModal.render();
      },
      onRemove: key => {
        this.#activeInst.removeIndicator(key);
        this.#indModal.render();
      },
      onRemoveAll: () => {
        this.#activeInst.removeAllIndicators();
        this.#indModal.render();
      },
    });

    this.#settingsModal = new SettingsModal({
      onThemeChange: (theme) => applyTheme(theme),
    });

    document.addEventListener('click', () => {
      this.#instances.forEach(inst => inst.timeframeBar?.close());
    });

    this.#header.setBackHref(`page.html?sym=${this.#instances[0].sym}`);

    alertManager.onAlertsChange = () => {
      this.#exchAggregator = new ExchangeAggregator();
      this.#exchBar        = new ExchangePremiumBar();
      this.#exchBar.mount();
      this.#exchAggregator.start(this.#instances[0].sym);
      this.#exchAggregator.stop();
      this.#instances.forEach(inst => inst.syncAlertPriceLines());
      this.#alertListModal?.refresh();
    };
  }

  get #activeInst() { return this.#instances[this.#activeIdx]; }

  // ── FIX : #setActive ne réassigne plus rien, appelle le callback OT ──
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
    // ── Multi-Exchange : suit le panneau actif ────────────────
    this.#exchAggregator?.start(inst.sym);
    this.#exchBar?.update?.(new Map()); // reset immédiat avant nouvelle donnée
    // ─────────────────────────────────────────────────────────
    this.#_objectTreeCallback?.();
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

    this.#rebuildChartSync();
    // FIX : #bindMTFDrawingSync REMPLACE (pas wrap) → idempotent, pas d'empilement
    this.#bindMTFDrawingSync();
  }

  // ── ChartSync ──────────────────────────────────────────────

  #rebuildChartSync() {
    if (!this.#chartSync) return;
    this.#chartSync.destroy();
    this.#chartSync = new ChartSync();

    const crossBtn = document.getElementById('sync-crosshair-btn');
    const zoomBtn  = document.getElementById('sync-zoom-btn');
    const crossOn  = crossBtn ? crossBtn.dataset.on !== 'false' : true;
    const zoomOn   = zoomBtn  ? zoomBtn.dataset.on  !== 'false' : true;

    this.#chartSync.setCrosshair(crossOn);
    this.#chartSync.setZoom(zoomOn);

    for (const inst of this.#instances) {
      if (inst.chart && inst.cSeries) {
        this.#chartSync.add({ chart: inst.chart, cSeries: inst.cSeries });
      }
    }
  }

  #buildSyncToolbar() {
    if (document.getElementById('sync-toolbar')) return;

    const bar = document.createElement('div');
    bar.id = 'sync-toolbar';
    bar.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:4px 12px;
      background:var(--panel);border-bottom:1px solid var(--border);
      flex-shrink:0;font-size:10px;
    `;

    const makeBtn = (id, label, title) => {
      const btn = document.createElement('button');
      btn.id          = id;
      btn.dataset.on  = 'true';
      btn.title       = title;
      btn.style.cssText = `
        display:flex;align-items:center;gap:5px;
        padding:3px 10px;border-radius:4px;
        font-family:'Space Mono',monospace;font-size:9px;
        transition:all .15s;cursor:pointer;
        background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);
        color:var(--accent);letter-spacing:.4px;
      `;
      btn.textContent = label;

      const setActive = (on) => {
        btn.dataset.on = String(on);
        if (on) {
          btn.style.background  = 'rgba(0,255,136,.1)';
          btn.style.borderColor = 'rgba(0,255,136,.3)';
          btn.style.color       = 'var(--accent)';
        } else {
          btn.style.background  = 'transparent';
          btn.style.borderColor = 'var(--border)';
          btn.style.color       = 'var(--muted)';
        }
      };

      btn.addEventListener('click', () => {
        const nowOn = btn.dataset.on !== 'true';
        setActive(nowOn);
        if (id === 'sync-crosshair-btn') this.#chartSync.setCrosshair(nowOn);
        if (id === 'sync-zoom-btn')      this.#chartSync.setZoom(nowOn);
      });

      return btn;
    };

    const label = document.createElement('span');
    label.style.cssText = 'font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-right:2px;';
    label.textContent = 'Sync :';

    bar.append(
      label,
      makeBtn('sync-crosshair-btn', '🎯 Crosshair', 'Synchroniser le crosshair entre panneaux'),
      makeBtn('sync-zoom-btn',      '🔍 Zoom/Pan',  'Synchroniser le zoom et le pan'),
    );

    const hint = document.createElement('span');
    hint.style.cssText = 'margin-left:auto;font-size:9px;color:var(--muted);letter-spacing:.4px;';
    hint.innerHTML = 'Ctrl+K ou <kbd style="border:1px solid var(--border);padding:1px 5px;border-radius:3px;font-family:monospace">/</kbd> — recherche';
    bar.appendChild(hint);

    const grid = $('multi-grid');
    grid?.parentElement?.insertBefore(bar, grid);
  }

  #initCommandPalette() {
    this.#cmdPalette = new CommandPalette({
      symbols:        this.#allSymbols,
      recentSymbols:  this.#recentSymbols,
      getActiveKeys:  () => this.#activeInst?.indicators?.getActiveKeys() ?? [],
      getCurrentSym:  () => this.#activeInst?.sym ?? '',
      getCurrentTf:   () => this.#activeInst?.tf  ?? '',

      onSymbol: (sym) => {
        this.#recentSymbols.push(sym);
        this.#activeInst.sym = sym;
        this.#activeInst.reconnect(this.#allSymbols);
        this.#updateCompareLabel();
      },

      onTf: (tf) => {
        if (!this.#activeInst) return;
        this.#activeInst.tf = tf;
        this.#activeInst.timeframeBar?.setValue(tf);
        this.#activeInst.reconnect(this.#allSymbols);
        this.#updateCompareLabel();
      },

      onToggleInd: (key) => {
        const inst = this.#activeInst;
        if (!inst) return;
        inst.indicators?.isActive(key)
          ? inst.removeIndicator(key)
          : inst.addIndicator(key);
      },

      onAction: (id) => {
        switch (id) {
          case 'screener': this.#screenerModal?.open();                    break;
          case 'profiles': this.#profileModal?.open();                    break;
          case 'export':   this.#exportModal?.open({
            symbol:     this.#activeInst?.sym,
            tf:         this.#activeInst?.tf,
            indicators: this.#activeInst?.indicators?.getActiveKeys() ?? [],
            candles:    this.#activeInst?.candles ?? [],
            container:  $(`chart-inner-${this.#activeInst?.idx}`)?.parentElement,
          }); break;
          case 'settings': this.#settingsModal?.open();                   break;
          case 'multi2':   window.location.href = 'multi2.html';          break;
          case 'multi4':   window.location.href = 'multi4.html';          break;
          case 'single':   window.location.href = `page.html?sym=${this.#activeInst?.sym ?? 'btcusdt'}`; break;
        }
      },
    });
  }

  // ── V3.5 — MTF Drawing Sync (CORRIGÉ : REPLACE, pas WRAP) ───

  /**
   * FIX CRITIQUE : utilise l'assignation directe (pas de wrapping via prev?.())
   * pour éviter l'empilement à chaque appel de #saveState().
   * La fonction REMPLACE toujours proprement le handler précédent.
   */
  #bindMTFDrawingSync() {
    this.#instances.forEach(inst => {
      if (!inst.drawing) return;

      // REPLACE (pas wrap) : idempotent, appelable N fois sans effet secondaire
      inst.drawing.onItemsChange = () => {
        // 1. Propagation MTF : redessine les panneaux du même symbole
        const sym = inst.sym.toLowerCase();
        this.#instances
          .filter(other => other !== inst && other.sym.toLowerCase() === sym && other.drawing)
          .forEach(other => other.drawing.forceRedraw());

        // 2. Refresh ObjectTree si visible ET c'est le panneau actif
        if (this.#objectTree?.visible && this.#activeInst === inst) {
          this.#objectTree.refresh();
        }
      };
    });
  }

  // ── V3.5 — Object Tree (CORRIGÉ : pas de réassignation illégale) ─

  /**
   * FIX : ne tente plus de réassigner this.#setActive (méthode privée,
   * non-modifiable → TypeError). Utilise this.#_objectTreeCallback à la place.
   * Ce callback est appelé depuis #setActive() à chaque changement de panneau.
   */
  #bindObjectTree() {
    const tree = this.#objectTree;
    if (!tree) return;

    // Helper : lie le tree au panneau actif
    const bindActive = () => {
      const inst = this.#activeInst;
      if (!inst) return;
      tree.bind(inst.drawing, inst.indicators, {
        onRemoveIndicator: (key) => inst.removeIndicator(key),
      });
    };

    // Callback appelé depuis #setActive() — syntaxe légale (champ privé)
    this.#_objectTreeCallback = () => {
      if (tree.visible) bindActive();
    };

    // Wrapper indicators.onStateChange par instance (une seule fois ici)
    // pour rafraîchir l'OT quand un indicateur est ajouté/retiré
    this.#instances.forEach(inst => {
      if (!inst.indicators) return;
      const prev = inst.indicators.onStateChange;
      inst.indicators.onStateChange = (key, active) => {
        prev?.(key, active);
        if (tree.visible && this.#activeInst === inst) {
          tree.refresh();
        }
      };
    });

    // Bouton toolbar
    const toolbar = document.getElementById('sync-toolbar');
    if (!toolbar) return;

    // Évite les doublons si #bindObjectTree() est rappelé
    if (document.getElementById('obj-tree-toggle-btn')) return;

    const objBtn = document.createElement('button');
    objBtn.id    = 'obj-tree-toggle-btn';
    objBtn.title = 'Gestionnaire d\'objets (O)';
    objBtn.style.cssText = `
      display:flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:4px;
      font-family:'Space Mono',monospace;font-size:9px;
      transition:all .15s;cursor:pointer;
      background:transparent;border:1px solid var(--border);
      color:var(--muted);letter-spacing:.4px;
    `;
    objBtn.textContent = '📋 Objets';

    const updateBtnStyle = (isOn) => {
      objBtn.style.background  = isOn ? 'rgba(0,255,136,.1)' : 'transparent';
      objBtn.style.borderColor = isOn ? 'rgba(0,255,136,.3)' : 'var(--border)';
      objBtn.style.color       = isOn ? 'var(--accent)' : 'var(--muted)';
    };

    objBtn.addEventListener('click', () => {
      const isOn = tree.toggle();
      updateBtnStyle(isOn);
      if (isOn) bindActive();
    });

    toolbar.insertBefore(objBtn, toolbar.querySelector('span[style*="margin-left:auto"]'));
  }

  // ── V3.5 — Workspace ─────────────────────────────────────────

  #captureWorkspaceState() {
    const crossBtn = document.getElementById('sync-crosshair-btn');
    const zoomBtn  = document.getElementById('sync-zoom-btn');
    return {
      layout:        this.#config.count === 4 ? 'multi4' : this.#config.count === 2 ? 'multi2' : 'single',
      panels:        this.#instances.map(inst => ({
        sym:        inst.sym,
        tf:         inst.tf,
        indicators: inst.indicators?.getActiveKeys() ?? [],
      })),
      syncCrosshair: crossBtn?.dataset.on !== 'false',
      syncZoom:      zoomBtn?.dataset.on  !== 'false',
    };
  }

  async #applyWorkspace(ws) {
    const currentLayout = this.#config.count === 4 ? 'multi4' : this.#config.count === 2 ? 'multi2' : 'single';
    if (ws.layout !== currentLayout) {
      const dest = ws.layout === 'multi4' ? 'multi4.html'
                 : ws.layout === 'multi2' ? 'multi2.html'
                 : 'page.html';
      localStorage.setItem('crypview_pending_workspace', JSON.stringify(ws));
      window.location.href = `${dest}?sym=${ws.panels[0]?.sym ?? 'btcusdt'}`;
      return;
    }

    const panelCount = Math.min(ws.panels.length, this.#instances.length);
    for (let i = 0; i < panelCount; i++) {
      const inst   = this.#instances[i];
      const panel  = ws.panels[i];
      const changed = inst.sym !== panel.sym || inst.tf !== panel.tf;

      if (changed) {
        inst.sym = panel.sym;
        inst.tf  = panel.tf;
        inst.timeframeBar?.setValue(panel.tf);
      }

      inst.removeAllIndicators();
      if (changed) await inst.reconnect(this.#allSymbols);
      for (const key of (panel.indicators ?? [])) inst.addIndicator(key);
    }

    const crossBtn = document.getElementById('sync-crosshair-btn');
    const zoomBtn  = document.getElementById('sync-zoom-btn');
    if (crossBtn) { crossBtn.dataset.on = String(ws.syncCrosshair); this.#chartSync?.setCrosshair(ws.syncCrosshair); }
    if (zoomBtn)  { zoomBtn.dataset.on  = String(ws.syncZoom);      this.#chartSync?.setZoom(ws.syncZoom); }

    this.#updateCompareLabel();
    this.#saveState();
    this.#bindMTFDrawingSync();
  }

  #addWorkspaceButton() {
    const toolbar = document.getElementById('sync-toolbar');
    if (!toolbar) return;
    if (document.getElementById('ws-toolbar-btn')) return;

    const btn = document.createElement('button');
    btn.id    = 'ws-toolbar-btn';
    btn.title = 'Espaces de travail (W)';
    btn.style.cssText = `
      display:flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:4px;
      font-family:'Space Mono',monospace;font-size:9px;
      transition:all .15s;cursor:pointer;
      background:transparent;border:1px solid var(--border);
      color:var(--muted);letter-spacing:.4px;
    `;
    btn.textContent = '🗂 Workspaces';

    btn.addEventListener('click', () => this.#workspaceModal?.open());
    btn.addEventListener('mouseenter', () => {
      btn.style.background  = 'rgba(247,201,72,.08)';
      btn.style.borderColor = 'rgba(247,201,72,.3)';
      btn.style.color       = 'var(--yellow)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background  = 'transparent';
      btn.style.borderColor = 'var(--border)';
      btn.style.color       = 'var(--muted)';
    });

    toolbar.insertBefore(btn, toolbar.querySelector('span[style*="margin-left:auto"]'));

    // Restauration workspace en attente (navigation inter-layouts)
    const pending = localStorage.getItem('crypview_pending_workspace');
    if (pending) {
      localStorage.removeItem('crypview_pending_workspace');
      try {
        const ws = JSON.parse(pending);
        setTimeout(() => this.#applyWorkspace(ws), 800);
      } catch (_) {}
    }
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

  // ── Raccourcis clavier (ajout de W pour Workspaces) ──────────

  #bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ([...document.querySelectorAll('.modal-overlay')]
        .some(el => el.style.display === 'block')) return;

      const inst = this.#activeInst;

      switch (e.key) {
        case 'i':
        case 'I':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.#indModal.open();
          }
          break;

        case 's':
        case 'S':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.#screenerModal?.open();
          }
          break;

        // FIX : ajout du raccourci W pour les Workspaces
        case 'w':
        case 'W':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.#workspaceModal?.open();
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

        // Indicateurs rapides (Shift + lettre)
        case 'R': if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inst?.indicators?.isActive('rsi')  ? inst.removeIndicator('rsi')  : inst?.addIndicator('rsi'); }  break;
        case 'M': if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inst?.indicators?.isActive('macd') ? inst.removeIndicator('macd') : inst?.addIndicator('macd'); } break;
        case 'B': if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inst?.indicators?.isActive('bb')   ? inst.removeIndicator('bb')   : inst?.addIndicator('bb'); }   break;
        case 'V': if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inst?.indicators?.isActive('vwap') ? inst.removeIndicator('vwap') : inst?.addIndicator('vwap'); } break;
        case 'F': if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); inst?.indicators?.isActive('fp')   ? inst.removeIndicator('fp')   : inst?.addIndicator('fp'); }   break;
      }
    });
  }

  #cycleActiveTf() {
    const inst = this.#activeInst;
    if (!inst) return;
    const idx  = ALL_TF.findIndex(t => t.tf === inst.tf);
    const next = ALL_TF[(idx + 1) % ALL_TF.length].tf;
    inst.timeframeBar?.setValue(next);
    inst.tf = next;
    inst.reconnect(this.#allSymbols);
    this.#ctxMenu.setChartLabel(`${next.toUpperCase()} — ${symBase(inst.sym)}/USDT`);
  }

  // ── Gestion visibilité ────────────────────────────────────

  #bindVisibility() {
    let bgState = null;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') {
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
      this.#exchAggregator?.stop();
      this.#exchBar?.destroy();
      this.#objectTree?.destroy();
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

  liquidations = null;
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

  alertIndicatorCache = { rsi: null, macd: null };
  lastPctChange24h    = null;

  #lastPrice = null;
  #open24    = null;
  #themeHandler = null;

  #onActiveChange;
  #onNeedSave;
  #onCtxMenu;
  #stateKey;
  #drawKey;
  #alertManager;

  #alertPriceLines = new Map();

  _initialIndicators = [];

  constructor({ idx, sym, tf, stateKey, drawKey, alertManager, onActiveChange, onNeedSave, onCtxMenu }) {
    this.idx             = idx;
    this.sym             = sym;
    this.tf              = tf;
    this.#stateKey       = stateKey;
    this.#drawKey        = drawKey;
    this.#alertManager   = alertManager;
    this.#onActiveChange = onActiveChange;
    this.#onNeedSave     = onNeedSave;
    this.#onCtxMenu      = onCtxMenu;
  }

  async start(allSymbols) {
    this.#initChart();
    this.#initComponents(allSymbols);
    this.#bindContextMenu();
    this.#bindDrawingAlerts();
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
    this.candles    = [];
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
    this.liquidations?.destroy();
    this.liquidations = null;
    this.#resizeObs?.disconnect();
    try { this.chart?.remove(); } catch (_) {}
    this.chart   = null;
    this.cSeries = null;
    this.vSeries = null;
  }

  addIndicator(key) {
    if (!this.indicators) return;
    this.indicators.add(key, this.candles, this.#makeHooks());
    this.#updateIndBar();
    this.#onNeedSave();
  }

  removeIndicator(key) {
    if (!this.indicators) return;
    this.indicators.remove(key, this.#makeHooks());
    this.#updateIndBar();
    this.#onNeedSave();
  }

  removeAllIndicators() {
    if (!this.indicators) return;
    this.indicators.removeAll(this.#makeHooks());
    this.#updateIndBar();
    this.#onNeedSave();
  }

  setDrawingTool(tool) { this.drawing?.setTool(tool); }
  clearDrawings()      { this.drawing?.clear(); }

  // ── PriceLines alertes ────────────────────────────────────

  syncAlertPriceLines() {
    if (!this.cSeries) return;

    const sym       = this.sym.toUpperCase();
    const active    = this.#alertManager.getActiveForSymbol(sym);
    const activeIds = new Set(active.map(a => a.id));

    for (const [id, line] of this.#alertPriceLines) {
      if (!activeIds.has(id)) {
        try { this.cSeries.removePriceLine(line); } catch (_) {}
        this.#alertPriceLines.delete(id);
      }
    }

    for (const alert of active) {
      if (this.#alertPriceLines.has(alert.id)) continue;
      const priceCond = alert.conditions.find(c =>
        c.type === 'price_above' || c.type === 'price_below'
      );
      if (!priceCond?.value) continue;
      try {
        const line = this.cSeries.createPriceLine({
          price:            priceCond.value,
          color:            '#ff9900',
          lineWidth:        1,
          lineStyle:        2,
          axisLabelVisible: true,
          title:            alert.name ? `🔔 ${alert.name}` : '🔔',
        });
        this.#alertPriceLines.set(alert.id, line);
      } catch (_) {}
    }
  }

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
      upColor:         COLORS.GREEN,
      downColor:       COLORS.RED,
      borderUpColor:   COLORS.GREEN,
      borderDownColor: COLORS.RED,
      wickUpColor:     COLORS.GREEN_MID,
      wickDownColor:   COLORS.RED_MID,
    });
    this.vSeries = this.chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
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
    const i         = this.idx;
    const container = $(`panel-${i}`);
    const chartsCol = $(`chart-inner-${i}`)?.parentElement ?? container;

    this.indicators = new ChartIndicators(
      this.chart,
      this.cSeries,
      chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })  // ← getSymTf requis pour Futures
    );
    this.vp         = new ChartVolumeProfile(this.chart, this.cSeries, chartsCol, `vp-canvas-${this.idx}`);
    this.footprint  = new ChartFootprint(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf }),
      `fp-canvas-${this.idx}`
    );
    this.orderflow  = new ChartOrderflow(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf }),
      `of-canvas-${this.idx}`
    );

    // Clé sym-based pour le MTF Drawing Sync automatique
    this.drawing = new ChartDrawing(
      this.chart, this.cSeries,
      $(`draw-canvas-${i}`),
      $(`draw-svg-${i}`),
      `${this.#drawKey}_${this.sym.toLowerCase()}`
    );

    this.liquidations = new ChartLiquidations();
    this.liquidations?.destroy();

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
    const i         = this.idx;
    const chartsCol = $(`chart-inner-${i}`)?.parentElement ?? $(`panel-${i}`);

    this.indicators?.destroy();
    this.indicators = new ChartIndicators(
      this.chart,
      this.cSeries,
      chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf })
    );
    this.vp         = new ChartVolumeProfile(this.chart, this.cSeries, chartsCol, `vp-canvas-${this.idx}`);
    this.footprint  = new ChartFootprint(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf }),
      `fp-canvas-${this.idx}`
    );
    this.orderflow  = new ChartOrderflow(
      this.chart, this.cSeries, chartsCol,
      () => ({ symbol: this.sym, timeframe: this.tf }),
      `of-canvas-${this.idx}`
    );
    this.indicators.onStateChange = () => {
      this.#updateIndBar();
      this.#onNeedSave();
    };

    // Clé sym-based pour le MTF Drawing Sync automatique
    this.drawing = new ChartDrawing(
      this.chart, this.cSeries,
      $(`draw-canvas-${this.idx}`),
      $(`draw-svg-${this.idx}`),
      `${this.#drawKey}_${this.sym.toLowerCase()}`
    );
  }

  #makeHooks() {
    const container = document.getElementById(`chart-inner-${this.idx}`)?.parentElement;
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
      // ── v3.7 : Liquidation Heatmap (était absent → liq cassé en multi) ──
      onActivateLiq: () => {
        if (container) {
          this.liquidations?.activate(this.chart, this.cSeries, container, this.sym);
        }
      },
      onDeactivateLiq: () => this.liquidations?.deactivate(),
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
      this.#clearAlertPriceLines();
      if (this.liquidations?.isActive()) {
        this.liquidations.setSymbol(this.sym);
      }
      this.syncAlertPriceLines();
    } catch (_) {
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
      if (this.#lastPrice && this.#open24) {
        this.lastPctChange24h = ((this.#lastPrice - this.#open24) / this.#open24) * 100;
      }
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

    const prev = this.candles.at(-2);
    this.#alertManager.check(this.sym, {
      price:        c.close,
      currentTime:  c.time,
      pctChange24h: this.lastPctChange24h,
      volumeRatio:  (prev && prev.volume > 0) ? c.volume / prev.volume : null,
      rsi:          this.alertIndicatorCache.rsi,
      macd:         this.alertIndicatorCache.macd,
      candles:      this.candles,
    });

    if (k.x) {
      this.indicators?.refresh(this.candles);
      if (this.candles.length > 20 && this.#alertManager.hasActive()) {
        try {
          const rsiArr  = calcRSI(this.candles, 14);
          const macdObj = calcMACD(this.candles);
          this.alertIndicatorCache = {
            rsi:  rsiArr.at(-1)?.value ?? null,
            macd: (macdObj.macd.length && macdObj.signal.length)
              ? { macd: macdObj.macd.at(-1).value, signal: macdObj.signal.at(-1).value }
              : null,
          };
        } catch (_) {}
      }
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
      const meta = getIndMeta(key);   // ← traduit via t()
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

  #bindDrawingAlerts() {
    const panel = $(`panel-${this.idx}`);
    if (!panel) return;

    panel.addEventListener('crypview:drawing:alert', async ({ detail }) => {
      const { drawing, direction } = detail;
      if (!drawing?.anchors || drawing.anchors.length < 2) return;

      const perm = await this.#alertManager.requestPermission();
      if (perm === 'denied') return;

      // Import dynamique pour éviter la duplication de la constante
      const { CONDITION_TYPE } = await import('../features/AlertManagerV2.js');
      const type  = direction === 'up'
        ? CONDITION_TYPE.TRENDLINE_CROSS_UP
        : CONDITION_TYPE.TRENDLINE_CROSS_DOWN;
      const arrow = direction === 'up' ? '↑' : '↓';

      this.#alertManager.add({
        symbol:      this.sym,
        name:        `Trendline ${arrow} croisement`,
        conditions:  [{ type, value: null, anchors: drawing.anchors }],
        logic:       'AND',
        repeat:      false,
        cooldownMin: 5,
      });
    });
  }

  #applyInitialIndicators() {
    if (!Array.isArray(this._initialIndicators)) return;
    this._initialIndicators.forEach(key => this.addIndicator(key));
    this._initialIndicators = [];
  }
}
