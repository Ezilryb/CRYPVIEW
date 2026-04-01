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
//    - Animation Footprint preview (#fp-preview canvas)
//    - Animation Orderflow preview (#of-preview div)
//    - Rendu Volume Profile preview (#vp-preview canvas)
//    - Démo interactive des alertes (#alert-demo)
// ============================================================

import { fmtPrice, fmtVol } from '../utils/format.js';

// ── AlertManager — partage la même clé que page.html ─────────
import { AlertManager } from '../features/AlertManager.js';
const alertManager = new AlertManager('crypview_alerts_v1');

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
  update();
  window.addEventListener('scroll', update, { passive: true });
})();

// ══════════════════════════════════════════════════════════════
//  INTERSECTION OBSERVERS — animations au scroll
// ══════════════════════════════════════════════════════════════

(function initObservers() {
  const cardObs = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.12 }
  );
  document.querySelectorAll('.feat-card').forEach(c => cardObs.observe(c));

  const termObs = new IntersectionObserver(
    (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.25 }
  );
  document.getElementById('terminal-mock') && termObs.observe(document.getElementById('terminal-mock'));

  const advObs = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.adv-card').forEach(c => advObs.observe(c));

  const alertObs = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.2 }
  );
  const alertCard = document.querySelector('.alert-demo-card');
  if (alertCard) alertObs.observe(alertCard);

  const pwaObs = new IntersectionObserver(
    (entries) => entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.pwa-card').forEach(c => pwaObs.observe(c));
})();

// ══════════════════════════════════════════════════════════════
//  BOUGIES DE PRÉVISUALISATION
// ══════════════════════════════════════════════════════════════

