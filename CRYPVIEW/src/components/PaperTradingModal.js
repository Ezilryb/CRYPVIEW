// ============================================================
//  src/components/PaperTradingModal.js — CrypView V3.4
//  Interface utilisateur du Paper Trading.
//
//  Onglets :
//    💼 Portfolio  — solde, positions ouvertes, métriques
//    📋 Ordre       — formulaire long/short avec SL/TP
//    📜 Historique  — trades fermés
//
//  Usage :
//    const modal = new PaperTradingModal(engine, { getCurrentPrice, getSymbol });
//    modal.open();
//    modal.refresh(); // hook appelé par engine.onUpdate
// ============================================================

import { fmtPrice, fmtVol } from '../utils/format.js';

export class PaperTradingModal {
  #overlay;
  #engine;
  #callbacks;
  #activeTab = 'portfolio';

  /**
   * @param {import('../features/PaperTrading').PaperTradingEngine} engine
   * @param {{ getCurrentPrice: () => number, getSymbol: () => string }} callbacks
   */
  constructor(engine, callbacks) {
    this.#engine    = engine;
    this.#callbacks = callbacks;
    this.#overlay   = document.getElementById('paper-trading-overlay');
    this.#bindStaticEvents();
  }

  // ── API publique ──────────────────────────────────────────

  open() {
    this.#overlay.style.display = 'flex';
    this.#switchTab('portfolio');
  }

  close() {
    this.#overlay.style.display = 'none';
  }

  refresh() {
    if (this.#overlay?.style.display === 'flex') this.#renderContent();
  }

  // ── Rendu ─────────────────────────────────────────────────

  #switchTab(tab) {
    this.#activeTab = tab;
    ['portfolio', 'order', 'history'].forEach(t => {
      const btn = document.getElementById(`pt-tab-${t}`);
      if (btn) {
        btn.classList.toggle('active', t === tab);
        btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      }
    });
    this.#renderContent();
  }

  #renderContent() {
    const content = document.getElementById('pt-content');
    if (!content) return;

