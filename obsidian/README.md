## Bible Lab 0.9.5 — Références WOL historiques et livres

- **Tours de Garde datées** : reconnaît les citations `w14 15/11 28-29`, avec ou sans `p.`. Distingue le jour, le mois et la pagination ; l’exemple exact renvoie au document officiel `2014847` (Questions des lecteurs, pages 28 à 30).
- **Étude perspicace (`it`)** : distingue les volumes `it-1`/`it-2`, les citations de pages (`it-1 875`) et les articles titrés (`it-2 « Sanctuaire » § 5`). Le moteur valide le volume et le titre ou la plage de pages avant d’ouvrir le document, sinon il conserve la recherche officielle.
- **Toute Écriture (`si`)** : détecte `si p. 337-349`, `si 263-264`, `si étude 10` et `si ét. 10`, et trouve les documents dont la plage de pages englobe celle de la référence.
- **Résolution WOL** : recherche d’abord le document exact en exploitant les métadonnées bibliographiques des résultats `/wol/l/` ; limite les faux positifs et ne confond pas un lien de menu avec un document.
- **Documents vérifiés** : `w14 15/11 p. 28-29` → `2014847`, `it-2 « Sanctuaire »` → `1200003828`, `si p. 337-349` → `1101990137`.
- Tests unitaires et d’interface destinés aux formats de reconnaissance, à la sélection des pages et au chargement des textes.

## Bible Lab 0.9.4 — Lecture biblique sans interruption et résolution WOL

- **Popup Bible** : les versets se lisent d'un seul tenant. Les notes d'étude, notes de traduction, renvois et sources complémentaires sont déplacés vers une colonne latérale, comme dans les lecteurs bibliques. Sur téléphone, le panneau est repliable. Les notes restent disponibles sans interrompre le texte.
- **Bibliographie WOL** : les pages `/wol/l/` peuvent fournir un menu de recherche et pas un article HTML directement exploitable. Le lecteur vérifie la présence d'un réel contenu et suit les documents directs `/wol/d/` plutôt que d'afficher le menu.
- **Corrections vérifiées sur WOL** : `w16 août p. 25-29` → document 2016609, et `w20 juin p. 26` → document 2020441 (article couvrant les pages 24 à 29). Ces correspondances ne sont appliquées qu'aux plages de pages concordantes.
- Le bouton **WOL** de la popup ouvre le document final effectivement résolu, pas seulement la recherche bibliographique initiale.
- Tests Playwright de lecture continue et de résolution des deux articles, sur desktop et mobile.

## Bible Lab 0.9.3 — Reconnaissance biblique avancée

- **Table des 66 livres** : abréviations officielles de la Bible d’étude (https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/livres/), y compris Mat., Jér., 1Co, Php, Ézéch., 2 Tim. et Rév.
- **Listes** : `Mat. 4:2, 3` forme une seule référence qui demande précisément les versets 2 et 3, sans prendre un intervalle implicite.
- **Plages** : `Jér. 3:1-4` demande tous les versets 1, 2, 3 et 4. Les tirets courts et moyens sont pris en charge, les bornes invalides rejetées.
- **Lecteur** : chaque verset reconnu est présenté distinctement, dans l’ordre, avec son numéro. Les sources partielles ne sont jamais inventées.
- **Détection dans Obsidian** : texte brut, lecture, Live Preview et notes ; détection des positions exactes pour protéger la ponctuation et les autres liens existants.
- **Publications anciennes** : `km 05/95` (mai 1995) est reconnu sans page et recherché sous la forme officielle `km 5/95`. On ne fabrique pas de lien vers un article précis sans page ou titre.
- **Sécurité** : maximum de 40 versets par référence, chargement par groupes de quatre, texte des notes non modifié par la reconnaissance automatique.

## Bible Lab 0.9.2 — Résolution des citations documentaires

