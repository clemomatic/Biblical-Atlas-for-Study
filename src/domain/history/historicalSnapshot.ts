import type { CertaintyLevel, TimelinePeriod } from '../../types.ts';
import {
  findActivitiesDuring,
  findDocumentedPresences,
  findEventEntriesDuring,
  findLifespansDuring,
  findRelationsDuring,
  type HistoricalIndexBundle
} from './historicalIndex.ts';
import {
  formatHistoricalYearFrench,
  timelineIndexToHistoricalYear
} from './temporal.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  HistoricalDataset,
  HistoricalEvidence,
  ReviewedEventRecord,
  ReviewedPersonRecord,
  ReviewedPlaceRecord,
  SourceCatalogEntry
} from './contentTypes.ts';
import type {
  BiblicalPerson,
  PersonActivityType,
  TemporalSpan
} from './types.ts';

export type HistoricalKnowledgeLevel =
  | 'attested'
  | 'calculated'
  | 'probable'
  | 'possible'
  | 'unknown-location';

export interface HistoricalSnapshotPerson {
  personId: string;
  name: string;
  certainty: CertaintyLevel;
  knowledgeLevel: HistoricalKnowledgeLevel;
  periodLabel?: string;
  activityType?: PersonActivityType;
  activityLabel?: string;
  supportingClaimIds: string[];
}

export interface HistoricalSnapshotEvent {
  eventId: string;
  name: string;
  certainty: CertaintyLevel;
  knowledgeLevel: HistoricalKnowledgeLevel;
  periodLabel: string;
  placeIds: string[];
  participantIds: string[];
  supportingClaimIds: string[];
}

export interface HistoricalSnapshotPresencePerson {
  presenceId: string;
  personId: string;
  name: string;
  presenceType: string;
  certainty: CertaintyLevel;
  knowledgeLevel: HistoricalKnowledgeLevel;
  periodLabel: string;
  eventIds: string[];
  supportingClaimIds: string[];
}

export interface HistoricalSnapshotPresenceGroup {
  placeId: string;
  placeName: string;
  people: HistoricalSnapshotPresencePerson[];
}

export interface HistoricalSnapshotProofEvidence {
  sourceId: string;
  sourceTitle: string;
  sourceUrl?: string;
  shortReference: string;
  method: HistoricalEvidence['method'];
  humanReviewStatus: HistoricalEvidence['humanReviewStatus'];
}

export interface HistoricalSnapshotProof {
  claimId: string;
  predicate: HistoricalClaim['predicate'];
  certainty: CertaintyLevel;
  evidence: HistoricalSnapshotProofEvidence[];
}

export interface HistoricalSnapshotConnection {
  relationId: string;
  relationLevel: DerivedHistoricalRelation['relationLevel'];
  title: string;
  explanation: string;
  subjectIds: string[];
  subjectNames: string[];
  placeIds: string[];
  placeNames: string[];
  eventIds: string[];
  eventNames: string[];
  certainty: CertaintyLevel;
  knowledgeLevel: HistoricalKnowledgeLevel;
  periodLabel?: string;
  supportingClaimIds: string[];
  proofs: HistoricalSnapshotProof[];
}

export interface HistoricalSnapshotUnknownLocation {
  id: string;
  personId: string;
  personName: string;
  eventId?: string;
  eventName?: string;
  knowledgeLevel: 'unknown-location';
  explanation: string;
}

export interface HistoricalSnapshot {
  period: TemporalSpan;
  isBroadPeriod: boolean;
  peopleLiving: HistoricalSnapshotPerson[];
  peopleActive: HistoricalSnapshotPerson[];
  events: HistoricalSnapshotEvent[];
  presences: HistoricalSnapshotPresenceGroup[];
  connections: HistoricalSnapshotConnection[];
  unknownLocations: HistoricalSnapshotUnknownLocation[];
  uncertainResultCount: number;
}

export interface HistoricalSnapshotCatalog {
  index: HistoricalIndexBundle;
  relations: DerivedHistoricalRelation[];
  peopleById: Map<string, ReviewedPersonRecord>;
  eventsById: Map<string, ReviewedEventRecord>;
  placesById: Map<string, ReviewedPlaceRecord>;
  placeNamesById: Map<string, string>;
  claimsById: Map<string, HistoricalClaim>;
  sourcesById: Map<string, SourceCatalogEntry>;
}

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const knowledgeLevelFromCertainty = (
  certainty: CertaintyLevel,
  certainLevel: Extract<
    HistoricalKnowledgeLevel,
    'attested' | 'calculated'
  >
): HistoricalKnowledgeLevel => {
  if (certainty === 'certain') return certainLevel;
  if (certainty === 'probable') return 'probable';
  return 'possible';
};

