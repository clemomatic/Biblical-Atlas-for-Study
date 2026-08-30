import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventData } from '../../types.ts';
import type { BiblicalPerson } from './types.ts';
import {
  canonicalizeHistoricalPersonId,
  mergeHistoricalPeopleForDisplay,
  mergePersonTimelineEventsForDisplay
} from './personIdentityProjection.ts';

const person = (id: string, name: string): BiblicalPerson => ({
  id,
  name,
  activityPeriods: []
});

const event = (
  id: string,
  historicalPersonId: string,
  text: string
): EventData => ({
  id,
  historicalPersonId,
  historicalPersonSpanKind: 'lifespan',
  text,
  categoryId: 'character',
  category: 'Personnage',
  startRaw: '3',
  endRaw: '65',
  startYear: 3,
  endYear: 65,
  startPos: 3,
  endPos: 65,
  isPoint: false,
  fuzzyStart: true,
  fuzzyEnd: true
});

test('convertit les anciens identifiants vers une identité canonique relue', () => {
  assert.equal(canonicalizeHistoricalPersonId('wcg-paul'), 'person-wcg-paul');
  assert.equal(
    canonicalizeHistoricalPersonId('wcg-marie-mere'),
    'person-a7-marie-mere-jesus'
  );
  assert.equal(canonicalizeHistoricalPersonId('event-samuel-8qh05i'), 'samuel-vie');
  assert.equal(canonicalizeHistoricalPersonId('person-wcg-jonathan'), 'wcg-jonathan');
  assert.equal(canonicalizeHistoricalPersonId('event-saul-z98f25'), 'atlas-0087');
  assert.equal(canonicalizeHistoricalPersonId('atlas-0080'), 'event-adam-2peny4');
  assert.equal(canonicalizeHistoricalPersonId('atlas-0189'), 'event-david-iixp36');
  assert.equal(canonicalizeHistoricalPersonId('atlas-0061'), 'event-ruben-ybwrix');
});

test('fusionne les anciennes et nouvelles fiches de Paul sans perdre son ancien nom', () => {
  const merged = mergeHistoricalPeopleForDisplay([
    person('wcg-paul', 'Paul'),
    person('person-wcg-paul', 'Paul (Saul de Tarse)')
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'person-wcg-paul');
  assert.deepEqual(merged[0].alternateNames, ['Paul']);
});

test('ne fusionne jamais deux homonymes sur leur seul nom', () => {
  const merged = mergeHistoricalPeopleForDisplay([
    person('person-joseph-patriarche', 'Joseph'),
    person('person-joseph-autre', 'Joseph')
  ]);
  assert.equal(merged.length, 2);
});

test('rattache une nouvelle fiche à sa ligne héritée sans conserver un auto-lien', () => {
  const ruben = {
    ...person('atlas-0061', 'Ruben'),
    associatedPersonIds: ['atlas-0061', 'atlas-0106']
  };
  const [merged] = mergeHistoricalPeopleForDisplay([ruben]);

  assert.equal(merged.id, 'event-ruben-ybwrix');
  assert.equal(merged.legacyEventId, 'event-ruben-ybwrix');
  assert.ok(!merged.associatedPersonIds?.includes('event-ruben-ybwrix'));
  assert.ok(merged.associatedPersonIds?.includes('event-jacob-a7o7cq'));
});

test('ne projette qu’une ligne de vie par identité canonique', () => {
  const merged = mergePersonTimelineEventsForDisplay([
    event('old-paul', 'wcg-paul', 'Paul'),
    event('new-paul', 'person-wcg-paul', 'Paul (Saul de Tarse)')
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].historicalPersonId, 'person-wcg-paul');
});
