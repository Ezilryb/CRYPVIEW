// ============================================================
//  src/utils/rtl.js — CrypView i18n Part 4
//  Support RTL (Right-To-Left) : arabe, hébreu, persan.
//
//  Responsabilités :
//    1. Applique dir="rtl" sur <html> selon la locale
//    2. Injecte le CSS RTL minimal (marges, flex, textes)
//    3. Expose applyRTL(locale) et isRTL() pour les composants
//    4. Écoute i18n:locale:change pour mise à jour dynamique
//
//  Locales RTL supportées :
//    ar (arabe) · he (hébreu) · fa (persan) · ur (ourdou)
//
//  Usage :
//    import { applyRTL, isRTL } from './rtl.js';
//    applyRTL('ar');        // applique immédiatement
//    if (isRTL()) { … }    // vérifie l'état courant
// ============================================================

// ── Locales RTL reconnues ─────────────────────────────────────
const RTL_LOCALES = new Set([
  'ar', 'ar-SA', 'ar-EG', 'ar-MA', 'ar-DZ', 'ar-LY',
  'he', 'he-IL',
  'fa', 'fa-IR',
  'ur', 'ur-PK',
]);

// ── État global ───────────────────────────────────────────────
let _currentDir = 'ltr';

// ── ID du bloc <style> RTL injecté ───────────────────────────
const STYLE_ID = 'cv-rtl-styles';

// ══════════════════════════════════════════════════════════════
//  CSS RTL — règles injectées dynamiquement
// ══════════════════════════════════════════════════════════════

const RTL_CSS = `
/* ── CrypView RTL overrides ────────────────────────────────── */
[dir="rtl"] body {
  font-family: 'Space Mono', 'Noto Sans Arabic', monospace;
}

/* Header */
[dir="rtl"] header {
  flex-direction: row-reverse;
}
[dir="rtl"] .price-display {
  margin-left: 0;
  margin-right: auto;
}
[dir="rtl"] .status {
  flex-direction: row-reverse;
}

/* Sidebar */
[dir="rtl"] .sidebar {
  border-left: none;
  border-right: 1px solid var(--border);
}
[dir="rtl"] .trades-header,
[dir="rtl"] .trade-row {
  direction: rtl;
}
[dir="rtl"] .t-qty,
[dir="rtl"] .t-time {
  text-align: left;
}

/* Menus contextuels */
[dir="rtl"] #ctx-menu,
[dir="rtl"] .ctx-sub {
  direction: rtl;
  text-align: right;
}
[dir="rtl"] .ctx-cat-left {
  flex-direction: row-reverse;
}
[dir="rtl"] .ctx-cat-arrow {
  transform: rotate(180deg);
}
[dir="rtl"] .ctx-cat.open .ctx-cat-arrow {
  transform: rotate(270deg);
}

/* Modales */
[dir="rtl"] .modal-box {
  direction: rtl;
  text-align: right;
}
[dir="rtl"] .modal-header {
  flex-direction: row-reverse;
}
[dir="rtl"] .modal-tabs {
  flex-direction: row-reverse;
}
[dir="rtl"] .modal-footer {
  flex-direction: row-reverse;
}

/* Barre indicateurs */
[dir="rtl"] #ind-bar {
  flex-direction: row-reverse;
}
[dir="rtl"] .ind-tag {
  flex-direction: row-reverse;
}

/* Screener */
[dir="rtl"] .scr-tabs {
  flex-direction: row-reverse;
}
[dir="rtl"] .scr-td--left {
  text-align: right;
}
[dir="rtl"] .scr-td--right {
  text-align: left;
}
[dir="rtl"] .scr-th--left {
  text-align: right;
}
[dir="rtl"] .scr-th--right {
  text-align: left;
}

/* Recherche symbole */
[dir="rtl"] .sym-search-wrap {
  direction: rtl;
}
[dir="rtl"] #sym-input {
  padding: 6px 10px 6px 30px;
}
[dir="rtl"] .sym-search-icon {
  right: auto;
  left: 8px;
}
[dir="rtl"] #sym-dropdown {
  text-align: right;
}

/* Toast */
[dir="rtl"] #toast-container {
  right: auto;
  left: 24px;
}

/* Panel multi */
[dir="rtl"] .chart-panel-header {
  flex-direction: row-reverse;
}
[dir="rtl"] .panel-price-wrap {
  align-items: flex-start;
}

/* Command palette */
[dir="rtl"] #cmd-palette-overlay > div {
  direction: rtl;
}
[dir="rtl"] #cmd-palette-results [data-idx] {
  flex-direction: row-reverse;
}

/* Sync toolbar */
[dir="rtl"] #sync-toolbar {
  flex-direction: row-reverse;
}

/* Object tree */
[dir="rtl"] #obj-tree-panel {
  right: auto;
  left: 0;
  border-left: none;
  border-right: 1px solid var(--border);
  box-shadow: 6px 0 24px rgba(0,0,0,.5);
}

/* Exchange premium bar */
[dir="rtl"] #exchange-premium-bar {
  flex-direction: row-reverse;
}
[dir="rtl"] #epb-inner {
  flex-direction: row-reverse;
}

/* Landing page */
[dir="rtl"] .hero-inner {
  direction: rtl;
}
[dir="rtl"] .nav-links {
  flex-direction: row-reverse;
}
[dir="rtl"] nav {
  flex-direction: row-reverse;
}
[dir="rtl"] .feat-card,
[dir="rtl"] .adv-card {
  text-align: right;
}
[dir="rtl"] .feat-num {
  right: auto;
  left: 24px;
}
[dir="rtl"] .section-label::before {
  display: none;
}
[dir="rtl"] .section-label::after {
  content: '';
  width: 24px;
  height: 1px;
  background: var(--accent);
  display: inline-block;
  margin-right: 8px;
}

/* Scrollbars RTL */
[dir="rtl"] *::-webkit-scrollbar {
  /* Les scrollbars RTL sont gérées nativement par le navigateur */
}

/* Correction : les nombres (prix, %) restent LTR même en RTL */
[dir="rtl"] .t-price,
[dir="rtl"] .stat-value,
[dir="rtl"] #live-price,
[dir="rtl"] .panel-live,
[dir="rtl"] .panel-pct,
[dir="rtl"] #price-change,
[dir="rtl"] .hstat-val {
  direction: ltr;
  unicode-bidi: embed;
}
`;

