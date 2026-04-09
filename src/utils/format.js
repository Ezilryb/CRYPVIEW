// ============================================================
//  src/utils/format.js — CrypView V2 (i18n bridge)
//  Point d'entrée rétro-compatible vers format.i18n.js.
//
//  Tous les imports existants de format.js continuent de
//  fonctionner sans modification. Les fonctions retournées
//  sont désormais locale-aware (Intl.NumberFormat).
//
//  Nouveaux exports disponibles :
//    fmtDate, fmtDateTime, fmtRelative, fmtDuration,
//    fmtCurrency, fmtNumber, fmt (façade)
// ============================================================

export {
  fmtPrice,
  fmtVol,
  fmtPct,
  fmtPctChange,
  fmtTime,
  fmtDate,
  fmtDateTime,
  fmtRelative,
  fmtDuration,
  fmtCurrency,
  fmtNumber,
  fmt,
} from './format.i18n.js';
