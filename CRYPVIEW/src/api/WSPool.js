// ============================================================
//  src/api/WSPool.js — CrypView V2
//  Pool de connexions WebSocket Binance avec déduplication.
//
//  Problème résolu :
//    En mode Multi-4 avec Footprint + Orderflow, on peut ouvrir
//    jusqu'à 16 connexions WS simultanées. Binance limite à 5/IP.
//
//  Solution :
//    Une PooledConnection utilise l'API dynamique Binance
//    (méthodes SUBSCRIBE / UNSUBSCRIBE sur JSON) pour porter
//    jusqu'à MAX_STREAMS_PER_CONN streams sur une seule socket.
//    Le pool maintient au plus MAX_CONNECTIONS sockets.
//    Si deux panneaux écoutent "btcusdt@ticker", un seul stream
//    est souscrit — les deux handlers reçoivent chaque message.
//
//  Interface publique :
//    wsPool.subscribe(streamName, handler) → unsubscribe()
//    wsPool.connectionCount                → nombre de WS ouvertes
//    wsPool.streamCount                    → nombre de streams actifs
//    wsPool.destroy()
// ============================================================

// ── Constantes ────────────────────────────────────────────────
//
// MAX_STREAMS_PER_CONN : limite conservatrice (Binance autorise 1024).
//   200 laisse une marge confortable pour des rafales d'abonnements.
//
// MAX_CONNECTIONS : limite documentée par Binance (5 par IP).
//   En pratique, avec MAX_STREAMS = 200, Multi-4 + tous les indicateurs
//   ne dépassent pas 30 streams → une seule connexion suffit.
const MAX_STREAMS_PER_CONN = 200;
const MAX_CONNECTIONS      = 5;

// URL de base : le chemin /ws sans stream préfixé permet d'utiliser
// l'API dynamique SUBSCRIBE/UNSUBSCRIBE.
const WS_URL = 'wss://stream.binance.com:9443/ws';

// Heartbeat : si aucun message n'arrive en 35 secondes (coupure réseau
// silencieuse), la socket est fermée pour déclencher la reconnexion.
const PING_TIMEOUT_MS = 35_000;

// Backoff exponentiel : 1s → 2s → 4s → … → 30s max.
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS  = 30_000;

// ══════════════════════════════════════════════════════════════
//  PooledConnection — une connexion WebSocket multiplexée
// ══════════════════════════════════════════════════════════════

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
  /** true dès que onopen a tiré et que la socket est prête à recevoir des SUBSCRIBE */
  #ready      = false;

  constructor() {
    this.#open();
  }

  // ── Accesseurs publics ────────────────────────────────────

  /** Nombre de streams actifs sur cette connexion. */
  get size() { return this.#subs.size; }

  /** true si cette connexion peut encore accueillir des streams. */
  get hasCapacity() { return this.#subs.size < MAX_STREAMS_PER_CONN; }

  /** true si ce stream est déjà souscrit sur cette connexion. */
  hasStream(name) { return this.#subs.has(name); }

  // ── API publique ──────────────────────────────────────────

  /**
   * Ajoute un handler pour un stream donné.
   * Si le stream n'était pas encore souscrit, envoie SUBSCRIBE.
   */
  subscribe(name, fn) {
    if (!this.#subs.has(name)) {
      this.#subs.set(name, new Set());
      // Si la socket est déjà ouverte, on souscrit immédiatement.
      // Sinon le onopen enverra un SUBSCRIBE groupé pour tous les streams.
      if (this.#ready) this.#sendMethod('SUBSCRIBE', [name]);
    }
    this.#subs.get(name).add(fn);
  }

  /**
   * Retire un handler.
   * Si plus aucun handler n'écoute ce stream, envoie UNSUBSCRIBE.
   */
  unsubscribe(name, fn) {
    const set = this.#subs.get(name);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) {
      this.#subs.delete(name);
      if (this.#ready) this.#sendMethod('UNSUBSCRIBE', [name]);
    }
  }

  /** Libère la socket et annule tous les timers. */
  destroy() {
    this.#destroyed = true;
    this.#clearPing();
    if (this.#retryTimer) { clearTimeout(this.#retryTimer); this.#retryTimer = null; }
    if (this.#ws) {
      // Neutralise les callbacks avant fermeture pour éviter les boucles
      this.#ws.onopen    = null;
      this.#ws.onmessage = null;
      this.#ws.onerror   = null;
      this.#ws.onclose   = null;
      try { this.#ws.close(); } catch (_) {}
      this.#ws = null;
    }
  }

  // ── Privé — cycle de vie de la socket ────────────────────

  #open() {
    if (this.#destroyed) return;
    this.#ready = false;
    this.#ws    = new WebSocket(WS_URL);

    this.#ws.onopen = () => {
      this.#retryCount = 0;
      this.#ready      = true;
      this.#resetPing();

      // Réabonnement en bloc à tous les streams existants.
      // Nécessaire après chaque reconnexion car la socket repart de zéro.
      const streams = [...this.#subs.keys()];
      if (streams.length > 0) this.#sendMethod('SUBSCRIBE', streams);
    };

    this.#ws.onmessage = ({ data }) => {
      // Tout message prouve que la connexion est vivante.
      this.#resetPing();
      try {
        const msg = JSON.parse(data);
        // Les confirmations SUBSCRIBE/UNSUBSCRIBE ont un champ `id` mais pas `stream`.
        // Les pings Binance ont `{ result: null }`. On les ignore.
        if (!msg.stream) return;
        const handlers = this.#subs.get(msg.stream);
        if (handlers) {
          handlers.forEach(fn => { try { fn(msg.data); } catch (_) {} });
        }
      } catch (_) {
        // Message malformé — ignoré silencieusement
      }
    };

    // L'événement error est toujours suivi d'un close.
    this.#ws.onerror = () => {};

    this.#ws.onclose = () => {
      this.#clearPing();
      this.#ready = false;
      if (!this.#destroyed) this.#scheduleRetry();
    };
  }

  // ── Privé — envoi JSON ────────────────────────────────────

  #sendMethod(method, params) {
    if (this.#ws?.readyState !== WebSocket.OPEN) return;
    this.#ws.send(JSON.stringify({
      method,
      params,
      id: this.#msgId++,
    }));
  }

  // ── Privé — heartbeat ─────────────────────────────────────

  #resetPing() {
    this.#clearPing();
    this.#pingTimer = setTimeout(() => {
      // Silence détecté : force la fermeture pour déclencher la reconnexion.
      if (this.#ws) try { this.#ws.close(); } catch (_) {}
    }, PING_TIMEOUT_MS);
  }

  #clearPing() {
    if (this.#pingTimer) { clearTimeout(this.#pingTimer); this.#pingTimer = null; }
  }

  // ── Privé — backoff exponentiel ───────────────────────────

  #scheduleRetry() {
    const delay = Math.min(
      BACKOFF_MAX_MS,
      BACKOFF_BASE_MS * Math.pow(2, this.#retryCount++)
    );
    this.#retryTimer = setTimeout(() => this.#open(), delay);
  }
}

