# Migration Phase 6 — Vite + dépendances locales

## 1. Installer les dépendances

```bash
cd CRYPVIEW
npm install
```

---

## 2. Supprimer le `<script>` CDN dans les 3 HTML

Dans **page.html**, **multi2.html** et **multi4.html**, supprimer la ligne :

```html
<script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
```

---

## 3. Ajouter l'import dans src/chart/ChartCore.js

**En tête du fichier**, après les commentaires JSDoc, ajouter :

```js
import { LightweightCharts } from '../utils/lw.js';
```

↑ À placer juste avant la ligne :
```js
import { COLORS, MAX_CANDLES_IN_MEMORY, baseChartOptions, TF_API_MAP, CHART_THEMES } from '../config.js';
```

---

## 4. Ajouter l'import dans src/chart/ChartIndicators.js

**En tête du fichier**, ajouter :

```js
import { LightweightCharts } from '../utils/lw.js';
```

↑ À placer juste avant la ligne :
```js
import { IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions } from '../config.js';
```

---

## 5. Ajouter l'import dans src/pages/multi.js

**En tête du fichier**, ajouter :

```js
import { LightweightCharts } from '../utils/lw.js';
```

↑ À placer après la ligne :
```js
import { BINANCE, TF_TO_MS, RENDER_THROTTLE_MS, IND_META, IND_PANEL_HEIGHT, COLORS, baseChartOptions, CHART_THEMES } from '../config.js';
```

---

## 6. Simplifier le guard de boot dans src/pages/page.js

**Remplacer** les 4 dernières lignes :

```js
// AVANT
if (typeof LightweightCharts !== 'undefined') {
  boot();
} else {
  document.querySelector('script[src*="lightweight-charts"]')?.addEventListener('load', boot);
}
```

**Par :**

```js
// APRÈS — Vite garantit que le module est résolu avant l'exécution
boot();
```

---

## 7. Lancer

```bash
npm run dev      # http://localhost:5173/index.html
npm run build    # dist/
npm run preview  # prévisualiser le build
```

---

## Résumé des fichiers

| Fichier | Action |
|---|---|
| `package.json` | ✅ Créé |
| `vite.config.js` | ✅ Créé |
| `.gitignore` | ✅ Créé |
| `README.md` | ✅ Créé |
| `src/utils/lw.js` | ✅ Créé — pont d'import LightweightCharts |
| `src/chart/ChartCore.js` | ➕ Ajouter 1 import |
| `src/chart/ChartIndicators.js` | ➕ Ajouter 1 import |
| `src/pages/multi.js` | ➕ Ajouter 1 import |
| `src/pages/page.js` | ✏️ Simplifier guard de boot (4 lignes → 1) |
| `page.html` | 🗑️ Retirer `<script>` CDN |
| `multi2.html` | 🗑️ Retirer `<script>` CDN |
| `multi4.html` | 🗑️ Retirer `<script>` CDN |
