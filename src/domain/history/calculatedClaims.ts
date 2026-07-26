import type { CertaintyLevel } from '../../types.ts';
import {
  formatTemporalSpanFrench,
  getTemporalOverlap,
  shiftHistoricalYear,
  validateTemporalSpan
} from './temporal.ts';
import type {
  CalculatedHistoricalClaim,
  HistoricalCalculationDefinition,
  HistoricalClaim,
  HistoricalQuantity
} from './contentTypes.ts';
import type { TemporalBoundary, TemporalSpan } from './types.ts';

const CERTAINTY_RANK: Record<CertaintyLevel, number> = {
  unknown: 0,
  possible: 1,
  probable: 2,
  certain: 3
};

const combineCertainty = (values: CertaintyLevel[]): CertaintyLevel =>
  [...values].sort(
    (left, right) => CERTAINTY_RANK[left] - CERTAINTY_RANK[right]
  )[0] ?? 'unknown';

const capAtPossible = (certainty: CertaintyLevel): CertaintyLevel =>
  CERTAINTY_RANK[certainty] > CERTAINTY_RANK.possible
    ? 'possible'
    : certainty;

const shiftBoundary = (
  boundary: TemporalBoundary | undefined,
  offset: number,
  quantity: HistoricalQuantity,
  certainty: CertaintyLevel
): TemporalBoundary | undefined => {
  if (!boundary) return undefined;
  const uncertaintyYears =
    (boundary.uncertaintyYears ?? 0) + (quantity.uncertaintyYears ?? 0);
  return {
    ...boundary,
    yearMin:
      boundary.yearMin === undefined
        ? undefined
        : shiftHistoricalYear(boundary.yearMin, offset),
    yearMax:
      boundary.yearMax === undefined
        ? undefined
        : shiftHistoricalYear(boundary.yearMax, offset),
    approximate: Boolean(boundary.approximate || quantity.approximate),
    uncertaintyYears: uncertaintyYears > 0 ? uncertaintyYears : undefined,
    certainty
  };
};

const calculateSpan = (
  dateSpan: TemporalSpan,
  quantity: HistoricalQuantity,
  formula: HistoricalCalculationDefinition['formula'],
  certainty: CertaintyLevel
): TemporalSpan => {
  const direction =
    formula === 'subtract-duration-from-date' ? -1 : 1;
  const offset = direction * quantity.years;
  const result: TemporalSpan = {
    start: shiftBoundary(dateSpan.start, offset, quantity, certainty),
    end: shiftBoundary(dateSpan.end, offset, quantity, certainty),
    displayLabel: ''
  };
  validateTemporalSpan(result);
  result.displayLabel = formatTemporalSpanFrench(result, {
    preferDisplayLabel: false
  });
  return result;
};

const comparableSpan = (
  calculated: CalculatedHistoricalClaim,
  candidate: HistoricalClaim
): TemporalSpan | undefined => {
  if (!candidate.period) return undefined;
  if (candidate.predicate === calculated.predicate) return candidate.period;
  if (candidate.predicate !== 'lifespan') return undefined;
  const boundary =
    calculated.predicate === 'birth'
      ? candidate.period.start
      : calculated.predicate === 'death'
        ? candidate.period.end
        : undefined;
  if (!boundary) return undefined;
  return {
    start: boundary,
    end: boundary,
    displayLabel: candidate.period.displayLabel
  };
};

export const findHistoricalCalculationCycle = (
  definitions: readonly HistoricalCalculationDefinition[]
): string[] | undefined => {
  const byOutputId = new Map(
    definitions.map(definition => [definition.outputClaimId, definition])
  );
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  const visit = (outputClaimId: string): string[] | undefined => {
    if (active.has(outputClaimId)) {
      const start = stack.indexOf(outputClaimId);
      return [...stack.slice(start), outputClaimId];
    }
    if (visited.has(outputClaimId)) return undefined;
    const definition = byOutputId.get(outputClaimId);
    if (!definition) return undefined;

    active.add(outputClaimId);
    stack.push(outputClaimId);
    for (const inputId of [
      definition.dateInputClaimId,
      definition.quantityInputClaimId
    ]) {
      const cycle = visit(inputId);
      if (cycle) return cycle;
    }
    stack.pop();
    active.delete(outputClaimId);
    visited.add(outputClaimId);
    return undefined;
  };

  for (const outputClaimId of [...byOutputId.keys()].sort()) {
    const cycle = visit(outputClaimId);
    if (cycle) return cycle;
  }
  return undefined;
};

