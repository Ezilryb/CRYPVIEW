// ============================================================
//  src/api/binance.ws.js — CrypView V2.1.4
//  Gestionnaire WebSocket centralisé.
//
//  Fonctionnalités :
//  ✓ Heartbeat / détection de silence (pingTimeout 35s)
//  ✓ Backoff exponentiel : 1s → 2s → 4s → 8s → 16s → 30s max
//  ✓ CustomEvents window `ws-status-changed`
//      detail.state : 'connected' | 'reconnecting' | 'disconnected'
//  ✓ Nettoyage complet des timers et sockets (pas de fuite mémoire)
//
//  Règles cursorrules :
//  ✓ Toujours appeler closeWS() avant d'ouvrir une nouvelle connexion
//  ✓ Jamais de new WebSocket() en dehors de ce fichier
//  ✓ Chaque erreur WS déclenche un Toast (via showToast)
// ============================================================

import { BINANCE, WS_CONFIG } from '../config.js';
import { showToast }          from '../utils/toast.js';

// ── Constantes Heartbeat ──────────────────────────────────────
//
// Binance envoie un ping toutes les ~3 minutes, mais n'importe quel
// message (kline update, aggTrade…) remet le compteur à zéro.
// 35 secondes est un seuil conservateur : si aucun message n'arrive
// pendant ce délai, la connexion est considérée comme silencieusement
// morte (ex : coupure réseau sans TCP RST).
const PING_TIMEOUT_MS = 35_000;

// Backoff révisé — délais courts pour un feedback rapide.
// Ces valeurs surchargent WS_CONFIG.BASE_DELAY_MS localement.
const BACKOFF_BASE_MS = 1_000;   // 1 s à la première tentative
const BACKOFF_MAX_MS  = 30_000;  // plafond à 30 s

// ── Utilitaire d'émission d'événement UI ──────────────────────

/**
 * Émet un `CustomEvent` sur `window` pour notifier l'UI du changement d'état WS.
 *
 * Écouter depuis n'importe quel module :
 *   window.addEventListener('ws-status-changed', ({ detail }) => {
 *     console.log(detail.state); // 'connected' | 'reconnecting' | 'disconnected'
 *   });
 *
 * @param {'connected'|'reconnecting'|'disconnected'} state
 * @param {object} [extra] — Données supplémentaires fusionnées dans le detail
 */
function emitStatus(state, extra = {}) {
  window.dispatchEvent(
    new CustomEvent('ws-status-changed', {
      detail: { state, ...extra },
    })
  );
}

// ── Utilitaire de fermeture propre ────────────────────────────

/**
 * Ferme proprement un WebSocket existant en neutralisant ses callbacks
 * AVANT la fermeture, pour éviter les boucles de reconnexion ou les
 * erreurs "Ping received after close" côté Binance.
 *
 * Idiome d'utilisation : `this.#ws = closeWS(this.#ws)`
 *
 * @param  {WebSocket|null} ws
 * @returns {null}
 */
export function closeWS(ws) {
  if (!ws) return null;
  try {
    ws.onopen    = null;
    ws.onmessage = null;
    ws.onerror   = null;
    ws.onclose   = null;
    if (
      ws.readyState === WebSocket.CONNECTING ||
      ws.readyState === WebSocket.OPEN
    ) {
      ws.close();
    }
  } catch (_) {
    // Fermeture silencieuse — on ne peut rien faire de plus
  }
  return null;
}

// ── Classe WSManager ──────────────────────────────────────────

/**
 * Gestionnaire WebSocket résilient avec :
 *   - Détection de silence par pingTimeout (35 s)
 *   - Reconnexion automatique en backoff exponentiel (1 s → 30 s)
 *   - Émission de `ws-status-changed` CustomEvents sur window
 *   - Nettoyage complet des timers et sockets (pas de fuite mémoire)
 *
 * Cycle de vie :
 *   new WSManager(url) → .connect() → [onOpen / onMessage / onClose] → .destroy()
 *
 * Pour changer de symbole sans recréer l'instance :
 *   manager.reconnect(newUrl)
 *
 * @example
 *   const ws = new WSManager('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
 *   ws.onMessage = (data) => console.log(data.k);
 *   ws.connect();
 *   // Plus tard :
 *   ws.destroy();
 */
