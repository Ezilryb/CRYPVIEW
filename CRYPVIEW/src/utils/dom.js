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