# Atlas biblique interactif

Application d’étude en lecture seule permettant d’explorer une frise chronologique et une carte Leaflet synchronisées. Elle est conçue pour la consultation, la recherche simple et la navigation entre événements, lieux, personnages et itinéraires.

L’application n’intègre aucun outil public d’ajout ou d’importation de données. Le corpus est versionné avec le code afin que son évolution puisse être relue et vérifiée. Les dates et affirmations historiques d’origine sont conservées : aucune datation ne doit être modifiée sans source vérifiable.

## Installation

Prérequis :

- Node.js 22 ;
- pnpm 11.

```bash
pnpm install
pnpm dev
```

L’application est ensuite disponible sur `http://localhost:3000`.

## Vérifications

```bash
pnpm typecheck
pnpm build
pnpm check
```

`pnpm check` exécute le contrôle TypeScript puis le build de production. La GitHub Action `.github/workflows/ci.yml` lance ces vérifications pour chaque pull request vers `main` et chaque push sur `main`.

## Fonctionnement

### Recherche et filtres

- recherche globale dans les événements, lieux, personnages et itinéraires ;
- ouverture rapide de la recherche avec la touche `/` ;
- filtres de catégories persistés localement ;
- état de navigation partageable dans l’URL ;
- interface responsive avec panneau de filtres adapté aux écrans mobiles.

### Frise

- zoom logarithmique, déplacement horizontal et vue annuelle avec repères mensuels ;
- événements toujours distincts, sans fusion visuelle ;
- modes de densité pour ajuster la quantité de texte affichée ;
- rendu limité aux événements qui croisent le viewport, avec une marge autour de la zone visible ;
- transmission en continu de la période affichée à la carte.

### Carte

- groupes Leaflet indépendants pour les lieux, itinéraires et territoires ;
- nettoyage des groupes à chaque mise à jour pour éviter les doublons ;
- commandes indépendantes et accessibles pour les itinéraires et territoires ;
- fond « Relief naturel » par défaut et fond clair CARTO mémorisé localement ;
- légende des lieux conforme aux catégories des cartes documentaires ;
- libellés cartographiques progressifs en quatre niveaux : majeur, régional, étude et local ;
- filtrage temporel lorsque les dates d’une entité sont connues ;
- sélection et mise en valeur d’un itinéraire ;
- navigation dans les deux sens entre carte, frise et fiches documentaires.

### Fiches d’étude

Les fiches regroupent la synthèse, les relations et les références d’une entité. Elles permettent de poursuivre la navigation sans perdre le contexte de consultation.

## Structure des données

Les interfaces sont définies dans `src/types.ts`. Chaque entité utilise un identifiant stable ; les anciennes données dépourvues d’ID reçoivent un identifiant déterministe à partir de leurs champs stables.

Champs documentaires communs :

| Champ | Rôle |
| --- | --- |
| `biblicalReferences` | Références bibliques |
| `documentaryReferences` | Références documentaires ou archéologiques |
| `sources` | Sources structurées avec ID, libellé, URL et citation optionnelles |
| `certainty` | `certain`, `probable`, `possible` ou `unknown` |
| `notes` | Notes éditoriales |
| `lastVerified` | Date de dernière vérification au format `AAAA-MM-JJ` |
| `mapLabelLevel` | Priorité d’affichage du nom d’un lieu selon le zoom cartographique |

Le corpus de la Terre promise conserve un lien direct vers la carte documentaire
[« La Terre promise », dans *Voyez le bon pays*, p. 18-19](https://wol.jw.org/fr/wol/d/r30/lp-f/1102003103).
Les coordonnées identifiées sont croisées séparément avec
[OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data).

Relations principales :

- `EventData.associatedLocationIds`, `associatedRouteIds`, `associatedCharacterIds` ;
- `BiblicalPlace.associatedEventIds`, `associatedCharacterIds`, `routeIds` ;
- `BiblicalRoute.associatedPlaceIds`, `associatedEventIds`, `associatedCharacterIds`.

Les anciens champs textuels `associatedEvents` et `associatedCharacters` restent lisibles. Ils sont convertis en relations par ID lorsque la correspondance exacte existe.

### Provenance du corpus cartographique

Le fichier `src/data/promisedLandPlaces.ts` intègre les lieux relevés dans les
documents « La Terre promise » et « Les environs de Jérusalem ». Les références
de grille et les catégories de la légende originale sont conservées dans
`mapReferences` et `mapCategory`.

Les coordonnées ont été croisées avec
[Bible Geocoding Data d’OpenBible.info](https://github.com/openbibleinfo/Bible-Geocoding-Data),
distribué sous licence
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
Le champ `certainty` restitue le degré de confiance de l’identification retenue.
Les points qui représentent un cours d’eau ou une étendue, ainsi que les
positions seulement reportées depuis la carte, sont signalés par
`coordinatePrecision` afin de ne pas donner une fausse impression de précision.

Cette intégration n’ajoute aucun outil d’importation dans l’application : le
corpus reste statique, versionné et relisible. Elle ne modifie aucune date de la
frise.

## Organisation du code

```text
src/
├── components/       interface, recherche, frise, carte et fiches
├── data/             corpus intégré de la frise et de la carte
├── utils/            dates, IDs et normalisation des relations
├── App.tsx           état partagé et synchronisation des vues
└── types.ts          modèles de données
```

Les tuiles de fond sont fournies par CARTO et OpenStreetMap ; une connexion réseau est nécessaire pour afficher le fond cartographique.
