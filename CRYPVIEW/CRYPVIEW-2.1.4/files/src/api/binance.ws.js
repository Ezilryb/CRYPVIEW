// ============================================================
//  src/api/binance.ws.js — CrypView V2.1.4
//  Gestionnaire WebSocket centralisé.
//
//  Améliorations v2.1.4 :
//  ✓ Heartbeat (pingTimeout 35s) — détection des connexions silencieuses
//  ✓ Backoff exponentiel 1s → 2s → 4s → 8s (max 30s)
//  ✓ CustomEvent `ws-status-changed` (connected / reconnecting / disconnected)
//  ✓ Nettoyage de TOUS les timers avant chaque nouvelle instance
//  ✓ Interface publique inchangée (aucune rupture de contrat)
//
//  Règles cursorrules appliquées :
//  ✓ Jamais de new WebSocket() en dehors de ce fichier
//  ✓ Toujours closeWS() avant une nouvelle connexion
//  ✓ Chaque erreur WS déclenche un Toast (via showToast)
//  ✓ Commentaires en français, variables en anglais
// ============================================================

import { BINANCE, WS_CONFIG } from '../config.js';
import { showToast }          from '../utils/toast.js';

// ── Constantes locales (surchargent WS_CONFIG pour ce fichier) ──

/**
 * Délai de base du backoff exponentiel.
 * Séquence : 1s → 2s → 4s → 8s → 16s → 30s (plafonné par MAX_RECONNECT_DELAY_MS)
 */
const BASE_RECONNECT_DELAY_MS  = 1_000;
const MAX_RECONNECT_DELAY_MS   = 30_000;
const MAX_RECONNECT_ATTEMPTS   = WS_CONFIG.MAX_RECONNECT_ATTEMPTS ?? 6;

/**
 * Durée d'inactivité au-delà de laquelle la connexion est considérée morte.
 * Binance envoie normalement un ping toutes les ~3 min, mais on veut réagir
 * plus vite aux coupures silencieuses (réseau, proxy, NAT timeout…).
 */
const SILENCE_TIMEOUT_MS = 35_000;

// ── Utilitaire d'émission de CustomEvent ──────────────────────

/**
 * Émet un CustomEvent sur `window` pour notifier l'UI du changement d'état WS.
 * L'interface écoute `ws-status-changed` pour afficher l'indicateur de connexion.
 *
 * @param {'connected'|'reconnecting'|'disconnected'} state
 * @param {object} [extra] — Données additionnelles optionnelles
 */
function emitStatus(state, extra = {}) {
  window.dispatchEvent(
    new CustomEvent('ws-status-changed', {
      detail: { state, ...extra },
      bubbles: false,
    })
  );
}

// ── Utilitaire de fermeture propre ─────────────────────────────

/**
 * Ferme proprement un WebSocket en neutralisant ses callbacks AVANT la
 * fermeture, pour éviter les boucles de reconnexion ou les erreurs
 * "Ping received after close".
 *
 * @param  {WebSocket|null} ws
 * @returns {null} — Idiome : `this.#ws = closeWS(this.#ws)`
 */
export function closeWS(ws) {
  if (!ws) return null;
  try {
    // Neutraliser les handlers en premier — l'ordre est critique
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
    // Fermeture silencieuse — rien de plus à faire
  }
  return null;
}

// ── Classe WSManager ──────────────────────────────────────────

/**
 * Gestionnaire WebSocket avec :
 *   - Détection de silence (heartbeat côté client, 35 s)
 *   - Reconnexion automatique en backoff exponentiel
 *   - Émission de CustomEvents pour feedback UI
 *   - Nettoyage complet des timers et sockets orphelins
 *
 * Cycle de vie :
 *   new WSManager(url) → .connect() → [onOpen / onMessage] → .destroy()
 *
 * Pour changer de symbole sans recréer l'instance :
 *   manager.reconnect(newUrl)
 *
 * @example
 *   const ws = new WSManager('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
 *   ws.onMessage = (data) => console.log(data.k);
 *   ws.connect();
 *   // Écoute du statut dans l'UI :
 *   window.addEventListener('ws-status-changed', ({ detail }) => {
 *     console.log(detail.state); // 'connected' | 'reconnecting' | 'disconnected'
 *   });
 *   // Plus tard :
 *   ws.destroy();
 */
