// ============================================================
//  src/utils/format.i18n.js — CrypView i18n Part 3
//  Formatage localisé : prix, volumes, dates, pourcentages.
//
//  Remplace progressivement src/utils/format.js en s'appuyant
//  sur Intl.NumberFormat et Intl.DateTimeFormat selon la locale
//  active (détectée par i18n.js — Part 1 & 2).
//
//  API publique :
//    fmtPrice(p)               → prix selon la locale (ex: "67 234,56 $")
//    fmtVol(v)                 → volume compact (ex: "45,67 M")
//    fmtPct(pct)               → pourcentage signé (ex: "+2,45 %")
//    fmtPctChange(price, open) → variation 24h
//    fmtTime(ms)               → heure locale HH:MM:SS
//    fmtDate(ms, [opts])       → date locale configurable
//    fmtDateTime(ms)           → date + heure courte
//    fmtRelative(ms)           → "il y a 3 min" / "3 min ago"
//    fmtNumber(n, [opts])      → nombre brut via Intl
//
//  Intégration :
//    import { fmt } from './format.i18n.js';
//    fmt.price(67000)   → formaté selon la locale courante
//
//    Ou destructuration directe :
//    import { fmtPrice } from './format.i18n.js';
// ============================================================

// ── Récupération de la locale active ──────────────────────────
// On lit depuis le module i18n si disponible, sinon depuis le
// localStorage, sinon on tombe sur la locale du navigateur.
function getLocale() {
  try {
    // Tente d'importer depuis i18n (supporté seulement si déjà chargé
    // en tant que module ES — évite une dépendance circulaire)
    const stored = localStorage.getItem('crypview-locale');
    if (stored) {
      // Map clé i18n → BCP 47
      const LOCALE_MAP = {
        fr: 'fr-FR',
        en: 'en-US',
        zh: 'zh-CN',
        ar: 'ar-SA',
        de: 'de-DE',
        es: 'es-ES',
        pt: 'pt-BR',
        ja: 'ja-JP',
        ko: 'ko-KR',
        ru: 'ru-RU',
      };
      if (LOCALE_MAP[stored]) return LOCALE_MAP[stored];
      // Si c'est déjà un BCP-47 complet (ex: 'fr-FR')
      if (stored.includes('-')) return stored;
    }
  } catch (_) {}
  // Fallback : locale du navigateur
  return navigator.language ?? 'fr-FR';
}

// ── Cache des formateurs Intl ──────────────────────────────────
// On invalide le cache quand la locale change (événement i18n:change).
let _locale     = getLocale();
let _cache      = {};

function invalidateCache(newLocale) {
  _locale = newLocale ?? getLocale();
  _cache  = {};
}

// Écoute le changement de langue émis par i18n.js (Part 1 & 2)
window.addEventListener('i18n:locale:change', ({ detail }) => {
  if (detail?.locale) {
    // detail.locale est la clé courte (ex: 'fr'), on récupère le BCP-47
    const LOCALE_MAP = {
      fr: 'fr-FR', en: 'en-US', zh: 'zh-CN', ar: 'ar-SA',
      de: 'de-DE', es: 'es-ES', pt: 'pt-BR', ja: 'ja-JP',
      ko: 'ko-KR', ru: 'ru-RU',
    };
    invalidateCache(LOCALE_MAP[detail.locale] ?? detail.locale);
  }
});

// ── Fabrique de formateurs avec mise en cache ──────────────────
function getFormatter(key, factory) {
  const cacheKey = `${key}_${_locale}`;
  if (!_cache[cacheKey]) {
    _cache[cacheKey] = factory(_locale);
  }
  return _cache[cacheKey];
}

// ── Détection des capacités Intl ──────────────────────────────
const HAS_INTL_NUMBER   = typeof Intl?.NumberFormat === 'function';
const HAS_INTL_DATE     = typeof Intl?.DateTimeFormat === 'function';
const HAS_INTL_RELATIVE = typeof Intl?.RelativeTimeFormat === 'function';
const HAS_INTL_PLURAL   = typeof Intl?.PluralRules === 'function';

