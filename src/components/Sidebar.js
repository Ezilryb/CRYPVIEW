// ============================================================
//  src/components/Sidebar.js — CrypView V2
//  Sidebar de la vue simple (page.html) :
//    - Stats 24h (ouverture, haut, bas, volume, nb trades)
//    - Liste des derniers trades en temps réel (max 100)
//
//  HTML attendu (IDs) :
//    #s-open, #s-high, #s-low, #s-vol, #s-tr  — stats
//    #trades                                    — liste trades
//
//  Usage :
//    const sidebar = new Sidebar();
//    sidebar.updateStats({ open24, high24, low24, vol24, trades24 });
//    sidebar.addTrade({ price, qty, isBuy, timeFormatted });
// ============================================================

import { fmtPrice, fmtVol } from '../utils/format.js';

const MAX_TRADES = 100;

export class Sidebar {
  #els;
  #tradesList;

  constructor() {
    const $ = id => document.getElementById(id);
    this.#els = {
      open: $('s-open'),
      high: $('s-high'),
      low:  $('s-low'),
      vol:  $('s-vol'),
      tr:   $('s-tr'),
    };
    this.#tradesList = $('trades');
  }

  /**
   * @param {{ open24:number, high24:number, low24:number, vol24:number, trades24:number }} stats
   */
  updateStats({ open24, high24, low24, vol24, trades24 }) {
    this.#set('open', fmtPrice(open24));
    this.#set('high', fmtPrice(high24));
    this.#set('low',  fmtPrice(low24));
    this.#set('vol',  fmtVol(vol24));
    this.#set('tr',   parseInt(trades24).toLocaleString('fr-FR'));
  }

  /**
   * @param {{ price:number, qty:number, isBuy:boolean, timeFormatted:string }} trade
   */
  addTrade({ price, qty, isBuy, timeFormatted }) {
    if (!this.#tradesList) return;
    const row = document.createElement('div');
    row.className = `trade-row ${isBuy ? 'buy' : 'sell'}`;
    row.innerHTML = `
      <span class="t-price">${fmtPrice(price)}</span>
      <span class="t-qty">${qty.toFixed(4)}</span>
      <span class="t-time">${timeFormatted}</span>`;
    this.#tradesList.prepend(row);
    while (this.#tradesList.children.length > MAX_TRADES) {
      this.#tradesList.removeChild(this.#tradesList.lastChild);
    }
  }

  clearTrades() {
    if (this.#tradesList) this.#tradesList.innerHTML = '';
  }

  reset() {
    Object.values(this.#els).forEach(el => { if (el) el.textContent = '—'; });
    this.clearTrades();
  }

  #set(key, val) {
    if (this.#els[key]) this.#els[key].textContent = val ?? '—';
  }
}
