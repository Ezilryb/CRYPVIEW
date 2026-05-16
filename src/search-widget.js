/*!
 * CrypView Search Widget — v1.1
 * FlexSearch-powered local search. Zero backend. Drop-in any page.
 *
 * INTÉGRATION (ajouter avant </body> sur chaque page) :
 *   <script type="module" src="src/search-widget.js"></script>
 *
 * Ou via CDN local (sans module) :
 *   <script src="public/search-widget.js"></script>
 *
 * Raccourci clavier : Ctrl+K / Cmd+K ou clic sur le bouton flottant.
 *
 * v1.1 :
 *   - Support thème light (.light-theme sur <html>)
 *   - Navigation clavier améliorée (Tab cycle catégories)
 *   - Fallback search si FlexSearch indisponible
 *   - Fermeture au clic sur l'overlay
 *   - Correction rendu preview sur mobile
 */

/* ─── 1. CSS (injecté dynamiquement) ────────────────────────────────────── */

const CSS = `
/* ── Variables (compatibles thème dark/light CrypView) ──────── */
#sw-trigger,
#sw-overlay,
#sw-box {
  --sw-bg:      #070a0f;
  --sw-bg2:     #0b0f17;
  --sw-panel:   #0d1117;
  --sw-border:  #1a2235;
  --sw-border2: #243050;
  --sw-accent:  #00ff88;
  --sw-accent2: #00c8ff;
  --sw-red:     #ff3d5a;
  --sw-gold:    #ff9900;
  --sw-purple:  #a855f7;
  --sw-text:    #e2e8f0;
  --sw-muted:   #4a5568;
  --sw-dim:     #2d3748;
}

/* Light theme overrides */
.light-theme #sw-trigger,
.light-theme #sw-overlay,
.light-theme #sw-box {
  --sw-bg:      #f0f2f5;
  --sw-bg2:     #e8eaf0;
  --sw-panel:   #ffffff;
  --sw-border:  #d0d7e3;
  --sw-border2: #b8c2d8;
  --sw-accent:  #00a85a;
  --sw-accent2: #0090c0;
  --sw-red:     #d42a45;
  --sw-gold:    #cc7700;
  --sw-purple:  #8b38d4;
  --sw-text:    #0d1117;
  --sw-muted:   #57606a;
  --sw-dim:     #c5ccd8;
}

/* ── Floating trigger ────────────────────────────────────────── */
#sw-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 8888;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  background: var(--sw-panel);
  border: 1px solid var(--sw-border2);
  color: var(--sw-muted);
  font-family: 'Space Mono', 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: .08em;
  cursor: pointer;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(0,200,100,.04);
  transition: border-color .2s, color .2s, box-shadow .2s;
  user-select: none;
  -webkit-user-select: none;
}
#sw-trigger:hover {
  border-color: rgba(0,200,100,.35);
  color: var(--sw-text);
  box-shadow: 0 8px 40px rgba(0,0,0,.5), 0 0 20px rgba(0,200,100,.08);
}
#sw-trigger:focus-visible {
  outline: 2px solid var(--sw-accent);
  outline-offset: 2px;
}
.sw-trigger-icon {
  display: flex;
  align-items: center;
  color: var(--sw-accent);
  flex-shrink: 0;
}
.sw-trigger-label { white-space: nowrap; }
.sw-trigger-kbd {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  opacity: .45;
  font-size: 9px;
  letter-spacing: .04em;
}
.sw-trigger-kbd kbd {
  background: var(--sw-border);
  border: 1px solid var(--sw-dim);
  border-radius: 3px;
  padding: 1px 4px;
  font-family: inherit;
  font-size: 9px;
  color: var(--sw-muted);
}

/* ── Overlay ─────────────────────────────────────────────────── */
#sw-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(7,10,15,.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease;
}
.light-theme #sw-overlay {
  background: rgba(230,234,240,.88);
}
#sw-overlay.sw-open {
  opacity: 1;
  pointer-events: all;
}

/* ── Modal box ───────────────────────────────────────────────── */
#sw-box {
  width: 100%;
  max-width: 680px;
  background: var(--sw-bg2);
  border: 1px solid var(--sw-border2);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(0,200,100,.06),
    0 40px 100px rgba(0,0,0,.7),
    0 0 60px rgba(0,200,100,.04);
  transform: translateY(-8px);
  transition: transform .18s ease;
}
#sw-overlay.sw-open #sw-box {
  transform: translateY(0);
}

/* ── Search bar ──────────────────────────────────────────────── */
#sw-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--sw-border);
  background: var(--sw-bg);
}
.sw-bar-icon {
  color: var(--sw-accent);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
#sw-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Space Mono', 'DM Mono', monospace;
  font-size: 15px;
  font-weight: 400;
  color: var(--sw-text);
  letter-spacing: .02em;
  caret-color: var(--sw-accent);
}
#sw-input::placeholder {
  color: var(--sw-muted);
  opacity: .65;
}
#sw-esc {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: .1em;
  color: var(--sw-muted);
  background: var(--sw-border);
  border: 1px solid var(--sw-dim);
  border-radius: 3px;
  padding: 3px 7px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color .15s;
}
#sw-esc:hover { color: var(--sw-text); }

/* ── Category filter pills ───────────────────────────────────── */
#sw-cats {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--sw-border);
  background: rgba(13,17,23,.6);
  overflow-x: auto;
  scrollbar-width: none;
}
.light-theme #sw-cats { background: rgba(230,234,240,.6); }
#sw-cats::-webkit-scrollbar { display: none; }

.sw-cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--sw-border);
  border-radius: 3px;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--sw-muted);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: border-color .15s, color .15s, background .15s;
  background: none;
  user-select: none;
}
.sw-cat-pill:hover {
  border-color: var(--sw-border2);
  color: var(--sw-text);
}
.sw-cat-pill.active { color: var(--sw-text); }
.sw-cat-pill[data-cat="indicator"].active  { border-color: rgba(0,200,100,.4);  background: rgba(0,200,100,.06);  color: var(--sw-accent); }
.sw-cat-pill[data-cat="pair"].active       { border-color: rgba(0,200,255,.4);  background: rgba(0,200,255,.06);  color: var(--sw-accent2); }
.sw-cat-pill[data-cat="page"].active       { border-color: rgba(255,153,0,.4);  background: rgba(255,153,0,.06);  color: var(--sw-gold); }
.sw-cat-pill[data-cat="shortcut"].active   { border-color: rgba(168,85,247,.4); background: rgba(168,85,247,.06); color: var(--sw-purple); }
.sw-cat-pill[data-cat="trading"].active    { border-color: rgba(255,61,90,.4);  background: rgba(255,61,90,.06);  color: var(--sw-red); }

/* ── Results ─────────────────────────────────────────────────── */
#sw-results {
  max-height: 380px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--sw-border) transparent;
}
#sw-results::-webkit-scrollbar { width: 4px; }
#sw-results::-webkit-scrollbar-thumb { background: var(--sw-border); }

/* ── Result groups ───────────────────────────────────────────── */
.sw-group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px 6px;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--sw-muted);
  border-top: 1px solid var(--sw-border);
}
.sw-group-label:first-child { border-top: none; }

/* ── Result item ─────────────────────────────────────────────── */
.sw-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background .12s;
  border-left: 2px solid transparent;
}
.sw-item:hover,
.sw-item.sw-focused {
  background: rgba(255,255,255,.04);
}
.light-theme .sw-item:hover,
.light-theme .sw-item.sw-focused {
  background: rgba(0,0,0,.04);
}
.sw-item.sw-focused { border-left-color: var(--sw-accent); }

.sw-item-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sw-border);
  border-radius: 4px;
  font-size: 15px;
  flex-shrink: 0;
  background: rgba(255,255,255,.02);
}
.sw-item-body { flex: 1; min-width: 0; }
.sw-item-title {
  font-family: 'Syne', 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--sw-text);
  letter-spacing: .01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sw-item-title mark {
  background: none;
  color: var(--sw-accent);
  font-weight: 700;
}
.sw-item-desc {
  font-size: 10px;
  color: var(--sw-muted);
  letter-spacing: .03em;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sw-item-badge {
  flex-shrink: 0;
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  letter-spacing: .1em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 2px;
  border: 1px solid;
}
.sw-item-meta {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sw-item-arrow {
  color: var(--sw-muted);
  font-size: 12px;
  opacity: 0;
  transition: opacity .12s;
}
.sw-item:hover .sw-item-arrow,
.sw-item.sw-focused .sw-item-arrow { opacity: 1; }

/* Badge colors by category */
.sw-badge-indicator { border-color: rgba(0,200,100,.25); color: rgba(0,200,100,.8); }
.sw-badge-pair      { border-color: rgba(0,200,255,.25); color: rgba(0,200,255,.8); }
.sw-badge-page      { border-color: rgba(255,153,0,.25); color: rgba(255,153,0,.8); }
.sw-badge-shortcut  { border-color: rgba(168,85,247,.25); color: rgba(168,85,247,.8); }
.sw-badge-trading   { border-color: rgba(255,61,90,.25); color: rgba(255,61,90,.8); }

/* ── Empty state ─────────────────────────────────────────────── */
#sw-empty {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 10px;
  color: var(--sw-muted);
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .08em;
}
#sw-empty svg { opacity: .25; }
#sw-empty p { opacity: .55; }

/* ── Tips bar ────────────────────────────────────────────────── */
#sw-tips {
  padding: 10px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  border-top: 1px solid var(--sw-border);
  background: var(--sw-bg);
}
.sw-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  letter-spacing: .06em;
  color: var(--sw-muted);
}
.sw-tip kbd {
  background: var(--sw-border);
  border: 1px solid var(--sw-dim);
  border-radius: 3px;
  padding: 1px 5px;
  font-family: inherit;
  font-size: 8px;
  color: var(--sw-text);
}

/* ── Live preview panel ──────────────────────────────────────── */
#sw-preview {
  border-top: 1px solid var(--sw-border);
  background: var(--sw-bg);
  padding: 14px 20px;
  display: none;
  flex-direction: column;
  gap: 8px;
}
#sw-preview.sw-has-preview { display: flex; }
.sw-preview-label {
  font-family: 'Space Mono', monospace;
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--sw-muted);
}
.sw-preview-content {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  line-height: 1.8;
  color: var(--sw-text);
  letter-spacing: .03em;
}
.sw-preview-content strong { color: var(--sw-accent); font-weight: 400; }
.sw-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.sw-preview-tag {
  font-size: 9px;
  font-family: 'Space Mono', monospace;
  letter-spacing: .06em;
  padding: 2px 8px;
  border: 1px solid var(--sw-border2);
  color: var(--sw-muted);
  border-radius: 2px;
}

/* ── Disclaimer (trading concepts) ──────────────────────────── */
#sw-disclaimer {
  padding: 8px 20px;
  font-family: 'Space Mono', monospace;
  font-size: 8.5px;
  letter-spacing: .04em;
  color: var(--sw-muted);
  border-top: 1px solid var(--sw-border);
  background: rgba(255,61,90,.03);
  display: none;
}
#sw-disclaimer.sw-show { display: block; }
#sw-disclaimer strong { color: var(--sw-red); font-weight: 400; }

/* ── Mobile ──────────────────────────────────────────────────── */
@media (max-width: 768px) {
  #sw-overlay {
    align-items: flex-end;
    padding: 0;
  }
  #sw-box {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 80dvh;
    display: flex;
    flex-direction: column;
  }
  #sw-results { flex: 1; overflow-y: auto; }
  #sw-preview { display: none !important; }
  #sw-trigger {
    bottom: 16px;
    right: 16px;
    padding: 12px;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    justify-content: center;
  }
  .sw-trigger-label,
  .sw-trigger-kbd { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  #sw-overlay, #sw-box, .sw-item { transition: none; }
}
`;