    if (this.#activeTab === 'portfolio') {
      content.innerHTML = this.#tplPortfolio();
      this.#bindPortfolioEvents();
    } else if (this.#activeTab === 'order') {
      content.innerHTML = this.#tplOrder();
      this.#bindOrderEvents();
    } else {
      content.innerHTML = this.#tplHistory();
    }
  }

  // ── Portfolio ─────────────────────────────────────────────

  #tplPortfolio() {
    const e       = this.#engine;
    const eq      = e.totalEquity;
    const initial = 10_000;
    const pnlTotal = e.realizedPnl;
    const pnlPct   = ((eq - initial) / initial * 100);
    const color    = pnlTotal >= 0 ? 'var(--green)' : 'var(--red)';
    const markersOn = this.#callbacks.isChartMarkersVisible?.() ?? true;

    const metricCard = (label, value, c = 'var(--text)') =>
      `<div style="background:rgba(255,255,255,.02);border:1px solid var(--border);
                   border-radius:6px;padding:12px 14px;">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:.8px;margin-bottom:4px;">${label}</div>
        <div style="font-size:15px;font-family:'Syne',sans-serif;font-weight:800;color:${c};">${value}</div>
       </div>`;

    const posRows = e.positions.map(p => {
      const pc = p.pnl >= 0 ? 'var(--green)' : 'var(--red)';
      return `<tr style="border-bottom:1px solid rgba(28,35,51,.5);">
        <td style="padding:7px 10px;font-weight:700;color:var(--accent);
                   font-family:'Syne',sans-serif;">${p.symbol.replace('USDT', '/USDT')}</td>
        <td style="padding:7px 10px;text-align:center;">
          <span style="background:${p.side === 'long' ? 'rgba(0,255,136,.1)' : 'rgba(255,61,90,.1)'};
                       color:${p.side === 'long' ? 'var(--green)' : 'var(--red)'};
                       padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;">
            ${p.side.toUpperCase()}
          </span>
        </td>
        <td style="padding:7px 10px;text-align:right;">${fmtPrice(p.entryPrice)}</td>
        <td style="padding:7px 10px;text-align:right;color:${pc};font-weight:700;">
          ${p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)} USDT
          <div style="font-size:9px;">(${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(2)}%)</div>
        </td>
        <td style="padding:7px 10px;text-align:right;">
          <button class="pt-close-pos" data-id="${p.id}"
                  style="background:rgba(255,61,90,.1);border:1px solid rgba(255,61,90,.3);
                         color:var(--red);padding:4px 10px;font-size:9px;border-radius:4px;
                         cursor:pointer;font-family:'Space Mono',monospace;">✕ Clore</button>
        </td>
      </tr>`;
    }).join('');

    return `
      <!-- Barre d'outils portfolio -->
      <div style="display:flex;align-items:center;justify-content:flex-end;margin-bottom:10px;">
        <button id="pt-toggle-markers"
                style="display:flex;align-items:center;gap:6px;padding:4px 11px;
                       border-radius:4px;cursor:pointer;font-family:'Space Mono',monospace;
                       font-size:9px;letter-spacing:.4px;transition:all .15s;
                       background:${markersOn ? 'rgba(0,255,136,.1)' : 'transparent'};
                       border:1px solid ${markersOn ? 'rgba(0,255,136,.3)' : 'var(--border)'};
                       color:${markersOn ? 'var(--accent)' : 'var(--muted)'};">
          📍 Chart ${markersOn ? 'ON' : 'OFF'}
        </button>
      </div>
      <!-- Métriques -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
        ${metricCard('Solde disponible', `${e.balance.toFixed(2)} $`)}
        ${metricCard('Equity totale', `${eq.toFixed(2)} $`, color)}
        ${metricCard('P&L réalisé', `${pnlTotal >= 0 ? '+' : ''}${pnlTotal.toFixed(2)} $`, color)}
        ${metricCard('Win Rate', `${e.winRate.toFixed(1)}%`, e.winRate >= 50 ? 'var(--green)' : 'var(--red)')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        ${metricCard('Max Drawdown', `${e.maxDrawdown.toFixed(2)}%`, e.maxDrawdown > 10 ? 'var(--red)' : 'var(--muted)')}
        ${metricCard('Perf. totale', `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color)}
      </div>

      <!-- Courbe equity mini -->
      <canvas id="pt-equity-canvas" height="70"
              style="width:100%;display:block;border:1px solid var(--border);
                     border-radius:6px;background:rgba(0,0,0,.25);margin-bottom:14px;"
              aria-label="Courbe equity"></canvas>

      <!-- Positions ouvertes -->
      ${e.positions.length ? `
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:.8px;margin-bottom:6px;">Positions ouvertes (${e.positions.length})</div>
        <div style="overflow-x:auto;border:1px solid var(--border);border-radius:6px;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:var(--panel);font-size:9px;color:var(--muted);">
                <th style="padding:6px 10px;text-align:left;font-weight:400;">Paire</th>
                <th style="padding:6px 10px;text-align:center;font-weight:400;">Côté</th>
                <th style="padding:6px 10px;text-align:right;font-weight:400;">Entrée</th>
                <th style="padding:6px 10px;text-align:right;font-weight:400;">P&L</th>
                <th style="padding:6px 10px;text-align:right;font-weight:400;"></th>
              </tr>
            </thead>
            <tbody>${posRows}</tbody>
          </table>
        </div>` : `
        <div style="padding:24px;text-align:center;color:var(--muted);font-size:11px;">
          <div style="font-size:22px;margin-bottom:8px;">📭</div>
          Aucune position ouverte — utilisez l'onglet <strong style="color:var(--text)">Ordre</strong>
        </div>`}

      <div style="display:flex;justify-content:flex-end;margin-top:12px;">
        <button id="pt-reset-btn"
                style="background:rgba(255,61,90,.08);border:1px solid rgba(255,61,90,.25);
                       color:var(--red);padding:7px 14px;font-family:'Space Mono',monospace;
                       font-size:10px;border-radius:4px;cursor:pointer;transition:all .15s;">
          🔄 Réinitialiser le compte
        </button>
      </div>`;
  }

  #bindPortfolioEvents() {
    document.querySelectorAll('.pt-close-pos').forEach(btn => {
      btn.addEventListener('click', () => {
        const price = this.#callbacks.getCurrentPrice?.() ?? 0;
        this.#engine.closePosition(btn.dataset.id, price);
      });
    });

    document.getElementById('pt-reset-btn')?.addEventListener('click', () => {
      if (!confirm('Réinitialiser entièrement le compte Paper Trading ?')) return;
      this.#engine.reset();
    });

    document.getElementById('pt-toggle-markers')?.addEventListener('click', (e) => {
      const cb = this.#callbacks.onToggleChartMarkers;
      if (!cb) return;
      const now = cb();
      const btn = e.currentTarget;
      btn.textContent      = `📍 Chart ${now ? 'ON' : 'OFF'}`;
      btn.style.background  = now ? 'rgba(0,255,136,.1)'  : 'transparent';
      btn.style.borderColor = now ? 'rgba(0,255,136,.3)'  : 'var(--border)';
      btn.style.color       = now ? 'var(--accent)'       : 'var(--muted)';
    });

    // Dessine la mini courbe equity
    requestAnimationFrame(() => this.#drawEquityCurve());
  }

  #drawEquityCurve() {
    const canvas = document.getElementById('pt-equity-canvas');
    if (!canvas) return;
    const W = canvas.offsetWidth;
    canvas.width  = W;
    const H = 70;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const pts = this.#engine.equity;
    if (pts.length < 2) {
      ctx.fillStyle = 'rgba(139,148,158,.5)';
      ctx.font = '10px Space Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Pas encore de données', W / 2, H / 2 + 4);
      return;
    }

    const minV = Math.min(...pts.map(p => p.value));
    const maxV = Math.max(...pts.map(p => p.value));
    const range = maxV - minV || 1;

    const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
    const ys = pts.map(p => H - 6 - ((p.value - minV) / range) * (H - 12));

    const last  = pts.at(-1).value;
    const first = pts[0].value;
    const up    = last >= first;
    const color = up ? '#00ff88' : '#ff3d5a';

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, up ? 'rgba(0,255,136,0.25)' : 'rgba(255,61,90,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.moveTo(xs[0], H);
    xs.forEach((x, i) => ctx.lineTo(x, ys[i]));
    ctx.lineTo(xs.at(-1), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    xs.forEach((x, i) => i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i]));
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }

  // ── Ordre ─────────────────────────────────────────────────

  #tplOrder() {
    const sym   = this.#callbacks.getSymbol?.() ?? 'BTCUSDT';
    const price = this.#callbacks.getCurrentPrice?.() ?? 0;

    return `
      <div style="font-size:11px;margin-bottom:14px;padding:10px 12px;
                  background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.15);
                  border-radius:6px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:14px;
                     color:var(--accent);">${sym.replace('USDT', '/USDT')}</span>
        <span style="font-size:13px;font-weight:700;color:var(--text);">${fmtPrice(price)}</span>
        <span style="font-size:9px;color:var(--muted);">Solde: ${this.#engine.balance.toFixed(2)} $</span>
      </div>

      <!-- Côté -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
        <button id="pt-side-long"  data-side="long"  class="pt-side-btn active-side"
                style="padding:10px;border-radius:6px;cursor:pointer;font-family:'Syne',sans-serif;
                       font-weight:800;font-size:13px;border:2px solid var(--green);
                       background:rgba(0,255,136,.12);color:var(--green);transition:all .15s;">
          ▲ LONG
        </button>
        <button id="pt-side-short" data-side="short" class="pt-side-btn"
                style="padding:10px;border-radius:6px;cursor:pointer;font-family:'Syne',sans-serif;
                       font-weight:800;font-size:13px;border:2px solid var(--border);
                       background:transparent;color:var(--muted);transition:all .15s;">
          ▼ SHORT
        </button>
      </div>

      <!-- Montant -->
      <label style="display:block;margin-bottom:10px;">
        <span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase;
                     letter-spacing:.8px;margin-bottom:4px;">Montant USDT</span>
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="pt-amount" type="number" value="1000" min="1"
                 style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
                        padding:8px 10px;font-family:'Space Mono',monospace;font-size:12px;
                        border-radius:4px;outline:none;"
                 aria-label="Montant en USDT">
          ${[25, 50, 75, 100].map(p => `
            <button class="pt-pct-btn" data-pct="${p}"
                    style="padding:5px 8px;font-size:9px;border-radius:3px;cursor:pointer;
                           background:rgba(255,255,255,.04);border:1px solid var(--border);
                           color:var(--muted);font-family:'Space Mono',monospace;">${p}%</button>
          `).join('')}
        </div>
      </label>

      <!-- SL / TP -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
        <label>
          <span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase;
                       letter-spacing:.8px;margin-bottom:4px;">🛑 Stop-Loss %</span>
          <input id="pt-sl" type="number" value="2" min="0" step="0.1" placeholder="0 = off"
                 style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                        padding:7px 10px;font-family:'Space Mono',monospace;font-size:11px;
                        border-radius:4px;outline:none;" aria-label="Stop loss en pourcent">
        </label>
        <label>
          <span style="display:block;font-size:9px;color:var(--muted);text-transform:uppercase;
                       letter-spacing:.8px;margin-bottom:4px;">🎯 Take-Profit %</span>
          <input id="pt-tp" type="number" value="4" min="0" step="0.1" placeholder="0 = off"
                 style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                        padding:7px 10px;font-family:'Space Mono',monospace;font-size:11px;
                        border-radius:4px;outline:none;" aria-label="Take profit en pourcent">
        </label>
      </div>

      <button id="pt-submit-order"
              style="width:100%;padding:12px;border-radius:6px;cursor:pointer;
                     font-family:'Syne',sans-serif;font-size:14px;font-weight:800;
                     background:var(--green);color:var(--bg);border:none;
                     transition:background .15s;letter-spacing:.04em;">
        ▲ Ouvrir position LONG
      </button>`;
  }

  #bindOrderEvents() {
    let currentSide = 'long';

    const updateBtn = () => {
      const btn = document.getElementById('pt-submit-order');
      if (!btn) return;
      if (currentSide === 'long') {
        btn.textContent   = '▲ Ouvrir position LONG';
        btn.style.background = 'var(--green)';
        btn.style.color      = 'var(--bg)';
      } else {
        btn.textContent   = '▼ Ouvrir position SHORT';
        btn.style.background = 'var(--red)';
        btn.style.color      = '#fff';
      }
    };

    document.querySelectorAll('.pt-side-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSide = btn.dataset.side;
        document.querySelectorAll('.pt-side-btn').forEach(b => {
          const isLong = b.dataset.side === 'long';
          b.style.border     = `2px solid ${currentSide === b.dataset.side ? (isLong ? 'var(--green)' : 'var(--red)') : 'var(--border)'}`;
          b.style.background = currentSide === b.dataset.side
            ? (isLong ? 'rgba(0,255,136,.12)' : 'rgba(255,61,90,.12)') : 'transparent';
          b.style.color      = currentSide === b.dataset.side
            ? (isLong ? 'var(--green)' : 'var(--red)') : 'var(--muted)';
        });
        updateBtn();
      });
    });

    // Boutons % du solde
    document.querySelectorAll('.pt-pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct    = parseInt(btn.dataset.pct);
        const amount = this.#engine.balance * pct / 100;
        const input  = document.getElementById('pt-amount');
        if (input) input.value = Math.floor(amount);
      });
    });

    document.getElementById('pt-submit-order')?.addEventListener('click', () => {
      const price  = this.#callbacks.getCurrentPrice?.() ?? 0;
      const sym    = this.#callbacks.getSymbol?.() ?? 'BTCUSDT';
      const amount = parseFloat(document.getElementById('pt-amount')?.value ?? 0);
      const slPct  = parseFloat(document.getElementById('pt-sl')?.value  ?? 0);
      const tpPct  = parseFloat(document.getElementById('pt-tp')?.value  ?? 0);

      if (!price || !amount) return;

      const sl = slPct > 0
        ? (currentSide === 'long' ? price * (1 - slPct / 100) : price * (1 + slPct / 100))
        : 0;
      const tp = tpPct > 0
        ? (currentSide === 'long' ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100))
        : 0;

      this.#engine.openPosition(currentSide, sym, price, amount, sl, tp);
    });
  }

  // ── Historique ────────────────────────────────────────────

  #tplHistory() {
    const trades = this.#engine.trades.filter(t => t.action !== 'open');

    if (!trades.length) {
      return `<div style="padding:36px;text-align:center;color:var(--muted);font-size:11px;">
        <div style="font-size:28px;margin-bottom:10px">📋</div>
        Aucun trade clôturé pour l'instant.
      </div>`;
    }

    const rows = trades.map(t => {
      const pc = t.pnl >= 0 ? 'var(--green)' : 'var(--red)';
      const icon = t.action === 'sl' ? '🛑' : t.action === 'tp' ? '🎯' : '📤';
      const dt = new Date(t.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      return `<tr style="border-bottom:1px solid rgba(28,35,51,.5);font-size:10px;">
        <td style="padding:6px 10px;color:var(--accent);font-weight:700;
                   font-family:'Syne',sans-serif;">${t.symbol.replace('USDT', '/USDT')}</td>
        <td style="padding:6px 10px;text-align:center;">${icon} ${t.action.toUpperCase()}</td>
        <td style="padding:6px 10px;text-align:right;">${fmtPrice(t.price)}</td>
        <td style="padding:6px 10px;text-align:right;color:${pc};font-weight:700;">
          ${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} $
        </td>
        <td style="padding:6px 10px;text-align:right;color:var(--muted);font-size:9px;">${dt}</td>
      </tr>`;
    }).join('');

    return `
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:6px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--panel);font-size:9px;color:var(--muted);">
              <th style="padding:6px 10px;text-align:left;font-weight:400;">Paire</th>
              <th style="padding:6px 10px;text-align:center;font-weight:400;">Action</th>
              <th style="padding:6px 10px;text-align:right;font-weight:400;">Prix</th>
              <th style="padding:6px 10px;text-align:right;font-weight:400;">P&L</th>
              <th style="padding:6px 10px;text-align:right;font-weight:400;">Heure</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // ── Événements statiques ──────────────────────────────────

  #bindStaticEvents() {
    document.getElementById('paper-trading-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'flex') {
        e.stopPropagation();
        this.close();
      }
    });

    ['portfolio', 'order', 'history'].forEach(tab => {
      document.getElementById(`pt-tab-${tab}`)
        ?.addEventListener('click', () => this.#switchTab(tab));
    });
  }
}
