// ============================================================
//  src/api/WSPool.js — CrypView V2
//  Pool de connexions WebSocket Binance avec déduplication.
//  Interface publique :
//    wsPool.subscribe(streamName, handler) → unsubscribe()
//    wsPool.connectionCount                → nombre de WS ouvertes
//    wsPool.streamCount                    → nombre de streams actifs
//    wsPool.destroy()
// ============================================================


const MAX_STREAMS_PER_CONN = 200;
const MAX_CONNECTIONS      = 5;

const WS_URL = 'wss://stream.binance.com:9443/ws';

const PING_TIMEOUT_MS = 35_000;

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS  = 30_000;

class PooledConnection {
  /** @type {Map<string, Set<function>>} stream → handlers */
  #subs       = new Map();
  /** @type {WebSocket|null} */
  #ws         = null;
  #msgId      = 1;
  #pingTimer  = null;
  #retryTimer = null;
  #retryCount = 0;
  #destroyed  = false;
  #ready      = false;

  constructor() {
    this.#open();
  }

  get size() { return this.#subs.size; }

  get hasCapacity() { return this.#subs.size < MAX_STREAMS_PER_CONN; }

  hasStream(name) { return this.#subs.has(name); }

  subscribe(name, fn) {
    if (!this.#subs.has(name)) {
      this.#subs.set(name, new Set());
      if (this.#ready) this.#sendMethod('SUBSCRIBE', [name]);
    }
    this.#subs.get(name).add(fn);
  }

  unsubscribe(name, fn) {
    const set = this.#subs.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) {
      this.#subs.delete(name);
      if (this.#ready) this.#sendMethod('UNSUBSCRIBE', [name]);
    }
  }

  destroy() {
    this.#destroyed = true;
    this.#clearPing();
    if (this.#retryTimer) { clearTimeout(this.#retryTimer); this.#retryTimer = null; }
    if (this.#ws) {
      this.#ws.onopen    = null;
      this.#ws.onmessage = null;
      this.#ws.onerror   = null;
      this.#ws.onclose   = null;
      try { this.#ws.close(); } catch (_) {}
      this.#ws = null;
    }
  }

  #open() {
    if (this.#destroyed) return;
    this.#ready = false;
    this.#ws    = new WebSocket(WS_URL);

    this.#ws.onopen = () => {
      this.#retryCount = 0;
      this.#ready      = true;
      this.#resetPing();

      const streams = [...this.#subs.keys()];
      if (streams.length > 0) this.#sendMethod('SUBSCRIBE', streams);
    };

    this.#ws.onmessage = ({ data }) => {
      this.#resetPing();
      try {
        const msg = JSON.parse(data);
        if (!msg.stream) return;
        const handlers = this.#subs.get(msg.stream);
        if (handlers) {
          handlers.forEach(fn => { try { fn(msg.data); } catch (_) {} });
        }
      } catch (_) {
      }
    };

    this.#ws.onerror = () => {};

    this.#ws.onclose = () => {
      this.#clearPing();
      this.#ready = false;
      if (!this.#destroyed) this.#scheduleRetry();
    };
  }

  #sendMethod(method, params) {
    if (this.#ws?.readyState !== WebSocket.OPEN) return;
    this.#ws.send(JSON.stringify({
      method,
      params,
      id: this.#msgId++,
    }));
  }

  #resetPing() {
    this.#clearPing();
    this.#pingTimer = setTimeout(() => {
      if (this.#ws) try { this.#ws.close(); } catch (_) {}
    }, PING_TIMEOUT_MS);
  }

  #clearPing() {
    if (this.#pingTimer) { clearTimeout(this.#pingTimer); this.#pingTimer = null; }
  }

  #scheduleRetry() {
    const delay = Math.min(
      BACKOFF_MAX_MS,
      BACKOFF_BASE_MS * Math.pow(2, this.#retryCount++)
    );
    this.#retryTimer = setTimeout(() => this.#open(), delay);
  }
}

class WSPool {
  /** @type {PooledConnection[]} */
  #conns = [];

  /**
   * Souscrit à un stream Binance.
   * @param {string}   streamName — ex: 'btcusdt@kline_1m'
   * @param {function} handler    — appelé avec le payload `data` de chaque message
   * @returns {() => void}        — fonction de désabonnement
   */
  subscribe(streamName, handler) {
    let conn = this.#conns.find(c => c.hasStream(streamName));
    if (!conn) conn = this.#conns.find(c => c.hasCapacity);
    if (!conn && this.#conns.length < MAX_CONNECTIONS) {
      conn = new PooledConnection();
      this.#conns.push(conn);
    }

    if (!conn) {
      console.warn(
        `[WSPool] Pool saturé (${MAX_CONNECTIONS} connexions × ${MAX_STREAMS_PER_CONN} streams).`,
        `Impossible de souscrire à "${streamName}".`
      );
      return () => {};
    }

    conn.subscribe(streamName, handler);

    return () => {
      conn.unsubscribe(streamName, handler);
      if (conn.size === 0) {
        this.#conns = this.#conns.filter(c => c !== conn);
        conn.destroy();
      }
    };
  }

  get connectionCount() { return this.#conns.length; }
  get streamCount() {
    return this.#conns.reduce((acc, c) => acc + c.size, 0);
  }

  destroy() {
    this.#conns.forEach(c => c.destroy());
    this.#conns = [];
  }
}

export const wsPool = new WSPool();