// ══════════════════════════════════════════════════════════════
//  API publique
// ══════════════════════════════════════════════════════════════

/**
 * Applique ou retire le mode RTL selon la locale fournie.
 * @param {string} locale — clé courte ('ar') ou BCP-47 ('ar-SA')
 */
export function applyRTL(locale) {
  const shortLocale = (locale ?? '').split('-')[0].toLowerCase();
  const bcp47       = locale ?? '';
  const shouldBeRTL = RTL_LOCALES.has(shortLocale) || RTL_LOCALES.has(bcp47);
  const newDir      = shouldBeRTL ? 'rtl' : 'ltr';

  if (newDir === _currentDir) return; // rien à faire

  _currentDir = newDir;

  // ── <html dir="..."> ─────────────────────────────────────
  document.documentElement.setAttribute('dir', newDir);
  document.documentElement.setAttribute('lang', shortLocale || 'fr');

  // ── Injection / retrait du bloc <style> RTL ───────────────
  if (shouldBeRTL) {
    _injectRTLStyles();
  } else {
    _removeRTLStyles();
  }

  // ── Notification pour les composants abonnés ──────────────
  window.dispatchEvent(new CustomEvent('rtl:change', {
    detail: { dir: newDir, locale },
  }));
}

/**
 * Retourne true si la direction courante est RTL.
 * @returns {boolean}
 */
export function isRTL() {
  return _currentDir === 'rtl';
}

/**
 * Retourne 'rtl' ou 'ltr'.
 * @returns {'rtl'|'ltr'}
 */
export function getDir() {
  return _currentDir;
}

/**
 * Retourne la valeur CSS `margin-inline-start` / `margin-inline-end`
 * de façon logique (adapté à la direction courante).
 * Utile pour les composants JS qui calculent des positions.
 *
 * @param {'start'|'end'} side
 * @returns {'left'|'right'}
 */
export function logicalSide(side) {
  if (_currentDir === 'rtl') {
    return side === 'start' ? 'right' : 'left';
  }
  return side === 'start' ? 'left' : 'right';
}

// ── Injection du bloc <style> ─────────────────────────────────

function _injectRTLStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style       = document.createElement('style');
  style.id          = STYLE_ID;
  style.textContent = RTL_CSS;
  document.head.appendChild(style);
}

function _removeRTLStyles() {
  document.getElementById(STYLE_ID)?.remove();
}

// ── Écoute automatique des changements de locale ──────────────

window.addEventListener('i18n:locale:change', ({ detail }) => {
  if (detail?.locale) applyRTL(detail.locale);
});

// ── Initialisation au chargement ──────────────────────────────
// Lit la direction depuis le HTML (anti-flash) ou le localStorage.
(function _init() {
  const htmlDir  = document.documentElement.getAttribute('dir');
  const stored   = localStorage.getItem('crypview_locale') ?? ''; // ← clé identique à i18n.js
  const shortKey = stored.split('-')[0].toLowerCase();

  const shouldBeRTL = htmlDir === 'rtl'
    || RTL_LOCALES.has(shortKey)
    || RTL_LOCALES.has(stored);

  if (shouldBeRTL) {
    _currentDir = 'rtl';
    _injectRTLStyles();
    document.documentElement.setAttribute('dir', 'rtl');
  }
})();
