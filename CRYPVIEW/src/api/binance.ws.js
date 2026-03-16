// ============================================================
//  src/api/binance.ws.js — CrypView V2
//  Gestionnaire WebSocket centralisé.
//
//  Règles cursorrules appliquées :
//  ✓ Backoff exponentiel (5s → 10s → 20s → 30s max)
//  ✓ Toujours appeler closeWS() avant d'ouvrir une nouvelle connexion
//  ✓ Jamais de new WebSocket() en dehors de ce fichier
//  ✓ Chaque erreur WS déclenche un Toast (via showToast)
// ============================================================

import { BINANCE, WS_CONFIG } from '../config.js';
import { showToast }          from '../utils/toast.js';

// ── Utilitaire de fermeture propre ────────────────────────────

/**
 * Ferme proprement un WebSocket existant en neutralisant ses callbacks
 * AVANT la fermeture, pour éviter les boucles de reconnexion ou les
 * erreurs "Ping received after close".
 *
 * @param  {WebSocket|null} ws
 * @returns {null} — Idiome : this.ws = closeWS(this.ws)
 */
export function closeWS(ws) {
  if (!ws) return null;
  try {
    // Neutraliser les handlers d'abord — l'ordre est important
    ws.onopen    = null;
    ws.onmessage = null;
    ws.onerror   = null;
    ws.onclose   = null;
    if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  } catch (_) {
    // Fermeture silencieuse — on ne peut rien faire de plus
  }
  return null;
}

// ── Classe WSManager ──────────────────────────────────────────

/**
 * Gestionnaire WebSocket avec reconnexion automatique en backoff exponentiel.
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
 *   // Plus tard :
 *   ws.destroy();
 */
export class WSManager {
  /** @type {WebSocket|null} */
  #ws                = null;
  #url               = '';
  #reconnectAttempts = 0;
  #reconnectTimer    = null;
  #destroyed         = false;

  // ── Callbacks publics — à surcharger après instanciation ──
  /** Appelé à chaque connexion réussie */
  onOpen    = () => {};
  /** @param {object} data — Objet JSON parsé */
  onMessage = (_data) => {};
  /** Appelé à chaque déconnexion (avant tentative de reconnexion) */
  onClose   = () => {};

  /**
   * @param {string} url — URL du stream WebSocket Binance
   */
  constructor(url) {
    this.#url = url;
  }

  /** Ouvre la connexion WebSocket. */
  connect() {
    if (this.#destroyed) return;

    const prev = this.#ws;
    this.#ws   = null;

    if (prev) {
      // Neutralise tous les handlers de l'ancienne socket
      prev.onopen    = null;
      prev.onmessage = null;
      prev.onerror   = null;

      if (prev.readyState === WebSocket.CLOSING) {
        // Le socket est encore en cours de fermeture côté réseau.
        // Ouvrir immédiatement une nouvelle connexion provoque
        // "Ping received after close" sur Binance.
        // On attend le vrai onclose avant de continuer.
        prev.onclose = () => {
          prev.onclose = null;
          if (!this.#destroyed) this.#openSocket();
        };
        return;
      }

      // CONNECTING ou OPEN → fermeture active, puis ouverture immédiate
      prev.onclose = null;
      if (prev.readyState === WebSocket.CONNECTING ||
          prev.readyState === WebSocket.OPEN) {
        prev.close();
      }
    }

    this.#openSocket();
  }

  /** @private Ouvre réellement le WebSocket (factorisé pour éviter la duplication). */
  #openSocket() {
    if (this.#destroyed) return;
    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0;
      this.onOpen();
    };

    this.#ws.onmessage = (event) => {
      try {
        this.onMessage(JSON.parse(event.data));
      } catch (_) {
        // Message malformé — on ignore silencieusement
      }
    };

    this.#ws.onerror = () => {
      // L'événement error est toujours suivi d'un close — on ne gère que close
    };

    this.#ws.onclose = () => {
      if (this.#destroyed) return;
      this.onClose();
      this.#scheduleReconnect();
    };
  }

  /**
   * Ferme la connexion courante et en ouvre une nouvelle sur une URL différente.
   * Utile pour changer de symbole sans recréer le manager.
   * @param {string} newUrl
   */
  reconnect(newUrl) {
    this.#url               = newUrl;
    this.#reconnectAttempts = 0;
    this.#destroyed         = false;
    clearTimeout(this.#reconnectTimer);
    this.connect();
  }

  /**
   * Libère toutes les ressources. L'instance ne peut plus être réutilisée.
   * Annule toute tentative de reconnexion en cours.
   */
  destroy() {
    this.#destroyed = true;
    clearTimeout(this.#reconnectTimer);
    this.#ws = closeWS(this.#ws);
  }

  // ── Privé ─────────────────────────────────────────────────

  /**
   * Planifie une tentative de reconnexion avec délai exponentiel.
   * Arrête après MAX_RECONNECT_ATTEMPTS tentatives et affiche un Toast d'erreur.
   */
  #scheduleReconnect() {
    if (this.#reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      showToast(
        'Connexion WebSocket perdue après plusieurs tentatives. Change de paire ou recharge la page.',
        'error',
        8_000
      );
      return;
    }

    // Backoff exponentiel : 5s, 10s, 20s, 30s (plafonné)
    const delay = Math.min(
      WS_CONFIG.MAX_DELAY_MS,
      WS_CONFIG.BASE_DELAY_MS * Math.pow(2, this.#reconnectAttempts)
    );
    this.#reconnectAttempts++;

    showToast(
      `WS déconnecté — nouvelle tentative dans ${(delay / 1000).toFixed(0)}s… (${this.#reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`,
      'warning',
      delay
    );

    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

// ── Factories — une par type de stream Binance ────────────────
//    Ces fonctions sont le seul endroit où les URL WS sont construites.

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
 * Crée un WSManager pour le stream ticker 24h.
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
