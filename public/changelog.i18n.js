// ============================================================
//  public/changelog.i18n.js — CrypView i18n
//  Traductions de la page Changelog (changelog.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans changelog.html :
//    <script src="public/changelog.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = CHANGELOG_I18N[locale] || CHANGELOG_I18N.en;
//      document.querySelectorAll('[data-i18n]').forEach(el => {
//        const key = el.dataset.i18n;
//        if (T[key] !== undefined) el.textContent = T[key];
//      });
//      document.querySelectorAll('[data-i18n-html]').forEach(el => {
//        const key = el.dataset.i18nHtml;
//        if (T[key] !== undefined) el.innerHTML = T[key];
//      });
//    </script>
// ============================================================

const CHANGELOG_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    pageTitle: 'Changelog — CrypView',
    metaDesc:  'CrypView version history: new features, bug fixes and improvements.',

    navBack:   '← Back to home',

    pageTag:   'History',
    h1:        'Changelog',
    pageMeta:  'Full version history — most recent first.',
    pageSub:   'Each version documents new features, bug fixes and performance improvements. Major versions are highlighted in green.',

    versionBadge: 'Current version: v4.0 — April 2026',

    // ── v4.0 ─────────────────────────────────────────────────
    v40_label: 'Major',
    v40_date:  'April 2026',

    v40_g1_title: '🌍 Internationalisation (i18n)',
    v40_g1_i1: 'Full i18n engine with <strong>4 languages</strong>: French, English, 中文, العربية — native RTL support for Arabic',
    v40_g1_i2: 'Dynamic locale loading via <code>import()</code> — zero unnecessary bundle',
    v40_g1_i3: 'Localised formatting of prices, volumes, dates and percentages via <code>Intl.NumberFormat</code>',
    v40_g1_i4: 'Language selector in Settings — <code>localStorage</code> persistence',

    v40_g2_title: '📊 Multi-Exchange & DEX',
    v40_g2_i1: 'Premium <strong>Bybit + OKX</strong> vs Binance bar in real time (5s REST polling)',
    v40_g2_i2: '<strong>GeckoTerminal</strong> integration — search and OHLCV charts for DEX pools (Ethereum, BSC, Solana, Arbitrum, Base…)',
    v40_g2_i3: '<code>TradingChartDEX</code> — isolated adapter with 60s polling and network/DEX badge',

    v40_g3_title: '🔥 Liquidation Heatmap',
    v40_g3_i1: 'Binance Futures <code>@forceOrder</code> stream — real-time canvas overlay, no API key required',
    v40_g3_i2: 'Red bars (liquidated longs) / green bars (liquidated shorts) by price level',
    v40_g3_i3: 'Live feed panel of the last 8 liquidations with USD amounts',

    v40_g4_title: '♿ Accessibility (WCAG 2.1)',
    v40_g4_i1: '<code>FocusTrap</code> on all modals — full keyboard navigation',
    v40_g4_i2: '<code>ArrowKeyNav</code> on context menus and lists',
    v40_g4_i3: 'Skip link, ARIA roles, live regions and exhaustive <code>aria-label</code>',
    v40_g4_i4: 'Full RTL support via dynamic CSS injection <code>rtl.js</code>',

    // ── v3.7 ─────────────────────────────────────────────────
    v37_label: 'Minor',
    v37_date:  'April 2026',

    v37_g1_title: '🔧 Fixes & improvements',
    v37_g1_i1: 'Fix <strong>Bug #11</strong>: <code>#resyncChartSeries()</code> now emits <code>crypview:series:resynced</code> to keep indicators in sync after FIFO eviction',
    v37_g1_i2: 'Fix multi.js <strong>CRITICAL BUG</strong>: <code>this.#setActive = fn</code> illegal → replaced by private field <code>#_objectTreeCallback</code>',
    v37_g1_i3: '<code>ChartLiquidations</code> correctly integrated into multi-panel hooks (was missing → <code>liq</code> broken in multi mode)',
    v37_g1_i4: 'DEX Search: <code>wrap.addEventListener(\'click\', e => e.stopPropagation())</code> to prevent unwanted dropdown closure',
    v37_g1_i5: '<code>#bindMTFDrawingSync</code>: REPLACE (not wrap) — eliminates callback stacking on each <code>#saveState()</code>',

    // ── v3.5 ─────────────────────────────────────────────────
    v35_label: 'Minor',
    v35_date:  'April 2026',

    v35_g1_title: '🗂 Workspaces & Object Tree',
    v35_g1_i1: '<strong>WorkspaceManager</strong> — save/restore full multi-panel state (symbols, TF, indicators, sync)',
    v35_g1_i2: '<strong>ObjectTreePanel</strong> — side object manager: drawings + indicators with hide, lock and delete',
    v35_g1_i3: '<code>O</code> shortcut to toggle the object panel, <code>W</code> for workspaces',
    v35_g1_i4: 'Inter-layout navigation with pending workspace restoration (<code>localStorage</code>)',

    v35_g2_title: '📐 MTF Drawing Sync',
    v35_g2_i1: 'Automatic drawing synchronisation between panels of the same symbol',
    v35_g2_i2: 'Sym-based drawing key: <code>drawKey_btcusdt</code> shared across all TFs',

    // ── v3.4 ─────────────────────────────────────────────────
    v34_label: 'Minor',
    v34_date:  'March 2026',

    v34_g1_title: '📈 Paper Trading & Backtesting',
    v34_g1_i1: '<strong>PaperTradingEngine</strong> — long/short simulation with SL, TP, 0.1% fees, equity curve',
    v34_g1_i2: '<strong>Backtester</strong> — backtesting engine on OHLCV history with 12 combinable signals (AND/OR)',
    v34_g1_i3: '<strong>PaperTradingOverlay</strong> — LightweightCharts markers (▲ BUY, ▼ SELL, ⛔ SL, 🎯 TP)',
    v34_g1_i4: 'Sharpe, Max Drawdown, Profit Factor, Win Rate metrics',

    // ── v3.3 ─────────────────────────────────────────────────
    v33_label: 'Minor',
    v33_date:  'March 2026',

    v33_g1_title: '⌨️ Command Palette & Sync',
    v33_g1_i1: '<strong>CommandPalette</strong> — global search <code>Ctrl+K</code> or <code>/</code>: symbols, indicators, TFs, actions',
    v33_g1_i2: '<strong>ChartSync</strong> — crosshair + zoom synchronisation between N charts (independent toggle)',
    v33_g1_i3: '<strong>RecentSymbols</strong> — history of the last 12 viewed pairs',

    // ── v3.2 ─────────────────────────────────────────────────
    v32_label: 'Minor',
    v32_date:  'March 2026',

    v32_g1_title: '📤 Export & Profiles',
    v32_g1_i1: '<strong>ExportModal</strong> — PNG capture (composite canvas), CSV, structured JSON + share URL',
    v32_g1_i2: '<strong>ProfileManager</strong> — 6 built-in presets + 20 custom profiles (indicators + TF)',
    v32_g1_i3: 'Rich export header: logo, symbol, TF badge, current price, live dot, date/time',

    // ── v3.1 ─────────────────────────────────────────────────
    v31_label: 'Minor',
    v31_date:  'March 2026',

    v31_g1_title: '🔍 Market Screener',
    v31_g1_i1: '<strong>ScreenerModal</strong> — 7 tabs (Gainers, Losers, Volume, Breakout, Extremes, Volatility)',
    v31_g1_i2: 'Metrics: <code>posInRange</code>, <code>rangePct</code>, <code>distHighPct</code> for each USDT pair',
    v31_g1_i3: 'Sortable table by column — live filtering with 120ms debounce',

    // ── v3.0 ─────────────────────────────────────────────────
    v30_label: 'Major',
    v30_date:  'March 2026',

    v30_g1_title: '🔔 Alerts V2 multi-condition',
    v30_g1_i1: '<strong>AlertManagerV2</strong> — AND/OR combinable conditions: price, %, RSI, MACD, volume spike, N-candle breakout, trendline crossover',
    v30_g1_i2: 'Repeat with configurable cooldown, expiration by timestamp, individual snooze',
    v30_g1_i3: 'Cross-tab synchronisation via <code>BroadcastChannel</code>',
    v30_g1_i4: 'Alert centre with Active / History tabs (50 entries)',

    // ── v2.9 ─────────────────────────────────────────────────
    v29_label: 'Minor',
    v29_date:  'March 2026',

    v29_g1_title: '✏️ Drawing Tools — Drag & Drop',
    v29_g1_i1: 'Drag-and-drop movable anchors on all tools (trendline, fib, zones, rectangle…)',
    v29_g1_i2: 'Fix v2.9.1: preservation of anchor <code>text</code> property during drag',
    v29_g1_i3: 'Right-click context menu on trendline/fibonacci: crossover alerts ↑↓, deletion',

    // ── v2.7 ─────────────────────────────────────────────────
    v27_label: 'Minor',
    v27_date:  'March 2026',

    v27_g1_title: '🔔 Alerts V1',
    v27_g1_i1: '<strong>AlertPriceModal</strong> — placement from the chart, pre-filled with cursor price',
    v27_g1_i2: 'Native OS notification + double-tone audio via Web Audio API',
    v27_g1_i3: '<code>localStorage</code> persistence — survives page reload',

    // ── v2.0 ─────────────────────────────────────────────────
    v20_label: 'Major',
    v20_date:  'March 2026',

    v20_g1_title: '🏗️ Architecture rewrite',
    v20_g1_i1: 'Migration to <strong>Vite + ES modules</strong> — end of global CDN mode',
    v20_g1_i2: '<strong>WSPool</strong> — WebSocket pool with deduplication (up to 200 streams / connection, 5 connections max)',
    v20_g1_i3: 'Generic <strong>Multi-Charts</strong> — N independent panels (2, 4, 9, V2, V3, 1+2, 1+3)',
    v20_g1_i4: '<strong>Web Worker</strong> for heavy calculations (Ichimoku, ADX, SuperTrend, MACD)',
    v20_g1_i5: '19 indicators + Volume Profile, Footprint, Orderflow',
    v20_g1_i6: 'Light / dark theme with synchronous anti-flash',
    v20_g1_i7: 'Full PWA with Service Worker, manifest, shortcuts',

    // ── v1.0 ─────────────────────────────────────────────────
    v10_label: 'Initial',
    v10_date:  'February 2026',

    v10_g1_title: '🚀 Launch',
    v10_g1_i1: 'Japanese candlestick charts — Binance WebSocket live',
    v10_g1_i2: 'USDT pair search + timeframes from 1s to 1M',
    v10_g1_i3: 'Real-time trades sidebar',
    v10_g1_i4: '10 indicators (RSI, MACD, Bollinger, MA, VWAP…)',

    timelineEnd: 'Project origin',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookies',
    footPrivacy: 'Privacy',
    footRisks:   'Risks',
    footHome:    'Home',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'Changelog — CrypView',
    metaDesc:  'Historique des versions de CrypView : nouvelles fonctionnalités, corrections et améliorations.',

    navBack:   '← Retour à l\'accueil',

    pageTag:   'Historique',
    h1:        'Changelog',
    pageMeta:  'Historique complet des versions — du plus récent au plus ancien.',
    pageSub:   'Chaque version documente les nouvelles fonctionnalités, corrections de bugs et améliorations de performance. Les versions majeures sont marquées en vert.',

    versionBadge: 'Version actuelle : v4.0 — Avril 2026',

    v40_label: 'Majeure',
    v40_date:  'Avril 2026',

    v40_g1_title: '🌍 Internationalisation (i18n)',
    v40_g1_i1: 'Moteur i18n complet avec <strong>4 langues</strong> : Français, English, 中文, العربية — support RTL natif pour l\'arabe',
    v40_g1_i2: 'Chargement dynamique des locales par <code>import()</code> — zéro bundle inutile',
    v40_g1_i3: 'Formatage localisé des prix, volumes, dates et pourcentages via <code>Intl.NumberFormat</code>',
    v40_g1_i4: 'Sélecteur de langue dans les Paramètres — persistance <code>localStorage</code>',

    v40_g2_title: '📊 Multi-Exchange & DEX',
    v40_g2_i1: 'Barre premium <strong>Bybit + OKX</strong> vs Binance en temps réel (polling REST 5s)',
    v40_g2_i2: 'Intégration <strong>GeckoTerminal</strong> — recherche et graphiques OHLCV pour les pools DEX (Ethereum, BSC, Solana, Arbitrum, Base…)',
    v40_g2_i3: '<code>TradingChartDEX</code> — adaptateur isolé avec polling 60s et badge réseau/DEX',

    v40_g3_title: '🔥 Liquidation Heatmap',
    v40_g3_i1: 'Stream <code>@forceOrder</code> Binance Futures — canvas overlay temps réel sans clé API',
    v40_g3_i2: 'Barres rouges (longs liquidés) / vertes (shorts liquidés) par niveau de prix',
    v40_g3_i3: 'Panneau flux live des 8 dernières liquidations avec montants USD',

    v40_g4_title: '♿ Accessibilité (WCAG 2.1)',
    v40_g4_i1: '<code>FocusTrap</code> sur toutes les modales — navigation clavier complète',
    v40_g4_i2: '<code>ArrowKeyNav</code> sur les menus contextuels et les listes',
    v40_g4_i3: 'Skip link, rôles ARIA, live regions et <code>aria-label</code> exhaustifs',
    v40_g4_i4: 'Support RTL complet via injection CSS dynamique <code>rtl.js</code>',

    v37_label: 'Mineure',
    v37_date:  'Avril 20265',

    v37_g1_title: '🔧 Corrections & améliorations',
    v37_g1_i1: 'Correction <strong>Bug #11</strong> : <code>#resyncChartSeries()</code> émet maintenant <code>crypview:series:resynced</code> pour maintenir les indicateurs synchronisés après éviction FIFO',
    v37_g1_i2: 'Fix multi.js <strong>Bug #BUG CRITIQUE</strong> : <code>this.#setActive = fn</code> illégal → remplacé par champ privé <code>#_objectTreeCallback</code>',
    v37_g1_i3: '<code>ChartLiquidations</code> correctement intégré dans les hooks multi-panneaux (était absent → <code>liq</code> cassé en mode multi)',
    v37_g1_i4: 'DEX Search : <code>wrap.addEventListener(\'click\', e => e.stopPropagation())</code> pour éviter la fermeture intempestive du dropdown',
    v37_g1_i5: '<code>#bindMTFDrawingSync</code> : REPLACE (pas wrap) — élimine l\'empilement de callbacks à chaque <code>#saveState()</code>',

    v35_label: 'Mineure',
    v35_date:  'Avril 2026',

    v35_g1_title: '🗂 Workspaces & Object Tree',
    v35_g1_i1: '<strong>WorkspaceManager</strong> — sauvegarde/restauration de l\'état complet multi-panneaux (symboles, TF, indicateurs, sync)',
    v35_g1_i2: '<strong>ObjectTreePanel</strong> — gestionnaire d\'objets latéral : tracés + indicateurs avec masquage, verrouillage et suppression',
    v35_g1_i3: 'Raccourci <code>O</code> pour toggle le panneau d\'objets, <code>W</code> pour les workspaces',
    v35_g1_i4: 'Navigation inter-layouts avec restauration du workspace en attente (<code>localStorage</code>)',

    v35_g2_title: '📐 MTF Drawing Sync',
    v35_g2_i1: 'Synchronisation automatique des tracés entre panneaux du même symbole',
    v35_g2_i2: 'Clé de dessin sym-based : <code>drawKey_btcusdt</code> partagée entre tous les TF',

    v34_label: 'Mineure',
    v34_date:  'Avril 2026',

    v34_g1_title: '📈 Paper Trading & Backtesting',
    v34_g1_i1: '<strong>PaperTradingEngine</strong> — simulation long/short avec SL, TP, frais 0.1%, courbe equity',
    v34_g1_i2: '<strong>Backtester</strong> — moteur de backtesting sur historique OHLCV avec 12 signaux combinables (AND/OR)',
    v34_g1_i3: '<strong>PaperTradingOverlay</strong> — markers LightweightCharts (▲ BUY, ▼ SELL, ⛔ SL, 🎯 TP)',
    v34_g1_i4: 'Métriques Sharpe, Max Drawdown, Profit Factor, Win Rate',

    v33_label: 'Mineure',
    v33_date:  'Avril 2026',

    v33_g1_title: '⌨️ Command Palette & Sync',
    v33_g1_i1: '<strong>CommandPalette</strong> — recherche globale <code>Ctrl+K</code> ou <code>/</code> : symboles, indicateurs, TF, actions',
    v33_g1_i2: '<strong>ChartSync</strong> — synchronisation crosshair + zoom entre N graphiques (toggle indépendants)',
    v33_g1_i3: '<strong>RecentSymbols</strong> — historique des 12 dernières paires consultées',

    v32_label: 'Mineure',
    v32_date:  'Avril 2026',

    v32_g1_title: '📤 Export & Profils',
    v32_g1_i1: '<strong>ExportModal</strong> — capture PNG (canvas composite), CSV, JSON structuré + URL de partage',
    v32_g1_i2: '<strong>ProfileManager</strong> — 6 presets intégrés + 20 profils custom (indicateurs + TF)',
    v32_g1_i3: 'Header export riche : logo, symbole, badge TF, prix courant, dot live, date/heure',

    v31_label: 'Mineure',
    v31_date:  'Mars 2026',

    v31_g1_title: '🔍 Market Screener',
    v31_g1_i1: '<strong>ScreenerModal</strong> — 7 onglets (Gainers, Losers, Volume, Breakout, Extrêmes, Volatilité)',
    v31_g1_i2: 'Métriques : <code>posInRange</code>, <code>rangePct</code>, <code>distHighPct</code> pour chaque paire USDT',
    v31_g1_i3: 'Table triable par colonne — filtrage live avec debounce 120ms',

    v30_label: 'Majeure',
    v30_date:  'Mars 2026',

    v30_g1_title: '🔔 Alertes V2 multi-conditions',
    v30_g1_i1: '<strong>AlertManagerV2</strong> — conditions combinables AND/OR : prix, %, RSI, MACD, volume spike, breakout N-bougies, croisement trendline',
    v30_g1_i2: 'Répétition avec cooldown configurable, expiration par timestamp, snooze individuel',
    v30_g1_i3: 'Synchronisation cross-onglets via <code>BroadcastChannel</code>',
    v30_g1_i4: 'Centre d\'alertes avec onglets Actives / Historique (50 entrées)',

    v29_label: 'Mineure',
    v29_date:  'Mars 2026',

    v29_g1_title: '✏️ Drawing Tools — Drag & Drop',
    v29_g1_i1: 'Ancres déplaçables par glisser-déposer sur tous les outils (trendline, fib, zones, rectangle…)',
    v29_g1_i2: 'Fix v2.9.1 : préservation de la propriété <code>text</code> des ancres lors du drag',
    v29_g1_i3: 'Menu contextuel clic-droit sur trendline/fibonacci : alertes de croisement ↑↓, suppression',

    v27_label: 'Mineure',
    v27_date:  'Mars 2026',

    v27_g1_title: '🔔 Alertes V1',
    v27_g1_i1: '<strong>AlertPriceModal</strong> — placement depuis le chart, pré-rempli avec le prix du curseur',
    v27_g1_i2: 'Notification native OS + double-ton audio via Web Audio API',
    v27_g1_i3: 'Persistance <code>localStorage</code> — survive au rechargement de page',

    v20_label: 'Majeure',
    v20_date:  'Mars 2026',

    v20_g1_title: '🏗️ Refonte architecture',
    v20_g1_i1: 'Migration vers <strong>Vite + ES modules</strong> — fin du mode CDN global',
    v20_g1_i2: '<strong>WSPool</strong> — pool WebSocket avec déduplication (jusqu\'à 200 streams / connexion, 5 connexions max)',
    v20_g1_i3: '<strong>Multi-Charts</strong> générique — N panneaux indépendants (2, 4, 9, V2, V3, 1+2, 1+3)',
    v20_g1_i4: '<strong>Web Worker</strong> pour les calculs lourds (Ichimoku, ADX, SuperTrend, MACD)',
    v20_g1_i5: '19 indicateurs + Volume Profile, Footprint, Orderflow',
    v20_g1_i6: 'Thème clair / sombre avec anti-flash synchrone',
    v20_g1_i7: 'PWA complète avec Service Worker, manifest, raccourcis',

    v10_label: 'Initial',
    v10_date:  'Fervrier 2026',

    v10_g1_title: '🚀 Lancement',
    v10_g1_i1: 'Graphiques en chandeliers japonais — Binance WebSocket live',
    v10_g1_i2: 'Recherche de paires USDT + timeframes 1s à 1M',
    v10_g1_i3: 'Sidebar trades en temps réel',
    v10_g1_i4: '10 indicateurs (RSI, MACD, Bollinger, MA, VWAP…)',

    timelineEnd: 'Origine du projet',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookies',
    footPrivacy: 'Confidentialité',
    footRisks:   'Risques',
    footHome:    'Accueil',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: '更新日志 — CrypView',
    metaDesc:  'CrypView版本历史：新功能、错误修复与改进。',

    navBack:   '← 返回首页',

    pageTag:   '历史记录',
    h1:        '更新日志',
    pageMeta:  '完整版本历史 — 从最新到最旧。',
    pageSub:   '每个版本记录新功能、错误修复和性能改进。主要版本以绿色标注。',

    versionBadge: '当前版本：v4.0 — 2026年6月',

    v40_label: '主要版本',
    v40_date:  '2026年6月',

    v40_g1_title: '🌍 国际化 (i18n)',
    v40_g1_i1: '完整i18n引擎支持<strong>4种语言</strong>：法语、English、中文、العربية — 原生支持阿拉伯语RTL',
    v40_g1_i2: '通过<code>import()</code>动态加载语言包 — 零冗余bundle',
    v40_g1_i3: '通过<code>Intl.NumberFormat</code>本地化格式化价格、成交量、日期和百分比',
    v40_g1_i4: '设置中的语言选择器 — <code>localStorage</code>持久化',

    v40_g2_title: '📊 多交易所 & DEX',
    v40_g2_i1: '实时<strong>Bybit + OKX</strong> vs 币安高级对比栏（REST轮询5秒）',
    v40_g2_i2: '<strong>GeckoTerminal</strong>集成 — 搜索DEX流动池并查看OHLCV图表（以太坊、BSC、Solana、Arbitrum、Base…）',
    v40_g2_i3: '<code>TradingChartDEX</code> — 隔离适配器，60秒轮询，显示网络/DEX徽章',

    v40_g3_title: '🔥 爆仓热力图',
    v40_g3_i1: '币安合约<code>@forceOrder</code>流 — 实时Canvas叠加层，无需API密钥',
    v40_g3_i2: '红柱（多头爆仓）/ 绿柱（空头爆仓）按价格级别分布',
    v40_g3_i3: '显示最近8笔爆仓的实时流面板，含USD金额',

    v40_g4_title: '♿ 无障碍访问 (WCAG 2.1)',
    v40_g4_i1: '所有模态框的<code>FocusTrap</code> — 完整键盘导航',
    v40_g4_i2: '上下文菜单和列表的<code>ArrowKeyNav</code>',
    v40_g4_i3: '跳转链接、ARIA角色、实时区域和完整<code>aria-label</code>',
    v40_g4_i4: '通过动态CSS注入<code>rtl.js</code>完整支持RTL',

    v37_label: '次要版本',
    v37_date:  '2026年5月',

    v37_g1_title: '🔧 修复与改进',
    v37_g1_i1: '修复<strong>Bug #11</strong>：<code>#resyncChartSeries()</code>现在触发<code>crypview:series:resynced</code>，以在FIFO淘汰后保持指标同步',
    v37_g1_i2: '修复multi.js<strong>严重BUG</strong>：<code>this.#setActive = fn</code>非法 → 替换为私有字段<code>#_objectTreeCallback</code>',
    v37_g1_i3: '<code>ChartLiquidations</code>正确集成到多面板钩子（之前缺失 → 多图模式下<code>liq</code>异常）',
    v37_g1_i4: 'DEX搜索：添加<code>wrap.addEventListener(\'click\', e => e.stopPropagation())</code>防止下拉菜单意外关闭',
    v37_g1_i5: '<code>#bindMTFDrawingSync</code>：使用REPLACE（非wrap）— 消除每次<code>#saveState()</code>时的回调堆叠',

    v35_label: '次要版本',
    v35_date:  '2026年4月',

    v35_g1_title: '🗂 工作区 & 对象树',
    v35_g1_i1: '<strong>WorkspaceManager</strong> — 保存/恢复完整多面板状态（交易对、时间框架、指标、同步）',
    v35_g1_i2: '<strong>ObjectTreePanel</strong> — 侧边对象管理器：绘图+指标，支持隐藏、锁定和删除',
    v35_g1_i3: '<code>O</code>快捷键切换对象面板，<code>W</code>切换工作区',
    v35_g1_i4: '跨布局导航，支持待恢复工作区（<code>localStorage</code>）',

    v35_g2_title: '📐 MTF绘图同步',
    v35_g2_i1: '同一交易对不同面板间自动同步绘图',
    v35_g2_i2: '基于交易对的绘图键：<code>drawKey_btcusdt</code>跨所有时间框架共享',

    v34_label: '次要版本',
    v34_date:  '2026年3月',

    v34_g1_title: '📈 模拟交易 & 回测',
    v34_g1_i1: '<strong>PaperTradingEngine</strong> — 多空模拟，含止损、止盈、0.1%手续费、权益曲线',
    v34_g1_i2: '<strong>Backtester</strong> — 基于OHLCV历史数据的回测引擎，支持12个可组合信号（AND/OR）',
    v34_g1_i3: '<strong>PaperTradingOverlay</strong> — LightweightCharts标记（▲ BUY、▼ SELL、⛔ SL、🎯 TP）',
    v34_g1_i4: '夏普比率、最大回撤、盈亏比、胜率指标',

    v33_label: '次要版本',
    v33_date:  '2026年2月',

    v33_g1_title: '⌨️ 命令面板 & 同步',
    v33_g1_i1: '<strong>CommandPalette</strong> — 全局搜索<code>Ctrl+K</code>或<code>/</code>：交易对、指标、时间框架、操作',
    v33_g1_i2: '<strong>ChartSync</strong> — N个图表间的十字线+缩放同步（独立切换）',
    v33_g1_i3: '<strong>RecentSymbols</strong> — 最近12个查看交易对的历史记录',

    v32_label: '次要版本',
    v32_date:  '2025年1月',

    v32_g1_title: '📤 导出 & 配置方案',
    v32_g1_i1: '<strong>ExportModal</strong> — PNG截图（复合Canvas）、CSV、结构化JSON + 分享URL',
    v32_g1_i2: '<strong>ProfileManager</strong> — 6个内置预设 + 20个自定义方案（指标 + 时间框架）',
    v32_g1_i3: '丰富的导出头部：Logo、交易对、时间框架徽章、当前价格、实时指示点、日期/时间',

    v31_label: '次要版本',
    v31_date:  '2026年12月',

    v31_g1_title: '🔍 市场扫描器',
    v31_g1_i1: '<strong>ScreenerModal</strong> — 7个标签页（涨幅、跌幅、成交量、突破、极值、波动率）',
    v31_g1_i2: '每个USDT交易对的指标：<code>posInRange</code>、<code>rangePct</code>、<code>distHighPct</code>',
    v31_g1_i3: '可按列排序的表格 — 120ms防抖实时筛选',

    v30_label: '主要版本',
    v30_date:  '2026年11月',

    v30_g1_title: '🔔 V2多条件提醒',
    v30_g1_i1: '<strong>AlertManagerV2</strong> — AND/OR可组合条件：价格、%涨跌、RSI、MACD、成交量激增、N根K线突破、趋势线穿越',
    v30_g1_i2: '可配置冷却时间的重复提醒、时间戳过期、单独暂停',
    v30_g1_i3: '通过<code>BroadcastChannel</code>跨标签页同步',
    v30_g1_i4: '含活跃/历史标签页（50条记录）的提醒中心',

    v29_label: '次要版本',
    v29_date:  '2026年10月',

    v29_g1_title: '✏️ 绘图工具 — 拖放',
    v29_g1_i1: '所有工具（趋势线、斐波那契、区域、矩形…）支持锚点拖放移动',
    v29_g1_i2: '修复v2.9.1：拖动时保留锚点<code>text</code>属性',
    v29_g1_i3: '趋势线/斐波那契右键上下文菜单：穿越提醒↑↓、删除',

    v27_label: '次要版本',
    v27_date:  '2026年9月',

    v27_g1_title: '🔔 提醒 V1',
    v27_g1_i1: '<strong>AlertPriceModal</strong> — 从图表设置，预填光标价格',
    v27_g1_i2: '原生OS通知 + Web Audio API双音提示',
    v27_g1_i3: '<code>localStorage</code>持久化 — 页面刷新后仍保留',

    v20_label: '主要版本',
    v20_date:  '2026年7月',

    v20_g1_title: '🏗️ 架构重构',
    v20_g1_i1: '迁移至<strong>Vite + ES模块</strong> — 结束全局CDN模式',
    v20_g1_i2: '<strong>WSPool</strong> — 带去重功能的WebSocket连接池（每连接最多200个流，最多5个连接）',
    v20_g1_i3: '通用<strong>多图模式</strong> — N个独立面板（2、4、9、V2、V3、1+2、1+3）',
    v20_g1_i4: '<strong>Web Worker</strong>处理高强度计算（Ichimoku、ADX、SuperTrend、MACD）',
    v20_g1_i5: '19个指标 + 成交量分布、足迹图、订单流',
    v20_g1_i6: '浅色/深色主题，同步防闪烁',
    v20_g1_i7: '完整PWA，含Service Worker、manifest、快捷方式',

    v10_label: '初始版本',
    v10_date:  '2026年4月',

    v10_g1_title: '🚀 上线',
    v10_g1_i1: '日本蜡烛图 — 币安WebSocket实时数据',
    v10_g1_i2: 'USDT交易对搜索 + 1秒至1月时间框架',
    v10_g1_i3: '实时成交记录侧边栏',
    v10_g1_i4: '10个指标（RSI、MACD、布林带、MA、VWAP…）',

    timelineEnd: '项目起点',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookie政策',
    footPrivacy: '隐私政策',
    footRisks:   '风险提示',
    footHome:    '首页',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'سجل التغييرات — CrypView',
    metaDesc:  'سجل إصدارات CrypView: الميزات الجديدة وإصلاحات الأخطاء والتحسينات.',

    navBack:   '→ العودة إلى الرئيسية',

    pageTag:   'السجل',
    h1:        'سجل التغييرات',
    pageMeta:  'السجل الكامل للإصدارات — من الأحدث إلى الأقدم.',
    pageSub:   'يوثّق كل إصدار الميزات الجديدة وإصلاحات الأخطاء وتحسينات الأداء. الإصدارات الرئيسية مميزة باللون الأخضر.',

    versionBadge: 'الإصدار الحالي: v4.0 — 2026',

    v40_label: 'رئيسي',
    v40_date:  'يونيو 2026',

    v40_g1_title: '🌍 التدويل (i18n)',
    v40_g1_i1: 'محرك i18n كامل يدعم <strong>٤ لغات</strong>: الفرنسية، الإنجليزية، 中文، العربية — دعم RTL أصلي للعربية',
    v40_g1_i2: 'تحميل ديناميكي للغات عبر <code>import()</code> — صفر حزم غير ضرورية',
    v40_g1_i3: 'تنسيق محلي للأسعار والأحجام والتواريخ والنسب المئوية عبر <code>Intl.NumberFormat</code>',
    v40_g1_i4: 'محدد اللغة في الإعدادات — حفظ دائم في <code>localStorage</code>',

    v40_g2_title: '📊 تعدد المنصات والديسنتراليزد',
    v40_g2_i1: 'شريط مقارنة <strong>Bybit + OKX</strong> مقابل Binance في الوقت الفعلي (استطلاع REST كل 5 ثوانٍ)',
    v40_g2_i2: 'تكامل <strong>GeckoTerminal</strong> — البحث عن مجمعات السيولة وعرض مخططات OHLCV (Ethereum، BSC، Solana، Arbitrum، Base…)',
    v40_g2_i3: '<code>TradingChartDEX</code> — محول معزول باستطلاع 60 ثانية وشارة الشبكة/المنصة',

    v40_g3_title: '🔥 خريطة حرارة التصفية',
    v40_g3_i1: 'بث <code>@forceOrder</code> من Binance Futures — طبقة Canvas في الوقت الفعلي بدون مفتاح API',
    v40_g3_i2: 'أشرطة حمراء (تصفية المشترين) / خضراء (تصفية البائعين) حسب مستوى السعر',
    v40_g3_i3: 'لوحة البث المباشر لآخر 8 عمليات تصفية مع المبالغ بالدولار',

    v40_g4_title: '♿ إمكانية الوصول (WCAG 2.1)',
    v40_g4_i1: '<code>FocusTrap</code> على جميع النوافذ المنبثقة — تنقل كامل بلوحة المفاتيح',
    v40_g4_i2: '<code>ArrowKeyNav</code> على قوائم السياق والقوائم',
    v40_g4_i3: 'رابط التخطي وأدوار ARIA والمناطق الحية و<code>aria-label</code> الشاملة',
    v40_g4_i4: 'دعم RTL كامل عبر حقن CSS ديناميكي <code>rtl.js</code>',

    v37_label: 'ثانوي',
    v37_date:  'مايو 2026',

    v37_g1_title: '🔧 إصلاحات وتحسينات',
    v37_g1_i1: 'إصلاح <strong>الخلل #11</strong>: <code>#resyncChartSeries()</code> يُصدر الآن <code>crypview:series:resynced</code> للحفاظ على مزامنة المؤشرات بعد إخراج FIFO',
    v37_g1_i2: 'إصلاح <strong>الخلل الحرج</strong> في multi.js: <code>this.#setActive = fn</code> غير قانوني → تم استبداله بالحقل الخاص <code>#_objectTreeCallback</code>',
    v37_g1_i3: 'تكامل <code>ChartLiquidations</code> بشكل صحيح في ربط اللوحات المتعددة (كان غائباً → <code>liq</code> معطل في وضع متعدد)',
    v37_g1_i4: 'بحث DEX: إضافة <code>wrap.addEventListener(\'click\', e => e.stopPropagation())</code> لمنع الإغلاق غير المقصود للقائمة المنسدلة',
    v37_g1_i5: '<code>#bindMTFDrawingSync</code>: REPLACE (ليس wrap) — يزيل تراكم ردود الاستدعاء في كل <code>#saveState()</code>',

    v35_label: 'ثانوي',
    v35_date:  'أبريل 2026',

    v35_g1_title: '🗂 مساحات العمل وشجرة الكائنات',
    v35_g1_i1: '<strong>WorkspaceManager</strong> — حفظ/استعادة الحالة الكاملة متعددة اللوحات (الرموز، الإطار الزمني، المؤشرات، المزامنة)',
    v35_g1_i2: '<strong>ObjectTreePanel</strong> — مدير الكائنات الجانبي: الرسومات + المؤشرات مع الإخفاء والقفل والحذف',
    v35_g1_i3: 'اختصار <code>O</code> للتبديل بين لوحة الكائنات، <code>W</code> لمساحات العمل',
    v35_g1_i4: 'التنقل بين التخطيطات مع استعادة مساحة العمل المعلقة (<code>localStorage</code>)',

    v35_g2_title: '📐 مزامنة رسوم MTF',
    v35_g2_i1: 'مزامنة تلقائية للرسومات بين لوحات نفس الرمز',
    v35_g2_i2: 'مفتاح رسم مبني على الرمز: <code>drawKey_btcusdt</code> مشترك بين جميع الأطر الزمنية',

    v34_label: 'ثانوي',
    v34_date:  'مارس 2026',

    v34_g1_title: '📈 التداول الورقي والاختبار الخلفي',
    v34_g1_i1: '<strong>PaperTradingEngine</strong> — محاكاة شراء/بيع مع SL و TP ورسوم 0.1% ومنحنى الأرباح',
    v34_g1_i2: '<strong>Backtester</strong> — محرك اختبار خلفي على تاريخ OHLCV مع 12 إشارة قابلة للتركيب (AND/OR)',
    v34_g1_i3: '<strong>PaperTradingOverlay</strong> — علامات LightweightCharts (▲ BUY، ▼ SELL، ⛔ SL، 🎯 TP)',
    v34_g1_i4: 'مقاييس شارب والسحب الأقصى ومعامل الربح ومعدل الفوز',

    v33_label: 'ثانوي',
    v33_date:  'فبراير 2026',

    v33_g1_title: '⌨️ لوحة الأوامر والمزامنة',
    v33_g1_i1: '<strong>CommandPalette</strong> — بحث عام <code>Ctrl+K</code> أو <code>/</code>: الرموز والمؤشرات والأطر الزمنية والإجراءات',
    v33_g1_i2: '<strong>ChartSync</strong> — مزامنة الشاشة المتقاطعة + التكبير بين N من المخططات (تبديل مستقل)',
    v33_g1_i3: '<strong>RecentSymbols</strong> — سجل آخر 12 زوج تم عرضه',

    v32_label: 'ثانوي',
    v32_date:  'يناير 2026',

    v32_g1_title: '📤 التصدير والملفات الشخصية',
    v32_g1_i1: '<strong>ExportModal</strong> — التقاط PNG (canvas مركّب)، CSV، JSON منظم + رابط مشاركة',
    v32_g1_i2: '<strong>ProfileManager</strong> — 6 إعدادات مسبقة مدمجة + 20 ملفاً مخصصاً (مؤشرات + إطار زمني)',
    v32_g1_i3: 'رأس تصدير غني: الشعار والرمز وشارة الإطار الزمني والسعر الحالي ونقطة مباشرة والتاريخ/الوقت',

    v31_label: 'ثانوي',
    v31_date:  'ديسمبر 2026',

    v31_g1_title: '🔍 ماسح السوق',
    v31_g1_i1: '<strong>ScreenerModal</strong> — 7 تبويبات (الرابحون، الخاسرون، الحجم، الاختراق، القيم المتطرفة، التقلب)',
    v31_g1_i2: 'مقاييس: <code>posInRange</code> و<code>rangePct</code> و<code>distHighPct</code> لكل زوج USDT',
    v31_g1_i3: 'جدول قابل للفرز حسب العمود — تصفية مباشرة مع debounce 120ms',

    v30_label: 'رئيسي',
    v30_date:  'نوفمبر 2026',

    v30_g1_title: '🔔 تنبيهات V2 متعددة الشروط',
    v30_g1_i1: '<strong>AlertManagerV2</strong> — شروط قابلة للتركيب AND/OR: السعر، %، RSI، MACD، ارتفاع الحجم، اختراق N شمعة، عبور خط الاتجاه',
    v30_g1_i2: 'تكرار مع وقت تهدئة قابل للضبط، انتهاء الصلاحية بالطابع الزمني، إيقاف مؤقت فردي',
    v30_g1_i3: 'مزامنة عبر التبويبات عبر <code>BroadcastChannel</code>',
    v30_g1_i4: 'مركز التنبيهات مع تبويبات النشطة / السجل (50 إدخالاً)',

    v29_label: 'ثانوي',
    v29_date:  'أكتوبر 2026',

    v29_g1_title: '✏️ أدوات الرسم — السحب والإفلات',
    v29_g1_i1: 'نقاط الإرساء القابلة للسحب والإفلات على جميع الأدوات (خط الاتجاه، فيبوناتشي، المناطق، المستطيل…)',
    v29_g1_i2: 'إصلاح v2.9.1: الحفاظ على خاصية <code>text</code> لنقاط الإرساء أثناء السحب',
    v29_g1_i3: 'قائمة سياق النقر الأيمن على خط الاتجاه/فيبوناتشي: تنبيهات العبور ↑↓، الحذف',

    v27_label: 'ثانوي',
    v27_date:  'سبتمبر 2026',

    v27_g1_title: '🔔 تنبيهات V1',
    v27_g1_i1: '<strong>AlertPriceModal</strong> — وضعه من المخطط، مملوء مسبقاً بسعر المؤشر',
    v27_g1_i2: 'إشعار OS الأصلي + نغمة مزدوجة عبر Web Audio API',
    v27_g1_i3: 'حفظ دائم في <code>localStorage</code> — يبقى بعد إعادة تحميل الصفحة',

    v20_label: 'رئيسي',
    v20_date:  'يوليو 2026',

    v20_g1_title: '🏗️ إعادة هيكلة المعمارية',
    v20_g1_i1: 'الترحيل إلى <strong>Vite + وحدات ES</strong> — إنهاء وضع CDN العالمي',
    v20_g1_i2: '<strong>WSPool</strong> — مجمع WebSocket مع إزالة التكرار (حتى 200 تدفق / اتصال، 5 اتصالات كحد أقصى)',
    v20_g1_i3: '<strong>متعدد المخططات</strong> العام — N من اللوحات المستقلة (2، 4، 9، V2، V3، 1+2، 1+3)',
    v20_g1_i4: '<strong>Web Worker</strong> للحسابات الثقيلة (Ichimoku، ADX، SuperTrend، MACD)',
    v20_g1_i5: '19 مؤشراً + ملف الحجم والفوتبرينت وتدفق الأوامر',
    v20_g1_i6: 'مظهر فاتح/داكن مع منع الوميض المتزامن',
    v20_g1_i7: 'PWA كامل مع Service Worker وmanifest والاختصارات',

    v10_label: 'أولي',
    v10_date:  'أبريل 2026',

    v10_g1_title: '🚀 الإطلاق',
    v10_g1_i1: 'مخططات الشموع اليابانية — Binance WebSocket مباشر',
    v10_g1_i2: 'البحث عن أزواج USDT + أطر زمنية من 1 ثانية إلى شهر',
    v10_g1_i3: 'الشريط الجانبي للصفقات في الوقت الفعلي',
    v10_g1_i4: '10 مؤشرات (RSI، MACD، بولينجر، MA، VWAP…)',

    timelineEnd: 'أصل المشروع',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'الأسئلة الشائعة',
    footCookies: 'ملفات تعريف الارتباط',
    footPrivacy: 'الخصوصية',
    footRisks:   'المخاطر',
    footHome:    'الرئيسية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CHANGELOG_I18N;
}
