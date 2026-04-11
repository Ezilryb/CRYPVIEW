// ============================================================
//  src/utils/a11y.js — CrypView V2
//  Utilitaires d'accessibilité :
//    - FocusTrap         — piège le focus dans un modal/dialog
//    - ArrowKeyNav       — navigation ↑↓ dans les menus
//    - prefersReducedMotion() — media query live
//    - announceToScreenReader() — live region dynamique
//
//  Usage :
//    import { FocusTrap, ArrowKeyNav, announceToScreenReader } from './a11y.js';
//
//    const trap = new FocusTrap(overlayEl);
//    trap.activate();    // quand le modal s'ouvre
//    trap.deactivate();  // quand il se ferme
// ============================================================

// ── Sélecteur des éléments naturellement focusables ──────────
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(', ');

// ══════════════════════════════════════════════════════════════
//  FocusTrap
// ══════════════════════════════════════════════════════════════

/**
 * Piège de focus conforme WCAG 2.1 (pattern "modal dialog").
 *
 * @example
 *   const trap = new FocusTrap(document.getElementById('my-modal'));
 *   trap.activate();   // retient l'élément pré-modal, piège Tab/Shift+Tab
 *   trap.deactivate(); // libère et restaure le focus
 */
export class FocusTrap {
  #root;
  #prevFocus = null;
  #handler   = null;
  #active    = false;

  /** @param {HTMLElement} root — conteneur du dialog/modal */
  constructor(root) {
    this.#root = root;
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Active le piège de focus.
   * @param {HTMLElement|null} [initialFocus] — élément à focaliser en premier
   *   (par défaut : premier focusable du root)
   */
  activate(initialFocus = null) {
    if (this.#active) return;
    this.#active    = true;
    this.#prevFocus = document.activeElement;

    // Focus initial : élément fourni → premier focusable → root lui-même
    const target = initialFocus
      ?? this.#root.querySelector(FOCUSABLE)
      ?? this.#root;
    target.focus({ preventScroll: true });

    this.#handler = (e) => this.#handleKeyDown(e);
    this.#root.addEventListener('keydown', this.#handler);
  }

  /**
   * Désactive le piège et restaure le focus précédent.
   */
  deactivate() {
    if (!this.#active) return;
    this.#active = false;
    this.#root.removeEventListener('keydown', this.#handler);
    this.#handler = null;
    // Restauration sécurisée : l'élément peut avoir été supprimé du DOM
    try { this.#prevFocus?.focus({ preventScroll: true }); } catch (_) {}
    this.#prevFocus = null;
  }

  get isActive() { return this.#active; }

  // ── Privé ─────────────────────────────────────────────────

  #handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusables = [...this.#root.querySelectorAll(FOCUSABLE)]
      .filter(el => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null);

    if (!focusables.length) { e.preventDefault(); return; }

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey) {
      // Shift+Tab depuis le premier → boucle vers le dernier
      if (document.activeElement === first || !this.#root.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab depuis le dernier → boucle vers le premier
      if (document.activeElement === last || !this.#root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  ArrowKeyNav — navigation ↑↓ dans les menus/listes
// ══════════════════════════════════════════════════════════════

/**
 * Ajoute la navigation clavier ↑↓/Home/End/Échap sur un conteneur.
 *
 * @param {HTMLElement}      container     — parent des items
 * @param {string}           itemSelector  — sélecteur CSS des items
 * @param {{ onEscape?: () => void, orientation?: 'vertical'|'horizontal' }} opts
 * @returns {() => void} fonction de nettoyage
 *
 * @example
 *   const cleanup = ArrowKeyNav(menuEl, '.ctx-item', { onEscape: () => menu.close() });
 *   // plus tard :
 *   cleanup();
 */
export function ArrowKeyNav(container, itemSelector, opts = {}) {
  const { onEscape, orientation = 'vertical' } = opts;
  const isVertical = orientation === 'vertical';

  const getItems = () =>
    [...container.querySelectorAll(itemSelector)]
      .filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));

  const moveFocus = (delta) => {
    const items = getItems();
    if (!items.length) return;
    const cur = items.indexOf(document.activeElement);
    const next = cur === -1
      ? (delta > 0 ? 0 : items.length - 1)
      : (cur + delta + items.length) % items.length;
    items[next].focus();
  };

  const handler = (e) => {
    const prev = isVertical ? 'ArrowUp'   : 'ArrowLeft';
    const next = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (e.key) {
      case next:  e.preventDefault(); moveFocus(+1);           break;
      case prev:  e.preventDefault(); moveFocus(-1);           break;
      case 'Home':e.preventDefault(); { const items = getItems(); items[0]?.focus(); } break;
      case 'End': e.preventDefault(); { const items = getItems(); items.at(-1)?.focus(); } break;
      case 'Escape': onEscape?.(); break;
    }
  };

  container.addEventListener('keydown', handler);
  return () => container.removeEventListener('keydown', handler);
}

// ══════════════════════════════════════════════════════════════
//  Annonce live region (screen readers)
// ══════════════════════════════════════════════════════════════

/** @type {HTMLElement|null} */
let _liveRegion = null;

function ensureLiveRegion() {
  if (_liveRegion) return _liveRegion;
  _liveRegion = document.createElement('div');
  _liveRegion.id = 'cv-live-region';
  _liveRegion.setAttribute('aria-live', 'polite');
  _liveRegion.setAttribute('aria-atomic', 'true');
  _liveRegion.className = 'sr-only';
  document.body.appendChild(_liveRegion);
  return _liveRegion;
}

/**
 * Annonce un message aux lecteurs d'écran via une live region.
 * Utilise un swap pour forcer la re-lecture même si le texte est identique.
 *
 * @param {string}           message
 * @param {'polite'|'assertive'} [priority='polite']
 */
export function announceToScreenReader(message, priority = 'polite') {
  const region = ensureLiveRegion();
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

// ══════════════════════════════════════════════════════════════
//  Utilitaires divers
// ══════════════════════════════════════════════════════════════

/**
 * Retourne true si l'utilisateur préfère les animations réduites.
 * Met en cache le résultat dans une closure réactive.
 */
export const prefersReducedMotion = (() => {
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  return () => mq?.matches ?? false;
})();

/**
 * Applique role="dialog" + aria-modal + aria-labelledby sur un overlay.
 * À appeler une seule fois après injection du DOM.
 *
 * @param {HTMLElement} overlay    — conteneur de l'overlay
 * @param {HTMLElement} titleEl    — élément qui fait office de titre
 * @param {string}      [titleId]  — id à utiliser (généré si absent)
 */
export function markAsDialog(overlay, titleEl, titleId) {
  const box = overlay.querySelector('.modal-box') ?? overlay;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');

  if (titleEl) {
    const id = titleId ?? (titleEl.id || `cv-dlg-title-${Math.random().toString(36).slice(2)}`);
    titleEl.id = id;
    box.setAttribute('aria-labelledby', id);
  }
}

/**
 * Insère un bouton "skip to main content" en tête du body.
 * Ne fait rien si déjà présent.
 */
export function mountSkipLink(targetId = 'main-content') {
  if (document.getElementById('cv-skip-link')) return;
  const a = document.createElement('a');
  a.id        = 'cv-skip-link';
  a.href      = `#${targetId}`;
  a.className = 'sr-only sr-only-focusable';
  a.textContent = 'Passer au contenu principal';
  document.body.insertBefore(a, document.body.firstChild);
}
