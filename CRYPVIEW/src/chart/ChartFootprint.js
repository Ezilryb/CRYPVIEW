// ============================================================
//  src/chart/ChartFootprint.js — CrypView V2
//  Engine Footprint Chart (ask/bid par niveau de prix).
//
//  Architecture du seed (v2.5.2) :
//    Phase 1 — Immédiat    : approximation OHLCV → visuel instantané
//    Phase 2 — Background  : données réelles via REST aggTrades
//                            → remplacement progressif des candles fermées
//
//  Frontière REST / WebSocket :
//    #wsStartTime est capturé juste avant la connexion WS.
//    La requête REST couvre [candles[0].time, #wsStartTime].
//    Le WS prend le relais à partir de #wsStartTime → aucun doublage.
//    La bougie courante (ouverte) est exclusivement gérée par le WS.
//
//  Cycle de vie :
//    new ChartFootprint(chart, cSeries, container, getSymTf)
//    .activate(candles)   → seed OHLCV + WS + upgrade REST async
//    .deactivate()        → coupe WS + efface canvas + observers
//    .redraw(candles)     → redessine sur demande
//    .destroy()           → libère tout
// ============================================================

import { TF_TO_MS, RENDER_THROTTLE_MS } from '../config.js';
import { createAggTradeStream }          from '../api/binance.ws.js';
import { fetchAggTrades }                from '../api/binance.rest.js';
import { showToast }                     from '../utils/toast.js';

// Taille des lots traités par itération pour ne pas bloquer le thread UI
const UPGRADE_CHUNK_SIZE = 500;

// Nombre maximum de trades à charger via REST pour le seed haute-fidélité
const MAX_SEED_TRADES = 5_000;

export class ChartFootprint {
  #chart;
  #cSeries;
  #container;
  #getSymTf;    // () => { symbol, timeframe }

  #data     = new Map(); // Map<candleTime, Map<bucketKey, Bucket>>
  #ws       = null;
  #canvas   = null;
  #active   = false;
  #redrawPending = false;
  #redrawSubs    = false;

  // ── Frontière REST / WS ───────────────────────────────────
  /** Timestamp ms capturé avant la connexion WS — borne supérieure du fetch REST */
  #wsStartTime   = 0;
  /** true une fois que l'upgrade REST s'est terminé (succès ou fallback) */
  #seedUpgraded  = false;

  // ── Observers — stockés pour pouvoir les déconnecter ─────
  #resizeObs2 = null;
  #mutObs     = null;

