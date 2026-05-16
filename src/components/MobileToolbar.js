// ============================================================
//  src/components/MobileToolbar.js — CrypView
//  Barre d'outils mobile : dessin + navigation inter-vues.
//  Montée automatiquement sur écrans ≤ 768px.
//  Usage :
//    import { MobileToolbar } from '../components/MobileToolbar.js';
//    const mobileToolbar = new MobileToolbar({ drawing, onIndicators, onScreener });
//    // Après changement de panneau actif (multi) :
//    mobileToolbar.setDrawing(newDrawingInstance);
// ============================================================

const DRAW_TOOLS = [
  { id: 'trendline', icon: '/',  label: 'Tendance' },
  { id: 'fibonacci', icon: '🌀', label: 'Fibonacci' },
  { id: 'zone',      icon: '—',  label: 'Zone H.' },
  { id: 'rectangle', icon: '▭',  label: 'Rectangle' },
  { id: 'channel',   icon: '≡',  label: 'Canal' },
  { id: 'arrow',     icon: '↑',  label: 'Flèche' },
  { id: 'measure',   icon: '📐', label: 'Mesure' },
  { id: 'text',      icon: 'T',  label: 'Texte' },
  { id: 'pitchfork', icon: '⑂',  label: 'Pitchfork' },
];

const NAV_LINKS = [
  { label: '1 Chart',  icon: '◻', href: 'page.html' },
  { label: 'Multi 2',  icon: '⊞', href: 'multi2.html', badge: '2' },
  { label: 'Multi 4',  icon: '⊞', href: 'multi4.html', badge: '4' },
  { label: 'Multi 9',  icon: '⊞', href: 'multi9.html', badge: '9' },
  { label: 'V2',       icon: '↕', href: 'multiv2.html' },
  { label: 'V3',       icon: '↕', href: 'multiv3.html' },
  { label: '1+2',      icon: '⬛', href: 'multi1p2.html' },
  { label: '1+3',      icon: '⬛', href: 'multi1p3.html' },
];

export class MobileToolbar {
  #drawing       = null;
  #onIndicators  = null;
  #onScreener    = null;
  #bar           = null;
  #sheet         = null;
  #overlay       = null;
  #activeSheet   = null;
  #activeTool    = null;
  #mq            = null;

