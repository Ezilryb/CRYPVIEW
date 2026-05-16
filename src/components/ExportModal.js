// ============================================================
//  src/components/ExportModal.js — CrypView V3.2
//  Modale Export & Partage.
//
//  Onglets :
//    📷 Image   — aperçu + téléchargement PNG
//    📊 Données — CSV / JSON des bougies visibles
//    🔗 Partage — URL + setup JSON
//
//  v3.2.1 : Patch accessibilité — FocusTrap, markAsDialog,
//    aria-selected sur les onglets.
//
//  Usage :
//    const modal = new ExportModal();
//    modal.open({ symbol, tf, indicators, candles, container });
// ============================================================

import {
  captureChart,
  downloadChartImage,
  exportCSV,
  exportJSON,
  buildShareURL,
  copyShareURL,
  copySetupJSON,
} from '../features/ExportManager.js';
import { FocusTrap, markAsDialog } from '../utils/a11y.js';

export class ExportModal {
  #overlay;
  #activeTab  = 'image';
  #trap;

  #symbol     = '';
  #tf         = '';
  #indicators = [];
  #candles    = [];
  #container  = null;
  #previewUrl = null;
  #generating = false;

  constructor() {
    this.#overlay = document.getElementById('export-modal-overlay');

    this.#trap = new FocusTrap(this.#overlay);
    markAsDialog(this.#overlay, this.#overlay?.querySelector('h2, h3'));

    this.#bindStaticEvents();
  }

  /**
   * @param {{ symbol:string, tf:string, indicators:string[],
   *           candles:Candle[], container:HTMLElement }} state
   */
  async open(state) {
    this.#symbol     = state.symbol     ?? '';
    this.#tf         = state.tf         ?? '';
    this.#indicators = state.indicators ?? [];
    this.#candles    = state.candles    ?? [];
    this.#container  = state.container  ?? null;
    this.#previewUrl = null;
    this.#activeTab  = 'image';

    this.#overlay.style.display = 'block';
    this.#renderMeta();
    this.#renderTabs();
    this.#renderContent();

    this.#trap.activate();

    this.#generatePreview();
  }

  close() {
    this.#trap.deactivate();
    this.#overlay.style.display = 'none';
    this.#previewUrl = null;
  }

  #renderMeta() {
    const symEl = document.getElementById('export-modal-sym');
    if (symEl) {
      const sym = this.#symbol.toUpperCase().replace('USDT', '/USDT');
      symEl.textContent = `${sym} · ${this.#tf.toUpperCase()}`;
    }
  }

