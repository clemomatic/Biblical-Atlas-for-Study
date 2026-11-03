# Bible Lab — phase 2 : bac à trouvailles et fiches d'idées

Branche : `feat/bible-lab-phase2-idea-inbox` (PR #95, empilée sur phase 1 #94).

## Workflow de recherche

- **Étudier** : plan facultatif placé en premier, puis bouton **Ouvrir mon bac**.
- **Chercher** : recherche directe WOL (dont Index et Guide) et bouton **Conserver cette recherche** qui préremplit une trouvaille avec son URL.
- **Trouvailles** : écrire une intuition, un titre de référence, coller un extrait et facultativement une URL WOL et un commentaire. Aucun plan, étiquette ou phrase n'est exigé.
- **Lire** : le bouton **Garder la référence** permet de déposer dans le bac la référence actuellement consultée, sans changer le lecteur.
- **Dans une note** : commande Obsidian **Conserver la sélection dans le bac Bible Lab** pour une référence ou un extrait sélectionné.

## WOL : capture réaliste, sans extraction HTML

La Visionneuse web native reste un onglet Obsidian indépendant. Bible Lab ne prétend **pas** accéder automatiquement à la sélection de texte de la page WOL :

1. Sélectionner du texte dans la vraie page WOL et le copier.
2. Ouvrir l'onglet **Trouvailles** de Bible Lab.
3. Utiliser **Coller le texte copié** (ou coller directement dans le champ Extrait).
4. Utiliser **Utiliser ce lien** sur l'un des onglets WOL proposés ou coller l'URL manuellement.
5. Enregistrer. Si l'URL contient une ancre WOL reconnue (comme `#h=3`), elle sera conservée ; sinon, seul le lien de page est disponible.

Un extrait enregistré n'est pas nécessairement une citation présente dans le résultat final. Il reste disponible comme matériau de réflexion.

## Construire une idée

1. Depuis **Trouvailles**, créer une **Nouvelle fiche d'idée** ; la phrase peut rester vide.
2. Ajouter les sources du bac à la fiche. Une source peut être utilisée dans plusieurs fiches.
3. Remonter ou descendre les références, les retirer sans supprimer l'original.
4. Rédiger ou modifier la phrase.
5. Copier la phrase ou l'insérer dans l'éditeur Markdown actif.

Format de sortie :

```md
Les anciens doivent cultiver l'amitié ([Jean 7:24](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7) ; [Article WOL](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3))
```

Les références restent sur **la même ligne entre parenthèses**. La reconnaissance habituelle des références et les pop-ups sont inchangées.

## Stockage et sécurité

- `data.json` de l'extension : `bibleLabCollection` versionné (captations, fiches, rattachements). La phase 1 conserve séparément `bibleLabResearch`.
- Les écritures de ces données et des réglages du plugin sont sérialisées. Le format est normalisé au chargement et les URL sont limitées à WOL officiel.
- Aucun enregistrement ne modifie la note Obsidian. L'insertion est déclenchée explicitement et vise seulement une note Markdown réellement ouverte.
- Une suppression de source efface les liens de ses fiches ; retirer une source d'une fiche ne supprime pas la source du bac.
- Les sources peuvent être stockées sans lien (piste libre), mais elles ne deviennent pas un faux hyperlien à l'export.

## Validation

```sh
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-core-regression.spec.ts \
  obsidian/tests/bible-lab-research-plan.spec.ts \
  obsidian/tests/bible-lab-collection.spec.ts --project=desktop --workers=1
```

L'interface doit aussi être vérifiée dans Obsidian Windows, sur une copie du coffre, avec plusieurs onglets WOL ouverts, thème sombre et étroit. La Visionneuse web officielle peut être absente sur Android : les sources restent conservées, mais l'ouverture WOL passe par le fonctionnement de repli existant.

## Hors de cette phase

Les sessions de recherche historisées, la bibliothèque permanente indexée, la détection automatique d'une sélection à l'intérieur de la Visionneuse web et le classement avancé feront l'objet d'évolutions distinctes. Ne pas modifier les moteurs de références et d'aperçus pour les implémenter.
