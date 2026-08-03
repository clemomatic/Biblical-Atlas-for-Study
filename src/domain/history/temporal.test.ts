import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canTemporalSpansOverlap,
  formatTemporalBoundaryFrench,
  formatTemporalSpanFrench,
  getTemporalInterval,
  getTemporalOverlap,
  historicalYearToTimelineIndex,
  legacyYearsToTemporalSpan,
  shiftHistoricalYear,
  timelineIndexToHistoricalYear,
  validateTemporalBoundary
} from './temporal.ts';
import type {
  TemporalBoundary,
  TemporalSpan
} from './types.ts';

const yearBoundary = (
  year: number,
  overrides: Partial<TemporalBoundary> = {}
): TemporalBoundary => ({
  yearMin: year,
  yearMax: year,
  precision: 'year',
  certainty: 'certain',
  ...overrides
});

const span = (
  startYear: number,
  endYear: number,
  startOverrides: Partial<TemporalBoundary> = {},
  endOverrides: Partial<TemporalBoundary> = {}
): TemporalSpan => ({
  start: yearBoundary(startYear, startOverrides),
  end: yearBoundary(endYear, endOverrides),
  displayLabel: ''
});

test('détecte un chevauchement exact', () => {
  const first = span(-10, -5);
  const second = span(-7, -3);

  assert.equal(getTemporalOverlap(first, second), 'definite');
  assert.equal(canTemporalSpansOverlap(first, second), true);
});

test('détecte un chevauchement seulement possible grâce à une marge', () => {
  const approximate = span(-10, -5, {}, {
    approximate: true,
    uncertaintyYears: 2,
    certainty: 'possible'
  });
  const later = span(-3, -3);

  assert.equal(
    getTemporalInterval(approximate, { includeUncertainty: false }).yearMax,
    -5
  );
  assert.equal(getTemporalInterval(approximate).yearMax, -3);
  assert.equal(getTemporalOverlap(approximate, later), 'possible');
});

test('conserve une période inconnue comme un troisième état', () => {
  const unknown: TemporalSpan = {
    start: {
      precision: 'unknown',
      certainty: 'unknown'
    },
    displayLabel: ''
  };

  assert.deepEqual(getTemporalInterval(unknown), { unknown: true });
  assert.equal(getTemporalOverlap(unknown, span(1, 2)), 'unknown');
  assert.equal(canTemporalSpansOverlap(unknown, span(1, 2)), true);
  assert.equal(formatTemporalSpanFrench(unknown), 'date inconnue');
});

test('passe directement de 1 av. n. è. à 1 de n. è.', () => {
  assert.equal(historicalYearToTimelineIndex(-1), -1);
  assert.equal(historicalYearToTimelineIndex(1), 0);
  assert.equal(timelineIndexToHistoricalYear(-1), -1);
  assert.equal(timelineIndexToHistoricalYear(0), 1);
  assert.equal(shiftHistoricalYear(-1, 1), 1);
  assert.equal(shiftHistoricalYear(1, -1), -1);
  assert.throws(
    () => historicalYearToTimelineIndex(0),
    /différente de zéro/
  );

  const crossing = span(-1, 1);
  assert.deepEqual(getTemporalInterval(crossing), {
    yearMin: -1,
    yearMax: 1,
    unknown: false
  });
  assert.equal(
    formatTemporalSpanFrench(crossing),
    'De 1 av. n. è. à 1 de n. è.'
  );
});

test('convertit les anciennes années sans en changer les valeurs', () => {
  const converted = legacyYearsToTemporalSpan({
    startYear: -2017,
    endYear: -1842,
    fuzzyStart: true,
    fuzzyEnd: false
  });

  assert.deepEqual(getTemporalInterval(converted), {
    yearMin: -2017,
    yearMax: -1842,
    unknown: false
  });
  assert.equal(converted.start?.approximate, true);
  assert.equal(converted.end?.approximate, false);
  assert.equal(
    converted.displayLabel,
    'De vers 2017 av. n. è. à 1842 av. n. è.'
  );
});

test('représente les précisions jour, mois, saison, limite et plage', () => {
  const day: TemporalBoundary = {
    yearMin: 33,
    yearMax: 33,
    month: 4,
    day: 3,
    precision: 'day',
    certainty: 'certain'
  };
  const month: TemporalBoundary = {
    yearMin: -2,
    yearMax: -2,
    month: 10,
    precision: 'month',
    certainty: 'probable'
  };
  const season: TemporalBoundary = {
    yearMin: 1,
    yearMax: 1,
    season: 'spring',
    precision: 'season',
    certainty: 'possible'
  };
  const before: TemporalBoundary = {
    yearMax: -10,
    precision: 'before',
    certainty: 'certain'
  };
  const range: TemporalBoundary = {
    yearMin: -12,
    yearMax: -10,
    precision: 'range',
    certainty: 'possible'
  };

  [day, month, season, before, range].forEach(validateTemporalBoundary);
  assert.equal(
    formatTemporalBoundaryFrench(day),
    '3 avril 33 de n. è.'
  );
  assert.equal(
    formatTemporalBoundaryFrench(month),
    'octobre 2 av. n. è.'
  );
  assert.equal(
    formatTemporalBoundaryFrench(season),
    'printemps 1 de n. è.'
  );
  assert.equal(
    formatTemporalBoundaryFrench(before),
    'avant 10 av. n. è.'
  );
  assert.equal(
    formatTemporalBoundaryFrench(range),
    'entre 12 av. n. è. et 10 av. n. è.'
  );
});

test('conserve un jour du calendrier hébreu sans conversion grégorienne', () => {
  const boundary: TemporalBoundary = {
    yearMin: 33,
    yearMax: 33,
    calendar: 'hebrew',
    calendarMonth: 'nisan',
    day: 14,
    precision: 'day',
    certainty: 'certain'
  };

  validateTemporalBoundary(boundary);
  assert.equal(
    formatTemporalBoundaryFrench(boundary),
    '14 nisan 33 de n. è.'
  );
  assert.equal(boundary.month, undefined);
});

test('formate une borne ouverte approximative sans ambiguïté', () => {
  assert.equal(
    formatTemporalBoundaryFrench({
      yearMax: -10, precision: 'before', approximate: true, certainty: 'possible'
    }),
    'avant vers 10 av. n. è.'
  );
});
