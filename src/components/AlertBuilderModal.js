// ============================================================
//  src/components/AlertBuilderModal.js — CrypView V3.0
//  Constructeur d'alertes avancé — multi-conditions ET/OU.
//
//  Interface :
//    - Nom optionnel
//    - Liste de conditions dynamique (ajout / suppression)
//    - Logique AND / OR entre conditions
//    - Section comportement (repeat, cooldown, expiration)
//    - Valeurs de référence en temps réel (prix, RSI…)
//
//  Usage :
//    const builder = new AlertBuilderModal();
//    builder.open(symbol, snapshot)
//      .then(cfg => cfg && alertManager.add(cfg));
// ============================================================

import { CONDITION_TYPE, CONDITION_META } from '../features/AlertManagerV2.js';
import { fmtPrice }                       from '../utils/format.js';
import { FocusTrap, markAsDialog }        from '../utils/a11y.js';

const CONDITION_GROUPS = [
  {
    label: '💰 Prix',
    types: [CONDITION_TYPE.PRICE_ABOVE, CONDITION_TYPE.PRICE_BELOW,
            CONDITION_TYPE.PRICE_PCT_UP, CONDITION_TYPE.PRICE_PCT_DOWN],
  },
  {
    label: '📊 Volume',
    types: [CONDITION_TYPE.VOLUME_SPIKE],
  },
  {
    label: '〽️ Indicateurs',
    types: [CONDITION_TYPE.RSI_ABOVE, CONDITION_TYPE.RSI_BELOW,
            CONDITION_TYPE.MACD_CROSS_UP, CONDITION_TYPE.MACD_CROSS_DOWN],
  },
  {
    label: '🚀 Breakout',
    types: [CONDITION_TYPE.BREAKOUT_HIGH, CONDITION_TYPE.BREAKOUT_LOW],
  },
];

const TYPE_LABELS = {
  [CONDITION_TYPE.PRICE_ABOVE]:     'Prix au-dessus de',
  [CONDITION_TYPE.PRICE_BELOW]:     'Prix en-dessous de',
  [CONDITION_TYPE.PRICE_PCT_UP]:    'Hausse % (depuis ouverture 24h)',
  [CONDITION_TYPE.PRICE_PCT_DOWN]:  'Baisse % (depuis ouverture 24h)',
  [CONDITION_TYPE.VOLUME_SPIKE]:    'Volume spike (× moyenne)',
  [CONDITION_TYPE.RSI_ABOVE]:       'RSI ≥ seuil',
  [CONDITION_TYPE.RSI_BELOW]:       'RSI ≤ seuil',
  [CONDITION_TYPE.MACD_CROSS_UP]:   'Croisement MACD haussier ↑',
  [CONDITION_TYPE.MACD_CROSS_DOWN]: 'Croisement MACD baissier ↓',
  [CONDITION_TYPE.BREAKOUT_HIGH]:   'Breakout résistance (N bougies)',
  [CONDITION_TYPE.BREAKOUT_LOW]:    'Breakout support (N bougies)',
};

const TYPE_CONFIG = {
  [CONDITION_TYPE.PRICE_ABOVE]:     { placeholder: '67000', unit: '' },
  [CONDITION_TYPE.PRICE_BELOW]:     { placeholder: '65000', unit: '' },
  [CONDITION_TYPE.PRICE_PCT_UP]:    { placeholder: '5',     unit: '%' },
  [CONDITION_TYPE.PRICE_PCT_DOWN]:  { placeholder: '5',     unit: '%' },
  [CONDITION_TYPE.VOLUME_SPIKE]:    { placeholder: '3',     unit: '×' },
  [CONDITION_TYPE.RSI_ABOVE]:       { placeholder: '70',    unit: '' },
  [CONDITION_TYPE.RSI_BELOW]:       { placeholder: '30',    unit: '' },
  [CONDITION_TYPE.MACD_CROSS_UP]:   { placeholder: null,    unit: '' },
  [CONDITION_TYPE.MACD_CROSS_DOWN]: { placeholder: null,    unit: '' },
  [CONDITION_TYPE.BREAKOUT_HIGH]:   { placeholder: '20',    unit: 'b' },
  [CONDITION_TYPE.BREAKOUT_LOW]:    { placeholder: '20',    unit: 'b' },
};

