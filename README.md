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

- zoom, déplacement horizontal et regroupement visuel des événements proches ;
- modes de densité pour ajuster la quantité de texte affichée ;
- rendu limité aux événements qui croisent le viewport, avec une marge autour de la zone visible ;
- transmission en continu de la période affichée à la carte.

### Carte

- groupes Leaflet indépendants pour les lieux, itinéraires et territoires ;
- nettoyage des groupes à chaque mise à jour pour éviter les doublons ;
- commandes indépendantes et accessibles pour les itinéraires et territoires ;
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

Relations principales :

- `EventData.associatedLocationIds`, `associatedRouteIds`, `associatedCharacterIds` ;
- `BiblicalPlace.associatedEventIds`, `associatedCharacterIds`, `routeIds` ;
- `BiblicalRoute.associatedPlaceIds`, `associatedEventIds`, `associatedCharacterIds`.

Les anciens champs textuels `associatedEvents` et `associatedCharacters` restent lisibles. Ils sont convertis en relations par ID lorsque la correspondance exacte existe.

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
