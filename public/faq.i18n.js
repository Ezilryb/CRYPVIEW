// ============================================================
//  public/faq.i18n.js — CrypView i18n
//  Traductions de la page FAQ (faq.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans faq.html :
//    <script src="public/faq.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = FAQ_I18N[locale] || FAQ_I18N.en;
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

const FAQ_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    pageTitle: 'FAQ — CrypView',
    metaDesc:  'Frequently asked questions about CrypView: data, indicators, alerts, Paper Trading, privacy and more.',

    navBack: '← Back to home',

    pageTag:  'Help',
    h1:       'Frequently Asked Questions',
    pageMeta: 'Last updated: April 2026 · CrypView — Beta Capital Enterprise',
    pageSub:  'Can\'t find your answer? Check the <a href="wiki.html">Wiki</a> for complete documentation.',

    // Search placeholder
    searchPlaceholder: 'Search a question…',
    searchNoResult: 'No question matches your search.',

    // Categories
    cat_general:     'General',
    cat_data:        'Data & Charts',
    cat_indicators:  'Indicators',
    cat_alerts:      'Alerts',
    cat_trading:     'Paper Trading & Backtesting',
    cat_technical:   'Technical & Privacy',

    // ── General ──────────────────────────────────────────────
    q_what_is_crypview:   'What is CrypView?',
    a_what_is_crypview:   'CrypView is a free, 100% client-side web application for real-time cryptocurrency technical analysis. It displays candlestick charts, 19+ technical indicators and advanced tools (Footprint, Volume Profile, Orderflow Delta) from the Binance public API — with no registration or server required.',

    q_is_free:    'Is CrypView free?',
    a_is_free:    'Yes, completely. CrypView is free and open-source (MIT license). No subscription, no premium plan, no hidden fees. The source code is available on GitHub.',

    q_registration: 'Do I need to create an account?',
    a_registration: 'No. CrypView requires no mandatory registration, no email and no password. Open the page and you\'re ready to go — all settings are saved locally in your browser.',

    q_install: 'Can I install CrypView on my device?',
    a_install: 'Yes. CrypView is a Progressive Web App (PWA). In Chrome/Edge, click the ⊞ icon in the address bar → Install. On iOS Safari, tap Share → Add to Home Screen. It will open in a standalone window just like a native app.',

    q_mobile: 'Does CrypView work on mobile?',
    a_mobile: 'Yes. CrypView is fully responsive and can be installed as a PWA on iOS and Android. Some advanced features (multi-charts, Footprint) are more comfortable on a larger screen.',

    q_languages: 'What languages are available?',
    a_languages: 'CrypView supports 4 languages: English, Français, 中文 (Simplified Chinese) and العربية (Arabic, with full RTL support). Change the language in Settings or via the language selector in the navigation bar.',

    // ── Data & Charts ─────────────────────────────────────────
    q_data_source: 'Where does the market data come from?',
    a_data_source: 'Price data comes directly from the Binance public API (REST + WebSocket). DEX data comes from GeckoTerminal. CrypView has no backend server — your browser connects directly to these APIs. The data is as accurate and live as Binance itself.',

    q_data_delay: 'Is the data in real time?',
    a_data_delay: 'Yes. Candlestick data and price updates arrive via WebSocket from Binance with no additional delay. The 1-second timeframe is synthesized locally from aggTrade streams. DEX (GeckoTerminal) data refreshes every 60 seconds due to API limits.',

    q_pairs: 'Which trading pairs are available?',
    a_pairs: 'All active USDT pairs listed on Binance Spot — 500+ pairs at launch, loaded at startup. For DEX, any pool indexed by GeckoTerminal on Ethereum, BSC, Solana, Arbitrum, Base, Polygon, Avalanche and more.',

    q_timeframes: 'Which timeframes are supported?',
    a_timeframes: '15 timeframes: 1s · 1m · 3m · 5m · 15m · 30m · 1h · 2h · 4h · 6h · 12h · 1d · 3d · 1w · 1M. Press T to cycle through them.',

    q_chart_types: 'Which chart types are available?',
    a_chart_types: 'Candlesticks (default), Heikin-Ashi, Line and Bar charts — selectable from the right-click context menu.',

    q_dex: 'How do I access DEX charts?',
    a_dex: 'Right-click on the chart → DEX, or click the 🔗 DEX button. Search by token name (e.g. PEPE) or contract address. Select the network and pool you want. Data refreshes every 60 seconds.',

    q_multi: 'How do I open multiple charts at once?',
    a_multi: 'Right-click → Multi-Charts, or use the layout links on the home page. Available layouts: Multi 2 (side by side), Multi 4 (2×2), Multi 9 (3×3), Vertical 2, Vertical 3, Asymmetric 1+2 and 1+3.',

    // ── Indicators ────────────────────────────────────────────
    q_how_add_indicator: 'How do I add an indicator?',
    a_how_add_indicator: 'Right-click on the chart → Indicators → Choose indicators. Or press I. Indicators are grouped into Trend, Momentum, Volatility and Volume categories and are searchable.',

    q_how_many_indicators: 'How many indicators are available?',
    a_how_many_indicators: 'Over 19: MA 20/50/200, EMA 8/13/21, DEMA, HMA, VWAP, Ichimoku, SuperTrend, Keltner Channels, Parabolic SAR, Donchian, Linear Regression Channel, Pivot Points, RSI, MACD, Stochastic, CCI, ADX+DI, Williams %R, Momentum, TRIX, Squeeze Momentum, Elder Ray, Bollinger Bands, ATR, MFI, OBV, CMF, Open Interest, Funding Rate, Long/Short Ratio.',

    q_heavy_indicators: 'Some indicators are slow to load — is that normal?',
    a_heavy_indicators: 'Yes. Heavy indicators (Ichimoku, ADX, SuperTrend, MACD) are calculated in a Web Worker to keep the chart smooth. They may take 1–2 seconds to appear on very long timeframes or large datasets.',

    q_profiles: 'What are indicator profiles?',
    a_profiles: 'Profiles save a combination of active indicators + current timeframe. 6 built-in presets (Scalping, Swing, Volume, Orderflow, Momentum, Volatility) + up to 20 custom profiles. Access via right-click → Indicators → Profiles & Presets.',

    // ── Alerts ────────────────────────────────────────────────
    q_create_alert: 'How do I create a price alert?',
    a_create_alert: 'Right-click on the chart at the desired price level → Alerts → New alert. The price field is pre-filled with the cursor price. You can also set complex multi-condition alerts from the alert creation panel.',

    q_alert_notify: 'How am I notified when an alert triggers?',
    a_alert_notify: 'Two ways simultaneously: a native OS notification (requires one-time browser permission) and an audio double-tone via Web Audio API. The alert also appears in the Alert Center.',

    q_alert_conditions: 'What conditions can I set on alerts?',
    a_alert_conditions: 'Price above/below, rise/drop ≥ %, volume spike ≥ ×, RSI ≥/≤, MACD bullish/bearish crossover, N-candle breakout high/low, trendline crossover ↑↓. Multiple conditions can be combined with AND or OR logic.',

    q_alert_background: 'Do alerts work with the tab in the background?',
    a_alert_background: 'Yes, as long as the browser tab remains open (even minimized or in the background). Alerts do not work if the tab is closed or the browser is shut down. CrypView has no server to send push notifications independently.',

    q_alert_persist: 'Are alerts saved if I close the browser?',
    a_alert_persist: 'Yes. Alerts are saved in localStorage (key: crypview_alerts_v3) and are restored automatically when you reopen CrypView — as long as you use the same browser and device.',

    // ── Paper Trading & Backtesting ───────────────────────────
    q_paper_what: 'What is Paper Trading?',
    a_paper_what: 'Paper Trading is a risk-free simulation engine. You start with a virtual 10,000 USDT account and can open Long/Short positions with optional Stop-Loss and Take-Profit — at the real live price, but with no real money involved. Access via right-click → Tools → Paper Trading.',

    q_paper_real: 'Can Paper Trading results be used to predict real trading?',
    a_paper_real: 'No. Paper Trading does not model slippage, liquidity constraints, emotional pressure or real execution prices. Results obtained in simulation cannot be extrapolated to real trading. See the Risk Disclaimer for details.',

    q_backtest_what: 'What is Backtesting?',
    a_backtest_what: 'Backtesting runs a strategy on historical OHLCV candles loaded in the chart. You define entry/exit signals (RSI, MACD, Bollinger, VWAP…), side, Stop-Loss %, Take-Profit % and capital per trade. The engine returns Win Rate, P&L, Sharpe Ratio, Max Drawdown and Profit Factor.',

    q_backtest_reliable: 'Are backtest results reliable?',
    a_backtest_reliable: 'Backtests are indicative only. They are subject to survivorship bias (you chose the asset after seeing its history), overfitting (the strategy may be over-tuned to past data) and do not include real slippage or liquidity. Always validate out-of-sample.',

    // ── Technical & Privacy ───────────────────────────────────
    q_data_collection: 'Does CrypView collect my personal data?',
    a_data_collection: 'No. CrypView is 100% client-side and has no backend server. No personal data is collected, transmitted or stored by CrypView. All your settings (theme, alerts, drawings, paper trading) are saved exclusively in your browser\'s localStorage. See the Privacy Policy for full details.',

    q_local_storage: 'What is stored in my browser?',
    a_local_storage: 'Theme preference (crypview-theme), language (crypview_locale), price alerts (crypview_alerts_v3), multi-chart panel state (crypview_multi*_state_v1), Paper Trading account (crypview_paper_v1), chart drawings (drawKey_{symbol}), workspaces (crypview_workspaces) and indicator profiles (crypview_profiles).',

    q_delete_data: 'How do I delete my data?',
    a_delete_data: 'Open your browser DevTools (F12) → Application → Local Storage → clear all keys starting with crypview_. Or clear all browser cache and browsing data from your browser settings. Using private/incognito mode prevents any data from being saved.',

    q_offline: 'Does CrypView work offline?',
    a_offline: 'Partially. Static assets (HTML, CSS, JS, fonts) are cached by the Service Worker and available offline. Live market data and chart history require an active internet connection.',

    q_api_key: 'Do I need a Binance API key?',
    a_api_key: 'No. CrypView uses only Binance\'s public API endpoints — no API key is required. You do not need a Binance account to use CrypView.',

    q_investment_advice: 'Does CrypView give investment advice?',
    a_investment_advice: 'No. CrypView is an analysis and information tool only. It does not provide buy/sell recommendations, trading signals or personalized financial advice. All investment decisions are yours alone. Please consult a licensed financial advisor before investing.',

    // Footer
    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Privacy',
    footTerms:   'Terms',
    footRisks:   'Risks',
    footHome:    'Home',

    // Links
    wikiLink: 'Wiki',
    risksLink: 'Risk Disclaimer',
    privacyLink: 'Privacy Policy',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'FAQ — CrypView',
    metaDesc:  'Questions fréquentes sur CrypView : données, indicateurs, alertes, Paper Trading, confidentialité et plus.',

    navBack: '← Retour à l\'accueil',

    pageTag:  'Aide',
    h1:       'Questions fréquentes',
    pageMeta: 'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',
    pageSub:  'Vous ne trouvez pas votre réponse ? Consultez le <a href="wiki.html">Wiki</a> pour la documentation complète.',

    searchPlaceholder: 'Rechercher une question…',
    searchNoResult: 'Aucune question ne correspond à votre recherche.',

    cat_general:     'Général',
    cat_data:        'Données & Graphiques',
    cat_indicators:  'Indicateurs',
    cat_alerts:      'Alertes',
    cat_trading:     'Paper Trading & Backtesting',
    cat_technical:   'Technique & Confidentialité',

    q_what_is_crypview:   'Qu\'est-ce que CrypView ?',
    a_what_is_crypview:   'CrypView est une application web gratuite, 100% côté client, d\'analyse technique de cryptomonnaies en temps réel. Elle affiche des graphiques en chandeliers, 19+ indicateurs techniques et des outils avancés (Footprint, Volume Profile, Orderflow Delta) issus de l\'API publique Binance — sans inscription ni serveur requis.',

    q_is_free:    'CrypView est-il gratuit ?',
    a_is_free:    'Oui, entièrement. CrypView est gratuit et open-source (licence MIT). Aucun abonnement, aucun plan premium, aucun frais caché. Le code source est disponible sur GitHub.',

    q_registration: 'Dois-je créer un compte ?',
    a_registration: 'Non. CrypView ne requiert aucune inscription obligatoire, aucune adresse e-mail et aucun mot de passe. Ouvrez la page et vous êtes prêt — tous les réglages sont sauvegardés localement dans votre navigateur.',

    q_install: 'Puis-je installer CrypView sur mon appareil ?',
    a_install: 'Oui. CrypView est une Progressive Web App (PWA). Sur Chrome/Edge, cliquez sur l\'icône ⊞ dans la barre d\'adresse → Installer. Sur iOS Safari, appuyez sur Partager → Sur l\'écran d\'accueil. Il s\'ouvrira dans une fenêtre autonome comme une application native.',

    q_mobile: 'CrypView fonctionne-t-il sur mobile ?',
    a_mobile: 'Oui. CrypView est entièrement responsive et peut être installé en PWA sur iOS et Android. Certaines fonctionnalités avancées (multi-charts, Footprint) sont plus confortables sur un écran plus grand.',

    q_languages: 'Quelles langues sont disponibles ?',
    a_languages: 'CrypView supporte 4 langues : English, Français, 中文 (chinois simplifié) et العربية (arabe, avec support RTL complet). Changez la langue dans les Paramètres ou via le sélecteur de langue dans la barre de navigation.',

    q_data_source: 'D\'où proviennent les données de marché ?',
    a_data_source: 'Les données de prix proviennent directement de l\'API publique Binance (REST + WebSocket). Les données DEX viennent de GeckoTerminal. CrypView n\'a pas de serveur backend — votre navigateur se connecte directement à ces APIs. Les données sont aussi précises et en temps réel que Binance lui-même.',

    q_data_delay: 'Les données sont-elles en temps réel ?',
    a_data_delay: 'Oui. Les données de chandeliers et les mises à jour de prix arrivent via WebSocket depuis Binance sans délai supplémentaire. Le timeframe 1 seconde est synthétisé localement depuis les flux aggTrade. Les données DEX (GeckoTerminal) se rafraîchissent toutes les 60 secondes en raison des limites de l\'API.',

    q_pairs: 'Quelles paires de trading sont disponibles ?',
    a_pairs: 'Toutes les paires USDT actives listées sur Binance Spot — 500+ paires au lancement, chargées au démarrage. Pour les DEX, tous les pools indexés par GeckoTerminal sur Ethereum, BSC, Solana, Arbitrum, Base, Polygon, Avalanche et plus.',

    q_timeframes: 'Quels timeframes sont supportés ?',
    a_timeframes: '15 timeframes : 1s · 1m · 3m · 5m · 15m · 30m · 1h · 2h · 4h · 6h · 12h · 1d · 3d · 1w · 1M. Appuyez sur T pour les parcourir.',

    q_chart_types: 'Quels types de graphiques sont disponibles ?',
    a_chart_types: 'Chandeliers japonais (défaut), Heikin-Ashi, Ligne et Barres — sélectionnables depuis le menu contextuel (clic droit).',

    q_dex: 'Comment accéder aux graphiques DEX ?',
    a_dex: 'Clic droit → DEX, ou cliquez sur le bouton 🔗 DEX. Cherchez par nom de token (ex. PEPE) ou adresse de contrat. Sélectionnez le réseau et le pool souhaité. Les données se rafraîchissent toutes les 60 secondes.',

    q_multi: 'Comment ouvrir plusieurs graphiques en même temps ?',
    a_multi: 'Clic droit → Multi-Charts, ou utilisez les liens de layout sur la page d\'accueil. Layouts disponibles : Multi 2 (côte à côte), Multi 4 (2×2), Multi 9 (3×3), Vertical 2, Vertical 3, Asymétrique 1+2 et 1+3.',

    q_how_add_indicator: 'Comment ajouter un indicateur ?',
    a_how_add_indicator: 'Clic droit → Indicateurs → Choisir des indicateurs. Ou appuyez sur I. Les indicateurs sont regroupés en catégories Tendance, Momentum, Volatilité et Volume, et sont recherchables.',

    q_how_many_indicators: 'Combien d\'indicateurs sont disponibles ?',
    a_how_many_indicators: 'Plus de 19 : MA 20/50/200, EMA 8/13/21, DEMA, HMA, VWAP, Ichimoku, SuperTrend, Canaux de Keltner, Parabolic SAR, Donchian, Régression Linéaire, Points Pivots, RSI, MACD, Stochastique, CCI, ADX+DI, Williams %R, Momentum, TRIX, Squeeze Momentum, Elder Ray, Bandes de Bollinger, ATR, MFI, OBV, CMF, Open Interest, Funding Rate, Ratio Long/Short.',

    q_heavy_indicators: 'Certains indicateurs sont lents à charger — est-ce normal ?',
    a_heavy_indicators: 'Oui. Les indicateurs lourds (Ichimoku, ADX, SuperTrend, MACD) sont calculés dans un Web Worker pour garder le graphique fluide. Ils peuvent prendre 1 à 2 secondes à apparaître sur des timeframes très longs ou des jeux de données volumineux.',

    q_profiles: 'Qu\'est-ce que les profils d\'indicateurs ?',
    a_profiles: 'Les profils sauvegardent une combinaison d\'indicateurs actifs + le timeframe courant. 6 presets intégrés (Scalping, Swing, Volume, Orderflow, Momentum, Volatilité) + jusqu\'à 20 profils personnalisés. Accès via clic droit → Indicateurs → Profils & Presets.',

    q_create_alert: 'Comment créer une alerte de prix ?',
    a_create_alert: 'Clic droit sur le graphique au niveau de prix souhaité → Alertes → Nouvelle alerte. Le champ de prix est pré-rempli avec le prix du curseur. Vous pouvez aussi définir des alertes multi-conditions complexes depuis le panneau de création.',

    q_alert_notify: 'Comment suis-je notifié quand une alerte se déclenche ?',
    a_alert_notify: 'De deux façons simultanément : une notification OS native (nécessite une autorisation navigateur unique) et un double-ton audio via Web Audio API. L\'alerte apparaît également dans le Centre d\'alertes.',

    q_alert_conditions: 'Quelles conditions puis-je définir sur les alertes ?',
    a_alert_conditions: 'Prix au-dessus/en dessous, hausse/baisse ≥ %, pic de volume ≥ ×, RSI ≥/≤, croisement haussier/baissier MACD, breakout haut/bas N-bougies, croisement de trendline ↑↓. Plusieurs conditions peuvent être combinées avec la logique AND ou OR.',

    q_alert_background: 'Les alertes fonctionnent-elles avec l\'onglet en arrière-plan ?',
    a_alert_background: 'Oui, tant que l\'onglet du navigateur reste ouvert (même minimisé ou en arrière-plan). Les alertes ne fonctionnent pas si l\'onglet est fermé ou le navigateur éteint. CrypView n\'a pas de serveur pour envoyer des notifications push de manière indépendante.',

    q_alert_persist: 'Les alertes sont-elles sauvegardées si je ferme le navigateur ?',
    a_alert_persist: 'Oui. Les alertes sont sauvegardées dans le localStorage (clé : crypview_alerts_v3) et sont restaurées automatiquement à la réouverture de CrypView — à condition d\'utiliser le même navigateur et appareil.',

    q_paper_what: 'Qu\'est-ce que le Paper Trading ?',
    a_paper_what: 'Le Paper Trading est un moteur de simulation sans risque. Vous démarrez avec un compte virtuel de 10 000 USDT et pouvez ouvrir des positions Long/Short avec Stop-Loss et Take-Profit optionnels — au prix live réel, mais sans argent réel. Accès via clic droit → Outils → Paper Trading.',

    q_paper_real: 'Les résultats du Paper Trading peuvent-ils être utilisés pour prédire le trading réel ?',
    a_paper_real: 'Non. Le Paper Trading ne modélise pas le slippage, les contraintes de liquidité, la pression émotionnelle ni les prix d\'exécution réels. Les résultats obtenus en simulation ne peuvent pas être extrapolés au trading réel. Consultez l\'Avertissement sur les risques pour plus de détails.',

    q_backtest_what: 'Qu\'est-ce que le Backtesting ?',
    a_backtest_what: 'Le Backtesting exécute une stratégie sur les bougies OHLCV historiques chargées dans le graphique. Vous définissez des signaux d\'entrée/sortie (RSI, MACD, Bollinger, VWAP…), le sens, le Stop-Loss %, le Take-Profit % et le capital par trade. Le moteur retourne Win Rate, P&L, Ratio de Sharpe, Max Drawdown et Profit Factor.',

    q_backtest_reliable: 'Les résultats de backtest sont-ils fiables ?',
    a_backtest_reliable: 'Les backtests sont indicatifs seulement. Ils sont sujets au biais de survie (vous avez choisi l\'actif après avoir vu son historique), au surapprentissage (la stratégie peut être sur-calibrée sur les données passées) et n\'incluent pas le slippage ni la liquidité réels. Validez toujours hors échantillon.',

    q_data_collection: 'CrypView collecte-t-il mes données personnelles ?',
    a_data_collection: 'Non. CrypView est 100% côté client et n\'a pas de serveur backend. Aucune donnée personnelle n\'est collectée, transmise ou stockée par CrypView. Tous vos réglages (thème, alertes, tracés, paper trading) sont sauvegardés exclusivement dans le localStorage de votre navigateur. Consultez la Politique de confidentialité pour tous les détails.',

    q_local_storage: 'Qu\'est-ce qui est stocké dans mon navigateur ?',
    a_local_storage: 'Préférence de thème (crypview-theme), langue (crypview_locale), alertes de prix (crypview_alerts_v3), état des panneaux multi-charts (crypview_multi*_state_v1), compte Paper Trading (crypview_paper_v1), tracés sur le graphique (drawKey_{symbole}), workspaces (crypview_workspaces) et profils d\'indicateurs (crypview_profiles).',

    q_delete_data: 'Comment supprimer mes données ?',
    a_delete_data: 'Ouvrez les DevTools de votre navigateur (F12) → Application → Local Storage → effacez toutes les clés commençant par crypview_. Ou videz le cache et les données de navigation depuis les paramètres de votre navigateur. L\'utilisation du mode navigation privée empêche toute sauvegarde.',

    q_offline: 'CrypView fonctionne-t-il hors ligne ?',
    a_offline: 'Partiellement. Les ressources statiques (HTML, CSS, JS, polices) sont mises en cache par le Service Worker et disponibles hors ligne. Les données de marché en direct et l\'historique des graphiques nécessitent une connexion internet active.',

    q_api_key: 'Ai-je besoin d\'une clé API Binance ?',
    a_api_key: 'Non. CrypView utilise uniquement les endpoints publics de l\'API Binance — aucune clé API n\'est requise. Vous n\'avez pas besoin d\'un compte Binance pour utiliser CrypView.',

    q_investment_advice: 'CrypView donne-t-il des conseils en investissement ?',
    a_investment_advice: 'Non. CrypView est uniquement un outil d\'analyse et d\'information. Il ne fournit pas de recommandations d\'achat/vente, de signaux de trading ni de conseils financiers personnalisés. Toutes les décisions d\'investissement vous appartiennent. Consultez un conseiller financier agréé avant d\'investir.',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Confidentialité',
    footTerms:   'Conditions',
    footRisks:   'Risques',
    footHome:    'Accueil',

    wikiLink:    'Wiki',
    risksLink:   'Avertissement sur les risques',
    privacyLink: 'Politique de confidentialité',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: '常见问题 — CrypView',
    metaDesc:  'CrypView 常见问题：数据、指标、提醒、模拟交易、隐私等。',

    navBack: '← 返回首页',

    pageTag:  '帮助',
    h1:       '常见问题',
    pageMeta: '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',
    pageSub:  '找不到答案？查看 <a href="wiki.html">Wiki</a> 获取完整文档。',

    searchPlaceholder: '搜索问题…',
    searchNoResult: '没有符合您搜索的问题。',

    cat_general:     '一般问题',
    cat_data:        '数据与图表',
    cat_indicators:  '技术指标',
    cat_alerts:      '价格提醒',
    cat_trading:     '模拟交易与回测',
    cat_technical:   '技术与隐私',

    q_what_is_crypview:   'CrypView 是什么？',
    a_what_is_crypview:   'CrypView 是一款免费的、100%客户端的加密货币实时技术分析网络应用。它通过币安公共API显示K线图、19+技术指标和高级工具（足迹图、成交量分布、订单流Delta）——无需注册，无需服务器。',

    q_is_free:    'CrypView 是免费的吗？',
    a_is_free:    '是的，完全免费。CrypView 是免费且开源的（MIT许可证）。没有订阅费、没有高级计划、没有隐藏费用。源代码可在 GitHub 上获取。',

    q_registration: '我需要创建账户吗？',
    a_registration: '不需要。CrypView 无需注册、无需电子邮件、无需密码。打开页面即可使用——所有设置都保存在您的浏览器本地。',

    q_install: '我可以在设备上安装 CrypView 吗？',
    a_install: '可以。CrypView 是渐进式网络应用（PWA）。在 Chrome/Edge 中，点击地址栏中的 ⊞ 图标 → 安装。在 iOS Safari 上，点击分享 → 添加到主屏幕。它将像原生应用一样在独立窗口中打开。',

    q_mobile: 'CrypView 支持手机使用吗？',
    a_mobile: '支持。CrypView 完全响应式，可在 iOS 和 Android 上安装为 PWA。某些高级功能（多图模式、足迹图）在更大的屏幕上更为舒适。',

    q_languages: '支持哪些语言？',
    a_languages: 'CrypView 支持4种语言：English、Français、中文（简体中文）和العربية（阿拉伯语，完整RTL支持）。在设置中或通过导航栏中的语言选择器更改语言。',

    q_data_source: '市场数据来自哪里？',
    a_data_source: '价格数据直接来自币安公共API（REST + WebSocket）。DEX数据来自 GeckoTerminal。CrypView 没有后端服务器——您的浏览器直接连接这些API。数据与币安本身一样准确和实时。',

    q_data_delay: '数据是实时的吗？',
    a_data_delay: '是的。K线数据和价格更新通过WebSocket从币安实时传输，无额外延迟。1秒时间框架由 aggTrade 流在本地合成。由于API限制，DEX（GeckoTerminal）数据每60秒刷新一次。',

    q_pairs: '支持哪些交易对？',
    a_pairs: '币安现货上所有活跃的USDT交易对——启动时加载500+个交易对。DEX方面，支持 GeckoTerminal 在以太坊、BSC、Solana、Arbitrum、Base、Polygon、Avalanche等网络上索引的任何流动池。',

    q_timeframes: '支持哪些时间框架？',
    a_timeframes: '15个时间框架：1s · 1m · 3m · 5m · 15m · 30m · 1h · 2h · 4h · 6h · 12h · 1d · 3d · 1w · 1M。按T键循环切换。',

    q_chart_types: '支持哪些图表类型？',
    a_chart_types: '日本蜡烛图（默认）、平均K线（Heikin-Ashi）、折线图和条形图——可在右键菜单中选择。',

    q_dex: '如何访问DEX图表？',
    a_dex: '右键点击图表 → DEX，或点击 🔗 DEX 按钮。通过代币名称（如PEPE）或合约地址搜索。选择所需的网络和流动池。数据每60秒刷新。',

    q_multi: '如何同时打开多个图表？',
    a_multi: '右键点击 → 多图模式，或使用首页上的布局链接。可用布局：Multi 2（并排）、Multi 4（2×2）、Multi 9（3×3）、垂直2图、垂直3图、非对称1+2和1+3。',

    q_how_add_indicator: '如何添加指标？',
    a_how_add_indicator: '右键点击图表 → 指标 → 选择指标。或按I键。指标按趋势、动量、波动率和成交量分类，支持搜索。',

    q_how_many_indicators: '有多少个指标可用？',
    a_how_many_indicators: '超过19个：MA 20/50/200、EMA 8/13/21、DEMA、HMA、VWAP、Ichimoku、SuperTrend、Keltner通道、Parabolic SAR、Donchian、线性回归通道、Pivot Points、RSI、MACD、Stochastic、CCI、ADX+DI、Williams %R、Momentum、TRIX、Squeeze Momentum、Elder Ray、布林带、ATR、MFI、OBV、CMF、未平仓合约、资金费率、多空比。',

    q_heavy_indicators: '某些指标加载较慢——这正常吗？',
    a_heavy_indicators: '正常。较重的指标（Ichimoku、ADX、SuperTrend、MACD）在Web Worker中计算以保持图表流畅。在非常长的时间框架或大数据集上可能需要1-2秒才能显示。',

    q_profiles: '什么是指标配置方案？',
    a_profiles: '配置方案保存活跃指标组合+当前时间框架。6个内置预设（Scalping、Swing、Volume、Orderflow、Momentum、Volatility）+ 最多20个自定义方案。通过右键点击 → 指标 → 配置方案与预设访问。',

    q_create_alert: '如何创建价格提醒？',
    a_create_alert: '在图表上所需价格位置右键点击 → 提醒 → 新建提醒。价格字段将自动填充光标处价格。您也可以从提醒创建面板设置复杂的多条件提醒。',

    q_alert_notify: '提醒触发时如何通知我？',
    a_alert_notify: '两种方式同时触发：原生OS通知（需要一次性浏览器权限）和通过Web Audio API的双音提示音。提醒也会出现在提醒中心。',

    q_alert_conditions: '提醒可以设置哪些条件？',
    a_alert_conditions: '价格高于/低于、涨跌幅 ≥ %、成交量激增 ≥ 倍数、RSI ≥/≤、MACD多头/空头交叉、N根K线突破高低点、趋势线穿越↑↓。多个条件可用AND或OR逻辑组合。',

    q_alert_background: '标签页在后台时提醒仍有效吗？',
    a_alert_background: '是的，只要浏览器标签页保持打开（即使最小化或在后台）。如果标签页关闭或浏览器关闭则提醒不工作。CrypView没有服务器来独立发送推送通知。',

    q_alert_persist: '关闭浏览器后提醒是否保存？',
    a_alert_persist: '是的。提醒保存在localStorage中（键名：crypview_alerts_v3），重新打开CrypView时自动恢复——前提是使用相同的浏览器和设备。',

    q_paper_what: '什么是模拟交易？',
    a_paper_what: '模拟交易是一个无风险的模拟引擎。您以10,000 USDT虚拟账户开始，可以以实际实时价格开多/空仓位（可选止损和止盈）——但不涉及真实资金。通过右键点击 → 工具 → 模拟交易访问。',

    q_paper_real: '模拟交易结果可以用于预测真实交易吗？',
    a_paper_real: '不能。模拟交易不模拟滑点、流动性限制、情绪压力或真实执行价格。模拟环境中获得的结果不能外推到真实交易。详情请参见风险声明。',

    q_backtest_what: '什么是回测？',
    a_backtest_what: '回测在图表中加载的历史OHLCV K线上运行策略。您定义进出场信号（RSI、MACD、布林带、VWAP…）、方向、止损%、止盈%和每笔交易资金。引擎返回胜率、盈亏、夏普比率、最大回撤和盈亏比。',

    q_backtest_reliable: '回测结果可靠吗？',
    a_backtest_reliable: '回测仅供参考。它们受幸存者偏差（您在看到历史后才选择该资产）、过度拟合（策略可能过度优化历史数据）影响，且不包括真实滑点或流动性。始终进行样本外验证。',

    q_data_collection: 'CrypView 收集我的个人数据吗？',
    a_data_collection: '不收集。CrypView 是100%客户端应用，没有后端服务器。CrypView不收集、传输或存储任何个人数据。所有设置（主题、提醒、绘图、模拟交易）仅保存在您浏览器的localStorage中。完整详情请参见隐私政策。',

    q_local_storage: '我的浏览器中存储了什么？',
    a_local_storage: '主题偏好（crypview-theme）、语言（crypview_locale）、价格提醒（crypview_alerts_v3）、多图面板状态（crypview_multi*_state_v1）、模拟交易账户（crypview_paper_v1）、图表绘图（drawKey_{交易对}）、工作区（crypview_workspaces）和指标配置方案（crypview_profiles）。',

    q_delete_data: '如何删除我的数据？',
    a_delete_data: '打开浏览器开发者工具（F12）→ 应用程序 → 本地存储 → 清除所有以 crypview_ 开头的键。或从浏览器设置清除所有缓存和浏览数据。使用无痕/隐私模式可防止任何数据被保存。',

    q_offline: 'CrypView 支持离线使用吗？',
    a_offline: '部分支持。静态资源（HTML、CSS、JS、字体）由Service Worker缓存，可离线访问。实时市场数据和图表历史需要活跃的网络连接。',

    q_api_key: '我需要币安API密钥吗？',
    a_api_key: '不需要。CrypView仅使用币安的公共API端点——无需API密钥。您无需币安账户即可使用CrypView。',

    q_investment_advice: 'CrypView 提供投资建议吗？',
    a_investment_advice: '不提供。CrypView仅是分析和信息工具，不提供买卖建议、交易信号或个性化财务建议。所有投资决策由您自己做出。请在投资前咨询持牌财务顾问。',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookie政策',
    footPrivacy: '隐私政策',
    footTerms:   '服务条款',
    footRisks:   '风险提示',
    footHome:    '首页',

    wikiLink:    'Wiki',
    risksLink:   '风险声明',
    privacyLink: '隐私政策',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'الأسئلة الشائعة — CrypView',
    metaDesc:  'الأسئلة الشائعة حول CrypView: البيانات والمؤشرات والتنبيهات والتداول الورقي والخصوصية والمزيد.',

    navBack: '→ العودة إلى الرئيسية',

    pageTag:  'مساعدة',
    h1:       'الأسئلة الشائعة',
    pageMeta: 'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',
    pageSub:  'لم تجد إجابتك؟ راجع <a href="wiki.html">الويكي</a> للحصول على التوثيق الكامل.',

    searchPlaceholder: 'ابحث عن سؤال…',
    searchNoResult: 'لا يوجد سؤال يطابق بحثك.',

    cat_general:     'عام',
    cat_data:        'البيانات والرسوم البيانية',
    cat_indicators:  'المؤشرات التقنية',
    cat_alerts:      'التنبيهات',
    cat_trading:     'التداول الورقي والاختبار الخلفي',
    cat_technical:   'تقني وخصوصية',

    q_what_is_crypview:   'ما هو CrypView؟',
    a_what_is_crypview:   'CrypView تطبيق ويب مجاني، 100% على جانب العميل، لتحليل تقني للعملات المشفرة في الوقت الفعلي. يعرض مخططات الشموع اليابانية، أكثر من 19 مؤشراً تقنياً وأدوات متقدمة (مخطط الفوتبرينت، ملف الحجم، تدفق الأوامر Delta) من API Binance العام — دون تسجيل أو خادم.',

    q_is_free:    'هل CrypView مجاني؟',
    a_is_free:    'نعم، تماماً. CrypView مجاني ومفتوح المصدر (رخصة MIT). لا اشتراك، لا خطة مميزة، لا رسوم خفية. الكود المصدري متاح على GitHub.',

    q_registration: 'هل أحتاج إلى إنشاء حساب؟',
    a_registration: 'لا. CrypView لا يتطلب أي تسجيل أو بريد إلكتروني أو كلمة مرور. افتح الصفحة وابدأ — جميع الإعدادات محفوظة محلياً في متصفحك.',

    q_install: 'هل يمكنني تثبيت CrypView على جهازي؟',
    a_install: 'نعم. CrypView تطبيق ويب تقدمي (PWA). في Chrome/Edge، انقر على أيقونة ⊞ في شريط العنوان ← تثبيت. على iOS Safari، انقر مشاركة ← إضافة إلى الشاشة الرئيسية. سيفتح في نافذة مستقلة مثل التطبيق الأصلي.',

    q_mobile: 'هل يعمل CrypView على الجوال؟',
    a_mobile: 'نعم. CrypView متجاوب بالكامل ويمكن تثبيته كـ PWA على iOS وAndroid. بعض الميزات المتقدمة (المخططات المتعددة، الفوتبرينت) أكثر راحة على شاشة أكبر.',

    q_languages: 'ما اللغات المتاحة؟',
    a_languages: 'يدعم CrypView 4 لغات: English وFrançais و中文 (الصينية المبسطة) والعربية (مع دعم RTL كامل). غيّر اللغة من الإعدادات أو عبر محدد اللغة في شريط التنقل.',

    q_data_source: 'من أين تأتي بيانات السوق؟',
    a_data_source: 'تأتي بيانات الأسعار مباشرة من API Binance العام (REST + WebSocket). بيانات DEX تأتي من GeckoTerminal. CrypView ليس لديه خادم خلفي — متصفحك يتصل مباشرة بهذه الـ APIs. البيانات دقيقة وفورية مثل Binance نفسها.',

    q_data_delay: 'هل البيانات في الوقت الفعلي؟',
    a_data_delay: 'نعم. بيانات الشموع وتحديثات الأسعار تصل عبر WebSocket من Binance دون تأخير إضافي. الإطار الزمني لثانية واحدة يُولَّد محلياً من بيانات aggTrade. بيانات DEX (GeckoTerminal) تُحدَّث كل 60 ثانية بسبب قيود API.',

    q_pairs: 'ما أزواج التداول المتاحة؟',
    a_pairs: 'جميع أزواج USDT النشطة المدرجة على Binance Spot — أكثر من 500 زوج عند الإطلاق، تُحمَّل عند البدء. لـ DEX، أي مجمع مفهرس بواسطة GeckoTerminal على Ethereum وBSC وSolana وArbitrum وBase وPolygon وAvalanche والمزيد.',

    q_timeframes: 'ما الأطر الزمنية المدعومة؟',
    a_timeframes: '15 إطاراً زمنياً: 1s · 1m · 3m · 5m · 15m · 30m · 1h · 2h · 4h · 6h · 12h · 1d · 3d · 1w · 1M. اضغط T للتنقل بينها.',

    q_chart_types: 'ما أنواع الرسوم البيانية المتاحة؟',
    a_chart_types: 'الشموع اليابانية (افتراضي)، Heikin-Ashi، الخط، والأشرطة — قابلة للاختيار من قائمة النقر الأيمن.',

    q_dex: 'كيف أصل إلى مخططات DEX؟',
    a_dex: 'انقر بزر الماوس الأيمن ← DEX، أو انقر على زر 🔗 DEX. ابحث باسم الرمز (مثل PEPE) أو عنوان العقد. اختر الشبكة والمجمع المطلوب. تُحدَّث البيانات كل 60 ثانية.',

    q_multi: 'كيف أفتح مخططات متعددة في آنٍ واحد؟',
    a_multi: 'انقر بزر الماوس الأيمن ← المخططات المتعددة، أو استخدم روابط التخطيط في الصفحة الرئيسية. التخطيطات المتاحة: متعدد 2 (جنباً إلى جنب)، متعدد 4 (2×2)، متعدد 9 (3×3)، عمودي 2، عمودي 3، غير متماثل 1+2 و1+3.',

    q_how_add_indicator: 'كيف أضيف مؤشراً؟',
    a_how_add_indicator: 'انقر بزر الماوس الأيمن ← المؤشرات ← اختر المؤشرات. أو اضغط I. المؤشرات مصنفة في فئات الاتجاه والزخم والتقلب والحجم، وقابلة للبحث.',

    q_how_many_indicators: 'كم مؤشراً متاح؟',
    a_how_many_indicators: 'أكثر من 19: MA 20/50/200 وEMA 8/13/21 وDEMA وHMA وVWAP وIchimoku وSuperTrend وقنوات Keltner وParabolic SAR وDonchian وقناة الانحدار الخطي ونقاط Pivot وRSI وMACD وStochastic وCCI وADX+DI وWilliams %R وMomentum وTRIX وSqueeze Momentum وElder Ray وبولينجر باندز وATR وMFI وOBV وCMF والمراكز المفتوحة ومعدل التمويل ونسبة الشراء/البيع.',

    q_heavy_indicators: 'بعض المؤشرات بطيئة في التحميل — هل هذا طبيعي؟',
    a_heavy_indicators: 'نعم. المؤشرات الثقيلة (Ichimoku وADX وSuperTrend وMACD) تُحسَب في Web Worker للحفاظ على سلاسة المخطط. قد تستغرق 1-2 ثانية للظهور على أطر زمنية طويلة جداً أو مجموعات بيانات كبيرة.',

    q_profiles: 'ما هي ملفات تعريف المؤشرات؟',
    a_profiles: 'تحفظ الملفات الشخصية مجموعة من المؤشرات النشطة + الإطار الزمني الحالي. 6 إعدادات مسبقة مدمجة (Scalping وSwing وVolume وOrderflow وMomentum وVolatility) + ما يصل إلى 20 ملفاً مخصصاً. الوصول عبر النقر الأيمن ← المؤشرات ← الملفات الشخصية والإعدادات المسبقة.',

    q_create_alert: 'كيف أنشئ تنبيه سعر؟',
    a_create_alert: 'انقر بزر الماوس الأيمن على المخطط عند مستوى السعر المطلوب ← التنبيهات ← تنبيه جديد. يُملأ حقل السعر مسبقاً بسعر المؤشر. يمكنك أيضاً إعداد تنبيهات متعددة الشروط المعقدة من لوحة إنشاء التنبيهات.',

    q_alert_notify: 'كيف يتم إشعاري عند تفعيل التنبيه؟',
    a_alert_notify: 'بطريقتين في آنٍ واحد: إشعار OS أصلي (يتطلب إذناً لمرة واحدة من المتصفح) ونغمة مزدوجة عبر Web Audio API. يظهر التنبيه أيضاً في مركز التنبيهات.',

    q_alert_conditions: 'ما الشروط التي يمكنني ضبطها على التنبيهات؟',
    a_alert_conditions: 'السعر فوق/تحت، ارتفاع/انخفاض ≥ %، ارتفاع حجم التداول ≥ ×، RSI ≥/≤، تقاطع MACD الصاعد/الهابط، اختراق أعلى/أدنى N شمعة، اختراق خط الاتجاه ↑↓. يمكن دمج شروط متعددة بمنطق AND أو OR.',

    q_alert_background: 'هل تعمل التنبيهات مع التبويب في الخلفية؟',
    a_alert_background: 'نعم، طالما بقي تبويب المتصفح مفتوحاً (حتى مصغراً أو في الخلفية). لا تعمل التنبيهات إذا أُغلق التبويب أو أُوقف المتصفح. لا يمتلك CrypView خادماً لإرسال إشعارات مستقلة.',

    q_alert_persist: 'هل تُحفظ التنبيهات إذا أغلقت المتصفح؟',
    a_alert_persist: 'نعم. تُحفظ التنبيهات في localStorage (المفتاح: crypview_alerts_v3) وتُستعاد تلقائياً عند إعادة فتح CrypView — شريطة استخدام المتصفح والجهاز ذاتيهما.',

    q_paper_what: 'ما هو التداول الورقي؟',
    a_paper_what: 'التداول الورقي محرك محاكاة بلا مخاطر. تبدأ بحساب افتراضي قدره 10,000 USDT ويمكنك فتح مراكز شراء/بيع مع إيقاف خسارة واستهداف ربح اختياريين — بالسعر الفعلي المباشر، لكن دون أموال حقيقية. الوصول عبر النقر الأيمن ← الأدوات ← التداول الورقي.',

    q_paper_real: 'هل يمكن استخدام نتائج التداول الورقي للتنبؤ بالتداول الحقيقي؟',
    a_paper_real: 'لا. لا يُحاكي التداول الورقي الانزلاق السعري أو قيود السيولة أو الضغط العاطفي أو أسعار التنفيذ الحقيقية. النتائج المحققة في المحاكاة لا يمكن تعميمها على التداول الفعلي. راجع إخلاء المسؤولية عن المخاطر للتفاصيل.',

    q_backtest_what: 'ما هو الاختبار الخلفي؟',
    a_backtest_what: 'يُشغّل الاختبار الخلفي استراتيجية على شموع OHLCV التاريخية المحملة في المخطط. تُحدّد إشارات الدخول/الخروج (RSI وMACD وبولينجر وVWAP…) والجهة ونسبة إيقاف الخسارة ونسبة استهداف الربح ورأس المال لكل صفقة. يعيد المحرك معدل الفوز والربح/الخسارة ونسبة شارب والسحب الأقصى ومعامل الربح.',

    q_backtest_reliable: 'هل نتائج الاختبار الخلفي موثوقة؟',
    a_backtest_reliable: 'نتائج الاختبار الخلفي استرشادية فحسب. تخضع لتحيز البقاء (اخترت الأصل بعد رؤية تاريخه) والإفراط في التخصيص (قد تكون الاستراتيجية مضبوطة بشكل مفرط على البيانات الماضية) ولا تتضمن الانزلاق أو السيولة الفعليين. تحقق دائماً خارج العينة.',

    q_data_collection: 'هل يجمع CrypView بياناتي الشخصية؟',
    a_data_collection: 'لا. CrypView تطبيق 100% على جانب العميل وليس لديه خادم خلفي. لا تُجمع أو تُرسل أو تُخزَّن أي بيانات شخصية من قِبَل CrypView. جميع إعداداتك (المظهر والتنبيهات والرسومات والتداول الورقي) محفوظة حصراً في localStorage متصفحك. راجع سياسة الخصوصية للتفاصيل الكاملة.',

    q_local_storage: 'ماذا يُخزَّن في متصفحي؟',
    a_local_storage: 'تفضيل المظهر (crypview-theme)، اللغة (crypview_locale)، تنبيهات الأسعار (crypview_alerts_v3)، حالة لوحات المخططات المتعددة (crypview_multi*_state_v1)، حساب التداول الورقي (crypview_paper_v1)، رسومات المخطط (drawKey_{الرمز})، مساحات العمل (crypview_workspaces) وملفات تعريف المؤشرات (crypview_profiles).',

    q_delete_data: 'كيف أحذف بياناتي؟',
    a_delete_data: 'افتح أدوات المطور في متصفحك (F12) ← التطبيق ← التخزين المحلي ← امسح جميع المفاتيح التي تبدأ بـ crypview_. أو امسح جميع ذاكرة التخزين المؤقت وبيانات التصفح من إعدادات متصفحك. استخدام وضع التصفح الخاص يمنع حفظ أي بيانات.',

    q_offline: 'هل يعمل CrypView بدون إنترنت؟',
    a_offline: 'جزئياً. الأصول الثابتة (HTML وCSS وJS والخطوط) مخزنة مؤقتاً من Service Worker ومتاحة بدون إنترنت. بيانات السوق المباشرة وتاريخ المخططات تتطلب اتصالاً نشطاً بالإنترنت.',

    q_api_key: 'هل أحتاج إلى مفتاح API لـ Binance؟',
    a_api_key: 'لا. يستخدم CrypView فقط نقاط API العامة لـ Binance — لا يلزم أي مفتاح API. لا تحتاج إلى حساب Binance لاستخدام CrypView.',

    q_investment_advice: 'هل يُقدّم CrypView نصائح استثمارية؟',
    a_investment_advice: 'لا. CrypView أداة تحليل ومعلومات فحسب. لا يُقدّم توصيات شراء/بيع أو إشارات تداول أو نصائح مالية شخصية. جميع قرارات الاستثمار ترجع إليك وحدك. يُرجى استشارة مستشار مالي مرخص قبل الاستثمار.',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'ملفات تعريف الارتباط',
    footPrivacy: 'الخصوصية',
    footTerms:   'الشروط',
    footRisks:   'المخاطر',
    footHome:    'الرئيسية',

    wikiLink:    'الويكي',
    risksLink:   'إخلاء المسؤولية عن المخاطر',
    privacyLink: 'سياسة الخصوصية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FAQ_I18N;
}
