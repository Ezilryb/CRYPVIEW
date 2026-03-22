// ============================================================
//  src/pages/page.js — CrypView V2.7.2
//  Orchestrateur de page.html (vue mono-chart).
//
//  v2.7   : AlertManager (alertes de prix + price lines)
//  v2.7.1 : AlertPriceModal (saisie du prix cible)
//  v2.7.2 : AlertListModal (gestion / suppression des alertes)
//  v2.8   : Raccourcis clavier (I, Ctrl+Z, T, Échap via ChartDrawing)
//
//  Correctifs appliqués :
//    - Bug 2 : ajout des hooks onActivateVP / onDeactivateVP dans makeHooks()
//              → Volume Profile désormais fonctionnel depuis l'IndicatorModal.
//    - Bug 3 : connect() utilise chart.changeTo() — un seul appel REST
//              quelle que soit la combinaison symbole/TF.
//              wasVP correctement capturé et restauré.
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
import { ThemeToggle }        from '../components/ThemeToggle.js';
import { SettingsModal }      from '../components/SettingsModal.js';
import { AlertPriceModal }    from '../components/AlertPriceModal.js';
import { AlertListModal }     from '../components/AlertListModal.js';
import { ALL_TF }             from '../components/TimeframeBar.js';
import { AlertManager }       from '../features/AlertManager.js';
import { loadAllSymbols }     from '../api/binance.rest.js';
import { IND_META }           from '../config.js';
import { fmtPrice }           from '../utils/format.js';
import { mountSharedModals }  from '../utils/templates.js';
import { $, setOverlay, hideOverlay } from '../utils/dom.js';

const DEFAULT_TF = '1s';

let chart           = null;
let indicators      = null;
let vp              = null;
let footprint       = null;
let orderflow       = null;
let drawing         = null;
let ctxMenu         = null;
let indModal        = null;
let sidebar         = null;
let header          = null;
let themeToggle     = null;
let settingsModal   = null;
let alertModal      = null;
let alertListModal  = null;

// ── AlertManager — singleton partagé par toute la page ───────
const alertManager = new AlertManager('crypview_alerts_v1');

/**
 * Map<alertId, PriceLine> — associations entre alertes actives et
 * les objets PriceLine LightweightCharts rendus sur le graphique.
 */
const alertPriceLines = new Map();

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ══════════════════════════════════════════════════════════════
//  PRICE LINES — visualisation des alertes sur le chart
// ══════════════════════════════════════════════════════════════