/* ─── 2. Data corpus ─────────────────────────────────────────────────────── */

const DATA = [

  /* ══ INDICATORS ══════════════════════════════════════════════════════════ */
  { id:'i01', cat:'indicator', icon:'📈', title:'RSI',
    desc:'Relative Strength Index. Mesure la force des mouvements de prix sur 14 périodes. Valeurs ≥ 70 suracheté, ≤ 30 survendu.',
    tags:['momentum','oscillator','14 periods','surachet\u00e9','survendu'], url:'page.html' },
  { id:'i02', cat:'indicator', icon:'📊', title:'MACD',
    desc:'Moving Average Convergence Divergence. Croisements signal/ligne, histogramme de momentum. Indicateur tendanciel.',
    tags:['trend','momentum','divergence','crossover'], url:'page.html' },
  { id:'i03', cat:'indicator', icon:'〰️', title:'Bollinger Bands',
    desc:'Bandes de volatilité basées sur l\'écart-type autour d\'une SMA(20). Squeeze = compression avant breakout.',
    tags:['volatility','bands','squeeze','bb'], url:'page.html' },
  { id:'i04', cat:'indicator', icon:'🌀', title:'Ichimoku Cloud',
    desc:'Système complet : Tenkan, Kijun, Chikou, Kumo (cloud). Vision tendance, support/résistance et momentum.',
    tags:['trend','support','resistance','cloud','tenkan','kijun'], url:'page.html' },
  { id:'i05', cat:'indicator', icon:'⚡', title:'SuperTrend',
    desc:'Indicateur de suivi de tendance basé sur l\'ATR. Signal d\'achat/vente clair avec changement de couleur.',
    tags:['trend','atr','signal','buy','sell'], url:'page.html' },
  { id:'i06', cat:'indicator', icon:'🎯', title:'VWAP',
    desc:'Volume Weighted Average Price. Prix moyen pondéré par le volume. Référence institutionnelle intraday.',
    tags:['volume','institutional','intraday','anchor'], url:'page.html' },
  { id:'i07', cat:'indicator', icon:'📉', title:'EMA',
    desc:'Exponential Moving Average. Moyenne mobile exponentielle 8/13/21 — réagit plus vite aux prix récents que la SMA.',
    tags:['trend','moving average','cross','8','21'], url:'page.html' },
  { id:'i08', cat:'indicator', icon:'➡️', title:'SMA',
    desc:'Simple Moving Average. Moyenne arithmétique sur N périodes. Les croisements SMA20/50/200 sont des signaux classiques.',
    tags:['trend','moving average','20','50','200','golden cross'], url:'page.html' },
  { id:'i09', cat:'indicator', icon:'📏', title:'ATR',
    desc:'Average True Range. Mesure la volatilité moyenne sur N bougies. Utile pour dimensionner les stops et les cibles.',
    tags:['volatility','stop loss','sizing','risk'], url:'page.html' },
  { id:'i10', cat:'indicator', icon:'🔄', title:'Stochastique',
    desc:'Oscillateur comparant le clôture à la plage haute/basse. Lignes %K et %D. Suracheté/survendu.',
    tags:['oscillator','momentum','stoch','%K','%D'], url:'page.html' },
  { id:'i11', cat:'indicator', icon:'📐', title:'ADX',
    desc:'Average Directional Index. Mesure la force de la tendance (pas sa direction). > 25 = tendance forte.',
    tags:['trend strength','directional','di+','di-'], url:'page.html' },
  { id:'i12', cat:'indicator', icon:'📋', title:'Williams %R',
    desc:'Oscillateur inversé similaire au Stochastique. Plage -100 à 0. Survendu < -80, suracheté > -20.',
    tags:['oscillator','overbought','oversold','williams'], url:'page.html' },
  { id:'i13', cat:'indicator', icon:'📊', title:'CCI',
    desc:'Commodity Channel Index. Mesure l\'écart du prix à sa moyenne statistique. Extrêmes = retournements possibles.',
    tags:['oscillator','mean reversion','commodity'], url:'page.html' },
  { id:'i14', cat:'indicator', icon:'📦', title:'OBV',
    desc:'On-Balance Volume. Additionne/soustrait le volume selon la direction. Divergence OBV/prix = signal fort.',
    tags:['volume','divergence','confirmation','obv'], url:'page.html' },
  { id:'i15', cat:'indicator', icon:'💧', title:'MFI',
    desc:'Money Flow Index. RSI pondéré par le volume. Intègre la pression d\'achat/vente en volume réel.',
    tags:['volume','oscillator','money flow','mfi'], url:'page.html' },
  { id:'i16', cat:'indicator', icon:'🌊', title:'CMF',
    desc:'Chaikin Money Flow. Flux de capitaux sur N périodes. > 0 = pression acheteuse dominante.',
    tags:['volume','money flow','chaikin','cmf'], url:'page.html' },
  { id:'i17', cat:'indicator', icon:'🔴', title:'HMA',
    desc:'Hull Moving Average. Moyenne ultra-réactive qui élimine le lag des MA classiques. Idéale pour les entrées.',
    tags:['moving average','lag','responsive','hull'], url:'page.html' },
  { id:'i18', cat:'indicator', icon:'📡', title:'DEMA',
    desc:'Double Exponential Moving Average. Double lissage exponentiel pour réduire le décalage vs l\'EMA simple.',
    tags:['moving average','double','smooth','dema'], url:'page.html' },
  { id:'i19', cat:'indicator', icon:'📐', title:'Keltner Channel',
    desc:'Canal basé sur l\'EMA ± 2× ATR. Complète les Bollinger Bands. Le Squeeze survient quand BB entre dans KC.',
    tags:['channel','volatility','atr','squeeze','keltner'], url:'page.html' },
  { id:'i20', cat:'indicator', icon:'🦶', title:'Footprint Chart',
    desc:'Décompose chaque bougie en ask/bid par niveau de prix. Montre où acheteurs et vendeurs s\'affrontent réellement.',
    tags:['orderflow','ask','bid','imbalance','footprint'], url:'page.html' },
  { id:'i21', cat:'indicator', icon:'📊', title:'Orderflow Delta / CVD',
    desc:'Delta = Ask − Bid par bougie. CVD = cumul de session. Divergence CVD/prix = pression directionnelle cachée.',
    tags:['orderflow','delta','cvd','divergence','cumulative'], url:'page.html' },
  { id:'i22', cat:'indicator', icon:'📈', title:'Volume Profile',
    desc:'Distribution du volume par niveau de prix. POC = niveau le plus échangé. VAH/VAL = zone de valeur 70%.',
    tags:['volume','poc','value area','vah','val','vpoc'], url:'page.html' },
  { id:'i23', cat:'indicator', icon:'🌀', title:'Momentum',
    desc:'Différence entre le prix actuel et celui d\'il y a N périodes. Mesure la vélocité du mouvement de prix.',
    tags:['momentum','rate of change','speed','roc'], url:'page.html' },
  { id:'i24', cat:'indicator', icon:'📊', title:'Parabolic SAR',
    desc:'Stop and Reverse. Points au-dessus/dessous des bougies indiquant la tendance. Croisement = signal retournement.',
    tags:['trend','stop','reversal','sar','parabolic'], url:'page.html' },
  { id:'i25', cat:'indicator', icon:'〰️', title:'Donchian Channel',
    desc:'Canal défini par le plus haut et le plus bas sur N périodes. Breakout du canal = signal de tendance forte.',
    tags:['channel','breakout','high','low','donchian'], url:'page.html' },
  { id:'i26', cat:'indicator', icon:'📉', title:'Pivot Points',
    desc:'Niveaux support/résistance calculés depuis OHLC de la session précédente. PP, R1/R2/R3, S1/S2/S3.',
    tags:['pivot','support','resistance','r1','s1','daily'], url:'page.html' },
  { id:'i27', cat:'indicator', icon:'🔆', title:'Elder Ray',
    desc:'Bull Power (High − EMA) et Bear Power (Low − EMA). Deux histogrammes mesurant la force acheteurs/vendeurs.',
    tags:['bull power','bear power','elder','histogram'], url:'page.html' },
  { id:'i28', cat:'indicator', icon:'🔀', title:'Squeeze Momentum',
    desc:'Variante LazyBear détectant les compressions BB/KC. Histogramme vert = libération de momentum positive.',
    tags:['squeeze','bollinger','keltner','momentum','lazybear'], url:'page.html' },
  { id:'i29', cat:'indicator', icon:'📡', title:'TRIX',
    desc:'Triple EMA lissé en taux de variation. Filtre le bruit mieux que MACD. Affiché en histogramme.',
    tags:['trix','triple','ema','noise','histogram'], url:'page.html' },
  { id:'i30', cat:'indicator', icon:'🔢', title:'Lin. Reg. Channel',
    desc:'Canal de régression linéaire 50 périodes avec bandes ±2σ. Montre direction et déviation de la tendance.',
    tags:['linear regression','channel','regression','standard deviation'], url:'page.html' },

  /* ══ PAIRS ════════════════════════════════════════════════════════════════ */
  { id:'p01', cat:'pair', icon:'₿', title:'BTC/USDT',
    desc:'Bitcoin — La référence des marchés crypto. Paire la plus liquide sur Binance.',
    tags:['bitcoin','btc','majeur','digital gold'], url:'page.html' },
  { id:'p02', cat:'pair', icon:'Ξ', title:'ETH/USDT',
    desc:'Ethereum — Plateforme smart contracts. Corrélé à BTC mais avec sa dynamique propre.',
    tags:['ethereum','eth','layer1','smart contracts'], url:'page.html' },
  { id:'p03', cat:'pair', icon:'◎', title:'SOL/USDT',
    desc:'Solana — L1 haute performance. Forte volatilité, volume institutionnel croissant.',
    tags:['solana','sol','layer1','high performance'], url:'page.html' },
  { id:'p04', cat:'pair', icon:'🔷', title:'BNB/USDT',
    desc:'Binance Coin — Jeton utilitaire de Binance. Corrélé à l\'activité de l\'échange.',
    tags:['binance','bnb','exchange token'], url:'page.html' },
  { id:'p05', cat:'pair', icon:'◈', title:'XRP/USDT',
    desc:'Ripple — Paiements transfrontaliers. Très sensible aux actualités réglementaires.',
    tags:['ripple','xrp','payments','remittance'], url:'page.html' },
  { id:'p06', cat:'pair', icon:'🐕', title:'DOGE/USDT',
    desc:'Dogecoin — Mème coin historique. Volatilité extrême, sensible aux réseaux sociaux.',
    tags:['dogecoin','doge','meme','elon'], url:'page.html' },
  { id:'p07', cat:'pair', icon:'🔮', title:'ADA/USDT',
    desc:'Cardano — Blockchain proof-of-stake. Cycles plus lents que les autres L1.',
    tags:['cardano','ada','pos','academic'], url:'page.html' },
  { id:'p08', cat:'pair', icon:'🔺', title:'AVAX/USDT',
    desc:'Avalanche — L1 rapide avec consensus novateur. Subnets pour applications dédiées.',
    tags:['avalanche','avax','layer1','subnets'], url:'page.html' },
  { id:'p09', cat:'pair', icon:'🔗', title:'LINK/USDT',
    desc:'Chainlink — Oracle décentralisé. Alimente les smart contracts en données réelles.',
    tags:['chainlink','link','oracle','data'], url:'page.html' },
  { id:'p10', cat:'pair', icon:'⬡', title:'POL/USDT',
    desc:'Polygon — Solution L2 Ethereum. Transactions rapides et peu coûteuses.',
    tags:['polygon','pol','matic','layer2'], url:'page.html' },
  { id:'p11', cat:'pair', icon:'🌊', title:'SUI/USDT',
    desc:'Sui — L1 nouvelle génération. Architecture Move, hautes performances.',
    tags:['sui','layer1','move','aptos'], url:'page.html' },
  { id:'p12', cat:'pair', icon:'⚡', title:'TON/USDT',
    desc:'The Open Network — Blockchain Telegram. Intégration avec l\'app mondiale.',
    tags:['ton','telegram','layer1','messaging'], url:'page.html' },
  { id:'p13', cat:'pair', icon:'🟡', title:'PEPE/USDT',
    desc:'Pepe — Mème coin de grande capitalisation. Mouvement par sentiment communautaire.',
    tags:['pepe','meme','frog','community'], url:'page.html' },
  { id:'p14', cat:'pair', icon:'🔥', title:'WIF/USDT',
    desc:'Dogwifhat — Mème coin Solana populaire. Volatilité très élevée.',
    tags:['wif','meme','solana','dog'], url:'page.html' },
  { id:'p15', cat:'pair', icon:'🟠', title:'APT/USDT',
    desc:'Aptos — L1 basé sur Move, ex-équipe Diem de Meta. Architecture parallèle.',
    tags:['aptos','apt','move','meta'], url:'page.html' },

  /* ══ PAGES ════════════════════════════════════════════════════════════════ */
  { id:'pg01', cat:'page', icon:'📊', title:'Vue Simple',
    desc:'Interface graphique principale. Un seul chart, sidebar avec trades live et stats 24h.',
    tags:['chart','sidebar','indicateurs','simple'], url:'page.html' },
  { id:'pg02', cat:'page', icon:'🔲', title:'Multi-2 Charts',
    desc:'Deux graphiques côte à côte. Synchronisation croisée du crosshair optionnelle.',
    tags:['multi','2 panels','split','compare'], url:'multi2.html' },
  { id:'pg03', cat:'page', icon:'⊞', title:'Multi-4 Charts',
    desc:'Grille 2×2. Comparez quatre actifs ou timeframes simultanément.',
    tags:['multi','4 panels','grid','2x2'], url:'multi4.html' },
  { id:'pg04', cat:'page', icon:'🔳', title:'Multi-9 Charts (3×3)',
    desc:'Neuf panneaux pour les screeners visuels et la surveillance de marché.',
    tags:['multi','9 panels','3x3','screener'], url:'multi9.html' },
  { id:'pg05', cat:'page', icon:'↕', title:'Vertical 2',
    desc:'Deux graphiques empilés verticalement. Idéal pour comparer des timeframes sur un même actif.',
    tags:['vertical','2 panels','stacked','mtf'], url:'multiv2.html' },
  { id:'pg06', cat:'page', icon:'↕', title:'Vertical 3',
    desc:'Trois graphiques empilés. Parfait pour avoir 1m / 15m / 4h sur le même actif.',
    tags:['vertical','3 panels','multi-tf','mtf'], url:'multiv3.html' },
  { id:'pg07', cat:'page', icon:'⬛', title:'Layout 1+2',
    desc:'Un grand graphique + deux petits. Grand pour l\'analyse, petits pour le contexte.',
    tags:['1+2','focus','context','asymmetric'], url:'multi1p2.html' },
  { id:'pg08', cat:'page', icon:'⬛', title:'Layout 1+3',
    desc:'Un grand graphique + trois petits panneaux. Surveillance multi-actifs avec focus.',
    tags:['1+3','focus','monitoring','asymmetric'], url:'multi1p3.html' },
  { id:'pg09', cat:'page', icon:'📖', title:'Wiki Documentation',
    desc:'Guide complet de toutes les fonctionnalités CrypView. Indicateurs, outils, raccourcis.',
    tags:['documentation','guide','help','wiki'], url:'wiki.html' },
  { id:'pg10', cat:'page', icon:'❓', title:'FAQ',
    desc:'Questions fréquentes : installation, indicateurs, alertes, PWA, confidentialité.',
    tags:['faq','help','questions','install'], url:'faq.html' },
  { id:'pg11', cat:'page', icon:'📋', title:'Changelog v4.0',
    desc:'Historique complet des mises à jour, nouvelles fonctionnalités et corrections de bugs.',
    tags:['changelog','updates','v4','history'], url:'changelog.html' },
  { id:'pg12', cat:'page', icon:'🗺', title:'Plan du site',
    desc:'Vue d\'ensemble de toutes les pages et vues disponibles dans CrypView.',
    tags:['sitemap','navigation','pages'], url:'sitemap.html' },
  { id:'pg13', cat:'page', icon:'🔒', title:'Politique de confidentialité',
    desc:'Aucune collecte de données personnelles. Tout fonctionne localement dans votre navigateur.',
    tags:['privacy','rgpd','données','local'], url:'privacy.html' },
  { id:'pg14', cat:'page', icon:'⚠', title:'Avertissement sur les risques',
    desc:'Risques liés aux crypto-actifs : volatilité, perte en capital, incertitude réglementaire.',
    tags:['risques','risk','disclaimer','capital'], url:'risk-disclaimer.html' },

  /* ══ SHORTCUTS ════════════════════════════════════════════════════════════ */
  { id:'sc01', cat:'shortcut', icon:'⌨️', title:'Ctrl+K / Cmd+K',
    desc:'Ouvrir la palette de commandes / recherche rapide CrypView.',
    tags:['palette','command','search','keyboard'], url:null },
  { id:'sc02', cat:'shortcut', icon:'⌨️', title:'Echap (ESC)',
    desc:'Fermer le menu contextuel, la palette de commandes ou les modales.',
    tags:['close','escape','modal'], url:null },
  { id:'sc03', cat:'shortcut', icon:'⌨️', title:'Clic droit sur le graphique',
    desc:'Ouvrir le menu contextuel : ajouter indicateur, placer alerte, outils de dessin, multi-charts.',
    tags:['context menu','right click','alert','indicator'], url:null },
  { id:'sc04', cat:'shortcut', icon:'⌨️', title:'Molette souris',
    desc:'Zoomer / dézoomer sur le graphique. Pinch-to-zoom sur mobile.',
    tags:['zoom','scroll','pinch','wheel'], url:null },
  { id:'sc05', cat:'shortcut', icon:'⌨️', title:'Drag horizontal',
    desc:'Déplacer la vue temporelle (pan). Shift+drag pour zoomer verticalement.',
    tags:['drag','pan','navigate','scroll'], url:null },
  { id:'sc06', cat:'shortcut', icon:'⌨️', title:'Double-clic sur le graphique',
    desc:'Réinitialiser le zoom à la vue automatique (auto-scale).',
    tags:['reset','zoom','auto scale','fit'], url:null },
  { id:'sc07', cat:'shortcut', icon:'⌨️', title:'Barre de timeframe',
    desc:'Cliquer sur 1s, 1m, 5m, 15m, 1h, 4h, 1d pour changer de période d\'analyse.',
    tags:['timeframe','period','1m','1h','4h','1d'], url:null },
  { id:'sc08', cat:'shortcut', icon:'⌨️', title:'Touche I',
    desc:'Ouvrir directement la modal de sélection des indicateurs techniques.',
    tags:['indicator','modal','picker','shortcut'], url:null },
  { id:'sc09', cat:'shortcut', icon:'⌨️', title:'Touche T',
    desc:'Cycler à travers les timeframes disponibles séquentiellement.',
    tags:['timeframe','cycle','cycle tf'], url:null },
  { id:'sc10', cat:'shortcut', icon:'⌨️', title:'Touche O',
    desc:'Ouvrir/fermer le panneau de gestion des objets (Object Tree).',
    tags:['object tree','objects','panel','drawings'], url:null },
  { id:'sc11', cat:'shortcut', icon:'⌨️', title:'Touche W',
    desc:'Ouvrir/fermer le panneau des workspaces (espaces de travail).',
    tags:['workspace','panel','save','layout'], url:null },
  { id:'sc12', cat:'shortcut', icon:'⌨️', title:'Ctrl+Z',
    desc:'Annuler le dernier tracé ajouté sur le graphique.',
    tags:['undo','drawing','annuler','z'], url:null },

  /* ══ TRADING CONCEPTS ════════════════════════════════════════════════════ */
  { id:'t01', cat:'trading', icon:'📚', title:'Support & Résistance',
    desc:'Zones où le prix rebondit (support) ou bloque (résistance). Plus un niveau est testé, plus il est signifiant — jusqu\'à sa rupture.',
    tags:['support','resistance','zones','key levels','sr'], url:null },
  { id:'t02', cat:'trading', icon:'📚', title:'Tendance (Trend)',
    desc:'Direction générale du marché. Uptrend = plus hauts et bas ascendants. Downtrend = inverse. Connaître la tendance primaire est essentiel.',
    tags:['uptrend','downtrend','higher high','lower low','trend'], url:null },
  { id:'t03', cat:'trading', icon:'📚', title:'Breakout & Retest',
    desc:'Rupture d\'un niveau clé (résistance, consolidation) suivie d\'un retour dessus pour le valider : breakout → retest → continuation.',
    tags:['breakout','retest','continuation','confirmation'], url:null },
  { id:'t04', cat:'trading', icon:'📚', title:'Volume & Confirmation',
    desc:'Un mouvement avec fort volume est plus fiable. Volume croissant valide la tendance, volume décroissant la questionne.',
    tags:['volume','confirmation','conviction','signal'], url:null },
  { id:'t05', cat:'trading', icon:'📚', title:'Divergence',
    desc:'Quand le prix atteint un nouveau sommet mais l\'oscillateur (RSI, MACD, CVD) ne le confirme pas — signal d\'affaiblissement de la tendance.',
    tags:['divergence','rsi','macd','cvd','bearish','bullish'], url:null },
  { id:'t06', cat:'trading', icon:'📚', title:'Gestion du risque',
    desc:'Ne risquer qu\'une fraction de son capital par trade (0.5–2%). Le stop-loss protège. Le dimensionnement de position est fondamental.',
    tags:['risk management','stop loss','position size','capital'], url:null },
  { id:'t07', cat:'trading', icon:'📚', title:'Liquidité & Order Flow',
    desc:'Les institutions cherchent la liquidité (zones de stops) avant de déplacer le prix. L\'orderflow (CVD, delta) révèle leur pression réelle.',
    tags:['liquidity','institution','smart money','sweep','orderflow'], url:null },
  { id:'t08', cat:'trading', icon:'📚', title:'Analyse Multi-Timeframe (MTF)',
    desc:'Analyser plusieurs TF ensemble : tendance sur H4/Daily, entrée sur 15m/1h. Ne jamais isoler l\'analyse sur un seul timeframe.',
    tags:['multi-timeframe','htf','ltf','context','mtf'], url:null },
  { id:'t09', cat:'trading', icon:'📚', title:'Consolidation & Range',
    desc:'Phase de marché où les prix évoluent dans un canal horizontal. Peut précéder un fort breakout. Les extrêmes du range sont des niveaux clés.',
    tags:['range','consolidation','sideways','channel'], url:null },
  { id:'t10', cat:'trading', icon:'📚', title:'Psychologie & Discipline',
    desc:'Ne pas revenger-trader après une perte. Respecter son stop. La discipline prime sur l\'ego. Chaque trade = une probabilité, pas une certitude.',
    tags:['psychology','loss','discipline','revenge trading','emotions'], url:null },
  { id:'t11', cat:'trading', icon:'📚', title:'R:R (Rapport Risque/Récompense)',
    desc:'Ratio entre le gain potentiel et la perte maximale d\'un trade. Un R:R de 1:2 minimum est recommandé pour rester profitable à long terme.',
    tags:['risk reward','rr','ratio','1:2','profitability'], url:null },
  { id:'t12', cat:'trading', icon:'📚', title:'Liquidation Heatmap',
    desc:'Visualisation des liquidations Binance Futures en temps réel. Barres rouges = longs liquidés, vertes = shorts liquidés.',
    tags:['liquidation','heatmap','futures','force order'], url:null },
  { id:'t13', cat:'trading', icon:'📚', title:'Open Interest (OI)',
    desc:'Nombre de contrats futures ouverts. OI montant + prix montant = tendance forte. Divergence OI/prix peut signaler un retournement.',
    tags:['open interest','oi','futures','contracts','trend'], url:null },
  { id:'t14', cat:'trading', icon:'📚', title:'Funding Rate',
    desc:'Taux de financement Binance Futures toutes les 8h. Funding élevé positif = surexposition long, risque de squeeze.',
    tags:['funding rate','futures','long','short','squeeze'], url:null },
];

