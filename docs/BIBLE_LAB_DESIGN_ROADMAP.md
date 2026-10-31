# Bible Lab — Study Studio · design et architecture

## Vision

Un environnement d'étude biblique **local-first**, centré sur la lecture et
l'exploration plutôt que sur les réglages. L'interface Obsidian reste un outil,
non une nouvelle source d'autorité : toute référence doit pouvoir retourner au
document officiel qui la soutient.

L'Atlas, la frise, les enquêtes Canvas et les notes Markdown demeurent la
fondation. Les données utilisateur et les données documentaires ne sont jamais
fusionnées de manière irréversible.

## Design system

- **Identité :** surface Obsidian, violet minéral, texte très lisible,
  accent lumineux réservé aux actions et au focus.
- **Navigation :** 6 onglets courts avec pictogrammes Lucide cohérents ; un
  écran de découverte, pas un ruban de 20 boutons.
- **Hiérarchie :** un titre fort, des cartes denses, des micro-libellés,
  des explications contextuelles repliables.
- **Motion :** transitions 150–260 ms, avec désactivation sur
  `prefers-reduced-motion:reduce`.
- **Mobile :** composants fluides, cibles tactiles généreuses, navigation
  utilisable à une main, aucune dépendance à la souris.
- **Focus étude :** les panneaux de configuration ne s'invitent pas pendant
  la consultation ; les notes restent en premier plan.
- **Performance :** cache limité, composants simples, pas de requêtes réseau
  automatiques pour des données personnelles et pas de rendu HTML distant.

## Déjà développé dans 0.4

- Tableau de bord et design Study Studio
- Recherche WOL + aperçu explicite utilisant un service tiers
- Liens JW Library et détection de références dans les notes
- Atlas, index des cartes, appendices
- Aperçu public du texte du jour et de la réunion
- Création non destructive de notes de méditation et de préparation
- Plans de discours structurés avec minutage et checklist
- Inventaire local JWPUB/.jwlibrary sans modification du fichier

## Étape 1 : JWPUB → Markdown

1. Utiliser un fichier fourni *localement* par l'utilisateur.
2. Détecter le manifeste et le schéma de publication ; vérifier limites de
   décompression avant toute lecture.
3. Déchiffrer les blocs si nécessaire, avec implémentation testée, et lire la
   base SQLite localement (WASM embarqué, sans CDN).
4. Transformer le HTML en Markdown avec les niveaux de titre,
   les paragraphes, les renvois bibliques et les informations de provenance.
5. Ressources : ne copier images/médias qu'avec autorisation et demande
   explicite de l'utilisateur.
6. Afficher la prévisualisation et permettre un dossier cible.
7. Ne jamais réimporter silencieusement l'ensemble du contenu lors d'une
   mise à jour, ni écraser une note annotée.
8. Tests : publications courtes/longues, texte, cahiers de réunion,
   langues, ancien schéma, ZIP corrompu, mobile et hors-ligne.

La conversion traite les copies auxquelles l'utilisateur a accès ; les
publications ne sont pas redistribuées dans le dépôt.

## Étape 2 : sauvegarde JW Library ↔ notes Obsidian

### Lecture

- Enregistrer un snapshot et la version du schéma.
- Lire `manifest.json`, `userData.db`, et conserver tout média annexe.
- Importer les objets par identifiants stables : Note.GUID, Tag, TagMap,
  UserMark, BlockRange, Bookmark, Location, InputField ; enregistrer
  publication, langue, emplacement et source.
- Distinguer notes personnelles des éléments issus des publications.
- Regrouper sans supprimer les doublons ; afficher les conflits.
- Ne modifier ni les publications téléchargées ni la base de l'application
  directement.

### Édition et sortie

- Modifications dans Obsidian liées par GUID ; aperçu précis des changements.
- Exporter **une nouvelle sauvegarde** depuis un snapshot immuable.
- Refaire SQLite en transaction avec PRAGMA integrity_check et
  foreign_key_check, préserver index/déclencheurs et vérifier le schéma.
- ZIP compatible et hachage du manifeste selon la variante de schéma vérifiée.
- Comparer nombre et GUID des objets avant/après, conserver toutes les
  ressources de playlist.
- Ne jamais donner un bouton « Restaurer automatiquement ».
- Vérifier sur JW Library Windows et Android avec une sauvegarde de
  démonstration avant d'annoncer la compatibilité.

**Risque crucial :** la restauration JW Library remplace les données
personnelles de l'appareil cible. La synchronisation automatisée n'est pas
une fonction officiellement prise en charge.

## Étape 3 : expérience d'étude complète

- Programme de réunion de semaine consultable, avec notes libres par rubrique,
  liens vers les références et travaux déjà préparés.
- Texte du jour, liens aux notes passées, questions de méditation et recherche.
- Article d'étude du week-end et préparation, avec lien officiel.
- Atelier discours : plans personnels importés, arborescence d'arguments,
  minutage, répétition, cartes Canvas et gestion des versions.
- Suggestion de liens entre notes **sans** affirmations historiques inférées
  automatiquement ; validation systématique par l'utilisateur.

## Qualité / conformité

- Dépendances embarquées et contrôles de licences.
- Traitement des données personnelles strictement local sauf consentement
  explicite pour une recherche externe.
- Tests unitaires de formats avec **fixtures synthétiques**, pas avec des
  copies personnelles distribuées.
- Tests d'intégration sur Obsidian réel avant de qualifier une version de stable.
- Source, date, niveau de certitude et mode d'obtention visibles à la demande.
- Pas de scraping massif, contournement de contrôle d'accès ou publication
  de contenu protégé.

## Critères de sortie de la version « stable »

- Aucun écrasement de note ou de sauvegarde utilisateur dans les tests.
- Conversion réimportable et comparaison GUID/relations à l'identique.
- Support explicite des schémas et appareils testés.
- Fonctionnement hors ligne des informations importées.
- Contraste AA, clavier, Android tactile, reduced motion et panneau étroit.
- Un parcours complet « question → sources → liens → méditation → note »
  réalisable sans configuration technique préalable.
