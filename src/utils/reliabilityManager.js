// ============================================================
//  src/utils/reliabilityManager.js — CrypView V3.8
//  Orchestrateur central de fiabilité.
//
//  Responsabilités :
//    1. Initialise et câble errorTracker + healthMonitor + resilientFetch
//    2. Gestion centralisée du quota / rate-limit global
//    3. Bubble des événements critiques vers l'UI (toast + dot statut)
//    4. Retry intelligent avec fallback multi-sources
//    5. Indicateur visuel de santé dans le header
//    6. API de debug exposée sur window.__crypview_reliability (dev)
//
//  Usage (boot) :
//    import { reliabilityManager } from '../utils/reliabilityManager.js';
//    reliabilityManager.init({ wsPool });   // appeler une seule fois
//
//  Usage courant :
//    reliabilityManager.isHealthy()         // boolean global
//    reliabilityManager.getSnapshot()       // état complet
//    reliabilityManager.reportFetchError(url, status)  // depuis binance.rest.js
// ============================================================

import { errorTracker }       from './errorTracker.js';
import { healthMonitor }      from './healthMonitor.js';
import { getFetchHealthSnapshot } from './resilientFetch.js';
import { showToast }          from './toast.js';
import { logger }             from './logger.js';

// ── Constantes ─────────────────────────────────────────────────

/** Intervalle de vérification de l'état global (ms) */
const GLOBAL_CHECK_INTERVAL = 15_000;

/** Nombre max d'erreurs critiques en 5 min avant alerte utilisateur */
const CRITICAL_ERROR_THRESHOLD = 3;

/** Délai minimal entre deux toasts de santé (ms) — évite le spam */
const HEALTH_TOAST_THROTTLE = 30_000;

/** ID de l'indicateur de santé dans le header */
const HEALTH_BADGE_ID = 'reliability-health-badge';

// ── Mapping état → couleur / libellé ────────────────────────────
const STATE_CONFIG = {
  healthy:     { color: 'var(--green)',  dot: '●', label: 'Tous les services opérationnels' },
  degraded:    { color: 'var(--yellow)', dot: '◐', label: 'Un service est dégradé'          },
  slow:        { color: '#ff9900',       dot: '◔', label: 'Latence élevée détectée'          },
  down:        { color: 'var(--red)',    dot: '○', label: 'Service hors ligne'               },
  ratelimited: { color: '#ff9900',       dot: '⊘', label: 'Rate limit actif'                 },
  unknown:     { color: 'var(--muted)',  dot: '·', label: 'Vérification en cours…'           },
};

// ══════════════════════════════════════════════════════════════
//  ReliabilityManager
// ══════════════════════════════════════════════════════════════

class ReliabilityManager {
  #initialized      = false;
  #globalState      = 'unknown';
  #checkTimer       = null;
  #lastHealthToast  = 0;

  // ── Résumé agrégé des états de service
  /** @type {Map<string, string>} serviceId → HealthState */
  #serviceStates    = new Map();

  // ── Init ───────────────────────────────────────────────────

