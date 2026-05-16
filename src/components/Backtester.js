// ============================================================
//  src/features/Backtester.js — CrypView V3.7
//  Moteur de Backtesting
//
//  NOUVEAUTÉS v3.7 :
//    - slippageMode        — 'fixed' | 'random' | 'asymmetric' | 'worst_case'
//    - slippageEntryPct    — slippage spécifique à l'entrée  (mode asymmetric)
//    - slippageExitPct     — slippage spécifique à la sortie (mode asymmetric)
//    - slippageRandMin/Max — plage aléatoire (mode random, ex: 0.01–0.10)
//    - runMultiTimeframe() — filtre HTF sur les signaux LTF (ex: 4h → 15m)
//    - htfEntryConditions  — conditions de confirmation sur le timeframe haut
//    - htfEntryLogic       — 'AND' | 'OR' pour les conditions HTF
//    - htfExitConditions   — forcer la sortie sur signal HTF
//    - htfExitLogic        — 'AND' | 'OR' pour la sortie HTF
//    - exportCSV()         — export CSV des trades + bloc métriques
//    - exportJSON()        — export JSON complet (optionnel : courbe equity)
//    - exportSummaryText() — résumé Markdown formaté prêt à copier-coller
//
//  EXISTANT v3.6 :
//    - spreadPct        — spread bid/ask en % (ex: 0.03 = 0.03%)
//    - trainRatio       — séparation train/test (ex: 0.7 = 70% train)
//    - runWalkForward() — analyse walk-forward (fenêtres glissantes)
//    - runOptimize()    — grid search sur les paramètres
//    - slippagePct      — glissement marché en % (ex: 0.05 = 0.05%)
//    - takerFeePct / makerFeePct / useMarketOrder / marketImpact / capital
// ============================================================

import { calcRSI, calcMACD, calcMom } from '../indicators/oscillators.js';
import { calcMA, calcVWAP, calcBB }   from '../indicators/index.js';

export const SIGNAL_TYPES = [
  { id: 'rsi_below',         label: 'RSI ≤ seuil (survente)',      hasValue: true,  defaultValue: 30 },
  { id: 'rsi_above',         label: 'RSI ≥ seuil (surachat)',      hasValue: true,  defaultValue: 70 },
  { id: 'macd_cross_up',     label: 'Croisement MACD ↑ (bullish)', hasValue: false, defaultValue: null },
  { id: 'macd_cross_down',   label: 'Croisement MACD ↓ (bearish)', hasValue: false, defaultValue: null },
  { id: 'ma_cross_up',       label: 'Golden Cross (MA20 > MA50)',   hasValue: false, defaultValue: null },
  { id: 'ma_cross_down',     label: 'Death Cross (MA20 < MA50)',    hasValue: false, defaultValue: null },
  { id: 'price_above_vwap',  label: 'Prix au-dessus du VWAP',      hasValue: false, defaultValue: null },
  { id: 'price_below_vwap',  label: 'Prix en-dessous du VWAP',     hasValue: false, defaultValue: null },
  { id: 'bb_breakout_up',    label: 'Breakout Bollinger haut',     hasValue: false, defaultValue: null },
  { id: 'bb_breakout_down',  label: 'Breakout Bollinger bas',      hasValue: false, defaultValue: null },
  { id: 'momentum_positive', label: 'Momentum positif',            hasValue: false, defaultValue: null },
  { id: 'momentum_negative', label: 'Momentum négatif',            hasValue: false, defaultValue: null },
];

/**
 * @typedef {object} BacktestConfig
 * @property {string}   side               — 'long' | 'short'
 * @property {object[]} entryConditions
 * @property {object[]} exitConditions
 * @property {'AND'|'OR'} entryLogic
 * @property {'AND'|'OR'} exitLogic
 * @property {number}   stopLossPct        — % depuis entrée (0 = off)
 * @property {number}   takeProfitPct      — % depuis entrée (0 = off)
 * @property {number}   capitalPct         — % du capital par trade
 * @property {number}   initialBalance
 *
 * — Slippage —
 * @property {number}   [slippagePct]      — glissement fixe en % (mode 'fixed', défaut 0.05)
 * @property {'fixed'|'random'|'asymmetric'|'worst_case'} [slippageMode]
 *   fixed      : slippagePct appliqué uniformément (comportement historique)
 *   random     : tirage uniforme entre slippageRandMin et slippageRandMax à chaque trade
 *   asymmetric : slippageEntryPct à l'entrée, slippageExitPct à la sortie
 *   worst_case : toujours maxSlippagePct (stress-test)
 * @property {number}   [slippageEntryPct] — mode asymmetric, entrée (défaut = slippagePct)
 * @property {number}   [slippageExitPct]  — mode asymmetric, sortie (défaut = slippagePct)
 * @property {number}   [slippageRandMin]  — mode random, borne basse en % (défaut 0)
 * @property {number}   [slippageRandMax]  — mode random, borne haute en % (défaut = slippagePct)
 *
 * — Frais & spread —
 * @property {number}   [spreadPct]        — spread bid/ask en % (0.03 = 0.03%)
 * @property {number}   [takerFeePct]
 * @property {number}   [makerFeePct]
 * @property {boolean}  [useMarketOrder]
 * @property {boolean}  [marketImpact]     — true = slippage croît avec la taille du trade
 * @property {number}   [maxSlippagePct]   — plafond de slippage (mode worst_case ou impact)
 *
 * — Train/test & walk-forward —
 * @property {number}   [trainRatio]       — ratio train/test split (0.7 = 70% train, 0 = off)
 *
 * — Multi-timeframe (runMultiTimeframe uniquement) —
 * @property {object[]} [htfEntryConditions] — conditions de confirmation HTF
 * @property {'AND'|'OR'} [htfEntryLogic]
 * @property {object[]} [htfExitConditions]  — sortie forcée sur signal HTF
 * @property {'AND'|'OR'} [htfExitLogic]
 *
 * @typedef {object} WalkForwardOptions
 * @property {number} [windows]          — nombre de fenêtres (défaut: 5)
 * @property {number} [inSampleRatio]    — ratio in-sample par fenêtre (défaut: 0.7)
 *
 * @typedef {object} ParamGrid
 * @property {Array}  [stopLossPct]
 * @property {Array}  [takeProfitPct]
 * @property {Array}  [capitalPct]
 * @property {Array}  [rsiEntry]         — seuil RSI entrée
 * @property {Array}  [rsiExit]          — seuil RSI sortie
 */

