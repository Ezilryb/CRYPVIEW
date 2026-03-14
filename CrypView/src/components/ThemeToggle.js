// ============================================================
//  src/components/ThemeToggle.js — CrypView V2
//  Composant de bascule de thème Light / Dark.
//  Respecte le pattern ES6 du projet (pas de framework).
//
//  Usage :
//    import { ThemeToggle } from './components/ThemeToggle.js';
//    const toggle = new ThemeToggle();
//    toggle.mount(document.getElementById('header'));
// ============================================================

import { THEME } from '../config.js';

export class ThemeToggle {
  /** @type {'dark'|'light'} */
  #current;

  /** @type {HTMLButtonElement|null} */
  #btn = null;

  constructor() {
    // Priorité : localStorage → préférence système → défaut config
    const saved = localStorage.getItem(THEME.STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      this.#current = saved;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.#current = prefersDark ? 'dark' : THEME.DEFAULT;
    }
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Injecte le bouton dans le conteneur cible.
   * @param {HTMLElement} container — élément parent (ex: header)
   */
  mount(container) {
    this.#btn = document.createElement('button');
    this.#btn.id            = 'theme-toggle';
    this.#btn.title         = 'Changer de thème';
    this.#btn.setAttribute('aria-label', 'Basculer thème clair/sombre');
    this.#btn.style.cssText = 'margin-left: auto; font-size: 14px; padding: 6px 10px;';

    this.#btn.addEventListener('click', () => this.toggle());

    container.appendChild(this.#btn);

    // Applique l'état initial (sans transition pour éviter le flash)
    this.#applyTheme(false);
  }

  /** Bascule entre dark et light. */
  toggle() {
    this.#current = this.#current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME.STORAGE_KEY, this.#current);
    this.#applyTheme(true);
  }

  /**
   * Force un thème spécifique (appelé depuis ContextMenu).
   * @param {'dark'|'light'} theme
   */
  setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    this.#current = theme;
    localStorage.setItem(THEME.STORAGE_KEY, this.#current);
    this.#applyTheme(true);
  }

  /** Retourne le thème courant. */
  get current() { return this.#current; }

  // ── Privé ─────────────────────────────────────────────────

  /**
   * Applique la classe CSS sur <html> et met à jour le bouton.
   * @param {boolean} animated — active la transition CSS
   */
  #applyTheme(animated) {
    const html = document.documentElement;

    if (!animated) {
      // Bloque les transitions pendant l'init (évite le flash)
      html.style.transition = 'none';
      html.offsetHeight;          // force reflow
    }

    if (this.#current === 'light') {
      html.classList.add(THEME.CSS_CLASS);
    } else {
      html.classList.remove(THEME.CSS_CLASS);
    }

    if (!animated) {
      // Réactive les transitions après la pose de la classe
      requestAnimationFrame(() => { html.style.transition = ''; });
    }

    // Notifie tous les charts de la page via un événement global
    document.dispatchEvent(new CustomEvent('crypview:theme:change', {
      detail: { theme: this.#current }
    }));

    this.#updateButton();
  }

  /** Met à jour l'icône et le label accessible du bouton. */
  #updateButton() {
    if (!this.#btn) return;
    const isLight = this.#current === 'light';
    this.#btn.textContent = isLight ? '🌙' : '☀️';
    this.#btn.setAttribute(
      'aria-label',
      isLight ? 'Passer en thème sombre' : 'Passer en thème clair'
    );
  }

  /** Libère les références DOM (bonne pratique cursorrules). */
  destroy() {
    this.#btn?.remove();
    this.#btn = null;
  }
}