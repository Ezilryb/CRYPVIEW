// ============================================================
//  src/utils/toast.js — CrypView V2
//  Notifications visuelles non-bloquantes.
//  Remplace tous les console.error / showErr pour les erreurs WS et fetch.
//  Conforme aux règles cursorrules : "chaque erreur doit déclencher un Toast"
// ============================================================

/** @type {HTMLElement|null} Conteneur injecté une seule fois dans le body */
let container = null;

/**
 * Retourne (ou crée) le conteneur de toasts.
 * @returns {HTMLElement}
 */
function getContainer() {
  if (container) return container;

  // Réutilise un conteneur existant s'il y en a un dans le HTML
  container = document.getElementById('toast-container');
  if (container) return container;

  // Sinon on l'injecte dynamiquement
  container = document.createElement('div');
  container.id = 'toast-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');
  container.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'right:24px',
    'z-index:9999',
    'display:flex',
    'flex-direction:column',
    'gap:8px',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(container);
  return container;
}

/**
 * Affiche un toast temporaire.
 *
 * @param {string}  message              — Texte du toast
 * @param {'info'|'success'|'error'|'warning'} [type='info']
 * @param {number}  [duration=4000]      — Durée d'affichage en ms
 */
export function showToast(message, type = 'info', duration = 4000) {
  const c = getContainer();

  const colors = {
    info:    { bg: '#1c2333', border: '#00c8ff', icon: 'ℹ' },
    success: { bg: '#0d2218', border: '#00ff88', icon: '✓' },
    error:   { bg: '#2a0a0e', border: '#ff3d5a', icon: '⚠' },
    warning: { bg: '#2a1a00', border: '#ff9900', icon: '⚡' },
  };

  const { bg, border, icon } = colors[type] ?? colors.info;

  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.style.cssText = [
    `background:${bg}`,
    `border:1px solid ${border}`,
    `color:#c9d1e0`,
    'border-radius:6px',
    'padding:10px 14px',
    'font-size:12px',
    "font-family:'Space Mono',monospace",
    'max-width:320px',
    'line-height:1.4',
    'pointer-events:auto',
    'cursor:pointer',
    'opacity:0',
    'transition:opacity .2s ease, transform .2s ease',
    'transform:translateY(8px)',
    'display:flex',
    'align-items:flex-start',
    'gap:8px',
  ].join(';');

  toast.innerHTML = `<span style="color:${border};flex-shrink:0">${icon}</span><span>${message}</span>`;

  // Fermeture au clic
  toast.addEventListener('click', () => dismiss(toast));

  c.appendChild(toast);

  // Animation d'entrée (frame suivante)
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(toast), duration);

  // Annule l'auto-dismiss si l'utilisateur survole (laisse le temps de lire)
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => setTimeout(() => dismiss(toast), 1500));
}

/**
 * Retire un toast avec animation de sortie.
 * @param {HTMLElement} toast
 */
function dismiss(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(8px)';
  setTimeout(() => toast.remove(), 220);
}