function syncAlertPriceLines() {
  if (!chart?.cSeries) return;

  const sym      = chart.symbol.toUpperCase();
  const active   = alertManager.getActiveForSymbol(sym);
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
  mountSharedModals();

  header = new Header();
  header.setStatus('connecting');

  const symbols   = await loadAllSymbols();
  const container = $('chart-container');

  sidebar           = new Sidebar();
  alertModal        = new AlertPriceModal();
  alertListModal    = new AlertListModal(alertManager);
  chart             = new TradingChart(container, 'btcusdt', DEFAULT_TF);

  mountSymbolSearch(symbols);
  mountTimeframeBar();
  wireChartEvents(container);

  setOverlay('⏳ Chargement…', `BTC/USDT — ${DEFAULT_TF}`);
  await chart.start();
  $('sym-input').value = 'BTC/USDT';

  initChartModules(container);
  initContextMenu(container);
  initIndicatorModal();

  settingsModal = new SettingsModal({
    onThemeChange: (theme) => themeToggle.setTheme(theme),
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
    if (indModal) indModal.render(indicators.getActiveKeys());
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
//
//  BUG 2 CORRIGÉ : ajout de onActivateVP / onDeactivateVP.
//  Sans ces deux hooks, le clic sur "Volume Profile" dans
//  l'IndicatorModal appelait hooks.onActivateVP?.() sur undefined
//  (résultat silencieux) — le VP ne s'affichait jamais.
// ══════════════════════════════════════════════════════════════

function makeHooks() {
  return {
    onActivateFP:   () => { footprint.activate(chart.candles); },
    onDeactivateFP: () => { footprint.deactivate(); },
    // BUG 2 CORRIGÉ : hooks VP désormais présents
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
//
//  BUG 3 CORRIGÉ : chart.changeTo() remplace l'enchaînement
//  changeSymbol() + changeTimeframe() qui générait 2 appels REST.
//  wasVP est maintenant capturé et restauré correctement.
// ══════════════════════════════════════════════════════════════

async function connect(symbol, timeframe) {
  setOverlay('⏳ Chargement…', `${symbol.toUpperCase()} / ${timeframe}`);
  header?.setStatus('offline', 'Connexion…');

  sidebar?.clearTrades();
  clearAllAlertPriceLines();

  // Capture de l'état courant AVANT démontage
  const wasFP  = footprint?.isActive() ?? false;
  const wasOF  = orderflow?.isActive()  ?? false;
  const wasVP  = vp?.isActive()         ?? false;   // BUG 2 : VP inclus
  const wasInd = indicators?.getActiveKeys()
    .filter(k => k !== 'fp' && k !== 'of' && k !== 'vp') ?? [];

  const hooks = makeHooks();
  indicators?.removeAll(hooks);
  if (wasFP) footprint?.deactivate();
  if (wasOF) orderflow?.deactivate();

  // BUG 3 CORRIGÉ : un seul appel REST via changeTo()
  // Avant : changeSymbol() → start() PUIS changeTimeframe() → #loadHistory()
  // Après : changeTo() → start() une seule fois
  await chart.changeTo(symbol, timeframe);

  // Restauration des indicateurs dans l'ordre correct
  for (const key of wasInd) indicators.add(key, chart.candles, hooks);
  if (wasVP) indicators.add('vp', chart.candles, hooks);   // BUG 2 : VP restauré
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
//  COMPOSANT : Recherche de symbole
// ══════════════════════════════════════════════════════════════

function mountSymbolSearch(symbols) {
  const input    = $('sym-input');
  const dropdown = $('sym-dropdown');
  if (!input || !dropdown) return;
  let focusIdx = -1;

  function render(query) {
    focusIdx = -1;
    const q  = query.trim().toUpperCase();
    const matches = q
      ? symbols.filter(s => s.base.startsWith(q) || s.symbol.replace('usdt','').toUpperCase().startsWith(q)).slice(0, 30)
      : [];
    if (!matches.length) {
      dropdown.innerHTML = q ? `<div class="sym-empty">Aucun résultat pour "${q}"</div>` : '';
      dropdown.classList.toggle('open', !!q);
      return;
    }
    dropdown.innerHTML = matches.map(s =>
      `<div class="sym-opt" data-sym="${s.symbol}"><span class="sym-base">${s.base}</span><span class="sym-quote">${s.quote}</span></div>`
    ).join('');
    dropdown.classList.add('open');
    dropdown.querySelectorAll('.sym-opt').forEach(el => {
      el.addEventListener('mousedown', e => { e.preventDefault(); select(el.dataset.sym); });
    });
  }

  const debouncedRender = debounce(render, 120);

  function select(sym) {
    const found = symbols.find(x => x.symbol === sym);
    input.value = found ? `${found.base}/${found.quote}` : sym.toUpperCase();
    dropdown.classList.remove('open');
    ctxMenu?.setSymbol(sym);
    connect(sym, chart.timeframe);
  }

  function moveFocus(dir) {
    const opts = [...dropdown.querySelectorAll('.sym-opt')];
    if (!opts.length) return;
    opts[focusIdx]?.classList.remove('focused');
    focusIdx = Math.max(0, Math.min(opts.length - 1, focusIdx + dir));
    opts[focusIdx].classList.add('focused');
    opts[focusIdx].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input',   e => debouncedRender(e.target.value));
  input.addEventListener('focus',   e => { if (e.target.value) render(e.target.value); });
  input.addEventListener('blur',    () => setTimeout(() => dropdown.classList.remove('open'), 150));
  input.addEventListener('keydown', e => {
    if      (e.key === 'ArrowDown')  { e.preventDefault(); moveFocus(1); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); moveFocus(-1); }
    else if (e.key === 'Enter') {
      const focused = dropdown.querySelector('.sym-opt.focused');
      if (focused) { select(focused.dataset.sym); }
      else {
        const q = input.value.trim().toUpperCase();
        const m = symbols.find(s => s.base === q || s.symbol === q.toLowerCase() + 'usdt');
        if (m) select(m.symbol);
      }
    }
    else if (e.key === 'Escape') { dropdown.classList.remove('open'); input.blur(); }
  });
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT : Barre de timeframes
// ══════════════════════════════════════════════════════════════

function mountTimeframeBar() {
  const strip = $('tf-scroll');
  if (!strip) return;

  ALL_TF.forEach(({ tf, label }) => {
    const btn = document.createElement('button');
    btn.className  = 'tf-btn';
    btn.dataset.tf = tf;
    btn.textContent = label;
    btn.setAttribute('aria-pressed', tf === DEFAULT_TF ? 'true' : 'false');
    if (tf === DEFAULT_TF) btn.classList.add('active');
    strip.appendChild(btn);
  });

  const STEP = 47;
  strip.addEventListener('wheel', e => {
    e.preventDefault();
    strip.scrollLeft += e.deltaY > 0 ? STEP : -STEP;
  }, { passive: false });

  let drag = false, sx, ss;
  strip.addEventListener('mousedown', e => { drag = true; sx = e.pageX; ss = strip.scrollLeft; strip.style.cursor = 'grabbing'; });
  strip.addEventListener('mouseleave', () => { drag = false; strip.style.cursor = 'grab'; });
  strip.addEventListener('mouseup',    () => { drag = false; strip.style.cursor = 'grab'; });
  strip.addEventListener('mousemove',  e => { if (!drag) return; e.preventDefault(); strip.scrollLeft = ss - (e.pageX - sx); });

  strip.addEventListener('click', e => {
    const btn = e.target.closest('.tf-btn');
    if (!btn) return;
    strip.querySelectorAll('.tf-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    connect(chart.symbol, btn.dataset.tf);
  });
}

// ══════════════════════════════════════════════════════════════
//  COMPOSANT : ContextMenu
// ══════════════════════════════════════════════════════════════

function initContextMenu(container) {
  themeToggle = new ThemeToggle();

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
    onAdd:       (key) => { indicators?.add(key, chart.candles, makeHooks()); indModal.render(indicators.getActiveKeys()); },
    onRemove:    (key) => { indicators?.remove(key, makeHooks()); indModal.render(indicators.getActiveKeys()); },
    onRemoveAll: ()    => { indicators?.removeAll(makeHooks()); indModal.render([]); updateIndBar(); },
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

window.addEventListener('beforeunload', () => {
  clearAllAlertPriceLines();
  indicators?.destroy();
  vp?.deactivate();
  footprint?.destroy();
  orderflow?.destroy();
  themeToggle?.destroy();
  settingsModal?.destroy();
  chart?.destroy();
});

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════

boot();
