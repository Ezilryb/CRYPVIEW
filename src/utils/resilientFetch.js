// ============================================================
//  src/utils/resilientFetch.js — CrypView V3.8
//  Fetch avec retry exponentiel, circuit breaker, rate-limit
//  et fallback multi-sources.
//
//  Architecture :
//    CircuitBreaker   — évite de marteler un endpoint mort
//    RateLimitGuard   — respecte les 429 / Retry-After
//    InFlightCache    — déduplique les requêtes identiques en vol
//    resilientFetch() — orchestrateur principal (export public)
//    createBinanceFetch() — factory pré-configurée pour Binance
//
//  Usage basique :
//    import { resilientFetch } from '../utils/resilientFetch.js';
//    const res = await resilientFetch(url);
//    const data = await res.json();
//
//  Usage avancé (fallback Binance mirrors) :
//    import { createBinanceFetch } from '../utils/resilientFetch.js';
//    const res = await createBinanceFetch('/klines?symbol=BTCUSDT&interval=1m&limit=300');
//
//  Intégrations :
//    ✓ logger.js       — warn/error sur chaque échec
//    ✓ CustomEvent     — 'crypview:fetch:circuit-open'
//                        'crypview:fetch:rate-limited'
//                        'crypview:fetch:fallback-used'
//    ✓ localStorage    — persistance état circuit breaker entre rechargements
// ============================================================

import { logger } from './logger.js';

// ── Constantes globales ────────────────────────────────────────

/** Miroirs officiels Binance Spot REST (même API, différents hôtes). */
const BINANCE_MIRRORS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
];

/** Miroirs FAPI (Futures). */
const BINANCE_FAPI_MIRRORS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
];

/** Délai de base pour le retry (ms). Double à chaque tentative. */
const RETRY_BASE_MS    = 1_000;
const RETRY_MAX_MS     = 30_000;

/** Timeout réseau par défaut si aucun signal externe n'est fourni. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Clé localStorage pour persister les états des circuit breakers. */
const CIRCUIT_STORAGE_KEY = 'crypview_circuit_breakers_v1';

// ══════════════════════════════════════════════════════════════
//  1. CIRCUIT BREAKER
//  Empêche de spammer un endpoint qui ne répond plus.
//  États : CLOSED (normal) → OPEN (bloqué) → HALF_OPEN (test)
// ══════════════════════════════════════════════════════════════

const CIRCUIT_STATE = Object.freeze({
  CLOSED:    'closed',     // Tout va bien, requêtes normales
  OPEN:      'open',       // Trop d'échecs, fast-fail immédiat
  HALF_OPEN: 'half_open',  // Cooldown écoulé, on laisse passer un test
});

/** Seuil d'échecs consécutifs avant ouverture du circuit. */
const CIRCUIT_FAILURE_THRESHOLD = 5;

/** Durée d'ouverture avant passage en HALF_OPEN (ms). */
const CIRCUIT_COOLDOWN_MS = 30_000;

/**
 * Registre global des circuit breakers, un par `circuitId`.
 * Persisté partiellement en localStorage pour survivre aux rechargements.
 * @type {Map<string, CircuitBreakerState>}
 */
const _circuits = new Map();

/**
 * @typedef {object} CircuitBreakerState
 * @property {string} state         — CIRCUIT_STATE
 * @property {number} failures      — échecs consécutifs
 * @property {number} openedAt      — timestamp ms de la dernière ouverture
 * @property {number} successCount  — succès depuis le dernier HALF_OPEN
 */

