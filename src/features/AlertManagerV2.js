// ============================================================
//  src/features/AlertManagerV2.js — CrypView V3.0
//  Moteur d'alertes avancé multi-conditions.
//
//  Fonctionnalités :
//    - Multi-conditions avec logique AND / OR
//    - Types : prix absolu, variation %, volume spike,
//              RSI seuil, croisement MACD, breakout N-bougies
//    - Répétition avec cooldown configurable
//    - Limite de déclenchements + expiration par timestamp
//    - Snooze individuel
//    - Historique des 50 derniers déclenchements
//    - Synchronisation cross-onglets via BroadcastChannel
//    - Persistance localStorage (clé V3 pour éviter migration)
// ============================================================

import { showToast }  from '../utils/toast.js';
import { fmtPrice }   from '../utils/format.js';

// ── Clés de stockage ─────────────────────────────────────────
const STORAGE_KEY         = 'crypview_alerts_v3';
const HISTORY_STORAGE_KEY = 'crypview_alerts_history_v3';
const MAX_HISTORY         = 50;
const CHANNEL_NAME        = 'crypview_alerts_sync';

// ── Catalogue des types de conditions ────────────────────────
export const CONDITION_TYPE = Object.freeze({
  PRICE_ABOVE:     'price_above',
  PRICE_BELOW:     'price_below',
  PRICE_PCT_UP:    'price_pct_up',
  PRICE_PCT_DOWN:  'price_pct_down',
  VOLUME_SPIKE:    'volume_spike',
  RSI_ABOVE:       'rsi_above',
  RSI_BELOW:       'rsi_below',
  MACD_CROSS_UP:   'macd_cross_up',
  MACD_CROSS_DOWN: 'macd_cross_down',
  BREAKOUT_HIGH:   'breakout_high',
  BREAKOUT_LOW:    'breakout_low',
  TRENDLINE_CROSS_UP:   'trendline_cross_up',
  TRENDLINE_CROSS_DOWN: 'trendline_cross_down'
});

/**
 * Métadonnées d'affichage pour chaque type de condition.
 * @type {Record<string, {label:string, sub:string, unit:string, icon:string, noValue?:boolean}>}
 */
export const CONDITION_META = {
  [CONDITION_TYPE.PRICE_ABOVE]:    { label: 'Prix',     sub: 'au-dessus de',  unit: '',  icon: '💰' },
  [CONDITION_TYPE.PRICE_BELOW]:    { label: 'Prix',     sub: 'en-dessous de', unit: '',  icon: '💰' },
  [CONDITION_TYPE.PRICE_PCT_UP]:   { label: 'Hausse',   sub: '≥',             unit: '%', icon: '📈' },
  [CONDITION_TYPE.PRICE_PCT_DOWN]: { label: 'Baisse',   sub: '≥',             unit: '%', icon: '📉' },
  [CONDITION_TYPE.VOLUME_SPIKE]:   { label: 'Volume',   sub: 'spike ≥',       unit: '×', icon: '📊' },
  [CONDITION_TYPE.RSI_ABOVE]:      { label: 'RSI',      sub: '≥',             unit: '',  icon: '〽️' },
  [CONDITION_TYPE.RSI_BELOW]:      { label: 'RSI',      sub: '≤',             unit: '',  icon: '〽️' },
  [CONDITION_TYPE.MACD_CROSS_UP]:  { label: 'MACD',     sub: 'croisement ↑',  unit: '',  icon: '⚡', noValue: true },
  [CONDITION_TYPE.MACD_CROSS_DOWN]:{ label: 'MACD',     sub: 'croisement ↓',  unit: '',  icon: '⚡', noValue: true },
  [CONDITION_TYPE.BREAKOUT_HIGH]:  { label: 'Breakout', sub: 'résistance',    unit: 'b', icon: '🚀' },
  [CONDITION_TYPE.BREAKOUT_LOW]:   { label: 'Breakout', sub: 'support',       unit: 'b', icon: '💥' },
  [CONDITION_TYPE.TRENDLINE_CROSS_UP]:  { label: 'Trendline', sub: 'croisement ↑',  unit: '',  icon: '⚡', noValue: true },
  [CONDITION_TYPE.TRENDLINE_CROSS_DOWN]:{ label: 'Trendline', sub: 'croisement ↓',  unit: '',  icon: '⚡', noValue: true },
};

