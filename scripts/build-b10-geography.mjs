import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer } from 'vite';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';

const ROOT = process.cwd();
const CONTENT_ROOT = join(ROOT, 'content');
const SOURCE_ID = 'source-nwtsty-b10';
const MAP_ID = 'B10';
const REVIEWED_AT = '2026-07-25';

const serialize = value => `${JSON.stringify(value, null, 2)}\n`;
const unique = values => [...new Set(values.filter(Boolean))];
const normalize = value =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

const SOURCE_PLACES = [
  ['Sidon', 'place'],
  ['ABILÈNE', 'region'],
  ['Damas', 'place'],
  ['Sarepta', 'place'],
  ['Mt Hermon', 'natural-feature'],
  ['PHÉNICIE', 'region'],
  ['Tyr', 'place'],
  ['Césarée de Philippe', 'place'],
  ['ITURÉE', 'region'],
  ['TRACHONITIDE', 'region'],
  ['Ptolémaïs (Akko)', 'place'],
  ['GALILÉE', 'region'],
  ['Korazîn', 'place'],
  ['Bethsaïde', 'place'],
  ['Capharnaüm', 'place'],
  ['Cana', 'place'],
  ['Magadân', 'place'],
  ['Mer de Galilée', 'natural-feature'],
  ['Gergésa', 'place'],
  ['Raphana', 'place'],
  ['Sepphoris', 'place'],
  ['Tibériade', 'place'],
  ['Hippos', 'place'],
  ['Dion', 'place'],
  ['Nazareth', 'place'],
  ['GADARA', 'region'],
  ['Abila', 'place'],
  ['Dor', 'place'],
  ['Naïn', 'place'],
  ['Gadara', 'place'],
  ['DÉCAPOLE', 'region'],
  ['Césarée', 'place'],
  ['Scythopolis (Beth-Shéân)', 'place'],
  ['Béthanie de l’autre côté du Jourdain ?', 'place'],
  ['Pella', 'place'],
  ['SAMARIE', 'region'],
  ['Énôn', 'place'],
  ['Salim', 'place'],
  ['Sébaste (Samarie)', 'place'],
  ['Gerasa', 'place'],
  ['Sychar', 'place'],
  ['Mt Garizim', 'natural-feature'],
  ['Puits de Jacob', 'natural-feature'],
  ['Antipatris (Afek)', 'place'],
  ['PÉRÉE', 'region'],
  ['Joppé', 'place'],
  ['Plaine du Saron', 'region'],
  ['Arimathie', 'place'],
  ['Lydda (Lod)', 'place'],
  ['Éphraïm', 'place'],
  ['Jourdain', 'natural-feature'],
  ['Philadelphie (Raba)', 'place'],
  ['Jamnia (Jabné)', 'place'],
  ['Rama', 'place'],
  ['Jéricho', 'place'],
  ['Emmaüs', 'place'],
  ['Jérusalem', 'place'],
  ['Bethphagé', 'place'],
  ['Asdod, Azoth', 'place'],
  ['Bethléem', 'place'],
  ['Béthanie', 'place'],
  ['Qumran', 'place'],
  ['Ascalon', 'place'],
  ['JUDÉE', 'region'],
  ['Hérodium', 'place'],
  ['Gaza', 'place'],
  ['Hébron', 'place'],
  ['Désert de Judée', 'region'],
  ['Mer Salée (Mer Morte)', 'natural-feature'],
  ['Macheronte', 'place'],
  ['IDUMÉE', 'region'],
  ['Massada', 'place'],
  ['Bersabée', 'place'],
  ['NABATÈNE', 'region'],
  ['ARABIE', 'region']
].map(([label, kind]) => ({ label, kind }));

const PLACE_OVERRIDES = {
  'Capharnaüm': 'capernaum',
  'Mt Hermon': 'obi-mount-hermon',
  'Ptolémaïs (Akko)': 'obi-ptolemais',
  'Mer de Galilée': 'obi-sea-of-galilee',
  'Scythopolis (Beth-Shéân)': 'obi-beth-shan',
  'Béthanie de l’autre côté du Jourdain ?':
    'place-a7b-bethany-beyond-jordan',
  'Sébaste (Samarie)': 'samaria',
  Gerasa: 'obi-gerasa',
  'Antipatris (Afek)': 'obi-aphek-2',
  Arimathie: 'obi-arimathea-c8',
  'Lydda (Lod)': 'obi-lod',
  'Philadelphie (Raba)': 'obi-rabbah-1',
  'Asdod, Azoth': 'obi-ashdod',
  'Bethléem': 'bethlehem',
  'Bersabée': 'beersheba',
  'Désert de Judée': 'place-a7b-judean-wilderness',
  'Mer Salée (Mer Morte)': 'obi-salt-sea'
};

const BLOCKED_AMBIGUOUS_LABELS = new Map([
  ['Qumran', 'Le corpus actuel associe Qumran à Sekaka comme nom alternatif, sans identifiant propre suffisamment démontré.']
]);