  #renderTabs() {
    ['image', 'data', 'share'].forEach(tab => {
      const btn = document.getElementById(`export-tab-${tab}`);
      if (!btn) return;
      btn.classList.toggle('active', tab === this.#activeTab);
      btn.setAttribute('aria-selected', tab === this.#activeTab ? 'true' : 'false');
    });
    const content = document.getElementById('export-modal-content');
    if (content) content.style.display = 'block';
  }

  #renderContent() {
    const content = document.getElementById('export-modal-content');
    if (!content) return;

    if (this.#activeTab === 'image') {
      content.innerHTML = this.#tplImage();
      this.#bindImageEvents();
      if (this.#previewUrl) this.#injectPreview(this.#previewUrl);

    } else if (this.#activeTab === 'data') {
      const sym = this.#symbol.toUpperCase().replace('USDT', '/USDT');
      const n   = this.#candles.length;
      const t0  = n ? new Date(this.#candles[0].time * 1_000).toLocaleDateString('fr-FR') : '—';
      const t1  = n ? new Date(this.#candles.at(-1).time * 1_000).toLocaleDateString('fr-FR') : '—';
      content.innerHTML = this.#tplData(sym, n, t0, t1);
      this.#bindDataEvents();

    } else if (this.#activeTab === 'share') {
      const url = buildShareURL(this.#symbol, this.#tf, this.#indicators);
      const sym = this.#symbol.toUpperCase().replace('USDT', '/USDT');
      content.innerHTML = this.#tplShare(url, sym);
      this.#bindShareEvents(url);
    }
  }

  async #generatePreview() {
    if (this.#generating || !this.#container) return;
    this.#generating = true;

    const currentPrice = this.#candles.at(-1)?.close ?? null;

    const dataUrl = await captureChart(
      this.#container,
      this.#symbol,
      this.#tf,
      { currentPrice }
    );

    this.#previewUrl = dataUrl;
    this.#generating = false;

    if (this.#activeTab === 'image' && dataUrl) {
      this.#injectPreview(dataUrl);
    }
  }

  #injectPreview(dataUrl) {
    const wrap = document.getElementById('export-preview-wrap');
    if (!wrap) return;

    wrap.innerHTML = `<img src="${dataUrl}"
      style="width:100%;height:100%;object-fit:contain;border-radius:4px;display:block;"
      alt="Aperçu du chart">`;

    const btn = document.getElementById('export-btn-image');
    if (btn) {
      btn.disabled      = false;
      btn.style.opacity = '1';
      btn.textContent   = '📷 Télécharger PNG';
    }
  }

  #tplImage() {
    const hasPreview = !!this.#previewUrl;
    return `
      <div id="export-preview-wrap"
           style="width:100%;height:200px;background:rgba(0,0,0,.4);
                  border:1px solid var(--border);border-radius:6px;
                  overflow:hidden;margin-bottom:14px;position:relative;">
        ${hasPreview
          ? `<img src="${this.#previewUrl}"
               style="width:100%;height:100%;object-fit:contain;display:block;"
               alt="Aperçu">`
          : `<div style="display:flex;align-items:center;justify-content:center;
                         height:100%;gap:10px;color:var(--muted);font-size:11px;">
               <span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span>
               Génération de l'aperçu…
             </div>`}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button id="export-btn-image" ${hasPreview ? '' : 'disabled'}
                style="display:flex;align-items:center;justify-content:center;gap:10px;
                       padding:11px 16px;border-radius:6px;cursor:pointer;
                       font-family:'Space Mono',monospace;font-size:11px;font-weight:700;
                       background:var(--accent);color:var(--bg);border:none;
                       transition:background .15s;opacity:${hasPreview ? '1' : '.5'};">
          📷 Télécharger PNG
        </button>
        <div style="font-size:9px;color:var(--muted);text-align:center;letter-spacing:.04em;">
          Inclut : chandeliers · indicateurs · tracés · header info · watermark CrypView
        </div>
      </div>`;
  }

  #tplData(sym, n, t0, t1) {
    return `
      <div style="background:rgba(0,255,136,.04);border:1px solid rgba(0,255,136,.15);
                  border-radius:6px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:10px;color:var(--text);font-weight:700;margin-bottom:4px;">${sym}</div>
        <div style="font-size:9px;color:var(--muted);">
          ${n} bougies · ${t0} → ${t1}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button id="export-btn-csv"
                style="display:flex;align-items:center;gap:10px;padding:11px 16px;
                       border-radius:6px;cursor:pointer;font-family:'Space Mono',monospace;
                       font-size:11px;font-weight:700;
                       background:rgba(0,200,255,.1);color:#00c8ff;
                       border:1px solid rgba(0,200,255,.3);transition:all .15s;">
          📋 Exporter CSV
          <span style="margin-left:auto;font-size:9px;font-weight:400;color:rgba(0,200,255,.6);">
            datetime, OHLCV
          </span>
        </button>
        <button id="export-btn-json"
                style="display:flex;align-items:center;gap:10px;padding:11px 16px;
                       border-radius:6px;cursor:pointer;font-family:'Space Mono',monospace;
                       font-size:11px;font-weight:700;
                       background:rgba(247,201,72,.08);color:#f7c948;
                       border:1px solid rgba(247,201,72,.25);transition:all .15s;">
          { } Exporter JSON
          <span style="margin-left:auto;font-size:9px;font-weight:400;color:rgba(247,201,72,.6);">
            structuré + métadonnées
          </span>
        </button>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:10px;text-align:center;letter-spacing:.03em;">
        Données Binance WebSocket · usage personnel uniquement
      </div>`;
  }

  #tplShare(url, sym) {
    const hasNativeShare = !!navigator.share;
    return `
      <div style="margin-bottom:14px;">
        <div style="font-size:9px;color:var(--muted);text-transform:uppercase;
                    letter-spacing:1px;margin-bottom:6px;">
          🔗 Lien de partage — ${sym} · ${this.#tf.toUpperCase()}
        </div>
        <div style="display:flex;gap:6px;">
          <input id="export-share-url" readonly
                 value="${url}"
                 style="flex:1;background:var(--bg);border:1px solid var(--border);
                        color:var(--muted);padding:8px 10px;font-family:'Space Mono',monospace;
                        font-size:9px;border-radius:4px;outline:none;
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                 aria-label="URL de partage">
          <button id="export-btn-copy-url"
                  style="padding:8px 12px;border-radius:4px;cursor:pointer;
                         font-size:10px;background:rgba(0,255,136,.1);
                         border:1px solid rgba(0,255,136,.3);color:var(--accent);
                         font-family:'Space Mono',monospace;transition:all .15s;
                         white-space:nowrap;">
            📋 Copier
          </button>
        </div>
        <div style="font-size:9px;color:var(--muted);margin-top:5px;">
          Encode : symbole, timeframe${this.#indicators.length ? ` et ${this.#indicators.length} indicateur${this.#indicators.length > 1 ? 's' : ''}` : ''}.
          Le destinataire retrouve exactement le même setup.
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        ${hasNativeShare ? `
        <button id="export-btn-share"
                style="display:flex;align-items:center;gap:10px;padding:11px 16px;
                       border-radius:6px;cursor:pointer;font-family:'Space Mono',monospace;
                       font-size:11px;font-weight:700;
                       background:var(--accent);color:var(--bg);border:none;
                       transition:background .15s;">
          🚀 Partager via…
        </button>` : ''}
        <button id="export-btn-copy-setup"
                style="display:flex;align-items:center;gap:10px;padding:11px 16px;
                       border-radius:6px;cursor:pointer;font-family:'Space Mono',monospace;
                       font-size:11px;font-weight:700;
                       background:rgba(224,64,251,.08);color:#e040fb;
                       border:1px solid rgba(224,64,251,.25);transition:all .15s;">
          📁 Copier setup JSON
          <span style="margin-left:auto;font-size:9px;font-weight:400;color:rgba(224,64,251,.6);">
            sym · tf · indicators
          </span>
        </button>
      </div>`;
  }

  #bindImageEvents() {
    document.getElementById('export-btn-image')?.addEventListener('click', () => {
      if (!this.#previewUrl) return;
      downloadChartImage(this.#previewUrl, this.#symbol, this.#tf);
    });
  }

  #bindDataEvents() {
    document.getElementById('export-btn-csv')?.addEventListener('click', () => {
      exportCSV(this.#candles, this.#symbol, this.#tf);
    });
    document.getElementById('export-btn-json')?.addEventListener('click', () => {
      exportJSON(this.#candles, this.#symbol, this.#tf, this.#indicators);
    });
  }

  #bindShareEvents(url) {
    document.getElementById('export-btn-copy-url')?.addEventListener('click', () => {
      copyShareURL(url);
    });

    document.getElementById('export-share-url')?.addEventListener('focus', function() {
      this.select();
    });

    document.getElementById('export-btn-share')?.addEventListener('click', async () => {
      const sym = this.#symbol.toUpperCase().replace('USDT', '/USDT');
      try {
        await navigator.share({
          title: `CrypView — ${sym} · ${this.#tf.toUpperCase()}`,
          text:  `Analyse ${sym} sur CrypView`,
          url,
        });
      } catch (_) {
        copyShareURL(url);
      }
    });

    document.getElementById('export-btn-copy-setup')?.addEventListener('click', () => {
      copySetupJSON(this.#symbol, this.#tf, this.#indicators);
    });
  }

  #bindStaticEvents() {
    document.getElementById('export-modal-close')
      ?.addEventListener('click', () => this.close());

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#overlay?.style.display === 'block') {
        e.stopPropagation();
        this.close();
      }
    });

    ['image', 'data', 'share'].forEach(tab => {
      document.getElementById(`export-tab-${tab}`)
        ?.addEventListener('click', () => {
          this.#activeTab = tab;
          this.#renderTabs();
          this.#renderContent();
        });
    });
  }
}
