# Bible Lab — Phase 0 : contrat de non-régression

**Base vérifiée :** Bible Lab 0.10.0, branche `feat/bible-lab-native-wol-browser-v0930`, PR #92 (ouverte et en brouillon le 3 novembre 2026).  
**Objectif :** garantir que la future refonte du panneau de recherche WOL n'endommage pas la lecture des références dans les notes.

## Fonctions sanctuarisées

1. **Références dans les notes :** détecter les citations françaises, bibliques ou de publications, en lecture comme dans CodeMirror Live Preview, sans changer le texte Markdown enregistré. La conversion explicite reste optionnelle et idempotente.
2. **Aperçus contextuels :** un clic ouvre la fenêtre rapide, la lecture du verset ou de l'article fonctionne, et les contrôles existants (Fermer, Nouvel onglet, navigation, déplacement) restent disponibles.
3. **Sources précises :** une URL WOL de document déjà associée à un lien est prioritaire sur toute recherche devinée. Les liens de paragraphe valides (`#h=N`) sont conservés pour l'ouverture de la source.
4. **Recherche indépendante :** une recherche WOL s'ouvre dans la Visionneuse web native et ne remplace ni le contenu de la note ni son moteur de lecture.
5. **Présentation personnelle :** le texte d'une idée suivi de références **entre parenthèses sur la même ligne** reste interprétable par le moteur de références existant.

## Fichiers de garde ajoutés

- `obsidian/src/bibleLabReferenceContract.test.ts` : non-régression du style de rédaction « phrase (référence ; référence) ».
- `obsidian/tests/bible-lab-core-regression.spec.ts` : vérification intégrée des aperçus avant/après une recherche WOL, de la conservation du lien de paragraphe, de l'ouverture native et de la lecture dans CodeMirror.

Les sources de production `BibleLabInlinePopover.ts`, `inlineReferenceScanner.ts`, `referenceReader.ts`, `wolReferenceFetcher.ts`, `main.tsx` et `BibleLabPanel.ts` **ne sont pas modifiées** par cette phase.

## Tests à lancer

Depuis la racine du dépôt :

```bash
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:build
pnpm obsidian:test
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-core-regression.spec.ts
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/inline-popover.spec.ts \
  obsidian/tests/wol-search.spec.ts \
  obsidian/tests/wol-article-tabs.spec.ts
```

**État d'exécution :** tests rédigés et déposés sur GitHub ; leur passage n'est pas encore confirmé. Les tests web utilisent une simulation de la Visionneuse web et des réponses WOL : un passage sur Obsidian réel sous Windows reste obligatoire avant diffusion.

## Vérification manuelle de référence

Dans une copie du coffre Obsidian (sans risquer les notes originales) :

- Ouvrir une note avec une référence biblique simple et vérifier le lien et sa lecture en pop-up.
- Saisir une nouvelle référence dans Live Preview ; vérifier qu'elle devient cliquable sans modifier la phrase.
- Ouvrir un lien WOL exact vers un paragraphe ; vérifier le lecteur rapide puis « Nouvel onglet ».
- Lancer plusieurs recherches WOL ; contrôler qu'elles n'interrompent pas les aperçus et ne modifient pas les notes.
- Vérifier la présentation `Une idée (Jean 7:24 ; Marc 10:14).` dans l'éditeur.
- Vérifier l'absence de régression avec un article ouvert et un lien vers l'Index WOL.
- Sur Android, vérifier le comportement de repli prévu par la visionneuse web.

## Conditions de validation avant la phase 1

- Tous les tests unitaires passent.
- Les tests Playwright de non-régression passent dans le harnais.
- Les trois fonctions sanctuarisées sont validées manuellement dans Obsidian réel.
- La future refonte ne nécessite aucune modification du moteur d'aperçus pour fonctionner.

**Règle de développement :** travailler sur une branche isolée issue de Bible Lab 0.10.0 ; ne pas fusionner directement dans `main` tant que la série des PR de Bible Lab n'a pas été consolidée.
