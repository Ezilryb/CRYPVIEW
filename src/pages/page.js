// ============================================================
//  src/pages/page.js — CrypView V3.8
//  v3.8 : MarketSentimentWidget, NewsFeedModal,
//         FundamentalsModal, OrderBookModal
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
import { AlertBuilderModal }  from '../components/AlertBuilderModal.js';
import { AlertCenterModal }   from '../components/AlertCenterModal.js';
import { ScreenerModal }      from '../components/ScreenerModal.js';
import { ExportModal }        from '../components/ExportModal.js';
import { PaperTradingEngine }  from '../features/PaperTrading.js';
import { PaperTradingModal }   from '../components/PaperTradingModal.js';
import { PaperTradingOverlay } from '../chart/PaperTradingOverlay.js';
import { BacktestModal }      from '../components/BacktestModal.js';
import { ProfileManager }    from '../features/ProfileManager.js';
import { ProfileModal }      from '../components/ProfileModal.js';
import { AlertManagerV2 }     from '../features/AlertManagerV2.js';
import { calcRSI }            from '../indicators/oscillators.js';
import { calcMACD }           from '../indicators/oscillators.js';
import { SymbolSearch }       from '../components/SymbolSearch.js';
import { TimeframeBar, ALL_TF } from '../components/TimeframeBar.js';
import { loadAllSymbols }     from '../api/binance.rest.js';
import { IND_META, THEME }    from '../config.js';
import { fmtPrice }           from '../utils/format.js';
import { showToast }          from '../utils/toast.js';
import { mountSharedModals }  from '../utils/templates.js';
import { $, setOverlay, hideOverlay } from '../utils/dom.js';
import { applyTheme, initTheme }      from '../utils/theme.js';
import { applyRTL }                   from '../utils/rtl.js';
import { parseShareURL }              from '../features/ExportManager.js';
import { CommandPalette }             from '../components/CommandPalette.js';
import { RecentSymbols }              from '../utils/RecentSymbols.js';
import { mountSkipLink }              from '../utils/a11y.js';
import { initI18n, t }               from '../i18n/i18n.js';
import { applyDOMTranslations }      from '../utils/i18n-dom.js';
import { getIndMeta } from '../utils/indMeta.js';
import { reliabilityManager } from '../utils/reliabilityManager.js';
import { wsPool }             from '../api/WSPool.js';

// ── v3.7 — Multi-Exchange, Liquidation Heatmap, DEX ─────────
import { ChartLiquidations }  from '../chart/ChartLiquidations.js';
import { TradingChartDEX }    from '../chart/TradingChartDEX.js';
import { ExchangeAggregator } from '../api/ExchangeAggregator.js';
import { ExchangePremiumBar } from '../components/ExchangePremiumBar.js';
import { DEXSearch }          from '../components/DEXSearch.js';
import { fetchDEXOHLCV, parsePoolSymbol } from '../api/geckoterminal.js';

// ── v3.8 — Marché / News / Fondamentaux / Carnet d'ordres ───
import MarketSentimentWidget from '../components/MarketSentimentWidget.js';
import NewsFeedModal         from '../components/NewsFeedModal.js';
import FundamentalsModal     from '../components/FundamentalsModal.js';
import OrderBookModal        from '../components/OrderBookModal.js';
import { RiskCalculatorModal } from '../components/RiskCalculatorModal.js';

// ── MobileToolbar ─────────────────────────────────────────────
import { MobileToolbar } from '../components/MobileToolbar.js';


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
let screenerModal  = null;
let exportModal    = null;
let paperEngine    = null;
let paperModal     = null;
let paperOverlay   = null;
let backtestModal  = null;
let profileManager = null;
let profileModal   = null;
let alertBuilderModal = null;
let alertCenterModal  = null;

// ── v3.7 ──────────────────────────────────────────────────────
let liquidations   = null;
let exchAggregator = null;
let exchBar        = null;
let dexSearch      = null;
let isDEXMode      = false;

// ── v3.8 — Nouveaux modules ───────────────────────────────────
let sentimentWidget  = null;   // MarketSentimentWidget (panneau latéral ou modal)
let newsFeedModal    = null;   // NewsFeedModal
let fundamentalsModal = null;  // FundamentalsModal
let orderBookModal   = null;   // OrderBookModal
let riskCalcModal  = null;

