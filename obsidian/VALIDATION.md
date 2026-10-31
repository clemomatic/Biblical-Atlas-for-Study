# Validation de la version 0.1.0

31 octobre 2026.

Parcours vérifié : ouvrir l’Atlas dans une vue Obsidian → choisir une entité → créer ou relier une note avec les API Vault/FileManager → réindexer les métadonnées → retrouver la note, la frise ou la carte → construire un tableau Canvas avec de vrais fichiers.

## Résultats

| Contrôle | Résultat |
| --- | --- |
| `pnpm typecheck` et `pnpm obsidian:typecheck` | Réussis |
| `pnpm test` | 107 tests réussis ; frise focalisée : 129 modèles, 490 repères, 80 relations et 384 lignes datées concordantes |
| `pnpm obsidian:test` | 8 tests réussis : années historiques, chemins du coffre, identifiants, métadonnées invalides, projections et Canvas |
| `pnpm build` | Application web et PWA construites |
| `pnpm obsidian:package` | Plugin CommonJS autonome construit ; aucune dépendance externe à l’exécution hormis `obsidian` |
| Parcours navigateur du plugin | 12 réussis : 6 scénarios en format ordinateur et 6 en format Pixel 7 |
| Parcours web existants | 8 réussis dans `e2e/study-navigation.spec.ts` et `e2e/mobile.spec.ts` |

Les scénarios du plugin chargent le `main.js` compilé dans `obsidian/dev/harness.js`, un hôte simulant les API publiques d’Obsidian. Ils contrôlent les effets sur les fichiers, le contenu Markdown préservé, les autres propriétés YAML, la réutilisation des notes, le renommage, les changements de dates, les identifiants en double, la génération Canvas, les liens de protocole, l’isolation du CSS, les petits panneaux, le thème sombre, l’absence de requêtes de tuiles en mode local et la conservation/réindexation des notes après redémarrage.

L’environnement local utilise Node.js 24 et Chromium 138. Les vidéos de diagnostic web sont désactivées dans cet environnement. La CI utilise Node.js 22 et le Chromium installé par Playwright. Les captures de diagnostic restent des fichiers temporaires de test.

## Limites de validation

Les applications natives Obsidian sous Windows et Android n’ont pas été exécutées dans cet environnement. Un essai natif reste nécessaire pour confirmer l’intégration au gestionnaire de fichiers Android, les liens JW Library gérés par le système et le comportement avec les autres plugins du coffre. Le paquet est une première version à installer manuellement ; aucune publication dans le catalogue communautaire n’a été effectuée.

Le fond Natural Earth inclus est actuel et simplifié. Le plugin ne reconstitue pas les côtes, le relief ou les frontières d’une époque antique. Les dates et coordonnées documentaires du corpus restent celles du projet existant.
