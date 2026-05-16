// ============================================================
//  src/features/AlertManager.js — CrypView V2
//  Alertes de prix via Web Notifications API.
//
//  Philosophie "no-backend" :
//    - Comparaison tick-par-tick sur le flux WebSocket local
//    - Persistance via localStorage (survit au rechargement)
//    - Notification native OS + signal audio via Web Audio API
//    - Zéro dépendance externe
//
//  Cycle de vie :
//    const am = new AlertManager();
//    am.add('btcusdt', 65000, currentPrice) → crée + persiste
//    am.check('btcusdt', newPrice)           → appelé à chaque tick
//    am.remove(id)                           → supprime une alerte
//    am.onAlertsChange = () => updateUI()    → hook de mise à jour UI
// ============================================================

import { showToast } from '../utils/toast.js';
import { fmtPrice }  from '../utils/format.js';

const STORAGE_KEY_DEFAULT = 'crypview_alerts_v1';

/**
 * @typedef {Object} PriceAlert
 * @property {number}  id
 * @property {string}  symbol
 * @property {number}  price
 * @property {'up'|'down'} direction
 * @property {boolean} triggered
 * @property {number}  createdAt
 */

export class AlertManager {
  /** @type {PriceAlert[]} */
  #alerts = [];
  
  #lastPrices = new Map();

  #storageKey;

  /** @type {AudioContext|null}*/
  #audioCtx = null;

  /**
   * @type {function(): void}
   */
  onAlertsChange = () => {};

  constructor(storageKey = STORAGE_KEY_DEFAULT) {
    this.#storageKey = storageKey;
    this.#load();
  }

  /**
   * @returns {Promise<NotificationPermission>}
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      showToast('Votre navigateur ne supporte pas les notifications Web.', 'warning');
      return 'denied';
    }
    if (Notification.permission === 'granted')  return 'granted';
    if (Notification.permission === 'denied') {
      showToast(
        'Notifications bloquées — activez-les dans les paramètres du navigateur.',
        'warning', 5_000,
      );
      return 'denied';
    }
    const perm = await Notification.requestPermission();
    if (perm === 'denied') {
      showToast('Permission refusée — les alertes sonores restent actives.', 'info');
    }
    return perm;
  }

  /**
   * @param {string} symbol
   * @param {number} price
   * @param {number} [currentPrice]
   * @returns {PriceAlert}
   */
  add(symbol, price, currentPrice) {
    const sym = symbol.toUpperCase();
    price = parseFloat(price);
    if (isNaN(price) || price <= 0) return null;

    const ref = currentPrice ?? this.#lastPrices.get(sym) ?? price;

    const alert = {
      id:        Date.now() + Math.random(),
      symbol:    sym,
      price,
      direction: price >= ref ? 'up' : 'down',
      triggered: false,
      createdAt: Date.now(),
    };

    this.#alerts.push(alert);
    this.#save();
    this.onAlertsChange();

    showToast(`🔔 Alerte créée : ${sym} @ ${fmtPrice(price)}`, 'success', 3_000);
    return alert;
  }

  /**
   * @param {number} id
   */
  remove(id) {
    const before = this.#alerts.length;
    this.#alerts = this.#alerts.filter(a => a.id !== id);
    if (this.#alerts.length !== before) {
      this.#save();
      this.onAlertsChange();
    }
  }

  removeAll() {
    this.#alerts = [];
    this.#save();
    this.onAlertsChange();
  }
  
  clearTriggered() {
    this.#alerts = this.#alerts.filter(a => !a.triggered);
    this.#save();
    this.onAlertsChange();
  }

  /** @returns {PriceAlert[]}*/
  getAll() { return [...this.#alerts]; }

  /** @returns {PriceAlert[]}*/
  getActive() { return this.#alerts.filter(a => !a.triggered); }

  /**
   * @param {string} symbol
   * @returns {PriceAlert[]}
   */
  getActiveForSymbol(symbol) {
    const sym = symbol.toUpperCase();
    return this.#alerts.filter(a => !a.triggered && a.symbol === sym);
  }

  /** @returns {boolean}*/
  hasActive() { return this.#alerts.some(a => !a.triggered); }

  /**
   * @param {string} symbol
   * @param {number} currentPrice
   */
  check(symbol, currentPrice) {
    const sym       = symbol.toUpperCase();
    const lastPrice = this.#lastPrices.get(sym);
    this.#lastPrices.set(sym, currentPrice);

    if (lastPrice === undefined) return;

    for (const alert of this.#alerts) {
      if (alert.triggered)      continue;
      if (alert.symbol !== sym) continue;

      const crossed =
        (lastPrice > alert.price && currentPrice <= alert.price) ||
        (lastPrice < alert.price && currentPrice >= alert.price) ||
        lastPrice === alert.price;

      if (crossed) this.#trigger(alert, currentPrice);
    }
  }

  /**
   * @param {PriceAlert} alert
   * @param {number}     currentPrice
   */
  #trigger(alert, currentPrice) {
    alert.triggered = true;
    this.#save();
    this.onAlertsChange();

    const dir   = currentPrice >= alert.price ? '⬆' : '⬇';
    const title = `CrypView — Alerte ${alert.symbol}`;
    const body  = `${dir} ${alert.symbol} a atteint ${fmtPrice(alert.price)}`;

    showToast(`🔔 ${body}`, 'warning', 8_000);

    this.#playBeep();

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon:               '/public/favicon.svg',
          tag:                `crypview-alert-${alert.id}`,
          requireInteraction: false,
          silent:             true,
        });
      } catch (_) {
      }
    }
  }

  #playBeep() {
    try {
      if (!this.#audioCtx) {
        this.#audioCtx = new (window.AudioContext ?? window.webkitAudioContext)();
      }
      const ctx = this.#audioCtx;

      /** @param {number} freq @param {number} start @param {number} duration */
      const tone = (freq, start, duration) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.01);
      };

      tone(880,  0,    0.18);
      tone(1100, 0.22, 0.18);
    } catch (_) {
    }
  }

  #load() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.#alerts = parsed.filter(a =>
        !a.triggered &&
        typeof a.id     === 'number' &&
        typeof a.symbol === 'string' &&
        typeof a.price  === 'number',
      );
    } catch (_) {
      this.#alerts = [];
    }
  }
  
  #save() {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(this.#alerts));
    } catch (_) {}
  }
}