(function buildCandlesPreview() {
  const preview = document.getElementById('candles-preview');
  if (!preview) return;

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

let _currentBtcPrice = null;

async function fetchTerminalData() {
  try {
    const res  = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const d    = await res.json();

    const price = parseFloat(d.lastPrice);
    const open  = parseFloat(d.openPrice);
    const pct   = open ? (price - open) / open * 100 : 0;
    _currentBtcPrice = price;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('tm-open', fmtPrice(open));
    set('tm-high', fmtPrice(parseFloat(d.highPrice)));
    set('tm-low',  fmtPrice(parseFloat(d.lowPrice)));
    set('tm-vol',  fmtVol(parseFloat(d.volume)));
    set('tm-chg',  (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%');

    const chgEl = document.getElementById('tm-chg');
    if (chgEl) chgEl.style.color = pct >= 0 ? 'var(--accent)' : 'var(--red)';

    document.title = `CrypView — BTC ${fmtPrice(price)}`;

    // Mettre à jour la démo d'alertes avec le prix BTC
    initAlertDemoWithPrice(price);
  } catch (_) {}
}

// ══════════════════════════════════════════════════════════════
//  TICKER SCROLLANT
// ══════════════════════════════════════════════════════════════

async function buildTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;

  try {
    const query   = encodeURIComponent(JSON.stringify(TICKER_PAIRS));
    const res     = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const tickers = await res.json();

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

    track.innerHTML = [...tickers, ...tickers].map(buildItem).join('');
  } catch (_) {
    track.innerHTML = TICKER_PAIRS
      .map(s => `<div class="ticker-item">
        <span class="t-sym">${s.replace('USDT', '')}/USDT</span>
        <span class="t-price">—</span>
        <span class="t-chg">—</span>
      </div>`)
      .concat(TICKER_PAIRS.map(s => `<div class="ticker-item">
        <span class="t-sym">${s.replace('USDT', '')}/USDT</span>
        <span class="t-price">—</span>
        <span class="t-chg">—</span>
      </div>`))
      .join('');
  }
}

// ══════════════════════════════════════════════════════════════
//  FOOTPRINT PREVIEW — canvas animé
// ══════════════════════════════════════════════════════════════

(function initFootprintPreview() {
  const canvas = document.getElementById('fp-preview');
  if (!canvas) return;

  // Données synthétiques représentatives
  const CANDLES = [
    { bull: false, poc: 2, levels: [
      { ask: 0.08, bid: 0.92 }, { ask: 0.12, bid: 0.88 },
      { ask: 0.22, bid: 0.78 }, { ask: 0.55, bid: 0.45 },
      { ask: 0.80, bid: 0.20 },
    ]},
    { bull: true, poc: 3, levels: [
      { ask: 0.30, bid: 0.70 }, { ask: 0.48, bid: 0.52 },
      { ask: 0.60, bid: 0.40 }, { ask: 0.75, bid: 0.25 },
      { ask: 0.88, bid: 0.12 },
    ]},
    { bull: false, poc: 1, levels: [
      { ask: 0.05, bid: 0.95 }, { ask: 0.92, bid: 0.08 }, // imbalance
      { ask: 0.18, bid: 0.82 }, { ask: 0.35, bid: 0.65 },
      { ask: 0.62, bid: 0.38 },
    ]},
    { bull: true, poc: 2, levels: [
      { ask: 0.20, bid: 0.80 }, { ask: 0.38, bid: 0.62 },
      { ask: 0.90, bid: 0.10 }, // imbalance
      { ask: 0.65, bid: 0.35 }, { ask: 0.82, bid: 0.18 },
    ]},
    { bull: true, poc: 4, levels: [
      { ask: 0.28, bid: 0.72 }, { ask: 0.42, bid: 0.58 },
      { ask: 0.55, bid: 0.45 }, { ask: 0.68, bid: 0.32 },
      { ask: 0.85, bid: 0.15 },
    ]},
  ];

  // Gestion DPR pour canvas net
  const dpr    = window.devicePixelRatio || 1;
  const W_CSS  = canvas.offsetWidth  || 420;
  const H_CSS  = canvas.offsetHeight || 200;
  canvas.width  = W_CSS * dpr;
  canvas.height = H_CSS * dpr;
  canvas.style.width  = W_CSS + 'px';
  canvas.style.height = H_CSS + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let phase        = 0;
  let animFrame    = null;
  let lastDraw     = 0;
  const THROTTLE   = 80; // ms entre frames

  function draw(ts) {
    if (ts - lastDraw < THROTTLE) { animFrame = requestAnimationFrame(draw); return; }
    lastDraw = ts;
    phase   += 0.04;

    ctx.clearRect(0, 0, W_CSS, H_CSS);

    // Fond quadrillé subtil
    ctx.strokeStyle = 'rgba(28,35,51,0.6)';
    ctx.lineWidth   = 0.5;
    for (let y = 0; y < H_CSS; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W_CSS, y); ctx.stroke();
    }

    const numC   = CANDLES.length;
    const colW   = W_CSS / numC;
    const numLvl = CANDLES[0].levels.length;
    const lvlH   = (H_CSS - 20) / numLvl;

    CANDLES.forEach((c, ci) => {
      const xL = ci * colW + 2;
      const xR = xL + colW - 4;
      const xMid = (xL + xR) / 2;

      c.levels.forEach((lv, li) => {
        const y = 10 + (numLvl - 1 - li) * lvlH;
        const h = lvlH - 1;

        // Volume ask (gauche → centre)
        const askW = (xMid - xL) * lv.ask;
        // Volume bid (centre → droite)
        const bidW = (xR - xMid) * lv.bid;

        const isPOC   = li === c.poc;
        const askAlpha = isPOC ? 0.75 : 0.42 + Math.sin(phase + ci * 0.8 + li * 0.3) * 0.06;
        const bidAlpha = isPOC ? 0.75 : 0.42 + Math.cos(phase + ci * 0.9 + li * 0.2) * 0.06;

        // Background VA (value area – cells near POC)
        if (Math.abs(li - c.poc) <= 1) {
          ctx.fillStyle = 'rgba(226,64,251,0.06)';
          ctx.fillRect(xL, y, colW - 4, h);
        }

        // Barres ask (vert, à gauche du centre)
        ctx.fillStyle = `rgba(0,255,136,${askAlpha})`;
        ctx.fillRect(xMid - askW, y + 1, askW, h - 2);

        // Barres bid (rouge, à droite du centre)
        ctx.fillStyle = `rgba(255,61,90,${bidAlpha})`;
        ctx.fillRect(xMid, y + 1, bidW, h - 2);

        // Séparateur central
        ctx.fillStyle = 'rgba(28,35,51,0.8)';
        ctx.fillRect(xMid - 0.5, y, 1, h);

        // Imbalance : border doré si ask/bid ≥ 3x ou inversement
        const ratio = lv.bid > 0 ? lv.ask / lv.bid : 99;
        const ratioInv = lv.ask > 0 ? lv.bid / lv.ask : 99;
        if (ratio >= 3 || ratioInv >= 3) {
          ctx.strokeStyle = 'rgba(255,215,0,0.8)';
          ctx.lineWidth   = 1;
          ctx.strokeRect(xL + 0.5, y + 0.5, colW - 5, h - 1);
          // Étoile imbalance
          ctx.fillStyle   = '#ffd700';
          ctx.font        = 'bold 7px Space Mono,monospace';
          ctx.textAlign   = 'right';
          ctx.fillText('★', xR - 2, y + h * 0.6 + 3);
        }

        // POC line
        if (isPOC) {
          ctx.strokeStyle = '#e040fb';
          ctx.lineWidth   = 1;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(xL, y + h / 2);
          ctx.lineTo(xR, y + h / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          // Label POC
          ctx.fillStyle = '#e040fb';
          ctx.font      = 'bold 6px Space Mono,monospace';
          ctx.textAlign = 'left';
          ctx.fillText('POC', xL + 2, y + h / 2 - 1);
        }
      });

      // Séparateur entre bougies
      ctx.strokeStyle = 'rgba(28,35,51,0.9)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(xR + 2, 10);
      ctx.lineTo(xR + 2, H_CSS - 10);
      ctx.stroke();
    });

    animFrame = requestAnimationFrame(draw);
  }

  // Démarrer quand visible
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!animFrame) animFrame = requestAnimationFrame(draw);
      } else {
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      }
    });
  }, { threshold: 0.1 });
  obs.observe(canvas);
})();

