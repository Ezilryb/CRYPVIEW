// src/components/MarketSentimentWidget.js
class MarketSentimentWidget {
  constructor() {
    this._overlay  = null;
    this._id       = null;
    this.symbol    = null;
    this.fngData   = [];
    this.socialData = null;
  }

  open(symbol) {
    this.symbol = symbol ?? this.symbol;
    if (!this._overlay) this._buildOverlay();
    this._overlay.style.display = 'flex';
    this._fetchData();
  }

  close() {
    if (this._overlay) this._overlay.style.display = 'none';
  }

  updateSymbol(symbol) {
    this.symbol = symbol;
    if (this._overlay?.style.display === 'flex') this._fetchData();
  }

  destroy() {
    this._overlay?.remove();
    this._overlay = null;
  }

  _buildOverlay() {
    this._injectCSS();
    const ov = document.createElement('div');
    ov.className = 'crypview-modal-overlay';
    ov.innerHTML = `
      <div class="crypview-modal-box">
        <div class="sw-wrap">
          <div class="sw-header">
            <h2>📊 Sentiment de Marché</h2>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
              <button id="${this._uid('refresh')}">↻ Actualiser</button>
              <button class="sw-close-btn" aria-label="Fermer">✕</button>
            </div>
          </div>
          <div class="sw-grid">
            <div class="sw-card">
              <div class="sw-title">Fear &amp; Greed Index</div>
              <canvas id="${this._uid('fngGauge')}" width="200" height="120"></canvas>
              <div id="${this._uid('fngValue')}" class="sw-big">--</div>
              <div id="${this._uid('fngLabel')}" class="sw-sub">Chargement…</div>
            </div>
            <div class="sw-card">
              <div class="sw-title">Sentiment Social (BTC)</div>
              <div id="${this._uid('social')}"><div class="sw-spin"></div></div>
            </div>
            <div class="sw-card sw-span2">
              <div class="sw-title">Historique F&amp;G — 30 jours</div>
              <canvas id="${this._uid('fngHistory')}" width="700" height="140"></canvas>
            </div>
            <div class="sw-card">
              <div class="sw-title">Mood</div>
              <div id="${this._uid('mood')}"><div class="sw-spin"></div></div>
            </div>
          </div>
        </div>
      </div>`;

    ov.querySelector('.sw-close-btn').onclick = () => this.close();
    ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
    document.body.appendChild(ov);
    this._overlay = ov;

    document.getElementById(this._uid('refresh')).onclick = () => this._fetchData();
  }

  async _fetchData() {
    await Promise.all([this._fetchFearGreed(), this._fetchCoinGeckoSentiment()]);
  }

  async _fetchFearGreed() {
    try {
      const res  = await fetch('https://api.alternative.me/fng/?limit=30&format=json');
      const json = await res.json();
      this.fngData = json.data || [];
      this._renderFearGreed();
    } catch (e) {
      const el = document.getElementById(this._uid('fngLabel'));
      if (el) el.textContent = 'Erreur de chargement';
    }
  }

  async _fetchCoinGeckoSentiment() {
    try {
      const res  = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true');
      const json = await res.json();
      this.socialData = {
        up:              json.sentiment_votes_up_percentage,
        down:            json.sentiment_votes_down_percentage,
        developer_score: json.developer_score,
        twitter:         json.community_data?.twitter_followers,
        reddit:          json.community_data?.reddit_subscribers,
        reddit_active:   json.community_data?.reddit_accounts_active_48h,
      };
      this._renderSocial();
    } catch (e) { console.error(e); }
  }

  _renderFearGreed() {
    if (!this.fngData.length) return;
    const v = parseInt(this.fngData[0].value);
    const c = this._color(v);
    const valEl = document.getElementById(this._uid('fngValue'));
    const lblEl = document.getElementById(this._uid('fngLabel'));
    if (valEl) { valEl.textContent = v; valEl.style.color = c; }
    if (lblEl) lblEl.textContent = this.fngData[0].value_classification;
    this._drawGauge(v, c);
    this._drawHistory();
    this._renderMood(v, c);
  }

