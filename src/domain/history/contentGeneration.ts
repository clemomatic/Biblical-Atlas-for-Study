import type { CertaintyLevel } from '../../types.ts';
import { createStableId } from '../../utils/stableIds.ts';
import {
  formatTemporalSpanFrench,
  getTemporalInterval,
  getTemporalOverlap
} from './temporal.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalClaim,
  HistoricalDataset,
  PresenceEpisode
} from './contentTypes.ts';
import type {
  BiblicalPerson,
  PersonActivityPeriod,
  TemporalBoundary,
  TemporalSpan
} from './types.ts';

const CERTAINTY_RANK: Record<CertaintyLevel, number> = {
  unknown: 0,
  possible: 1,
  probable: 2,
  certain: 3
};

const compareIds = <T extends { id: string }>(left: T, right: T): number =>
  left.id.localeCompare(right.id);

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const combineCertainty = (
  values: CertaintyLevel[],
  capAtPossible = false
): CertaintyLevel => {
  const knownValues: CertaintyLevel[] =
    values.length > 0 ? values : ['unknown'];
  const leastCertain = [...knownValues].sort(
    (left, right) => CERTAINTY_RANK[left] - CERTAINTY_RANK[right]
  )[0];
  if (
    capAtPossible &&
    CERTAINTY_RANK[leastCertain] > CERTAINTY_RANK.possible
  ) {
    return 'possible';
  }
  return leastCertain;
};

const createBoundary = (
  year: number,
  certainty: CertaintyLevel
): TemporalBoundary => ({
  yearMin: year,
  yearMax: year,
  precision: 'year',
  certainty
});

const createIntersectionSpan = (
  first: TemporalSpan,
  second: TemporalSpan,
  certainty: CertaintyLevel
): TemporalSpan | undefined => {
  const firstInterval = getTemporalInterval(first);
  const secondInterval = getTemporalInterval(second);
  if (firstInterval.unknown || secondInterval.unknown) return undefined;

  const yearMin =
    firstInterval.yearMin === undefined
      ? secondInterval.yearMin
      : secondInterval.yearMin === undefined
        ? firstInterval.yearMin
        : Math.max(firstInterval.yearMin, secondInterval.yearMin);
  const yearMax =
    firstInterval.yearMax === undefined
      ? secondInterval.yearMax
      : secondInterval.yearMax === undefined
        ? firstInterval.yearMax
        : Math.min(firstInterval.yearMax, secondInterval.yearMax);
  if (yearMin === undefined && yearMax === undefined) return undefined;

  const span: TemporalSpan = {
    start:
      yearMin === undefined ? undefined : createBoundary(yearMin, certainty),
    end: yearMax === undefined ? undefined : createBoundary(yearMax, certainty),
    displayLabel: ''
  };
  span.displayLabel = formatTemporalSpanFrench(span, {
    preferDisplayLabel: false
  });
  return span;
};

export function getDeterministicGenerationTimestamp(
  dataset: HistoricalDataset
): string {
  const latestAccessDate = dataset.sources
    .map(source => source.accessedAt)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
  return `${latestAccessDate ?? '1970-01-01'}T00:00:00.000Z`;
}

interface RelationInput {
  relationLevel: DerivedHistoricalRelation['relationLevel'];
  subjectIds: string[];
  certainty: CertaintyLevel;
  supportingClaimIds: string[];
  generatedFromIds: string[];
  generatedAt: string;
  temporalOverlap?: TemporalSpan;
  placeIds?: string[];
  regionIds?: string[];
  eventIds?: string[];
}