export class WSManager {

  // ── Privés ──────────────────────────────────────────────────

  /** @type {WebSocket|null} */
  #ws                 = null;
  #url                = '';
  #reconnectAttempts  = 0;

  /** Timer de reconnexion — doit être nettoyé avant toute nouvelle tentative */
  #reconnectTimer     = null;

  /**
   * Timer de heartbeat — réinitialisé à chaque message reçu.
   * S'il expire, la connexion est considérée silencieusement morte.
   */
  #silenceTimer       = null;

  /** true si destroy() a été appelé — bloque toute reconnexion */
  #destroyed          = false;

  // ── Callbacks publics — à surcharger après instanciation ────

  /** Appelé à chaque connexion réussie */
  onOpen    = () => {};

  /** @param {object} data — Objet JSON parsé du message Binance */
  onMessage = (_data) => {};

  /** Appelé à chaque déconnexion (avant tentative de reconnexion) */
  onClose   = () => {};

  // ── Constructeur ─────────────────────────────────────────────

  /**
   * @param {string} url — URL du stream WebSocket Binance
   */
  constructor(url) {
    this.#url = url;
  }

  // ── API Publique ──────────────────────────────────────────────

  /**
   * Ouvre la connexion WebSocket.
   * Si une connexion précédente existe, elle est proprement fermée d'abord.
   */
  connect() {
    if (this.#destroyed) return;

    const prev = this.#ws;
    this.#ws = null;

    // Nettoyage des timers de l'instance précédente avant tout
    this.#clearTimers();

    if (prev) {
      // Neutralise les handlers de l'ancienne socket pour éviter les effets de bord
      prev.onopen    = null;
      prev.onmessage = null;
      prev.onerror   = null;

      if (prev.readyState === WebSocket.CLOSING) {
        // Socket encore en fermeture réseau — attendre le vrai onclose
        // pour éviter "Ping received after close" côté Binance
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
   * Remet à zéro le compteur de tentatives.
   *
   * @param {string} newUrl
   */
  reconnect(newUrl) {
    this.#url              = newUrl;
    this.#reconnectAttempts = 0;
    this.#destroyed        = false;
    this.#clearTimers();
    this.connect();
  }

  /**
   * Libère toutes les ressources (socket + timers).
   * L'instance ne peut plus être réutilisée après cet appel.
   * Émet un événement `disconnected` pour l'UI.
   */
  destroy() {
    this.#destroyed = true;
    this.#clearTimers();
    this.#ws = closeWS(this.#ws);
    emitStatus('disconnected');
  }

  // ── Privé : ouverture du socket ───────────────────────────────

  /**
   * Ouvre réellement la connexion WebSocket.
   * Factorisé ici pour éviter la duplication entre connect() et #scheduleReconnect().
   *
   * @private
   */
  #openSocket() {
    if (this.#destroyed) return;

    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0;
      // Démarre la surveillance du silence dès l'ouverture
      this.#resetSilenceTimer();
      emitStatus('connected');
      this.onOpen();
    };

    this.#ws.onmessage = (event) => {
      // Chaque message = signe de vie → réinitialise le timer de silence
      this.#resetSilenceTimer();
      try {
        this.onMessage(JSON.parse(event.data));
      } catch (_) {
        // Message malformé — on ignore silencieusement
      }
    };

    this.#ws.onerror = () => {
      // L'événement `error` est toujours suivi d'un `close`.
      // On laisse le handler `onclose` piloter la reconnexion.
    };

    this.#ws.onclose = () => {
      // Stoppe le heartbeat : plus besoin de surveiller une socket morte
      this.#clearSilenceTimer();
      if (this.#destroyed) return;
      this.onClose();
      this.#scheduleReconnect();
    };
  }

  // ── Privé : heartbeat / détection de silence ─────────────────

  /**
   * Réinitialise le timer de silence.
   * Doit être appelé à chaque message reçu ET à l'ouverture de la connexion.
   *
   * Si aucun message n'arrive pendant SILENCE_TIMEOUT_MS, la connexion
   * est considérée comme silencieusement morte et est fermée de force.
   *
   * @private
   */
  #resetSilenceTimer() {
    this.#clearSilenceTimer();
    this.#silenceTimer = setTimeout(() => {
      // Connexion silencieuse détectée — on force la fermeture
      // ce qui déclenchera onclose → #scheduleReconnect
      showToast(
        `Connexion silencieuse détectée (${SILENCE_TIMEOUT_MS / 1000}s sans données) — reconnexion…`,
        'warning',
        4_000
      );
      emitStatus('reconnecting', { reason: 'silence' });

      // Fermeture forcée de la socket courante
      const dead = this.#ws;
      this.#ws = null;
      if (dead) {
        dead.onclose = () => {
          dead.onclose = null;
          if (!this.#destroyed) this.#scheduleReconnect();
        };
        dead.onopen    = null;
        dead.onmessage = null;
        dead.onerror   = null;
        try { dead.close(); } catch (_) {}
      } else {
        // Pas de socket à fermer — reconnexion directe
        if (!this.#destroyed) this.#scheduleReconnect();
      }
    }, SILENCE_TIMEOUT_MS);
  }

