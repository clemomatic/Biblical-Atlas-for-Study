import {
  formatTemporalSpanFrench,
  getTemporalInterval,
  getTemporalOverlap
} from './temporal.ts';
import type {
  DerivedHistoricalRelation,
  HistoricalDataset,
  PresenceEpisode
} from './contentTypes.ts';
import type {
  TemporalBoundary,
  TemporalSpan
} from './types.ts';

const compareIds = <T extends { id: string }>(left: T, right: T): number =>
  left.id.localeCompare(right.id);

const createBoundary = (
  year: number,
  certainty: 'certain' | 'possible'
): TemporalBoundary => ({
  yearMin: year,
  yearMax: year,
  precision: 'year',
  certainty
});

const createIntersectionSpan = (
  first: PresenceEpisode,
  second: PresenceEpisode,
  certainty: 'certain' | 'possible'
): TemporalSpan | undefined => {
  const firstInterval = getTemporalInterval(first.period);
  const secondInterval = getTemporalInterval(second.period);
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

const createRelationId = (
  first: PresenceEpisode,
  second: PresenceEpisode
): string =>
  `generated-co-presence-${[first.id, second.id].sort().join('--')}`;

/**
 * Génère exclusivement des relations à partir d’épisodes présents dans
 * `dataset.presences`, c’est-à-dire le contenu `reviewed` déjà validé.
 * `dataset.staging` n’est jamais consulté.
 */
export function generateDerivedHistoricalRelations(
  dataset: HistoricalDataset
): DerivedHistoricalRelation[] {
  const presences = [...dataset.presences]
    .filter(
      presence =>
        presence.workflowStatus === 'reviewed' &&
        presence.origin === 'reviewed'
    )
    .sort(compareIds);
  const relations: DerivedHistoricalRelation[] = [];

  for (let firstIndex = 0; firstIndex < presences.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < presences.length;
      secondIndex += 1
    ) {
      const first = presences[firstIndex];
      const second = presences[secondIndex];
      if (
        first.personId === second.personId ||
        first.placeId !== second.placeId
      ) {
        continue;
      }

      const overlap = getTemporalOverlap(first.period, second.period);
      if (overlap === 'none' || overlap === 'unknown') continue;
      const certainty = overlap === 'definite' ? 'certain' : 'possible';
      const [subjectPersonId, objectPersonId] = [
        first.personId,
        second.personId
      ].sort();

      relations.push({
        id: createRelationId(first, second),
        origin: 'generated',
        relationType:
          overlap === 'definite' ? 'co-presence' : 'possible-co-presence',
        subjectPersonId,
        objectPersonId,
        placeId: first.placeId,
        period: createIntersectionSpan(first, second, certainty),
        certainty,
        inputClaimIds: [
          ...new Set([
            ...first.supportingClaimIds,
            ...second.supportingClaimIds
          ])
        ].sort(),
        generatedFromPresenceIds: [first.id, second.id].sort(),
        generator: {
          name: 'historical-presence-overlap',
          version: '1'
        }
      });
    }
  }

  return relations.sort(compareIds);
}