// ── Seuils pour fmtVol ────────────────────────────────────────
const THRESHOLDS = [
  { limit: 1e12, divisor: 1e9,  suffix: 'G' },  // giga (override par locale)
  { limit: 1e9,  divisor: 1e9,  suffix: 'B' },
  { limit: 1e6,  divisor: 1e6,  suffix: 'M' },
  { limit: 1e3,  divisor: 1e3,  suffix: 'K' },
];

// Suffixes par locale (depuis les fichiers de traduction)
const SUFFIXES_BY_LOCALE = {
  'fr-FR': { B: 'G',   M: 'M',   K: 'k'  },
  'ar-SA': { B: 'مليار', M: 'مليون', K: 'ألف' },
  'zh-CN': { B: '十亿',  M: '百万',   K: '千'  },
  'en-US': { B: 'B',   M: 'M',   K: 'K'  },
};

function getSuffix(key) {
  const map = SUFFIXES_BY_LOCALE[_locale]
    ?? SUFFIXES_BY_LOCALE[_locale.split('-')[0] + '-' + _locale.split('-')[1]]
    ?? SUFFIXES_BY_LOCALE['en-US'];
  return map[key] ?? key;
}

// ══════════════════════════════════════════════════════════════
//  fmtPrice — prix selon l'ordre de grandeur + locale
// ══════════════════════════════════════════════════════════════

/**
 * Formate un prix en tenant compte de la locale active.
 *
 * Règles (inchangées, mais rendu localisé) :
 *   ≥ 1000 → 2 décimales + séparateur de milliers
 *   ≥ 1    → 4 décimales
 *   < 1    → 6 décimales
 *
 * @param {number|string} p
 * @returns {string}
 */
export function fmtPrice(p) {
  p = parseFloat(p);
  if (!isFinite(p) || p === 0) return '—';

  if (!HAS_INTL_NUMBER) {
    // Fallback identique à l'ancien format.js
    if (p >= 1000) return p.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1)    return p.toFixed(4);
    return p.toFixed(6);
  }

  const abs = Math.abs(p);
  let fractionDigits;
  if (abs >= 1000)      fractionDigits = 2;
  else if (abs >= 1)    fractionDigits = 4;
  else if (abs >= 0.01) fractionDigits = 6;
  else                  fractionDigits = 8;

  return getFormatter(
    `price_${fractionDigits}`,
    (locale) => new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping:           abs >= 1000,
    })
  ).format(p);
}

// ══════════════════════════════════════════════════════════════
//  fmtVol — volume compact avec suffixe localisé
// ══════════════════════════════════════════════════════════════

/**
 * Formate un volume avec suffixe compact localisé.
 * Les suffixes (B/M/K ou G/M/k en FR, مليار/مليون/ألف en AR…)
 * proviennent de la locale active.
 *
 * @param {number|string} v
 * @returns {string}
 */
export function fmtVol(v) {
  v = parseFloat(v);
  if (!isFinite(v)) return '—';

  // Tentative via Intl.NumberFormat notation:"compact"
  if (HAS_INTL_NUMBER) {
    try {
      return getFormatter('vol_compact', (locale) =>
        new Intl.NumberFormat(locale, {
          notation:               'compact',
          compactDisplay:         'short',
          maximumFractionDigits:  2,
          minimumFractionDigits:  0,
        })
      ).format(v);
    } catch (_) {
      // Certains navigateurs anciens ne supportent pas 'compact' → fallback
    }
  }

  // Fallback manuel avec suffixes localisés
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + ' ' + getSuffix('B');
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + ' ' + getSuffix('M');
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + ' ' + getSuffix('K');
  return v.toFixed(2);
}

// ══════════════════════════════════════════════════════════════
//  fmtPct — pourcentage signé
// ══════════════════════════════════════════════════════════════

