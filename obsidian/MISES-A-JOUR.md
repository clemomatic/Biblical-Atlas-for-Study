# Installer et mettre à jour Bible Lab dans Obsidian

Bible Lab est un plugin privé de travail en cours. Les publications GitHub sont créées seulement après validation automatique.

## Installation recommandée : BRAT

1. Dans Obsidian, ouvrir **Réglages → Modules complémentaires → Parcourir**.
2. Installer et activer **BRAT (Beta Reviewer's Auto-update Tool)**.
3. Dans les réglages de BRAT, choisir **Add Beta Plugin**, ou lancer la commande **BRAT: Add a beta plugin for testing**.
4. Entrer l'adresse du dépôt : `https://github.com/clemomatic/Biblical-Atlas-for-Study` (ou `clemomatic/Biblical-Atlas-for-Study`).
5. Choisir la version disponible souhaitée, puis activer **Bible Lab — Study Studio** dans les modules complémentaires.

Pour une mise à jour : utiliser **BRAT: Check for updates to all beta plugins**, ou activer les vérifications automatiques dans BRAT. BRAT récent télécharge les fichiers directement depuis les assets des *GitHub Releases*, même lorsque le plugin vit dans un sous-dossier du dépôt.

**Canaux** : les releases ordinaires sont destinées aux versions stables, les *pre-releases* aux versions d'essai. BRAT peut proposer une préversion si elle a un numéro supérieur ; avant de l'installer, vérifier son étiquette « Pre-release ». Pour ne prendre aucun risque, privilégier la dernière release stable ou figer une version dans BRAT lorsque cette option est offerte.

## Alternative : installation manuelle

1. Ouvrir la page [Releases GitHub](https://github.com/clemomatic/Biblical-Atlas-for-Study/releases).
2. Télécharger `atlas-biblique-X.Y.Z.zip` dans la version choisie.
3. Décompresser son dossier `atlas-biblique` dans `<coffre>/.obsidian/plugins/`.
4. Vérifier les fichiers `main.js`, `manifest.json`, `styles.css` dans `<coffre>/.obsidian/plugins/atlas-biblique/`.
5. Recharger Obsidian et activer Bible Lab.

**Ne pas supprimer le dossier de plugin au moment de mettre à jour** : sa configuration personnelle (`data.json`) doit être préservée. Faire une sauvegarde du coffre avant de tester une nouvelle version majeure.

## Procédure GitHub de publication

Le workflow `.github/workflows/obsidian-release.yml` :

- Sur la branche `main`, un changement de version dans `obsidian/manifest.json` déclenche une vérification puis, en cas de succès, une release stable correspondant au numéro `X.Y.Z` indiqué.
- Les fichiers `obsidian/manifest.json` et `obsidian/versions.json` doivent annoncer la même version et la même compatibilité Obsidian.
- Pour une préversion manuelle : **GitHub → Actions → Publish Bible Lab release → Run workflow** ; sélectionner la branche de développement dans `source_ref` et cocher `prerelease`.
- Une branche de développement ne peut pas publier de release stable ; la publication est impossible si la compilation, les tests unitaires ou les tests navigateur échouent.
- Une release existante n'est jamais écrasée automatiquement : publier un nouveau numéro pour chaque mise à jour.

Les assets d'une release sont directement compatibles avec BRAT récent : `manifest.json`, `main.js`, `styles.css` et l'archive manuelle.

**Note** : le dépôt GitHub contient aussi l'application Atlas biblique. Le plugin Obsidian est construit depuis le dossier `obsidian/`, et son identifiant reste `atlas-biblique`, quel que soit son nom affiché.
