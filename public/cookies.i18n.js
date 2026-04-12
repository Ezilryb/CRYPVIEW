// ============================================================
//  public/cookies.i18n.js — CrypView i18n
//  Traductions de la page Politique de cookies (cookies.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans cookies.html :
//    <script src="public/cookies.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = COOKIES_I18N[locale] || COOKIES_I18N.en;
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

const COOKIES_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    pageTitle: 'Cookie Policy — CrypView',
    metaDesc:  'CrypView cookie policy: technical session cookies only, no advertising or profiling.',

    navBack: '← Back to home',

    pageTag:  'Legal',
    h1:       'Cookie Policy',
    pageMeta: 'Last updated: April 2026 · CrypView — Beta Capital Enterprise',

    noticeTxt: 'CrypView uses <strong>no advertising or tracking cookies</strong>. Only strictly necessary technical cookies for the application to function are stored.',

    // Section 1
    s1_title: 'What is a cookie?',
    s1_p1: 'A cookie is a small text file placed on your device when you visit a website. It can store preferences, session state or technical data. Cookies can be session-based (deleted when the browser is closed) or persistent (retained for a defined period).',

    // Section 2
    s2_title: 'Cookies used by CrypView',
    s2_p1: 'CrypView uses exclusively browser local storage (<code>localStorage</code>) and technical cookies. Here is the detail:',

    s2_th1: 'Name',
    s2_th2: 'Type',
    s2_th3: 'Duration',
    s2_th4: 'Purpose',

    s2_r1_name: 'crypview-theme',
    s2_r1_type: 'Technical',
    s2_r1_dur:  'Persistent',
    s2_r1_desc: 'Saves the chosen theme (dark/light) to avoid a flash on reload.',

    s2_r2_name: 'crypview_locale',
    s2_r2_type: 'Technical',
    s2_r2_dur:  'Persistent',
    s2_r2_desc: 'Interface language selected by the user (EN, FR, ZH, AR).',

    s2_r3_name: 'crypview_alerts_v3',
    s2_r3_type: 'Technical',
    s2_r3_dur:  'Persistent',
    s2_r3_desc: 'Price alerts configured by the user (local storage only).',

    s2_r4_name: 'crypview_multi*_state_v1',
    s2_r4_type: 'Technical',
    s2_r4_dur:  'Persistent',
    s2_r4_desc: 'Multi-chart panel state (symbols, timeframes, active indicators).',

    s2_r5_name: 'crypview_paper_v1',
    s2_r5_type: 'Technical',
    s2_r5_dur:  'Persistent',
    s2_r5_desc: 'Simulated Paper Trading account (balance, positions, history).',

    s2_r6_name: 'Analytics cookies',
    s2_r6_type: 'Absent',
    s2_r6_dur:  '—',
    s2_r6_desc: 'No analytics tool (Google Analytics, Hotjar, etc.) is integrated.',

    s2_r7_name: 'Advertising cookies',
    s2_r7_type: 'Absent',
    s2_r7_dur:  '—',
    s2_r7_desc: 'No advertising network. No targeting pixel.',

    // Section 3
    s3_title: 'Management and deletion',
    s3_p1: 'All data is stored locally in your browser via <code>localStorage</code>. It never leaves your device and is not transmitted to any third party.',
    s3_p2: 'To delete this data, you can:',
    s3_li1: 'Open browser DevTools → Application → Local Storage → clear <code>crypview_*</code> keys',
    s3_li2: 'Clear browser cache and browsing data (Settings → Privacy)',
    s3_li3: 'Use the reset function in Paper Trading (⚙ → Reset account)',

    // Section 4
    s4_title: 'Third-party services',
    s4_p1: 'CrypView loads resources from the following services, which may set their own cookies:',
    s4_li1: '<strong>Google Fonts</strong> — loading DM Mono and Syne fonts. See the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google policy</a>.',
    s4_li2: '<strong>Binance API</strong> — real-time market data. No cookie set on CrypView\'s side.',
    s4_li3: '<strong>GeckoTerminal API</strong> — DEX data (if enabled). No cookie set on CrypView\'s side.',
    s4_li4: '<strong>GitHub Pages</strong> — site hosting. See the <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub policy</a>.',

    // Section 5
    s5_title: 'Legal basis',
    s5_p1: 'Strictly technical cookies do not require prior consent under the GDPR and the ePrivacy Directive, insofar as they are essential to the operation of the service requested by the user.',
    s5_p2: 'CrypView does not process any personally identifiable data. No user account is required.',

    // Section 6
    s6_title: 'Contact',
    s6_p1: 'For any questions regarding this policy, contact us at: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footPrivacy: 'Privacy',
    footTerms:   'Terms',
    footRisks:   'Risks',
    footHome:    'Home',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'Politique de cookies — CrypView',
    metaDesc:  'Politique de cookies de CrypView : uniquement des cookies techniques de session, sans publicité ni profilage.',

    navBack: '← Retour à l\'accueil',

    pageTag:  'Légal',
    h1:       'Politique de cookies',
    pageMeta: 'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',

    noticeTxt: 'CrypView n\'utilise <strong>aucun cookie publicitaire ni de traçage</strong>. Seuls des cookies techniques strictement nécessaires au fonctionnement de l\'application sont déposés.',

    s1_title: 'Qu\'est-ce qu\'un cookie ?',
    s1_p1: 'Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d\'un site web. Il peut stocker des préférences, un état de session ou des données techniques. Les cookies peuvent être de session (supprimés à la fermeture du navigateur) ou persistants (conservés pour une durée définie).',

    s2_title: 'Cookies utilisés par CrypView',
    s2_p1: 'CrypView utilise exclusivement le stockage local du navigateur (<code>localStorage</code>) et des cookies techniques. Voici le détail :',

    s2_th1: 'Nom',
    s2_th2: 'Type',
    s2_th3: 'Durée',
    s2_th4: 'Finalité',

    s2_r1_name: 'crypview-theme',
    s2_r1_type: 'Technique',
    s2_r1_dur:  'Persistant',
    s2_r1_desc: 'Mémorisation du thème choisi (sombre/clair) pour éviter le flash au rechargement.',

    s2_r2_name: 'crypview_locale',
    s2_r2_type: 'Technique',
    s2_r2_dur:  'Persistant',
    s2_r2_desc: 'Langue d\'interface sélectionnée par l\'utilisateur (EN, FR, ZH, AR).',

    s2_r3_name: 'crypview_alerts_v3',
    s2_r3_type: 'Technique',
    s2_r3_dur:  'Persistant',
    s2_r3_desc: 'Alertes de prix configurées par l\'utilisateur (stockage local uniquement).',

    s2_r4_name: 'crypview_multi*_state_v1',
    s2_r4_type: 'Technique',
    s2_r4_dur:  'Persistant',
    s2_r4_desc: 'État des panneaux multi-graphiques (symboles, timeframes, indicateurs actifs).',

    s2_r5_name: 'crypview_paper_v1',
    s2_r5_type: 'Technique',
    s2_r5_dur:  'Persistant',
    s2_r5_desc: 'Compte de Paper Trading simulé (solde, positions, historique).',

    s2_r6_name: 'Cookies analytiques',
    s2_r6_type: 'Absent',
    s2_r6_dur:  '—',
    s2_r6_desc: 'Aucun outil d\'analyse (Google Analytics, Hotjar, etc.) n\'est intégré.',

    s2_r7_name: 'Cookies publicitaires',
    s2_r7_type: 'Absent',
    s2_r7_dur:  '—',
    s2_r7_desc: 'Aucune régie publicitaire. Aucun pixel de ciblage.',

    s3_title: 'Gestion et suppression',
    s3_p1: 'Toutes les données sont stockées localement dans votre navigateur via <code>localStorage</code>. Elles ne quittent jamais votre appareil et ne sont transmises à aucun tiers.',
    s3_p2: 'Pour supprimer ces données, vous pouvez :',
    s3_li1: 'Ouvrir les DevTools de votre navigateur → Application → Local Storage → effacer les clés <code>crypview_*</code>',
    s3_li2: 'Vider le cache et les données de navigation de votre navigateur (Paramètres → Confidentialité)',
    s3_li3: 'Utiliser la fonction de réinitialisation dans le Paper Trading (⚙ → Réinitialiser le compte)',

    s4_title: 'Services tiers',
    s4_p1: 'CrypView charge des ressources depuis les services suivants, qui peuvent déposer leurs propres cookies :',
    s4_li1: '<strong>Google Fonts</strong> — chargement des polices DM Mono et Syne. Consulter la <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">politique Google</a>.',
    s4_li2: '<strong>Binance API</strong> — données de marché en temps réel. Aucun cookie déposé côté CrypView.',
    s4_li3: '<strong>GeckoTerminal API</strong> — données DEX (si activé). Aucun cookie déposé côté CrypView.',
    s4_li4: '<strong>GitHub Pages</strong> — hébergement du site. Consulter la <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">politique GitHub</a>.',

    s5_title: 'Base légale',
    s5_p1: 'Les cookies strictement techniques ne nécessitent pas de consentement préalable au sens du RGPD et de la directive ePrivacy, dans la mesure où ils sont indispensables au fonctionnement du service demandé par l\'utilisateur.',
    s5_p2: 'CrypView ne traite aucune donnée personnelle identifiable. Aucun compte utilisateur n\'est requis.',

    s6_title: 'Contact',
    s6_p1: 'Pour toute question relative à cette politique, contactez-nous à : <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footPrivacy: 'Confidentialité',
    footTerms:   'Conditions',
    footRisks:   'Risques',
    footHome:    'Accueil',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: 'Cookie政策 — CrypView',
    metaDesc:  'CrypView的Cookie政策：仅使用技术性会话Cookie，无广告或用户画像。',

    navBack: '← 返回首页',

    pageTag:  '法律',
    h1:       'Cookie政策',
    pageMeta: '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',

    noticeTxt: 'CrypView<strong>不使用任何广告或追踪Cookie</strong>。仅存储应用正常运行所必需的技术性Cookie。',

    s1_title: '什么是Cookie？',
    s1_p1: 'Cookie是访问网站时存放在您设备上的小型文本文件。它可以存储偏好设置、会话状态或技术数据。Cookie可以是会话性的（关闭浏览器时删除）或持久性的（保留指定时间）。',

    s2_title: 'CrypView使用的Cookie',
    s2_p1: 'CrypView仅使用浏览器本地存储（<code>localStorage</code>）和技术性Cookie。详情如下：',

    s2_th1: '名称',
    s2_th2: '类型',
    s2_th3: '持续时间',
    s2_th4: '用途',

    s2_r1_name: 'crypview-theme',
    s2_r1_type: '技术性',
    s2_r1_dur:  '持久性',
    s2_r1_desc: '记录所选主题（深色/浅色），避免重新加载时出现闪烁。',

    s2_r2_name: 'crypview_locale',
    s2_r2_type: '技术性',
    s2_r2_dur:  '持久性',
    s2_r2_desc: '用户选择的界面语言（EN、FR、ZH、AR）。',

    s2_r3_name: 'crypview_alerts_v3',
    s2_r3_type: '技术性',
    s2_r3_dur:  '持久性',
    s2_r3_desc: '用户配置的价格提醒（仅本地存储）。',

    s2_r4_name: 'crypview_multi*_state_v1',
    s2_r4_type: '技术性',
    s2_r4_dur:  '持久性',
    s2_r4_desc: '多图表面板状态（交易对、时间框架、活跃指标）。',

    s2_r5_name: 'crypview_paper_v1',
    s2_r5_type: '技术性',
    s2_r5_dur:  '持久性',
    s2_r5_desc: '模拟交易账户（余额、持仓、历史记录）。',

    s2_r6_name: '分析类Cookie',
    s2_r6_type: '不存在',
    s2_r6_dur:  '—',
    s2_r6_desc: '未集成任何分析工具（Google Analytics、Hotjar等）。',

    s2_r7_name: '广告类Cookie',
    s2_r7_type: '不存在',
    s2_r7_dur:  '—',
    s2_r7_desc: '无广告网络，无定向像素。',

    s3_title: '管理与删除',
    s3_p1: '所有数据均通过<code>localStorage</code>存储在您的浏览器本地。数据不会离开您的设备，也不会传输给任何第三方。',
    s3_p2: '要删除这些数据，您可以：',
    s3_li1: '打开浏览器开发者工具 → 应用程序 → 本地存储 → 清除<code>crypview_*</code>键',
    s3_li2: '清除浏览器缓存和浏览数据（设置 → 隐私）',
    s3_li3: '使用模拟交易中的重置功能（⚙ → 重置账户）',

    s4_title: '第三方服务',
    s4_p1: 'CrypView从以下服务加载资源，这些服务可能设置自己的Cookie：',
    s4_li1: '<strong>Google Fonts</strong> — 加载DM Mono和Syne字体。参见<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">谷歌政策</a>。',
    s4_li2: '<strong>币安API</strong> — 实时市场数据。CrypView侧不设置Cookie。',
    s4_li3: '<strong>GeckoTerminal API</strong> — DEX数据（如已启用）。CrypView侧不设置Cookie。',
    s4_li4: '<strong>GitHub Pages</strong> — 网站托管。参见<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub政策</a>。',

    s5_title: '法律依据',
    s5_p1: '严格技术性Cookie在GDPR和ePrivacy指令意义上不需要事先同意，因为它们对用户请求的服务运行不可或缺。',
    s5_p2: 'CrypView不处理任何可识别个人身份的数据，无需用户账户。',

    s6_title: '联系方式',
    s6_p1: '如有任何关于本政策的问题，请联系我们：<a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footPrivacy: '隐私政策',
    footTerms:   '使用条款',
    footRisks:   '风险提示',
    footHome:    '首页',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'سياسة ملفات تعريف الارتباط — CrypView',
    metaDesc:  'سياسة ملفات تعريف الارتباط لـ CrypView: ملفات تقنية للجلسة فقط، بدون إعلانات أو تتبع.',

    navBack: '→ العودة إلى الرئيسية',

    pageTag:  'قانوني',
    h1:       'سياسة ملفات تعريف الارتباط',
    pageMeta: 'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',

    noticeTxt: 'لا يستخدم CrypView <strong>أي ملفات تعريف ارتباط إعلانية أو تتبعية</strong>. يتم تخزين ملفات تقنية ضرورية فقط لتشغيل التطبيق.',

    s1_title: 'ما هو ملف تعريف الارتباط؟',
    s1_p1: 'ملف تعريف الارتباط هو ملف نصي صغير يُودَع على جهازك عند زيارة موقع ويب. يمكنه تخزين التفضيلات أو حالة الجلسة أو البيانات التقنية. يمكن أن تكون ملفات تعريف الارتباط جلسية (تُحذف عند إغلاق المتصفح) أو دائمة (تُحفظ لفترة محددة).',

    s2_title: 'ملفات تعريف الارتباط التي يستخدمها CrypView',
    s2_p1: 'يستخدم CrypView حصرياً التخزين المحلي للمتصفح (<code>localStorage</code>) وملفات تعريف الارتباط التقنية. إليك التفاصيل:',

    s2_th1: 'الاسم',
    s2_th2: 'النوع',
    s2_th3: 'المدة',
    s2_th4: 'الغرض',

    s2_r1_name: 'crypview-theme',
    s2_r1_type: 'تقني',
    s2_r1_dur:  'دائم',
    s2_r1_desc: 'حفظ المظهر المختار (داكن/فاتح) لتجنب الوميض عند إعادة التحميل.',

    s2_r2_name: 'crypview_locale',
    s2_r2_type: 'تقني',
    s2_r2_dur:  'دائم',
    s2_r2_desc: 'لغة الواجهة التي اختارها المستخدم (EN، FR، ZH، AR).',

    s2_r3_name: 'crypview_alerts_v3',
    s2_r3_type: 'تقني',
    s2_r3_dur:  'دائم',
    s2_r3_desc: 'تنبيهات الأسعار التي ضبطها المستخدم (التخزين المحلي فقط).',

    s2_r4_name: 'crypview_multi*_state_v1',
    s2_r4_type: 'تقني',
    s2_r4_dur:  'دائم',
    s2_r4_desc: 'حالة لوحات المخططات المتعددة (الرموز، الأطر الزمنية، المؤشرات النشطة).',

    s2_r5_name: 'crypview_paper_v1',
    s2_r5_type: 'تقني',
    s2_r5_dur:  'دائم',
    s2_r5_desc: 'حساب التداول الورقي المحاكى (الرصيد، المراكز، السجل).',

    s2_r6_name: 'ملفات تعريف ارتباط تحليلية',
    s2_r6_type: 'غير موجود',
    s2_r6_dur:  '—',
    s2_r6_desc: 'لم يتم تكامل أي أداة تحليل (Google Analytics، Hotjar، إلخ).',

    s2_r7_name: 'ملفات تعريف ارتباط إعلانية',
    s2_r7_type: 'غير موجود',
    s2_r7_dur:  '—',
    s2_r7_desc: 'لا توجد شبكة إعلانية. لا يوجد بكسل استهداف.',

    s3_title: 'الإدارة والحذف',
    s3_p1: 'جميع البيانات مخزنة محلياً في متصفحك عبر <code>localStorage</code>. لا تغادر جهازك أبداً ولا تُنقل إلى أي طرف ثالث.',
    s3_p2: 'لحذف هذه البيانات، يمكنك:',
    s3_li1: 'فتح أدوات المطور في المتصفح ← التطبيق ← التخزين المحلي ← مسح مفاتيح <code>crypview_*</code>',
    s3_li2: 'مسح ذاكرة التخزين المؤقت وبيانات التصفح (الإعدادات ← الخصوصية)',
    s3_li3: 'استخدام وظيفة إعادة التعيين في التداول الورقي (⚙ ← إعادة تعيين الحساب)',

    s4_title: 'الخدمات الخارجية',
    s4_p1: 'يحمّل CrypView موارد من الخدمات التالية، التي قد تضع ملفات تعريف الارتباط الخاصة بها:',
    s4_li1: '<strong>Google Fonts</strong> — تحميل خطوط DM Mono وSyne. راجع <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">سياسة Google</a>.',
    s4_li2: '<strong>Binance API</strong> — بيانات السوق في الوقت الفعلي. لا يتم وضع أي ملف ارتباط من جانب CrypView.',
    s4_li3: '<strong>GeckoTerminal API</strong> — بيانات DEX (إذا تم تفعيله). لا يتم وضع أي ملف ارتباط من جانب CrypView.',
    s4_li4: '<strong>GitHub Pages</strong> — استضافة الموقع. راجع <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">سياسة GitHub</a>.',

    s5_title: 'الأساس القانوني',
    s5_p1: 'لا تستلزم ملفات تعريف الارتباط التقنية الصرفة موافقة مسبقة بموجب اللائحة GDPR وتوجيه ePrivacy، نظراً لكونها ضرورية لتشغيل الخدمة المطلوبة من المستخدم.',
    s5_p2: 'لا يعالج CrypView أي بيانات شخصية قابلة للتعريف. لا يُشترط وجود حساب مستخدم.',

    s6_title: 'التواصل',
    s6_p1: 'لأي استفسار يتعلق بهذه السياسة، تواصل معنا على: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footPrivacy: 'الخصوصية',
    footTerms:   'الشروط والأحكام',
    footRisks:   'المخاطر',
    footHome:    'الرئيسية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = COOKIES_I18N;
}