/* ─── 3. FlexSearch loader ───────────────────────────────────────────────── */

async function loadFlexSearch() {
  return new Promise((resolve, reject) => {
    if (window.FlexSearch) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/flexsearch@0.7.43/dist/flexsearch.bundle.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('FlexSearch CDN failed'));
    document.head.appendChild(s);
  });
}

/* ─── 4. Build index ─────────────────────────────────────────────────────── */

let INDEX;

function buildIndex() {
  INDEX = new window.FlexSearch.Document({
    tokenize: 'forward',
    cache: 100,
    document: {
      id: 'id',
      index: ['title', 'desc', 'tags'],
      store: true,
    }
  });
  DATA.forEach(d => INDEX.add({ ...d, tags: d.tags.join(' ') }));
}

/* ─── 5. DOM state ───────────────────────────────────────────────────────── */

let overlay, input, results, preview, emptyState, disclaimer;
let focusIdx = -1;
let activeCat = 'all';

const CAT_META = {
  all:       { label: '✦ Tout',       color: '#e2e8f0' },
  indicator: { label: 'Indicateurs',  color: '#00ff88' },
  pair:      { label: 'Paires',       color: '#00c8ff' },
  page:      { label: 'Pages',        color: '#ff9900' },
  shortcut:  { label: 'Raccourcis',   color: '#a855f7' },
  trading:   { label: 'Trading',      color: '#ff3d5a' },
};

