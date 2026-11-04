# Bible Lab — panneau minimaliste · schéma UX et design

## Intention

Le panneau latéral **ne doit pas devenir un logiciel dans le logiciel**. Il sert de compagnon discret entre les notes Obsidian et les pages officielles WOL. La profondeur de recherche et la collecte restent disponibles, mais l'interface n'affiche **que le nécessaire au moment de l'étude**.

**Fil conducteur :** sujet → chercher → conserver → construire → insérer dans la note.

## Navigation

| Emplacement | Visible en permanence ? | Contenu |
|---|---|---|
| **Étude** | Oui | Plan actif, une recherche, idées en cours, bac en attente |
| **WOL** | Oui | Recherche officielle, filtres Publications / Index / Guide / Perspicace |
| **Bac** | Oui | Capture express, trouvailles, fiches d'idées |
| **Index** | Oui | Recherche dans les sources conservées, favoris, historique replié |
| **Capture** | Icône dans l'en-tête | Déposer le texte copié sans changer de tâche |
| **⋯ Autres outils** | Icône dans l'en-tête | Lire, Atlas, Sources, Studio |

Aucune nouvelle vue autonome n'est ajoutée.

## Étude : ordre exact du contenu

1. **Mon sujet** — sélecteur du plan actif, bouton + pour créer. Une recherche sans plan reste possible.
2. **Modifier le plan et ses pistes** — accordéon fermé au départ ; conserve toutes les fonctions de la phase 1 : créer, renommer, déplacer, retirer, rechercher une piste dans WOL.
3. **Que veux-tu approfondir ?** — un seul champ, dont la saisie de verset lance le lecteur rapide et la saisie de thème ouvre la recherche WOL.
4. **Mes idées** — quatre fiches au maximum, montrant uniquement phrase et nombre de sources, plus le bouton + ; clic pour reprendre une fiche.
5. **À explorer plus tard** — une seule ligne avec le nombre de trouvailles du bac et un accès direct.
6. **Note active / dernière référence** — un rappel discret, seulement lorsqu'une note ou une lecture existe.
7. **Texte du jour et réunion de semaine** — bloc replié ; il est chargé lorsqu'on le demande et conserve les fonctions existantes.

## WOL

- Plan courant en une seule ligne repliable (les pistes et options de plan sont accessibles dans le dépliage).
- Un champ principal, les quatre filtres sous forme de commandes compactes, et **Rechercher dans WOL** comme action dominante.
- Deux boutons iconographiques pour conserver la recherche ou ouvrir directement WOL.
- Conseils, lecteur secondaire, options de correspondance et recherche JW.org rassemblés dans **Autres actions et conseils**.

Le navigateur web d'Obsidian reste responsable des résultats, liens et navigation. Aucun scraping, aucune simulation de page WOL.

## Bac

- Capture express en bandeau compact.
- **Ajouter manuellement** (nom, URL précise, extrait, commentaire) replié.
- Trouvailles en cartes sobres avec actions accessibles par icônes dont les intitulés restent disponibles pour le clavier et les lecteurs d'écran.
- Fiches d'idées sous forme de lignes repliées ; en ouvrir une révèle la phrase, la liste des références, l'ordre et les commandes copier/insérer.
- Un nouvel élément créé s'ouvre immédiatement pour ne pas casser le parcours.

## Index

- Recherche transversale et filtres visibles.
- Métadonnées avancées accessibles sur chaque source.
- Historique WOL fermé par défaut, mais les recherches restent récupérables.
- **Sauvegarder ou restaurer** replié : tous les mécanismes de sécurité de la phase 5 restent intacts.

## Direction artistique

- **Sobre et intégrée à Obsidian** : surfaces natives, peu de dégradés, bordures fines, typographie lisible.
- Accent **violet du thème** pour l'action principale, pas pour chaque composant.
- Espaces réguliers, titres courts, densité optimisée pour une barre latérale de 250 à 400 px.
- Les boutons iconographiques conservent un `aria-label` explicite et un état focus clavier.
- Mode sombre et clair, respect de `prefers-reduced-motion`.
- Aucun texte important n'est dissimulé uniquement derrière une couleur ou un pictogramme ambigu.

## Fonctions sanctuarisées

Le lecteur pop-up, le moteur de détection des références, le navigateur WOL natif et les formats de données des phases 1 à 5 sont **inchangés**.

## Contrôle qualité

- Compilation TypeScript, tests unitaires et packaging.
- Tests Playwright nouveaux pour les quatre accès, le plan repliable, les idées, le bac, l'index et les actions WOL.
- Tests historiques adaptés uniquement lorsqu'ils supposent l'ancienne **présentation** ; le comportement métier reste vérifié.
- Captures automatiques reproductibles pour interface claire, sombre, panneau étroit et bac.

**La PR est volontairement en brouillon.** Tester dans une copie du coffre Obsidian, puis valider la mise en page et les flux avant consolidation des branches.
