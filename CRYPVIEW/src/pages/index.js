// ============================================================
//  src/pages/index.js — CrypView V2
//  Landing page : nav scroll, ticker live, terminal mock,
//  candlesticks animés, scroll reveal.
//  Aucun import — pas de dépendance à l'app chart.
// ============================================================

// ── Symboles à afficher dans le ticker ───────────────────────
const TICKER_SYMS = [
  'btcusdt','ethusdt','solusdt','bnbusdt','xrpusdt',
  'dogeusdt','adausdt','avaxusdt','linkusdt','dotusdt',
  'maticusdt','uniusdt','ltcusdt','atomusdt','ftmusdt',
];

// ── Helpers format ───────────────────────────────────────────
function fmtP(p) {
  p = parseFloat(p);
  if (!p) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)    return p.toFixed(4);
  return p.toFixed(6);
}
function fmtVol(v) {
  v = parseFloat(v);
  if (v > 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v > 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v > 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

// ── NAV — effet de scroll ─────────────────────────────────────
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const update = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── TICKER LIVE ──────────────────────────────────────────────
async function loadTicker() {
  try {
    const symsUC  = TICKER_SYMS.map(s => `"${s.toUpperCase()}"`).join(',');
    const res     = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symsUC}]`);
    const data    = await res.json();
    const track   = document.getElementById('ticker-track');
    if (!track) return;

    const items = data.map(t => {
      const base = t.symbol.replace('USDT', '');
      const chg  = parseFloat(t.priceChangePercent);
      return `<div class="ticker-item">
        <span class="t-sym">${base}</span>
        <span class="t-price">${fmtP(t.lastPrice)}</span>
        <span class="t-chg ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>
      </div>`;
    }).join('');

    // Duplication pour le défilement infini
    track.innerHTML = items + items;

    // Terminal mock — données BTC
    const btc = data.find(t => t.symbol === 'BTCUSDT');
    if (btc) {
      const chg = parseFloat(btc.priceChangePercent);
      setText('tm-open', fmtP(btc.openPrice));
      setText('tm-high', fmtP(btc.highPrice));
      setText('tm-low',  fmtP(btc.lowPrice));
      setText('tm-vol',  fmtVol(btc.quoteVolume) + ' USDT');
      const chgEl = document.getElementById('tm-chg');
      if (chgEl) {
        chgEl.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
        chgEl.className   = 'v ' + (chg >= 0 ? 'up' : 'down');
      }
    }
  } catch (_) {
    // Silencieux — la landing fonctionne sans données live
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── CANDLES animées ──────────────────────────────────────────
function buildCandles() {
  const el = document.getElementById('candles-preview');
  if (!el) return;

  const pattern = [
    { bull: true,  h: 35, b: 18, wt: 8,  wb: 5  },
    { bull: false, h: 42, b: 22, wt: 5,  wb: 10 },
    { bull: true,  h: 28, b: 14, wt: 7,  wb: 4  },
    { bull: true,  h: 52, b: 28, wt: 10, wb: 8  },
    { bull: false, h: 38, b: 20, wt: 6,  wb: 9  },
    { bull: false, h: 30, b: 16, wt: 5,  wb: 7  },
    { bull: true,  h: 44, b: 24, wt: 9,  wb: 5  },
    { bull: true,  h: 58, b: 32, wt: 8,  wb: 6  },
    { bull: false, h: 35, b: 18, wt: 7,  wb: 8  },
    { bull: true,  h: 48, b: 26, wt: 6,  wb: 5  },
    { bull: true,  h: 62, b: 34, wt: 10, wb: 7  },
    { bull: false, h: 40, b: 22, wt: 5,  wb: 9  },
  ];

  el.innerHTML = pattern.map((c, i) => `
    <div class="candle ${c.bull ? 'bull' : 'bear'}" style="animation-delay:${i * 0.06}s">
      <div class="candle-wick" style="height:${c.wt}px"></div>
      <div class="candle-body" style="height:${c.b}px"></div>
      <div class="candle-wick" style="height:${c.wb}px"></div>
    </div>`).join('');
}

// ── SCROLL REVEAL ────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.classList.contains('feat-card')) {
        const idx = [...document.querySelectorAll('.feat-card')].indexOf(el);
        setTimeout(() => el.classList.add('visible'), idx * 80);
      } else {
        el.classList.add('visible');
      }
      observer.unobserve(el);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feat-card, .terminal-mock').forEach(el => observer.observe(el));
}

// ── INIT ─────────────────────────────────────────────────────
initNav();
buildCandles();
initScrollReveal();
loadTicker();
setInterval(loadTicker, 10_000);
