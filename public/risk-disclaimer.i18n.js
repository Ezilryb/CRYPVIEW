// ============================================================
//  public/risk-disclaimer.i18n.js — CrypView i18n
//  Traductions de la page Avertissement sur les risques (risk-disclaimer.html)
//  Locales : en · fr · zh · ar
//
//  Usage dans risk-disclaimer.html :
//    <script src="public/risk-disclaimer.i18n.js"></script>
//    <script>
//      const locale = localStorage.getItem('crypview_locale') || 'fr';
//      const T = RISK_DISCLAIMER_I18N[locale] || RISK_DISCLAIMER_I18N.en;
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

const RISK_DISCLAIMER_I18N = {

  // ── English ───────────────────────────────────────────────
  en: {
    pageTitle: 'Risk Disclaimer — CrypView',
    metaDesc:  'Risk disclaimer for CrypView: crypto-assets are high-risk instruments. CrypView is an analysis tool, not an investment advisory service.',

    navBack: '← Back to home',

    pageTag:  '⚠ Legal',
    h1:       'Risk Disclaimer',
    pageMeta: 'Last updated: April 2026 · CrypView — Beta Capital Enterprise',

    bannerTxt: '<strong>READ BEFORE USE — THIS DOCUMENT IS IMPORTANT.</strong> Crypto-assets are very high-risk financial instruments. You may lose all invested funds. CrypView is an analysis and information tool — it does not constitute a regulated investment advisory service.',

    s1Title: 'Nature and Limits of CrypView',
    s1p1:    'CrypView is a <strong>technical analysis application</strong> that displays real-time market data from the Binance public API. The application is designed exclusively for informational and educational purposes.',
    s1p2:    'CrypView <strong>does not provide</strong>: buy or sell recommendations, automatic trading signals, personalized advice, or portfolio management. No investment decision should be made solely on the basis of the data or indicators displayed.',
    s1p3:    'Technical indicators (RSI, MACD, Bollinger…) are mathematical tools based on historical price data. They <strong>do not predict the future</strong> and guarantee no result.',

    s2Title: 'Risks Inherent in Crypto-Assets',

    risk1Title: 'Total loss of capital',
    risk1Desc:  'Crypto-assets can lose 100% of their value. Assets that have lost 80 to 99% of their value within weeks or months are well documented throughout crypto market history.',

    risk2Title: 'Extreme volatility',
    risk2Desc:  '±30% moves in 24 hours are common. Leveraged positions amplify these movements and can be liquidated very quickly, even by small fluctuations.',

    risk3Title: 'Technical and custody risks',
    risk3Desc:  'Loss of private keys, exchange hacks, smart contract vulnerabilities, and scams (rug pulls, phishing, fake projects) represent real risks of irreversible loss of funds.',

    risk4Title: 'Regulatory uncertainty',
    risk4Desc:  'The legal framework for crypto-assets is evolving rapidly and varies by country. Regulatory decisions (bans, restrictions, taxation) can significantly impact asset values or the ability to hold them.',

    risk5Title: 'Liquidity risk',
    risk5Desc:  'Some assets, particularly small-caps, may have insufficient liquidity to allow selling at the desired price, especially during sharp market movements.',

    risk6Title: 'Market manipulation',
    risk6Desc:  'Crypto markets are less regulated than traditional markets. Practices such as wash trading, pump & dump schemes, or order book manipulation exist and can mislead technical analysts.',

    s3Title: 'Paper Trading and Backtesting',
    s3p1:    'The <strong>Paper Trading</strong> and <strong>Backtesting</strong> features of CrypView are simulations for educational purposes only. Past performance does not predict future results.',
    s3p2:    'A backtest showing excellent historical results may significantly underperform in real conditions due to <strong>survivorship bias</strong>, <strong>overfitting</strong>, transaction fees, slippage, and the difference between simulated and actual execution prices.',
    s3p3:    'Paper Trading simulates trades without real risk — results obtained in a simulation environment <strong>cannot be extrapolated</strong> to real trading performance.',

    s4Title: 'Data Accuracy and Availability',
    s4p1:    'Market data displayed by CrypView comes from the <strong>Binance public API</strong>. CrypView does not control this data and cannot guarantee its accuracy, completeness or continuous availability.',
    s4p2:    'Service interruptions, transmission delays, parsing errors or WebSocket malfunctions may result in incorrect, missing or delayed data being displayed. <strong>Never make a critical financial decision based solely on data displayed by CrypView</strong> without verifying from the primary source.',
    s4p3:    'Price alerts require the tab to be open and connected. CrypView cannot be held liable for alerts not triggered due to disconnection, browser closure or network outage.',

    s5Title: 'Limitation of Liability',
    s5p1:    'CrypView and Beta Capital Enterprise <strong>disclaim all liability</strong> for:',
    s5li1:   'Direct or indirect financial losses resulting from use of the application',
    s5li2:   'Investment decisions made on the basis of information displayed',
    s5li3:   'Errors, inaccuracies or interruptions in market data',
    s5li4:   'Technical failures or browser limitations',
    s5li5:   'Use of the Paper Trading and Backtesting features',
    s5p2:    'Use of CrypView implies full and unreserved acceptance of these conditions. If you do not accept these terms, stop using the application immediately.',

    s6Title: 'Recommendations',
    s6p1:    'Before investing in crypto-assets, it is strongly recommended to:',
    s6li1:   'Consult a <strong>licensed financial advisor</strong> in your country',
    s6li2:   'Only invest amounts you can afford to lose entirely',
    s6li3:   'Diversify your investments and do not concentrate your entire wealth in crypto-assets',
    s6li4:   'Find out about the applicable taxation in your jurisdiction',
    s6li5:   'Understand the technical workings of assets before any investment',
    s6p2:    'Educational resources are available from regulators such as the <a href="https://www.fca.org.uk/consumers/cryptoassets" target="_blank" rel="noopener">FCA (UK)</a>, the <a href="https://www.sec.gov/investor/pubs/invesmadesimp.htm" target="_blank" rel="noopener">SEC (USA)</a>, and the <a href="https://www.esma.europa.eu" target="_blank" rel="noopener">ESMA (EU)</a>.',

    finalDisclaimerTitle: '⚠ CrypView is an information tool, not a financial advisor.',
    finalDisclaimerText:  'By using this application, you acknowledge having read and understood this document, and agree that CrypView cannot be held liable for the financial consequences of your investment decisions. Invest responsibly.',

    quickLink1: 'FCA — Cryptoassets ↗',
    quickLink2: 'ESMA ↗',
    quickLink3: 'CrypView FAQ',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookies',
    footPrivacy: 'Privacy',
    footTerms:   'Terms',
    footHome:    'Home',
  },

  // ── Français ──────────────────────────────────────────────
  fr: {
    pageTitle: 'Avertissement sur les risques — CrypView',
    metaDesc:  'Avertissement sur les risques liés aux crypto-actifs et à l\'utilisation de CrypView — outil d\'analyse, pas de conseil en investissement.',

    navBack: '← Retour à l\'accueil',

    pageTag:  '⚠ Légal',
    h1:       'Avertissement sur les risques',
    pageMeta: 'Dernière mise à jour : Avril 2026 · CrypView — Beta Capital Enterprise',

    bannerTxt: '<strong>LIRE AVANT UTILISATION — CE DOCUMENT EST IMPORTANT.</strong> Les crypto-actifs sont des instruments financiers à très haut risque. Vous pouvez perdre l\'intégralité des fonds investis. CrypView est un outil d\'analyse et d\'information — il ne constitue pas un service de conseil en investissement réglementé.',

    s1Title: 'Nature et limites de CrypView',
    s1p1:    'CrypView est une <strong>application d\'analyse technique</strong> qui affiche des données de marché en temps réel issues de l\'API publique Binance. L\'application est conçue exclusivement à titre informatif et éducatif.',
    s1p2:    'CrypView <strong>ne fournit pas</strong> : de recommandations d\'achat ou de vente, de signaux de trading automatiques, de conseils personnalisés, ni de gestion de portefeuille. Aucune décision d\'investissement ne devrait être prise sur la seule base des données ou indicateurs affichés.',
    s1p3:    'Les indicateurs techniques (RSI, MACD, Bollinger…) sont des outils mathématiques basés sur l\'historique de prix. Ils <strong>ne prédisent pas l\'avenir</strong> et ne garantissent aucun résultat.',

    s2Title: 'Risques inhérents aux crypto-actifs',

    risk1Title: 'Perte totale du capital',
    risk1Desc:  'Les crypto-actifs peuvent perdre 100% de leur valeur. Des actifs ayant perdu 80 à 99% de leur valeur en quelques semaines ou mois sont documentés à de nombreuses reprises dans l\'histoire des marchés crypto.',

    risk2Title: 'Volatilité extrême',
    risk2Desc:  'Les variations de ±30% en 24h sont courantes. Les positions avec effet de levier amplifient ces mouvements et peuvent être liquidées très rapidement, même par des fluctuations de faible amplitude.',

    risk3Title: 'Risques techniques et de garde',
    risk3Desc:  'La perte de clés privées, les piratages d\'exchanges, les failles de smart contracts et les escroqueries (rug pulls, phishing, faux projets) représentent des risques réels de perte irréversible des fonds.',

    risk4Title: 'Incertitude réglementaire',
    risk4Desc:  'Le cadre légal des crypto-actifs évolue rapidement et varie selon les pays. Des décisions réglementaires (interdictions, restrictions, fiscalité) peuvent impacter fortement la valeur des actifs ou la possibilité de les détenir.',

    risk5Title: 'Risque de liquidité',
    risk5Desc:  'Certains actifs, en particulier les petites capitalisations, peuvent présenter une liquidité insuffisante pour permettre la vente au prix souhaité, notamment lors de mouvements de marché brusques.',

    risk6Title: 'Manipulation de marché',
    risk6Desc:  'Les marchés crypto sont moins régulés que les marchés traditionnels. Des pratiques comme le wash trading, les pump & dump ou la manipulation des carnets d\'ordres existent et peuvent induire en erreur les analystes techniques.',

    s3Title: 'Paper Trading et Backtesting',
    s3p1:    'Les fonctionnalités de <strong>Paper Trading</strong> et de <strong>Backtesting</strong> de CrypView sont des simulations à titre éducatif uniquement. Les performances passées ne préjugent pas des performances futures.',
    s3p2:    'Un backtest présentant d\'excellents résultats historiques peut sous-performer significativement en conditions réelles en raison du <strong>biais de survie</strong>, du <strong>surapprentissage</strong> (overfitting), des frais de transaction, du slippage et de la différence entre prix de simulation et prix d\'exécution réels.',
    s3p3:    'Le Paper Trading simule des trades sans risque réel — les résultats obtenus dans un environnement de simulation <strong>ne peuvent pas être extrapolés</strong> à des performances en trading réel.',

    s4Title: 'Exactitude et disponibilité des données',
    s4p1:    'Les données de marché affichées par CrypView proviennent de l\'<strong>API publique Binance</strong>. CrypView ne contrôle pas ces données et ne peut garantir leur exactitude, complétude ou disponibilité continue.',
    s4p2:    'Des interruptions de service, des délais de transmission, des erreurs de parsing ou des dysfonctionnements du WebSocket peuvent entraîner l\'affichage de données incorrectes, manquantes ou décalées. <strong>Ne prenez jamais de décision financière critique basée uniquement sur les données affichées par CrypView</strong> sans vérification sur la source primaire.',
    s4p3:    'Les alertes de prix nécessitent que l\'onglet soit ouvert et connecté. CrypView ne peut être tenu responsable d\'alertes non déclenchées en cas de déconnexion, fermeture du navigateur ou de coupure réseau.',

    s5Title: 'Limitation de responsabilité',
    s5p1:    'CrypView et Beta Capital Enterprise <strong>déclinent toute responsabilité</strong> pour :',
    s5li1:   'Les pertes financières directes ou indirectes résultant de l\'utilisation de l\'application',
    s5li2:   'Les décisions d\'investissement prises sur la base des informations affichées',
    s5li3:   'Les erreurs, inexactitudes ou interruptions des données de marché',
    s5li4:   'Les défaillances techniques ou les limitations des navigateurs',
    s5li5:   'L\'utilisation des fonctionnalités de Paper Trading et de Backtesting',
    s5p2:    'L\'utilisation de CrypView implique l\'acceptation pleine et entière de ces conditions. Si vous n\'acceptez pas ces termes, cessez immédiatement d\'utiliser l\'application.',

    s6Title: 'Recommandations',
    s6p1:    'Avant d\'investir dans des crypto-actifs, il est vivement recommandé de :',
    s6li1:   'Consulter un <strong>conseiller financier agréé</strong> dans votre pays',
    s6li2:   'N\'investir que des sommes que vous êtes en mesure de perdre intégralement',
    s6li3:   'Diversifier vos investissements et ne pas concentrer l\'ensemble de votre patrimoine en crypto-actifs',
    s6li4:   'Vous informer sur la fiscalité applicable dans votre juridiction',
    s6li5:   'Comprendre le fonctionnement technique des actifs avant tout investissement',
    s6p2:    'Des ressources éducatives sont disponibles auprès de l\'<a href="https://www.amf-france.org/fr/espace-epargnants/comprendre-les-produits-financiers/supports-dinvestissement/cryptoactifs" target="_blank" rel="noopener">AMF (France)</a>, de l\'<a href="https://www.esma.europa.eu" target="_blank" rel="noopener">ESMA (UE)</a> et des régulateurs locaux de chaque pays.',

    finalDisclaimerTitle: '⚠ CrypView est un outil d\'information, pas un conseiller financier.',
    finalDisclaimerText:  'En utilisant cette application, vous reconnaissez avoir lu et compris ce document, et acceptez que CrypView ne peut être tenu responsable des conséquences financières de vos décisions d\'investissement. Investissez de manière responsable.',

    quickLink1: 'AMF — Cryptoactifs ↗',
    quickLink2: 'ESMA ↗',
    quickLink3: 'FAQ CrypView',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookies',
    footPrivacy: 'Confidentialité',
    footTerms:   'Conditions',
    footHome:    'Accueil',
  },

  // ── 简体中文 ───────────────────────────────────────────────
  zh: {
    pageTitle: '风险提示 — CrypView',
    metaDesc:  'CrypView风险提示：加密资产是高风险金融工具。CrypView是分析工具，不提供投资建议。',

    navBack: '← 返回首页',

    pageTag:  '⚠ 法律',
    h1:       '风险提示',
    pageMeta: '最后更新：2026年6月 · CrypView — Beta Capital Enterprise',

    bannerTxt: '<strong>使用前请阅读——本文件非常重要。</strong>加密资产是极高风险的金融工具。您可能损失全部投资资金。CrypView是一款分析和信息工具——不构成受监管的投资顾问服务。',

    s1Title: 'CrypView的性质与局限',
    s1p1:    'CrypView是一款<strong>技术分析应用程序</strong>，显示来自币安公共API的实时市场数据，专为信息和教育目的而设计。',
    s1p2:    'CrypView<strong>不提供</strong>：买卖建议、自动交易信号、个性化建议或投资组合管理。任何投资决策都不应仅凭显示的数据或指标做出。',
    s1p3:    '技术指标（RSI、MACD、布林带等）是基于历史价格数据的数学工具，<strong>不预测未来</strong>，也不保证任何结果。',

    s2Title: '加密资产固有风险',

    risk1Title: '资本全损',
    risk1Desc:  '加密资产可能损失100%价值。在加密市场历史上，资产在数周或数月内损失80%至99%价值的案例屡见不鲜。',

    risk2Title: '极端波动性',
    risk2Desc:  '24小时内±30%的波动很常见。杠杆仓位会放大这些波动，即使是小幅波动也可能迅速导致爆仓。',

    risk3Title: '技术和托管风险',
    risk3Desc:  '私钥丢失、交易所被黑客攻击、智能合约漏洞以及骗局（拉地毯、钓鱼、虚假项目）均可能造成不可逆的资金损失。',

    risk4Title: '监管不确定性',
    risk4Desc:  '加密资产的法律框架正在快速演变，各国各有不同。监管决定（禁令、限制、税收）可能对资产价值或持有能力产生重大影响。',

    risk5Title: '流动性风险',
    risk5Desc:  '部分资产，尤其是小市值代币，可能流动性不足，在市场急剧波动时无法以预期价格卖出。',

    risk6Title: '市场操纵',
    risk6Desc:  '加密市场的监管少于传统市场，洗盘交易、拉高出货和订单簿操纵等行为真实存在，可能误导技术分析师。',

    s3Title: '模拟交易和回测',
    s3p1:    'CrypView的<strong>模拟交易</strong>和<strong>回测</strong>功能仅供教育目的。过去表现不代表未来结果。',
    s3p2:    '历史回测结果良好的策略在实际环境中可能表现不佳，原因包括<strong>幸存者偏差</strong>、<strong>过度拟合</strong>、交易手续费、滑点以及模拟价格与实际执行价格之间的差异。',
    s3p3:    '模拟交易在无真实风险的环境中模拟交易——模拟结果<strong>不能外推</strong>为实际交易表现。',

    s4Title: '数据准确性与可用性',
    s4p1:    'CrypView显示的市场数据来自<strong>币安公共API</strong>。CrypView不控制这些数据，无法保证其准确性、完整性或持续可用性。',
    s4p2:    '服务中断、传输延迟、解析错误或WebSocket故障可能导致显示不正确、缺失或延迟的数据。<strong>切勿仅凭CrypView显示的数据做出重要财务决策</strong>，应从主要来源核实。',
    s4p3:    '价格提醒需要标签页保持打开和连接状态。因断线、浏览器关闭或网络中断导致提醒未触发，CrypView不承担责任。',

    s5Title: '责任限制',
    s5p1:    'CrypView和Beta Capital Enterprise<strong>对以下情况不承担任何责任</strong>：',
    s5li1:   '因使用本应用而造成的直接或间接财务损失',
    s5li2:   '基于显示信息做出的投资决策',
    s5li3:   '市场数据的错误、不准确或中断',
    s5li4:   '技术故障或浏览器限制',
    s5li5:   '模拟交易和回测功能的使用',
    s5p2:    '使用CrypView即表示完全且无条件接受这些条件。如不接受这些条款，请立即停止使用本应用。',

    s6Title: '建议',
    s6p1:    '在投资加密资产之前，强烈建议：',
    s6li1:   '在您所在国家咨询<strong>持牌财务顾问</strong>',
    s6li2:   '仅投入您能够承受全部损失的资金',
    s6li3:   '分散投资，不要将全部财富集中在加密资产上',
    s6li4:   '了解您所在司法管辖区的适用税收政策',
    s6li5:   '在投资前了解资产的技术运作原理',
    s6p2:    '教育资源可从<a href="https://www.esma.europa.eu" target="_blank" rel="noopener">ESMA（欧盟）</a>及各国当地监管机构获取。',

    finalDisclaimerTitle: '⚠ CrypView是信息工具，不是财务顾问。',
    finalDisclaimerText:  '使用本应用即表示您已阅读并理解本文件，并同意CrypView不对您投资决策的财务后果承担任何责任。请负责任地投资。',

    quickLink1: 'ESMA ↗',
    quickLink2: '中国证监会 ↗',
    quickLink3: 'CrypView FAQ',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'FAQ',
    footCookies: 'Cookie',
    footPrivacy: '隐私政策',
    footTerms:   '服务条款',
    footHome:    '首页',
  },

  // ── العربية ───────────────────────────────────────────────
  ar: {
    pageTitle: 'إخلاء المسؤولية عن المخاطر — CrypView',
    metaDesc:  'إخلاء مسؤولية CrypView عن مخاطر الأصول المشفرة — أداة تحليل وليست خدمة استشارة استثمارية.',

    navBack: '→ العودة إلى الرئيسية',

    pageTag:  '⚠ قانوني',
    h1:       'إخلاء المسؤولية عن المخاطر',
    pageMeta: 'آخر تحديث: يونيو 2026 · CrypView — Beta Capital Enterprise',

    bannerTxt: '<strong>اقرأ قبل الاستخدام — هذه الوثيقة مهمة.</strong> الأصول المشفرة أدوات مالية عالية المخاطر جدًا. قد تخسر جميع الأموال المستثمرة. CrypView أداة تحليل ومعلومات — لا تُشكّل خدمة استشارة استثمارية مرخصة.',

    s1Title: 'طبيعة CrypView وحدوده',
    s1p1:    'CrypView هو <strong>تطبيق تحليل تقني</strong> يعرض بيانات السوق في الوقت الفعلي من واجهة برمجة Binance العامة، مصمم حصريًا للأغراض الإعلامية والتعليمية.',
    s1p2:    'CrypView <strong>لا يُقدّم</strong>: توصيات بالشراء أو البيع، إشارات تداول آلية، نصائح شخصية، أو إدارة محافظ. لا ينبغي اتخاذ أي قرار استثماري بناءً على البيانات أو المؤشرات المعروضة وحدها.',
    s1p3:    'المؤشرات التقنية (RSI، MACD، بولينجر…) أدوات رياضية مبنية على البيانات التاريخية للأسعار، <strong>لا تتنبأ بالمستقبل</strong> ولا تضمن أي نتيجة.',

    s2Title: 'المخاطر المتأصلة في الأصول المشفرة',

    risk1Title: 'خسارة رأس المال الكلية',
    risk1Desc:  'يمكن للأصول المشفرة أن تفقد 100% من قيمتها. أصول فقدت 80 إلى 99% من قيمتها في غضون أسابيع أو أشهر موثقة بوفرة في تاريخ أسواق العملات المشفرة.',

    risk2Title: 'التقلب الشديد',
    risk2Desc:  'تقلبات ±30% في 24 ساعة شائعة. المراكز ذات الرافعة المالية تضخم هذه التحركات وقد تتعرض للتصفية بسرعة، حتى بسبب تذبذبات طفيفة.',

    risk3Title: 'المخاطر التقنية ومخاطر الحضانة',
    risk3Desc:  'فقدان المفاتيح الخاصة، اختراق البورصات، ثغرات العقود الذكية والاحتيال (rug pulls، التصيد الاحتيالي، المشاريع الوهمية) تُشكّل مخاطر حقيقية لخسارة لا رجعة فيها.',

    risk4Title: 'الغموض التنظيمي',
    risk4Desc:  'الإطار القانوني للأصول المشفرة يتطور بسرعة ويتفاوت من دولة إلى أخرى. القرارات التنظيمية (الحظر، القيود، الضرائب) قد تؤثر تأثيرًا كبيرًا على قيمة الأصول أو إمكانية الاحتفاظ بها.',

    risk5Title: 'مخاطر السيولة',
    risk5Desc:  'بعض الأصول، خاصة صغيرة الحجم، قد تفتقر إلى السيولة الكافية للبيع بالسعر المطلوب، لا سيما في حالات الحركات الحادة للسوق.',

    risk6Title: 'التلاعب بالسوق',
    risk6Desc:  'أسواق العملات المشفرة أقل تنظيمًا من الأسواق التقليدية. ممارسات كالتداول الوهمي ومخططات الضخ والتفريغ والتلاعب في دفاتر الأوامر موجودة وقد تُضلل المحللين التقنيين.',

    s3Title: 'التداول الورقي والاختبار الخلفي',
    s3p1:    'ميزتا <strong>التداول الورقي</strong> و<strong>الاختبار الخلفي</strong> في CrypView هما محاكاتان للأغراض التعليمية فحسب. الأداء السابق لا يضمن النتائج المستقبلية.',
    s3p2:    'اختبار خلفي يُظهر نتائج تاريخية ممتازة قد يُسجّل أداءً أدنى بكثير في الظروف الحقيقية بسبب <strong>تحيز البقاء</strong>، <strong>الإفراط في التخصيص</strong>، رسوم المعاملات، الانزلاق السعري، والفرق بين سعر المحاكاة وسعر التنفيذ الفعلي.',
    s3p3:    'التداول الورقي يحاكي التداول بلا مخاطر حقيقية — النتائج المحققة في بيئة المحاكاة <strong>لا يمكن تعميمها</strong> على الأداء في التداول الحقيقي.',

    s4Title: 'دقة البيانات وتوافرها',
    s4p1:    'بيانات السوق التي يعرضها CrypView مصدرها <strong>واجهة برمجة Binance العامة</strong>. CrypView لا يتحكم في هذه البيانات ولا يضمن دقتها أو اكتمالها أو استمرارية توافرها.',
    s4p2:    'انقطاعات الخدمة، تأخيرات الإرسال، أخطاء المعالجة أو أعطال WebSocket قد تؤدي إلى عرض بيانات غير صحيحة أو مفقودة أو متأخرة. <strong>لا تتخذ قرارًا ماليًا حساسًا بناءً فقط على البيانات المعروضة في CrypView</strong> دون التحقق من المصدر الأساسي.',
    s4p3:    'تنبيهات الأسعار تستلزم بقاء علامة التبويب مفتوحة ومتصلة. لا يمكن تحميل CrypView المسؤولية عن تنبيهات لم تُطلق بسبب انقطاع الاتصال أو إغلاق المتصفح أو انقطاع الشبكة.',

    s5Title: 'تحديد المسؤولية',
    s5p1:    'CrypView و Beta Capital Enterprise <strong>يتنصّلان من كل مسؤولية</strong> عن:',
    s5li1:   'الخسائر المالية المباشرة أو غير المباشرة الناجمة عن استخدام التطبيق',
    s5li2:   'القرارات الاستثمارية المتخذة بناءً على المعلومات المعروضة',
    s5li3:   'الأخطاء أو عدم الدقة أو انقطاع بيانات السوق',
    s5li4:   'الأعطال التقنية أو قيود المتصفحات',
    s5li5:   'استخدام ميزتي التداول الورقي والاختبار الخلفي',
    s5p2:    'استخدام CrypView يعني القبول الكامل وغير المشروط بهذه الشروط. إن لم توافق عليها، أوقف استخدام التطبيق فورًا.',

    s6Title: 'توصيات',
    s6p1:    'قبل الاستثمار في الأصول المشفرة، يُنصح بشدة بما يلي:',
    s6li1:   'استشارة <strong>مستشار مالي مرخص</strong> في بلدك',
    s6li2:   'استثمار مبالغ لا تتجاوز ما يمكنك تحمّل خسارته كاملًا',
    s6li3:   'تنويع استثماراتك وعدم تركيز كل ثروتك في الأصول المشفرة',
    s6li4:   'الاطلاع على القواعد الضريبية المطبقة في نطاقك القانوني',
    s6li5:   'فهم الآليات التقنية للأصول قبل أي استثمار',
    s6p2:    'موارد تعليمية متاحة من <a href="https://www.esma.europa.eu" target="_blank" rel="noopener">ESMA (الاتحاد الأوروبي)</a> والجهات التنظيمية المحلية في كل دولة.',

    finalDisclaimerTitle: '⚠ CrypView أداة معلومات، وليست مستشارًا ماليًا.',
    finalDisclaimerText:  'باستخدامك لهذا التطبيق، تُقرّ بأنك قرأت هذه الوثيقة وفهمتها، وتوافق على أن CrypView لا يتحمل المسؤولية عن التداعيات المالية لقراراتك الاستثمارية. استثمر بمسؤولية.',

    quickLink1: 'ESMA ↗',
    quickLink2: 'هيئة الأوراق المالية ↗',
    quickLink3: 'أسئلة CrypView الشائعة',

    footerCopy:  '© 2026 CrypView — Beta Capital Enterprise',
    footFaq:     'الأسئلة الشائعة',
    footCookies: 'ملفات تعريف الارتباط',
    footPrivacy: 'الخصوصية',
    footTerms:   'الشروط',
    footHome:    'الرئيسية',
  },
};

// ── Auto-export si environnement module ──────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RISK_DISCLAIMER_I18N;
}
