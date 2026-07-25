import {
  mkdir,
  readFile,
  writeFile
} from 'node:fs/promises';
import {
  join,
  resolve
} from 'node:path';
import { A7_A } from './a7-data/a7-a.mjs';
import { A7_C } from './a7-data/a7-c.mjs';
import { A7_D } from './a7-data/a7-d.mjs';
import { A7_E } from './a7-data/a7-e.mjs';
import { A7_F } from './a7-data/a7-f.mjs';
import { A7_G } from './a7-data/a7-g.mjs';
import { A7_H } from './a7-data/a7-h.mjs';
import {
  JESUS_ID,
  JOHN_BAPTIST_ID,
  PERSON_DEFINITIONS
} from './a7-data/common.mjs';
import { findEventReconciliationCandidates } from '../src/domain/history/eventReconciliation.ts';
import { promoteReviewedStagingEvents } from '../src/domain/history/stagingPromotion.ts';

const REVIEWED_AT = '2026-07-25';
const contentRoot = resolve(process.cwd(), 'content');
const appendices = [A7_A, A7_C, A7_D, A7_E, A7_F, A7_G, A7_H];
const selectedAppendix = process.argv.includes('--appendix')
  ? process.argv[process.argv.indexOf('--appendix') + 1]?.toLowerCase()
  : undefined;
const selected = selectedAppendix
  ? appendices.filter(appendix => appendix.code === selectedAppendix)
  : appendices;

if (selectedAppendix && selected.length !== 1) {
  throw new Error(`Appendice inconnu : ${selectedAppendix}.`);
}

const parseJson = async filePath =>
  JSON.parse(await readFile(filePath, 'utf8'));

const serialize = value => `${JSON.stringify(value, null, 2)}\n`;

const unique = values => [...new Set(values)];

const presenceTypeFor = (appendixCode, eventId, personId) => {
  if (appendixCode === 'a7-a') {
    if (eventId === 'vie-nazareth') return 'resident';
    if (eventId === 'debut-ministere-jean') return 'ministry';
    if (personId === JOHN_BAPTIST_ID) return 'resident';
    return 'traveler';
  }
  if (personId === JESUS_ID) return 'ministry';
  if (
    personId === JOHN_BAPTIST_ID &&
    (eventId.includes('prison') || eventId.includes('mort'))
  ) {
    return 'imprisonment';
  }
  return 'visitor';
};

const createStagingRecords = appendix =>
  appendix.events.map((event, index) => {
    const eventId = `event-${appendix.code}-${event.id}`;
    const placeMentions = event.places.map(place => ({ ...place }));
    const participantMentions = event.participants.map(participant => ({
      ...participant
    }));
    const participations = participantMentions
      .filter(participant => participant.personId)
      .map(participant => ({
        personId: participant.personId,
        certainty: participant.certainty
      }));
    const explicitPlaceIds = unique(
      placeMentions.flatMap(place => place.placeId ? [place.placeId] : [])
    );
    const automaticPresences = (event.presencePersonIds ?? []).flatMap(
      personId =>
        explicitPlaceIds.map(placeId => ({
          personId,
          placeId,
          presenceType: presenceTypeFor(
            appendix.code,
            event.id,
            personId
          ),
          certainty:
            placeMentions.find(place => place.placeId === placeId)?.certainty ??
            'certain'
        }))
    );
    const presences = [
      ...automaticPresences,
      ...event.extraPresences
    ].filter(
      (presence, presenceIndex, values) =>
        values.findIndex(
          candidate =>
            candidate.personId === presence.personId &&
            candidate.placeId === presence.placeId
        ) === presenceIndex
    );

    return {
      id: `staging-${appendix.code}-${String(index + 1).padStart(2, '0')}-${event.id}`,
      entityType: 'event',
      workflowStatus: 'staging',
      sourceHints: [appendix.sourceId],
      extractionNotes:
        `${appendix.chapterOrAppendix}, tableau, ligne ${index + 1}.`,
      payload: {
        dateText: event.period.displayLabel,
        placeText: placeMentions.map(place => place.label).join(' ; '),
        eventText: event.description,
        biblicalReferences: event.biblicalReferences,
        certainty: event.certainty,
        period: event.period,
        review: {
          status: 'reviewed',
          reviewedAt: REVIEWED_AT,
          sourceReference:
            `${appendix.chapterOrAppendix}, tableau, ligne ${index + 1}.`,
          entityIdsVerified: true
        },
        candidate: {
          event: {
            id: eventId,
            name: event.name,
            period: event.period,
            sourceOrder: index + 1,
            category: 'Événements Marquants',
            description: event.description,
            certainty: event.certainty,
            placeMentions,
            participantMentions,
            ...(event.supersedesLegacyEventIds.length
              ? {
                  supersedesLegacyEventIds:
                    event.supersedesLegacyEventIds
                }
              : {}),
            notes:
              `Ligne factuelle relue de ${appendix.chapterOrAppendix}.`
          },
          participations,
          presences,
          ...(event.interactions.length
            ? {
                interactions: event.interactions.map(
                  ([subjectId, objectPersonId]) => ({
                    subjectId,
                    objectPersonId,
                    certainty: 'certain'
                  })
                )
              }
            : {})
        },
        ...(event.unresolvedItems.length
          ? { unresolvedItems: event.unresolvedItems }
          : {})
      }
    };
  });