export class AlertBuilderModal {
  #overlay;
  #symbol    = '';
  #snapshot  = null;
  #resolve   = null;
  #condRows  = [];
  #expanded  = false;
  #trap;

  constructor() {
    this.#overlay = document.getElementById('alert-builder-overlay');
    this.#trap    = new FocusTrap(this.#overlay);
    markAsDialog(this.#overlay, this.#overlay?.querySelector('h2, h3'));
    this.#bindStaticEvents();
  }

  /**
   *
   * @param {string} symbol
   * @param {object} [snapshot]
   * @returns {Promise<object|null>}
   */
  open(symbol, snapshot = {}) {
    return new Promise(resolve => {
      this.#symbol   = symbol.toUpperCase();
      this.#snapshot = snapshot;
      this.#resolve  = resolve;
      this.#reset();
      this.#render();
      this.#overlay.style.display = 'block';
      this.#trap.activate(this.#condRows[0]?.valueInput ?? null);
    });
  }

  close(result = null) {
    if (!this.#resolve) return;
    this.#trap.deactivate();
    this.#overlay.style.display = 'none';
    const r = this.#resolve;
    this.#resolve = null;
    r(result);
  }

  #render() {
    const symEl = document.getElementById('alert-builder-sym');
    if (symEl) symEl.textContent = this.#symbol.replace('USDT', '/USDT');

    const nameInput = document.getElementById('alert-builder-name');
    if (nameInput) nameInput.value = '';

    const logicSel = document.getElementById('alert-builder-logic');
    if (logicSel) logicSel.value = 'AND';

    const behaviorToggle = document.getElementById('alert-builder-behavior-toggle');
    if (behaviorToggle) behaviorToggle.textContent = '⚙ Options avancées ▸';
    this.#expanded = false;
    const behEl = document.getElementById('alert-builder-behavior');
    if (behEl) behEl.style.display = 'none';

    this.#setField('ab-repeat', false);
    this.#setField('ab-cooldown', '5');
    this.#setField('ab-max-triggers', '0');
    this.#setField('ab-expiration', '0');
    this.#toggleCooldownVisibility(false);

    this.#clearConditions();
    this.#addConditionRow(CONDITION_TYPE.PRICE_ABOVE);

    this.#updatePreview();
  }

  #reset() {
    this.#condRows = [];
    this.#expanded = false;
  }

