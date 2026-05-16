// src/components/OrderBookModal.js
import { escHtml } from '../utils/sanitize.js';

class OrderBookModal {
  constructor() {
    this._overlay      = null;
    this._id           = null;
    this.symbol        = 'BTCUSDT';
    this.depth         = 20;
    this.interval      = null;
    this.spreadHistory = [];
  }

  open(symbol) {
    this.symbol = symbol ?? this.symbol;
    if (!this._overlay) this._buildOverlay();
    this._overlay.style.display = 'flex';
    this._fetchData();
    if (!this.interval) {
      this.interval = setInterval(() => this._fetchData(), 3000);
    }
  }

  close() {
    if (this._overlay) this._overlay.style.display = 'none';
    clearInterval(this.interval);
    this.interval = null;
  }

  updateSymbol(symbol) {
    this.symbol = symbol;
    if (this._overlay?.style.display === 'flex') this._fetchData();
  }

  destroy() {
    clearInterval(this.interval);
    this.interval = null;
    this._overlay?.remove();
    this._overlay = null;
  }

  _buildOverlay() {
    this._injectCSS();
    const ov = document.createElement('div');
    ov.className = 'crypview-modal-overlay';
    ov.innerHTML = `
      <div class="crypview-modal-box">
        <div class="ob-wrap">
          <div class="ob-header">
            <h2>📖 Profondeur Order Book</h2>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <input id="${this._uid('symbol')}" class="ob-input" value="${escHtml(this.symbol)}" placeholder="BTCUSDT">
              <select id="${this._uid('depth')}" class="ob-input">
                <option value="10">10 niveaux</option>
                <option value="20" selected>20 niveaux</option>
                <option value="50">50 niveaux</option>
              </select>
              <button id="${this._uid('apply')}">Appliquer</button>
              <button id="${this._uid('close')}" class="ob-btn-close" aria-label="Fermer">✕</button>
            </div>
          </div>
          <div class="ob-stats">
            <div class="ob-stat"><span>Spread</span><b id="${this._uid('spread')}">--</b></div>
            <div class="ob-stat"><span>Spread %</span><b id="${this._uid('spreadPct')}">--</b></div>
            <div class="ob-stat"><span>Meilleur Ask</span><b id="${this._uid('bestAsk')}" style="color:#ef5350">--</b></div>
            <div class="ob-stat"><span>Meilleur Bid</span><b id="${this._uid('bestBid')}" style="color:#26a69a">--</b></div>
            <div class="ob-stat"><span>Vol. Ask total</span><b id="${this._uid('askVol')}" style="color:#ef5350">--</b></div>
            <div class="ob-stat"><span>Vol. Bid total</span><b id="${this._uid('bidVol')}" style="color:#26a69a">--</b></div>
          </div>
          <div class="ob-books">
            <div class="ob-side">
              <div class="ob-col-header"><span>Prix Ask</span><span>Quantité</span><span>Total</span></div>
              <div id="${this._uid('asks')}"></div>
            </div>
            <div class="ob-side">
              <div class="ob-col-header"><span>Prix Bid</span><span>Quantité</span><span>Total</span></div>
              <div id="${this._uid('bids')}"></div>
            </div>
          </div>
          <div class="ob-spread-section">
            <div class="fm-section-title">Historique Spread (60 ticks)</div>
            <canvas id="${this._uid('spreadChart')}" width="700" height="120"></canvas>
          </div>
          <div class="ob-depth-section">
            <div class="fm-section-title">Visualisation Profondeur</div>
            <canvas id="${this._uid('depthChart')}" width="700" height="180"></canvas>
          </div>
        </div>
      </div>`;
  
    ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
    document.body.appendChild(ov);
    this._overlay = ov;
  
    document.getElementById(this._uid('close')).onclick = () => this.close();
    document.getElementById(this._uid('apply')).onclick = () => {
      this.symbol = document.getElementById(this._uid('symbol')).value.toUpperCase().trim();
      this.depth  = parseInt(document.getElementById(this._uid('depth')).value);
      this.spreadHistory = [];
      this._fetchData();
    };
  }
  
