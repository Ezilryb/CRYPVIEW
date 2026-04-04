// ============================================================
//  src/chart/ChartDrawing.js — CrypView V2.9
//  Drawing Tools : 5 outils SVG avec persistance localStorage.
//
//  v2.9 : Édition des tracés par drag des ancres
//  v2.9.1 FIX : Préservation des propriétés de l'ancre lors du drag
//    (bug texte annoté perdu après déplacement)
// ============================================================

// ── Singleton "instance active" — partagé entre tous les panneaux ─
let _activeDrawingInstance = null;

// ── Couleurs par outil ─────────────────────────────────────────
const STROKE = {
  trendline: '#00ff88',
  fibonacci: '#00c8ff',
  zone:      '#00c8ff',
  rectangle: '#ff6eb4',
  pitchfork: '#ff9900',
  arrow:   '#00c8ff',
  text:    '#00ff88',
  measure: '#00c8ff',
  channel: '#ff9900',
};

const FILL = {
  trendline: 'none',
  fibonacci: 'none',
  zone:      'rgba(0,200,255,0.10)',
  rectangle: 'rgba(255,110,180,0.09)',
  pitchfork: 'none',
  arrow:   'none',
  text:    'none',
  measure: 'rgba(0,200,255,0.07)',
  channel: 'rgba(255,153,0,0.07)',
};

const TOOL_POINTS = {
  trendline: 2,
  fibonacci: 2,
  zone:      2,
  rectangle: 2,
  pitchfork: 3,
  arrow:   2,
  text:    1,
  measure: 2,
  channel: 3,
};

const TOOL_LABELS = {
  trendline: 'TRENDLINE — 2 points',
  fibonacci: 'FIBONACCI — 2 points',
  zone:      'ZONE — 2 points',
  rectangle: 'RECTANGLE — 2 points',
  pitchfork: 'PITCHFORK — 3 points',
  arrow:   'FLÈCHE — Point départ → pointe',
  text:    'TEXTE — Cliquez pour placer (saisie après)',
  measure: 'MESURE — 2 points (affiche Δprix et %)',
  channel: 'CANAL — Points 1-2 : axe · Point 3 : offset',
};

const ALPHA_FINAL   = 0.65;
const ALPHA_PREVIEW = 0.40;

/** Rayon (px) de détection pour le survol / clic sur une ancre */
const ANCHOR_HIT_RADIUS = 9;

export class ChartDrawing {
  #chart;
  #cSeries;
  #canvas;
  #svg;
  #drawings    = [];
  #currentTool = null;
  #tempAnchors = [];
  #mousePixel  = { x: 0, y: 0 };
  #storageKey;

  /** Appelé après toute modification des tracés (add/remove/hide/lock). */
  onItemsChange = null;

  // ── État édition ──────────────────────────────────────────────
  /** Ancre actuellement survolée : { drawingId, anchorIdx } | null */
  #hoverAnchor = null;
  /** Ancre en cours de drag : { drawingId, anchorIdx } | null */
  #dragging    = null;

  // ── Observers & handlers ─
  #resizeObs  = null;
  #mutObs     = null;
  #editMoveFn = null;
  #editUpFn   = null;

  constructor(chart, cSeries, drawCanvas, drawSvg, storageKey = 'crypview_drawings_v2') {
    this.#chart      = chart;
    this.#cSeries    = cSeries;
    this.#canvas     = drawCanvas;
    this.#svg        = drawSvg;
    this.#storageKey = storageKey;
    this.#load();
    this.#bindEvents();
    this.#bindEditEvents();
    this.#subscribeChartRedraws();
    this.#redraw();
  }

  // ── API publique ──────────────────────────────────────────────

