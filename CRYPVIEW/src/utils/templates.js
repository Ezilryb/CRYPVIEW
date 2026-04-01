// ============================================================
//  src/utils/templates.js — CrypView V2.8
//  Injection dynamique des blocs HTML partagés.
//
//  Blocs gérés :
//    - Menu contextuel    (#ctx-menu + sous-panneaux)  ← NOUVEAU
//    - Modal indicateurs  (#ind-modal-overlay)
//    - Modal paramètres   (#settings-modal-overlay)
//    - Modal alerte prix  (#alert-modal-overlay)
//    - Modal liste alertes (#alert-list-modal-overlay)
//    - Barre drawing tool (#draw-toolbar)
//
//  Usage :
//    // page.html — masque "Retour vue simple" et le label chart
//    mountSharedModals({ hide: ['ctx-back-single', 'ctx-chart-label'] });
//
//    // multi2.html — masque l'option "2 Charts" (page courante)
//    mountSharedModals({ hide: ['ctx-multi2'] });
//
//    // multi4.html — masque l'option "4 Charts" (page courante)
//    mountSharedModals({ hide: ['ctx-multi4'] });
//
//  La fonction est idempotente : un double appel est sans effet.
// ============================================================

/**
 * @param {{ hide?: string[] }} [config]
 *   hide : tableau d'IDs d'éléments à masquer après injection.
 *          Permet d'adapter le menu contextuel sans duplication HTML.
 */
export function mountSharedModals(config = {}) {
  if (document.getElementById('ctx-menu')) return;

  const { hide = [] } = config;

  const tpl = document.createElement('template');
  tpl.innerHTML = `

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
    <div style="width:8px"></div>Set Alert at cursor
  </div>
  <div class="ctx-sep" role="separator"></div>
  <div class="ctx-item" id="ctx-manage-alerts" role="menuitem">
    <div style="width:14px;text-align:center">📋</div>
    <div style="width:8px"></div>Manage Alerts
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

<!-- ── Modal alerte de prix ──────────────────────────────────── -->
<div id="alert-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Créer une alerte de prix">
  <div id="alert-modal" class="modal-box modal-box--alert">
    <div class="modal-header">
      <div class="modal-title">🔔 Alerte de prix</div>
      <button id="alert-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div style="padding:14px 18px 0;">
      <div id="alert-modal-sym"
           style="font-family:'Syne',sans-serif;font-weight:800;font-size:16px;color:var(--accent);letter-spacing:.02em;">
        BTC/USDT
      </div>
      <div id="alert-modal-current"
           style="font-size:10px;color:var(--muted);margin-top:3px;letter-spacing:.03em;">
        Actuel&nbsp;: —
      </div>
    </div>
    <div style="padding:14px 18px;">
      <label for="alert-price-input"
             style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;display:block;margin-bottom:7px;">
        Prix cible
      </label>
      <input id="alert-price-input" type="number" min="0" step="any"
             style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);
                    padding:10px 14px;font-family:'Space Mono',monospace;font-size:16px;font-weight:700;
                    border-radius:5px;outline:none;transition:border-color .15s;-moz-appearance:textfield;"
             aria-label="Prix cible de l'alerte">
      <div id="alert-direction-hint"
           style="min-height:38px;margin-top:10px;font-size:10px;line-height:1.6;letter-spacing:.03em;"></div>
    </div>
    <div class="modal-footer" style="gap:10px;">
      <button id="alert-modal-cancel"
              style="background:transparent;border:1px solid var(--border);color:var(--muted);
                     padding:8px 16px;font-family:'Space Mono',monospace;font-size:10px;
                     border-radius:4px;cursor:pointer;transition:all .15s;"
              aria-label="Annuler">Annuler</button>
      <button id="alert-modal-confirm"
              style="background:var(--accent);color:var(--bg);border:none;padding:8px 22px;
                     font-family:'Space Mono',monospace;font-size:11px;border-radius:4px;
                     cursor:pointer;font-weight:700;transition:background .15s;letter-spacing:.04em;"
              aria-label="Confirmer l'alerte">🔔 Créer l'alerte</button>
    </div>
  </div>
</div>

<!-- ── Modal liste des alertes actives ───────────────────────── -->
<div id="alert-list-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Gérer les alertes de prix">
  <div id="alert-list-modal" class="modal-box modal-box--alert-list">
    <div class="modal-header">
      <div class="modal-title">🔔 Alertes actives</div>
      <button id="alert-list-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>
    <div id="alert-list-items"
         style="flex:1;overflow-y:auto;min-height:60px;max-height:360px;scrollbar-width:thin;"></div>
    <div class="modal-footer">
      <span id="alert-list-count" style="font-size:10px;color:var(--muted);">0 alerte active</span>
      <button id="alert-list-clear-all" class="modal-btn-danger" style="display:none;"
              aria-label="Supprimer toutes les alertes">🗑 Tout supprimer</button>
    </div>
  </div>
</div>

<!-- ── Barre d'outil drawing (flottante) ────────────────────── -->
<div id="draw-toolbar" aria-live="polite" aria-label="Outil de dessin actif">
  <span id="draw-toolbar-label">TRENDLINE — Cliquez 2 points</span>
  <span id="draw-toolbar-cancel" role="button" tabindex="0"
        title="Annuler (Échap)" aria-label="Annuler (Échap)">✕</span>
</div>

`;

  document.body.append(tpl.content);

  // ── Masquage des items non pertinents pour la page courante ──
  // Utilise display:none plutôt que la suppression DOM afin que
  // ContextMenu.js puisse garder ses listeners via optional chaining.
  hide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}