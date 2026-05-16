// ============================================================
//  src/utils/templates.js — CrypView V3.2.1
//  Injection dynamique des blocs HTML partagés.
//
//  Fix i18n : toutes les chaînes codées en dur remplacées par t()
// ============================================================

import { t } from '../i18n/i18n.js';

export function mountSharedModals(config = {}) {
  if (document.getElementById('ctx-menu')) return;

  const { hide = [] } = config;

  const tpl = document.createElement('template');
  tpl.innerHTML = `

<div id="profile-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('profiles.title')}">
  <div class="modal-box modal-box--profiles">
    <div class="modal-header">
      <div class="modal-title">📁 ${t('profiles.title')}</div>
      <button id="profile-modal-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="profile-tab-presets" role="tab" aria-selected="true">⚡ ${t('profiles.tabPresets')}</button>
      <button class="ind-tab" id="profile-tab-custom" role="tab" aria-selected="false">
        💾 ${t('profiles.tabCustom')} <span class="tab-badge" style="margin-left:4px">0</span>
      </button>
    </div>
    <div id="profile-modal-grid"
         style="flex:1;overflow-y:auto;padding:14px 16px;
                display:grid;grid-template-columns:1fr 1fr;gap:10px;
                align-content:start;scrollbar-width:thin;max-height:58vh;"></div>
    <div id="profile-modal-footer-actions" style="padding:10px 16px 14px;flex-shrink:0;"></div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════
     MENU CONTEXTUEL
══════════════════════════════════════════════════════════ -->
<nav id="ctx-menu" role="menu" aria-label="${t('a11y.chartGrid')}">
  <div class="ctx-chart-label" id="ctx-chart-label" aria-hidden="true">Chart —</div>

  <!-- Indicateurs -->
  <div class="ctx-cat" id="cat-ind" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">📈</span> ${t('ctxMenu.indicators')}</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>

  <!-- Multi-Charts -->
  <div class="ctx-cat" id="cat-multi" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">🔲</span> ${t('ctxMenu.multiCharts')}</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>

  <!-- Drawing Tools -->
  <div class="ctx-cat" id="cat-draw" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">✏️</span> ${t('ctxMenu.drawingTools')}</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>

  <!-- Alerts -->
  <div class="ctx-cat" id="cat-alerts" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">🔔</span> ${t('ctxMenu.alerts')}</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
  <div class="ctx-sep" role="separator"></div>

  <!-- Outils -->
  <div class="ctx-cat" id="cat-tools" role="menuitem" aria-haspopup="true">
    <div class="ctx-cat-left"><span class="ctx-cat-icon" aria-hidden="true">🛠</span> ${t('ctxMenu.tools')}</div>
    <span class="ctx-cat-arrow" aria-hidden="true">▶</span>
  </div>
</nav>

<!-- ── Sous-panneau : Indicateurs ────────────────────────── -->
<div class="ctx-sub" id="sub-ind" role="menu" aria-label="${t('ctxMenu.indicators')}">
  <div class="ctx-sub-title">📈 ${t('ctxMenu.indicators')}</div>
  <div class="ctx-item" id="ctx-open-ind-modal" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">⊞</div>
    <div style="width:8px"></div>${t('ctxMenu.openIndModal')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item ctx-danger" id="ctx-remove-all" role="menuitem">
    <div style="width:14px"></div><div style="width:8px"></div>${t('ctxMenu.removeAllInd')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-screener" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">🔍</div>
    <div style="width:8px"></div>${t('ctxMenu.openScreener')}
  </div>
  <div class="ctx-item" id="ctx-open-profiles" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">📁</div>
    <div style="width:8px"></div>${t('ctxMenu.openProfiles')}
  </div>
</div>

<!-- ── Sous-panneau : Multi-Charts ───────────────────────── -->
<div class="ctx-sub" id="sub-multi" role="menu" aria-label="${t('ctxMenu.multiCharts')}">
  <div class="ctx-sub-title">🔲 ${t('ctxMenu.multiCharts')}</div>
  <div class="ctx-item" id="ctx-back-single" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00ff88"></div>${t('ctxMenu.backSingle')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-sub-title" style="font-size:8px;padding:4px 14px 2px;color:#5a6a80;">${t('ctxMenu.adjacentLabel')}</div>
  <div class="ctx-item" id="ctx-multi2" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00c8ff"></div>⬛ ${t('ctxMenu.multi2')}
  </div>
  <div class="ctx-item" id="ctx-multi4" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#ff6eb4"></div>🔲 ${t('ctxMenu.multi4')}
  </div>
  <div class="ctx-item" id="ctx-multi9" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#e040fb"></div>⊞ ${t('ctxMenu.multi9')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-sub-title" style="font-size:8px;padding:4px 14px 2px;color:#5a6a80;">${t('ctxMenu.verticalLabel')}</div>
  <div class="ctx-item" id="ctx-multiv2" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00c8ff"></div>${t('ctxMenu.multiv2')}
  </div>
  <div class="ctx-item" id="ctx-multiv3" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#ff9900"></div>${t('ctxMenu.multiv3')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-sub-title" style="font-size:8px;padding:4px 14px 2px;color:#5a6a80;">${t('ctxMenu.asymLabel')}</div>
  <div class="ctx-item" id="ctx-multi1p2" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#f7c948"></div>${t('ctxMenu.multi1p2')}
  </div>
  <div class="ctx-item" id="ctx-multi1p3" role="menuitem">
    <div style="width:14px"></div>
    <div class="ctx-color-dot" style="background:#00e5cc"></div>${t('ctxMenu.multi1p3')}
  </div>
</div>

<!-- ── Sous-panneau : Drawing Tools ──────────────────────── -->
<div class="ctx-sub" id="sub-draw" role="menu" aria-label="${t('ctxMenu.drawingTools')}">
  <div class="ctx-sub-title">✏️ ${t('ctxMenu.drawingTools')}</div>
  <div class="ctx-item" data-tool="trendline" role="menuitem"><div class="ctx-check"></div><span>📏</span> ${t('ctxMenu.trendline')}</div>
  <div class="ctx-item" data-tool="fibonacci" role="menuitem"><div class="ctx-check"></div><span>🌀</span> ${t('ctxMenu.fibonacci')}</div>
  <div class="ctx-item" data-tool="zone"      role="menuitem"><div class="ctx-check"></div><span>🟦</span> ${t('ctxMenu.zone')}</div>
  <div class="ctx-item" data-tool="rectangle" role="menuitem"><div class="ctx-check"></div><span>▭</span>  ${t('ctxMenu.rectangle')}</div>
  <div class="ctx-item" data-tool="pitchfork" role="menuitem"><div class="ctx-check"></div><span>⑂</span>  ${t('ctxMenu.pitchfork')}</div>
  <div class="ctx-item" data-tool="arrow"   role="menuitem"><div class="ctx-check"></div><span>➡️</span> ${t('ctxMenu.arrow')}</div>
  <div class="ctx-item" data-tool="text"    role="menuitem"><div class="ctx-check"></div><span>📝</span> ${t('ctxMenu.text')}</div>
  <div class="ctx-item" data-tool="measure" role="menuitem"><div class="ctx-check"></div><span>📐</span> ${t('ctxMenu.measure')}</div>
  <div class="ctx-item" data-tool="channel" role="menuitem"><div class="ctx-check"></div><span>▰</span>  ${t('ctxMenu.channel')}</div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item ctx-danger" id="ctx-clear-draws" role="menuitem">
    <div style="width:14px"></div><span>🗑</span> ${t('ctxMenu.clearDrawings')}
  </div>
</div>

<!-- ── Sous-panneau : Alertes ────────────────────────────── -->
<div class="ctx-sub" id="sub-alerts" role="menu" aria-label="${t('ctxMenu.alerts')}">
  <div class="ctx-sub-title">🔔 ${t('ctxMenu.alerts')}</div>
  <div class="ctx-item" id="ctx-add-alert" role="menuitem">
    <div style="width:14px;text-align:center">🎯</div>
    <div style="width:8px"></div>${t('ctxMenu.addAlert')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-manage-alerts" role="menuitem">
    <div style="width:14px;text-align:center">📋</div>
    <div style="width:8px"></div>${t('ctxMenu.manageAlerts')}
  </div>
</div>

<!-- ── Sous-panneau : Outils ─────────────────────────────── -->
<div class="ctx-sub" id="sub-tools" role="menu" aria-label="${t('ctxMenu.tools')}">
  <div class="ctx-sub-title">🛠 ${t('ctxMenu.tools')}</div>
  <div class="ctx-item" id="ctx-open-paper-trading" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">📈</div>
    <div style="width:8px"></div>${t('ctxMenu.paperTrading')}
  </div>
  <div class="ctx-item" id="ctx-open-backtest" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">🧪</div>
    <div style="width:8px"></div>${t('ctxMenu.backtest')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-export" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">📤</div>
    <div style="width:8px"></div>${t('ctxMenu.export')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-risk-calc" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">🧮</div>
    <div style="width:8px"></div>
    ${t('calc.title')}
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-open-settings" role="menuitem">
    <div style="width:14px;text-align:center;font-size:12px">⚙️</div>
    <div style="width:8px"></div>${t('ctxMenu.settings')}
  </div>
</div>

<!-- ── Modal indicateurs ───────────────────────────────────── -->
<div id="ind-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('indicators.title')}">
  <div id="ind-modal" class="modal-box modal-box--ind">
    <div class="modal-header">
      <div class="modal-title">📈 ${t('indicators.title')}</div>
      <button id="ind-modal-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-search-wrap">
      <input id="ind-search" type="text" placeholder="${t('indicators.search')}"
             autocomplete="off" aria-label="${t('indicators.search')}">
    </div>
    <div id="ind-tabs" class="modal-tabs" role="tablist">
      <button class="ind-tab active" data-cat="all"        role="tab" aria-selected="true">${t('indicators.tabs.all')}</button>
      <button class="ind-tab"        data-cat="trend"      role="tab" aria-selected="false">${t('indicators.tabs.trend')}</button>
      <button class="ind-tab"        data-cat="momentum"   role="tab" aria-selected="false">${t('indicators.tabs.momentum')}</button>
      <button class="ind-tab"        data-cat="volatility" role="tab" aria-selected="false">${t('indicators.tabs.volatility')}</button>
      <button class="ind-tab"        data-cat="volume"     role="tab" aria-selected="false">${t('indicators.tabs.volume')}</button>
    </div>
    <div id="ind-modal-grid" class="modal-grid" role="list"></div>
    <div id="ind-modal-footer" class="modal-footer">
      <span id="ind-active-count"></span>
      <button id="ind-modal-remove-all" class="modal-btn-danger"
              aria-label="${t('indicators.removeAll')}">${t('indicators.removeAll')}</button>
    </div>
  </div>
</div>

<!-- ── Modal paramètres ─────────────────────────────────────── -->
<div id="settings-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('settings.title')}">
  <div id="settings-modal" class="modal-box modal-box--settings">
    <div class="modal-header">
      <div class="modal-title">⚙️ ${t('settings.title')}</div>
      <button id="settings-modal-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-section-label">${t('settings.appearance')}</div>
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
  .modal-box--workspaces { width: 640px; max-height: 88vh; }
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
  .scr-table { width:100%; border-collapse:collapse; font-size:11px; }
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
  .scr-row { border-bottom:1px solid rgba(28,35,51,.5); cursor:pointer; transition:background .1s; }
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
  .scr-bar-fill { display:block; height:100%; border-radius:3px; transition:width .2s; }

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
     role="dialog" aria-modal="true" aria-label="${t('alerts.newAlert')}">
  <div id="alert-builder-modal" class="modal-box modal-box--alert-builder">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔔 ${t('alerts.newAlert')}</div>
        <span id="alert-builder-sym"
              style="font-size:12px;color:var(--accent);font-weight:700;letter-spacing:.04em;"></span>
      </div>
      <button id="alert-builder-close" class="modal-close" aria-label="${t('alerts.cancel')}">✕</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:12px 18px;display:flex;flex-direction:column;gap:12px;">
      <div>
        <span class="ab-section-label">${t('alerts.name')}</span>
        <input id="alert-builder-name" class="ab-field" type="text"
               placeholder="${t('alerts.namePlaceholder')}"
               autocomplete="off" aria-label="${t('alerts.name')}">
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span class="ab-section-label" style="margin-bottom:0;">${t('alerts.conditions')}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <select id="alert-builder-logic"
                    style="background:var(--bg);border:1px solid var(--border);color:var(--muted);
                           padding:4px 7px;font-family:'Space Mono',monospace;font-size:9px;
                           border-radius:4px;outline:none;cursor:pointer;"
                    aria-label="${t('alerts.conditions')}">
              <option value="AND">${t('alerts.allConditions')}</option>
              <option value="OR">${t('alerts.anyCondition')}</option>
            </select>
            <button id="alert-builder-add-cond"
                    style="background:rgba(0,255,136,.08);border:1px solid rgba(0,255,136,.25);
                           color:var(--accent);padding:4px 10px;font-family:'Space Mono',monospace;
                           font-size:9px;border-radius:4px;cursor:pointer;transition:all .15s;
                           letter-spacing:.4px;"
                    aria-label="${t('alerts.addCondition')}">${t('alerts.addCondition')}</button>
          </div>
        </div>
        <div id="alert-builder-conditions"></div>
      </div>
      <div>
        <button id="alert-builder-behavior-toggle"
                style="background:none;border:none;color:var(--muted);font-family:'Space Mono',monospace;
                       font-size:10px;cursor:pointer;padding:0;letter-spacing:.04em;transition:color .15s;"
                aria-expanded="false">${t('alerts.advancedOpts')}</button>
        <div id="alert-builder-behavior"
             style="display:none;margin-top:10px;padding:10px;
                    background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:6px;">
          <div style="display:flex;flex-direction:column;gap:9px;">
            <div class="ab-behavior-row">
              <label>
                <input type="checkbox" id="ab-repeat" class="ab-toggle" aria-label="${t('alerts.repeat')}">
                <span>${t('alerts.repeat')}</span>
              </label>
            </div>
            <div class="ab-behavior-row" id="ab-cooldown-row" style="display:none;">
              <span style="flex-shrink:0;">${t('alerts.cooldown')}</span>
              <select id="ab-cooldown" class="ab-field" style="width:auto;padding:4px 8px;font-size:10px;" aria-label="${t('alerts.cooldown')}">
                <option value="1">${t('alerts.cooldown1m')}</option>
                <option value="5" selected>${t('alerts.cooldown5m')}</option>
                <option value="15">${t('alerts.cooldown15m')}</option>
                <option value="30">${t('alerts.cooldown30m')}</option>
                <option value="60">${t('alerts.cooldown1h')}</option>
                <option value="240">${t('alerts.cooldown4h')}</option>
              </select>
            </div>
            <div class="ab-behavior-row" id="ab-maxtrig-row" style="display:none;">
              <span style="flex-shrink:0;">${t('alerts.limit')}</span>
              <select id="ab-max-triggers" class="ab-field" style="width:auto;padding:4px 8px;font-size:10px;" aria-label="${t('alerts.limit')}">
                <option value="0">${t('alerts.limitUnlimited')}</option>
                <option value="1">${t('alerts.limitTimes', { n: 1 })}</option>
                <option value="3">${t('alerts.limitTimes', { n: 3 })}</option>
                <option value="5">${t('alerts.limitTimes', { n: 5 })}</option>
                <option value="10">${t('alerts.limitTimes', { n: 10 })}</option>
              </select>
            </div>
            <div class="ab-behavior-row">
              <span style="flex-shrink:0;">${t('alerts.expiration')}</span>
              <select id="ab-expiration" class="ab-field" style="width:auto;padding:4px 8px;font-size:10px;" aria-label="${t('alerts.expiration')}">
                <option value="0">${t('alerts.expNever')}</option>
                <option value="60">${t('alerts.expHour')}</option>
                <option value="480">${t('alerts.exp8h')}</option>
                <option value="1440">${t('alerts.exp24h')}</option>
                <option value="10080">${t('alerts.exp7d')}</option>
                <option value="43200">${t('alerts.exp30d')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div id="alert-builder-preview"
           style="font-size:10px;color:var(--muted);line-height:1.6;min-height:18px;
                  letter-spacing:.03em;padding:6px 8px;background:rgba(255,255,255,.02);
                  border-radius:4px;border-left:2px solid var(--border);"></div>
    </div>
    <div class="modal-footer" style="gap:10px;">
      <button id="alert-builder-cancel"
              style="background:transparent;border:1px solid var(--border);color:var(--muted);
                     padding:8px 16px;font-family:'Space Mono',monospace;font-size:10px;
                     border-radius:4px;cursor:pointer;transition:all .15s;"
              aria-label="${t('alerts.cancel')}">${t('alerts.cancel')}</button>
      <button id="alert-builder-confirm"
              style="background:var(--accent);color:var(--bg);border:none;padding:8px 24px;
                     font-family:'Space Mono',monospace;font-size:11px;border-radius:4px;
                     cursor:pointer;font-weight:700;transition:background .15s;letter-spacing:.04em;"
              aria-label="${t('alerts.confirm')}">${t('alerts.confirm')}</button>
    </div>
  </div>
</div>

<!-- ── Modal Centre d'alertes ─────────────────────────────────── -->
<div id="alert-center-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('alerts.centerTitle')}">
  <div id="alert-center-modal" class="modal-box modal-box--alert-center">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔔 ${t('alerts.centerTitle')}</div>
        <span id="alert-center-count" style="font-size:11px;font-weight:700;color:var(--muted);"></span>
      </div>
      <button id="alert-center-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="alert-center-tab-active" role="tab" aria-selected="true" data-tab="active">${t('alerts.tabActive')}</button>
      <button class="ind-tab" id="alert-center-tab-history" role="tab" aria-selected="false" data-tab="history">${t('alerts.tabHistory')}</button>
    </div>
    <div id="alert-center-content" style="flex:1;overflow-y:auto;min-height:180px;max-height:420px;scrollbar-width:thin;"></div>
    <div class="modal-footer">
      <span id="alert-center-stats" style="font-size:10px;color:var(--muted);"></span>
      <button id="alert-center-action-btn" class="modal-btn-danger" style="display:none;" aria-label="${t('alerts.deleteAll', { n: '' })}"></button>
    </div>
  </div>
</div>

<!-- ── Modal Market Screener ─────────────────────────────────── -->
<div id="screener-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('screener.title')}">
  <div class="modal-box modal-box--screener">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🔍 ${t('screener.title')}</div>
        <span id="screener-count" style="font-size:10px;color:var(--muted);"></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span id="screener-ts" style="font-size:9px;color:var(--muted);"></span>
        <button id="screener-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
      </div>
    </div>
    <div class="scr-tabs" role="tablist">
      <button class="scr-tab active" data-tab="all"      role="tab" aria-selected="true">${t('screener.tabs.all')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="gainers"  role="tab">${t('screener.tabs.gainers')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="losers"   role="tab">${t('screener.tabs.losers')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="volume"   role="tab">${t('screener.tabs.volume')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="breakout" role="tab">${t('screener.tabs.breakout')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="extremes" role="tab">${t('screener.tabs.extremes')} <span class="tab-badge">—</span></button>
      <button class="scr-tab" data-tab="volatile" role="tab">${t('screener.tabs.volatile')} <span class="tab-badge">—</span></button>
    </div>
    <div class="scr-toolbar">
      <input id="screener-search" type="text" placeholder="${t('screener.searchPh')}"
             autocomplete="off" spellcheck="false" aria-label="${t('screener.searchPh')}">
      <div class="scr-meta">
        <button id="screener-refresh" aria-label="${t('screener.refresh')}">${t('screener.refresh')}</button>
      </div>
    </div>
    <div id="screener-loader" style="display:flex;">
      <span style="font-size:18px">⏳</span> ${t('screener.loading')}
    </div>
    <div id="screener-table-wrap" style="display:none;">
      <table class="scr-table" aria-label="${t('screener.title')}">
        <thead id="screener-thead"></thead>
        <tbody id="screener-tbody"></tbody>
      </table>
    </div>
    <div class="modal-footer" style="font-size:9px;color:var(--muted);letter-spacing:.5px;">
      ${t('screener.footer')}
    </div>
  </div>
</div>

<!-- ── Barre d'outil drawing (flottante) ────────────────────── -->
<div id="draw-toolbar" aria-live="polite" aria-label="${t('ctxMenu.drawingTools')}">
  <span id="draw-toolbar-label"></span>
  <span id="draw-toolbar-cancel" role="button" tabindex="0"
        title="${t('alerts.cancel')} (Échap)" aria-label="${t('alerts.cancel')} (Échap)">✕</span>
</div>

<!-- ── Modal Export & Partage ──────────────────────────────── -->
<div id="export-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('export.title')}">
  <div class="modal-box modal-box--export">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">📤 ${t('export.title')}</div>
        <span id="export-modal-sym" style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:.04em;"></span>
      </div>
      <button id="export-modal-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="export-tab-image" role="tab" aria-selected="true">${t('export.tabImage')}</button>
      <button class="ind-tab" id="export-tab-data" role="tab" aria-selected="false">${t('export.tabData')}</button>
      <button class="ind-tab" id="export-tab-share" role="tab" aria-selected="false">${t('export.tabShare')}</button>
    </div>
    <div id="export-modal-content" style="flex:1;padding:16px 18px;overflow-y:auto;min-height:300px;"></div>
  </div>
</div>

<!-- ── Modal Paper Trading ──────────────────────────────── -->
<div id="paper-trading-overlay"
     class="modal-overlay"
     style="align-items:center;justify-content:center;"
     role="dialog" aria-modal="true" aria-label="${t('paperTrading.title')}">
  <div class="modal-box modal-box--paper-trading">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">📈 ${t('paperTrading.title')}</div>
        <span style="font-size:9px;padding:2px 8px;border-radius:3px;
                     background:rgba(247,201,72,.12);color:#f7c948;
                     border:1px solid rgba(247,201,72,.3);letter-spacing:.5px;">${t('paperTrading.simulation')}</span>
      </div>
      <button id="paper-trading-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="pt-tab-portfolio" role="tab" aria-selected="true">${t('paperTrading.tabPortfolio')}</button>
      <button class="ind-tab" id="pt-tab-order" role="tab" aria-selected="false">${t('paperTrading.tabOrder')}</button>
      <button class="ind-tab" id="pt-tab-history" role="tab" aria-selected="false">${t('paperTrading.tabHistory')}</button>
    </div>
    <div id="pt-content" style="flex:1;overflow-y:auto;padding:14px 16px;scrollbar-width:thin;"></div>
  </div>
</div>

<!-- ── Modal Backtester ──────────────────────────────────── -->
<div id="backtest-overlay"
     class="modal-overlay"
     style="align-items:center;justify-content:center;"
     role="dialog" aria-modal="true" aria-label="${t('backtest.title')}">
  <div class="modal-box modal-box--backtest">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🧪 ${t('backtest.title')}</div>
        <span style="font-size:9px;padding:2px 8px;border-radius:3px;
                     background:rgba(224,64,251,.12);color:#e040fb;
                     border:1px solid rgba(224,64,251,.3);letter-spacing:.5px;">${t('backtest.beta')}</span>
      </div>
      <button id="backtest-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div class="modal-tabs" role="tablist">
      <button class="ind-tab active" id="bt-tab-strategy" role="tab" aria-selected="true">${t('backtest.tabStrategy')}</button>
      <button class="ind-tab" id="bt-tab-results" role="tab" aria-selected="false">${t('backtest.tabResults')}</button>
    </div>
    <div id="bt-content" style="flex:1;overflow-y:auto;padding:14px 16px;scrollbar-width:thin;"></div>
  </div>
</div>

<!-- ── Modal Workspaces ──────────────────────────────────── -->
<div id="workspace-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="${t('workspaces.title')}">
  <div class="modal-box modal-box--workspaces">
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🗂 ${t('workspaces.title')}</div>
        <span id="ws-modal-count" style="font-size:10px;color:var(--muted);font-weight:400;letter-spacing:.04em;"></span>
      </div>
      <button id="workspace-modal-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>
    <div id="ws-modal-grid"
         style="flex:1;overflow-y:auto;padding:14px 16px;
                display:grid;grid-template-columns:1fr 1fr;gap:10px;
                align-content:start;scrollbar-width:thin;max-height:55vh;"></div>
    <div id="ws-save-section" style="padding:12px 16px 14px;border-top:1px solid var(--border);flex-shrink:0;"></div>
  </div>
</div>

<div id="risk-calc-overlay"
     class="modal-overlay"
     style="align-items:center;justify-content:center;"
     role="dialog" aria-modal="true" aria-label="${t('calc.title')}">
  <div class="modal-box modal-box--risk-calc">

    <!-- Header -->
    <div class="modal-header">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="modal-title">🧮 ${t('calc.toolsTitle')}</div>
        <span style="font-size:9px;padding:2px 8px;border-radius:3px;
                     background:rgba(0,200,255,.12);color:#00c8ff;
                     border:1px solid rgba(0,200,255,.3);letter-spacing:.5px;">${t('calc.badge')}</span>
      </div>
      <button id="risk-calc-close" class="modal-close" aria-label="${t('alerts.delete')}">✕</button>
    </div>

    <!-- Tabs — 6 onglets -->
    <div class="modal-tabs rc-tabs-scroll" role="tablist" aria-label="${t('calc.tabsLabel')}">
      <button class="ind-tab active" id="rc-tab-position"
              role="tab" aria-selected="true">📐 ${t('calc.tabPosition')}</button>
      <button class="ind-tab" id="rc-tab-rr"
              role="tab" aria-selected="false">⚖ ${t('calc.tabRR')}</button>
      <button class="ind-tab" id="rc-tab-liq"
              role="tab" aria-selected="false">⚡ ${t('calc.tabLeverage')}</button>
      <button class="ind-tab" id="rc-tab-maxloss"
              role="tab" aria-selected="false">📉 ${t('calc.tabMaxLoss')}</button>
      <button class="ind-tab" id="rc-tab-trailing"
              role="tab" aria-selected="false">🎯 ${t('calc.tabTrailing')}</button>
      <button class="ind-tab" id="rc-tab-slippage"
              role="tab" aria-selected="false">💸 ${t('calc.tabFees')}</button>
    </div>

    <!-- Dynamic content -->
    <div id="rc-content"
         style="flex:1;overflow-y:auto;padding:16px 18px;scrollbar-width:thin;"></div>
  </div>
</div>

<!-- ── CSS dédié Risk Calculator (v4.0 — 6 tabs) ──────────── -->
<style>
  /* Taille de la boîte — plus large pour les nouveaux onglets */
  .modal-box--risk-calc {
    width: 580px;
    max-height: 92vh;
  }

  /* Scroll horizontal pour les 6 tabs sur mobile */
  .rc-tabs-scroll {
    overflow-x: auto;
    scrollbar-width: none;
    flex-shrink: 0;
  }
  .rc-tabs-scroll::-webkit-scrollbar { display: none; }
  .rc-tabs-scroll .ind-tab {
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Description intro */
  .rc-desc {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.7;
    margin-bottom: 16px;
    padding: 10px 12px;
    background: rgba(255,255,255,.02);
    border-radius: 6px;
    border-left: 2px solid var(--border);
  }

  /* Grille 2 colonnes pour les inputs */
  .rc-grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  /* Bouton principal */
  .rc-btn-primary {
    width: 100%;
    padding: 12px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 800;
    background: var(--accent);
    color: var(--bg);
    border: none;
    transition: background .15s;
    letter-spacing: .04em;
    margin-bottom: 14px;
  }
  .rc-btn-primary:hover { background: #00e57a; }

  /* Bloc résultats */
  .rc-result {
    background: rgba(0,255,136,.04);
    border: 1px solid rgba(0,255,136,.18);
    border-radius: 8px;
    padding: 14px;
    margin-bottom: 12px;
  }
  .rc-result-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 11px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: .6px;
    margin-bottom: 12px;
  }
  .rc-result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .rc-result-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    padding: 4px 0;
    border-bottom: 1px solid rgba(28,35,51,.5);
  }
  .rc-result-row strong { color: var(--text); }

  /* Astuce en bas */
  .rc-tip {
    font-size: 9px;
    color: var(--muted);
    line-height: 1.6;
    padding: 8px 10px;
    background: rgba(0,200,255,.05);
    border: 1px solid rgba(0,200,255,.15);
    border-radius: 4px;
    margin-top: 4px;
  }

  /* Avertissement rouge */
  .rc-warn {
    font-size: 10px;
    color: var(--red);
    margin-top: 8px;
    padding: 6px 10px;
    background: rgba(255,61,90,.07);
    border: 1px solid rgba(255,61,90,.25);
    border-radius: 4px;
  }

  /* Barre R/R visuelle */
  .rc-rr-bar {
    display: flex;
    align-items: stretch;
    height: 10px;
    border-radius: 5px;
    overflow: hidden;
    margin: 12px 0 6px;
    gap: 2px;
  }
  .rc-rr-loss  { background: rgba(255,61,90,.6);  border-radius: 5px 0 0 5px; }
  .rc-rr-pivot { width: 3px; background: var(--text); flex-shrink: 0; }
  .rc-rr-gain  { background: rgba(0,255,136,.6);  border-radius: 0 5px 5px 0; }

  /* Responsive */
  @media (max-width: 600px) {
    .modal-box--risk-calc { width: 96vw; }
    .rc-grid2 { grid-template-columns: 1fr; }
    .rc-result-grid { grid-template-columns: 1fr; }
  }
</style>

`;

  document.body.append(tpl.content);

  hide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}