const getPersonName = (
  catalog: HistoricalSnapshotCatalog,
  personId: string
): string => catalog.peopleById.get(personId)?.person.name ?? personId;

const getEventName = (
  catalog: HistoricalSnapshotCatalog,
  eventId: string
): string => catalog.eventsById.get(eventId)?.event.name ?? eventId;

const getPlaceName = (
  catalog: HistoricalSnapshotCatalog,
  placeId: string
): string => catalog.placeNamesById.get(placeId) ?? placeId;

const buildProofs = (
  catalog: HistoricalSnapshotCatalog,
  claimIds: string[]
): HistoricalSnapshotProof[] =>
  uniqueSorted(claimIds).flatMap(claimId => {
    const claim = catalog.claimsById.get(claimId);
    if (!claim) return [];
    return [
      {
        claimId,
        predicate: claim.predicate,
        certainty: claim.certainty,
        evidence: claim.evidence.map(evidence => {
          const source = catalog.sourcesById.get(evidence.sourceId);
          return {
            sourceId: evidence.sourceId,
            sourceTitle:
              source?.chapterOrAppendix ??
              source?.title ??
              evidence.sourceId,
            sourceUrl: source?.url,
            shortReference: evidence.shortReference,
            method: evidence.method,
            humanReviewStatus: evidence.humanReviewStatus
          };
        })
      }
    ];
  });

export const timelinePeriodToTemporalSpan = (
  period: TimelinePeriod
): TemporalSpan => {
  const startIndex = Math.floor(
    Math.min(period.startYear, period.endYear)
  );
  const endIndex = Math.floor(
    Math.max(period.startYear, period.endYear)
  );
  const startYear = timelineIndexToHistoricalYear(startIndex);
  const endYear = timelineIndexToHistoricalYear(endIndex);
  const startLabel = formatHistoricalYearFrench(startYear);
  const endLabel = formatHistoricalYearFrench(endYear);

  return {
    start: {
      yearMin: startYear,
      yearMax: startYear,
      precision: 'year',
      certainty: 'certain'
    },
    end: {
      yearMin: endYear,
      yearMax: endYear,
      precision: 'year',
      certainty: 'certain'
    },
    displayLabel:
      startYear === endYear ? startLabel : `${startLabel} – ${endLabel}`
  };
};

export const createHistoricalSnapshotCatalog = (
  dataset: Pick<
    HistoricalDataset,
    'people' | 'events' | 'places' | 'claims' | 'sources'
  >,
  index: HistoricalIndexBundle,
  relations: DerivedHistoricalRelation[],
  options: {
    placeNames?: Iterable<{ id: string; name: string }>;
  } = {}
): HistoricalSnapshotCatalog => ({
  index,
  relations,
  peopleById: new Map(
    dataset.people.map(record => [record.person.id, record])
  ),
  eventsById: new Map(
    dataset.events.map(record => [record.event.id, record])
  ),
  placesById: new Map(
    dataset.places.map(record => [record.place.id, record])
  ),
  placeNamesById: new Map([
    ...dataset.places.map(
      record => [record.place.id, record.place.name] as const
    ),
    ...[...(options.placeNames ?? [])].map(
      place => [place.id, place.name] as const
    )
  ]),
  claimsById: new Map(dataset.claims.map(claim => [claim.id, claim])),
  sourcesById: new Map(dataset.sources.map(source => [source.id, source]))
});

const createConnection = (
  catalog: HistoricalSnapshotCatalog,
  relation: DerivedHistoricalRelation
): HistoricalSnapshotConnection => {
  const subjectNames = relation.subjectIds.map(id =>
    getPersonName(catalog, id)
  );
  const placeNames = (relation.placeIds ?? []).map(id =>
    getPlaceName(catalog, id)
  );
  const eventNames = (relation.eventIds ?? []).map(id =>
    getEventName(catalog, id)
  );
  const joinedSubjects = subjectNames.join(' et ');

  const copyByLevel: Record<
    'documented-interaction' | 'same-event' | 'same-place',
    { title: string; explanation: string }
  > = {
    'documented-interaction': {
      title: `Interaction attestée entre ${joinedSubjects}`,
      explanation:
        'Une affirmation directe et relue documente cette interaction.'
    },
    'same-event': {
      title: `${joinedSubjects} dans le même événement`,
      explanation:
        'Cette connexion est calculée à partir de participations explicites au même événement ; elle ne prouve pas à elle seule un échange direct.'
    },
    'same-place': {
      title: `${joinedSubjects} au même endroit`,
      explanation:
        'Cette connexion est calculée à partir d’épisodes de présence documentés qui se chevauchent dans ce lieu.'
    }
  };
  const copy =
    copyByLevel[
      relation.relationLevel as keyof typeof copyByLevel
    ];

  return {
    relationId: relation.id,
    relationLevel: relation.relationLevel,
    title: copy?.title ?? joinedSubjects,
    explanation:
      copy?.explanation ??
      'Cette relation est issue des données validées et du moteur historique.',
    subjectIds: relation.subjectIds,
    subjectNames,
    placeIds: relation.placeIds ?? [],
    placeNames,
    eventIds: relation.eventIds ?? [],
    eventNames,
    certainty: relation.certainty,
    knowledgeLevel: knowledgeLevelFromCertainty(
      relation.certainty,
      relation.relationLevel === 'documented-interaction'
        ? 'attested'
        : 'calculated'
    ),
    periodLabel: relation.temporalOverlap?.displayLabel,
    supportingClaimIds: relation.supportingClaimIds,
    proofs: buildProofs(catalog, relation.supportingClaimIds)
  };
};

