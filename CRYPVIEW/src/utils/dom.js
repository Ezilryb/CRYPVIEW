// ============================================================
//  src/utils/dom.js — CrypView V2
//  Helpers DOM légers partagés entre toutes les pages.
// ============================================================

/**
 * Raccourci pour document.getElementById.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Raccourci pour document.querySelectorAll avec conversion en Array.
 * @param {string} selector
 * @param {Element} [scope=document]
 * @returns {Element[]}
 */
export const $$ = (selector, scope = document) =>
  Array.from(scope.querySelectorAll(selector));

/**
 * Affiche la bannière d'erreur non-bloquante en haut de page.
 * @param {string} message
 */
export function showErr(message) {
  const el = $('err-banner');
  if (!el) return;
  el.textContent = '⚠ ' + message;
  el.style.display = 'block';
}

/** Masque la bannière d'erreur. */
export function hideErr() {
  const el = $('err-banner');
  if (el) el.style.display = 'none';
}

/**
 * Affiche l'overlay de chargement central.
 * @param {string} message     — Titre de l'overlay
 * @param {string} [sub='']    — Sous-titre optionnel
 */
export function setOverlay(message, sub = '') {
  const overlay = $('overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const msgEl = $('overlay-msg');
  const subEl = $('overlay-sub');
  if (msgEl) msgEl.textContent = message;
  if (subEl) subEl.textContent = sub;
}

/** Cache l'overlay de chargement. */
export function hideOverlay() {
  $('overlay')?.classList.add('hidden');
}

/**
 * Met à jour l'indicateur de statut WebSocket dans le header.
 * @param {'live'|'reconnecting'|'error'|'offline'} status
 * @param {string} [customText]
 */
export function setWsStatus(status, customText) {
  const dot      = $('dot');
  const statusEl = $('status-text');

  const labels = {
    live:          'En direct',
    reconnecting:  'Reconnexion…',
    error:         'Erreur',
    offline:       'Hors ligne',
  };

  if (dot)      dot.className = `dot ${status === 'live' ? 'live' : ''}`;
  if (statusEl) statusEl.textContent = customText ?? labels[status] ?? status;
}
