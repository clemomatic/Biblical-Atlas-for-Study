# Moteur de relations historiques dérivées

Ce document décrit la génération des relations historiques et des index de consultation à partir du seul corpus relu de `content/reviewed/`.

Le moteur ne transforme jamais une contemporanéité ou une proximité géographique en rencontre attestée. Il conserve séparément les niveaux de relation afin que l’interface puisse présenter exactement ce qui est démontré, calculé ou seulement possible.

## Sorties générées

La commande `pnpm historical:generate` produit deux fichiers déterministes :

- `content/generated/relations.json` contient les relations dérivées ;
- `content/generated/historical-index.json` contient les index temporels et relationnels compacts.

Le contenu de `content/staging/` est toujours ignoré. La génération échoue si le corpus relu ou les sorties produites ne passent pas la validation.

## Niveaux de relation

| Niveau | Signification exacte | Condition de génération |
| --- | --- | --- |
| `lifespan-overlap` | Deux périodes de vie documentées peuvent se chevaucher. | Les deux personnes possèdent une période de vie exploitable et des affirmations justificatives relues. |
| `activity-overlap` | Deux périodes d’activité documentées peuvent se chevaucher. | Les activités possèdent des périodes exploitables et des affirmations justificatives relues. |
| `same-region` | Deux présences documentées se situent dans la même région explicite et leurs périodes peuvent se chevaucher. | Deux épisodes de présence concernent des lieux distincts partageant un même `regionId`. |
| `same-place` | Deux présences documentées concernent le même lieu et leurs périodes peuvent se chevaucher. | Les deux épisodes ont le même `placeId`. |
| `same-event` | Deux personnes participent explicitement au même événement. | Deux affirmations directes et relues de type `participation` ciblent le même événement. |
| `documented-interaction` | Une interaction entre deux personnes est directement attestée. | Une affirmation directe et relue de type `attested-interaction` relie explicitement les deux personnes. |

Une relation `lifespan-overlap` ou `activity-overlap` signifie seulement que les périodes peuvent se recouper. Elle ne prouve ni une présence commune, ni une rencontre.

Une relation `same-region` ne devient pas une relation `same-place`. Le moteur utilise les identifiants de région déclarés sur les lieux et ne rapproche jamais des noms par similarité textuelle.

Une simple association générale entre une personne et un lieu n’est pas utilisée pour produire une coprésence. Seuls les `PresenceEpisode` validés, datés et justifiés participent à ce calcul.

Deux présences au même lieu mais rattachées à des événements différents ne
produisent au maximum qu’une relation `possible`, même si elles partagent une
même période éditoriale. Une relation certaine exige une preuve commune plus
précise, par exemple le même événement explicitement documenté.

Une participation commune à un événement produit `same-event`, mais pas automatiquement `documented-interaction`. Ce dernier niveau exige sa propre affirmation directe.

## Périodes et certitude

Les périodes sans borne temporelle exploitable sont exclues des calculs de chevauchement. Elles ne produisent donc aucune contemporanéité artificielle.

L’intersection temporelle est calculée avec les indices chronologiques internes, qui tiennent compte de l’absence d’année zéro historique. La période dérivée conserve :

- la borne commune minimale ;
- la borne commune maximale ;
- le caractère approximatif de chaque source ;
- un libellé français calculé.

La certitude d’une relation ne peut jamais dépasser celle de ses données d’entrée. Le moteur retient le niveau le plus prudent parmi les personnes, activités, présences, événements et affirmations concernés.

Une période approximative plafonne la relation à `possible`. Une donnée possible ne peut donc jamais produire une relation certaine.

## Reproductibilité

Les identifiants de relations sont composés à partir d’éléments triés et stables :

- niveau de relation ;
- personnes ;
- lieux ou régions ;
- événements ;
- affirmations justificatives ;
- enregistrements sources.

Les tableaux et les clés d’index sont également triés avant sérialisation.

`generatedAt` n’utilise pas l’horloge d’exécution. Il est dérivé de la date de consultation la plus récente du catalogue de sources employé. Si le catalogue est vide, la valeur de repli est `1970-01-01T00:00:00.000Z`. Deux générations effectuées sur les mêmes données produisent ainsi exactement les mêmes fichiers.

## Index historique compact

`historical-index.json` n’enregistre pas un document par année. Il utilise des intervalles triés :

- `lifespans` pour les périodes de vie ;
- `activities` pour les périodes d’activité ;
- `events` pour les événements ;
- `presences` pour les épisodes de présence.

Chaque intervalle contient un `startIndex` et un `endIndex`. Les recherches s’arrêtent dès que le début d’un intervalle dépasse la fin de la période demandée.

Des index inversés complètent ces intervalles :

- `relationIdsBySubject` ;
- `relations`, index temporel compact utilisé par la vue
  « À ce moment-là » ;
- `presenceIdsByPlace` ;
- `presenceIdsByRegion` ;
- `presenceIdsByEvent`.

Les utilitaires exposés par `src/domain/history/historicalIndex.ts` permettent de rechercher :

- les personnes vivant pendant une période ;
- les personnes actives ;
- les événements en cours ;
- les présences documentées ;
- les personnes présentes dans un lieu ;
- les relations et contemporains associés à une personne.

## Validation

Le validateur refuse notamment :

- une relation qui mentionne une personne, un lieu, un événement ou une affirmation inexistant ;
- une relation sans preuve ;
- une relation temporelle sans chevauchement calculé ;
- une relation `same-place` portant sur plusieurs lieux ;
- une relation `same-region` sans région commune explicite ;
- une relation `same-event` sans affirmations directes de participation ;
- une interaction sans affirmation directe de type `attested-interaction` ;
- une relation certaine fondée sur une affirmation moins certaine ;
- une sortie ne portant pas les métadonnées du générateur attendu.

Les scénarios automatisés couvrent les contemporains sans rencontre, les lieux identiques à des périodes différentes, les lieux différents à la même période, la région commune, l’événement commun, l’approximation, les périodes inconnues et l’interaction directement attestée.

## Commandes

```bash
pnpm historical:validate
pnpm historical:generate
pnpm test
```

La CI régénère aussi les sorties et vérifie que `content/generated/` reste inchangé. Toute divergence signale une sortie non reproductible ou un fichier généré non actualisé.

Le corpus historique réel reste vide à ce stade. Les exemples utilisés par les tests sont explicitement des fixtures et ne sont pas intégrés aux données historiques de l’application.
