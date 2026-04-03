// ============================================================
//  src/features/ExportManager.js — CrypView V3.2
//  Export & Partage : capture chart, CSV/JSON, URL, setup.
//
//  Fonctionnalités :
//    - captureChart()   → composite de tous les canvas + SVG drawings
//    - exportCSV()      → téléchargement CSV des bougies visibles
//    - exportJSON()     → téléchargement JSON structuré
//    - buildShareURL()  → lien encodant sym/tf/indicators
//    - copyShareURL()   → copie dans le presse-papiers
//    - copySetupJSON()  → copie config complète en JSON
//
//  Aucune dépendance externe — Web APIs natives uniquement.
// ============================================================

import { showToast } from '../utils/toast.js';

// ── Capture Chart ─────────────────────────────────────────────

/**
 * Composite tous les canvas du container chart en un PNG.
 * Inclut : chart LightweightCharts, VP/FP/OF canvas, SVG drawings.
 *
 * @param {HTMLElement} container — div#chart-container ou .chart-area-inner
 * @param {string}      symbol
 * @param {string}      tf
 * @returns {Promise<string|null>} dataURL PNG ou null en cas d'échec
 */
export async function captureChart(container, symbol, tf) {
  if (!container) return null;

  try {
    const W = container.offsetWidth;
    const H = container.offsetHeight;
    if (!W || !H) return null;

    // Canvas de sortie en résolution native (sans DPR pour éviter les bugs de taille)
    const output = document.createElement('canvas');
    output.width  = W;
    output.height = H;
    const ctx     = output.getContext('2d');

    // Fond opaque (le chart est transparent par défaut dans certains browsers)
    ctx.fillStyle = '#070a0f';
    ctx.fillRect(0, 0, W, H);

    const cRect = container.getBoundingClientRect();

    // ── Composite tous les canvas (chart + overlays) ──────────
    // LightweightCharts crée 2 canvas superposés + éventuels VP/FP/OF canvas.
    // getBoundingClientRect() donne les coordonnées CSS (indépendant du DPR).
    const canvases = [...container.querySelectorAll('canvas')];
    for (const c of canvases) {
      if (!c.width || !c.height) continue;
      // Ignorer les canvas masqués (display:none)
      if (c.style.display === 'none') continue;
      try {
        const rect = c.getBoundingClientRect();
        const x    = rect.left - cRect.left;
        const y    = rect.top  - cRect.top;
        // drawImage avec les dimensions CSS pour gérer le DPR automatiquement
        ctx.drawImage(c, x, y, rect.width, rect.height);
      } catch (_) {
        // Sécurité CORS (canvas cross-origin tainted) → on ignore
      }
    }

    // ── Overlay SVG (Drawing Tools) ───────────────────────────
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      await _drawSVGOnCanvas(ctx, svgEl, cRect);
    }

    // ── Watermark ─────────────────────────────────────────────
    _drawWatermark(ctx, W, H, symbol, tf);

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
 * @param {DOMRect}                 cRect — rect du container parent
 */
async function _drawSVGOnCanvas(ctx, svgEl, cRect) {
  return new Promise(resolve => {
    try {
      const svgRect = svgEl.getBoundingClientRect();
      const x       = svgRect.left - cRect.left;
      const y       = svgRect.top  - cRect.top;

      // Force les dimensions dans le SVG pour que l'Image l'interprète correctement
      const clone = svgEl.cloneNode(true);
      clone.setAttribute('width',  svgRect.width);
      clone.setAttribute('height', svgRect.height);

      const serialized = new XMLSerializer().serializeToString(clone);
      // Encode en base64 pour éviter les problèmes de caractères
      const b64  = btoa(unescape(encodeURIComponent(serialized)));
      const src  = `data:image/svg+xml;base64,${b64}`;

      const img  = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, y, svgRect.width, svgRect.height);
        resolve();
      };
      img.onerror = resolve; // Ne bloque pas si le SVG est vide/invalide
      img.src     = src;
    } catch (_) {
      resolve();
    }
  });
}

/**
 * Ajoute un watermark discret en bas du canvas.
 */
function _drawWatermark(ctx, W, H, symbol, tf) {
  const sym  = symbol.toUpperCase().replace('USDT', '/USDT');
  const date = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Bandeau semi-transparent
  ctx.fillStyle = 'rgba(7,10,15,0.65)';
  ctx.fillRect(0, H - 22, W, 22);

  ctx.font      = 'bold 10px "Space Mono", monospace';
  ctx.fillStyle = '#00ff88';
  ctx.textAlign = 'left';
  ctx.fillText('CrypView', 8, H - 7);

  ctx.fillStyle = 'rgba(139,148,158,0.85)';
  ctx.textAlign = 'right';
  ctx.fillText(`${sym} · ${tf.toUpperCase()} · ${date}`, W - 8, H - 7);
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

  // Chemin de base relatif (fonctionne en dev Vite et en prod)
  const path = location.pathname.includes('multi')
    ? location.pathname                  // garde multi2.html / multi4.html
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
  const a      = document.createElement('a');
  a.href       = href;
  a.download   = filename;
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
      // Fallback pour les contextes non-HTTPS (Vite dev en HTTP)
      const ta = document.createElement('textarea');
      ta.value = text;
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
