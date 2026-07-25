# Calendrier de Jésus — appendices A7-A à A7-H

## Périmètre documentaire

Le corpus couvre les huit tableaux chronologiques A7 de la *Traduction du monde
nouveau, édition d’étude*. Chaque appendice possède :

- une entrée vérifiée dans `content/sources/source-catalog.json` ;
- un fichier distinct sous `content/staging/` ;
- des événements, affirmations et présences promus sous
  `content/reviewed/` ;
- un rapport distinct sous `content/generated/import-reports/`.

Seuls les faits courts nécessaires à l’étude ont été conservés : date ou
période, lieu, événement, participants nommément attestés et références
bibliques. Les formulations descriptives sont originales et brèves. Aucune
illustration ni long extrait de la publication n’est stocké.

## Couverture validée

| Appendice | Événements | Claims | Présences | Points à vérifier |
| --- | ---: | ---: | ---: | ---: |
| A7-A | 10 | 64 | 33 | 3 |
| A7-B | 9 | 27 | 11 | 6 |
| A7-C | 22 | 55 | 21 | 1 |
| A7-D | 14 | 33 | 15 | 1 |
| A7-E | 18 | 36 | 14 | 0 |
| A7-F | 18 | 33 | 7 | 0 |
| A7-G | 20 | 47 | 25 | 0 |
| A7-H | 15 | 57 | 25 | 0 |
| **Total** | **126** | **352** | **151** | **11** |

Le rapport machine
`content/generated/import-reports/a7-coverage.json` complète ces chiffres avec
les personnes, lieux, références bibliques, itinéraires et relations dérivées.
Les points à vérifier restent visibles dans les fichiers de staging ; ils n’ont
pas été complétés de mémoire.

## Dates

Les années suivent la convention historique interne sans année zéro :

- `-1` représente 1 av. n. è. ;
- `1` représente 1 de n. è. ;
- `0` est interdit.

Les dates comme « 14 nisan » restent dans le calendrier hébreu de la source.
Elles ne sont pas converties artificiellement vers un mois ou un jour
grégorien. La frise utilise une ancre technique pour séparer les événements qui
partagent une année ; le `TemporalSpan.displayLabel` reste la date éditoriale
de référence.

## Participants, lieux et certitude

Un identifiant de personne n’est créé que lorsque le tableau nomme
explicitement cette personne. Les groupes anonymes, les foules et les
collectifs restent des mentions textuelles et ne deviennent pas de faux
personnages.

La certitude est conservée indépendamment pour :

- la période de l’événement ;
- le lieu ou la zone géographique ;
- la participation d’une personne ;
- l’épisode de présence.

Une zone ou un lieu possible n’est donc pas transformé en point certain. Un
lieu sans identifiant cartographique reste une mention sourcée.

## Rapprochement des événements

`src/domain/history/eventReconciliation.ts` compare :

1. l’identifiant stable ;
2. les références bibliques normalisées ;
3. la période ;
4. le titre normalisé ;
5. les lieux associés.

Le résultat est une recommandation (`merge-candidate` ou `review-required`),
jamais une fusion automatique. Deux épisodes proches restent séparés si leurs
références montrent qu’ils sont distincts. Deux anciennes lignes de la frise
ont été explicitement remplacées par leurs événements A7-A après concordance
documentée ; les données sources historiques restent présentes dans le fichier
legacy.

## Déplacements

Un itinéraire est construit par appendice à partir de l’ordre documenté des
lieux dans le tableau. Chaque route porte obligatoirement :

```json
{
  "geometryPrecision": "schematic",
  "notForExactNavigation": true
}
```

La carte relie seulement les lieux qui possèdent déjà des coordonnées validées.
Elle n’invente ni étape, ni coordonnées, ni chemin entre deux points. Les
segments en pointillés indiquent une succession documentaire et non la route
réellement empruntée.

## Commandes

```bash
pnpm historical:build:a7
pnpm historical:check:a7
pnpm historical:validate
pnpm historical:generate
pnpm historical:report:a7
pnpm test
pnpm build
```

`historical:check:a7` repromeut chacun des huit fichiers de staging en mémoire,
compare les résultats aux sorties `reviewed`, contrôle les sources, les
références bibliques, les doublons d’ID et la nature schématique des routes.
