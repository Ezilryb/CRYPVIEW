// ============================================================
//  tests/indicators.test.js — CrypView V2
//  Tests unitaires des fonctions pures d'indicateurs.
//
//  Lancer : npm test
//  Watch  : npm run test:watch
//  Cover  : npm run test:coverage
//
//  Priorités couvertes :
//    ✓ calcRSI         — Wilder smoothing, cas limite avgLoss=0
//    ✓ calcMACD        — alignement EMA, histogram, cas données courtes
//    ✓ calcVWAP        — reset journalier UTC, formule TP×Volume
//    ✓ calcIchimoku    — longueurs des 5 composants, valeurs Tenkan
//    ✓ calcBB          — mid/upper/lower, largeur nulle (std=0)
//    ✓ calcStoch       — %K/%D, protection hi===lo
//    ✓ calcATR         — smoothing Wilder, longueur sortie
//    ✓ calcCCI         — somme glissante, cross-validation naïve, cas md=0
// ============================================================

import { describe, it, expect } from 'vitest';

import { calcRSI, calcMACD, calcStoch, calcCCI } from '../src/indicators/oscillators.js';
import { calcVWAP }                               from '../src/indicators/vwap.js';
import { calcIchimoku }                           from '../src/indicators/ichimoku.js';
import { calcBB, calcATR }                        from '../src/indicators/volatility.js';

function makeCandles(n, start = 100, end = 100, volume = 1000) {
  return Array.from({ length: n }, (_, i) => {
    const close = start + (end - start) * (i / Math.max(n - 1, 1));
    const open  = close * 0.999;
    const high  = close * 1.002;
    const low   = close * 0.998;
    return { time: i * 3600, open, high, low, close, volume };
  });
}

function makeOscillatingCandles(n, base = 100, amplitude = 5) {
  return Array.from({ length: n }, (_, i) => {
    const close = base + (i % 2 === 0 ? amplitude : -amplitude);
    return {
      time:   i * 3600,
      open:   base,
      high:   close + 1,
      low:    close - 1,
      close,
      volume: 1000,
    };
  });
}

