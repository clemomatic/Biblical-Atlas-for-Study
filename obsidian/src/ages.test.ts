import test from 'node:test';
import assert from 'node:assert/strict';
import { ageAtCursor, dateFromPosition, probeDate } from './ages.ts';
import type { BiblicalPerson, TemporalBoundary } from '../../src/domain/history/types.ts';
const boundary = (year: number, month?: number, day?: number): TemporalBoundary => ({ yearMin: year, yearMax: year, month, day, precision: day ? 'day' : month ? 'month' : 'year', certainty: 'certain', calendar: 'gregorian' });
const person = (birth?: TemporalBoundary, death?: TemporalBoundary): BiblicalPerson => ({ id: 'test', name: 'Personne', activityPeriods: [], lifeSpan: birth || death ? { start: birth, end: death, displayLabel: '' } : undefined });

test('completed age changes on the birthday and crosses the absent year zero', () => {
  const p = person(boundary(-1, 6, 15));
  assert.equal(ageAtCursor(p, probeDate(1,6,14)).label, '0 ans');
  assert.equal(ageAtCursor(p, probeDate(1,6,15)).label, '1 an');
  assert.equal(ageAtCursor(p, probeDate(2,6,14)).label, '1 an');
  assert.equal(ageAtCursor(p, probeDate(-1,6,14)).status, 'not-born');
});
test('annual, approximate, bounded and absent births keep their precision', () => {
  assert.equal(ageAtCursor(person(boundary(-10)), probeDate(1)).label, 'Environ 10 ans');
  assert.equal(ageAtCursor(person({ ...boundary(-10), yearMax: -8, precision: 'range' }), probeDate(1)).label, 'Entre 8 et 10 ans');
  assert.equal(ageAtCursor(person(), probeDate(1)).status, 'unknown');
  assert.equal(ageAtCursor(person({ ...boundary(-10), approximate: true }), probeDate(1)).estimate.precision, 'approximate');
  assert.equal(ageAtCursor(person(boundary(-10, 6)), probeDate(1,6,1)).estimate.precision, 'approximate');
});
test('age stops at death and Hebrew months are never guessed as civil birthdays', () => {
  const p = person(boundary(-10,3,4), boundary(10,2,1));
  assert.equal(ageAtCursor(p, probeDate(10,2,1)).status, 'living');
  assert.equal(ageAtCursor(p, probeDate(40)).label, 'Décédé · 18 ans');
  const hebrew = person({ ...boundary(-10,3,4), calendar: 'hebrew', calendarMonth: 'nisan' });
  assert.equal(ageAtCursor(hebrew, probeDate(1,1,1)).estimate.precision, 'approximate');
});
test('reference dates validate real calendar days and round trip timeline positions', () => {
  for (const args of [[0], [2025,2,29], [2024,4,31], [1,13], [1,undefined,2]]) assert.throws(() => probeDate(args[0]!,args[1],args[2]));
  assert.equal(probeDate(2024,2,29).day,29);
  for (const year of [-607,-1,1,2024]) for (let month=1; month<=12; month++) {
    const date = probeDate(year, month, 15), back = dateFromPosition(date.position);
    assert.equal(back.year,year); assert.equal(back.month,month); assert.equal(back.day,15);
  }
  for (let position = -2; position < 2; position += 0.0017) assert.doesNotThrow(() => dateFromPosition(position));
});