/**
 * Formate un pourcentage avec signe +/-.
 * @param {number} pct       — valeur brute (ex: 2.45 pour +2,45 %)
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function fmtPct(pct, decimals = 2) {
  if (!isFinite(pct)) return '—';

  if (HAS_INTL_NUMBER) {
    return getFormatter(`pct_${decimals}`, (locale) =>
      new Intl.NumberFormat(locale, {
        style:                  'percent',
        minimumFractionDigits:  decimals,
        maximumFractionDigits:  decimals,
        signDisplay:            'exceptZero',
      })
    ).format(pct / 100);
  }

  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)} %`;
}

// ══════════════════════════════════════════════════════════════
//  fmtPctChange — variation 24h
// ══════════════════════════════════════════════════════════════

/**
 * Calcule et formate la variation en pourcentage.
 * @param {number} price
 * @param {number} open24
 * @returns {string}
 */
export function fmtPctChange(price, open24) {
  if (!open24 || !price) return '—';
  return fmtPct((price - open24) / open24 * 100);
}

// ══════════════════════════════════════════════════════════════
//  fmtTime — heure locale HH:MM:SS
// ══════════════════════════════════════════════════════════════

/**
 * Formate un timestamp Unix (ms) en heure locale.
 * @param {number} ms
 * @returns {string}
 */
