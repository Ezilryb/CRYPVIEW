// ============================================================
//  src/chart/ChartFootprint.js — CrypView V2
//  Engine Footprint Chart (ask/bid par niveau de prix).
//
//  Correctif appliqué :
//    - Bug 4 : migration WSPool pour les streams aggTrade.
//              Avant : chaque panel ouvrait son propre WSManager
//              → jusqu'à 8 connexions simultanées en Multi-4 + FP + OF
//              (limite Binance = 5/IP → coupures silencieuses).
//              Après : wsPool.subscribe() déduplique les streams à
//              nom identique → 1 WS physique max par symbol@aggTrade.
//
//  Architecture du seed (v2.5.2) :
//    Phase 1 — Immédiat    : approximation OHLCV → visuel instantané
//    Phase 2 — Background  : données réelles via REST aggTrades
//
//  Persistance par (symbol, tf) — v2.6 :
//    Cache LRU borné à MAX_CACHE_ENTRIES entrées.
// ============================================================

import { TF_TO_MS, RENDER_THROTTLE_MS } from '../config.js';
import { wsPool }                        from '../api/WSPool.js';  // BUG 4 CORRIGÉ
import { fetchAggTrades }                from '../api/binance.rest.js';
import { showToast }                     from '../utils/toast.js';

const UPGRADE_CHUNK_SIZE = 500;
const MAX_SEED_TRADES    = 5_000;
const MAX_CACHE_ENTRIES  = 8;

export class ChartFootprint {
  #chart;
  #cSeries;
  #container;
  #getSymTf;

  // ── Cache par (symbol, tf) ────────────────────────────────
  #cache       = new Map();
  #currentKey  = '';
  #data        = new Map();

  // BUG 4 CORRIGÉ : remplace #ws = null
  // Stocke la fonction de désabonnement retournée par wsPool.subscribe()
  #unsubscribeFn = null;

  #active          = false;
  #redrawPending   = false;
  #redrawSubs      = false;
  #wsStartTime     = 0;
  #seedUpgraded    = false;

  #resizeObs2 = null;
  #mutObs     = null;