  _injectCSS() {
    if (document.getElementById('obCSS')) return;
    const s = document.createElement('style'); s.id = 'obCSS';
    s.textContent = `
      .crypview-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;align-items:center;justify-content:center;padding:16px}
      .crypview-modal-box{background:#0d0f1a;border:1px solid #2a2d3e;border-radius:14px;width:100%;max-width:860px;max-height:90vh;overflow-y:auto}
      .ob-wrap{font-family:'Inter',sans-serif;color:#e0e0e0;padding:16px}
      .ob-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px}
      .ob-header h2{margin:0;font-size:1.2rem;flex-shrink:0}
      .ob-input{background:#1e2130;border:1px solid #333;color:#e0e0e0;padding:5px 10px;border-radius:6px}
      .ob-header button:not(.ob-btn-close){background:#26a69a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600}
      .ob-btn-close{background:none;border:1px solid #444;border-radius:6px;color:#888;font-size:1rem;cursor:pointer;padding:4px 10px;transition:all .2s;line-height:1;flex-shrink:0}
      .ob-btn-close:hover{color:#fff;border-color:#aaa}
      .ob-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
      .ob-stat{background:#1a1d2e;border:1px solid #2a2d3e;border-radius:8px;padding:8px 14px;font-size:.78rem;color:#888}
      .ob-stat b{display:block;font-size:.95rem;color:#e0e0e0;margin-top:2px}
      .ob-books{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .ob-side{background:#1a1d2e;border:1px solid #2a2d3e;border-radius:10px;overflow:hidden}
      .ob-col-header{display:grid;grid-template-columns:1fr 1fr 1fr;padding:8px 12px;font-size:.75rem;color:#666;background:#111422}
      .ob-col-header span{text-align:right}.ob-col-header span:first-child{text-align:left}
      .ob-row{display:grid;grid-template-columns:1fr 1fr 1fr;padding:4px 12px;font-size:.82rem;position:relative;overflow:hidden}
      .ob-row span{text-align:right;position:relative;z-index:1}.ob-row span:first-child{text-align:left}
      .ob-ask-row::before{content:'';position:absolute;right:0;top:0;bottom:0;width:var(--pct);background:rgba(239,83,80,.12);z-index:0}
      .ob-bid-row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:var(--pct);background:rgba(38,166,154,.12);z-index:0}
      .ob-ask-row span:first-child{color:#ef5350}
      .ob-bid-row span:first-child{color:#26a69a}
      .ob-spread-section,.ob-depth-section{margin-top:12px;background:#1a1d2e;border:1px solid #2a2d3e;border-radius:10px;padding:14px}
      .fm-section-title{font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
      @media(max-width:700px){.ob-books{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }
  async _fetchData() {
    try {
      const res  = await fetch(
        `https://api.binance.com/api/v3/depth?symbol=${this.symbol}&limit=${this.depth}`
      );
      const data = await res.json();
      const midPrice = (parseFloat(data.asks[0][0]) + parseFloat(data.bids[0][0])) / 2;
      const spread   = parseFloat(data.asks[0][0]) - parseFloat(data.bids[0][0]);
      this.spreadHistory.push({ t: Date.now(), spread, mid: midPrice });
      if (this.spreadHistory.length > 60) this.spreadHistory.shift();
      this._renderBook(data.bids, data.asks, spread, midPrice);
      this._drawSpreadChart();
    } catch (e) { console.error('OrderBook error', e); }
  }

  _renderBook(bids, asks, spread, mid) {
    const $ = id => document.getElementById(this._uid(id));

    const totalAsk = asks.reduce((s, [, q]) => s + parseFloat(q), 0);
    const totalBid = bids.reduce((s, [, q]) => s + parseFloat(q), 0);
    $('spread').textContent    = spread.toFixed(2);
    $('spreadPct').textContent = ((spread / mid) * 100).toFixed(4) + '%';
    $('bestAsk').textContent   = parseFloat(asks[0][0]).toLocaleString();
    $('bestBid').textContent   = parseFloat(bids[0][0]).toLocaleString();
    $('askVol').textContent    = totalAsk.toFixed(3);
    $('bidVol').textContent    = totalBid.toFixed(3);

    const maxQ = Math.max(
      ...asks.map(([, q]) => parseFloat(q)),
      ...bids.map(([, q]) => parseFloat(q))
    );

    let askCum = 0;
    $('asks').innerHTML = asks.slice(0, this.depth).map(([p, q]) => {
      askCum += parseFloat(q);
      const pct = (parseFloat(q) / maxQ * 100).toFixed(1);
      return `<div class="ob-row ob-ask-row" style="--pct:${pct}%">
        <span>${parseFloat(p).toLocaleString()}</span>
        <span>${parseFloat(q).toFixed(4)}</span>
        <span>${askCum.toFixed(4)}</span>
      </div>`;
    }).join('');

    let bidCum = 0;
    $('bids').innerHTML = bids.slice(0, this.depth).map(([p, q]) => {
      bidCum += parseFloat(q);
      const pct = (parseFloat(q) / maxQ * 100).toFixed(1);
      return `<div class="ob-row ob-bid-row" style="--pct:${pct}%">
        <span>${parseFloat(p).toLocaleString()}</span>
        <span>${parseFloat(q).toFixed(4)}</span>
        <span>${bidCum.toFixed(4)}</span>
      </div>`;
    }).join('');

    this._drawDepthChart(bids, asks);
  }

  _drawSpreadChart() {
    const canvas = document.getElementById(this._uid('spreadChart'));
    if (!canvas || this.spreadHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = 700, H = 120, p = { t: 10, r: 10, b: 20, l: 50 };
    const vals = this.spreadHistory.map(d => d.spread);
    const minV = Math.min(...vals) * 0.99, maxV = Math.max(...vals) * 1.01;
    const iw = W - p.l - p.r, ih = H - p.t - p.b;
    const xp = i => p.l + (i / (vals.length - 1)) * iw;
    const yp = v => p.t + ih - ((v - minV) / (maxV - minV)) * ih;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); ctx.moveTo(xp(0), yp(vals[0]));
    vals.forEach((v, i) => ctx.lineTo(xp(i), yp(v)));
    ctx.strokeStyle = '#ffca28'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#555'; ctx.font = '10px monospace';
    ctx.fillText(maxV.toFixed(2), 0, p.t + 8);
    ctx.fillText(minV.toFixed(2), 0, p.t + ih);
  }

  _drawDepthChart(bids, asks) {
    const canvas = document.getElementById(this._uid('depthChart'));
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 700, H = 180, pad = { t: 10, r: 10, b: 30, l: 50 };
    ctx.clearRect(0, 0, W, H);
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

    const bidPts = [], askPts = [];
    let cumBid = 0, cumAsk = 0;
    const allPrices = [
      ...bids.map(([p]) => parseFloat(p)),
      ...asks.map(([p]) => parseFloat(p))
    ];
    const minP = Math.min(...allPrices), maxP = Math.max(...allPrices);
    const maxQ = Math.max(
      bids.reduce((s, [, q]) => s + parseFloat(q), 0),
      asks.reduce((s, [, q]) => s + parseFloat(q), 0)
    );

    const xp = price => pad.l + ((price - minP) / (maxP - minP)) * iw;
    const yp = q     => pad.t + ih - (q / maxQ) * ih;

    [...bids].reverse().forEach(([pr, q]) => { cumBid += parseFloat(q); bidPts.push({ x: parseFloat(pr), y: cumBid }); });
    asks.forEach(([pr, q]) => { cumAsk += parseFloat(q); askPts.push({ x: parseFloat(pr), y: cumAsk }); });

    if (bidPts.length) {
      ctx.beginPath();
      ctx.moveTo(xp(bidPts[0].x), pad.t + ih);
      bidPts.forEach(pt => ctx.lineTo(xp(pt.x), yp(pt.y)));
      ctx.lineTo(xp(bidPts[bidPts.length - 1].x), pad.t + ih);
      ctx.closePath();
      ctx.fillStyle = 'rgba(38,166,154,.25)'; ctx.fill();
      ctx.beginPath();
      bidPts.forEach((pt, i) => i === 0 ? ctx.moveTo(xp(pt.x), yp(pt.y)) : ctx.lineTo(xp(pt.x), yp(pt.y)));
      ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 2; ctx.stroke();
    }

    if (askPts.length) {
      ctx.beginPath();
      ctx.moveTo(xp(askPts[0].x), pad.t + ih);
      askPts.forEach(pt => ctx.lineTo(xp(pt.x), yp(pt.y)));
      ctx.lineTo(xp(askPts[askPts.length - 1].x), pad.t + ih);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239,83,80,.2)'; ctx.fill();
      ctx.beginPath();
      askPts.forEach((pt, i) => i === 0 ? ctx.moveTo(xp(pt.x), yp(pt.y)) : ctx.lineTo(xp(pt.x), yp(pt.y)));
      ctx.strokeStyle = '#ef5350'; ctx.lineWidth = 2; ctx.stroke();
    }

    ctx.fillStyle = '#555'; ctx.font = '10px monospace';
    [minP, (minP + maxP) / 2, maxP].forEach(pr => {
      ctx.fillText(pr.toFixed(0), xp(pr) - 15, H - 5);
    });
  }

  _uid(suffix) {
    if (!this._id) this._id = Math.random().toString(36).slice(2, 7);
    return `${this._id}-${suffix}`;
  }
}

export default OrderBookModal;