  /**
   * Annule le timer de silence en cours.
   * @private
   */
  #clearSilenceTimer() {
    if (this.#silenceTimer !== null) {
      clearTimeout(this.#silenceTimer);
      this.#silenceTimer = null;
    }
  }

  // ── Privé : reconnexion avec backoff exponentiel ──────────────

  /**
   * Annule le timer de reconnexion ET le timer de silence.
   * À appeler systématiquement avant toute nouvelle tentative ou destroy().
   * @private
   */
  #clearTimers() {
    if (this.#reconnectTimer !== null) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    this.#clearSilenceTimer();
  }

  /**
   * Planifie une tentative de reconnexion avec délai exponentiel.
   *
   * Séquence des délais (BASE = 1s) :
   *   Tentative 1 : 1s
   *   Tentative 2 : 2s
   *   Tentative 3 : 4s
   *   Tentative 4 : 8s
   *   Tentative 5 : 16s
   *   Tentative 6 : 30s (plafonné par MAX_RECONNECT_DELAY_MS)
   *
   * Au-delà de MAX_RECONNECT_ATTEMPTS, arrête les tentatives et émet
   * un événement `disconnected` pour informer l'UI de l'état final.
   *
   * @private
   */
  #scheduleReconnect() {
    if (this.#destroyed) return;

    if (this.#reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // Toutes les tentatives épuisées — on abandonne
      emitStatus('disconnected', { reason: 'max_attempts' });
      showToast(
        'Connexion WebSocket perdue après plusieurs tentatives. Change de paire ou recharge la page.',
        'error',
        8_000
      );
      return;
    }

    // Calcul du délai : BASE × 2^tentatives, plafonné à MAX
    const delay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.#reconnectAttempts)
    );
    this.#reconnectAttempts++;

    emitStatus('reconnecting', {
      attempt:  this.#reconnectAttempts,
      maxAttempts: MAX_RECONNECT_ATTEMPTS,
      delayMs:  delay,
    });

    showToast(
      `WS déconnecté — reconnexion dans ${(delay / 1000).toFixed(0)}s… (${this.#reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
      'warning',
      delay
    );

    // On stocke le timer pour pouvoir l'annuler si destroy() est appelé
    // entre deux tentatives (évite une reconnexion fantôme)
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

// ── Factories — unique point de construction des URLs WS ─────
//    Ces fonctions sont le seul endroit où les URL WS Binance sont construites.
//    Tout le reste du projet passe par elles.

/**
 * Crée un WSManager pour le stream kline (bougies temps réel).
 *
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
 *
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createAggTradeStream(symbol) {
  return new WSManager(BINANCE.wsAgg(symbol));
}

/**
 * Crée un WSManager pour le stream ticker 24h.
 * Utilisé pour les stats open/high/low/vol/trades.
 *
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createTickerStream(symbol) {
  return new WSManager(BINANCE.wsTicker(symbol));
}

/**
 * Crée un WSManager pour le stream trades individuels.
 * Utilisé pour la liste "Trades récents" dans la sidebar.
 *
 * @param {string} symbol
 * @returns {WSManager}
 */
export function createTradeStream(symbol) {
  return new WSManager(BINANCE.wsTrades(symbol));
}
