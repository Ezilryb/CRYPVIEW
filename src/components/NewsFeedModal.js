// src/components/NewsFeedModal.js — CrypView V3.8 (Fix RSS)
//
// Raison du changement :
//   - CryptoCompare /data/v2/news/ exige désormais une clé API payante
//   - Remplacement par des flux RSS publics (CoinDesk + CoinTelegraph + Decrypt)
//     parsés via le proxy CORS gratuit allorigins.win
//   - Fix : _id initialisé dans le constructeur (plus de lazy-init risqué)
//   - Fix : event listeners attachés après document.body.appendChild

import { escHtml, safeUrl } from '../utils/sanitize.js';

const RSS_SOURCES = [
  {
    label:  'CoinDesk',
    url:    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    color:  '#26a69a',
  },
  {
    label:  'CoinTelegraph',
    url:    'https://cointelegraph.com/rss',
    color:  '#ff9800',
  },
  {
    label:  'Decrypt',
    url:    'https://decrypt.co/feed',
    color:  '#7b61ff',
  },
];

const CORS_PROXY = 'https://api.allorigins.win/get?url=';

const FILTER_KEYWORDS = {
  all:        [],
  bitcoin:    ['bitcoin', 'btc'],
  ethereum:   ['ethereum', 'eth'],
  defi:       ['defi', 'decentralized finance', 'uniswap', 'aave', 'compound', 'yield'],
  nft:        ['nft', 'non-fungible', 'opensea', 'ordinal', 'token'],
  regulation: ['regulation', 'sec', 'cftc', 'ban', 'law', 'legal', 'government', 'congress', 'crypto law'],
};

export default class NewsFeedModal {
  constructor() {
    this._id       = Math.random().toString(36).slice(2, 7);
    this._overlay  = null;
    this._articles = [];
    this._filter   = 'all';
    this._loading  = false;
    this._lastFetch = 0;
  }

  open(/* symbol ignoré — news globales */) {
    if (!this._overlay) this._buildOverlay();
    this._overlay.style.display = 'flex';
    const stale = Date.now() - this._lastFetch > 10 * 60 * 1000;
    if (!this._articles.length || stale) this._fetchAll();
    else this._renderList();
  }

  close() {
    if (this._overlay) this._overlay.style.display = 'none';
  }

  updateSymbol(/* symbol */) {
  }

  destroy() {
    this._overlay?.remove();
    this._overlay  = null;
    this._articles = [];
  }

  _buildOverlay() {
    this._injectCSS();

    const ov = document.createElement('div');
    ov.className = 'crypview-modal-overlay';
    ov.innerHTML = `
      <div class="crypview-modal-box">
        <div class="nf-wrap">
          <div class="nf-header">
            <h2>📰 Actualités Crypto</h2>
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
              <button id="${this._uid('refresh')}" class="nf-btn-action" title="Actualiser les actualités">↻ Actualiser</button>
              <button id="${this._uid('close')}"   class="nf-btn-close" aria-label="Fermer">✕</button>
            </div>
          </div>

          <div class="nf-sources">
            ${RSS_SOURCES.map(s => `
              <span class="nf-source-badge" style="color:${s.color};border-color:${s.color}55;">
                ${s.label}
              </span>`).join('')}
          </div>

          <div class="nf-filters" id="${this._uid('filters')}">
            <button class="nf-chip active" data-f="all">Tout</button>
            <button class="nf-chip" data-f="bitcoin">₿ Bitcoin</button>
            <button class="nf-chip" data-f="ethereum">Ξ Ethereum</button>
            <button class="nf-chip" data-f="defi">🏦 DeFi</button>
            <button class="nf-chip" data-f="nft">🖼 NFT</button>
            <button class="nf-chip" data-f="regulation">⚖ Régulation</button>
          </div>

          <div id="${this._uid('list')}" class="nf-list">
            <div class="nf-loading">
              <div class="sw-spin"></div>
              <span style="color:#888;font-size:.85rem;margin-top:10px;">Chargement…</span>
            </div>
          </div>
        </div>
      </div>`;

    ov.addEventListener('click', e => { if (e.target === ov) this.close(); });

    document.body.appendChild(ov);
    this._overlay = ov;

    document.getElementById(this._uid('close'))
      ?.addEventListener('click', () => this.close());

    document.getElementById(this._uid('refresh'))
      ?.addEventListener('click', () => {
        this._articles  = [];
        this._lastFetch = 0;
        this._fetchAll();
      });

    document.getElementById(this._uid('filters'))
      ?.addEventListener('click', e => {
        const btn = e.target.closest('[data-f]');
        if (!btn) return;
        document.getElementById(this._uid('filters'))
          ?.querySelectorAll('.nf-chip')
          .forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this._filter = btn.dataset.f;
        this._renderList();
      });
  }