  setTool(tool) {
    if (this.#currentTool === tool) { this.cancel(); return; }
    if (_activeDrawingInstance && _activeDrawingInstance !== this) {
      _activeDrawingInstance.#silentCancel();
    }
    _activeDrawingInstance = this;
    this.#currentTool = tool;
    this.#tempAnchors = [];
    this.#hoverAnchor = null;
    this.#dragging    = null;
    this.#canvas.style.pointerEvents = 'all';
    this.#canvas.style.cursor = 'crosshair';
    this.#showToolbar(TOOL_LABELS[tool] ?? tool.toUpperCase());
    this.#emitToolChange();
  }

  cancel() {
    this.#currentTool = null;
    this.#tempAnchors = [];
    this.#canvas.style.pointerEvents = 'none';
    this.#canvas.style.cursor = '';
    this.#hideToolbar();
    if (_activeDrawingInstance === this) _activeDrawingInstance = null;
    this.#redraw();
    this.#emitToolChange();
  }

  clear() {
    this.#drawings = [];
    this.#hoverAnchor = null;
    this.#dragging    = null;
    this.#save();
    this.#redraw();
  }

  undoLast() {
    if (!this.#drawings.length) return;
    this.#drawings.pop();
    this.#save();
    this.#redraw();
  }

  getCurrentTool() { return this.#currentTool; }
  getActiveTools() { return this.#currentTool ? [this.#currentTool] : []; }

  getItems() {
    return this.#drawings.map(d => ({
      id:     d.id,
      type:   d.type,
      hidden: d.hidden  ?? false,
      locked: d.locked  ?? false,
    }));
  }

  toggleVisibility(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (!d) return;
    d.hidden = !(d.hidden ?? false);
    this.#save();
    this.#redraw();
  }

  toggleLock(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (!d) return;
    d.locked = !(d.locked ?? false);
    if (this.#hoverAnchor?.drawingId === id) {
      this.#hoverAnchor = null;
      this.#canvas.style.pointerEvents = 'none';
      this.#canvas.style.cursor = '';
    }
    if (this.#dragging?.drawingId === id) {
      this.#dragging = null;
    }
    this.#save();
    this.#redraw();
  }

  removeById(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (d?.locked) return;
    this.#drawings = this.#drawings.filter(x => x.id !== id);
    if (this.#hoverAnchor?.drawingId === id) {
      this.#hoverAnchor = null;
      this.#canvas.style.pointerEvents = 'none';
      this.#canvas.style.cursor = '';
    }
    if (this.#dragging?.drawingId === id) {
      this.#dragging = null;
    }
    this.#save();
    this.#redraw();
  }

  forceRedraw() {
    this.#load();
    this.#redraw();
  }

  destroy() {
    this.cancel();

    this.#resizeObs?.disconnect();
    this.#resizeObs = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    if (this.#editMoveFn) {
      document.removeEventListener('mousemove', this.#editMoveFn);
      this.#editMoveFn = null;
    }
    if (this.#editUpFn) {
      document.removeEventListener('mouseup', this.#editUpFn);
      this.#editUpFn = null;
    }

    while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);
  }

  // ── Privé — singleton ─────────────────────────────────────────

  #silentCancel() {
    this.#currentTool = null;
    this.#tempAnchors = [];
    this.#canvas.style.pointerEvents = 'none';
    this.#canvas.style.cursor = '';
    this.#hideToolbar();
    this.#redraw();
  }

  // ── Privé — synchronisation bounds ───────────────────────────

