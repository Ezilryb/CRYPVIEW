// ============================================================
//  src/pages/page.js — CrypView V2.7.2
//  Orchestrateur de page.html (vue mono-chart).
// ============================================================

import { TradingChart }       from '../chart/ChartCore.js';
import { ChartIndicators }    from '../chart/ChartIndicators.js';
import { ChartVolumeProfile } from '../chart/ChartVolumeProfile.js';
import { ChartFootprint }     from '../chart/ChartFootprint.js';
import { ChartOrderflow }     from '../chart/ChartOrderflow.js';
import { ChartDrawing }       from '../chart/ChartDrawing.js';
import { ContextMenu }        from '../components/ContextMenu.js';
import { IndicatorModal }     from '../components/IndicatorModal.js';
import { Sidebar }            from '../components/Sidebar.js';
import { Header }             from '../components/Header.js';
import { SettingsModal }      from '../components/SettingsModal.js';
import { AlertPriceModal }    from '../components/AlertPriceModal.js';
import { AlertListModal }     from '../components/AlertListModal.js';
import { AlertManager }       from '../features/AlertManager.js';
import { SymbolSearch }       from '../components/SymbolSearch.js';       // ← manquant
import { TimeframeBar, ALL_TF } from '../components/TimeframeBar.js';     // ← manquant
import { loadAllSymbols }     from '../api/binance.rest.js';
import { IND_META, THEME }    from '../config.js';
import { fmtPrice }           from '../utils/format.js';
import { mountSharedModals }  from '../utils/templates.js';
import { $, setOverlay, hideOverlay } from '../utils/dom.js';
import { applyTheme, initTheme }      from '../utils/theme.js';           // ← déjà ajouté


const DEFAULT_TF = '1s';

let chart          = null;
let indicators     = null;
let vp             = null;
let footprint      = null;
let orderflow      = null;
let drawing        = null;
let ctxMenu        = null;
let indModal       = null;
let sidebar        = null;
let header         = null;
let settingsModal  = null;
let alertModal     = null;
let alertListModal = null;

// ── AlertManager — singleton partagé par toute la page ───────
const alertManager = new AlertManager('crypview_alerts_v1');

/** Map<alertId, PriceLine> */
const alertPriceLines = new Map();

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ══════════════════════════════════════════════════════════════
//  THÈME — sans bouton dédié
//  Le SettingsModal (clic-droit → Settings) est le seul point
//  d'entrée pour changer le thème.
// ══════════════════════════════════════════════════════════════

/**
 * Applique un thème, le persiste en localStorage et notifie les charts.
 * @param {'dark'|'light'} theme
 * @param {boolean} [animated=true]
 */


// ══════════════════════════════════════════════════════════════
//  PRICE LINES — visualisation des alertes sur le chart
// ══════════════════════════════════════════════════════════════

function syncAlertPriceLines() {
  if (!chart?.cSeries) return;

  const sym       = chart.symbol.toUpperCase();
  const active    = alertManager.getActiveForSymbol(sym);
  const activeIds = new Set(active.map(a => a.id));

  for (const [id, line] of alertPriceLines) {
    if (!activeIds.has(id)) {
      try { chart.cSeries.removePriceLine(line); } catch (_) {}
      alertPriceLines.delete(id);
    }
  }

  for (const alert of active) {
    if (!alertPriceLines.has(alert.id)) {
      try {
        const line = chart.cSeries.createPriceLine({
          price:            alert.price,
          color:            '#ff9900',
          lineWidth:        1,
          lineStyle:        2,
          axisLabelVisible: true,
          title:            '🔔',
        });
        alertPriceLines.set(alert.id, line);
      } catch (_) {}
    }
  }
}

function clearAllAlertPriceLines() {
  if (!chart?.cSeries) { alertPriceLines.clear(); return; }
  for (const [, line] of alertPriceLines) {
    try { chart.cSeries.removePriceLine(line); } catch (_) {}
  }
  alertPriceLines.clear();
}

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