const sourceCatalogPath = join(
  contentRoot,
  'sources',
  'source-catalog.json'
);
const sourceCatalog = await parseJson(sourceCatalogPath);
const reviewedByAppendix = new Map();
const reports = [];

await Promise.all([
  mkdir(join(contentRoot, 'reviewed', 'events'), { recursive: true }),
  mkdir(join(contentRoot, 'reviewed', 'claims'), { recursive: true }),
  mkdir(join(contentRoot, 'reviewed', 'presences'), { recursive: true }),
  mkdir(join(contentRoot, 'reviewed', 'people'), { recursive: true }),
  mkdir(join(contentRoot, 'reviewed', 'routes'), { recursive: true }),
  mkdir(join(contentRoot, 'generated', 'import-reports'), {
    recursive: true
  })
]);

for (const appendix of selected) {
  const staging = createStagingRecords(appendix);
  const stagingPath = join(contentRoot, 'staging', appendix.stagingFile);
  await writeFile(stagingPath, serialize(staging), 'utf8');

  const promotion = promoteReviewedStagingEvents(staging, sourceCatalog);
  reviewedByAppendix.set(appendix.code, promotion.events);

  await Promise.all([
    writeFile(
      join(
        contentRoot,
        'reviewed',
        'events',
        `${appendix.code}-events.json`
      ),
      serialize(promotion.events),
      'utf8'
    ),
    writeFile(
      join(
        contentRoot,
        'reviewed',
        'claims',
        `${appendix.code}-claims.json`
      ),
      serialize(promotion.claims),
      'utf8'
    ),
    writeFile(
      join(
        contentRoot,
        'reviewed',
        'presences',
        `${appendix.code}-presences.json`
      ),
      serialize(promotion.presences),
      'utf8'
    )
  ]);

  const participantIds = unique(
    promotion.events.flatMap(record =>
      (record.event.participantMentions ?? []).flatMap(participant =>
        participant.personId ? [participant.personId] : []
      )
    )
  );
  const placeIds = unique(
    promotion.events.flatMap(record =>
      (record.event.placeMentions ?? []).flatMap(place =>
        place.placeId ? [place.placeId] : []
      )
    )
  );
  reports.push({
    appendix: appendix.chapterOrAppendix,
    sourceId: appendix.sourceId,
    sourceUrl: appendix.url,
    reviewedAt: REVIEWED_AT,
    counts: {
      stagingRecords: staging.length,
      reviewedEvents: promotion.events.length,
      explicitPeople: participantIds.length,
      identifiedPlaces: placeIds.length,
      biblicalReferences: unique(
        promotion.events.flatMap(
          record => record.event.biblicalReferences ?? []
        )
      ).length,
      claims: promotion.claims.length,
      presences: promotion.presences.length,
      directInteractions: promotion.claims.filter(
        claim => claim.predicate === 'attested-interaction'
      ).length,
      unresolvedItems: promotion.unresolvedItems.length
    },
    unresolvedItems: promotion.unresolvedItems
  });

  console.log(
    `${appendix.chapterOrAppendix} relu : ` +
      `${promotion.events.length} événement(s), ` +
      `${promotion.presences.length} présence(s), ` +
      `${promotion.unresolvedItems.length} point(s) à vérifier.`
  );
}

