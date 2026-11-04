# Bible Lab — Phase 5 · Connexions et dossier de recherche

Les fiches d’idées font apparaître les autres fiches partageant une trouvaille enregistrée. Les relations sont calculées à partir des identifiants de captures, sans IA, sans accès réseau et sans modification des notes.

Dans **Trouvailles**, le bloc **Mon dossier de recherche** propose de copier un dossier Markdown limité au plan actif ou de copier l’ensemble des recherches. Le dossier contient les fiches, les références WOL, les extraits, les commentaires et les connexions explicites.

Le bouton **Voir les sources communes** affiche les titres des trouvailles partagées. Les captures supprimées ne peuvent plus créer de liens fantômes.

## Tests

```sh
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
```

## Limites

Le graphe est une première vue relationnelle dans les fiches, **pas encore un Canvas Obsidian manipulable**. Les connexions ne sont pas des interprétations sémantiques ; elles indiquent uniquement les sources réutilisées. Le dossier est copié dans le presse-papiers, et non créé automatiquement dans le coffre. Vérifier le résultat en environnement Obsidian réel.