  /**
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} container   — div#chart-container
   * @param {function(): {symbol:string, timeframe:string}} getSymTf
   */
  constructor(chart, cSeries, container, getSymTf) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#getSymTf  = getSymTf;
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Active le Footprint.
   *
   * Séquence :
   *  1. Seed OHLCV → affichage immédiat (approximation)
   *  2. Capture #wsStartTime → borne REST/WS
   *  3. Connexion WS aggTrade → trades temps réel
   *  4. Upgrade REST async → remplacement silencieux par données réelles
   */
  activate(candles) {
    if (this.#active) return;
    this.#active       = true;
    this.#seedUpgraded = false;
    this.#ensureCanvas();
    document.getElementById('fp-legend')?.classList.add('visible');

    // Phase 1 — Approximation OHLCV immédiate
    this.#seed(candles);

    // Borne REST/WS : capturé AVANT la connexion WS pour garantir
    // que REST couvre [start, wsStartTime[ et WS démarre à wsStartTime.
    this.#wsStartTime = Date.now();

    this.#connectWS();
    this.#subscribeRedraws(candles);
    this.#draw(candles);

    // Phase 2 — Upgrade REST en arrière-plan (fire & forget)
    this.#upgradeSeedAsync(candles);
  }

  deactivate() {
    if (!this.#active) return;
    this.#active      = false;
    this.#redrawSubs  = false;
    this.#seedUpgraded = false;

    this.#ws?.destroy();
    this.#ws = null;
    this.#data.clear();

    this.#resizeObs2?.disconnect();
    this.#resizeObs2 = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    document.getElementById('fp-legend')?.classList.remove('visible');
    if (this.#canvas) {
      this.#canvas.getContext('2d').clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#canvas.style.display = 'none';
    }
  }

  redraw(candles) {
    if (this.#active) this.#draw(candles);
  }

  /** Reconnexion complète après changement de symbole/TF. */
  reconnect(candles) {
    this.#data.clear();
    this.#redrawSubs   = false;
    this.#seedUpgraded = false;

    this.#resizeObs2?.disconnect();
    this.#resizeObs2 = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    this.#ws?.destroy();
    this.#ws = null;

    // Phase 1 — Approximation OHLCV immédiate
    this.#seed(candles);

    this.#wsStartTime = Date.now();

    this.#connectWS();
    this.#subscribeRedraws(candles);
    this.#draw(candles);

    // Phase 2 — Upgrade REST
    this.#upgradeSeedAsync(candles);
  }

  isActive() { return this.#active; }

  destroy() {
    this.deactivate();
    this.#canvas?.remove();
    this.#canvas = null;
  }

  // ── Phase 1 : Seed OHLCV (approximation immédiate) ───────

  /**
   * Approxime les données Footprint depuis les bougies OHLCV.
   * Ask concentré en haut (bougie haussière), bid en bas (baissière).
   * Sert de baseline visuelle en attendant l'upgrade REST.
   */
  #seed(candles) {
    this.#data.clear();
    for (const c of candles) {
      const tick    = this.#tickSize(c.close);
      const nBkts   = Math.max(1, Math.ceil((c.high - c.low) / tick));
      const step    = (c.high - c.low) / nBkts;
      const isBull  = c.close >= c.open;
      const map     = new Map();

      for (let i = 0; i < nBkts; i++) {
        const priceLo  = c.low + i * step;
        const priceHi  = priceLo + step;
        const priceMid = (priceLo + priceHi) / 2;
        const ratio    = (priceMid - c.low) / ((c.high - c.low) || 1);
        const askRatio = isBull ? 0.3 + ratio * 0.7 : 0.7 - ratio * 0.4;
        const vol      = c.volume / nBkts;
        const key      = parseFloat(priceLo.toFixed(10));
        map.set(key, {
          priceLo: key,
          priceHi: parseFloat(priceHi.toFixed(10)),
          askVol:  vol * askRatio,
          bidVol:  vol * (1 - askRatio),
        });
      }
      this.#data.set(c.time, map);
    }
  }

  // ── Phase 2 : Upgrade REST aggTrades (haute-fidélité) ────

  /**
   * Charge les transactions réelles via l'API REST aggTrades et remplace
   * silencieusement les candles fermées dont l'approximation OHLCV est
   * encore active.
   *
   * Garanties :
   *  - Seules les candles FERMÉES sont remplacées (la bougie courante
   *    est exclusivement gérée par le WS pour éviter tout doublage).
   *  - Le traitement est découpé en chunks de ${UPGRADE_CHUNK_SIZE} trades
   *    avec un yield au event loop entre chaque lot (UI non bloquée).
   *  - En cas d'erreur REST, l'approximation OHLCV reste silencieusement
   *    active (fallback gracieux).
   */
  async #upgradeSeedAsync(candles) {
    if (!candles.length || !this.#active) return;

    const { symbol, timeframe } = this.#getSymTf();
    const tfMs      = TF_TO_MS[timeframe] ?? 60_000;

    // Fenêtre REST : de la première bougie jusqu'à la connexion WS
    const startTime = candles[0].time * 1000; // ms
    const endTime   = this.#wsStartTime;       // ms

    // Temps de la bougie actuellement ouverte (secondes) — gérée par WS seul
    const currentCandleTimeSec = Math.floor(Date.now() / tfMs) * (tfMs / 1000);

    try {
      const trades = await fetchAggTrades(symbol, startTime, endTime, MAX_SEED_TRADES);

      // L'instance a pu être désactivée pendant le fetch — on abandonne
      if (!this.#active) return;

      if (!trades.length) {
        this.#seedUpgraded = true;
        return;
      }

      // Ensemble des candles pour lesquelles l'approximation a été remplacée
      // par des données réelles (évite d'effacer les données WS déjà ajoutées
      // sur la bougie courante entre deux chunks).
      const upgradedTimes = new Set();

      // ── Traitement par chunks ─────────────────────────────
      for (let i = 0; i < trades.length; i += UPGRADE_CHUNK_SIZE) {
        // Vérification de désactivation à chaque chunk
        if (!this.#active) return;

        const chunk = trades.slice(i, i + UPGRADE_CHUNK_SIZE);

        for (const trade of chunk) {
          const candleTimeSec = this.#calcCandleTime(trade.T, tfMs);

          // Bougie courante (ouverte) → exclusivement gérée par le WS
          if (candleTimeSec >= currentCandleTimeSec) continue;

          // Premier trade réel pour cette candle fermée :
          // on efface l'approximation OHLCV pour n'avoir que des vraies données.
          if (!upgradedTimes.has(candleTimeSec)) {
            this.#data.set(candleTimeSec, new Map());
            upgradedTimes.add(candleTimeSec);
          }

          // Insertion du trade réel dans le footprint
          // m=true → isBuyerMaker → vendeur agressif (SELL)
          // m=false → acheteur agressif (BUY)
          this.#insertTrade(
            parseFloat(trade.p),
            parseFloat(trade.q),
            !trade.m,
            candleTimeSec,
          );
        }

        // Yield : cède le thread au navigateur entre chaque lot
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      this.#seedUpgraded = true;

      // Redessine avec les données réelles une fois tous les chunks traités
      if (this.#active) this.#draw(candles);

    } catch (_err) {
      // Fallback gracieux : l'approximation OHLCV reste active sans bruit
      // On prévient l'utilisateur de façon non-bloquante
      if (this.#active) {
        showToast(
          'Footprint : données REST aggTrades indisponibles — mode approximation OHLCV actif.',
          'warning',
          4_000,
        );
      }
      this.#seedUpgraded = true; // évite une boucle de retry
    }
  }

  // ── Helpers de calcul partagés ────────────────────────────

  /**
   * Calcule le timestamp Unix en secondes de la bougie qui contient un trade.
   *
   * @param {number} tradeTimeMs — Timestamp du trade en ms
   * @param {number} tfMs        — Durée du timeframe en ms
   * @returns {number}           — Timestamp de la bougie en secondes
   */
  #calcCandleTime(tradeTimeMs, tfMs) {
    return Math.floor(tradeTimeMs / tfMs) * (tfMs / 1000);
  }

  /**
   * Insère un trade dans la Map de données du Footprint.
   * Méthode unifiée utilisée par le seed REST et le flux WS.
   *
   * @param {number}  price         — Prix de la transaction
   * @param {number}  qty           — Quantité échangée
   * @param {boolean} isBuy         — true = acheteur agressif (BUY)
   * @param {number}  candleTimeSec — Timestamp de la bougie en secondes
   */
  #insertTrade(price, qty, isBuy, candleTimeSec) {
    const tick       = this.#tickSize(price);
    const bucketKey  = parseFloat((Math.floor(price / tick) * tick).toFixed(10));

    if (!this.#data.has(candleTimeSec)) {
      this.#data.set(candleTimeSec, new Map());
    }
    const buckets = this.#data.get(candleTimeSec);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        priceLo: bucketKey,
        priceHi: bucketKey + tick,
        askVol:  0,
        bidVol:  0,
      });
    }
    const b = buckets.get(bucketKey);
    if (isBuy) b.askVol += qty; else b.bidVol += qty;
  }

  // ── WebSocket aggTrades (flux temps réel) ─────────────────

  #connectWS() {
    const { symbol } = this.#getSymTf();
    this.#ws = createAggTradeStream(symbol);
    this.#ws.onMessage = (data) => {
      if (!this.#active) return;

      // Filtrage de sécurité : les trades antérieurs à #wsStartTime
      // sont couverts par le fetch REST → on les ignore pour éviter
      // tout doublage potentiel durant la fenêtre de chevauchement.
      if (data.T < this.#wsStartTime) return;

      const { timeframe } = this.#getSymTf();
      const tfMs = TF_TO_MS[timeframe] ?? 60_000;
      this.#insertTrade(
        parseFloat(data.p),
        parseFloat(data.q),
        !data.m,
        this.#calcCandleTime(data.T, tfMs),
      );
      this.#schedRedraw();
    };
    this.#ws.connect();
  }