/** Charge les états persistés depuis localStorage. */
function _loadCircuitStates() {
  try {
    const raw = localStorage.getItem(CIRCUIT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    for (const [id, state] of Object.entries(parsed)) {
      // On ne restaure que les circuits OPEN qui n'ont pas encore refroidi.
      if (state.state === CIRCUIT_STATE.OPEN &&
          Date.now() - state.openedAt < CIRCUIT_COOLDOWN_MS) {
        _circuits.set(id, state);
      }
    }
  } catch (_) {}
}

/** Persiste les circuits OPEN en localStorage (les autres sont éphémères). */
function _saveCircuitStates() {
  try {
    const toSave = {};
    for (const [id, state] of _circuits) {
      if (state.state !== CIRCUIT_STATE.CLOSED) toSave[id] = state;
    }
    localStorage.setItem(CIRCUIT_STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {}
}

/** Retourne (ou crée) l'état d'un circuit breaker. */
function _getCircuit(id) {
  if (!_circuits.has(id)) {
    _circuits.set(id, {
      state:        CIRCUIT_STATE.CLOSED,
      failures:     0,
      openedAt:     0,
      successCount: 0,
    });
  }
  return _circuits.get(id);
}

/**
 * Vérifie si le circuit autorise une nouvelle requête.
 * Gère la transition OPEN → HALF_OPEN automatiquement.
 *
 * @param {string} circuitId
 * @returns {boolean} true = autoriser la requête
 */
function circuitAllows(circuitId) {
  const c = _getCircuit(circuitId);

  if (c.state === CIRCUIT_STATE.CLOSED) return true;

  if (c.state === CIRCUIT_STATE.OPEN) {
    // Cooldown écoulé → on passe en test
    if (Date.now() - c.openedAt >= CIRCUIT_COOLDOWN_MS) {
      c.state = CIRCUIT_STATE.HALF_OPEN;
      c.successCount = 0;
      return true; // Laisse passer le test
    }
    return false; // Fast-fail
  }

  // HALF_OPEN : on laisse passer un seul test à la fois
  return true;
}

/**
 * Enregistre un succès — ferme le circuit si en HALF_OPEN.
 * @param {string} circuitId
 */
function circuitSuccess(circuitId) {
  const c = _getCircuit(circuitId);
  c.failures = 0;
  if (c.state !== CIRCUIT_STATE.CLOSED) {
    c.state = CIRCUIT_STATE.CLOSED;
    c.openedAt = 0;
    _saveCircuitStates();
    _emit('crypview:fetch:circuit-closed', { circuitId });
    logger.info(`[CircuitBreaker] «${circuitId}» fermé — service rétabli.`);
  }
}

/**
 * Enregistre un échec — ouvre le circuit si le seuil est atteint.
 * @param {string} circuitId
 * @param {Error|string} reason
 */
function circuitFailure(circuitId, reason) {
  const c = _getCircuit(circuitId);
  c.failures++;

  if (c.failures >= CIRCUIT_FAILURE_THRESHOLD &&
      c.state !== CIRCUIT_STATE.OPEN) {
    c.state    = CIRCUIT_STATE.OPEN;
    c.openedAt = Date.now();
    _saveCircuitStates();

    const msg = `[CircuitBreaker] «${circuitId}» OUVERT après ${c.failures} échecs. Pause ${CIRCUIT_COOLDOWN_MS / 1_000}s.`;
    logger.warn(msg);
    _emit('crypview:fetch:circuit-open', {
      circuitId,
      failures: c.failures,
      cooldownMs: CIRCUIT_COOLDOWN_MS,
    });
  }
}

/**
 * Retourne l'état lisible d'un circuit (pour le health monitor).
 * @param {string} circuitId
 * @returns {{ state: string, failures: number, openedAt: number }}
 */
export function getCircuitState(circuitId) {
  const c = _getCircuit(circuitId);
  return { state: c.state, failures: c.failures, openedAt: c.openedAt };
}

/**
 * Réinitialise manuellement un circuit (utile en tests / debug).
 * @param {string} circuitId
 */
export function resetCircuit(circuitId) {
  _circuits.delete(circuitId);
  _saveCircuitStates();
}

// ══════════════════════════════════════════════════════════════
//  2. RATE LIMIT GUARD
//  Gère les réponses 429 avec pause automatique via Retry-After.
//  File les requêtes en attente pendant le cooldown.
// ══════════════════════════════════════════════════════════════

/**
 * @typedef {object} RateLimitEntry
 * @property {number}   unlocksAt  — timestamp ms de fin du cooldown
 * @property {Promise}  drainPromise — promesse résolue à la fin du cooldown
 */

/** Map<host, RateLimitEntry> — un par hôte. */
const _rateLimits = new Map();

/**
 * Vérifie si un hôte est actuellement rate-limité.
 * @param {string} host
 * @returns {boolean}
 */
function isRateLimited(host) {
  const entry = _rateLimits.get(host);
  if (!entry) return false;
  if (Date.now() >= entry.unlocksAt) {
    _rateLimits.delete(host);
    return false;
  }
  return true;
}

/**
 * Attend la fin du rate-limit pour un hôte.
 * @param {string} host
 * @returns {Promise<void>}
 */
function waitForRateLimit(host) {
  const entry = _rateLimits.get(host);
  if (!entry) return Promise.resolve();
  return entry.drainPromise;
}

/**
 * Enregistre un rate-limit 429 pour un hôte.
 * @param {string} host
 * @param {Response} response
 * @param {number} [defaultDelayMs=60_000]
 */
function registerRateLimit(host, response, defaultDelayMs = 60_000) {
  const retryAfterHeader = response.headers?.get?.('Retry-After');
  let delayMs;

  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    delayMs = isNaN(seconds)
      ? new Date(retryAfterHeader).getTime() - Date.now()
      : seconds * 1_000;
    delayMs = Math.max(0, Math.min(delayMs, 300_000)); // cap 5 min
  } else {
    delayMs = defaultDelayMs;
  }

  const unlocksAt    = Date.now() + delayMs;
  const drainPromise = new Promise(resolve => setTimeout(resolve, delayMs));
  _rateLimits.set(host, { unlocksAt, drainPromise });

  const secs = Math.round(delayMs / 1_000);
  logger.warn(`[RateLimit] Hôte «${host}» rate-limité pour ${secs}s.`);
  _emit('crypview:fetch:rate-limited', { host, delayMs, unlocksAt });
}

/**
 * Retourne le temps restant de rate-limit en ms (0 si aucun).
 * @param {string} host
 * @returns {number}
 */
export function getRateLimitRemaining(host) {
  const entry = _rateLimits.get(host);
  if (!entry) return 0;
  return Math.max(0, entry.unlocksAt - Date.now());
}

// ══════════════════════════════════════════════════════════════
//  3. IN-FLIGHT CACHE (déduplication)
//  Si la même URL est déjà en cours de fetch, retourne la même
//  promesse plutôt que de lancer une deuxième requête réseau.
// ══════════════════════════════════════════════════════════════

/** Map<url, Promise<Response>> */
const _inFlight = new Map();

function _getInFlight(url) {
  return _inFlight.get(url) ?? null;
}

function _setInFlight(url, promise) {
  _inFlight.set(url, promise);
  // Nettoyage automatique quand la promesse se termine
  promise.finally(() => {
    if (_inFlight.get(url) === promise) _inFlight.delete(url);
  });
}

// ══════════════════════════════════════════════════════════════
//  4. HELPERS INTERNES
// ══════════════════════════════════════════════════════════════

/** Émet un CustomEvent sur window. */
function _emit(type, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  } catch (_) {}
}

/** Extrait le hostname d'une URL. */
function _hostname(url) {
  try { return new URL(url).hostname; } catch (_) { return url; }
}

/**
 * Délai avec jitter pour éviter les tempêtes de retries.
 * Formule : min(base × 2^attempt + rand(0..500ms), max)
 *
 * @param {number} attempt — 0-indexed
 * @param {number} baseMs
 * @param {number} maxMs
 * @returns {number} délai en ms
 */
function _backoffDelay(attempt, baseMs = RETRY_BASE_MS, maxMs = RETRY_MAX_MS) {
  const exp    = Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(maxMs, baseMs * exp + jitter);
}

/**
 * Crée un AbortSignal avec timeout.
 * Combine le signal externe (si fourni) avec le timeout interne.
 *
 * @param {number}        timeoutMs
 * @param {AbortSignal}   [externalSignal]
 * @returns {{ signal: AbortSignal, cleanup: () => void }}
 */
function _timedSignal(timeoutMs, externalSignal) {
  const controller = new AbortController();

  // Timeout interne
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`Timeout après ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  // Propagation depuis un signal externe (ex: page unload)
  const onExtAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener('abort', onExtAbort, { once: true });

  const cleanup = () => {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExtAbort);
  };

  return { signal: controller.signal, cleanup };
}

// ══════════════════════════════════════════════════════════════
//  5. RESILIENT FETCH — orchestrateur principal
// ══════════════════════════════════════════════════════════════

/**
 * @typedef {object} ResilientFetchOptions
 * @property {number}        [retries=3]         — tentatives après le premier échec
 * @property {number}        [timeoutMs=10000]    — timeout réseau par requête
 * @property {string[]}      [fallbacks=[]]       — URLs alternatives à essayer en cascade
 * @property {string}        [circuitId]          — ID du circuit breaker (défaut = hostname)
 * @property {boolean}       [deduplicate=true]   — déduplication des requêtes en vol
 * @property {AbortSignal}   [signal]             — signal d'annulation externe
 * @property {RequestInit}   [fetchOptions={}]    — options passées à fetch()
 * @property {function}      [onRetry]            — cb(attempt, error, nextUrl) avant chaque retry
 * @property {boolean}       [skipRateLimit=false] — bypass le garde rate-limit (tests uniquement)
 */

/**
 * Fetch résilient avec retry, circuit breaker, rate-limit et fallback.
 *
 * @param {string}               primaryUrl
 * @param {ResilientFetchOptions} [opts={}]
 * @returns {Promise<Response>}
 * @throws {Error} si toutes les tentatives et fallbacks ont échoué
 */
export async function resilientFetch(primaryUrl, opts = {}) {
  const {
    retries       = 3,
    timeoutMs     = DEFAULT_TIMEOUT_MS,
    fallbacks     = [],
    circuitId     = _hostname(primaryUrl),
    deduplicate   = true,
    signal: extSignal,
    fetchOptions  = {},
    onRetry,
    skipRateLimit = false,
  } = opts;

  // ── Déduplication ─────────────────────────────────────────
  if (deduplicate) {
    const existing = _getInFlight(primaryUrl);
    if (existing) return existing;
  }

  const promise = _doResilientFetch(
    primaryUrl, fallbacks, retries, timeoutMs,
    circuitId, extSignal, fetchOptions, onRetry, skipRateLimit
  );

  if (deduplicate) _setInFlight(primaryUrl, promise);
  return promise;
}

/**
 * Implémentation interne (séparée pour la déduplication).
 */
async function _doResilientFetch(
  primaryUrl, fallbacks, retries, timeoutMs,
  circuitId, extSignal, fetchOptions, onRetry, skipRateLimit
) {
  // Liste complète des URLs à essayer : primary + fallbacks
  const allUrls = [primaryUrl, ...fallbacks];
  let lastError  = null;
  let urlIndex   = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const url  = allUrls[Math.min(urlIndex, allUrls.length - 1)];
    const host = _hostname(url);

    // ── Circuit breaker — fast-fail ────────────────────────
    if (!circuitAllows(circuitId)) {
      const err = new Error(
        `[ResilientFetch] Circuit OUVERT pour «${circuitId}» — fast-fail.`
      );
      err.code = 'CIRCUIT_OPEN';
      // Essaie les fallbacks si disponibles
      if (urlIndex < allUrls.length - 1) {
        urlIndex++;
        attempt = Math.max(0, attempt - 1); // ne pas pénaliser le compteur
        continue;
      }
      throw err;
    }

    // ── Rate limit — attente ───────────────────────────────
    if (!skipRateLimit && isRateLimited(host)) {
      if (allUrls.length > 1 && urlIndex < allUrls.length - 1) {
        // Fallback disponible → on l'utilise plutôt qu'attendre
        urlIndex++;
        attempt = Math.max(0, attempt - 1);
        continue;
      }
      // Sinon on attend la fin du rate-limit
      await waitForRateLimit(host);
    }

    // ── Tentative de fetch ─────────────────────────────────
    const { signal, cleanup } = _timedSignal(timeoutMs, extSignal);

    try {
      const response = await fetch(url, { ...fetchOptions, signal });
      cleanup();

      // ── 429 Rate Limited ──────────────────────────────────
      if (response.status === 429) {
        registerRateLimit(host, response);
        circuitFailure(circuitId, `HTTP 429`);
        lastError = new Error(`HTTP 429 — rate limited sur ${host}`);
        lastError.status = 429;

        // Fallback si disponible
        if (urlIndex < allUrls.length - 1) {
          urlIndex++;
          _emit('crypview:fetch:fallback-used', { from: url, to: allUrls[urlIndex], reason: '429' });
          attempt = Math.max(0, attempt - 1);
          continue;
        }
        // Sinon attendre + retry
        await waitForRateLimit(host);
        continue;
      }

      // ── 5xx Erreur serveur ────────────────────────────────
      if (response.status >= 500) {
        circuitFailure(circuitId, `HTTP ${response.status}`);
        lastError = new Error(`HTTP ${response.status} sur ${url}`);
        lastError.status = response.status;
        throw lastError; // => catch ci-dessous => retry
      }

      // ── Réponse valide ────────────────────────────────────
      if (response.ok) {
        circuitSuccess(circuitId);
        return response;
      }

      // ── 4xx (hors 429) — pas de retry (erreur client) ────
      const err = new Error(`HTTP ${response.status} sur ${url}`);
      err.status = response.status;
      throw err;

    } catch (err) {
      cleanup();

      // Annulation externe → propager immédiatement
      if (err.name === 'AbortError' && extSignal?.aborted) throw err;

      // Timeout interne → logguer et retry/fallback
      const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
      circuitFailure(circuitId, isTimeout ? 'Timeout' : err.message);
      lastError = err;

      onRetry?.(attempt, err, allUrls[Math.min(urlIndex + 1, allUrls.length - 1)]);

      // Fallback vers URL suivante si disponible
      if (urlIndex < allUrls.length - 1) {
        urlIndex++;
        const nextUrl = allUrls[urlIndex];
        _emit('crypview:fetch:fallback-used', {
          from:   url,
          to:     nextUrl,
          reason: isTimeout ? 'timeout' : err.message,
          attempt,
        });
        logger.warn(
          `[ResilientFetch] Échec sur ${url} (${isTimeout ? 'timeout' : err.message}) → fallback ${nextUrl}`
        );
        attempt = Math.max(0, attempt - 1); // ne compte pas comme un retry
        continue;
      }

      // Plus de fallback → backoff avant le prochain retry
      if (attempt < retries) {
        const delay = _backoffDelay(attempt);
        logger.warn(
          `[ResilientFetch] Retry ${attempt + 1}/${retries} dans ${Math.round(delay)}ms (${err.message})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Toutes les tentatives épuisées
  const finalErr = lastError ?? new Error(`[ResilientFetch] Toutes les tentatives ont échoué pour ${primaryUrl}`);
  logger.error(`[ResilientFetch] ÉCHEC DÉFINITIF sur «${circuitId}»`, finalErr);
  throw finalErr;
}

// ══════════════════════════════════════════════════════════════
//  6. FACTORIES PRÉ-CONFIGURÉES
// ══════════════════════════════════════════════════════════════

/**
 * Fetch résilient pour l'API Binance Spot REST.
 * Essaie automatiquement api1, api2, api3 en cas d'échec.
 *
 * @param {string}               path    — ex: '/klines?symbol=BTCUSDT&interval=1m'
 * @param {ResilientFetchOptions} [opts]
 * @returns {Promise<Response>}
 *
 * @example
 *   const res = await createBinanceFetch('/klines?symbol=BTCUSDT&interval=1m&limit=300');
 *   const data = await res.json();
 */
export function createBinanceFetch(path, opts = {}) {
  const urls = BINANCE_MIRRORS.map(base => base + '/api/v3' + path);
  return resilientFetch(urls[0], {
    retries:    3,
    timeoutMs:  10_000,
    fallbacks:  urls.slice(1),
    circuitId:  'binance-rest',
    deduplicate: true,
    ...opts,
  });
}

/**
 * Fetch résilient pour l'API Binance Futures (FAPI).
 *
 * @param {string}               path    — ex: '/exchangeInfo'
 * @param {ResilientFetchOptions} [opts]
 * @returns {Promise<Response>}
 */
export function createBinanceFapiFetch(path, opts = {}) {
  const urls = BINANCE_FAPI_MIRRORS.map(base => base + '/fapi/v1' + path);
  return resilientFetch(urls[0], {
    retries:   2,
    timeoutMs: 8_000,
    fallbacks: urls.slice(1),
    circuitId: 'binance-fapi',
    ...opts,
  });
}

/**
 * Fetch résilient pour GeckoTerminal.
 * Pas de miroirs connus → retry simple avec backoff.
 *
 * @param {string}               url
 * @param {ResilientFetchOptions} [opts]
 * @returns {Promise<Response>}
 */
export function createGeckoFetch(url, opts = {}) {
  return resilientFetch(url, {
    retries:    2,
    timeoutMs:  8_000,
    circuitId:  'geckoterminal',
    deduplicate: true,
    fetchOptions: {
      headers: { Accept: 'application/json;version=20230302' },
    },
    ...opts,
  });
}

/**
 * Fetch résilient pour Bybit.
 *
 * @param {string}               url
 * @param {ResilientFetchOptions} [opts]
 * @returns {Promise<Response>}
 */
export function createBybitFetch(url, opts = {}) {
  return resilientFetch(url, {
    retries:   2,
    timeoutMs: 5_000,
    circuitId: 'bybit',
    fetchOptions: { signal: AbortSignal.timeout?.(5_000) },
    ...opts,
  });
}

/**
 * Fetch résilient pour OKX.
 *
 * @param {string}               url
 * @param {ResilientFetchOptions} [opts]
 * @returns {Promise<Response>}
 */
export function createOkxFetch(url, opts = {}) {
  return resilientFetch(url, {
    retries:   2,
    timeoutMs: 5_000,
    circuitId: 'okx',
    ...opts,
  });
}

// ══════════════════════════════════════════════════════════════
//  7. TABLEAU DE BORD — état global lisible (pour healthMonitor)
// ══════════════════════════════════════════════════════════════

/**
 * Retourne un snapshot complet de l'état de tous les circuits
 * et rate limits actifs.
 *
 * @returns {{
 *   circuits: Record<string, { state: string, failures: number, openedAt: number }>,
 *   rateLimits: Record<string, { unlocksAt: number, remainingMs: number }>,
 *   inFlightCount: number,
 * }}
 */
export function getFetchHealthSnapshot() {
  const circuits = {};
  for (const [id, state] of _circuits) {
    circuits[id] = {
      state:    state.state,
      failures: state.failures,
      openedAt: state.openedAt,
    };
  }

  const rateLimits = {};
  const now = Date.now();
  for (const [host, entry] of _rateLimits) {
    const remainingMs = Math.max(0, entry.unlocksAt - now);
    if (remainingMs > 0) {
      rateLimits[host] = { unlocksAt: entry.unlocksAt, remainingMs };
    }
  }

  return {
    circuits,
    rateLimits,
    inFlightCount: _inFlight.size,
  };
}

// ══════════════════════════════════════════════════════════════
//  8. PATCH GLOBAL — `binance.rest.js` drop-in replacement
//  Réexporte une version de `fetchKlines` utilisant les miroirs.
// ══════════════════════════════════════════════════════════════

/**
 * Remplacement résilient de fetchKlines (binance.rest.js).
 * Utilise createBinanceFetch avec les miroirs officiels.
 *
 * @param {string} symbol
 * @param {string} interval
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function fetchKlinesResilient(symbol, interval, limit) {
  const path = `/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  const res  = await createBinanceFetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error('Réponse vide');
  return data;
}

/**
 * Remplacement résilient de fetchAggTrades (binance.rest.js).
 *
 * @param {string} symbol
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} limit
 * @returns {Promise<any[]>}
 */
export async function fetchAggTradesResilient(symbol, startTime, endTime, limit = 1_000) {
  const path = `/aggTrades?symbol=${symbol.toUpperCase()}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
  const res  = await createBinanceFetch(path, { deduplicate: false });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ══════════════════════════════════════════════════════════════
//  INIT — charge les états persistés au démarrage du module
// ══════════════════════════════════════════════════════════════

_loadCircuitStates();
