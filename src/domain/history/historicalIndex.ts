import type { CertaintyLevel } from '../../types.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from './temporal.ts';
import {
  conservativeLifespanSpan,
  getDeterministicGenerationTimestamp
} from './contentGeneration.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalDataset,
  PresenceType
} from './contentTypes.ts';
import type {
  PersonActivityType,
  TemporalSpan
} from './types.ts';

interface CompactTemporalEntry {
  id: string;
  startIndex?: number;
  endIndex?: number;
  certainty: CertaintyLevel;
  supportingClaimIds: string[];
}

export interface LifespanIndexEntry extends CompactTemporalEntry {
  personId: string;
  sourceIds: string[];
}

export interface ActivityIndexEntry extends CompactTemporalEntry {
  personId: string;
  activityId: string;
  activityType: PersonActivityType;
}

export interface EventIndexEntry extends CompactTemporalEntry {
  eventId: string;
  sourceIds: string[];
}

export interface PresenceIndexEntry extends CompactTemporalEntry {
  personId: string;
  placeId: string;
  regionIds: string[];
  presenceType: PresenceType;
  eventIds: string[];
}

export interface RelationIndexEntry extends CompactTemporalEntry {
  relationId: string;
  relationLevel: DerivedHistoricalRelation['relationLevel'];
  subjectIds: string[];
  placeIds: string[];
  eventIds: string[];
}

export interface HistoricalIndexBundle {
  version: '1';
  generatedAt: string;
  lifespans: LifespanIndexEntry[];
  activities: ActivityIndexEntry[];
  events: EventIndexEntry[];
  presences: PresenceIndexEntry[];
  /**
   * Index ajouté de manière additive. Il reste optionnel pour accepter les
   * fichiers générés avant l’arrivée de la vue « À ce moment-là ».
   */
  relations?: RelationIndexEntry[];
  relationIdsBySubject: Record<string, string[]>;
  presenceIdsByPlace: Record<string, string[]>;
  presenceIdsByRegion: Record<string, string[]>;
  presenceIdsByEvent: Record<string, string[]>;
}

const uniqueSorted = (values: string[]): string[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const toCompactBounds = (
  period: TemporalSpan
): Pick<CompactTemporalEntry, 'startIndex' | 'endIndex'> | undefined => {
  const interval = getTemporalInterval(period);
  if (interval.unknown) return undefined;
  return {
    startIndex:
      interval.yearMin === undefined
        ? undefined
        : historicalYearToTimelineIndex(interval.yearMin),
    endIndex:
      interval.yearMax === undefined
        ? undefined
        : historicalYearToTimelineIndex(interval.yearMax)
  };
};

const compareTemporalEntries = (
  left: CompactTemporalEntry,
  right: CompactTemporalEntry
): number =>
  (left.startIndex ?? Number.NEGATIVE_INFINITY) -
    (right.startIndex ?? Number.NEGATIVE_INFINITY) ||
  (left.endIndex ?? Number.POSITIVE_INFINITY) -
    (right.endIndex ?? Number.POSITIVE_INFINITY) ||
  left.id.localeCompare(right.id);

const addReverseIndexValue = (
  index: Map<string, string[]>,
  key: string,
  value: string
): void => {
  index.set(key, [...(index.get(key) ?? []), value]);
};

const finalizeReverseIndex = (
  index: Map<string, string[]>
): Record<string, string[]> =>
  Object.fromEntries(
    [...index.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, values]) => [key, uniqueSorted(values)])
  );

