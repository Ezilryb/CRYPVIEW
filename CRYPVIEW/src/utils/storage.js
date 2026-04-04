// ============================================================
//  src/utils/storage.js — CrypView V2
//  Abstraction localStorage avec gestion du quota, sérialisation
//  JSON et API typée. Remplace les accès directs dispersés dans
//  8+ fichiers (AlertManager, ChartDrawing, SettingsModal…).
//
//  Problèmes résolus :
//    - QuotaExceededError silencieux → toast + dégradation gracieuse
//    - JSON.parse/stringify répété sans try/catch → encapsulé ici
//    - Clés non préfixées → collisions entre pages
//
//  Usage :
//    import { storage } from '../utils/storage.js';
//
//    storage.set('crypview_alerts_v1', alerts);          // JSON auto
//    const alerts = storage.get('crypview_alerts_v1');   // → valeur parsée ou null
//    storage.remove('crypview_drawings_v2');
//    storage.clear('crypview_');                          // purge par préfixe
//    storage.size();                                      // octets utilisés (estimé)
// ============================================================

import { logger } from './logger.js';

// ── Capacité estimée de localStorage (5 MB standard) ─────────
const QUOTA_WARNING_BYTES = 4 * 1024 * 1024; // avertir à partir de 4 MB

// ── Implémentation ────────────────────────────────────────────

/**
 * Vérifie si localStorage est disponible (peut être absent en iframe
 * sandboxé, en navigation privée bloquée, ou côté Worker).
 * @returns {boolean}
 */
function isAvailable() {
  try {
    const probe = '__crypview_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (_) {
    return false;
  }
}

const AVAILABLE = isAvailable();

// ── API publique ───────────────────────────────────────────────

export const storage = {
  /**
   * Lit et désérialise une valeur.
   * @template T
   * @param {string} key
   * @param {T}      [fallback=null] — valeur retournée si clé absente ou JSON invalide
   * @returns {T|null}
   */
  get(key, fallback = null) {
    if (!AVAILABLE) return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      logger.warn(`[storage] Lecture échouée pour "${key}" — données corrompues, fallback utilisé.`);
      return fallback;
    }
  },

  /**
   * Sérialise et persiste une valeur.
   * Retourne `false` si l'écriture a échoué (quota dépassé, mode privé).
   * @param {string}  key
   * @param {unknown} value
   * @returns {boolean}
   */
  set(key, value) {
    if (!AVAILABLE) return false;
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);

      // Avertissement proactif si on approche du quota
      if (serialized.length > 100_000) {
        const used = storage.size();
        if (used > QUOTA_WARNING_BYTES) {
          logger.warn(`[storage] Stockage local proche du quota (${(used / 1024 / 1024).toFixed(1)} MB utilisés).`);
        }
      }

      return true;
    } catch (err) {
      if (err instanceof DOMException && (
        err.code === 22 ||                          // QUOTA_EXCEEDED_ERR (Chrome/FF)
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED'   // Firefox
      )) {
        logger.error(`[storage] Quota localStorage dépassé — "${key}" non sauvegardé. Libérez de l'espace ou effacez les données du site.`);
      } else {
        logger.warn(`[storage] Écriture échouée pour "${key}".`, err);
      }
      return false;
    }
  },

  /**
   * Supprime une clé.
   * @param {string} key
   */
  remove(key) {
    if (!AVAILABLE) return;
    try { localStorage.removeItem(key); } catch (_) {}
  },

  /**
   * Purge toutes les clés correspondant à un préfixe donné.
   * Utile pour nettoyer les données d'une version précédente.
   * @param {string} prefix — ex: 'crypview_' pour tout purger
   * @returns {number} nombre de clés supprimées
   */
  clear(prefix = '') {
    if (!AVAILABLE) return 0;
    try {
      const toDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (!prefix || k.startsWith(prefix))) toDelete.push(k);
      }
      toDelete.forEach(k => localStorage.removeItem(k));
      return toDelete.length;
    } catch (_) {
      return 0;
    }
  },

  /**
   * Estime les octets utilisés par localStorage.
   * Méthode approchée (UTF-16 × 2 octets par caractère).
   * @returns {number} taille estimée en octets
   */
  size() {
    if (!AVAILABLE) return 0;
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) ?? '';
        const v = localStorage.getItem(k) ?? '';
        total += (k.length + v.length) * 2;
      }
      return total;
    } catch (_) {
      return 0;
    }
  },

  /**
   * Indique si localStorage est disponible dans ce contexte.
   * @returns {boolean}
   */
  get available() { return AVAILABLE; },
};
