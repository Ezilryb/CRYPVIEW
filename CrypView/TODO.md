# CrypView V2 — TODO & Feuille de route

> **État actuel :** Phase 5 terminée (Système de thèmes Light/Dark).  
> Architecture modulaire ES6 production-ready. Zéro code inline dans les HTML.

---

## 🔴 Bloquants (avant mise en prod)

### Infrastructure
- [ ] **Serveur local obligatoire** — Les modules ES6 (`type="module"`) ne fonctionnent pas via `file://`. Mettre en place un serveur de développement minimal (ex: `npx serve .` ou Vite).
- [ ] **Bundler optionnel** — Pour la production, envisager Vite ou esbuild pour tree-shaking + minification. Actuellement les modules sont servis tels quels.
- [ ] **CORS en prod** — Vérifier que le serveur cible autorise les requêtes vers `api.binance.com` (CSP / CORS headers).

---

## 🟡 Améliorations prioritaires

### Performance
- [ ] **`MAX_CANDLES_IN_MEMORY`** (config.js = 800) — Implémenter le sliding window dans `ChartCore.js` pour que le tableau `candles` ne dépasse jamais cette limite.
- [ ] **Web Worker pour les calculs d'indicateurs** — `calcIchimoku`, `calcADX` et `calcSuperTrend` sont coûteux sur de gros historiques. Déplacer `src/indicators/` dans un Worker.
- [ ] **Throttle ResizeObserver** — Plusieurs `ResizeObserver` déclenchent `applyOptions` simultanément. Centraliser via un seul observer dans `ChartCore`.

### Robustesse WS
- [ ] **Heartbeat WebSocket** — Actuellement le backoff se déclenche sur `onerror`/`onclose`. Ajouter un ping/pong toutes les 30s pour détecter les connexions silencieusement mortes (timeout réseau, pare-feu NAT).
- [ ] **File d'attente de messages** — Si le WS se reconnecte pendant un burst de ticks (changement de symbole), des messages peuvent être perdus. Mettre en file d'attente les messages reçus avant que `candles` soit peuplé.
- [ ] **Rate limiting** — Binance limite les connexions WS simultanées à 5 par IP. Ajouter un compteur global dans `WSManager`.

### Footprint / Orderflow
- [ ] **Seed haute-fidélité** — Le seed historique actuel approxime ask/bid depuis OHLCV. Charger les aggTrades REST (`GET /api/v3/aggTrades`) pour les N dernières bougies afin d'avoir des données réelles.
- [ ] **Persist footprint data entre changements de TF** — Actuellement `footprintData.clear()` vide tout à chaque reconnexion. Stocker par `(symbol, tf)` pour éviter de re-seedder.
- [ ] **Nettoyage mémoire OF** — `ofData` et `footprintData` grossissent sans limite. Tronquer aux `MAX_CANDLES_IN_MEMORY` dernières entrées.

### Drawing Tools
- [ ] **Édition des tracés** — Implémenter le drag des ancres (actuellement les tracés sont en lecture seule une fois posés, seule la suppression par clic-droit est possible).
- [ ] **Tracés par symbole** — La persistance `localStorage` ne distingue pas les symboles. Clé `crypview_drawings_v2_${symbol}` serait plus propre.
- [ ] **Export SVG** — Bouton "Exporter les tracés" dans le context menu.

---

## 🟢 Backlog (nice-to-have)

### UI/UX
- [ ] **Raccourcis clavier** — `I` → ouvrir modal indicateurs, `Esc` → annuler outil, `Ctrl+Z` → annuler dernier tracé, `T` → cycle timeframes.
- [ ] **Tooltip sur les indicateurs actifs** — Au survol d'un tag dans `ind-bar`, afficher la valeur courante (dernière valeur de la série).
- [ ] **Alerte de prix** — Input flottant pour définir un niveau de prix déclenchant une notification Web.
- [ ] **Comparaison de symboles** — Overlay d'une deuxième série normalisée (% depuis ouverture).