/**
 * @typedef {object} AlertCondition
 * @property {string}       type    — CONDITION_TYPE key
 * @property {number|null}  value   — seuil ; null pour les types noValue (MACD cross)
 */

/**
 * @typedef {object} AlertV2
 * @property {number}          id
 * @property {string}          symbol
 * @property {string}          name          — label libre
 * @property {AlertCondition[]} conditions
 * @property {'AND'|'OR'}      logic
 * @property {boolean}         repeat
 * @property {number}          cooldownMin   — minutes de pause entre déclenchements (repeat)
 * @property {number}          maxTriggers   — 0 = illimité
 * @property {number|null}     expiresAt     — timestamp ms ou null
 * @property {number|null}     snoozedUntil  — timestamp ms ou null
 * @property {number}          triggerCount
 * @property {number|null}     lastTriggeredAt
 * @property {boolean}         active
 * @property {number}          createdAt
 */

/**
 * @typedef {object} MarketSnapshot
 * @property {number}         price
 * @property {number|null}    pctChange24h   — % vs ouverture 24h
 * @property {number|null}    volumeRatio    — volume_current / volume_prev
 * @property {number|null}    rsi            — dernier RSI(14)
 * @property {{macd:number, signal:number}|null} macd
 * @property {Array}          candles        — pour calcul breakout
 */

function _tlinePriceAt(a1, a2, t) {
  if (a1.time === a2.time) return (a1.price + a2.price) / 2;
  return a1.price + (a2.price - a1.price) * (t - a1.time) / (a2.time - a1.time);
}

export class AlertManagerV2 {
  /** @type {AlertV2[]} */
  #alerts  = [];
  /** @type {object[]} */
  #history = [];

  /** Dernière snapshot par symbole — pour détection croisements */
  #lastSnapshot = new Map();

  /** @type {BroadcastChannel|null} */
  #channel = null;

  /** @type {AudioContext|null} */
  #audioCtx = null;

  /** Hook UI appelé après toute mutation des alertes */
  onAlertsChange = () => {};

  constructor() {
    this.#load();
    this.#initChannel();
  }

  // ── API publique ────────────────────────────────────────────

  /**
   * Crée et persiste une nouvelle alerte avancée.
   *
   * @param {object}           cfg
   * @param {string}           cfg.symbol
   * @param {string}           [cfg.name]
   * @param {AlertCondition[]} cfg.conditions
   * @param {'AND'|'OR'}       [cfg.logic='AND']
   * @param {boolean}          [cfg.repeat=false]
   * @param {number}           [cfg.cooldownMin=5]
   * @param {number}           [cfg.maxTriggers=0]
   * @param {number|null}      [cfg.expiresAt=null]
   * @returns {AlertV2|null}
   */
  add(cfg) {
    if (!cfg?.symbol || !Array.isArray(cfg.conditions) || !cfg.conditions.length) return null;

    const alert = {
      id:              Date.now() + Math.random(),
      symbol:          cfg.symbol.toUpperCase(),
      name:            cfg.name?.trim() ?? '',
      conditions:      cfg.conditions,
      logic:           cfg.logic ?? 'AND',
      repeat:          cfg.repeat ?? false,
      cooldownMin:     cfg.cooldownMin ?? 5,
      maxTriggers:     cfg.maxTriggers ?? 0,
      expiresAt:       cfg.expiresAt ?? null,
      snoozedUntil:    null,
      triggerCount:    0,
      lastTriggeredAt: null,
      active:          true,
      createdAt:       Date.now(),
    };

    this.#alerts.push(alert);
    this.#save();
    this.#broadcast();
    this.onAlertsChange();

    const label = alert.name || this.#condSummary(alert.conditions[0]);
    showToast(`🔔 Alerte créée — ${alert.symbol} : ${label}`, 'success', 3_500);
    return alert;
  }