export function buildHistoricalIndex(
  dataset: HistoricalDataset,
  relations: DerivedHistoricalRelation[]
): HistoricalIndexBundle {
  const regionsByPlace = new Map(
    dataset.places.map(record => [
      record.place.id,
      uniqueSorted(record.place.regionIds ?? [])
    ])
  );

  const lifespans: LifespanIndexEntry[] = dataset.people
    .flatMap(record => {
      const period = record.person.lifeSpan;
      const bounds = period
        ? toCompactBounds(conservativeLifespanSpan(period))
        : undefined;
      if (!period || !bounds) return [];
      return [
        {
          id: `lifespan:${record.person.id}`,
          personId: record.person.id,
          ...bounds,
          certainty: record.person.certainty ?? 'unknown',
          supportingClaimIds: uniqueSorted(
            record.person.lifeSpanClaimIds ?? []
          ),
          sourceIds: uniqueSorted(record.sourceIds)
        }
      ];
    })
    .sort(compareTemporalEntries);

  const activities: ActivityIndexEntry[] = dataset.people
    .flatMap(record =>
      record.person.activityPeriods.flatMap(activity => {
        const bounds = toCompactBounds(activity.span);
        if (!bounds) return [];
        return [
          {
            id: `activity:${activity.id}`,
            personId: record.person.id,
            activityId: activity.id,
            activityType: activity.type,
            ...bounds,
            certainty:
              activity.certainty ?? record.person.certainty ?? 'unknown',
            supportingClaimIds: uniqueSorted(
              activity.supportingClaimIds ?? []
            )
          }
        ];
      })
    )
    .sort(compareTemporalEntries);

  const events: EventIndexEntry[] = dataset.events
    .flatMap(record => {
      const bounds = record.event.period
        ? toCompactBounds(record.event.period)
        : undefined;
      if (!bounds) return [];
      return [
        {
          id: `event:${record.event.id}`,
          eventId: record.event.id,
          ...bounds,
          certainty: record.event.certainty ?? 'unknown',
          supportingClaimIds: uniqueSorted(
            record.event.supportingClaimIds ?? []
          ),
          sourceIds: uniqueSorted(record.sourceIds)
        }
      ];
    })
    .sort(compareTemporalEntries);

  const presences: PresenceIndexEntry[] = dataset.presences
    .flatMap(presence => {
      const bounds = toCompactBounds(presence.period);
      if (!bounds) return [];
      return [
        {
          id: presence.id,
          personId: presence.personId,
          placeId: presence.placeId,
          regionIds: regionsByPlace.get(presence.placeId) ?? [],
          presenceType: presence.presenceType,
          eventIds: uniqueSorted(presence.associatedEventIds ?? []),
          ...bounds,
          certainty: presence.certainty,
          supportingClaimIds: uniqueSorted(presence.supportingClaimIds)
        }
      ];
    })
    .sort(compareTemporalEntries);

  const relationEntries: RelationIndexEntry[] = relations
    .flatMap(relation => {
      const bounds = relation.temporalOverlap
        ? toCompactBounds(relation.temporalOverlap)
        : undefined;
      if (!bounds) return [];
      return [
        {
          id: `relation:${relation.id}`,
          relationId: relation.id,
          relationLevel: relation.relationLevel,
          subjectIds: uniqueSorted(relation.subjectIds),
          placeIds: uniqueSorted(relation.placeIds ?? []),
          eventIds: uniqueSorted(relation.eventIds ?? []),
          ...bounds,
          certainty: relation.certainty,
          supportingClaimIds: uniqueSorted(relation.supportingClaimIds)
        }
      ];
    })
    .sort(compareTemporalEntries);

  const relationIdsBySubject = new Map<string, string[]>();
  relations.forEach(relation => {
    relation.subjectIds.forEach(subjectId =>
      addReverseIndexValue(relationIdsBySubject, subjectId, relation.id)
    );
  });

  const presenceIdsByPlace = new Map<string, string[]>();
  const presenceIdsByRegion = new Map<string, string[]>();
  const presenceIdsByEvent = new Map<string, string[]>();
  presences.forEach(presence => {
    addReverseIndexValue(
      presenceIdsByPlace,
      presence.placeId,
      presence.id
    );
    presence.regionIds.forEach(regionId =>
      addReverseIndexValue(presenceIdsByRegion, regionId, presence.id)
    );
    presence.eventIds.forEach(eventId =>
      addReverseIndexValue(presenceIdsByEvent, eventId, presence.id)
    );
  });

  return {
    version: '1',
    generatedAt: getDeterministicGenerationTimestamp(dataset),
    lifespans,
    activities,
    events,
    presences,
    relations: relationEntries,
    relationIdsBySubject: finalizeReverseIndex(relationIdsBySubject),
    presenceIdsByPlace: finalizeReverseIndex(presenceIdsByPlace),
    presenceIdsByRegion: finalizeReverseIndex(presenceIdsByRegion),
    presenceIdsByEvent: finalizeReverseIndex(presenceIdsByEvent)
  };
}

