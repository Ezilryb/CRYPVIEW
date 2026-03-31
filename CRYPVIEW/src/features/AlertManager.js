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
 * @property {number}  id         — identifiant unique (timestamp + random)
 * @property {string}  symbol     — ex: 'BTCUSDT' (toujours uppercase)
 * @property {number}  price      — niveau cible
 * @property {'up'|'down'} direction — sens d'approche au moment de la création
 * @property {boolean} triggered  — true une fois déclenchée
 * @property {number}  createdAt  — timestamp ms
 */

export class AlertManager {
  /** @type {PriceAlert[]} */
  #alerts = [];

  /** Dernier prix connu par symbole — sert à détecter les croisements */
  #lastPrices = new Map();

  #storageKey;

  /** @type {AudioContext|null} — instancié à la demande (geste utilisateur requis) */
  #audioCtx = null;

  /**
   * Callback déclenché après chaque modification de la liste (add/remove/trigger).
   * Sert à mettre à jour l'UI (price lines, badge, etc.) sans couplage fort.
   * @type {function(): void}
   */
  onAlertsChange = () => {};

  constructor(storageKey = STORAGE_KEY_DEFAULT) {
    this.#storageKey = storageKey;
    this.#load();
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Demande la permission pour les notifications système.
   * Doit être appelé suite à un geste utilisateur (click).
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
   * Ajoute une alerte de prix.
   *
   * La `direction` est calculée par rapport au prix actuel :
   *   - Si target > current → alerte "up" (se déclenche quand le prix monte)
   *   - Si target < current → alerte "down" (se déclenche quand le prix baisse)
   *   - Si target === current → "up" par convention
   *
   * @param {string} symbol       — ex: 'btcusdt' (normalisé en uppercase)
   * @param {number} price        — niveau cible
   * @param {number} [currentPrice] — prix de référence pour la direction
   * @returns {PriceAlert}
   */
  add(symbol, price, currentPrice) {
    const sym = symbol.toUpperCase();
    price = parseFloat(price);
    if (isNaN(price) || price <= 0) return null;

    // Référence : lastPrice connu ou currentPrice fourni ou le target lui-même
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
   * Supprime une alerte par son identifiant.
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

  /** Supprime toutes les alertes (actives ET déclenchées). */
  removeAll() {
    this.#alerts = [];
    this.#save();
    this.onAlertsChange();
  }

  /** Supprime uniquement les alertes déjà déclenchées. */
  clearTriggered() {
    this.#alerts = this.#alerts.filter(a => !a.triggered);
    this.#save();
    this.onAlertsChange();
  }

  /** @returns {PriceAlert[]} copie de toutes les alertes */
  getAll() { return [...this.#alerts]; }

  /** @returns {PriceAlert[]} uniquement les alertes non encore déclenchées */
  getActive() { return this.#alerts.filter(a => !a.triggered); }

  /**
   * Alertes actives pour un symbole donné.
   * @param {string} symbol
   * @returns {PriceAlert[]}
   */
  getActiveForSymbol(symbol) {
    const sym = symbol.toUpperCase();
    return this.#alerts.filter(a => !a.triggered && a.symbol === sym);
  }

  /** @returns {boolean} true s'il existe au moins une alerte non déclenchée */
  hasActive() { return this.#alerts.some(a => !a.triggered); }

  /**
   * Vérifie les alertes à chaque tick de prix WebSocket.
   * À appeler sur chaque mise à jour de prix, le plus tôt possible.
   *
   * Algorithme de croisement :
   *   Un croisement est détecté si le signe de (price - target) change
   *   entre le tick précédent et le tick courant, ou si le prix touche exactement le seuil.
   *
   * @param {string} symbol       — symbole reçu du WS
   * @param {number} currentPrice — prix de clôture de la bougie courante
   */
  check(symbol, currentPrice) {
    const sym       = symbol.toUpperCase();
    const lastPrice = this.#lastPrices.get(sym);
    this.#lastPrices.set(sym, currentPrice);

    // Premier tick pour ce symbole : pas de référence → aucun croisement possible
    if (lastPrice === undefined) return;

    for (const alert of this.#alerts) {
      if (alert.triggered)      continue;
      if (alert.symbol !== sym) continue;

      const crossed =
        // Prix passé EN-DESSOUS du seuil
        (lastPrice > alert.price && currentPrice <= alert.price) ||
        // Prix passé AU-DESSUS du seuil
        (lastPrice < alert.price && currentPrice >= alert.price) ||
        // Prix exactement sur le seuil au tick précédent
        lastPrice === alert.price;

      if (crossed) this.#trigger(alert, currentPrice);
    }
  }

  // ── Déclenchement ─────────────────────────────────────────

  /**
   * Déclenche une alerte : marquage, toast, son, notification OS.
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

    // Toast visuel (toujours affiché, onglet arrière-plan ou non)
    showToast(`🔔 ${body}`, 'warning', 8_000);

    // Signal audio (ne nécessite pas de permission)
    this.#playBeep();

    // Notification système native (nécessite la permission)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon:               '/public/favicon.svg',
          tag:                `crypview-alert-${alert.id}`,
          requireInteraction: false,
          silent:             true, // le son est géré par Web Audio
        });
      } catch (_) {
        // Notification non supportée dans ce contexte (ex: Safari < 16.1) → silencieux
      }
    }
  }

  // ── Signal audio ──────────────────────────────────────────

  /**
   * Joue un bip double-ton via Web Audio API.
   * Deux oscillateurs successifs : 880 Hz puis 1100 Hz.
   * Gestion lazy de l'AudioContext (interdit avant geste utilisateur).
   */
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

      tone(880,  0,    0.18); // Ré grave
      tone(1100, 0.22, 0.18); // Mi aigu
    } catch (_) {
      // Web Audio non disponible ou contexte suspendu → silencieux
    }
  }

  // ── Persistance localStorage ──────────────────────────────

  /**
   * Charge les alertes depuis le localStorage.
   * Les alertes déjà déclenchées sont exclues au chargement
   * (elles ne doivent pas se re-déclencher après un rechargement).
   */
  #load() {
    try {
      const raw = localStorage.getItem(this.#storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      // On ne recharge que les alertes actives
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

  /** Persiste l'état courant (toutes les alertes, actives et déclenchées). */
  #save() {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(this.#alerts));
    } catch (_) {}
  }
}