export class Backtester {

  // ═══════════════════════════════════════════════════════════
  //  API PUBLIQUE — Backtests
  // ═══════════════════════════════════════════════════════════

  /**
   * Backtest standard avec séparation optionnelle train/test.
   * Si config.trainRatio > 0, retourne trainMetrics + testMetrics en plus des métriques globales.
   *
   * @param {Candle[]}       candles
   * @param {BacktestConfig} config
   * @returns {BacktestResult}
   */
  static run(candles, config) {
    if (candles.length < 60) {
      return {
        trades: [], equity: [],
        metrics: { error: 'Historique insuffisant (min. 60 bougies).' },
        slippageStats: null,
      };
    }

    const cfg = Backtester.#normalizeConfig(config);

    // ── Séparation train / test ──────────────────────────────
    let trainMetrics = null;
    let testMetrics  = null;

    if (cfg.trainRatio > 0 && cfg.trainRatio < 1) {
      const splitIdx     = Math.floor(candles.length * cfg.trainRatio);
      const trainCandles = candles.slice(0, splitIdx);
      const testCandles  = candles.slice(splitIdx);

      if (trainCandles.length >= 60) {
        const trainResult = Backtester.#runSegment(trainCandles, cfg);
        trainMetrics = { ...trainResult.metrics, period: 'train', candles: trainCandles.length };
      }
      if (testCandles.length >= 60) {
        const testResult = Backtester.#runSegment(testCandles, cfg);
        testMetrics = { ...testResult.metrics, period: 'test', candles: testCandles.length };
      }
    }

    // ── Run complet ──────────────────────────────────────────
    const result = Backtester.#runSegment(candles, cfg);

    return { ...result, trainMetrics, testMetrics };
  }

  // ─────────────────────────────────────────────────────────
  /**
   * Walk-Forward Analysis.
   * Découpe les candles en N fenêtres glissantes. Pour chaque fenêtre :
   *   - in-sample      : optimisation (run simple)
   *   - out-of-sample  : évaluation hors-échantillon
   *
   * @param {Candle[]}           candles
   * @param {BacktestConfig}     config
   * @param {WalkForwardOptions} [options]
   * @returns {WalkForwardResult}
   */
  static runWalkForward(candles, config, options = {}) {
    const cfg           = Backtester.#normalizeConfig(config);
    const windows       = Math.max(2, options.windows       ?? 5);
    const inSampleRatio = Math.min(0.9, Math.max(0.5, options.inSampleRatio ?? 0.7));

    const totalLen   = candles.length;
    const windowSize = Math.floor(totalLen / windows);

    if (windowSize < 120) {
      return {
        windows: [],
        aggregated: { error: 'Pas assez de bougies pour le walk-forward (min. 120 × nb_fenêtres).' },
      };
    }

    const windowResults = [];

    for (let w = 0; w < windows; w++) {
      const start      = w * windowSize;
      const end        = w === windows - 1 ? totalLen : start + windowSize;
      const winCandles = candles.slice(start, end);

      const splitIdx  = Math.floor(winCandles.length * inSampleRatio);
      const inSample  = winCandles.slice(0, splitIdx);
      const outSample = winCandles.slice(splitIdx);

      const inResult  = inSample.length  >= 60 ? Backtester.#runSegment(inSample,  cfg) : null;
      const outResult = outSample.length >= 60 ? Backtester.#runSegment(outSample, cfg) : null;

      windowResults.push({
        window:      w + 1,
        startTime:   winCandles[0]?.time,
        endTime:     winCandles.at(-1)?.time,
        splitTime:   winCandles[splitIdx]?.time,
        inSample:    inResult  ? { ...inResult.metrics,  candles: inSample.length  } : null,
        outOfSample: outResult ? { ...outResult.metrics, candles: outSample.length } : null,
      });
    }

    // ── Agrégation des résultats OOS ─────────────────────────
    const oosList = windowResults
      .map(w => w.outOfSample)
      .filter(Boolean);

    const aggregated = oosList.length === 0
      ? { error: 'Aucune fenêtre OOS valide.' }
      : {
          windows:         oosList.length,
          avgWinRate:      Backtester.#avg(oosList, 'winRate'),
          avgSharpe:       Backtester.#avg(oosList, 'sharpe'),
          avgProfitFactor: Backtester.#avg(oosList, 'profitFactor'),
          avgMaxDrawdown:  Backtester.#avg(oosList, 'maxDrawdown'),
          avgTotalPnlPct:  Backtester.#avg(oosList, 'totalPnlPct'),
          totalTrades:     oosList.reduce((s, m) => s + (m.trades ?? 0), 0),
          consistency:     Backtester.#calcConsistency(oosList),
        };

    return { windows: windowResults, aggregated };
  }

