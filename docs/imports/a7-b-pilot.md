# Import pilote A7-B — début du ministère de Jésus

## Périmètre

Cet import utilise uniquement le tableau de l’appendice A7-B de la *Traduction
du monde nouveau, édition d’étude* :

- source : [Principaux évènements de la vie terrestre de Jésus : début du ministère de Jésus](https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/appendice-a/debut-ministere-jesus/) ;
- consultation : 25 juillet 2026 ;
- extraction limitée aux dates, lieux, événements, participants nommés et
  références bibliques ;
- aucune illustration, aucun long extrait et aucune coordonnée nouvelle ne sont
  reproduits.

La structure HTML officielle indique que la cellule « 29, automne » couvre les
quatre premières lignes et que la cellule « 30, Pâque » couvre les cinq
suivantes. Ces portées sont conservées dans les `TemporalSpan`.

## Résultat

Le rapport déterministe se trouve dans
`content/generated/import-reports/a7-b.json`.

| Élément | Nombre |
| --- | ---: |
| Événements validés | 9 |
| Personnes reliées ou créées explicitement | 4 |
| Lieux ou régions distincts mentionnés | 12 |
| Lieux possédant un identifiant stable | 9 |
| Points déjà affichables sur la carte | 7 |
| Affirmations relues | 27 |
| Épisodes de présence | 11 |
| Relations dérivées | 11 |
| Points laissés à vérifier | 6 |

Les personnes structurées sont Jésus, Jean le Baptiseur, le Diable et Nicodème.
Les groupes non nommés — premiers disciples, disciples de Jésus et Samaritains —
restent des mentions textuelles et ne sont pas transformés artificiellement en
personnes.

Jéhovah est explicitement mentionné dans la première ligne, mais aucune
`BiblicalPerson` n’est créée : le modèle actuel est orienté vers les personnages
historiques et ne permet pas encore de représenter proprement une entité divine.
La mention et cette décision restent traçables dans le staging.

## Séparation des certitudes

Chaque ligne distingue :

- la certitude de date dans son `TemporalSpan` ;
- la certitude des lieux dans `placeMentions` et les `PresenceEpisode` ;
- la certitude de participation dans les affirmations `participation`.

Ainsi, Cana et Sychar restent `probable` selon les identifiants cartographiques
déjà présents, Énôn reste `possible`, et le lieu général du Jourdain n’est pas
confondu avec le site ponctuel possible de Béthanie de l’autre côté du Jourdain.

## Affichage dans l’application

Les neuf événements relus sont ajoutés à la projection de compatibilité de la
frise sans modifier les 180 lignes existantes.

Les événements disposant d’un lieu ponctuel déjà connu peuvent être reliés à :

- Jourdain ;
- Cana ;
- Capharnaüm ;
- Jérusalem ;
- Énôn ;
- Tibériade ;
- Sychar.

Le désert de Judée et Béthanie de l’autre côté du Jourdain restent des entités
documentaires sans point Leaflet. Aucun emplacement n’est inventé.

Comme plusieurs lignes partagent une même cellule de date, la projection
actuelle utilise des ancres techniques réparties dans la saison pour éviter leur
superposition. Ces ancres ne sont pas des dates historiques : la fiche conserve
et affiche le libellé source « Automne 29 » ou « Pâque 30 ».

## Points restant à vérifier

1. le site ponctuel près de Béthanie de l’autre côté du Jourdain ;
2. le futur type d’entité adapté à la mention de Jéhovah ;
3. un éventuel point représentatif validé pour le désert de Judée ;
4. la localisation ponctuelle de Béthanie de l’autre côté du Jourdain ;
5. l’attribution individuelle des lieux Judée et Énôn dans la ligne composée ;
6. l’attribution individuelle de Tibériade et Judée dans la ligne composée.

Ces éléments restent signalés dans `content/staging/` et ne produisent pas de
présence individuelle certaine.
