// ============================================================
//  public/i18n-static.js — CrypView i18n pour pages statiques
//  Utilisation :
//    1. Ajouter <script src="/public/i18n-static.js"></script> dans le <head>
//    2. Ajouter data-i18n="clé.sous.clé" sur les éléments HTML
//    3. data-i18n-html="clé" pour le innerHTML (balises conservées)
//    4. data-i18n-attr="placeholder:clé,title:clé2" pour les attributs
//  Détecte automatiquement la locale depuis le même localStorage que l'app.
// ============================================================

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  const STORAGE_KEY    = 'crypview_locale';
  const SUPPORTED      = ['en', 'fr', 'zh', 'ar'];
  const DEFAULT_LOCALE = 'fr';
  const RTL_LOCALES    = ['ar'];

  // ── Traductions des pages statiques ────────────────────────
  // Structure : TRANSLATIONS[locale][page][clé]
  const TRANSLATIONS = {

    // ── Français (fallback) ──────────────────────────────────
    fr: {
      nav: {
        back: '← Retour à l\'accueil',
        logo: 'CRYP<span class="accent">VIEW</span>',
      },
      footer: {
        copy:    '© 2026 CrypView — Beta Capital Enterprise',
        cookies: 'Cookies',
        terms:   'Conditions',
        risks:   'Risques',
        privacy: 'Confidentialité',
        home:    'Accueil',
        faq:     'FAQ',
      },

      // ── privacy.html ──────────────────────────────────────
      privacy: {
        pageTag:   'Légal',
        title:     'Politique de confidentialité',
        meta:      'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',
        noticeTxt: 'CrypView est une application <strong>100% client-side</strong>. Aucune donnée personnelle n\'est collectée, transmise ou stockée sur nos serveurs — car CrypView n\'en possède pas. Tout fonctionne localement dans votre navigateur.',

        s1_title: 'Responsable du traitement',
        s1_p1:    'CrypView est édité par <strong>Beta Capital Enterprise</strong>. Pour toute question relative à la présente politique, vous pouvez nous contacter à l\'adresse suivante : <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
        s1_p2:    'CrypView est hébergé sur <strong>GitHub Pages</strong> (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). L\'accès au service implique l\'application de la <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">politique de confidentialité de GitHub</a> concernant les données de trafic serveur.',

        s2_title: 'Données collectées',
        s2_p1:    'CrypView <strong>ne collecte aucune donnée personnelle</strong> identifiable. L\'application ne dispose d\'aucun formulaire d\'inscription, d\'aucun système de compte utilisateur, et n\'intègre aucun outil d\'analyse comportementale (Google Analytics, Hotjar, Mixpanel, etc.).',
        s2_th1: 'Type de donnée', s2_th2: 'Collecte', s2_th3: 'Localisation', s2_th4: 'Finalité',
        s2_r1c1: 'Données personnelles (nom, email…)',       s2_r1c2: 'Aucune',    s2_r1c3: '—',                       s2_r1c4: '—',
        s2_r2c1: 'Préférences d\'interface (thème, langue)', s2_r2c2: 'Local',     s2_r2c3: 'localStorage navigateur', s2_r2c4: 'Persistance de vos préférences',
        s2_r3c1: 'Alertes de prix configurées',              s2_r3c2: 'Local',     s2_r3c3: 'localStorage navigateur', s2_r3c4: 'Déclenchement des notifications',
        s2_r4c1: 'État multi-charts',                        s2_r4c2: 'Local',     s2_r4c3: 'localStorage navigateur', s2_r4c4: 'Restauration de la session',
        s2_r5c1: 'Données Paper Trading',                    s2_r5c2: 'Local',     s2_r5c3: 'localStorage navigateur', s2_r5c4: 'Simulation de trading fictif',
        s2_r6c1: 'Tracés & dessins sur le graphique',        s2_r6c2: 'Local',     s2_r6c3: 'localStorage navigateur', s2_r6c4: 'Persistance des annotations',
        s2_r7c1: 'Cookies analytiques ou publicitaires',     s2_r7c2: 'Aucun',     s2_r7c3: '—',                       s2_r7c4: '—',

        s3_title: 'Données de trafic (hébergeur)',
        s3_p1:    'Comme tout site web, l\'accès à CrypView génère automatiquement des journaux d\'accès côté serveur, gérés par <strong>GitHub Pages</strong>. Ces journaux peuvent inclure votre adresse IP, le navigateur utilisé, la page consultée et l\'horodatage. Ces données sont traitées par GitHub conformément à leur politique de confidentialité et ne sont pas accessibles à Beta Capital Enterprise.',
        s3_p2:    'CrypView ne possède aucun serveur applicatif propre et ne reçoit aucune donnée de trafic.',

        s4_title: 'Services tiers intégrés',
        s4_p1:    'CrypView sollicite les services externes suivants. Votre navigateur effectue directement ces requêtes — CrypView n\'agit pas en intermédiaire :',
        s4_li1:   '<strong>Binance API</strong> (api.binance.com) — données de marché OHLCV, WebSocket temps réel. <a href="https://www.binance.com/en/privacy" target="_blank" rel="noopener">Politique Binance</a>.',
        s4_li2:   '<strong>GeckoTerminal API</strong> (api.geckoterminal.com) — données DEX si la fonctionnalité est activée. <a href="https://www.coingecko.com/en/privacy" target="_blank" rel="noopener">Politique CoinGecko</a>.',
        s4_li3:   '<strong>Google Fonts</strong> (fonts.googleapis.com) — chargement des polices DM Mono et Syne. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Politique Google</a>.',
        s4_li4:   '<strong>GitHub Pages</strong> — hébergement statique. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Politique GitHub</a>.',
        s4_p2:    'CrypView ne partage aucune donnée avec des régies publicitaires, des courtiers de données ou des partenaires commerciaux.',

        s5_title: 'Stockage local (localStorage)',
        s5_p1:    'L\'ensemble des données de fonctionnement de CrypView est stocké dans le <code>localStorage</code> de votre navigateur. Ce mécanisme est strictement local à votre appareil — aucune donnée ne transite par un réseau ou un serveur tiers.',
        s5_p2:    'Vous pouvez supprimer intégralement ces données à tout moment :',
        s5_li1:   'Via les DevTools du navigateur → Application → Local Storage → effacer les clés <code>crypview_*</code>',
        s5_li2:   'En vidant le cache et les données de navigation (Paramètres → Confidentialité)',
        s5_li3:   'En utilisant le mode navigation privée (les données ne sont pas persistées)',

        s6_title: 'Vos droits (RGPD)',
        s6_p1:    'En l\'absence de collecte de données personnelles identifiables, les droits d\'accès, de rectification et d\'effacement prévus par le RGPD s\'appliquent de facto : toutes vos données sont accessibles et supprimables directement depuis votre navigateur, sans intermédiaire.',
        s6_p2:    'Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la <strong>CNIL</strong> (Commission Nationale de l\'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>.',

        s7_title: 'Modifications de la politique',
        s7_p1:    'Beta Capital Enterprise se réserve le droit de modifier la présente politique de confidentialité à tout moment. Toute modification sera reflétée par la mise à jour de la date en haut de cette page. L\'utilisation continue de CrypView après modification vaut acceptation des nouvelles conditions.',

        s8_title: 'Contact',
        s8_p1:    'Pour toute question relative à la présente politique ou à vos données, contactez-nous à : <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
      },

      // ── risks.html ────────────────────────────────────────
      risks: {
        pageTag:     '⚠ Légal',
        title:       'Avertissement sur les risques',
        meta:        'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',
        bannerTxt:   '<strong>LIRE AVANT UTILISATION — CE DOCUMENT EST IMPORTANT.</strong> Les crypto-actifs sont des instruments financiers à très haut risque. Vous pouvez perdre l\'intégralité des fonds investis. CrypView est un outil d\'analyse et d\'information — il ne constitue pas un service de conseil en investissement réglementé.',
        // … (mêmes clés à compléter pour toutes les sections)
        s1_title: 'Nature et limites de CrypView',
        s1_p1: 'CrypView est une <strong>application d\'analyse technique</strong> qui affiche des données de marché en temps réel issues de l\'API publique Binance.',
      },

      // ── terms.html ────────────────────────────────────────
      terms: {
        pageTag: 'Légal',
        title:   'Conditions d\'utilisation',
        meta:    'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',
      },

      // ── sitemap.html ──────────────────────────────────────
      sitemap: {
        pageTag:  'Navigation',
        title:    'Plan du site',
        subtitle: 'Vue d\'ensemble de toutes les pages et vues disponibles dans CrypView.',
      },
    },

    // ── English ──────────────────────────────────────────────
    en: {
      nav: {
        back: '← Back to home',
      },
      footer: {
        copy:    '© 2026 CrypView — Beta Capital Enterprise',
        cookies: 'Cookies',
        terms:   'Terms',
        risks:   'Risks',
        privacy: 'Privacy',
        home:    'Home',
        faq:     'FAQ',
      },

      privacy: {
        pageTag:   'Legal',
        title:     'Privacy Policy',
        meta:      'Last updated: April 2026 · CrypView — Beta Capital Enterprise',
        noticeTxt: 'CrypView is a <strong>100% client-side</strong> application. No personal data is collected, transmitted or stored on our servers — because CrypView has none. Everything runs locally in your browser.',

        s1_title: 'Data Controller',
        s1_p1:    'CrypView is published by <strong>Beta Capital Enterprise</strong>. For any question regarding this policy, contact us at: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
        s1_p2:    'CrypView is hosted on <strong>GitHub Pages</strong> (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Accessing the service is subject to <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub\'s privacy policy</a> regarding server traffic data.',

        s2_title: 'Data Collected',
        s2_p1:    'CrypView <strong>collects no personally identifiable data</strong>. The application has no registration form, no user account system, and integrates no behavioural analytics tools (Google Analytics, Hotjar, Mixpanel, etc.).',
        s2_th1: 'Data type', s2_th2: 'Collection', s2_th3: 'Location', s2_th4: 'Purpose',
        s2_r1c1: 'Personal data (name, email…)',          s2_r1c2: 'None',  s2_r1c3: '—',                   s2_r1c4: '—',
        s2_r2c1: 'Interface preferences (theme, locale)', s2_r2c2: 'Local', s2_r2c3: 'Browser localStorage', s2_r2c4: 'Persist your preferences',
        s2_r3c1: 'Configured price alerts',               s2_r3c2: 'Local', s2_r3c3: 'Browser localStorage', s2_r3c4: 'Trigger notifications',
        s2_r4c1: 'Multi-chart state',                     s2_r4c2: 'Local', s2_r4c3: 'Browser localStorage', s2_r4c4: 'Restore session',
        s2_r5c1: 'Paper Trading data',                    s2_r5c2: 'Local', s2_r5c3: 'Browser localStorage', s2_r5c4: 'Simulated trading',
        s2_r6c1: 'Chart drawings & annotations',          s2_r6c2: 'Local', s2_r6c3: 'Browser localStorage', s2_r6c4: 'Persist drawings',
        s2_r7c1: 'Analytics or advertising cookies',      s2_r7c2: 'None',  s2_r7c3: '—',                   s2_r7c4: '—',

        s3_title: 'Traffic Data (hosting)',
        s3_p1:    'Like any website, accessing CrypView automatically generates server-side access logs managed by <strong>GitHub Pages</strong>. These logs may include your IP address, browser, page visited and timestamp. They are processed by GitHub per their privacy policy and are not accessible to Beta Capital Enterprise.',
        s3_p2:    'CrypView has no application server of its own and receives no traffic data.',

        s4_title: 'Integrated Third-Party Services',
        s4_p1:    'CrypView calls the following external services. Your browser makes these requests directly — CrypView does not act as an intermediary:',
        s4_li1:   '<strong>Binance API</strong> (api.binance.com) — OHLCV market data, real-time WebSocket. <a href="https://www.binance.com/en/privacy" target="_blank" rel="noopener">Binance Policy</a>.',
        s4_li2:   '<strong>GeckoTerminal API</strong> (api.geckoterminal.com) — DEX data when the feature is enabled. <a href="https://www.coingecko.com/en/privacy" target="_blank" rel="noopener">CoinGecko Policy</a>.',
        s4_li3:   '<strong>Google Fonts</strong> (fonts.googleapis.com) — loading DM Mono and Syne fonts. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Policy</a>.',
        s4_li4:   '<strong>GitHub Pages</strong> — static hosting. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub Policy</a>.',
        s4_p2:    'CrypView shares no data with advertising networks, data brokers or commercial partners.',

        s5_title: 'Local Storage (localStorage)',
        s5_p1:    'All CrypView operational data is stored in your browser\'s <code>localStorage</code>. This mechanism is strictly local to your device — no data transits over a network or third-party server.',
        s5_p2:    'You can delete all this data at any time:',
        s5_li1:   'Via browser DevTools → Application → Local Storage → clear <code>crypview_*</code> keys',
        s5_li2:   'By clearing browser cache and browsing data (Settings → Privacy)',
        s5_li3:   'By using private/incognito mode (data is not persisted)',

        s6_title: 'Your Rights (GDPR)',
        s6_p1:    'In the absence of personally identifiable data collection, the GDPR rights of access, rectification and erasure apply de facto: all your data is accessible and deletable directly from your browser, without any intermediary.',
        s6_p2:    'If you believe your rights are not being respected, you may lodge a complaint with your national data protection authority (e.g. ICO in the UK, CNIL in France).',

        s7_title: 'Policy Changes',
        s7_p1:    'Beta Capital Enterprise reserves the right to modify this privacy policy at any time. Any changes will be reflected by updating the date at the top of this page. Continued use of CrypView after changes constitutes acceptance of the new terms.',

        s8_title: 'Contact',
        s8_p1:    'For any questions regarding this policy or your data, contact us at: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
      },

      risks: {
        pageTag:   '⚠ Legal',
        title:     'Risk Disclaimer',
        meta:      'Last updated: April 2026 · CrypView — Beta Capital Enterprise',
        bannerTxt: '<strong>READ BEFORE USE — THIS DOCUMENT IS IMPORTANT.</strong> Crypto-assets are very high-risk financial instruments. You may lose all invested funds. CrypView is an analysis and information tool — it does not constitute a regulated investment advisory service.',
        s1_title:  'Nature and Limits of CrypView',
        s1_p1:     'CrypView is a <strong>technical analysis application</strong> that displays real-time market data from the Binance public API.',
      },

      terms: {
        pageTag: 'Legal',
        title:   'Terms of Service',
        meta:    'Last updated: April 2026 · CrypView — Beta Capital Enterprise',
      },

      sitemap: {
        pageTag:  'Navigation',
        title:    'Sitemap',
        subtitle: 'Overview of all pages and views available in CrypView.',
      },
    },

    // ── 简体中文 ─────────────────────────────────────────────
    zh: {
      nav: {
        back: '← 返回首页',
      },
      footer: {
        copy:    '© 2026 CrypView — Beta Capital Enterprise',
        cookies: 'Cookie政策',
        terms:   '使用条款',
        risks:   '风险提示',
        privacy: '隐私政策',
        home:    '首页',
        faq:     'FAQ',
      },

      privacy: {
        pageTag:   '法律',
        title:     '隐私政策',
        meta:      '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',
        noticeTxt: 'CrypView 是一款<strong>100%客户端</strong>应用程序。我们不在服务器上收集、传输或存储任何个人数据——因为 CrypView 没有服务器。一切均在您的浏览器本地运行。',

        s1_title: '数据控制者',
        s1_p1:    'CrypView 由 <strong>Beta Capital Enterprise</strong> 发布。如有任何关于本政策的问题，请联系我们：<a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
        s1_p2:    'CrypView 托管于 <strong>GitHub Pages</strong>（GitHub, Inc., 美国旧金山）。访问该服务受 <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub 隐私政策</a>关于服务器流量数据的约束。',

        s2_title: '收集的数据',
        s2_p1:    'CrypView <strong>不收集任何可识别个人身份的数据</strong>。该应用程序没有注册表单、没有用户账户系统，也不集成任何行为分析工具（Google Analytics、Hotjar、Mixpanel等）。',
        s2_th1: '数据类型', s2_th2: '收集', s2_th3: '位置', s2_th4: '用途',
        s2_r1c1: '个人数据（姓名、邮箱…）',  s2_r1c2: '无',   s2_r1c3: '—',             s2_r1c4: '—',
        s2_r2c1: '界面偏好（主题、语言）',    s2_r2c2: '本地', s2_r2c3: '浏览器localStorage', s2_r2c4: '保存您的偏好',
        s2_r3c1: '已配置的价格提醒',          s2_r3c2: '本地', s2_r3c3: '浏览器localStorage', s2_r3c4: '触发通知',
        s2_r4c1: '多图表状态',                s2_r4c2: '本地', s2_r4c3: '浏览器localStorage', s2_r4c4: '恢复会话',
        s2_r5c1: '模拟交易数据',              s2_r5c2: '本地', s2_r5c3: '浏览器localStorage', s2_r5c4: '交易模拟',
        s2_r6c1: '图表绘图与注释',            s2_r6c2: '本地', s2_r6c3: '浏览器localStorage', s2_r6c4: '保留绘图',
        s2_r7c1: '分析或广告Cookie',          s2_r7c2: '无',   s2_r7c3: '—',             s2_r7c4: '—',

        s3_title: '流量数据（托管方）',
        s3_p1:    '与所有网站一样，访问 CrypView 会自动生成由 <strong>GitHub Pages</strong> 管理的服务器端访问日志。这些日志可能包含您的IP地址、使用的浏览器、访问的页面和时间戳。这些数据由GitHub根据其隐私政策处理，Beta Capital Enterprise 无法访问。',
        s3_p2:    'CrypView 没有自己的应用服务器，不接收任何流量数据。',

        s4_title: '集成的第三方服务',
        s4_p1:    'CrypView 调用以下外部服务。您的浏览器直接发出这些请求——CrypView 不充当中间人：',
        s4_li1:   '<strong>Binance API</strong>（api.binance.com）— OHLCV市场数据，实时WebSocket。<a href="https://www.binance.com/en/privacy" target="_blank" rel="noopener">币安政策</a>。',
        s4_li2:   '<strong>GeckoTerminal API</strong>（api.geckoterminal.com）— 启用DEX功能时的数据。<a href="https://www.coingecko.com/en/privacy" target="_blank" rel="noopener">CoinGecko政策</a>。',
        s4_li3:   '<strong>Google Fonts</strong>（fonts.googleapis.com）— 加载DM Mono和Syne字体。<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">谷歌政策</a>。',
        s4_li4:   '<strong>GitHub Pages</strong> — 静态托管。<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub政策</a>。',
        s4_p2:    'CrypView 不与广告网络、数据经纪商或商业合作伙伴共享任何数据。',

        s5_title: '本地存储（localStorage）',
        s5_p1:    'CrypView 的所有运行数据存储在您浏览器的 <code>localStorage</code> 中。此机制严格在您的设备本地运行——任何数据都不会通过网络或第三方服务器传输。',
        s5_p2:    '您可以随时删除所有这些数据：',
        s5_li1:   '通过浏览器开发者工具 → 应用程序 → 本地存储 → 清除 <code>crypview_*</code> 键',
        s5_li2:   '通过清除浏览器缓存和浏览数据（设置 → 隐私）',
        s5_li3:   '使用无痕/隐私模式浏览（数据不会被保留）',

        s6_title: '您的权利（GDPR）',
        s6_p1:    '由于不收集可识别个人身份的数据，GDPR规定的访问、更正和删除权利已自动适用：您的所有数据可直接从浏览器访问和删除，无需任何中间人。',
        s6_p2:    '如果您认为您的权利未得到尊重，可向您所在国家的数据保护机构提出投诉。',

        s7_title: '政策变更',
        s7_p1:    'Beta Capital Enterprise 保留随时修改本隐私政策的权利。任何修改都将通过更新本页顶部的日期来体现。修改后继续使用 CrypView 即视为接受新条款。',

        s8_title: '联系方式',
        s8_p1:    '如有任何关于本政策或您的数据的问题，请联系我们：<a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
      },

      risks: {
        pageTag:   '⚠ 法律',
        title:     '风险提示',
        meta:      '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',
        bannerTxt: '<strong>使用前请阅读——本文件非常重要。</strong>加密资产是极高风险的金融工具。您可能损失全部投资资金。CrypView 是一款分析和信息工具——它不构成受监管的投资顾问服务。',
        s1_title:  'CrypView 的性质与局限',
        s1_p1:     'CrypView 是一款<strong>技术分析应用程序</strong>，显示来自币安公共API的实时市场数据。',
      },

      terms: {
        pageTag: '法律',
        title:   '使用条款',
        meta:    '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',
      },

      sitemap: {
        pageTag:  '导航',
        title:    '网站地图',
        subtitle: 'CrypView 所有页面和视图的概览。',
      },
    },

    // ── العربية (RTL) ────────────────────────────────────────
    ar: {
      nav: {
        back: '← العودة إلى الرئيسية',
      },
      footer: {
        copy:    '© 2026 CrypView — Beta Capital Enterprise',
        cookies: 'ملفات تعريف الارتباط',
        terms:   'الشروط والأحكام',
        risks:   'تحذيرات المخاطر',
        privacy: 'الخصوصية',
        home:    'الرئيسية',
        faq:     'الأسئلة الشائعة',
      },

      privacy: {
        pageTag:   'قانوني',
        title:     'سياسة الخصوصية',
        meta:      'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',
        noticeTxt: 'CrypView تطبيق <strong>100% على جانب العميل</strong>. لا يتم جمع أي بيانات شخصية أو إرسالها أو تخزينها على خوادمنا — لأن CrypView لا يملك خوادم. كل شيء يعمل محليًا في متصفحك.',

        s1_title: 'المتحكم في البيانات',
        s1_p1:    'CrypView منشور بواسطة <strong>Beta Capital Enterprise</strong>. لأي استفسار يتعلق بهذه السياسة، يمكنك التواصل معنا على: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
        s1_p2:    'CrypView مستضاف على <strong>GitHub Pages</strong> (GitHub, Inc., سان فرانسيسكو، الولايات المتحدة). يخضع الوصول إلى الخدمة لـ <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">سياسة خصوصية GitHub</a> المتعلقة ببيانات حركة المرور على الخادم.',

        s2_title: 'البيانات المجمعة',
        s2_p1:    'CrypView <strong>لا يجمع أي بيانات شخصية</strong> قابلة للتعريف. التطبيق لا يحتوي على نموذج تسجيل أو نظام حسابات مستخدمين، ولا يدمج أي أدوات تحليل سلوكي.',
        s2_th1: 'نوع البيانات', s2_th2: 'الجمع', s2_th3: 'الموقع', s2_th4: 'الغرض',
        s2_r1c1: 'البيانات الشخصية (الاسم، البريد…)', s2_r1c2: 'لا شيء', s2_r1c3: '—',                      s2_r1c4: '—',
        s2_r2c1: 'تفضيلات الواجهة (السمة، اللغة)',    s2_r2c2: 'محلي',   s2_r2c3: 'localStorage المتصفح', s2_r2c4: 'حفظ تفضيلاتك',
        s2_r3c1: 'تنبيهات الأسعار المضبوطة',           s2_r3c2: 'محلي',   s2_r3c3: 'localStorage المتصفح', s2_r3c4: 'تشغيل الإشعارات',
        s2_r4c1: 'حالة الرسوم البيانية المتعددة',       s2_r4c2: 'محلي',   s2_r4c3: 'localStorage المتصفح', s2_r4c4: 'استعادة الجلسة',
        s2_r5c1: 'بيانات التداول الورقي',               s2_r5c2: 'محلي',   s2_r5c3: 'localStorage المتصفح', s2_r5c4: 'محاكاة التداول',
        s2_r6c1: 'الرسومات والتعليقات على الرسم البياني',s2_r7c2: 'محلي',   s2_r6c3: 'localStorage المتصفح', s2_r6c4: 'حفظ الرسومات',
        s2_r7c1: 'ملفات تعريف ارتباط تحليلية أو إعلانية', s2_r7c2: 'لا شيء', s2_r7c3: '—',                      s2_r7c4: '—',

        s3_title: 'بيانات حركة المرور (المضيف)',
        s3_p1:    'كأي موقع ويب، يُنشئ الوصول إلى CrypView تلقائيًا سجلات وصول على جانب الخادم تديرها <strong>GitHub Pages</strong>. يمكن أن تشمل هذه السجلات عنوان IP الخاص بك والمتصفح المستخدم والصفحة التي تمت زيارتها والطابع الزمني.',
        s3_p2:    'لا يمتلك CrypView أي خادم تطبيقات خاص به ولا يتلقى أي بيانات حركة مرور.',

        s4_title: 'خدمات الأطراف الثالثة المدمجة',
        s4_p1:    'يستدعي CrypView الخدمات الخارجية التالية. يقوم متصفحك بهذه الطلبات مباشرة — CrypView لا يعمل كوسيط:',
        s4_li1:   '<strong>Binance API</strong> (api.binance.com) — بيانات سوق OHLCV، WebSocket في الوقت الفعلي. <a href="https://www.binance.com/en/privacy" target="_blank" rel="noopener">سياسة Binance</a>.',
        s4_li2:   '<strong>GeckoTerminal API</strong> (api.geckoterminal.com) — بيانات DEX عند تفعيل الميزة. <a href="https://www.coingecko.com/en/privacy" target="_blank" rel="noopener">سياسة CoinGecko</a>.',
        s4_li3:   '<strong>Google Fonts</strong> (fonts.googleapis.com) — تحميل خطوط DM Mono وSyne. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">سياسة Google</a>.',
        s4_li4:   '<strong>GitHub Pages</strong> — استضافة ثابتة. <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">سياسة GitHub</a>.',
        s4_p2:    'لا يشارك CrypView أي بيانات مع شبكات الإعلانات أو وسطاء البيانات أو الشركاء التجاريين.',

        s5_title: 'التخزين المحلي (localStorage)',
        s5_p1:    'جميع بيانات تشغيل CrypView مخزنة في <code>localStorage</code> متصفحك. هذه الآلية محلية تمامًا على جهازك — لا تنتقل أي بيانات عبر شبكة أو خادم طرف ثالث.',
        s5_p2:    'يمكنك حذف جميع هذه البيانات في أي وقت:',
        s5_li1:   'عبر أدوات المطور في المتصفح ← التطبيق ← التخزين المحلي ← مسح مفاتيح <code>crypview_*</code>',
        s5_li2:   'بمسح ذاكرة التخزين المؤقت وبيانات التصفح (الإعدادات ← الخصوصية)',
        s5_li3:   'باستخدام وضع التصفح الخاص (لا يتم حفظ البيانات)',

        s6_title: 'حقوقك (GDPR)',
        s6_p1:    'في غياب جمع بيانات شخصية قابلة للتعريف، تنطبق حقوق الوصول والتصحيح والحذف المنصوص عليها في GDPR بحكم الواقع: جميع بياناتك يمكن الوصول إليها وحذفها مباشرة من متصفحك دون أي وسيط.',
        s6_p2:    'إذا كنت تعتقد أن حقوقك غير مصونة، يمكنك تقديم شكوى إلى هيئة حماية البيانات الوطنية في بلدك.',

        s7_title: 'تعديلات السياسة',
        s7_p1:    'تحتفظ Beta Capital Enterprise بالحق في تعديل سياسة الخصوصية هذه في أي وقت. ستنعكس أي تعديلات من خلال تحديث التاريخ في أعلى هذه الصفحة. استمرار استخدام CrypView بعد التعديل يُعدّ قبولاً للشروط الجديدة.',

        s8_title: 'التواصل',
        s8_p1:    'لأي استفسار يتعلق بهذه السياسة أو بياناتك، تواصل معنا على: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
      },

      risks: {
        pageTag:   '⚠ قانوني',
        title:     'تحذير المخاطر',
        meta:      'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',
        bannerTxt: '<strong>اقرأ قبل الاستخدام — هذه الوثيقة مهمة.</strong> الأصول المشفرة أدوات مالية عالية المخاطر جدًا. قد تخسر جميع الأموال المستثمرة. CrypView أداة تحليل ومعلومات — لا تُشكّل خدمة استشارة استثمارية مرخصة.',
        s1_title:  'طبيعة CrypView وحدوده',
        s1_p1:     'CrypView هو <strong>تطبيق تحليل تقني</strong> يعرض بيانات السوق في الوقت الفعلي من واجهة برمجة تطبيقات Binance العامة.',
      },

      terms: {
        pageTag: 'قانوني',
        title:   'شروط الاستخدام',
        meta:    'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',
      },

      sitemap: {
        pageTag:  'التنقل',
        title:    'خريطة الموقع',
        subtitle: 'نظرة عامة على جميع الصفحات والعروض المتاحة في CrypView.',
      },
    },
  };

  // ── Utilitaires ─────────────────────────────────────────────

  /** Résoud une clé pointée dans un objet. Ex: 'privacy.s1_title' */
  function resolve(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  /** Détecte la locale active (même logique que i18n.js) */
  function detectLocale() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (_) {}

    const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
    for (const lang of candidates) {
      if (/^zh/i.test(lang)) return 'zh';
      if (/^ar/i.test(lang)) return 'ar';
      const base = lang.split('-')[0].toLowerCase();
      if (SUPPORTED.includes(base)) return base;
    }
    return DEFAULT_LOCALE;
  }

  /** Détecte la page courante depuis l'URL */
  function detectPage() {
    const path = window.location.pathname;
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('risks'))   return 'risks';
    if (path.includes('terms'))   return 'terms';
    if (path.includes('sitemap')) return 'sitemap';
    return null;
  }

  // ── Moteur de traduction ─────────────────────────────────────

  function applyTranslations(locale, page) {
    const t    = TRANSLATIONS[locale]  ?? TRANSLATIONS[DEFAULT_LOCALE];
    const tFb  = TRANSLATIONS[DEFAULT_LOCALE]; // fallback français
    const data = (key) => resolve(t, key) ?? resolve(tFb, key) ?? '';

    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = data(key);
      if (val) el.textContent = val;
    });

    // data-i18n-html → innerHTML (pour les liens et balises)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.dataset.i18nHtml;
      const val = data(key);
      if (val) el.innerHTML = val;
    });

    // data-i18n-attr → attributs HTML (placeholder, title, aria-label…)
    // format: "placeholder:clé1,title:clé2"
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(',').forEach(pair => {
        const [attr, key] = pair.trim().split(':');
        const val = data(key.trim());
        if (val) el.setAttribute(attr.trim(), val);
      });
    });
  }

  /** Applique la direction RTL/LTR et la langue sur <html> */
  function applyDirection(locale) {
    const isRTL = RTL_LOCALES.includes(locale);
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.classList.toggle('rtl', isRTL);
  }

  /** Construit le sélecteur de langue injecté dans la nav */
  function buildLangSwitcher(currentLocale) {
    const labels = { en: '🇬🇧 EN', fr: '🇫🇷 FR', zh: '🇨🇳 ZH', ar: '🇸🇦 AR' };
    const wrap = document.createElement('div');
    wrap.className = 'lang-switcher';
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center';

    SUPPORTED.forEach(loc => {
      const btn = document.createElement('button');
      btn.textContent = labels[loc] ?? loc.toUpperCase();
      btn.style.cssText = `
        font-family:inherit;font-size:10px;letter-spacing:.06em;cursor:pointer;
        border:1px solid ${loc === currentLocale ? 'var(--accent)' : 'var(--border)'};
        color:${loc === currentLocale ? 'var(--accent)' : 'var(--muted)'};
        background:transparent;padding:3px 8px;border-radius:3px;
        transition:border-color .15s,color .15s;
      `;
      btn.addEventListener('click', () => {
        try { localStorage.setItem(STORAGE_KEY, loc); } catch (_) {}
        window.location.reload();
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  // ── Init ─────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
    const locale = detectLocale();
    const page   = detectPage();

    applyDirection(locale);
    if (page) applyTranslations(locale, page);

    // Injection du sélecteur de langue dans la nav
    const nav = document.querySelector('nav');
    if (nav) {
      const switcher = buildLangSwitcher(locale);
      // Insérer entre le logo et le bouton retour existant
      const back = nav.querySelector('.nav-back');
      if (back) nav.insertBefore(switcher, back);
      else nav.appendChild(switcher);
    }
  });

})();