  // ─────────────────────────────────────────────────────────
  /**
   * Optimisation de paramètres par grid search.
   * Teste toutes les combinaisons de paramGrid et retourne
   * les résultats triés par Sharpe ratio décroissant.
   *
   * Exemple d'appel :
   *   Backtester.runOptimize(candles, config, {
   *     stopLossPct:   [1, 2, 3],
   *     takeProfitPct: [2, 4, 6],
   *     rsiEntry:      [25, 30, 35],
   *   });
   *
   * @param {Candle[]}       candles
   * @param {BacktestConfig} config
   * @param {ParamGrid}      paramGrid
   * @param {{ sortBy?: string, top?: number }} [opts]
   * @returns {OptimizeResult}
   */
  static runOptimize(candles, config, paramGrid, opts = {}) {
    const sortBy = opts.sortBy ?? 'sharpe';
    const top    = opts.top    ?? 20;

    const combinations = Backtester.#cartesian(paramGrid);

    if (combinations.length === 0) {
      return { results: [], best: null, error: 'paramGrid vide ou invalide.' };
    }
    if (combinations.length > 5000) {
      return {
        results: [], best: null,
        error: `Grid trop large (${combinations.length} combinaisons > 5000). Réduire paramGrid.`,
      };
    }

    const results = [];

    for (const combo of combinations) {
      const cfg           = Backtester.#applyParamCombo(config, combo);
      const normalizedCfg = Backtester.#normalizeConfig(cfg);

      if (candles.length < 60) continue;

      const result = Backtester.#runSegment(candles, normalizedCfg);
      if (!result.metrics || result.metrics.error) continue;

      results.push({ params: combo, metrics: result.metrics });
    }

    results.sort((a, b) => (b.metrics[sortBy] ?? 0) - (a.metrics[sortBy] ?? 0));

    return {
      total:   combinations.length,
      tested:  results.length,
      sortBy,
      best:    results[0] ?? null,
      results: results.slice(0, top),
    };
  }

