// ============================================================
//  src/features/ExportManager.js — CrypView V3.2
//  Export & Partage : capture chart, CSV/JSON, URL, setup.
//
//  v3.3 : Refonte export image
//    - Canvas étendu (HEADER_H + FOOTER_H) → chart non rogné
//    - Header riche : logo · symbole · badge TF · exchange ·
//      prix courant · dot live · date/heure
//    - Footer : domaine + disclaimer
//    - Hiérarchie visuelle et typographique claire
//    - Helper _roundRect (cross-browser, sans ctx.roundRect natif)
// ============================================================

import { showToast }              from '../utils/toast.js';
import { fmtPrice, fmtDate, fmtTime } from '../utils/format.js';

// ── Constantes layout export ──────────────────────────────────
const EXPORT_HEADER_H = 48;
const EXPORT_FOOTER_H = 26;

// ── Palette export (indépendante du thème runtime) ────────────
const EX = {
  BG:        '#070a0f',
  PANEL:     '#0d1117',
  BORDER:    '#1c2333',
  ACCENT:    '#00ff88',
  CYAN:      '#00c8ff',
  YELLOW:    '#f7c948',
  TEXT:      '#e6edf3',
  MUTED:     '#8b949e',
  DIM:       '#485263',
  DARKDIM:   '#2d3748',
};

// ── Helper : rect arrondi cross-browser ───────────────────────
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Capture Chart ─────────────────────────────────────────────

/**
 * Composite tous les canvas du container chart en un PNG.
 * Le canvas de sortie est étendu : HEADER_H px au-dessus du chart
 * et FOOTER_H px en dessous — le contenu du graphique n'est jamais rogné.
 *
 * @param {HTMLElement} container — div#chart-container ou .chart-area-inner
 * @param {string}      symbol
 * @param {string}      tf
 * @param {object}      [options]
 * @param {number|null} [options.currentPrice] — dernier prix de clôture connu
 * @returns {Promise<string|null>} dataURL PNG ou null en cas d'échec
 */
export async function captureChart(container, symbol, tf, options = {}) {
  if (!container) return null;

  try {
    const W = container.offsetWidth;
    const H = container.offsetHeight;
    if (!W || !H) return null;

    const totalH = H + EXPORT_HEADER_H + EXPORT_FOOTER_H;

    const output    = document.createElement('canvas');
    output.width    = W;
    output.height   = totalH;
    const ctx       = output.getContext('2d');

    // ── Fond global ──────────────────────────────────────────
    ctx.fillStyle = EX.BG;
    ctx.fillRect(0, 0, W, totalH);

    const cRect = container.getBoundingClientRect();

    // ── Canvases chart décalés de HEADER_H ───────────────────
    // LightweightCharts crée 2 canvas superposés + VP / FP / OF.
    const canvases = [...container.querySelectorAll('canvas')];
    for (const c of canvases) {
      if (!c.width || !c.height || c.style.display === 'none') continue;
      try {
        const rect = c.getBoundingClientRect();
        const x    = rect.left - cRect.left;
        const y    = rect.top  - cRect.top;
        ctx.drawImage(c, x, y + EXPORT_HEADER_H, rect.width, rect.height);
      } catch (_) {
        // Canvas cross-origin tainted → ignoré
      }
    }

    // ── SVG drawings décalé de HEADER_H ─────────────────────
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      await _drawSVGOnCanvas(ctx, svgEl, cRect, EXPORT_HEADER_H);
    }

    // ── Header et Footer ─────────────────────────────────────
    _drawExportHeader(ctx, W, EXPORT_HEADER_H, symbol, tf, options);
    _drawExportFooter(ctx, W, H + EXPORT_HEADER_H, EXPORT_FOOTER_H);

    return output.toDataURL('image/png');

  } catch (err) {
    console.warn('[ExportManager] captureChart:', err);
    return null;
  }
}

/**
 * Sérialise un SVG et le dessine sur le canvas de destination.
 * @param {CanvasRenderingContext2D} ctx
 * @param {SVGElement}              svgEl
 * @param {DOMRect}                 cRect    — rect du container parent
 * @param {number}                  yOffset  — décalage vertical (header)
 */