const CAT_LABELS = {
  indicator: '📈 Indicateurs',
  pair:      '💰 Paires Crypto',
  page:      '📄 Pages & Vues',
  shortcut:  '⌨️ Raccourcis',
  trading:   '📚 Concepts Trading',
};

/* ─── 6. Rendering ───────────────────────────────────────────────────────── */

function escapeRx(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(str, q) {
  if (!q) return str;
  const re = new RegExp(`(${escapeRx(q)})`, 'gi');
  return str.replace(re, '<mark>$1</mark>');
}

function renderResults(items, q) {
  results.innerHTML = '';
  emptyState.style.display = 'none';
  focusIdx = -1;

  // Show trading disclaimer when trading category is active
  const hasTrading = items.some(it => it.cat === 'trading');
  if (hasTrading) {
    disclaimer.classList.add('sw-show');
  } else {
    disclaimer.classList.remove('sw-show');
  }

  if (!items.length) {
    emptyState.style.display = 'flex';
    preview.classList.remove('sw-has-preview');
    return;
  }

  // Group by category
  const groups = {};
  items.forEach(it => {
    if (!groups[it.cat]) groups[it.cat] = [];
    groups[it.cat].push(it);
  });

  const ORDER = ['indicator', 'pair', 'page', 'shortcut', 'trading'];
  ORDER.forEach(cat => {
    if (!groups[cat]) return;

    const glabel = document.createElement('div');
    glabel.className = 'sw-group-label';
    glabel.textContent = CAT_LABELS[cat] || cat;
    results.appendChild(glabel);

    groups[cat].forEach(it => {
      const div = document.createElement('div');
      div.className = 'sw-item';
      div.dataset.id = it.id;
      div.setAttribute('role', 'option');
      div.setAttribute('aria-selected', 'false');
      div.innerHTML = `
        <div class="sw-item-icon" aria-hidden="true">${it.icon}</div>
        <div class="sw-item-body">
          <div class="sw-item-title">${highlight(it.title, q)}</div>
          <div class="sw-item-desc">${it.desc.slice(0, 75)}…</div>
        </div>
        <div class="sw-item-meta">
          <span class="sw-item-badge sw-badge-${it.cat}">${CAT_META[it.cat]?.label.replace('✦ ', '') || it.cat}</span>
          ${it.url ? '<span class="sw-item-arrow" aria-hidden="true">→</span>' : ''}
        </div>
      `;
      div.addEventListener('click', () => activateItem(it));
      div.addEventListener('mouseenter', () => showPreview(it));
      results.appendChild(div);
    });
  });

  // Auto-focus first item
  setFocus(0);
}

function showPreview(it) {
  if (!it) { preview.classList.remove('sw-has-preview'); return; }
  preview.classList.add('sw-has-preview');
  const catLabel = (CAT_META[it.cat]?.label || it.cat).replace('✦ ', '');
  preview.innerHTML = `
    <span class="sw-preview-label">Aperçu · ${catLabel}</span>
    <div class="sw-preview-content">${it.icon}&nbsp; <strong>${it.title}</strong><br>${it.desc}</div>
    <div class="sw-preview-tags">${it.tags.slice(0, 6).map(t => `<span class="sw-preview-tag">${t}</span>`).join('')}</div>
  `;
}

function setFocus(idx) {
  const items = results.querySelectorAll('.sw-item');
  items.forEach(el => {
    el.classList.remove('sw-focused');
    el.setAttribute('aria-selected', 'false');
  });
  if (idx < 0 || idx >= items.length) { focusIdx = -1; return; }
  focusIdx = idx;
  items[idx].classList.add('sw-focused');
  items[idx].setAttribute('aria-selected', 'true');
  items[idx].scrollIntoView({ block: 'nearest' });
  // Show preview of focused item
  const id = items[idx].dataset.id;
  const it = DATA.find(d => d.id === id);
  if (it) showPreview(it);
}

function activateItem(it) {
  if (it.url) window.location.href = it.url;
  closeWidget();
}

/* ─── 7. Search logic ────────────────────────────────────────────────────── */

function doSearch(q) {
  q = q.trim();
  let items;

  if (!q) {
    items = activeCat === 'all' ? DATA : DATA.filter(d => d.cat === activeCat);
    items = items.slice(0, 28);
  } else {
    const rawResults = INDEX.search(q, { limit: 40, enrich: true });
    const seen = new Set();
    items = [];
    rawResults.forEach(field => {
      if (!field.result) return;
      field.result.forEach(r => {
        const doc = r.doc || r;
        const id = typeof r === 'object' ? (r.id || doc?.id) : r;
        if (id && !seen.has(id)) {
          seen.add(id);
          // Find the full DATA entry
          const full = DATA.find(d => d.id === id);
          if (full) items.push(full);
        }
      });
    });
    if (activeCat !== 'all') items = items.filter(d => d.cat === activeCat);
  }

  renderResults(items, q);
}

/* ─── 8. Open / close ────────────────────────────────────────────────────── */

function openWidget() {
  overlay.classList.add('sw-open');
  input.value = '';
  activeCat = 'all';
  // Reset pill active state
  document.querySelectorAll('.sw-cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === 'all');
    p.setAttribute('aria-selected', p.dataset.cat === 'all' ? 'true' : 'false');
  });
  setTimeout(() => input.focus(), 50);
  doSearch('');
  preview.classList.remove('sw-has-preview');
  document.body.style.overflow = 'hidden';
}

