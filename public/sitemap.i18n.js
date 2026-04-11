// ============================================================
//  public/sitemap.i18n.js — CrypView i18n
//  Traductions de la page Plan du site (sitemap.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans sitemap.html :
//    <script src="public/sitemap.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = SITEMAP_I18N[locale] || SITEMAP_I18N.en;
//      document.querySelectorAll('[data-i18n]').forEach(el => {
//        const key = el.dataset.i18n;
//        if (T[key]) el.textContent = T[key];
//      });
//    </script>
// ============================================================

const SITEMAP_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    // <title>
    pageTitle: 'Sitemap — CrypView',
    // <meta name="description">
    metaDesc: 'CrypView sitemap: all pages and sections of the real-time crypto chart application.',

    // Nav
    navBack: '← Back to home',

    // Page header
    pageTag:  'Navigation',
    h1:       'Sitemap',
    pageSub:  'Overview of all pages and views available in CrypView.',

    // Stats
    statCharts:     '8+',
    statChartsLbl:  'Chart views',
    statLegal:      '4',
    statLegalLbl:   'Legal pages',
    statInd:        '19+',
    statIndLbl:     'Indicators',
    statPairs:      '500+',
    statPairsLbl:   'USDT pairs',

    // Legend
    legendAvail:  'Available page',
    legendNew:    'New (v3.7)',
    legendLegal:  'Support / Legal',

    // Column — Application
    colApp:      'Application',
    linkSimple:  'Simple view',
    badge1chart: '1 chart',
    linkMulti2:  'Multi 2',
    badge2:      '2 charts',
    linkMulti4:  'Multi 4',
    badge4:      '2×2',
    linkMulti9:  'Multi 9',
    badge9:      '3×3',
    linkV2:      'Vertical 2',
    badgeV2:     '↕ V2',
    linkV3:      'Vertical 3',
    badgeV3:     '↕ V3',
    link1p2:     'Asymmetric 1+2',
    badge1p2:    '⬛ 1+2',
    link1p3:     'Asymmetric 1+3',
    badge1p3:    '⬛ 1+3',

    // Column — Site
    colSite:       'Site',
    linkHome:      'Home',
    linkFaq:       'FAQ',
    linkChangelog: 'Changelog',
    badgeVersion:  'v4.0',
    linkSitemap:   'Sitemap',
    badgeCurrent:  '← current',

    // Sub-column — Legal
    colLegal:        'Legal',
    linkCookies:     'Cookie Policy',
    linkPrivacy:     'Privacy Policy',
    linkTerms:       'Terms of Service',
    linkRisks:       'Risk Disclaimer',

    // Column — Features
    colFeatures:          'Features',
    feat19ind:            '19+ Indicators',
    featFootprint:        'Footprint Chart',
    featOrderflow:        'Orderflow Delta / CVD',
    featVolumeProfile:    'Volume Profile',
    featAlerts:           'Advanced Price Alerts',
    featDrawing:          'Drawing Tools (9 tools)',
    featScreener:         'Market Screener',
    featPaper:            'Paper Trading',
    featBacktest:         'Backtesting',
    featMultiExchange:    'Multi-Exchange',
    badgeMultiEx:         'v3.7',
    featLiquidation:      'Liquidation Heatmap',
    badgeLiquidation:     'v3.7',
    featDex:              'DEX (GeckoTerminal)',
    badgeDex:             'v3.7',
    featI18n:             'i18n (EN/FR/ZH/AR)',
    featPwa:              'Installable PWA',

    // External resources
    extTitle:   'External resources',
    extGithub:  'GitHub (source code)',
    extBinance: 'Binance API',
    extGecko:   'GeckoTerminal DEX',

    // Footer
    footerCopy: '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Privacy',
    footRisks:   'Risks',
    footHome:    'Home',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'Plan du site — CrypView',
    metaDesc:  'Plan du site CrypView : toutes les pages et sections de l\'application de graphiques crypto en temps réel.',

    navBack: '← Retour à l\'accueil',

    pageTag: 'Navigation',
    h1:      'Plan du site',
    pageSub: 'Vue d\'ensemble de toutes les pages et vues disponibles dans CrypView.',

    statCharts:    '8+',
    statChartsLbl: 'Vues charts',
    statLegal:     '4',
    statLegalLbl:  'Pages légales',
    statInd:       '19+',
    statIndLbl:    'Indicateurs',
    statPairs:     '500+',
    statPairsLbl:  'Paires USDT',

    legendAvail: 'Page disponible',
    legendNew:   'Nouveau (v3.7)',
    legendLegal: 'Support / Légal',

    colApp:      'Application',
    linkSimple:  'Vue simple',
    badge1chart: '1 chart',
    linkMulti2:  'Multi 2',
    badge2:      '2 charts',
    linkMulti4:  'Multi 4',
    badge4:      '2×2',
    linkMulti9:  'Multi 9',
    badge9:      '3×3',
    linkV2:      'Vertical 2',
    badgeV2:     '↕ V2',
    linkV3:      'Vertical 3',
    badgeV3:     '↕ V3',
    link1p2:     'Asymétrique 1+2',
    badge1p2:    '⬛ 1+2',
    link1p3:     'Asymétrique 1+3',
    badge1p3:    '⬛ 1+3',

    colSite:       'Site',
    linkHome:      'Accueil',
    linkFaq:       'FAQ',
    linkChangelog: 'Changelog',
    badgeVersion:  'v4.0',
    linkSitemap:   'Plan du site',
    badgeCurrent:  '← actuel',

    colLegal:    'Légal',
    linkCookies: 'Politique de cookies',
    linkPrivacy: 'Confidentialité',
    linkTerms:   'Conditions d\'utilisation',
    linkRisks:   'Avertissement sur les risques',

    colFeatures:       'Fonctionnalités',
    feat19ind:         '19+ Indicateurs',
    featFootprint:     'Footprint Chart',
    featOrderflow:     'Orderflow Delta / CVD',
    featVolumeProfile: 'Volume Profile',
    featAlerts:        'Alertes de prix avancées',
    featDrawing:       'Drawing Tools (9 outils)',
    featScreener:      'Market Screener',
    featPaper:         'Paper Trading',
    featBacktest:      'Backtesting',
    featMultiExchange: 'Multi-Exchange',
    badgeMultiEx:      'v3.7',
    featLiquidation:   'Liquidation Heatmap',
    badgeLiquidation:  'v3.7',
    featDex:           'DEX (GeckoTerminal)',
    badgeDex:          'v3.7',
    featI18n:          'i18n (EN/FR/ZH/AR)',
    featPwa:           'PWA installable',

    extTitle:   'Ressources externes',
    extGithub:  'GitHub (code source)',
    extBinance: 'API Binance',
    extGecko:   'GeckoTerminal DEX',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Confidentialité',
    footRisks:   'Risques',
    footHome:    'Accueil',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: '网站地图 — CrypView',
    metaDesc:  'CrypView网站地图：实时加密货币图表应用的所有页面和功能模块。',

    navBack: '← 返回首页',

    pageTag: '导航',
    h1:      '网站地图',
    pageSub: 'CrypView 中所有可用页面和视图的总览。',

    statCharts:    '8+',
    statChartsLbl: '图表视图',
    statLegal:     '4',
    statLegalLbl:  '法律页面',
    statInd:       '19+',
    statIndLbl:    '技术指标',
    statPairs:     '500+',
    statPairsLbl:  'USDT交易对',

    legendAvail: '可用页面',
    legendNew:   '新增 (v3.7)',
    legendLegal: '支持 / 法律',

    colApp:      '应用',
    linkSimple:  '单图模式',
    badge1chart: '1图',
    linkMulti2:  'Multi 2',
    badge2:      '2图',
    linkMulti4:  'Multi 4',
    badge4:      '2×2',
    linkMulti9:  'Multi 9',
    badge9:      '3×3',
    linkV2:      '垂直2图',
    badgeV2:     '↕ V2',
    linkV3:      '垂直3图',
    badgeV3:     '↕ V3',
    link1p2:     '非对称 1+2',
    badge1p2:    '⬛ 1+2',
    link1p3:     '非对称 1+3',
    badge1p3:    '⬛ 1+3',

    colSite:       '站点',
    linkHome:      '首页',
    linkFaq:       '常见问题',
    linkChangelog: '更新日志',
    badgeVersion:  'v4.0',
    linkSitemap:   '网站地图',
    badgeCurrent:  '← 当前页',

    colLegal:    '法律',
    linkCookies: 'Cookie 政策',
    linkPrivacy: '隐私政策',
    linkTerms:   '服务条款',
    linkRisks:   '风险声明',

    colFeatures:       '功能特色',
    feat19ind:         '19+ 技术指标',
    featFootprint:     '足迹图',
    featOrderflow:     '订单流 Delta / CVD',
    featVolumeProfile: '成交量分布',
    featAlerts:        '高级价格提醒',
    featDrawing:       '绘图工具（9种）',
    featScreener:      '市场扫描器',
    featPaper:         '模拟交易',
    featBacktest:      '回测',
    featMultiExchange: '多交易所',
    badgeMultiEx:      'v3.7',
    featLiquidation:   '爆仓热力图',
    badgeLiquidation:  'v3.7',
    featDex:           'DEX（GeckoTerminal）',
    badgeDex:          'v3.7',
    featI18n:          '多语言（EN/FR/ZH/AR）',
    featPwa:           '可安装 PWA',

    extTitle:   '外部资源',
    extGithub:  'GitHub（源代码）',
    extBinance: '币安 API',
    extGecko:   'GeckoTerminal DEX',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookie',
    footPrivacy: '隐私',
    footRisks:   '风险',
    footHome:    '首页',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'خريطة الموقع — CrypView',
    metaDesc:  'خريطة موقع CrypView: جميع صفحات وأقسام تطبيق الرسوم البيانية للعملات المشفرة في الوقت الفعلي.',

    navBack: '→ العودة إلى الرئيسية',

    pageTag: 'التنقل',
    h1:      'خريطة الموقع',
    pageSub: 'نظرة عامة على جميع الصفحات والعروض المتاحة في CrypView.',

    statCharts:    '٨+',
    statChartsLbl: 'عروض الرسوم البيانية',
    statLegal:     '٤',
    statLegalLbl:  'صفحات قانونية',
    statInd:       '١٩+',
    statIndLbl:    'مؤشرات',
    statPairs:     '٥٠٠+',
    statPairsLbl:  'أزواج USDT',

    legendAvail: 'صفحة متاحة',
    legendNew:   'جديد (v3.7)',
    legendLegal: 'الدعم / القانوني',

    colApp:      'التطبيق',
    linkSimple:  'العرض البسيط',
    badge1chart: 'رسم واحد',
    linkMulti2:  'متعدد 2',
    badge2:      'رسمان',
    linkMulti4:  'متعدد 4',
    badge4:      '2×2',
    linkMulti9:  'متعدد 9',
    badge9:      '3×3',
    linkV2:      'عمودي 2',
    badgeV2:     '↕ V2',
    linkV3:      'عمودي 3',
    badgeV3:     '↕ V3',
    link1p2:     'غير متماثل 1+2',
    badge1p2:    '⬛ 1+2',
    link1p3:     'غير متماثل 1+3',
    badge1p3:    '⬛ 1+3',

    colSite:       'الموقع',
    linkHome:      'الرئيسية',
    linkFaq:       'الأسئلة الشائعة',
    linkChangelog: 'سجل التغييرات',
    badgeVersion:  'v4.0',
    linkSitemap:   'خريطة الموقع',
    badgeCurrent:  '← الحالية',

    colLegal:    'القانوني',
    linkCookies: 'سياسة ملفات تعريف الارتباط',
    linkPrivacy: 'سياسة الخصوصية',
    linkTerms:   'شروط الاستخدام',
    linkRisks:   'إخلاء المسؤولية عن المخاطر',

    colFeatures:       'المميزات',
    feat19ind:         '١٩+ مؤشراً تقنياً',
    featFootprint:     'مخطط الفوتبرينت',
    featOrderflow:     'تدفق الأوامر Delta / CVD',
    featVolumeProfile: 'ملف الحجم',
    featAlerts:        'تنبيهات الأسعار المتقدمة',
    featDrawing:       'أدوات الرسم (٩ أدوات)',
    featScreener:      'ماسح السوق',
    featPaper:         'التداول الورقي',
    featBacktest:      'الاختبار الخلفي',
    featMultiExchange: 'متعدد البورصات',
    badgeMultiEx:      'v3.7',
    featLiquidation:   'خريطة حرارة التصفية',
    badgeLiquidation:  'v3.7',
    featDex:           'DEX (GeckoTerminal)',
    badgeDex:          'v3.7',
    featI18n:          'i18n (EN/FR/ZH/AR)',
    featPwa:           'PWA قابل للتثبيت',

    extTitle:   'الموارد الخارجية',
    extGithub:  'GitHub (الكود المصدري)',
    extBinance: 'واجهة برمجة Binance',
    extGecko:   'GeckoTerminal DEX',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'الكوكيز',
    footPrivacy: 'الخصوصية',
    footRisks:   'المخاطر',
    footHome:    'الرئيسية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SITEMAP_I18N;
}
