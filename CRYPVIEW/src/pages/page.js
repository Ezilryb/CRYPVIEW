// ============================================================
//  src/pages/page.js — CrypView V2  (Phase 3 — FINAL)
//  Orchestrateur de page.html (vue mono-chart).
//
//  Ce fichier est le SEUL point d'entrée JS de la page.
//  Il instancie et connecte tous les modules :
//    TradingChart → ChartIndicators → ChartVolumeProfile
//                 → ChartFootprint  → ChartOrderflow
//                 → ChartDrawing
//                 → ContextMenu     → IndicatorModal
//
//  ZÉRO logique métier ici — uniquement du câblage.
// ============================================================

import { TradingChart }      from '../chart/ChartCore.js';
import { ChartIndicators }   from '../chart/ChartIndicators.js';
import { ChartVolumeProfile } from '../chart/ChartVolumeProfile.js';
import { ChartFootprint }    from '../chart/ChartFootprint.js';
import { ChartOrderflow }    from '../chart/ChartOrderflow.js';
import { ChartDrawing }      from '../chart/ChartDrawing.js';
import { ContextMenu }       from '../components/ContextMenu.js';
import { IndicatorModal }    from '../components/IndicatorModal.js';
import { loadAllSymbols }    from '../api/binance.rest.js';
import { IND_META }          from '../config.js';
import { fmtPrice, fmtVol }  from '../utils/format.js';
import { $, setWsStatus, setOverlay, hideOverlay } from '../utils/dom.js';
import { ThemeToggle }       from '../components/ThemeToggle.js';
import { SettingsModal }     from '../components/SettingsModal.js';

// ── Instances globales à cette page ──────────────────────────
let chart      = null;   // TradingChart
let indicators = null;   // ChartIndicators
let vp         = null;   // ChartVolumeProfile
let footprint  = null;   // ChartFootprint
let orderflow  = null;   // ChartOrderflow
let drawing    = null;   // ChartDrawing
let ctxMenu    = null;   // ContextMenu
let indModal   = null;   // IndicatorModal
let themeToggle = null;  // ThemeToggle
let settingsModal = null; // SettingsModal

// ══════════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════════

async function boot() {
  const symbols = await loadAllSymbols();
  const container = $('chart-container');

  // 1. Chart principal (TradingChart)
  chart = new TradingChart(container, 'btcusdt', '1s');

  // 2. Modules chart (nécessitent chart.chart et chart.cSeries)
  // On les initialise après le premier start() pour que chart.chart soit défini
  // → on les crée avant et on passe des getters

  // 3. Barre de symboles + timeframes
  mountSymbolSearch(symbols);
  mountTimeframeBar();

  // 4. Écoute des CustomEvents de TradingChart
  wireChartEvents(container);

  // 5. Start
  setOverlay('⏳ Chargement…', 'BTC/USDT — 1s');
  await chart.start();
  $('sym-input').value = 'BTC/USDT';

  // 6. Modules chart (maintenant que chart.chart est dispo)
  initChartModules(container);

  // 7. Composants UI
  initContextMenu(container);
  initIndicatorModal();

  settingsModal = new SettingsModal({
    onThemeChange: (theme) => themeToggle.setTheme(theme),
  });
}

// ══════════════════════════════════════════════════════════════
//  INIT MODULES CHART
// ══════════════════════════════════════════════════════════════