function closeWidget() {
  overlay.classList.remove('sw-open');
  input.blur();
  document.body.style.overflow = '';
}

/* ─── 9. UI Assembly ─────────────────────────────────────────────────────── */

function buildUI() {
  // Inject CSS
  const style = document.createElement('style');
  style.id = 'sw-styles';
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── Floating trigger button ───────────────────────────────────────────
  const trigger = document.createElement('button');
  trigger.id = 'sw-trigger';
  trigger.setAttribute('aria-label', 'Ouvrir la recherche CrypView (Ctrl+K)');
  trigger.innerHTML = `
    <span class="sw-trigger-icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </span>
    <span class="sw-trigger-label">Rechercher</span>
    <span class="sw-trigger-kbd" aria-hidden="true"><kbd>⌘</kbd><kbd>K</kbd></span>
  `;
  trigger.addEventListener('click', openWidget);
  document.body.appendChild(trigger);

  // ── Overlay ───────────────────────────────────────────────────────────
  overlay = document.createElement('div');
  overlay.id = 'sw-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Recherche CrypView');
  overlay.addEventListener('click', e => { if (e.target === overlay) closeWidget(); });

  // ── Box ───────────────────────────────────────────────────────────────
  const box = document.createElement('div');
  box.id = 'sw-box';

  // ── Search bar ────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.id = 'sw-bar';
  bar.innerHTML = `
    <span class="sw-bar-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </span>
  `;
  input = document.createElement('input');
  input.id = 'sw-input';
  input.type = 'text';
  input.placeholder = 'RSI, BTC, alertes, raccourcis…';
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-label', 'Champ de recherche CrypView');
  input.setAttribute('aria-controls', 'sw-results');
  input.setAttribute('aria-autocomplete', 'list');
  input.addEventListener('input', () => doSearch(input.value));

  const escBtn = document.createElement('button');
  escBtn.id = 'sw-esc';
  escBtn.textContent = 'ESC';
  escBtn.setAttribute('aria-label', 'Fermer la recherche');
  escBtn.addEventListener('click', closeWidget);

  bar.appendChild(input);
  bar.appendChild(escBtn);

  // ── Category pills ────────────────────────────────────────────────────
  const cats = document.createElement('div');
  cats.id = 'sw-cats';
  cats.setAttribute('role', 'tablist');
  cats.setAttribute('aria-label', 'Filtres par catégorie');

  Object.entries(CAT_META).forEach(([key, meta]) => {
    const pill = document.createElement('button');
    pill.className = 'sw-cat-pill' + (key === 'all' ? ' active' : '');
    pill.dataset.cat = key;
    pill.textContent = meta.label;
    pill.setAttribute('role', 'tab');
    pill.setAttribute('aria-selected', key === 'all' ? 'true' : 'false');
    pill.addEventListener('click', () => {
      activeCat = key;
      cats.querySelectorAll('.sw-cat-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.cat === key);
        p.setAttribute('aria-selected', p.dataset.cat === key ? 'true' : 'false');
      });
      doSearch(input.value);
    });
    cats.appendChild(pill);
  });

  // ── Results ───────────────────────────────────────────────────────────
  results = document.createElement('div');
  results.id = 'sw-results';
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', 'Résultats de recherche');

  // ── Empty state ───────────────────────────────────────────────────────
  emptyState = document.createElement('div');
  emptyState.id = 'sw-empty';
  emptyState.style.display = 'none';
  emptyState.innerHTML = `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <p>Aucun résultat — essayez un autre terme</p>
  `;

  // ── Preview panel ─────────────────────────────────────────────────────
  preview = document.createElement('div');
  preview.id = 'sw-preview';
  preview.setAttribute('aria-live', 'polite');
  preview.setAttribute('aria-atomic', 'true');

  // ── Trading disclaimer ────────────────────────────────────────────────
  disclaimer = document.createElement('div');
  disclaimer.id = 'sw-disclaimer';
  disclaimer.innerHTML = `
    <strong>⚠ Information uniquement.</strong> Les concepts trading affichés sont éducatifs.
    CrypView ne donne aucun conseil en investissement. Les marchés crypto comportent un risque de perte totale.
  `;

  // ── Tips bar ──────────────────────────────────────────────────────────
  const tips = document.createElement('div');
  tips.id = 'sw-tips';
  tips.setAttribute('aria-hidden', 'true');
  tips.innerHTML = `
    <span class="sw-tip"><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
    <span class="sw-tip"><kbd>↵</kbd> ouvrir</span>
    <span class="sw-tip"><kbd>Tab</kbd> catégorie</span>
    <span class="sw-tip"><kbd>ESC</kbd> fermer</span>
  `;

  // ── Assemble ──────────────────────────────────────────────────────────
  box.appendChild(bar);
  box.appendChild(cats);
  box.appendChild(results);
  box.appendChild(emptyState);
  box.appendChild(preview);
  box.appendChild(disclaimer);
  box.appendChild(tips);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