const sourceEntry = {
  id: SOURCE_ID,
  title: 'Israël au temps de Jésus',
  publication: 'La Bible. Traduction du monde nouveau (édition d’étude)',
  chapterOrAppendix: 'B10',
  pageOrSection: 'Lieux indiqués sur la carte',
  url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1001070230',
  documentType: 'map',
  language: 'fr',
  accessedAt: REVIEWED_AT,
  notes:
    'Données factuelles et références cartographiques uniquement. Aucune image n’est copiée dans le dépôt.',
  factualDataUseAllowed: true,
  longTextReproductionAllowed: false,
  imageReproductionAllowed: false,
  verificationStatus: 'reviewed'
};

const sourceCatalogPath = join(
  CONTENT_ROOT,
  'sources',
  'source-catalog.json'
);
const sourceCatalog = JSON.parse(await readFile(sourceCatalogPath, 'utf8'));
const existingSourceIndex = sourceCatalog.findIndex(
  source => source.id === SOURCE_ID
);
const nextSourceCatalog = [...sourceCatalog];
if (existingSourceIndex >= 0) nextSourceCatalog[existingSourceIndex] = sourceEntry;
else nextSourceCatalog.push(sourceEntry);
await writeFile(sourceCatalogPath, serialize(nextSourceCatalog), 'utf8');

const dataset = await loadHistoricalDataset(CONTENT_ROOT);
const server = await createServer({
  appType: 'custom',
  configFile: false,
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true }
});

let applicationPlaces;
try {
  ({ BIBLICAL_PLACES: applicationPlaces } =
    await server.ssrLoadModule('/src/data/mapData.ts'));
} finally {
  await server.close();
}

const allPlaces = [
  ...applicationPlaces.map(place => ({
    id: place.id,
    name: place.name,
    alternateNames: place.alternateNames ?? [],
    certainty: place.certainty ?? 'unknown',
    hasCoordinates: true
  })),
  ...dataset.places
    .filter(
      record =>
        !applicationPlaces.some(place => place.id === record.place.id)
    )
    .map(record => ({
      id: record.place.id,
      name: record.place.name,
      alternateNames: [],
      certainty: record.place.certainty ?? 'unknown',
      hasCoordinates: false
    }))
];
const placesById = new Map(allPlaces.map(place => [place.id, place]));
const normalizedNames = new Map();
allPlaces.forEach(place => {
  [place.name, ...place.alternateNames].forEach(name => {
    const key = normalize(name);
    normalizedNames.set(key, [
      ...(normalizedNames.get(key) ?? []),
      place.id
    ]);
  });
});

const inventory = SOURCE_PLACES.map((sourcePlace, sourceOrder) => {
  const overrideId = PLACE_OVERRIDES[sourcePlace.label];
  const ambiguityNote = BLOCKED_AMBIGUOUS_LABELS.get(sourcePlace.label);
  const candidates = ambiguityNote
    ? []
    : overrideId
    ? [overrideId]
    : sourcePlace.kind === 'region'
      ? []
      : unique(normalizedNames.get(normalize(sourcePlace.label)) ?? []);
  const placeId =
    candidates.length === 1 && placesById.has(candidates[0])
      ? candidates[0]
      : undefined;
  const place = placeId ? placesById.get(placeId) : undefined;
  return {
    sourceOrder: sourceOrder + 1,
    label: sourcePlace.label,
    kind: sourcePlace.kind,
    status: place ? 'matched' : 'missing',
    ...(place
      ? {
          placeId: place.id,
          canonicalName: place.name,
          hasCoordinates: place.hasCoordinates,
          certainty: place.certainty,
          matchMethod: overrideId ? 'explicit-id' : 'exact-name'
        }
      : {
          matchMethod: 'none',
          reviewNote:
            ambiguityNote ??
            (sourcePlace.kind === 'region'
              ? 'Région cartographique non modélisée comme point.'
              : 'Aucun identifiant suffisamment démontré dans le corpus actuel.')
        })
  };
});

const inventoryByPlaceId = new Map(
  inventory
    .filter(item => item.placeId)
    .map(item => [item.placeId, item])
);

const placeLinks = inventory.flatMap(item => {
  if (!item.placeId) return [];
  return [{
    id: `geo-b10-place-${item.placeId}-${item.sourceOrder}`,
    workflowStatus: 'reviewed',
    origin: 'reviewed',
    sourceIds: [SOURCE_ID],
    primarySourceId: SOURCE_ID,
    mapId: MAP_ID,
    mapReference: `B10 · ${item.label}`,
    subject: {
      entityType: 'place',
      entityId: item.placeId
    },
    placeId: item.placeId,
    method: 'source-map-location',
    certainty: item.certainty,
    sourceMapCertainty: 'unknown',
    coordinatesChanged: false,
    limitations:
      'B10 confirme que le lieu figure sur la carte. Le texte numérique ne restitue pas le symbole de certitude ; aucune coordonnée existante n’a été modifiée.'
  }];
});