async function _drawSVGOnCanvas(ctx, svgEl, cRect, yOffset = 0) {
  return new Promise(resolve => {
    try {
      const svgRect = svgEl.getBoundingClientRect();
      const x       = svgRect.left - cRect.left;
      const y       = svgRect.top  - cRect.top + yOffset;

      const clone = svgEl.cloneNode(true);
      clone.setAttribute('width',  svgRect.width);
      clone.setAttribute('height', svgRect.height);

      const serialized = new XMLSerializer().serializeToString(clone);
      const b64        = btoa(unescape(encodeURIComponent(serialized)));
      const src        = `data:image/svg+xml;base64,${b64}`;

      const img    = new Image();
      img.onload  = () => { ctx.drawImage(img, x, y, svgRect.width, svgRect.height); resolve(); };
      img.onerror = resolve;
      img.src     = src;
    } catch (_) {
      resolve();
    }
  });
}

// ── Header riche ──────────────────────────────────────────────

/**
 * Dessine le header export :
 * [CRYPVIEW] | [Symbol] [TF badge] [Exchange]          [Prix] ● [Date] [Heure]
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number}  W
 * @param {number}  H        — hauteur du header
 * @param {string}  symbol
 * @param {string}  tf
 * @param {object}  [opts]
 * @param {number}  [opts.currentPrice]
 */