  // ── Dessin canvas ─────────────────────────────────────────

  #draw(candles) {
    if (!this.#canvas || !candles.length) return;
    const W = this.#container.clientWidth;
    const H = this.#container.clientHeight;
    this.#canvas.width  = W;
    this.#canvas.height = H;

    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const visRange = this.#chart.timeScale().getVisibleRange();
    const logRange = this.#chart.timeScale().getVisibleLogicalRange();
    if (!visRange || !logRange) return;

    const barsVisible = Math.max(1, logRange.to - logRange.from);
    const barWidthPx  = W / barsVisible;
    const showText    = barWidthPx >= 28;
    const FONT_SIZE   = 8;
    ctx.font      = `bold ${FONT_SIZE}px Space Mono,monospace`;
    ctx.textAlign = 'center';

    for (const candle of candles) {
      if (candle.time < visRange.from - 2 || candle.time > visRange.to + 2) continue;
      const buckets = this.#data.get(candle.time);
      if (!buckets?.size) continue;

      const xCenter = this.#chart.timeScale().timeToCoordinate(candle.time);
      const yHigh   = this.#cSeries.priceToCoordinate(candle.high);
      const yLow    = this.#cSeries.priceToCoordinate(candle.low);
      if (xCenter == null || yHigh == null || yLow == null) continue;

      const candleH = Math.abs(yLow - yHigh);
      if (candleH < 2) continue;

      let maxVol = 0;
      buckets.forEach(b => { const t = b.askVol + b.bidVol; if (t > maxVol) maxVol = t; });
      if (maxVol === 0) continue;

      const halfBar = Math.min(barWidthPx * 0.45, 28);

      buckets.forEach(b => {
        const yTop = this.#cSeries.priceToCoordinate(b.priceHi);
        const yBot = this.#cSeries.priceToCoordinate(b.priceLo);
        if (yTop == null || yBot == null) return;

        const y     = Math.min(yTop, yBot);
        const h     = Math.max(1, Math.abs(yBot - yTop) - 0.5);
        const total = b.askVol + b.bidVol;
        const delta = b.askVol - b.bidVol;
        const ratio = total > 0 ? delta / total : 0;

        ctx.fillStyle = ratio > 0
          ? `rgba(0,255,136,${Math.min(0.35, ratio * 0.35)})`
          : `rgba(255,61,90,${Math.min(0.35, -ratio * 0.35)})`;
        ctx.fillRect(xCenter - halfBar, y, halfBar * 2, h);

        const isImb = (b.bidVol > 0 && b.askVol / b.bidVol >= 3) || (b.askVol > 0 && b.bidVol / b.askVol >= 3);
        if (isImb) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth   = 0.8;
          ctx.strokeRect(xCenter - halfBar + 0.5, y + 0.5, halfBar * 2 - 1, h - 1);
        }

        if (showText && h >= 8) {
          const fmt = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1);
          ctx.fillStyle = 'rgba(0,255,136,0.9)';
          ctx.fillText(fmt(b.askVol), xCenter - halfBar / 2, y + h / 2 + FONT_SIZE / 3);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth   = 0.5;
          ctx.beginPath(); ctx.moveTo(xCenter, y); ctx.lineTo(xCenter, y + h); ctx.stroke();
          ctx.fillStyle = 'rgba(255,61,90,0.9)';
          ctx.fillText(fmt(b.bidVol), xCenter + halfBar / 2, y + h / 2 + FONT_SIZE / 3);
        } else if (!showText) {
          ctx.fillStyle = 'rgba(0,255,136,0.55)';
          ctx.fillRect(xCenter - halfBar, y + 1, (b.askVol / maxVol) * halfBar, h - 2);
          ctx.fillStyle = 'rgba(255,61,90,0.55)';
          ctx.fillRect(xCenter, y + 1, (b.bidVol / maxVol) * halfBar, h - 2);
        }
      });
    }
  }

  // ── Abonnements de redessins ──────────────────────────────

  #subscribeRedraws(candles) {
    if (this.#redrawSubs) return;
    this.#redrawSubs = true;

    const redraw = () => { if (this.#active) this.#draw(candles); };
    this.#chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    this.#chart.subscribeCrosshairMove(redraw);

    this.#resizeObs2 = new ResizeObserver(() => {
      if (this.#active) { this.#canvas.width = 0; this.#draw(candles); }
    });
    this.#resizeObs2.observe(this.#container);

    let raf = false;
    this.#mutObs = new MutationObserver(() => {
      if (raf || !this.#active) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; this.#draw(candles); });
    });
    this.#mutObs.observe(this.#container, {
      attributes:      true,
      attributeFilter: ['style'],
      subtree:         true,
    });
  }

  #schedRedraw() {
    if (this.#redrawPending) return;
    this.#redrawPending = true;
    setTimeout(() => {
      this.#redrawPending = false;
      this.#container.dispatchEvent(new CustomEvent('crypview:fp:redraw', { bubbles: true }));
    }, RENDER_THROTTLE_MS);
  }

  // ── Helpers ───────────────────────────────────────────────

  #tickSize(price) {
    if (price >= 10000) return 10;
    if (price >= 1000)  return 1;
    if (price >= 100)   return 0.1;
    if (price >= 10)    return 0.01;
    if (price >= 1)     return 0.001;
    return 0.0001;
  }

  #ensureCanvas() {
    let c = document.getElementById('fp-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'fp-canvas';
      c.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:3;';
      this.#container.appendChild(c);
    }
    c.style.display = 'block';
    this.#canvas = c;
  }
}
