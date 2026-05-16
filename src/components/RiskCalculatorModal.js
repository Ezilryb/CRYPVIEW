// ============================================================
//  src/components/RiskCalculatorModal.js — CrypView V4.0
//  Outils de gestion du risque : 6 onglets.
//  Fully i18n'd — uses t() from CrypView i18n system.
//
//  Usage :
//    const rc = new RiskCalculatorModal({
//      getCurrentPrice: () => lastPrice,
//      t: i18n.t.bind(i18n),
//    });
//    rc.open();
// ============================================================

export class RiskCalculatorModal {
  #overlay;
  #activeTab  = 'position';
  #callbacks;
  /** @type {(key: string, vars?: Record<string, unknown>) => string} */
  #t;

  /** @param {{ getCurrentPrice?: () => number, t?: Function }} [callbacks] */
  constructor(callbacks = {}) {
    this.#callbacks = callbacks;
    this.#t = typeof callbacks.t === 'function'
      ? callbacks.t
      : (key) => key.split('.').pop();
    this.#overlay = document.getElementById('risk-calc-overlay');
    this.#bindStaticEvents();
  }

  open() {
    if (!this.#overlay) return;
    this.#overlay.style.display = 'flex';
    this.#switchTab(this.#activeTab);
  }

  close() {
    if (this.#overlay) this.#overlay.style.display = 'none';
  }

  // ── Navigation ────────────────────────────────────────────

  #switchTab(tab) {
    this.#activeTab = tab;

    ['position', 'rr', 'liq', 'maxloss', 'trailing', 'slippage'].forEach(t => {
      const btn = document.getElementById(`rc-tab-${t}`);
      if (btn) {
        btn.classList.toggle('active', t === tab);
        btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      }
    });

    const content = document.getElementById('rc-content');
    if (!content) return;

    switch (tab) {
      case 'position': content.innerHTML = this.#tplPosition(); this.#bindPosition(); break;
      case 'rr':       content.innerHTML = this.#tplRR();       this.#bindRR();       break;
      case 'liq':      content.innerHTML = this.#tplLiq();      this.#bindLiq();      break;
      case 'maxloss':  content.innerHTML = this.#tplMaxLoss();  this.#bindMaxLoss();  break;
      case 'trailing': content.innerHTML = this.#tplTrailing(); this.#bindTrailing(); break;
      case 'slippage': content.innerHTML = this.#tplSlippage(); this.#bindSlippage(); break;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 1 — Taille de position
  // ══════════════════════════════════════════════════════════

  #tplPosition() {
    const price    = this.#callbacks.getCurrentPrice?.() ?? 0;
    const stop     = price > 0 ? (price * 0.98).toFixed(price > 100 ? 2 : 6) : '';
    const priceStr = price > 0 ? price.toFixed(price > 100 ? 2 : 6) : '';

    return `
      <div class="rc-desc">${this.#t('calc.pos.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('rc-balance',  this.#t('calc.pos.lblBalance'), '10000', 'number', '0.01')}
        ${this.#field('rc-risk-pct', this.#t('calc.pos.lblRisk'),    '1',     'number', '0.1')}
        ${this.#field('rc-entry',    this.#t('calc.pos.lblEntry'),   priceStr,'number', 'any')}
        ${this.#field('rc-stop',     this.#t('calc.pos.lblStop'),    stop,    'number', 'any')}
      </div>
      <button id="rc-calc-pos" class="rc-btn-primary">${this.#t('calc.pos.btn')}</button>
      <div id="rc-pos-result" class="rc-result" style="display:none"></div>
      <div class="rc-tip">${this.#t('calc.pos.tip')}</div>`;
  }

  #bindPosition() {
    const calc = () => {
      const balance  = parseFloat(document.getElementById('rc-balance')?.value)  || 0;
      const riskPct  = parseFloat(document.getElementById('rc-risk-pct')?.value) || 0;
      const entry    = parseFloat(document.getElementById('rc-entry')?.value)     || 0;
      const stop     = parseFloat(document.getElementById('rc-stop')?.value)      || 0;

      const res = document.getElementById('rc-pos-result');
      if (!res) return;
      if (!balance || !riskPct || !entry || !stop || entry === stop) {
        res.style.display = 'none'; return;
      }

      const riskUSD     = balance * riskPct / 100;
      const priceDiff   = Math.abs(entry - stop);
      const pctMove     = (priceDiff / entry) * 100;
      const positionUSD = (riskUSD / priceDiff) * entry;
      const quantity    = positionUSD / entry;
      const isLong      = entry > stop;

      res.style.display = 'block';
      res.innerHTML = `
        <div class="rc-result-title">${this.#t('calc.pos.resTitle')}</div>
        <div class="rc-result-grid">
          ${this.#resBox(this.#t('calc.pos.resRiskUSD'), this.#fmtU(riskUSD),       'var(--red)')}
          ${this.#resBox(this.#t('calc.pos.resPosSize'), this.#fmtU(positionUSD),   'var(--accent)')}
          ${this.#resBox(this.#t('calc.pos.resQty'),     this.#fmtQ(quantity),      'var(--text)')}
          ${this.#resBox(this.#t('calc.pos.resSLPct'),   pctMove.toFixed(2) + ' %', 'var(--yellow)')}
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.pos.direction')}</span>
          <strong style="color:${isLong ? 'var(--green)' : 'var(--red)'}">
            ${isLong ? this.#t('calc.long') : this.#t('calc.short')}
          </strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.pos.capitalLbl')}</span>
          <strong>${(positionUSD / balance * 100).toFixed(1)} ${this.#t('calc.pos.capitalPct')}</strong>
        </div>
        ${positionUSD > balance
          ? `<div class="rc-warn">${this.#t('calc.pos.warnGt')}</div>`
          : ''}`;
    };

    document.getElementById('rc-calc-pos')?.addEventListener('click', calc);
    ['rc-balance', 'rc-risk-pct', 'rc-entry', 'rc-stop'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
    if (document.getElementById('rc-entry')?.value) calc();
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 2 — Risque / Récompense
  // ══════════════════════════════════════════════════════════

  #tplRR() {
    const price = this.#callbacks.getCurrentPrice?.() ?? 0;
    const entry = price > 0 ? price.toFixed(price > 100 ? 2 : 6) : '';
    const stop  = price > 0 ? (price * 0.98).toFixed(price > 100 ? 2 : 6) : '';
    const tp    = price > 0 ? (price * 1.04).toFixed(price > 100 ? 2 : 6) : '';

    return `
      <div class="rc-desc">${this.#t('calc.rr.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('rr-entry',    this.#t('calc.rr.lblEntry'), entry,  'number', 'any')}
        ${this.#field('rr-stop',     this.#t('calc.rr.lblStop'),  stop,   'number', 'any')}
        ${this.#field('rr-tp',       this.#t('calc.rr.lblTP'),    tp,     'number', 'any')}
        ${this.#field('rr-size-usd', this.#t('calc.rr.lblSize'), '1000', 'number', '0.01')}
      </div>
      <button id="rr-calc" class="rc-btn-primary">${this.#t('calc.rr.btn')}</button>
      <div id="rr-result" class="rc-result" style="display:none"></div>
      <div class="rc-tip">${this.#t('calc.rr.tip')}</div>`;
  }

  #bindRR() {
    const calc = () => {
      const entry   = parseFloat(document.getElementById('rr-entry')?.value)    || 0;
      const stop    = parseFloat(document.getElementById('rr-stop')?.value)     || 0;
      const tp      = parseFloat(document.getElementById('rr-tp')?.value)       || 0;
      const sizeUSD = parseFloat(document.getElementById('rr-size-usd')?.value) || 0;

      const res = document.getElementById('rr-result');
      if (!res) return;
      if (!entry || !stop || !tp || entry === stop) { res.style.display = 'none'; return; }

      const risk       = Math.abs(entry - stop);
      const reward     = Math.abs(tp - entry);
      const ratio      = reward / risk;
      const qty        = sizeUSD / entry;
      const lossUSD    = qty * risk;
      const gainUSD    = qty * reward;
      const isLong     = tp > entry;
      const validDir   = isLong ? (stop < entry) : (stop > entry);
      const minWinRate = 1 / (1 + ratio) * 100;
      const ratioColor = ratio >= 3 ? 'var(--green)' : ratio >= 2 ? 'var(--accent)'
                       : ratio >= 1 ? 'var(--yellow)' : 'var(--red)';

      res.style.display = 'block';
      res.innerHTML = `
        <div class="rc-result-title">${this.#t('calc.rr.resTitle')}</div>
        <div style="text-align:center;margin-bottom:14px;">
          <div style="font-size:42px;font-family:'Syne',sans-serif;font-weight:800;color:${ratioColor};">
            ${ratio.toFixed(2)}
          </div>
          <div style="font-size:11px;color:var(--muted);">${this.#t('calc.rr.ratioSub')}</div>
        </div>
        <div class="rc-result-grid">
          ${this.#resBox(this.#t('calc.rr.potLoss'), '-' + this.#fmtU(lossUSD), 'var(--red)')}
          ${this.#resBox(this.#t('calc.rr.potGain'), '+' + this.#fmtU(gainUSD), 'var(--green)')}
          ${this.#resBox(this.#t('calc.rr.slPct'),   ((risk / entry) * 100).toFixed(2) + ' %', 'var(--red)')}
          ${this.#resBox(this.#t('calc.rr.tpPct'),   ((reward / entry) * 100).toFixed(2) + ' %', 'var(--green)')}
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.rr.minWinRate')}</span>
          <strong style="color:${minWinRate < 50 ? 'var(--green)' : 'var(--yellow)'}">${minWinRate.toFixed(1)} %</strong>
        </div>
        ${!validDir ? `<div class="rc-warn">${this.#t('calc.rr.warnBadStop')}</div>` : ''}
        <div class="rc-rr-bar">
          <div class="rc-rr-loss" style="flex:${risk.toFixed(4)}"></div>
          <div class="rc-rr-pivot"></div>
          <div class="rc-rr-gain" style="flex:${reward.toFixed(4)}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);">
          <span>${this.#t('calc.rr.stop')} ${stop.toFixed(2)}</span>
          <span>${this.#t('calc.rr.entry')} ${entry.toFixed(2)}</span>
          <span>${this.#t('calc.rr.tp')} ${tp.toFixed(2)}</span>
        </div>`;
    };

    document.getElementById('rr-calc')?.addEventListener('click', calc);
    ['rr-entry', 'rr-stop', 'rr-tp', 'rr-size-usd'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
    if (document.getElementById('rr-entry')?.value) calc();
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 3 — Levier & Liquidation
  // ══════════════════════════════════════════════════════════

  #tplLiq() {
    const price = this.#callbacks.getCurrentPrice?.() ?? 0;
    const entry = price > 0 ? price.toFixed(price > 100 ? 2 : 6) : '';

    return `
      <div class="rc-desc">${this.#t('calc.lev.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('liq-entry',    this.#t('calc.lev.lblEntry'), entry,  'number', 'any')}
        ${this.#field('liq-size-usd', this.#t('calc.lev.lblSize'), '1000', 'number', '0.01')}
        ${this.#fieldSelect('liq-side', this.#t('calc.lev.lblSide'), [
          ['long',  this.#t('calc.long')],
          ['short', this.#t('calc.short')],
        ])}
        ${this.#field('liq-lev', this.#t('calc.lev.lblLev'), '10',   'number', '1', '1', '125')}
        ${this.#field('liq-mm',  this.#t('calc.lev.lblMM'),  '0.5',  'number', '0.01')}
        ${this.#field('liq-fee', this.#t('calc.lev.lblFee'), '0.06', 'number', '0.001')}
      </div>
      <button id="liq-calc" class="rc-btn-primary">${this.#t('calc.lev.btn')}</button>
      <div id="liq-result" class="rc-result" style="display:none"></div>
      <div class="rc-tip">${this.#t('calc.lev.tip')}</div>`;
  }

  #bindLiq() {
    const calc = () => {
      const entry   = parseFloat(document.getElementById('liq-entry')?.value)    || 0;
      const sizeUSD = parseFloat(document.getElementById('liq-size-usd')?.value) || 0;
      const side    = document.getElementById('liq-side')?.value ?? 'long';
      const lev     = parseFloat(document.getElementById('liq-lev')?.value)      || 1;
      const mm      = parseFloat(document.getElementById('liq-mm')?.value)        || 0.5;
      const fee     = parseFloat(document.getElementById('liq-fee')?.value)       || 0.06;

      const res = document.getElementById('liq-result');
      if (!res) return;
      if (!entry || !sizeUSD || lev < 1) { res.style.display = 'none'; return; }

      const margin  = sizeUSD / lev;
      const qty     = sizeUSD / entry;
      const openFee = sizeUSD * (fee / 100);
      const mmFrac  = mm / 100;
      let liqPrice  = side === 'long'
        ? entry * (1 - 1 / lev + mmFrac)
        : entry * (1 + 1 / lev - mmFrac);
      liqPrice = Math.max(0, liqPrice);

      const pctToLiq = Math.abs(liqPrice - entry) / entry * 100;
      const maxLoss  = margin + openFee;
      const isLong   = side === 'long';
      const liqColor = pctToLiq < 5  ? 'var(--red)'
                     : pctToLiq < 15 ? 'var(--yellow)'
                     : 'var(--green)';

      res.style.display = 'block';
      res.innerHTML = `
        <div class="rc-result-title">${this.#t('calc.lev.resTitle')}${lev}</div>
        <div class="rc-result-grid">
          ${this.#resBox(this.#t('calc.lev.liqPrice'), liqPrice.toFixed(liqPrice > 10 ? 2 : 6), liqColor)}
          ${this.#resBox(this.#t('calc.lev.pctToLiq'), pctToLiq.toFixed(2) + ' %', liqColor)}
          ${this.#resBox(this.#t('calc.lev.margin'),   this.#fmtU(margin), 'var(--accent)')}
          ${this.#resBox(this.#t('calc.lev.maxLoss'),  '-' + this.#fmtU(maxLoss), 'var(--red)')}
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.lev.qty')}</span>
          <strong>${this.#fmtQ(qty)} ${this.#t('calc.units')}</strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.lev.direction')}</span>
          <strong style="color:${isLong ? 'var(--green)' : 'var(--red)'}">
            ${isLong ? this.#t('calc.long') : this.#t('calc.short')} × ${lev}
          </strong>
        </div>
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:4px;">
            <span>${isLong ? '🛑 Liq.' : '📍'} ${isLong ? liqPrice.toFixed(2) : entry.toFixed(2)}</span>
            <span>${pctToLiq.toFixed(2)} ${this.#t('calc.lev.marginPct')}</span>
            <span>${isLong ? '📍' : '🛑 Liq.'} ${isLong ? entry.toFixed(2) : liqPrice.toFixed(2)}</span>
          </div>
          <div style="height:8px;border-radius:4px;background:rgba(28,35,51,1);overflow:hidden;position:relative;">
            <div style="position:absolute;${isLong ? 'left' : 'right'}:0;height:100%;
                        width:${Math.min(100, pctToLiq * lev).toFixed(1)}%;
                        background:${liqColor};border-radius:4px;"></div>
          </div>
        </div>
        ${pctToLiq < 5
          ? `<div class="rc-warn">${this.#t('calc.lev.warnDanger')}</div>`
          : pctToLiq < 10
          ? `<div class="rc-warn" style="border-color:var(--yellow);background:rgba(247,201,72,.07);">${this.#t('calc.lev.warnHigh')}</div>`
          : `<div style="font-size:9px;color:var(--green);margin-top:8px;padding:6px 10px;background:rgba(0,255,136,.07);border-radius:4px;border:1px solid rgba(0,255,136,.2);">${this.#t('calc.lev.ok')}</div>`}`;
    };

    document.getElementById('liq-calc')?.addEventListener('click', calc);
    ['liq-entry', 'liq-size-usd', 'liq-lev', 'liq-mm', 'liq-fee'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
    document.getElementById('liq-side')?.addEventListener('change', calc);
    if (document.getElementById('liq-entry')?.value) calc();
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 4 — Scénario de perte max (Monte Carlo simplifié)
  // ══════════════════════════════════════════════════════════

  #tplMaxLoss() {
    return `
      <div class="rc-desc">${this.#t('calc.ml.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('ml-balance',  this.#t('calc.ml.lblBalance'),  '10000', 'number', '0.01')}
        ${this.#field('ml-risk-pct', this.#t('calc.ml.lblRisk'),     '2',     'number', '0.1')}
        ${this.#field('ml-win-rate', this.#t('calc.ml.lblWinRate'),  '50',    'number', '1', '1', '100')}
        ${this.#field('ml-rr',       this.#t('calc.ml.lblRR'),       '1.5',   'number', '0.1')}
        ${this.#field('ml-n-trades', this.#t('calc.ml.lblNTrades'),  '100',   'number', '1', '1', '1000')}
        ${this.#field('ml-alert-dd', this.#t('calc.ml.lblAlertDD'),  '20',    'number', '1')}
      </div>
      <button id="ml-calc" class="rc-btn-primary">${this.#t('calc.ml.btn')}</button>
      <div id="ml-result" class="rc-result" style="display:none">
        <div class="rc-result-title">${this.#t('calc.ml.resTitle')}</div>
        <canvas id="ml-canvas" height="100"
                style="width:100%;display:block;border-radius:6px;
                       background:rgba(0,0,0,.3);margin-bottom:12px;"></canvas>
        <div id="ml-result-body"></div>
      </div>
      <div class="rc-tip">${this.#t('calc.ml.tip')}</div>`;
  }

  #bindMaxLoss() {
    const calc = () => {
      const balance = parseFloat(document.getElementById('ml-balance')?.value)   || 0;
      const riskPct = parseFloat(document.getElementById('ml-risk-pct')?.value)  || 0;
      const winRate = parseFloat(document.getElementById('ml-win-rate')?.value)  || 50;
      const rr      = parseFloat(document.getElementById('ml-rr')?.value)        || 1.5;
      const nTrades = Math.min(1000, parseInt(document.getElementById('ml-n-trades')?.value) || 100);
      const alertDD = parseFloat(document.getElementById('ml-alert-dd')?.value)  || 20;

      const res = document.getElementById('ml-result');
      if (!res) return;
      if (!balance || !riskPct || !nTrades) { res.style.display = 'none'; return; }

      const p          = winRate / 100;
      const q          = 1 - p;
      const kelly      = Math.max(0, (p * (rr + 1) - 1) / rr);
      const halfKelly  = kelly / 2;
      const expectancy = p * rr - q;
      const riskFrac   = riskPct / 100;

      // Worst case (all losses)
      const worstCase = [];
      let bal = balance;
      for (let i = 0; i <= nTrades; i++) {
        worstCase.push(bal);
        bal *= (1 - riskFrac);
      }

      // Monte Carlo — 20 runs, median
      const simRuns = [];
      for (let run = 0; run < 20; run++) {
        let b = balance;
        const series = [b];
        for (let i = 0; i < nTrades; i++) {
          b *= Math.random() < p ? (1 + riskFrac * rr) : (1 - riskFrac);
          series.push(b);
        }
        simRuns.push(series);
      }
      const medianSeries = Array.from({ length: nTrades + 1 }, (_, i) => {
        const vals = simRuns.map(r => r[i]).sort((a, b) => a - b);
        return vals[Math.floor(vals.length / 2)];
      });

      const lossesToAlert = Math.ceil(Math.log(1 - alertDD / 100) / Math.log(1 - riskFrac));
      const balAfterAlert = balance * Math.pow(1 - riskFrac, lossesToAlert);
      const recoveryPct   = (balance / balAfterAlert - 1) * 100;

      res.style.display = 'block';

      requestAnimationFrame(() => {
        const canvas = document.getElementById('ml-canvas');
        if (!canvas) return;
        const W = canvas.offsetWidth;
        canvas.width = W;
        const H = 100;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, W, H);

        const allVals = [...worstCase, ...medianSeries];
        const minV = Math.min(...allVals) * 0.95;
        const maxV = Math.max(...allVals) * 1.05;
        const range = maxV - minV || 1;
        const xs = (i) => (i / nTrades) * W;
        const ys = (v) => H - ((v - minV) / range) * (H - 10) - 5;

        // Reference line
        ctx.strokeStyle = 'rgba(139,148,158,.3)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(0, ys(balance)); ctx.lineTo(W, ys(balance)); ctx.stroke();
        ctx.setLineDash([]);

        // Alert threshold
        const alertBalance = balance * (1 - alertDD / 100);
        ctx.strokeStyle = 'rgba(255,153,0,.5)'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, ys(alertBalance)); ctx.lineTo(W, ys(alertBalance)); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,153,0,.7)';
        ctx.font = '8px Space Mono,monospace';
        ctx.fillText(`-${alertDD}%`, W - 32, ys(alertBalance) - 3);

        // Worst case (red)
        ctx.beginPath();
        worstCase.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
        ctx.strokeStyle = 'rgba(255,61,90,.7)'; ctx.lineWidth = 1.5; ctx.stroke();

        // Median (green)
        ctx.beginPath();
        medianSeries.forEach((v, i) => i === 0 ? ctx.moveTo(xs(i), ys(v)) : ctx.lineTo(xs(i), ys(v)));
        ctx.strokeStyle = 'rgba(0,255,136,.8)'; ctx.lineWidth = 1.5; ctx.stroke();

        ctx.fillStyle = 'rgba(255,61,90,.85)';
        ctx.fillText(this.#t('calc.ml.legendWorst'), 6, 14);
        ctx.fillStyle = 'rgba(0,255,136,.85)';
        ctx.fillText(this.#t('calc.ml.legendMedian'), 60, 14);
      });

      const kellyColor = kelly * 100 > riskPct * 1.5 ? 'var(--green)'
                       : kelly * 100 > riskPct ? 'var(--yellow)' : 'var(--red)';

      document.getElementById('ml-result-body').innerHTML = `
        <div class="rc-result-grid">
          ${this.#resBox(this.#t('calc.ml.kelly'),         (kelly * 100).toFixed(2) + ' %', kellyColor)}
          ${this.#resBox(this.#t('calc.ml.halfKelly'),     (halfKelly * 100).toFixed(2) + ' %', 'var(--accent)')}
          ${this.#resBox(this.#t('calc.ml.expectancy'),    (expectancy * 100).toFixed(2) + ' %',
            expectancy > 0 ? 'var(--green)' : 'var(--red)')}
          ${this.#resBox(this.#t('calc.ml.lossesToAlert'), lossesToAlert + ' trades', 'var(--yellow)')}
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.ml.balAfter', { n: lossesToAlert })}</span>
          <strong style="color:var(--red)">${this.#fmtU(balAfterAlert)}</strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.ml.recovery')}</span>
          <strong style="color:var(--red)">+${recoveryPct.toFixed(1)} %</strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.ml.balMedian', { n: nTrades })}</span>
          <strong style="color:${medianSeries.at(-1) >= balance ? 'var(--green)' : 'var(--red)'}">
            ${this.#fmtU(medianSeries.at(-1))}
          </strong>
        </div>
        ${kelly * 100 < riskPct
          ? `<div class="rc-warn">${this.#t('calc.ml.warnOverKelly', { r: riskPct, k: (kelly * 100).toFixed(2) })}</div>`
          : ''}
        ${expectancy <= 0
          ? `<div class="rc-warn">${this.#t('calc.ml.warnNegExp', { e: (expectancy * 100).toFixed(2) })}</div>`
          : ''}`;
    };

    document.getElementById('ml-calc')?.addEventListener('click', calc);
    ['ml-balance', 'ml-risk-pct', 'ml-win-rate', 'ml-rr', 'ml-n-trades', 'ml-alert-dd'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 5 — Stop suiveur avancé
  // ══════════════════════════════════════════════════════════

  #tplTrailing() {
    const price = this.#callbacks.getCurrentPrice?.() ?? 0;
    const entry = price > 0 ? price.toFixed(price > 100 ? 2 : 6) : '';

    return `
      <div class="rc-desc">${this.#t('calc.tr.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('tr-entry',   this.#t('calc.tr.lblEntry'),      entry,  'number', 'any')}
        ${this.#field('tr-size',    this.#t('calc.tr.lblSize'),       '1000', 'number', '0.01')}
        ${this.#fieldSelect('tr-method', this.#t('calc.tr.lblMethod'), [
          ['fixed_pct', this.#t('calc.tr.methodFixed')],
          ['atr',       this.#t('calc.tr.methodATR')],
          ['gains_pct', this.#t('calc.tr.methodGains')],
        ])}
        ${this.#field('tr-activation', this.#t('calc.tr.lblActivation'), '1',  'number', '0.1')}
        ${this.#field('tr-trail-pct',  this.#t('calc.tr.lblTrailPct'),  '2',   'number', '0.1')}
        ${this.#field('tr-atr',        this.#t('calc.tr.lblATR'),       '',    'number', 'any')}
      </div>
      <div class="rc-grid2" style="margin-bottom:14px;">
        ${this.#field('tr-atr-mult',  this.#t('calc.tr.lblATRMult'),  '2',  'number', '0.1')}
        ${this.#field('tr-gains-pct', this.#t('calc.tr.lblGainsPct'), '50', 'number', '1', '1', '100')}
      </div>
      <button id="tr-calc" class="rc-btn-primary">${this.#t('calc.tr.btn')}</button>
      <div id="tr-result" class="rc-result" style="display:none"></div>
      <div class="rc-tip">${this.#t('calc.tr.tip')}</div>`;
  }

  #bindTrailing() {
    const updateMethodVisibility = () => {
      const method   = document.getElementById('tr-method')?.value ?? 'fixed_pct';
      const trailRow = document.getElementById('tr-trail-pct')?.closest('div');
      const atrRow   = document.getElementById('tr-atr')?.closest('div');
      const atrMult  = document.getElementById('tr-atr-mult')?.closest('div');
      const gainRow  = document.getElementById('tr-gains-pct')?.closest('div');
      if (trailRow) trailRow.style.opacity = method === 'fixed_pct' ? '1' : '0.35';
      if (atrRow)   atrRow.style.opacity   = method === 'atr'       ? '1' : '0.35';
      if (atrMult)  atrMult.style.opacity  = method === 'atr'       ? '1' : '0.35';
      if (gainRow)  gainRow.style.opacity  = method === 'gains_pct' ? '1' : '0.35';
    };

    document.getElementById('tr-method')?.addEventListener('change', updateMethodVisibility);
    updateMethodVisibility();

    const calc = () => {
      const entry      = parseFloat(document.getElementById('tr-entry')?.value)      || 0;
      const size       = parseFloat(document.getElementById('tr-size')?.value)       || 0;
      const method     = document.getElementById('tr-method')?.value ?? 'fixed_pct';
      const activation = parseFloat(document.getElementById('tr-activation')?.value) || 1;
      const trailPct   = parseFloat(document.getElementById('tr-trail-pct')?.value)  || 2;
      const atr        = parseFloat(document.getElementById('tr-atr')?.value)        || 0;
      const atrMult    = parseFloat(document.getElementById('tr-atr-mult')?.value)   || 2;
      const gainsPct   = parseFloat(document.getElementById('tr-gains-pct')?.value)  || 50;

      const res = document.getElementById('tr-result');
      if (!res) return;
      if (!entry || !size) { res.style.display = 'none'; return; }

      const qty          = size / entry;
      const activationPx = entry * (1 + activation / 100);

      const computeStop = (currentPrice) => {
        switch (method) {
          case 'fixed_pct': return currentPrice * (1 - trailPct / 100);
          case 'atr': {
            const atrVal = atr > 0 ? atr : entry * 0.01;
            return currentPrice - atrVal * atrMult;
          }
          case 'gains_pct': {
            const gain = currentPrice - entry;
            if (gain <= 0) return entry * (1 - trailPct / 100);
            return entry + gain * (1 - gainsPct / 100);
          }
          default: return currentPrice * (1 - trailPct / 100);
        }
      };

      const levels = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30];
      const rows = levels.map(pctUp => {
        const px   = entry * (1 + pctUp / 100);
        const stop = computeStop(px);
        const gain = (stop - entry) * qty;
        const prot = pctUp > 0 ? (stop - entry) / (px - entry) * 100 : 0;
        return { pctUp, px, stop, gain, prot, active: px >= activationPx };
      });

      const initialStop   = computeStop(activationPx);
      const initialGainPx = initialStop - entry;

      const methodLabel = method === 'fixed_pct'
        ? `${trailPct}%`
        : method === 'atr'
        ? `ATR × ${atrMult}`
        : `${gainsPct}% ${this.#t('calc.tr.gainsPct')}`;

      res.style.display = 'block';
      res.innerHTML = `
        <div class="rc-result-title">🎯 Stop — ${methodLabel}</div>
        <div class="rc-result-grid" style="margin-bottom:12px;">
          ${this.#resBox(this.#t('calc.tr.activation'),    activationPx.toFixed(2), 'var(--accent)')}
          ${this.#resBox(this.#t('calc.tr.stopAt'),        initialStop.toFixed(2),
            initialGainPx >= 0 ? 'var(--green)' : 'var(--red)')}
          ${this.#resBox(this.#t('calc.tr.gainAtStop'),
            (initialGainPx >= 0 ? '+' : '') + this.#fmtU(initialGainPx * qty),
            initialGainPx >= 0 ? 'var(--green)' : 'var(--red)')}
          ${this.#resBox(this.#t('calc.tr.activationFrom'),
            '+' + activation + '% ' + this.#t('calc.tr.gainsPct'), 'var(--muted)')}
        </div>
        <div style="overflow-x:auto;margin-bottom:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead>
              <tr style="background:var(--panel);color:var(--muted);font-size:8px;
                         text-transform:uppercase;letter-spacing:.6px;">
                <th style="padding:5px 8px;text-align:right;">${this.#t('calc.tr.tblPrice')}</th>
                <th style="padding:5px 8px;text-align:right;">${this.#t('calc.tr.tblPctUp')}</th>
                <th style="padding:5px 8px;text-align:right;">${this.#t('calc.tr.tblStop')}</th>
                <th style="padding:5px 8px;text-align:right;">${this.#t('calc.tr.tblPnl')}</th>
                <th style="padding:5px 8px;text-align:right;">${this.#t('calc.tr.tblPctProt')}</th>
                <th style="padding:5px 8px;text-align:center;">${this.#t('calc.tr.tblActive')}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="border-bottom:1px solid rgba(28,35,51,.5);${r.active ? '' : 'opacity:.45;'}">
                  <td style="padding:5px 8px;text-align:right;font-weight:700;color:var(--text);">
                    ${r.px.toFixed(r.px > 100 ? 2 : 4)}
                  </td>
                  <td style="padding:5px 8px;text-align:right;color:var(--muted);">+${r.pctUp}%</td>
                  <td style="padding:5px 8px;text-align:right;font-weight:700;
                             color:${r.gain >= 0 ? 'var(--green)' : 'var(--red)'};">
                    ${r.stop.toFixed(r.stop > 100 ? 2 : 4)}
                  </td>
                  <td style="padding:5px 8px;text-align:right;
                             color:${r.gain >= 0 ? 'var(--green)' : 'var(--red)'};">
                    ${r.gain >= 0 ? '+' : ''}${this.#fmtU(r.gain)}
                  </td>
                  <td style="padding:5px 8px;text-align:right;color:var(--muted);">
                    ${r.pctUp > 0 ? r.prot.toFixed(0) + '%' : '—'}
                  </td>
                  <td style="padding:5px 8px;text-align:center;">${r.active ? '✅' : '⏸'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${method === 'atr' && !atr
          ? `<div class="rc-warn">${this.#t('calc.tr.warnNoATR')}</div>`
          : ''}`;
    };

    document.getElementById('tr-calc')?.addEventListener('click', calc);
    ['tr-entry', 'tr-size', 'tr-method', 'tr-activation',
     'tr-trail-pct', 'tr-atr', 'tr-atr-mult', 'tr-gains-pct'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
  }

  // ══════════════════════════════════════════════════════════
  //  TAB 6 — Simulation slippage & frais
  // ══════════════════════════════════════════════════════════

  #tplSlippage() {
    return `
      <div class="rc-desc">${this.#t('calc.sl.desc')}</div>
      <div class="rc-grid2">
        ${this.#field('sl-capital',  this.#t('calc.sl.lblCapital'),  '10000', 'number', '0.01')}
        ${this.#field('sl-size',     this.#t('calc.sl.lblSize'),     '1000',  'number', '0.01')}
        ${this.#fieldSelect('sl-order', this.#t('calc.sl.lblOrder'), [
          ['market', this.#t('calc.sl.orderMarket')],
          ['limit',  this.#t('calc.sl.orderLimit')],
          ['mix',    this.#t('calc.sl.orderMix')],
        ])}
        ${this.#field('sl-taker',   this.#t('calc.sl.lblTaker'),   '0.10', 'number', '0.001')}
        ${this.#field('sl-maker',   this.#t('calc.sl.lblMaker'),   '0.02', 'number', '0.001')}
        ${this.#field('sl-slip',    this.#t('calc.sl.lblSlip'),    '0.05', 'number', '0.001')}
        ${this.#field('sl-monthly', this.#t('calc.sl.lblMonthly'), '20',   'number', '1')}
        ${this.#field('sl-rr',      this.#t('calc.sl.lblRR'),      '1.5',  'number', '0.1')}
      </div>
      <button id="sl-calc" class="rc-btn-primary">${this.#t('calc.sl.btn')}</button>
      <div id="sl-result" class="rc-result" style="display:none"></div>
      <div class="rc-tip">${this.#t('calc.sl.tip')}</div>`;
  }

  #bindSlippage() {
    const calc = () => {
      const capital   = parseFloat(document.getElementById('sl-capital')?.value)  || 0;
      const size      = parseFloat(document.getElementById('sl-size')?.value)     || 0;
      const orderType = document.getElementById('sl-order')?.value ?? 'market';
      const taker     = parseFloat(document.getElementById('sl-taker')?.value)    || 0;
      const maker     = parseFloat(document.getElementById('sl-maker')?.value)    || 0;
      const slip      = parseFloat(document.getElementById('sl-slip')?.value)     || 0;
      const monthly   = parseInt(document.getElementById('sl-monthly')?.value)    || 20;
      const rr        = parseFloat(document.getElementById('sl-rr')?.value)       || 1.5;

      const res = document.getElementById('sl-result');
      if (!res) return;
      if (!capital || !size || !monthly) { res.style.display = 'none'; return; }

      let effectiveFee;
      switch (orderType) {
        case 'market': effectiveFee = taker;                break;
        case 'limit':  effectiveFee = maker;               break;
        default:       effectiveFee = (taker + maker) / 2; break;
      }

      const feePerTrade   = size * (effectiveFee / 100) * 2;
      const slipPerTrade  = size * (slip / 100);
      const totalPerTrade = feePerTrade + slipPerTrade;
      const pctPerTrade   = totalPerTrade / size * 100;

      const costMonthly   = totalPerTrade * monthly;
      const costAnnual    = costMonthly * 12;
      const feesAnnual    = feePerTrade  * monthly * 12;
      const slipAnnual    = slipPerTrade * monthly * 12;

      const dragPct       = costAnnual / capital * 100;
      const feeDragPct    = feesAnnual / capital * 100;
      const slipDragPct   = slipAnnual / capital * 100;

      const grossExpPerTrade = size * ((rr - 1) / 2) / 100;
      const netExpPerTrade   = grossExpPerTrade - totalPerTrade;
      const annualGross      = grossExpPerTrade * monthly * 12;
      const annualNet        = netExpPerTrade   * monthly * 12;
      const dragOnPnl        = annualGross > 0 ? (1 - annualNet / annualGross) * 100 : 0;

      const costMarket  = size * (taker / 100) * 2 * monthly * 12 + slipAnnual;
      const costLimit   = size * (maker / 100) * 2 * monthly * 12;
      const savingLimit = costMarket - costLimit;
      const dragColor   = dragPct > 10 ? 'var(--red)' : dragPct > 5 ? 'var(--yellow)' : 'var(--green)';

      res.style.display = 'block';
      res.innerHTML = `
        <div class="rc-result-title">${this.#t('calc.sl.resTitle')}</div>

        <div class="rc-result-grid" style="margin-bottom:12px;">
          ${this.#resBox(this.#t('calc.sl.costPerTrade'), this.#fmtU(totalPerTrade),      'var(--red)')}
          ${this.#resBox(this.#t('calc.sl.pctTrade'),     pctPerTrade.toFixed(3) + '%',   'var(--red)')}
          ${this.#resBox(this.#t('calc.sl.costMonthly'),  this.#fmtU(costMonthly),        'var(--yellow)')}
          ${this.#resBox(this.#t('calc.sl.costAnnual'),   this.#fmtU(costAnnual),         'var(--red)')}
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;">
            ${this.#t('calc.sl.annualBreakdown')}
          </div>
          <div style="margin-top:6px;">
            ${this.#barRow(
                this.#t('calc.sl.barFees', { p: feeDragPct.toFixed(2) }),
                this.#fmtU(feesAnnual), feeDragPct, dragPct, 'rgba(255,61,90,.6)')}
            ${this.#barRow(
                this.#t('calc.sl.barSlip', { p: slipDragPct.toFixed(2) }),
                this.#fmtU(slipAnnual), slipDragPct, dragPct, 'rgba(255,153,0,.6)')}
          </div>
        </div>

        <div class="rc-result-row">
          <span>${this.#t('calc.sl.annualDrag')}</span>
          <strong style="color:${dragColor}">${dragPct.toFixed(2)} %</strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.sl.breakEven')}</span>
          <strong style="color:var(--yellow)">+${dragPct.toFixed(2)} %</strong>
        </div>
        <div class="rc-result-row">
          <span>${this.#t('calc.sl.pnlImpact', { rr })}</span>
          <strong style="color:${dragOnPnl > 30 ? 'var(--red)' : 'var(--yellow)'}">
            −${dragOnPnl > 0 ? dragOnPnl.toFixed(1) : '0'}%
          </strong>
        </div>

        <div style="margin-top:12px;padding:10px 14px;background:rgba(0,200,255,.05);
                    border:1px solid rgba(0,200,255,.15);border-radius:6px;">
          <div style="font-size:9px;color:#00c8ff;text-transform:uppercase;
                      letter-spacing:.8px;margin-bottom:8px;">
            ${this.#t('calc.sl.compareTitle', { n: monthly })}
          </div>
          <div class="rc-result-row">
            <span>${this.#t('calc.sl.marketAnnual')}</span>
            <strong style="color:var(--red)">${this.#fmtU(costMarket)}</strong>
          </div>
          <div class="rc-result-row">
            <span>${this.#t('calc.sl.limitAnnual')}</span>
            <strong style="color:var(--green)">${this.#fmtU(costLimit)}</strong>
          </div>
          <div class="rc-result-row">
            <span>${this.#t('calc.sl.saving')}</span>
            <strong style="color:var(--green)">+${this.#fmtU(savingLimit)}</strong>
          </div>
        </div>

        ${dragPct > 15
          ? `<div class="rc-warn">${this.#t('calc.sl.warnHigh')}</div>`
          : dragPct > 7
          ? `<div class="rc-warn" style="border-color:var(--yellow);background:rgba(247,201,72,.07);">${this.#t('calc.sl.warnMed')}</div>`
          : `<div style="font-size:9px;color:var(--green);margin-top:8px;padding:6px 10px;background:rgba(0,255,136,.07);border-radius:4px;border:1px solid rgba(0,255,136,.2);">${this.#t('calc.sl.ok')}</div>`}`;
    };

    document.getElementById('sl-calc')?.addEventListener('click', calc);
    ['sl-capital', 'sl-size', 'sl-order', 'sl-taker', 'sl-maker',
     'sl-slip', 'sl-monthly', 'sl-rr'].forEach(id =>
      document.getElementById(id)?.addEventListener('input', calc)
    );
    document.getElementById('sl-order')?.addEventListener('change', calc);
  }

  // ── Helper : progress bar ─────────────────────────────────

  #barRow(label, value, partPct, totalPct, color) {
    const width = totalPct > 0 ? Math.min(100, (partPct / totalPct) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <div style="flex:1;font-size:9px;color:var(--muted);">${label}</div>
        <div style="flex:2;height:6px;background:rgba(28,35,51,1);border-radius:3px;overflow:hidden;">
          <div style="width:${width.toFixed(1)}%;height:100%;background:${color};border-radius:3px;"></div>
        </div>
        <div style="min-width:60px;text-align:right;font-size:9px;font-weight:700;color:var(--text);">
          ${value}
        </div>
      </div>`;
  }

  #costBar() { return ''; } // kept for template compat

  // ── HTML helpers ──────────────────────────────────────────

  #field(id, label, value = '', type = 'number', step = 'any', min = '', max = '') {
    return `<div>
      <label for="${id}" style="display:block;font-size:9px;color:var(--muted);
                                text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">
        ${label}
      </label>
      <input id="${id}" type="${type}" value="${value}"
             step="${step}" ${min ? `min="${min}"` : ''} ${max ? `max="${max}"` : ''}
             autocomplete="off"
             style="width:100%;background:var(--bg);border:1px solid var(--border);
                    color:var(--text);padding:8px 10px;
                    font-family:'Space Mono',monospace;font-size:12px;font-weight:700;
                    border-radius:4px;outline:none;box-sizing:border-box;transition:border-color .15s;"
             onfocus="this.style.borderColor='var(--accent)'"
             onblur="this.style.borderColor='var(--border)'">
    </div>`;
  }

  #fieldSelect(id, label, options) {
    return `<div>
      <label for="${id}" style="display:block;font-size:9px;color:var(--muted);
                                text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;">
        ${label}
      </label>
      <select id="${id}"
              style="width:100%;background:var(--bg);border:1px solid var(--border);
                     color:var(--text);padding:8px 10px;font-family:'Space Mono',monospace;
                     font-size:11px;font-weight:700;border-radius:4px;outline:none;
                     box-sizing:border-box;cursor:pointer;">
        ${options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>`;
  }

  #resBox(label, value, color = 'var(--text)') {
    return `<div style="background:rgba(0,0,0,.25);border:1px solid var(--border);
                        border-radius:6px;padding:10px 12px;">
      <div style="font-size:8px;color:var(--muted);text-transform:uppercase;
                  letter-spacing:.8px;margin-bottom:4px;">${label}</div>
      <div style="font-size:16px;font-family:'Syne',sans-serif;font-weight:800;color:${color};">
        ${value}
      </div>
    </div>`;
  }

  #fmtU(v) {
    if (!isFinite(v)) return '—';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M $';
    if (v >= 1_000)     return v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' $';
    return v.toFixed(2) + ' $';
  }

  #fmtQ(v) {
    if (!isFinite(v)) return '—';
    if (v >= 1)     return v.toFixed(4);
    if (v >= 0.001) return v.toFixed(6);
    return v.toExponential(3);
  }

  // ── Static events ─────────────────────────────────────────

  #bindStaticEvents() {
    document.getElementById('risk-calc-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'flex') {
        e.stopPropagation();
        this.close();
      }
    });

    ['position', 'rr', 'liq', 'maxloss', 'trailing', 'slippage'].forEach(tab => {
      document.getElementById(`rc-tab-${tab}`)
        ?.addEventListener('click', () => this.#switchTab(tab));
    });
  }
}