const createRelation = (input: RelationInput): DerivedHistoricalRelation => {
  const subjectIds = uniqueSorted(input.subjectIds);
  const supportingClaimIds = uniqueSorted(input.supportingClaimIds);
  const generatedFromIds = uniqueSorted(input.generatedFromIds);
  const placeIds = uniqueSorted(input.placeIds ?? []);
  const regionIds = uniqueSorted(input.regionIds ?? []);
  const eventIds = uniqueSorted(input.eventIds ?? []);
  const id = createStableId(
    'derived-relation',
    input.relationLevel,
    subjectIds.join(','),
    supportingClaimIds.join(','),
    generatedFromIds.join(','),
    placeIds.join(','),
    regionIds.join(','),
    eventIds.join(',')
  );

  return {
    id,
    subjectIds,
    origin: 'generated',
    relationLevel: input.relationLevel,
    temporalOverlap: input.temporalOverlap,
    placeIds: placeIds.length > 0 ? placeIds : undefined,
    regionIds: regionIds.length > 0 ? regionIds : undefined,
    eventIds: eventIds.length > 0 ? eventIds : undefined,
    certainty: input.certainty,
    supportingClaimIds,
    generatedFromIds,
    generatedAt: input.generatedAt,
    generator: {
      name: 'historical-relation-engine',
      version: '2'
    }
  };
};

const createTemporalRelation = (
  first: {
    personId: string;
    sourceId: string;
    span: TemporalSpan;
    certainty: CertaintyLevel;
    claimIds: string[];
  },
  second: {
    personId: string;
    sourceId: string;
    span: TemporalSpan;
    certainty: CertaintyLevel;
    claimIds: string[];
  },
  input: Omit<
    RelationInput,
    | 'subjectIds'
    | 'certainty'
    | 'supportingClaimIds'
    | 'generatedFromIds'
    | 'temporalOverlap'
  > & {
    forcePossible?: boolean;
  }
): DerivedHistoricalRelation | undefined => {
  if (
    first.personId === second.personId ||
    first.certainty === 'unknown' ||
    second.certainty === 'unknown'
  ) {
    return undefined;
  }
  const overlap = getTemporalOverlap(first.span, second.span);
  if (overlap === 'none' || overlap === 'unknown') return undefined;

  const certainty = combineCertainty(
    [first.certainty, second.certainty],
    overlap === 'possible' || input.forcePossible === true
  );
  return createRelation({
    ...input,
    subjectIds: [first.personId, second.personId],
    certainty,
    supportingClaimIds: [...first.claimIds, ...second.claimIds],
    generatedFromIds: [first.sourceId, second.sourceId],
    temporalOverlap: createIntersectionSpan(
      first.span,
      second.span,
      certainty
    )
  });
};

const generateLifespanRelations = (
  dataset: HistoricalDataset,
  generatedAt: string
): DerivedHistoricalRelation[] => {
  const people = dataset.people
    .map(record => record.person)
    .filter(
      (
        person
      ): person is BiblicalPerson & {
        lifeSpan: TemporalSpan;
        lifeSpanClaimIds: string[];
      } =>
        Boolean(person.lifeSpan) &&
        Boolean(person.lifeSpanClaimIds?.length) &&
        person.certainty !== 'unknown'
    )
    .sort(compareIds);
  const relations: DerivedHistoricalRelation[] = [];

  for (let firstIndex = 0; firstIndex < people.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < people.length;
      secondIndex += 1
    ) {
      const first = people[firstIndex];
      const second = people[secondIndex];
      const relation = createTemporalRelation(
        {
          personId: first.id,
          sourceId: `lifespan:${first.id}`,
          span: first.lifeSpan,
          certainty: first.certainty ?? 'unknown',
          claimIds: first.lifeSpanClaimIds
        },
        {
          personId: second.id,
          sourceId: `lifespan:${second.id}`,
          span: second.lifeSpan,
          certainty: second.certainty ?? 'unknown',
          claimIds: second.lifeSpanClaimIds
        },
        {
          relationLevel: 'lifespan-overlap',
          generatedAt
        }
      );
      if (relation) relations.push(relation);
    }
  }
  return relations;
};