  async _fetchAll() {
    if (this._loading) return;
    this._loading = true;
    this._setLoadingState();

    try {
      const results = await Promise.allSettled(
        RSS_SOURCES.map(src => this._fetchRSS(src))
      );

      const allArticles = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          allArticles.push(...r.value);
        } else {
          console.warn(`[NewsFeed] Erreur ${RSS_SOURCES[i].label}:`, r.reason?.message ?? r.reason);
        }
      });

      if (!allArticles.length) {
        this._showError('Aucune source disponible. Vérifiez votre connexion et réessayez.');
        return;
      }

      allArticles.sort((a, b) => b.pubDate - a.pubDate);
      this._articles  = allArticles;
      this._lastFetch = Date.now();
      this._renderList();

    } catch (err) {
      this._showError(`Erreur inattendue : ${err.message}`);
    } finally {
      this._loading = false;
    }
  }

  async _fetchRSS({ url, label }) {
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    if (!json.contents) throw new Error('Réponse proxy vide');

    return this._parseRSS(json.contents, label);
  }

  _parseRSS(xmlStr, sourceName) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlStr, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error(`XML invalide — ${sourceName}`);

    const items = Array.from(doc.querySelectorAll('item'));

    return items.slice(0, 25).map(item => {
      const getText = tag => item.querySelector(tag)?.textContent?.trim() ?? '';

      const title   = getText('title');
      const rawLink = getText('link') || item.querySelector('guid')?.textContent?.trim() || '';
      const link    = rawLink.startsWith('http') ? rawLink : '#';
      const rawDesc = getText('description').replace(/<[^>]+>/g, '').trim();
      const desc    = rawDesc.slice(0, 180);
      const dateStr = getText('pubDate');
      const pubDate = dateStr ? new Date(dateStr).getTime() : Date.now();

      const thumbnail =
        item.querySelector('enclosure[type^="image"]')?.getAttribute('url') ||
        item.querySelector('[url]')?.getAttribute('url') ||
        item.querySelector('thumbnail')?.getAttribute('url') ||
        '';

      return { title, link, desc, pubDate, source: sourceName, thumbnail };
    }).filter(a => a.title && a.link !== '#');
  }


  _renderList() {
    const list = document.getElementById(this._uid('list'));
    if (!list) return;

    const keywords = FILTER_KEYWORDS[this._filter] ?? [];
    const filtered = keywords.length
      ? this._articles.filter(a => {
          const hay = (a.title + ' ' + a.desc).toLowerCase();
          return keywords.some(kw => hay.includes(kw));
        })
      : this._articles;

    if (!filtered.length) {
      list.innerHTML = `
        <p style="color:#888;padding:28px;text-align:center;font-size:.9rem;">
          ${this._articles.length > 0
            ? `Aucun article trouvé pour « ${this._filter} ».<br>
               <small style="color:#555">Essayez un autre filtre ou cliquez sur Tout.</small>`
            : 'Aucun article chargé. Cliquez sur ↻ Actualiser pour réessayer.'}
        </p>`;
      return;
    }

    list.innerHTML = filtered.slice(0, 40).map(a => {
      const date = this._relTime(a.pubDate);
      const img  = a.thumbnail
      ? `<img class="nf-thumb" src="${safeUrl(a.thumbnail)}" loading="lazy"
             onerror="this.style.display='none'" alt="">`
      : '';
    const desc = a.desc
      ? `<div class="nf-desc">${escHtml(a.desc)}</div>`
      : '';
    return `
      <a class="nf-item" href="${safeUrl(a.link)}" target="_blank" rel="noopener noreferrer">
        ${img}
        <div class="nf-title">${escHtml(a.title)}</div>
        ${desc}
      </a>`;
  }).join('');
  }

  _setLoadingState() {
    const list = document.getElementById(this._uid('list'));
    if (!list) return;
    list.innerHTML = `
      <div class="nf-loading">
        <div class="sw-spin"></div>
        <span style="color:#888;font-size:.85rem;margin-top:10px;">
          Chargement de ${RSS_SOURCES.length} sources…
        </span>
      </div>`;
  }

  _showError(msg) {
    const list = document.getElementById(this._uid('list'));
    if (list) list.innerHTML = `
      <div style="padding:28px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:10px">⚠️</div>
        <p style="color:#ef5350;font-size:.9rem;margin:0 0 8px">${msg}</p>
        <button onclick="this.closest('.nf-list').dispatchEvent(new Event('retry'))"
                style="background:#1e2130;border:1px solid #333;color:#aaa;
                       padding:6px 14px;border-radius:6px;cursor:pointer;font-size:.8rem;margin-top:6px">
          Réessayer
        </button>
      </div>`;
  }

  _uid(suffix) {
    return `${this._id}-${suffix}`;
  }

  _relTime(ts) {
    if (!ts) return '';
    const diffSec = (Date.now() - ts) / 1000;
    if (diffSec < 60)    return 'À l\'instant';
    if (diffSec < 3600)  return `${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} h`;
    return `${Math.floor(diffSec / 86400)} j`;
  }

  _injectCSS() {
    if (document.getElementById('nfCSS')) return;
    const s = document.createElement('style');
    s.id = 'nfCSS';
    s.textContent = `
      .crypview-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;align-items:center;justify-content:center;padding:16px}
      .crypview-modal-box{background:#0d0f1a;border:1px solid #2a2d3e;border-radius:14px;width:100%;max-width:860px;max-height:90vh;overflow-y:auto}
      .nf-wrap{font-family:'Inter',sans-serif;color:#e0e0e0;padding:16px}
      .nf-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap}
      .nf-header h2{margin:0;font-size:1.2rem;flex-shrink:0}
      .nf-btn-action{background:#1e2130;border:1px solid #333;color:#aaa;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:.82rem;transition:all .15s;white-space:nowrap}
      .nf-btn-action:hover{background:#26a69a;color:#fff;border-color:#26a69a}
      .nf-btn-close{background:none;border:1px solid #444;border-radius:6px;color:#888;font-size:1rem;cursor:pointer;padding:4px 10px;transition:all .2s;line-height:1;flex-shrink:0}
      .nf-btn-close:hover{color:#fff;border-color:#aaa}
      .nf-sources{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
      .nf-source-badge{font-size:.72rem;padding:2px 9px;border-radius:12px;border:1px solid;font-weight:600;letter-spacing:.3px}
      .nf-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
      .nf-chip{background:#1a1d2e;border:1px solid #2a2d3e;color:#aaa;padding:4px 12px;border-radius:20px;cursor:pointer;font-size:.8rem;transition:all .15s}
      .nf-chip.active,.nf-chip:hover{background:#26a69a;border-color:#26a69a;color:#fff}
      .nf-list{display:flex;flex-direction:column;gap:8px;max-height:62vh;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#2a2d3e transparent}
      .nf-loading{display:flex;flex-direction:column;align-items:center;padding:40px 20px}
      .nf-item{display:flex;align-items:flex-start;gap:12px;background:#1a1d2e;border:1px solid #2a2d3e;border-radius:10px;padding:12px;text-decoration:none;color:inherit;transition:border-color .2s,background .2s}
      .nf-item:hover{border-color:#26a69a;background:rgba(38,166,154,.06)}
      .nf-thumb{width:80px;height:55px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#111}
      .nf-body{flex:1;min-width:0}
      .nf-meta{display:flex;gap:8px;font-size:.72rem;margin-bottom:4px;align-items:center}
      .nf-source-name{font-weight:700;color:#26a69a}
      .nf-date{color:#555}
      .nf-title{font-size:.9rem;font-weight:600;color:#e0e0e0;line-height:1.4;margin-bottom:3px}
      .nf-desc{font-size:.78rem;color:#777;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .nf-arrow{color:#333;font-size:1.2rem;align-self:center;flex-shrink:0;transition:color .15s}
      .nf-item:hover .nf-arrow{color:#26a69a}
      .sw-spin{width:28px;height:28px;border:3px solid #222;border-top-color:#26a69a;border-radius:50%;animation:nfSpin .8s linear infinite;flex-shrink:0}
      @keyframes nfSpin{to{transform:rotate(360deg)}}
    `;
    document.head.appendChild(s);
  }
}
