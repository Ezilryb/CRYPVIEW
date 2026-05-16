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

  /**
   * @param {'live'|'offline'|'connecting'|'reconnecting'} state
   * @param {string} [text]
   */
  setStatus(state, text) {
    if (!this.#dot) return;

    this.#dot.className = 'dot';

    if (state === 'live') {
      this.#dot.classList.add('live');
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.live');
    } else if (state === 'reconnecting') {
      this.#dot.classList.add('reconnecting');
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.reconnecting');
    } else {
      if (this.#statusText) this.#statusText.textContent = text ?? t('header.status.connecting');
    }
  }

  /**
   * @param {string} href
   */
  setBackHref(href) {
    if (!this.#btnBack) return;
    this.#btnBack.onclick = () => { window.location.href = href; };
  }
}
