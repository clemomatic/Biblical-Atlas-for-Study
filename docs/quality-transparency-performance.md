# Qualit&eacute;, transparence et performances

Ce document d&eacute;crit les garde-fous appliqu&eacute;s au corpus historique sans modifier une date, une coordonn&eacute;e ou une affirmation documentaire.

## Transparence des fiches

Chaque fiche propose maintenant **Sources et m&eacute;thode**. La synth&egrave;se distingue :

- **directement attest&eacute;** : une preuve relue cite directement la source ;
- **calcul&eacute;** : le r&eacute;sultat est reproductible depuis les `inputClaimIds` ;
- **inf&eacute;r&eacute;** : une conclusion interpr&eacute;tative reste s&eacute;par&eacute;e du fait cit&eacute; ;
- **g&eacute;n&eacute;r&eacute; par chevauchement** : le moteur a compar&eacute; des p&eacute;riodes, lieux ou &eacute;v&eacute;nements valid&eacute;s.

La fiche affiche aussi la certitude, la derni&egrave;re v&eacute;rification, les sources consultables et les limites. Un chevauchement ne devient jamais une rencontre. Une fiche encore h&eacute;rit&eacute;e l'indique explicitement au lieu de simuler une tra&ccedil;abilit&eacute; absente.

## Rapport qualit&eacute; du corpus

```bash
pnpm quality:report
pnpm quality:check
```

Le rapport versionn&eacute; est `content/generated/corpus-quality-report.json`. Le contr&ocirc;le bloque la CI pour : p&eacute;riode impossible, ID orphelin, relation sans preuve suffisante, affirmation relue non valid&eacute;e ou calcul non reproductible.

Les dettes &eacute;ditoriales restent visibles sans bloquer la consultation : &eacute;l&eacute;ments sans source structur&eacute;e, lieux sans provenance, doublons possibles, contradictions &agrave; relire, staging et ancien mod&egrave;le.

Etat mesur&eacute; le 25 juillet 2026 :

| Indicateur | Valeur |
| --- | ---: |
| Personnes relues | 127 |
| Ev&eacute;nements relus | 153 |
| Affirmations relues | 557 |
| Pr&eacute;sences relues | 152 |
| Relations g&eacute;n&eacute;r&eacute;es et valid&eacute;es | 1 118 |
| Anomalies bloquantes | 0 |
| El&eacute;ments de migration ou documentation | 702 |

Le total de 702 comprend notamment 331 lignes en staging, 28 personnages encore repr&eacute;sent&eacute;s par l'ancien mod&egrave;le, 185 &eacute;v&eacute;nements sans source structur&eacute;e et un rapprochement d'&eacute;v&eacute;nements &agrave; relire. Il ne signifie pas que ces lignes sont historiquement fausses ; il mesure leur niveau de structuration.

## Couverture des tests

| Parcours | Couverture principale |
| --- | --- |
| Recherche d'une personne, clavier et fermeture | Playwright |
| S&eacute;lection d'une plage annuelle | Playwright |
| Panneau &laquo; A ce moment-l&agrave; &raquo; | Unitaires + Playwright |
| Contemporains et activit&eacute;s communes | Unitaires + vue de contr&ocirc;le Playwright |
| M&ecirc;me lieu, m&ecirc;me &eacute;v&eacute;nement, interaction attest&eacute;e | Unitaires du moteur et preuves du snapshot |
| Personne vers lieu, lieu vers &eacute;v&eacute;nement, frise vers carte | Playwright |
| Consultation d'une source | Playwright |
| Affichage mobile et couches de carte | Playwright &agrave; 390 x 844 |
| Absence d'ann&eacute;e z&eacute;ro, approximation, donn&eacute;es insuffisantes | Unitaires |
| Rapport qualit&eacute; et reproductibilit&eacute; | Unitaires + commande CI |

Les tests relationnels restent unitaires car ils doivent v&eacute;rifier exactement ce que le moteur ne doit **pas** d&eacute;duire. Playwright couvre le parcours visible sans recalculer les r&egrave;gles dans le navigateur.

## Performance

```bash
pnpm performance:report
pnpm performance:check
```

Le rapport est `content/generated/performance-report.json`. Il mesure le build courant, un chargement Chromium local, 200 snapshots et 500 requ&ecirc;tes sur un index multipli&eacute; jusqu'&agrave; plusieurs centaines ou milliers d'entr&eacute;es.

Mesure de r&eacute;f&eacute;rence : chargement interactif 384 ms, snapshot moyen 0,114 ms, requ&ecirc;te sur index &eacute;largi 0,025 ms. Le JavaScript principal p&egrave;se 3,73 Mo brut et 387 Ko gzip. La taille brute reste une limite connue : les donn&eacute;es sont fortement compressibles, mais un futur lot devra envisager un d&eacute;coupage par corpus si le volume augmente fortement.

L'index temporel utilise une borne binaire sur les entr&eacute;es tri&eacute;es ; il ne parcourt plus la partie post&eacute;rieure &agrave; la p&eacute;riode demand&eacute;e.

## Prochaines priorit&eacute;s documentaires

1. relire les lignes actuellement en staging, petit lot par petit lot ;
2. structurer les sources des &eacute;v&eacute;nements h&eacute;rit&eacute;s avant d'ajouter de nouveaux corpus ;
3. migrer les 28 personnages restants vers `BiblicalPerson` ;
4. arbitrer le candidat de doublon uniquement avec les sources ;
5. traiter les prochains articles d'Etude perspicace et cartes B sans collecte massive.

Les r&egrave;gles d'ajout d'une source et de promotion sont dans [historical-data-workflow.md](historical-data-workflow.md), le calendrier sans ann&eacute;e z&eacute;ro dans [historical-temporal-model.md](historical-temporal-model.md), et la g&eacute;n&eacute;ration des relations dans [historical-relation-engine.md](historical-relation-engine.md).