function initChartModules(container) {
  const hooks = makeHooks();

  // ChartIndicators
  indicators = new ChartIndicators(chart.chart, chart.cSeries, $('charts-col'));
  indicators.onStateChange = (_key, _active) => {
    updateIndBar();
    if (indModal) indModal.render(indicators.getActiveKeys());
    if (ctxMenu)  ctxMenu.update(indicators.getActiveKeys(), drawing?.getCurrentTool() ?? null);
  };

  // ChartVolumeProfile
  vp = new ChartVolumeProfile(chart.chart, chart.cSeries, container);

  // ChartFootprint
  footprint = new ChartFootprint(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  // Redraw throttlé via CustomEvent émis par ChartFootprint
  container.addEventListener('crypview:fp:redraw', () => {
    footprint.redraw(chart.candles);
  });

  // ChartOrderflow
  orderflow = new ChartOrderflow(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  container.addEventListener('crypview:of:redraw', () => {
    orderflow.redraw(chart.candles);
  });

  // ChartDrawing
  drawing = new ChartDrawing(
    chart.chart, chart.cSeries,
    $('draw-canvas'), $('draw-svg')
  );
  // Sync état dessin → ctx-menu
  container.addEventListener('crypview:tool:change', ({ detail }) => {
    ctxMenu?.update(indicators.getActiveKeys(), detail.tool);
  });
}

// ══════════════════════════════════════════════════════════════
//  HOOKS Footprint / Orderflow (passés à ChartIndicators)
// ══════════════════════════════════════════════════════════════

function makeHooks() {
  return {
    onActivateFP: () => {
      footprint.activate(chart.candles);
    },
    onDeactivateFP: () => {
      footprint.deactivate();
    },
    onActivateOF: () => {
      const indState = indicators.getState('of');
      orderflow.activate(chart.candles, indState);
      orderflow.pushToChart(chart.candles, indState);
    },
    onDeactivateOF: () => {
      orderflow.deactivate();
    },
  };
}

// ══════════════════════════════════════════════════════════════
//  RECONNEXION (changement symbole / TF)
// ══════════════════════════════════════════════════════════════

async function connect(symbol, timeframe) {
  setOverlay('⏳ Chargement…', `${symbol.toUpperCase()} / ${timeframe}`);
  setWsStatus('offline', 'Connexion…');

  // Capture l'état avant de tout couper
  const wasFP  = footprint?.isActive() ?? false;
  const wasOF  = orderflow?.isActive()  ?? false;
  const wasInd = indicators?.getActiveKeys().filter(k => k !== 'fp' && k !== 'of') ?? [];

  const hooks = makeHooks();
  // Retire les indicateurs sans les détruire (chart reste le même)
  indicators?.removeAll(hooks);
  // Footprint / Orderflow : déconnexion WS sans destroy canvas
  if (wasFP) footprint?.deactivate();
  if (wasOF) orderflow?.deactivate();

  // Change de symbole/TF dans TradingChart (chart LW inchangé)
  if (symbol !== chart.symbol)       await chart.changeSymbol(symbol);
  if (timeframe !== chart.timeframe) await chart.changeTimeframe(timeframe);

  // Restaure les indicateurs
  for (const key of wasInd) indicators.add(key, chart.candles, hooks);
  if (wasFP) indicators.add('fp', chart.candles, hooks);
  if (wasOF) indicators.add('of', chart.candles, hooks);
}

// ══════════════════════════════════════════════════════════════
//  ÉCOUTE DES CUSTOM EVENTS DE TradingChart
// ══════════════════════════════════════════════════════════════

function wireChartEvents(container) {
  container.addEventListener('crypview:status', ({ detail }) => {
    if (detail.state === 'live') { setWsStatus('live'); hideOverlay(); }
    else if (detail.state === 'reconnecting') setWsStatus('reconnecting');
    else if (detail.state === 'loading') {
      setOverlay('⏳ Chargement…', `${detail.symbol?.toUpperCase()} / ${detail.timeframe}`);
      setWsStatus('offline', 'Connexion…');
    }
  });

  container.addEventListener('crypview:price:display', ({ detail }) => {
    const el = $('live-price');
    if (!el) return;
    el.textContent = detail.priceFormatted;
    el.style.color = detail.direction === 'up' ? 'var(--green)' : detail.direction === 'down' ? 'var(--red)' : 'var(--text)';
    const pct = $('price-change');
    if (pct && detail.pctFormatted) {
      pct.textContent = detail.pctFormatted;
      pct.style.color = detail.pctChange >= 0 ? 'var(--green)' : 'var(--red)';
    }
  });

  container.addEventListener('crypview:ticker:update', ({ detail }) => {
    const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
    set('s-open', fmtPrice(detail.open24));
    set('s-high', fmtPrice(detail.high24));
    set('s-low',  fmtPrice(detail.low24));
    set('s-vol',  fmtVol(detail.vol24));
    set('s-tr',   parseInt(detail.trades24).toLocaleString('fr-FR'));
  });

  container.addEventListener('crypview:trade:new', ({ detail }) => {
    const list = $('trades');
    if (!list) return;
    const row = document.createElement('div');
    row.className = `trade-row ${detail.isBuy ? 'buy' : 'sell'}`;
    row.innerHTML = `<span class="t-price">${fmtPrice(detail.price)}</span><span class="t-qty">${detail.qty.toFixed(4)}</span><span class="t-time">${detail.timeFormatted}</span>`;
    list.prepend(row);
    while (list.children.length > 100) list.removeChild(list.lastChild);
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
    tag.className    = 'ind-tag';
    tag.dataset.key  = key;
    tag.innerHTML    = `<div class="ind-dot" style="background:${meta.color}"></div>${meta.label}<span class="ind-remove" aria-label="Retirer ${meta.label}">✕</span>`;
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
      ? symbols.filter(s => s.base.startsWith(q) || s.symbol.replace('usdt','').toUpperCase().startsWith(q)).slice(0,30)
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

  function select(sym) {
    const found    = symbols.find(x => x.symbol === sym);
    input.value    = found ? `${found.base}/${found.quote}` : sym.toUpperCase();
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

  input.addEventListener('input',  e => render(e.target.value));
  input.addEventListener('focus',  e => { if (e.target.value) render(e.target.value); });
  input.addEventListener('blur',   () => setTimeout(() => dropdown.classList.remove('open'), 150));
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
  const STEP = 47;

  strip.addEventListener('wheel', e => { e.preventDefault(); strip.scrollLeft += e.deltaY > 0 ? STEP : -STEP; }, { passive: false });

  let drag = false, sx, ss;
  strip.addEventListener('mousedown', e => { drag = true; sx = e.pageX; ss = strip.scrollLeft; strip.style.cursor = 'grabbing'; });
  strip.addEventListener('mouseleave', () => { drag = false; strip.style.cursor = 'grab'; });
  strip.addEventListener('mouseup',    () => { drag = false; strip.style.cursor = 'grab'; });
  strip.addEventListener('mousemove',  e => { if (!drag) return; e.preventDefault(); strip.scrollLeft = ss - (e.pageX - sx); });

  strip.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      strip.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      connect(chart.symbol, btn.dataset.tf);
    });
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
//  GESTION VISIBILITÉ (pause onglet arrière-plan)
// ══════════════════════════════════════════════════════════════

/**
 * Libère les modules dépendants du chart (sans toucher à chart lui-même).
 * Nécessaire avant de recréer une instance TradingChart avec un nouveau
 * LightweightCharts — les anciens modules tiendraient des refs invalides.
 */
function destroyModules() {
  indicators?.destroy();
  vp?.deactivate();
  footprint?.destroy();
  orderflow?.destroy();
  themeToggle?.destroy();
  settingsModal?.destroy();
  settingsModal = null;
  // ChartDrawing garde uniquement des souscriptions sur l'ancien chart
  // (déjà détruit) — pas de méthode destroy() requise, GC suffisant.
  indicators = null;
  vp         = null;
  footprint  = null;
  orderflow  = null;
  drawing    = null;
  ctxMenu    = null;
  indModal   = null;
  themeToggle = null;
}

let autoPaused = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    autoPaused = true;
    // Capture les infos AVANT destroy (chart.symbol / timeframe perdus après)
    const sym = chart?.symbol    ?? 'btcusdt';
    const tf  = chart?.timeframe ?? '1s';
    // Sauvegarde pour la reprise — chart.symbol est effacé par destroy()
    document.getElementById('chart-container').dataset.sym = sym;
    document.getElementById('chart-container').dataset.tf  = tf;
    destroyModules();
    chart?.destroy();
    setWsStatus('offline', 'En pause (onglet en arrière-plan)');
  } else if (autoPaused) {
    autoPaused = false;
    const container = $('chart-container');
    const sym = container.dataset.sym ?? 'btcusdt';
    const tf  = container.dataset.tf  ?? '1s';
    chart = new TradingChart(container, sym, tf);
    wireChartEvents(container);
    initChartModules(container);
    chart.start();
  }
});

window.addEventListener('beforeunload', () => {
  destroyModules();
  chart?.destroy();
});

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════

if (typeof LightweightCharts !== 'undefined') {
  boot();
} else {
  document.querySelector('script[src*="lightweight-charts"]')?.addEventListener('load', boot);
}
