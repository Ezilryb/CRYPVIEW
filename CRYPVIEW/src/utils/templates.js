// ============================================================
//  src/utils/templates.js — CrypView V3.1
//  Injection dynamique des blocs HTML partagés.
//
//  Changements V3 :
//    - AlertPriceModal   → AlertBuilderModal  (multi-conditions)
//    - AlertListModal    → AlertCenterModal   (onglets Active/Historique)
//  Changements V3.1 :
//    - Ajout Modal Market Screener
//    - Ajout item ctx-menu "Market Screener"
//  Changements V3.2 :
//    - ctx-open-screener & ctx-open-profiles déplacés du menu principal → sub-ind
// ============================================================

export function mountSharedModals(config = {}) {
  if (document.getElementById('ctx-menu')) return;

  const { hide = [] } = config;

  const tpl = document.createElement('template');
  tpl.innerHTML = `

<div id="profile-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Profils et Presets">
  <div class="modal-box modal-box--profiles">
    <div class="modal-header">
      <div class="modal-title">📁 Profils &amp; Presets</div>
      <button id="profile-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="profile-tab-presets"
              role="tab" aria-selected="true">⚡ Presets</button>
      <button class="ind-tab" id="profile-tab-custom"
              role="tab" aria-selected="false">
        💾 Mes profils <span class="tab-badge" style="margin-left:4px">0</span>
      </button>
    </div>
    <div id="profile-modal-grid"
         style="flex:1;overflow-y:auto;padding:14px 16px;
                display:grid;grid-template-columns:1fr 1fr;gap:10px;
                align-content:start;scrollbar-width:thin;max-height:58vh;">
    </div>
    <div id="profile-modal-footer-actions" style="padding:10px 16px 14px;flex-shrink:0;"></div>
  </div>
</div>

<!-- ── Menu contextuel ───────────────────────────────────── -->
<nav id="ctx-menu" role="menu" aria-label="Menu du graphique">
  <div class="ctx-chart-label" id="ctx-chart-label" aria-hidden="true">Chart —</div>
  <div class="ctx-cat" id="cat-ind" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">📈</span> Indicators</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-cat" id="cat-multi" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">🔲</span> Multi-Charts</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-cat" id="cat-draw" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">✏️</span> Drawing Tools</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-cat" id="cat-alerts" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">🔔</span> Alerts</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-paper-trading" role="menuitem">
    <span style="font-size:13px">📈</span><span style="width:6px"></span>Paper Trading
  </div>
  <div class="ctx-item" id="ctx-open-backtest" role="menuitem">
    <span style="font-size:13px">🧪</span><span style="width:6px"></span>Backtesting
  </div>
  <div class="ctx-item" id="ctx-open-export" role="menuitem">
    <span style="font-size:13px">📤</span><span style="width:6px"></span>Export &amp; Partage
  </div>
  <div class="ctx-item" id="ctx-open-settings" role="menuitem">
    <span style="font-size:13px">⚙️</span><span style="width:6px"></span>Settings
  </div>
</nav>

<!-- ── Sous-panneau : Indicateurs ────────────────────────── -->
<div class="ctx-sub" id="sub-ind" role="menu" aria-label="Indicateurs">
  <div class="ctx-sub-title">📈 Indicateurs</div>
  <div class="ctx-item" id="ctx-open-ind-modal" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">⊞</div>
    <div style="width:8px"></div>Choisir les indicateurs…
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item ctx-danger" id="ctx-remove-all" role="menuitem">
    <div style="width:14px"></div><div style="width:8px"></div>Retirer tous les indicateurs
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-screener" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">🔍</div>
    <div style="width:8px"></div>Market Screener
  </div>
  <div class="ctx-item" id="ctx-open-profiles" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">📁</div>
    <div style="width:8px"></div>Profils &amp; Presets
  </div>
</div>

<!-- ── Sous-panneau : Multi-Charts ───────────────────────── -->
<div class="ctx-sub" id="sub-multi" role="menu" aria-label="Vues multi-graphiques">
  <div class="ctx-sub-title">🔲 Multi-graphiques</div>
  <div class="ctx-item" id="ctx-back-single" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00ff88"></div>1 Chart (vue simple)
  </div>
  <div class="ctx-item" id="ctx-multi2" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00c8ff"></div>2 Charts
  </div>
  <div class="ctx-item" id="ctx-multi4" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#ff6eb4"></div>4 Charts
  </div>
</div>

<!-- ── Sous-panneau : Drawing Tools ──────────────────────── -->
<div class="ctx-sub" id="sub-draw" role="menu" aria-label="Outils de dessin">
  <div class="ctx-sub-title">✏️ Drawing Tools</div>
  <div class="ctx-item" data-tool="trendline" role="menuitem"><div class="ctx-check"></div><span>📏</span> Trendline</div>
  <div class="ctx-item" data-tool="fibonacci" role="menuitem"><div class="ctx-check"></div><span>🌀</span> Fibonacci</div>
  <div class="ctx-item" data-tool="zone"      role="menuitem"><div class="ctx-check"></div><span>🟦</span> Zone horizontale</div>
  <div class="ctx-item" data-tool="rectangle" role="menuitem"><div class="ctx-check"></div><span>▭</span>  Rectangle</div>
  <div class="ctx-item" data-tool="pitchfork" role="menuitem"><div class="ctx-check"></div><span>⑂</span>  Pitchfork</div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item ctx-danger" id="ctx-clear-draws" role="menuitem">
    <div style="width:14px"></div><span>🗑</span> Effacer tous les tracés
  </div>
</div>

<!-- ── Sous-panneau : Alertes ────────────────────────────── -->
<div class="ctx-sub" id="sub-alerts" role="menu" aria-label="Alertes de prix">
  <div class="ctx-sub-title">🔔 Price Alerts</div>
  <div class="ctx-item" id="ctx-add-alert" role="menuitem">
    <div style="width:14px;text-align:center">🎯</div>
    <div style="width:8px"></div>Nouvelle alerte…
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-manage-alerts" role="menuitem">
    <div style="width:14px;text-align:center">📋</div>
    <div style="width:8px"></div>Centre d'alertes
  </div>
</div>

<!-- ── Modal indicateurs ───────────────────────────────────── -->
<div id="ind-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Sélection des indicateurs">
  <div id="ind-modal" class="modal-box modal-box--ind">
    <div class="modal-header">
      <div class="modal-title">📈 Indicateurs</div>
      <button id="ind-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-search-wrap">
      <input id="ind-search" type="text" placeholder="Rechercher un indicateur…"
             autocomplete="off" aria-label="Rechercher un indicateur">
    </div>
    <div id="ind-tabs" class="modal-tabs" role="tablist">
      <button class="ind-tab active" data-cat="all"        role="tab" aria-selected="true">Tous</button>
      <button class="ind-tab"        data-cat="trend"      role="tab" aria-selected="false">Tendance</button>
      <button class="ind-tab"        data-cat="momentum"   role="tab" aria-selected="false">Momentum</button>
      <button class="ind-tab"        data-cat="volatility" role="tab" aria-selected="false">Volatilité</button>
      <button class="ind-tab"        data-cat="volume"     role="tab" aria-selected="false">Volume</button>
    </div>
    <div id="ind-modal-grid" class="modal-grid" role="list"></div>
    <div id="ind-modal-footer" class="modal-footer">
      <span id="ind-active-count">0 indicateur actif</span>
      <button id="ind-modal-remove-all" class="modal-btn-danger"
              aria-label="Retirer tous les indicateurs">Tout retirer</button>
    </div>
  </div>
</div>

<!-- ── Modal paramètres ─────────────────────────────────────── -->
<div id="settings-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Paramètres">
  <div id="settings-modal" class="modal-box modal-box--settings">
    <div class="modal-header">
      <div class="modal-title">⚙️ Paramètres</div>
      <button id="settings-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-section-label">Apparence</div>
    <div id="settings-modal-grid" class="modal-settings-grid"></div>
  </div>
</div>

<!-- ── Modal Constructeur d'alertes avancé ───────────────────── -->
<style>
  @keyframes fadeCondIn {
    from { opacity:0; transform:translateY(-4px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .modal-box--profiles { width: 640px; max-height: 88vh; }
  .modal-box--workspaces {
    width: 640px;
    max-height: 88vh;
  }
  .modal-box--alert-builder { width:520px; max-height:88vh; }
  .modal-box--alert-center  { width:480px; max-height:88vh; }
  .ab-section-label {
    font-size:9px; color:var(--muted); text-transform:uppercase;
    letter-spacing:1.2px; margin-bottom:6px; display:block;
  }
  .ab-field {
    width:100%; background:var(--bg); border:1px solid var(--border);
    color:var(--text); padding:7px 10px;
    font-family:'Space Mono',monospace; font-size:11px;
    border-radius:4px; outline:none; transition:border-color .15s;
  }
  .ab-field:focus { border-color:var(--accent); }
  .ab-behavior-row {
    display:flex; align-items:center; gap:10px;
    font-size:10px; color:var(--muted);
  }
  .ab-behavior-row label { display:flex; align-items:center; gap:6px; cursor:pointer; }
  .ab-toggle {
    appearance:none; -webkit-appearance:none;
    width:28px; height:15px; background:var(--border);
    border-radius:10px; cursor:pointer; transition:background .2s;
    position:relative; flex-shrink:0;
  }
  .ab-toggle::after {
    content:''; position:absolute; left:2px; top:2px;
    width:11px; height:11px; background:#fff;
    border-radius:50%; transition:transform .2s;
  }
  .ab-toggle:checked { background:var(--accent); }
  .ab-toggle:checked::after { transform:translateX(13px); }

  /* ── Market Screener ─────────────────────────────────────── */
  .modal-box--screener {
    width:860px; max-width:96vw;
    max-height:88vh;
    display:flex; flex-direction:column;
  }
  .scr-tabs {
    display:flex; gap:0; overflow-x:auto;
    scrollbar-width:none; border-bottom:1px solid var(--border);
    flex-shrink:0;
  }
  .scr-tabs::-webkit-scrollbar { display:none; }
  .scr-tab {
    display:flex; align-items:center; gap:5px;
    padding:9px 14px; background:none; border:none;
    border-bottom:2px solid transparent;
    color:var(--muted); font-family:'Space Mono',monospace;
    font-size:10px; cursor:pointer; white-space:nowrap;
    transition:color .15s, border-color .15s;
    letter-spacing:.3px;
  }
  .scr-tab:hover  { color:var(--text); }
  .scr-tab.active { color:var(--accent); border-bottom-color:var(--accent); }
  .tab-badge {
    font-size:8px; padding:1px 5px; border-radius:3px;
    background:rgba(139,148,158,.15); color:var(--muted);
    min-width:20px; text-align:center;
  }
  .scr-tab.active .tab-badge { background:rgba(0,255,136,.12); color:var(--accent); }
  .scr-toolbar {
    display:flex; align-items:center; gap:8px;
    padding:8px 16px; border-bottom:1px solid var(--border);
    flex-shrink:0;
  }
  #screener-search {
    flex:1; background:var(--bg); border:1px solid var(--border);
    color:var(--text); padding:6px 10px;
    font-family:'Space Mono',monospace; font-size:11px;
    border-radius:4px; outline:none; transition:border-color .15s;
    text-transform:uppercase;
  }
  #screener-search:focus { border-color:var(--accent); }
  #screener-search::placeholder { text-transform:none; color:var(--muted); }
  .scr-meta {
    display:flex; align-items:center; gap:10px;
    font-size:9px; color:var(--muted); white-space:nowrap; flex-shrink:0;
  }
  #screener-refresh {
    background:rgba(0,255,136,.07); border:1px solid rgba(0,255,136,.2);
    color:var(--accent); padding:5px 10px;
    font-family:'Space Mono',monospace; font-size:9px;
    border-radius:4px; cursor:pointer; transition:all .15s;
    letter-spacing:.3px;
  }
  #screener-refresh:hover { background:rgba(0,255,136,.15); }
  #screener-loader {
    flex:1; display:flex; align-items:center; justify-content:center;
    gap:10px; font-size:12px; color:var(--muted);
  }
  #screener-table-wrap {
    flex:1; overflow-y:auto; overflow-x:auto;
    scrollbar-width:thin;
  }
  #screener-table-wrap::-webkit-scrollbar { width:4px; }
  #screener-table-wrap::-webkit-scrollbar-thumb { background:var(--border); }
  .scr-table {
    width:100%; border-collapse:collapse;
    font-size:11px;
  }
  .scr-th {
    position:sticky; top:0; z-index:2;
    padding:8px 12px; background:var(--panel);
    border-bottom:1px solid var(--border);
    color:var(--muted); font-family:'Space Mono',monospace;
    font-size:9px; text-transform:uppercase; letter-spacing:.8px;
    cursor:pointer; white-space:nowrap; user-select:none;
    transition:color .12s;
  }
  .scr-th:hover { color:var(--text); }
  .scr-th--active { color:var(--accent); }
  .scr-th--left  { text-align:left; }
  .scr-th--right { text-align:right; }
  .scr-row {
    border-bottom:1px solid rgba(28,35,51,.5);
    cursor:pointer; transition:background .1s;
  }
  .scr-row:hover { background:rgba(0,255,136,.05) !important; }
  .scr-td { padding:7px 12px; }
  .scr-td--left  { text-align:left; }
  .scr-td--right { text-align:right; }
  .scr-td:first-child { font-weight:700; color:var(--accent); font-family:'Syne',sans-serif; }
  .scr-quote { color:var(--muted); font-size:9px; font-family:'Space Mono',monospace; font-weight:400; }
  .scr-up { color:var(--green); }
  .scr-dn { color:var(--red); }
  .scr-empty { padding:32px; text-align:center; color:var(--muted); font-size:11px; }
  .scr-bar-wrap {
    display:inline-block; width:60px; height:5px;
    background:rgba(139,148,158,.15); border-radius:3px;
    overflow:hidden; vertical-align:middle;
  }
  .scr-bar-fill {
    display:block; height:100%; border-radius:3px;
    transition:width .2s;
  }

  /* ── Export & Partage ───────────────────────────────────── */
  .modal-box--export { width: 480px; max-height: 82vh; }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Paper Trading ──────────────────────────────────────── */
  .modal-box--paper-trading { width: 720px; max-height: 88vh; }
  .modal-box--backtest      { width: 780px; max-height: 92vh; }
</style>

<div id="alert-builder-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Créer une alerte avancée">
  <div id="alert-builder-modal" class="modal-box modal-box--alert-builder">

    <!-- Header -->
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔔 Nouvelle alerte</div>
        <span id="alert-builder-sym"
              style="font-size:12px;color:var(--accent);font-weight:700;letter-spacing:.04em;"></span>
      </div>
      <button id="alert-builder-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <!-- Corps scrollable -->
    <div style="flex:1;overflow-y:auto;padding:12px 18px;display:flex;flex-direction:column;gap:12px;">

      <!-- Nom -->
      <div>
        <span class="ab-section-label">Nom (optionnel)</span>
        <input id="alert-builder-name" class="ab-field" type="text"
               placeholder="ex: BTC résistance 70k, RSI survente…"
               autocomplete="off" aria-label="Nom de l'alerte">
      </div>

      <!-- Conditions -->
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span class="ab-section-label" style="margin-bottom:0;">Condition(s)</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <select id="alert-builder-logic"
                    style="background:var(--bg);border:1px solid var(--border);color:var(--muted);
                           padding:4px 7px;font-family:'Space Mono',monospace;font-size:9px;
                           border-radius:4px;outline:none;cursor:pointer;"
                    aria-label="Logique des conditions">
              <option value="AND">TOUTES (ET)</option>
              <option value="OR">L'UNE (OU)</option>
            </select>
            <button id="alert-builder-add-cond"
                    style="background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.25);
                           color:var(--accent);padding:4px 10px;font-family:'Space Mono',monospace;
                           font-size:9px;border-radius:4px;cursor:pointer;transition:all .15s;
                           letter-spacing:.4px;"
                    aria-label="Ajouter une condition">+ Ajouter</button>
          </div>
        </div>
        <div id="alert-builder-conditions"></div>
      </div>

      <!-- Options avancées (accordéon) -->
      <div>
        <button id="alert-builder-behavior-toggle"
                style="background:none;border:none;color:var(--muted);font-family:'Space Mono',monospace;
                       font-size:10px;cursor:pointer;padding:0;letter-spacing:.04em;transition:color .15s;"
                aria-expanded="false">⚙ Options avancées ▸</button>
        <div id="alert-builder-behavior"
             style="display:none;margin-top:10px;padding:10px;
                    background:rgba(255,255,255,.02);border:1px solid var(--border);
                    border-radius:6px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <!-- Répéter -->
            <div class="ab-behavior-row">
              <label>
                <input type="checkbox" id="ab-repeat" class="ab-toggle"
                       aria-label="Répéter l'alerte">
                <span>Répéter l'alerte</span>
              </label>
            </div>
            <!-- Cooldown -->
            <div class="ab-behavior-row" id="ab-cooldown-row" style="display:none;">
              <span style="flex-shrink:0;">Cooldown :</span>
              <select id="ab-cooldown" class="ab-field"
                      style="width:auto;padding:4px 8px;font-size:10px;"
                      aria-label="Durée de cooldown">
                <option value="1">1 min</option>
                <option value="5" selected>5 min</option>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 heure</option>
                <option value="240">4 heures</option>
              </select>
              <span style="color:var(--muted);font-size:9px;">entre déclenchements</span>
            </div>
            <!-- Max déclenchements -->
            <div class="ab-behavior-row" id="ab-maxtrig-row" style="display:none;">
              <span style="flex-shrink:0;">Limite :</span>
              <select id="ab-max-triggers" class="ab-field"
                      style="width:auto;padding:4px 8px;font-size:10px;"
                      aria-label="Nombre maximum de déclenchements">
                <option value="0">Illimitée</option>
                <option value="1">1 fois</option>
                <option value="3">3 fois</option>
                <option value="5">5 fois</option>
                <option value="10">10 fois</option>
              </select>
            </div>
            <!-- Expiration -->
            <div class="ab-behavior-row">
              <span style="flex-shrink:0;">Expiration :</span>
              <select id="ab-expiration" class="ab-field"
                      style="width:auto;padding:4px 8px;font-size:10px;"
                      aria-label="Durée avant expiration de l'alerte">
                <option value="0">Jamais</option>
                <option value="60">1 heure</option>
                <option value="480">8 heures</option>
                <option value="1440">24 heures</option>
                <option value="10080">7 jours</option>
                <option value="43200">30 jours</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Aperçu -->
      <div id="alert-builder-preview"
           style="font-size:10px;color:var(--muted);line-height:1.6;min-height:18px;
                  letter-spacing:.03em;padding:6px 8px;background:rgba(255,255,255,.02);
                  border-radius:4px;border-left:2px solid var(--border);">
      </div>

    </div>

    <!-- Footer -->
    <div class="modal-footer" style="gap:10px;">
      <button id="alert-builder-cancel"
              style="background:transparent;border:1px solid var(--border);color:var(--muted);
                     padding:8px 16px;font-family:'Space Mono',monospace;font-size:10px;
                     border-radius:4px;cursor:pointer;transition:all .15s;"
              aria-label="Annuler">Annuler</button>
      <button id="alert-builder-confirm"
              style="background:var(--accent);color:var(--bg);border:none;padding:8px 24px;
                     font-family:'Space Mono',monospace;font-size:11px;border-radius:4px;
                     cursor:pointer;font-weight:700;transition:background .15s;letter-spacing:.04em;"
              aria-label="Créer l'alerte">🔔 Créer l'alerte</button>
    </div>

  </div>
</div>

<!-- ── Modal Centre d'alertes ─────────────────────────────────── -->
<div id="alert-center-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Centre d'alertes">
  <div id="alert-center-modal" class="modal-box modal-box--alert-center">

    <!-- Header -->
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔔 Centre d'alertes</div>
        <span id="alert-center-count"
              style="font-size:11px;font-weight:700;color:var(--muted);"></span>
      </div>
      <button id="alert-center-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <!-- Onglets -->
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="alert-center-tab-active"
              role="tab" aria-selected="true"   data-tab="active">Actives</button>
      <button class="ind-tab"        id="alert-center-tab-history"
              role="tab" aria-selected="false"  data-tab="history">Historique</button>
    </div>

    <!-- Contenu -->
    <div id="alert-center-content"
         style="flex:1;overflow-y:auto;min-height:180px;max-height:420px;scrollbar-width:thin;">
    </div>

    <!-- Footer -->
    <div class="modal-footer">
      <span id="alert-center-stats" style="font-size:10px;color:var(--muted);"></span>
      <button id="alert-center-action-btn" class="modal-btn-danger" style="display:none;"
              aria-label="Action sur les alertes"></button>
    </div>

  </div>
</div>

<!-- ── Modal Market Screener ─────────────────────────────────── -->
<div id="screener-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Market Screener">
  <div class="modal-box modal-box--screener">
    <!-- Header -->
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔍 Market Screener</div>
        <span id="screener-count" style="font-size:10px;color:var(--muted);"></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span id="screener-ts" style="font-size:9px;color:var(--muted);"></span>
        <button id="screener-close" class="modal-close" aria-label="Fermer">✕</button>
      </div>
    </div>
    <!-- Onglets -->
    <div class="scr-tabs" role="tablist">
      <button class="scr-tab active" data-tab="all"      role="tab" aria-selected="true">🌐 Tous <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="gainers"  role="tab">🚀 Gainers <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="losers"   role="tab">📉 Losers <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="volume"   role="tab">🔊 Volume <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="breakout" role="tab">⚡ Breakout <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="extremes" role="tab">🌡 Extrêmes <span class="tab-badge">—</span></button>
      <button class="scr-tab"        data-tab="volatile" role="tab">🌪 Volatilité <span class="tab-badge">—</span></button>
    </div>
    <!-- Barre de recherche -->
    <div class="scr-toolbar">
      <input id="screener-search" type="text"
             placeholder="Filtrer par nom (ex: BTC, ETH…)"
             autocomplete="off" spellcheck="false"
             aria-label="Recherche de paire">
      <div class="scr-meta">
        <button id="screener-refresh" aria-label="Actualiser">↺ Actualiser</button>
      </div>
    </div>
    <!-- Loader -->
    <div id="screener-loader" style="display:flex;">
      <span style="font-size:18px">⏳</span> Chargement des données Binance…
    </div>
    <!-- Table -->
    <div id="screener-table-wrap" style="display:none;">
      <table class="scr-table" aria-label="Liste des paires">
        <thead id="screener-thead"></thead>
        <tbody id="screener-tbody"></tbody>
      </table>
    </div>
    <!-- Footer -->
    <div class="modal-footer" style="font-size:9px;color:var(--muted);letter-spacing:.5px;">
      Cliquez sur une ligne pour afficher la paire · données Binance 24h · Min. 500k USDT de volume
    </div>
  </div>
</div>

<!-- ── Barre d'outil drawing (flottante) ────────────────────── -->
<div id="draw-toolbar" aria-live="polite" aria-label="Outil de dessin actif">
  <span id="draw-toolbar-label">TRENDLINE — Cliquez 2 points</span>
  <span id="draw-toolbar-cancel" role="button" tabindex="0"
        title="Annuler (Échap)" aria-label="Annuler (Échap)">✕</span>
</div>

<!-- ── Modal Export & Partage ──────────────────────────────── -->
<div id="export-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Export et partage">
  <div class="modal-box modal-box--export">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">📤 Export &amp; Partage</div>
        <span id="export-modal-sym"
              style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:.04em;"></span>
      </div>
      <button id="export-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="export-tab-image"
              role="tab" aria-selected="true">📷 Image</button>
      <button class="ind-tab" id="export-tab-data"
              role="tab" aria-selected="false">📊 Données</button>
      <button class="ind-tab" id="export-tab-share"
              role="tab" aria-selected="false">🔗 Partage</button>
    </div>
    <div id="export-modal-content"
         style="flex:1;padding:16px 18px;overflow-y:auto;min-height:300px;">
    </div>
  </div>
</div>

<!-- ── Modal Paper Trading ──────────────────────────────── -->
<div id="paper-trading-overlay"
     class="modal-overlay"
     style="align-items:center;justify-content:center;"
     role="dialog" aria-modal="true" aria-label="Paper Trading">
  <div class="modal-box modal-box--paper-trading">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">📈 Paper Trading</div>
        <span style="font-size:9px;padding:2px 8px;border-radius:3px;
                     background:rgba(247,201,72,.12);color:#f7c948;
                     border:1px solid rgba(247,201,72,.3);letter-spacing:.5px;">SIMULATION</span>
      </div>
      <button id="paper-trading-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="pt-tab-portfolio" role="tab" aria-selected="true">💼 Portfolio</button>
      <button class="ind-tab"        id="pt-tab-order"     role="tab" aria-selected="false">📋 Ordre</button>
      <button class="ind-tab"        id="pt-tab-history"   role="tab" aria-selected="false">📜 Historique</button>
    </div>
    <div id="pt-content" style="flex:1;overflow-y:auto;padding:14px 16px;scrollbar-width:thin;"></div>
  </div>
</div>

<!-- ── Modal Backtester ──────────────────────────────────── -->
<div id="backtest-overlay"
     class="modal-overlay"
     style="align-items:center;justify-content:center;"
     role="dialog" aria-modal="true" aria-label="Backtesting">
  <div class="modal-box modal-box--backtest">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🧪 Backtesting</div>
        <span style="font-size:9px;padding:2px 8px;border-radius:3px;
                     background:rgba(224,64,251,.12);color:#e040fb;
                     border:1px solid rgba(224,64,251,.3);letter-spacing:.5px;">BETA</span>
      </div>
      <button id="backtest-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="bt-tab-strategy" role="tab" aria-selected="true">⚙ Stratégie</button>
      <button class="ind-tab"        id="bt-tab-results"  role="tab" aria-selected="false">📊 Résultats</button>
    </div>
    <div id="bt-content" style="flex:1;overflow-y:auto;padding:14px 16px;scrollbar-width:thin;"></div>
  </div>
</div>

<!-- ── Modal Workspaces ──────────────────────────────────── -->
<div id="workspace-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Espaces de travail">
  <div class="modal-box modal-box--workspaces">

    <!-- Header -->
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🗂 Workspaces</div>
        <span id="ws-modal-count"
              style="font-size:10px;color:var(--muted);font-weight:400;letter-spacing:.04em;"></span>
      </div>
      <button id="workspace-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <!-- Grille des workspaces -->
    <div id="ws-modal-grid"
         style="flex:1;overflow-y:auto;padding:14px 16px;
                display:grid;grid-template-columns:1fr 1fr;gap:10px;
                align-content:start;scrollbar-width:thin;max-height:55vh;">
    </div>

    <!-- Section sauvegarde -->
    <div id="ws-save-section"
         style="padding:12px 16px 14px;border-top:1px solid var(--border);flex-shrink:0;">
    </div>

  </div>
</div>

`;

  document.body.append(tpl.content);

  hide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}