# Bible Lab — phase 5 : fiabilité, sauvegarde et préparation de la version consolidée

## Objectif

Protéger les découvertes accumulées avant de diffuser la refonte du panneau latéral : plan facultatif, recherches WOL natives, bac à trouvailles, fiches d'idées, index personnel et capture express.

Cette phase **ne modifie pas** la reconnaissance des références dans les notes ni leur lecture en pop-ups.

## Sauvegarder mes recherches

Dans l'onglet **Mon index**, utiliser **Créer une sauvegarde**. Une commande est également disponible dans la palette de commandes Obsidian.

Bible Lab crée un fichier JSON daté, jamais écrasé, dans le dossier `Bible-Lab_Sauvegardes` à la racine du coffre. Ce fichier contient exclusivement :

- les plans de recherches et leurs pistes ;
- les trouvailles et leurs liens officiels WOL, y compris l'ancre exacte `#h=N` si elle est connue ;
- les fiches d'idées et leurs rattachements de sources ;
- les étiquettes, favoris et états de rangement ;
- l'historique des recherches lancées depuis Bible Lab.

**Non inclus** : le contenu des notes Obsidian ordinaires, les pages ou médias WOL, les cookies, les données de JW Library, l'ensemble des préférences du plugin. Une sauvegarde ne remplace pas une copie du coffre.

Attention : le dossier de sauvegardes est dans le coffre Obsidian et pourra être synchronisé si le coffre utilise une synchronisation externe.

## Restaurer

1. Dans **Mon index**, choisir **Restaurer**.
2. Sélectionner une sauvegarde parmi les fichiers de ce dossier.
3. La boîte de dialogue vérifie que le fichier provient de Bible Lab, que ses structures sont compatibles et que ses liens WOL sont valides. Elle affiche les nombres de plans, trouvailles, fiches et recherches.
4. Cocher explicitement la confirmation de remplacement, puis cliquer sur **Restaurer cette sauvegarde**.
5. Bible Lab crée une **nouvelle sauvegarde de l'état actuel** avant de modifier quoi que ce soit.
6. Après validation, les données de recherche sont remplacées. Les notes Markdown restent intactes.

Les sauvegardes corrompues, incompatibles, ou dépassant 22 Mo sont refusées. Une erreur d'écriture déclenche la remise en place de l'état précédent en mémoire, avec une sauvegarde de sécurité disponible dans le coffre.

La restauration **remplace** la collection personnelle, elle ne fusionne pas deux bibliothèques. Les fichiers JSON ne sont pas des commandes : leur contenu n'est jamais exécuté.

## Points d'interface et compatibilité

- Le bloc de protection est visible dans **Mon index**, sans créer un nouvel onglet.
- Les commandes **Sauvegarder** et **Restaurer** existent aussi dans la palette d'Obsidian.
- Le test historique de la barre principale a été corrigé pour compter les quatre onglets primaires, après l'ajout de « Trouvailles », et les quatre outils secondaires, après l'ajout de « Mon index ».
- Les aperçus pop-up, la reconnaissance automatique des références et les notes existantes ne sont pas modifiés.
- La capture avancée conserve ses limites honnêtes : on peut copier une sélection depuis WOL, mais le plugin n'intercepte pas automatiquement le contenu sélectionné dans le navigateur natif.

## Vérification

```sh
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-core-regression.spec.ts \
  obsidian/tests/bible-lab-research-plan.spec.ts \
  obsidian/tests/bible-lab-collection.spec.ts \
  obsidian/tests/bible-lab-archive.spec.ts \
  obsidian/tests/bible-lab-quick-capture.spec.ts \
  obsidian/tests/bible-lab-backup-restore.spec.ts \
  --project=desktop --workers=1
```

**Avant fusion** : valider dans une copie du coffre Obsidian sous Windows, tester une sauvegarde et une restauration complète, vérifier les thèmes sombre et clair, l'ouverture WOL et les pop-ups. Les PR des phases 0 à 4 sont empilées : la consolidation des branches doit conserver cette filiation.
