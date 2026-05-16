// ============================================================
//  src/utils/errorTracker.js — CrypView V3.8
//  Capture centralisée des erreurs avec log persistant rotatif.
//
//  Fonctionnalités :
//    ✓ Capture window.onerror + unhandledrejection
//    ✓ Log rotatif localStorage (MAX_ENTRIES entrées)
//    ✓ Déduplication sur 60s (évite le spam)
//    ✓ Niveaux : fatal / error / warn / info
//    ✓ Contexte enrichi (url, tf, indicateurs actifs…)
//    ✓ Export JSON pour debug
//    ✓ Hook onCritical pour alerter l'UI
//
//  Usage :
//    import { errorTracker } from './errorTracker.js';
//    errorTracker.init();
//    errorTracker.capture('error', 'Fetch échoué', { url, status });
//    const logs = errorTracker.getLogs();
//    errorTracker.onCritical = (entry) => showToast(entry.message, 'error');
// ============================================================

const STORAGE_KEY  = 'crypview_error_log_v1';
const MAX_ENTRIES  = 200;
const DEDUP_WINDOW = 60_000; // ms — même erreur ignorée dans cette fenêtre

/** @typedef {'fatal'|'error'|'warn'|'info'} ErrorLevel */

/**
 * @typedef {object} ErrorEntry
 * @property {string}      id
 * @property {ErrorLevel}  level
 * @property {string}      message
 * @property {string}      [source]     — fichier/module source
 * @property {object}      [context]    — données arbitraires
 * @property {string}      [stack]
 * @property {number}      timestamp
 * @property {number}      count        — nb d'occurrences dédupliquées
 */

class ErrorTracker {
  /** @type {ErrorEntry[]} */
  #log        = [];
  /** Map<fingerprint, timestamp> pour déduplication */
  #recent     = new Map();
  #initialized = false;

  /** Appelé sur chaque entrée de niveau fatal ou error. */
  onCritical = null;

  // ── Init ──────────────────────────────────────────────────

  /**
   * Active la capture globale.
   * À appeler une seule fois au boot, avant tout autre code.
   */
  init() {
    if (this.#initialized) return;
    this.#initialized = true;
    this.#load();

    // Erreurs JS non catchées
    window.addEventListener('error', (e) => {
      this.capture('error', e.message ?? 'Unknown error', {
        source: e.filename ?? '',
        line:   e.lineno,
        col:    e.colno,
      }, e.error?.stack);
    });

    // Promesses rejetées sans catch
    window.addEventListener('unhandledrejection', (e) => {
      const msg = e.reason?.message ?? String(e.reason ?? 'Unhandled rejection');
      this.capture('error', msg, {
        source: 'unhandledrejection',
      }, e.reason?.stack);
    });

    // Erreurs réseau (fetch échouées dans d'autres modules)
    window.addEventListener('crypview:fetch:error', ({ detail }) => {
      this.capture('warn', detail.message ?? 'Fetch error', {
        url:    detail.url,
        status: detail.status,
      });
    });
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Enregistre une entrée d'erreur.
   * @param {ErrorLevel} level
   * @param {string}     message
   * @param {object}     [context]
   * @param {string}     [stack]
   */
  capture(level, message, context = {}, stack = '') {
    const fingerprint = `${level}::${message}`;
    const now         = Date.now();

    // Déduplication
    const lastSeen = this.#recent.get(fingerprint);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW) {
      // Incrémente le compteur de l'entrée existante
      const existing = this.#log.findLast(e => e.message === message && e.level === level);
      if (existing) { existing.count++; this.#save(); }
      return;
    }
    this.#recent.set(fingerprint, now);

    // Nettoyage du cache de déduplication (évite une fuite mémoire)
    if (this.#recent.size > 500) {
      const cutoff = now - DEDUP_WINDOW * 2;
      for (const [k, ts] of this.#recent) {
        if (ts < cutoff) this.#recent.delete(k);
      }
    }

    /** @type {ErrorEntry} */
    const entry = {
      id:        `${now}_${Math.random().toString(36).slice(2, 7)}`,
      level,
      message:   String(message).slice(0, 500),
      source:    context.source ?? '',
      context:   this.#sanitizeContext(context),
      stack:     stack ? String(stack).slice(0, 1000) : '',
      timestamp: now,
      count:     1,
    };

    this.#log.push(entry);

    // Rotation : garde seulement les MAX_ENTRIES plus récentes
    if (this.#log.length > MAX_ENTRIES) {
      this.#log = this.#log.slice(-MAX_ENTRIES);
    }

    this.#save();

    // Notification de l'UI sur erreurs critiques
    if ((level === 'fatal' || level === 'error') && typeof this.onCritical === 'function') {
      try { this.onCritical(entry); } catch (_) {}
    }
  }

  /** Raccourcis de niveau */
  fatal(message, context, stack) { this.capture('fatal', message, context, stack); }
  error(message, context, stack) { this.capture('error', message, context, stack); }
  warn(message,  context)        { this.capture('warn',  message, context); }
  info(message,  context)        { this.capture('info',  message, context); }

  // ── Consultation ──────────────────────────────────────────

  /** @returns {ErrorEntry[]} copie des logs (plus récent en dernier) */
  getLogs(level = null) {
    return level
      ? [...this.#log].filter(e => e.level === level)
      : [...this.#log];
  }

  /** @returns {ErrorEntry[]} erreurs des N dernières minutes */
  getRecent(minutes = 60) {
    const cutoff = Date.now() - minutes * 60_000;
    return this.#log.filter(e => e.timestamp > cutoff);
  }

  /** @returns {number} nombre d'erreurs (non-warn) depuis `minutes` minutes */
  errorCountSince(minutes = 5) {
    const cutoff = Date.now() - minutes * 60_000;
    return this.#log.filter(e =>
      e.timestamp > cutoff &&
      (e.level === 'error' || e.level === 'fatal')
    ).length;
  }

  /** Vide le log */
  clear() {
    this.#log = [];
    this.#recent.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /**
   * Exporte le log complet en JSON (pour copier-coller en support).
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      userAgent:  navigator.userAgent,
      url:        location.href,
      entries:    this.#log,
    }, null, 2);
  }

  /** @returns {{ fatal: number, error: number, warn: number, info: number }} */
  summary() {
    const counts = { fatal: 0, error: 0, warn: 0, info: 0 };
    for (const e of this.#log) counts[e.level] = (counts[e.level] ?? 0) + 1;
    return counts;
  }

  // ── Persistance ───────────────────────────────────────────

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.#log = JSON.parse(raw);
    } catch (_) { this.#log = []; }
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#log));
    } catch (_) {
      // Quota dépassé : on sacrifie la moitié des entrées
      this.#log = this.#log.slice(-Math.floor(MAX_ENTRIES / 2));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#log)); } catch (_) {}
    }
  }

  #sanitizeContext(ctx) {
    // Évite de stocker des données trop volumineuses ou sensibles
    const safe = {};
    for (const [k, v] of Object.entries(ctx ?? {})) {
      if (k === 'source') continue;   // stocké séparément
      if (typeof v === 'function')    continue;
      if (typeof v === 'object' && v !== null) {
        try { safe[k] = JSON.parse(JSON.stringify(v)); } catch (_) { safe[k] = String(v); }
      } else {
        safe[k] = v;
      }
    }
    return safe;
  }
}

// ── Singleton exporté ─────────────────────────────────────────
export const errorTracker = new ErrorTracker();