  #syncCanvasBounds() {
    try {
      const psWidth  = this.#chart.priceScale('right').width();
      const tsHeight = this.#chart.timeScale().height();
      this.#canvas.style.right  = psWidth  > 0 ? `${psWidth}px`  : '0';
      this.#canvas.style.bottom = tsHeight > 0 ? `${tsHeight}px` : '0';
    } catch (_) {
      this.#canvas.style.right  = '0';
      this.#canvas.style.bottom = '0';
    }
  }

  // ── Privé — persistance ───────────────────────────────────────

  #load() {
    try { this.#drawings = JSON.parse(localStorage.getItem(this.#storageKey) ?? '[]'); }
    catch (_) { this.#drawings = []; }
  }

  #save() {
    try { localStorage.setItem(this.#storageKey, JSON.stringify(this.#drawings)); } catch (_) {}
    this.onItemsChange?.();
  }

  // ── Privé — détection des ancres ─────────────────────────────

  #findAnchorAt(mx, my, radius = ANCHOR_HIT_RADIUS) {
    for (let di = this.#drawings.length - 1; di >= 0; di--) {
      const d = this.#drawings[di];
      for (let ai = 0; ai < d.anchors.length; ai++) {
        const px = this.#anchorToPixel(d.anchors[ai]);
        if (!px) continue;
        const dx = px.x - mx;
        const dy = px.y - my;
        if (Math.sqrt(dx * dx + dy * dy) <= radius) {
          return { drawingId: d.id, anchorIdx: ai };
        }
      }
    }
    return null;
  }

  // ── Privé — événements (tracé nouveau) ───────────────────────

  #bindEvents() {
    const cancelBtn = document.getElementById('draw-toolbar-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (_activeDrawingInstance === this) this.cancel();
      });
      cancelBtn.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && _activeDrawingInstance === this) this.cancel();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _activeDrawingInstance === this) this.cancel();
    });

    this.#canvas.addEventListener('mousemove', e => {
      const r = this.#canvas.getBoundingClientRect();
      this.#mousePixel = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (this.#currentTool && this.#tempAnchors.length > 0) this.#redraw();
    });

    this.#canvas.addEventListener('click', e => {
      if (!this.#currentTool || this.#dragging) return;
      const r      = this.#canvas.getBoundingClientRect();
      const anchor = this.#pixelToAnchor({ x: e.clientX - r.left, y: e.clientY - r.top });
      if (!anchor) return;
      this.#tempAnchors.push(anchor);

      if (this.#tempAnchors.length >= TOOL_POINTS[this.#currentTool]) {
        if (this.#currentTool === 'text') {
          const txt = window.prompt('Texte à afficher :', '');
          if (txt === null) {
            this.#tempAnchors = [];
            this.#redraw();
            return;
          }
          this.#tempAnchors[0].text = txt.trim() || '—';
        }

        this.#drawings.push({
          id:      Date.now(),
          type:    this.#currentTool,
          anchors: [...this.#tempAnchors],
        });
        this.#save();
        this.#tempAnchors = [];
      }
      this.#redraw();
    });

    this.#canvas.addEventListener('contextmenu', e => {
      if (this.#currentTool) { e.preventDefault(); e.stopPropagation(); this.cancel(); }
    });
  }

  // ── Privé — événements (édition par drag) ────────────────────

  #bindEditEvents() {
    this.#editMoveFn = (e) => {
      if (this.#currentTool) return;

      const r  = this.#canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;

      // ── Drag actif ────────────────────────────────────────────
      if (this.#dragging) {
        const newCoords = this.#pixelToAnchor({ x: mx, y: my });
        if (newCoords) {
          const drawing = this.#drawings.find(d => d.id === this.#dragging.drawingId);
          if (drawing) {
            // ── FIX v2.9.1 : préserve toutes les propriétés de l'ancre
            // (notamment `text` pour l'outil texte annoté)
            const existing = drawing.anchors[this.#dragging.anchorIdx];
            drawing.anchors[this.#dragging.anchorIdx] = { ...existing, ...newCoords };
            this.#redraw();
          }
        }
        return;
      }

      // ── Vérification des limites du canvas ────────────────────
      const inBounds = mx >= 0 && my >= 0 && mx <= r.width && my <= r.height;

      if (!inBounds) {
        if (this.#hoverAnchor) {
          this.#hoverAnchor = null;
          this.#canvas.style.pointerEvents = 'none';
          this.#canvas.style.cursor = '';
          this.#redraw();
        }
        return;
      }

      // ── Détection du survol d'une ancre ──────────────────────
      const hit = this.#findAnchorAt(mx, my);

      if (hit) {
        if (!this.#hoverAnchor ||
            this.#hoverAnchor.drawingId !== hit.drawingId ||
            this.#hoverAnchor.anchorIdx !== hit.anchorIdx) {
          this.#hoverAnchor = hit;
          this.#canvas.style.pointerEvents = 'all';
          this.#canvas.style.cursor = 'grab';
          this.#redraw();
        }
      } else if (this.#hoverAnchor) {
        this.#hoverAnchor = null;
        this.#canvas.style.pointerEvents = 'none';
        this.#canvas.style.cursor = '';
        this.#redraw();
      }
    };

    this.#editUpFn = () => {
      if (!this.#dragging) return;
      this.#save();
      this.#dragging = null;
      this.#canvas.style.cursor = this.#hoverAnchor ? 'grab' : '';
      this.#redraw();
    };

    this.#canvas.addEventListener('mousedown', (e) => {
      if (this.#currentTool || !this.#hoverAnchor) return;

      const targetDrawing = this.#drawings.find(d => d.id === this.#hoverAnchor.drawingId);
      if (targetDrawing?.locked) return;

      e.preventDefault();
      e.stopPropagation();
      this.#dragging = { ...this.#hoverAnchor };
      this.#canvas.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', this.#editMoveFn);
    document.addEventListener('mouseup',   this.#editUpFn);
  }

  // ── Privé — abonnements de redessins chart ────────────────────

  #subscribeChartRedraws() {
    const redraw = () => this.#redraw();
    this.#chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    this.#chart.subscribeCrosshairMove(() => {
      if (this.#currentTool && this.#tempAnchors.length > 0) this.#redraw();
    });

    this.#resizeObs = new ResizeObserver(redraw);
    this.#resizeObs.observe(this.#canvas);

    const root = this.#canvas.closest('.chart-panel') ??
                 this.#canvas.closest('#chart-container') ??
                 this.#canvas;

    let raf = false;
    this.#mutObs = new MutationObserver(() => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; this.#redraw(); });
    });
    this.#mutObs.observe(root, {
      attributes:      true,
      attributeFilter: ['style'],
      subtree:         true,
    });
  }

  // ── Privé — rendu SVG ─────────────────────────────────────────

  #redraw() {
    this.#syncCanvasBounds();

    while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);

    const W = this.#canvas.offsetWidth || 800;

    for (const d of this.#drawings) {
      if (d.hidden) continue;

      const pxPts = d.anchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      if (pxPts.length < TOOL_POINTS[d.type]) continue;
      const el = this.#renderShape(d.type, pxPts, false, W, d);

      el.addEventListener('contextmenu', ev => {
        if (this.#currentTool) return;
        ev.preventDefault();
        ev.stopPropagation();
        if (d.locked) return;

        if (d.type === 'trendline' || d.type === 'fibonacci') {
          this.#showShapeMenu(ev.clientX, ev.clientY, d);
        } else {
          this.#removeDrawing(d.id);
        }
      });

      this.#svg.appendChild(el);
    }

    // ── Aperçu du tracé en cours ──────────────────────────────
    if (this.#currentTool && this.#tempAnchors.length > 0) {
      const pxTemp = this.#tempAnchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      this.#svg.appendChild(
        this.#renderShape(this.#currentTool, [...pxTemp, this.#mousePixel], true, W, null)
      );
    }

    // ── Highlight de l'ancre survolée / draguée ───────────────
    const highlightTarget = this.#dragging ?? this.#hoverAnchor;
    if (highlightTarget) {
      const drawing = this.#drawings.find(d => d.id === highlightTarget.drawingId);
      if (drawing) {
        const px = this.#anchorToPixel(drawing.anchors[highlightTarget.anchorIdx]);
        if (px) {
          const stroke     = STROKE[drawing.type] ?? '#00ff88';
          const isDragging = !!this.#dragging;
          this.#svg.appendChild(this.#svgEl('circle', {
            cx: px.x, cy: px.y,
            r:  isDragging ? 10 : 8,
            fill:           'none',
            stroke,
            'stroke-width': isDragging ? 2.5 : 1.8,
            opacity:        isDragging ? 0.95 : 0.75,
          }));
          this.#svg.appendChild(this.#svgEl('circle', {
            cx: px.x, cy: px.y,
            r:  isDragging ? 4 : 3,
            fill:    stroke,
            opacity: isDragging ? 1 : 0.85,
          }));
        }
      }
    }
  }

  #removeDrawing(id) {
    this.#drawings = this.#drawings.filter(x => x.id !== id);
    if (this.#hoverAnchor?.drawingId === id) {
      this.#hoverAnchor = null;
      this.#canvas.style.pointerEvents = 'none';
      this.#canvas.style.cursor = '';
    }
    if (this.#dragging?.drawingId === id) this.#dragging = null;
    this.#save();
    this.#redraw();
  }

  #showShapeMenu(clientX, clientY, drawing) {
    document.getElementById('_cv_shape_menu')?.remove();

    const menu = document.createElement('div');
    menu.id = '_cv_shape_menu';
    menu.style.cssText = [
      'position:fixed',
      `left:${clientX}px`,
      `top:${clientY}px`,
      'background:var(--panel)',
      'border:1px solid var(--border)',
      'border-radius:6px',
      'z-index:99999',
      'box-shadow:0 10px 28px rgba(0,0,0,.85)',
      'padding:5px 0',
      'font-size:11px',
      "font-family:'Space Mono',monospace",
      'min-width:200px',
      'pointer-events:all',
    ].join(';');

    const makeItem = (label, color, onClick) => {
      const item = document.createElement('div');
      item.style.cssText = `display:flex;align-items:center;gap:9px;
        padding:8px 14px;cursor:pointer;color:${color};transition:background .1s;`;
      item.textContent = label;
      item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,.05)'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; });
      item.addEventListener('click',      () => { menu.remove(); onClick(); });
      return item;
    };

    menu.appendChild(makeItem('📏 Alerte croisement ↑', '#00ff88', () => {
      this.#canvas.dispatchEvent(new CustomEvent('crypview:drawing:alert', {
        bubbles: true,
        detail: { drawing, direction: 'up' },
      }));
    }));

    menu.appendChild(makeItem('📏 Alerte croisement ↓', '#ff3d5a', () => {
      this.#canvas.dispatchEvent(new CustomEvent('crypview:drawing:alert', {
        bubbles: true,
        detail: { drawing, direction: 'down' },
      }));
    }));

    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--border);margin:3px 0;';
    menu.appendChild(sep);

    menu.appendChild(makeItem('🗑 Supprimer', 'var(--red)', () => {
      this.#removeDrawing(drawing.id);
    }));

    document.body.appendChild(menu);

    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  menu.style.left = `${clientX - r.width  - 4}px`;
      if (r.bottom > window.innerHeight) menu.style.top  = `${clientY - r.height - 4}px`;
    });

    const dismiss = () => {
      menu.remove();
      document.removeEventListener('click', dismiss, true);
    };
    setTimeout(() => document.addEventListener('click', dismiss, true), 0);
  }

  // ── Privé — rendu d'une forme ─────────────────────────────────

  #renderShape(type, pts, isPreview, chartW = 800, drawing = null) {
    const stroke = STROKE[type] ?? '#00ff88';
    const fill   = FILL[type]   ?? 'none';
    const alpha  = isPreview ? ALPHA_PREVIEW : ALPHA_FINAL;
    const g      = this.#svgEl('g', {
      class:   'draw-shape' + (isPreview ? ' draw-preview' : ''),
      opacity: alpha,
    });

    // ── TRENDLINE ─────────────────────────────────────────────
    if (type === 'trendline' && pts.length >= 2) {
      const [p1, p2] = pts;
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ext = 5000;
      g.appendChild(this.#svgEl('line', {
        x1: p1.x - dx / len * ext, y1: p1.y - dy / len * ext,
        x2: p2.x + dx / len * ext, y2: p2.y + dy / len * ext,
        stroke, 'stroke-width': 1.5,
      }));
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    // ── FIBONACCI ─────────────────────────────────────────────
    if (type === 'fibonacci' && pts.length >= 2) {
      const [p1, p2] = pts;
      const levels   = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const colors   = ['#ff3d5a', '#ff9900', '#f7c948', '#00ff88', '#00c8ff', '#7c6fff', '#ff6eb4'];
      levels.forEach((lvl, i) => {
        const y = p2.y + (p1.y - p2.y) * lvl;
        g.appendChild(this.#svgEl('line', {
          x1: Math.min(p1.x, p2.x) - 2000, y1: y,
          x2: Math.max(p1.x, p2.x) + 2000, y2: y,
          stroke: colors[i % colors.length], 'stroke-width': 1, 'stroke-dasharray': '4 3',
        }));
        const lbl = this.#svgEl('text', {
          x: p2.x + 4, y: y - 3,
          fill: colors[i % colors.length], 'font-size': 9,
          'font-family': "'Space Mono', monospace",
        });
        lbl.textContent = `${(lvl * 100).toFixed(1)}%`;
        g.appendChild(lbl);
      });
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    // ── ZONE ─────────────────────────────────────────────────
    if (type === 'zone' && pts.length >= 2) {
      const [p1, p2] = pts;
      g.appendChild(this.#svgEl('rect', {
        x: 0, y: Math.min(p1.y, p2.y),
        width: chartW, height: Math.abs(p2.y - p1.y),
        fill, stroke, 'stroke-width': 1,
      }));
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    // ── RECTANGLE ────────────────────────────────────────────
    if (type === 'rectangle' && pts.length >= 2) {
      const [p1, p2] = pts;
      const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
      g.appendChild(this.#svgEl('rect', { x, y, width: Math.max(w, 1), height: Math.max(h, 1), fill, stroke, 'stroke-width': 1.5 }));
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    // ── PITCHFORK ─────────────────────────────────────────────
    if (type === 'pitchfork' && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const midX = (p2.x + p3.x) / 2, midY = (p2.y + p3.y) / 2;
      const dx = midX - p1.x, dy = midY - p1.y;
      const ext = 5000;
      [[p1, { x: midX, y: midY }], [p2, { x: p2.x + dx, y: p2.y + dy }], [p3, { x: p3.x + dx, y: p3.y + dy }]].forEach(([a, b]) => {
        const len = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) || 1;
        const ux  = (b.x - a.x) / len, uy = (b.y - a.y) / len;
        g.appendChild(this.#svgEl('line', {
          x1: a.x, y1: a.y, x2: a.x + ux * ext, y2: a.y + uy * ext,
          stroke, 'stroke-width': 1.5,
        }));
      });
      [p1, p2, p3].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    // ── FLÈCHE ───────────────────────────────────────────────
    if (type === 'arrow' && pts.length >= 2) {
      const [p1, p2] = pts;
      const dx  = p2.x - p1.x, dy = p2.y - p1.y;
      const ang = Math.atan2(dy, dx);
      const aLen = 14, aAng = Math.PI / 6;
      g.appendChild(this.#svgEl('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke, 'stroke-width': 1.8 }));
      const ax1 = p2.x - aLen * Math.cos(ang - aAng);
      const ay1 = p2.y - aLen * Math.sin(ang - aAng);
      const ax2 = p2.x - aLen * Math.cos(ang + aAng);
      const ay2 = p2.y - aLen * Math.sin(ang + aAng);
      g.appendChild(this.#svgEl('polygon', { points: `${p2.x},${p2.y} ${ax1},${ay1} ${ax2},${ay2}`, fill: stroke }));
      g.appendChild(this.#svgEl('circle', { cx: p1.x, cy: p1.y, r: 4, fill: stroke }));
    }

    // ── TEXTE ANNOTÉ ─────────────────────────────────────────
    // FIX : priorité à drawing.anchors[0].text (survit au drag)
    if (type === 'text' && pts.length >= 1) {
      const [p]  = pts;
      // La propriété `text` est stockée dans l'ancre elle-même
      const text = drawing?.anchors?.[0]?.text ?? (isPreview ? '…' : '—');
      const tw   = text.length * 7.5 + 16;

      g.appendChild(this.#svgEl('rect', {
        x: p.x - 4, y: p.y - 18, width: tw, height: 22,
        fill: 'rgba(7,10,15,0.88)', rx: 3,
        stroke, 'stroke-width': 0.8,
      }));
      const tEl = this.#svgEl('text', {
        x: p.x + 2, y: p.y - 2,
        fill: stroke,
        'font-size': 12,
        'font-family': "'Space Mono', monospace",
        'font-weight': '700',
      });
      tEl.textContent = text;
      g.appendChild(tEl);
      g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: stroke }));
    }

    // ── OUTIL MESURE ─────────────────────────────────────────
    if (type === 'measure' && pts.length >= 2) {
      const [p1, p2] = pts;
      const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
      g.appendChild(this.#svgEl('rect', {
        x, y, width: Math.max(w, 1), height: Math.max(h, 1),
        fill, stroke, 'stroke-width': 1, 'stroke-dasharray': '5 3',
      }));
      if (!isPreview && drawing?.anchors?.length >= 2) {
        const a1 = drawing.anchors[0], a2 = drawing.anchors[1];
        const delta = a2.price - a1.price;
        const pct   = a1.price ? (delta / a1.price * 100) : 0;
        const up    = delta >= 0;
        const label = `${up ? '+' : ''}${Math.abs(delta) < 1 ? delta.toFixed(6) : delta.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
        const mx    = x + w / 2, my = y + h / 2;
        const lw    = label.length * 6.2 + 14;
        g.appendChild(this.#svgEl('rect', { x: mx - lw / 2, y: my - 11, width: lw, height: 18, fill: 'rgba(7,10,15,0.88)', rx: 3 }));
        const lEl = this.#svgEl('text', { x: mx, y: my + 4, fill: up ? '#00ff88' : '#ff3d5a', 'font-size': 10, 'font-family': "'Space Mono', monospace", 'text-anchor': 'middle', 'font-weight': '700' });
        lEl.textContent = label;
        g.appendChild(lEl);
      }
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: stroke })));
    }

    // ── CANAL PARALLÈLE ──────────────────────────────────────
    if (type === 'channel' && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const dx  = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ext = 5000;
      const offX = p3.x - p1.x, offY = p3.y - p1.y;
      const proj = (offX * dx + offY * dy) / (len * len);
      const perX = offX - proj * dx, perY = offY - proj * dy;
      g.appendChild(this.#svgEl('line', { x1: p1.x - dx/len*ext, y1: p1.y - dy/len*ext, x2: p2.x + dx/len*ext, y2: p2.y + dy/len*ext, stroke, 'stroke-width': 1.5 }));
      const pp1 = { x: p1.x + perX, y: p1.y + perY };
      const pp2 = { x: p2.x + perX, y: p2.y + perY };
      g.appendChild(this.#svgEl('line', { x1: pp1.x - dx/len*ext, y1: pp1.y - dy/len*ext, x2: pp2.x + dx/len*ext, y2: pp2.y + dy/len*ext, stroke, 'stroke-width': 1, 'stroke-dasharray': '6 3' }));
      g.appendChild(this.#svgEl('polygon', {
        points: [`${p1.x - dx/len*ext},${p1.y - dy/len*ext}`, `${p2.x + dx/len*ext},${p2.y + dy/len*ext}`, `${pp2.x + dx/len*ext},${pp2.y + dy/len*ext}`, `${pp1.x - dx/len*ext},${pp1.y - dy/len*ext}`].join(' '),
        fill, stroke: 'none',
      }));
      [p1, p2, p3].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    return g;
  }

  // ── Privé — conversions coordonnées ──────────────────────────

  #pixelToAnchor(px) {
    try {
      const time  = this.#chart.timeScale().coordinateToTime(px.x);
      const price = this.#cSeries.coordinateToPrice(px.y);
      if (time == null || price == null) return null;
      return { time, price };
    } catch (_) { return null; }
  }

  #anchorToPixel(a) {
    try {
      const x = this.#chart.timeScale().timeToCoordinate(a.time);
      const y = this.#cSeries.priceToCoordinate(a.price);
      if (x == null || y == null) return null;
      return { x, y };
    } catch (_) { return null; }
  }

  // ── Privé — SVG helper ────────────────────────────────────────

  #svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }

  // ── Privé — toolbar ───────────────────────────────────────────

  #showToolbar(label) {
    const tb  = document.getElementById('draw-toolbar');
    const lbl = document.getElementById('draw-toolbar-label');
    if (tb)  tb.classList.add('visible');
    if (lbl) lbl.textContent = label;
  }

  #hideToolbar() {
    document.getElementById('draw-toolbar')?.classList.remove('visible');
  }

  #emitToolChange() {
    this.#canvas.dispatchEvent(new CustomEvent('crypview:tool:change', {
      bubbles: true,
      detail: { tool: this.#currentTool },
    }));
  }
}
