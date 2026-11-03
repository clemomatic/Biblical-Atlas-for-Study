# Bible Lab — Phase 3 : bibliothèque personnelle et historique de recherche

La bibliothèque personnelle est une vue sur **les mêmes trouvailles** que le bac et les fiches d'idées. Elle ne crée pas de copie des sources et ne modifie aucune note Obsidian.

## Les deux usages de l'index

**Recherche préparée** : ouvrir `Étudier`, choisir son plan, rechercher dans WOL et enregistrer les références. Les trouvailles gardent l'identifiant du plan actif. Dans `Mon index`, le filtre par sujet permet de les retrouver.

**Exploration libre** : commencer dans WOL sans plan, garder un extrait ou une intuition dans le bac. Dans `Mon index`, une recherche libre dans le titre, les commentaires, l'extrait, l'URL et les étiquettes fait ressortir les sources, même si aucune fiche d'idée n'a été créée.

## Étiquettes et favoris

- Depuis `Trouvailles` : **Ajouter aux favoris** ou **Ranger dans mon index** sans supprimer la source.
- Depuis `Mon index` : recherche, filtres `Toutes`, `Favoris`, `Non classées`, `Rangées`, tri alphabétique ou par date, filtre par plan d'étude.
- Dans `Classer ou modifier` : renommer la source, modifier sa note personnelle et son lien WOL, ajouter jusqu'à 15 étiquettes libres (séparées par des virgules). Étiquettes et favoris ne forcent aucun classement initial.
- Une source rangée disparaît uniquement du bac à trouvailles. Elle reste dans la bibliothèque et, si elle était citée, dans les fiches d'idées.
- La recherche se fait dans les **sources que tu as réellement enregistrées**, pas dans toute la bibliothèque WOL.
- Les sources affichées sont paginées (35 par lot) pour garder un panneau fluide.

## Historique de recherche

- Les requêtes envoyées **depuis Bible Lab** à WOL sont mémorisées localement : terme, filtre WOL (Index, Guide, Perspicace…), mode de correspondance, URL et plan actif.
- `Reprendre la recherche` réouvre l'URL enregistrée via la Visionneuse web d'Obsidian.
- Les recherches identiques sont regroupées, les 120 dernières sont conservées et l'historique peut être effacé **sans supprimer les sources ni les fiches**.
- **Limite :** les déplacements effectués dans l'onglet web natif WOL ne sont pas automatiquement enregistrés. Le plugin ne prétend pas observer ce navigateur.

## Compatibilité

- Les nouvelles données sont conservées dans `data.json` sous `bibleLabArchive`. Les champs `bibleLabResearch` et `bibleLabCollection` des phases 1 et 2 restent indépendants.
- Les URL officielles WOL restent validées ; les ancres `#h=N` sont conservées lorsqu'elles existent.
- Les références insérées dans les notes utilisent toujours le format `Phrase ([source](URL) ; [source](URL))` sur **une même ligne**.
- Le code du lecteur des références, des pop-ups et du scanner n'a pas été modifié.
- La validation end-to-end devra être effectuée sur une **copie du coffre Obsidian**, sous Windows avant toute fusion.

## Validation

```sh
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-core-regression.spec.ts \
  obsidian/tests/bible-lab-research-plan.spec.ts \
  obsidian/tests/bible-lab-collection.spec.ts \
  obsidian/tests/bible-lab-archive.spec.ts \
  --project=desktop --workers=1
```

Une suite Playwright historique plus large avait 6 échecs sur la PR de phase 1. Ils ne doivent pas être confondus avec les tests ciblés de ces nouvelles fonctionnalités.
