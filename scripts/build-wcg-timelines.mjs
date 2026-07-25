import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveAllPersonLifeClaims } from '../src/domain/history/personClaimResolution.ts';

const ROOT = process.cwd();
const ACCESSED_AT = '2026-07-25';
const WCG_SOURCE_IDS = new Set([
  'source-wcg-timeline-part-1',
  'source-wcg-timeline-part-2',
  'source-wcg-timeline-part-3'
]);

const sources = [
  {
    id: 'source-wcg-timeline-part-1',
    title: 'Frise chronologique de la partie 1',
    publication: 'Marche courageusement avec Dieu',
    chapterOrAppendix: 'Partie 1 — Des patriarches aux juges',
    pageOrSection: 'pages 14-15',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102025962',
    documentType: 'timeline',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Extraction limitée aux noms, barres chronologiques et évènements factuels. Les barres collectives restent des fenêtres de contexte et non des durées de vie individuelles.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  },
  {
    id: 'source-wcg-timeline-part-2',
    title: 'Frise chronologique de la partie 2',
    publication: 'Marche courageusement avec Dieu',
    chapterOrAppendix: 'Partie 2 — Des rois à la reconstruction de Jérusalem',
    pageOrSection: 'pages 104-105',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102025964',
    documentType: 'timeline',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Extraction limitée aux noms, barres chronologiques et évènements factuels. Aucune illustration ni texte explicatif n’est reproduit.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  },
  {
    id: 'source-wcg-timeline-part-3',
    title: 'Frise chronologique de la partie 3',
    publication: 'Marche courageusement avec Dieu',
    chapterOrAppendix: 'Partie 3 — Les débuts du christianisme',
    pageOrSection: 'pages 186-187',
    url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102025966',
    documentType: 'timeline',
    language: 'fr',
    accessedAt: ACCESSED_AT,
    notes: 'Extraction limitée aux noms, barres chronologiques et évènements factuels. « apr. » est conservé comme borne ouverte après la date indiquée.',
    factualDataUseAllowed: true,
    longTextReproductionAllowed: false,
    imageReproductionAllowed: false,
    verificationStatus: 'verified'
  }
];

const boundary = (
  year,
  { approximate = false, precision = 'year', certainty, yearMax } = {}
) => ({
  yearMin: year,
  yearMax: yearMax ?? year,
  precision,
  approximate,
  certainty: certainty ?? (approximate ? 'probable' : 'certain')
});

const span = (
  start,
  end,
  displayLabel,
  {
    startApproximate = false,
    endApproximate = false,
    endPrecision = 'year',
    endYearMax
  } = {}
) => ({
  start: boundary(start, { approximate: startApproximate }),
  end: boundary(end, {
    approximate: endApproximate,
    precision: endPrecision,
    yearMax: endYearMax
  }),
  displayLabel
});

const point = (year, displayLabel, approximate = false) =>
  span(year, year, displayLabel, {
    startApproximate: approximate,
    endApproximate: approximate
  });

const life = (
  part,
  category,
  id,
  name,
  period,
  options = {}
) => ({
  part,
  sourceId: `source-wcg-timeline-part-${part}`,
  category,
  id,
  name,
  period,
  alternateNames: options.alternateNames ?? [],
  legacyEventId: options.legacyEventId,
  kind: 'individual-lifespan'
});

const group = (
  part,
  category,
  label,
  period,
  members
) => ({
  part,
  sourceId: `source-wcg-timeline-part-${part}`,
  category,
  label,
  period,
  members,
  kind: 'collective-context'
});

