// ============================================================
//  public/terms.i18n.js — CrypView i18n
//  Traductions de la page Conditions d'utilisation (terms.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans terms.html :
//    <script src="public/terms.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = TERMS_I18N[locale] || TERMS_I18N.en;
//      document.querySelectorAll('[data-i18n]').forEach(el => {
//        const key = el.dataset.i18n;
//        if (T[key]) el.textContent = T[key];
//      });
//    </script>
// ============================================================

const TERMS_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    // <title> & meta
    pageTitle: 'Terms of Service — CrypView',
    metaDesc:  'CrypView Terms of Service: free crypto chart application, no financial advice provided.',

    // Nav
    navBack: '← Back to home',

    // Page header
    pageTag:  'Legal',
    h1:       'Terms of Service',
    pageMeta: 'Last updated: April 2026 · CrypView — Beta Capital Enterprise',

    // Notices
    noticeWarn: 'Using CrypView implies full and unreserved acceptance of these terms. If you do not accept these terms, please stop using the application immediately.',
    noticeInfo: 'CrypView is a <strong>free, registration-free</strong> application provided for informational purposes only. It does not constitute a regulated investment advisory service in any way.',

    // Article 1
    art1Title: 'Article 1 — Purpose',
    art1p1: 'These General Terms of Use (GTU) govern access to and use of the CrypView web application, accessible at <strong>crypview.betacapital.enterprise</strong>, published by Beta Capital Enterprise.',
    art1p2: 'CrypView is a real-time financial data visualization tool. It displays crypto-asset price charts, technical indicators and analysis tools, exclusively for <strong>informational and educational purposes</strong>.',

    // Article 2
    art2Title: 'Article 2 — Access to the service',
    art2p1: 'Access to CrypView is <strong>free, unrestricted and requires no registration</strong>. No user account is required. Use of the service requires a modern web browser and an internet connection.',
    art2p2: 'Beta Capital Enterprise reserves the right to suspend, modify or discontinue all or part of the service at any time, without notice and without any obligation to compensate users.',

    // Article 3
    art3Title: 'Article 3 — Nature of the service — What CrypView is not',
    art3p1: 'CrypView <strong>is not</strong> an investment service provider within the meaning of MiFID II. The application does not provide personalized advice, buy or sell recommendations, trading signals, or portfolio management.',
    art3li1: 'The technical indicators displayed are mathematical tools applied to historical data. They do not constitute forecasts or guarantees of future performance.',
    art3li2: 'The Paper Trading feature is a fictional simulation with no real value. Results obtained do not indicate real performance.',
    art3li3: 'The Backtesting feature reproduces past results which do not guarantee future performance.',
    art3li4: 'Price alerts are technical notifications and do not constitute buy or sell advice.',

    // Article 4
    art4Title: 'Article 4 — Data sources',
    art4p1: 'Market data displayed by CrypView comes from the <strong>Binance public API</strong> and <strong>GeckoTerminal</strong> (DEX data). These sources are independent third parties over which Beta Capital Enterprise has no control.',
    art4p2: 'Beta Capital Enterprise does not guarantee:',
    art4li1: 'The accuracy, completeness or currency of the data displayed',
    art4li2: 'The continuous availability of the service or data streams',
    art4li3: 'The absence of interruptions, delays or transmission errors',
    art4p3: 'In the event of a discrepancy between data displayed by CrypView and that of another source, the primary source (exchange, market) shall prevail.',

    // Article 5
    art5Title: 'Article 5 — Limitation of liability',
    art5p1: 'To the fullest extent permitted by applicable law, Beta Capital Enterprise <strong>disclaims all liability</strong> for:',
    art5li1: 'Any direct or indirect financial loss resulting from the use of CrypView or the information it displays',
    art5li2: 'Any investment decision made on the basis of data, indicators or analyses provided by the application',
    art5li3: 'Any damage resulting from a service interruption, data error or technical malfunction',
    art5li4: 'Any damage resulting from use of the Paper Trading, Backtesting or price alert features',
    art5li5: 'Any damage related to security breaches affecting third-party services (Binance, GitHub Pages, GeckoTerminal)',
    art5p2: 'The user acknowledges using CrypView with full knowledge of the risks inherent in crypto-asset markets, as described in the <a href="risks.html">Risk Disclaimer</a>.',

    // Article 6
    art6Title: 'Article 6 — Intellectual property',
    art6p1: 'CrypView is distributed under the <strong>MIT License</strong>. The source code is freely accessible and reusable in accordance with the terms of this license. The MIT License permits use, copying, modification and distribution of the code, provided the copyright notice is retained.',
    art6p2: 'Market data displayed in CrypView is the property of their respective sources (Binance, GeckoTerminal) and is subject to their own terms of use.',
    art6p3: 'The name "CrypView" and the associated logo are distinctive signs of Beta Capital Enterprise and may not be used without prior written authorization.',

    // Article 7
    art7Title: 'Article 7 — Acceptable use',
    art7p1: 'The user agrees to use CrypView in a lawful manner and in compliance with these GTU. The following are expressly prohibited:',
    art7li1: 'Any attempt to circumvent the security mechanisms of the application or third-party services',
    art7li2: 'Any use of CrypView for market manipulation purposes',
    art7li3: 'Any excessive automated scraping of data through the application interface',
    art7li4: 'Any reproduction or redistribution of market data in violation of Binance\'s or GeckoTerminal\'s terms of service',

    // Article 8
    art8Title: 'Article 8 — Modifications to the GTU',
    art8p1: 'Beta Capital Enterprise reserves the right to modify these GTU at any time. Modifications take effect upon publication on this page. The last update date is indicated at the top of the document. Continued use of CrypView after publication of the new GTU constitutes acceptance thereof.',

    // Article 9
    art9Title: 'Article 9 — Applicable law and jurisdiction',
    art9p1: 'These GTU are governed by <strong>French law</strong>. In the event of a dispute relating to the interpretation or performance of these terms, the parties will endeavor to find an amicable solution. Failing that, the dispute will be submitted to the <strong>competent French courts</strong>.',

    // Article 10
    art10Title: 'Article 10 — Contact',
    art10p1: 'For any questions regarding these GTU, you may contact Beta Capital Enterprise at: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
    art10p2: 'See also: <a href="privacy.html">Privacy Policy</a> · <a href="cookies.html">Cookie Policy</a> · <a href="risks.html">Risk Disclaimer</a>',

    // Footer
    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Privacy',
    footRisks:   'Risks',
    footHome:    'Home',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'Conditions d\'utilisation — CrypView',
    metaDesc:  'Conditions générales d\'utilisation de CrypView : application gratuite de graphiques crypto, sans conseil financier.',

    navBack: '← Retour à l\'accueil',

    pageTag:  'Légal',
    h1:       'Conditions d\'utilisation',
    pageMeta: 'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',

    noticeWarn: 'L\'utilisation de CrypView implique l\'acceptation pleine et entière des présentes conditions. Si vous n\'acceptez pas ces conditions, veuillez cesser d\'utiliser l\'application immédiatement.',
    noticeInfo: 'CrypView est une application <strong>gratuite, sans inscription</strong>, fournie à titre purement informatif. Elle ne constitue en aucun cas un service de conseil en investissement réglementé.',

    art1Title: 'Article 1 — Objet',
    art1p1: 'Les présentes Conditions Générales d\'Utilisation (CGU) régissent l\'accès et l\'utilisation de l\'application web CrypView, accessible à l\'adresse <strong>crypview.betacapital.enterprise</strong>, éditée par Beta Capital Enterprise.',
    art1p2: 'CrypView est un outil de visualisation de données financières en temps réel. Il affiche des graphiques de cours de crypto-actifs, des indicateurs techniques et des outils d\'analyse, à des fins exclusivement <strong>informatives et éducatives</strong>.',

    art2Title: 'Article 2 — Accès au service',
    art2p1: 'L\'accès à CrypView est <strong>libre, gratuit et sans inscription</strong>. Aucun compte utilisateur n\'est requis. L\'utilisation du service implique la disponibilité d\'un navigateur web moderne et d\'une connexion internet.',
    art2p2: 'Beta Capital Enterprise se réserve le droit de suspendre, modifier ou interrompre tout ou partie du service à tout moment, sans préavis et sans obligation d\'indemnisation envers les utilisateurs.',

    art3Title: 'Article 3 — Nature du service — Ce que CrypView n\'est pas',
    art3p1: 'CrypView <strong>n\'est pas</strong> un prestataire de services d\'investissement au sens de la directive MIF II. L\'application ne fournit ni conseil personnalisé, ni recommandation d\'achat ou de vente, ni signal de trading, ni gestion de portefeuille.',
    art3li1: 'Les indicateurs techniques affichés sont des outils mathématiques appliqués à des données historiques. Ils ne constituent pas des prévisions ni des garanties de performance future.',
    art3li2: 'La fonctionnalité Paper Trading est une simulation fictive sans valeur réelle. Les résultats obtenus ne préjugent pas de performances réelles.',
    art3li3: 'La fonctionnalité Backtesting reproduit des résultats passés qui ne garantissent pas les performances futures.',
    art3li4: 'Les alertes de prix sont des notifications techniques et ne constituent pas des conseils d\'achat ou de vente.',

    art4Title: 'Article 4 — Sources de données',
    art4p1: 'Les données de marché affichées par CrypView proviennent de l\'<strong>API publique Binance</strong> et de <strong>GeckoTerminal</strong> (données DEX). Ces sources sont des tiers indépendants sur lesquels Beta Capital Enterprise n\'exerce aucun contrôle.',
    art4p2: 'Beta Capital Enterprise ne garantit pas :',
    art4li1: 'L\'exactitude, l\'exhaustivité ou la mise à jour des données affichées',
    art4li2: 'La disponibilité continue du service ou des flux de données',
    art4li3: 'L\'absence d\'interruptions, de retards ou d\'erreurs de transmission',
    art4p3: 'En cas de discordance entre les données affichées par CrypView et celles d\'une autre source, la source primaire (exchange, bourse) fait foi.',

    art5Title: 'Article 5 — Limitation de responsabilité',
    art5p1: 'Dans toute la mesure permise par la loi applicable, Beta Capital Enterprise <strong>décline toute responsabilité</strong> pour :',
    art5li1: 'Toute perte financière directe ou indirecte résultant de l\'utilisation de CrypView ou des informations qu\'il affiche',
    art5li2: 'Toute décision d\'investissement prise sur la base des données, indicateurs ou analyses fournis par l\'application',
    art5li3: 'Tout dommage résultant d\'une interruption de service, d\'une erreur de données ou d\'un dysfonctionnement technique',
    art5li4: 'Tout dommage résultant de l\'utilisation des fonctionnalités de Paper Trading, Backtesting ou alertes de prix',
    art5li5: 'Tout dommage lié à des failles de sécurité affectant des services tiers (Binance, GitHub Pages, GeckoTerminal)',
    art5p2: 'L\'utilisateur reconnaît utiliser CrypView en connaissance des risques inhérents aux marchés de crypto-actifs, tels que décrits dans l\'<a href="risks.html">Avertissement sur les risques</a>.',

    art6Title: 'Article 6 — Propriété intellectuelle',
    art6p1: 'CrypView est distribué sous <strong>licence MIT</strong>. Le code source est librement accessible et réutilisable conformément aux termes de cette licence. La licence MIT autorise l\'utilisation, la copie, la modification et la distribution du code, à condition de conserver l\'avis de copyright.',
    art6p2: 'Les données de marché affichées dans CrypView sont la propriété de leurs sources respectives (Binance, GeckoTerminal) et sont soumises à leurs conditions d\'utilisation propres.',
    art6p3: 'Le nom « CrypView » et le logotype associé sont des signes distinctifs de Beta Capital Enterprise et ne peuvent être utilisés sans autorisation préalable écrite.',

    art7Title: 'Article 7 — Utilisation acceptable',
    art7p1: 'L\'utilisateur s\'engage à utiliser CrypView de manière licite et conforme aux présentes CGU. Sont notamment interdits :',
    art7li1: 'Toute tentative de contournement des mécanismes de sécurité de l\'application ou des services tiers',
    art7li2: 'Toute utilisation de CrypView à des fins de manipulation de marché',
    art7li3: 'Tout scraping automatisé excessif des données via l\'interface de l\'application',
    art7li4: 'Toute reproduction ou redistribution des données de marché en violation des CGU de Binance ou GeckoTerminal',

    art8Title: 'Article 8 — Modification des CGU',
    art8p1: 'Beta Capital Enterprise se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur cette page. La date de dernière mise à jour est indiquée en haut du document. L\'utilisation continue de CrypView après publication des nouvelles CGU vaut acceptation de celles-ci.',

    art9Title: 'Article 9 — Droit applicable et juridiction',
    art9p1: 'Les présentes CGU sont régies par le <strong>droit français</strong>. En cas de litige relatif à l\'interprétation ou l\'exécution des présentes conditions, les parties s\'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux <strong>juridictions compétentes françaises</strong>.',

    art10Title: 'Article 10 — Contact',
    art10p1: 'Pour toute question relative aux présentes CGU, vous pouvez contacter Beta Capital Enterprise à l\'adresse : <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
    art10p2: 'Voir également : <a href="privacy.html">Politique de confidentialité</a> · <a href="cookies.html">Politique de cookies</a> · <a href="risks.html">Avertissement sur les risques</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookies',
    footPrivacy: 'Confidentialité',
    footRisks:   'Risques',
    footHome:    'Accueil',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: '服务条款 — CrypView',
    metaDesc:  'CrypView 服务条款：免费加密货币图表应用，不提供投资建议。',

    navBack: '← 返回首页',

    pageTag:  '法律',
    h1:       '服务条款',
    pageMeta: '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',

    noticeWarn: '使用 CrypView 即表示您完全且无条件地接受本条款。如果您不同意本条款，请立即停止使用本应用。',
    noticeInfo: 'CrypView 是一款<strong>免费、无需注册</strong>的应用，仅供参考使用，不构成任何受监管的投资咨询服务。',

    art1Title: '第一条 — 目的',
    art1p1: '本《通用使用条款》（以下简称"条款"）规范对 CrypView 网络应用的访问和使用，该应用可通过 <strong>crypview.betacapital.enterprise</strong> 访问，由 Beta Capital Enterprise 发布。',
    art1p2: 'CrypView 是一款实时金融数据可视化工具，以<strong>纯信息和教育</strong>为目的，显示加密资产价格图表、技术指标和分析工具。',

    art2Title: '第二条 — 服务访问',
    art2p1: 'CrypView 的访问<strong>完全免费且无需注册</strong>。无需用户账户。使用本服务需要现代网络浏览器和互联网连接。',
    art2p2: 'Beta Capital Enterprise 保留随时暂停、修改或终止全部或部分服务的权利，无需提前通知，且对用户不承担任何赔偿义务。',

    art3Title: '第三条 — 服务性质 — CrypView 不是什么',
    art3p1: 'CrypView <strong>不是</strong> MiFID II 意义上的投资服务提供商。本应用不提供个性化建议、买卖推荐、交易信号或投资组合管理。',
    art3li1: '显示的技术指标是应用于历史数据的数学工具，不构成对未来表现的预测或保证。',
    art3li2: '模拟交易功能是无实际价值的虚拟模拟，所获得的结果不代表真实表现。',
    art3li3: '回测功能重现过去结果，不保证未来表现。',
    art3li4: '价格提醒是技术通知，不构成买卖建议。',

    art4Title: '第四条 — 数据来源',
    art4p1: 'CrypView 显示的市场数据来自<strong>币安公共 API</strong> 和 <strong>GeckoTerminal</strong>（DEX 数据）。这些来源是 Beta Capital Enterprise 无法控制的独立第三方。',
    art4p2: 'Beta Capital Enterprise 不保证：',
    art4li1: '显示数据的准确性、完整性或及时性',
    art4li2: '服务或数据流的持续可用性',
    art4li3: '无中断、延迟或传输错误',
    art4p3: '如果 CrypView 显示的数据与其他来源存在差异，以主要来源（交易所、市场）为准。',

    art5Title: '第五条 — 责任限制',
    art5p1: '在适用法律允许的最大范围内，Beta Capital Enterprise <strong>对以下情况不承担任何责任</strong>：',
    art5li1: '因使用 CrypView 或其显示信息而导致的任何直接或间接财务损失',
    art5li2: '基于应用提供的数据、指标或分析所作出的任何投资决策',
    art5li3: '因服务中断、数据错误或技术故障造成的任何损害',
    art5li4: '因使用模拟交易、回测或价格提醒功能造成的任何损害',
    art5li5: '与影响第三方服务（币安、GitHub Pages、GeckoTerminal）的安全漏洞相关的任何损害',
    art5p2: '用户确认在充分了解加密资产市场固有风险的情况下使用 CrypView，相关风险详见<a href="risks.html">风险声明</a>。',

    art6Title: '第六条 — 知识产权',
    art6p1: 'CrypView 在 <strong>MIT 许可证</strong>下发布。源代码可根据该许可证条款自由访问和再使用。MIT 许可证允许使用、复制、修改和分发代码，但须保留版权声明。',
    art6p2: 'CrypView 中显示的市场数据为其各自来源（币安、GeckoTerminal）的财产，并受其自身使用条款约束。',
    art6p3: '"CrypView" 名称及相关标志是 Beta Capital Enterprise 的专有标志，未经事先书面授权不得使用。',

    art7Title: '第七条 — 可接受使用',
    art7p1: '用户同意以合法方式且遵守本条款使用 CrypView。以下行为明确禁止：',
    art7li1: '任何绕过应用或第三方服务安全机制的尝试',
    art7li2: '任何以市场操纵为目的使用 CrypView 的行为',
    art7li3: '通过应用界面过度自动化抓取数据',
    art7li4: '任何违反币安或 GeckoTerminal 服务条款的市场数据复制或再发布',

    art8Title: '第八条 — 条款修改',
    art8p1: 'Beta Capital Enterprise 保留随时修改本条款的权利。修改在本页发布后立即生效。最后更新日期在文件顶部注明。发布新条款后继续使用 CrypView 即表示接受新条款。',

    art9Title: '第九条 — 适用法律和管辖权',
    art9p1: '本条款受<strong>法国法律</strong>管辖。如因解释或执行本条款产生争议，双方将努力寻求友好解决。否则，争议将提交<strong>法国有管辖权的法院</strong>裁决。',

    art10Title: '第十条 — 联系方式',
    art10p1: '如有任何关于本条款的疑问，可通过以下地址联系 Beta Capital Enterprise：<a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
    art10p2: '另见：<a href="privacy.html">隐私政策</a> · <a href="cookies.html">Cookie 政策</a> · <a href="risks.html">风险声明</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'Cookie',
    footPrivacy: '隐私',
    footRisks:   '风险',
    footHome:    '首页',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'شروط الاستخدام — CrypView',
    metaDesc:  'شروط استخدام CrypView: تطبيق مجاني لرسوم بيانية العملات المشفرة، لا ينصح باستثمارات.',

    navBack: '→ العودة إلى الرئيسية',

    pageTag:  'قانوني',
    h1:       'شروط الاستخدام',
    pageMeta: 'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',

    noticeWarn: 'يعني استخدام CrypView قبولك الكامل وغير المشروط لهذه الشروط. إذا لم توافق على هذه الشروط، يرجى التوقف عن استخدام التطبيق فوراً.',
    noticeInfo: 'CrypView تطبيق <strong>مجاني ولا يتطلب تسجيلاً</strong>، يُقدَّم لأغراض إعلامية فحسب، ولا يُشكّل بأي حال خدمة استشارات استثمارية خاضعة للتنظيم.',

    art1Title: 'المادة الأولى — الغرض',
    art1p1: 'تُنظّم هذه الشروط العامة للاستخدام الوصولَ إلى تطبيق CrypView على الويب المتاح على <strong>crypview.betacapital.enterprise</strong> والصادر عن Beta Capital Enterprise.',
    art1p2: 'CrypView أداة لعرض البيانات المالية في الوقت الفعلي. يعرض مخططات أسعار الأصول المشفرة والمؤشرات التقنية وأدوات التحليل، لأغراض <strong>إعلامية وتعليمية</strong> حصراً.',

    art2Title: 'المادة الثانية — الوصول إلى الخدمة',
    art2p1: 'الوصول إلى CrypView <strong>مجاني وحر ولا يستلزم تسجيلاً</strong>. لا يُشترط وجود حساب مستخدم. يتطلب استخدام الخدمة متصفح ويب حديثاً واتصالاً بالإنترنت.',
    art2p2: 'تحتفظ Beta Capital Enterprise بحق تعليق الخدمة أو تعديلها أو إيقافها كلياً أو جزئياً في أي وقت، دون إشعار مسبق وبدون أي التزام بالتعويض للمستخدمين.',

    art3Title: 'المادة الثالثة — طبيعة الخدمة — ما لا يُعدّ عليه CrypView',
    art3p1: 'CrypView <strong>ليس</strong> مزوداً لخدمات الاستثمار بمفهوم توجيه MiFID II. لا يُقدّم التطبيق نصائح شخصية، ولا توصيات بالشراء أو البيع، ولا إشارات تداول، ولا إدارة محافظ.',
    art3li1: 'المؤشرات التقنية المعروضة أدوات رياضية مطبقة على بيانات تاريخية، ولا تُشكّل تنبؤات أو ضمانات للأداء المستقبلي.',
    art3li2: 'ميزة التداول الورقي محاكاة وهمية لا قيمة حقيقية لها، والنتائج المحققة لا تمثل مؤشراً على الأداء الفعلي.',
    art3li3: 'ميزة الاختبار الخلفي تعيد إنتاج نتائج ماضية لا تضمن الأداء المستقبلي.',
    art3li4: 'تنبيهات الأسعار إشعارات تقنية ولا تمثل نصائح شراء أو بيع.',

    art4Title: 'المادة الرابعة — مصادر البيانات',
    art4p1: 'تأتي بيانات السوق التي يعرضها CrypView من <strong>واجهة برمجة Binance العامة</strong> و<strong>GeckoTerminal</strong> (بيانات DEX). هذه المصادر أطراف ثالثة مستقلة لا تمارس Beta Capital Enterprise أي سيطرة عليها.',
    art4p2: 'لا تضمن Beta Capital Enterprise:',
    art4li1: 'دقة البيانات المعروضة أو اكتمالها أو تحديثها',
    art4li2: 'الإتاحة المستمرة للخدمة أو تدفقات البيانات',
    art4li3: 'الخلو من الانقطاعات أو التأخيرات أو أخطاء الإرسال',
    art4p3: 'في حال وجود تعارض بين البيانات التي يعرضها CrypView وبيانات مصدر آخر، تُعدّ المصادر الأولية (البورصة، السوق) هي المرجع.',

    art5Title: 'المادة الخامسة — تحديد المسؤولية',
    art5p1: 'إلى أقصى حد تسمح به القوانين المعمول بها، <strong>تتنصّل Beta Capital Enterprise من كل مسؤولية</strong> عن:',
    art5li1: 'أي خسارة مالية مباشرة أو غير مباشرة ناجمة عن استخدام CrypView أو المعلومات التي يعرضها',
    art5li2: 'أي قرار استثماري اتُّخذ استناداً إلى البيانات أو المؤشرات أو التحليلات التي يوفرها التطبيق',
    art5li3: 'أي ضرر ناجم عن انقطاع الخدمة أو خطأ في البيانات أو خلل تقني',
    art5li4: 'أي ضرر ناجم عن استخدام ميزات التداول الورقي أو الاختبار الخلفي أو تنبيهات الأسعار',
    art5li5: 'أي ضرر مرتبط بثغرات أمنية تؤثر على خدمات الأطراف الثالثة (Binance، GitHub Pages، GeckoTerminal)',
    art5p2: 'يُقرّ المستخدم باستخدام CrypView مع الوعي الكامل بالمخاطر المتأصلة في أسواق الأصول المشفرة، كما هو موضح في <a href="risks.html">إخلاء المسؤولية عن المخاطر</a>.',

    art6Title: 'المادة السادسة — الملكية الفكرية',
    art6p1: 'يُوزَّع CrypView وفق <strong>رخصة MIT</strong>. يمكن الوصول إلى الكود المصدري بحرية وإعادة استخدامه وفق شروط هذه الرخصة، التي تُجيز الاستخدام والنسخ والتعديل والتوزيع شريطة الإبقاء على إشعار حقوق النشر.',
    art6p2: 'بيانات السوق المعروضة في CrypView ملك لمصادرها المعنية (Binance، GeckoTerminal) وتخضع لشروط استخدامها الخاصة.',
    art6p3: 'اسم "CrypView" والشعار المرتبط به علامات مميزة لـ Beta Capital Enterprise، ولا يجوز استخدامها دون إذن كتابي مسبق.',

    art7Title: 'المادة السابعة — الاستخدام المقبول',
    art7p1: 'يلتزم المستخدم باستخدام CrypView بصورة مشروعة ووفق هذه الشروط. يُحظر تحديداً:',
    art7li1: 'أي محاولة للتحايل على آليات أمان التطبيق أو الخدمات الخارجية',
    art7li2: 'أي استخدام لـ CrypView لأغراض التلاعب بالسوق',
    art7li3: 'أي جمع آلي مفرط للبيانات عبر واجهة التطبيق',
    art7li4: 'أي نسخ أو إعادة توزيع لبيانات السوق تنتهك شروط استخدام Binance أو GeckoTerminal',

    art8Title: 'المادة الثامنة — تعديل الشروط',
    art8p1: 'تحتفظ Beta Capital Enterprise بحق تعديل هذه الشروط في أي وقت. تدخل التعديلات حيز التنفيذ فور نشرها على هذه الصفحة. تاريخ آخر تحديث مذكور في أعلى المستند. يُعدّ الاستمرار في استخدام CrypView بعد نشر الشروط الجديدة قبولاً لها.',

    art9Title: 'المادة التاسعة — القانون المطبق والاختصاص القضائي',
    art9p1: 'تخضع هذه الشروط للـ<strong>قانون الفرنسي</strong>. في حال نشوء نزاع يتعلق بتفسير أو تنفيذ هذه الشروط، يسعى الطرفان إلى إيجاد حل ودي. وفي حال الفشل، يُحال النزاع إلى <strong>المحاكم الفرنسية المختصة</strong>.',

    art10Title: 'المادة العاشرة — التواصل',
    art10p1: 'لأي استفسار يتعلق بهذه الشروط، يمكنك التواصل مع Beta Capital Enterprise على: <a href="mailto:betacapital.discord@gmail.com">betacapital.discord@gmail.com</a>',
    art10p2: 'انظر أيضاً: <a href="privacy.html">سياسة الخصوصية</a> · <a href="cookies.html">سياسة الكوكيز</a> · <a href="risks.html">إخلاء المسؤولية عن المخاطر</a>',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footCookies: 'الكوكيز',
    footPrivacy: 'الخصوصية',
    footRisks:   'المخاطر',
    footHome:    'الرئيسية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TERMS_I18N;
}