  /**
   * Initialise tous les modules de fiabilité et les câble ensemble.
   * @param {{ wsPool?: import('../api/WSPool.js').WSPool }} [options]
   */
  init(options = {}) {
    if (this.#initialized) return;
    this.#initialized = true;

    // 1. Capture globale des erreurs JS
    errorTracker.init();
    errorTracker.onCritical = (entry) => this.#onCriticalError(entry);

    // 2. Surveillance des APIs
    if (options.wsPool) {
      healthMonitor.attachWsPool(options.wsPool);
    }
    healthMonitor.start();

    // 3. Abonnements aux événements de santé
    this.#bindHealthEvents();

    // 4. Abonnements aux événements circuit breaker / rate limit
    this.#bindFetchEvents();

    // 5. Vérification périodique de l'état global
    this.#checkTimer = setInterval(() => this.#checkGlobalState(), GLOBAL_CHECK_INTERVAL);

    // 6. Indicateur visuel dans le header
    this.#mountHealthBadge();

    // 7. Exposition debug en développement
    if (import.meta.env?.DEV) {
      window.__crypview_reliability = {
        snapshot:      () => this.getSnapshot(),
        errorLog:      () => errorTracker.getLogs(),
        errorExport:   () => errorTracker.exportJSON(),
        healthAll:     () => healthMonitor.getAll(),
        manager:       this,
      };
    }

    logger.info('[ReliabilityManager] Initialisé ✓');
  }

  // ── API publique ───────────────────────────────────────────

  /**
   * Retourne true si Binance REST et WS sont opérationnels.
   * @returns {boolean}
   */
  isHealthy() {
    return this.#globalState === 'healthy' || this.#globalState === 'unknown';
  }

  /**
   * Snapshot complet de l'état de fiabilité.
   * @returns {{
   *   globalState: string,
   *   services: Map<string, ServiceStatus>,
   *   fetchHealth: object,
   *   errorSummary: object,
   *   recentErrors: ErrorEntry[],
   * }}
   */
  getSnapshot() {
    return {
      globalState:   this.#globalState,
      services:      healthMonitor.getAll(),
      fetchHealth:   getFetchHealthSnapshot(),
      errorSummary:  errorTracker.summary(),
      recentErrors:  errorTracker.getRecent(30),
    };
  }

  /**
   * Signale une erreur de fetch depuis binance.rest.js ou autre module.
   * Alimente à la fois errorTracker et healthMonitor.
   *
   * @param {string} url
   * @param {number} status
   * @param {string} [message]
   */
  reportFetchError(url, status, message = '') {
    const serviceId = this.#urlToServiceId(url);

    errorTracker.warn(`Fetch ${status} sur ${url}`, { url, status });
    healthMonitor.recordExternal(serviceId, false, 0, `HTTP ${status}${message ? ' — ' + message : ''}`);

    // Émission de l'événement attendu par errorTracker.init()
    window.dispatchEvent(new CustomEvent('crypview:fetch:error', {
      detail: { url, status, message },
    }));
  }

  /**
   * Signale un succès de fetch (pour alimenter les métriques).
   * @param {string} url
   * @param {number} latencyMs
   */
  reportFetchSuccess(url, latencyMs = 0) {
    const serviceId = this.#urlToServiceId(url);
    healthMonitor.recordExternal(serviceId, true, latencyMs);
  }

  /**
   * Arrête proprement la surveillance (appelé sur beforeunload).
   */
  destroy() {
    if (this.#checkTimer !== null) {
      clearInterval(this.#checkTimer);
      this.#checkTimer = null;
    }
    healthMonitor.stop();
    document.getElementById(HEALTH_BADGE_ID)?.remove();
  }

  // ── Abonnements événements ────────────────────────────────

  #bindHealthEvents() {
    window.addEventListener('health:update', ({ detail }) => {
      this.#serviceStates.set(detail.service, detail.status?.state ?? 'unknown');
      this.#updateBadge();
    });

    window.addEventListener('health:degraded', ({ detail }) => {
      const service = detail.service;
      const cfg     = SERVICES_LABELS[service] ?? service;
      const now     = Date.now();

      if (now - this.#lastHealthToast > HEALTH_TOAST_THROTTLE) {
        this.#lastHealthToast = now;
        showToast(`⚠ ${cfg} dégradé — ${detail.reason ?? 'latence élevée'}`, 'warning', 6_000);
      }
    });

    window.addEventListener('health:restored', ({ detail }) => {
      const cfg = SERVICES_LABELS[detail.service] ?? detail.service;
      showToast(`✓ ${cfg} rétabli`, 'success', 3_000);
    });

    window.addEventListener('health:ratelimit', ({ detail }) => {
      const cfg = SERVICES_LABELS[detail.service] ?? detail.service;
      const secs = Math.ceil((detail.retryAfter - Date.now()) / 1_000);
      showToast(`⊘ ${cfg} rate-limité — pause ${secs}s`, 'warning', Math.min(secs * 1_000, 10_000));
    });
  }

  #bindFetchEvents() {
    window.addEventListener('crypview:fetch:circuit-open', ({ detail }) => {
      showToast(
        `⛔ Circuit ouvert pour «${detail.circuitId}» (${detail.failures} échecs) — fallback en cours`,
        'error', 8_000
      );
      errorTracker.error(`Circuit breaker ouvert: ${detail.circuitId}`, {
        failures:   detail.failures,
        cooldownMs: detail.cooldownMs,
      });
    });

    window.addEventListener('crypview:fetch:circuit-closed', ({ detail }) => {
      showToast(`✓ Circuit «${detail.circuitId}» rétabli`, 'success', 3_000);
      errorTracker.info(`Circuit breaker fermé: ${detail.circuitId}`);
    });

    window.addEventListener('crypview:fetch:rate-limited', ({ detail }) => {
      const secs = Math.ceil(detail.retryAfterMs / 1_000);
      showToast(`⊘ Rate limit (${detail.host}) — ${secs}s`, 'warning', 6_000);
    });

    window.addEventListener('crypview:fetch:fallback-used', ({ detail }) => {
      // Toast discret (info) — pas de bruit, juste une info
      logger.info(
        `[Fallback] ${detail.from} → ${detail.to} (${detail.reason})`,
        { attempt: detail.attempt }
      );
    });

    window.addEventListener('ws-status-changed', ({ detail }) => {
      if (detail.state === 'disconnected') {
        errorTracker.warn('WebSocket déconnecté', { reason: detail.reason });
      }
    });
  }

