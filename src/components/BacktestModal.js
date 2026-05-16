// ============================================================
//  src/components/BacktestModal.js — CrypView V3.4 (Fix multi-conditions)
//
//  CORRECTIONS v3.4.1 :
//    1. try-catch autour de #tplResults() dans #switchTab
//    2. Cas "0 trades" : affiche la courbe equity plate + résumé des
//       conditions évaluées au lieu d'un simple message ⚠️
//    3. #bindCondRowEvents appliqué aux lignes INITIALES dès l'ouverture
//    4. Bouton ✕ des lignes initiales correctement bindé (onclick)
//    5. Logique AND/OR correctement collectée et transmise au Backtester
//    6. Affichage robuste même si metrics.message est défini
// ============================================================

import { Backtester, SIGNAL_TYPES } from '../features/Backtester.js';
import { t } from '../i18n/i18n.js';

export class BacktestModal {
  #overlay;
  #callbacks;
  #activeTab  = 'strategy';
  #lastResult = null;

  /** @param {{ getCandles: () => Candle[], getSymbol: () => string, getTf: () => string }} callbacks */
  constructor(callbacks) {
    this.#callbacks = callbacks;
    this.#overlay   = document.getElementById('backtest-overlay');
    this.#bindStaticEvents();
  }

  open() {
    this.#overlay.style.display = 'flex';
    this.#switchTab('strategy');
  }

  close() {
    this.#overlay.style.display = 'none';
  }

  #switchTab(tab) {
    this.#activeTab = tab;
    ['strategy', 'results'].forEach(name => {
      const btn = document.getElementById(`bt-tab-${name}`);
      if (btn) {
        btn.classList.toggle('active', name === tab);
        btn.setAttribute('aria-selected', name === tab ? 'true' : 'false');
      }
    });
    const content = document.getElementById('bt-content');
    if (!content) return;