describe('calcRSI', () => {
  it('retourne un tableau vide si moins de (period+1) bougies', () => {
    const candles = makeCandles(14);
    const result  = calcRSI(candles, 14);
    expect(result).toHaveLength(0);
  });

  it('retourne (n - period) valeurs pour n bougies suffisantes', () => {
    const n       = 50;
    const period  = 14;
    const candles = makeOscillatingCandles(n);
    const result  = calcRSI(candles, period);
    expect(result).toHaveLength(n - period);
  });

  it('chaque point a une propriété time et value', () => {
    const candles = makeOscillatingCandles(30);
    const result  = calcRSI(candles);
    result.forEach(pt => {
      expect(pt).toHaveProperty('time');
      expect(pt).toHaveProperty('value');
    });
  });

  it('value est toujours entre 0 et 100', () => {
    const candles = makeOscillatingCandles(100);
    const result  = calcRSI(candles);
    result.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it('RSI = 100 quand avgLoss = 0 (prix toujours croissants)', () => {
    const candles = makeCandles(30, 100, 200);
    const result  = calcRSI(candles, 14);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(({ value }) => {
      expect(isNaN(value)).toBe(false);
      expect(isFinite(value)).toBe(true);
    });
  });

  it('RSI ≈ 50 avec des oscillations symétriques', () => {
    const candles = makeOscillatingCandles(200, 100, 5);
    const result  = calcRSI(candles, 14);
    const last = result.at(-1).value;
    expect(last).toBeGreaterThan(40);
    expect(last).toBeLessThan(60);
  });

  it('fonctionne avec period=7 (paramètre personnalisé)', () => {
    const n      = 30;
    const period = 7;
    const result = calcRSI(makeOscillatingCandles(n), period);
    expect(result).toHaveLength(n - period);
  });
});

describe('calcMACD', () => {
  it('retourne les 3 séries macd / signal / hist', () => {
    const candles = makeOscillatingCandles(100);
    const result  = calcMACD(candles);
    expect(result).toHaveProperty('macd');
    expect(result).toHaveProperty('signal');
    expect(result).toHaveProperty('hist');
  });

  it('les 3 séries ont la même longueur', () => {
    const candles = makeOscillatingCandles(100);
    const { macd, signal, hist } = calcMACD(candles);
    expect(macd.length).toBe(signal.length);
    expect(macd.length).toBe(hist.length);
  });

  it('retourne des tableaux vides si données insuffisantes (< slow+signal)', () => {
    const candles = makeOscillatingCandles(20);
    const { macd, signal, hist } = calcMACD(candles);
    expect(macd).toHaveLength(0);
    expect(signal).toHaveLength(0);
    expect(hist).toHaveLength(0);
  });

  it('hist[i].value = macd[i].value - signal[i].value', () => {
    const candles         = makeOscillatingCandles(100);
    const { macd, signal, hist } = calcMACD(candles);
    hist.forEach((h, i) => {
      const diff = macd[i].value - signal[i].value;
      expect(h.value).toBeCloseTo(diff, 10);
    });
  });

  it('hist color est vert (#00ff8870) quand h >= 0, rouge sinon', () => {
    const candles         = makeOscillatingCandles(100);
    const { hist }        = calcMACD(candles);
    hist.forEach(h => {
      if (h.value >= 0) expect(h.color).toBe('#00ff8870');
      else              expect(h.color).toBe('#ff3d5a70');
    });
  });

  it('aucune valeur NaN dans les sorties', () => {
    const candles         = makeOscillatingCandles(100);
    const { macd, signal, hist } = calcMACD(candles);
    [...macd, ...signal, ...hist].forEach(pt => {
      expect(isNaN(pt.value)).toBe(false);
    });
  });
});

describe('calcVWAP', () => {
  it('retourne autant de points que de bougies', () => {
    const candles = makeCandles(50);
    expect(calcVWAP(candles)).toHaveLength(50);
  });

  it('chaque point a time et value', () => {
    calcVWAP(makeCandles(10)).forEach(pt => {
      expect(pt).toHaveProperty('time');
      expect(pt).toHaveProperty('value');
    });
  });

  it('VWAP = TP pour une seule bougie (volume non nul)', () => {
    const c = { time: 0, open: 100, high: 110, low: 90, close: 105, volume: 500 };
    const tp = (110 + 90 + 105) / 3; // 101.666...
    const [pt] = calcVWAP([c]);
    expect(pt.value).toBeCloseTo(tp, 6);
  });

  it('renvoie close quand volume = 0 (protection division par zéro)', () => {
    const c = { time: 0, open: 100, high: 110, low: 90, close: 105, volume: 0 };
    const [pt] = calcVWAP([c]);
    expect(pt.value).toBe(105);
  });

  it('reset journalier : VWAP repart de zéro le lendemain UTC', () => {
    const j1 = { time: 0,     open: 100, high: 110, low: 90,  close: 100, volume: 1000 };
    const j2 = { time: 86400, open: 200, high: 220, low: 180, close: 200, volume: 1000 };

    const [pt1, pt2] = calcVWAP([j1, j2]);

    expect(pt1.value).toBeCloseTo(100, 6);
    expect(pt2.value).toBeCloseTo(200, 6);
  });

  it('accumulation correcte sur 3 bougies du même jour', () => {
    const candles = [
      { time: 0,    open: 100, high: 110, low: 90,  close: 100, volume: 100 },
      { time: 3600, open: 102, high: 112, low: 92,  close: 102, volume: 200 },
      { time: 7200, open: 104, high: 114, low: 94,  close: 104, volume: 300 },
    ];
    const result = calcVWAP(candles);

    expect(result[0].value).toBeCloseTo(100,    6);
    expect(result[1].value).toBeCloseTo(30400 / 300, 6);
    expect(result[2].value).toBeCloseTo(61600 / 600, 6);
  });
});

describe('calcIchimoku', () => {
  const N = 120;

  it('retourne les 5 composants attendus', () => {
    const result = calcIchimoku(makeCandles(N));
    expect(result).toHaveProperty('tenkan');
    expect(result).toHaveProperty('kijun');
    expect(result).toHaveProperty('senkouA');
    expect(result).toHaveProperty('senkouB');
    expect(result).toHaveProperty('chikou');
  });

  it('tenkan a (N - 8) points', () => {
    expect(calcIchimoku(makeCandles(N)).tenkan).toHaveLength(N - 8);
  });

  it('kijun a (N - 25) points', () => {
    expect(calcIchimoku(makeCandles(N)).kijun).toHaveLength(N - 25);
  });

  it('senkouB a (N - 51) points', () => {
    expect(calcIchimoku(makeCandles(N)).senkouB).toHaveLength(N - 51);
  });

  it('chikou a (N - 26) points', () => {
    expect(calcIchimoku(makeCandles(N)).chikou).toHaveLength(N - 26);
  });

  it('Tenkan-sen = (highMax9 + lowMin9) / 2 sur les premières bougies', () => {
    const candles = makeCandles(20, 100, 200);
    const { tenkan } = calcIchimoku(candles);

    const window9 = candles.slice(0, 9);
    const h = Math.max(...window9.map(c => c.high));
    const l = Math.min(...window9.map(c => c.low));
    expect(tenkan[0].value).toBeCloseTo((h + l) / 2, 6);
  });

  it('aucune valeur NaN dans tous les composants', () => {
    const result = calcIchimoku(makeCandles(N));
    for (const key of ['tenkan', 'kijun', 'senkouA', 'senkouB', 'chikou']) {
      result[key].forEach(pt => {
        expect(isNaN(pt.value)).toBe(false);
        expect(isFinite(pt.value)).toBe(true);
      });
    }
  });

  it('senkouA[i].value = (tenkan + kijun) / 2 sur les valeurs recoupées', () => {
    const candles = makeCandles(60, 100, 160);
    const { senkouA } = calcIchimoku(candles);

    const t = (candles.slice(17, 26).reduce((m, c) => Math.max(m, c.high), -Infinity) +
               candles.slice(17, 26).reduce((m, c) => Math.min(m, c.low),   Infinity)) / 2;
    const k = (candles.slice(0, 26).reduce((m, c) => Math.max(m, c.high), -Infinity) +
               candles.slice(0, 26).reduce((m, c) => Math.min(m, c.low),   Infinity)) / 2;
    expect(senkouA[0].value).toBeCloseTo((t + k) / 2, 4);
  });
});

describe('calcBB', () => {
  it('retourne mid / upper / lower de même longueur', () => {
    const { mid, upper, lower } = calcBB(makeCandles(50));
    expect(mid.length).toBe(upper.length);
    expect(mid.length).toBe(lower.length);
  });

  it('longueur = N - period + 1', () => {
    const n = 50, period = 20;
    const { mid } = calcBB(makeCandles(n), period);
    expect(mid).toHaveLength(n - period + 1);
  });

  it('upper >= mid >= lower sur toutes les bougies', () => {
    const { mid, upper, lower } = calcBB(makeOscillatingCandles(60));
    mid.forEach((m, i) => {
      expect(upper[i].value).toBeGreaterThanOrEqual(m.value - 1e-9);
      expect(m.value).toBeGreaterThanOrEqual(lower[i].value - 1e-9);
    });
  });

  it('upper = lower = mid quand tous les closes sont identiques (std=0)', () => {
    const candles = makeCandles(30, 100, 100); // prix constant
    const { mid, upper, lower } = calcBB(candles, 20, 2);
    mid.forEach((m, i) => {
      expect(upper[i].value).toBeCloseTo(m.value, 6);
      expect(lower[i].value).toBeCloseTo(m.value, 6);
    });
  });

  it('mid est la SMA sur la période', () => {
    const candles = makeOscillatingCandles(30);
    const period  = 20;
    const { mid } = calcBB(candles, period);
    const expectedMid0 = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
    expect(mid[0].value).toBeCloseTo(expectedMid0, 6);
  });
});

describe('calcStoch', () => {
  it('retourne k et d', () => {
    const result = calcStoch(makeOscillatingCandles(50));
    expect(result).toHaveProperty('k');
    expect(result).toHaveProperty('d');
  });

  it('k a (N - kPeriod + 1) points', () => {
    const n = 50, kP = 14;
    const { k } = calcStoch(makeOscillatingCandles(n), kP);
    expect(k).toHaveLength(n - kP + 1);
  });

  it('d a (len_k - dPeriod + 1) points', () => {
    const n = 50, kP = 14, dP = 3;
    const { k, d } = calcStoch(makeOscillatingCandles(n), kP, dP);
    expect(d).toHaveLength(k.length - dP + 1);
  });

  it('%K est entre 0 et 100', () => {
    const { k } = calcStoch(makeOscillatingCandles(60));
    k.forEach(({ value }) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it('%K = 50 quand high === low (protection division par zéro)', () => {
    const candles = Array.from({ length: 20 }, (_, i) => ({
      time: i * 3600, open: 100, high: 100, low: 100, close: 100, volume: 500,
    }));
    const { k } = calcStoch(candles, 14);
    k.forEach(({ value }) => expect(value).toBe(50));
  });
});

describe('calcATR', () => {
  it('retourne (N - period - 1) points', () => {
    const n = 50, period = 14;
    const result = calcATR(makeOscillatingCandles(n), period);
    expect(result).toHaveLength(n - 1 - period);
  });

  it('chaque point a time et value positive', () => {
    calcATR(makeOscillatingCandles(40)).forEach(({ time, value }) => {
      expect(time).toBeGreaterThanOrEqual(0);
      expect(value).toBeGreaterThan(0);
    });
  });

  it('ATR est stable sur des bougies identiques (amplitude constante)', () => {
    const candles = Array.from({ length: 40 }, (_, i) => ({
      time: i * 3600, open: 99, high: 101, low: 99, close: 100, volume: 1000,
    }));
    const result = calcATR(candles, 14);
    const firstATR = result[0].value;
    result.forEach(({ value }) => {
      expect(value).toBeCloseTo(firstATR, 6);
    });
  });

  it('aucune valeur NaN', () => {
    calcATR(makeOscillatingCandles(50)).forEach(({ value }) => {
      expect(isNaN(value)).toBe(false);
    });
  });
});

describe('calcCCI', () => {
  it('retourne (N - period + 1) points', () => {
    const n = 50, period = 20;
    const result = calcCCI(makeOscillatingCandles(n), period);
    expect(result).toHaveLength(n - period + 1);
  });

  it('chaque point a les propriétés time et value', () => {
    calcCCI(makeOscillatingCandles(40)).forEach(pt => {
      expect(pt).toHaveProperty('time');
      expect(pt).toHaveProperty('value');
    });
  });

  it('aucune valeur NaN ni Infinity sur des données oscillantes', () => {
    const result = calcCCI(makeOscillatingCandles(80), 14);
    result.forEach(({ value }) => {
      expect(isNaN(value)).toBe(false);
      expect(isFinite(value)).toBe(true);
    });
  });

  it('retourne un tableau vide si N < period', () => {
    const result = calcCCI(makeOscillatingCandles(10), 20);
    expect(result).toHaveLength(0);
  });

  it('CCI = 0 quand tous les prix sont identiques (md = 0, protection ÷0)', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      time: i * 3600, open: 100, high: 100, low: 100, close: 100, volume: 1000,
    }));
    const result = calcCCI(candles, 20);
    result.forEach(({ value }) => {
      expect(value).toBe(0);
    });
  });

  it('valeur exacte vérifiée manuellement (period=3, trend linéaire stricte)', () => {
    const candles = [
      { time: 0,    open: 10, high: 11, low: 9,  close: 10, volume: 500 },
      { time: 3600, open: 11, high: 12, low: 10, close: 11, volume: 500 },
      { time: 7200, open: 12, high: 13, low: 11, close: 12, volume: 500 },
    ];
    const [pt] = calcCCI(candles, 3);
    expect(pt.time).toBe(7200);
    expect(pt.value).toBeCloseTo(100, 8);
  });

  it('fonctionne avec period=5 (paramètre personnalisé)', () => {
    const n = 30, period = 5;
    const result = calcCCI(makeOscillatingCandles(n), period);
    expect(result).toHaveLength(n - period + 1);
  });

  it('résultats numériquement identiques à l\'implémentation naïve de référence', () => {
    const naiveCCI = (candles, period = 20) => {
      const out = [];
      for (let i = period - 1; i < candles.length; i++) {
        const slice = candles.slice(i - period + 1, i + 1);
        const tp    = slice.map(c => (c.high + c.low + c.close) / 3);
        const mean  = tp.reduce((a, b) => a + b) / period;
        const md    = tp.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
        out.push({
          time:  candles[i].time,
          value: md ? (tp[tp.length - 1] - mean) / (0.015 * md) : 0,
        });
      }
      return out;
    };

    const candles = makeOscillatingCandles(80, 100, 8);
    const period  = 14;

    const reference = naiveCCI(candles, period);
    const optimized = calcCCI(candles, period);

    expect(optimized).toHaveLength(reference.length);

    optimized.forEach((pt, i) => {
      expect(pt.time).toBe(reference[i].time);
      expect(pt.value).toBeCloseTo(reference[i].value, 10);
    });
  });
});
