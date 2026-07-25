import {
  mkdir,
  writeFile
} from 'node:fs/promises';
import {
  dirname,
  join
} from 'node:path';
import { generateDerivedHistoricalRelations } from '../src/domain/history/contentGeneration.ts';
import { loadHistoricalDataset } from '../src/domain/history/contentIO.ts';
import {
  promoteReviewedStagingEvents
} from '../src/domain/history/stagingPromotion.ts';
import { loadKnownApplicationEntities } from './historical-script-utils.mjs';

const getArgument = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const sourceId = getArgument('--source') ?? 'source-nwtsty-a7-b';
const outputPath = getArgument('--output') ??
  'content/generated/import-reports/a7-b.json';
const contentRoot = join(process.cwd(), 'content');

const uniqueSorted = values =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const dataset = await loadHistoricalDataset(contentRoot);
const source = dataset.sources.find(candidate => candidate.id === sourceId);
if (!source) {
  throw new Error(`Source introuvable : ${sourceId}.`);
}

const sourceEvents = dataset.events.filter(record =>
  record.sourceIds.includes(sourceId)
);
const sourcePeople = dataset.people.filter(record =>
  record.sourceIds.includes(sourceId)
);
const sourceClaims = dataset.claims.filter(claim =>
  claim.evidence.some(evidence => evidence.sourceId === sourceId)
);
const sourceClaimIds = new Set(sourceClaims.map(claim => claim.id));
const sourceEventIds = new Set(
  sourceEvents.map(record => record.event.id)
);
const sourcePresences = dataset.presences.filter(presence =>
  presence.supportingClaimIds.some(claimId => sourceClaimIds.has(claimId))
);
const relations = generateDerivedHistoricalRelations(dataset).filter(
  relation =>
    relation.supportingClaimIds.some(claimId => sourceClaimIds.has(claimId))
);
const known = await loadKnownApplicationEntities();
const knownPlaceIds = new Set(known.placeIds ?? []);
const placeMentions = sourceEvents.flatMap(
  record => record.event.placeMentions ?? []
);
const distinctPlaces = uniqueSorted(
  placeMentions.map(mention => mention.placeId ?? `label:${mention.label}`)
);
const mapReadyPlaceIds = uniqueSorted(
  placeMentions.flatMap(mention =>
    mention.placeId && knownPlaceIds.has(mention.placeId)
      ? [mention.placeId]
      : []
  )
);
const sourceStaging = dataset.staging.filter(record =>
  record.sourceHints?.includes(sourceId)
);
const promotion = promoteReviewedStagingEvents(
  sourceStaging,
  dataset.sources
);

const report = {
  sourceId,
  sourceTitle: source.title,
  generatedAt: `${source.accessedAt ?? '1970-01-01'}T00:00:00.000Z`,
  counts: {
    events: sourceEvents.length,
    people: sourcePeople.length,
    places: distinctPlaces.length,
    placesWithStableIds: distinctPlaces.filter(
      value => !value.startsWith('label:')
    ).length,
    mapReadyPlaces: mapReadyPlaceIds.length,
    claims: sourceClaims.length,
    presences: sourcePresences.length,
    derivedRelations: relations.length,
    stagingRecords: sourceStaging.length,
    reviewedStagingRecords: promotion.promotedRecordIds.length,
    pendingStagingRecords: promotion.skippedRecordIds.length,
    unresolvedItems: promotion.unresolvedItems.length
  },
  eventIds: [...sourceEventIds].sort(),
  personIds: sourcePeople.map(record => record.person.id).sort(),
  placeKeys: distinctPlaces,
  mapReadyPlaceIds,
  relationIds: relations.map(relation => relation.id).sort(),
  unresolvedItems: promotion.unresolvedItems
};

if (process.argv.includes('--write')) {
  const absoluteOutput = join(process.cwd(), outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(
    absoluteOutput,
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );
}

console.log(
  [
    `Rapport ${source.chapterOrAppendix ?? source.id}`,
    `${report.counts.events} événement(s)`,
    `${report.counts.people} personne(s)`,
    `${report.counts.places} lieu(x) ou région(s)`,
    `${report.counts.mapReadyPlaces} point(s) cartographique(s) prêt(s)`,
    `${report.counts.presences} présence(s)`,
    `${report.counts.derivedRelations} relation(s) dérivée(s)`,
    `${report.counts.unresolvedItems} point(s) à vérifier`
  ].join(' · ')
);