const generateActivityRelations = (
  dataset: HistoricalDataset,
  generatedAt: string
): DerivedHistoricalRelation[] => {
  const activities = dataset.people
    .flatMap(record =>
      record.person.activityPeriods.map(activity => ({
        person: record.person,
        activity
      }))
    )
    .filter(
      (
        entry
      ): entry is {
        person: BiblicalPerson;
        activity: PersonActivityPeriod & { supportingClaimIds: string[] };
      } => Boolean(entry.activity.supportingClaimIds?.length)
    )
    .sort((left, right) => compareIds(left.activity, right.activity));
  const relations: DerivedHistoricalRelation[] = [];

  for (
    let firstIndex = 0;
    firstIndex < activities.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < activities.length;
      secondIndex += 1
    ) {
      const first = activities[firstIndex];
      const second = activities[secondIndex];
      const relation = createTemporalRelation(
        {
          personId: first.person.id,
          sourceId: first.activity.id,
          span: first.activity.span,
          certainty:
            first.activity.certainty ?? first.person.certainty ?? 'unknown',
          claimIds: first.activity.supportingClaimIds
        },
        {
          personId: second.person.id,
          sourceId: second.activity.id,
          span: second.activity.span,
          certainty:
            second.activity.certainty ?? second.person.certainty ?? 'unknown',
          claimIds: second.activity.supportingClaimIds
        },
        {
          relationLevel: 'activity-overlap',
          generatedAt
        }
      );
      if (relation) relations.push(relation);
    }
  }
  return relations;
};

const generatePresenceRelations = (
  dataset: HistoricalDataset,
  generatedAt: string
): DerivedHistoricalRelation[] => {
  const regionsByPlace = new Map(
    dataset.places.map(record => [
      record.place.id,
      uniqueSorted(record.place.regionIds ?? [])
    ])
  );
  const presences = [...dataset.presences].sort(compareIds);
  const relations: DerivedHistoricalRelation[] = [];

  for (let firstIndex = 0; firstIndex < presences.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < presences.length;
      secondIndex += 1
    ) {
      const first = presences[firstIndex];
      const second = presences[secondIndex];
      if (first.personId === second.personId) continue;

      const samePlace = first.placeId === second.placeId;
      const sharedRegions = samePlace
        ? []
        : (regionsByPlace.get(first.placeId) ?? []).filter(regionId =>
            (regionsByPlace.get(second.placeId) ?? []).includes(regionId)
          );
      if (!samePlace && sharedRegions.length === 0) continue;
      const sharedEventIds = (first.associatedEventIds ?? []).filter(eventId =>
        (second.associatedEventIds ?? []).includes(eventId)
      );

      const relation = createTemporalRelation(
        {
          personId: first.personId,
          sourceId: first.id,
          span: first.period,
          certainty: first.certainty,
          claimIds: first.supportingClaimIds
        },
        {
          personId: second.personId,
          sourceId: second.id,
          span: second.period,
          certainty: second.certainty,
          claimIds: second.supportingClaimIds
        },
        {
          relationLevel: samePlace ? 'same-place' : 'same-region',
          placeIds: samePlace ? [first.placeId] : [first.placeId, second.placeId],
          regionIds: sharedRegions,
          forcePossible: sharedEventIds.length === 0,
          eventIds: uniqueSorted([
            ...(first.associatedEventIds ?? []),
            ...(second.associatedEventIds ?? [])
          ]),
          generatedAt
        }
      );
      if (relation) relations.push(relation);
    }
  }
  return relations;
};

const hasDirectEvidence = (claim: HistoricalClaim): boolean =>
  claim.evidence.some(
    evidence =>
      evidence.method === 'direct' &&
      evidence.humanReviewStatus === 'reviewed'
  );

const getParticipationEventId = (
  claim: HistoricalClaim
): string | undefined => {
  if (claim.eventId) return claim.eventId;
  if (
    claim.object &&
    'entityType' in claim.object &&
    claim.object.entityType === 'event'
  ) {
    return claim.object.entityId;
  }
  return undefined;
};