// ══════════════════════════════════════════════════════════════
//  ORDERFLOW DELTA PREVIEW — barres animées
// ══════════════════════════════════════════════════════════════

(function initOrderflowPreview() {
  const wrap = document.getElementById('of-preview');
  if (!wrap) return;

  const NUM_BARS = 24;

  // Données synthétiques : cycle de tendance haussière puis correction
  const baseDeltas = [
    120, 340, -80, 520, 280, -150, 410, 600, -200, 380,
    750, 220, -310, 490, 680, -120, 890, 450, -280, 1100,
    620, -340, 980, 510,
  ];

  // Calculer CVD
  let cvd = 0;
  const cvdValues = baseDeltas.map(d => { cvd += d; return cvd; });
  const cvdMin = Math.min(...cvdValues);
  const cvdMax = Math.max(...cvdValues);

  let animFrame = null;
  let phase     = 0;
  let lastDraw  = 0;

  // Créer les barres DOM
  wrap.innerHTML = `
    <div class="of-bars-wrap">
      ${Array.from({ length: NUM_BARS }, (_, i) => `
        <div class="of-bar-slot">
          <div class="of-bar" id="of-b-${i}" aria-hidden="true"></div>
        </div>
      `).join('')}
    </div>
    <canvas id="of-cvd-canvas" class="of-cvd-canvas" aria-hidden="true"></canvas>
  `;

  const bars     = Array.from({ length: NUM_BARS }, (_, i) => document.getElementById(`of-b-${i}`));
  const cvdCanvas = document.getElementById('of-cvd-canvas');

  // Configurer canvas CVD
  function setupCVDCanvas() {
    if (!cvdCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = wrap.offsetWidth  || 420;
    const H   = 40;
    cvdCanvas.width         = W * dpr;
    cvdCanvas.height        = H * dpr;
    cvdCanvas.style.width   = W + 'px';
    cvdCanvas.style.height  = H + 'px';
    const ctx = cvdCanvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, W, H };
  }

  function drawCVD() {
    const setup = setupCVDCanvas();
    if (!setup) return;
    const { ctx, W, H } = setup;
    ctx.clearRect(0, 0, W, H);

    const pts = cvdValues.map((v, i) => ({
      x: (i / (NUM_BARS - 1)) * W,
      y: H - ((v - cvdMin) / (cvdMax - cvdMin || 1)) * (H - 8) - 4,
    }));

    // Gradient sous la courbe
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,159,67,0.3)');
    grad.addColorStop(1, 'rgba(255,159,67,0)');

    ctx.beginPath();
    ctx.moveTo(pts[0].x, H);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Ligne CVD
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = '#ff9f43';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  const maxAbsDelta = Math.max(...baseDeltas.map(Math.abs));

  function drawBars(ts) {
    if (ts - lastDraw < 60) { animFrame = requestAnimationFrame(drawBars); return; }
    lastDraw = ts;
    phase   += 0.015;

    bars.forEach((bar, i) => {
      // Ajouter une légère variation animée pour le feeling "live"
      const wobble = Math.sin(phase * 1.8 + i * 0.4) * 0.12;
      const delta  = baseDeltas[i] * (1 + wobble);
      const pct    = Math.abs(delta) / maxAbsDelta * 100;
      const isPos  = delta >= 0;

      bar.style.height     = Math.max(2, pct * 0.75) + '%';
      bar.style.background = isPos
        ? `rgba(0,255,136,${0.55 + Math.abs(wobble)})`
        : `rgba(255,61,90,${0.55 + Math.abs(wobble)})`;

      // Barre "live" (dernière) pulse
      if (i === NUM_BARS - 1) {
        const pulseAlpha = 0.65 + Math.sin(phase * 4) * 0.25;
        bar.style.background = isPos
          ? `rgba(0,255,136,${pulseAlpha})`
          : `rgba(255,61,90,${pulseAlpha})`;
        bar.style.boxShadow = isPos
          ? `0 0 8px rgba(0,255,136,0.4)`
          : `0 0 8px rgba(255,61,90,0.4)`;
      } else {
        bar.style.boxShadow = '';
      }
    });

    animFrame = requestAnimationFrame(drawBars);
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        drawCVD();
        if (!animFrame) animFrame = requestAnimationFrame(drawBars);
      } else {
        if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
      }
    });
  }, { threshold: 0.1 });
  obs.observe(wrap);
})();

