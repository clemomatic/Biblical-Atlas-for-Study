# Bible Lab — Catalogue JW.org relié à la bibliothèque hors ligne

Cette branche prolonge **PR #103** (bibliothèque visuelle) et **PR #101** (import et téléchargement JWPUB). Les publications existantes dans le coffre restent inchangées.

## Parcours

1. Dans la palette d'Obsidian, ouvrir **Ma bibliothèque**.
2. Cliquer **Explorer JW.org**. Une sélection de publications françaises du catalogue officiel apparaît avec ses couvertures provenant de \`cms-imgp.jw-cdn.org\`. L'image distante n'est chargée qu'en entrant volontairement dans le catalogue en ligne.
3. Filtrer par catégorie ou rechercher dans la sélection.
4. Cliquer **Vérifier le JWPUB** sur une publication. Cette action lance une requête à \`GETPUBMEDIALINKS\` depuis Obsidian ; aucun fichier n'est téléchargé à ce stade.
5. Si le service indique un JWPUB français, vérifier la taille et cliquer **Télécharger et préparer**, puis **Importer dans Obsidian** après aperçu. La publication et ses notes sont alors disponibles localement.

**Revues :** un téléchargement de \`w\` requiert une édition exacte (ex. \`issue=202609\`). Le code et l'édition sont conservés dans le manifeste local pour distinguer les numéros de la même année.

## Découverte et limites

- Une sélection de départ reflète des publications visibles sur la bibliothèque française de JW.org au moment du développement. La présence d'une carte **ne prouve pas qu'un JWPUB est disponible**.
- **Actualiser depuis JW.org** lit à la demande les liens de téléchargement présents dans le HTML public de la page d'accueil de la bibliothèque. Ce n'est **pas un catalogue exhaustif**. Une page de contrôle anti-robot ou un changement de structure HTML peuvent empêcher la découverte ; la sélection de départ et la vérification des identifiants restent possibles.
- **J’ai un code ou un lien officiel de téléchargement** ouvre un champ facultatif pour coller l’URL du bouton *Texte* d’une publication sur JW.org : Bible Lab en extrait le code et, s’il existe, le numéro d’édition. Les champs **code** et **numéro facultatif** permettent aussi d'interroger le service lorsqu'une publication ne figure pas dans la sélection. L'outil ne tente pas d'énumérer les identifiants.
- Le service de téléchargement renvoie des URL et métadonnées vérifiées avant la demande de téléchargement ; l'importeur vérifie la taille, la structure ZIP et la possibilité de lire le fichier. Il n'utilise ni les cookies du navigateur WOL, ni des identifiants privés.
- Les fichiers téléchargés et leur contenu restent dans le coffre ; les recherches, références et notes privées ne sont pas envoyées au service de catalogue. Les images de couvertures publiques du catalogue sont chargées depuis JW CDN sur action explicite.
- Les couvertures hors ligne ne changent pas : elles utilisent uniquement les assets du JWPUB importé ou un dessin typographique.
- **Non réalisé dans cette étape :** exploration intégrale paginée de toutes les publications, vérification automatique des mises à jour, lecture biblique complète/ancres de versets, création de carnets de notes à partir des programmes d'assemblée. Ces étapes exigent de nouveaux tests et une validation dans Obsidian Desktop.

## Validation technique

\`\`\`bash
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-jworg-catalog.spec.ts \
  obsidian/tests/bible-lab-visual-library.spec.ts \
  obsidian/tests/bible-lab-offline-publications.spec.ts \
  --project=desktop --workers=1
\`\`\`

Valider manuellement avec un **vrai** fichier JWPUB français téléchargé sur JW.org (par exemple un programme d'assemblée), les éditions de revue, le refus du site, les thèmes clair/sombre et le coffre hors ligne. Ne pas fusionner tant que ces vérifications ne sont pas terminées.