export const buildHistoricalSnapshot = (
  catalog: HistoricalSnapshotCatalog,
  period: TemporalSpan
): HistoricalSnapshot => {
  const lifespanEntries = findLifespansDuring(catalog.index, period);
  const activityEntries = findActivitiesDuring(catalog.index, period);
  const eventEntries = findEventEntriesDuring(catalog.index, period);
  const presenceEntries = findDocumentedPresences(catalog.index, period);
  const relations = findRelationsDuring(
    catalog.index,
    catalog.relations,
    period,
    ['same-place', 'same-event', 'documented-interaction']
  );

  const peopleLiving = lifespanEntries
    .map(entry => ({
      personId: entry.personId,
      name: getPersonName(catalog, entry.personId),
      certainty: entry.certainty,
      knowledgeLevel: knowledgeLevelFromCertainty(
        entry.certainty,
        'calculated'
      ),
      periodLabel:
        catalog.peopleById.get(entry.personId)?.person.lifeSpan
          ?.displayLabel,
      supportingClaimIds: entry.supportingClaimIds
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const activityResults = activityEntries.map(entry => {
    const person = catalog.peopleById.get(entry.personId)?.person;
    const activity = person?.activityPeriods.find(
      candidate => candidate.id === entry.activityId
    );
    return {
      personId: entry.personId,
      name: getPersonName(catalog, entry.personId),
      certainty: entry.certainty,
      knowledgeLevel: knowledgeLevelFromCertainty(
        entry.certainty,
        'calculated'
      ),
      periodLabel: activity?.span.displayLabel,
      activityType: entry.activityType,
      activityLabel: activity?.label,
      supportingClaimIds: entry.supportingClaimIds
    };
  });

  const ministryPresenceResults = presenceEntries
    .filter(entry => entry.presenceType === 'ministry')
    .map(entry => ({
      personId: entry.personId,
      name: getPersonName(catalog, entry.personId),
      certainty: entry.certainty,
      knowledgeLevel: knowledgeLevelFromCertainty(
        entry.certainty,
        'attested'
      ),
      periodLabel:
        catalog.eventsById.get(entry.eventIds[0])?.event.period
          ?.displayLabel,
      activityType: 'ministry' as const,
      activityLabel: 'Ministère documenté',
      supportingClaimIds: entry.supportingClaimIds
    }));

  const peopleActive = [
    ...activityResults,
    ...ministryPresenceResults
  ]
    .filter(
      (entry, index, values) =>
        values.findIndex(
          candidate =>
            candidate.personId === entry.personId &&
            candidate.activityType === entry.activityType &&
            candidate.periodLabel === entry.periodLabel
        ) === index
    )
    .sort(
      (left, right) =>
        left.name.localeCompare(right.name) ||
        (left.periodLabel ?? '').localeCompare(right.periodLabel ?? '')
    );

  const events = eventEntries
    .flatMap(entry => {
      const record = catalog.eventsById.get(entry.eventId);
      if (!record) return [];
      return [
        {
          eventId: entry.eventId,
          name: record.event.name,
          certainty: entry.certainty,
          knowledgeLevel: knowledgeLevelFromCertainty(
            entry.certainty,
            'attested'
          ),
          periodLabel:
            record.event.period?.displayLabel ?? 'Période non précisée',
          placeIds: uniqueSorted(
            record.event.placeMentions?.flatMap(mention =>
              mention.placeId ? [mention.placeId] : []
            ) ?? []
          ),
          participantIds: uniqueSorted(
            record.event.participantMentions?.flatMap(mention =>
              mention.personId ? [mention.personId] : []
            ) ?? []
          ),
          supportingClaimIds: entry.supportingClaimIds
        }
      ];
    })
    .sort(
      (left, right) =>
        left.periodLabel.localeCompare(right.periodLabel) ||
        left.name.localeCompare(right.name)
    );

  const presenceGroups = new Map<
    string,
    HistoricalSnapshotPresencePerson[]
  >();
  presenceEntries.forEach(entry => {
    const presenceRecord = catalog.eventsById.get(entry.eventIds[0]);
    const person: HistoricalSnapshotPresencePerson = {
      presenceId: entry.id,
      personId: entry.personId,
      name: getPersonName(catalog, entry.personId),
      presenceType: entry.presenceType,
      certainty: entry.certainty,
      knowledgeLevel: knowledgeLevelFromCertainty(
        entry.certainty,
        'attested'
      ),
      periodLabel:
        presenceRecord?.event.period?.displayLabel ??
        period.displayLabel,
      eventIds: entry.eventIds,
      supportingClaimIds: entry.supportingClaimIds
    };
    presenceGroups.set(entry.placeId, [
      ...(presenceGroups.get(entry.placeId) ?? []),
      person
    ]);
  });

  const presences = [...presenceGroups.entries()]
    .map(([placeId, people]) => ({
      placeId,
      placeName: getPlaceName(catalog, placeId),
      people: people.sort(
        (left, right) =>
          left.name.localeCompare(right.name) ||
          left.periodLabel.localeCompare(right.periodLabel)
      )
    }))
    .sort((left, right) =>
      left.placeName.localeCompare(right.placeName)
    );

  const matchingPresenceByPersonAndEvent = new Set(
    presenceEntries.flatMap(entry =>
      entry.eventIds.map(eventId => `${entry.personId}:${eventId}`)
    )
  );
  const unknownLocations = events
    .flatMap(event =>
      event.participantIds.flatMap(personId => {
        if (
          matchingPresenceByPersonAndEvent.has(
            `${personId}:${event.eventId}`
          )
        ) {
          return [];
        }
        return [
          {
            id: `unknown-location:${personId}:${event.eventId}`,
            personId,
            personName: getPersonName(catalog, personId),
            eventId: event.eventId,
            eventName: event.name,
            knowledgeLevel: 'unknown-location' as const,
            explanation:
              'Aucun épisode de présence validé ne localise cette personne pour cet événement.'
          }
        ];
      })
    )
    .sort(
      (left, right) =>
        left.personName.localeCompare(right.personName) ||
        (left.eventName ?? '').localeCompare(right.eventName ?? '')
    );

  const intervalStart = period.start?.yearMin ?? period.start?.yearMax;
  const intervalEnd = period.end?.yearMax ?? period.end?.yearMin;
  const isBroadPeriod =
    intervalStart !== undefined &&
    intervalEnd !== undefined &&
    Math.abs(
      (intervalEnd < 0 ? intervalEnd : intervalEnd - 1) -
        (intervalStart < 0 ? intervalStart : intervalStart - 1)
    ) > 5;

  const connections = relations.map(relation =>
    createConnection(catalog, relation)
  );

  const uncertainResultCount = [
    ...peopleLiving,
    ...peopleActive,
    ...events,
    ...presences.flatMap(group => group.people),
    ...connections
  ].filter(
    item =>
      item.knowledgeLevel === 'probable' ||
      item.knowledgeLevel === 'possible'
  ).length;

  return {
    period,
    isBroadPeriod,
    peopleLiving,
    peopleActive,
    events,
    presences,
    connections,
    unknownLocations,
    uncertainResultCount
  };
};

export const mergeReviewedPeople = (
  legacyPeople: BiblicalPerson[],
  reviewedRecords: ReviewedPersonRecord[],
  sources: SourceCatalogEntry[]
): BiblicalPerson[] => {
  const sourcesById = new Map(sources.map(source => [source.id, source]));
  const people = new Map(
    legacyPeople.map(person => [person.id, person] as const)
  );

  reviewedRecords.forEach(record => {
    const existing = people.get(record.person.id);
    const sourceReferences = record.sourceIds.flatMap(sourceId => {
      const source = sourcesById.get(sourceId);
      if (!source) return [];
      return [
        {
          id: source.id,
          label: source.chapterOrAppendix ?? source.title,
          url: source.url,
          citation: `${source.publication} — ${
            source.pageOrSection ?? source.title
          }`
        }
      ];
    });
    people.set(record.person.id, {
      ...existing,
      ...record.person,
      alternateNames: uniqueSorted([
        ...(existing?.alternateNames ?? []),
        ...(record.person.alternateNames ?? [])
      ]),
      activityPeriods: record.person.activityPeriods.length
        ? record.person.activityPeriods
        : existing?.activityPeriods ?? [],
      sources: [
        ...(record.person.sources ?? existing?.sources ?? []),
        ...sourceReferences
      ].filter(
        (source, index, values) =>
          values.findIndex(candidate => candidate.id === source.id) === index
      )
    });
  });

  return [...people.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  );
};