// ══════════════════════════════════════════════════════════════
//  VOLUME PROFILE PREVIEW — canvas statique
// ══════════════════════════════════════════════════════════════

(function initVolumeProfilePreview() {
  const canvas = document.getElementById('vp-preview');
  if (!canvas) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      obs.unobserve(canvas); // dessiner une seule fois

      const dpr   = window.devicePixelRatio || 1;
      const W_CSS = canvas.offsetWidth  || 420;
      const H_CSS = canvas.offsetHeight || 200;
      canvas.width  = W_CSS * dpr;
      canvas.height = H_CSS * dpr;
      canvas.style.width  = W_CSS + 'px';
      canvas.style.height = H_CSS + 'px';

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Profil de volume synthétique (distribution gaussienne centrée)
      const N_BUCKETS = 28;
      const pocIdx    = 17; // Point of Control
      const vaLow     = 11;
      const vaHigh    = 22;

      // Générer les valeurs du profil (gauss + bruit)
      const profile = Array.from({ length: N_BUCKETS }, (_, i) => {
        const dist   = Math.abs(i - pocIdx);
        const gauss  = Math.exp(-dist * dist / 28);
        const noise  = 0.1 + Math.random() * 0.15;
        const total  = gauss * (0.85 + noise);
        return { buy: total * (0.4 + (i > pocIdx ? 0.15 : 0)), sell: total * (0.6 - (i > pocIdx ? 0.15 : 0)) };
      });

      const maxVol   = Math.max(...profile.map(b => b.buy + b.sell));
      const barMaxW  = W_CSS * 0.65;
      const bucketH  = H_CSS / N_BUCKETS;

      // Fond grille horizontale subtile
      ctx.strokeStyle = 'rgba(28,35,51,0.5)';
      ctx.lineWidth   = 0.5;
      for (let i = 0; i <= N_BUCKETS; i++) {
        const y = i * bucketH;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W_CSS, y); ctx.stroke();
      }

      profile.forEach((b, i) => {
        const total = b.buy + b.sell;
        const totalW  = (total / maxVol) * barMaxW;
        const buyW    = totalW * (b.buy / total);
        const sellW   = totalW * (b.sell / total);
        const y       = i * bucketH + 0.5;
        const h       = bucketH - 1;
        const isPOC   = i === pocIdx;
        const inVA    = i >= vaLow && i <= vaHigh;

        // Value Area background
        if (inVA) {
          ctx.fillStyle = 'rgba(0,200,255,0.07)';
          ctx.fillRect(0, y, totalW + 4, h);
        }

        // Barres buy (vert)
        ctx.fillStyle = isPOC ? 'rgba(0,255,136,0.85)' : 'rgba(0,255,136,0.45)';
        ctx.fillRect(0, y + 1, buyW, h - 2);

        // Barres sell (rouge)
        ctx.fillStyle = isPOC ? 'rgba(255,61,90,0.85)' : 'rgba(255,61,90,0.45)';
        ctx.fillRect(buyW, y + 1, sellW, h - 2);
      });

      // Ligne POC
      const pocY = pocIdx * bucketH + bucketH / 2;
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(0, pocY); ctx.lineTo(barMaxW + 10, pocY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle   = '#e040fb';
      ctx.font        = 'bold 8px Space Mono,monospace';
      ctx.textAlign   = 'left';
      ctx.fillText('POC', barMaxW + 4, pocY + 3);

      // Lignes VAH / VAL
      [vaHigh, vaLow].forEach((idx, k) => {
        const y = idx * bucketH + bucketH / 2;
        ctx.strokeStyle = 'rgba(0,200,255,0.6)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(barMaxW * 0.6, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(0,200,255,0.9)';
        ctx.font      = 'bold 7px Space Mono,monospace';
        ctx.fillText(k === 0 ? 'VAH' : 'VAL', barMaxW * 0.6 + 4, y + 3);
      });
    });
  }, { threshold: 0.1 });
  obs.observe(canvas);
})();

