# CrypView V2

Graphiques crypto en temps réel propulsés par l'API Binance.  
WebSocket live · 19 indicateurs · Footprint · Orderflow · Drawing Tools · Thème Light/Dark

---

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement (http://localhost:5173)
npm run dev

# 3. Build de production
npm run build

# 4. Prévisualiser le build
npm run preview
```

> **Important** — Les modules ES6 (`type="module"`) ne fonctionnent pas via `file://`.  
> Utiliser impérativement `npm run dev` ou un serveur HTTP.

---

## Structure du projet

```
CRYPVIEW/
├── index.html          Landing page
├── page.html           Vue simple (1 graphique)
├── multi2.html         Vue 2 graphiques côte à côte
├── multi4.html         Vue 4 graphiques en grille 2×2
│
├── src/
│   ├── api/            Binance REST + WebSocket (WSManager, WSPool)
│   ├── chart/          Moteurs graphiques (ChartCore, Indicators, Footprint…)
│   ├── components/     Composants UI (Header, Sidebar, Modales…)
│   ├── indicators/     Calcul des 19 indicateurs (fonctions pures)
│   ├── pages/          Points d'entrée JS par page
│   └── utils/          Helpers partagés (dom, format, toast, templates)
│
├── styles/
│   ├── base.css        Variables CSS + reset + thèmes light/dark
│   ├── components.css  Header, sidebar, menus, modales
│   ├── charts.css      Layout chart, panneaux indicateurs, canvas
│   ├── multi.css       Grille multi-graphiques
│   └── index.css       Landing page uniquement
│
├── vite.config.js      Config Vite (multi-page, port 5173)
└── package.json
```

---

## Stack technique

| Outil | Rôle |
|---|---|
| [LightweightCharts 4.1.3](https://tradingview.github.io/lightweight-charts/) | Rendu des chandeliers et séries |
| [Binance WebSocket API](https://binance-docs.github.io/apidocs/) | Flux live (kline, ticker, trades, aggTrades) |
| [Vite 5](https://vitejs.dev/) | Serveur dev + bundler |
| ES Modules natifs | Zéro framework — vanilla JS modulaire |

---

## Règles projet

- **Modules ES6** — commentaires en français, variables en anglais
- **Pas de logique métier dans les `<script>` HTML**
- **Chaque instance a un `destroy()`** (WS + ResizeObserver + EventListeners)
- **Toast visuel sur toutes les erreurs** (jamais `console.error`)
- **Backoff exponentiel** sur les reconnexions WS (dans `WSManager`)
- **Throttle 100 ms** sur les redraws Footprint / Orderflow (`RENDER_THROTTLE_MS`)

---

## Phases réalisées

| Phase | Livrable |
|---|---|
| 1 | `config.js` + `utils/` + `indicators/` |
| 2 | `binance.rest.js` + `binance.ws.js` + `ChartCore.js` |
| 3 | `ChartIndicators` + `ChartVolumeProfile` + `ChartFootprint` + `ChartOrderflow` + `ChartDrawing` + `ContextMenu` + `IndicatorModal` |
| 4 | Cleanup : bugs, `visibilitychange`, `destroy()`, ARIA |
| 5 | Thèmes Light/Dark : `ThemeToggle` + `SettingsModal` + palettes chart |
| 6 | Infrastructure : Vite + `package.json` + dépendances locales |

---

## Avertissement

Les informations affichées sont fournies **à titre purement informatif**.  
Elles ne constituent pas un conseil en investissement.  
Les marchés de cryptoactifs comportent un **risque de perte totale du capital**.
