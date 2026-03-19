// ============================================================
//  src/utils/templates.js — CrypView V2
//  Injection dynamique des blocs HTML partagés entre toutes les pages.
//
//  Blocs gérés (identiques dans page.html / multi2.html / multi4.html) :
//    - Modal indicateurs  (#ind-modal-overlay)
//    - Modal paramètres   (#settings-modal-overlay)
//    - Barre drawing tool (#draw-toolbar)
//
//  Usage :
//    import { mountSharedModals } from '../utils/templates.js';
//    mountSharedModals(); // à appeler AVANT d'instancier IndicatorModal
//                         // et SettingsModal
//
//  La fonction est idempotente : un double appel est sans effet.
// ============================================================

/**
 * Injecte dans <body> les modales et la toolbar partagées,
 * si elles ne sont pas déjà présentes dans le DOM.
 * Compatible page.html, multi2.html et multi4.html.
 */
export function mountSharedModals() {
  // Idempotence — sortie rapide si déjà monté (ex: HMR, reprise d'onglet)
  if (document.getElementById('ind-modal-overlay')) return;

  // On accumule les fragments dans un seul <template> pour un seul reflow
  const tpl = document.createElement('template');
  tpl.innerHTML = `

<!-- ── Modal indicateurs ───────────────────────────────── -->
<div id="ind-modal-overlay"
     style="display:none;position:fixed;inset:0;z-index:20000;background:rgba(7,10,15,.82);backdrop-filter:blur(6px);"
     role="dialog" aria-modal="true" aria-label="Sélection des indicateurs">
  <div id="ind-modal"
       style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              background:#0d1117;border:1px solid #1c2333;border-radius:12px;
              width:560px;max-width:95vw;max-height:82vh;display:flex;flex-direction:column;
              box-shadow:0 32px 80px rgba(0,0,0,.9);overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1c2333;flex-shrink:0;">
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:15px;color:#00ff88;letter-spacing:.5px">📈 Indicateurs</div>
      <button id="ind-modal-close" aria-label="Fermer"
              style="background:none;border:none;color:#8b949e;font-size:18px;cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;">✕</button>
    </div>
    <div style="padding:10px 18px;border-bottom:1px solid #1c2333;flex-shrink:0;">
      <input id="ind-search" type="text" placeholder="Rechercher un indicateur…" autocomplete="off"
             aria-label="Rechercher un indicateur"
             style="width:100%;background:#070a0f;border:1px solid #1c2333;color:#e6edf3;
                    padding:7px 12px;font-family:'Space Mono',monospace;font-size:11px;
                    border-radius:5px;outline:none;transition:border-color .15s;">
    </div>
    <div id="ind-tabs" role="tablist"
         style="display:flex;border-bottom:1px solid #1c2333;flex-shrink:0;overflow-x:auto;scrollbar-width:none;">
      <button class="ind-tab active" data-cat="all"        role="tab" aria-selected="true">Tous</button>
      <button class="ind-tab"        data-cat="trend"      role="tab" aria-selected="false">Tendance</button>
      <button class="ind-tab"        data-cat="momentum"   role="tab" aria-selected="false">Momentum</button>
      <button class="ind-tab"        data-cat="volatility" role="tab" aria-selected="false">Volatilité</button>
      <button class="ind-tab"        data-cat="volume"     role="tab" aria-selected="false">Volume</button>
    </div>
    <div id="ind-modal-grid" role="list"
         style="flex:1;overflow-y:auto;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;"></div>
    <div id="ind-modal-footer"
         style="padding:10px 18px;border-top:1px solid #1c2333;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;font-size:10px;color:#8b949e;">
      <span id="ind-active-count">0 indicateur actif</span>
      <button id="ind-modal-remove-all"
              style="background:rgba(255,61,90,.1);border:1px solid rgba(255,61,90,.3);color:#ff3d5a;
                     padding:5px 12px;font-family:'Space Mono',monospace;font-size:10px;border-radius:4px;cursor:pointer;"
              aria-label="Retirer tous les indicateurs">Tout retirer</button>
    </div>
  </div>
</div>

<!-- ── Modal paramètres ─────────────────────────────────── -->
<div id="settings-modal-overlay"
     style="display:none;position:fixed;inset:0;z-index:20000;
            background:rgba(7,10,15,.82);backdrop-filter:blur(6px);"
     role="dialog" aria-modal="true" aria-label="Paramètres">
  <div id="settings-modal"
       style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
              background:#0d1117;border:1px solid #1c2333;border-radius:12px;
              width:420px;max-width:95vw;display:flex;flex-direction:column;
              box-shadow:0 32px 80px rgba(0,0,0,.9);overflow:hidden;">
    <div style="display:flex;align-items:center;justify-content:space-between;
                padding:14px 18px;border-bottom:1px solid #1c2333;flex-shrink:0;">
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:15px;
                  color:#00ff88;letter-spacing:.5px">⚙️ Paramètres</div>
      <button id="settings-modal-close" aria-label="Fermer"
              style="background:none;border:none;color:#8b949e;font-size:18px;
                     cursor:pointer;padding:2px 6px;border-radius:4px;line-height:1;">✕</button>
    </div>
    <div style="padding:14px 18px 6px;font-size:9px;color:#8b949e;
                text-transform:uppercase;letter-spacing:1.2px;">Apparence</div>
    <div id="settings-modal-grid"
         style="padding:0 14px 16px;display:flex;flex-direction:column;gap:8px;">
      <!-- Rempli par SettingsModal.js -->
    </div>
  </div>
</div>

<!-- ── Barre d'outil drawing (flottante) ────────────────── -->
<div id="draw-toolbar" aria-live="polite" aria-label="Outil de dessin actif">
  <span id="draw-toolbar-label">TRENDLINE — Cliquez 2 points</span>
  <span id="draw-toolbar-cancel" role="button" tabindex="0"
        title="Annuler (Échap)" aria-label="Annuler (Échap)">✕</span>
</div>

`;

  // Déplace tous les nœuds du fragment dans <body> (pas de div wrapper parasite)
  document.body.append(tpl.content);
}
