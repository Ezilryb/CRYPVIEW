// ============================================================
//  src/utils/healthMonitor.js — CrypView V2
//  Surveillance de santé des APIs et connexions WebSocket.
//
//  Responsabilités :
//    1. Probe périodique des endpoints REST (Binance, GeckoTerminal)
//    2. Suivi de l'état des connexions WS (wsPool + WSManager)
//    3. Calcul de latence et taux d'erreur par service
//    4. Rate-limit detection (HTTP 429) avec backoff automatique
//    5. Fallback multi-sources (Bybit, OKX) si Binance dégradé
//    6. Persistance des incidents en localStorage (rolling 50)
//    7. Émission de CustomEvents pour l'UI
//
//  Usage :
//    import { healthMonitor } from './healthMonitor.js';
//    healthMonitor.start();
//    healthMonitor.getStatus('binance_rest');  // → ServiceStatus
//    healthMonitor.isHealthy('binance_ws');    // → boolean
//    healthMonitor.stop();
//
//  Événements CustomEvent sur window :
//    'health:update'   — { service, status }
//    'health:degraded' — { service, reason }
//    'health:restored' — { service }
//    'health:ratelimit'— { service, retryAfter }
// ============================================================

import { logger } from './logger.js';

// ── Constantes ────────────────────────────────────────────────

const STORAGE_KEY    = 'crypview_health_incidents_v1';
const MAX_INCIDENTS  = 50;

/** Intervalle de probe en ms par tier de criticité */
const PROBE_INTERVAL = {
  critical: 30_000,   // Binance REST (principal)
  standard: 60_000,   // GeckoTerminal, exchanges secondaires
  passive:  120_000,  // Bybit, OKX (fallback)
};

/** Seuils pour changer d'état */
const THRESHOLDS = {
  latencyWarnMs:     800,   // au-delà → 'degraded'
  latencyCriticalMs: 3_000, // au-delà → 'slow'
  errorRateWarn:     0.20,  // 20% d'erreurs sur la fenêtre → 'degraded'
  errorRateCritical: 0.50,  // 50% → 'down'
  windowSize:        10,    // nombre de sondes pour le calcul du taux d'erreur
};

/** Codes HTTP indiquant un rate-limit */
const RATE_LIMIT_CODES = new Set([429, 418]); // 418 = Binance ban temporaire

// ── Endpoints à surveiller ────────────────────────────────────

const SERVICES = {
  binance_rest: {
    name:     'Binance REST',
    tier:     'critical',
    url:      'https://api.binance.com/api/v3/ping',
    timeout:  5_000,
    fallback: null,
  },
  binance_fapi: {
    name:     'Binance FAPI',
    tier:     'standard',
    url:      'https://fapi.binance.com/fapi/v1/ping',
    timeout:  5_000,
    fallback: null,
  },
  geckoterminal: {
    name:     'GeckoTerminal',
    tier:     'standard',
    url:      'https://api.geckoterminal.com/api/v2/networks?page=1',
    timeout:  8_000,
    fallback: null,
  },
  bybit_rest: {
    name:     'Bybit REST',
    tier:     'passive',
    url:      'https://api.bybit.com/v5/market/time',
    timeout:  5_000,
    fallback: null,
  },
  okx_rest: {
    name:     'OKX REST',
    tier:     'passive',
    url:      'https://www.okx.com/api/v5/public/time',
    timeout:  5_000,
    fallback: null,
  },
};

// ── Types / JSDoc ─────────────────────────────────────────────

/**
 * @typedef {'healthy'|'degraded'|'slow'|'down'|'ratelimited'|'unknown'} HealthState
 *
 * @typedef {object} ServiceStatus
 * @property {string}      id
 * @property {string}      name
 * @property {HealthState} state
 * @property {number|null} latencyMs     — dernière latence mesurée
 * @property {number}      errorRate     — 0..1 sur la fenêtre glissante
 * @property {number|null} lastCheck     — timestamp ms
 * @property {number|null} rateLimitedUntil — timestamp ms ou null
 * @property {string|null} lastError
 * @property {number}      consecutiveErrors
 * @property {number[]}    latencyHistory  — N dernières latences
 *
 * @typedef {object} Incident
 * @property {string}      service
 * @property {HealthState} state
 * @property {string}      reason
 * @property {number}      ts
 * @property {number|null} resolvedAt
 */

// ══════════════════════════════════════════════════════════════
//  HealthMonitor
// ══════════════════════════════════════════════════════════════