if (selectedAppendix) {
  process.exit(0);
}

const existingBEvents = await parseJson(
  join(contentRoot, 'reviewed', 'events', 'a7-b-events.json')
);
reviewedByAppendix.set('a7-b', existingBEvents);

const allAppendixMetadata = [
  {
    code: 'a7-b',
    sourceId: 'source-nwtsty-a7-b',
    chapterOrAppendix: 'Appendice A7-B'
  },
  ...appendices
].sort((left, right) => left.code.localeCompare(right.code));
const allReviewedEvents = allAppendixMetadata.flatMap(
  appendix => reviewedByAppendix.get(appendix.code) ?? []
);

const generatedPeople = Object.entries(PERSON_DEFINITIONS)
  .map(([personId, [name, alternateNames]]) => {
    const related = allReviewedEvents.filter(record =>
      record.event.participantMentions?.some(
        participant => participant.personId === personId
      )
    );
    if (!related.length) return undefined;
    const sourceIds = unique(related.flatMap(record => record.sourceIds));
    const associatedEventIds = related.map(record => record.event.id);
    const associatedLocationIds = unique(
      related.flatMap(record =>
        (record.event.placeMentions ?? []).flatMap(place =>
          place.placeId ? [place.placeId] : []
        )
      )
    );
    const biblicalReferences = unique(
      related.flatMap(record => record.event.biblicalReferences ?? [])
    );
    return {
      workflowStatus: 'reviewed',
      sourceIds,
      person: {
        id: personId,
        name,
        alternateNames,
        activityPeriods: [],
        associatedEventIds,
        associatedLocationIds,
        biblicalReferences,
        certainty: 'certain',
        notes:
          'Personne créée uniquement à partir de mentions explicites dans les tableaux A7.',
        lastVerified: REVIEWED_AT
      }
    };
  })
  .filter(Boolean)
  .sort((left, right) => left.person.id.localeCompare(right.person.id));

await writeFile(
  join(contentRoot, 'reviewed', 'people', 'a7-people.json'),
  serialize(generatedPeople),
  'utf8'
);

const createRoute = appendix => {
  const events = reviewedByAppendix.get(appendix.code) ?? [];
  const ordered = [...events].sort(
    (left, right) =>
      (left.event.sourceOrder ?? 0) - (right.event.sourceOrder ?? 0)
  );
  const orderedPlaceIds = ordered.flatMap(record =>
    (record.event.placeMentions ?? []).flatMap(place =>
      place.placeId ? [place.placeId] : []
    )
  );
  const placeIds = orderedPlaceIds.filter(
    (placeId, index) => index === 0 || placeId !== orderedPlaceIds[index - 1]
  );
  if (new Set(placeIds).size < 2) return undefined;
  const firstPeriod = ordered.find(record => record.event.period)?.event.period;
  const lastPeriod = [...ordered]
    .reverse()
    .find(record => record.event.period)?.event.period;
  return {
    workflowStatus: 'reviewed',
    sourceIds: [appendix.sourceId],
    route: {
      id: `route-${appendix.code}-chronologie`,
      name: `${appendix.chapterOrAppendix} · déplacements documentés`,
      description:
        'Suite indicative des lieux cités dans l’ordre du tableau. Les segments droits ne représentent pas le chemin réellement emprunté.',
      ...(firstPeriod && lastPeriod
        ? {
            period: {
              start: firstPeriod.start,
              end: lastPeriod.end,
              displayLabel:
                firstPeriod.displayLabel === lastPeriod.displayLabel
                  ? firstPeriod.displayLabel
                  : `${firstPeriod.displayLabel} – ${lastPeriod.displayLabel}`
            }
          }
        : {}),
      placeIds,
      associatedEventIds: ordered.map(record => record.event.id),
      biblicalReferences: unique(
        ordered.flatMap(record => record.event.biblicalReferences ?? [])
      ),
      certainty: 'certain',
      geometryPrecision: 'schematic',
      notForExactNavigation: true,
      notes:
        'La publication précise que les flèches indiquent seulement les directions prises et non des itinéraires exacts.'
    }
  };
};