/* ─── 10. Keyboard navigation ────────────────────────────────────────────── */

document.addEventListener('keydown', e => {
  // Global: Cmd/Ctrl+K to open
  if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
    e.preventDefault();
    overlay?.classList.contains('sw-open') ? closeWidget() : openWidget();
    return;
  }

  if (!overlay?.classList.contains('sw-open')) return;

  const items = results.querySelectorAll('.sw-item');

  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      closeWidget();
      break;
    case 'ArrowDown':
      e.preventDefault();
      setFocus(Math.min(focusIdx + 1, items.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (focusIdx <= 0) {
        setFocus(-1);
        input.focus();
      } else {
        setFocus(focusIdx - 1);
      }
      break;
    case 'Enter':
      e.preventDefault();
      if (focusIdx >= 0 && items[focusIdx]) {
        const id = items[focusIdx].dataset.id;
        const it = DATA.find(d => d.id === id);
        if (it) activateItem(it);
      }
      break;
    case 'Tab':
      // Cycle through category pills
      e.preventDefault();
      const pills = Array.from(document.querySelectorAll('.sw-cat-pill'));
      const curIdx = pills.findIndex(p => p.dataset.cat === activeCat);
      const next = pills[(curIdx + 1) % pills.length];
      if (next) next.click();
      break;
  }
});

/* ─── 11. Boot ───────────────────────────────────────────────────────────── */

async function init() {
  try {
    buildUI();
    await loadFlexSearch();
    buildIndex();
    console.log(`[CrypView Search] ✓ Ready — ${DATA.length} items indexed`);
  } catch (err) {
    console.warn('[CrypView Search] FlexSearch indisponible, fallback filter:', err.message);
    // Simple filter fallback
    INDEX = {
      search(q) {
        const lower = q.toLowerCase();
        return [{ result: DATA
          .filter(d =>
            d.title.toLowerCase().includes(lower) ||
            d.desc.toLowerCase().includes(lower) ||
            d.tags.some(t => t.toLowerCase().includes(lower))
          )
          .map(d => d.id)
        }];
      }
    };
    // Patch doSearch to handle simple fallback format
    console.log('[CrypView Search] ✓ Fallback ready');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
