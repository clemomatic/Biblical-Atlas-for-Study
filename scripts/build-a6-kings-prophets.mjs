import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const ACCESSED_AT = '2026-07-25';
const JUDAH = 'territory-kingdom-judah';
const ISRAEL = 'territory-kingdom-israel';

const sources = [
  {
    id: 'source-nwt-a6-a',
    title: 'Prophètes et rois de Juda et d’Israël (1re partie)',
    publication: 'La Bible. Traduction du monde nouveau (édition révisée de 2018)',
    chapterOrAppendix: 'Appendice A6-A',
    pageOrSection: 'Graphique chronologique, 997-800 av. n. è.',
    url: 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/appendice-a/rois-de-juda-et-d-israel/',
    documentType: 'appendix',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Extraction factuelle des noms, durées, bornes chronologiques et barres de ministère. Aucune illustration ni long extrait n’est reproduit.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  },
  {
    id: 'source-nwt-a6-b',
    title: 'Prophètes et rois de Juda et d’Israël (2e partie)',
    publication: 'La Bible. Traduction du monde nouveau (édition révisée de 2018)',
    chapterOrAppendix: 'Appendice A6-B',
    pageOrSection: 'Graphique chronologique, 800-600 av. n. è.',
    url: 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/appendice-a/rois-de-juda-et-d-israel-2/',
    documentType: 'appendix',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Extraction factuelle des noms, durées, bornes chronologiques, phases de règne et événements indiqués. Aucune illustration ni long extrait n’est reproduit.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  },
  ...[
    ['source-nwt-1-kings-17', '1 Rois 17', 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/livres/1-rois/17/'],
    ['source-nwt-2-kings-3', '2 Rois 3', 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/livres/2-rois/3/'],
    ['source-nwt-2-kings-19', '2 Rois 19', 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/livres/2-rois/19/'],
    ['source-nwt-jeremiah-37', 'Jérémie 37', 'https://www.jw.org/fr/biblioth%C3%A8que/bible/nwt/livres/J%C3%A9r%C3%A9mie/37/']
  ].map(([id, section, url]) => ({
    id,
    title: section,
    publication: 'La Bible. Traduction du monde nouveau (édition révisée de 2018)',
    pageOrSection: section,
    url,
    documentType: 'bible',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Passage utilisé uniquement pour documenter une interaction ou une présence explicite.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  }))
];

const exactSpan = (start, end, label, certainty = 'certain', approximate = false) => ({
  start: {
    yearMin: start,
    yearMax: start,
    precision: 'year',
    approximate,
    certainty
  },
  end: {
    yearMin: end,
    yearMax: end,
    precision: 'year',
    approximate,
    certainty
  },
  displayLabel: label
});

const king = (
  sourceId,
  id,
  name,
  realmId,
  capitalPlaceId,
  start,
  end,
  label,
  options = {}
) => ({
  sourceId,
  id,
  name,
  role: options.role ?? 'king',
  alternateNames: options.alternateNames ?? [],
  realmId,
  capitalPlaceId,
  start,
  end,
  label,
  phase: options.phase ?? 'fully-established-reign',
  certainty: options.certainty ?? (options.approximate ? 'probable' : 'certain'),
  approximate: options.approximate ?? false,
  legacyEventId: options.legacyEventId ?? id,
  activityId: options.activityId ?? `activity-${id}-${options.phase ?? 'reign'}`,
  notes: options.notes
});

const a6aKings = [
  king('source-nwt-a6-a', 'event-roboam-121uoxd', 'Roboam', JUDAH, 'jerusalem', -997, -980, '997-980 av. n. è.'),
  king('source-nwt-a6-a', 'event-abia-abiyam-2ym9yh', 'Abia', JUDAH, 'jerusalem', -980, -978, '980-978 av. n. è.', { alternateNames: ['Abiyam'] }),
  king('source-nwt-a6-a', 'event-asa-1yoxudp', 'Asa', JUDAH, 'jerusalem', -978, -937, '978-937 av. n. è.'),
  king('source-nwt-a6-a', 'event-josaphat-180etp4', 'Josaphat', JUDAH, 'jerusalem', -937, -913, '937-913 av. n. è.'),
  king('source-nwt-a6-a', 'event-joram-rv6bw8', 'Joram', JUDAH, 'jerusalem', -913, -906, '913-vers 906 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-ochozias-ydd23t', 'Ochozias', JUDAH, 'jerusalem', -906, -905, 'vers 906-vers 905 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-athalie-reine-c0zpks', 'Athalie', JUDAH, 'jerusalem', -905, -898, 'vers 905-898 av. n. è.', { role: 'queen', approximate: true }),
  king('source-nwt-a6-a', 'event-joas-1qmzl7g', 'Joas', JUDAH, 'jerusalem', -898, -858, '898-858 av. n. è.'),
  king('source-nwt-a6-a', 'event-amazia-4p1grk', 'Amazia', JUDAH, 'jerusalem', -858, -829, '858-829 av. n. è.'),
  king('source-nwt-a6-a', 'event-ozias-azarias-z716hd', 'Ozias', JUDAH, 'jerusalem', -829, -777, '829-777 av. n. è.', { alternateNames: ['Azarias'] }),
  king('source-nwt-a6-a', 'event-jeroboam-wbpa60', 'Jéroboam', ISRAEL, 'shechem', -997, -976, '997-vers 976 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-nadab-ef40vw', 'Nadab', ISRAEL, 'tirzah', -976, -975, 'vers 976-vers 975 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-baasa-1m40vzu', 'Baasa', ISRAEL, 'tirzah', -975, -952, 'vers 975-vers 952 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-ela-1bvkej2', 'Éla', ISRAEL, 'tirzah', -952, -951, 'vers 952-vers 951 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-zimri-1259iez', 'Zimri', ISRAEL, 'tirzah', -951, -951, '7 jours, vers 951 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-omri-seul-ub6jpn', 'Omri', ISRAEL, 'tirzah', -951, -947, 'Règne disputé avec Tibni, vers 951-vers 947 av. n. è.', {
    phase: 'disputed-reign',
    approximate: true,
    activityId: 'activity-omri-disputed-a6-a',
    notes: 'Cette phase ne doit pas être confondue avec le règne d’Omri seul.'
  }),
  king('source-nwt-a6-a', 'person-tibni-a6-a', 'Tibni', ISRAEL, 'tirzah', -951, -947, 'Règne disputé avec Omri, vers 951-vers 947 av. n. è.', {
    phase: 'disputed-reign',
    approximate: true,
    legacyEventId: 'event-omri-et-tibni-ti47en',
    activityId: 'activity-tibni-disputed-a6-a'
  }),
  king('source-nwt-a6-a', 'event-omri-seul-ub6jpn', 'Omri', ISRAEL, 'samaria', -947, -940, 'Omri seul, vers 947-vers 940 av. n. è.', {
    approximate: true,
    activityId: 'activity-omri-established-a6-a'
  }),
  king('source-nwt-a6-a', 'event-achab-rnxk2l', 'Achab', ISRAEL, 'samaria', -940, -920, 'vers 940-vers 920 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-ochozias-tp5qhy', 'Ochozias', ISRAEL, 'samaria', -920, -917, 'vers 920-vers 917 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-joram-dcjw4c', 'Joram', ISRAEL, 'samaria', -917, -905, 'vers 917-vers 905 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-jehu-1xcnlrg', 'Jéhu', ISRAEL, 'samaria', -905, -876, 'vers 905-876 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-joachaz-1d329mk', 'Joachaz', ISRAEL, 'samaria', -876, -862, '876-vers 862 av. n. è.', { approximate: true }),
  king('source-nwt-a6-a', 'event-joachaz-1d329mk', 'Joachaz', ISRAEL, 'samaria', -862, -859, 'Corègne avec Joas, vers 862-vers 859 av. n. è.', {
    phase: 'co-reign',
    approximate: true,
    activityId: 'activity-joachaz-co-reign-a6-a'
  }),
  king('source-nwt-a6-a', 'event-joas-1o337ml', 'Joas', ISRAEL, 'samaria', -862, -859, 'Corègne avec Joachaz, vers 862-vers 859 av. n. è.', {
    phase: 'co-reign',
    approximate: true,
    activityId: 'activity-joas-co-reign-a6-a'
  }),
  king('source-nwt-a6-a', 'event-joas-1o337ml', 'Joas', ISRAEL, 'samaria', -859, -844, 'Joas seul, vers 859-vers 844 av. n. è.', {
    approximate: true,
    activityId: 'activity-joas-established-a6-a'
  }),
  king('source-nwt-a6-a', 'event-jeroboam-ii-pnmqkf', 'Jéroboam II', ISRAEL, 'samaria', -844, -803, 'vers 844-vers 803 av. n. è.', { approximate: true })
];

const a6bKings = [
  king('source-nwt-a6-b', 'event-jotam-ls65h6', 'Jotam', JUDAH, 'jerusalem', -777, -762, '777-762 av. n. è.'),
  king('source-nwt-a6-b', 'event-achaz-3rywka', 'Achaz', JUDAH, 'jerusalem', -762, -746, '762-746 av. n. è.'),
  king('source-nwt-a6-b', 'event-ezechias-1ne958h', 'Ézéchias', JUDAH, 'jerusalem', -746, -716, '746-716 av. n. è.'),
  king('source-nwt-a6-b', 'event-manasse-1d4ld4r', 'Manassé', JUDAH, 'jerusalem', -716, -661, '716-661 av. n. è.'),
  king('source-nwt-a6-b', 'event-amon-1e5ypbs', 'Amon', JUDAH, 'jerusalem', -661, -659, '661-659 av. n. è.'),
  king('source-nwt-a6-b', 'event-josias-woei8d', 'Josias', JUDAH, 'jerusalem', -659, -628, '659-628 av. n. è.'),
  king('source-nwt-a6-b', 'event-joachaz-n8z9wc', 'Joachaz', JUDAH, 'jerusalem', -628, -628, '3 mois en 628 av. n. è.'),
  king('source-nwt-a6-b', 'event-joachim-os33qa', 'Joachim', JUDAH, 'jerusalem', -628, -618, '628-618 av. n. è.'),
  king('source-nwt-a6-b', 'event-joachin-1jjrc69', 'Joachin', JUDAH, 'jerusalem', -618, -618, '3 mois et 10 jours en 618 av. n. è.'),
  king('source-nwt-a6-b', 'event-sedecias-h3ny0i', 'Sédécias', JUDAH, 'jerusalem', -617, -607, '617-607 av. n. è.'),
  king('source-nwt-a6-b', 'event-zacharie-1j7fkvy', 'Zacharie', ISRAEL, 'samaria', -803, -792, 'Commence à régner dans un certain sens vers 803 av. n. è.', {
    phase: 'limited-reign',
    approximate: true,
    activityId: 'activity-zacharie-limited-a6-b'
  }),
  king('source-nwt-a6-b', 'event-zacharie-1j7fkvy', 'Zacharie', ISRAEL, 'samaria', -792, -792, 'Règne pleinement établi pendant 6 mois, vers 792 av. n. è.', {
    approximate: true,
    activityId: 'activity-zacharie-established-a6-b'
  }),
  king('source-nwt-a6-b', 'event-shaloum-3hf4d0', 'Shaloum', ISRAEL, 'samaria', -791, -791, '1 mois, vers 791 av. n. è.', { approximate: true }),
  king('source-nwt-a6-b', 'event-menahem-1pxgjh5', 'Menahem', ISRAEL, 'samaria', -791, -780, 'vers 791-vers 780 av. n. è.', { approximate: true }),
  king('source-nwt-a6-b', 'event-pekaya-wx6x8f', 'Pekaya', ISRAEL, 'samaria', -780, -778, 'vers 780-vers 778 av. n. è.', { approximate: true }),
  king('source-nwt-a6-b', 'event-peka-gtm9lr', 'Péka', ISRAEL, 'samaria', -778, -758, 'vers 778-vers 758 av. n. è.', { approximate: true }),
  king('source-nwt-a6-b', 'event-osee-q1i1e0', 'Osée', ISRAEL, 'samaria', -758, -748, 'Commence à régner dans un certain sens vers 758 av. n. è.', {
    phase: 'limited-reign',
    approximate: true,
    activityId: 'activity-osee-king-limited-a6-b'
  }),
  king('source-nwt-a6-b', 'event-osee-q1i1e0', 'Osée', ISRAEL, 'samaria', -748, -740, 'Règne pleinement établi, vers 748-740 av. n. è.', {
    approximate: true,
    activityId: 'activity-osee-king-established-a6-b'
  })
];

const prophet = (sourceId, id, name, start, end, label, legacyEventId = id) => ({
  sourceId,
  id,
  name,
  start,
  end,
  label,
  legacyEventId,
  certainty: 'possible',
  approximate: true
});

const prophets = [
  prophet('source-nwt-a6-a', 'event-elie-1nckpyy', 'Élie', -940, -850, 'Ministère représenté approximativement entre 940 et 850 av. n. è.'),
  prophet('source-nwt-a6-a', 'event-elisee-1r2p3av', 'Élisée', -920, -850, 'Ministère représenté approximativement entre 920 et 850 av. n. è.'),
  prophet('source-nwt-a6-a', 'event-jonas-159bcqk', 'Jonas', -860, -840, 'Ministère représenté approximativement entre 860 et 840 av. n. è.'),
  prophet('source-nwt-a6-a', 'event-joel-1n2xkrq', 'Joël', -830, -810, 'Ministère représenté approximativement entre 830 et 810 av. n. è.'),
  prophet('source-nwt-a6-a', 'event-amos-18vx5fi', 'Amos', -850, -800, 'Ministère représenté approximativement entre 850 et 800 av. n. è.'),
  prophet('source-nwt-a6-b', 'event-osee-jj56nl', 'Osée', -805, -745, 'Ministère représenté approximativement entre 805 et 745 av. n. è.'),
  prophet('source-nwt-a6-b', 'event-isaie-90gwjf', 'Isaïe', -780, -735, 'Ministère représenté approximativement entre 780 et 735 av. n. è.'),
  prophet('source-nwt-a6-b', 'event-michee-idbjq7', 'Michée', -755, -710, 'Ministère représenté approximativement entre 755 et 710 av. n. è.'),
  prophet('source-nwt-a6-b', 'person-nahum-a6-b', 'Nahum', -660, -650, 'Ministère représenté approximativement vers 660-650 av. n. è.'),
  prophet('source-nwt-a6-b', 'person-sophonie-a6-b', 'Sophonie', -660, -645, 'Ministère représenté approximativement vers 660-645 av. n. è.'),
  prophet('source-nwt-a6-b', 'event-jeremie-14kkv3x', 'Jérémie', -650, -580, 'Ministère représenté approximativement entre 650 et 580 av. n. è.'),
  prophet('source-nwt-a6-b', 'person-habacuc-a6-b', 'Habacuc', -630, -615, 'Ministère représenté approximativement vers 630-615 av. n. è.'),
  prophet('source-nwt-a6-b', 'person-abdias-a6-b', 'Abdias', -620, -605, 'Ministère représenté approximativement vers 620-605 av. n. è.'),
  prophet('source-nwt-a6-b', 'person-ezechiel-a6-b', 'Ézéchiel', -615, -590, 'Ministère représenté approximativement entre 615 et 590 av. n. è.'),
  prophet('source-nwt-a6-b', 'event-daniel-oyu19r', 'Daniel', -620, -580, 'Ministère commençant vers 620 av. n. è. et se poursuivant après 600 av. n. è.')
];

const allKingPhases = [...a6aKings, ...a6bKings];
const claims = [];
const peopleById = new Map();

const reviewedEvidence = (sourceId, shortReference, method = 'direct') => ({
  sourceId,
  shortReference,
  method,
  humanReviewStatus: 'reviewed'
});

for (const phase of allKingPhases) {
  const span = exactSpan(
    phase.start,
    phase.end,
    phase.label,
    phase.certainty,
    phase.approximate
  );
  const startClaimId = `claim-${phase.activityId}-start`;
  const endClaimId = `claim-${phase.activityId}-end`;
  const appendix = phase.sourceId.endsWith('a') ? 'A6-A' : 'A6-B';
  claims.push(
    {
      id: startClaimId,
      workflowStatus: 'reviewed',
      origin: 'reviewed',
      subject: { entityType: 'person', entityId: phase.id },
      predicate: 'reign-start',
      object: { entityType: 'territory', entityId: phase.realmId },
      period: { start: span.start, end: span.start, displayLabel: phase.label },
      certainty: phase.certainty,
      evidence: [reviewedEvidence(phase.sourceId, `${appendix}, graphique : début de la phase « ${phase.label} ».`)]
    },
    {
      id: endClaimId,
      workflowStatus: 'reviewed',
      origin: 'reviewed',
      subject: { entityType: 'person', entityId: phase.id },
      predicate: 'reign-end',
      object: { entityType: 'territory', entityId: phase.realmId },
      period: { start: span.end, end: span.end, displayLabel: phase.label },
      certainty: phase.certainty,
      evidence: [reviewedEvidence(phase.sourceId, `${appendix}, graphique : fin ou durée de la phase « ${phase.label} ».`)]
    }
  );

  const activity = {
    id: phase.activityId,
    type: 'reign',
    phase: phase.phase,
    label:
      phase.phase === 'co-reign'
        ? 'Corègne'
        : phase.phase === 'disputed-reign'
          ? 'Règne disputé'
          : phase.phase === 'limited-reign'
            ? 'Début de règne dans un sens limité'
            : 'Règne pleinement établi',
    span,
    realmId: phase.realmId,
    capitalPlaceId: phase.capitalPlaceId,
    supportingClaimIds: [startClaimId, endClaimId],
    associatedLocationIds: [phase.capitalPlaceId],
    certainty: phase.certainty,
    notes: phase.notes
  };
  const current = peopleById.get(phase.id);
  if (current) {
    current.person.activityPeriods.push(activity);
    current.sourceIds = [...new Set([...current.sourceIds, phase.sourceId])];
  } else {
    peopleById.set(phase.id, {
      workflowStatus: 'reviewed',
      sourceIds: [phase.sourceId],
      person: {
        id: phase.id,
        name: phase.name,
        alternateNames: phase.alternateNames,
        roles: [phase.role],
        realmIds: [phase.realmId],
        description: `${phase.role === 'queen' ? 'Reine' : 'Roi'} du ${phase.realmId === JUDAH ? 'royaume de Juda' : 'royaume d’Israël'}.`,
        activityPeriods: [activity],
        associatedLocationIds: [phase.capitalPlaceId],
        biblicalReferences: [],
        certainty: phase.certainty,
        notes: 'Les phases A6 sont séparées des anciennes lignes de compatibilité de la frise ; aucune rencontre n’est déduite d’un simple chevauchement.',
        lastVerified: ACCESSED_AT,
        legacyEventId: phase.legacyEventId
      }
    });
  }
}

for (const entry of prophets) {
  const claimId = `claim-activity-${entry.id}-prophetic-ministry`;
  const span = exactSpan(
    entry.start,
    entry.end,
    entry.label,
    entry.certainty,
    true
  );
  claims.push({
    id: claimId,
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    subject: { entityType: 'person', entityId: entry.id },
    predicate: 'prophecy',
    period: span,
    certainty: entry.certainty,
    evidence: [
      reviewedEvidence(
        entry.sourceId,
        `${entry.sourceId.endsWith('a') ? 'A6-A' : 'A6-B'}, barre graphique du ministère de ${entry.name}.`
      )
    ],
    notes: 'Les extrémités sont une lecture prudente du graphique, pas une date au jour ou à l’année certaine.'
  });
  peopleById.set(entry.id, {
    workflowStatus: 'reviewed',
    sourceIds: [entry.sourceId],
    person: {
      id: entry.id,
      name: entry.name,
      alternateNames: [],
      roles: ['prophet'],
      description: 'Prophète dont la période de ministère est représentée dans les appendices A6.',
      activityPeriods: [
        {
          id: `activity-${entry.id}-prophetic-ministry`,
          type: 'prophecy',
          phase: 'prophetic-ministry',
          label: 'Ministère prophétique',
          span,
          supportingClaimIds: [claimId],
          certainty: entry.certainty
        }
      ],
      associatedLocationIds: [],
      biblicalReferences: [],
      certainty: entry.certainty,
      notes: 'La barre A6 donne une période générale. Elle ne prouve ni une localisation continue ni une rencontre avec chaque roi contemporain.',
      lastVerified: ACCESSED_AT,
      legacyEventId: entry.legacyEventId
    }
  });
}

const interactions = [
  ['claim-interaction-elie-achab', 'event-elie-1nckpyy', 'event-achab-rnxk2l', 'source-nwt-1-kings-17', '1 Rois 17:1', -940, -920],
  ['claim-interaction-elisee-joram', 'event-elisee-1r2p3av', 'event-joram-dcjw4c', 'source-nwt-2-kings-3', '2 Rois 3:11-14', -917, -905],
  ['claim-interaction-isaie-ezechias', 'event-isaie-90gwjf', 'event-ezechias-1ne958h', 'source-nwt-2-kings-19', '2 Rois 19:1-7, 20', -746, -716],
  ['claim-interaction-jeremie-sedecias', 'event-jeremie-14kkv3x', 'event-sedecias-h3ny0i', 'source-nwt-jeremiah-37', 'Jérémie 37:17-21', -617, -607]
];
for (const [id, subjectId, objectId, sourceId, reference, start, end] of interactions) {
  claims.push({
    id,
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    subject: { entityType: 'person', entityId: subjectId },
    predicate: 'attested-interaction',
    object: { entityType: 'person', entityId: objectId },
    period: exactSpan(start, end, reference, 'certain', false),
    certainty: 'certain',
    evidence: [reviewedEvidence(sourceId, reference)]
  });
}

const joramPresenceClaim = {
  id: 'claim-joram-israel-presence-samaria',
  workflowStatus: 'reviewed',
  origin: 'reviewed',
  subject: { entityType: 'person', entityId: 'event-joram-dcjw4c' },
  predicate: 'presence',
  placeId: 'samaria',
  period: exactSpan(-917, -905, 'Règne de Joram à Samarie, vers 917-vers 905 av. n. è.', 'probable', true),
  certainty: 'probable',
  evidence: [reviewedEvidence('source-nwt-2-kings-3', '2 Rois 3:1 : Joram règne à Samarie pendant 12 ans.')]
};
claims.push(joramPresenceClaim);

const politicalEvents = [
  {
    id: 'historical-event-fall-samaria-740',
    name: 'Prise de Samarie et fin du royaume du Nord',
    period: exactSpan(-740, -740, '740 av. n. è.'),
    sourceOrder: 100,
    category: 'Événements marquants',
    description: 'L’Assyrie prend Samarie et soumet Israël ; le royaume du Nord prend fin.',
    certainty: 'certain',
    placeMentions: [{ label: 'Samarie', placeId: 'samaria', granularity: 'point', certainty: 'certain' }],
    participantMentions: [],
    biblicalReferences: ['2 Rois 17:6'],
    supportingClaimIds: ['claim-political-fall-samaria-740'],
    notes: 'Formulation factuelle courte d’après A6-B.'
  },
  {
    id: 'historical-event-destruction-jerusalem-607',
    name: 'Destruction de Jérusalem et déposition de Sédécias',
    period: exactSpan(-607, -607, '607 av. n. è.'),
    sourceOrder: 101,
    category: 'Événements marquants',
    description: 'Les Babyloniens détruisent Jérusalem et son temple ; Sédécias est destitué.',
    certainty: 'certain',
    placeMentions: [{ label: 'Jérusalem', placeId: 'jerusalem', granularity: 'point', certainty: 'certain' }],
    participantMentions: [{ label: 'Sédécias', personId: 'event-sedecias-h3ny0i', certainty: 'certain' }],
    biblicalReferences: ['2 Rois 25:1-10'],
    supportingClaimIds: ['claim-political-destruction-jerusalem-607'],
    notes: 'Formulation factuelle courte d’après A6-B.'
  }
];
for (const event of politicalEvents) {
  claims.push({
    id: event.supportingClaimIds[0],
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    subject: { entityType: 'event', entityId: event.id },
    predicate: 'political-event',
    period: event.period,
    certainty: event.certainty,
    evidence: [reviewedEvidence('source-nwt-a6-b', `A6-B, graphique : ${event.name}.`)]
  });
}

const territories = [
  {
    workflowStatus: 'reviewed',
    sourceIds: ['source-nwt-a6-a', 'source-nwt-a6-b'],
    territory: {
      id: JUDAH,
      name: 'Royaume de Juda',
      period: exactSpan(-997, -607, '997-607 av. n. è.'),
      capitalPhases: [
        {
          id: 'capital-phase-judah-jerusalem-a6',
          placeId: 'jerusalem',
          period: exactSpan(-997, -607, '997-607 av. n. è.'),
          certainty: 'certain',
          notes: 'Capitale administrative ; ce lien ne crée aucun épisode de présence individuel.'
        }
      ],
      certainty: 'certain',
      geometryStatus: 'not-provided',
      notes: 'Entité temporelle sans polygone : aucune limite territoriale n’est inventée à partir du graphique.'
    }
  },
  {
    workflowStatus: 'reviewed',
    sourceIds: ['source-nwt-a6-a', 'source-nwt-a6-b'],
    territory: {
      id: ISRAEL,
      name: 'Royaume d’Israël',
      period: exactSpan(-997, -740, '997-740 av. n. è.'),
      capitalPhases: [
        {
          id: 'capital-phase-israel-shechem-a6',
          placeId: 'shechem',
          period: exactSpan(-997, -976, 'Début du règne de Jéroboam'),
          certainty: 'probable',
          notes: 'Siège administratif associé ; aucune présence individuelle supplémentaire n’est générée.'
        },
        {
          id: 'capital-phase-israel-tirzah-a6',
          placeId: 'tirzah',
          period: exactSpan(-976, -947, 'Environ 976-947 av. n. è.', 'probable', true),
          certainty: 'probable',
          notes: 'Phase administrative conservée comme association, sans déduction de présence.'
        },
        {
          id: 'capital-phase-israel-samaria-a6',
          placeId: 'samaria',
          period: exactSpan(-947, -740, 'Environ 947-740 av. n. è.', 'probable', true),
          certainty: 'probable',
          notes: 'Phase administrative conservée comme association, sans déduction de présence.'
        }
      ],
      certainty: 'certain',
      geometryStatus: 'not-provided',
      notes: 'Entité temporelle sans polygone : aucune limite territoriale n’est inventée à partir du graphique.'
    }
  }
];

const stagingFor = (sourceId, rows) =>
  rows.map((row, index) => ({
    id: `staging-${sourceId}-${String(index + 1).padStart(3, '0')}`,
    entityType: 'person',
    workflowStatus: 'staging',
    sourceHints: [sourceId],
    extractionNotes: 'Ligne factuelle conservée séparément du corpus reviewed.',
    payload: {
      sourceReference: row.label,
      name: row.name,
      role: row.role ?? 'prophet',
      period: exactSpan(
        row.start,
        row.end,
        row.label,
        row.certainty,
        row.approximate
      ),
      certainty: row.certainty,
      review: {
        status: 'reviewed',
        reviewedAt: ACCESSED_AT,
        sourceReference: row.label,
        entityIdsVerified: true
      }
    }
  }));

const writeJson = async (relativePath, value) => {
  const path = join(ROOT, relativePath);
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const catalogPath = join(ROOT, 'content', 'sources', 'source-catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const sourceIds = new Set(sources.map(source => source.id));
await writeJson(
  'content/sources/source-catalog.json',
  [...catalog.filter(source => !sourceIds.has(source.id)), ...sources]
);
await writeJson('content/staging/a6-a-rois-prophetes.json', stagingFor('source-nwt-a6-a', [...a6aKings, ...prophets.filter(entry => entry.sourceId === 'source-nwt-a6-a')]));
await writeJson('content/staging/a6-b-rois-prophetes.json', stagingFor('source-nwt-a6-b', [...a6bKings, ...prophets.filter(entry => entry.sourceId === 'source-nwt-a6-b')]));

const people = [...peopleById.values()].sort((left, right) => left.person.id.localeCompare(right.person.id));
await writeJson('content/reviewed/people/a6-kings-prophets.json', people);
await writeJson('content/reviewed/claims/a6-kings-prophets-claims.json', claims.sort((left, right) => left.id.localeCompare(right.id)));
await writeJson(
  'content/reviewed/presences/a6-presences.json',
  [
    {
      id: 'presence-joram-israel-samaria',
      workflowStatus: 'reviewed',
      origin: 'reviewed',
      personId: 'event-joram-dcjw4c',
      placeId: 'samaria',
      period: joramPresenceClaim.period,
      presenceType: 'reign-seat',
      certainty: 'probable',
      supportingClaimIds: [joramPresenceClaim.id],
      notes: 'Présence créée parce que le passage indique explicitement que Joram règne à Samarie.'
    }
  ]
);
await writeJson(
  'content/reviewed/events/a6-political-events.json',
  politicalEvents.map(event => ({
    workflowStatus: 'reviewed',
    sourceIds: ['source-nwt-a6-b'],
    event
  }))
);
await writeJson('content/reviewed/territories/a6-kingdoms.json', territories);

console.log(
  `A6 construit : ${people.length} personnes, ${claims.length} affirmations, ${politicalEvents.length} événements, 1 présence explicite et ${territories.length} territoires temporels.`
);