  _renderSocial() {
    const d = this.socialData;
    const el = document.getElementById(this._uid('social'));
    if (!el || !d) return;
    el.innerHTML = `
      <div class="sw-bars">
        <div class="sw-bar-row"><span class="sw-bull">▲ Haussier</span>
          <div class="sw-track"><div class="sw-fill sw-fill-g" style="width:${d.up?.toFixed(1)}%"></div></div>
          <b>${d.up?.toFixed(1)}%</b></div>
        <div class="sw-bar-row"><span class="sw-bear">▼ Baissier</span>
          <div class="sw-track"><div class="sw-fill sw-fill-r" style="width:${d.down?.toFixed(1)}%"></div></div>
          <b>${d.down?.toFixed(1)}%</b></div>
      </div>
      <div class="sw-stats">
        <div class="sw-stat"><span>🐦 Twitter</span><b>${this._fmt(d.twitter)}</b></div>
        <div class="sw-stat"><span>💬 Reddit</span><b>${this._fmt(d.reddit)}</b></div>
        <div class="sw-stat"><span>👥 Actifs 48h</span><b>${this._fmt(d.reddit_active)}</b></div>
        <div class="sw-stat"><span>🛠 Dev Score</span><b>${d.developer_score?.toFixed(1) ?? '--'}</b></div>
      </div>`;
  }

  _renderMood(v, c) {
    const prev = this.fngData[1] ? parseInt(this.fngData[1].value) : v;
    const d    = v - prev;
    const zones = [
      { max:25,  e:'😱', z:'Peur Extrême',     t:'💡 Zone de capitulation — opportunité contrariante potentielle' },
      { max:45,  e:'😰', z:'Peur',             t:'⚠️ Marché craintif — prudence recommandée' },
      { max:55,  e:'😐', z:'Neutre',           t:'🔍 Attendre une confirmation avant de trader' },
      { max:75,  e:'😀', z:'Cupidité',         t:'📈 Optimisme — suivre la tendance avec stops serrés' },
      { max:101, e:'🤑', z:'Cupidité Extrême', t:'🚨 Euphorie — risque de retournement élevé' },
    ];
    const z = zones.find(x => v < x.max) || zones[3];
    const el = document.getElementById(this._uid('mood'));
    if (!el) return;
    el.innerHTML = `
      <div class="sw-mood">
        <div style="font-size:3rem">${z.e}</div>
        <div style="color:${c};font-size:1.1rem;font-weight:700">${z.z}</div>
        <div style="color:${d >= 0 ? '#26a69a' : '#ef5350'};font-size:.85rem;margin:4px 0">
          ${d >= 0 ? '▲' : '▼'} ${Math.abs(d)} pts vs hier
        </div>
        <div class="sw-tip">${z.t}</div>
      </div>`;
  }

