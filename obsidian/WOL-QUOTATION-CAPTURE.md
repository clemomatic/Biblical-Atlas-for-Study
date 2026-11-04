# Bible Lab — garder une portion de WOL et retrouver l'article

## Utilisation (Obsidian Desktop)

1. Dans la **Visionneuse web native** d'Obsidian, ouvrir un article WOL.
2. Sélectionner la phrase ou les quelques lignes intéressantes.
3. Faire **clic droit sur la sélection**, puis choisir **Bible Lab · Garder cette portion**.
4. La découverte est conservée dans le **Bac** avec le **titre de l'article**, l'extrait sélectionné et le lien officiel WOL.
5. Dans le Bac, cliquer sur **Lire la citation** pour déplier l'extrait, ou **Lire dans Bible Lab** pour ouvrir la source dans le volet de lecture. Le bouton vers WOL permet d'ouvrir l'article original.
6. La même source reste disponible dans l'Index personnel et peut être rattachée aux fiches d'idées.

**Lien de paragraphe** : si WOL fournit une ancre officielle `#h=N` sur le paragraphe sélectionné ou dans l'adresse de la page, elle est conservée. Si WOL ne fournit aucune ancre vérifiable, la capture conserve l'URL de l'article plutôt que d'inventer un numéro. Si la sélection couvre plusieurs paragraphes, un lien de paragraphe éventuel renvoie au premier.

## Titres

Le titre est repris de l'article affiché par WOL, puis éventuellement des métadonnées de la page ; on n'utilise plus le numéro `Document WOL · XXXXX` pour les **nouvelles captures effectuées dans une page chargée**.

Pour une ancienne trouvaille affichant encore « Document WOL · ... », ouvrir cette source dans la Visionneuse web, puis cliquer sur **Récupérer le titre de l'article** dans sa carte. En l'absence de titre fiable, le libellé explicite « Article WOL · titre à compléter » est affiché. Les titres personnels déjà saisis ne sont jamais écrasés automatiquement.

## Autres méthodes

- **Palette de commandes** : `WOL : garder la portion sélectionnée dans Bible Lab`. Cette commande peut recevoir un raccourci clavier personnel.
- **Capture express** : « Garder le lien WOL » et « Garder le texte copié » profitent également du titre de l'article quand la Visionneuse web le fournit.
- **Capture manuelle** : coller soi-même un lien et un extrait reste possible.

## Précautions techniques

- Le clic droit utilise l'événement natif Electron `context-menu` du `<webview>` associé à la Visionneuse web d'Obsidian. Cette extension du menu reste **à vérifier dans la version réelle d'Obsidian sous Windows**, dont le traitement des menus peut changer avec les versions.
- À la demande de l'utilisateur, un **court script en lecture seule** est exécuté dans la page WOL déjà ouverte par `webview.executeJavaScript()`. Il lit exclusivement son titre, son URL, la sélection et les éventuels liens de paragraphe à proximité ; il n'altère pas le site.
- Aucun cookie, aucune donnée de session, aucune page complète et aucune information provenant d'un autre domaine ne sont enregistrés.
- La capture est refusée pour une sélection vide, un champ éditable, une page qui n'est pas sur `https://wol.jw.org` ou une iframe non-WOL.
- Le titre et l'extrait sont insérés comme **texte**, sans interpréter de HTML provenant de la page.
- Les notes Obsidian, les pop-ups, le scanner de références et la structure locale des recherches sont inchangés.
- En cas d'incompatibilité du menu natif, la commande clavier et la capture par presse-papiers restent utilisables.

## Contrôle qualité

Tests unitaires pour titres, liens précis, ancres invalides et sécurité d'URL ; tests Playwright pour clic droit simulé dans la Visionneuse web, capture, aperçu de citation, retour au lecteur, cas sans ancre et commande clavier.

**Aucune fusion automatique** avant la vérification manuelle du clic droit dans Obsidian Desktop Windows.