### Accessibilité
- [ ] **Focus trap dans les modals** — La modal indicateurs et le menu contextuel ne capturent pas le focus clavier. Implémenter un `FocusTrap` utilitaire.
- [ ] **Navigation clavier dans le menu contextuel** — `ArrowUp/Down` pour naviguer dans `#ctx-menu`, `Enter` pour activer.
- [ ] **Reduce motion** — Les animations CSS (`.dot.live`, `fadeIn` trades) devraient respecter `@media (prefers-reduced-motion: reduce)`.
- [ ] **Labels ARIA sur les canvas** — `fp-canvas`, `vp-canvas`, `of-canvas` et `draw-canvas` sont `aria-hidden=true`. Ajouter des descriptions textuelles dans des `<figcaption>` masqués pour les screen readers.

### Tests
- [ ] **Tests unitaires indicateurs** — `src/indicators/*.js` sont des fonctions pures : idéals pour Jest/Vitest. Priorité : `calcRSI`, `calcMACD`, `calcBB`.
- [ ] **Tests d'intégration WS** — Mocker `WebSocket` et vérifier le comportement de reconnexion de `WSManager`.
- [ ] **Smoke test E2E** — Playwright : charger la page, vérifier que le prix s'affiche, activer RSI, vérifier le sous-panneau.

---

## ✅ Fait (Phases 1–5)

| Phase | Livrable | État |
|---|---|---|
| 1 | `config.js` + `utils/` + `indicators/` | ✅ |
| 2 | `binance.rest.js` + `binance.ws.js` + `ChartCore.js` + `page.js` (skeleton) | ✅ |
| 3 | `ChartIndicators` + `ChartVolumeProfile` + `ChartFootprint` + `ChartOrderflow` + `ChartDrawing` + `ContextMenu` + `IndicatorModal` + CSS externalisé | ✅ |
| 4 | Cleanup final : bugs `IndicatorModal`, `visibilitychange`, `destroy()`, ARIA, `TODO.md` | ✅ |
| 5 | Système de thèmes Light/Dark : `ThemeToggle` + `SettingsModal` + palettes chart + anti-flash + propagation `CustomEvent` | ✅ |

### Détail Phase 5
- `src/components/ThemeToggle.js` — Persistance `localStorage`, fallback `prefers-color-scheme`, émission `crypview:theme:change` | ✅
- `src/components/SettingsModal.js` — Modal paramètres (même pattern qu'`IndicatorModal`), cartes ON/OFF cliquables | ✅
- `src/config.js` — Constante `THEME` + `CHART_THEMES` (palettes dark/light pour `applyOptions()`) | ✅
- `styles/base.css` + `styles/index.css` — Bloc `.light-theme` surchargeant toutes les variables `:root` | ✅
- `src/chart/ChartCore.js` — Écoute `crypview:theme:change`, `applyOptions()` à chaud, cleanup dans `destroy()` | ✅
- `src/pages/multi.js` — Même logique sur les N panneaux `MultiChartInstance`, re-binding à chaque `#initChart()` | ✅
- `src/components/ContextMenu.js` — Remplacement du sous-panneau par item simple `ctx-open-settings` | ✅
- `page.html` / `multi2.html` / `multi4.html` — Script anti-flash synchrone dans `<head>`, bloc `#settings-modal-overlay` | ✅

---

## Règles projet (rappel cursorrules)

- Modules ES6, commentaires en français, variables en anglais
- Pas de logique métier dans les `<script>` HTML
- Toujours `cleanupWS()` / `WSManager.destroy()` avant nouvelle connexion
- Chaque instance doit avoir `destroy()` (WS + ResizeObserver + EventListeners)
- Throttle Orderflow/Footprint max 100ms (`RENDER_THROTTLE_MS` dans config.js)
- Backoff exponentiel sur reconnexions WS (dans `WSManager`)
- Toast visuel sur toutes les erreurs (pas `console.error`)
- Tout `addEventListener` global doit avoir son `removeEventListener` dans `destroy()`