  #clearConditions() {
    const container = document.getElementById('alert-builder-conditions');
    if (container) container.innerHTML = '';
    this.#condRows = [];
  }

  #addConditionRow(type = CONDITION_TYPE.PRICE_ABOVE) {
    const container = document.getElementById('alert-builder-conditions');
    if (!container) return;

    const row = document.createElement('div');
    row.style.cssText = `
      display:flex; align-items:center; gap:6px;
      margin-bottom:6px; animation:fadeCondIn .18s ease;
    `;

    const typeSelect = document.createElement('select');
    typeSelect.style.cssText = `
      flex:1; background:var(--bg); border:1px solid var(--border);
      color:var(--text); padding:7px 8px;
      font-family:'Space Mono',monospace; font-size:10px;
      border-radius:4px; outline:none; cursor:pointer;
      transition:border-color .15s;
    `;

    CONDITION_GROUPS.forEach(group => {
      const og = document.createElement('optgroup');
      og.label = group.label;
      group.types.forEach(t => {
        const opt = document.createElement('option');
        opt.value       = t;
        opt.textContent = TYPE_LABELS[t] ?? t;
        if (t === type) opt.selected = true;
        og.appendChild(opt);
      });
      typeSelect.appendChild(og);
    });

    const cfg         = TYPE_CONFIG[type] ?? {};
    const valueInput  = document.createElement('input');
    const noVal = CONDITION_META[type]?.noValue;
    valueInput.type         = 'number';
    valueInput.placeholder  = cfg.placeholder ?? '';
    valueInput.style.cssText = `
      width:90px; background:var(--bg); border:1px solid var(--border);
      color:var(--text); padding:7px 8px;
      font-family:'Space Mono',monospace; font-size:11px; font-weight:700;
      border-radius:4px; outline:none; text-align:center;
      transition:border-color .15s;
      display:${noVal ? 'none' : 'block'};
    `;

    const unitRef = document.createElement('span');
    unitRef.style.cssText = 'font-size:10px; color:var(--muted); white-space:nowrap; flex-shrink:0;';
    this.#updateUnitRef(unitRef, type);

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.style.cssText = `
      background:none; border:none; color:var(--muted);
      cursor:pointer; font-size:13px; padding:4px 6px;
      border-radius:3px; flex-shrink:0; transition:color .15s;
    `;
    delBtn.addEventListener('mouseenter', () => { delBtn.style.color = 'var(--red)'; });
    delBtn.addEventListener('mouseleave', () => { delBtn.style.color = 'var(--muted)'; });
    delBtn.addEventListener('click', () => {
      if (this.#condRows.length <= 1) return;
      row.remove();
      this.#condRows = this.#condRows.filter(r => r.el !== row);
      this.#updatePreview();
    });

    typeSelect.addEventListener('change', () => {
      const newType  = typeSelect.value;
      const newCfg   = TYPE_CONFIG[newType] ?? {};
      const newNoVal = CONDITION_META[newType]?.noValue;
      valueInput.placeholder    = newCfg.placeholder ?? '';
      valueInput.style.display  = newNoVal ? 'none' : 'block';
      valueInput.value          = '';
      this.#updateUnitRef(unitRef, newType);
      this.#updatePreview();
    });

    valueInput.addEventListener('input', () => this.#updatePreview());
    typeSelect.addEventListener('focus', () => { typeSelect.style.borderColor = 'var(--accent)'; });
    typeSelect.addEventListener('blur',  () => { typeSelect.style.borderColor = 'var(--border)'; });
    valueInput.addEventListener('focus', () => { valueInput.style.borderColor = 'var(--accent)'; });
    valueInput.addEventListener('blur',  () => { valueInput.style.borderColor = 'var(--border)'; });

    row.append(typeSelect, valueInput, unitRef, delBtn);
    container.appendChild(row);
    this.#condRows.push({ el: row, typeSelect, valueInput });
  }

  #updateUnitRef(el, type) {
    const cfg  = TYPE_CONFIG[type] ?? {};
    const snap = this.#snapshot ?? {};

    let ref = '';
    switch (type) {
      case CONDITION_TYPE.PRICE_ABOVE:
      case CONDITION_TYPE.PRICE_BELOW:
        ref = snap.price ? `actuel : ${fmtPrice(snap.price)}` : '';
        break;
      case CONDITION_TYPE.PRICE_PCT_UP:
      case CONDITION_TYPE.PRICE_PCT_DOWN:
        ref = snap.pctChange24h != null
          ? `24h : ${snap.pctChange24h >= 0 ? '+' : ''}${snap.pctChange24h.toFixed(2)}%`
          : '';
        break;
      case CONDITION_TYPE.RSI_ABOVE:
      case CONDITION_TYPE.RSI_BELOW:
        ref = snap.rsi != null ? `RSI : ${snap.rsi.toFixed(1)}` : 'RSI inactif';
        break;
      case CONDITION_TYPE.MACD_CROSS_UP:
      case CONDITION_TYPE.MACD_CROSS_DOWN:
        ref = snap.macd
          ? `MACD ${snap.macd.macd > snap.macd.signal ? '>' : '<'} Signal`
          : 'MACD inactif';
        break;
      case CONDITION_TYPE.BREAKOUT_HIGH:
      case CONDITION_TYPE.BREAKOUT_LOW:
        ref = '(N = lookback)';
        break;
      default:
        ref = cfg.unit ? cfg.unit : '';
    }

    const unit = cfg.unit && !CONDITION_META[type]?.noValue ? cfg.unit + ' ' : '';
    el.textContent = ref ? `${unit}${ref}` : unit;
  }

  #updatePreview() {
    const previewEl = document.getElementById('alert-builder-preview');
    if (!previewEl) return;

    const logic   = document.getElementById('alert-builder-logic')?.value ?? 'AND';
    const sep     = logic === 'AND' ? ' ET ' : ' OU ';

    const parts = this.#condRows.map(row => {
      const t      = row.typeSelect.value;
      const v      = row.valueInput.value;
      const meta   = CONDITION_META[t];
      if (!meta) return '';
      if (meta.noValue) return `${meta.icon} ${meta.label} ${meta.sub}`;
      const cfg = TYPE_CONFIG[t] ?? {};
      const unit = cfg.unit ? ' ' + cfg.unit : '';
      return `${meta.icon} ${meta.label} ${meta.sub} ${v || '…'}${unit}`;
    }).filter(Boolean);

    previewEl.innerHTML = parts.length
      ? `<span style="color:var(--accent)">▸</span> ${this.#symbol} — ${parts.join(`<span style="color:var(--muted)">${sep}</span>`)}`
      : '';
  }

  #buildConfig() {
    const conditions = [];

    for (const row of this.#condRows) {
      const type   = row.typeSelect.value;
      const meta   = CONDITION_META[type];
      const noVal  = meta?.noValue ?? false;

      let value = null;
      if (!noVal) {
        const parsed = parseFloat(row.valueInput.value);
        if (isNaN(parsed) || parsed <= 0) {
          row.valueInput.style.borderColor = 'var(--red)';
          row.valueInput.focus();
          setTimeout(() => { row.valueInput.style.borderColor = 'var(--border)'; }, 1500);
          return null;
        }
        value = parsed;
      }
      conditions.push({ type, value });
    }

    const name       = document.getElementById('alert-builder-name')?.value?.trim() ?? '';
    const logic      = document.getElementById('alert-builder-logic')?.value ?? 'AND';
    const repeat     = document.getElementById('ab-repeat')?.checked ?? false;
    const cooldownMin= parseInt(document.getElementById('ab-cooldown')?.value ?? '5') || 5;
    const maxTrig    = parseInt(document.getElementById('ab-max-triggers')?.value ?? '0') || 0;
    const expMins    = parseInt(document.getElementById('ab-expiration')?.value ?? '0') || 0;

    return {
      symbol:      this.#symbol,
      name,
      conditions,
      logic,
      repeat,
      cooldownMin,
      maxTriggers: maxTrig,
      expiresAt:   expMins > 0 ? Date.now() + expMins * 60_000 : null,
    };
  }

  #toggleBehavior() {
    this.#expanded = !this.#expanded;
    const behEl = document.getElementById('alert-builder-behavior');
    const btn   = document.getElementById('alert-builder-behavior-toggle');
    if (behEl) behEl.style.display = this.#expanded ? 'block' : 'none';
    if (btn)   btn.textContent = this.#expanded
      ? '⚙ Options avancées ▴'
      : '⚙ Options avancées ▸';
  }

  #toggleCooldownVisibility(show) {
    const el = document.getElementById('ab-cooldown-row');
    const el2 = document.getElementById('ab-maxtrig-row');
    if (el)  el.style.display  = show ? 'flex' : 'none';
    if (el2) el2.style.display = show ? 'flex' : 'none';
  }

  #setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = value;
    else el.value = value;
  }

  #bindStaticEvents() {
    document.getElementById('alert-builder-close')
      ?.addEventListener('click', () => this.close(null));

    document.getElementById('alert-builder-cancel')
      ?.addEventListener('click', () => this.close(null));

    this.#overlay?.addEventListener('click', e => {
      if (e.target === this.#overlay) this.close(null);
    });

    document.addEventListener('keydown', e => {
      if (this.#overlay?.style.display !== 'block') return;
      if (e.key === 'Escape') { e.stopPropagation(); this.close(null); }
      if (e.key === 'Enter' && !e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT') {
          e.preventDefault();
          this.#confirm();
        }
      }
    });

    document.getElementById('alert-builder-add-cond')
      ?.addEventListener('click', () => {
        this.#addConditionRow();
        this.#updatePreview();
      });

    document.getElementById('alert-builder-confirm')
      ?.addEventListener('click', () => this.#confirm());

    document.getElementById('alert-builder-behavior-toggle')
      ?.addEventListener('click', () => this.#toggleBehavior());

    document.getElementById('ab-repeat')
      ?.addEventListener('change', e => {
        this.#toggleCooldownVisibility(e.target.checked);
      });

    document.getElementById('alert-builder-logic')
      ?.addEventListener('change', () => this.#updatePreview());
  }

  #confirm() {
    const cfg = this.#buildConfig();
    if (!cfg) return;
    this.close(cfg);
  }
}
