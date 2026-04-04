// ============================================================
//  src/chart/ChartVolumeProfile.js — CrypView V2
//  Volume Profile : calcul + rendu canvas.
//
//  Correctif Bug #8 :
//    canvasId passé en paramètre du constructeur.
//    #ensureCanvas() cherche maintenant le canvas dans
//    this.#container (scope local) plutôt que via
//    document.getElementById() global. Évite le partage de
//    canvas entre panneaux en mode multi.
// ============================================================

export class ChartVolumeProfile {
  #chart;
  #cSeries;
  #container;

  // ── Bug #8 : ID du canvas, paramétrable ──────────────────
  // Valeur par défaut 'vp-canvas' pour la vue simple (page.html).
  // En multi, passer 'vp-canvas-0', 'vp-canvas-1', etc.
  #canvasId;

  #canvas    = null;
  #redrawFn  = null;
  #resizeObs = null;
  #active    = false;

  /**
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} container  — div#chart-container
   * @param {string}      [canvasId='vp-canvas'] — ID unique du canvas overlay
   */
  constructor(chart, cSeries, container, canvasId = 'vp-canvas') {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#canvasId  = canvasId;
  }

  // ── API publique ──────────────────────────────────────────

  activate(candles) {
    if (this.#active) return;
    this.#active = true;
    this.#ensureCanvas();

    this.#redrawFn = () => {
      if (this.#active) this.#draw(candles);
    };

    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(this.#redrawFn);
    this.#chart.subscribeCrosshairMove(this.#redrawFn);

    this.#resizeObs = new ResizeObserver(this.#redrawFn);
    this.#resizeObs.observe(this.#container);

    this.#draw(candles);
  }

  redraw(candles) {
    if (!this.#active) return;
    this.#draw(candles);
  }

  deactivate() {
    if (!this.#active) return;
    this.#active = false;

    if (this.#redrawFn) {
      try { this.#chart.timeScale().unsubscribeVisibleLogicalRangeChange(this.#redrawFn); } catch (_) {}
      try { this.#chart.unsubscribeCrosshairMove(this.#redrawFn); } catch (_) {}
      this.#redrawFn = null;
    }

    this.#resizeObs?.disconnect();
    this.#resizeObs = null;

    if (this.#canvas) {
      this.#canvas.getContext('2d').clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#canvas.style.display = 'none';
    }
  }

  isActive() { return this.#active; }

  // ── Calcul ────────────────────────────────────────────────

  static calc(candles, nBuckets = 80) {
    if (!candles.length) return [];

    const lo   = Math.min(...candles.map(c => c.low));
    const hi   = Math.max(...candles.map(c => c.high));
    const step = (hi - lo) / nBuckets || 1;

    const profile = Array.from({ length: nBuckets }, (_, i) => ({
      price:   lo + (i + 0.5) * step,
      priceHi: lo + (i + 1)   * step,
      priceLo: lo +  i        * step,
      buyVol:  0,
      sellVol: 0,
    }));

    for (const c of candles) {
      const isBull = c.close >= c.open;
      const range  = c.high - c.low || 1;
      for (const b of profile) {
        const overlap = Math.max(0, Math.min(b.priceHi, c.high) - Math.max(b.priceLo, c.low));
        if (overlap <= 0) continue;
        const v = c.volume * (overlap / range);
        if (isBull) b.buyVol += v; else b.sellVol += v;
      }
    }

    const maxVol   = Math.max(...profile.map(b => b.buyVol + b.sellVol)) || 1;
    const totalVol = profile.reduce((a, b) => a + b.buyVol + b.sellVol, 0);

    let pocIdx = 0;
    for (let i = 1; i < profile.length; i++) {
      if ((profile[i].buyVol + profile[i].sellVol) > (profile[pocIdx].buyVol + profile[pocIdx].sellVol)) pocIdx = i;
    }

    let vaVol = profile[pocIdx].buyVol + profile[pocIdx].sellVol;
    let vahIdx = pocIdx, valIdx = pocIdx;
    const target = totalVol * 0.70;
    while (vaVol < target) {
      const upVol = vahIdx + 1 < profile.length ? profile[vahIdx + 1].buyVol + profile[vahIdx + 1].sellVol : 0;
      const dnVol = valIdx - 1 >= 0             ? profile[valIdx - 1].buyVol + profile[valIdx - 1].sellVol : 0;
      if (upVol === 0 && dnVol === 0) break;
      if (upVol >= dnVol) { vahIdx++; vaVol += upVol; } else { valIdx--; vaVol += dnVol; }
    }

    const pocPrice = profile[pocIdx].price;
    const vahPrice = profile[vahIdx].price;
    const valPrice = profile[valIdx].price;

    return profile.map((b, i) => ({
      ...b,
      total:    b.buyVol + b.sellVol,
      maxVol,
      isPOC:    i === pocIdx,
      inVA:     i >= valIdx && i <= vahIdx,
      pocPrice, vahPrice, valPrice,
    }));
  }

  // ── Rendu canvas ──────────────────────────────────────────

  #draw(candles) {
    if (!this.#canvas || !candles.length) return;
    const W = this.#container.clientWidth;
    const H = this.#container.clientHeight;
    this.#canvas.width  = W;
    this.#canvas.height = H;

    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const profile  = ChartVolumeProfile.calc(candles, 80);
    if (!profile.length) return;

    const barMaxW  = W * 0.18;
    const pocPrice = profile[0].pocPrice;
    const vahPrice = profile[0].vahPrice;
    const valPrice = profile[0].valPrice;

    for (const b of profile) {
      const yTop = this.#cSeries.priceToCoordinate(b.priceHi);
      const yBot = this.#cSeries.priceToCoordinate(b.priceLo);
      if (yTop == null || yBot == null) continue;

      const barH = Math.max(1, Math.abs(yBot - yTop) - 1);
      const y    = Math.min(yTop, yBot);
      const totalW = (b.total / b.maxVol) * barMaxW;
      const buyW   = (b.buyVol / (b.total || 1)) * totalW;
      const sellW  = totalW - buyW;

      if (b.inVA) {
        ctx.fillStyle = 'rgba(226,64,251,0.10)';
        ctx.fillRect(W - totalW - 2, y, totalW + 2, barH);
      }
      ctx.fillStyle = b.isPOC ? 'rgba(0,255,136,0.75)' : 'rgba(0,255,136,0.42)';
      ctx.fillRect(W - totalW, y, buyW, barH);
      ctx.fillStyle = b.isPOC ? 'rgba(255,61,90,0.75)' : 'rgba(255,61,90,0.42)';
      ctx.fillRect(W - totalW + buyW, y, sellW, barH);
    }

    this.#drawHLine(ctx, W, pocPrice, '#e040fb', 1.5, [5, 3], 'POC');
    this.#drawHLine(ctx, W * 0.65, vahPrice, 'rgba(0,200,255,0.6)', 1, [3, 4], 'VAH');
    this.#drawHLine(ctx, W * 0.65, valPrice, 'rgba(0,200,255,0.6)', 1, [3, 4], 'VAL', true);
  }

  #drawHLine(ctx, lineWidth, price, color, lw, dash, label, labelBelow = false) {
    const y = this.#cSeries.priceToCoordinate(price);
    if (y == null) return;

    ctx.strokeStyle = color;
    ctx.lineWidth   = lw;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(lineWidth, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 8px Space Mono,monospace';
    const priceStr = price > 100 ? price.toFixed(1) : price.toFixed(4);
    const text  = `${label} ${priceStr}`;
    const tw    = ctx.measureText(text).width;
    const yLabel = labelBelow ? y + 1 : y - 13;

    ctx.fillStyle = 'rgba(10,20,30,0.80)';
    ctx.fillRect(4, yLabel, tw + 8, 12);

    const textColor = label === 'POC' ? '#e040fb' : 'rgba(0,200,255,0.9)';
    ctx.fillStyle = textColor;
    ctx.fillText(text, 8, labelBelow ? y + 11 : y - 2);
  }

  // ── Bug #8 corrigé ────────────────────────────────────────
  // Cherche le canvas dans this.#container (scope local) plutôt
  // que via document.getElementById() (scope global).
  #ensureCanvas() {
    let canvas = this.#container.querySelector(`#${this.#canvasId}`);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = this.#canvasId;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:4;';
      this.#container.appendChild(canvas);
    }
    canvas.style.display = 'block';
    this.#canvas = canvas;
  }
}
