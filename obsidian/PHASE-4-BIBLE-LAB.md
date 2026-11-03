# Bible Lab — Phase 4 · capture express et finitions

## Ce qui change

La capture devient accessible en haut des écrans **Étudier**, **Chercher** et **Trouvailles**.

**Garder le lien WOL** : quand une seule page WOL est ouverte ou qu'un onglet WOL consulté peut être identifié de façon fiable, l'URL officielle est enregistrée dans le bac en un clic, avec son ancre `#h=N` si elle existe. La source reçoit une étiquette provisoire `Document WOL · numéro`. Elle peut être renommée dans `Mon index`. Aucun contenu d'article n'est deviné ou extrait.

**Garder le texte copié** : sélectionner du texte dans la vraie page WOL, effectuer **Copier**, puis cliquer sur ce bouton dans le panneau. La lecture du presse-papiers a lieu **uniquement** lors de ce clic. La découverte est enregistrée avec l'extrait et, si elle est identifiable, l'adresse WOL sélectionnée ou consultée précédemment. Le bouton n'interroge pas la sélection interne du navigateur.

**Plusieurs onglets WOL** : si le dernier onglet WOL consulté ne peut pas être déterminé, Bible Lab **n'attribue pas un lien au hasard**. Il ouvre le bac : l'utilisateur choisit la page dans la liste `Onglet WOL à conserver` et confirme avec `Utiliser ce lien`.

**Palette de commandes** : `Capturer rapidement le texte copié ou l'onglet WOL dans Bible Lab`. On peut lui attribuer son propre raccourci dans les réglages clavier d'Obsidian.

## Parcours typique

1. Recherche « amitié anciens » dans WOL depuis une piste du plan ou de manière libre.
2. Ouvrir l'article dans la visionneuse web Obsidian.
3. Sélectionner un passage et le copier.
4. Cliquer sur **Garder le texte copié**, ou utiliser la commande dédiée.
5. Continuer à explorer : la trouvaille est stockée dans le bac, indépendamment des fiches d'idées.
6. Quand le moment vient, associer la découverte à une fiche, modifier sa phrase et insérer `Phrase ([source](URL) ; [source](URL))` dans une note.

## Garanties

- La lecture automatique, le scanner de références et les pop-ups ne sont pas modifiés.
- Aucun script n'est injecté dans WOL, aucune lecture de cookies, aucun scraping.
- Seules les URL officielles `wol.jw.org` sont acceptées et les ancres de paragraphe existantes sont conservées.
- La capture n'altère pas les notes Markdown. Elle crée une nouvelle entrée dans le stockage local existant `bibleLabCollection`.
- Lorsque l'accès au presse-papiers est bloqué, le champ Extrait permet toujours de coller manuellement.
- Le lien récupéré est celui connu par l'état de la Visionneuse web. Si sa navigation interne n'actualise pas cet état, il faut vérifier le lien avant de citer un paragraphe.
- L'étiquette `Document WOL · numéro` est un repère **provisoire** ; ce n'est pas le titre de l'article.

## Tests

```sh
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts \
  obsidian/tests/bible-lab-quick-capture.spec.ts \
  obsidian/tests/bible-lab-collection.spec.ts \
  obsidian/tests/bible-lab-core-regression.spec.ts \
  --project=desktop --workers=1
```

**Version de prévisualisation** : à tester dans une copie du coffre Obsidian sous Windows, avec la Visionneuse web activée. Vérifier notamment : un seul onglet WOL, plusieurs onglets, URL précise de paragraphe, texte copié, accès refusé au presse-papiers, présentation sous thèmes sombre et clair et panneau étroit.

Le parcours de capture repose volontairement sur une action explicite. Une extraction totalement automatique de la sélection dans l'onglet web n'est **pas** annoncée comme fonctionnelle.