function _drawExportHeader(ctx, W, H, symbol, tf, opts = {}) {
  const MID = Math.round(H / 2);

  // ── Fond ──────────────────────────────────────────────────
  ctx.fillStyle = EX.PANEL;
  ctx.fillRect(0, 0, W, H);

  // ── Ligne d'accent dégradée en bas ────────────────────────
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0,    'rgba(0,255,136,0)');
  lineGrad.addColorStop(0.15, 'rgba(0,255,136,0.55)');
  lineGrad.addColorStop(0.85, 'rgba(0,255,136,0.55)');
  lineGrad.addColorStop(1,    'rgba(0,255,136,0)');
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, H - 1, W, 1);

  ctx.textBaseline = 'middle';

  const sym   = symbol.toUpperCase().replace('USDT', '/USDT');
  const tfStr = tf.toUpperCase();
  const now     = new Date();
  const dateStr = fmtDate(now.getTime(), { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = fmtTime(now.getTime());

  // ── PRÉ-MESURE (avant tout dessin) ────────────────────────
  ctx.font = 'bold 13px "Space Mono", monospace';
  const crypW = ctx.measureText('CRYP').width;
  const viewW = ctx.measureText('VIEW').width;

  ctx.font = 'bold 17px "Syne", Arial, sans-serif';
  const symW = ctx.measureText(sym).width;

  ctx.font = 'bold 10px "Space Mono", monospace';
  const tfTextW = ctx.measureText(tfStr).width;
  const tfBadgeW = tfTextW + 16;

  ctx.font = '10px "Space Mono", monospace';
  const exchW = ctx.measureText('Binance').width;

  ctx.font = '10px "Space Mono", monospace';
  const dateBlockW = Math.max(
    ctx.measureText(dateStr).width,
    ctx.measureText(timeStr).width
  );

  const priceStr = opts.currentPrice ? fmtPrice(opts.currentPrice) : null;
  let priceW = 0;
  if (priceStr) {
    ctx.font = 'bold 14px "Syne", Arial, sans-serif';
    priceW = ctx.measureText(priceStr).width;
  }

  // ── BLOC GAUCHE ────────────────────────────────────────────
  let x = 16;

  // Logo CRYPVIEW
  ctx.font      = 'bold 13px "Space Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = EX.ACCENT;
  ctx.fillText('CRYP', x, MID);
  x += crypW;

  ctx.fillStyle = EX.DIM;
  ctx.fillText('VIEW', x, MID);
  x += viewW;

  // Séparateur vertical
  x += 13;
  ctx.fillStyle = EX.BORDER;
  ctx.fillRect(x, MID - 13, 1, 26);
  x += 13;

  // Symbole
  ctx.font      = 'bold 17px "Syne", Arial, sans-serif';
  ctx.fillStyle = EX.TEXT;
  ctx.fillText(sym, x, MID + 1);
  x += symW;

  // Badge TF
  x += 9;
  const tfBadgeH = 20;
  const tfBadgeY = MID - tfBadgeH / 2;

  ctx.fillStyle = 'rgba(0,200,255,0.10)';
  _roundRect(ctx, x, tfBadgeY, tfBadgeW, tfBadgeH, 3);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,200,255,0.28)';
  ctx.lineWidth   = 1;
  _roundRect(ctx, x, tfBadgeY, tfBadgeW, tfBadgeH, 3);
  ctx.stroke();

  ctx.font      = 'bold 10px "Space Mono", monospace';
  ctx.fillStyle = EX.CYAN;
  ctx.textAlign = 'center';
  ctx.fillText(tfStr, x + tfBadgeW / 2, MID + 0.5);
  x += tfBadgeW;

  // Exchange
  x += 11;
  ctx.font      = '10px "Space Mono", monospace';
  ctx.fillStyle = EX.DIM;
  ctx.textAlign = 'left';
  ctx.fillText('Binance', x, MID + 0.5);

  // ── BLOC DROIT ─────────────────────────────────────────────
  // Ordre (de droite à gauche) : [date/heure] ← [dot] ← [|] ← [prix]
  ctx.textAlign = 'right';

  // Date (ligne haute)
  ctx.font      = '10px "Space Mono", monospace';
  ctx.fillStyle = EX.MUTED;
  ctx.fillText(dateStr, W - 14, MID - 6);

  // Heure (ligne basse)
  ctx.font      = '9px "Space Mono", monospace';
  ctx.fillStyle = EX.DIM;
  ctx.fillText(timeStr, W - 14, MID + 7);

  // Dot live (à gauche du bloc date)
  const dotX = W - 14 - dateBlockW - 13;
  ctx.fillStyle = EX.ACCENT;
  ctx.beginPath();
  ctx.arc(dotX, MID, 4, 0, Math.PI * 2);
  ctx.fill();

  // Halo dot
  ctx.strokeStyle = 'rgba(0,255,136,0.18)';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(dotX, MID, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  // Prix courant (si disponible)
  if (priceStr) {
    // Séparateur prix / dot
    const sepX = dotX - 14;
    ctx.fillStyle = EX.BORDER;
    ctx.fillRect(sepX, MID - 13, 1, 26);

    ctx.font      = 'bold 14px "Syne", Arial, sans-serif';
    ctx.fillStyle = EX.YELLOW;
    ctx.textAlign = 'right';
    ctx.fillText(priceStr, sepX - 10, MID + 1);
  }
}

// ── Footer ───────────────────────────────────────────────────

/**
 * Dessine le footer export : domaine à gauche, disclaimer à droite.
 */
function _drawExportFooter(ctx, W, Y, H) {
  // Fond
  ctx.fillStyle = 'rgba(7,10,15,0.92)';
  ctx.fillRect(0, Y, W, H);

  // Bordure haute
  ctx.fillStyle = EX.BORDER;
  ctx.fillRect(0, Y, W, 1);

  ctx.textBaseline = 'middle';
  const MID = Y + H / 2 + 0.5;

  // Domaine
  ctx.font      = '8px "Space Mono", monospace';
  ctx.fillStyle = EX.DARKDIM;
  ctx.textAlign = 'left';
  ctx.fillText('betacapital.enterprise', 14, MID);

  // Disclaimer
  ctx.textAlign = 'right';
  ctx.fillText('Données Binance · À titre informatif uniquement · Risque de perte en capital', W - 14, MID);
}

// ── Téléchargements ───────────────────────────────────────────

/**
 * Déclenche le téléchargement d'une image PNG.
 * @param {string} dataUrl
 * @param {string} symbol
 * @param {string} tf
 */
export function downloadChartImage(dataUrl, symbol, tf) {
  if (!dataUrl) return;
  const sym  = symbol.toUpperCase().replace('USDT', 'USDT');
  const date = new Date().toISOString().slice(0, 10);
  _triggerDownload(dataUrl, `crypview_${sym}_${tf}_${date}.png`);
  showToast('✓ Image exportée', 'success', 2_500);
}

/**
 * Génère et télécharge un fichier CSV des bougies.
 * @param {Candle[]} candles
 * @param {string}   symbol
 * @param {string}   tf
 */
export function exportCSV(candles, symbol, tf) {
  if (!candles.length) {
    showToast('Aucune donnée à exporter.', 'warning');
    return;
  }

  const header = 'datetime,open,high,low,close,volume';
  const rows   = candles.map(c => {
    const dt = new Date(c.time * 1_000).toISOString();
    return `${dt},${c.open},${c.high},${c.low},${c.close},${c.volume}`;
  });

  const csv  = [header, ...rows].join('\n');
  const sym  = symbol.toUpperCase();
  const date = new Date().toISOString().slice(0, 10);
  _triggerDownload(
    `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
    `crypview_${sym}_${tf}_${date}.csv`
  );
  showToast(`✓ CSV exporté — ${candles.length} bougies`, 'success', 2_500);
}

/**
 * Génère et télécharge un fichier JSON structuré.
 * @param {Candle[]} candles
 * @param {string}   symbol
 * @param {string}   tf
 * @param {string[]} [indicators]
 */
export function exportJSON(candles, symbol, tf, indicators = []) {
  if (!candles.length) {
    showToast('Aucune donnée à exporter.', 'warning');
    return;
  }

  const payload = {
    meta: {
      source:     'CrypView · Binance WebSocket',
      symbol:     symbol.toUpperCase(),
      timeframe:  tf,
      indicators,
      exportedAt: new Date().toISOString(),
      count:      candles.length,
    },
    candles: candles.map(c => ({
      datetime: new Date(c.time * 1_000).toISOString(),
      time:     c.time,
      open:     c.open,
      high:     c.high,
      low:      c.low,
      close:    c.close,
      volume:   c.volume,
    })),
  };

  const sym  = symbol.toUpperCase();
  const date = new Date().toISOString().slice(0, 10);
  _triggerDownload(
    `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`,
    `crypview_${sym}_${tf}_${date}.json`
  );
  showToast(`✓ JSON exporté — ${candles.length} bougies`, 'success', 2_500);
}

// ── URL de partage ────────────────────────────────────────────

/**
 * Construit l'URL de partage encodant la configuration complète.
 * Format : page.html?sym=btcusdt&tf=1h&ind=rsi,macd,bb
 *
 * @param {string}   symbol
 * @param {string}   tf
 * @param {string[]} indicators
 * @returns {string}
 */
export function buildShareURL(symbol, tf, indicators = []) {
  const params = new URLSearchParams();
  params.set('sym', symbol.toLowerCase());
  params.set('tf',  tf);
  if (indicators.length) params.set('ind', indicators.join(','));

  const path = location.pathname.includes('multi')
    ? location.pathname
    : `${location.pathname.replace(/[^/]*$/, '')}page.html`;

  return `${location.origin}${path}?${params.toString()}`;
}

/**
 * Copie l'URL dans le presse-papiers.
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function copyShareURL(url) {
  await _copyToClipboard(url, '✓ Lien copié dans le presse-papiers');
}

/**
 * Copie la configuration complète en JSON.
 * @param {string}   symbol
 * @param {string}   tf
 * @param {string[]} indicators
 * @returns {Promise<void>}
 */
export async function copySetupJSON(symbol, tf, indicators = []) {
  const setup = {
    symbol:     symbol.toUpperCase(),
    timeframe:  tf,
    indicators,
    exportedAt: new Date().toISOString(),
    importHint: `Collez dans CrypView → Importer setup (⌘V sur le champ de recherche)`,
  };
  await _copyToClipboard(
    JSON.stringify(setup, null, 2),
    '✓ Setup copié (JSON)'
  );
}

/**
 * Lit les paramètres d'une URL de partage CrypView.
 * @param {string} [search=location.search]
 * @returns {{ symbol: string|null, tf: string|null, indicators: string[] }}
 */
export function parseShareURL(search = location.search) {
  const params = new URLSearchParams(search);
  return {
    symbol:     params.get('sym') ?? null,
    tf:         params.get('tf')  ?? null,
    indicators: params.get('ind')
      ? params.get('ind').split(',').filter(Boolean)
      : [],
  };
}

// ── Helpers privés ────────────────────────────────────────────

function _triggerDownload(href, filename) {
  const a         = document.createElement('a');
  a.href          = href;
  a.download      = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function _copyToClipboard(text, successMsg) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback HTTP (Vite dev)
      const ta        = document.createElement('textarea');
      ta.value        = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast(successMsg, 'success', 2_500);
  } catch (_) {
    showToast('Copie échouée — vérifiez les autorisations du navigateur.', 'error');
  }
}
