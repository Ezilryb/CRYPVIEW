// src/components/FundamentalsModal.js
import { escHtml, safeUrl } from '../utils/sanitize.js';

class FundamentalsModal {
  constructor() {
    this._overlay = null;
    this._id      = null;
    this.symbol   = null;
    this.data     = null;
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

_getCoinId(symbol) {
  const MAP = {
    btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin',
    xrp: 'ripple', doge: 'dogecoin', ada: 'cardano', avax: 'avalanche-2',
    link: 'chainlink', dot: 'polkadot', matic: 'matic-network', uni: 'uniswap',
    atom: 'cosmos', ltc: 'litecoin', etc: 'ethereum-classic', xlm: 'stellar',
    near: 'near', apt: 'aptos', arb: 'arbitrum', op: 'optimism',
    shib: 'shiba-inu', pepe: 'pepe', trx: 'tron', fil: 'filecoin',
    inj: 'injective-protocol', sui: 'sui', sei: 'sei-network',
  };
  const base = (symbol || 'bitcoin')
    .toLowerCase()
    .replace(/usdt$|usdc$|busd$|eur$/, '');
  return MAP[base] || base || 'bitcoin';
}

_buildOverlay() {
  this._injectCSS();
  const ov = document.createElement('div');
  ov.className = 'crypview-modal-overlay';
  ov.innerHTML = `
    <div class="crypview-modal-box">
      <div class="fm-wrap">
        <div class="fm-header">
          <h2>🔍 Fondamentaux Crypto</h2>
          <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <div class="fm-search-wrap">
              <input id="${this._uid('search')}" class="fm-input" placeholder="ex: bitcoin, ethereum…">
              <button id="${this._uid('go')}">Chercher</button>
            </div>
            <button id="${this._uid('close')}" class="fm-btn-close" aria-label="Fermer">✕</button>
          </div>
        </div>
        <div id="${this._uid('content')}"><div class="sw-spin"></div></div>
      </div>
    </div>`;

  ov.addEventListener('click', e => { if (e.target === ov) this.close(); });
  document.body.appendChild(ov);
  this._overlay = ov;

  document.getElementById(this._uid('close')).onclick = () => this.close();
  document.getElementById(this._uid('go')).onclick = () => {
    const v = document.getElementById(this._uid('search')).value.trim().toLowerCase();
    if (v) { this.symbol = v; this._fetchData(); }
  };
  document.getElementById(this._uid('search')).onkeydown = e => {
    if (e.key === 'Enter') document.getElementById(this._uid('go')).click();
  };
}

async _fetchData() {
  const coinId = this._getCoinId(this.symbol) || 'bitcoin';

  const input = document.getElementById(this._uid('search'));
  if (input) input.value = coinId;

  this._setLoading(true);
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}` +
      `?localization=false&tickers=false&market_data=true` +
      `&community_data=true&developer_data=true`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status} — coin "${coinId}" introuvable`);
    this.data = await res.json();
    this._renderData();
  } catch (e) {
    const content = document.getElementById(this._uid('content'));
    if (content) content.innerHTML =
      `<p style="color:#ef5350;padding:24px;text-align:center">
        ⚠ ${e.message}<br>
        <small style="color:#888">Essayez un ID CoinGecko exact (ex: "bitcoin", "ethereum")</small>
      </p>`;
  } finally {
    this._setLoading(false);
  }
}

