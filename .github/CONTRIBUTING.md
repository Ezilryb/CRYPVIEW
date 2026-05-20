# 🤝 Guide de Contribution — CrypView v4.8

Merci de l'intérêt que vous portez à **CrypView** ! En contribuant à ce projet, vous participez à la création d'un outil de charting et d'orderflow 100% décentralisé, gratuit et accessible à tous, sans l'infrastructure lourde d'un backend.

Voici les règles de conduite et les directives techniques pour que vos modifications soient intégrées rapidement.

---

## 🛠️ Nos Standards Techniques (Architecture Front-End Pure)

CrypView est construit sans aucun framework (No React, No Vue, No Angular). Nous tirons parti de la puissance brute du navigateur.
- **Javascript Évolué :** ES2022+ uniquement. Utilisez des modules natifs (`import/export` ESM).
- **Zéro Mutation Globale :** Les indicateurs techniques et convertisseurs de flux doivent être des fonctions pures O(n).
- **Thread Principal Préservé :** Tout nouvel indicateur technique lourd ou outil de traitement mathématique doit être implémenté et exécuté au sein du Web Worker dédié (`indicators.worker.js`).
- **Styles Graphiques :** Pas de préprocesseur type Sass/Less. Utilisez des variables CSS natives pour assurer le support parfait de la bascule dynamique des thèmes Dark/Light.

---

## 🚀 Processus pour Soumettre une Modification (Pull Request)

1. **Forkez** le dépôt officiel et clonez votre fork localement.
2. **Créez une branche thématique** descriptive depuis la branche `main` :
   ```bash
   git checkout -b feature/nom-de-votre-fonctionnalite
   ```
3. **Installez l'environnement** et effectuez vos modifications :
   ```bash
   npm install
   npm run dev
   ```
4. **Vérifiez votre code** (Assurez-vous que les modules s'exécutent sans erreur et respectent l'A11y/FocusTrap sur les modaux).
5. **Commitez vos changements** en suivant la convention des *Conventional Commits* :
   - `feat: ajout de l'indicateur Squeeze Momentum`
   - `fix: correction de la désynchronisation du crosshair sur multi9.html`
6. **Poussez (Push)** votre branche sur votre fork et ouvrez une **Pull Request** vers la branche `main` du projet CrypView.

---

## 🐛 Signaler un Bug ou Proposer une Amélioration
Si vous rencontrez un dysfonctionnement ou avez une idée d'évolution majeure, veuillez utiliser nos formulaires pré-remplis dans l'onglet **Issues** de GitHub pour accélérer le diagnostic. N'hésitez pas à inclure les logs générés par la Sentinel IndexedDB/localStorage de votre navigateur.
