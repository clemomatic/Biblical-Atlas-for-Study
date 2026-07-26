import type {
  HistoricalClaim
} from './contentTypes.ts';
import {
  getTemporalInterval,
  getTemporalOverlap
} from './temporal.ts';
import type { TemporalBoundary, TemporalSpan } from './types.ts';

export type PersonLifeResolutionStatus =
  | 'resolved'
  | 'compatible'
  | 'divergent'
  | 'insufficient';

export interface PersonLifeResolution {
  personId: string;
  status: PersonLifeResolutionStatus;
  candidateClaimIds: string[];
  selectedClaimId?: string;
  selectedSpan?: TemporalSpan;
  divergentClaimPairs: Array<[string, string]>;
  selectionReason: string;
}

const CERTAINTY_RANK = {
  unknown: 0,
  possible: 1,
  probable: 2,
  certain: 3
} as const;

const boundaryScore = (boundary: TemporalBoundary | undefined): number => {
  if (!boundary || boundary.precision === 'unknown') return 0;
  const openPenalty = ['before', 'after'].includes(boundary.precision) ? 8 : 0;
  const rangePenalty =
    boundary.precision === 'range' &&
    boundary.yearMin !== undefined &&
    boundary.yearMax !== undefined
      ? Math.abs(boundary.yearMax - boundary.yearMin)
      : 0;
  return (
    20 +
    CERTAINTY_RANK[boundary.certainty] * 4 -
    (boundary.approximate ? 3 : 0) -
    (boundary.uncertaintyYears ?? 0) -
    openPenalty -
    Math.min(8, rangePenalty)
  );
};

const spanScore = (span: TemporalSpan): number => {
  const interval = getTemporalInterval(span, { includeUncertainty: false });
  const width =
    interval.yearMin !== undefined && interval.yearMax !== undefined
      ? Math.abs(interval.yearMax - interval.yearMin)
      : 10_000;
  return (
    boundaryScore(span.start) +
    boundaryScore(span.end) -
    Math.min(20, width / 100)
  );
};

const compareClaims = (left: HistoricalClaim, right: HistoricalClaim) =>
  spanScore(right.period!) - spanScore(left.period!) ||
  left.id.localeCompare(right.id);

/**
 * Sélectionne la période la plus précise uniquement lorsque toutes les
 * affirmations relues restent compatibles. Une divergence laisse la sélection
 * vide afin qu'aucune source ne soit écrasée silencieusement.
 */
export const resolvePersonLifeClaims = (
  personId: string,
  claims: readonly HistoricalClaim[]
): PersonLifeResolution => {
  const candidates = claims
    .filter(
      claim =>
        claim.subject.entityType === 'person' &&
        claim.subject.entityId === personId &&
        claim.predicate === 'lifespan' &&
        Boolean(claim.period)
    )
    .sort((left, right) => left.id.localeCompare(right.id));

  if (candidates.length === 0) {
    return {
      personId,
      status: 'insufficient',
      candidateClaimIds: [],
      divergentClaimPairs: [],
      selectionReason: 'Aucune affirmation de durée de vie relue.'
    };
  }

  const divergentClaimPairs: Array<[string, string]> = [];
  candidates.forEach((left, leftIndex) => {
    candidates.slice(leftIndex + 1).forEach(right => {
      if (getTemporalOverlap(left.period!, right.period!) === 'none') {
        divergentClaimPairs.push([left.id, right.id]);
      }
    });
  });

  if (divergentClaimPairs.length > 0) {
    return {
      personId,
      status: 'divergent',
      candidateClaimIds: candidates.map(claim => claim.id),
      divergentClaimPairs,
      selectionReason:
        'Des affirmations relues sont incompatibles ; aucune n’est privilégiée automatiquement.'
    };
  }

  const selected = [...candidates].sort(compareClaims)[0];
  return {
    personId,
    status: candidates.length === 1 ? 'resolved' : 'compatible',
    candidateClaimIds: candidates.map(claim => claim.id),
    selectedClaimId: selected.id,
    selectedSpan: selected.period,
    divergentClaimPairs: [],
    selectionReason:
      candidates.length === 1
        ? 'Seule affirmation relue disponible.'
        : 'Affirmation compatible offrant les bornes les plus précises.'
  };
};

export const resolveAllPersonLifeClaims = (
  claims: readonly HistoricalClaim[]
): PersonLifeResolution[] => {
  const personIds = [
    ...new Set(
      claims
        .filter(
          claim =>
            claim.subject.entityType === 'person' &&
            claim.predicate === 'lifespan'
        )
        .map(claim => claim.subject.entityId)
    )
  ].sort((left, right) => left.localeCompare(right));
  return personIds.map(personId => resolvePersonLifeClaims(personId, claims));
};