export class WSManager {

  // ── Champs privés ─────────────────────────────────────────
  /** @type {WebSocket|null} */
  #ws                = null;
  #url               = '';
  #reconnectAttempts = 0;
  #reconnectTimer    = null;  // setTimeout du backoff
  #pingTimeoutTimer  = null;  // setTimeout de détection de silence
  #destroyed         = false;

  // ── Callbacks publics — à surcharger après instanciation ──
  /** Appelé à chaque connexion réussie. */
  onOpen    = () => {};
  /** @param {object} data — Objet JSON parsé reçu de Binance. */
  onMessage = (_data) => {};
  /** Appelé à chaque déconnexion (avant tentative de reconnexion). */
  onClose   = () => {};

  /**
   * @param {string} url — URL du stream WebSocket Binance
   */
  constructor(url) {
    this.#url = url;
  }

  // ── API Publique ──────────────────────────────────────────

  /**
   * Ouvre la connexion WebSocket.
   * Nettoie proprement tout socket/timer existant avant de créer la nouvelle instance.
   */
  connect() {
    if (this.#destroyed) return;

    // Annule tout timer de reconnexion planifié
    this.#clearReconnectTimer();

    const prev = this.#ws;
    this.#ws   = null;

    if (prev) {
      // Neutralise tous les handlers de l'ancienne socket
      prev.onopen    = null;
      prev.onmessage = null;
      prev.onerror   = null;

      if (prev.readyState === WebSocket.CLOSING) {
        // La socket est encore en cours de fermeture côté réseau.
        // Ouvrir immédiatement une nouvelle connexion provoquerait
        // "Ping received after close" côté Binance.
        // On attend le vrai onclose avant de continuer.
        prev.onclose = () => {
          prev.onclose = null;
          if (!this.#destroyed) this.#openSocket();
        };
        return;
      }

      // CONNECTING ou OPEN → fermeture active, puis ouverture immédiate
      prev.onclose = null;
      if (
        prev.readyState === WebSocket.CONNECTING ||
        prev.readyState === WebSocket.OPEN
      ) {
        prev.close();
      }
    }

    this.#openSocket();
  }

  /**
   * Ferme la connexion courante et en ouvre une nouvelle sur une URL différente.
   * Utile pour changer de symbole sans recréer le manager.
   * Remet le compteur de tentatives à zéro.
   *
   * @param {string} newUrl
   */
  reconnect(newUrl) {
    this.#url               = newUrl;
    this.#reconnectAttempts = 0;
    this.#destroyed         = false;
    this.#clearAll();
    this.connect();
  }

  /**
   * Libère toutes les ressources. L'instance ne peut plus être réutilisée.
   * Annule toute tentative de reconnexion et le timer de silence.
   */
  destroy() {
    this.#destroyed = true;
    this.#clearAll();
    this.#ws = closeWS(this.#ws);
    emitStatus('disconnected');
  }

  // ── Privé : cycle de vie socket ───────────────────────────

  /**
   * Ouvre réellement le WebSocket et branche tous les handlers.
   * @private
   */
  #openSocket() {
    if (this.#destroyed) return;

    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0;
      // Démarre la surveillance de silence dès l'ouverture
      this.#resetPingTimeout();
      emitStatus('connected');
      this.onOpen();
    };

    this.#ws.onmessage = (event) => {
      // Tout message reçu prouve que la connexion est vivante :
      // on repart pour 35 secondes.
      this.#resetPingTimeout();
      try {
        this.onMessage(JSON.parse(event.data));
      } catch (_) {
        // Message malformé — on ignore silencieusement
      }
    };

    this.#ws.onerror = () => {
      // L'événement error est toujours suivi d'un close — on ne gère que close.
    };