export function fmtTime(ms) {
  if (!ms) return '—';

  if (HAS_INTL_DATE) {
    return getFormatter('time_hms', (locale) =>
      new Intl.DateTimeFormat(locale, {
        hour:   '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: _isHour12(),
      })
    ).format(new Date(ms));
  }

  return new Date(ms).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ══════════════════════════════════════════════════════════════
//  fmtDate — date locale configurable
// ══════════════════════════════════════════════════════════════

/**
 * Formate un timestamp en date localisée.
 * @param {number} ms
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function fmtDate(ms, opts = {}) {
  if (!ms) return '—';

  const defaults = {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  };
  const options  = { ...defaults, ...opts };
  const cacheKey = `date_${JSON.stringify(options)}`;

  if (HAS_INTL_DATE) {
    return getFormatter(cacheKey, (locale) =>
      new Intl.DateTimeFormat(locale, options)
    ).format(new Date(ms));
  }

  return new Date(ms).toLocaleDateString('fr-FR', options);
}

// ══════════════════════════════════════════════════════════════
//  fmtDateTime — date + heure courte
// ══════════════════════════════════════════════════════════════

/**
 * Formate une date + heure (sans secondes).
 * Utilisé dans les tooltips, l'historique des alertes, etc.
 * @param {number} ms
 * @returns {string}
 */
export function fmtDateTime(ms) {
  if (!ms) return '—';

  if (HAS_INTL_DATE) {
    return getFormatter('datetime_short', (locale) =>
      new Intl.DateTimeFormat(locale, {
        day:    '2-digit',
        month:  '2-digit',
        hour:   '2-digit',
        minute: '2-digit',
        hour12: _isHour12(),
      })
    ).format(new Date(ms));
  }

  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    + ' '
    + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ══════════════════════════════════════════════════════════════
//  fmtRelative — "il y a 3 min" / "3 min ago"
// ══════════════════════════════════════════════════════════════

/**
 * Formate une durée relative depuis maintenant.
 * @param {number} ms — timestamp passé (ms)
 * @returns {string}
 */
export function fmtRelative(ms) {
  if (!ms) return '—';

  const diff   = ms - Date.now(); // négatif si passé
  const absDiff = Math.abs(diff);

  if (HAS_INTL_RELATIVE) {
    const rtf = getFormatter('relative', (locale) =>
      new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    );

    if (absDiff < 60_000)       return rtf.format(Math.round(diff / 1_000),   'seconds');
    if (absDiff < 3_600_000)    return rtf.format(Math.round(diff / 60_000),   'minutes');
    if (absDiff < 86_400_000)   return rtf.format(Math.round(diff / 3_600_000), 'hours');
    if (absDiff < 2_592_000_000) return rtf.format(Math.round(diff / 86_400_000), 'days');
    return rtf.format(Math.round(diff / 2_592_000_000), 'months');
  }

  // Fallback simplifié
  if (absDiff < 60_000)    return '< 1 min';
  if (absDiff < 3_600_000) return `${Math.round(absDiff / 60_000)} min`;
  if (absDiff < 86_400_000) return `${Math.round(absDiff / 3_600_000)} h`;
  return `${Math.round(absDiff / 86_400_000)} j`;
}

// ══════════════════════════════════════════════════════════════
//  fmtNumber — nombre brut via Intl
// ══════════════════════════════════════════════════════════════

/**
 * Formate un nombre quelconque avec Intl.NumberFormat.
 * @param {number}                       n
 * @param {Intl.NumberFormatOptions}     [opts]
 * @returns {string}
 */
export function fmtNumber(n, opts = {}) {
  if (!isFinite(n)) return '—';

  if (HAS_INTL_NUMBER) {
    const key = `num_${JSON.stringify(opts)}`;
    return getFormatter(key, (locale) =>
      new Intl.NumberFormat(locale, opts)
    ).format(n);
  }

  return n.toLocaleString('fr-FR', opts);
}

// ══════════════════════════════════════════════════════════════
//  fmtDuration — durée en ms → "1h 23m 04s"
// ══════════════════════════════════════════════════════════════

/**
 * Formate une durée en millisecondes en chaîne lisible.
 * Utilisé pour l'affichage des cooldowns d'alertes.
 * @param {number} ms
 * @returns {string}
 */
export function fmtDuration(ms) {
  if (!isFinite(ms) || ms < 0) return '—';

  const s = Math.floor(ms / 1_000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (d > 0)  return `${d}j ${h % 24}h`;
  if (h > 0)  return `${h}h ${String(m % 60).padStart(2, '0')}m`;
  if (m > 0)  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

// ══════════════════════════════════════════════════════════════
//  fmtCurrency — montant avec devise
// ══════════════════════════════════════════════════════════════

/**
 * Formate un montant avec symbole de devise.
 * @param {number} amount
 * @param {string} [currency='USD']
 * @returns {string}
 */
export function fmtCurrency(amount, currency = 'USD') {
  if (!isFinite(amount)) return '—';

  if (HAS_INTL_NUMBER) {
    try {
      return getFormatter(`currency_${currency}`, (locale) =>
        new Intl.NumberFormat(locale, {
          style:                  'currency',
          currency,
          minimumFractionDigits:  2,
          maximumFractionDigits:  2,
          notation:               Math.abs(amount) >= 1e6 ? 'compact' : 'standard',
        })
      ).format(amount);
    } catch (_) {
      // Devise inconnue → fallback
    }
  }

  return `${amount.toFixed(2)} ${currency}`;
}

// ══════════════════════════════════════════════════════════════
//  Helpers privés
// ══════════════════════════════════════════════════════════════

/**
 * Retourne true si la locale utilise le format 12h (AM/PM).
 * Principalement l'anglais américain.
 */
function _isHour12() {
  return _locale.startsWith('en-US') || _locale.startsWith('en-AU');
}

// ══════════════════════════════════════════════════════════════
//  Objet façade — permet l'import groupé : fmt.price(x)
// ══════════════════════════════════════════════════════════════

export const fmt = {
  price:     fmtPrice,
  vol:       fmtVol,
  pct:       fmtPct,
  pctChange: fmtPctChange,
  time:      fmtTime,
  date:      fmtDate,
  dateTime:  fmtDateTime,
  relative:  fmtRelative,
  number:    fmtNumber,
  duration:  fmtDuration,
  currency:  fmtCurrency,

  /** Retourne la locale BCP-47 courante */
  get locale() { return _locale; },

  /** Force une locale (tests, SSR) */
  setLocale(l) { invalidateCache(l); },
};

export default fmt;
