import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  HistoricalCalculationDefinition,
  HistoricalClaim
} from './contentTypes.ts';
import {
  findHistoricalCalculationCycle,
  generateCalculatedHistoricalClaims
} from './calculatedClaims.ts';

const evidence = {
  sourceId: 'source-test',
  shortReference: 'Référence de test.',
  method: 'direct' as const,
  humanReviewStatus: 'reviewed' as const
};

const dateClaim = (
  id: string,
  year: number,
  options: {
    subjectId?: string;
    predicate?: HistoricalClaim['predicate'];
    approximate?: boolean;
    uncertaintyYears?: number;
    certainty?: HistoricalClaim['certainty'];
  } = {}
): HistoricalClaim => ({
  id,
  workflowStatus: 'reviewed',
  origin: 'reviewed',
  subject: {
    entityType: 'person',
    entityId: options.subjectId ?? 'person-test'
  },
  predicate: options.predicate ?? 'historical-event',
  period: {
    start: {
      yearMin: year,
      yearMax: year,
      precision: 'year',
      approximate: options.approximate,
      uncertaintyYears: options.uncertaintyYears,
      certainty: options.certainty ?? 'certain'
    },
    end: {
      yearMin: year,
      yearMax: year,
      precision: 'year',
      approximate: options.approximate,
      uncertaintyYears: options.uncertaintyYears,
      certainty: options.certainty ?? 'certain'
    },
    displayLabel: ''
  },
  certainty: options.certainty ?? 'certain',
  evidence: [evidence]
});

const ageClaim = (
  id: string,
  years: number,
  options: {
    approximate?: boolean;
    uncertaintyYears?: number;
    certainty?: HistoricalClaim['certainty'];
  } = {}
): HistoricalClaim => ({
  id,
  workflowStatus: 'reviewed',
  origin: 'reviewed',
  subject: { entityType: 'person', entityId: 'person-test' },
  predicate: 'age-at-event',
  quantity: {
    kind: 'age',
    unit: 'years',
    years,
    approximate: options.approximate,
    uncertaintyYears: options.uncertaintyYears
  },
  certainty: options.certainty ?? 'certain',
  evidence: [evidence]
});

const definition = (
  overrides: Partial<HistoricalCalculationDefinition> = {}
): HistoricalCalculationDefinition => ({
  id: 'calculation-test',
  workflowStatus: 'reviewed',
  outputClaimId: 'claim-calculated-test',
  subject: { entityType: 'person', entityId: 'person-test' },
  predicate: 'birth',
  formula: 'subtract-duration-from-date',
  dateInputClaimId: 'claim-date',
  quantityInputClaimId: 'claim-age',
  sourceId: 'source-test',
  shortReference: 'Calcul de test.',
  certainty: 'certain',
  explanation: 'Soustraire l’âge à la date de l’événement.',
  ...overrides
});

test('calcule une date simple sans transformer le résultat en fait direct', () => {
  const [result] = generateCalculatedHistoricalClaims(
    [dateClaim('claim-date', 50), ageClaim('claim-age', 30)],
    [definition()]
  );
  assert.equal(result.period.start?.yearMin, 20);
  assert.equal(result.evidence[0].method, 'calculated');
  assert.deepEqual(result.evidence[0].inputClaimIds, [
    'claim-date',
    'claim-age'
  ]);
});

test('saute correctement l’absence d’année zéro', () => {
  const [result] = generateCalculatedHistoricalClaims(
    [dateClaim('claim-date', 10), ageClaim('claim-age', 20)],
    [definition()]
  );
  assert.equal(result.period.start?.yearMin, -11);
  assert.equal(result.period.displayLabel, '11 av. n. è.');
});

test('propage une approximation et additionne les marges', () => {
  const [result] = generateCalculatedHistoricalClaims(
    [
      dateClaim('claim-date', 50, {
        approximate: true,
        uncertaintyYears: 1,
        certainty: 'probable'
      }),
      ageClaim('claim-age', 30, {
        approximate: true,
        uncertaintyYears: 2,
        certainty: 'probable'
      })
    ],
    [definition({ certainty: 'probable' })]
  );
  assert.equal(result.period.start?.approximate, true);
  assert.equal(result.period.start?.uncertaintyYears, 3);
  assert.equal(result.calculation.uncertaintyYears, 3);
  assert.equal(result.certainty, 'probable');
});

test('conserve une contradiction et bloque toute relation certaine', () => {
  const directBirth = dateClaim('claim-birth-direct', 19, {
    predicate: 'birth'
  });
  const [result] = generateCalculatedHistoricalClaims(
    [directBirth, dateClaim('claim-date', 50), ageClaim('claim-age', 30)],
    [definition()]
  );
  assert.deepEqual(result.conflict?.conflictingClaimIds, [
    'claim-birth-direct'
  ]);
  assert.equal(result.certainty, 'possible');
  assert.equal(result.eligibleForCertainRelations, false);
});

test('recalcule le résultat quand une entrée change', () => {
  const age = ageClaim('claim-age', 30);
  const first = generateCalculatedHistoricalClaims(
    [dateClaim('claim-date', 50), age],
    [definition()]
  )[0];
  const second = generateCalculatedHistoricalClaims(
    [dateClaim('claim-date', 51), age],
    [definition()]
  )[0];
  assert.equal(first.period.start?.yearMin, 20);
  assert.equal(second.period.start?.yearMin, 21);
  assert.equal(age.quantity?.years, 30);
});

test('détecte et refuse les boucles entre affirmations calculées', () => {
  const definitions = [
    definition({
      id: 'calculation-a',
      outputClaimId: 'claim-a',
      dateInputClaimId: 'claim-b'
    }),
    definition({
      id: 'calculation-b',
      outputClaimId: 'claim-b',
      dateInputClaimId: 'claim-a'
    })
  ];
  assert.deepEqual(findHistoricalCalculationCycle(definitions), [
    'claim-a',
    'claim-b',
    'claim-a'
  ]);
  assert.throws(
    () =>
      generateCalculatedHistoricalClaims(
        [ageClaim('claim-age', 30)],
        definitions
      ),
    /Boucle entre affirmations calculées/
  );
});