  _drawGauge(value, color) {
    const canvas = document.getElementById(this._uid('fngGauge'));
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const [cx, cy, r] = [100, 100, 76];
    ctx.clearRect(0, 0, 200, 120);
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0, false);
    ctx.lineWidth = 18; ctx.strokeStyle = '#2a2d3e'; ctx.stroke();
    const a = Math.PI + (value / 100) * Math.PI;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, a, false);
    ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (r - 22) * Math.cos(a), cy + (r - 22) * Math.sin(a));
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ef5350'; ctx.fillText('Peur', 18, cy + 12);
    ctx.fillStyle = '#26a69a'; ctx.fillText('Avidité', 145, cy + 12);
  }

  _drawHistory() {
    const canvas = document.getElementById(this._uid('fngHistory'));
    if (!canvas || !this.fngData.length) return;
    const ctx = canvas.getContext('2d');
    const W = 700, H = 140, p = { t:8, r:8, b:28, l:28 };
    const vals = [...this.fngData].reverse().map(d => parseInt(d.value));
    const iw = W - p.l - p.r, ih = H - p.t - p.b;
    const xp = i => p.l + (i / (vals.length - 1)) * iw;
    const yp = v => p.t + ih - (v / 100) * ih;
    ctx.clearRect(0, 0, W, H);
    [0, 25, 50, 75, 100].forEach(v => {
      ctx.beginPath(); ctx.moveTo(p.l, yp(v)); ctx.lineTo(W - p.r, yp(v));
      ctx.strokeStyle = '#1e2130'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#555'; ctx.font = '10px monospace';
      ctx.fillText(v, 0, yp(v) + 4);
    });
    const grad = ctx.createLinearGradient(0, p.t, 0, p.t + ih);
    grad.addColorStop(0, 'rgba(38,166,154,.35)'); grad.addColorStop(1, 'rgba(38,166,154,0)');
    ctx.beginPath(); ctx.moveTo(xp(0), yp(vals[0]));
    vals.forEach((v, i) => ctx.lineTo(xp(i), yp(v)));
    ctx.lineTo(xp(vals.length - 1), p.t + ih); ctx.lineTo(xp(0), p.t + ih);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(xp(0), yp(vals[0]));
    vals.forEach((v, i) => ctx.lineTo(xp(i), yp(v)));
    ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 2; ctx.stroke();
    const labels = [...this.fngData].reverse();
    labels.forEach((d, i) => {
      if (i % 5 === 0) {
        const dt = new Date(d.timestamp * 1000);
        ctx.fillStyle = '#555'; ctx.font = '10px monospace';
        ctx.fillText(`${dt.getDate()}/${dt.getMonth() + 1}`, xp(i) - 10, H - 5);
      }
    });
  }

  _color(v) {
    if (v < 25) return '#ef5350';
    if (v < 45) return '#ff7043';
    if (v < 55) return '#ffca28';
    if (v < 75) return '#66bb6a';
    return '#26a69a';
  }

  _fmt(n) {
    if (!n && n !== 0) return '--';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n;
  }

  _uid(suffix) {
    if (!this._id) this._id = Math.random().toString(36).slice(2, 7);
    return `${this._id}-${suffix}`;
  }

  _injectCSS() {
    if (document.getElementById('swCSS')) return;
    const s = document.createElement('style'); s.id = 'swCSS';
    s.textContent = `
      .crypview-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;align-items:center;justify-content:center;padding:16px}
      .crypview-modal-box{background:#0d0f1a;border:1px solid #2a2d3e;border-radius:14px;width:100%;max-width:860px;max-height:90vh;overflow-y:auto}
      .sw-close-btn{background:none;border:1px solid #444;border-radius:6px;color:#888;font-size:1rem;cursor:pointer;padding:4px 10px;transition:all .2s;line-height:1;flex-shrink:0}
      .sw-close-btn:hover{color:#fff;border-color:#aaa}
      .sw-wrap{font-family:'Inter',sans-serif;color:#e0e0e0;padding:16px}
      .sw-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
      .sw-header h2{margin:0;font-size:1.2rem}
      .sw-header > div > button:not(.sw-close-btn){background:#1e2130;border:1px solid #333;color:#aaa;padding:6px 12px;border-radius:6px;cursor:pointer}
      .sw-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .sw-span2{grid-column:span 2}
      .sw-card{background:#1a1d2e;border:1px solid #2a2d3e;border-radius:10px;padding:16px;display:flex;flex-direction:column;align-items:center}
      .sw-title{font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;width:100%;text-align:left}
      .sw-big{font-size:2.5rem;font-weight:700;margin-top:6px}
      .sw-sub{font-size:.9rem;color:#aaa;margin-top:4px}
      .sw-spin{width:28px;height:28px;border:3px solid #333;border-top-color:#26a69a;border-radius:50%;animation:swspin .8s linear infinite;margin:20px auto}
      @keyframes swspin{to{transform:rotate(360deg)}}
      .sw-bars{width:100%}
      .sw-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:.85rem;width:100%}
      .sw-track{flex:1;background:#2a2d3e;border-radius:4px;height:8px;overflow:hidden}
      .sw-fill{height:100%;border-radius:4px;transition:width .4s}
      .sw-fill-g{background:#26a69a}.sw-fill-r{background:#ef5350}
      .sw-bull{color:#26a69a;min-width:72px}.sw-bear{color:#ef5350;min-width:72px}
      .sw-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;width:100%}
      .sw-stat{background:#111422;border-radius:6px;padding:8px;font-size:.78rem;display:flex;flex-direction:column;gap:3px}
      .sw-stat b{font-size:.95rem;color:#fff}
      .sw-mood{text-align:center;padding:4px 0;width:100%}
      .sw-tip{font-size:.8rem;color:#aaa;margin-top:10px;background:#111422;border-radius:6px;padding:10px;text-align:left;width:100%;box-sizing:border-box}
      @media(max-width:700px){.sw-grid{grid-template-columns:1fr}.sw-span2{grid-column:span 1}}
    `;
    document.head.appendChild(s);
  }
}

export default MarketSentimentWidget;