const a7Events = dataset.events.filter(record =>
  record.sourceIds.some(sourceId => /^source-nwtsty-a7-[a-h]$/.test(sourceId))
);
const eventLinks = a7Events.flatMap(record => {
  const certaintyOrder = ['unknown', 'possible', 'probable', 'certain'];
  const mentionsByPlaceId = new Map();
  for (const mention of record.event.placeMentions ?? []) {
    if (!mention.placeId) continue;
    const existing = mentionsByPlaceId.get(mention.placeId);
    if (
      !existing ||
      certaintyOrder.indexOf(mention.certainty) <
        certaintyOrder.indexOf(existing.certainty)
    ) {
      mentionsByPlaceId.set(mention.placeId, mention);
    }
  }

  return [...mentionsByPlaceId.values()].flatMap(mention => {
    const inventoryItem = inventoryByPlaceId.get(mention.placeId);
    if (!inventoryItem) return [];
    const presences = dataset.presences.filter(
      presence =>
        presence.placeId === mention.placeId &&
        presence.associatedEventIds?.includes(record.event.id)
    );
    return [{
      id: `geo-b10-event-${record.event.id}-${mention.placeId}`,
      workflowStatus: 'reviewed',
      origin: 'reviewed',
      sourceIds: unique([SOURCE_ID, ...record.sourceIds]),
      primarySourceId: SOURCE_ID,
      mapId: MAP_ID,
      mapReference: `B10 · ${inventoryItem.label}`,
      subject: {
        entityType: 'event',
        entityId: record.event.id
      },
      placeId: mention.placeId,
      eventIds: [record.event.id],
      personIds: unique(presences.map(presence => presence.personId)),
      presenceEpisodeIds: presences.map(presence => presence.id).sort(),
      method: 'map-and-event-cross-reference',
      certainty: mention.certainty,
      sourceMapCertainty: 'unknown',
      coordinatesChanged: false,
      limitations:
        'B10 documente le lieu ; la période, l’événement et les présences proviennent des appendices A7 correspondants. Ce rapprochement ne prouve aucun chemin entre deux lieux.'
    }];
  });
});

const geographicLinks = [...placeLinks, ...eventLinks].sort((left, right) =>
  left.id.localeCompare(right.id)
);

const staging = inventory.map(item => ({
  id: `staging-b10-place-${item.sourceOrder}`,
  entityType: 'place',
  workflowStatus: 'staging',
  sourceHints: [SOURCE_ID, `B10 · ${item.label}`],
  extractionNotes:
    'Libellé factuel de la liste numérique de B10 ; aucune image ni coordonnée n’est extraite.',
  payload: {
    mapId: MAP_ID,
    sourceOrder: item.sourceOrder,
    label: item.label,
    kind: item.kind,
    matchedPlaceId: item.placeId,
    review: item.placeId
      ? {
          status: 'reviewed',
          reviewedAt: REVIEWED_AT,
          sourceReference: `B10 · ${item.label}`,
          entityIdsVerified: true
        }
      : {
          status: 'pending',
          sourceReference: `B10 · ${item.label}`,
          entityIdsVerified: false
        }
  }
}));

const report = {
  generatedAt: `${REVIEWED_AT}T00:00:00.000Z`,
  sourceId: SOURCE_ID,
  mapId: MAP_ID,
  policy: {
    imageCopied: false,
    coordinatesChanged: false,
    routesCreated: 0,
    sourceMapCertainty:
      'unknown lorsque le symbole cartographique n’est pas exposé dans le texte numérique'
  },
  counts: {
    sourceLabels: inventory.length,
    matchedLabels: inventory.filter(item => item.status === 'matched').length,
    missingLabels: inventory.filter(item => item.status === 'missing').length,
    matchedWithoutCoordinates: inventory.filter(
      item => item.status === 'matched' && item.hasCoordinates === false
    ).length,
    placeLinks: placeLinks.length,
    eventLinks: eventLinks.length,
    presenceEpisodesReused: unique(
      eventLinks.flatMap(link => link.presenceEpisodeIds ?? [])
    ).length,
    routesCreated: 0
  },
  inventory
};

await mkdir(join(CONTENT_ROOT, 'reviewed', 'geography'), {
  recursive: true
});
await mkdir(join(CONTENT_ROOT, 'generated'), { recursive: true });
await writeFile(
  join(CONTENT_ROOT, 'staging', 'b10-israel-temps-jesus.json'),
  serialize(staging),
  'utf8'
);
await writeFile(
  join(
    CONTENT_ROOT,
    'reviewed',
    'geography',
    'b10-israel-temps-jesus.json'
  ),
  serialize(geographicLinks),
  'utf8'
);
await writeFile(
  join(CONTENT_ROOT, 'generated', 'b10-geography-report.json'),
  serialize(report),
  'utf8'
);

console.log(
  `B10 préparé : ${report.counts.matchedLabels}/${report.counts.sourceLabels} libellés rapprochés, ` +
    `${report.counts.eventLinks} événement(s) relié(s), ` +
    `${report.counts.presenceEpisodesReused} présence(s) réutilisée(s), aucune route créée.`
);