// ══════════════════════════════════════════════════════════════
//  DÉMO ALERTES — interaction complète
// ══════════════════════════════════════════════════════════════

function initAlertDemoWithPrice(currentPrice) {
  const canvas      = document.getElementById('alert-chart-canvas');
  const priceInput  = document.getElementById('adc-price-input');
  const confirmBtn  = document.getElementById('adc-confirm');
  const hintEl      = document.getElementById('adc-hint');
  const notifEl     = document.getElementById('adc-notif');
  const notifText   = document.getElementById('adc-notif-text');
  const priceDisplay = document.getElementById('adc-price-display');
  const priceLine   = document.getElementById('alert-price-line');
  const plLabel     = document.getElementById('apl-label');
  const canvas2     = document.getElementById('alert-chart-canvas');

  if (!canvas || !priceInput) return;

  // Afficher le prix courant
  if (priceDisplay) priceDisplay.textContent = fmtPrice(currentPrice);

  // Générer prix synthétiques autour du prix actuel
  const W_CSS = canvas.offsetWidth || 380;
  const H_CSS = canvas.offsetHeight || 160;

  // Données de bougie synthétiques (15 bougies)
  const range  = currentPrice * 0.018; // ±1.8%
  const prices = Array.from({ length: 15 }, (_, i) => {
    const trend = i * (range * 0.04); // légère tendance haussière
    const noise = (Math.random() - 0.5) * range * 0.6;
    return currentPrice - range / 2 + trend + noise;
  });
  const allPrices = prices;
  const minP      = Math.min(...allPrices) - range * 0.15;
  const maxP      = Math.max(...allPrices) + range * 0.15;

  // Suggestion d'alerte : résistance légèrement au-dessus
  const suggestedAlert = currentPrice * 1.008;

  function priceToY(p) { return H_CSS - ((p - minP) / (maxP - minP)) * (H_CSS - 20) - 10; }
  function yToPrice(y) { return minP + ((H_CSS - y - 10) / (H_CSS - 20)) * (maxP - minP); }

  // Dessiner le mini chart
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = W_CSS * dpr;
  canvas.height = H_CSS * dpr;
  canvas.style.width  = W_CSS + 'px';
  canvas.style.height = H_CSS + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  function drawMiniChart(alertPrice) {
    ctx.clearRect(0, 0, W_CSS, H_CSS);

    // Grille
    ctx.strokeStyle = 'rgba(28,35,51,0.5)';
    ctx.lineWidth   = 0.5;
    for (let y = 0; y < H_CSS; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W_CSS, y); ctx.stroke();
    }

    const colW = (W_CSS - 20) / 15;

    // Bougies
    prices.forEach((close, i) => {
      const open  = i === 0 ? currentPrice - range * 0.1 : prices[i - 1];
      const bull  = close >= open;
      const high  = Math.max(open, close) + Math.random() * range * 0.12;
      const low   = Math.min(open, close) - Math.random() * range * 0.12;
      const x     = 10 + i * colW + colW * 0.1;
      const w     = colW * 0.8;
      const yOpen = priceToY(open);
      const yClose = priceToY(close);
      const yHigh = priceToY(high);
      const yLow  = priceToY(low);

      ctx.strokeStyle = bull ? '#00ff88' : '#ff3d5a';
      ctx.lineWidth   = 0.8;
      ctx.beginPath(); ctx.moveTo(x + w / 2, yHigh); ctx.lineTo(x + w / 2, yLow); ctx.stroke();

      ctx.fillStyle = bull ? 'rgba(0,255,136,0.75)' : 'rgba(255,61,90,0.75)';
      const bodyY = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));
      ctx.fillRect(x, bodyY, w, bodyH);
    });

    // Prix courant (ligne horizontale)
    const yCurrent = priceToY(currentPrice);
    ctx.strokeStyle = 'rgba(139,148,158,0.6)';
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, yCurrent); ctx.lineTo(W_CSS, yCurrent); ctx.stroke();
    ctx.setLineDash([]);

    // Ligne d'alerte (si définie)
    if (alertPrice && alertPrice > 0) {
      const yAlert = priceToY(alertPrice);
      const isUp   = alertPrice >= currentPrice;
      ctx.strokeStyle = '#ff9900';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(0, yAlert); ctx.lineTo(W_CSS, yAlert); ctx.stroke();
      ctx.setLineDash([]);

      // Label alert sur le chart
      ctx.fillStyle    = '#ff9900';
      ctx.fillRect(W_CSS - 48, yAlert - 9, 46, 16);
      ctx.fillStyle    = '#070a0f';
      ctx.font         = 'bold 7px Space Mono,monospace';
      ctx.textAlign    = 'center';
      ctx.fillText('🔔 ' + (isUp ? '▲' : '▼'), W_CSS - 25, yAlert + 3);
      ctx.textAlign    = 'left';

      // Mettre à jour la priceLine DOM
      if (priceLine && plLabel) {
        const pct = ((yAlert / H_CSS) * 100).toFixed(1);
        priceLine.style.top     = Math.max(5, Math.min(H_CSS - 18, yAlert)) + 'px';
        priceLine.style.opacity = '1';
        plLabel.textContent     = fmtPrice(alertPrice);
      }
    }
  }

  drawMiniChart(suggestedAlert);

  // Pré-remplir l'input avec la suggestion
  if (priceInput) {
    priceInput.value       = suggestedAlert.toFixed(0);
    priceInput.placeholder = fmtPrice(suggestedAlert);
  }

  updateHint(suggestedAlert, currentPrice, hintEl);
  drawMiniChart(suggestedAlert);

  // Mise à jour en temps réel à la saisie
  if (priceInput) priceInput.oninput = () => {
    const val = parseFloat(priceInput.value);
    if (!isNaN(val) && val > 0) {
      updateHint(val, currentPrice, hintEl);
      drawMiniChart(val);
    }
  };

  // Confirmation
  if (confirmBtn) confirmBtn.onclick = async () => {
    const val = parseFloat(priceInput.value);
    if (!val || val <= 0) {
      priceInput.style.borderColor = 'var(--red)';
      setTimeout(() => { priceInput.style.borderColor = ''; }, 1500);
      return;
    }
  
    // ✅ Demande permission + persiste l'alerte dans localStorage
    await alertManager.requestPermission();
    alertManager.add('BTCUSDT', val, currentPrice);
  
    const sym = 'BTC/USDT';
    const isUp = val >= currentPrice;
    const dir  = isUp ? '⬆ Monte au-dessus de' : '⬇ Descend en-dessous de';
  
    if (notifEl && notifText) {
      notifText.textContent = `${sym} — ${dir} ${fmtPrice(val)} · Enregistrée dans l'app ✓`;
      notifEl.classList.add('show');
      setTimeout(() => { notifEl.classList.remove('show'); }, 4000);
    }
  
    confirmBtn.style.background = '#00e57a';
    confirmBtn.textContent      = '✓ Alerte créée !';
    setTimeout(() => {
      confirmBtn.style.background = '';
      confirmBtn.textContent      = '🔔 Créer l\'alerte';
    }, 2500);
  
    drawMiniChart(val);
  };
}

