// ============================================================
//  src/components/SettingsModal.js — CrypView V2
//  Modal de paramètres (thème). Même pattern visuel que
//  IndicatorModal : overlay centré, cartes ON/OFF cliquables.
//  v1.1 : Patch accessibilité — FocusTrap, markAsDialog.
//  v1.2 : Patch i18n — LanguageSelector intégré.
// ============================================================

import { THEME } from '../config.js';
import { FocusTrap, markAsDialog } from '../utils/a11y.js';
import { SUPPORTED_LOCALES, LOCALE_META, getLocale, setLocale, onLocaleChange } from '../i18n/i18n.js';
import { LanguageSelector } from './LanguageSelector.js';

export class SettingsModal {
  #overlay;
  #current;
  #callbacks;
  #trap;
  #langSelector = null;
  #langUnsub    = null;

  /** @param {{ onThemeChange: function(string) }} callbacks */
  constructor(callbacks) {
    this.#overlay   = document.getElementById('settings-modal-overlay');
    this.#callbacks = callbacks;
    this.#current   = localStorage.getItem(THEME.STORAGE_KEY) ?? THEME.DEFAULT;

    // Piège de focus + rôle dialog WCAG 2.1
    this.#trap = new FocusTrap(this.#overlay);
    markAsDialog(this.#overlay, this.#overlay?.querySelector('h2, h3'));

    this.#bindStaticEvents();

    // Instancie le sélecteur (monté dans render())
    this.#langSelector = new LanguageSelector();
    this.#langUnsub    = onLocaleChange(() => this.#renderLang());
  }

  // ── API publique ──────────────────────────────────────────

  open() {
    this.#render();
    this.#overlay.style.display = 'block';
    this.#trap.activate();
  }

  close() {
    this.#trap.deactivate();
    this.#overlay.style.display = 'none';
  }

  /** Sync externe : appelé quand le thème change ailleurs. */
  setCurrentTheme(theme) {
    this.#current = theme;
    this.#render();
  }

  destroy() {
    this.#langUnsub?.();
    this.#langSelector?.destroy();
    this.#trap.deactivate();
    this.#overlay = null;
  }

  // ── Rendu ─────────────────────────────────────────────────

  #render() {
    const grid = document.getElementById('settings-modal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Thèmes
    const themes = [
      { key: 'dark',  label: 'Thème sombre', desc: 'Optimisé pour les environnements peu éclairés', icon: '🌑', color: '#8b949e' },
      { key: 'light', label: 'Thème clair',  desc: 'Optimisé pour les environnements lumineux',    icon: '☀️', color: '#f7c948' },
    ];
    themes.forEach(t => grid.appendChild(this.#makeCard(t)));

    // ── Section Langue ─────────────────────────────────────────
    const langLabel = document.createElement('div');
    langLabel.className   = 'modal-section-label';
    langLabel.textContent = '🌐 Langue / Language';
    grid.parentElement.insertBefore(langLabel, grid);   // avant la grille

    // Slot pour le sélecteur
    const langSlot = document.getElementById('settings-lang-slot') ?? this.#makeLangSlot(grid);

    // Monte le sélecteur si pas encore fait
    if (!langSlot.hasChildNodes()) {
      this.#langSelector.mount(langSlot);
    }
  }

  #makeLangSlot(grid) {
    const slot = document.createElement('div');
    slot.id = 'settings-lang-slot';
    slot.style.cssText = 'padding:0 14px 8px;';
    grid.parentElement.insertBefore(slot, grid);
    return slot;
  }

  #renderLang() {
    // Le LanguageSelector se met à jour via onLocaleChange — rien à faire
  }

  #makeCard({ key, label, desc, icon, color }) {
    const active = this.#current === key;

    const card = document.createElement('div');
    card.style.cssText = `
      display:flex; align-items:center; gap:12px;
      padding:12px 14px; border-radius:8px; cursor:pointer;
      border:1px solid ${active ? color + '55' : '#1c2333'};
      background:${active ? color + '0d' : 'rgba(255,255,255,.02)'};
      transition:all .15s;
    `;
    card.addEventListener('mouseenter', () => {
      if (!active) card.style.borderColor = color + '33';
    });
    card.addEventListener('mouseleave', () => {
      if (!active) card.style.borderColor = '#1c2333';
    });

    const dot = document.createElement('div');
    dot.style.cssText = `
      width:32px; height:32px; border-radius:50%;
      background:${color}22; border:1px solid ${color}44;
      display:flex; align-items:center; justify-content:center;
      font-size:15px; flex-shrink:0;
    `;
    dot.textContent = icon;

    const info = document.createElement('div');
    info.style.cssText = 'flex:1; min-width:0;';

    const name = document.createElement('div');
    name.style.cssText = `font-size:11px; font-weight:700; color:${active ? color : '#e6edf3'};`;
    name.textContent = label;

    const sub = document.createElement('div');
    sub.style.cssText = 'font-size:9px; color:#8b949e; margin-top:3px;';
    sub.textContent = desc;

    info.append(name, sub);

    const badge = document.createElement('div');
    badge.style.cssText = active
      ? `font-size:8px;padding:2px 7px;border-radius:3px;font-weight:700;letter-spacing:.5px;border:1px solid;background:${color}22;color:${color};border-color:${color}55;`
      : 'font-size:8px;padding:2px 7px;border-radius:3px;font-weight:700;letter-spacing:.5px;border:1px solid;background:transparent;color:#8b949e;border-color:#1c2333;';
    badge.textContent = active ? 'ON' : 'OFF';

    card.append(dot, info, badge);

    card.addEventListener('click', () => {
      this.#current = key;
      this.#callbacks.onThemeChange?.(key);
      this.#render();
    });

    return card;
  }

  // ── Événements statiques ──────────────────────────────────

  #bindStaticEvents() {
    document.getElementById('settings-modal-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') this.close();
    });
  }
}