const routes = allAppendixMetadata
  .map(createRoute)
  .filter(Boolean)
  .sort((left, right) => left.route.id.localeCompare(right.route.id));

await writeFile(
  join(contentRoot, 'reviewed', 'routes', 'a7-routes.json'),
  serialize(routes),
  'utf8'
);

const reconciliationCandidates =
  findEventReconciliationCandidates(allReviewedEvents);
const reportByCode = new Map(
  reports.map(report => [
    report.appendix.toLowerCase().replace('appendice ', ''),
    report
  ])
);
const existingBReport = await parseJson(
  join(contentRoot, 'generated', 'import-reports', 'a7-b.json')
);
const coverage = {
  generatedAt: `${REVIEWED_AT}T00:00:00.000Z`,
  scope: 'Appendices A7-A à A7-H',
  policy: {
    extraction: 'appendice-par-appendice',
    longTextCopied: false,
    imagesCopied: false,
    routeGeometry: 'schematic',
    automaticMerge: false
  },
  appendices: allAppendixMetadata.map(appendix => {
    if (appendix.code === 'a7-b') {
      return {
        appendix: 'Appendice A7-B',
        sourceId: appendix.sourceId,
        counts: {
          stagingRecords: existingBReport.counts.stagingRecords,
          reviewedEvents: existingBReport.counts.events,
          explicitPeople: existingBReport.counts.people,
          identifiedPlaces: existingBReport.counts.placesWithStableIds,
          biblicalReferences: unique(
            existingBEvents.flatMap(
              record => record.event.biblicalReferences ?? []
            )
          ).length,
          claims: existingBReport.counts.claims,
          presences: existingBReport.counts.presences,
          directInteractions: existingBReport.counts.derivedRelations,
          unresolvedItems: existingBReport.counts.unresolvedItems
        },
        unresolvedItems: existingBReport.unresolvedItems
      };
    }
    return reportByCode.get(appendix.code);
  }),
  totals: {
    events: allReviewedEvents.length,
    people: unique(
      allReviewedEvents.flatMap(record =>
        (record.event.participantMentions ?? []).flatMap(participant =>
          participant.personId ? [participant.personId] : []
        )
      )
    ).length,
    places: unique(
      allReviewedEvents.flatMap(record =>
        (record.event.placeMentions ?? []).flatMap(place =>
          place.placeId ? [place.placeId] : []
        )
      )
    ).length,
    routes: routes.length,
    newPeopleRecords: generatedPeople.length
  },
  reconciliation: {
    strategy:
      'ID stable, références bibliques, période, titre normalisé et lieux associés.',
    automaticMerge: false,
    candidates: reconciliationCandidates
  }
};

for (const report of reports) {
  const code = report.appendix.toLowerCase().replace('appendice ', '');
  const route = routes.find(candidate => candidate.route.id.includes(code));
  await writeFile(
    join(contentRoot, 'generated', 'import-reports', `${code}.json`),
    serialize({
      ...report,
      routeId: route?.route.id,
      derivedRelationsGeneratedSeparately: true
    }),
    'utf8'
  );
}

await writeFile(
  join(contentRoot, 'generated', 'import-reports', 'a7-coverage.json'),
  serialize(coverage),
  'utf8'
);

console.log(
  `Calendrier A7 préparé : ${allReviewedEvents.length} événement(s), ` +
    `${generatedPeople.length} nouvelle(s) personne(s), ` +
    `${routes.length} itinéraire(s) schématique(s).`
);
