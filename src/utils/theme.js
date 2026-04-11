// ============================================================
//  src/utils/theme.js — CrypView V2
//  Source unique de la logique d'application de thème.
//  Élimine la duplication entre page.js et multi.js.
//
//  Usage :
//    import { applyTheme, initTheme } from '../utils/theme.js';
//    initTheme();                     // sans animation (boot)
//    applyTheme('light');             // avec animation (user action)
// ============================================================

import { THEME } from '../config.js';
import { applyRTL } from './rtl.js';

/**
 * Applique un thème, le persiste et notifie tous les charts via CustomEvent.
 * @param {'dark'|'light'} theme
 * @param {boolean}        [animated=true] — false au boot pour éviter le flash
 */
export function applyTheme(theme, animated = true) {
  const html = document.documentElement;

  if (!animated) {
    html.style.transition = 'none';
    html.offsetHeight; // force reflow
  }

  html.classList.toggle(THEME.CSS_CLASS, theme === 'light');

  if (!animated) {
    requestAnimationFrame(() => { html.style.transition = ''; });
  }

  localStorage.setItem(THEME.STORAGE_KEY, theme);

  document.dispatchEvent(new CustomEvent('crypview:theme:change', {
    detail: { theme },
  }));
}

/**
 * Lit la préférence stockée et applique le thème sans transition.
 * À appeler une seule fois au démarrage de chaque page.
 */
export function initTheme() {
  const saved       = localStorage.getItem(THEME.STORAGE_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme       = saved === 'light' || saved === 'dark'
    ? saved
    : prefersDark ? 'dark' : THEME.DEFAULT;
  applyTheme(theme, false);

  // Applique la direction RTL/LTR si une locale est déjà persistée
  const storedLocale = localStorage.getItem('crypview_locale');
  if (storedLocale) applyRTL(storedLocale);
}
