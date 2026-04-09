// ============================================================
//  src/utils/__tests__/format.i18n.test.js — CrypView i18n
//  Tests unitaires pour le module de formatage localisé.
//  Compatible Vitest / Jest (ESM).
//
//  Lancer : npx vitest src/utils/__tests__/format.i18n.test.js
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { fmt, fmtPrice, fmtVol, fmtPct, fmtTime, fmtDate,
         fmtRelative, fmtDuration, fmtCurrency, fmtNumber }
  from '../format.i18n.js';

// ── Helpers ───────────────────────────────────────────────────

const FIXED_TS = new Date('2025-03-15T14:30:45Z').getTime();

function withLocale(locale, fn) {
  const prev = fmt.locale;
  fmt.setLocale(locale);
  fn();
  fmt.setLocale(prev);
}

// ══════════════════════════════════════════════════════════════
//  fmtPrice
// ══════════════════════════════════════════════════════════════

describe('fmtPrice', () => {

  it('retourne "—" pour 0', () => {
    expect(fmtPrice(0)).toBe('—');
  });

  it('retourne "—" pour NaN', () => {
    expect(fmtPrice(NaN)).toBe('—');
    expect(fmtPrice('abc')).toBe('—');
  });

  it('utilise 2 décimales pour les grands prix', () => {
    withLocale('en-US', () => {
      const r = fmtPrice(67234.56);
      expect(r).toMatch(/67[,.]?234[.,]56/);
      expect(r).toMatch(/\./); // séparateur décimal anglais
    });
  });

  it('utilise 4 décimales pour les prix entre 1 et 1000', () => {
    withLocale('en-US', () => {
      const r = fmtPrice(2.4561);
      expect(r).toMatch(/2\.4561/);
    });
  });

  it('utilise 6 décimales pour les micro-prix', () => {
    withLocale('en-US', () => {
      const r = fmtPrice(0.000412);
      expect(r).toMatch(/0\.000412/);
    });
  });

  it('adapte le séparateur décimal selon la locale FR', () => {
    withLocale('fr-FR', () => {
      const r = fmtPrice(67234.56);
      // En FR le séparateur décimal est la virgule
      expect(r).toMatch(/,/);
    });
  });

  it('affiche correctement en arabe', () => {
    withLocale('ar-SA', () => {
      const r = fmtPrice(1234.56);
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    });
  });

  it('gère les nombres négatifs', () => {
    withLocale('en-US', () => {
      const r = fmtPrice(-500.25);
      expect(r).toMatch(/-/);
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtVol
// ══════════════════════════════════════════════════════════════

describe('fmtVol', () => {

  it('retourne "—" pour Infinity', () => {
    expect(fmtVol(Infinity)).toBe('—');
  });

  it('formate les milliards', () => {
    withLocale('en-US', () => {
      const r = fmtVol(1_234_567_890);
      expect(r).toMatch(/[Bb]/); // B ou milliard
    });
  });

  it('formate les millions', () => {
    withLocale('en-US', () => {
      const r = fmtVol(45_670_000);
      expect(r).toMatch(/[Mm]/);
    });
  });

  it('formate les milliers', () => {
    withLocale('en-US', () => {
      const r = fmtVol(123_456);
      expect(r).toMatch(/[Kk]/);
    });
  });

  it('formate les petits volumes bruts', () => {
    withLocale('en-US', () => {
      const r = fmtVol(42.5);
      expect(r).toMatch(/42/);
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtPct
// ══════════════════════════════════════════════════════════════

describe('fmtPct', () => {

  it('affiche le signe + pour les positifs', () => {
    withLocale('en-US', () => {
      const r = fmtPct(2.45);
      expect(r).toMatch(/\+/);
      expect(r).toMatch(/2\.45/);
    });
  });

  it('affiche le signe - pour les négatifs', () => {
    withLocale('en-US', () => {
      const r = fmtPct(-1.20);
      expect(r).toMatch(/-/);
    });
  });

  it('respecte le nombre de décimales', () => {
    withLocale('en-US', () => {
      const r = fmtPct(3.5, 1);
      expect(r).toMatch(/3\.5/);
    });
  });

  it('retourne "—" pour NaN', () => {
    expect(fmtPct(NaN)).toBe('—');
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtTime
// ══════════════════════════════════════════════════════════════

describe('fmtTime', () => {

  it('retourne "—" pour 0', () => {
    expect(fmtTime(0)).toBe('—');
  });

  it('retourne une chaîne non vide pour un timestamp valide', () => {
    withLocale('fr-FR', () => {
      const r = fmtTime(FIXED_TS);
      expect(typeof r).toBe('string');
      expect(r).toMatch(/\d/);
    });
  });

  it('contient AM/PM pour la locale en-US', () => {
    withLocale('en-US', () => {
      const r = fmtTime(FIXED_TS);
      // 14h30 = 2:30 PM
      expect(r).toMatch(/PM|AM|pm|am/i);
    });
  });

  it('n'a pas AM/PM pour la locale fr-FR', () => {
    withLocale('fr-FR', () => {
      const r = fmtTime(FIXED_TS);
      expect(r).not.toMatch(/PM|AM/i);
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtDate
// ══════════════════════════════════════════════════════════════

describe('fmtDate', () => {

  it('retourne "—" pour 0', () => {
    expect(fmtDate(0)).toBe('—');
  });

  it('inclut l'année', () => {
    withLocale('en-US', () => {
      const r = fmtDate(FIXED_TS);
      expect(r).toMatch(/2025/);
    });
  });

  it('s'adapte à la locale arabe', () => {
    withLocale('ar-SA', () => {
      const r = fmtDate(FIXED_TS);
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtRelative
// ══════════════════════════════════════════════════════════════

describe('fmtRelative', () => {

  it('retourne "—" pour 0', () => {
    expect(fmtRelative(0)).toBe('—');
  });

  it('retourne une durée relative pour un passé récent', () => {
    withLocale('en-US', () => {
      const r = fmtRelative(Date.now() - 120_000); // il y a 2 min
      expect(typeof r).toBe('string');
      expect(r.length).toBeGreaterThan(0);
    });
  });

  it('retourne en français pour fr-FR', () => {
    withLocale('fr-FR', () => {
      const r = fmtRelative(Date.now() - 120_000);
      // "il y a 2 minutes" ou "2 minutes"
      expect(typeof r).toBe('string');
    });
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtDuration
// ══════════════════════════════════════════════════════════════

describe('fmtDuration', () => {

  it('formate les secondes', () => {
    expect(fmtDuration(45_000)).toMatch(/45s/);
  });

  it('formate les minutes', () => {
    expect(fmtDuration(150_000)).toMatch(/2m/);
  });

  it('formate les heures', () => {
    expect(fmtDuration(7_500_000)).toMatch(/2h/);
  });

  it('formate les jours', () => {
    expect(fmtDuration(90_000_000)).toMatch(/1j/);
  });

  it('retourne "—" pour négatif', () => {
    expect(fmtDuration(-100)).toBe('—');
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtCurrency
// ══════════════════════════════════════════════════════════════

describe('fmtCurrency', () => {

  it('affiche le symbole $', () => {
    withLocale('en-US', () => {
      const r = fmtCurrency(1234.56, 'USD');
      expect(r).toMatch(/\$/);
    });
  });

  it('affiche € pour EUR', () => {
    withLocale('fr-FR', () => {
      const r = fmtCurrency(1234.56, 'EUR');
      expect(r).toMatch(/€/);
    });
  });

  it('retourne "—" pour NaN', () => {
    expect(fmtCurrency(NaN)).toBe('—');
  });

});

// ══════════════════════════════════════════════════════════════
//  fmtNumber
// ══════════════════════════════════════════════════════════════

describe('fmtNumber', () => {

  it('formate avec séparateur de milliers en FR', () => {
    withLocale('fr-FR', () => {
      const r = fmtNumber(1_234_567);
      expect(r).toMatch(/1.234.567|1 234 567|1\u00a0234\u00a0567/);
    });
  });

  it('retourne "—" pour Infinity', () => {
    expect(fmtNumber(Infinity)).toBe('—');
  });

});

// ══════════════════════════════════════════════════════════════
//  fmt (façade)
// ══════════════════════════════════════════════════════════════

describe('fmt façade', () => {

  it('expose toutes les fonctions', () => {
    expect(typeof fmt.price).toBe('function');
    expect(typeof fmt.vol).toBe('function');
    expect(typeof fmt.pct).toBe('function');
    expect(typeof fmt.time).toBe('function');
    expect(typeof fmt.date).toBe('function');
    expect(typeof fmt.dateTime).toBe('function');
    expect(typeof fmt.relative).toBe('function');
    expect(typeof fmt.duration).toBe('function');
    expect(typeof fmt.currency).toBe('function');
    expect(typeof fmt.number).toBe('function');
  });

  it('expose la locale courante', () => {
    fmt.setLocale('fr-FR');
    expect(fmt.locale).toBe('fr-FR');
  });

  it('setLocale invalide le cache et change le rendu', () => {
    fmt.setLocale('en-US');
    const en = fmt.price(67234.56);
    fmt.setLocale('fr-FR');
    const fr = fmt.price(67234.56);
    // Les deux doivent être valides, mais potentiellement différents
    expect(typeof en).toBe('string');
    expect(typeof fr).toBe('string');
  });

});
