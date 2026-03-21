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
//
//  Aucune couleur hardcodée ici — tous les styles sont dans
//  components.css via les classes .modal-* et #ind-search.
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
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Sélection des indicateurs">

  <div id="ind-modal" class="modal-box modal-box--ind">

    <div class="modal-header">
      <div class="modal-title">📈 Indicateurs</div>
      <button id="ind-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <div class="modal-search-wrap">
      <input id="ind-search"
             type="text"
             placeholder="Rechercher un indicateur…"
             autocomplete="off"
             aria-label="Rechercher un indicateur">
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
      <button id="ind-modal-remove-all"
              class="modal-btn-danger"
              aria-label="Retirer tous les indicateurs">Tout retirer</button>
    </div>

  </div>
</div>

<!-- ── Modal paramètres ─────────────────────────────────── -->
<div id="settings-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Paramètres">

  <div id="settings-modal" class="modal-box modal-box--settings">

    <div class="modal-header">
      <div class="modal-title">⚙️ Paramètres</div>
      <button id="settings-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <div class="modal-section-label">Apparence</div>

    <div id="settings-modal-grid" class="modal-settings-grid">
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