// ── MobileToolbar ─────────────────────────────────────────────
let mobileToolbar  = null;

// ── AlertManager — singleton partagé ─────────────────────────
const alertManager  = new AlertManagerV2();
let   cmdPalette    = null;
const recentSymbols = new RecentSymbols();
let   alertIndicatorCache = { rsi: null, macd: null };
let   lastPctChange24h    = null;
const alertPriceLines     = new Map();

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ══════════════════════════════════════════════════════════════
//  PRICE LINES
// ══════════════════════════════════════════════════════════════

export function getPriceLineValue(alert) {
  const priceCond = alert.conditions.find(c =>
    c.type === 'price_above' || c.type === 'price_below'
  );
  return priceCond?.value ?? null;
}

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
      const priceVal = getPriceLineValue(alert);
      if (!priceVal) continue;
      try {
        const line = chart.cSeries.createPriceLine({
          price: priceVal, color: '#ff9900', lineWidth: 1,
          lineStyle: 2, axisLabelVisible: true,
          title: alert.name ? `🔔 ${alert.name}` : '🔔',
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
  await initI18n();
  applyDOMTranslations();
  mountSharedModals({ hide: ['ctx-back-single', 'ctx-chart-label'] });
  initTheme();

  const storedLocale = localStorage.getItem('crypview_locale');
  if (storedLocale) applyRTL(storedLocale);
  mountSkipLink('main-content');

  header = new Header();
  header.setStatus('connecting');

  const urlState = parseShareURL();
  const initSym  = urlState.symbol     ?? 'btcusdt';
  const initTf   = urlState.tf         ?? DEFAULT_TF;
  const initInd  = urlState.indicators ?? [];

  const symbols   = await loadAllSymbols();
  const container = $('chart-container');

  sidebar           = new Sidebar();
  alertBuilderModal = new AlertBuilderModal();
  alertCenterModal  = new AlertCenterModal(alertManager);
  exportModal       = new ExportModal();
  chart             = new TradingChart(container, initSym, initTf);

  // ── v3.7 — Multi-Exchange & DEX ──────────────────────────
  exchAggregator = new ExchangeAggregator();
  exchBar        = new ExchangePremiumBar();
  exchBar.mount();
  exchAggregator.start(initSym);

  dexSearch = new DEXSearch({ onSelect: (pool) => connectDEX(pool) });
  dexSearch.mount();

  // ── SymbolSearch ──────────────────────────────────────────
  const symSearch = new SymbolSearch(
    $('sym-input'), $('sym-dropdown'), symbols,
    { onSelect: (sym) => { ctxMenu?.setSymbol(sym); connect(sym, chart.timeframe); } }
  );
  symSearch.setValue(initSym);
  recentSymbols.push(initSym);

  // ── TimeframeBar ──────────────────────────────────────────
  new TimeframeBar(
    $('tf-scroll-wrapper'), null, $('tf-scroll'), initTf,
    { onChange: (tf) => connect(chart.symbol, tf) }
  );

  // ── Drag-scroll barre timeframes ──────────────────────────
  const tfStrip = $('tf-scroll');
  if (tfStrip) {
    let isDragging = false, startX = 0, scrollLeft = 0;
    tfStrip.addEventListener('mousedown', e => {
      isDragging = true; startX = e.pageX - tfStrip.offsetLeft;
      scrollLeft = tfStrip.scrollLeft; tfStrip.style.cursor = 'grabbing';
    });
    document.addEventListener('mouseup', () => { isDragging = false; tfStrip.style.cursor = 'grab'; });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      tfStrip.scrollLeft = scrollLeft - (e.pageX - tfStrip.offsetLeft - startX) * 1.5;
    });
  }

  wireChartEvents(container);
  setOverlay(t('overlay.loading'), `BTC/USDT — ${DEFAULT_TF}`);
  await chart.start();
  initChartModules(container);
  initContextMenu(container);
  initIndicatorModal();

  // ── MobileToolbar ─────────────────────────────────────────
  mobileToolbar = new MobileToolbar({
    drawing,
    onIndicators: () => indModal?.open(),
    onScreener:   () => screenerModal?.open(),
  });

  // ── Application des indicateurs depuis l'URL ──────────────
  if (initInd.length) {
    const hooks = makeHooks();
    for (const key of initInd) {
      try { indicators?.add(key, chart.candles, hooks); } catch (_) {}
    }
    updateIndBar();
  }

  settingsModal = new SettingsModal({
    onThemeChange: (theme) => applyTheme(theme),
  });

  // ── Paper Trading ─────────────────────────────────────────
  paperEngine  = new PaperTradingEngine();
  paperOverlay = new PaperTradingOverlay(chart.cSeries);
  paperModal   = new PaperTradingModal(paperEngine, {
    getCurrentPrice:       () => chart?.candles.at(-1)?.close ?? 0,
    getSymbol:             () => chart?.symbol?.toUpperCase() ?? 'BTCUSDT',
    onToggleChartMarkers:  () => paperOverlay.toggle(),
    isChartMarkersVisible: () => paperOverlay.visible,
  });
  paperEngine.onUpdate = () => {
    paperModal.refresh();
    paperOverlay.syncFromTrades(paperEngine.trades, chart.symbol);
  };

  // ── Backtester ────────────────────────────────────────────
  backtestModal = new BacktestModal({
    getCandles: () => chart?.candles ?? [],
    getSymbol:  () => chart?.symbol ?? 'btcusdt',
    getTf:      () => chart?.timeframe ?? '—',
  });

  // ── Market Screener ───────────────────────────────────────
  screenerModal = new ScreenerModal({
    onSelect: (sym) => connect(sym, chart.timeframe),
  });

  // ── v3.8 — Sentiment / News / Fondamentaux / Order Book ──
  //
  //  On initialise les quatre composants une seule fois ici.
  //  Chaque modal/widget gère son propre affichage via .open().
  //  Le symbole courant est transmis à l'ouverture pour qu'il
  //  puisse rafraîchir ses données à chaque changement.
  //
  sentimentWidget   = new MarketSentimentWidget();
  newsFeedModal     = new NewsFeedModal();
  fundamentalsModal = new FundamentalsModal();
  orderBookModal    = new OrderBookModal();
  riskCalcModal = new RiskCalculatorModal({
    getCurrentPrice: () => chart?.candles.at(-1)?.close ?? 0,
  });
  bindPanelTabs();
  // ─────────────────────────────────────────────────────────
  function bindPanelTabs() {
    const map = {
      sentiment:    () => sentimentWidget?.open(chart?.symbol),
      news:         () => newsFeedModal?.open(chart?.symbol),
      fondamentaux: () => fundamentalsModal?.open(chart?.symbol),
      orderbook:    () => orderBookModal?.open(chart?.symbol),
    };
  
    document.querySelectorAll('.panel-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        if (map[panel]) map[panel]();
      });
    });
  }


  // ── CommandPalette ────────────────────────────────────────
  cmdPalette = new CommandPalette({
    symbols, recentSymbols,
    getActiveKeys: () => indicators?.getActiveKeys() ?? [],
    getCurrentSym: () => chart?.symbol ?? '',
    getCurrentTf:  () => chart?.timeframe ?? '',

    onSymbol: (sym) => {
      recentSymbols.push(sym);
      symSearch.setValue(sym);
      ctxMenu?.setSymbol(sym);
      connect(sym, chart.timeframe);
    },

    onTf: (tf) => {
      connect(chart.symbol, tf);
      $('tf-scroll')?.querySelectorAll('.tf-btn').forEach(b => {
        const isActive = b.dataset.tf === tf;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
        if (isActive) b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    },

    onToggleInd: (key) => {
      const hooks = makeHooks();
      indicators?.isActive(key)
        ? indicators.remove(key, hooks)
        : indicators.add(key, chart.candles, hooks);
      updateIndBar();
    },

    onAction: (id) => {
      switch (id) {
        case 'screener':     screenerModal?.open();                              break;
        case 'profiles':     profileModal?.open();                              break;
        case 'settings':     settingsModal?.open();                             break;
        // ── v3.8 — nouvelles actions ───────────────────────
        case 'sentiment':    sentimentWidget?.open(chart?.symbol);              break;
        case 'news':         newsFeedModal?.open(chart?.symbol);                break;
        case 'fundamentals': fundamentalsModal?.open(chart?.symbol);            break;
        case 'orderbook':    orderBookModal?.open(chart?.symbol);               break;
        // ───────────────────────────────────────────────────
        case 'export': exportModal?.open({
          symbol: chart.symbol, tf: chart.timeframe,
          indicators: indicators?.getActiveKeys() ?? [],
          candles: chart.candles, container: $('chart-container'),
        }); break;
        case 'multi2': window.location.href = `multi2.html?sym=${chart.symbol}`; break;
        case 'multi4': window.location.href = `multi4.html?sym=${chart.symbol}`; break;
        case 'single': break;
      }
    },
  });

  profileManager = new ProfileManager();
  profileModal   = new ProfileModal(profileManager, {
    getCurrentState: () => ({
      indicators: indicators?.getActiveKeys() ?? [],
      tf:         chart?.timeframe ?? null,
    }),
    onApply: ({ indicators: keys, tf }) => {
      const hooks = makeHooks();
      indicators?.removeAll(hooks);
      for (const key of keys) indicators?.add(key, chart.candles, hooks);
      updateIndBar();
      if (tf && tf !== chart.timeframe) connect(chart.symbol, tf);
    },
  });

  alertManager.onAlertsChange = () => {
    syncAlertPriceLines();
    alertCenterModal?.refresh();
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
      case 'i': case 'I':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); indModal?.open(); }
        break;
      case 's': case 'S':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); screenerModal?.open(); }
        break;
      case 'z': case 'Z':
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) { e.preventDefault(); drawing?.undoLast(); }
        break;
      case 't': case 'T':
        if (!e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); cycleTf(); }
        break;
      case 'K':
        if (e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); riskCalcModal?.open(); }
        break;

      // ── v3.8 — raccourcis Shift ───────────────────────────
      //  Shift+N → News   Shift+U → Sentiment   Shift+O → Order Book
      //  (Shift+F déjà pris par Footprint → fondamentaux sans Shift)
      case 'N':
        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault(); newsFeedModal?.open(chart?.symbol);
        }
        break;
      case 'U':
        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault(); sentimentWidget?.open(chart?.symbol);
        }
        break;
      case 'O':
        if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault(); orderBookModal?.open(chart?.symbol);
        }
        break;
      // ─────────────────────────────────────────────────────
    }

    // ── Indicateurs rapides (Shift + lettre) ─────────────────
    if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const IND_SHORTCUTS = { R: 'rsi', M: 'macd', B: 'bb', V: 'vwap', F: 'fp', A: 'ma' };
      const key = IND_SHORTCUTS[e.key];
      if (key) {
        e.preventDefault();
        const hooks = makeHooks();
        indicators?.isActive(key)
          ? indicators.remove(key, hooks)
          : indicators.add(key, chart.candles, hooks);
        updateIndBar();
      }
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
    if (active) b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
  connect(chart.symbol, next);
}

