// ============================================================
//  src/utils/indMeta.js — CrypView i18n
//  Helper : fusionne IND_META (config) avec les traductions i18n.
//  Remplace tous les accès directs à IND_META[key] quand on
//  veut afficher le label ou la description à l'utilisateur.
// ============================================================

import { IND_META } from '../config.js';
import { t }        from '../i18n/i18n.js';

/**
 * Retourne les métadonnées d'un indicateur avec label/desc traduits.
 * Fallback automatique sur les valeurs de config.js si la clé i18n est absente.
 *
 * @param {string} key — clé IND_META (ex: 'rsi', 'macd')
 * @returns {object|null}
 */
export function getIndMeta(key) {
  const base = IND_META[key];
  if (!base) return null;

  const labelKey = `indicators.meta.${key}.label`;
  const descKey  = `indicators.meta.${key}.desc`;

  const labelT = t(labelKey);
  const descT  = t(descKey);

  return {
    ...base,
    // Utilise la traduction seulement si la clé a été résolue
    label: labelT !== labelKey ? labelT : base.label,
    desc:  descT  !== descKey  ? descT  : base.desc,
  };
}