  /** Supprime une alerte par id. */
  remove(id) {
    const before = this.#alerts.length;
    this.#alerts  = this.#alerts.filter(a => a.id !== id);
    if (this.#alerts.length === before) return;
    this.#save();
    this.#broadcast();
    this.onAlertsChange();
  }

  /** Supprime toutes les alertes actives. */
  removeAll() {
    this.#alerts = [];
    this.#save();
    this.#broadcast();
    this.onAlertsChange();
  }

  /** Vide l'historique. */
  clearHistory() {
    this.#history = [];
    this.#saveHistory();
    this.onAlertsChange();
  }

  /**
   * Snooze une alerte pour N minutes.
   * @param {number} id
   * @param {number} [minutes=5]
   */
  snooze(id, minutes = 5) {
    const a = this.#alerts.find(a => a.id === id);
    if (!a) return;
    a.snoozedUntil = Date.now() + minutes * 60_000;
    this.#save();
    this.#broadcast();
    this.onAlertsChange();
    showToast(`💤 Alerte snoozée ${minutes} min`, 'info', 2_500);
  }

  /** Annule le snooze d'une alerte. */
  wakeUp(id) {
    const a = this.#alerts.find(a => a.id === id);
    if (!a || !a.snoozedUntil) return;
    a.snoozedUntil = null;
    this.#save();
    this.#broadcast();
    this.onAlertsChange();
  }

  /** Demande la permission pour les notifications OS. */
  async requestPermission() {
    if (!('Notification' in window)) {
      showToast('Votre navigateur ne supporte pas les notifications.', 'warning');
      return 'denied';
    }
    if (Notification.permission !== 'default') return Notification.permission;
    const perm = await Notification.requestPermission();
    if (perm === 'denied') showToast('Notifications refusées — alertes sonores actives.', 'info');
    return perm;
  }

  /**
   * Point d'entrée principal — appelé à chaque tick de prix ou clôture de bougie.
   *
   * @param {string}          symbol
   * @param {MarketSnapshot}  data
   */
  check(symbol, data) {
    const sym = symbol.toUpperCase();

    // Sauvegarde snapshot précédent avant écrasement (croisements MACD)
    const prevSnapshot = this.#lastSnapshot.get(sym) ?? null;
    this.#lastSnapshot.set(sym, { ...data });

    const now = Date.now();

    for (const alert of this.#alerts) {
      if (!alert.active)            continue;
      if (alert.symbol !== sym)     continue;

      // Vérifications temporelles
      if (alert.snoozedUntil && now < alert.snoozedUntil) continue;
      if (alert.expiresAt   && now > alert.expiresAt)     { this.#expire(alert); continue; }
      if (alert.maxTriggers > 0 && alert.triggerCount >= alert.maxTriggers) {
        this.#expire(alert); continue;
      }
      if (alert.lastTriggeredAt && alert.repeat) {
        const cooldown = (alert.cooldownMin ?? 5) * 60_000;
        if (now - alert.lastTriggeredAt < cooldown) continue;
      }

      // Évaluation multi-conditions
      const fired = this.#evaluate(alert, data, prevSnapshot);
      if (fired) this.#trigger(alert, data.price);
    }
  }

  // ── Getters ─────────────────────────────────────────────────

  /** @returns {AlertV2[]} */
  getAll()    { return [...this.#alerts]; }

  /** @returns {AlertV2[]} */
  getActive() { return this.#alerts.filter(a => a.active); }

  /**
   * Alertes actives pour un symbole donné.
   * @param {string} symbol
   * @returns {AlertV2[]}
   */
  getActiveForSymbol(symbol) {
    const s = symbol.toUpperCase();
    return this.#alerts.filter(a => a.active && a.symbol === s);
  }

  /** @returns {object[]} */
  getHistory() { return [...this.#history]; }

  /** @returns {boolean} */
  hasActive() { return this.#alerts.some(a => a.active); }

  // ── Évaluation multi-conditions ─────────────────────────────

  /**
   * @param {AlertV2}         alert
   * @param {MarketSnapshot}  data
   * @param {MarketSnapshot|null} prev
   * @returns {boolean}
   */
  #evaluate(alert, data, prev) {
    const results = alert.conditions.map(c => this.#evalCondition(c, data, prev));
    return alert.logic === 'OR'
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  /**
   * @param {AlertCondition}      cond
   * @param {MarketSnapshot}      d     — snapshot courant
   * @param {MarketSnapshot|null} p     — snapshot précédent (croisements)
   * @returns {boolean}
   */
  #evalCondition(cond, d, p) {
    switch (cond.type) {

      // ── Prix absolu ──────────────────────────────────────────
      case CONDITION_TYPE.PRICE_ABOVE:
        return d.price > cond.value;
      case CONDITION_TYPE.PRICE_BELOW:
        return d.price < cond.value;

      // ── Variation % depuis ouverture 24h ─────────────────────
      case CONDITION_TYPE.PRICE_PCT_UP:
        return d.pctChange24h != null && d.pctChange24h >= cond.value;
      case CONDITION_TYPE.PRICE_PCT_DOWN:
        return d.pctChange24h != null && d.pctChange24h <= -(cond.value);

      // ── Volume spike : volume_courant / volume_précédent ─────
      case CONDITION_TYPE.VOLUME_SPIKE:
        return d.volumeRatio != null && d.volumeRatio >= cond.value;

      // ── RSI ──────────────────────────────────────────────────
      case CONDITION_TYPE.RSI_ABOVE:
        return d.rsi != null && d.rsi >= cond.value;
      case CONDITION_TYPE.RSI_BELOW:
        return d.rsi != null && d.rsi <= cond.value;

      // ── Croisements MACD (nécessite snapshot précédent) ──────
      case CONDITION_TYPE.MACD_CROSS_UP:
        return !!(p?.macd && d.macd
          && p.macd.macd  <= p.macd.signal
          && d.macd.macd  >  d.macd.signal);
      case CONDITION_TYPE.MACD_CROSS_DOWN:
        return !!(p?.macd && d.macd
          && p.macd.macd  >= p.macd.signal
          && d.macd.macd  <  d.macd.signal);

      // ── Breakout N-bougies ────────────────────────────────────
      // cond.value = lookback (ex: 20 bougies)
      case CONDITION_TYPE.BREAKOUT_HIGH: {
        if (!d.candles?.length) return false;
        const lookback = Math.max(2, cond.value || 20);
        const slice    = d.candles.slice(-lookback - 1, -1); // exclut la bougie courante
        if (!slice.length) return false;
        const high = Math.max(...slice.map(c => c.high));
        return d.price > high;
      }
      case CONDITION_TYPE.BREAKOUT_LOW: {
        if (!d.candles?.length) return false;
        const lookback = Math.max(2, cond.value || 20);
        const slice    = d.candles.slice(-lookback - 1, -1);
        if (!slice.length) return false;
        const low = Math.min(...slice.map(c => c.low));
        return d.price < low;
      }
      case CONDITION_TYPE.TRENDLINE_CROSS_UP: {
        if (!cond.anchors || cond.anchors.length < 2 || !d.currentTime || !p) return false;
        const [a1, a2]  = cond.anchors;
        const currLine  = _tlinePriceAt(a1, a2, d.currentTime);
        const prevLine  = _tlinePriceAt(a1, a2, p.currentTime ?? d.currentTime - 60);
        // Croisement haussier : prix était sous la ligne, maintenant au-dessus
        return (p.price <= prevLine) && (d.price > currLine);
      }
      case CONDITION_TYPE.TRENDLINE_CROSS_DOWN: {
        if (!cond.anchors || cond.anchors.length < 2 || !d.currentTime || !p) return false;
        const [a1, a2]  = cond.anchors;
        const currLine  = _tlinePriceAt(a1, a2, d.currentTime);
        const prevLine  = _tlinePriceAt(a1, a2, p.currentTime ?? d.currentTime - 60);
        // Croisement baissier : prix était au-dessus, maintenant sous
        return (p.price >= prevLine) && (d.price < currLine);
      }
      default:
        return false;
    }
  }

  // ── Déclenchement ────────────────────────────────────────────

  /**
   * @param {AlertV2} alert
   * @param {number}  price
   */
  #trigger(alert, price) {
    alert.triggerCount++;
    alert.lastTriggeredAt = Date.now();

    // Désactivation si non-répétable
    if (!alert.repeat) alert.active = false;

    // Entrée d'historique
    const entry = {
      alertId:     alert.id,
      symbol:      alert.symbol,
      name:        alert.name || this.#condSummary(alert.conditions[0]),
      price:       fmtPrice(price),
      rawPrice:    price,
      logic:       alert.logic,
      conditions:  alert.conditions.map(c => this.#condSummary(c)),
      triggeredAt: Date.now(),
    };
    this.#history.unshift(entry);
    if (this.#history.length > MAX_HISTORY) this.#history.pop();

    this.#save();
    this.#saveHistory();
    this.#broadcast();
    this.onAlertsChange();

    // Notification visuelle
    const label = alert.name || this.#condSummary(alert.conditions[0]);
    showToast(`🔔 ${alert.symbol} — ${label} @ ${fmtPrice(price)}`, 'warning', 8_000);

    // Signal audio
    const isUp = [
      CONDITION_TYPE.PRICE_ABOVE,
      CONDITION_TYPE.PRICE_PCT_UP,
      CONDITION_TYPE.MACD_CROSS_UP,
      CONDITION_TYPE.BREAKOUT_HIGH,
      CONDITION_TYPE.RSI_ABOVE,
    ].includes(alert.conditions[0]?.type);
    this.#playBeep(isUp ? 'up' : 'dn');

    // Notification OS
    if (Notification.permission === 'granted') {
      try {
        new Notification(`CrypView — ${alert.symbol}`, {
          body:               `${label} @ ${fmtPrice(price)}`,
          icon:               '/favicon.svg',
          tag:                `crypview-alert-${alert.id}`,
          requireInteraction: false,
          silent:             true,
        });
      } catch (_) {}
    }
  }

  /** Désactive une alerte expirée. */
  #expire(alert) {
    alert.active = false;
    this.#save();
    this.#broadcast();
    this.onAlertsChange();
  }

  // ── Résumé textuel d'une condition ───────────────────────────

  #condSummary(cond) {
    if (!cond) return '';
    const meta = CONDITION_META[cond.type];
    if (!meta) return cond.type;
    if (meta.noValue) return `${meta.label} ${meta.sub}`;
    const unit = cond.type === CONDITION_TYPE.BREAKOUT_HIGH ||
                 cond.type === CONDITION_TYPE.BREAKOUT_LOW
      ? ` bougies` : ` ${meta.unit}`;
    return `${meta.label} ${meta.sub} ${cond.value ?? ''}${unit}`.trim();
  }

  // ── Signal audio ─────────────────────────────────────────────

  /**
   * @param {'up'|'dn'} dir
   */
  #playBeep(dir = 'up') {
    try {
      if (!this.#audioCtx) {
        this.#audioCtx = new (window.AudioContext ?? window.webkitAudioContext)();
      }
      const ctx   = this.#audioCtx;
      const freqs = dir === 'up' ? [880, 1100] : [1100, 880];
      freqs.forEach((freq, k) => {
        const t    = ctx.currentTime + k * 0.22;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.20);
      });
    } catch (_) {}
  }

  // ── Persistance localStorage ──────────────────────────────────

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.#alerts = Array.isArray(parsed)
          ? parsed.filter(a => a.id && a.symbol && Array.isArray(a.conditions))
          : [];
      }
    } catch (_) { this.#alerts = []; }

    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (raw) this.#history = JSON.parse(raw) ?? [];
    } catch (_) { this.#history = []; }
  }

  #save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#alerts)); } catch (_) {}
  }

  #saveHistory() {
    try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.#history)); } catch (_) {}
  }

  // ── BroadcastChannel (sync cross-onglets) ────────────────────

  #initChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.#channel = new BroadcastChannel(CHANNEL_NAME);
      this.#channel.onmessage = ({ data }) => {
        if (data === 'sync') {
          this.#load();
          this.onAlertsChange();
        }
      };
    } catch (_) {}
  }

  #broadcast() {
    try { this.#channel?.postMessage('sync'); } catch (_) {}
  }
}
