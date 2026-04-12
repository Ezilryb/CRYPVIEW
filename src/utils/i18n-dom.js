// ============================================================
//  src/utils/i18n-dom.js — CrypView i18n
//  Applique les traductions à tous les éléments statiques du DOM
//  portant data-i18n ou data-i18n-ph (placeholder).
//
//  Usage :
//    import { applyDOMTranslations } from './i18n-dom.js';
//    applyDOMTranslations();                      // tout le document
//    applyDOMTranslations(someModalEl);           // sous-arbre ciblé
// ============================================================

import { t } from '../i18n/i18n.js';

/**
 * Parcourt le sous-arbre DOM et remplace le contenu textuel
 * (ou placeholder) de chaque élément portant data-i18n / data-i18n-ph.
 *
 * @param {HTMLElement|Document} [root=document] — racine de la recherche
 */
export function applyDOMTranslations(root = document) {
  // ── Contenu textuel ──────────────────────────────────────
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!key) return;

    // Récupère les variables de substitution depuis data-i18n-vars (JSON)
    let vars = {};
    if (el.dataset.i18nVars) {
      try { vars = JSON.parse(el.dataset.i18nVars); } catch (_) {}
    }

    const translated = t(key, vars);
    // Ne remplace que si la clé a été résolue (évite d'afficher la clé brute)
    if (translated && translated !== key) {
      // Certains éléments contiennent du HTML inline (ex: <br>, <strong>) —
      // on ne touche qu'aux nœuds texte purs pour ne pas détruire la structure.
      if (el.children.length === 0) {
        el.textContent = translated;
      } else {
        // Met à jour uniquement le premier nœud texte direct
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = translated;
            break;
          }
        }
      }
    }
  });

  // ── Placeholders ─────────────────────────────────────────
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (!key) return;
    const translated = t(key);
    if (translated && translated !== key) {
      el.placeholder = translated;
    }
  });

  // ── Attributs aria-label traduits (data-i18n-aria) ───────
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (!key) return;
    const translated = t(key);
    if (translated && translated !== key) {
      el.setAttribute('aria-label', translated);
    }
  });
}
