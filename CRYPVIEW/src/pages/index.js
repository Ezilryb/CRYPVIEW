// ============================================================
//  src/pages/index.js — CrypView V2
//  Script de la landing page (index.html).
//
//  Responsabilités :
//    - Effet scroll sur la nav (#nav → .scrolled)
//    - Révélation des .feat-card via IntersectionObserver
//    - Révélation du terminal mock (#terminal-mock → .visible)
//    - Génération des bougies de prévisualisation (#candles-preview)
//    - Alimentation du terminal mock avec les données BTC/USDT REST
//    - Construction du ticker scrollant (#ticker-track) via Binance REST
//    - Bascule du thème Light/Dark sur la landing
// ============================================================

import { fmtPrice, fmtVol } from '../utils/format.js';

// ── Paires affichées dans le ticker ──────────────────────────
const TICKER_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'AVAXUSDT', 'ADAUSDT', 'LINKUSDT', 'DOTUSDT',
];

// ══════════════════════════════════════════════════════════════
//  NAV — effet de fond au scroll
// ══════════════════════════════════════════════════════════════

(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const update = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  update(); // état initial
  window.addEventListener('scroll', update, { passive: true });
})();

// ══════════════════════════════════════════════════════════════
//  INTERSECTION OBSERVERS — animations au scroll
// ══════════════════════════════════════════════════════════════

(function initObservers() {
  // Cartes de fonctionnalités
  const cardObs = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.feat-card').forEach(c => cardObs.observe(c));

  // Terminal mock (section aperçu)
  const termObs = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.25 }
  );
  const terminal = document.getElementById('terminal-mock');
  if (terminal) termObs.observe(terminal);
})();

// ══════════════════════════════════════════════════════════════
//  BOUGIES DE PRÉVISUALISATION
// ══════════════════════════════════════════════════════════════

(function buildCandlesPreview() {
  const preview = document.getElementById('candles-preview');
  if (!preview) return;

  // Séquence statique représentative d'un mini-chart haussier
  const candles = [
    { h: 28, bull: false }, { h: 40, bull: true  }, { h: 22, bull: false },
    { h: 55, bull: true  }, { h: 38, bull: false }, { h: 62, bull: true  },
    { h: 30, bull: false }, { h: 70, bull: true  }, { h: 48, bull: true  },
    { h: 42, bull: false }, { h: 66, bull: true  }, { h: 28, bull: false },
    { h: 58, bull: true  }, { h: 38, bull: true  }, { h: 52, bull: false },
    { h: 72, bull: true  }, { h: 44, bull: false }, { h: 68, bull: true  },
    { h: 52, bull: true  }, { h: 74, bull: true  },
  ];

  preview.innerHTML = candles
    .map(({ h, bull }, i) => `
      <div class="candle ${bull ? 'bull' : 'bear'}"
           style="animation-delay:${(i * 0.05).toFixed(2)}s">
        <div class="candle-wick" style="height:${Math.round(h * 0.22)}px"></div>
        <div class="candle-body" style="height:${h}px"></div>
      </div>`)
    .join('');
})();

// ══════════════════════════════════════════════════════════════
//  TERMINAL MOCK — données BTC/USDT en temps réel (REST 24h)
// ══════════════════════════════════════════════════════════════

async function fetchTerminalData() {
  try {
    const res  = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d    = await res.json();

    const price = parseFloat(d.lastPrice);
    const open  = parseFloat(d.openPrice);
    const pct   = open ? (price - open) / open * 100 : 0;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    set('tm-open', fmtPrice(open));
    set('tm-high', fmtPrice(parseFloat(d.highPrice)));
    set('tm-low',  fmtPrice(parseFloat(d.lowPrice)));
    set('tm-vol',  fmtVol(parseFloat(d.volume)));
    set('tm-chg',  (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%');

    const chgEl = document.getElementById('tm-chg');
    if (chgEl) chgEl.style.color = pct >= 0 ? 'var(--accent)' : 'var(--red)';

    // Met à jour le titre du terminal mock avec le prix live
    const termLabel = document.querySelector('.term-header span:nth-child(4)');
    if (termLabel) {
      termLabel.textContent = `BTC / USDT — ${fmtPrice(price)}`;
    }

    // Met à jour le <title> de la page avec le prix BTC courant
    document.title = `CrypView — BTC ${fmtPrice(price)}`;

  } catch (_) {
    // Silencieux : le terminal reste vide, ce n'est pas bloquant
  }
}

// ══════════════════════════════════════════════════════════════
//  TICKER SCROLLANT — bande de prix en bas du hero
// ══════════════════════════════════════════════════════════════

async function buildTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;

  try {
    // Requête batch : un seul appel pour toutes les paires
    const query   = encodeURIComponent(JSON.stringify(TICKER_PAIRS));
    const res     = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tickers = await res.json();

    // Construit les items HTML — doublés pour que l'animation CSS
    // en boucle (ticker 36s) soit transparente.
    const buildItem = (d) => {
      const sym = d.symbol.replace('USDT', '');
      const pct = parseFloat(d.priceChangePercent);
      const px  = parseFloat(d.lastPrice);
      return `<div class="ticker-item">
        <span class="t-sym">${sym}/USDT</span>
        <span class="t-price">${fmtPrice(px)}</span>
        <span class="t-chg ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%</span>
      </div>`;
    };

    // Duplication pour un défilement continu sans saut visible
    track.innerHTML = [...tickers, ...tickers].map(buildItem).join('');

  } catch (_) {
    // Fallback minimal : affiche des tirets statiques
    track.innerHTML = TICKER_PAIRS
      .map(s => `<div class="ticker-item">
        <span class="t-sym">${s.replace('USDT', '')}/USDT</span>
        <span class="t-price">—</span>
        <span class="t-chg">—</span>
      </div>`)
      .repeat(2)
      .join('');
  }
}

// ══════════════════════════════════════════════════════════════
//  THÈME LIGHT/DARK SUR LA LANDING
// ══════════════════════════════════════════════════════════════

(function initThemeToggle() {
  // Le bouton "Lancer l'app" dans la nav redirige vers page.html
  // qui gère son propre thème. Sur la landing on applique simplement
  // la préférence stockée (déjà gérée par le script anti-flash dans <head>).
  // On écoute juste les changements système en temps réel.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Ne surcharge pas un choix explicite de l'utilisateur
    if (localStorage.getItem('crypview-theme')) return;
    document.documentElement.classList.toggle('light-theme', !e.matches);
  });
})();

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════

fetchTerminalData();
buildTicker();