async function boot() {
  mountSharedModals({ hide: ['ctx-back-single', 'ctx-chart-label'] });
  initTheme(); // ← util partagé

  header = new Header();
  header.setStatus('connecting');

  const symbols   = await loadAllSymbols();
  const container = $('chart-container');

  sidebar        = new Sidebar();
  alertModal     = new AlertPriceModal();
  alertListModal = new AlertListModal(alertManager);
  chart          = new TradingChart(container, 'btcusdt', DEFAULT_TF);

  // ── SymbolSearch (remplace mountSymbolSearch) ─────────────
  const symSearch = new SymbolSearch(
    $('sym-input'),
    $('sym-dropdown'),
    symbols,
    {
      onSelect: (sym) => {
        ctxMenu?.setSymbol(sym);
        connect(sym, chart.timeframe);
      },
    }
  );
  symSearch.setValue('btcusdt');

  // ── TimeframeBar (remplace mountTimeframeBar) ─────────────
  new TimeframeBar(
    $('tf-scroll-wrapper'),
    null,
    $('tf-scroll'),
    DEFAULT_TF,
    { onChange: (tf) => connect(chart.symbol, tf) }
  );

  // ── Drag-scroll sur la barre de timeframes ────────────────
  const tfStrip = $('tf-scroll');
  if (tfStrip) {
    let isDragging = false, startX = 0, scrollLeft = 0;
    tfStrip.addEventListener('mousedown', e => {
      isDragging = true;
      startX     = e.pageX - tfStrip.offsetLeft;
      scrollLeft = tfStrip.scrollLeft;
      tfStrip.style.cursor = 'grabbing';
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      tfStrip.style.cursor = 'grab';
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const x    = e.pageX - tfStrip.offsetLeft;
      const walk = (x - startX) * 1.5;
      tfStrip.scrollLeft = scrollLeft - walk;
    });
  }

  wireChartEvents(container);

  setOverlay('⏳ Chargement…', `BTC/USDT — ${DEFAULT_TF}`);
  await chart.start();

  initChartModules(container);
  initContextMenu(container);
  initIndicatorModal();

  settingsModal = new SettingsModal({
    onThemeChange: (theme) => applyTheme(theme), // ← util partagé
  });

  alertManager.onAlertsChange = () => {
    syncAlertPriceLines();
    alertListModal?.refresh();
  };
  syncAlertPriceLines();
  mountKeyboardShortcuts();
}

// ══════════════════════════════════════════════════════════════
//  RACCOURCIS CLAVIER
// ══════════════════════════════════════════════════════════════

function mountKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const modalOpen = [...document.querySelectorAll('.modal-overlay')]
      .some(el => el.style.display === 'block');
    if (modalOpen) return;

    switch (e.key) {
      case 'i':
      case 'I':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          indModal?.open();
        }
        break;

      case 'z':
      case 'Z':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          drawing?.undoLast();
        }
        break;

      case 't':
      case 'T':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          cycleTf();
        }
        break;
    }
  });
}