    this.#ws.onclose = () => {
      // Arrête immédiatement la surveillance de silence :
      // inutile de déclencher un pingTimeout sur une socket déjà fermée.
      this.#clearPingTimeout();
      if (this.#destroyed) return;
      this.onClose();
      this.#scheduleReconnect();
    };
  }

  // ── Privé : Heartbeat / détection de silence ─────────────

  /**
   * Réinitialise le timer de détection de silence.
   * Appelé à chaque message reçu et à l'ouverture de la connexion.
   * Si aucun message n'arrive dans PING_TIMEOUT_MS, on considère
   * la connexion comme silencieusement morte et on force la reconnexion.
   * @private
   */
  #resetPingTimeout() {
    this.#clearPingTimeout();
    this.#pingTimeoutTimer = setTimeout(() => {
      // Silence détecté : la connexion est probablement fantôme.
      // On ferme proprement pour déclencher onclose → #scheduleReconnect.
      showToast(
        `Silence WS détecté (>${PING_TIMEOUT_MS / 1_000}s) — reconnexion en cours…`,
        'warning',
        4_000
      );
      emitStatus('reconnecting', { reason: 'silence' });
      // Fermeture forcée — onclose prendra le relais
      if (this.#ws) {
        try { this.#ws.close(); } catch (_) {}
      }
    }, PING_TIMEOUT_MS);
  }

  /** @private */
  #clearPingTimeout() {
    if (this.#pingTimeoutTimer !== null) {
      clearTimeout(this.#pingTimeoutTimer);
      this.#pingTimeoutTimer = null;
    }
  }

  // ── Privé : Reconnexion avec backoff exponentiel ──────────

  /**
   * Planifie une tentative de reconnexion avec délai exponentiel plafonné.
   * Délais : 1 s → 2 s → 4 s → 8 s → 16 s → 30 s (plafond).
   * S'arrête après WS_CONFIG.MAX_RECONNECT_ATTEMPTS tentatives.
   * @private
   */
  #scheduleReconnect() {
    if (this.#reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      emitStatus('disconnected', { reason: 'max_attempts' });
      showToast(
        'Connexion WebSocket perdue après plusieurs tentatives. Change de paire ou recharge la page.',
        'error',
        8_000
      );
      return;
    }

    // Backoff exponentiel plafonné : 1 s × 2^n, max 30 s
    const delay = Math.min(
      BACKOFF_MAX_MS,
      BACKOFF_BASE_MS * Math.pow(2, this.#reconnectAttempts)
    );
    this.#reconnectAttempts++;

    emitStatus('reconnecting', {
      attempt: this.#reconnectAttempts,
      max:     WS_CONFIG.MAX_RECONNECT_ATTEMPTS,
      delayMs: delay,
    });

    showToast(
      `WS déconnecté — reconnexion dans ${(delay / 1_000).toFixed(0)} s… (${this.#reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`,
      'warning',
      delay
    );

    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  /** @private */
  #clearReconnectTimer() {
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
  }

  /**
   * Nettoie tous les timers actifs (ping + reconnect).
   * À appeler avant toute fermeture ou recréation de socket.
   * @private
   */
  #clearAll() {
    this.#clearPingTimeout();
    this.#clearReconnectTimer();
  }
}

// ── Factories — une par type de stream Binance ────────────────
//    Ces fonctions sont le seul endroit où les URL WS sont construites.
//    Elles retournent un WSManager non connecté : appelle .connect() toi-même.

/**
 * Crée un WSManager pour le stream kline (bougies temps réel).
 * @param {string} symbol    — Ex: 'btcusdt'
 * @param {string} interval  — Ex: '1m', '1s', '4h'
 * @returns {WSManager}
 */
export function createKlineStream(symbol, interval) {
  return new WSManager(BINANCE.wsKline(symbol, interval));
}

/**
 * Crée un WSManager pour le stream aggTrade (trades agrégés).
 * Utilisé par le Footprint Chart et l'Orderflow Delta/CVD.
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createAggTradeStream(symbol) {
  return new WSManager(BINANCE.wsAgg(symbol));
}

/**
 * Crée un WSManager pour le stream ticker 24 h.
 * Utilisé pour les stats open/high/low/vol/trades.
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createTickerStream(symbol) {
  return new WSManager(BINANCE.wsTicker(symbol));
}

/**
 * Crée un WSManager pour le stream trades individuels.
 * Utilisé pour la liste "Trades récents" dans la sidebar.
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createTradeStream(symbol) {
  return new WSManager(BINANCE.wsTrades(symbol));
}