export const generateCalculatedHistoricalClaims = (
  reviewedClaims: readonly HistoricalClaim[],
  definitions: readonly HistoricalCalculationDefinition[]
): CalculatedHistoricalClaim[] => {
  const cycle = findHistoricalCalculationCycle(definitions);
  if (cycle) {
    throw new Error(
      `Boucle entre affirmations calculées : ${cycle.join(' -> ')}.`
    );
  }

  const claimsById = new Map(reviewedClaims.map(claim => [claim.id, claim]));
  const definitionsByOutputId = new Map(
    definitions.map(definition => [definition.outputClaimId, definition])
  );
  const generatedById = new Map<string, CalculatedHistoricalClaim>();

  const resolveClaim = (claimId: string): HistoricalClaim => {
    const existing = claimsById.get(claimId) ?? generatedById.get(claimId);
    if (existing) return existing;
    const definition = definitionsByOutputId.get(claimId);
    if (!definition) {
      throw new Error(`Affirmation d’entrée inexistante : ${claimId}.`);
    }
    return calculate(definition);
  };

  const calculate = (
    definition: HistoricalCalculationDefinition
  ): CalculatedHistoricalClaim => {
    const existing = generatedById.get(definition.outputClaimId);
    if (existing) return existing;

    const dateClaim = resolveClaim(definition.dateInputClaimId);
    const quantityClaim = resolveClaim(definition.quantityInputClaimId);
    if (!dateClaim.period) {
      throw new Error(
        `${definition.id} exige une période dans ${dateClaim.id}.`
      );
    }
    if (!quantityClaim.quantity) {
      throw new Error(
        `${definition.id} exige une quantité dans ${quantityClaim.id}.`
      );
    }
    const quantity = quantityClaim.quantity;
    const certaintyBeforeConflict = combineCertainty([
      definition.certainty,
      dateClaim.certainty,
      quantityClaim.certainty
    ]);
    const period = calculateSpan(
      dateClaim.period,
      quantity,
      definition.formula,
      certaintyBeforeConflict
    );
    const calculated: CalculatedHistoricalClaim = {
      id: definition.outputClaimId,
      workflowStatus: 'generated',
      origin: 'generated',
      subject: definition.subject,
      predicate: definition.predicate,
      period,
      certainty: certaintyBeforeConflict,
      evidence: [
        {
          sourceId: definition.sourceId,
          shortReference: definition.shortReference,
          method: 'calculated',
          inputClaimIds: [
            definition.dateInputClaimId,
            definition.quantityInputClaimId
          ],
          calculationExplanation: definition.explanation,
          humanReviewStatus: 'reviewed'
        }
      ],
      notes: definition.notes,
      calculation: {
        definitionId: definition.id,
        formula: definition.formula,
        inputClaimIds: [
          definition.dateInputClaimId,
          definition.quantityInputClaimId
        ],
        explanation: definition.explanation,
        result: period,
        uncertaintyYears: Math.max(
          period.start?.uncertaintyYears ?? 0,
          period.end?.uncertaintyYears ?? 0
        ),
        certaintyBeforeConflict
      },
      eligibleForCertainRelations: true
    };
    generatedById.set(calculated.id, calculated);
    return calculated;
  };

  [...definitions]
    .sort((left, right) => left.outputClaimId.localeCompare(right.outputClaimId))
    .forEach(calculate);

  const allClaims = [...reviewedClaims, ...generatedById.values()];
  return [...generatedById.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(calculated => {
      const conflictingClaimIds = allClaims
        .filter(
          candidate =>
            candidate.id !== calculated.id &&
            candidate.subject.entityType === calculated.subject.entityType &&
            candidate.subject.entityId === calculated.subject.entityId
        )
        .filter(candidate => {
          const comparison = comparableSpan(calculated, candidate);
          return (
            comparison !== undefined &&
            getTemporalOverlap(calculated.period, comparison) === 'none'
          );
        })
        .map(candidate => candidate.id)
        .sort();

      if (conflictingClaimIds.length === 0) return calculated;
      return {
        ...calculated,
        certainty: capAtPossible(calculated.certainty),
        conflict: {
          status: 'review-required' as const,
          conflictingClaimIds,
          explanation:
            'Le résultat calculé diverge d’une affirmation conservée. Les deux restent visibles jusqu’à relecture humaine.'
        },
        eligibleForCertainRelations: false
      };
    });
};