  constructor(chart, cSeries, container, getSymTf) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#getSymTf  = getSymTf;
  }

  // ── API publique ──────────────────────────────────────────

  activate(candles) {
    if (this.#active) return;
    this.#active       = true;
    this.#seedUpgraded = false;
    this.#ensureCanvas();
    document.getElementById('fp-legend')?.classList.add('visible');

    const { symbol, timeframe } = this.#getSymTf();
    const cacheHit = this.#switchKey(symbol, timeframe);

    if (cacheHit) {
      this.#wsStartTime  = Date.now();
      this.#seedUpgraded = true;
      this.#connectWS();
      this.#subscribeRedraws(candles);
      this.#draw(candles);
    } else {
      this.#seed(candles);
      this.#wsStartTime = Date.now();
      this.#connectWS();
      this.#subscribeRedraws(candles);
      this.#draw(candles);
      this.#upgradeSeedAsync(candles);
    }
  }

  deactivate() {
    if (!this.#active) return;
    this.#active     = false;
    this.#redrawSubs = false;

    // BUG 4 CORRIGÉ : désabonnement propre via WSPool
    this.#unsubscribeFn?.();
    this.#unsubscribeFn = null;
    // NB : on ne vide PAS #data — c'est l'intérêt du cache.

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

  reconnect(candles) {
    this.#redrawSubs = false;

    // BUG 4 CORRIGÉ : désabonnement propre
    this.#unsubscribeFn?.();
    this.#unsubscribeFn = null;

    this.#resizeObs2?.disconnect();
    this.#resizeObs2 = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    const { symbol, timeframe } = this.#getSymTf();
    const cacheHit = this.#switchKey(symbol, timeframe);
    this.#seedUpgraded = cacheHit;

    if (cacheHit) {
      this.#wsStartTime = Date.now();
      this.#connectWS();
      this.#subscribeRedraws(candles);
      this.#draw(candles);
    } else {
      this.#seed(candles);
      this.#wsStartTime = Date.now();
      this.#connectWS();
      this.#subscribeRedraws(candles);
      this.#draw(candles);
      this.#upgradeSeedAsync(candles);
    }
  }

  isActive() { return this.#active; }

  destroy() {
    this.deactivate();
    this.#cache.clear();
    this.#data = new Map();
    this.#currentKey = '';
    this.#canvas?.remove();
    this.#canvas = null;
  }

  // ── Gestion du cache (LRU simplifié) ─────────────────────

  #switchKey(symbol, timeframe) {
    const key  = `${symbol.toLowerCase()}_${timeframe}`;
    const warm = this.#cache.has(key) && this.#cache.get(key).size > 0;

    if (this.#cache.has(key)) {
      const entry = this.#cache.get(key);
      this.#cache.delete(key);
      this.#cache.set(key, entry);
    } else {
      if (this.#cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = this.#cache.keys().next().value;
        this.#cache.delete(oldest);
      }
      this.#cache.set(key, new Map());
    }

    this.#currentKey = key;
    this.#data       = this.#cache.get(key);

    return warm;
  }

  // ── Phase 1 : Seed OHLCV ─────────────────────────────────

  #seed(candles) {
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

  // ── Phase 2 : Upgrade REST aggTrades ─────────────────────

  async #upgradeSeedAsync(candles) {
    if (!candles.length || !this.#active) return;

    const { symbol, timeframe } = this.#getSymTf();
    const tfMs      = TF_TO_MS[timeframe] ?? 60_000;
    const startTime = candles[0].time * 1000;
    const endTime   = this.#wsStartTime;
    const currentCandleTimeSec = Math.floor(Date.now() / tfMs) * (tfMs / 1000);
    const keyAtStart = this.#currentKey;

    try {
      const trades = await fetchAggTrades(symbol, startTime, endTime, MAX_SEED_TRADES);

      if (!this.#active || this.#currentKey !== keyAtStart) return;
      if (!trades.length) { this.#seedUpgraded = true; return; }

      const upgradedTimes = new Set();

      for (let i = 0; i < trades.length; i += UPGRADE_CHUNK_SIZE) {
        if (!this.#active || this.#currentKey !== keyAtStart) return;

        const chunk = trades.slice(i, i + UPGRADE_CHUNK_SIZE);

        for (const trade of chunk) {
          const candleTimeSec = this.#calcCandleTime(trade.T, tfMs);
          if (candleTimeSec >= currentCandleTimeSec) continue;

          if (!upgradedTimes.has(candleTimeSec)) {
            this.#data.set(candleTimeSec, new Map());
            upgradedTimes.add(candleTimeSec);
          }

          this.#insertTrade(
            parseFloat(trade.p),
            parseFloat(trade.q),
            !trade.m,
            candleTimeSec,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      this.#seedUpgraded = true;
      if (this.#active && this.#currentKey === keyAtStart) this.#draw(candles);

    } catch (_err) {
      if (this.#active && this.#currentKey === keyAtStart) {
        showToast(
          'Footprint : données REST aggTrades indisponibles — mode approximation OHLCV actif.',
          'warning',
          4_000,
        );
      }
      this.#seedUpgraded = true;
    }
  }

  // ── Helpers de calcul ─────────────────────────────────────

  #calcCandleTime(tradeTimeMs, tfMs) {
    return Math.floor(tradeTimeMs / tfMs) * (tfMs / 1000);
  }

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

  // ── WebSocket aggTrades via WSPool ────────────────────────
  // BUG 4 CORRIGÉ : wsPool.subscribe() au lieu de WSManager.
  // Le pool partage la connexion entre tous les panels qui
  // écoutent le même symbol@aggTrade (déduplication automatique).

  #connectWS() {
    const { symbol } = this.#getSymTf();
    const streamName = `${symbol.toLowerCase()}@aggTrade`;

    this.#unsubscribeFn = wsPool.subscribe(streamName, (data) => {
      if (!this.#active) return;

      // Ignore les trades antérieurs à l'ouverture du WS
      // (déjà couverts par le fetch REST aggTrades phase 2)
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
    });
  }

  // ── Dessin canvas ─────────────────────────────────────────

  #canvas = null;

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
