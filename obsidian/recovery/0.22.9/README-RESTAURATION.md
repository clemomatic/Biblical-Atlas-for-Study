# JW Study Desk 0.22.9 — sauvegarde de récupération, Atelier discours en priorité

## Ce que contient ce dossier

La version **0.22.9** reçue est un ZIP *installable*. Elle contient `main.js`, `styles.css`, `manifest.json` et la documentation, mais pas les sources TypeScript originales ni de sourcemap.

- **`original/atlas-biblique/`** : reproduction bit à bit de la livraison fournie, sans modification. C'est **cette version seulement** qui est considérée comme installable et fonctionnelle selon la livraison précédente.
- **`JW-Study-Desk-0.16.0-sources-base.zip`** : dernière archive complète de sources TypeScript retrouvée ; **point de comparaison uniquement**, plus ancienne que le plugin livré.
- **`main.recovered.js`** : représentation plus lisible du bundle JavaScript générée par l'imprimeur syntaxique TypeScript, analysée sans erreur de syntaxe (`node --check`). **Ce n'est PAS la base TypeScript d'origine** et aucune équivalence fonctionnelle dans Obsidian n'a encore été vérifiée.
- **`atelier-discours-extraits.js`** : extrait des principales fonctions et classes liées à l'Atelier discours depuis le bundle. Les identifiants minifiés et dépendances globales y sont conservés. **Fichier de référence non exécutable seul**.
- **`symboles-atelier.json`** : table des noms, tailles et positions de ces fonctions/classes dans le bundle.
- **`verifier-recuperation.py`** : vérification des fichiers, signatures et points fonctionnels attendus de la version originale.

## Inventaire Atelier discours vérifié dans le bundle

| Fonction | Marqueurs présents dans la version 0.22.9 |
|---|---|
| Mes plans et carte mentale | Vue `Atelier discours`, carte éditable, stockage des plans, bibliothèque |
| Mode Orateur | Navigation par branches, tableau, carte entière, minuterie, zoom, plein écran |
| Ressources | Bouton unique `Ressources du discours`, cantique et médias/sono |
| Cantique | Champ `introSong`, catalogue officiel et vérification des numéros 1–164 |
| Playlist JW Library | Validation et lecture de `.jwlplaylist`, copie projet, export, retrait protégé |
| Import | JWPub, Xmind, images et liens des ressources dans les plans |

Les noms des fonctions récupérées incluent `u9` (stockage des projets), `f2` (carte), `C9` (Orateur), `cQ` (vue Atelier discours), `jwsdParseSonoPlaylist`, `jwsdFindOfficialSong`, `jwsdDownloadPlaylist`. Ces noms sont ceux du code compilé, pas les noms TypeScript pré-minification.

## Limites et sécurité

- **Ne pas remplacer** le `main.js` original du plugin par `main.recovered.js` : nous n'avons vérifié que la syntaxe, pas le comportement.
- **Ne pas supprimer** `data.json`, les notes Markdown, les dossiers de publications ni les copies de playlists de ton coffre Obsidian.
- Les sources TypeScript 0.22.9 ne sont **pas** intégralement reconstruites. Les dernières sources complètes retrouvées sont celles de la 0.16.0. Il manque les évolutions postérieures (0.17–0.22.9) en version éditable TypeScript.
- La remise en ordre de GitHub devra utiliser une branche dédiée, puis des validations dans Obsidian avant toute fusion. L'ancienne branche `main` du dépôt GitHub contient encore la version 0.9.2.

## Vérifications

Lancer `python verifier-recuperation.py`. Le script calcule les empreintes des fichiers, contrôle l'intégrité des invariants de l'Atelier et vérifie la syntaxe du bundle original et reformaté avec Node.

## Architecture de reprise proposée

1. **Atelier discours :** restaurer à partir de la référence 0.22.9 les modèles de carte, l'import JWPub/Xmind, la vue Orateur et les ressources (cantique, playlist). Préserver le format Markdown et les copies `.jwlplaylist`.
2. **Bibliothèque, Bible, collecte et lecture :** aligner la base TypeScript sur le comportement réellement livré, sans supprimer de fonctionnalités.
3. **Recherche Explorer :** uniquement après validation des blocs précédents, porter le prototype GitHub existant et son analyseur Index WOL.

Ce dossier est un **point de récupération fiable**, pas une version 0.22.10.