// ============================================================
//  src/chart/ChartDrawing.js — CrypView V2.9
//  Drawing Tools : 5 outils SVG avec persistance localStorage.
//
//  v2.9 : Édition des tracés par drag des ancres
//    - Survol d'une ancre → curseur grab + highlight visuel
//    - Glisser-déposer → repositionnement en coordonnées monde
//    - pointer-events activés dynamiquement (pas d'interférence
//      avec le chart en dehors des zones d'ancrage)
//    - Sauvegarde automatique en fin de drag
//
//  Outils : trendline, fibonacci, zone, rectangle, pitchfork
//  Persistance : clé configurable (storageKey) — une par panneau en multi.
//  Multi-instances : une seule instance peut être "active" à la fois.
//   L'activation d'un outil sur un panneau annule silencieusement l'autre.
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
};

const FILL = {
  trendline: 'none',
  fibonacci: 'none',
  zone:      'rgba(0,200,255,0.10)',
  rectangle: 'rgba(255,110,180,0.09)',
  pitchfork: 'none',
};

const TOOL_POINTS = {
  trendline: 2,
  fibonacci: 2,
  zone:      2,
  rectangle: 2,
  pitchfork: 3,
};

const TOOL_LABELS = {
  trendline: 'TRENDLINE — 2 points',
  fibonacci: 'FIBONACCI — 2 points',
  zone:      'ZONE — 2 points',
  rectangle: 'RECTANGLE — 2 points',
  pitchfork: 'PITCHFORK — 3 points',
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

  // ── Observers & handlers — stockés pour pouvoir les déconnecter ─
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
    // Quand un outil est actif, on sort du mode édition
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
    // Repasse en mode "survol uniquement" (pointer-events gérés dynamiquement)
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

  /**
   * Annule le dernier tracé posé (Ctrl+Z).
   * Sans effet si aucun tracé ou si un tracé est en cours de pose.
   */
  undoLast() {
    if (!this.#drawings.length) return;
    this.#drawings.pop();
    this.#save();
    this.#redraw();
  }

  getCurrentTool() { return this.#currentTool; }
  getActiveTools() { return this.#currentTool ? [this.#currentTool] : []; }

  /**
   * Retourne la liste des tracés pour l'ObjectTreePanel.
   * @returns {{ id: number, type: string, hidden: boolean, locked: boolean }[]}
   */
  getItems() {
    return this.#drawings.map(d => ({
      id:     d.id,
      type:   d.type,
      hidden: d.hidden  ?? false,
      locked: d.locked  ?? false,
    }));
  }

  /**
   * Bascule la visibilité d'un tracé (masquer / afficher).
   * @param {number} id
   */
  toggleVisibility(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (!d) return;
    d.hidden = !(d.hidden ?? false);
    this.#save();
    this.#redraw();
  }

  /**
   * Bascule le verrou d'un tracé (interdit le déplacement et la suppression).
   * @param {number} id
   */
  toggleLock(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (!d) return;
    d.locked = !(d.locked ?? false);
    // Annule le drag/hover si le tracé verrouillé était actif
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

  /**
   * Supprime un tracé par son id (utilisé par l'ObjectTree).
   * @param {number} id
   */
  removeById(id) {
    const d = this.#drawings.find(x => x.id === id);
    if (d?.locked) return; // les tracés verrouillés ne peuvent pas être supprimés
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

  /**
   * Force un rechargement depuis localStorage + redraw.
   * Utilisé pour la synchronisation Multi-Timeframe (MTF Sync).
   */
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
    // Notifie l'ObjectTree et le MTF sync
    this.onItemsChange?.();
  }

  // ── Privé — détection des ancres ─────────────────────────────

  /**
   * Cherche si un point pixel (mx, my) est proche d'une ancre.
   * @param {number} mx
   * @param {number} my
   * @param {number} [radius]
   * @returns {{ drawingId: number, anchorIdx: number } | null}
   */
  #findAnchorAt(mx, my, radius = ANCHOR_HIT_RADIUS) {
    // Parcours en ordre inverse pour prioriser les tracés au premier plan
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
      // En mode dessin uniquement — pas si on vient de finir un drag
      if (!this.#currentTool || this.#dragging) return;
      const r      = this.#canvas.getBoundingClientRect();
      const anchor = this.#pixelToAnchor({ x: e.clientX - r.left, y: e.clientY - r.top });
      if (!anchor) return;
      this.#tempAnchors.push(anchor);
      if (this.#tempAnchors.length >= TOOL_POINTS[this.#currentTool]) {
        this.#drawings.push({ id: Date.now(), type: this.#currentTool, anchors: [...this.#tempAnchors] });
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
    /**
     * Mousemove sur document — toujours actif.
     * - Si drag en cours : déplace l'ancre vers la position courante.
     * - Sinon : détecte le survol pour activer/désactiver pointer-events.
     */
    this.#editMoveFn = (e) => {
      // Ne pas interférer avec le mode dessin (il gère son propre curseur)
      if (this.#currentTool) return;

      const r  = this.#canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;

      // ── Drag actif ────────────────────────────────────────────
      if (this.#dragging) {
        const anchor = this.#pixelToAnchor({ x: mx, y: my });
        if (anchor) {
          const drawing = this.#drawings.find(d => d.id === this.#dragging.drawingId);
          if (drawing) {
            drawing.anchors[this.#dragging.anchorIdx] = anchor;
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

    /**
     * Mouseup sur document — finalise le drag.
     */
    this.#editUpFn = () => {
      if (!this.#dragging) return;
      this.#save();
      this.#dragging = null;
      // Restaure le curseur grab si on survole encore une ancre
      this.#canvas.style.cursor = this.#hoverAnchor ? 'grab' : '';
      this.#redraw();
    };

    /**
     * Mousedown sur le canvas — déclenche un drag si une ancre est survolée.
     * (pointer-events: all est déjà actif dans ce cas)
     */
    this.#canvas.addEventListener('mousedown', (e) => {
      if (this.#currentTool || !this.#hoverAnchor) return;

      // V3.5 — refuse le drag sur un tracé verrouillé
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
      // V3.5 — ignore les tracés masqués
      if (d.hidden) continue;

      const pxPts = d.anchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      if (pxPts.length < TOOL_POINTS[d.type]) continue;
      const el = this.#renderShape(d.type, pxPts, false, W);

      // Suppression par clic-droit (inchangé)
      el.addEventListener('contextmenu', ev => {
        if (!this.#currentTool) {
          ev.preventDefault(); ev.stopPropagation();
          // V3.5 — refuse la suppression si verrouillé
          if (d.locked) return;
          this.#drawings = this.#drawings.filter(x => x.id !== d.id);
          // Nettoie l'état si l'ancre concernée était survolée / draguée
          if (this.#hoverAnchor?.drawingId === d.id) this.#hoverAnchor = null;
          if (this.#dragging?.drawingId    === d.id) this.#dragging    = null;
          this.#save();
          this.#redraw();
        }
      });

      this.#svg.appendChild(el);
    }

    // ── Aperçu du tracé en cours ──────────────────────────────
    if (this.#currentTool && this.#tempAnchors.length > 0) {
      const pxTemp = this.#tempAnchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      this.#svg.appendChild(
        this.#renderShape(this.#currentTool, [...pxTemp, this.#mousePixel], true, W)
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
          // Anneau extérieur (halo)
          this.#svg.appendChild(this.#svgEl('circle', {
            cx: px.x, cy: px.y,
            r:  isDragging ? 10 : 8,
            fill:           'none',
            stroke,
            'stroke-width': isDragging ? 2.5 : 1.8,
            opacity:        isDragging ? 0.95 : 0.75,
          }));
          // Point central plein
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

  // ── Privé — rendu d'une forme ─────────────────────────────────

  #renderShape(type, pts, isPreview, chartW = 800) {
    const stroke = STROKE[type] ?? '#00ff88';
    const fill   = FILL[type]   ?? 'none';
    const alpha  = isPreview ? ALPHA_PREVIEW : ALPHA_FINAL;
    const g      = this.#svgEl('g', {
      class:   'draw-shape' + (isPreview ? ' draw-preview' : ''),
      opacity: alpha,
    });

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
      [p1, p2].forEach(p => g.appendChild(
        this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })
      ));
    }

    if (type === 'fibonacci' && pts.length >= 2) {
      const [p1, p2] = pts;
      const H  = p2.y - p1.y;
      const xL = Math.min(p1.x, p2.x);
      const xR = Math.max(p1.x, p2.x);
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const colors = ['#ff3d5a', '#ff9900', '#f7c948', '#00ff88', '#00c8ff', '#7c6fff', '#ff3d5a'];
      levels.forEach((lvl, i) => {
        const y = p2.y - H * lvl;
        const c = colors[i];
        g.appendChild(this.#svgEl('line', { x1: xL, y1: y, x2: xR, y2: y, stroke: c, 'stroke-width': 1 }));
        const t = this.#svgEl('text', { x: xL + 4, y: y - 3, fill: c, 'font-size': 9, 'font-family': 'Space Mono,monospace' });
        t.textContent = (lvl * 100).toFixed(1) + '%';
        g.appendChild(t);
      });
      g.appendChild(this.#svgEl('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: .5,
      }));
      [p1, p2].forEach(p => g.appendChild(
        this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })
      ));
    }

    if (type === 'zone' && pts.length >= 2) {
      const [p1, p2] = pts;
      const y = Math.min(p1.y, p2.y);
      const h = Math.abs(p2.y - p1.y);
      g.appendChild(this.#svgEl('rect', { x: 0, y, width: chartW, height: Math.max(h, 2), fill, stroke, 'stroke-width': 1 }));
      [p1.y, p2.y].forEach(yl => g.appendChild(this.#svgEl('line', {
        x1: 0, y1: yl, x2: chartW, y2: yl, stroke, 'stroke-width': 1, 'stroke-dasharray': '6 3',
      })));
    }

    if (type === 'rectangle' && pts.length >= 2) {
      const [p1, p2] = pts;
      const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
      const w = Math.abs(p2.x - p1.x),   h = Math.abs(p2.y - p1.y);
      g.appendChild(this.#svgEl('rect', { x, y, width: Math.max(w, 2), height: Math.max(h, 2), fill, stroke, 'stroke-width': 1.5, rx: 1 }));
      [p1, p2, { x: p1.x, y: p2.y }, { x: p2.x, y: p1.y }].forEach(p =>
        g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: stroke }))
      );
    }

    if (type === 'pitchfork' && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const mx  = (p2.x + p3.x) / 2, my  = (p2.y + p3.y) / 2;
      const dx  = mx - p1.x,          dy  = my - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ext = 5000;
      g.appendChild(this.#svgEl('line', {
        x1: p1.x, y1: p1.y, x2: p1.x + dx / len * ext, y2: p1.y + dy / len * ext,
        stroke, 'stroke-width': 1.5,
      }));
      [p2, p3].forEach(pp => {
        const dx2 = pp.x - p1.x + (dx / len) * 200;
        const dy2 = pp.y - p1.y + (dy / len) * 200;
        const ll  = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
        g.appendChild(this.#svgEl('line', {
          x1: pp.x, y1: pp.y, x2: pp.x + dx2 / ll * ext, y2: pp.y + dy2 / ll * ext,
          stroke, 'stroke-width': 1, 'stroke-dasharray': '5 3',
        }));
      });
      g.appendChild(this.#svgEl('line', {
        x1: p2.x, y1: p2.y, x2: p3.x, y2: p3.y,
        stroke, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: .6,
      }));
      [p1, p2, p3].forEach(p =>
        g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke }))
      );
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

  // ── Privé — événement ─────────────────────────────────────────

  #emitToolChange() {
    this.#canvas.dispatchEvent(new CustomEvent('crypview:tool:change', {
      bubbles: true,
      detail: { tool: this.#currentTool },
    }));
  }
}
