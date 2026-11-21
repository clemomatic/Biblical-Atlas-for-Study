# Reconstruction de l'Atelier discours — état source 0.22.9

## Référence et précautions

Cette branche reste basée sur l'ancienne arborescence du dépôt GitHub. La version 0.22.9 **intacte** est conservée dans `obsidian/recovery/0.22.9/` via une archive ZIP encodée, vérifiable par SHA-256 à l'aide de `reassemble.mjs`.

Les nouveaux modules TypeScript sont des reconstructions **séparées et testées**, inspirées de fonctions réellement présentes dans le bundle 0.22.9. **Ils ne remplacent pas encore l'interface Atelier discours de cette version**. Aucune note ni playlist de coffre Obsidian n'a été ouverte, modifiée ou supprimée.

## Fonctions reconstituées et correspondance avec le code livré

| Module TypeScript | Routines constatées dans le bundle 0.22.9 | Comportement restauré |
| --- | --- | --- |
| `talkStudio0229Recovery.ts` | `aQ`, `c0`, éléments de `u9`, `C9` | Schéma `jwsd-discours`, validation carte/références/images, métadonnées XMind et modèle, répétitions, cantique 1–164, remplacement prudent du bloc JSON Markdown, nom de fichier playlist sœur |
| `talkTiming0229.ts` | `Lo`, `ya`, branches visibles dans `C9` | Durées fixes, redistribution des secondes libres aux cartes « auto », contraintes des sous-branches, dépassements, créneaux et ordre des branches du mode Orateur |
| `talkMarkdownImport0229.ts` | `u2`, `g2`, `qs`, `Qc`, `op` | Import de titres Markdown (hors blocs de code), durées `m:ss` ou minutes décimales, notes et structure parent/enfant, disposition gauche/droite, sections flottantes |
| `talkGraph0229.ts` | `Qd`, `LS`, `DS`, `kS` | Déplacer/réordonner des cartes, éviter les cycles, supprimer avec relations et temps de répétition, remonter des sous-cartes, copier une branche et ses liens internes |

**Contrôle des sources :** les noms `aQ`, `Lo`, `u2`, `Qd`, `LS`, `DS`, `kS` sont les noms **compilés**, pas les noms TypeScript d'origine.

## Comment tester

La CI du dépôt exécute automatiquement :

```sh
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
```

Des tests dédiés couvrent chaque module dans `obsidian/src/*.test.ts`. Ils ne démontrent **pas** la compatibilité avec Obsidian Desktop ou Android ni l'équivalence totale des cas réels.

## Ce qu'il reste à reconstituer avant un plugin éditable en production

1. **Stockage et commandes de l'Atelier (`u9`, `cQ`) :** listes « Mes plans », lecture/écriture sûre des notes `.md`, autosauvegarde, favoris, annulation/rétablissement, menus.
2. **Interfaces de carte et d'Orateur (`f2`, `C9`) :** glisser-déposer, redimensionnement, lecture de références, notes, plein écran, compte à rebours, accessibilité.
3. **Ressources (`jwsdParseSonoPlaylist`, `jwsdFindOfficialSong`) :** parser ZIP et base SQLite des `.jwlplaylist`, validation de schéma/version/empreinte, images et médias, validation des URL du catalogue de cantiques.
4. **Imports JWPub/XMind :** reconduire les filtres de ZIP, contrôles des images et la conversion des plans. Ne pas réinterpréter librement la structure des archives officielles.
5. **Moteur partagé JW Study Desk 0.17–0.22.9 :** lecteur, bibliothèque, notes, correspondances, panier, navigateur WOL, paramètres et CSS : plus récent que les sources complètes 0.16.0.
6. **Intégration et vérification réelle** : reconstruire les vues au-dessus de ces modules, comparer visuellement et fonctionnellement à la 0.22.9 fournie, réouvrir les anciens plans sans réécriture, puis seulement préparer une archive installable.

## Pourquoi ne pas fusionner immédiatement

Le ZIP utilisateur 0.22.9 ne contient ni source TS/TSX ni sourcemap. Une compilation de l'ancienne branche GitHub produirait un plugin incomplet. Le but de cette branche de récupération est d'établir petit à petit une base source **vérifiable** sans casser la dernière version utilisée. La PR #119 « Explorer WOL » reste volontairement isolée.
