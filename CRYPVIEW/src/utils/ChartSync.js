// ============================================================
//  src/utils/ChartSync.js — CrypView V3.3
//  Synchronisation crosshair + zoom entre N graphiques.
//
//  Usage :
//    const sync = new ChartSync();
//    sync.add({ chart, cSeries });  // ajouter un panneau
//    sync.remove(chart);            // retirer (avant rebuild)
//    sync.setCrosshair(bool);
//    sync.setZoom(bool);
//    sync.destroy();
// ============================================================

export class ChartSync {
    /** @type {Array<{ chart: IChartApi, cSeries: ISeriesApi, unsubs: function[] }>} */
    #entries   = [];
    #crosshair = true;
    #zoom      = true;
    /** Verrou anti-boucle infinie lors de la propagation */
    #locking   = false;
  
    // ── Accesseurs ────────────────────────────────────────────
  
    get crosshairEnabled() { return this.#crosshair; }
    get zoomEnabled()      { return this.#zoom; }
    get size()             { return this.#entries.length; }
  
    // ── API publique ──────────────────────────────────────────
  
    /**
     * Ajoute un graphique au groupe synchronisé.
     * @param {{ chart: IChartApi, cSeries: ISeriesApi }} inst
     */
    add(inst) {
      if (!inst?.chart) return;
      if (this.#entries.find(e => e.chart === inst.chart)) return; // déduplique
      this.#entries.push({ chart: inst.chart, cSeries: inst.cSeries, unsubs: [] });
      this.#rebind();
    }
  
    /**
     * Retire un graphique (appeler avant de le détruire/recréer).
     * @param {IChartApi} chart
     */
    remove(chart) {
      const idx = this.#entries.findIndex(e => e.chart === chart);
      if (idx === -1) return;
      this.#unsubEntry(this.#entries[idx]);
      this.#entries.splice(idx, 1);
      this.#rebind();
    }
  
    /** Active/désactive la synchronisation du crosshair à chaud. */
    setCrosshair(enabled) { this.#crosshair = enabled; this.#rebind(); }
  
    /** Active/désactive la synchronisation du zoom/pan à chaud. */
    setZoom(enabled)      { this.#zoom      = enabled; this.#rebind(); }
  
    /** Libère toutes les souscriptions. */
    destroy() {
      this.#entries.forEach(e => this.#unsubEntry(e));
      this.#entries = [];
    }
  
    // ── Privé ─────────────────────────────────────────────────
  
    #unsubEntry(entry) {
      entry.unsubs.forEach(fn => { try { fn(); } catch (_) {} });
      entry.unsubs = [];
    }
  
    #rebind() {
      // Retire les anciens abonnements de toutes les entrées
      this.#entries.forEach(e => this.#unsubEntry(e));
      if (this.#entries.length < 2) return;
  
      for (const src of this.#entries) {
  
        // ── Crosshair ─────────────────────────────────────────
        if (this.#crosshair) {
          const onCross = (param) => {
            if (this.#locking) return;
            this.#locking = true;
            for (const dst of this.#entries) {
              if (dst === src) continue;
              try {
                if (param.time == null) {
                  dst.chart.clearCrosshairPosition();
                } else {
                  // Extrait le close de la bougie sous le curseur source
                  const bar   = param.seriesData?.get(src.cSeries);
                  const price = bar?.close ?? bar?.value ?? 0;
                  dst.chart.setCrosshairPosition(price, param.time, dst.cSeries);
                }
              } catch (_) {}
            }
            this.#locking = false;
          };
          src.chart.subscribeCrosshairMove(onCross);
          src.unsubs.push(() => {
            try { src.chart.unsubscribeCrosshairMove(onCross); } catch (_) {}
          });
        }
  
        // ── Zoom / Pan ────────────────────────────────────────
        if (this.#zoom) {
          const onRange = (range) => {
            if (this.#locking || !range) return;
            this.#locking = true;
            for (const dst of this.#entries) {
              if (dst === src) continue;
              try { dst.chart.timeScale().setVisibleLogicalRange(range); } catch (_) {}
            }
            this.#locking = false;
          };
          src.chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
          src.unsubs.push(() => {
            try { src.chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange); } catch (_) {}
          });
        }
      }
    }
  }