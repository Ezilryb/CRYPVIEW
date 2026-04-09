// ============================================================
//  src/api/ExchangeAggregator.js — CrypView V3.7
//  Agrégateur multi-exchange : prix, premium, spread.
//
//  Sources : Binance (référence) + Bybit + OKX
//  Fréquence : polling REST toutes les POLL_INTERVAL_MS (5s)
//
//  Émet sur window : CustomEvent 'exchange:update'
//    detail : { symbol, exchanges: Map<string, AggEntry> }
//
//  Usage :
//    const agg = new ExchangeAggregator();
//    agg.start('btcusdt');          // lance le polling
//    agg.stop();                    // arrête proprement
//    agg.getAll()                   // → Map<exchange, AggEntry>
//    agg.getPremium('bybit')        // → % vs Binance (null si indispo)
// ============================================================

import { fetchBybitTicker } from './exchanges/bybit.js';
import { fetchOKXTicker }   from './exchanges/okx.js';

const POLL_INTERVAL_MS = 5_000;

/**
 * @typedef {object} AggEntry
 * @property {string}      exchange
 * @property {number}      price
 * @property {number}      bid
 * @property {number}      ask
 * @property {number}      volume24h
 * @property {number}      pct24h
 * @property {number|null} premium    — % vs Binance  (positif = plus cher)
 * @property {number|null} spread     — (ask - bid) / price * 100
 * @property {boolean}     stale      — true si la donnée a plus de 15s
 * @property {number}      updatedAt
 */

export class ExchangeAggregator {
  /** @type {Map<string, AggEntry>} */
  #data    = new Map();
  #symbol  = '';
  #timer   = null;
  #running = false;

  // ── API publique ──────────────────────────────────────────

  /**
   * Démarre le polling pour un symbole.
   * Remplace le symbole précédent si déjà démarré.
   * @param {string} symbol — ex: 'btcusdt'
   */
  start(symbol) {
    this.#symbol = symbol.toLowerCase();
    this.#data.clear();
    this.#running = true;

    // Premier appel immédiat
    this.#poll();

    // Puis toutes les POLL_INTERVAL_MS
    this.#timer = setInterval(() => this.#poll(), POLL_INTERVAL_MS);
  }

  /** Arrête le polling et vide les données. */
  stop() {
    this.#running = false;
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    this.#data.clear();
  }

  /** @returns {Map<string, AggEntry>} copie des données courantes */
  getAll() { return new Map(this.#data); }

  /**
   * Premium d'un exchange vs Binance.
   * @param {'bybit'|'okx'} exchange
   * @returns {number|null} — pourcentage (ex: 0.03 = +0.03%)
   */
  getPremium(exchange) {
    const binance = this.#data.get('binance');
    const target  = this.#data.get(exchange);
    if (!binance?.price || !target?.price) return null;
    return (target.price / binance.price - 1) * 100;
  }

  /** Meilleur bid agrégé parmi tous les exchanges. */
  getBestBid() {
    let best = 0;
    for (const entry of this.#data.values()) {
      if (entry.bid > best) best = entry.bid;
    }
    return best || null;
  }

  /** Meilleur ask agrégé parmi tous les exchanges. */
  getBestAsk() {
    let best = Infinity;
    for (const entry of this.#data.values()) {
      if (entry.ask < best) best = entry.ask;
    }
    return best === Infinity ? null : best;
  }

  // ── Privé — polling ───────────────────────────────────────

  async #poll() {
    if (!this.#running) return;
    const now = Date.now();

    const [bybitResult, okxResult] = await Promise.allSettled([
      fetchBybitTicker(this.#symbol),
      fetchOKXTicker(this.#symbol),
    ]);

    // Bybit
    if (bybitResult.status === 'fulfilled' && bybitResult.value) {
      this.#upsert('bybit', bybitResult.value, now);
    }

    // OKX
    if (okxResult.status === 'fulfilled' && okxResult.value) {
      this.#upsert('okx', okxResult.value, now);
    }

    // Marque les données obsolètes (> 15s sans mise à jour)
    for (const [, entry] of this.#data) {
      entry.stale = (now - entry.updatedAt) > 15_000;
    }

    this.#emit();
  }

  /**
   * Met à jour ou insère une entrée dans la Map.
   * @param {string}      exchange
   * @param {object}      ticker
   * @param {number}      now
   */
  #upsert(exchange, ticker, now) {
    const binancePrice = this.#data.get('binance')?.price ?? ticker.price;
    const spread = ticker.ask && ticker.bid
      ? ((ticker.ask - ticker.bid) / ticker.price) * 100
      : null;
    const premium = binancePrice
      ? (ticker.price / binancePrice - 1) * 100
      : null;

    this.#data.set(exchange, {
      exchange,
      price:     ticker.price,
      bid:       ticker.bid,
      ask:       ticker.ask,
      volume24h: ticker.volume24h,
      pct24h:    ticker.pct24h,
      premium,
      spread,
      stale:     false,
      updatedAt: now,
    });
  }

  /**
   * Injecte le prix Binance depuis l'extérieur (ChartCore l'a déjà).
   * Évite une requête REST redondante vers Binance.
   * @param {number} price
   * @param {number} bid
   * @param {number} ask
   */
  updateBinancePrice(price, bid = 0, ask = 0) {
    if (!price) return;
    const now = Date.now();
    this.#data.set('binance', {
      exchange:  'binance',
      price,
      bid:       bid || price * 0.9999,
      ask:       ask || price * 1.0001,
      volume24h: 0,
      pct24h:    0,
      premium:   0,
      spread:    bid && ask ? ((ask - bid) / price) * 100 : null,
      stale:     false,
      updatedAt: now,
    });

    // Recalcule les premiums avec le nouveau prix Binance
    const binancePrice = price;
    for (const [ex, entry] of this.#data) {
      if (ex === 'binance') continue;
      entry.premium = entry.price
        ? (entry.price / binancePrice - 1) * 100
        : null;
    }
  }

  // ── Émission d'événement ─────────────────────────────────

  #emit() {
    window.dispatchEvent(new CustomEvent('exchange:update', {
      detail: {
        symbol:    this.#symbol,
        exchanges: new Map(this.#data),
        bestBid:   this.getBestBid(),
        bestAsk:   this.getBestAsk(),
      },
    }));
  }
}