function cycleTf() {
  if (!chart) return;
  const idx  = ALL_TF.findIndex(t => t.tf === chart.timeframe);
  const next = ALL_TF[(idx + 1) % ALL_TF.length].tf;

  const strip = $('tf-scroll');
  strip?.querySelectorAll('.tf-btn').forEach(b => {
    const active = b.dataset.tf === next;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
    if (active) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  connect(chart.symbol, next);
}

// ══════════════════════════════════════════════════════════════
//  INIT MODULES CHART
// ══════════════════════════════════════════════════════════════

function initChartModules(container) {
  indicators = new ChartIndicators(chart.chart, chart.cSeries, $('charts-col'));
  indicators.onStateChange = (_key, _active) => {
    updateIndBar();
    if (indModal) indModal.render();
    if (ctxMenu)  ctxMenu.update(indicators.getActiveKeys(), drawing?.getCurrentTool() ?? null);
  };

  vp = new ChartVolumeProfile(chart.chart, chart.cSeries, container);

  footprint = new ChartFootprint(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  container.addEventListener('crypview:fp:redraw', () => {
    footprint.redraw(chart.candles);
  });

  orderflow = new ChartOrderflow(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  container.addEventListener('crypview:of:redraw', () => {
    orderflow.redraw(chart.candles);
  });

  drawing = new ChartDrawing(
    chart.chart, chart.cSeries,
    $('draw-canvas'), $('draw-svg')
  );
  container.addEventListener('crypview:tool:change', ({ detail }) => {
    ctxMenu?.update(indicators.getActiveKeys(), detail.tool);
  });
}

// ══════════════════════════════════════════════════════════════
//  HOOKS Footprint / Volume Profile / Orderflow
// ══════════════════════════════════════════════════════════════

function makeHooks() {
  return {
    onActivateFP:   () => { footprint.activate(chart.candles); },
    onDeactivateFP: () => { footprint.deactivate(); },
    onActivateVP:   () => { vp?.activate(chart.candles); },
    onDeactivateVP: () => { vp?.deactivate(); },
    onActivateOF: () => {
      const indState = indicators.getState('of');
      orderflow.activate(chart.candles, indState);
      orderflow.pushToChart(chart.candles, indState);
    },
    onDeactivateOF: () => { orderflow.deactivate(); },
  };
}

// ══════════════════════════════════════════════════════════════
//  RECONNEXION (changement symbole / TF)
// ══════════════════════════════════════════════════════════════

async function connect(symbol, timeframe) {
  setOverlay('⏳ Chargement…', `${symbol.toUpperCase()} / ${timeframe}`);
  header?.setStatus('offline', 'Connexion…');

  sidebar?.clearTrades();
  clearAllAlertPriceLines();

  const wasFP  = footprint?.isActive() ?? false;
  const wasOF  = orderflow?.isActive()  ?? false;
  const wasVP  = vp?.isActive()         ?? false;
  const wasInd = indicators?.getActiveKeys()
    .filter(k => k !== 'fp' && k !== 'of' && k !== 'vp') ?? [];

  const hooks = makeHooks();
  indicators?.removeAll(hooks);
  if (wasFP) footprint?.deactivate();
  if (wasOF) orderflow?.deactivate();

  await chart.changeTo(symbol, timeframe);

  for (const key of wasInd) indicators.add(key, chart.candles, hooks);
  if (wasVP) indicators.add('vp', chart.candles, hooks);
  if (wasFP) indicators.add('fp', chart.candles, hooks);
  if (wasOF) indicators.add('of', chart.candles, hooks);

  syncAlertPriceLines();
}

// ══════════════════════════════════════════════════════════════
//  ÉCOUTE DES CUSTOM EVENTS DE TradingChart
// ══════════════════════════════════════════════════════════════

function wireChartEvents(container) {
  container.addEventListener('crypview:status', ({ detail }) => {
    if (detail.state === 'live') {
      header?.setStatus('live');
      hideOverlay();
    } else if (detail.state === 'reconnecting') {
      header?.setStatus('reconnecting');
    } else if (detail.state === 'loading') {
      setOverlay('⏳ Chargement…', `${detail.symbol?.toUpperCase()} / ${detail.timeframe}`);
      header?.setStatus('offline', 'Connexion…');
    }
  });

  container.addEventListener('crypview:price:display', ({ detail }) => {
    const el = $('live-price');
    if (!el) return;
    el.textContent = detail.priceFormatted;
    el.style.color = detail.direction === 'up'   ? 'var(--green)'
                   : detail.direction === 'down' ? 'var(--red)'
                   : 'var(--text)';
    const pct = $('price-change');
    if (pct && detail.pctFormatted) {
      pct.textContent = detail.pctFormatted;
      pct.style.color = detail.pctChange >= 0 ? 'var(--green)' : 'var(--red)';
    }
  });

  container.addEventListener('crypview:price:update', ({ detail }) => {
    alertManager.check(chart.symbol, detail.price);
  });

  container.addEventListener('crypview:ticker:update', ({ detail }) => {
    sidebar?.updateStats(detail);
  });

  container.addEventListener('crypview:trade:new', ({ detail }) => {
    sidebar?.addTrade(detail);
  });

  container.addEventListener('crypview:candle:closed', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.redraw(detail.candles);
    if (orderflow?.isActive()) {
      orderflow.pushToChart(detail.candles, indicators.getState('of'));
    }
  });

  container.addEventListener('crypview:history:loaded', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.reconnect(detail.candles);
    if (orderflow?.isActive()) {
      orderflow.reconnect(detail.candles, indicators.getState('of'));
    }
    clearAllAlertPriceLines();
    syncAlertPriceLines();
  });

  // ── Bug #11 corrigé ────────────────────────────────────────
  // Émis par ChartCore.js après #resyncChartSeries() lorsque
  // MAX_CANDLES_IN_MEMORY bougies ont été évincées.
  container.addEventListener('crypview:series:resynced', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.redraw(detail.candles);
    if (orderflow?.isActive()) {
      orderflow.pushToChart(detail.candles, indicators.getState('of'));
    }
  });
}

// ══════════════════════════════════════════════════════════════
//  BARRE DES INDICATEURS ACTIFS (ind-bar)
// ══════════════════════════════════════════════════════════════

function updateIndBar() {
  const bar = $('ind-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const active = indicators.getActiveKeys();
  bar.classList.toggle('visible', active.length > 0);
  for (const key of active) {
    const meta = IND_META[key];
    if (!meta) continue;
    const tag = document.createElement('div');
    tag.className   = 'ind-tag';
    tag.dataset.key = key;
    tag.innerHTML   = `<div class="ind-dot" style="background:${meta.color}"></div>${meta.label}<span class="ind-remove" aria-label="Retirer ${meta.label}">✕</span>`;
    tag.querySelector('.ind-remove').addEventListener('click', () => {
      indicators.remove(key, makeHooks());
    });
    bar.appendChild(tag);
  }
}
// ══════════════════════════════════════════════════════════════
//  COMPOSANT : ContextMenu
// ══════════════════════════════════════════════════════════════

function initContextMenu(container) {
  ctxMenu = new ContextMenu(container, {
    onOpenIndModal:      () => indModal?.open(),
    onRemoveAllInd:      () => { indicators?.removeAll(makeHooks()); updateIndBar(); },
    onSetTool:           (tool) => drawing?.setTool(tool),
    onClearDrawings:     () => drawing?.clear(),
    onNavigate:          (href) => { window.location.href = href; },
    onOpenSettingsModal: () => settingsModal?.open(),

    onAddAlert: async (clientY) => {
      if (!chart?.cSeries) return;
      const rect  = container.getBoundingClientRect();
      const y     = clientY - rect.top;
      const price = chart.cSeries.coordinateToPrice(y);
      if (price == null || price <= 0) return;
      const perm = await alertManager.requestPermission();
      if (perm === 'denied') return;
      const lastClose = chart.candles.at(-1)?.close ?? price;
      const confirmed = await alertModal.open(chart.symbol, price, lastClose);
      if (confirmed === null) return;
      alertManager.add(chart.symbol, confirmed, lastClose);
    },

    onManageAlerts: () => alertListModal?.open(),
  });
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT : IndicatorModal
// ══════════════════════════════════════════════════════════════

function initIndicatorModal() {
  indModal = new IndicatorModal({
    getActiveKeys: () => indicators?.getActiveKeys() ?? [],

    onAdd: (key) => {
      indicators?.add(key, chart.candles, makeHooks());
      indModal.render();
    },
    onRemove: (key) => {
      indicators?.remove(key, makeHooks());
      indModal.render();
    },
    onRemoveAll: () => {
      indicators?.removeAll(makeHooks());
      indModal.render();
      updateIndBar();
    },
  });
}

// ══════════════════════════════════════════════════════════════
//  GESTION VISIBILITÉ — PAUSE RENDERING, WS CONSERVÉ
// ══════════════════════════════════════════════════════════════

let bgState = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    bgState = {
      fp: footprint?.isActive() ?? false,
      of: orderflow?.isActive() ?? false,
    };
    if (bgState.fp) footprint?.deactivate();
    if (bgState.of) orderflow?.deactivate();
    header?.setStatus('offline', 'Arrière-plan — 🔔 alertes actives');

  } else if (bgState !== null) {
    if (bgState.fp) footprint?.activate(chart.candles);
    if (bgState.of) {
      const indState = indicators?.getState('of');
      orderflow?.activate(chart.candles, indState);
      if (indState) orderflow?.pushToChart(chart.candles, indState);
    }
    bgState = null;
    header?.setStatus('live');
    syncAlertPriceLines();
  }
});

// ── Nettoyage complet à la fermeture de la page ───────────────
window.addEventListener('beforeunload', () => {
  // Purge les alertes déjà déclenchées pour que le localStorage
  // ne conserve que les alertes encore actives au prochain démarrage.
  alertManager.clearTriggered();
  clearAllAlertPriceLines();
  indicators?.destroy();
  vp?.deactivate();
  footprint?.destroy();
  orderflow?.destroy();
  settingsModal?.destroy();
  chart?.destroy();
});

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════

boot();