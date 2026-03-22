// ============================================================
//  src/utils/templates.js — CrypView V2.7.2
//  Injection dynamique des blocs HTML partagés entre toutes les pages.
//
//  Blocs gérés (identiques dans page.html / multi*.html) :
//    - Modal indicateurs  (#ind-modal-overlay)
//    - Modal paramètres   (#settings-modal-overlay)
//    - Modal alerte prix  (#alert-modal-overlay)       ← v2.7
//    - Modal liste alertes (#alert-list-modal-overlay) ← v2.7.2
//    - Barre drawing tool (#draw-toolbar)
//
//  Usage :
//    import { mountSharedModals } from '../utils/templates.js';
//    mountSharedModals(); // à appeler AVANT d'instancier les modales
//
//  La fonction est idempotente : un double appel est sans effet.
// ============================================================

/**
 * Injecte dans <body> les modales et la toolbar partagées,
 * si elles ne sont pas déjà présentes dans le DOM.
 */
export function mountSharedModals() {
  if (document.getElementById('ind-modal-overlay')) return;

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

<!-- ── Modal alerte de prix ──────────────────────────────── -->
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
           style="font-family:'Syne',sans-serif;font-weight:800;font-size:16px;
                  color:var(--accent);letter-spacing:.02em;">
        BTC/USDT
      </div>
      <div id="alert-modal-current"
           style="font-size:10px;color:var(--muted);margin-top:3px;letter-spacing:.03em;">
        Actuel&nbsp;: —
      </div>
    </div>

    <div style="padding:14px 18px;">
      <label for="alert-price-input"
             style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:1.2px;display:block;margin-bottom:7px;">
        Prix cible
      </label>
      <input id="alert-price-input"
             type="number" min="0" step="any"
             style="width:100%;background:var(--bg);border:1px solid var(--border);
                    color:var(--text);padding:10px 14px;
                    font-family:'Space Mono',monospace;font-size:16px;font-weight:700;
                    border-radius:5px;outline:none;transition:border-color .15s;
                    -moz-appearance:textfield;"
             aria-label="Prix cible de l'alerte">
      <div id="alert-direction-hint"
           style="min-height:38px;margin-top:10px;font-size:10px;
                  line-height:1.6;letter-spacing:.03em;">
      </div>
    </div>

    <div class="modal-footer" style="gap:10px;">
      <button id="alert-modal-cancel"
              style="background:transparent;border:1px solid var(--border);
                     color:var(--muted);padding:8px 16px;font-family:'Space Mono',monospace;
                     font-size:10px;border-radius:4px;cursor:pointer;transition:all .15s;"
              aria-label="Annuler">
        Annuler
      </button>
      <button id="alert-modal-confirm"
              style="background:var(--accent);color:var(--bg);border:none;
                     padding:8px 22px;font-family:'Space Mono',monospace;font-size:11px;
                     border-radius:4px;cursor:pointer;font-weight:700;
                     transition:background .15s;letter-spacing:.04em;"
              aria-label="Confirmer l'alerte">
        🔔 Créer l'alerte
      </button>
    </div>

  </div>
</div>

<!-- ── Modal liste des alertes actives ───────────────────── -->
<div id="alert-list-modal-overlay"
     class="modal-overlay"
     role="dialog" aria-modal="true" aria-label="Gérer les alertes de prix">

  <div id="alert-list-modal" class="modal-box modal-box--alert-list">

    <div class="modal-header">
      <div class="modal-title">🔔 Alertes actives</div>
      <button id="alert-list-modal-close" class="modal-close" aria-label="Fermer">✕</button>
    </div>

    <!-- Liste scrollable -->
    <div id="alert-list-items"
         style="flex:1;overflow-y:auto;min-height:60px;max-height:360px;
                scrollbar-width:thin;">
      <!-- Rempli dynamiquement par AlertListModal.js -->
    </div>

    <!-- Pied : compteur + bouton tout supprimer -->
    <div class="modal-footer">
      <span id="alert-list-count"
            style="font-size:10px;color:var(--muted);">
        0 alerte active
      </span>
      <button id="alert-list-clear-all"
              class="modal-btn-danger"
              style="display:none;"
              aria-label="Supprimer toutes les alertes">
        🗑 Tout supprimer
      </button>
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

  document.body.append(tpl.content);
}
