# 📊 CrypView v4.8 — Professional Trading Command Center

> **Poste de commandement trading professionnel décentralisé (Spot/Futures/DEX). Construit 100% client-side from scratch en Vanilla JS & Vite. Sans inscription, sans backend, sans collecte de données, et 100% gratuit.**

Graphic Engine propulsé par **LightweightCharts v4.1.3**. Optimisé avec des **Web Workers** pour maintenir une interface fluide à 60 FPS même lors de calculs algorithmiques intensifs (Orderflow, CVD, 34 indicateurs en temps réel).

---

## ⚡ Statut & Badges de Production

![Version](https://img.shields.io/badge/Version-3.7--Stable-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Language](https://img.shields.io/badge/Language-Vanilla__JS__ES2022%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Build](https://img.shields.io/badge/Build__Tool-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Performance](https://img.shields.io/badge/Performance-Web__Workers-007ACC?style=for-the-badge&logo=webcharts)
![A11y](https://img.shields.io/badge/Accessibilit%C3%A9-WCAG__2.1-orange?style=for-the-badge)

👉 [**ACCÉDER À L'APPLICATION LIVE INÉDITE (GITHUBPAGES)**](https://ezilryb.github.io/CRYPVIEW/index.html?force_landing=1)

---

## 🖼️ Aperçu Visuel de la Plateforme

| 🌐 Configuration Multi-Grille (Jusqu'à 9 Graphiques Synchronisés) | 👣 Footprint Chart & Carnet d'Ordres (Canvas Haute Fidélité) |
| :--- | :--- |
| ![Aperçu Multi-Grille](https://raw.githubusercontent.com/ezilryb/CRYPVIEW/main/assets/readme-multi-grid.png)| ![Aperçu Footprint](https://raw.githubusercontent.com/ezilryb/CRYPVIEW/main/assets/readme-footprint.png)|

| 📊 Flux Orderflow Delta & Cumulative Volume Delta (CVD) | 🔍 Algorithme de Liquidation Heatmap (Flux Futures FAPI) |
| :--- | :--- |
| ![Aperçu Orderflow](https://raw.githubusercontent.com/ezilryb/CRYPVIEW/main/assets/readme-orderflow.png)| ![Aperçu Heatmap](https://raw.githubusercontent.com/ezilryb/CRYPVIEW/main/assets/readme-heatmap.png)|

---

## 🚀 Fonctionnalités Clés & Piliers Métier

### 1. Moteur Multi-Charts Avancé (9 Agencements)
* **Flexibilité totale :** Mode solo (`page.html`), grilles symétriques (2×2, 3×3) et dispositions asymétriques avancées (`multi1p2.html`, `multi1p3.html`, empilements verticaux).
* **Moteur de Synchronisation Temporelle (`ChartSync`) :** Propagation bidirectionnelle instantanée des mouvements du réticule (crosshair), du niveau de zoom (LogicalRange) et des outils de dessin.
* **MTF Drawing Sync :** Tracez une ligne de tendance sur un graphique en 5m, elle se synchronise automatiquement sur le graphique en 1h pour le même actif.

### 2. Orderflow de Niveau Institutionnel (Calculé au Tick)
* **Footprint Chart (`ChartFootprint.js`) :** Décomposition interne des bougies par niveau de prix Ask/Bid. Algorithme d'initialisation hybride : *Seed* via OHLCV historique, *Upgrade REST* haute-fidélité (5000 trades), puis flux direct de streaming WebSocket.
* **Analyse des Déséquilibres :** Détection visuelle automatique des déséquilibres d'achat/vente (Imbalances >= 3x) mis en évidence par un cadre doré.
* **Delta & CVD (`ChartOrderflow.js`) :** Graphique en histogramme du Delta acheteur/vendeur net et ligne cumulative de CVD. Détection automatique des divergences prix/delta (cadre jaune).
* **Liquidation Heatmap :** Capture en temps réel du flux `@forceOrder` sur Binance Futures pour matérialiser les zones de liquidation directement sur l'overlay du graphique.

### 3. Architecture d'Indicateurs ultra-haute performance (34 Indicateurs)
Pour garantir une réactivité parfaite (60 FPS), tous les calculs lourds de la suite mathématique sont déportés hors du thread principal de rendu UI via un **Web Worker** dédié (`indicators.worker.js`).
* **Indicateurs de Tendance :** VWAP (Reset UTC 00:00), Ichimoku Kinko Hyo (Optimisé via files glissantes de Max/Min en O(n)), SuperTrend (ATR Wilder), Canaux de Régression Linéaire (+/- 2 sigma), Donchian, Bollinger, etc.
* **Indicateurs de Momentum :** Squeeze Momentum (LazyBear), RSI, MACD, Stochastique, CCI, ADX, Elder Ray.
* **Données On-Chain / Futures :** Open Interest Delta, Taux de Financement (Funding Rate 8h), Ratio Long/Short.

### 4. Mode DEX Multi-Chaînes Décentralisé
Intégration native de l'API GeckoTerminal permettant le charting de n'importe quel token sans intermédiaire.
* **8 Réseaux supportés :** Ethereum, Binance Smart Chain, Polygon, Solana, Arbitrum, Base, Avalanche, Optimism.
* **Moteur d'interrogation :** Polling adaptatif régulé à 60s (respect des limites de l'API publique) avec injecteur d'événements `history:loaded` identique au flux des exchanges centralisés.

### 5. Suite Algorithmique : Paper Trading & Backtesting
* **Paper Trading Évolué :** Solde fictif de 10 000 USDT avec exécution immédiate des ordres marché. Gestion des risques stricte avec calcul de taille de position automatique via le module **Risk Commander**. Suivi strict des ordres de protection (Stop-Loss et Take-Profit) évalués tick par tick sur le flux WebSocket des Klines.
* **Backtester de Stratégies Intégré :** Évaluez 12 signaux techniques combinables avec une logique conditionnelle AND/OR. Génère instantanément un rapport complet : Win Rate, Profit Factor, Max Drawdown, Ratio de Sharpe, et courbe d'équité tracée sur Canvas HTML5.

### 6. Système d'Alertes Avancé Multi-Critères
Logique d'alterte locale gérée par `AlertManagerV2.js`.
* **Conditions de déclenchement :** Prix absolu, variation en %, pics de volumes inhabituels, seuils RSI/MACD, et croisements de lignes géométriques (Trendlines SVG).
* **Notifications & Routage :** Notifications natives du système d'exploitation (Web Notifications API) et alertes sonores double-ton générées synthétiquement sans fichier audio externe via la **Web Audio API** (oscillateurs natifs). Synchronisation cross-onglets via `BroadcastChannel`.

---

## 🛠️ Stack Technique & Architecture Client-Side

CrypView fonctionne sans aucun serveur ni base de données centrale. L'architecture repose sur l'exploitation maximale des API natives du navigateur.

```
       ┌────────────────────────────────────────────────────────┐
       │                 INTERFACE GRAPHIQUE                    │
       │     (HTML5 / CSS Variables / LightweightCharts 4.1.3)   │
       └───────────────────────────┬────────────────────────────┘
                                   │
         ▲                         │                         ▲
         │ Flux Temps Réel         │ Actions / Configuration │ Événements
         │ Nettoyé                 ▼                         │ Filtrés
         │
┌────────┴────────┐      ┌───────────────────┐      ┌────────┴────────┐
│    WSPool.js    │      │    Storage.js     │      │   Web Worker    │
│  (WebSocket)    │      │  (localStorage)   │      │(ind.worker.js)  │
├─────────────────┤      ├───────────────────┤      ├─────────────────┤
│ Gestion unique  │      │ Sauvegarde des    │      │ Calculs lourds  │
│ de 200 streams  │      │ Tracés, Alertes,  │      │ O(n) asynchrones│
│ max / Déduplix. │      │ Profils & Presets │      │ Anti-UI Freeze  │
└─────────────────┘      └───────────────────┘      └─────────────────┘
```

* **Persistance Totale :** Tous les espaces de travail (jusqu'à 15 Workspaces avec émojis auto-générés), tracés graphiques et historiques de trading papier sont sérialisés et enregistrés dans le `localStorage` de votre navigateur via une couche d'abstraction robuste (`storage.js`).
* **Gestion Optimisée des Connexions (`WSPool.js`) :** Mutualise jusqu'à 200 flux en temps réel sur une seule connexion WebSocket pour respecter scrupuleusement la limite réglementaire de Binance (5 connexions par IP).

---

## 💻 Installation & Démarrage Rapide

Pour exécuter CrypView dans votre environnement de développement local :

### Prérequis
* **Node.js** (Version 16.0 ou supérieure)
* **npm** ou **yarn**

### Guide de déploiement pas à pas

1. **Cloner le dépôt officiel :**
   ```bash
   git clone [https://github.com/ezilryb/CRYPVIEW.git](https://github.com/ezilryb/CRYPVIEW.git)
   cd CRYPVIEW
   ```

2. **Installer l'ensemble des dépendances :**
   ```bash
   npm install
   ```

3. **Lancer le serveur de développement Vite :**
   ```bash
   npm run dev
   ```
   *Ouvrez votre navigateur à l'adresse locale affichée, par défaut : `http://localhost:5173`.*

4. **Compiler l'application pour la production :**
   ```bash
   npm run build
   ```
   *Les fichiers minifiés, hautement optimisés et prêts pour le déploiement statique seront générés dans le dossier `/dist`.*

---

## 🤖 Configuration de l'Assistant IA

CrypView intègre un panneau d'assistance technique intelligent propulsé de manière primaire par **Gemini 2.5 Flash-Lite**, avec un mécanisme de bascule automatique (*fallback*) vers **Mistral Small** si les quotas de l'API principale sont atteints.

L'analyse s'effectue sans backend. Pour l'activer, vous pouvez renseigner vos clés d'API directement dans l'interface de configuration de l'application (sauvegardées localement de manière sécurisée). L'assistant extrait dynamiquement le contexte de la page courante (indicateurs affichés, paires de trading actives) pour fournir des résumés, réponses techniques ou aides au trading contextualisées.

---

## 🌍 Internationalisation (i18n) & Accessibilité (A11y)

* **i18n multi-moteur :** Traduction intégrale de la plateforme en 4 langues : Français, English, 中文 (Chinois), et العربية (Arabe). Le système détecte la langue du système d'exploitation, prend en compte les pluriels complexes et gère dynamiquement l'affichage **RTL (Right-to-Left)** pour l'arabe via injection de styles dédiés.
* **Accessibilité Inclusive (WCAG 2.1) :** Pièges de focus sémantiques (`FocusTrap`) sur l'ensemble des fenêtres modales, navigation intégrale au clavier via les flèches directionnelles (`ArrowKeyNav`), attributs ARIA complets générés dynamiquement, et respect de la préférence de réduction des mouvements du système (`prefers-reduced-motion`).

---

## 🤝 Contribuer au Projet Open-Source

Le projet CrypView est fier d'être communautaire, transparent et ouvert. Vous pouvez participer activement à son évolution :
* Signalement de bugs précis via notre outil Sentinel.
* Proposition de nouvelles formules mathématiques d'indicateurs techniques.
* Optimisation des canvas graphiques.

Veuillez lire attentivement notre fichier `.github/CONTRIBUTING.md` pour prendre connaissance des standards de code avant de soumettre une Pull Request.

---

## 📄 Licence & Clause de Non-Responsabilité

Ce logiciel est distribué sous la licence ouverte **MIT**. Consultez le fichier [LICENSE](LICENSE) pour plus de détails.

**⚠️ AVERTISSEMENT LÉGAL ET FINANCIER :** CrypView est un outil logiciel d'analyse technique et d'éducation. Toutes les simulations de calculs, données de flux, signaux de backtesting et graphiques d'orderflow sont fournis à titre indicatif et ne constituent en aucun cas des conseils financiers ou des incitations à l'investissement. L'auteur décline toute responsabilité quant aux pertes financières directes ou indirectes résultant de l'utilisation de l'application ou des dysfonctionnements liés aux API tierces. Le trading de cryptomonnaies comporte des risques élevés. N'investissez jamais d'argent que vous ne pouvez vous permettre de perdre.
