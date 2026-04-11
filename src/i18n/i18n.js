// ============================================================
//  src/i18n/i18n.js — CrypView i18n Engine V1
//  Détection, chargement dynamique, interpolation, pluriel, RTL.
//
//  API publique :
//    await initI18n()           — détecte et charge la locale
//    t('key.sub', { n: 3 })    — traduit (vars + pluriel)
//    await setLocale('fr')      — change la locale à chaud
//    getLocale()                — locale courante
//    onLocaleChange(fn)         — abonnement aux changements
//    offLocaleChange(fn)        — désabonnement
//    SUPPORTED_LOCALES          — locales disponibles
//    LOCALE_META                — { label, flag, direction }
// ============================================================

// ── Config ────────────────────────────────────────────────────
const STORAGE_KEY = 'crypview_locale';

import { applyRTL } from '../utils/rtl.js';

export const SUPPORTED_LOCALES = ['en', 'fr', 'zh', 'ar'];

export const LOCALE_META = {
  en: { label: 'English',       flag: '🇬🇧', direction: 'ltr' },
  fr: { label: 'Français',      flag: '🇫🇷', direction: 'ltr' },
  zh: { label: '中文（简体）',   flag: '🇨🇳', direction: 'ltr' },
  ar: { label: 'العربية',       flag: '🇸🇦', direction: 'rtl' },
};

const DEFAULT_LOCALE = 'en';

// ── Chargeurs dynamiques (tree-shakable via Vite) ─────────────
const LOADERS = {
  en: () => import('./locales/en.js').then(m => m.default),
  fr: () => import('./locales/fr.js').then(m => m.default),
  zh: () => import('./locales/zh.js').then(m => m.default),
  ar: () => import('./locales/ar.js').then(m => m.default),
};

// ── État interne ──────────────────────────────────────────────
/** @type {Map<string, object>} Cache des données de locale chargées */
const _cache     = new Map();
/** @type {string|null} */
let   _current   = null;
/** @type {object} Données de la locale active */
let   _data      = {};
/** @type {object} Fallback anglais (toujours chargé) */
let   _fallback  = {};
/** @type {Set<function>} Écouteurs de changement de locale */
const _listeners = new Set();

// ── Détection ─────────────────────────────────────────────────

/**
 * Déduit la meilleure locale disponible.
 *
 * Priorité :
 *   1. Préférence persistée (localStorage)
 *   2. navigator.languages  (liste ordonnée du navigateur)
 *   3. navigator.language   (locale principale)
 *   4. DEFAULT_LOCALE       ('en')
 *
 * @returns {string}
 */
export function detectLocale() {
  // 1. Préférence utilisateur persistée
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch (_) {}

  // 2 & 3. Signaux du navigateur
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
    // @ts-ignore — IE/Edge legacy
    navigator.userLanguage,
  ].filter(Boolean);

  for (const lang of candidates) {
    // Toutes les variantes chinoises (zh-Hans, zh-TW, zh-HK…) → 'zh'
    if (/^zh/i.test(lang)) return 'zh';
    // Arabe : ar-SA, ar-EG, ar…
    if (/^ar/i.test(lang)) return 'ar';

    const base = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(base)) return base;
  }

  return DEFAULT_LOCALE;
}

// ── Chargement ────────────────────────────────────────────────

/**
 * Charge et met en cache les données d'une locale.
 * @param {string} locale
 * @returns {Promise<object>}
 */
async function loadLocale(locale) {
  if (_cache.has(locale)) return _cache.get(locale);
  if (!LOADERS[locale])   return _fallback;

  const data = await LOADERS[locale]();
  _cache.set(locale, data);
  return data;
}

// ── Direction (RTL / LTR) ─────────────────────────────────────

function applyDirection(locale) {
  const dir = LOCALE_META[locale]?.direction ?? 'ltr';
  const html = document.documentElement;
  html.setAttribute('dir',  dir);
  html.setAttribute('lang', locale);
  html.classList.toggle('rtl', dir === 'rtl');
}

// ── API publique ──────────────────────────────────────────────

/**
 * Initialise le moteur i18n : détecte et charge la locale optimale.
 * À appeler une seule fois au démarrage, avant tout `t()`.
 *
 * @returns {Promise<string>} locale chargée
 */
export async function initI18n() {
  // Charge toujours l'anglais en fallback en premier
  if (!_cache.has('en')) {
    _fallback = await LOADERS.en();
    _cache.set('en', _fallback);
  } else {
    _fallback = _cache.get('en');
  }

  const locale = detectLocale();
  await setLocale(locale);
  return locale;
}

/**
 * Change la locale à chaud (persiste + notifie les écouteurs).
 * @param {string} locale
 */
export async function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) locale = DEFAULT_LOCALE;
  if (locale === _current) return;

  _data    = await loadLocale(locale);
  _current = locale;

  try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}

  applyDirection(locale);
  applyRTL(locale);

  // Notification fenêtre (composants non-abonnés via onLocaleChange)
  window.dispatchEvent(new CustomEvent('i18n:locale:change', {
    detail: { locale, dir: LOCALE_META[locale]?.direction ?? 'ltr' },
  }));

  // Notification des abonnés (composants qui se re-renderent)
  _listeners.forEach(fn => { try { fn(locale); } catch (_) {} });
}

/** @returns {string} locale active */
export function getLocale() { return _current ?? DEFAULT_LOCALE; }

/**
 * Abonnement aux changements de locale.
 * @param {function(string):void} fn
 * @returns {function} fonction de désabonnement
 */
export function onLocaleChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── Traduction ────────────────────────────────────────────────

/**
 * Résout une clé en chemin imbriqué.
 * @param {object} data
 * @param {string} path — ex: 'header.status.live'
 * @returns {unknown}
 */
function _resolve(data, path) {
  const parts = path.split('.');
  let node = data;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

/**
 * Traduit une clé avec variables et gestion des pluriels.
 *
 * Exemples :
 *   t('header.status.live')                         → 'Live'
 *   t('alerts.created', { sym: 'BTC', price: 70000 })
 *   t('screener.pairs', { n: 3 })                   → '3 pairs'
 *   t('indicators.activeCount', { count: 1 })       → '1 indicator'
 *
 * Pluriel : clé dont la valeur contient '||'
 *   'singular form||plural form'
 *   Utilisé quand vars contient `count` ou `n`.
 *
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  let raw = _resolve(_data, key) ?? _resolve(_fallback, key);

  if (raw == null) {
    if (import.meta.env?.DEV) console.warn(`[i18n] Missing key: "${key}" (locale: ${_current})`);
    return key;
  }

  // Pluralisation : 'singular||plural'
  if (typeof raw === 'string' && raw.includes('||')) {
    const [singular, plural] = raw.split('||');
    const count = vars.count ?? vars.n ?? 1;
    raw = Number(count) === 1 ? singular : plural;
  }

  // Interpolation des variables {varName}
  if (typeof raw === 'string') {
    return raw.replace(/\{(\w+)\}/g, (match, k) =>
      vars[k] !== undefined ? String(vars[k]) : match
    );
  }

  // Objet ou autre type retourné tel quel (par ex. pour _meta)
  return String(raw);
}

/**
 * Retourne le sous-objet brut d'une clé (sans interpolation).
 * Utile pour les boucles sur des listes de clés.
 * @param {string} key
 * @returns {object|undefined}
 */
export function tObj(key) {
  return _resolve(_data, key) ?? _resolve(_fallback, key);
}