import type { ReviewedEventRecord } from './contentTypes.ts';
import { getTemporalInterval } from './temporal.ts';

export type EventReconciliationDecision =
  | 'same-stable-id'
  | 'merge-candidate'
  | 'review-required'
  | 'distinct';

export interface EventReconciliationResult {
  decision: EventReconciliationDecision;
  score: number;
  reasons: string[];
}

export interface EventReconciliationCandidate
  extends EventReconciliationResult {
  leftEventId: string;
  rightEventId: string;
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokens = (value: string): Set<string> =>
  new Set(
    normalize(value)
      .split(/\s+/)
      .filter(token => token.length > 2)
  );

const jaccard = (left: Set<string>, right: Set<string>): number => {
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(value => right.has(value)).length;
  return intersection / (left.size + right.size - intersection);
};

const normalizedReferences = (
  event: ReviewedEventRecord['event']
): Set<string> =>
  new Set((event.biblicalReferences ?? []).map(normalize));

const placeIds = (event: ReviewedEventRecord['event']): Set<string> =>
  new Set(
    (event.placeMentions ?? [])
      .flatMap(mention => mention.placeId ? [mention.placeId] : [])
  );

const periodsOverlap = (
  left: ReviewedEventRecord['event'],
  right: ReviewedEventRecord['event']
): boolean => {
  if (!left.period || !right.period) return false;
  const leftInterval = getTemporalInterval(left.period);
  const rightInterval = getTemporalInterval(right.period);
  if (leftInterval.unknown || rightInterval.unknown) return false;
  if (
    leftInterval.yearMax !== undefined &&
    rightInterval.yearMin !== undefined &&
    leftInterval.yearMax < rightInterval.yearMin
  ) {
    return false;
  }
  if (
    rightInterval.yearMax !== undefined &&
    leftInterval.yearMin !== undefined &&
    rightInterval.yearMax < leftInterval.yearMin
  ) {
    return false;
  }
  return true;
};

/**
 * Produit seulement une recommandation de rapprochement. Une fusion reste une
 * décision éditoriale explicite et n’est jamais effectuée automatiquement.
 */
export const compareHistoricalEvents = (
  left: ReviewedEventRecord['event'],
  right: ReviewedEventRecord['event']
): EventReconciliationResult => {
  if (left.id === right.id) {
    return {
      decision: 'same-stable-id',
      score: 1,
      reasons: ['identifiant stable identique']
    };
  }

  const titleScore = jaccard(tokens(left.name), tokens(right.name));
  const referenceScore = jaccard(
    normalizedReferences(left),
    normalizedReferences(right)
  );
  const placeScore = jaccard(placeIds(left), placeIds(right));
  const temporalMatch = periodsOverlap(left, right);
  const score =
    titleScore * 0.35 +
    referenceScore * 0.35 +
    placeScore * 0.15 +
    (temporalMatch ? 0.15 : 0);
  const reasons = [
    titleScore >= 0.5 ? 'titres normalisés proches' : undefined,
    referenceScore > 0 ? 'références bibliques communes' : undefined,
    placeScore > 0 ? 'lieux identifiés communs' : undefined,
    temporalMatch ? 'périodes compatibles' : undefined
  ].filter((reason): reason is string => Boolean(reason));

  const mergeCandidate =
    score >= 0.78 &&
    temporalMatch &&
    referenceScore > 0 &&
    (titleScore >= 0.5 || placeScore > 0);
  const reviewRequired =
    !mergeCandidate &&
    score >= 0.48 &&
    (referenceScore > 0 || titleScore >= 0.65);

  return {
    decision: mergeCandidate
      ? 'merge-candidate'
      : reviewRequired
        ? 'review-required'
        : 'distinct',
    score: Number(score.toFixed(4)),
    reasons
  };
};

export const findEventReconciliationCandidates = (
  records: readonly ReviewedEventRecord[]
): EventReconciliationCandidate[] => {
  const candidates: EventReconciliationCandidate[] = [];
  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < records.length;
      rightIndex += 1
    ) {
      const left = records[leftIndex].event;
      const right = records[rightIndex].event;
      const comparison = compareHistoricalEvents(left, right);
      if (comparison.decision === 'distinct') continue;
      candidates.push({
        leftEventId: left.id,
        rightEventId: right.id,
        ...comparison
      });
    }
  }
  return candidates.sort(
    (left, right) =>
      left.leftEventId.localeCompare(right.leftEventId) ||
      left.rightEventId.localeCompare(right.rightEventId)
  );
};
