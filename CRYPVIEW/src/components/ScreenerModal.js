// ============================================================
//  src/components/ScreenerModal.js — CrypView V3.1
//  Market Screener : table triable avec 6 onglets.
//
//  Usage :
//    const screener = new ScreenerModal({
//      onSelect: (sym) => connect(sym, currentTf),
//    });
//    screener.open();
// ============================================================

import { fetchScreenerData, filterRows, sortRows } from '../features/Screener.js';
import { fmtPrice, fmtVol }                         from '../utils/format.js';
import { showToast }                                  from '../utils/toast.js';

// ── Définition des onglets ────────────────────────────────────
const TABS = [
  { key: 'all',       label: '🌐 Tous'        },
  { key: 'gainers',   label: '🚀 Gainers'      },
  { key: 'losers',    label: '📉 Losers'       },
  { key: 'volume',    label: '🔊 Volume'        },
  { key: 'breakout',  label: '⚡ Breakout'     },
  { key: 'extremes',  label: '🌡 Extrêmes'    },
  { key: 'volatile',  label: '🌪 Volatilité'  },
];

// ── Colonnes de la table ──────────────────────────────────────
const COLS = [
  { key: 'base',       label: 'Paire',     align: 'left',  sortKey: 'base',       fmt: r => `${r.base}<span class="scr-quote">/USDT</span>` },
  { key: 'price',      label: 'Prix',      align: 'right', sortKey: 'price',      fmt: r => fmtPrice(r.price) },
  { key: 'pct',        label: '24h %',     align: 'right', sortKey: 'pct',        fmt: r => {
    const sign = r.pct >= 0 ? '+' : '';
    const cls  = r.pct >= 0 ? 'scr-up' : 'scr-dn';
    return `<span class="${cls}">${sign}${r.pct.toFixed(2)}%</span>`;
  }},
  { key: 'vol',        label: 'Vol USDT',  align: 'right', sortKey: 'vol',        fmt: r => fmtVol(r.vol) },
  { key: 'rangePct',   label: 'Range 24h', align: 'right', sortKey: 'rangePct',   fmt: r => `${r.rangePct.toFixed(2)}%` },
  { key: 'posInRange', label: 'Position',  align: 'right', sortKey: 'posInRange', fmt: r => _rangeBar(r.posInRange) },
];

/** Génère une mini progress-bar inline SVG */
function _rangeBar(pos) {
  const pct   = Math.round(pos * 100);
  const color = pos >= 0.8 ? '#ff9900' : pos <= 0.2 ? '#00c8ff' : '#8b949e';
  return `<span class="scr-bar-wrap" title="${pct}%">
    <span class="scr-bar-fill" style="width:${pct}%;background:${color}"></span>
  </span>`;
}

export class ScreenerModal {
  #overlay;
  #callbacks;

  #data        = [];   // données brutes
  #filtered    = [];   // données après filtre + tri
  #activeTab   = 'all';
  #search      = '';
  #sortKey     = 'vol';
  #sortDir     = 'desc';
  #loading     = false;
  #lastUpdate  = null;

  /** @param {{ onSelect: function(string) }} callbacks */
  constructor(callbacks) {
    this.#overlay   = document.getElementById('screener-overlay');
    this.#callbacks = callbacks;
    this.#bindStaticEvents();
  }

  // ── API publique ──────────────────────────────────────────────

