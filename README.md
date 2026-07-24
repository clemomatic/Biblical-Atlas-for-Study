# Atlas biblique interactif

Application React permettant d’explorer une frise chronologique et une carte Leaflet liées entre elles. Les événements peuvent ouvrir leurs lieux associés ; un lieu peut à son tour renvoyer vers les personnages et événements correspondants.

Les dates et affirmations historiques présentes dans les données d’origine sont conservées. Une correction éditoriale ne doit pas servir à modifier une datation sans source vérifiable.

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

`pnpm check` exécute le contrôle TypeScript puis le build de production. La GitHub Action `.github/workflows/ci.yml` reproduit ces vérifications pour chaque pull request vers `main` et chaque push sur `main`.

## Fonctionnement

### Frise

- zoom, déplacement horizontal et regroupement visuel des événements ;
- filtre manuel par catégorie et recherche textuelle ;
- rendu limité aux événements qui croisent le viewport, avec une marge autour de la zone visible ;
- transmission de la période affichée à la carte.

### Carte

- groupes Leaflet indépendants pour les lieux, itinéraires et territoires ;
- nettoyage des groupes à chaque mise à jour pour éviter les doublons ;
- boutons d’affichage indépendants pour les itinéraires et les territoires ;
- filtrage temporel des entités lorsque leurs dates sont connues ;
- navigation dans les deux sens entre la carte et la frise.

### Import `.timeline` et XML

Le bouton d’import accepte les fichiers `.timeline` historiques et les fichiers `.xml`. L’import vérifie :

- la syntaxe XML et les erreurs `parsererror` ;
- les champs obligatoires des événements (`text`, `category`, `start`) ;
- le format et l’ordre des dates ;
- les identifiants dupliqués ;
- le format de `lastVerified`.

Les messages d’erreur indiquent les éléments à corriger. Les catégories visibles sont resynchronisées après un import.

Les relations de lieu sont acceptées sous les formes camelCase et snake_case, par exemple :

```xml
<event id="event-exemple">
  <text>Événement d’exemple</text>
  <category>Événements marquants</category>
  <start>-1000-01-01 00:00:00</start>
  <end>-1000-01-01 00:00:00</end>
  <associatedLocationIds>
    <id>jerusalem</id>
    <id>bethlehem</id>
  </associatedLocationIds>
</event>
```

Les variantes `associated_location_ids`, `associatedLocationId` et `associated_location_id` restent prises en charge.

## Structure des données

Les interfaces sont définies dans `src/types.ts`. Chaque entité utilise un identifiant stable. Les fichiers historiques qui ne fournissent pas d’ID reçoivent un ID déterministe à partir de leurs champs stables.

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
├── components/       vues React (frise, carte, import, détails)
├── data/             données intégrées de la frise et de la carte
├── utils/            dates, import XML, IDs et normalisation des relations
├── App.tsx           état partagé et synchronisation frise-carte
└── types.ts          modèles de données
```

Les tuiles de fond sont fournies par CARTO et OpenStreetMap ; une connexion réseau est donc nécessaire pour afficher le fond cartographique.
