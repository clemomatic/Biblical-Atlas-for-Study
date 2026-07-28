# Intégration du référentiel chronologique de l’Atlas

Ce paquet remplace les éléments de la frise par la feuille **Chronologie globale** du classeur `chronologie_biblique_itineraires_personnages.xlsx`.

## Contenu

- `src/data/atlasChronologyModel.ts` : modèle technique du référentiel.
- `src/data/atlasChronology.chunk1.ts` à `chunk4.ts` : 418 lignes extraites du classeur, dont 417 retenues.
- `src/data/atlasChronology.ts` : conversion vers les entités de l’application.
- `src/data/historicalData.ts` : le tableur devient la source unique de la frise, tout en conservant les métadonnées historiques déjà vérifiées quand les ID correspondent.
- `src/components/TimelineView.tsx` : nouveau moteur de rendu adaptatif.
- `e2e/biographical-study.spec.ts` : tests de la vue globale, du développement des groupes, des livres repliables et des fiches.

## Application manuelle

Depuis la racine du dépôt :

```bash
cp -R chemin/vers/atlas-integration-package/src ./
cp -R chemin/vers/atlas-integration-package/e2e ./
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run test:e2e
```

Pour exécuter tous les contrôles du projet :

```bash
pnpm run check
```

## Publication recommandée

```bash
git switch -c agent/integrer-referentiel-chronologie
git add src/data/atlasChronology* src/data/historicalData.ts src/components/TimelineView.tsx e2e/biographical-study.spec.ts
git commit -m "feat(timeline): intégrer le référentiel chronologique complet"
git push -u origin agent/integrer-referentiel-chronologie
```

Ouvrir ensuite une pull request vers `main`, vérifier les contrôles et fusionner par squash.

## Contrôles déjà exécutés lors de la génération

- 418 identifiants uniques.
- 417 lignes retenues, 1 ligne marquée `Non retenu`.
- 39 éléments actifs au niveau global.
- 4 étapes futures conservées dans l’ordre prescrit.
- Toutes les catégories correspondent aux catégories existantes de l’application.
- 741 liens de sources structurés.
- 10 fichiers TypeScript/TSX analysés sans erreur de syntaxe.
- Typecheck isolé du nouveau moteur et du modèle réussi.