    if (tab === 'strategy') {
      content.innerHTML = this.#tplStrategy();
      this.#bindStrategyEvents();
    } else {
      try {
        content.innerHTML = this.#tplResults();
        const eq = this.#lastResult?.equity ?? [];
        this.#drawEquityCurve(eq);
      } catch (err) {
        content.innerHTML = `<div style="padding:32px;text-align:center;color:var(--red);font-size:11px;">
          <div style="font-size:22px;margin-bottom:10px">⛔</div>
          <strong>Erreur d'affichage</strong><br>
          <span style="color:var(--muted);margin-top:6px;display:block;">${err?.message ?? String(err)}</span>
        </div>`;
        console.error('[BacktestModal] Erreur dans #tplResults:', err);
      }
    }
  }

  #tr(key, fallback) {
    const v = t(key);
    return (v && v !== key) ? v : fallback;
  }

  #sigOptions() {
    return SIGNAL_TYPES.map(s => {
      const label = this.#tr(`backtest.signals.${s.id}`, s.label);
      return `<option value="${s.id}">${label}</option>`;
    }).join('');
  }

  #tplStrategy() {
    const sym = (this.#callbacks.getSymbol?.() ?? 'btcusdt').toUpperCase().replace('USDT', '/USDT');
    const tf  = (this.#callbacks.getTf?.() ?? '—').toUpperCase();
    const n   = this.#callbacks.getCandles?.()?.length ?? 0;

    const allConds  = this.#tr('backtest.allConds',   'TOUTES (ET)');
    const anyCond   = this.#tr('backtest.anyCond',    "L'UNE (OU)");
    const addCond   = this.#tr('backtest.addCond',    '+ Ajouter');
    const entryLbl  = this.#tr('backtest.entry',      "📈 Conditions d'entrée");
    const exitLbl   = this.#tr('backtest.exit',       '📉 Conditions de sortie');
    const runLbl    = this.#tr('backtest.run',        '▶ Lancer le backtest');
    const slLbl     = this.#tr('backtest.stopLoss',   'Stop-Loss %');
    const tpLbl     = this.#tr('backtest.takeProfit', 'Take-Profit %');
    const capLbl    = this.#tr('backtest.capital',    'Capital / trade %');
    const sideLbl   = this.#tr('backtest.side',       'Côté');
    const longLbl   = this.#tr('backtest.long',       'Long ▲');
    const shortLbl  = this.#tr('backtest.short',      'Short ▼');
    const thrLbl    = this.#tr('backtest.threshold',  'seuil');

    let ctxHtml = `<strong style="color:var(--accent)">${sym}</strong> · TF ${tf} · <strong>${n}</strong> bougies disponibles`;
    const ctxKey = t('backtest.context', { sym, tf, n });
    if (ctxKey && ctxKey !== 'backtest.context') ctxHtml = ctxKey;

    const condRowHTML = (prefix, idx, isFirst = false) => {
      const first = SIGNAL_TYPES[0];
      const show  = first?.hasValue !== false;
      return `
      <div class="bt-cond-row" id="${prefix}-row-${idx}"
           style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <select class="bt-cond-type"
                data-prefix="${prefix}" data-idx="${idx}"
                style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
                       padding:6px 8px;font-family:'Space Mono',monospace;font-size:10px;
                       border-radius:4px;outline:none;cursor:pointer;">
          ${this.#sigOptions()}
        </select>
        <input class="bt-cond-val"
               data-prefix="${prefix}" data-idx="${idx}"
               type="number" placeholder="${thrLbl}"
               value="${first?.defaultValue ?? ''}"
               style="width:74px;background:var(--bg);border:1px solid var(--border);color:var(--text);
                      padding:6px 8px;font-family:'Space Mono',monospace;font-size:11px;
                      border-radius:4px;outline:none;text-align:center;
                      display:${show ? 'block' : 'none'};">
        <button class="bt-del-cond"
                data-prefix="${prefix}" data-idx="${idx}"
                style="background:none;border:none;color:var(--muted);font-size:13px;
                       cursor:pointer;padding:4px;line-height:1;transition:color .15s;"
                aria-label="Supprimer">✕</button>
      </div>`;
    };

    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                  background:rgba(0,200,255,.05);border:1px solid rgba(0,200,255,.15);
                  border-radius:6px;margin-bottom:14px;font-size:10px;">
        <span style="font-size:16px">📊</span><span>${ctxHtml}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:9px;color:var(--accent);text-transform:uppercase;letter-spacing:.8px;">
              ${entryLbl}
            </span>
            <div style="display:flex;align-items:center;gap:6px;">
              <select id="bt-entry-logic"
                      style="background:var(--bg);border:1px solid var(--border);color:var(--muted);
                             padding:3px 7px;font-family:'Space Mono',monospace;font-size:9px;
                             border-radius:4px;outline:none;">
                <option value="AND">${allConds}</option>
                <option value="OR">${anyCond}</option>
              </select>
              <button class="bt-add-cond" data-prefix="entry"
                      style="background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.25);
                             color:var(--accent);padding:3px 9px;font-size:9px;border-radius:3px;
                             cursor:pointer;font-family:'Space Mono',monospace;">${addCond}</button>
            </div>
          </div>
          <div id="entry-conditions">${condRowHTML('entry', 0, true)}</div>
        </div>

        <!-- Conditions de sortie -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:9px;color:var(--red);text-transform:uppercase;letter-spacing:.8px;">
              ${exitLbl}
            </span>
            <div style="display:flex;align-items:center;gap:6px;">
              <select id="bt-exit-logic"
                      style="background:var(--bg);border:1px solid var(--border);color:var(--muted);
                             padding:3px 7px;font-family:'Space Mono',monospace;font-size:9px;
                             border-radius:4px;outline:none;">
                <option value="AND">${allConds}</option>
                <option value="OR">${anyCond}</option>
              </select>
              <button class="bt-add-cond" data-prefix="exit"
                      style="background:rgba(255,61,90,.08);border:1px solid rgba(255,61,90,.25);
                             color:var(--red);padding:3px 9px;font-size:9px;border-radius:3px;
                             cursor:pointer;font-family:'Space Mono',monospace;">${addCond}</button>
            </div>
          </div>
          <div id="exit-conditions">${condRowHTML('exit', 0, true)}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">
        ${this.#paramField('bt-side',    sideLbl,  'select', [['long', longLbl], ['short', shortLbl]])}
        ${this.#paramField('bt-sl-pct',  slLbl,    'number', null, '2')}
        ${this.#paramField('bt-tp-pct',  tpLbl,    'number', null, '4')}
        ${this.#paramField('bt-cap-pct', capLbl,   'number', null, '10')}
      </div>

      <!-- ── Slippage & Frais ─────────────────────────────── -->
      <div style="margin-bottom:14px;border:1px solid var(--border);border-radius:6px;
                  padding:10px 14px;background:rgba(255,255,255,.015);">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:.8px;margin-bottom:10px;">
          💸 Simulation slippage &amp; frais
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px;">
          <div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Frais taker (%)</div>
            <input id="bt-taker-fee" type="number" value="0.10" step="0.001" min="0"
                   style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                          padding:7px 8px;font-family:'Space Mono',monospace;font-size:11px;
                          border-radius:4px;outline:none;text-align:center;">
          </div>
          <div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Frais maker (%)</div>
            <input id="bt-maker-fee" type="number" value="0.02" step="0.001" min="0"
                   style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                          padding:7px 8px;font-family:'Space Mono',monospace;font-size:11px;
                          border-radius:4px;outline:none;text-align:center;">
          </div>
          <div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Slippage (%)</div>
            <input id="bt-slippage" type="number" value="0.05" step="0.001" min="0"
                   style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                          padding:7px 8px;font-family:'Space Mono',monospace;font-size:11px;
                          border-radius:4px;outline:none;text-align:center;">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Type d'ordre</div>
            <select id="bt-order-type"
                    style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--muted);
                           padding:7px 8px;font-family:'Space Mono',monospace;font-size:9px;
                           border-radius:4px;outline:none;cursor:pointer;">
              <option value="market">Market (Taker)</option>
              <option value="limit">Limit (Maker)</option>
              <option value="mix">Mix 50/50</option>
            </select>
          </div>
          <div>
            <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">Impact marché</div>
            <select id="bt-market-impact"
                    style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--muted);
                           padding:7px 8px;font-family:'Space Mono',monospace;font-size:9px;
                           border-radius:4px;outline:none;cursor:pointer;">
              <option value="false">Non (standard)</option>
              <option value="true">Oui (gros trades)</option>
            </select>
          </div>
        </div>
      </div>

      <button id="bt-run-btn"
              style="width:100%;padding:13px;border-radius:6px;cursor:pointer;
                     font-family:'Syne',sans-serif;font-size:14px;font-weight:800;
                     background:var(--accent);color:var(--bg);border:none;
                     transition:background .15s;letter-spacing:.04em;">${runLbl}</button>`;
  }

  #paramField(id, label, type, opts, def = '') {
    const inner = type === 'select'
      ? `<select id="${id}" style="width:100%;background:var(--bg);border:1px solid var(--border);
                                   color:var(--text);padding:7px 8px;font-family:'Space Mono',monospace;
                                   font-size:11px;border-radius:4px;outline:none;cursor:pointer;">
           ${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
         </select>`
      : `<input id="${id}" type="number" value="${def}" min="0" step="0.1"
                style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                       padding:7px 8px;font-family:'Space Mono',monospace;font-size:11px;
                       border-radius:4px;outline:none;text-align:center;">`;
    return `<div>
      <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">${label}</div>
      ${inner}
    </div>`;
  }

  #bindStrategyEvents() {
    let entryIdx = 1;
    let exitIdx  = 1;

    const entryCont = document.getElementById('entry-conditions');
    const exitCont  = document.getElementById('exit-conditions');

    if (entryCont) this.#bindCondRowEvents(entryCont);
    if (exitCont)  this.#bindCondRowEvents(exitCont);

    document.querySelectorAll('.bt-add-cond').forEach(btn => {
      btn.addEventListener('click', () => {
        const prefix    = btn.dataset.prefix;
        const container = document.getElementById(`${prefix}-conditions`);
        if (!container) return;
        const idx = prefix === 'entry' ? entryIdx++ : exitIdx++;
        const tmp = document.createElement('div');
        tmp.innerHTML = this.#condRowHTML(prefix, idx);
        container.appendChild(tmp.firstElementChild);
        this.#bindCondRowEvents(container);
      });
    });

    document.getElementById('bt-run-btn')
      ?.addEventListener('click', () => this.#runBacktest());
  }

  #condRowHTML(prefix, idx) {
    const thrLbl = this.#tr('backtest.threshold', 'seuil');
    const first  = SIGNAL_TYPES[0];
    const show   = first?.hasValue !== false;
    return `<div class="bt-cond-row" id="${prefix}-row-${idx}"
               style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <select class="bt-cond-type"
              data-prefix="${prefix}" data-idx="${idx}"
              style="flex:1;background:var(--bg);border:1px solid var(--border);color:var(--text);
                     padding:6px 8px;font-family:'Space Mono',monospace;font-size:10px;
                     border-radius:4px;outline:none;">${this.#sigOptions()}</select>
      <input class="bt-cond-val"
             data-prefix="${prefix}" data-idx="${idx}"
             type="number" placeholder="${thrLbl}" value="${first?.defaultValue ?? ''}"
             style="width:74px;background:var(--bg);border:1px solid var(--border);color:var(--text);
                    padding:6px 8px;font-family:'Space Mono',monospace;font-size:11px;
                    border-radius:4px;outline:none;text-align:center;
                    display:${show ? 'block' : 'none'};">
      <button class="bt-del-cond"
              data-prefix="${prefix}" data-idx="${idx}"
              style="background:none;border:none;color:var(--muted);font-size:13px;
                     cursor:pointer;padding:4px;line-height:1;transition:color .15s;"
              aria-label="Supprimer">✕</button>
    </div>`;
  }

  /**
   * @param {HTMLElement} container
   */
  #bindCondRowEvents(container) {
    container.querySelectorAll('.bt-del-cond').forEach(btn => {
      btn.onclick = () => {
        const row = document.getElementById(`${btn.dataset.prefix}-row-${btn.dataset.idx}`);
        if (row && container.querySelectorAll('.bt-cond-row').length > 1) {
          row.remove();
        }
      };
      btn.onmouseenter = () => { btn.style.color = 'var(--red)'; };
      btn.onmouseleave = () => { btn.style.color = 'var(--muted)'; };
    });

    container.querySelectorAll('.bt-cond-type').forEach(sel => {
      sel.onchange = () => {
        const meta     = SIGNAL_TYPES.find(s => s.id === sel.value);
        const valInput = container.querySelector(`.bt-cond-val[data-idx="${sel.dataset.idx}"]`);
        if (!valInput) return;

        const needsValue = meta?.hasValue !== false;
        valInput.style.display = needsValue ? 'block' : 'none';

        if (meta?.defaultValue != null) {
          valInput.value = meta.defaultValue;
        } else if (!needsValue) {
          valInput.value = '';
        }
      };
    });
  }

  #collectConditions(prefix) {
    const container = document.getElementById(`${prefix}-conditions`);
    if (!container) return [];

    const rows = container.querySelectorAll('.bt-cond-row');
    const result = [];

    for (const row of rows) {
      const type = row.querySelector('.bt-cond-type')?.value;
      if (!type) continue;

      const meta      = SIGNAL_TYPES.find(s => s.id === type);
      const needsVal  = meta?.hasValue !== false;
      const rawVal    = row.querySelector('.bt-cond-val')?.value ?? '';
      const numVal    = parseFloat(rawVal);
      const value     = (needsVal && !isNaN(numVal)) ? numVal : null;

      result.push({ type, value });
    }

    return result;
  }

  #runBacktest() {
    const candles = this.#callbacks.getCandles?.() ?? [];

    if (!candles.length) {
      this.#lastResult = {
        trades: [], equity: [],
        metrics: { error: 'Aucun historique disponible. Changez de paire ou de timeframe.' },
        config: null,
      };
      this.#switchTab('results');
      return;
    }

    const entryConditions = this.#collectConditions('entry');
    const exitConditions  = this.#collectConditions('exit');
    const entryLogic      = document.getElementById('bt-entry-logic')?.value ?? 'AND';
    const exitLogic       = document.getElementById('bt-exit-logic')?.value  ?? 'AND';

    const config = {
      side:            document.getElementById('bt-side')?.value    ?? 'long',
      entryConditions,
      exitConditions,
      entryLogic,
      exitLogic,
      stopLossPct:     parseFloat(document.getElementById('bt-sl-pct')?.value  ?? '2') || 0,
      takeProfitPct:   parseFloat(document.getElementById('bt-tp-pct')?.value  ?? '4') || 0,
      capitalPct:      parseFloat(document.getElementById('bt-cap-pct')?.value ?? '10') || 10,
      initialBalance:  10_000,

      // ── Slippage & frais (v4.0) ─────────────────────────
      takerFeePct:     parseFloat(document.getElementById('bt-taker-fee')?.value ?? '0.10') || 0.10,
      makerFeePct:     parseFloat(document.getElementById('bt-maker-fee')?.value ?? '0.02') || 0.02,
      slippagePct:     parseFloat(document.getElementById('bt-slippage')?.value  ?? '0.05') || 0.05,
      useMarketOrder:  (document.getElementById('bt-order-type')?.value ?? 'market') !== 'limit',
      marketImpact:    (document.getElementById('bt-market-impact')?.value ?? 'false') === 'true',
      maxSlippagePct:  0.5,
    };

    const btn = document.getElementById('bt-run-btn');
    if (btn) {
      btn.textContent = this.#tr('backtest.running', '⏳ Calcul…');
      btn.disabled    = true;
      btn.style.opacity = '0.7';
    }

    setTimeout(() => {
      try {
        const result = Backtester.run(candles, config);
        this.#lastResult = { ...result, config };
      } catch (err) {
        this.#lastResult = {
          trades:  [],
          equity:  [],
          metrics: { error: `Erreur de calcul : ${err?.message ?? String(err)}` },
          config,
        };
        console.error('[Backtester] Erreur lors de run():', err);
      }

      if (btn) {
        btn.textContent   = this.#tr('backtest.run', '▶ Lancer le backtest');
        btn.disabled      = false;
        btn.style.opacity = '1';
      }

      this.#switchTab('results');
    }, 50);
  }

  #tplResults() {
    if (!this.#lastResult) {
      return `<div style="padding:48px;text-align:center;color:var(--muted);font-size:12px;">
        <div style="font-size:28px;margin-bottom:12px">⚙️</div>
        ${this.#tr('backtest.noResult', "Configurez et lancez un backtest depuis l'onglet Stratégie.")}
      </div>`;
    }

    const { metrics, trades, equity, config } = this.#lastResult;

    const errorMsg = metrics?.error;
    if (errorMsg) {
      return `<div style="padding:32px;text-align:center;color:var(--muted);font-size:11px;">
        <div style="font-size:22px;margin-bottom:10px">⚠️</div>
        ${errorMsg}
        ${this.#tplConditionSummary(config)}
      </div>`;
    }

    const noTrades = !trades?.length;
    if (noTrades) {
      return `
        <div style="padding:16px;background:rgba(255,153,0,.07);border:1px solid rgba(255,153,0,.3);
                    border-radius:8px;margin-bottom:14px;display:flex;gap:12px;align-items:flex-start;">
          <div style="font-size:20px;flex-shrink:0;">📭</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--yellow);margin-bottom:4px;">
              Aucun trade déclenché
            </div>
            <div style="font-size:10px;color:var(--muted);line-height:1.7;">
              ${this.#tr('backtest.noTrade', 'Aucun trade déclenché sur cette période.')}
              Les conditions d'entrée n'ont jamais été simultanément vérifiées sur les
              <strong style="color:var(--text)">${equity?.length ?? 0}</strong> bougies analysées.
            </div>
          </div>
        </div>

        ${this.#tplConditionSummary(config)}

        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">
            Courbe equity — Aucune position ouverte
          </div>
          <canvas id="bt-equity-canvas" height="70"
                  style="width:100%;display:block;border:1px solid var(--border);
                         border-radius:6px;background:rgba(0,0,0,.25);"
                  aria-label="Courbe equity"></canvas>
        </div>

        <div style="font-size:9px;color:var(--muted);line-height:1.8;
                    padding:10px 14px;background:rgba(255,255,255,.02);border-radius:6px;
                    border:1px solid var(--border);">
          💡 <strong style="color:var(--text)">Conseils :</strong><br>
          • Essayez avec la logique <strong>OU</strong> pour des conditions plus souples<br>
          • Augmentez le nombre de bougies (changez de timeframe ou de paire)<br>
          • Utilisez des conditions qui se déclenchent plus fréquemment (ex: RSI seul)<br>
          • Vérifiez que le timeframe a assez de bougies pour calculer les indicateurs (min. 60)
        </div>`;
    }

    const color  = metrics.totalPnlPct >= 0 ? 'var(--green)' : 'var(--red)';
    const trades_ = Array.isArray(trades) ? trades : [];

    const box = (lbl, val, c = 'var(--text)') =>
      `<div style="background:rgba(255,255,255,.02);border:1px solid var(--border);
                   border-radius:6px;padding:10px 12px;">
         <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px;">${lbl}</div>
         <div style="font-size:14px;font-family:'Syne',sans-serif;font-weight:800;color:${c};">${val}</div>
       </div>`;

    const totalPnlPct  = typeof metrics.totalPnlPct  === 'number' ? `${metrics.totalPnlPct >= 0 ? '+' : ''}${metrics.totalPnlPct}%` : '—';
    const winRateStr   = typeof metrics.winRate       === 'number' ? `${metrics.winRate}%` : '—';
    const maxDDStr     = typeof metrics.maxDrawdown   === 'number' ? `${metrics.maxDrawdown}%` : '—';
    const sharpeStr    = typeof metrics.sharpe        === 'number' ? `${metrics.sharpe}` : '—';
    const pfStr        = typeof metrics.profitFactor  === 'number' ? `${metrics.profitFactor}` : '—';
    const avgWinStr    = typeof metrics.avgWin        === 'number' ? `+${metrics.avgWin} $` : '—';
    const avgLossStr   = typeof metrics.avgLoss       === 'number' ? `-${metrics.avgLoss} $` : '—';

    const lastTradesLbl = (() => {
      try {
        const k = t('backtest.lastTrades', { n: trades_.length });
        return (k && k !== 'backtest.lastTrades') ? k : `${trades_.length} total · affichage des 20 derniers`;
      } catch (_) {
        return `${trades_.length} trades · derniers 20 affichés`;
      }
    })();

    const noTradeLbl = this.#tr('backtest.noTrade', 'Aucun trade déclenché sur cette période.');

    const tradeRows = trades_.slice(-20).reverse().map(tr => {
      const c    = tr.pnl >= 0 ? 'var(--green)' : 'var(--red)';
      const icon = tr.reason === 'sl' ? '🛑' : tr.reason === 'tp' ? '🎯' : '📤';
      const dt   = new Date((tr.entryTime ?? 0) * 1_000).toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
      const entryStr = typeof tr.entry === 'number' ? tr.entry.toFixed(2) : '—';
      const exitStr  = typeof tr.exit  === 'number' ? tr.exit.toFixed(2)  : '—';
      const pnlStr   = typeof tr.pnl   === 'number'
        ? `${tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)} $`
        : '—';
      return `<tr style="border-bottom:1px solid rgba(28,35,51,.5);font-size:10px;">
        <td style="padding:5px 8px;color:var(--muted);">${dt}</td>
        <td style="padding:5px 8px;">${icon} ${(tr.reason ?? '').toUpperCase()}</td>
        <td style="padding:5px 8px;text-align:right;">${entryStr}</td>
        <td style="padding:5px 8px;text-align:right;">${exitStr}</td>
        <td style="padding:5px 8px;text-align:right;color:${c};font-weight:700;">${pnlStr}</td>
      </tr>`;
    }).join('');

    return `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
        ${box(this.#tr('backtest.metrics.totalPnl',  'P&L Total'),       totalPnlPct, color)}
        ${box(this.#tr('backtest.metrics.trades',    'Trades'),           metrics.trades ?? '—')}
        ${box(this.#tr('backtest.metrics.winRate',   'Win Rate'),         winRateStr,  metrics.winRate >= 50 ? 'var(--green)' : 'var(--red)')}
        ${box(this.#tr('backtest.metrics.profitFactor','Profit Factor'),  pfStr,       (metrics.profitFactor ?? 0) >= 1 ? 'var(--green)' : 'var(--red)')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;">
        ${box(this.#tr('backtest.metrics.maxDD',     'Max Drawdown'),   maxDDStr,   (metrics.maxDrawdown ?? 0) > 15 ? 'var(--red)' : 'var(--muted)')}
        ${box(this.#tr('backtest.metrics.sharpe',    'Sharpe'),         sharpeStr,  (metrics.sharpe ?? 0) >= 1 ? 'var(--green)' : 'var(--muted)')}
        ${box(this.#tr('backtest.metrics.avgWin',    'Gain moyen'),     avgWinStr,  'var(--green)')}
        ${box(this.#tr('backtest.metrics.avgLoss',   'Perte moy.'),     avgLossStr, 'var(--red)')}
      </div>

      <!-- ── Coûts (frais + slippage) ─────────────────────── -->
      ${this.#tplResultsCostSection(metrics)}

      <canvas id="bt-equity-canvas" height="90"
              style="width:100%;display:block;border:1px solid var(--border);
                     border-radius:6px;background:rgba(0,0,0,.25);margin-bottom:12px;"
              aria-label="Courbe equity"></canvas>

      <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;">
        ${lastTradesLbl}
      </div>
      <div style="overflow-y:auto;max-height:180px;border:1px solid var(--border);border-radius:6px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--panel);font-size:9px;color:var(--muted);position:sticky;top:0;z-index:1;">
              <th style="padding:5px 8px;text-align:left;font-weight:400;">Date</th>
              <th style="padding:5px 8px;font-weight:400;">Action</th>
              <th style="padding:5px 8px;text-align:right;font-weight:400;">Entrée</th>
              <th style="padding:5px 8px;text-align:right;font-weight:400;">Sortie</th>
              <th style="padding:5px 8px;text-align:right;font-weight:400;">P&L</th>
            </tr>
          </thead>
          <tbody>
            ${tradeRows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:var(--muted);font-size:10px;">${noTradeLbl}</td></tr>`}
          </tbody>
        </table>
      </div>`;
  }

  /**
   * @param {object|null} config
   */
  #tplConditionSummary(config) {
    if (!config) return '';

    const fmt = (conds, logic) => {
      if (!conds?.length) return '<em style="color:var(--muted)">—</em>';
      const op = `<span style="color:var(--cyan);font-size:8px;padding:0 4px;">
        ${logic === 'OR' ? 'OU' : 'ET'}
      </span>`;
      return conds.map((c, i) => {
        const meta = SIGNAL_TYPES.find(s => s.id === c.type);
        const label = meta
          ? this.#tr(`backtest.signals.${c.type}`, meta.label)
          : c.type;
        const val = (meta?.hasValue !== false && c.value != null)
          ? ` <strong style="color:var(--text)">${c.value}</strong>`
          : '';
        return `${i > 0 ? op : ''}<span style="background:rgba(0,200,255,.07);
          border:1px solid rgba(0,200,255,.2);border-radius:3px;
          padding:2px 6px;font-size:9px;color:#00c8ff;">${label}${val}</span>`;
      }).join('');
    };

    return `
      <div style="margin-top:14px;padding:10px 14px;background:rgba(255,255,255,.02);
                  border:1px solid var(--border);border-radius:6px;text-align:left;">
        <div style="font-size:8px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:.8px;margin-bottom:8px;">Conditions évaluées</div>
        <div style="margin-bottom:6px;">
          <span style="font-size:9px;color:var(--accent);margin-right:8px;">📈 Entrée</span>
          ${fmt(config.entryConditions, config.entryLogic)}
        </div>
        <div>
          <span style="font-size:9px;color:var(--red);margin-right:8px;">📉 Sortie</span>
          ${fmt(config.exitConditions, config.exitLogic)}
        </div>
      </div>`;
  }

  #tplResultsCostSection(metrics) {
    if (!metrics || metrics.error) return '';
    const fees  = metrics.totalFees     ?? 0;
    const slip  = metrics.totalSlippage ?? 0;
    const drag  = metrics.costDrag      ?? 0;
    const gross = metrics.totalPnlGross ?? metrics.totalPnl ?? 0;
    const net   = metrics.totalPnl      ?? 0;
    const color = drag > 10 ? 'var(--red)' : drag > 5 ? 'var(--yellow)' : 'var(--muted)';

    if (fees === 0 && slip === 0) return '';

    const box = (lbl, val, c = 'var(--text)') =>
      `<div style="background:rgba(255,255,255,.02);border:1px solid var(--border);
                   border-radius:6px;padding:10px 12px;">
         <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:3px;">${lbl}</div>
         <div style="font-size:14px;font-family:'Syne',sans-serif;font-weight:800;color:${c};">${val}</div>
       </div>`;

    return `
      <div style="margin-bottom:10px;padding:10px 14px;
                  background:rgba(255,255,255,.015);border:1px solid var(--border);
                  border-radius:6px;">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:.8px;margin-bottom:8px;">
          💸 Impact frais &amp; slippage
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:8px;">
          ${box('Frais totaux',  '-' + fees.toFixed(2) + ' $', 'var(--red)')}
          ${box('Slippage tot.', '-' + slip.toFixed(2) + ' $', 'var(--yellow)')}
          ${box('Drag capital',  drag.toFixed(3) + ' %',       color)}
          ${box('P&L brut vs net',
            gross.toFixed(2) + ' → ' + net.toFixed(2) + ' $',
            net < gross ? 'var(--yellow)' : 'var(--text)')}
        </div>
        ${drag > 10
          ? '<div style="font-size:9px;color:var(--red);padding:5px 8px;background:rgba(255,61,90,.07);border-radius:4px;border:1px solid rgba(255,61,90,.25);">🔴 Drag > 10% — les frais mangent une part significative de vos gains. Réduisez la fréquence de trading ou utilisez des ordres limit.</div>'
          : drag > 5
          ? '<div style="font-size:9px;color:var(--yellow);padding:5px 8px;background:rgba(247,201,72,.07);border-radius:4px;border:1px solid rgba(247,201,72,.25);">🟡 Drag 5–10% — coûts modérés. Envisagez les ordres limit pour réduire le slippage.</div>'
          : '<div style="font-size:9px;color:var(--green);padding:5px 8px;background:rgba(0,255,136,.07);border-radius:4px;border:1px solid rgba(0,255,136,.2);">✅ Coûts maîtrisés — la structure de frais est raisonnable pour cette stratégie.</div>'}
      </div>`;
  }

  #drawEquityCurve(equity) {
    const canvas = document.getElementById('bt-equity-canvas');
    if (!canvas) return;

    const W = canvas.offsetWidth || 400;
    canvas.width = W;
    const H   = parseInt(canvas.getAttribute('height') ?? '90');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!equity?.length || equity.length < 2) {
      const y = H / 2;
      ctx.strokeStyle = 'rgba(139,148,158,.4)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font      = '9px Space Mono,monospace';
      ctx.fillStyle = 'var(--muted, #8b949e)';
      ctx.textAlign = 'center';
      ctx.fillText('Aucune position — solde inchangé', W / 2, y - 6);
      return;
    }

    const values = equity.map(p => (typeof p.value === 'number' ? p.value : 10_000));
    const minV   = Math.min(...values);
    const maxV   = Math.max(...values);
    const range  = maxV - minV || 1;
    const initial = values[0];

    const y0 = H - 8 - ((initial - minV) / range) * (H - 16);
    ctx.strokeStyle = 'rgba(139,148,158,.25)';
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(W, y0);
    ctx.stroke();
    ctx.setLineDash([]);

    const xs  = values.map((_, i) => (i / (values.length - 1)) * W);
    const ys  = values.map(v => H - 8 - ((v - minV) / range) * (H - 16));
    const up  = values.at(-1) >= initial;
    const col = up ? '#00ff88' : '#ff3d5a';

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, up ? 'rgba(0,255,136,.18)' : 'rgba(255,61,90,.18)');
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
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.8;
    ctx.stroke();
  }

  #bindStaticEvents() {
    document.getElementById('backtest-close')
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

    ['strategy', 'results'].forEach(tab => {
      document.getElementById(`bt-tab-${tab}`)
        ?.addEventListener('click', () => this.#switchTab(tab));
    });
  }
}