  // ── État global ────────────────────────────────────────────

  #checkGlobalState() {
    const statuses = healthMonitor.getAll();
    const states   = [...statuses.values()].map(s => s.state);

    let global = 'healthy';

    if (states.includes('down')) {
      // Si Binance REST est down → critique
      const binanceStatus = statuses.get('binance_rest')?.state;
      global = binanceStatus === 'down' ? 'down' : 'degraded';
    } else if (states.includes('ratelimited')) {
      global = 'ratelimited';
    } else if (states.includes('degraded')) {
      global = 'degraded';
    } else if (states.includes('slow')) {
      global = 'slow';
    } else if (states.every(s => s === 'unknown')) {
      global = 'unknown';
    }

    // Escalade si trop d'erreurs récentes
    const recentErrors = errorTracker.errorCountSince(5);
    if (recentErrors >= CRITICAL_ERROR_THRESHOLD && global === 'healthy') {
      global = 'degraded';
    }

    const changed = this.#globalState !== global;
    this.#globalState = global;

    if (changed) this.#updateBadge();
  }

  // ── Badge de santé dans le header ─────────────────────────

  #mountHealthBadge() {
    if (document.getElementById(HEALTH_BADGE_ID)) return;

    const badge = document.createElement('div');
    badge.id    = HEALTH_BADGE_ID;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.setAttribute('aria-label', 'Statut de santé des services');
    badge.style.cssText = `
      display:inline-flex; align-items:center; gap:5px;
      padding:2px 8px; border-radius:10px;
      font-family:'Space Mono',monospace; font-size:9px;
      cursor:pointer; transition:all .3s ease;
      border:1px solid rgba(255,255,255,.1);
      background:rgba(0,0,0,.2);
      flex-shrink:0; user-select:none;
    `;

    badge.addEventListener('click', () => this.#showHealthPanel());

    const statusEl = document.getElementById('status-text');
    if (statusEl) {
      statusEl.parentElement?.insertAdjacentElement('afterend', badge);
    } else {
      const header = document.querySelector('header');
      header?.appendChild(badge);
    }

    this.#updateBadge();
  }

  #updateBadge() {
    this.#checkGlobalState();

    const badge = document.getElementById(HEALTH_BADGE_ID);
    if (!badge) return;

    const cfg = STATE_CONFIG[this.#globalState] ?? STATE_CONFIG.unknown;

    badge.innerHTML = `
      <span style="color:${cfg.color};font-size:10px;">${cfg.dot}</span>
      <span style="color:${cfg.color};">${this.#globalStateLabel()}</span>
    `;
    badge.title = cfg.label;
    badge.style.borderColor = `${cfg.color}44`;
  }

  #globalStateLabel() {
    const labels = {
      healthy:     'Services OK',
      degraded:    'Dégradé',
      slow:        'Lent',
      down:        'Hors ligne',
      ratelimited: 'Rate limit',
      unknown:     'Vérif…',
    };
    return labels[this.#globalState] ?? this.#globalState;
  }

  // ── Panel de détail (clic sur le badge) ───────────────────

  #showHealthPanel() {
    const existing = document.getElementById('_cv_health_panel');
    if (existing) { existing.remove(); return; }

    const badge  = document.getElementById(HEALTH_BADGE_ID);
    const bRect  = badge?.getBoundingClientRect();
    const panel  = document.createElement('div');
    panel.id     = '_cv_health_panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Tableau de bord de santé');
    panel.style.cssText = `
      position:fixed;
      top:${(bRect?.bottom ?? 40) + 4}px;
      right:16px;
      z-index:50000;
      background:var(--panel,#0d1117);
      border:1px solid var(--border,#1c2333);
      border-radius:8px;
      padding:14px 16px;
      min-width:300px;
      max-width:380px;
      box-shadow:0 16px 48px rgba(0,0,0,.9);
      font-family:'Space Mono',monospace;
      font-size:10px;
    `;

    const statuses = healthMonitor.getAll();
    const fetchSnap = getFetchHealthSnapshot();
    const errSum   = errorTracker.summary();

    // ── En-tête
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:12px;color:var(--accent,#00ff88);">
          🩺 Santé des services
        </span>
        <button id="_cv_hp_close" style="background:none;border:none;color:var(--muted,#8b949e);
          cursor:pointer;font-size:14px;padding:0 4px;">✕</button>
      </div>

      ${this.#renderServiceRows(statuses)}

      ${fetchSnap.inFlightCount > 0
        ? `<div style="margin-top:8px;font-size:9px;color:var(--muted,#8b949e);">
             ⟳ ${fetchSnap.inFlightCount} requête(s) en cours
           </div>`
        : ''}

      <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border,#1c2333);
                  display:flex;gap:14px;font-size:9px;color:var(--muted,#8b949e);">
        <span>⚠ Warn: ${errSum.warn}</span>
        <span style="color:${errSum.error > 0 ? 'var(--red,#ff3d5a)' : 'inherit'}">
          ✗ Err: ${errSum.error + errSum.fatal}
        </span>
        <button id="_cv_hp_export"
          style="margin-left:auto;background:none;border:none;
                 color:var(--muted,#8b949e);cursor:pointer;font-size:9px;
                 font-family:'Space Mono',monospace;text-decoration:underline;">
          Exporter logs
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('_cv_hp_close')?.addEventListener('click', () => panel.remove());
    document.getElementById('_cv_hp_export')?.addEventListener('click', () => {
      const json = errorTracker.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `crypview_logs_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Fermeture au clic extérieur
    setTimeout(() => {
      document.addEventListener('click', function dismiss(e) {
        if (!panel.contains(e.target) && e.target !== badge) {
          panel.remove();
          document.removeEventListener('click', dismiss);
        }
      });
    }, 0);
  }

  #renderServiceRows(statuses) {
    if (!statuses.size) return '<div style="color:var(--muted,#8b949e)">Aucun service surveillé</div>';

    return [...statuses.entries()].map(([id, s]) => {
      const cfg    = STATE_CONFIG[s.state] ?? STATE_CONFIG.unknown;
      const lat    = s.latencyMs != null ? `${s.latencyMs}ms` : '—';
      const errPct = s.errorRate > 0 ? ` · ${(s.errorRate * 100).toFixed(0)}% err` : '';
      return `
        <div style="display:flex;align-items:center;gap:8px;
                    padding:5px 0;border-bottom:1px solid rgba(28,35,51,.5);">
          <span style="color:${cfg.color};font-size:12px;flex-shrink:0;">${cfg.dot}</span>
          <span style="flex:1;color:var(--text,#e6edf3);">${s.name}</span>
          <span style="color:var(--muted,#8b949e);font-size:9px;">${lat}${errPct}</span>
          <span style="color:${cfg.color};font-size:9px;flex-shrink:0;">${s.state}</span>
        </div>`;
    }).join('');
  }

  // ── Gestion des erreurs critiques ─────────────────────────

  /**
   * Appelé par errorTracker sur chaque erreur de niveau error/fatal.
   * @param {import('./errorTracker.js').ErrorEntry} entry
   */
  #onCriticalError(entry) {
    // Pas de toast pour les erreurs connues/bénignes
    const IGNORED_PATTERNS = [
      'ResizeObserver loop',
      'Script error',
      'Non-Error promise rejection',
      'AbortError',
    ];
    if (IGNORED_PATTERNS.some(p => entry.message.includes(p))) return;

    const recentCount = errorTracker.errorCountSince(5);
    if (recentCount === CRITICAL_ERROR_THRESHOLD) {
      // Seuil atteint → toast consolidé
      showToast(
        `⚠ ${recentCount} erreurs en 5 min — cliquez sur l'indicateur de santé pour les détails`,
        'error', 8_000
      );
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  /**
   * Déduit le serviceId Binance à partir d'une URL.
   * @param {string} url
   * @returns {string}
   */
  #urlToServiceId(url) {
    if (url.includes('fapi.binance'))  return 'binance_fapi';
    if (url.includes('binance'))       return 'binance_rest';
    if (url.includes('geckoterminal')) return 'geckoterminal';
    if (url.includes('bybit'))         return 'bybit_rest';
    if (url.includes('okx'))           return 'okx_rest';
    return 'unknown';
  }
}

// ── Labels lisibles pour les services ─────────────────────────
const SERVICES_LABELS = {
  binance_rest: 'Binance REST',
  binance_fapi: 'Binance FAPI',
  binance_ws:   'Binance WS',
  geckoterminal:'GeckoTerminal',
  bybit_rest:   'Bybit',
  okx_rest:     'OKX',
};

// ── Export singleton ──────────────────────────────────────────
export const reliabilityManager = new ReliabilityManager();
