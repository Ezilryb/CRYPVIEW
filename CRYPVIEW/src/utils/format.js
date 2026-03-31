// ============================================================
//  src/utils/format.js — CrypView V2
//  Fonctions pures de formatage des données numériques.
//  Aucune dépendance DOM — testables unitairement.
// ============================================================

/**
 * Formate un prix selon son ordre de grandeur.
 * - ≥ 1000  → séparateur de milliers FR, 2 décimales  (ex: 67 234,56)
 * - ≥ 1     → 4 décimales                              (ex: 2,4561)
 * - < 1     → 6 décimales                              (ex: 0,000412)
 *
 * @param {number|string} p
 * @returns {string}
 */
export function fmtPrice(p) {
  p = parseFloat(p);
  if (!p) return '—';
  if (p >= 1000) return p.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1)    return p.toFixed(4);
  return p.toFixed(6);
}

/**
 * Formate un volume avec suffixe B / M / K.
 *
 * ── Échelles ──────────────────────────────────────────────
 * ≥ 1 000 000 000 → milliards  (ex: 1.23B)
 * ≥ 1 000 000     → millions   (ex: 45.67M)
 * ≥ 1 000         → milliers   (ex: 123.4K)
 * < 1 000         → valeur brute à 2 décimales
 *
 * Utilisateurs :
 *   - Sidebar.js (stats 24h)
 *   - src/pages/index.js (ticker landing page)
 *
 * @param {number|string} v
 * @returns {string}
 */
export function fmtVol(v) {
  v = parseFloat(v);
  if (!isFinite(v)) return '—';
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(2);
}

/**
 * Formate un timestamp Unix (ms) en heure locale HH:MM:SS.
 * @param {number} ms
 * @returns {string}
 */
export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('fr-FR', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Calcule et formate la variation en pourcentage par rapport au prix d'ouverture 24h.
 * @param {number} price    — Prix courant
 * @param {number} open24   — Prix d'ouverture 24h
 * @returns {string}        — Ex: "+2.45%" ou "-1.20%"
 */
export function fmtPctChange(price, open24) {
  if (!open24) return '—';
  const pct = (price - open24) / open24 * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
}
