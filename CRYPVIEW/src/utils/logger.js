// ============================================================
//  src/utils/logger.js — CrypView V2
//  Logger centralisé conforme à la règle cursorrules :
//  "Toast visuel sur toutes les erreurs (jamais console.error)"
//
//  Niveaux :
//    logger.warn(msg)   → toast 'warning' + console.warn (dev)
//    logger.error(msg)  → toast 'error'   + console.error (dev)
//    logger.info(msg)   → toast 'info'    (silencieux en prod)
//
//  Usage :
//    import { logger } from '../utils/logger.js';
//    logger.warn('[WSPool] Pool saturé — stream ignoré');
//    logger.error('[Worker] Calcul échoué', err);
//
//  Remplacement direct :
//    console.warn(msg)  → logger.warn(msg)
//    console.error(msg) → logger.error(msg)
// ============================================================

import { showToast } from './toast.js';

// ── Détection de l'environnement ──────────────────────────────
// Vite expose import.meta.env.DEV ; en dehors de Vite (tests,
// workers), on retombe sur la variable NODE_ENV ou sur "prod".
const IS_DEV = (() => {
  try { return import.meta.env.DEV; } catch (_) {}
  try { return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'; } catch (_) {}
  return false;
})();

// ── Durées d'affichage par niveau ─────────────────────────────
const DURATION = {
  info:    3_500,
  warning: 5_000,
  error:   8_000,
};

// ── Implémentation ────────────────────────────────────────────

/**
 * Affiche un toast et, en développement, logue aussi en console.
 *
 * @param {'info'|'warning'|'error'} level
 * @param {string}                   message   — texte affiché dans le toast
 * @param {unknown}                  [detail]  — objet supplémentaire (console seulement)
 */
function log(level, message, detail) {
  // Toast visuel — toujours, prod comme dev
  showToast(message, level === 'warning' ? 'warning' : level, DURATION[level]);

  // Console — dev seulement, pour ne pas polluer la prod
  if (!IS_DEV) return;

  const prefix = `[CrypView/${level.toUpperCase()}]`;
  if (level === 'error') {
    detail !== undefined
      ? console.error(prefix, message, detail)
      : console.error(prefix, message);
  } else if (level === 'warning') {
    detail !== undefined
      ? console.warn(prefix, message, detail)
      : console.warn(prefix, message);
  } else {
    detail !== undefined
      ? console.info(prefix, message, detail)
      : console.info(prefix, message);
  }
}

// ── API publique ───────────────────────────────────────────────

export const logger = {
  /**
   * Avertissement non-bloquant (ex: reconnexion WS, calcul dégradé).
   * @param {string}  message
   * @param {unknown} [detail]
   */
  warn: (message, detail) => log('warning', message, detail),

  /**
   * Erreur significative (ex: worker crash, REST indisponible).
   * @param {string}  message
   * @param {unknown} [detail]
   */
  error: (message, detail) => log('error', message, detail),

  /**
   * Information neutre (ex: reconnexion réussie, cache hit).
   * Silencieux en production (pas de toast pour éviter le bruit).
   * @param {string}  message
   * @param {unknown} [detail]
   */
  info: (message, detail) => {
    if (IS_DEV) log('info', message, detail);
  },
};