  // ─────────────────────────────────────────────────────────
  /**
   * Multi-Timeframe Backtest.
   *
   * Utilise les candles LTF pour la logique de trading et les candles HTF
   * comme couche de confirmation. À chaque bougie LTF, l'alignement temporel
   * retrouve la dernière bougie HTF disponible (time HTF ≤ time LTF) puis
   * évalue les conditions HTF avant d'autoriser l'entrée.
   *
   * Exemple d'appel :
   *   Backtester.runMultiTimeframe(candles15m, candles4h, {
   *     ...config,
   *     htfEntryConditions: [{ type: 'macd_cross_up' }],
   *     htfEntryLogic: 'AND',
   *     htfExitConditions: [{ type: 'macd_cross_down' }],
   *     htfExitLogic: 'AND',
   *   });
   *
   * @param {Candle[]}       ltfCandles   — bougie basse résolution (signal)
   * @param {Candle[]}       htfCandles   — bougie haute résolution (filtre)
   * @param {BacktestConfig} config       — doit inclure htfEntryConditions
   * @returns {BacktestResult & { multiTimeframe: object }}
   */
  static runMultiTimeframe(ltfCandles, htfCandles, config) {
    if (!ltfCandles?.length || ltfCandles.length < 60) {
      return {
        trades: [], equity: [],
        metrics: { error: 'LTF : historique insuffisant (min. 60 bougies).' },
        slippageStats: null,
      };
    }
    if (!htfCandles?.length || htfCandles.length < 10) {
      return {
        trades: [], equity: [],
        metrics: { error: 'HTF : historique insuffisant (min. 10 bougies).' },
        slippageStats: null,
      };
    }
    if (!config.htfEntryConditions?.length) {
      return {
        trades: [], equity: [],
        metrics: { error: 'htfEntryConditions requis pour runMultiTimeframe.' },
        slippageStats: null,
      };
    }

    const cfg           = Backtester.#normalizeConfig(config);
    const htfIndicators = Backtester.#buildIndicatorCache(htfCandles);
    const htfAlignment  = Backtester.#buildHTFAlignment(ltfCandles, htfCandles);

    const result = Backtester.#runSegment(ltfCandles, cfg, {
      htfCandles,
      htfIndicators,
      htfAlignment,
    });

    return {
      ...result,
      multiTimeframe: {
        ltfCandles:  ltfCandles.length,
        htfCandles:  htfCandles.length,
        htfCoverage: Backtester.#htfCoverage(htfAlignment),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  API PUBLIQUE — Export
  // ═══════════════════════════════════════════════════════════

  /**
   * Exporte les trades en CSV avec un bloc métriques en fin de fichier.
   *
   * Exemple d'utilisation :
   *   const csv = Backtester.exportCSV(result);
   *   // → blob download ou fs.writeFileSync('result.csv', csv)
   *
   * @param {BacktestResult} result
   * @param {{ includeMetrics?: boolean, includeSlippage?: boolean, separator?: string }} [opts]
   * @returns {string}
   */
  static exportCSV(result, opts = {}) {
    const sep             = opts.separator      ?? ',';
    const includeMetrics  = opts.includeMetrics ?? true;
    const includeSlippage = opts.includeSlippage ?? true;
    const { trades = [], metrics = {}, slippageStats = null,
            trainMetrics = null, testMetrics = null } = result;

    // ── En-têtes & lignes des trades ────────────────────────
    const tradeHeaders = [
      'id', 'entryTime', 'exitTime', 'entry', 'entryExec', 'exit',
      'qty', 'pnl', 'pnlGross', 'pnlPct', 'fee', 'slippage', 'totalCost', 'reason',
    ];

    const rows = trades.map(t => [
      t.id,
      Backtester.#fmtTime(t.entryTime),
      Backtester.#fmtTime(t.exitTime),
      t.entry, t.entryExec, t.exit, t.qty,
      t.pnl, t.pnlGross, t.pnlPct, t.fee, t.slippage, t.totalCost, t.reason,
    ].map(v => Backtester.#csvCell(v)).join(sep));

    let csv = [tradeHeaders.join(sep), ...rows].join('\n');

    // ── Bloc métriques ───────────────────────────────────────
    const appendMetricsBlock = (m, heading) => {
      if (!m || m.error) return;
      csv += `\n\n## ${heading}\n`;
      csv += `Métrique${sep}Valeur\n`;
      csv += Object.entries(m)
        .filter(([k]) => k !== 'error')
        .map(([k, v]) => `${k}${sep}${v}`)
        .join('\n');
    };

    if (includeMetrics) {
      appendMetricsBlock(metrics,      'MÉTRIQUES GLOBALES');
      appendMetricsBlock(trainMetrics, 'MÉTRIQUES TRAIN');
      appendMetricsBlock(testMetrics,  'MÉTRIQUES TEST');
    }

    if (includeSlippage && slippageStats) {
      csv += `\n\n## COÛTS D'EXÉCUTION\n`;
      csv += `Métrique${sep}Valeur\n`;
      csv += Object.entries(slippageStats).map(([k, v]) => `${k}${sep}${v}`).join('\n');
    }

    return csv;
  }

  // ─────────────────────────────────────────────────────────
  /**
   * Exporte le résultat complet en JSON.
   * La courbe d'equity est omise par défaut (peut être très volumineuse).
   *
   * @param {BacktestResult} result
   * @param {{ pretty?: boolean, includeEquity?: boolean }} [opts]
   * @returns {string}
   */
  static exportJSON(result, opts = {}) {
    const pretty        = opts.pretty        ?? true;
    const includeEquity = opts.includeEquity ?? false;

    const payload = {
      exportedAt:    new Date().toISOString(),
      metrics:       result.metrics       ?? null,
      slippageStats: result.slippageStats ?? null,
      trainMetrics:  result.trainMetrics  ?? null,
      testMetrics:   result.testMetrics   ?? null,
      multiTimeframe:result.multiTimeframe ?? null,
      trades:        result.trades        ?? [],
      equity:        includeEquity
        ? (result.equity ?? [])
        : `[${result.equity?.length ?? 0} points — passez includeEquity:true pour inclure]`,
    };

    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  // ─────────────────────────────────────────────────────────
  /**
   * Résumé Markdown lisible du résultat de backtest.
   * Prêt à coller dans un rapport, un README ou une note Notion.
   *
   * @param {BacktestResult} result
   * @param {string} [title]
   * @returns {string}
   */
  static exportSummaryText(result, title = 'Rapport de Backtest') {
    const {
      metrics = {}, slippageStats = null,
      trainMetrics = null, testMetrics = null,
      multiTimeframe = null,
    } = result;

    const COL_L = 28;
    const COL_R = 15;
    const sep   = `|${'-'.repeat(COL_L + 2)}|${'-'.repeat(COL_R + 2)}|`;
    const row   = (label, value) =>
      `| ${String(label).padEnd(COL_L)} | ${String(value ?? 'N/A').padStart(COL_R)} |`;

    const metricsBlock = (m, heading) => {
      if (!m) return '';
      if (m.error) return `\n### ${heading}\n> ⚠️ ${m.error}\n`;

      const pct  = v  => v  != null ? `${v}%` : 'N/A';
      const usd  = v  => v  != null ? `${v} $` : 'N/A';

      return [
        `\n### ${heading}`,
        sep,
        row('Métrique', 'Valeur'),
        sep,
        row('Trades totaux',     m.trades),
        row('Victoires / Défaites', `${m.wins ?? '?'} / ${m.losses ?? '?'}`),
        row('Win Rate',          pct(m.winRate)),
        row('PnL Net',           usd(m.totalPnl)),
        row('PnL Brut',          usd(m.totalPnlGross)),
        row('PnL %',             pct(m.totalPnlPct)),
        row('Balance finale',    usd(m.finalBalance)),
        row('Max Drawdown',      pct(m.maxDrawdown)),
        row('Profit Factor',     m.profitFactor),
        row('Sharpe Ratio',      m.sharpe),
        row('Avg Win',           usd(m.avgWin)),
        row('Avg Loss',          usd(m.avgLoss)),
        row('Total Fees',        usd(m.totalFees)),
        row('Total Slippage',    usd(m.totalSlippage)),
        row('Cost Drag',         pct(m.costDrag)),
        ...(m.candles ? [row('Bougies',        m.candles)] : []),
        sep,
      ].join('\n');
    };

    const lines = [
      `# ${title}`,
      `_Généré le ${new Date().toLocaleString('fr-FR')}_\n`,
    ];

    if (multiTimeframe) {
      lines.push('> **Mode Multi-Timeframe**');
      lines.push(`> LTF : ${multiTimeframe.ltfCandles} bougies · ` +
                 `HTF : ${multiTimeframe.htfCandles} bougies · ` +
                 `Couverture HTF : ${multiTimeframe.htfCoverage}%\n`);
    }

    lines.push(metricsBlock(metrics,      'Métriques Globales'));
    if (trainMetrics) lines.push(metricsBlock(trainMetrics, `Période Train (${trainMetrics.candles} bougies)`));
    if (testMetrics)  lines.push(metricsBlock(testMetrics,  `Période Test  (${testMetrics.candles} bougies)`));

    if (slippageStats) {
      lines.push('\n### Coûts d\'Exécution');
      lines.push(sep);
      lines.push(row('Slippage total',   `${slippageStats.totalSlippageCost} $`));
      lines.push(row('Fees totaux',      `${slippageStats.totalFeeCost} $`));
      lines.push(row('Coût global',      `${slippageStats.totalCost} $`));
      lines.push(row('Impact sur PnL',   `${slippageStats.impactOnPnl}%`));
      lines.push(row('Slippage moy. %',  `${slippageStats.avgSlippagePct}%`));
      lines.push(sep);
    }

    if (result.trades?.length) {
      lines.push('\n### Top 5 meilleurs trades');
      lines.push(sep);
      lines.push(row('Date entrée', 'PnL Net'));
      lines.push(sep);
      [...result.trades]
        .sort((a, b) => b.pnl - a.pnl)
        .slice(0, 5)
        .forEach(t => lines.push(row(Backtester.#fmtTime(t.entryTime), `${t.pnl} $`)));
      lines.push(sep);

      lines.push('\n### Top 5 pires trades');
      lines.push(sep);
      lines.push(row('Date entrée', 'PnL Net'));
      lines.push(sep);
      [...result.trades]
        .sort((a, b) => a.pnl - b.pnl)
        .slice(0, 5)
        .forEach(t => lines.push(row(Backtester.#fmtTime(t.entryTime), `${t.pnl} $`)));
      lines.push(sep);
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════
  //  MOTEUR INTERNE
  // ═══════════════════════════════════════════════════════════

  /**
   * Run sur un segment de candles avec une config normalisée.
   * Le paramètre optionnel `mtfContext` active le filtre multi-timeframe.
   *
   * @param {Candle[]}       candles
   * @param {BacktestConfig} cfg           — config déjà normalisée
   * @param {{ htfCandles, htfIndicators, htfAlignment }|null} [mtfContext]
   * @returns {BacktestResult}
   */
  static #runSegment(candles, cfg, mtfContext = null) {
    const indicators = Backtester.#buildIndicatorCache(candles);

    const trades    = [];
    const equity    = [];
    let   balance   = cfg.initialBalance;
    let   openTrade = null;

    const slippageStats = { totalSlippageCost: 0, totalFeeCost: 0, trades: 0, avgSlippagePct: 0 };

    for (let i = 1; i < candles.length; i++) {
      const c    = candles[i];
      const prev = candles[i - 1];
      const ind  = indicators[i];
      const indP = indicators[i - 1];

      // ── Résolution HTF (multi-timeframe) ──────────────────
      let htfInd  = null;
      let htfIndP = null;
      let htfC    = null;
      let htfPrev = null;

      if (mtfContext) {
        const htfIdx = mtfContext.htfAlignment[i];
        if (htfIdx > 0) {
          htfInd  = mtfContext.htfIndicators[htfIdx];
          htfIndP = mtfContext.htfIndicators[htfIdx - 1];
          htfC    = mtfContext.htfCandles[htfIdx];
          htfPrev = mtfContext.htfCandles[htfIdx - 1];
        }
      }

      if (openTrade) {
        const currentPnl = cfg.side === 'long'
          ? (c.close - openTrade.entry) * openTrade.qty
          : (openTrade.entry - c.close) * openTrade.qty;
        openTrade.unrealized = currentPnl;

        // ── Stop-Loss ────────────────────────────────────────
        if (cfg.stopLossPct > 0) {
          const sl  = cfg.side === 'long'
            ? openTrade.entry * (1 - cfg.stopLossPct / 100)
            : openTrade.entry * (1 + cfg.stopLossPct / 100);
          const hit = cfg.side === 'long' ? c.low <= sl : c.high >= sl;
          if (hit) {
            const execPrice = Backtester.#applyExecutionCost(sl, cfg, openTrade.notional, true, false);
            const result    = Backtester.#closeTrade(openTrade, execPrice, 'sl', balance, trades, cfg);
            balance = result.balance;
            slippageStats.totalSlippageCost += result.slippageCost;
            slippageStats.totalFeeCost      += result.feeCost;
            slippageStats.trades++;
            openTrade = null;
            equity.push({ time: c.time, value: balance });
            continue;
          }
        }

        // ── Take-Profit ──────────────────────────────────────
        if (cfg.takeProfitPct > 0) {
          const tp  = cfg.side === 'long'
            ? openTrade.entry * (1 + cfg.takeProfitPct / 100)
            : openTrade.entry * (1 - cfg.takeProfitPct / 100);
          const hit = cfg.side === 'long' ? c.high >= tp : c.low <= tp;
          if (hit) {
            const execPrice = Backtester.#applyExecutionCost(tp, cfg, openTrade.notional, false, false);
            const result    = Backtester.#closeTrade(openTrade, execPrice, 'tp', balance, trades, cfg);
            balance = result.balance;
            slippageStats.totalSlippageCost += result.slippageCost;
            slippageStats.totalFeeCost      += result.feeCost;
            slippageStats.trades++;
            openTrade = null;
            equity.push({ time: c.time, value: balance });
            continue;
          }
        }

        // ── Sortie forcée HTF ────────────────────────────────
        if (mtfContext && cfg.htfExitConditions?.length && htfInd && htfIndP) {
          const htfExit = Backtester.#evalConditions(
            cfg.htfExitConditions, cfg.htfExitLogic ?? 'AND',
            htfC, htfPrev, htfInd, htfIndP
          );
          if (htfExit) {
            const execPrice = Backtester.#applyExecutionCost(c.close, cfg, openTrade.notional, cfg.side === 'long', false);
            const result    = Backtester.#closeTrade(openTrade, execPrice, 'htf_exit', balance, trades, cfg);
            balance = result.balance;
            slippageStats.totalSlippageCost += result.slippageCost;
            slippageStats.totalFeeCost      += result.feeCost;
            slippageStats.trades++;
            openTrade = null;
            equity.push({ time: c.time, value: balance });
            continue;
          }
        }
      }

      // ── Signal d'entrée ──────────────────────────────────
      if (!openTrade) {
        const entry = Backtester.#evalConditions(cfg.entryConditions, cfg.entryLogic, c, prev, ind, indP);

        // Filtre HTF : si present, les conditions HTF doivent être vérifiées
        const htfConfirm = !mtfContext
          || !htfInd || !htfIndP
          || Backtester.#evalConditions(
              cfg.htfEntryConditions, cfg.htfEntryLogic ?? 'AND',
              htfC, htfPrev, htfInd, htfIndP
             );

        if (entry && htfConfirm) {
          const notional  = balance * (cfg.capitalPct / 100);
          const execPrice = Backtester.#applyExecutionCost(c.close, cfg, notional, cfg.side !== 'long', true);
          const feePct    = cfg.useMarketOrder ? cfg.takerFeePct / 100 : cfg.makerFeePct / 100;
          const fee       = notional * feePct;
          const qty       = (notional - fee) / execPrice;

          const slippageCostEntry = Math.abs(execPrice - c.close) * qty;
          slippageStats.totalSlippageCost += slippageCostEntry;
          slippageStats.totalFeeCost      += fee;
          slippageStats.trades++;

          balance  -= (notional + fee);
          openTrade = {
            id:         `bt_${i}`,
            time:       c.time,
            entry:      execPrice,
            rawEntry:   c.close,
            qty,
            notional,
            fee,
            unrealized: 0,
          };
        }
      }
      // ── Signal de sortie ─────────────────────────────────
      else {
        const exit = Backtester.#evalConditions(cfg.exitConditions, cfg.exitLogic, c, prev, ind, indP);
        if (exit) {
          const execPrice = Backtester.#applyExecutionCost(c.close, cfg, openTrade.notional, cfg.side === 'long', false);
          const result    = Backtester.#closeTrade(openTrade, execPrice, 'close', balance, trades, cfg);
          balance = result.balance;
          slippageStats.totalSlippageCost += result.slippageCost;
          slippageStats.totalFeeCost      += result.feeCost;
          slippageStats.trades++;
          openTrade = null;
        }
      }

      equity.push({ time: c.time, value: balance + (openTrade?.unrealized ?? 0) });
    }

    // ── Fermeture finale ─────────────────────────────────────
    if (openTrade) {
      const last      = candles.at(-1);
      const execPrice = Backtester.#applyExecutionCost(last.close, cfg, openTrade.notional, cfg.side === 'long', false);
      const result    = Backtester.#closeTrade(openTrade, execPrice, 'close', balance, trades, cfg);
      balance = result.balance;
      slippageStats.totalSlippageCost += result.slippageCost;
      slippageStats.totalFeeCost      += result.feeCost;
      equity.push({ time: last.time, value: balance });
    }

    if (slippageStats.trades > 0) {
      slippageStats.avgSlippagePct = parseFloat(
        ((slippageStats.totalSlippageCost / (cfg.initialBalance || 1)) * 100).toFixed(4)
      );
    }

    return {
      trades,
      equity,
      slippageStats: {
        totalSlippageCost: parseFloat(slippageStats.totalSlippageCost.toFixed(4)),
        totalFeeCost:      parseFloat(slippageStats.totalFeeCost.toFixed(4)),
        totalCost:         parseFloat((slippageStats.totalSlippageCost + slippageStats.totalFeeCost).toFixed(4)),
        avgSlippagePct:    slippageStats.avgSlippagePct,
        trades:            slippageStats.trades,
        impactOnPnl:       parseFloat(
          ((slippageStats.totalSlippageCost + slippageStats.totalFeeCost) /
            (cfg.initialBalance || 1) * 100).toFixed(3)
        ),
      },
      metrics: Backtester.#calcMetrics(trades, equity, cfg.initialBalance),
    };
  }

  // ── Normalisation config ───────────────────────────────────

  static #normalizeConfig(config) {
    const slipBase = config.slippagePct ?? 0.05;
    return {
      ...config,
      // ── Slippage ──────────────────────────────────────────
      slippagePct:      slipBase,
      slippageMode:     config.slippageMode     ?? 'fixed',
      slippageEntryPct: config.slippageEntryPct ?? slipBase,
      slippageExitPct:  config.slippageExitPct  ?? slipBase,
      slippageRandMin:  config.slippageRandMin  ?? 0,
      slippageRandMax:  config.slippageRandMax  ?? slipBase,
      // ── Spread & frais ────────────────────────────────────
      spreadPct:        config.spreadPct        ?? 0.03,
      takerFeePct:      config.takerFeePct      ?? 0.10,
      makerFeePct:      config.makerFeePct      ?? 0.02,
      useMarketOrder:   config.useMarketOrder   ?? true,
      marketImpact:     config.marketImpact     ?? false,
      maxSlippagePct:   config.maxSlippagePct   ?? 0.50,
      // ── Train/test ────────────────────────────────────────
      trainRatio:       config.trainRatio       ?? 0,
    };
  }

  // ── Coût d'exécution : slippage + spread ──────────────────

  /**
   * Applique slippage + spread bid/ask au prix d'exécution.
   *
   * Modes de slippage :
   *   fixed      — slippagePct fixe (comportement historique)
   *   random     — tirage uniforme [slippageRandMin, slippageRandMax]
   *   asymmetric — slippageEntryPct à l'entrée, slippageExitPct à la sortie
   *   worst_case — toujours maxSlippagePct (stress-test conservateur)
   *
   * Le spread est additif : demi-spread dans la direction défavorable.
   *   achat  : prix effectif = mid × (1 + slippage + spread/2)
   *   vente  : prix effectif = mid × (1 − slippage − spread/2)
   *
   * @param {number}  price
   * @param {object}  cfg
   * @param {number}  notional
   * @param {boolean} isBuying   — true = achat, false = vente
   * @param {boolean} isEntry    — true = ouverture, false = clôture (mode asymmetric)
   * @returns {number}
   */
  static #applyExecutionCost(price, cfg, notional, isBuying, isEntry = true) {
    // ── Calcul du slippage de base selon le mode ─────────────
    let slipPct;

    switch (cfg.slippageMode) {
      case 'random': {
        const lo = cfg.slippageRandMin / 100;
        const hi = cfg.slippageRandMax / 100;
        slipPct = lo + Math.random() * (hi - lo);
        break;
      }
      case 'asymmetric':
        slipPct = (isEntry ? cfg.slippageEntryPct : cfg.slippageExitPct) / 100;
        break;
      case 'worst_case':
        slipPct = cfg.maxSlippagePct / 100;
        break;
      case 'fixed':
      default:
        slipPct = cfg.slippagePct / 100;
    }

    // ── Market impact (optionnel) ────────────────────────────
    if (cfg.marketImpact) {
      const impactMul = Math.sqrt(Math.max(1, notional) / 100_000);
      slipPct = Math.min(cfg.maxSlippagePct / 100, slipPct * (1 + impactMul));
    }

    // ── Spread : demi-spread dans la direction défavorable ───
    const halfSpread   = (cfg.spreadPct / 100) / 2;
    const totalAdverse = slipPct + halfSpread;

    return isBuying
      ? price * (1 + totalAdverse)
      : price * (1 - totalAdverse);
  }

  // ── Clôture de trade ──────────────────────────────────────

  static #closeTrade(open, closePrice, reason, balance, trades, cfg) {
    const isLong   = cfg.side !== 'short';
    const pnlGross = open.qty * (isLong
      ? (closePrice - open.entry)
      : (open.entry - closePrice));

    const feePct     = cfg.useMarketOrder ? cfg.takerFeePct / 100 : cfg.makerFeePct / 100;
    const closeFee   = open.qty * closePrice * feePct;

    const slippageCost = Math.abs(closePrice - (isLong
      ? closePrice / (1 - cfg.slippagePct / 100)
      : closePrice / (1 + cfg.slippagePct / 100))) * open.qty;

    const recv     = open.qty * open.entry + pnlGross - closeFee;
    const newBal   = balance + recv;
    const pnlNet   = pnlGross - closeFee;
    const totalFee = open.fee + closeFee;

    trades.push({
      id:         open.id,
      entryTime:  open.time,
      exitTime:   Date.now(),
      entry:      open.rawEntry ?? open.entry,
      entryExec:  open.entry,
      exit:       closePrice,
      qty:        open.qty,
      pnl:        parseFloat(pnlNet.toFixed(4)),
      pnlGross:   parseFloat(pnlGross.toFixed(4)),
      pnlPct:     parseFloat((pnlNet / (open.qty * open.entry) * 100).toFixed(2)),
      fee:        parseFloat(totalFee.toFixed(4)),
      slippage:   parseFloat(slippageCost.toFixed(4)),
      totalCost:  parseFloat((totalFee + slippageCost).toFixed(4)),
      reason,
    });

    return {
      balance:      parseFloat(newBal.toFixed(4)),
      feeCost:      closeFee,
      slippageCost: slippageCost,
    };
  }

  // ── Cache indicateurs ─────────────────────────────────────

  static #buildIndicatorCache(candles) {
    const n     = candles.length;
    const cache = new Array(n).fill(null).map(() => ({}));
    const timeToIdx = new Map(candles.map((c, i) => [Number(c.time), i]));
    const byTime    = pt => timeToIdx.get(Number(pt.time)) ?? -1;

    try { calcRSI(candles, 14).forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].rsi = pt.value; }); } catch (_) {}
    try {
      const { macd, signal } = calcMACD(candles);
      macd.forEach((pt, k) => { const i = byTime(pt); if (i >= 0) { cache[i].macd = pt.value; cache[i].signal = signal[k]?.value; } });
    } catch (_) {}
    try {
      const { ma20, ma50 } = calcMA(candles);
      ma20.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].ma20 = pt.value; });
      ma50.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].ma50 = pt.value; });
    } catch (_) {}
    try { calcVWAP(candles).forEach((pt, k) => { if (k < n) cache[k].vwap = pt.value; }); } catch (_) {}
    try {
      const { upper, lower } = calcBB(candles, 20, 2);
      upper.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].bbUpper = pt.value; });
      lower.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].bbLower = pt.value; });
    } catch (_) {}
    try { calcMom(candles, 10).forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].momentum = pt.value; }); } catch (_) {}

    return cache;
  }

  // ── Évaluation conditions ─────────────────────────────────

  static #evalConditions(conditions, logic, c, prev, ind, indP) {
    if (!conditions?.length) return false;
    const results = conditions.map(cond => {
      switch (cond.type) {
        case 'rsi_below':         return ind.rsi     != null && ind.rsi <= (cond.value ?? 30);
        case 'rsi_above':         return ind.rsi     != null && ind.rsi >= (cond.value ?? 70);
        case 'macd_cross_up':     return indP.macd   != null && ind.macd   != null && indP.macd   <= indP.signal && ind.macd   > ind.signal;
        case 'macd_cross_down':   return indP.macd   != null && ind.macd   != null && indP.macd   >= indP.signal && ind.macd   < ind.signal;
        case 'ma_cross_up':       return indP.ma20   != null && ind.ma20   != null && indP.ma20   <= indP.ma50   && ind.ma20   > ind.ma50;
        case 'ma_cross_down':     return indP.ma20   != null && ind.ma20   != null && indP.ma20   >= indP.ma50   && ind.ma20   < ind.ma50;
        case 'price_above_vwap':  return ind.vwap    != null && c.close > ind.vwap;
        case 'price_below_vwap':  return ind.vwap    != null && c.close < ind.vwap;
        case 'bb_breakout_up':    return ind.bbUpper != null && c.close > ind.bbUpper;
        case 'bb_breakout_down':  return ind.bbLower != null && c.close < ind.bbLower;
        case 'momentum_positive': return ind.momentum != null && ind.momentum > 0;
        case 'momentum_negative': return ind.momentum != null && ind.momentum < 0;
        default: return false;
      }
    });
    return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  // ── Métriques ─────────────────────────────────────────────

  static #calcMetrics(trades, equity, initial) {
    if (!trades.length) return { trades: 0, message: 'Aucun trade déclenché sur cette période.' };

    const wins      = trades.filter(t => t.pnl > 0);
    const losses    = trades.filter(t => t.pnl < 0);
    const totalPnl  = trades.reduce((a, t) => a + t.pnl, 0);
    const totalFees = trades.reduce((a, t) => a + (t.fee    ?? 0), 0);
    const totalSlip = trades.reduce((a, t) => a + (t.slippage ?? 0), 0);
    const finalEq   = equity.at(-1)?.value ?? initial;

    let peak = initial, maxDD = 0;
    for (const pt of equity) {
      if (pt.value > peak) peak = pt.value;
      const dd = (peak - pt.value) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    const grossProfit  = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss    = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);

    const rets   = equity.map((pt, i) => i === 0 ? 0 : (pt.value - equity[i - 1].value) / equity[i - 1].value);
    const mean   = rets.reduce((a, r) => a + r, 0) / rets.length;
    const std    = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

    return {
      trades:        trades.length,
      wins:          wins.length,
      losses:        losses.length,
      winRate:       parseFloat((wins.length / trades.length * 100).toFixed(1)),
      totalPnl:      parseFloat(totalPnl.toFixed(2)),
      totalPnlGross: parseFloat(trades.reduce((a, t) => a + (t.pnlGross ?? t.pnl), 0).toFixed(2)),
      totalPnlPct:   parseFloat(((finalEq - initial) / initial * 100).toFixed(2)),
      finalBalance:  parseFloat(finalEq.toFixed(2)),
      maxDrawdown:   parseFloat(maxDD.toFixed(2)),
      profitFactor:  parseFloat(profitFactor.toFixed(2)),
      sharpe:        parseFloat(sharpe.toFixed(2)),
      avgWin:        wins.length   ? parseFloat((grossProfit / wins.length).toFixed(2)) : 0,
      avgLoss:       losses.length ? parseFloat((grossLoss   / losses.length).toFixed(2)) : 0,
      totalFees:     parseFloat(totalFees.toFixed(2)),
      totalSlippage: parseFloat(totalSlip.toFixed(2)),
      costDrag:      parseFloat(((totalFees + totalSlip) / initial * 100).toFixed(3)),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITAIRES — Multi-timeframe
  // ═══════════════════════════════════════════════════════════

  /**
   * Aligne chaque bougie LTF sur la dernière bougie HTF disponible.
   * Retourne un tableau d'indices HTF (un par index LTF).
   * Algorithme : recherche binaire pour last HTF.time ≤ LTF.time.
   *
   * @param {Candle[]} ltfCandles
   * @param {Candle[]} htfCandles
   * @returns {number[]}
   */
  static #buildHTFAlignment(ltfCandles, htfCandles) {
    const htfTimes = htfCandles.map(c => Number(c.time));

    return ltfCandles.map(ltf => {
      const t  = Number(ltf.time);
      let lo = 0, hi = htfCandles.length - 1, res = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (htfTimes[mid] <= t) { res = mid; lo = mid + 1; }
        else                     hi = mid - 1;
      }
      return res;
    });
  }

  /**
   * Calcule le % de bougies LTF couvertes par un alignement HTF valide.
   * Une valeur < 80 % signale une mauvaise synchronisation temporelle.
   *
   * @param {number[]} alignment
   * @returns {number}
   */
  static #htfCoverage(alignment) {
    const covered = alignment.filter(idx => idx >= 1).length;
    return parseFloat((covered / alignment.length * 100).toFixed(1));
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITAIRES — Optimisation / Walk-forward
  // ═══════════════════════════════════════════════════════════

  /**
   * Produit cartésien d'un paramGrid.
   * Ex: { a: [1,2], b: [3,4] } → [{a:1,b:3},{a:1,b:4},{a:2,b:3},{a:2,b:4}]
   */
  static #cartesian(paramGrid) {
    const keys = Object.keys(paramGrid).filter(k => Array.isArray(paramGrid[k]) && paramGrid[k].length > 0);
    if (keys.length === 0) return [];

    return keys.reduce((acc, key) => {
      const values = paramGrid[key];
      const result = [];
      for (const existing of acc)
        for (const val of values)
          result.push({ ...existing, [key]: val });
      return result;
    }, [{}]);
  }

  /**
   * Applique un combo de paramètres à une config de base.
   * Gère les cas spéciaux : rsiEntry/rsiExit modifient les conditions.
   */
  static #applyParamCombo(config, combo) {
    const cfg = { ...config };

    if (combo.stopLossPct    !== undefined) cfg.stopLossPct    = combo.stopLossPct;
    if (combo.takeProfitPct  !== undefined) cfg.takeProfitPct  = combo.takeProfitPct;
    if (combo.capitalPct     !== undefined) cfg.capitalPct     = combo.capitalPct;
    if (combo.spreadPct      !== undefined) cfg.spreadPct      = combo.spreadPct;
    if (combo.slippagePct    !== undefined) cfg.slippagePct    = combo.slippagePct;
    if (combo.slippageMode   !== undefined) cfg.slippageMode   = combo.slippageMode;

    if (combo.rsiEntry !== undefined && cfg.entryConditions) {
      cfg.entryConditions = cfg.entryConditions.map(c =>
        (c.type === 'rsi_below' || c.type === 'rsi_above')
          ? { ...c, value: combo.rsiEntry }
          : c
      );
    }
    if (combo.rsiExit !== undefined && cfg.exitConditions) {
      cfg.exitConditions = cfg.exitConditions.map(c =>
        (c.type === 'rsi_below' || c.type === 'rsi_above')
          ? { ...c, value: combo.rsiExit }
          : c
      );
    }

    return cfg;
  }

  /** % de fenêtres OOS avec PnL positif. */
  static #calcConsistency(metricsList) {
    const profitable = metricsList.filter(m => (m.totalPnlPct ?? 0) > 0).length;
    return parseFloat((profitable / metricsList.length * 100).toFixed(1));
  }

  /** Moyenne d'une propriété sur une liste de métriques. */
  static #avg(list, key) {
    const valid = list.filter(m => m[key] != null && isFinite(m[key]));
    if (!valid.length) return 0;
    return parseFloat((valid.reduce((s, m) => s + m[key], 0) / valid.length).toFixed(2));
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITAIRES — Formatage export
  // ═══════════════════════════════════════════════════════════

  /**
   * Formate un timestamp en ISO 8601 lisible.
   * Supporte : Unix ms, Unix s (< 1e12), ou Date.
   */
  static #fmtTime(t) {
    if (t == null) return '';
    try {
      const ms = typeof t === 'number' && t < 1e12 ? t * 1000 : t;
      return new Date(ms).toISOString();
    } catch { return String(t); }
  }

  /**
   * Encapsule une valeur pour CSV : échappe les virgules et guillemets.
   */
  static #csvCell(v) {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }
}
