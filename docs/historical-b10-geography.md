# Pilote géographique B10 — Israël au temps de Jésus

## Périmètre

Le premier lot des appendices B relie le calendrier A7 déjà validé à la carte
B10 « Israël au temps de Jésus ». La source officielle est cataloguée sous
`source-nwtsty-b10` avec sa référence WOL. Seuls les noms de lieux et les
rapprochements factuels nécessaires sont conservés.

Ce lot :

- ne copie ni ne republie l’image de la carte ;
- ne modifie aucune coordonnée existante ;
- ne crée aucun itinéraire à partir de B10 ;
- ne transforme pas une région en point cartographique ;
- réutilise uniquement les événements et épisodes de présence A7 déjà relus.

B10 ne donne pas un ordre chronologique de déplacements. La présence de deux
lieux sur la même carte ne suffit donc jamais à créer une route entre eux.

## Couverture

| Élément | Nombre |
| --- | ---: |
| Libellés cartographiques inventoriés | 75 |
| Libellés rapprochés d’un ID existant | 47 |
| Libellés laissés à examiner | 28 |
| Provenances de lieux créées | 47 |
| Événements A7 reliés à B10 | 108 |
| Épisodes de présence A7 réutilisés | 150 |
| Coordonnées modifiées | 0 |
| Itinéraires créés depuis B10 | 0 |

Le rapport machine complet se trouve dans
`content/generated/b10-geography-report.json`. Chaque libellé source est aussi
conservé dans `content/staging/b10-israel-temps-jesus.json`, y compris lorsqu’il
n’a pas encore d’identifiant satisfaisant.

## Éléments encore à examiner

### Régions non modélisées comme points

ABILÈNE, PHÉNICIE, ITURÉE, TRACHONITIDE, GALILÉE, GADARA, DÉCAPOLE, SAMARIE,
PÉRÉE, Plaine du Saron, JUDÉE, IDUMÉE, NABATÈNE et ARABIE.

Ces libellés devront être rapprochés d’entités territoriales datées lors d’un
lot dédié. Ils ne sont volontairement pas assimilés aux villes homonymes.

### Lieux sans ID suffisamment démontré

Gergésa, Raphana, Sepphoris, Hippos, Dion, Abila, Éphraïm, Jamnia (Jabné), Rama,
Qumran, Hérodium, Macheronte et Massada.

Qumran reste explicitement en attente : l’ancien corpus porte « Qumran » comme
nom alternatif de Sekaka, mais ce rapprochement ne fournit pas un identifiant
propre suffisamment démontré pour le lieu indiqué par B10.

### Élément naturel

Le Puits de Jacob reste sans ID propre.

## Méthode et certitude

Deux niveaux de provenance sont produits :

1. `source-map-location` indique qu’un lieu figure dans la liste B10 ;
2. `map-and-event-cross-reference` relie ce lieu à un événement A7 qui le cite
   déjà avec une période, des participants et des présences relus.

La certitude du rapprochement géographique est distincte de la certitude du
symbole imprimé sur la carte. Lorsque la liste numérique WOL ne restitue pas ce
symbole, `sourceMapCertainty` reste `unknown`. Un point d’interrogation explicite
dans le libellé conserve une certitude possible.

Le panneau « Pourquoi ce lieu ou ce tracé ? » rend cette provenance accessible
depuis les fiches. Il indique la source, la carte, la méthode, la certitude et
les limites. Pour les itinéraires A7 existants, il rappelle que le tracé est
schématique et relie une séquence de lieux sans prétendre reproduire le chemin
exact.

## Reproductibilité et validation

```bash
pnpm historical:build:b10
pnpm historical:check:b10
pnpm historical:validate
pnpm check
```

`historical:check:b10` vérifie notamment :

- l’entrée du catalogue et sa politique de réutilisation factuelle ;
- la couverture complète des 75 libellés dans le staging ;
- l’existence des événements et présences référencés ;
- la concordance entre présence, événement et lieu ;
- l’absence de coordonnées modifiées ;
- l’absence de route attribuée à B10 ;
- les rapprochements stables de Capharnaüm, Bethléem et Bersabée ;
- le maintien de Qumran dans les éléments à examiner.
