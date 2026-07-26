# Lots produits par l’éditeur local

Ce dossier reçoit uniquement des propositions non relues créées depuis
`/edition` ou importées depuis un assistant.

Chaque lot :

- porte `workflowStatus: "staging"` ;
- porte `humanReviewStatus: "pending"` ;
- concerne une source principale et un petit ensemble cohérent ;
- conserve une note d’extraction et les identifiants de sources ;
- ne remplace jamais silencieusement une donnée de `content/reviewed`.

L’écriture est disponible uniquement avec :

```text
VITE_ENABLE_EDITOR=true
```

La promotion reste une action séparée et explicite via les validateurs et la
commande `pnpm historical:promote`. Un export JSON est proposé si l’API locale
n’est pas disponible.