_injectCSS() {
  if (document.getElementById('fmCSS')) return;
  const s = document.createElement('style'); s.id = 'fmCSS';
  s.textContent = `
    .crypview-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;align-items:center;justify-content:center;padding:16px}
    .crypview-modal-box{background:#0d0f1a;border:1px solid #2a2d3e;border-radius:14px;width:100%;max-width:860px;max-height:90vh;overflow-y:auto}
    .fm-wrap{font-family:'Inter',sans-serif;color:#e0e0e0;padding:16px}
    .fm-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
    .fm-header h2{margin:0;font-size:1.2rem;flex-shrink:0}
    .fm-search-wrap{display:flex;gap:8px}
    .fm-input{background:#1e2130;border:1px solid #333;color:#e0e0e0;padding:5px 10px;border-radius:6px;width:180px}
    .fm-search-wrap button{background:#26a69a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600}
    .fm-btn-close{background:none;border:1px solid #444;border-radius:6px;color:#888;font-size:1rem;cursor:pointer;padding:4px 10px;transition:all .2s;line-height:1;flex-shrink:0}
    .fm-btn-close:hover{color:#fff;border-color:#aaa}
    .fm-hero{display:flex;align-items:center;gap:14px;background:#1a1d2e;border-radius:10px;padding:14px;margin-bottom:16px;flex-wrap:wrap}
    .fm-score-badges{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
    .fm-badge{background:#111422;border:1px solid #2a2d3e;border-radius:6px;padding:6px 10px;font-size:.78rem;color:#aaa}
    .fm-badge b{color:#26a69a;margin-left:4px}
    .fm-section-title{font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px}
    .fm-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}
    .fm-kv{background:#1a1d2e;border:1px solid #2a2d3e;border-radius:8px;padding:10px}
    .fm-kv-label{font-size:.72rem;color:#888;margin-bottom:4px}
    .fm-kv-value{font-size:.9rem;font-weight:600;color:#e0e0e0}
    .fm-desc{background:#1a1d2e;border-radius:8px;padding:14px;font-size:.85rem;color:#aaa;line-height:1.6;margin-bottom:12px}
    .fm-links{display:flex;gap:10px;flex-wrap:wrap}
    .fm-link{background:#1a1d2e;border:1px solid #2a2d3e;color:#26a69a;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:.85rem}
    .fm-link:hover{background:#26a69a;color:#fff}
    .sw-spin{width:28px;height:28px;border:3px solid #333;border-top-color:#26a69a;border-radius:50%;animation:swspin .8s linear infinite;margin:20px auto}
    @keyframes swspin{to{transform:rotate(360deg)}}
    @media(max-width:700px){.fm-grid4{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(s);
}

  _renderData() {
    const d  = this.data;
    const md = d.market_data;
    const dd = d.developer_data;
    const cd = d.community_data;
    const usd = v => v ? '$' + this._fmt(v) : '--';
    const pct = v => v != null
      ? `<span style="color:${v >= 0 ? '#26a69a' : '#ef5350'}">${v >= 0 ? '+' : ''}${v?.toFixed(2)}%</span>`
      : '--';

    document.getElementById(this._uid('content')).innerHTML = `
      <div class="fm-hero">
        ${d.image?.small ? `<img src="${safeUrl(d.image.small)}" alt="${escHtml(d.name)}" style="width:48px;border-radius:50%">` : ''}
        <div>
          <h3 style="margin:0">${escHtml(d.name)} <span style="color:#888;font-weight:400">(${escHtml(d.symbol?.toUpperCase())})</span></h3>
          <div style="font-size:.85rem;color:#666">Rang #${d.market_cap_rank ?? '--'} — ${escHtml(d.categories?.slice(0,3).join(', ') || '')}</div>
        </div>
        <div class="fm-score-badges">
          <div class="fm-badge">Score Communauté <b>${d.community_score?.toFixed(0) ?? '--'}</b></div>
          <div class="fm-badge">Score Dev <b>${d.developer_score?.toFixed(0) ?? '--'}</b></div>
          <div class="fm-badge">Score Liquidité <b>${d.liquidity_score?.toFixed(0) ?? '--'}</b></div>
        </div>
      </div>

      <div class="fm-section-title">📈 Données de Marché</div>
      <div class="fm-grid4">
        ${this._kv('Prix USD', usd(md?.current_price?.usd))}
        ${this._kv('Cap Marché', usd(md?.market_cap?.usd))}
        ${this._kv('Volume 24h', usd(md?.total_volume?.usd))}
        ${this._kv('FD Valorisation', usd(md?.fully_diluted_valuation?.usd))}
        ${this._kv('Variation 24h', pct(md?.price_change_percentage_24h))}
        ${this._kv('Variation 7j', pct(md?.price_change_percentage_7d))}
        ${this._kv('Variation 30j', pct(md?.price_change_percentage_30d))}
        ${this._kv('Variation 1an', pct(md?.price_change_percentage_1y))}
        ${this._kv('ATH', usd(md?.ath?.usd))}
        ${this._kv('% depuis ATH', pct(md?.ath_change_percentage?.usd))}
        ${this._kv('ATL', usd(md?.atl?.usd))}
        ${this._kv('% depuis ATL', pct(md?.atl_change_percentage?.usd))}
        ${this._kv('Circ. Supply', this._fmt(md?.circulating_supply) + ' ' + d.symbol?.toUpperCase())}
        ${this._kv('Max Supply', md?.max_supply ? this._fmt(md.max_supply) + ' ' + d.symbol?.toUpperCase() : '∞')}
        ${this._kv('Total Supply', this._fmt(md?.total_supply) + ' ' + (d.symbol?.toUpperCase() ?? ''))}
        ${this._kv('Dominance BTC', (md?.market_cap_percentage?.btc?.toFixed(2) ?? '--') + '%')}
      </div>

      <div class="fm-section-title">🛠 Activité Développeurs (GitHub)</div>
      <div class="fm-grid4">
        ${this._kv('Stars', this._fmt(dd?.stars))}
        ${this._kv('Forks', this._fmt(dd?.forks))}
        ${this._kv('Watchers', this._fmt(dd?.watchers))}
        ${this._kv('Issues ouvertes', this._fmt(dd?.total_issues))}
        ${this._kv('Issues fermées', this._fmt(dd?.closed_issues))}
        ${this._kv('PR fusionnés', this._fmt(dd?.pull_requests_merged))}
        ${this._kv('Contributeurs', this._fmt(dd?.pull_request_contributors))}
        ${this._kv('Commits 4 sem.', this._fmt(dd?.commit_count_4_weeks))}
      </div>

      <div class="fm-section-title">👥 Communauté</div>
      <div class="fm-grid4">
        ${this._kv('Twitter', this._fmt(cd?.twitter_followers) + ' abonnés')}
        ${this._kv('Reddit abonnés', this._fmt(cd?.reddit_subscribers))}
        ${this._kv('Reddit actifs 48h', this._fmt(cd?.reddit_accounts_active_48h))}
        ${this._kv('Telegram', this._fmt(cd?.telegram_channel_user_count) + ' membres')}
      </div>

      ${d.description?.en ? `
      <div class="fm-section-title">📄 Description</div>
      <div class="fm-desc">${escHtml(d.description.en.slice(0,600).replace(/<[^>]+>/g,''))}${d.description.en.length > 600 ? '…' : ''}</div>` : ''}

      <div class="fm-links">
        ${d.links?.homepage?.[0] ? `<a href="${safeUrl(d.links.homepage[0])}" target="_blank" class="fm-link">🌐 Site officiel</a>` : ''}
        ${d.links?.blockchain_site?.[0] ? `<a href="${safeUrl(d.links.blockchain_site[0])}" target="_blank" class="fm-link">🔗 Explorer</a>` : ''}
        ${d.links?.repos_url?.github?.[0] ? `<a href="${safeUrl(d.links.repos_url.github[0])}" target="_blank" class="fm-link">💻 GitHub</a>` : ''}
        ${d.links?.whitepaper ? `<a href="${safeUrl(d.links.whitepaper)}" target="_blank" class="fm-link">📄 Whitepaper</a>` : ''}
      </div>`;
  }

  _setLoading(on) {
    if (on) document.getElementById(this._uid('content')).innerHTML = '<div class="sw-spin"></div>';
  }

  _kv(label, value) {
    return `<div class="fm-kv"><div class="fm-kv-label">${label}</div><div class="fm-kv-value">${value ?? '--'}</div></div>`;
  }

  _fmt(n) {
    if (!n && n !== 0) return '--';
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
    return n?.toLocaleString?.() ?? n;
  }

  _uid(suffix) {
    if (!this._id) this._id = Math.random().toString(36).slice(2, 7);
    return `${this._id}-${suffix}`;
  }

  _injectCSS() {
    if (document.getElementById('fmCSS')) return;
    const s = document.createElement('style'); s.id = 'fmCSS';
    s.textContent = `
      .crypview-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;align-items:center;justify-content:center;padding:16px}
      .crypview-modal-box{position:relative;background:#0d0f1a;border:1px solid #2a2d3e;border-radius:14px;width:100%;max-width:860px;max-height:90vh;overflow-y:auto}
      .crypview-modal-close{position:absolute;top:10px;right:14px;background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;z-index:1}
      .crypview-modal-close:hover{color:#fff}
      .fm-wrap{font-family:'Inter',sans-serif;color:#e0e0e0;padding:16px}
      .fm-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px}
      .fm-header h2{margin:0;font-size:1.2rem}
      .fm-search-wrap{display:flex;gap:8px}
      .fm-input{background:#1e2130;border:1px solid #333;color:#e0e0e0;padding:6px 12px;border-radius:6px;width:200px}
      .fm-search-wrap button{background:#26a69a;border:none;color:#fff;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600}
      .fm-hero{display:flex;align-items:center;gap:14px;background:#1a1d2e;border-radius:10px;padding:14px;margin-bottom:16px;flex-wrap:wrap}
      .fm-score-badges{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
      .fm-badge{background:#111422;border:1px solid #2a2d3e;border-radius:6px;padding:6px 10px;font-size:.78rem;color:#aaa}
      .fm-badge b{color:#26a69a;margin-left:4px}
      .fm-section-title{font-size:.78rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px}
      .fm-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px}
      .fm-kv{background:#1a1d2e;border:1px solid #2a2d3e;border-radius:8px;padding:10px}
      .fm-kv-label{font-size:.72rem;color:#888;margin-bottom:4px}
      .fm-kv-value{font-size:.9rem;font-weight:600;color:#e0e0e0}
      .fm-desc{background:#1a1d2e;border-radius:8px;padding:14px;font-size:.85rem;color:#aaa;line-height:1.6;margin-bottom:12px}
      .fm-links{display:flex;gap:10px;flex-wrap:wrap}
      .fm-link{background:#1a1d2e;border:1px solid #2a2d3e;color:#26a69a;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:.85rem}
      .fm-link:hover{background:#26a69a;color:#fff}
      .sw-spin{width:28px;height:28px;border:3px solid #333;border-top-color:#26a69a;border-radius:50%;animation:swspin .8s linear infinite;margin:20px auto}
      @keyframes swspin{to{transform:rotate(360deg)}}
      @media(max-width:700px){.fm-grid4{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(s);
  }
}

export default FundamentalsModal;