// ══════════════════════════════════════════════════════════════
//  INIT MODULES CHART
// ══════════════════════════════════════════════════════════════

function initChartModules(container) {
  indicators = new ChartIndicators(
    chart.chart, chart.cSeries, $('charts-col'),
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  indicators.onStateChange = (_key, _active) => {
    updateIndBar();
    if (indModal) indModal.render();
    if (ctxMenu)  ctxMenu.update(indicators.getActiveKeys(), drawing?.getCurrentTool() ?? null);
  };

  vp        = new ChartVolumeProfile(chart.chart, chart.cSeries, container);
  footprint = new ChartFootprint(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  container.addEventListener('crypview:fp:redraw', () => footprint.redraw(chart.candles));

  orderflow = new ChartOrderflow(
    chart.chart, chart.cSeries, container,
    () => ({ symbol: chart.symbol, timeframe: chart.timeframe })
  );
  container.addEventListener('crypview:of:redraw', () => orderflow.redraw(chart.candles));

  // ── v3.7 — Liquidation Heatmap ────────────────────────────
  liquidations = new ChartLiquidations();

  drawing = new ChartDrawing(chart.chart, chart.cSeries, $('draw-canvas'), $('draw-svg'));
  container.addEventListener('crypview:tool:change', ({ detail }) => {
    ctxMenu?.update(indicators.getActiveKeys(), detail.tool);
  });

  mobileToolbar?.setDrawing(drawing);
}

// ══════════════════════════════════════════════════════════════
//  HOOKS
// ══════════════════════════════════════════════════════════════

function makeHooks() {
  return {
    onActivateFP:   () => { footprint.activate(chart.candles); },
    onDeactivateFP: () => { footprint.deactivate(); },
    onActivateVP:   () => { vp?.activate(chart.candles); },
    onDeactivateVP: () => { vp?.deactivate(); },
    onActivateOF: () => {
      const s = indicators.getState('of');
      orderflow.activate(chart.candles, s);
      orderflow.pushToChart(chart.candles, s);
    },
    onDeactivateOF:  () => { orderflow.deactivate(); },
    onActivateLiq:   () => {
      liquidations.activate(chart.chart, chart.cSeries, $('chart-container'), chart.symbol);
    },
    onDeactivateLiq: () => { liquidations.deactivate(); },
  };
}

// ══════════════════════════════════════════════════════════════
//  RECONNEXION
// ══════════════════════════════════════════════════════════════

async function connect(symbol, timeframe) {
  recentSymbols.push(symbol);
  window.saveRecentSym?.(symbol, timeframe);

  if (isDEXMode) {
    isDEXMode = false;
    chart?.destroy();
    chart = new TradingChart($('chart-container'), symbol, timeframe);
    wireChartEvents($('chart-container'));
    initChartModules($('chart-container'));
    exchAggregator?.start(symbol);
    setOverlay(t('overlay.loading'), `${symbol.toUpperCase()} / ${timeframe}`);
    await chart.start();
    updateIndBar();
    return;
  }

  setOverlay(t('overlay.loading'), `${symbol.toUpperCase()} / ${timeframe}`);
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

  paperOverlay?.clear();
  await chart.changeTo(symbol, timeframe);
  paperOverlay?.updateSeries(chart.cSeries);
  paperOverlay?.syncFromTrades(paperEngine?.trades ?? [], symbol);

  isDEXMode = false;
  exchAggregator?.start(symbol);
  liquidations?.setSymbol(symbol);

  // ── v3.8 — mise à jour du symbole dans les modules actifs ─
  //  Notifier seulement si le module a déjà été ouvert au moins
  //  une fois (évite un fetch inutile au démarrage).
  sentimentWidget?.updateSymbol?.(symbol);
  newsFeedModal?.updateSymbol?.(symbol);
  fundamentalsModal?.updateSymbol?.(symbol);
  orderBookModal?.updateSymbol?.(symbol);
  // ─────────────────────────────────────────────────────────

  for (const key of wasInd) indicators.add(key, chart.candles, hooks);
  if (wasVP) indicators.add('vp', chart.candles, hooks);
  if (wasFP) indicators.add('fp', chart.candles, hooks);
  if (wasOF) indicators.add('of', chart.candles, hooks);

  syncAlertPriceLines();
}

// ══════════════════════════════════════════════════════════════
//  CONNEXION DEX (GeckoTerminal)
// ══════════════════════════════════════════════════════════════

async function connectDEX(pool) {
  setOverlay(t('overlay.dex'), pool.name);
  header?.setStatus('offline', 'DEX…');
  exchAggregator?.stop();

  const hooks = makeHooks();
  indicators?.removeAll(hooks);
  if (footprint?.isActive()) footprint?.deactivate();
  if (orderflow?.isActive()) orderflow?.deactivate();
  liquidations?.deactivate();
  clearAllAlertPriceLines();
  chart?.destroy();

  try {
    isDEXMode = true;
    chart     = new TradingChartDEX($('chart-container'), pool, chart?.timeframe ?? '1h');
    await chart.start();
    initChartModules($('chart-container'));
    ctxMenu?.setSymbol(pool.name);
    ctxMenu?.setChartLabel(`${(chart.timeframe ?? '').toUpperCase()} — ${pool.name}`);
    header?.setStatus('live');
    hideOverlay();
    showToast(`🔗 DEX — ${pool.name} chargé (${pool.network.toUpperCase()})`, 'success', 3_000);
  } catch (err) {
    isDEXMode = false;
    showToast(`Erreur DEX : ${err.message}`, 'error');
    hideOverlay();
    connect('btcusdt', DEFAULT_TF);
  }
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
    const candles = chart.candles;
    const last    = candles.at(-1);
    const prev    = candles.at(-2);
    alertManager.check(chart.symbol, {
      price: detail.price, currentTime: last?.time ?? Math.floor(Date.now() / 1_000),
      pctChange24h: lastPctChange24h,
      volumeRatio: (last && prev && prev.volume > 0) ? last.volume / prev.volume : null,
      rsi: alertIndicatorCache.rsi, macd: alertIndicatorCache.macd, candles,
    });
    if (paperEngine?.positions.length) paperEngine.check(chart.symbol, detail.price);
    exchAggregator?.updateBinancePrice(detail.price);

    // ── v3.8 — tick live pour l'Order Book ───────────────────
    orderBookModal?.onPriceTick?.(detail.price);
    // ─────────────────────────────────────────────────────────
  });

  container.addEventListener('crypview:drawing:alert', async ({ detail }) => {
    const { drawing, direction } = detail;
    if (!drawing?.anchors || drawing.anchors.length < 2) return;
    const perm = await alertManager.requestPermission();
    if (perm === 'denied') return;
    const { CONDITION_TYPE } = await import('../features/AlertManagerV2.js');
    const type  = direction === 'up' ? CONDITION_TYPE.TRENDLINE_CROSS_UP : CONDITION_TYPE.TRENDLINE_CROSS_DOWN;
    const arrow = direction === 'up' ? '↑' : '↓';
    alertManager.add({
      symbol: chart.symbol, name: `Trendline ${arrow} croisement`,
      conditions: [{ type, value: null, anchors: drawing.anchors }],
      logic: 'AND', repeat: false, cooldownMin: 5,
    });
  });

  container.addEventListener('crypview:ticker:update', ({ detail }) => {
    sidebar?.updateStats(detail);
    if (detail.open24 && chart?.candles.length) {
      const last = chart.candles.at(-1);
      if (last) lastPctChange24h = ((last.close - detail.open24) / detail.open24) * 100;
    }
  });

  container.addEventListener('crypview:trade:new', ({ detail }) => {
    sidebar?.addTrade(detail);
  });

  container.addEventListener('crypview:candle:closed', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.redraw(detail.candles);
    if (orderflow?.isActive()) orderflow.pushToChart(detail.candles, indicators.getState('of'));
    if (detail.candles.length > 20 && alertManager.hasActive()) {
      try {
        const rsiArr  = calcRSI(detail.candles, 14);
        const macdObj = calcMACD(detail.candles);
        alertIndicatorCache = {
          rsi:  rsiArr.at(-1)?.value ?? null,
          macd: (macdObj.macd.length && macdObj.signal.length)
            ? { macd: macdObj.macd.at(-1).value, signal: macdObj.signal.at(-1).value }
            : null,
        };
      } catch (_) {}
    }
  });

  container.addEventListener('crypview:history:loaded', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.reconnect(detail.candles);
    if (orderflow?.isActive()) orderflow.reconnect(detail.candles, indicators.getState('of'));
    clearAllAlertPriceLines();
    syncAlertPriceLines();
  });

  container.addEventListener('crypview:series:resynced', ({ detail }) => {
    if (!indicators) return;
    indicators.refresh(detail.candles);
    if (vp?.isActive())        vp.redraw(detail.candles);
    if (footprint?.isActive()) footprint.redraw(detail.candles);
    if (orderflow?.isActive()) orderflow.pushToChart(detail.candles, indicators.getState('of'));
  });
}