const queryTemporalEntries = <T extends CompactTemporalEntry>(
  entries: T[],
  period: TemporalSpan
): T[] => {
  const bounds = toCompactBounds(period);
  if (!bounds) return [];
  let upperBound = entries.length;
  if (bounds.endIndex !== undefined) {
    let low = 0;
    let high = entries.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const startIndex = entries[middle]?.startIndex;
      if (startIndex === undefined || startIndex <= bounds.endIndex) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    upperBound = low;
  }
  const results: T[] = [];
  for (let index = 0; index < upperBound; index += 1) {
    const entry = entries[index];
    if (
      bounds.startIndex !== undefined &&
      entry.endIndex !== undefined &&
      entry.endIndex < bounds.startIndex
    ) {
      continue;
    }
    results.push(entry);
  }
  return results;
};

export const findLifespansDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): LifespanIndexEntry[] =>
  queryTemporalEntries(index.lifespans, period);

export const findActivitiesDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): ActivityIndexEntry[] =>
  queryTemporalEntries(index.activities, period);

export const findEventEntriesDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): EventIndexEntry[] =>
  queryTemporalEntries(index.events, period);

export const findPeopleLivingDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): string[] =>
  uniqueSorted(
    findLifespansDuring(index, period).map(entry => entry.personId)
  );

export const findPeopleActiveDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): string[] =>
  uniqueSorted(
    findActivitiesDuring(index, period).map(entry => entry.personId)
  );

export const findEventsDuring = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): string[] =>
  uniqueSorted(
    findEventEntriesDuring(index, period).map(entry => entry.eventId)
  );

export const findDocumentedPresences = (
  index: HistoricalIndexBundle,
  period: TemporalSpan
): PresenceIndexEntry[] =>
  queryTemporalEntries(index.presences, period);

export const findRelationsDuring = (
  index: HistoricalIndexBundle,
  relations: DerivedHistoricalRelation[],
  period: TemporalSpan,
  levels?: DerivedHistoricalRelation['relationLevel'][]
): DerivedHistoricalRelation[] => {
  const allowedLevels = levels ? new Set(levels) : undefined;
  const allowedRelationIds = new Set(
    queryTemporalEntries(index.relations ?? [], period)
      .filter(
        entry =>
          !allowedLevels || allowedLevels.has(entry.relationLevel)
      )
      .map(entry => entry.relationId)
  );

  return relations
    .filter(relation => allowedRelationIds.has(relation.id))
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const findPeopleAtPlace = (
  index: HistoricalIndexBundle,
  placeId: string,
  period: TemporalSpan
): string[] => {
  const allowedPresenceIds = new Set(
    index.presenceIdsByPlace[placeId] ?? []
  );
  return uniqueSorted(
    queryTemporalEntries(index.presences, period)
      .filter(presence => allowedPresenceIds.has(presence.id))
      .map(presence => presence.personId)
  );
};

export const findRelationsForSubject = (
  index: HistoricalIndexBundle,
  relations: DerivedHistoricalRelation[],
  subjectId: string,
  levels?: DerivedHistoricalRelation['relationLevel'][]
): DerivedHistoricalRelation[] => {
  const allowedIds = new Set(index.relationIdsBySubject[subjectId] ?? []);
  const allowedLevels = levels ? new Set(levels) : undefined;
  return relations
    .filter(
      relation =>
        allowedIds.has(relation.id) &&
        (!allowedLevels || allowedLevels.has(relation.relationLevel))
    )
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const findContemporariesForSubject = (
  index: HistoricalIndexBundle,
  relations: DerivedHistoricalRelation[],
  subjectId: string
): string[] =>
  uniqueSorted(
    findRelationsForSubject(index, relations, subjectId, [
      'lifespan-overlap'
    ]).flatMap(relation =>
      relation.subjectIds.filter(candidateId => candidateId !== subjectId)
    )
  );
