// ============================================================
//  src/components/DEXSearch.js — CrypView V3.7
//  Recherche de pools DEX via GeckoTerminal.
//  Composant autonome, s'affiche dans le header existant
//  via un bouton "DEX" qui ouvre un dropdown de résultats.
//
//  Usage :
//    const dex = new DEXSearch({
//      onSelect: (pool) => connectDEX(pool),
//    });
//    dex.mount();  // injecte le bouton dans le header
// ============================================================

import {
  searchDEXPools,
  fetchTopPools,
  SUPPORTED_NETWORKS,
  poolToSymbol,
} from '../api/geckoterminal.js';

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export class DEXSearch {
  #el       = null;
  #dropdown = null;
  #input    = null;
  #resultsEl = null;
  #networkEl = null;
  #callbacks;
  #currentNetwork = 'eth';
  #isOpen = false;

  /** @param {{ onSelect: (pool: DEXPool) => void }} callbacks */
  constructor(callbacks) {
    this.#callbacks = callbacks;
  }

  mount() {
    if (document.getElementById('dex-search-trigger')) return;

    const btn = document.createElement('button');
    btn.id    = 'dex-search-trigger';
    btn.title = 'Rechercher une paire DEX (GeckoTerminal)';
    btn.style.cssText = `
      display:inline-flex; align-items:center; gap:5px;
      padding:5px 10px; border-radius:4px;
      font-family:'Space Mono',monospace; font-size:10px;
      background:rgba(224,64,251,.08); border:1px solid rgba(224,64,251,.25);
      color:#e040fb; cursor:pointer; transition:all .15s;
      white-space:nowrap; flex-shrink:0;
    `;
    btn.innerHTML = '<span style="font-size:12px">🔗</span> DEX';

    btn.addEventListener('mouseenter', () => {
      btn.style.background  = 'rgba(224,64,251,.16)';
      btn.style.borderColor = 'rgba(224,64,251,.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background  = 'rgba(224,64,251,.08)';
      btn.style.borderColor = 'rgba(224,64,251,.25)';
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#isOpen ? this.#close() : this.#open();
    });

    const header = document.querySelector('header');
    const priceDisplay = header?.querySelector('.price-display');
    if (priceDisplay) {
      header.insertBefore(btn, priceDisplay);
    } else {
      header?.appendChild(btn);
    }
    this.#el = btn;

    this.#dropdown = this.#buildDropdown();
    document.body.appendChild(this.#dropdown);

    document.addEventListener('click', (e) => {
      if (!this.#dropdown?.contains(e.target) && e.target !== this.#el) {
        this.#close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#isOpen) this.#close();
    });
  }

  #open() {
    this.#isOpen = true;
    const rect = this.#el?.getBoundingClientRect();
    if (rect && this.#dropdown) {
      this.#dropdown.style.top  = `${rect.bottom + 4}px`;
      this.#dropdown.style.left = `${rect.left}px`;
      this.#dropdown.style.display = 'flex';
    }
    this.#input?.focus();
    this.#loadTrending();
  }

  #close() {
    this.#isOpen = false;
    if (this.#dropdown) this.#dropdown.style.display = 'none';
  }

  #buildDropdown() {
    const wrap = document.createElement('div');
    wrap.id = 'dex-search-dropdown';
    wrap.style.cssText = `
      display:none; position:fixed; z-index:25000;
      background:var(--panel); border:1px solid var(--border);
      border-radius:8px; width:360px; max-height:480px;
      box-shadow:0 16px 48px rgba(0,0,0,.9);
      font-family:'Space Mono',monospace; overflow:hidden;
      flex-direction:column;
    `;

    wrap.innerHTML = `
      <div style="padding:10px 12px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-size:12px;">🔗</span>
          <span style="font-size:11px;font-weight:700;color:#e040fb;">DEX — GeckoTerminal</span>
          <span style="margin-left:auto;font-size:8px;color:var(--muted);">API gratuite</span>
        </div>
        <div style="position:relative;">
          <input id="dex-search-input" type="text"
                 placeholder="PEPE, SHIB, 0xabc…"
                 autocomplete="off" spellcheck="false"
                 style="width:100%;background:var(--bg);border:1px solid var(--border);
                        color:var(--text);padding:7px 10px;
                        font-family:'Space Mono',monospace;font-size:11px;
                        border-radius:4px;outline:none;box-sizing:border-box;
                        transition:border-color .15s;"
                 aria-label="Recherche de pool DEX">
        </div>
      </div>
      <div id="dex-network-bar"
           style="display:flex;gap:4px;padding:6px 12px;border-bottom:1px solid var(--border);
                  overflow-x:auto;flex-shrink:0;scrollbar-width:none;">
      </div>
      <div id="dex-results"
           style="flex:1;overflow-y:auto;scrollbar-width:thin;padding:4px 0;">
        <div style="padding:16px;text-align:center;color:var(--muted);font-size:10px;">
          Saisir un nom de token ou coller une adresse…
        </div>
      </div>
    `;

    const input  = wrap.querySelector('#dex-search-input');
    this.#input  = input;

    const debouncedSearch = debounce((q) => this.#search(q), 350);
    input?.addEventListener('input', e => debouncedSearch(e.target.value));
    input?.addEventListener('focus', () => {
      if (input) input.style.borderColor = '#e040fb';
    });
    input?.addEventListener('blur', () => {
      if (input) input.style.borderColor = 'var(--border)';
    });

    this.#networkEl = wrap.querySelector('#dex-network-bar');
    this.#buildNetworkBar();

    this.#resultsEl = wrap.querySelector('#dex-results');

    wrap.addEventListener('click', e => e.stopPropagation());

    return wrap;
  }

  #buildNetworkBar() {
    if (!this.#networkEl) return;
    this.#networkEl.innerHTML = '';

    for (const [id, info] of Object.entries(SUPPORTED_NETWORKS)) {
      const btn = document.createElement('button');
      const isActive = id === this.#currentNetwork;
      btn.dataset.network = id;
      btn.style.cssText = `
        padding:3px 9px; border-radius:3px; cursor:pointer;
        font-family:'Space Mono',monospace; font-size:8px;
        white-space:nowrap; flex-shrink:0;
        background:${isActive ? 'rgba(224,64,251,.15)' : 'transparent'};
        border:1px solid ${isActive ? 'rgba(224,64,251,.4)' : 'var(--border)'};
        color:${isActive ? '#e040fb' : 'var(--muted)'}; transition:all .12s;
        letter-spacing:.3px;
      `;
      btn.textContent = `${info.icon} ${info.label}`;

      btn.addEventListener('click', () => {
        this.#currentNetwork = id;
        this.#buildNetworkBar();
        const q = this.#input?.value.trim();
        if (q) this.#search(q);
        else   this.#loadTrending();
      });

      this.#networkEl.appendChild(btn);
    }
  }

  async #search(query) {
    if (!query.trim()) { this.#loadTrending(); return; }
    this.#setLoading();
    try {
      const pools = await searchDEXPools(query);
      const filtered = pools.filter(p =>
        p.network === this.#currentNetwork && p.liquidity > 1_000
      );
      this.#renderResults(filtered.length ? filtered : pools.slice(0, 15));
    } catch (_) {
      this.#setError('Erreur de recherche DEX');
    }
  }

  async #loadTrending() {
    this.#setLoading();
    try {
      const pools = await fetchTopPools(this.#currentNetwork);
      this.#renderResults(pools.slice(0, 12));
    } catch (_) {
      this.#renderResults([]);
    }
  }

  #renderResults(pools) {
    if (!this.#resultsEl) return;

    if (!pools.length) {
      this.#resultsEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--muted);font-size:10px;">
          Aucun pool trouvé sur ${SUPPORTED_NETWORKS[this.#currentNetwork]?.label ?? this.#currentNetwork}
        </div>`;
      return;
    }

    const label = pools[0] ? (
      this.#input?.value.trim()
        ? `${pools.length} pool${pools.length > 1 ? 's' : ''} trouvé${pools.length > 1 ? 's' : ''}`
        : `🔥 Trending — ${SUPPORTED_NETWORKS[this.#currentNetwork]?.label ?? ''}`
    ) : '';

    this.#resultsEl.innerHTML = `
      <div style="padding:5px 12px 3px;font-size:8px;color:var(--muted);
                  text-transform:uppercase;letter-spacing:.8px;">${label}</div>
    `;

    pools.forEach(pool => {
      const row = this.#buildPoolRow(pool);
      this.#resultsEl?.appendChild(row);
    });
  }

  #buildPoolRow(pool) {
    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:8px 12px; cursor:pointer;
      border-bottom:1px solid rgba(28,35,51,.4);
      transition:background .1s;
    `;

    row.addEventListener('mouseenter', () => { row.style.background = 'rgba(224,64,251,.05)'; });
    row.addEventListener('mouseleave', () => { row.style.background = ''; });
    row.addEventListener('click', () => {
      this.#close();
      this.#callbacks.onSelect?.(pool);
    });

    const pct     = pool.priceChange24h;
    const pctColor = pct >= 0 ? 'var(--green)' : 'var(--red)';
    const pctStr   = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    const volStr   = this.#fmtVol(pool.volume24h);
    const liqStr   = this.#fmtVol(pool.liquidity);
    const priceStr = pool.price < 0.0001
      ? pool.price.toExponential(3)
      : pool.price < 1 ? pool.price.toFixed(6)
      : pool.price.toFixed(4);

    row.innerHTML = `
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:12px;
                       color:#e040fb;overflow:hidden;text-overflow:ellipsis;
                       white-space:nowrap;max-width:130px;">${pool.name}</span>
          <span style="font-size:8px;padding:1px 5px;border-radius:3px;flex-shrink:0;
                       background:rgba(224,64,251,.1);border:1px solid rgba(224,64,251,.2);
                       color:#e040fb;letter-spacing:.3px;
                       text-transform:uppercase;">${pool.dex?.slice(0,8)}</span>
        </div>
        <div style="font-size:9px;color:var(--muted);display:flex;gap:8px;">
          <span>Vol: <span style="color:var(--text)">${volStr}</span></span>
          <span>Liq: <span style="color:var(--text)">${liqStr}</span></span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:11px;font-weight:700;color:var(--text);">$${priceStr}</div>
        <div style="font-size:9px;color:${pctColor};font-weight:700;">${pctStr}</div>
      </div>
    `;

    return row;
  }

  #setLoading() {
    if (this.#resultsEl) {
      this.#resultsEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--muted);font-size:10px;">
          <span style="animation:spin .8s linear infinite;display:inline-block;">⟳</span>
          &nbsp;Chargement…
        </div>`;
    }
  }

  #setError(msg) {
    if (this.#resultsEl) {
      this.#resultsEl.innerHTML = `
        <div style="padding:16px;text-align:center;color:var(--red);font-size:10px;">
          ⚠ ${msg}
        </div>`;
    }
  }

  #fmtVol(v) {
    if (!isFinite(v)) return '—';
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
    return v.toFixed(0);
  }

  destroy() {
    this.#el?.remove();
    this.#dropdown?.remove();
    this.#el = this.#dropdown = null;
  }
}

/** @typedef {import('../api/geckoterminal.js').DEXPool} DEXPool */