// ── Mise à jour du hint direction ────────────────────────────
function updateHint(price, currentPrice, hintEl) {
  if (!hintEl) return;
  const p   = parseFloat(price);
  if (isNaN(p) || p <= 0) { hintEl.innerHTML = ''; return; }
  const up    = p >= currentPrice;
  const arrow = up ? '⬆' : '⬇';
  const color = up ? 'var(--accent)' : 'var(--red)';
  const delta = Math.abs(p - currentPrice);
  const pct   = currentPrice ? (delta / currentPrice * 100).toFixed(2) : '—';
  hintEl.innerHTML = `
    <span style="color:${color}">${arrow} Se déclenche si le prix ${up ? 'monte au-dessus de' : 'descend en-dessous de'} ${fmtPrice(p)}</span>
    <span class="adc-delta">Écart : ${fmtPrice(delta)} (${pct}&nbsp;%)</span>
  `;
}

// Démo fallback si BTC non chargé (prix fictif)
(function maybeInitAlertDemoFallback() {
  const canvas = document.getElementById('alert-chart-canvas');
  if (!canvas) return;
  // On attend un peu; si fetchTerminalData réussit, initAlertDemoWithPrice sera appelé
  setTimeout(() => {
    if (!_currentBtcPrice) {
      initAlertDemoWithPrice(67_240); // fallback raisonnable
    }
  }, 3000);
})();

// ══════════════════════════════════════════════════════════════
//  THÈME — écoute des changements système
// ══════════════════════════════════════════════════════════════

(function initThemeToggle() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('crypview-theme')) return;
    document.documentElement.classList.toggle('light-theme', !e.matches);
  });
})();

// ══════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ══════════════════════════════════════════════════════════════

fetchTerminalData();
buildTicker();
