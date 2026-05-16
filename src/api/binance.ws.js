// ============================================================
//  src/api/binance.ws.js — CrypView V2.1.4
//  Gestionnaire WebSocket centralisé.
//
//  Fonctionnalités :
//  ✓ Heartbeat / détection de silence (pingTimeout 35s)
//  ✓ Backoff exponentiel : 1s → 2s → 4s → 8s → 16s → 30s max
//  ✓ CustomEvents window `ws-status-changed`
//  ✓ Nettoyage complet des timers et sockets
//
//  Note sur WSPool (TODO P1) :
//    WSPool.js est disponible pour le cas Multi-4 + Footprint + Orderflow
//    (jusqu'à 16 connexions, limite Binance = 5/IP). Le branchement n'est
//    PAS fait ici car :
//    a) kline_1s n'est pas garanti sur l'endpoint combiné /ws + SUBSCRIBE.
//    b) PooledStream tirait onOpen en microtask (avant connexion réelle),
//       ce qui émettait status:'live' trop tôt et cassait l'affichage.
//    Le couplage doit cibler uniquement les streams aggTrade (Footprint +
//    Orderflow) et sera traité séparément.
// ============================================================

import { BINANCE, WS_CONFIG } from '../config.js';
import { showToast }          from '../utils/toast.js';

const PING_TIMEOUT_MS = 35_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS  = 30_000;

function emitStatus(state, extra = {}) {
  window.dispatchEvent(
    new CustomEvent('ws-status-changed', { detail: { state, ...extra } })
  );
}

export function closeWS(ws) {
  if (!ws) return null;
  try {
    ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
    if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  } catch (_) {}
  return null;
}

export class WSManager {
  #ws                = null;
  #url               = '';
  #reconnectAttempts = 0;
  #reconnectTimer    = null;
  #pingTimeoutTimer  = null;
  #destroyed         = false;

  onOpen    = () => {};
  onMessage = (_data) => {};
  onClose   = () => {};

  constructor(url) { this.#url = url; }

  connect() {
    if (this.#destroyed) return;
    this.#clearReconnectTimer();

    const prev = this.#ws;
    this.#ws   = null;

    if (prev) {
      prev.onopen = prev.onmessage = prev.onerror = null;

      if (prev.readyState === WebSocket.CLOSING) {
        prev.onclose = () => { prev.onclose = null; if (!this.#destroyed) this.#openSocket(); };
        return;
      }
      prev.onclose = null;
      if (prev.readyState === WebSocket.CONNECTING || prev.readyState === WebSocket.OPEN) {
        prev.close();
      }
    }
    this.#openSocket();
  }

  reconnect(newUrl) {
    this.#url               = newUrl;
    this.#reconnectAttempts = 0;
    this.#destroyed         = false;
    this.#clearAll();
    this.connect();
  }

  destroy() {
    this.#destroyed = true;
    this.#clearAll();
    this.#ws = closeWS(this.#ws);
    emitStatus('disconnected');
  }

  #openSocket() {
    if (this.#destroyed) return;
    this.#ws = new WebSocket(this.#url);

    this.#ws.onopen = () => {
      this.#reconnectAttempts = 0;
      this.#resetPingTimeout();
      emitStatus('connected');
      this.onOpen();
    };

    this.#ws.onmessage = (event) => {
      this.#resetPingTimeout();
      try { this.onMessage(JSON.parse(event.data)); } catch (_) {}
    };

    this.#ws.onerror = () => {};

    this.#ws.onclose = () => {
      this.#clearPingTimeout();
      if (this.#destroyed) return;
      this.onClose();
      this.#scheduleReconnect();
    };
  }

  #resetPingTimeout() {
    this.#clearPingTimeout();
    this.#pingTimeoutTimer = setTimeout(() => {
      showToast(`Silence WS détecté (>${PING_TIMEOUT_MS / 1_000}s) — reconnexion en cours…`, 'warning', 4_000);
      emitStatus('reconnecting', { reason: 'silence' });
      if (this.#ws) { try { this.#ws.close(); } catch (_) {} }
    }, PING_TIMEOUT_MS);
  }

  #clearPingTimeout() {
    if (this.#pingTimeoutTimer !== null) { clearTimeout(this.#pingTimeoutTimer); this.#pingTimeoutTimer = null; }
  }

  #scheduleReconnect() {
    if (this.#reconnectAttempts >= WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      emitStatus('disconnected', { reason: 'max_attempts' });
      showToast('Connexion WebSocket perdue après plusieurs tentatives. Change de paire ou recharge la page.', 'error', 8_000);
      return;
    }
    const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, this.#reconnectAttempts));
    this.#reconnectAttempts++;
    emitStatus('reconnecting', { attempt: this.#reconnectAttempts, max: WS_CONFIG.MAX_RECONNECT_ATTEMPTS, delayMs: delay });
    showToast(`WS déconnecté — reconnexion dans ${(delay / 1_000).toFixed(0)} s… (${this.#reconnectAttempts}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})`, 'warning', delay);
    this.#reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  #clearReconnectTimer() {
    if (this.#reconnectTimer !== null) { clearTimeout(this.#reconnectTimer); this.#reconnectTimer = null; }
  }

  #clearAll() { this.#clearPingTimeout(); this.#clearReconnectTimer(); }
}

export function createKlineStream(symbol, interval) {
  return new WSManager(BINANCE.wsKline(symbol, interval));
}

export function createAggTradeStream(symbol) {
  return new WSManager(BINANCE.wsAgg(symbol));
}

export function createTickerStream(symbol) {
  return new WSManager(BINANCE.wsTicker(symbol));
}

export function createTradeStream(symbol) {
  return new WSManager(BINANCE.wsTrades(symbol));
}