// ══════════════════════════════════════════════════════════════
//  WSPool — singleton qui orchestre les PooledConnections
// ══════════════════════════════════════════════════════════════

class WSPool {
  /** @type {PooledConnection[]} */
  #conns = [];

  // ── API publique ──────────────────────────────────────────

  /**
   * Souscrit à un stream Binance.
   *
   * Algorithme de sélection de connexion (dans l'ordre) :
   *   1. Connexion qui porte déjà ce stream (déduplication).
   *   2. Connexion existante avec de la capacité.
   *   3. Nouvelle connexion si sous MAX_CONNECTIONS.
   *   4. Aucune place disponible → warning + no-op.
   *
   * @param {string}   streamName — ex: 'btcusdt@kline_1m'
   * @param {function} handler    — appelé avec le payload `data` de chaque message
   * @returns {() => void}        — fonction de désabonnement
   */
  subscribe(streamName, handler) {
    // 1. Connexion déjà porteuse de ce stream (partage sans nouveau WS)
    let conn = this.#conns.find(c => c.hasStream(streamName));

    // 2. Connexion avec capacité restante
    if (!conn) conn = this.#conns.find(c => c.hasCapacity);

    // 3. Ouvre une nouvelle connexion si la limite n'est pas atteinte
    if (!conn && this.#conns.length < MAX_CONNECTIONS) {
      conn = new PooledConnection();
      this.#conns.push(conn);
    }

    // 4. Pool saturé (ne devrait jamais arriver en usage normal)
    if (!conn) {
      console.warn(
        `[WSPool] Pool saturé (${MAX_CONNECTIONS} connexions × ${MAX_STREAMS_PER_CONN} streams).`,
        `Impossible de souscrire à "${streamName}".`
      );
      return () => {};
    }

    conn.subscribe(streamName, handler);

    // Retourne la fonction de désabonnement
    return () => {
      conn.unsubscribe(streamName, handler);
      // Purge les connexions vides pour libérer des slots
      if (conn.size === 0) {
        this.#conns = this.#conns.filter(c => c !== conn);
        conn.destroy();
      }
    };
  }

  /** Nombre de connexions WebSocket actuellement ouvertes. */
  get connectionCount() { return this.#conns.length; }

  /** Nombre total de streams actifs (toutes connexions confondues). */
  get streamCount() {
    return this.#conns.reduce((acc, c) => acc + c.size, 0);
  }

  /** Ferme toutes les connexions et vide le pool. */
  destroy() {
    this.#conns.forEach(c => c.destroy());
    this.#conns = [];
  }
}

// ── Export singleton ──────────────────────────────────────────
//
// Singleton importé partout où un stream est nécessaire.
// Toute l'application partage la même instance → déduplication garantie.
export const wsPool = new WSPool();
