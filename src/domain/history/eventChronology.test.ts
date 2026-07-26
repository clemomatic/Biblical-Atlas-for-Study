import assert from 'node:assert/strict';
import test from 'node:test';
import type { BiblicalPerson, TemporalSpan } from './types.ts';
import {
  calculateAgeAtPeriod,
  calculatePersonAtEvent,
  getActivitySituationsAtPeriod
} from './eventChronology.ts';

const yearSpan = (
  start: number,
  end = start,
  options: { approximate?: boolean; uncertaintyYears?: number } = {}
): TemporalSpan => ({
  start: {
    yearMin: start,
    yearMax: start,
    precision: 'year',
    certainty: options.approximate ? 'probable' : 'certain',
    ...options
  },
  end: {
    yearMin: end,
    yearMax: end,
    precision: 'year',
    certainty: options.approximate ? 'probable' : 'certain',
    ...options
  },
  displayLabel: ''
});

const rangeBoundarySpan = (
  startMin: number,
  startMax: number,
  end: number
): TemporalSpan => ({
  start: {
    yearMin: startMin,
    yearMax: startMax,
    precision: 'range',
    certainty: 'probable'
  },
  end: {
    yearMin: end,
    yearMax: end,
    precision: 'year',
    certainty: 'certain'
  },
  displayLabel: ''
});

const person = (overrides: Partial<BiblicalPerson> = {}): BiblicalPerson => ({
  id: 'person-fixture',
  name: 'Personne fictive',
  activityPeriods: [],
  certainty: 'certain',
  ...overrides
});

test('calcule un âge exact', () => {
  const age = calculateAgeAtPeriod(yearSpan(10, 80), yearSpan(40));
  assert.equal(age.label, '30 ans');
  assert.equal(age.precision, 'exact');
});

test('conserve une plage d’âge sans moyenne artificielle', () => {
  const age = calculateAgeAtPeriod(
    rangeBoundarySpan(8, 13, 80),
    yearSpan(40)
  );
  assert.equal(age.label, 'Entre 27 et 32 ans');
});

test('signale un âge approximatif', () => {
  const age = calculateAgeAtPeriod(
    yearSpan(10, 80, { approximate: true }),
    yearSpan(40)
  );
  assert.equal(age.label, 'Environ 30 ans');
});

test('garde un âge inconnu sans inventer une naissance', () => {
  const age = calculateAgeAtPeriod(undefined, yearSpan(40));
  assert.equal(age.label, 'Âge impossible à déterminer');
});

test('saute correctement l’absence d’année zéro', () => {
  const age = calculateAgeAtPeriod(yearSpan(-1, 40), yearSpan(1));
  assert.equal(age.label, '1 an');
});

test('calcule la durée d’un règne actif', () => {
  const fixture = person({
    lifeSpan: yearSpan(10, 90),
    activityPeriods: [{
      id: 'activity-reign',
      type: 'reign',
      label: 'Règne',
      span: yearSpan(30, 60),
      certainty: 'certain'
    }]
  });
  const situations = getActivitySituationsAtPeriod(fixture, yearSpan(42));
  assert.equal(situations.active[0]?.duration?.label, 'Depuis 12 ans');
});

test('indique qu’une activité n’a pas encore commencé', () => {
  const fixture = person({
    lifeSpan: yearSpan(10, 90),
    activityPeriods: [{
      id: 'activity-reign',
      type: 'reign',
      label: 'Règne',
      span: yearSpan(30, 60),
      certainty: 'certain'
    }]
  });
  const situations = getActivitySituationsAtPeriod(fixture, yearSpan(20));
  assert.equal(
    situations.pending[0]?.label,
    'Pas encore roi à cette date'
  );
});

test('conserve plusieurs activités simultanées', () => {
  const fixture = person({
    lifeSpan: yearSpan(10, 90),
    activityPeriods: [
      {
        id: 'activity-office',
        type: 'office',
        label: 'Juge',
        span: yearSpan(30, 60),
        certainty: 'certain'
      },
      {
        id: 'activity-prophecy',
        type: 'prophecy',
        label: 'Prophète',
        span: yearSpan(35, 70),
        certainty: 'certain'
      }
    ]
  });
  assert.equal(
    getActivitySituationsAtPeriod(fixture, yearSpan(42)).active.length,
    2
  );
});

test('détecte un événement hors de la vie connue', () => {
  const result = calculatePersonAtEvent(
    person({ lifeSpan: yearSpan(10, 50) }),
    yearSpan(60)
  );
  assert.equal(result.outsideKnownLife, true);
  assert.equal(result.warnings.length, 1);
});

test('propage l’incertitude des extrémités approximatives', () => {
  const age = calculateAgeAtPeriod(
    yearSpan(10, 80, { approximate: true, uncertaintyYears: 2 }),
    yearSpan(40, 40, { approximate: true, uncertaintyYears: 1 })
  );
  assert.equal(age.precision, 'range');
  assert.equal(age.label, 'Entre 27 et 33 ans');
});

test('tient compte du mois avant l’anniversaire', () => {
  const lifeSpan: TemporalSpan = {
    start: {
      yearMin: -10,
      yearMax: -10,
      month: 8,
      precision: 'month',
      certainty: 'certain'
    },
    displayLabel: ''
  };
  const eventPeriod: TemporalSpan = {
    start: {
      yearMin: -5,
      yearMax: -5,
      month: 4,
      precision: 'month',
      certainty: 'certain'
    },
    displayLabel: ''
  };

  assert.deepEqual(calculateAgeAtPeriod(lifeSpan, eventPeriod), {
    precision: 'exact',
    minYears: 4,
    maxYears: 4,
    label: '4 ans',
    explanation:
      'Calcul déterministe tenant compte du mois et, lorsqu’il est connu, du jour.'
  });
});