const individualRows = [
  life(1, 'Avant le Déluge', 'event-adam-2peny4', 'Adam', span(-4026, -3096, '4026-3096 av. n. è.'), { legacyEventId: 'event-adam-2peny4' }),
  life(1, 'Avant le Déluge', 'event-henoch-5b97vn', 'Hénoch', span(-3404, -3039, '3404-3039 av. n. è.'), { legacyEventId: 'event-henoch-5b97vn' }),
  life(1, 'Avant le Déluge', 'event-noe-qdkz7y', 'Noé', span(-2970, -2020, '2970-2020 av. n. è.'), { legacyEventId: 'event-noe-qdkz7y' }),
  life(1, 'Après le Déluge', 'event-abraham-mdcznq', 'Abraham', span(-2018, -1843, '2018-1843 av. n. è.'), { legacyEventId: 'event-abraham-mdcznq' }),
  life(1, 'Après le Déluge', 'event-sara-1xft3rw', 'Sara', span(-2008, -1881, '2008-1881 av. n. è.'), { legacyEventId: 'event-sara-1xft3rw' }),
  life(1, 'Après le Déluge', 'person-wcg-rebecca', 'Rébecca', span(-1900, -1775, 'vers 1900-vers 1775 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(1, 'Après le Déluge', 'event-jacob-a7o7cq', 'Jacob', span(-1858, -1711, '1858-1711 av. n. è.'), { legacyEventId: 'event-jacob-a7o7cq' }),
  life(1, 'Après le Déluge', 'event-joseph-11h377b', 'Joseph', span(-1767, -1657, '1767-1657 av. n. è.'), { legacyEventId: 'event-joseph-11h377b' }),
  life(1, 'Après le Déluge', 'event-moise-p4dtf4', 'Moïse', span(-1593, -1473, '1593-1473 av. n. è.'), { legacyEventId: 'event-moise-p4dtf4' }),
  life(1, 'Après le Déluge', 'person-wcg-caleb', 'Caleb', span(-1552, -1450, '1552-vers 1450 av. n. è.', { endApproximate: true })),
  life(1, 'Après le Déluge', 'person-wcg-josue', 'Josué', span(-1560, -1450, 'vers 1560-vers 1450 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(1, 'Après le Déluge', 'person-wcg-rahab', 'Rahab', span(-1500, -1400, 'vers 1500-vers 1400 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(1, 'Époque des juges', 'event-samuel-8qh05i', 'Samuel', span(-1180, -1080, 'vers 1180-vers 1080 av. n. è.', { startApproximate: true, endApproximate: true }), { legacyEventId: 'event-samuel-8qh05i' }),

  life(2, 'Royaume uni', 'event-samuel-8qh05i', 'Samuel', span(-1180, -1080, 'vers 1180-vers 1080 av. n. è.', { startApproximate: true, endApproximate: true }), { legacyEventId: 'event-samuel-8qh05i' }),
  life(2, 'Royaume uni', 'person-wcg-jonathan', 'Jonathan', span(-1138, -1078, 'vers 1138-vers 1078 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(2, 'Royaume uni', 'event-david-iixp36', 'David', span(-1107, -1037, '1107-1037 av. n. è.'), { legacyEventId: 'event-david-iixp36' }),
  life(2, 'Royaume uni', 'person-wcg-mefibosheth', 'Mefibosheth', span(-1083, -1000, 'vers 1083-vers 1000 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(2, 'Royaume divisé', 'person-wcg-joad', 'Joad', span(-1005, -875, 'vers 1005-vers 875 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(2, 'Royaume divisé', 'event-asa-1yoxudp', 'Asa', span(-1000, -937, 'vers 1000-937 av. n. è.', { startApproximate: true }), { legacyEventId: 'event-asa-1yoxudp' }),
  life(2, 'Royaume divisé', 'event-elisee-1r2p3av', 'Élisée', span(-950, -850, 'vers 950-vers 850 av. n. è.', { startApproximate: true, endApproximate: true }), { legacyEventId: 'event-elisee-1r2p3av' }),
  life(2, 'Royaume divisé', 'person-wcg-petite-fille-israelite', 'La petite fille israélite', span(-925, -825, 'vers 925-vers 825 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(2, 'Royaume divisé', 'event-ezechias-1ne958h', 'Ézéchias', span(-771, -716, '771-716 av. n. è.'), { legacyEventId: 'event-ezechias-1ne958h' }),
  life(2, 'Royaume divisé', 'event-manasse-1d4ld4r', 'Manassé', span(-728, -661, '728-661 av. n. è.'), { legacyEventId: 'event-manasse-1d4ld4r' }),
  life(2, 'Royaume divisé', 'event-josias-woei8d', 'Josias', span(-667, -628, '667-628 av. n. è.'), { legacyEventId: 'event-josias-woei8d' }),
  life(2, 'Après l’Exil', 'person-wcg-esther', 'Esther', span(-515, -415, 'vers 515-vers 415 av. n. è.', { startApproximate: true, endApproximate: true })),
  life(2, 'Après l’Exil', 'person-wcg-nehemie', 'Néhémie', span(-485, -385, 'vers 485-vers 385 av. n. è.', { startApproximate: true, endApproximate: true })),

  life(3, 'Débuts du christianisme', 'person-a7-zacharie-pretre', 'Zacharie', span(-70, -2, 'vers 70 av. n. è.-après 2 av. n. è.', { startApproximate: true, endPrecision: 'after' })),
  life(3, 'Débuts du christianisme', 'person-a7-elisabeth', 'Élisabeth', span(-70, -2, 'vers 70 av. n. è.-après 2 av. n. è.', { startApproximate: true, endPrecision: 'after' })),
  life(3, 'Débuts du christianisme', 'person-a7-marie-mere-jesus', 'Marie', span(-20, 33, 'vers 20 av. n. è.-après 33 de n. è.', { startApproximate: true, endPrecision: 'after' }), { alternateNames: ['Marie, mère de Jésus'] }),
  life(3, 'Débuts du christianisme', 'person-a7-joseph-pere-adoptif', 'Joseph', span(-25, 11, 'vers 25 av. n. è.-après 11 de n. è.', { startApproximate: true, endPrecision: 'after' }), { alternateNames: ['Père adoptif de Jésus'] }),
  life(3, 'Débuts du christianisme', 'event-jean-le-baptiseur-dvgl2c', 'Jean le Baptiseur', span(-2, 32, '2 av. n. è.-vers 32 de n. è.', { endApproximate: true }), { legacyEventId: 'event-jean-le-baptiseur-dvgl2c' }),
  life(3, 'Débuts du christianisme', 'event-jesus-en-tant-qu-humain-1f4ceyz', 'Jésus', span(-2, 33, '2 av. n. è.-33 de n. è.'), { legacyEventId: 'event-jesus-en-tant-qu-humain-1f4ceyz', alternateNames: ['Jésus Christ'] }),
  life(3, 'Débuts du christianisme', 'person-a7-pierre', 'Pierre', span(-5, 64, 'vers 5 av. n. è.-après 64 de n. è.', { startApproximate: true, endPrecision: 'after' }), { alternateNames: ['Simon Pierre'] }),
  life(3, 'Débuts du christianisme', 'person-wcg-marie-magdala', 'Marie de Magdala', span(-5, 33, 'vers 5 av. n. è.-après 33 de n. è.', { startApproximate: true, endPrecision: 'after' })),
  life(3, 'Débuts du christianisme', 'person-a7-marie-bethanie', 'Marie de Béthanie', span(-15, 33, 'vers 15 av. n. è.-après 33 de n. è.', { startApproximate: true, endPrecision: 'after' }), { alternateNames: ['Marie, sœur de Lazare'] }),
  life(3, 'Débuts du christianisme', 'person-wcg-etienne', 'Étienne', span(-5, 33, 'vers 5 av. n. è.-vers 33/34 de n. è.', { startApproximate: true, endApproximate: true, endYearMax: 34 })),
  life(3, 'Débuts du christianisme', 'person-wcg-paul', 'Paul', span(3, 65, 'vers 3-vers 65 de n. è.', { startApproximate: true, endApproximate: true }), { alternateNames: ['Saul de Tarse'] }),
  life(3, 'Débuts du christianisme', 'person-wcg-barnabe', 'Barnabé', span(-5, 55, 'vers 5 av. n. è.-après 55 de n. è.', { startApproximate: true, endPrecision: 'after' })),
  life(3, 'Débuts du christianisme', 'person-wcg-marc', 'Marc', span(15, 65, 'vers 15 de n. è.-après vers 65 de n. è.', { startApproximate: true, endApproximate: true, endPrecision: 'after' }), { alternateNames: ['Jean Marc'] }),
  life(3, 'Débuts du christianisme', 'event-jean-e4vx5j', 'Jean', span(-5, 100, 'vers 5 av. n. è.-vers 100 de n. è.', { startApproximate: true, endApproximate: true }), { legacyEventId: 'event-jean-e4vx5j', alternateNames: ['Apôtre Jean'] })
];

const collectiveRows = [
  group(1, 'Après le Déluge', 'Shifra, Poua, Amram, Jokébed et Miriam', span(-1645, -1474, 'Fenêtre collective vers 1645-vers 1474 av. n. è.', { startApproximate: true, endApproximate: true }), [
    ['person-wcg-shifra', 'Shifra'],
    ['person-wcg-poua', 'Poua'],
    ['person-wcg-amram', 'Amram'],
    ['person-wcg-jokebed', 'Jokébed'],
    ['person-wcg-miriam', 'Miriam']
  ]),
  group(1, 'Époque des juges', 'Personnages de l’époque des juges', span(-1450, -1120, 'Fenêtre collective vers 1450-vers 1120 av. n. è.', { startApproximate: true, endApproximate: true }), [
    ['person-wcg-noemi', 'Noémi'],
    ['person-wcg-ruth', 'Ruth'],
    ['person-wcg-deborah', 'Déborah'],
    ['person-wcg-barak', 'Barak'],
    ['person-wcg-jael', 'Jael'],
    ['person-wcg-gedeon', 'Gédéon'],
    ['person-wcg-samson', 'Samson'],
    ['person-wcg-jephte', 'Jephté'],
    ['person-wcg-fille-jephte', 'Fille de Jephté']
  ]),
  group(2, 'Royaume uni', 'Abigaïl et Nathan', span(-1100, -1000, 'Fenêtre collective vers 1100-vers 1000 av. n. è.', { startApproximate: true, endApproximate: true }), [
    ['person-wcg-abigail', 'Abigaïl'],
    ['person-wcg-nathan', 'Nathan']
  ]),
  group(2, 'Royaume divisé', 'Élie et la veuve de Sarepta', span(-970, -900, 'Fenêtre collective vers 970-vers 900 av. n. è.', { startApproximate: true, endApproximate: true }), [
    ['event-elie-1nckpyy', 'Élie'],
    ['person-wcg-veuve-sarepta', 'Veuve de Sarepta']
  ]),
  group(2, 'Exil à Babylone', 'Daniel, Hanania, Mishael et Azarias', span(-635, -535, 'Fenêtre collective vers 635-vers 535 av. n. è.', { startApproximate: true, endApproximate: true }), [
    ['event-daniel-oyu19r', 'Daniel'],
    ['person-wcg-hanania', 'Hanania'],
    ['person-wcg-mishael', 'Mishael'],
    ['person-wcg-azarias', 'Azarias']
  ])
];

const eventFact = (
  part,
  id,
  name,
  period,
  sourceOrder,
  options = {}
) => ({
  part,
  sourceId: `source-wcg-timeline-part-${part}`,
  id,
  name,
  period,
  sourceOrder,
  category: options.category ?? 'Événements marquants',
  certainty: options.certainty ?? (
    period.start?.approximate || period.end?.approximate ? 'probable' : 'certain'
  ),
  participantMentions: options.participantMentions ?? [],
  notes: options.notes,
  supersedesLegacyTitles: options.supersedesLegacyTitles ?? []
});

const eventRows = [
  eventFact(1, 'event-wcg-deluge-2370', 'Déluge', point(-2370, '2370 av. n. è.'), 1, { supersedesLegacyTitles: ['Déluge'] }),
  eventFact(1, 'event-wcg-alliance-abrahamique-1943', 'Entrée en vigueur de l’alliance abrahamique', point(-1943, '1943 av. n. è.'), 2, { participantMentions: [{ label: 'Abraham', personId: 'event-abraham-mdcznq', certainty: 'certain' }] }),
  eventFact(1, 'event-wcg-jacob-egypte-1728', 'Arrivée de Jacob et de sa famille en Égypte', point(-1728, '1728 av. n. è.'), 3, { participantMentions: [{ label: 'Jacob', personId: 'event-jacob-a7o7cq', certainty: 'certain' }] }),
  eventFact(1, 'event-wcg-egypte-puissance-1600', 'Égypte, puissance mondiale', point(-1600, 'vers 1600 av. n. è.', true), 4, { category: 'Chronologie biblique' }),
  eventFact(1, 'event-wcg-exode-1513', 'Exode', point(-1513, '1513 av. n. è.'), 5),
  eventFact(1, 'event-wcg-entree-canaan-1473', 'Entrée d’Israël en Canaan', point(-1473, '1473 av. n. è.'), 6),
  eventFact(1, 'event-wcg-onction-saul-1117', 'Onction de Saül par Samuel', point(-1117, '1117 av. n. è.'), 7, { participantMentions: [{ label: 'Samuel', personId: 'event-samuel-8qh05i', certainty: 'certain' }, { label: 'Saül', certainty: 'certain' }] }),

  eventFact(2, 'event-wcg-egypte-puissance-1600-part2', 'Égypte, puissance mondiale', point(-1600, 'vers 1600 av. n. è.', true), 101, { category: 'Chronologie biblique' }),
  eventFact(2, 'event-wcg-temple-salomon-1027', 'Fin de la construction du temple de Salomon', point(-1027, '1027 av. n. è.'), 102, { participantMentions: [{ label: 'Salomon', certainty: 'certain' }] }),
  eventFact(2, 'event-wcg-division-royaumes-997', 'Division du pays d’Israël en deux royaumes', point(-997, '997 av. n. è.'), 103),
  eventFact(2, 'event-wcg-assyrie-puissance-apres-874', 'Assyrie, puissance mondiale', point(-874, 'Après 874 av. n. è.', true), 104, { category: 'Chronologie biblique', notes: 'La source donne seulement une borne « après 874 » ; le marqueur reste attaché à cette limite sans inventer une année précise.' }),
  eventFact(2, 'event-wcg-conquete-royaume-dix-tribus-740', 'Conquête du royaume des dix tribus par l’Assyrie', point(-740, '740 av. n. è.'), 105),
  eventFact(2, 'event-wcg-babylone-puissance-625', 'Babylone, puissance mondiale', point(-625, '625 av. n. è.'), 106, { category: 'Chronologie biblique' }),
  eventFact(2, 'event-wcg-destruction-jerusalem-607', 'Destruction de Jérusalem par Nabuchodonosor', point(-607, '607 av. n. è.'), 107, { participantMentions: [{ label: 'Nabuchodonosor', certainty: 'certain' }], supersedesLegacyTitles: ['Destruction de Jérusalem par les Babyloniens'] }),
  eventFact(2, 'event-wcg-medo-perse-puissance-539', 'Empire médo-perse, puissance mondiale', point(-539, '539 av. n. è.'), 108, { category: 'Chronologie biblique' }),
  eventFact(2, 'event-wcg-liberation-babylone-537', 'Libération des Juifs de Babylone', point(-537, '537 av. n. è.'), 109),
  eventFact(2, 'event-wcg-reconstruction-temple-515', 'Reconstruction du temple de Jérusalem', point(-515, '515 av. n. è.'), 110),
  eventFact(2, 'event-wcg-reconstruction-murailles-455', 'Fin de la reconstruction des murailles de Jérusalem', point(-455, '455 av. n. è.'), 111),

  eventFact(3, 'event-wcg-grece-puissance-332', 'Grèce, puissance mondiale', point(-332, 'vers 332 av. n. è.', true), 201, { category: 'Chronologie biblique' }),
  eventFact(3, 'event-wcg-rome-puissance-63-30', 'Rome, puissance mondiale', span(-63, -30, 'vers 63-vers 30 av. n. è.', { startApproximate: true, endApproximate: true }), 202, { category: 'Chronologie biblique' }),
  eventFact(3, 'event-wcg-pentecote-33', 'Effusion de l’esprit saint à la Pentecôte', point(33, '33 de n. è.'), 203),
  eventFact(3, 'event-wcg-premiers-gentils-36', 'Baptême des premiers Gentils incirconcis', point(36, '36 de n. è.'), 204),
  eventFact(3, 'event-wcg-matthieu-evangile-41', 'Matthieu écrit le premier Évangile', point(41, 'vers 41 de n. è.', true), 205, { participantMentions: [{ label: 'Matthieu', certainty: 'certain' }] }),
  eventFact(3, 'event-wcg-destruction-jerusalem-70', 'Destruction de Jérusalem et du Temple', point(70, '70 de n. è.'), 206),
  eventFact(3, 'event-wcg-fin-redaction-bible-98', 'Fin de la rédaction de la Bible', point(98, 'vers 98 de n. è.', true), 207)
];

const writeJson = async (relativePath, value) => {
  const path = join(ROOT, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readJson = async relativePath =>
  JSON.parse(await readFile(join(ROOT, relativePath), 'utf8'));

const listJsonFiles = async directory => {
  const files = [];
  for (const entry of await readdir(join(ROOT, directory), { withFileTypes: true })) {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listJsonFiles(relativePath));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(relativePath);
  }
  return files.sort((left, right) => left.localeCompare(right));
};

const reviewedEvidence = (sourceId, shortReference) => ({
  sourceId,
  shortReference,
  method: 'direct',
  humanReviewStatus: 'reviewed'
});

const claimIdFor = (row, suffix) =>
  `claim-wcg-${row.part}-${row.id.replace(/^(event|person)-/, '')}-${suffix}`;

const catalog = await readJson('content/sources/source-catalog.json');
await writeJson(
  'content/sources/source-catalog.json',
  [
    ...catalog.filter(source => !WCG_SOURCE_IDS.has(source.id)),
    ...sources
  ]
);

const peopleFiles = (await listJsonFiles('content/reviewed/people'))
  .filter(path => !path.endsWith('wcg-people.json'));
const peopleById = new Map();
for (const path of peopleFiles) {
  const records = await readJson(path);
  records.forEach(record => {
    record.sourceIds = record.sourceIds.filter(id => !WCG_SOURCE_IDS.has(id));
    record.person.lifeSpanClaimIds = record.person.lifeSpanClaimIds
      ?.filter(id => !id.startsWith('claim-wcg-'));
    record.person.sourceTimelineWindows = record.person.sourceTimelineWindows
      ?.filter(window => !WCG_SOURCE_IDS.has(window.sourceId));
    if (!record.person.lifeSpanClaimIds?.length && record.person.notes?.includes('Durée de vie sélectionnée depuis la frise WCG.')) {
      delete record.person.lifeSpan;
    }
    peopleById.set(record.person.id, { record, path, records });
  });
}

const newPeople = new Map();
const allClaimsFiles = await listJsonFiles('content/reviewed/claims');
const existingClaims = [];
for (const path of allClaimsFiles) {
  if (path.endsWith('wcg-claims.json')) continue;
  existingClaims.push(...await readJson(path));
}
const claims = [];

const getOrCreatePersonRecord = (id, name, sourceId) => {
  const existing = peopleById.get(id)?.record ?? newPeople.get(id);
  if (existing) {
    existing.sourceIds = [...new Set([...existing.sourceIds, sourceId])].sort();
    return existing;
  }
  const record = {
    workflowStatus: 'reviewed',
    sourceIds: [sourceId],
    person: {
      id,
      name,
      alternateNames: [],
      historicalCategories: [],
      activityPeriods: [],
      certainty: 'certain',
      notes: 'Personnage migré ou créé à partir d’une ligne factuelle relue de la publication.',
      lastVerified: ACCESSED_AT
    }
  };
  newPeople.set(id, record);
  return record;
};

for (const row of individualRows) {
  const claimId = claimIdFor(row, 'lifespan');
  claims.push({
    id: claimId,
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    subject: { entityType: 'person', entityId: row.id },
    predicate: 'lifespan',
    period: row.period,
    certainty:
      row.period.start?.approximate || row.period.end?.approximate
        ? 'probable'
        : 'certain',
    evidence: [
      reviewedEvidence(
        row.sourceId,
        `${sources.find(source => source.id === row.sourceId).pageOrSection}, ligne « ${row.name} » : ${row.period.displayLabel}.`
      )
    ],
    notes: 'La barre est interprétée comme une durée de vie individuelle parce que la source la présente explicitement ainsi.'
  });
  const record = getOrCreatePersonRecord(row.id, row.name, row.sourceId);
  record.person.name = row.name;
  record.person.alternateNames = [
    ...new Set([
      ...(record.person.alternateNames ?? []),
      ...row.alternateNames
    ])
  ];
  record.person.historicalCategories = [
    ...new Set([
      ...(record.person.historicalCategories ?? []),
      row.category
    ])
  ];
  record.person.lifeSpanClaimIds = [
    ...new Set([...(record.person.lifeSpanClaimIds ?? []), claimId])
  ];
  if (row.legacyEventId) record.person.legacyEventId = row.legacyEventId;
}

for (const row of collectiveRows) {
  for (const [personId, name] of row.members) {
    const claimId = `claim-wcg-${row.part}-${personId.replace(/^(event|person)-/, '')}-timeline-context`;
    claims.push({
      id: claimId,
      workflowStatus: 'reviewed',
      origin: 'reviewed',
      subject: { entityType: 'person', entityId: personId },
      predicate: 'timeline-context',
      period: row.period,
      certainty: 'possible',
      evidence: [
        reviewedEvidence(
          row.sourceId,
          `${sources.find(source => source.id === row.sourceId).pageOrSection}, barre collective « ${row.label} ».`
        )
      ],
      notes: 'Cette fenêtre collective ne constitue ni une date de naissance ni une date de décès et ne génère aucun contemporain.'
    });
    const record = getOrCreatePersonRecord(personId, name, row.sourceId);
    record.person.historicalCategories = [
      ...new Set([
        ...(record.person.historicalCategories ?? []),
        row.category
      ])
    ];
    record.person.sourceTimelineWindows = [
      ...(record.person.sourceTimelineWindows ?? []),
      {
        id: `timeline-window-wcg-${row.part}-${personId.replace(/^(event|person)-/, '')}`,
        sourceId: row.sourceId,
        kind: 'collective-context',
        label: row.label,
        span: row.period,
        supportingClaimIds: [claimId],
        notes: 'Fenêtre de contexte collective ; aucune durée de vie individuelle ne peut en être déduite.'
      }
    ];
  }
}

const allLifeClaims = [
  ...existingClaims.filter(claim => claim.predicate === 'lifespan'),
  ...claims.filter(claim => claim.predicate === 'lifespan')
];
const resolutions = resolveAllPersonLifeClaims(allLifeClaims);
for (const resolution of resolutions) {
  const record =
    peopleById.get(resolution.personId)?.record ??
    newPeople.get(resolution.personId);
  if (!record) continue;
  if (resolution.selectedSpan) {
    record.person.lifeSpan = resolution.selectedSpan;
    record.person.notes = [
      record.person.notes?.replace(' Durée de vie sélectionnée depuis la frise WCG.', ''),
      'Durée de vie sélectionnée depuis la frise WCG.'
    ].filter(Boolean).join(' ');
  }
}

for (const path of peopleFiles) {
  const entry = [...peopleById.values()].find(value => value.path === path);
  if (entry) await writeJson(path, entry.records);
}
await writeJson(
  'content/reviewed/people/wcg-people.json',
  [...newPeople.values()].sort((left, right) =>
    left.person.id.localeCompare(right.person.id)
  )
);

let legacyEvents = [];
try {
  const { createServer } = await import('vite');
  const server = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true }
  });
  ({ EVENTS: legacyEvents } = await server.ssrLoadModule('/src/data/timelineEvents.ts'));
  await server.close();
} catch (error) {
  console.warn(`Rapprochement des anciens évènements ignoré : ${error instanceof Error ? error.message : String(error)}`);
}

const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const reviewedEvents = [];
for (const row of eventRows) {
  const eventClaimId = claimIdFor(row, 'event');
  claims.push({
    id: eventClaimId,
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    subject: { entityType: 'event', entityId: row.id },
    predicate: 'historical-event',
    period: row.period,
    certainty: row.certainty,
    evidence: [
      reviewedEvidence(
        row.sourceId,
        `${sources.find(source => source.id === row.sourceId).pageOrSection}, évènement « ${row.name} » : ${row.period.displayLabel}.`
      )
    ]
  });
  const supersedesLegacyEventIds = legacyEvents
    .filter(event =>
      row.supersedesLegacyTitles.some(
        title => normalize(event.text) === normalize(title)
      )
    )
    .map(event => event.id);
  reviewedEvents.push({
    workflowStatus: 'reviewed',
    sourceIds: [row.sourceId],
    event: {
      id: row.id,
      name: row.name,
      period: row.period,
      sourceOrder: row.sourceOrder,
      category: row.category,
      description: row.name,
      certainty: row.certainty,
      supportingClaimIds: [eventClaimId],
      placeMentions: [],
      participantMentions: row.participantMentions,
      supersedesLegacyEventIds:
        supersedesLegacyEventIds.length > 0
          ? supersedesLegacyEventIds
          : undefined,
      notes: [
        'Fait court extrait de la frise ; aucune illustration ni formulation longue n’est reprise.',
        row.notes
      ].filter(Boolean).join(' ')
    }
  });
}

await writeJson(
  'content/reviewed/claims/wcg-claims.json',
  claims.sort((left, right) => left.id.localeCompare(right.id))
);
await writeJson(
  'content/reviewed/events/wcg-important-events.json',
  reviewedEvents.sort((left, right) =>
    left.event.id.localeCompare(right.event.id)
  )
);
await writeJson(
  'content/generated/person-life-resolutions.json',
  resolutions
);

const stagingForPart = part => {
  const personRecords = individualRows
    .filter(row => row.part === part)
    .map((row, index) => ({
      id: `staging-wcg-${part}-person-${String(index + 1).padStart(3, '0')}`,
      entityType: 'person',
      workflowStatus: 'staging',
      sourceHints: [row.sourceId],
      extractionNotes: 'Ligne individuelle extraite de la table accessible de la frise.',
      payload: {
        recordKind: 'individual-lifespan',
        personIds: [row.id],
        names: [row.name],
        historicalCategory: row.category,
        period: row.period,
        certainty:
          row.period.start?.approximate || row.period.end?.approximate
            ? 'probable'
            : 'certain',
        review: {
          status: 'reviewed',
          reviewedAt: ACCESSED_AT,
          sourceReference: row.period.displayLabel,
          entityIdsVerified: true
        }
      }
    }));
  const collectiveRecords = collectiveRows
    .filter(row => row.part === part)
    .map((row, index) => ({
      id: `staging-wcg-${part}-collective-${String(index + 1).padStart(3, '0')}`,
      entityType: 'claim',
      workflowStatus: 'staging',
      sourceHints: [row.sourceId],
      extractionNotes: 'Barre collective conservée comme contexte ; elle ne décrit pas les vies individuelles.',
      payload: {
        recordKind: 'collective-context',
        label: row.label,
        personIds: row.members.map(([id]) => id),
        names: row.members.map(([, name]) => name),
        historicalCategory: row.category,
        period: row.period,
        certainty: 'possible',
        review: {
          status: 'reviewed',
          reviewedAt: ACCESSED_AT,
          sourceReference: row.period.displayLabel,
          entityIdsVerified: true
        }
      }
    }));
  const eventRecords = eventRows
    .filter(row => row.part === part)
    .map((row, index) => ({
      id: `staging-wcg-${part}-event-${String(index + 1).padStart(3, '0')}`,
      entityType: 'event',
      workflowStatus: 'staging',
      sourceHints: [row.sourceId],
      extractionNotes: 'Évènement factuel court extrait de la frise.',
      payload: {
        recordKind: 'historical-event',
        eventId: row.id,
        name: row.name,
        period: row.period,
        certainty: row.certainty,
        review: {
          status: 'reviewed',
          reviewedAt: ACCESSED_AT,
          sourceReference: row.period.displayLabel,
          entityIdsVerified: true
        }
      }
    }));
  return [...personRecords, ...collectiveRecords, ...eventRecords];
};

await writeJson('content/staging/wcg-part-1-patriarches-juges.json', stagingForPart(1));
await writeJson('content/staging/wcg-part-2-rois-reconstruction.json', stagingForPart(2));
await writeJson('content/staging/wcg-part-3-christianisme.json', stagingForPart(3));

console.log(
  `Frises WCG construites : ${individualRows.length} barres individuelles, ${collectiveRows.length} barres collectives, ${eventRows.length} évènements et ${resolutions.length} résolutions multi-sources.`
);