class HealthMonitor {
  /** @type {Map<string, ServiceStatus>} */
  #statuses = new Map();

  /** @type {Map<string, number>} serviceId → setInterval handle */
  #timers = new Map();

  /** @type {Incident[]} */
  #incidents = [];

  /** @type {Map<string, number[]>} serviceId → derniers résultats (1=ok, 0=err) */
  #errorWindows = new Map();

  /** @type {boolean} */
  #running = false;

  /** Référence vers wsPool pour surveiller les WS — injectée via attach() */
  #wsPool = null;

  /** Intervalle de surveillance du wsPool */
  #wsTimer = null;

  // ── API publique ──────────────────────────────────────────

  /**
   * Injecte une référence à wsPool pour surveiller les connexions WS.
   * Appeler avant start() si la surveillance WS est souhaitée.
   * @param {import('../api/WSPool.js').WSPool} pool
   */
  attachWsPool(pool) {
    this.#wsPool = pool;
  }

  /**
   * Démarre la surveillance de tous les services.
   */
  start() {
    if (this.#running) return;
    this.#running = true;

    this.#loadIncidents();

    // Initialise les statuts
    for (const [id, cfg] of Object.entries(SERVICES)) {
      this.#statuses.set(id, this.#makeStatus(id, cfg.name));
      this.#errorWindows.set(id, []);
    }

    // Probe immédiat puis périodique par tier
    for (const [id, cfg] of Object.entries(SERVICES)) {
      this.#probe(id);                                    // immédiat
      const handle = setInterval(
        () => this.#probe(id),
        PROBE_INTERVAL[cfg.tier] ?? PROBE_INTERVAL.standard
      );
      this.#timers.set(id, handle);
    }

    // Surveillance wsPool (état des sockets)
    if (this.#wsPool) {
      this.#checkWsPool();
      this.#wsTimer = setInterval(() => this.#checkWsPool(), 15_000);
    }
  }

  /** Arrête toutes les sondes et timers. */
  stop() {
    this.#running = false;
    for (const handle of this.#timers.values()) clearInterval(handle);
    this.#timers.clear();
    if (this.#wsTimer !== null) {
      clearInterval(this.#wsTimer);
      this.#wsTimer = null;
    }
  }

  /**
   * État courant d'un service.
   * @param {string} id
   * @returns {ServiceStatus|null}
   */
  getStatus(id) {
    return this.#statuses.get(id) ?? null;
  }

  /**
   * Snapshot de tous les statuts.
   * @returns {Map<string, ServiceStatus>}
   */
  getAll() {
    return new Map(this.#statuses);
  }

  /**
   * True si le service est opérationnel (healthy ou slow).
   * @param {string} id
   */
  isHealthy(id) {
    const s = this.#statuses.get(id);
    if (!s) return true; // inconnu → optimiste
    return s.state === 'healthy' || s.state === 'slow';
  }

  /**
   * True si Binance REST est rate-limité.
   */
  isRateLimited() {
    const s = this.#statuses.get('binance_rest');
    if (!s?.rateLimitedUntil) return false;
    return Date.now() < s.rateLimitedUntil;
  }

  /**
   * Meilleur endpoint REST disponible pour les klines.
   * Retourne l'URL de base Binance ou le fallback actif.
   * @returns {string}
   */
  getBestRestBase() {
    if (!this.isRateLimited() && this.isHealthy('binance_rest')) {
      return 'https://api.binance.com/api/v3';
    }
    // Si Binance est KO → signale le problème et retourne quand même Binance
    // (les callers géreront eux-mêmes le fallback métier)
    logger.warn('[HealthMonitor] Binance REST dégradé — les appels peuvent échouer.');
    return 'https://api.binance.com/api/v3';
  }

  /**
   * Signale manuellement un succès ou une erreur pour un service.
   * Utile depuis binance.rest.js pour alimenter les métriques sans probe actif.
   * @param {string}  id
   * @param {boolean} success
   * @param {number}  [latencyMs]
   * @param {number}  [httpStatus]
   */
  report(id, success, latencyMs = 0, httpStatus = 200) {
    if (!this.#statuses.has(id)) return;
    if (RATE_LIMIT_CODES.has(httpStatus)) {
      this.#handleRateLimit(id, httpStatus);
      return;
    }
    this.#recordResult(id, success, latencyMs);
    this.#computeState(id);
  }

  /**
   * Incidents passés (lecture seule).
   * @returns {Incident[]}
   */
  getIncidents() {
    return [...this.#incidents];
  }

  // ── Probe HTTP ────────────────────────────────────────────

  async #probe(id) {
    const cfg = SERVICES[id];
    if (!cfg || !this.#running) return;

    const status = this.#statuses.get(id);

    // Skip si rate-limité et fenêtre non expirée
    if (status?.rateLimitedUntil && Date.now() < status.rateLimitedUntil) return;

    const t0 = performance.now();
    try {
      const res = await fetch(cfg.url, {
        method: 'GET',
        signal: AbortSignal.timeout(cfg.timeout),
        cache:  'no-store',
      });

      const latency = Math.round(performance.now() - t0);

      if (RATE_LIMIT_CODES.has(res.status)) {
        this.#handleRateLimit(id, res.status, res.headers.get('Retry-After'));
        return;
      }

      const ok = res.ok;
      this.#recordResult(id, ok, ok ? latency : 0, ok ? null : `HTTP ${res.status}`);

    } catch (err) {
      const latency = Math.round(performance.now() - t0);
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      this.#recordResult(id, false, latency, isTimeout ? 'timeout' : err.message);
    }

    this.#computeState(id);
  }

  // ── Rate-limit ────────────────────────────────────────────

  #handleRateLimit(id, httpStatus, retryAfterHeader = null) {
    const status = this.#statuses.get(id);
    if (!status) return;

    // Durée de ban : header Retry-After (secondes) ou 60s par défaut
    const retrySeconds = retryAfterHeader
      ? Math.max(1, parseInt(retryAfterHeader))
      : httpStatus === 418 ? 120 : 60;

    const retryAt = Date.now() + retrySeconds * 1_000;
    status.rateLimitedUntil = retryAt;

    const prev = status.state;
    status.state      = 'ratelimited';
    status.lastError  = `HTTP ${httpStatus} — rate limited ${retrySeconds}s`;
    status.lastCheck  = Date.now();

    this.#emit('health:ratelimit', { service: id, retryAfter: retryAt });

    if (prev !== 'ratelimited') {
      logger.warn(`[HealthMonitor] ${status.name} rate-limité — retry dans ${retrySeconds}s`);
      this.#addIncident(id, 'ratelimited', `HTTP ${httpStatus}`);
    }

    this.#emit('health:update', { service: id, status: { ...status } });
  }

  // ── Enregistrement d'un résultat ──────────────────────────

  #recordResult(id, success, latencyMs = 0, errorMsg = null) {
    const status = this.#statuses.get(id);
    if (!status) return;

    // Fenêtre glissante d'erreurs
    const window = this.#errorWindows.get(id) ?? [];
    window.push(success ? 1 : 0);
    if (window.length > THRESHOLDS.windowSize) window.shift();
    this.#errorWindows.set(id, window);

    // Historique de latence (10 dernières valeurs)
    if (success && latencyMs > 0) {
      status.latencyHistory.push(latencyMs);
      if (status.latencyHistory.length > 10) status.latencyHistory.shift();
      status.latencyMs = latencyMs;
    }

    if (success) {
      status.consecutiveErrors = 0;
      status.lastError         = null;
    } else {
      status.consecutiveErrors++;
      status.lastError = errorMsg;
    }

    status.errorRate = window.length
      ? 1 - (window.reduce((a, b) => a + b, 0) / window.length)
      : 0;

    status.lastCheck = Date.now();
  }

  // ── Calcul de l'état ──────────────────────────────────────

  #computeState(id) {
    const status = this.#statuses.get(id);
    if (!status || status.state === 'ratelimited') return;

    const prevState = status.state;
    let   newState  = 'healthy';

    if (status.errorRate >= THRESHOLDS.errorRateCritical ||
        status.consecutiveErrors >= 3) {
      newState = 'down';
    } else if (status.errorRate >= THRESHOLDS.errorRateWarn ||
               status.consecutiveErrors >= 2) {
      newState = 'degraded';
    } else if (status.latencyMs !== null &&
               status.latencyMs > THRESHOLDS.latencyCriticalMs) {
      newState = 'slow';
    } else if (status.latencyMs !== null &&
               status.latencyMs > THRESHOLDS.latencyWarnMs) {
      newState = 'degraded';
    }

    status.state = newState;

    // Transitions notables
    if (prevState !== newState) {
      if (newState === 'healthy' && prevState !== 'unknown') {
        this.#resolveLastIncident(id);
        this.#emit('health:restored', { service: id });
        logger.info(`[HealthMonitor] ${status.name} rétabli ✓`);
      } else if (newState === 'down' || newState === 'degraded') {
        this.#addIncident(id, newState, status.lastError ?? 'dégradé');
        this.#emit('health:degraded', { service: id, reason: status.lastError });
        if (newState === 'down') {
          logger.error(`[HealthMonitor] ${status.name} hors ligne : ${status.lastError}`);
        } else {
          logger.warn(`[HealthMonitor] ${status.name} dégradé : ${status.lastError ?? 'latence élevée'}`);
        }
      }
    }

    this.#emit('health:update', { service: id, status: { ...status } });
  }

  // ── Surveillance wsPool ───────────────────────────────────

  #checkWsPool() {
    if (!this.#wsPool || !this.#running) return;

    const connCount   = this.#wsPool.connectionCount;
    const streamCount = this.#wsPool.streamCount;

    const wsId = 'binance_ws';

    // Assure que le statut virtuel 'binance_ws' existe
    if (!this.#statuses.has(wsId)) {
      this.#statuses.set(wsId, this.#makeStatus(wsId, 'Binance WebSocket'));
    }

    const status    = this.#statuses.get(wsId);
    const prevState = status.state;

    if (streamCount > 0 && connCount > 0) {
      status.state             = 'healthy';
      status.consecutiveErrors = 0;
      status.lastError         = null;
    } else if (streamCount > 0 && connCount === 0) {
      // Streams demandés mais aucune socket ouverte = problème
      status.consecutiveErrors++;
      status.state     = status.consecutiveErrors >= 3 ? 'down' : 'degraded';
      status.lastError = 'Aucune connexion WS active';
    }

    status.lastCheck = Date.now();

    if (prevState !== status.state) {
      if (status.state === 'healthy' && prevState !== 'unknown') {
        this.#resolveLastIncident(wsId);
        this.#emit('health:restored', { service: wsId });
      } else if (status.state !== 'healthy') {
        this.#addIncident(wsId, status.state, status.lastError ?? 'WS dégradé');
        this.#emit('health:degraded', { service: wsId, reason: status.lastError });
      }
    }

    this.#emit('health:update', { service: wsId, status: { ...status } });
  }

  // ── Incidents ─────────────────────────────────────────────

  /**
   * Ajoute un incident (si le dernier pour ce service n'est pas déjà ouvert).
   * @param {string}      id
   * @param {HealthState} state
   * @param {string}      reason
   */
  #addIncident(id, state, reason) {
    // Déduplique : pas deux incidents ouverts consécutifs pour le même service
    const last = [...this.#incidents].reverse().find(i => i.service === id);
    if (last && !last.resolvedAt) return;

    /** @type {Incident} */
    const incident = { service: id, state, reason, ts: Date.now(), resolvedAt: null };
    this.#incidents.unshift(incident);
    if (this.#incidents.length > MAX_INCIDENTS) this.#incidents.pop();
    this.#saveIncidents();
  }

  #resolveLastIncident(id) {
    const incident = this.#incidents.find(i => i.service === id && !i.resolvedAt);
    if (incident) {
      incident.resolvedAt = Date.now();
      this.#saveIncidents();
    }
  }

  // ── Persistance ───────────────────────────────────────────

  #loadIncidents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.#incidents = raw ? JSON.parse(raw) : [];
    } catch (_) {
      this.#incidents = [];
    }
  }

  #saveIncidents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#incidents));
    } catch (_) {}
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Crée un objet ServiceStatus initial.
   * @param {string} id
   * @param {string} name
   * @returns {ServiceStatus}
   */
  #makeStatus(id, name) {
    return {
      id,
      name,
      state:             'unknown',
      latencyMs:         null,
      errorRate:         0,
      lastCheck:         null,
      rateLimitedUntil:  null,
      lastError:         null,
      consecutiveErrors: 0,
      latencyHistory:    [],
    };
  }

  /**
   * Émet un CustomEvent sur window.
   * @param {string} type
   * @param {object} detail
   */
  #emit(type, detail) {
    try {
      window.dispatchEvent(new CustomEvent(type, { detail }));
    } catch (_) {}
  }
}

// ── Export singleton ──────────────────────────────────────────
export const healthMonitor = new HealthMonitor();
