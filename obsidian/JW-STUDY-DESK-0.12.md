# JW Study Desk 0.12.0

Le plugin Bible Lab devient **JW Study Desk**. Cette version applique l’identité visuelle approuvée et ajoute un bureau d’accueil qui donne accès aux outils existants.

## Ce qui change

| Espace | Présentation et comportement |
| --- | --- |
| Accueil | Panorama violet et lumière du matin, six accès directs, notes récentes et recherche active réelle. |
| Bibliothèque | Navigation commune au bureau, nouvelles couvertures et palette, catalogue automatique et menu ⋯ conservés. |
| Recherche | Saisie du sujet et choix Publications, Index, Guide ou Perspicace ; ouverture de la recherche WOL existante. |
| Mes notes | Recherche dans les titres et dossiers personnels, ouverture du fichier modifiable dans Obsidian ; sources importées et index gérés exclus de la liste. |
| Fiches d’idées et bac | Listes issues de la collection existante, accès à la fiche ou à la trouvaille dans le panneau d’étude. |
| Préparation | Programme et texte du jour dans le panneau existant, création effective d’un plan de discours et accès aux notes de préparation. |
| Lecture et fenêtres | Logo, polices, couleurs, bordures, focus clavier et pictogrammes harmonisés. |
| Atlas et réglages | Palette intégrée aux vues isolées, commandes et fenêtres du plugin ; les réglages d’Obsidian restent disponibles. |

L’interface suit le thème d’Obsidian. La navigation devient une barre inférieure dans les panneaux de moins de 740 px ; les outils secondaires restent accessibles par **Plus**. Les animations respectent la préférence système de réduction des mouvements.

## Identité incluse

- Logo fourni et approuvé par Clément Martin, intégré localement ; variante monochrome adaptée au ruban d’Obsidian.
- Montserrat pour les titres, Inter pour les textes et commandes, avec caractères français et variantes latines étendues. Les fichiers WOFF2 sont embarqués et leurs licences SIL Open Font License figurent dans `THIRD-PARTY-NOTICES.txt`.
- Violet `#6A3CF5`, indigo `#3B0D94`, pétrole `#0D6E8C`, sauge `#3FA68C`, corail `#FF6B6B`, ambre `#FFD8A0` et lavande `#ACA9FF`, avec des surfaces distinctes en clair et en sombre.
- Nouveau panorama d’accueil créé pour ce projet, exporté en WebP de 66 Ko. Aucun service externe n’est appelé pour afficher l’identité.

Les styles sont limités aux vues et fenêtres de JW Study Desk. Les couleurs des autres plugins et les notes ordinaires du coffre ne sont pas remplacées.

## Compatibilité des données

L’identifiant `atlas-biblique`, les identifiants historiques des vues et des commandes, les structures JSON et les dossiers de stockage sont conservés. La mise à jour remplace les fichiers du plugin, sans supprimer `data.json`, le cache du catalogue, les imports, les notes ou les sauvegardes. Le bureau lit les notes du coffre et les données existantes ; il ne crée pas de seconde bibliothèque ou de collection parallèle.

Le bureau n’affiche ni prénom inventé, ni verset de démonstration, ni progression fictive. Le programme du jour est toujours chargé par la fonction existante lors de son ouverture ; les contenus en ligne nécessitent une connexion.

## Vérifications

Résultats de validation du 6 novembre 2026 :

- `pnpm obsidian:typecheck` : réussi.
- `pnpm obsidian:test` : **154 tests unitaires réussis**.
- **206 scénarios Playwright ciblés réussis** sur les profils ordinateur et téléphone : 174 pour le bureau et les parcours d’étude, 32 pour l’Atlas, les notes, les cartes et les fenêtres déplaçables. Les assertions portant sur les anciens libellés/couleurs et les sélecteurs de couverture ont été adaptées à l’interface finale ; le test de déplacement conserve les limites de l’écran étroit.
- Paquet ZIP relu et intégrité SHA-256 de tous ses fichiers vérifiée.
- Inspection visuelle des captures clair/sombre, accueil, bibliothèque et affichage étroit.

Validation du paquet compilé dans l’hôte de test Obsidian : navigation du bureau, notes réelles, recherche WOL et filtres, collections, création d’un discours, paramètres persistants, polices et logo hors connexion, thèmes clair/sombre et affichage étroit. Les parcours existants sont également contrôlés sur ordinateur et téléphone simulés.

L’hôte de test simule l’API d’Obsidian ; il ne remplace pas une validation dans une installation réelle sur chaque appareil. Les 206 scénarios constituent une sélection de non-régression, et non l’ensemble des anciens tests du moteur de références. Les limites connues de ce moteur recensées dans `AUDIT-REFONTE-0.11.md` restent distinctes de cette refonte graphique.

## Installation

Fermez Obsidian. Copiez le dossier `atlas-biblique` contenu dans `JW-Study-Desk-0.12.0.zip` vers `.obsidian/plugins/` du coffre. Conservez les données existantes lors du remplacement. Rouvrez Obsidian, activez **JW Study Desk**, puis ouvrez-le depuis son logo dans le ruban ou avec la commande **Ouvrir JW Study Desk**.

Projet communautaire indépendant, sans affiliation officielle avec JW.org ou Obsidian.