  constructor({ drawing = null, onIndicators = null, onScreener = null } = {}) {
    this.#drawing      = drawing;
    this.#onIndicators = onIndicators;
    this.#onScreener   = onScreener;

    this.#mq = window.matchMedia('(max-width: 768px)');
    if (this.#mq.matches) this.#mount();
    this.#mq.addEventListener('change', (e) => {
      if (e.matches && !this.#bar) this.#mount();
      if (!e.matches && this.#bar) this.#unmount();
    });
  }

  setDrawing(drawing) {
    this.#drawing = drawing;
    if (this.#activeTool) {
      this.#selectTool(null);
    }
  }

  destroy() {
    this.#unmount();
    this.#mq = null;
  }

  #mount() {
    this.#buildOverlay();
    this.#buildSheet();
    this.#buildBar();
    document.body.appendChild(this.#overlay);
    document.body.appendChild(this.#sheet);
    document.body.appendChild(this.#bar);
  }

  #unmount() {
    this.#bar?.remove();
    this.#sheet?.remove();
    this.#overlay?.remove();
    this.#bar     = null;
    this.#sheet   = null;
    this.#overlay = null;
  }

  #buildOverlay() {
    const el = document.createElement('div');
    el.id = 'mobile-tb-overlay';
    el.style.cssText = `
      display:none;position:fixed;inset:0;
      background:rgba(0,0,0,.45);z-index:9100;
      backdrop-filter:blur(2px);
    `;
    el.addEventListener('click', () => this.#closeSheet());
    this.#overlay = el;
  }

  #buildSheet() {
    const el = document.createElement('div');
    el.id = 'mobile-tb-sheet';
    el.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;
      background:var(--panel);
      border-top:1px solid var(--border);
      border-radius:16px 16px 0 0;
      z-index:9200;
      transform:translateY(100%);
      transition:transform .28s cubic-bezier(.4,0,.2,1);
      max-height:70dvh;overflow-y:auto;
      font-family:'Space Mono',monospace;
    `;
    this.#sheet = el;
  }

  #openSheet(type) {
    if (this.#activeSheet === type) { this.#closeSheet(); return; }
    this.#activeSheet = type;
    this.#sheet.innerHTML = type === 'draw' ? this.#drawSheetHTML() : this.#navSheetHTML();
    this.#bindSheetEvents(type);
    this.#overlay.style.display = 'block';
    requestAnimationFrame(() => {
      this.#sheet.style.transform = 'translateY(0)';
    });
    this.#updateBarActive(type);
  }

  #closeSheet() {
    this.#activeSheet = null;
    this.#sheet.style.transform = 'translateY(100%)';
    this.#overlay.style.display = 'none';
    this.#updateBarActive(null);
  }

  #drawSheetHTML() {
    const handle = `<div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:10px auto 0;"></div>`;
    const header = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;">
        <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;">Outils de dessin</span>
        <button id="mtb-close-draw" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
      </div>
    `;
    const current = this.#activeTool;
    const tools = DRAW_TOOLS.map(t => `
      <button class="mtb-tool" data-tool="${t.id}" aria-label="${t.label}"
              style="display:flex;flex-direction:column;align-items:center;gap:5px;
                     padding:12px 8px;border-radius:8px;cursor:pointer;
                     background:${current === t.id ? 'rgba(0,255,136,.12)' : 'var(--bg)'};
                     border:1px solid ${current === t.id ? 'rgba(0,255,136,.4)' : 'var(--border)'};
                     color:${current === t.id ? 'var(--accent)' : 'var(--muted)'};
                     font-family:inherit;font-size:11px;transition:all .15s;flex:1 1 60px;">
        <span style="font-size:18px;line-height:1;">${t.icon}</span>
        <span style="font-size:9px;letter-spacing:.04em;">${t.label}</span>
      </button>
    `).join('');
    const clearBtn = `
      <button id="mtb-clear-draw"
              style="margin:12px 16px 16px;width:calc(100% - 32px);
                     padding:10px;background:rgba(255,61,90,.08);
                     border:1px solid rgba(255,61,90,.3);border-radius:6px;
                     color:var(--red);font-family:inherit;font-size:11px;
                     cursor:pointer;letter-spacing:.06em;">
        ⌫ Effacer tous les tracés
      </button>
    `;
    return `
      ${handle}${header}
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 16px 4px;">
        ${tools}
      </div>
      ${clearBtn}
    `;
  }

  #navSheetHTML() {
    const handle = `<div style="width:40px;height:4px;background:var(--border);border-radius:2px;margin:10px auto 0;"></div>`;
    const header = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px;">
        <span style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;">Vues disponibles</span>
        <button id="mtb-close-nav" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
      </div>
    `;
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'page';
    const links = NAV_LINKS.map(l => {
      const pageId = l.href.replace('.html', '');
      const isCurrent = currentPage === pageId ||
        (currentPage === '' && pageId === 'page') ||
        (l.href === 'page.html' && (currentPage === 'page' || currentPage === ''));
      return `
        <a href="${l.href}"
           style="display:flex;align-items:center;gap:12px;padding:14px 16px;
                  border-bottom:1px solid rgba(28,35,51,.5);
                  text-decoration:none;
                  background:${isCurrent ? 'rgba(0,255,136,.05)' : 'transparent'};
                  color:${isCurrent ? 'var(--accent)' : 'var(--text)'};
                  font-family:inherit;font-size:12px;letter-spacing:.04em;">
          ${l.badge
            ? `<span style="width:28px;height:28px;border:1px solid ${isCurrent ? 'rgba(0,255,136,.4)' : 'var(--border)'};
                            border-radius:4px;display:flex;align-items:center;justify-content:center;
                            font-size:11px;font-weight:700;flex-shrink:0;">${l.badge}</span>`
            : `<span style="width:28px;height:28px;border:1px solid ${isCurrent ? 'rgba(0,255,136,.4)' : 'var(--border)'};
                            border-radius:4px;display:flex;align-items:center;justify-content:center;
                            font-size:14px;flex-shrink:0;">${l.icon}</span>`
          }
          <span>${l.label}</span>
          ${isCurrent ? '<span style="margin-left:auto;font-size:9px;color:var(--accent);letter-spacing:.08em;">ACTUEL</span>' : ''}
        </a>
      `;
    }).join('');
    return `${handle}${header}<div style="padding-bottom:16px;">${links}</div>`;
  }

  #bindSheetEvents(type) {
    if (type === 'draw') {
      this.#sheet.querySelector('#mtb-close-draw')
        ?.addEventListener('click', () => this.#closeSheet());
      this.#sheet.querySelector('#mtb-clear-draw')
        ?.addEventListener('click', () => {
          this.#drawing?.clear();
          this.#selectTool(null);
          this.#closeSheet();
        });
      this.#sheet.querySelectorAll('.mtb-tool').forEach(btn => {
        btn.addEventListener('click', () => {
          const tool = btn.dataset.tool;
          this.#selectTool(tool === this.#activeTool ? null : tool);
          this.#closeSheet();
        });
      });
    }
    if (type === 'nav') {
      this.#sheet.querySelector('#mtb-close-nav')
        ?.addEventListener('click', () => this.#closeSheet());
    }
  }

  #selectTool(tool) {
    this.#activeTool = tool;
    if (tool) {
      this.#drawing?.setTool(tool);
    } else {
      this.#drawing?.cancel();
    }
    const drawBtn = this.#bar?.querySelector('[data-action="draw"]');
    if (drawBtn) {
      const toolInfo = DRAW_TOOLS.find(t => t.id === tool);
      drawBtn.style.color       = tool ? 'var(--accent)' : 'var(--muted)';
      drawBtn.style.borderColor = tool ? 'rgba(0,255,136,.4)' : 'var(--border)';
      drawBtn.querySelector('.mtb-label').textContent = toolInfo ? toolInfo.label : 'Dessiner';
    }
  }

  #buildBar() {
    const bar = document.createElement('div');
    bar.id = 'mobile-toolbar';
    bar.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;
      height:56px;
      background:var(--panel);
      border-top:1px solid var(--border);
      z-index:9000;
      display:flex;align-items:center;
      padding:0 8px;gap:4px;
      font-family:'Space Mono',monospace;
    `;

    const buttons = [
      { action: 'draw',  icon: '✏️', label: 'Dessiner' },
      { action: 'ind',   icon: '📊', label: 'Indicateurs' },
      { action: 'scan',  icon: '🔍', label: 'Screener' },
      { action: 'nav',   icon: '🗺️', label: 'Navigation' },
    ];

    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.dataset.action = b.action;
      btn.style.cssText = `
        flex:1;display:flex;flex-direction:column;align-items:center;
        justify-content:center;gap:3px;height:100%;
        background:none;border:none;border-radius:8px;
        color:var(--muted);font-family:inherit;font-size:9px;
        letter-spacing:.04em;cursor:pointer;
        transition:color .15s,background .15s;
        padding:4px 2px;
      `;
      btn.innerHTML = `
        <span style="font-size:18px;line-height:1;" aria-hidden="true">${b.icon}</span>
        <span class="mtb-label">${b.label}</span>
      `;
      btn.setAttribute('aria-label', b.label);
      btn.addEventListener('click', () => this.#handleBarAction(b.action));
      bar.appendChild(btn);
    });

    bar.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';

    this.#bar = bar;
    this.#pushBodyPadding(true);
  }

  #handleBarAction(action) {
    switch (action) {
      case 'draw':  this.#openSheet('draw'); break;
      case 'ind':   this.#onIndicators?.();  break;
      case 'scan':  this.#onScreener?.();    break;
      case 'nav':   this.#openSheet('nav');  break;
    }
  }

  #updateBarActive(type) {
    if (!this.#bar) return;
    this.#bar.querySelectorAll('button').forEach(btn => {
      const isActive = btn.dataset.action === type;
      btn.style.color      = isActive ? 'var(--accent)' : 'var(--muted)';
      btn.style.background = isActive ? 'rgba(0,255,136,.07)' : 'none';
    });
  }

  #pushBodyPadding(on) {
    const PADDING = '56px';
    if (on) {
      document.body.style.paddingBottom = PADDING;
      const style = document.createElement('style');
      style.id = 'mobile-tb-style';
      style.textContent = `
        @media (max-width:768px) {
          .modal-box { bottom: 56px !important; }
          #cmd-palette-overlay > div { margin-bottom: 56px !important; }
          #ctx-sub, .ctx-sub { bottom: 56px !important; }
          #draw-toolbar { bottom: 68px !important; }
          #toast-container { bottom: 68px !important; }
          #obj-tree-panel { bottom: 56px !important; }
        }
      `;
      document.head.appendChild(style);
    } else {
      document.body.style.paddingBottom = '';
      document.getElementById('mobile-tb-style')?.remove();
    }
  }
}