// ══════════════════════════════════════════════════════════════
//  BARRE DES INDICATEURS ACTIFS
// ══════════════════════════════════════════════════════════════

function updateIndBar() {
  const bar = $('ind-bar');
  if (!bar) return;
  bar.innerHTML = '';
  const active = indicators.getActiveKeys();
  bar.classList.toggle('visible', active.length > 0);
  for (const key of active) {
    const meta = getIndMeta(key);
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
//  CONTEXT MENU
// ══════════════════════════════════════════════════════════════

function initContextMenu(container) {
  ctxMenu = new ContextMenu(container, {
    onOpenIndModal:      () => indModal?.open(),
    onRemoveAllInd:      () => { indicators?.removeAll(makeHooks()); updateIndBar(); },
    onSetTool:           (tool) => drawing?.setTool(tool),
    onClearDrawings:     () => drawing?.clear(),
    onNavigate:          (href) => { window.location.href = href; },
    onOpenSettingsModal: () => settingsModal?.open(),
    onOpenScreener:      () => screenerModal?.open(),
    onOpenProfiles:      () => profileModal?.open(),
    onOpenPaperTrading:  () => paperModal?.open(),
    onOpenBacktest:      () => backtestModal?.open(),
    onOpenRiskCalc:      () => riskCalcModal?.open(),

    // ── v3.8 — entrées du menu contextuel ─────────────────
    onOpenSentiment:    () => sentimentWidget?.open(chart?.symbol),
    onOpenNews:         () => newsFeedModal?.open(chart?.symbol),
    onOpenFundamentals: () => fundamentalsModal?.open(chart?.symbol),
    onOpenOrderBook:    () => orderBookModal?.open(chart?.symbol),
    // ───────────────────────────────────────────────────────

    onOpenExport: () => exportModal?.open({
      symbol: chart.symbol, tf: chart.timeframe,
      indicators: indicators?.getActiveKeys() ?? [],
      candles: chart.candles, container: $('chart-container'),
    }),

    onAddAlert: async (clientY) => {
      if (!chart?.cSeries) return;
      const rect  = container.getBoundingClientRect();
      const price = chart.cSeries.coordinateToPrice(clientY - rect.top);
      if (price == null || price <= 0) return;
      const perm = await alertManager.requestPermission();
      if (perm === 'denied') return;
      const cfg = await alertBuilderModal.open(chart.symbol, {
        price, pctChange24h: lastPctChange24h,
        rsi: alertIndicatorCache.rsi, macd: alertIndicatorCache.macd,
        candles: chart.candles,
      });
      if (!cfg) return;
      alertManager.add(cfg);
    },

    onManageAlerts: () => alertCenterModal?.open(),
  });
}

// ══════════════════════════════════════════════════════════════
//  INDICATOR MODAL
// ══════════════════════════════════════════════════════════════

function initIndicatorModal() {
  indModal = new IndicatorModal({
    getActiveKeys: () => indicators?.getActiveKeys() ?? [],
    onAdd:       (key) => { indicators?.add(key, chart.candles, makeHooks()); indModal.render(); },
    onRemove:    (key) => { indicators?.remove(key, makeHooks()); indModal.render(); },
    onRemoveAll: ()    => { indicators?.removeAll(makeHooks()); indModal.render(); updateIndBar(); },
  });
}

// ══════════════════════════════════════════════════════════════
//  VISIBILITÉ — PAUSE RENDERING
// ══════════════════════════════════════════════════════════════

let bgState = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    bgState = { fp: footprint?.isActive() ?? false, of: orderflow?.isActive() ?? false };
    if (bgState.fp) footprint?.deactivate();
    if (bgState.of) orderflow?.deactivate();
    header?.setStatus('offline', 'Arrière-plan — 🔔 alertes actives');
  } else if (bgState !== null) {
    if (bgState.fp) footprint?.activate(chart.candles);
    if (bgState.of) {
      const s = indicators?.getState('of');
      orderflow?.activate(chart.candles, s);
      if (s) orderflow?.pushToChart(chart.candles, s);
    }
    bgState = null;
    header?.setStatus('live');
    syncAlertPriceLines();
  }
});

// ══════════════════════════════════════════════════════════════
//  CLEANUP
// ══════════════════════════════════════════════════════════════

window.addEventListener('beforeunload', () => {
  reliabilityManager.destroy();
  alertManager.clearTriggered();
  clearAllAlertPriceLines();
  indicators?.destroy();
  vp?.deactivate();
  footprint?.destroy();
  orderflow?.destroy();
  paperOverlay?.destroy();
  settingsModal?.destroy();
  // v3.7
  exchAggregator?.stop();
  liquidations?.destroy();
  dexSearch?.destroy();
  exchBar?.destroy();
  mobileToolbar?.destroy();
  // v3.8
  sentimentWidget?.destroy?.();
  newsFeedModal?.destroy?.();
  fundamentalsModal?.destroy?.();
  orderBookModal?.destroy?.();
  riskCalcModal = null;
  // ──────
  chart?.destroy();
});

boot();