const generateSameEventRelations = (
  dataset: HistoricalDataset,
  generatedAt: string
): DerivedHistoricalRelation[] => {
  const participationsByEvent = new Map<string, HistoricalClaim[]>();
  dataset.claims
    .filter(
      claim =>
        claim.predicate === 'participation' &&
        claim.subject.entityType === 'person' &&
        hasDirectEvidence(claim)
    )
    .forEach(claim => {
      const eventId = getParticipationEventId(claim);
      if (!eventId) return;
      participationsByEvent.set(eventId, [
        ...(participationsByEvent.get(eventId) ?? []),
        claim
      ]);
    });

  const relations: DerivedHistoricalRelation[] = [];
  [...participationsByEvent.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([eventId, claims]) => {
      const sortedClaims = [...claims].sort(compareIds);
      for (
        let firstIndex = 0;
        firstIndex < sortedClaims.length;
        firstIndex += 1
      ) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < sortedClaims.length;
          secondIndex += 1
        ) {
          const first = sortedClaims[firstIndex];
          const second = sortedClaims[secondIndex];
          if (first.subject.entityId === second.subject.entityId) continue;

          let temporalOverlap: TemporalSpan | undefined;
          let overlapIsPossible = false;
          if (first.period && second.period) {
            const overlap = getTemporalOverlap(first.period, second.period);
            if (overlap === 'none') continue;
            if (overlap !== 'unknown') {
              overlapIsPossible = overlap === 'possible';
              temporalOverlap = createIntersectionSpan(
                first.period,
                second.period,
                combineCertainty(
                  [first.certainty, second.certainty],
                  overlap === 'possible'
                )
              );
            }
          }
          relations.push(
            createRelation({
              relationLevel: 'same-event',
              subjectIds: [
                first.subject.entityId,
                second.subject.entityId
              ],
              eventIds: [eventId],
              placeIds: uniqueSorted(
                [first.placeId, second.placeId].filter(
                  (value): value is string => Boolean(value)
                )
              ),
              temporalOverlap,
              certainty: combineCertainty(
                [first.certainty, second.certainty],
                overlapIsPossible
              ),
              supportingClaimIds: [first.id, second.id],
              generatedFromIds: [first.id, second.id],
              generatedAt
            })
          );
        }
      }
    });
  return relations;
};

const generateDocumentedInteractions = (
  dataset: HistoricalDataset,
  generatedAt: string
): DerivedHistoricalRelation[] =>
  dataset.claims
    .filter(
      claim =>
        claim.predicate === 'attested-interaction' &&
        claim.subject.entityType === 'person' &&
        claim.object !== undefined &&
        'entityType' in claim.object &&
        claim.object.entityType === 'person' &&
        claim.object.entityId !== claim.subject.entityId &&
        hasDirectEvidence(claim)
    )
    .sort(compareIds)
    .map(claim =>
      createRelation({
        relationLevel: 'documented-interaction',
        subjectIds: [
          claim.subject.entityId,
          (
            claim.object as {
              entityType: 'person';
              entityId: string;
            }
          ).entityId
        ],
        placeIds: claim.placeId ? [claim.placeId] : undefined,
        eventIds: claim.eventId ? [claim.eventId] : undefined,
        temporalOverlap: claim.period,
        certainty: claim.certainty,
        supportingClaimIds: [claim.id],
        generatedFromIds: [claim.id],
        generatedAt
      })
    );

export function generateDerivedHistoricalRelations(
  dataset: HistoricalDataset
): DerivedHistoricalRelation[] {
  const generatedAt = getDeterministicGenerationTimestamp(dataset);
  const relations = [
    ...generateLifespanRelations(dataset, generatedAt),
    ...generateActivityRelations(dataset, generatedAt),
    ...generatePresenceRelations(dataset, generatedAt),
    ...generateSameEventRelations(dataset, generatedAt),
    ...generateDocumentedInteractions(dataset, generatedAt)
  ];

  const relationsById = new Map<string, DerivedHistoricalRelation>();
  relations.forEach(relation => relationsById.set(relation.id, relation));
  return [...relationsById.values()].sort(compareIds);
}
