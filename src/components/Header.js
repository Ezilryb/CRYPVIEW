// ============================================================
//  src/components/Header.js — CrypView V2
//  Gestion du header partagé : point de statut WS, texte de
//  statut, bouton retour. Fonctionne sur page.html ET multi*.html.
//
//  HTML attendu (IDs) :
//    #dot          — div point coloré
//    #status-text  — span texte état
//    #btn-back     — button retour (optionnel)
//
//  Usage :
//    const header = new Header();
//    header.setStatus('live');           // → point vert animé
//    header.setStatus('offline', 'Pause');
//    header.setBackHref('page.html?sym=btcusdt');
// ============================================================

import { t } from '../i18n/i18n.js';

export class Header {
  #dot;
  #statusText;
  #btnBack;

  constructor() {
    this.#dot        = document.getElementById('dot');
    this.#statusText = document.getElementById('status-text');
    this.#btnBack    = document.getElementById('btn-back');
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Met à jour l'indicateur visuel de connexion WebSocket.
   * @param {'live'|'offline'|'connecting'|'reconnecting'} state
   * @param {string} [text] — texte alternatif (optionnel)
   */
  setStatus(state, text) {
    if (!this.#dot) return;

    // Retire toutes les classes d'état
    this.#dot.className = 'dot';

    if (state === 'live') {
      this.#dot.classList.add('live');
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.live');
    } else if (state === 'reconnecting') {
      this.#dot.classList.add('reconnecting');
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.reconnecting');
    } else {
      // 'offline' | 'connecting' | tout autre état
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.connecting');
    }
  }

  /**
   * Définit la cible du bouton retour.
   * @param {string} href — URL de destination
   */
  setBackHref(href) {
    if (!this.#btnBack) return;
    this.#btnBack.onclick = () => { window.location.href = href; };
  }
}
