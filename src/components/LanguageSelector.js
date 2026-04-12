// ============================================================
//  src/components/LanguageSelector.js — CrypView i18n V1
//  Sélecteur de langue : affiche un bouton avec la locale
//  courante et un menu déroulant pour en changer.
//
//  Autonome — s'injecte n'importe où via mount(containerEl).
//  Se détruit proprement avec destroy().
//
//  Usage :
//    const sel = new LanguageSelector();
//    sel.mount(document.getElementById('settings-lang-slot'));
// ============================================================

import { SUPPORTED_LOCALES, LOCALE_META, getLocale, setLocale, onLocaleChange } from '../i18n/i18n.js';

export class LanguageSelector {
  #root    = null;
  #menu    = null;
  #trigger = null;
  #unsub   = null;
  #open    = false;

  // ── API publique ──────────────────────────────────────────

  /**
   * Injecte le composant dans un conteneur.
   * @param {HTMLElement} container
   */
  mount(container) {
    if (!container) return;
    this.#build();
    container.appendChild(this.#root);
    this.#unsub = onLocaleChange(() => this.#refresh());
  }

  destroy() {
    this.#unsub?.();
    this.#menu && document.body.removeChild(this.#menu);
    this.#root?.remove();
    this.#root = this.#menu = this.#trigger = null;
  }

  // ── Construction DOM ──────────────────────────────────────

  #build() {
    // Conteneur racine
    this.#root = document.createElement('div');
    this.#root.className = 'lang-selector';
    this.#root.style.cssText = 'position:relative;display:inline-flex;';

    // Bouton déclencheur
    this.#trigger = document.createElement('button');
    this.#trigger.className = 'lang-trigger';
    this.#trigger.setAttribute('aria-haspopup', 'listbox');
    this.#trigger.setAttribute('aria-expanded', 'false');
    this.#trigger.setAttribute('aria-label', 'Change language');
    this.#trigger.style.cssText = `
      display:flex;align-items:center;gap:7px;
      padding:6px 12px;border-radius:5px;cursor:pointer;
      font-family:'Space Mono',monospace;font-size:11px;
      background:rgba(255,255,255,.04);border:1px solid var(--border);
      color:var(--text);transition:all .15s;white-space:nowrap;
    `;

    this.#trigger.addEventListener('click', e => {
      e.stopPropagation();
      this.#open ? this.#closeMenu() : this.#openMenu();
    });
    this.#trigger.addEventListener('mouseenter', () => {
      this.#trigger.style.borderColor = 'var(--accent)';
    });
    this.#trigger.addEventListener('mouseleave', () => {
      if (!this.#open) this.#trigger.style.borderColor = 'var(--border)';
    });

    this.#root.appendChild(this.#trigger);

    // Menu flottant (injecté dans body pour éviter les overflow:hidden)
    this.#menu = document.createElement('div');
    this.#menu.className = 'lang-menu';
    this.#menu.setAttribute('role', 'listbox');
    this.#menu.setAttribute('aria-label', 'Select language');
    this.#menu.style.cssText = `
      display:none;
      position:fixed;z-index:70000;
      background:var(--panel);border:1px solid var(--border);
      border-radius:8px;padding:5px 0;min-width:180px;
      box-shadow:0 12px 36px rgba(0,0,0,.85);
      font-family:'Space Mono',monospace;font-size:11px;
    `;

    SUPPORTED_LOCALES.forEach(locale => {
      const item = this.#buildItem(locale);
      this.#menu.appendChild(item);
    });

    document.body.appendChild(this.#menu);

    // Fermeture au clic extérieur
    document.addEventListener('click', () => this.#closeMenu());
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#open) this.#closeMenu();
    });

    this.#refresh();
  }

  #buildItem(locale) {
    const meta = LOCALE_META[locale];
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    item.dataset.locale = locale;
    item.style.cssText = `
      display:flex;align-items:center;gap:10px;
      padding:8px 14px;cursor:pointer;transition:background .1s;
    `;

    item.addEventListener('click', async e => {
      e.stopPropagation();
      await setLocale(locale);   // persiste dans localStorage
      this.#closeMenu();
      window.location.reload();  // recharge avec la nouvelle locale
    });
    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(0,255,136,.07)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = '';
    });

    const flag  = document.createElement('span');
    flag.style.cssText = 'font-size:16px;flex-shrink:0;';
    flag.textContent   = meta.flag;

    const label = document.createElement('span');
    label.className = 'lang-item-label';
    label.textContent = meta.label;

    const rtlBadge = meta.direction === 'rtl'
      ? this.#badge('RTL', 'rgba(0,200,255,.1)', '#00c8ff')
      : null;

    const check = document.createElement('span');
    check.className = 'lang-check';
    check.style.cssText = `
      margin-left:auto;font-size:12px;
      color:var(--accent);opacity:0;transition:opacity .1s;
    `;
    check.textContent = '✓';

    item.append(flag, label, ...(rtlBadge ? [rtlBadge] : []), check);
    return item;
  }

  #badge(text, bg, color) {
    const el = document.createElement('span');
    el.style.cssText = `
      font-size:8px;padding:1px 6px;border-radius:3px;
      background:${bg};color:${color};font-weight:700;
      letter-spacing:.4px;flex-shrink:0;
    `;
    el.textContent = text;
    return el;
  }

  // ── Menu open/close ───────────────────────────────────────

  #openMenu() {
    this.#open = true;
    this.#trigger.setAttribute('aria-expanded', 'true');
    this.#trigger.style.borderColor = 'var(--accent)';

    // Position sous le trigger
    const rect = this.#trigger.getBoundingClientRect();
    const mw   = 184;
    let   left = rect.left;
    if (left + mw > window.innerWidth - 8) left = rect.right - mw;

    this.#menu.style.top     = `${rect.bottom + 4}px`;
    this.#menu.style.left    = `${left}px`;
    this.#menu.style.display = 'block';

    this.#refresh();
  }

  #closeMenu() {
    this.#open = false;
    this.#trigger.setAttribute('aria-expanded', 'false');
    this.#trigger.style.borderColor = 'var(--border)';
    this.#menu.style.display = 'none';
  }

  // ── Mise à jour visuelle ──────────────────────────────────

  #refresh() {
    const locale = getLocale();
    const meta   = LOCALE_META[locale];

    // Bouton déclencheur
    if (this.#trigger) {
      this.#trigger.innerHTML = `
        <span style="font-size:15px">${meta.flag}</span>
        <span>${meta.label}</span>
        <span style="font-size:8px;color:var(--muted);margin-left:2px;">▾</span>
      `;
    }

    // Coches dans le menu
    this.#menu?.querySelectorAll('[data-locale]').forEach(item => {
      const isActive = item.dataset.locale === locale;
      const check    = item.querySelector('.lang-check');
      if (check) check.style.opacity = isActive ? '1' : '0';
      item.style.color = isActive ? 'var(--accent)' : 'var(--text)';
      item.setAttribute('aria-selected', String(isActive));
    });
  }
}