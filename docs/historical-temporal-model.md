# Modèle temporel historique

Ce document décrit les conventions appliquées par
`src/domain/history/temporal.ts`. Elles complètent le plan général présenté dans
`historical-data-architecture.md`.

## Convention des années

Les données historiques utilisent un entier signé sans année zéro :

| Valeur interne | Signification |
| ---: | --- |
| `-2` | 2 av. n. è. |
| `-1` | 1 av. n. è. |
| `1` | 1 de n. è. |
| `2` | 2 de n. è. |

`0` est toujours invalide. Toute nouvelle valeur doit être contrôlée par
`assertHistoricalYear`.

La frise possède un second domaine numérique, exclusivement technique :

| Année historique | Coordonnée de frise |
| ---: | ---: |
| `-2` | `-2` |
| `-1` | `-1` |
| `1` | `0` |
| `2` | `1` |

La coordonnée zéro signifie donc 1 de n. è. et ne doit jamais être affichée
comme une année. `shiftHistoricalYear` effectue les additions en passant par cet
axe afin de sauter automatiquement l’année zéro.

L’entrée héritée qui comporte actuellement l’année zéro n’est pas migrée dans ce
lot. Elle reste inchangée jusqu’à ce que son interprétation soit vérifiée par une
source.

## Bornes et périodes

Une `TemporalBoundary` décrit ce que l’on connaît d’une borne :

- `day`, `month`, `season` et `year` conservent la granularité ;
- `range` encadre plusieurs années possibles ;
- `before` et `after` laissent un côté de l’intervalle ouvert ;
- `unknown` ne fabrique aucune date ;
- `approximate` conserve le caractère approximatif de la formulation ;
- `uncertaintyYears` ajoute une marge quantifiée, sans passer par l’année zéro ;
- `certainty` décrit la confiance et reste distinct de la précision.

`TemporalSpan.start` et `TemporalSpan.end` peuvent être absents. Une borne
absente représente un intervalle ouvert ; deux bornes inconnues représentent une
période inconnue.

`getTemporalInterval` renvoie l’enveloppe minimale et maximale exploitable.
`getTemporalOverlap` distingue :

- `definite` : chevauchement de périodes sans incertitude ;
- `possible` : chevauchement dépendant d’une plage, approximation ou marge ;
- `none` : enveloppes disjointes ;
- `unknown` : informations insuffisantes.

`canTemporalSpansOverlap` renvoie `true` pour `unknown`, car l’absence
d’information ne permet pas d’exclure un chevauchement. Les écrans qui doivent
afficher l’incertitude utiliseront la fonction à quatre états.

## Compatibilité avec la frise

Adam, Abraham et David constituent l’échantillon pilote. Leur
`BiblicalPerson.id` est identique à leur `EventData.id`.

`createLegacyTimelineProjection` remplace chaque personne pilote à la même
position dans le tableau d’événements. Il n’ajoute aucune ligne et refuse :

- un ID de personne dupliqué ;
- une personne sans événement historique correspondant ;
- une période de vie dont les années diffèrent de l’événement source.

Les chaînes de dates brutes, positions de frise, catégories et relations
existantes sont conservées. Les autres personnages restent exclusivement des
`EventData` jusqu’à une migration ultérieure et documentée.
