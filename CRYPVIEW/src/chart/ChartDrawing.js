// ============================================================
//  src/chart/ChartDrawing.js — CrypView V2
//  Drawing Tools : 5 outils SVG avec persistance localStorage.
//
//  Outils : trendline, fibonacci, zone, rectangle, pitchfork
//  Persistance : clé configurable (storageKey) — une par panneau en multi.
//  Multi-instances : une seule instance peut être "active" à la fois.
//   L'activation d'un outil sur un panneau annule silencieusement l'autre.
// ============================================================

// ── Singleton "instance active" — partagé entre tous les panneaux ─
let _activeDrawingInstance = null;

const STROKE = {
  trendline:  '#00ff88',
  fibonacci:  '#00c8ff',
  zone:       '#00c8ff',
  rectangle:  '#ff6eb4',
  pitchfork:  '#ff9900',
};

const FILL = {
  trendline:  'none',
  fibonacci:  'none',
  zone:       'rgba(0,200,255,0.15)',
  rectangle:  'rgba(255,110,180,0.13)',
  pitchfork:  'none',
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

  constructor(chart, cSeries, drawCanvas, drawSvg, storageKey = 'crypview_drawings_v2') {
    this.#chart      = chart;
    this.#cSeries    = cSeries;
    this.#canvas     = drawCanvas;
    this.#svg        = drawSvg;
    this.#storageKey = storageKey;
    this.#load();
    this.#bindEvents();
    this.#subscribeChartRedraws();
    this.#redraw();
  }

  setTool(tool) {
    if (this.#currentTool === tool) { this.cancel(); return; }
    if (_activeDrawingInstance && _activeDrawingInstance !== this) {
      _activeDrawingInstance.#silentCancel();
    }
    _activeDrawingInstance = this;
    this.#currentTool = tool;
    this.#tempAnchors = [];
    this.#canvas.classList.add('drawing');
    this.#showToolbar(TOOL_LABELS[tool] ?? tool.toUpperCase());
    this.#emitToolChange();
  }

  cancel() {
    this.#currentTool = null;
    this.#tempAnchors = [];
    this.#canvas.classList.remove('drawing');
    this.#hideToolbar();
    if (_activeDrawingInstance === this) _activeDrawingInstance = null;
    this.#redraw();
    this.#emitToolChange();
  }

  clear() {
    this.#drawings = [];
    this.#save();
    this.#redraw();
  }

  getCurrentTool() { return this.#currentTool; }
  getActiveTools() { return this.#currentTool ? [this.#currentTool] : []; }

  #silentCancel() {
    this.#currentTool = null;
    this.#tempAnchors = [];
    this.#canvas.classList.remove('drawing');
    this.#redraw();
    this.#emitToolChange();
  }

  #showToolbar(label) {
    const lbl = document.getElementById('draw-toolbar-label');
    if (lbl) lbl.textContent = label;
    document.getElementById('draw-toolbar')?.classList.add('visible');
  }

  #hideToolbar() {
    if (_activeDrawingInstance === null || _activeDrawingInstance === this) {
      document.getElementById('draw-toolbar')?.classList.remove('visible');
    }
  }

  #load() {
    try { this.#drawings = JSON.parse(localStorage.getItem(this.#storageKey) ?? '[]'); }
    catch (_) { this.#drawings = []; }
  }

  #save() {
    try { localStorage.setItem(this.#storageKey, JSON.stringify(this.#drawings)); } catch (_) {}
  }

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
      if (!this.#currentTool) return;
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

  #subscribeChartRedraws() {
    const redraw = () => this.#redraw();
    this.#chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    this.#chart.subscribeCrosshairMove(() => {
      if (this.#currentTool && this.#tempAnchors.length > 0) this.#redraw();
    });
    new ResizeObserver(redraw).observe(this.#canvas);

    const root = this.#canvas.closest('.chart-panel') ??
                 this.#canvas.closest('#chart-container') ??
                 this.#canvas;
    let raf = false;
    new MutationObserver(() => {
      if (raf) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; this.#redraw(); });
    }).observe(root, { attributes: true, attributeFilter: ['style'], subtree: true });
  }

  #redraw() {
    while (this.#svg.firstChild) this.#svg.removeChild(this.#svg.firstChild);

    for (const d of this.#drawings) {
      const pxPts = d.anchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      if (pxPts.length < TOOL_POINTS[d.type]) continue;
      const el = this.#renderShape(d.type, pxPts, false);
      el.addEventListener('contextmenu', ev => {
        if (!this.#currentTool) {
          ev.preventDefault(); ev.stopPropagation();
          this.#drawings = this.#drawings.filter(x => x.id !== d.id);
          this.#save(); this.#redraw();
        }
      });
      this.#svg.appendChild(el);
    }

    if (this.#currentTool && this.#tempAnchors.length > 0) {
      const pxTemp = this.#tempAnchors.map(a => this.#anchorToPixel(a)).filter(Boolean);
      this.#svg.appendChild(this.#renderShape(this.#currentTool, [...pxTemp, this.#mousePixel], true));
    }
  }

  #renderShape(type, pts, isPreview) {
    const stroke = STROKE[type] ?? '#00ff88';
    const fill   = FILL[type]   ?? 'none';
    const alpha  = isPreview ? 0.5 : 0.85;
    const W      = this.#canvas.offsetWidth || 800;
    const g      = this.#svgEl('g', { class: 'draw-shape' + (isPreview ? ' draw-preview' : ''), opacity: alpha });

    if (type === 'trendline' && pts.length >= 2) {
      const [p1, p2] = pts;
      const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.sqrt(dx*dx+dy*dy)||1, ext = 5000;
      g.appendChild(this.#svgEl('line', { x1: p1.x-dx/len*ext, y1: p1.y-dy/len*ext, x2: p2.x+dx/len*ext, y2: p2.y+dy/len*ext, stroke, strokeWidth: 1.5 }));
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    if (type === 'fibonacci' && pts.length >= 2) {
      const [p1, p2] = pts, H = p2.y - p1.y;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const colors = ['#ff3d5a','#ff9900','#f7c948','#00ff88','#00c8ff','#7c6fff','#ff3d5a'];
      levels.forEach((lvl, i) => {
        const y = p2.y - H * lvl, c = colors[i];
        g.appendChild(this.#svgEl('line', { x1: 0, y1: y, x2: W, y2: y, stroke: c, strokeWidth: 1 }));
        const t = this.#svgEl('text', { x: 10, y: y-3, fill: c, 'font-size': 9, 'font-family': 'Space Mono,monospace' });
        t.textContent = (lvl*100).toFixed(1)+'%';
        g.appendChild(t);
      });
      g.appendChild(this.#svgEl('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke, strokeWidth: 1, 'stroke-dasharray': '4 3', opacity: .5 }));
      [p1, p2].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    if (type === 'zone' && pts.length >= 2) {
      const [p1, p2] = pts, y = Math.min(p1.y,p2.y), h = Math.abs(p2.y-p1.y);
      g.appendChild(this.#svgEl('rect', { x: 0, y, width: W, height: Math.max(h,2), fill, stroke, strokeWidth: 1 }));
      [p1.y, p2.y].forEach(yl => g.appendChild(this.#svgEl('line', { x1: 0, y1: yl, x2: W, y2: yl, stroke, strokeWidth: 1, 'stroke-dasharray': '6 3' })));
    }

    if (type === 'rectangle' && pts.length >= 2) {
      const [p1, p2] = pts;
      const x = Math.min(p1.x,p2.x), y = Math.min(p1.y,p2.y), w = Math.abs(p2.x-p1.x), h = Math.abs(p2.y-p1.y);
      g.appendChild(this.#svgEl('rect', { x, y, width: Math.max(w,2), height: Math.max(h,2), fill, stroke, strokeWidth: 1.5, rx: 1 }));
      [p1, p2, {x:p1.x,y:p2.y}, {x:p2.x,y:p1.y}].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 3, fill: stroke })));
    }

    if (type === 'pitchfork' && pts.length >= 3) {
      const [p1, p2, p3] = pts;
      const mx = (p2.x+p3.x)/2, my = (p2.y+p3.y)/2;
      const dx = mx-p1.x, dy = my-p1.y, len = Math.sqrt(dx*dx+dy*dy)||1, ext = 5000;
      g.appendChild(this.#svgEl('line', { x1: p1.x, y1: p1.y, x2: p1.x+dx/len*ext, y2: p1.y+dy/len*ext, stroke, strokeWidth: 1.5 }));
      [p2, p3].forEach(pp => {
        const dx2 = pp.x-p1.x+(dx/len)*200, dy2 = pp.y-p1.y+(dy/len)*200, ll = Math.sqrt(dx2*dx2+dy2*dy2)||1;
        g.appendChild(this.#svgEl('line', { x1: pp.x, y1: pp.y, x2: pp.x+dx2/ll*ext, y2: pp.y+dy2/ll*ext, stroke, strokeWidth: 1, 'stroke-dasharray': '5 3' }));
      });
      g.appendChild(this.#svgEl('line', { x1: p2.x, y1: p2.y, x2: p3.x, y2: p3.y, stroke, strokeWidth: 1, 'stroke-dasharray': '4 3', opacity: .6 }));
      [p1, p2, p3].forEach(p => g.appendChild(this.#svgEl('circle', { cx: p.x, cy: p.y, r: 4, fill: stroke })));
    }

    return g;
  }

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

  #svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }

  #emitToolChange() {
    this.#canvas.dispatchEvent(new CustomEvent('crypview:tool:change', {
      bubbles: true,
      detail: { tool: this.#currentTool },
    }));
  }
}