- **Catalogue officiel** : codes du tableau « Abréviations des titres de publications » de l’Index WOL (https://wol.jw.org/fr/wol/d/r30/lp-f/1200270068) ; les codes courts doivent être accompagnés d'un repère (page, chapitre, leçon ou paragraphe) pour éviter les faux liens.
- **Reconnaissance des sources** en lecture et Live Preview : références de publications avec numéro de page et de paragraphe, `S-38 §1`, `S-38 §20, 25`, `od 8:8`, `th leçon 12`, y compris dans le panneau latéral et les aperçus.
- **Liens officiels vérifiés** : `th leçon 12` → WOL 1102018452 ; `w22 Février p. 13 §15` → WOL 2022281, avec mise en évidence du paragraphe 15 ; `S-38 §1` et `S-38 §20, 25` → liens JW.org finder fournis ; `od 8:8` → chapitre 8 de l’ouvrage *Organisés*, WOL 1102014938 (le lien finder 1102014931 fourni auparavant mène en réalité au chapitre 1).
- **Pas de liens inventés** : quand on connaît le document mais pas la correspondance exacte de paragraphe, Bible Lab ouvre le document ou utilise la recherche bibliographique WOL. Les URL `jw.org/finder` sont strictement validées.
- **Texte nettoyé** : les citations issues de la Bible d'étude décodent les espaces HTML `&nbsp;` et ne montrent plus les identifiants numériques internes des notes.
- **Images de la 0.9.1** : une adresse `/wol/mp/` est un visualiseur HTML, pas une image. Le lecteur utilise maintenant les vraies ressources images issues de `srcset` pour éviter les visuels cassés.
- **Tests** : analyseur unitaire et parcours navigateur ordinateur/mobile couvrant ces cas. À vérifier en natif et selon l'accès réel à WOL/JW.org.

## Bible Lab 0.9.1 — Illustrations des publications comme sur WOL

- **Images officielles** : les articles récupérés sur WOL affichent désormais les illustrations au fil du texte, en gardant leur ordre, leur format original (aucun recadrage 1:1 imposé) et leurs légendes.
- **Zoom** : toucher ou cliquer sur une image ouvre un agrandissement dans Obsidian, refermable avec Échap, le bouton Fermer ou un clic à l’extérieur.
- **Lecteur + aperçu** : la fenêtre flottante et le panneau latéral montrent les mêmes images ; affichage responsive, chargement différé par le navigateur, sans télécharger l’ensemble d’une publication.
- **Confidentialité et sécurité** : seules les URL HTTPS d’hébergeurs officiels connus sont acceptées. Aucun HTML distant, pixel tiers ou image incluse dans les notes ; les images sont chargées uniquement si l'article est ouvert.
- **Limites** : si WOL/JW.org ne livre pas l'image ou refuse la requête depuis Obsidian, le texte et le lien vers la page officielle restent disponibles. Les tests automatisés vérifient des exemples HTML représentatifs, pas toutes les mises en page des publications.

## Bible Lab 0.9.0 — Stabilisation de la saisie et des aperçus

Cette mise à jour consolide le fonctionnement des références cliquables et des fenêtres de lecture introduits par la version 0.8.9.

- **Tests navigateur** : le simulateur Obsidian reproduit maintenant correctement `Plugin.register()` et le cycle de vie des composants. Sans cela, tous les tests Playwright restaient bloqués avant l’ouverture de l’application, alors même que le code du plugin se compilait.
- **Détection** : une seule expression compilée parcourt les références françaises, au lieu de créer et exécuter des dizaines d’expressions régulières à chaque frappe ; références abrégées, noms composés et versets longs préservés.
- **Fenêtre flottante** : les textes déjà chargés sont gardés temporairement en cache et les requêtes simultanées identiques sont regroupées. Les pages vides et erreurs réseau ne sont plus mémorisées. Les demandes abandonnées ne réaffichent pas un article après fermeture.
- **Lecture** : bouton dédié à JW Library pour les passages bibliques, accès WOL toujours présent, possibilité de relancer une récupération échouée, restauration du focus clavier lors d'une fermeture volontaire.
- **Sécurité** : URL WOL conservées, pas de service tiers ni de modification automatique des notes ; aucune page HTML distante injectée dans Obsidian.
- **Validation** : vérification des fonctions de base et de l’intégration CodeMirror par Playwright, en priorité sur ordinateur et smartphone.

La compatibilité réelle avec d’autres extensions qui transforment les mêmes références (notamment traVERture) doit encore être essayée dans un coffre contenant les deux plugins. Cette version ne désactive pas automatiquement les autres extensions.

## Bible Lab 0.8.9 — Références automatiques et aperçu de lecture

La première étape de la refonte inspirée des **aperçus contextuels de WOL**, du **panneau d'étude de JW Library** et des fonctionnalités d'Obsidian **traVERture**.

### Dans tes notes

- **Mode Lecture** : les citations bibliques reconnues (par exemple Jean 7:24 ou Marc 10:14), les références de périodiques (w18 février p. 24-26), les leçons (lmd 11) et les anciens marqueurs !!Jean 7:24!! deviennent des liens consultables directement au clic, sans altérer le Markdown original.
- **Mode édition / Live Preview** : une extension CodeMirror 6 signale les références des lignes visibles et ouvre le même aperçu au clic. L'extension ne réécrit pas la note au fil des frappes et ne contacte pas Internet avant d'ouvrir une référence.
- **Références déjà liées** : un lien Markdown vers un document WOL s'ouvre dans l'aperçu sans remplacer sa destination d'origine par une recherche approximative.
- **Fenêtre flottante** : s'affiche près de la référence, contient l'article ou le verset, des notes et des renvois, un bouton Retour, un bouton Dans le panneau et un bouton vers la source WOL ; se ferme avec Échap ou clic extérieur.
- **Liens permanents facultatifs** : commande Obsidian « Transformer les références de la sélection en liens Markdown ». Elle remplace uniquement une sélection explicitement choisie, et l'opération s'annule via Ctrl+Z. Le traitement ignore les liens déjà présents et le code Markdown.
- **Compatibilité et sûreté** : pas d'iframe, pas de HTML distant injecté dans la note, pas de modification silencieuse des fichiers, pas de transmission des contenus personnels. La récupération des sources reste sujette aux éventuels blocages WOL/JW.org.

### Validation
Tests automatiques de détection, conservation du contenu original, absence de doublons de liens, fenêtre flottante, navigation vers le panneau et test de l'extension d'éditeur. Vérifier aussi les vraies interactions tactiles dans Obsidian Android.

## Bible Lab 0.8.8 — Stabilisation de la lecture et des sources

- **Historique du lecteur** : les articles ouverts manuellement depuis la liste des références entrent désormais dans l'historique. Les ouvertures programmatiques dues au retour, au suivi d’un lien ou à un re-rendu ne créent plus de doublon.
- **Guide de recherche / Index** : identification de la série `rsg` / `dx` dans les métadonnées de publication officielles, sans mélanger le texte du titre de l’article et le nom de la série lorsque le HTML concatène les nœuds sans séparateur.
- **Références bibliographiques** : les recherches par plage de pages n'utilisent plus un simple score de mots-clés risquant de renvoyer un article de la même édition, mais hors plage. Les résultats doivent posséder une plage compatible ou un lien canonique pertinent.
- **Correspondances vérifiées** : possibilités de repli pour `w18 février p. 24-26` (article officiel couvrant les pages 23-27) et `lmd 11` (leçon « Rester simple ») lorsque la recherche bibliographique WOL échoue. Aucune construction arbitraire d'identifiants de documents.
- **Reconnaissance des notes** : prise en charge des références `lmd` dans les références Markdown entre crochets, ainsi que dans les URL bibliographiques historiques.
- **Tests** : adaptation du scénario du texte du jour à son chargement automatique ; test de récupération de `lmd 11` même lorsque les recherches WOL échouent ; validation des chemins article → citation → retour et Guide → document.

Cette version s’appuie sur la 0.8.7. Les requêtes externes restent tributaires des accès autorisés par WOL/JW.org ; il n'existe pas d'API officielle documentée que Bible Lab pourrait utiliser pour garantir tous les textes. Le programme évite toute injection de HTML distant, ne transmet pas les notes privées et conserve l'ouverture dans le navigateur officiel.

## Bible Lab 0.8.7 — Chargement automatique et récupérations WOL

- **Accueil** : le texte du jour et le programme de réunion sont chargés automatiquement au premier affichage du panneau, sans cliquer sur Actualiser. À chaque retour sur l'accueil, une vérification discrète intervient lorsque les données sont devenues anciennes. Actualiser reste disponible en forçage manuel.
- **Données à jour, réseau limité** : au maximum une tentative par minute en cas d'erreur, ou une actualisation après vingt minutes pour les données chargées ; une nouvelle journée autorise aussitôt une nouvelle tentative.
- **Références bibliques** : identifiants WOL du type `v21004006` ou `v21-4-6`, extraction limitée au verset demandé, sans afficher par erreur les versets voisins. En cas d'indisponibilité du fragment JSON JW.org, deux éditions officielles du chapitre WOL sont essayées.
- **Publications** : résolution bibliographique sensible aux plages de pages. La référence `w18 février p. 24-26` peut trouver l'article `w18 février p. 23-27` qui contient les pages citées. Les résultats portant des dates ou des plages contradictoires ne sont pas présentés comme des correspondances vérifiées.
- **Sortie de secours** : le lien officiel WOL reste accessible lorsque la source refuse les requêtes automatisées ou ne fournit pas le fragment exact. Le lecteur ne fabrique aucun texte biblique.
- **Tests** : parcours E2E pour l'ouverture automatique, retour à l'accueil sans nouveau chargement, verset isolé par ID complet ou dans un paragraphe multi-versets, et publication comprenant une plage de pages intérieure.

Limites : WOL/JW.org peuvent bloquer ou modifier leurs pages ; les tests d'extraction sont effectués sur des documents HTML représentatifs et ne garantissent pas la disponibilité réseau en toute situation. Les notes Obsidian ne sont pas envoyées aux sites.

## Bible Lab 0.8.6 — Index & Guide de recherche

La recherche documentaire peut désormais être lancée dans trois modes clairement identifiés : publications, Index et Guide de recherche.

- **Index des publications** : les mots-clés et références bibliques sont recherchés sur WOL avec le filtre officiel `fc[]=dx`. Seules les entrées identifiées comme provenant de l’Index sont affichées dans cette vue.
- **Guide de recherche** : même catégorie officielle WOL, mais filtrage des notices visibles qui portent une identification de publication Guide (`rsg`, `rsg19` ou source explicite). Les résultats non attribuables avec certitude ne sont pas étiquetés Guide.
- **Depuis la lecture** : une référence biblique ou une publication ouverte propose « Chercher dans l’Index » et « Consulter le Guide » pour prolonger l’étude. Le parcours conserve la référence comme requête.
- **Consultation** : ouvrir une rubrique du résultat dans le lecteur latéral, puis ses liens WOL ou versets, avec retour en arrière à la recherche et insertion d’une source dans sa note.
- **Sources officielles** : lien direct vers les instructions de l’Index sur WOL et la bibliothèque des index sur jw.org ; la recherche n'utilise aucune API privée et ne transmet aucun texte issu des notes locales.
- **Résilience** : avertissement si les résultats sont absents, non attribuables, ou bloqués par un refus de requêtes automatisées. Le lecteur laisse toujours une sortie vers la recherche WOL officielle.
- **Tests** : vérification des URL officielles et scénarios de navigation Index → article, Guide → article, résultat non attribué, et prolongement depuis un verset.

Limites : seules les premières pages de résultats WOL sont analysées, et les pages peuvent nécessiter JavaScript ou refuser la consultation automatisée. L'accès à l'intégralité de l'Index et du Guide demeure assuré par WOL et JW Library ; cette version ne télécharge ni ne met en cache toute leur bibliothèque.

## Bible Lab 0.8.5 — Parcours d’étude et UX repensés

Cette version introduit la première refonte structurelle du panneau, avec une priorité : **chercher → lire → exploiter une référence dans sa note sans se perdre dans l'interface**.

- **Navigation** : trois parcours principaux (« Étudier », « Chercher », « Lire ») ; Atlas, Sources et Studio restent présents mais visuellement secondaires, sans perte de fonctions.
- **Accueil utile** : champ de recherche, dernière lecture, références de la note active, et accès direct au texte du jour et à la réunion. On évite l'accueil « vitrine » composé de gros raccourcis.
- **Recherche intelligente** : saisir « Jean 7:24 » ou une URL WOL ouvre directement le lecteur ; un sujet comme « compassion » lance la recherche documentaire WOL. Le champ conserve la requête même après consultation d'une référence.
- **Résultats** : cartes éditoriales condensées, action principale « Lire ici », accès à la source officielle et message clair si la recherche automatisée est indisponible.
- **Moins de bruit** : les filtres, diagnostics réseau, imports locaux et options secondaires sont repliables, plutôt que tous visibles en permanence.
- **Lecture contextualisée** : une seule source mise en évidence, historique précédent/suivant, références de la note active repliées pendant la lecture.
- **Passage à l'action** : « Insérer dans ma note » sur la source consultée, avec protection de l'éditeur Markdown contre les insertions dans un mauvais fichier.
- **Lisibilité** : hiérarchie typographique, espacement, navigation clavier et styles adaptatifs aux largeurs étroites.
- **Non-régression** : nouveaux scénarios Playwright pour l'accueil, la recherche, les sources, le retour à la recherche et les références de notes.

Les limites d'accès automatique à WOL et JW.org demeurent : l'interface doit les signaler et laisser l'accès direct à ces sites. Aucune nouvelle collecte ni transmission des notes personnelles du coffre.

## Bible Lab 0.8.4 — Réparation des sources officielles

Cette version corrige la récupération du texte du jour et du programme de réunion depuis les structures réelles de WOL et améliore les parcours de lecture des liens officiels.

- **Texte du jour** : reconnaissance précise de la date et récupération du texte à partir des paragraphes qui suivent le titre, y compris lorsqu’ils sont imbriqués dans des blocs HTML.
- **Programme de réunion** : analyse des dates compactes (« 2-8 novembre »), transversales (« 26 octobre – 1er novembre ») et du suffixe « 1er ». La page `/dt/` de WOL contient aussi les sujets de la réunion de la semaine : le plugin tente désormais d’en extraire les deux contenus en une seule lecture.
- **Seconde source** : si la partie réunion n’est pas lisible dans WOL, le lecteur peut rechercher la bonne semaine dans le cahier JW.org et accéder au document hebdomadaire.
- **Recherche WOL** : un lien WOL d’article collé directement ou un verset comme « Jean 7:24 » ouvre maintenant le lecteur plutôt que d’envoyer ces données dans une recherche par mots-clés.
- **Diagnostic explicite** : bouton « Tester les sources » dans l’onglet WOL affichant l’état HTTP réel du texte du jour, d’un article WOL et du cahier JW.org, sans inventer de résultats ni contourner une restriction de site.
- **Dégradation honnête** : si les pages ne sont pas lisibles, un avertissement apparaît et le bouton vers le site officiel reste disponible. Une source refusant la récupération automatisée ne peut pas être rendue miraculeusement accessible.
- **Tests** : exemples basés sur les titres réellement affichés par les pages officielles, notamment les semaines qui chevauchent deux mois, tests réseau simulés et parcours directs.

## Bible Lab 0.8.3 — lecture documentaire interactive

Version de test centrée sur la consultation des publications et références WOL/JW.org dans le panneau latéral.

- Les références bibliques citées dans les paragraphes des articles deviennent des liens cliquables. Les références reconnues s'ouvrent dans le lecteur intégré, en conservant l'historique de navigation.
- Les liens de documents WOL présents dans le corps des paragraphes sont accessibles directement au toucher ou au clic. Les liens externes et les URL non autorisées ne sont pas insérés dans le lecteur.
- Les notes et renvois de la Bible d'étude qui contiennent des références bibliques peuvent également s'ouvrir sans quitter Obsidian.
- Les articles comportant plusieurs sections proposent un sommaire interne avec navigation jusqu'aux titres, y compris au-delà de la portion initialement affichée.
- Le lecteur d'article propose A− / A+ pour ajuster la taille du texte ; le réglage reste actif dans le panneau pendant la session.
- Le bouton de l'accueil a été renommé « Reprendre la lecture » afin d'éviter les collisions d'intitulés avec l'onglet « Références », observées dans les tests navigateur de la version 0.8.2.
- Le contenu distant reste rendu en texte et en boutons natifs, jamais en HTML injecté. Aucune donnée personnelle de JW Library ou des notes du coffre n'est transmise à WOL.
- Des tests unitaires et navigateur couvrent les liens bibliques, les liens de publication, les changements d'article et le retour, le sommaire et les contrôles typographiques.

Cette version dépend des améliorations précédentes (v0.8.0–0.8.2). Les travaux de synchronisation JW Library, d'index documentaire complet et d'enrichissement des illustrations n'en font pas partie.

## Bible Lab 0.8.2 — Fiabilisation du lecteur et de la recherche

Cette livraison corrige les défauts visibles du panneau latéral et rationalise la navigation.

- **Entités HTML** : prise en charge des espaces littéraux `&nbsp;`, des variantes `&nbsp:`, `&#160;`, `&#x202f;`, et des encodages successifs comme `&amp;nbsp;`, dans les versets, les titres d’articles, les références, les recherches et les aperçus.
- **Texte biblique fidèle** : n’utilise plus un extrait générique du chapitre comme s’il correspondait au verset demandé. Lorsqu’un verset n’est pas isolable, le lecteur le signale et propose d’ouvrir la source.
- **Articles** : suppression DOM des numéros de paragraphes avant extraction du texte, numéros affichés séparément et limite de lecture longue annoncée explicitement.
- **Navigation** : historique de 40 références, boutons précédent/suivant, ouverture d’un document lié en lecture principale et tentative de restauration du défilement.
- **Notes Obsidian** : l’action d’insertion n’écrit plus dans le premier éditeur Markdown trouvé : elle demande la note active ou un éditeur explicitement associé à la dernière note connue.
- **Accueil** : la lecture et la recherche sont prioritaires ; les outils d’enquête restent disponibles dans Studio.
- **Programme hebdomadaire** : consultation distincte du Cahier Vie et ministère sur JW.org, plutôt que d’essayer de le récupérer sur la page du texte du jour ; la source est vérifiée avant d’afficher le programme.
- **Performance** : cache de lecture limité à 48 références. Le chargement des documents reste à la demande.
- **Tests** : régressions sur les espaces, le texte des versets, les articles HTML doublement encodés, la navigation, la sécurité d'insertion et le programme de réunion.

**Limites** : l’extraction dépend de la structure de WOL/JW.org et certaines pages peuvent rester illisibles. Les URL de JW Library restent des liens sans synchronisation directe des notes. L’export de sauvegarde JW Library reste expérimental. Vérifier sur un coffre Obsidian de test avant usage courant.

## Bible Lab 0.8.1 — lecteur de références

Cette version améliore la lecture **dans le panneau latéral** sans ajouter d’outils d’enquête.

- Nettoyage des versets : espaces insécables, espaces étroites, caractères invisibles, entités HTML d’espacement et appels de note/superscripts non destinés au texte courant.
- Les versets, notes de traduction, commentaires d’étude et renvois bibliques disposent de sections distinctes, avec leurs libellés réellement utiles ; les simples lettres et numéros d’appel ne sont pas répétés.
- Lecture d’articles WOL : paragraphes, sous-titres et questions reconnaissables, suppression du bruit d’interface « Ta réponse », numéros de paragraphes affichés séparément quand disponibles, révélation progressive des articles longs.
- Extraction de secours WOL : vise le verset demandé pour éviter de lire les autres versets d’un chapitre ; les renvois liés sont accessibles en panneaux repliables.
- Affichage exclusivement en texte : aucun HTML distant injecté dans les notes ou le volet Obsidian.
- Tests de régression Playwright avec des fragments officiels simulés pour les caractères spéciaux, notes, textes bibliques et articles longs.

Les sites officiels peuvent changer de structure ; la page WOL reste accessible depuis le lecteur. Pas de synchronisation directe JW Library.

## Bible Lab 0.8.0 — recherche documentaire WOL, JW.org et notes JW Library

Le nouvel onglet WOL favorise la recherche et la consultation plutôt que l’organisation d’enquêtes.

- Résultats WOL intégrés : recherche par phrase ou paragraphe, corpus complet ou Index des publications ; aperçu limité à 25 liens de la première page. Un résultat s’ouvre dans le lecteur de références existant et conserve son lien officiel WOL.
- JW.org : recherche par mots et expressions à partir du site officiel, sans API privée ni intermédiaire.
- JW Library : les liens Finder pour versets reconnus sont conservés. Ils ouvrent l’application uniquement si l’appareil les gère ; aucune synchronisation temps réel n’est promise.
- Mes notes JW Library importées : recherche locale, sur demande, parmi les fichiers Markdown produits par l’import de sauvegarde ; plafonds de 3 000 fichiers et 30 résultats. Aucune donnée personnelle envoyée à WOL ni à JW.org.
- En cas de protection anti-robots ou de changement du HTML WOL, le plugin donne un message explicite et permet de poursuivre sur le site.
- L’export .jwlibrary reste expérimental, à valider sur un profil de test vierge. La mise à jour conserve l’identifiant atlas-biblique et les notes existantes.

## Bible Lab 0.7.2 — export plus sûr et moins gourmand

L’import, l’édition des notes en Markdown et la génération de sauvegardes `.jwlibrary` s’effectuent directement depuis **Bible Lab → Studio → Bibliothèque personnelle**. Une comparaison est présentée avant de créer un nouveau fichier de sauvegarde dans `Imports/../` et `Exports/` du coffre.

L’export de cette version ne décompresse et ne recompresse **plus les médias inchangés**. Les enregistrements ZIP (illustrations, médias, etc.) sont conservés directement sous forme compressée, à l’octet près ; seuls `userData.db` et `manifest.json` sont remplacés, après contrôle SHA-256, intégrité SQLite et vérification des GUID et relations. L’archive originale n’est jamais écrasée.

**Prudence** : la restauration des sauvegardes générées dans l’application JW Library sur un profil vierge reste une vérification indispensable avant toute utilisation sur son appareil principal. La taille d’une sauvegarde peut demander beaucoup de mémoire, en particulier sur Android.

# Bible Lab — Study Studio (0.7.1)

**Bible Lab Study Studio 0.4** conserve le plugin Atlas biblique existant et y ajoute un panneau d'étude WOL/JW Library, un index des cartes bibliques et la bibliothèque des appendices. L'identifiant technique `atlas-biblique` ne change pas : la version 0.3 remplace la version 0.2 dans le même dossier, sans créer un second plugin ni réécrire les notes du coffre.

### Correctif du lecteur WOL — 0.7.1

- Les références bibliographiques telles que `w24 Novembre p. 14-19` ouvrent `/wol/l/` (espaces encodés en `+`), y compris lorsqu'une ancienne note possède un hyperlien `/wol/s/`.
- Le panneau ne confond plus la page de résolution bibliographique avec l'article : il sélectionne l'URL officielle `/wol/d/` correspondante, télécharge le document puis affiche les paragraphes de l'article. Si WOL ne permet pas la résolution, un lien explicite est proposé plutôt que de présenter une page de recherche comme un article.
- Pour les versets, Bible Lab demande en priorité les données JSON de la Bible d’étude sur `jw.org` (texte, notes, renvois et commentaires), selon la technique de traVERture ; WOL reste la solution de repli.
- Aucun contenu personnel n'est envoyé à un service tiers. Les anciennes URL des notes ne sont réparées que lors du rendu : aucun fichier Markdown existant n'est modifié.
- Le contenu des articles est récupéré sur demande et n'est conservé que temporairement en mémoire ; la structure du site officiel peut évoluer.

### Nouveau lecteur de références — 0.7

L'onglet **Références** remplace **Versets**. Le plugin détecte dans la note active :

- les références bibliques classiques (`Matthieu 10:29`, `2 Co 4:16`...) ;
- les marqueurs `!!référence!!` (plusieurs références séparées par `;`) ;
- les mentions de publication entre crochets, par exemple `[w24 Novembre p. 14-19]` ;
- les liens Markdown WOL `[Titre de l'article](https://wol.jw.org/fr/wol/d/...)`, y compris les URLs directes entre `[crochets]`.

Chaque référence est un **panneau dépliable**, chargé seulement sur demande, avec le texte de la source WOL, les notes disponibles, les renvois et les documents cités. Les liens vers les documents repérés permettent d'ouvrir un deuxième niveau de lecture **dans le même panneau**, sans remplacer le texte consulté. Les liens WOL officiels restent disponibles si l'extraction ne fonctionne pas.

Les versets ouvrent leur **chapitre de la Bible d'étude**, avec tentative d'isoler le verset exact, ses notes et renvois à partir du HTML officiel. La structure de WOL peut changer : un message le signale et le lien officiel permet de poursuivre. Les articles ne sont **pas** recopiés dans le coffre ; le panneau garde un cache temporaire en mémoire.

**Correction importante :** les références de publication utilisent `https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19` et non la route de recherche `/wol/s/`.

Confidentialité : récupération à la demande depuis `wol.jw.org` uniquement, jamais via l'ancien service tiers d'aperçu. Le contenu externe est affiché en texte simple, sans exécuter de HTML provenant du site.

### Nouvelle passerelle JW intégrée — 0.6.0

**Plus besoin du script Python pour importer :** dans **Bible Lab → Studio → Ouvrir la passerelle**, les opérations s'exécutent dans Obsidian avec un moteur SQLite WebAssembly embarqué.

- **Importer une publication JWPUB :** sélectionner le fichier `.jwpub`, consulter la liste des articles, puis importer les documents en Markdown. WebCrypto assure le déchiffrement, les fichiers images inclus dans la publication sont conservés dans `assets`.
- **Importer une sauvegarde JW Library :** sélectionner le fichier `.jwlibrary`, vérifier l'empreinte SHA-256, le schéma SQLite (14, 15, 16) et le nombre de notes, puis créer dans un dossier neuf les notes éditables, l'index thématique et le manifeste de provenance. Les GUID et les étiquettes sont conservés.
- **Créer une nouvelle sauvegarde :** sélectionner le fichier d'origine, choisir l'import correspondant, comparer la liste des titres et contenus modifiés, puis créer une **nouvelle copie** dans `Atlas biblique/Exports` après validation du hachage, du nombre de notes, de l'intégrité SQL et des relations SQLite. Le fichier source n'est jamais écrasé.

Les modifications réexportées portent sur les **titres et contenus des notes existantes uniquement**. Les changements d'étiquettes, surlignages, annotations de publications et signets ne sont pas écrits dans la sauvegarde. Conserver le marqueur technique en bas du frontmatter des notes importées et modifier les titres via la propriété `title` du frontmatter, pas seulement via le nom du fichier.

**Sécurité :** toutes les opérations sont effectuées sur l'appareil, sans connexion à Google Drive, WOL ou un serveur tiers. Une sauvegarde restaurée dans JW Library remplace les données locales. **Ne restaure pas un export sur ton appareil principal avant d'avoir vérifié son ouverture sur un profil de test vierge.** Les sauvegardes volumineuses peuvent saturer la mémoire sur certains téléphones ; l'export est expérimental sur Android jusqu'à vérification sur appareil réel.

Le script `tools/bible_lab_bridge.py` reste une solution de secours/diagnostic facultative.

### Passerelle JW — 0.5

Le panneau **Studio → Importer des notes** accepte les archives ZIP contenant les notes Markdown produites par **Bible Lab Bridge**. Tous les fichiers sont placés dans un nouveau dossier, sans écraser de note existante ; les illustrations et les métadonnées JSON accompagnent l’import. La commande « Importer une archive ZIP Markdown » est également disponible dans la palette de commandes.

L’inspection des archives JWPUB / JW Library vérifie désormais le hachage SHA-256 du fichier SQLite et ne décompresse pas les médias annexes. Elle prend en charge les sauvegardes volumineuses (jusqu’à 140 Mo de ZIP), comme la sauvegarde du 27 octobre 2026 testée hors dépôt.

Pour le **véritable déchiffrement JWPUB → Markdown** et l’édition/réexport d’une sauvegarde JW Library sur des copies locales, utiliser le programme Python `tools/bible_lab_bridge.py`. Instructions et limites dans [JW_BRIDGE.md](../docs/JW_BRIDGE.md). Ce moteur n’est pas encore embarqué dans le plugin Android ; ne pas confondre les fonctions du script et celles de l'interface Obsidian.

### Nouvelle interface Study Studio 0.4

L'accueil se concentre sur la recherche et la lecture : navigation à six pictogrammes, cartes compactes, repères de sources, affichage adaptatif aux thèmes clair/sombre et animations désactivées si le système demande une réduction du mouvement.

- **Accueil** : texte du jour et sommaire de la réunion de semaine (le bouton **Actualiser** charge la page officielle WOL ; aucune note du coffre n'est envoyée).
- **Studio** : plans de discours enregistrés sous `Atlas biblique/Discours`, avec introduction, développement, conclusion, minutage indicatif, sources et liste de préparation.
- **Archives JW** : sélection locale d'un fichier `.jwpub` ou `.jwlibrary`, contrôle de taille de l'archive, lecture des métadonnées et création d'un inventaire Markdown sous `Atlas biblique/Imports`. L'archive d'origine n'est jamais modifiée.

**Important** : le décodage intégral d'un JWPUB et l'édition suivie d'une réexportation compatible d'une sauvegarde JW Library ne sont **pas encore implémentés** dans le plugin. Le travail préparatoire d'inspection ne doit pas être confondu avec ces fonctions. Une restauration d'une sauvegarde JW Library peut remplacer toutes les données de l'appareil ; toujours créer et conserver une sauvegarde récente avant toute expérimentation.

Le texte du jour est limité à un aperçu ; le programme de réunion montre ses titres et rubriques, sans archiver une publication entière. Les liens WOL officiels restent disponibles si le chargement ou la structure de la page change.

### Découvrir le laboratoire

1. Ouvrez la commande **Ouvrir le laboratoire biblique** ou l'icône **livre** dans la barre d'Obsidian.
2. **WOL** : tapez `Matthieu 10:29` ou un sujet, ouvrez la recherche ou le passage officiel, copiez le lien ou insérez-le dans votre note active. Le bouton JW Library utilise le lien `jw.org/finder` lorsqu'une référence biblique complète est reconnue.
3. **Versets** : les références du document actif apparaissent automatiquement. Écrivez `!!Jean 3:16!!` pour marquer une référence WOL ; les versets rédigés explicitement en français sont également détectés. En mode lecture, le marqueur devient un lien ouvrant le panneau.
4. **Cartes** : recherchez un lieu dans l'index de *Voyez le bon pays* ; chaque résultat indique les pages et repères alphanumériques, puis ouvre directement la carte correspondante. **Charger l'index complet** tente de récupérer les noms et repères de l'index officiel ; la petite liste de secours reste disponible si l'accès réseau est bloqué.
5. **Outils** : retrouvez les appendices A, B et C, les cartes B2, B3, B4, B6, B7, B10 et B13, des schémas, le calendrier hébreu et *Étude perspicace*. Copiez les liens ou insérez-les dans une note.
6. **Atlas** : la commande et le bouton de navigation de l'ancien Atlas restent disponibles : carte, frise, personnages, âges, routes, notes modifiables et enquêtes Canvas.

### Respect des données et de WOL

- Les notes et Canvas sont des fichiers locaux Markdown/JSON du coffre. Une mise à jour du plugin ne les remplace pas.
- Les recherches WOL et JW Library ouvrent les sites officiels avec le terme demandé ; aucune note complète n'est envoyée automatiquement.
- **Aperçu WOL** : contrairement aux liens directs, cette option manuelle utilise `https://wol-worker.iaremark.us`, service tiers employé par WOL Reference Tools. Le plugin n'y envoie que le terme de la recherche au moment du clic, et n'affiche que le texte nettoyé du HTML renvoyé. Un cache en mémoire de 30 minutes réduit les requêtes. Ne l'utilisez pas pour des informations confidentielles. Le service est facultatif et peut devenir indisponible.
- **Index des cartes** : l'actualisation télécharge la page publique de l'index officiel ; elle peut échouer à cause de protections réseau. Dans ce cas, les liens officiels restent proposés.
- Aucun texte complet de publication ni fichier JW Library n'est fourni ou modifié par ce plugin. Il s'agit d'une passerelle vers les outils officiels, pas d'une synchronisation avec JW Library.

### Installation et mises à jour

Le paquet compilé ZIP est publié parmi les **artifacts** des tests GitHub Actions lorsque la vérification réussit. Son dossier porte encore le nom `atlas-biblique`. Fermez Obsidian avant de remplacer `main.js`, `styles.css` et `manifest.json` dans ce même dossier, puis relancez-le et activez le plugin.

Sur Android, un gestionnaire de fichiers donnant accès au dossier caché `.obsidian/plugins/` peut être nécessaire. Testez d'abord sur une copie du coffre ; les tests d'interface automatisés ne remplacent pas un essai dans l'application native.

### Limites connues

- Une recherche par sujet utilise la recherche officielle WOL et non une API de résultats intégrée ; l'aperçu facultatif repose sur un service indépendant qui peut être inaccessible.
- La recherche de lieux depuis l'index ouvre la carte officielle, mais ne calcule pas encore automatiquement une coordonnée géographique à partir des repères imprimés.
- Les liens JW Finder suivent le comportement de l'appareil et ne garantissent pas que l'application JW Library soit installée ou intercepte le lien.
- Le panneau est conçu pour Obsidian ordinateur et mobile ; sa validation native reste à faire.

## Installer sur Windows ou Android

1. Décompressez `atlas-biblique-0.2.0.zip`.
2. Copiez le dossier `atlas-biblique` dans le dossier `.obsidian/plugins/` de votre coffre. Les fichiers doivent se trouver directement dans `.obsidian/plugins/atlas-biblique/main.js`, `manifest.json` et `styles.css`.
3. Dans Obsidian, ouvrez **Paramètres → Modules complémentaires**, autorisez les modules complémentaires si nécessaire, puis rechargez Obsidian.
4. Activez **Atlas biblique interactif**.
5. Touchez l’icône de carte ou lancez la commande **Atlas biblique interactif : Ouvrir l’Atlas**.

Sur Android, un gestionnaire de fichiers capable d’afficher les dossiers cachés peut être nécessaire pour accéder à `.obsidian`. Le coffre doit être accessible dans les fichiers de l’appareil. Il n’est pas nécessaire de compiler le plugin sur le téléphone.

Cette version s’installe manuellement ; elle n’est pas publiée dans le catalogue communautaire. Obsidian 1.6.0 ou ultérieur est requis. Pour un premier essai, utilisez un coffre de test, puis copiez les fichiers du plugin dans votre coffre habituel.

## Un premier parcours

1. Cherchez un personnage ou un lieu avec **Recherche**.
2. Ouvrez sa fiche, puis **Note d’étude** pour créer ou ouvrir une note liée.
3. Dans **Mon carnet**, choisissez **Nouvelle recherche** pour noter une question.
4. Pour associer une note déjà écrite, utilisez **Relier** et sélectionnez-la. Le plugin ajoute uniquement ses propriétés `atlas_entities` et, si elle est absente, `atlas_schema` ; il conserve le texte et les autres propriétés.
5. Utilisez **Retenir** sur plusieurs fiches, puis **Enquête**. Un tableau Canvas et une note de recherche sont créés. Vous pouvez déplacer les cartes, ajouter des images et légender les fils dans Canvas.

Les fiches proposées autour d’une enquête sont uniquement les associations déjà présentes dans le corpus. Les fils du tableau portent le libellé « À explorer » : ils ne créent pas de nouvelles affirmations historiques.

## Modifier toutes les fiches et les tracés

Ouvrez une fiche puis **Modifier**. L’éditeur propose quatre sections :

- **Texte et dates** : titre, description Markdown, notes, certitude et années.
- **Carte et étapes** : coordonnées, symbole et couleur d’un lieu ; couleur, noms, ordre et positions des étapes d’un itinéraire. Une étape peut suivre un lieu existant ou garder une position indépendante.
- **Liens et sources** : versets, sources et associations entre fiches.
- **Données complètes** : toutes les propriétés de la fiche, dont les activités, les bornes incertaines, les mois/jours, les illustrations et les références détaillées. Le format est JSON ; les données sont validées avant enregistrement.

Le bouton **Gérer toutes les fiches** (réglages dans la barre de l’Atlas) permet de rechercher chaque personnage, événement, lieu et itinéraire, d’en créer, de masquer/réafficher une fiche ou de restaurer l’original. Les corridors du réseau routier historique sont également des itinéraires éditables.

Sur la carte, sélectionnez **Modifier la carte** pour déplacer les repères. Avec une route sélectionnée, déplacez les étapes numérotées, cliquez sur un endroit vide pour en ajouter, ou utilisez un clic droit/appui long sur une étape pour la retirer. Une route doit garder au moins deux étapes. L’éditeur permet aussi ces opérations sans geste sur la carte.

Une première modification crée une note sous `Atlas biblique/Entités` (ou votre dossier configuré). Son corps est la description de la fiche : modifiez-le librement dans Obsidian, avec Markdown et liens internes. Les propriétés `atlas_entity` et `atlas_data` conservent l’identifiant et les autres données. Les changements actualisent la carte, la frise et les calculs. Les textes issus des fiches personnalisées portent cette provenance ; les anciennes déductions du corpus ne servent pas de preuve aux nouvelles dates.

**Note d’étude** ouvre cette note personnalisée lorsqu’elle existe. Les notes d’étude ou recherches créées auparavant restent éditables et sont conservées séparément ; leur texte n’est pas remplacé lors de la création d’une personnalisation. Si une note change pendant que l’éditeur est ouvert, l’enregistrement est refusé pour préserver le texte le plus récent : rouvrez l’éditeur.

**Restaurer l’original** envoie uniquement la note de personnalisation à la corbeille Obsidian. **Retirer la fiche** fait de même pour une fiche créée personnellement. Les autres notes liées sont conservées. Si la même personnalisation est dupliquée, le carnet indique le conflit et l’original reste affiché jusqu’à sa résolution.

## Âge des personnages au repère

La barre **Âges au…** accompagne la frise. Le trait vertical muni d’une poignée ↔ se déplace à la souris ou au doigt ; au clavier, les flèches déplacent le repère d’environ un mois, Maj+flèche de dix ans. Les rubans des personnages traversés par le trait affichent leur âge calculable. La fiche sélectionnée conserve également son âge dans la barre.

**Date précise** permet de saisir une année, puis éventuellement un mois et un jour civils. **Tous les personnages** ouvre la liste des âges, avec recherche et option d’affichage avant/après leur vie. **Suivre la frise** reprend le centre de la période visible ou le début de l’événement sélectionné.

Le calcul utilise les données actuelles de vos fiches et saute l’année zéro. Une date de naissance complète permet un âge révolu ; des années seules donnent une estimation, et des bornes variables une fourchette. Une naissance inconnue reste « Âge inconnu ». Avant la naissance connue, la fiche indique « Pas encore né » ; après le décès, elle affiche l’âge au décès. Les mois hébraïques ne sont pas convertis arbitrairement en anniversaires civils. Ces calculs ne constituent pas de nouvelles attestations historiques.

## Ajouter ses propres événements et lieux

Dans **Mon carnet → Nouvelle recherche**, choisissez **Événement sur la frise** ou **Lieu sur la carte**.

- Un événement attend une année de début ; l’année de fin est facultative. Saisissez `-607` pour une année avant notre ère. L’année zéro est refusée.
- Un lieu attend une latitude et une longitude numériques. Ses coordonnées sont personnelles et leur précision n’est pas validée par le corpus.
- Les événements personnels sont regroupés dans **Mes recherches**, et leurs dates sont affichées comme approximatives. Les fiches indiquent leur provenance personnelle.
- Modifier ces propriétés dans la note actualise les vues. Supprimer la note retire sa projection personnelle ; le corpus inclus reste intact.

Les notes invalides restent dans le carnet avec une explication. Elles ne sont pas projetées sur la carte ou la frise.

Exemple d’événement personnel (l’année ci-dessous est un exemple de saisie, pas une nouvelle donnée du corpus) :

```yaml
---
atlas_schema: 1
atlas_kind: event
atlas_uid: ma-piste-stable-001
atlas_title: Ma recherche sur cette période
atlas_start_year: -607
atlas_entities:
  - place:jerusalem
atlas_references:
  - Jérémie 25:11
---
```

Les identifiants du corpus sont conservés dans `atlas_entities`, sous la forme `person:identifiant`, `place:identifiant`, `event:identifiant` ou `route:identifiant`. Les notes créées par le plugin les remplissent automatiquement. Conservez `atlas_uid` lors d’un déplacement ou renommage d’une fiche personnelle ; attribuez un nouvel identifiant si vous dupliquez la fiche pour créer un autre sujet.

## Liens depuis les notes

Les notes documentaires créées par le plugin contiennent un lien « Explorer dans l’Atlas ». La commande **Explorer les fiches de la note active** ouvre la première fiche liée disponible.

Vous pouvez aussi insérer un bloc :

````markdown
```atlas
place:jerusalem
```
````

## Hors connexion et confidentialité

La frise, le corpus, les repères géographiques, les notes et Canvas fonctionnent sans compte distant ni service d’IA.

Un fond Natural Earth simplifié est inclus dans le plugin et fonctionne immédiatement sans téléchargement. Les tuiles détaillées utilisent désormais **OpenFreeMap**, sans clé d’API, via l’API réseau publique d’Obsidian. Le chargement en ligne reste désactivé par défaut ; activez-le dans les réglages pour charger et conserver les tuiles consultées.

Pour préparer une étude sans réseau :

1. Ouvrez **Cartes hors connexion** (icône de téléchargement dans l’Atlas ou commande du même nom).
2. Choisissez **Terre promise**, **Égypte et Sinaï**, **Méditerranée et Proche-Orient**, la zone actuellement visible ou des coordonnées personnalisées.
3. Choisissez le niveau de détail puis **Télécharger cette zone**. La fenêtre indique le nombre de tuiles, la progression et la taille reçue.
4. Attendez **Disponible hors connexion**. Le téléchargement utilise au plus quatre requêtes simultanées, 3 000 tuiles et 50 Mo par préparation ; les zones trop grandes sont refusées et le téléchargement s’arrête avec une marge avant la limite de taille. Une interruption garde les tuiles déjà reçues et signale un résultat partiel.
5. Désactivez le chargement en ligne ou coupez le réseau. Les tuiles enregistrées sont relues du coffre, même après redémarrage. Au-delà du détail téléchargé, une tuile parente est agrandie ; hors zone, le fond inclus reste disponible.

Le relief Natural Earth est limité à son détail natif (zoom 6). Les données vectorielles apportent des contours d’eau, occupation des sols et bâtiments jusqu’au zoom 12 ; elles ne représentent pas des frontières ou reliefs historiques. Les routes et repères bibliques restent les éléments interactifs de l’Atlas. Ces fonds ne comprennent pas de photographie satellite.

Les fichiers sont sous `Atlas biblique/Cartes` (ou le dossier configuré au démarrage du plugin). Ne modifiez pas les tuiles binaires. **Retirer les cartes téléchargées** libère ce cache sans toucher aux notes. Pour une synchronisation entre appareils, le service de synchronisation doit aussi transporter les fichiers `.pbf`, `.png` et `.json` du coffre. Les liens JW/WOL nécessitent leurs applications ou une connexion pour ouvrir leur contenu.

Attribution : [OpenFreeMap](https://openfreemap.org/), [OpenMapTiles](https://openmaptiles.org/), [OpenStreetMap](https://www.openstreetmap.org/copyright) et [Natural Earth](https://www.naturalearthdata.com/).

La synchronisation entre appareils dépend de la synchronisation de votre coffre Obsidian ; le plugin ne fournit pas son propre service de synchronisation.

## Données et mises à jour

- Les mises à jour du corpus passent par les versions du plugin. Les notes de personnalisation priment sur le corpus fourni et sont conservées lors des mises à jour ; restaurez l’original pour reprendre la fiche de la version installée.
- Une fiche créée depuis le corpus est un instantané, avec `atlas_corpus_version`. Ses références restent consultables dans le plugin ; elle n’est pas réécrite lors d’une mise à jour.
- Les notes peuvent être déplacées ou renommées dans Obsidian : leurs propriétés assurent le lien avec l’Atlas.
- Remplacez `main.js`, `manifest.json` et `styles.css` pour mettre le plugin à jour, puis désactivez/réactivez-le. Conservez `data.json` si vous souhaitez conserver les réglages.
- Désactiver ou désinstaller le plugin laisse les notes et fichiers `.canvas` exploitables dans Obsidian. Les blocs `atlas` et liens d’ouverture nécessitent le plugin actif.

## Développement et vérification

Depuis la racine du dépôt :

```bash
pnpm install --frozen-lockfile
pnpm obsidian:typecheck
pnpm obsidian:test
pnpm obsidian:package
pnpm exec playwright test --config obsidian/playwright.config.ts
```

La sortie compilée est dans `obsidian/dist/atlas-biblique`. Le ZIP est créé dans `obsidian/artifacts`. Le paquet comprend les dépendances et les polices ; seule l’API Obsidian est externe. Le code utilise les API Vault/FileManager et aucune API Node.js/Electron à l’exécution.

Les tests navigateur chargent le véritable `main.js` compilé dans un hôte Obsidian simulé. Ils vérifient les notes et leur préservation, l’édition des fiches/routes, les conflits, les calculs d’âge, les téléchargements et leur relecture sans réseau, la navigation, Canvas et l’isolation visuelle. Ils ne remplacent pas une validation dans les applications natives Windows et Android.