  async open() {
    if (!this.#overlay) return;
    this.#overlay.style.display = 'block';
    // Si données fraîches (<2 min), pas de rechargement
    if (!this.#lastUpdate || Date.now() - this.#lastUpdate > 120_000) {
      await this.#refresh();
    } else {
      this.#renderTable();
    }
    setTimeout(() => document.getElementById('screener-search')?.focus(), 80);
  }

  close() {
    if (this.#overlay) this.#overlay.style.display = 'none';
  }

  // ── Chargement ────────────────────────────────────────────────

  async #refresh() {
    if (this.#loading) return;
    this.#loading = true;
    this.#setLoadingState(true);

    try {
      this.#data       = await fetchScreenerData();
      this.#lastUpdate = Date.now();
      this.#applyFilters();
      this.#renderTable();
    } catch (err) {
      showToast(`Screener indisponible : ${err.message}`, 'error');
      this.#setLoadingState(false);
    } finally {
      this.#loading = false;
    }
  }

  #applyFilters() {
    const filtered = filterRows(this.#data, this.#activeTab, this.#search);
    // Tri colonne si différent du tri par défaut de l'onglet
    this.#filtered = sortRows(filtered, this.#sortKey, this.#sortDir);
  }

  // ── Rendu table ───────────────────────────────────────────────

  #renderTable() {
    this.#setLoadingState(false);
    this.#updateTabCounts();

    const tbody = document.getElementById('screener-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!this.#filtered.length) {
      tbody.innerHTML = `<tr><td colspan="${COLS.length}" class="scr-empty">
        Aucun résultat pour ce filtre.
      </td></tr>`;
      return;
    }

    // Limite d'affichage pour les performances DOM
    const rows = this.#filtered.slice(0, 200);

    const frag = document.createDocumentFragment();
    rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.className = 'scr-row';
      tr.dataset.sym = row.symbol;

      // Coloration de fond subtile selon position
      if (row.posInRange >= 0.8) tr.style.background = 'rgba(255,153,0,.04)';
      else if (row.posInRange <= 0.2) tr.style.background = 'rgba(0,200,255,.04)';

      COLS.forEach(col => {
        const td = document.createElement('td');
        td.className = `scr-td scr-td--${col.align}`;
        td.innerHTML = col.fmt(row);
        tr.appendChild(td);
      });

      tr.addEventListener('click', () => {
        this.#callbacks.onSelect?.(row.symbol.toLowerCase());
        this.close();
      });

      frag.appendChild(tr);
    });

    tbody.appendChild(frag);

    // Mise à jour du compteur
    const countEl = document.getElementById('screener-count');
    if (countEl) {
      countEl.textContent = `${this.#filtered.length} paire${this.#filtered.length !== 1 ? 's' : ''}`;
    }

    // Timestamp dernière MAJ
    const tsEl = document.getElementById('screener-ts');
    if (tsEl && this.#lastUpdate) {
      const d = new Date(this.#lastUpdate);
      tsEl.textContent = `MAJ ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    }
  }

  #updateTabCounts() {
    TABS.forEach(tab => {
      const btn = document.querySelector(`[data-tab="${tab.key}"]`);
      if (!btn) return;
      const n = filterRows(this.#data, tab.key, this.#search).length;
      const badge = btn.querySelector('.tab-badge');
      if (badge) badge.textContent = n > 999 ? '999+' : n;
    });
  }

  #renderHeaders() {
    const thead = document.getElementById('screener-thead');
    if (!thead) return;
    thead.innerHTML = '<tr>' + COLS.map(col => {
      const isActive = col.sortKey === this.#sortKey;
      const arrow    = isActive ? (this.#sortDir === 'desc' ? ' ↓' : ' ↑') : '';
      return `<th class="scr-th scr-th--${col.align} ${isActive ? 'scr-th--active' : ''}"
                  data-sort="${col.sortKey}"
                  title="Trier par ${col.label}">
        ${col.label}${arrow}
      </th>`;
    }).join('') + '</tr>';

    // Bind sort
    thead.querySelectorAll('.scr-th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        if (this.#sortKey === key) {
          this.#sortDir = this.#sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          this.#sortKey = key;
          this.#sortDir = 'desc';
        }
        this.#applyFilters();
        this.#renderHeaders();
        this.#renderTable();
      });
    });
  }

  #setLoadingState(on) {
    const loader = document.getElementById('screener-loader');
    const table  = document.getElementById('screener-table-wrap');
    if (loader) loader.style.display = on ? 'flex' : 'none';
    if (table)  table.style.display  = on ? 'none' : 'block';
  }

  // ── Événements statiques ──────────────────────────────────────

  #bindStaticEvents() {
    document.getElementById('screener-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') {
        e.stopPropagation();
        this.close();
      }
    });

    // Onglets
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (!btn.closest('#screener-overlay')) return;
      btn.addEventListener('click', () => {
        this.#activeTab = btn.dataset.tab;
        this.#sortKey   = 'vol';
        this.#sortDir   = 'desc';
        document.querySelectorAll('#screener-overlay [data-tab]').forEach(b =>
          b.classList.toggle('active', b === btn)
        );
        this.#applyFilters();
        this.#renderHeaders();
        this.#renderTable();
      });
    });

    // Recherche
    const searchEl = document.getElementById('screener-search');
    let searchTimer;
    searchEl?.addEventListener('input', e => {
      clearTimeout(searchTimer);
      this.#search = e.target.value;
      searchTimer = setTimeout(() => {
        this.#applyFilters();
        this.#renderTable();
      }, 120);
    });

    // Bouton refresh
    document.getElementById('screener-refresh')
      ?.addEventListener('click', () => this.#refresh());

    // Init headers (une seule fois, ils seront re-rendus au tri)
    this.#renderHeaders();
  }
}
