import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventData } from '../types.ts';
import {
  createLegacyTimelineProjection,
  legacyPersonEventToBiblicalPerson
} from './legacyPeopleAdapter.ts';

const createLegacyPerson = (): EventData => ({
  id: 'event-person-test',
  text: 'Personnage test',
  categoryId: 'category-personnage',
  category: 'Personnage',
  startRaw: '-10-01-01 00:00:00',
  endRaw: '-5-01-01 00:00:00',
  startYear: -10,
  endYear: -5,
  startPos: -10,
  endPos: -5,
  isPoint: false,
  fuzzyStart: true,
  fuzzyEnd: false,
  associatedLocationIds: ['lieu-1'],
  associatedRouteIds: ['route-1'],
  associatedCharacterIds: ['personne-2'],
  biblicalReferences: ['Genèse 1:1'],
  encyclopediaReferences: [
    {
      id: 'reference-test',
      work: 'insight',
      articleTitle: 'Personnage test',
      url: 'https://example.test/personne'
    }
  ]
});

test('convertit un personnage sans modifier l’EventData original', () => {
  const event = createLegacyPerson();
  const before = structuredClone(event);
  const person = legacyPersonEventToBiblicalPerson(event);

  assert.deepEqual(event, before);
  assert.equal(person.id, event.id);
  assert.equal(person.legacyEventId, event.id);
  assert.deepEqual(person.associatedLocationIds, event.associatedLocationIds);
  assert.notEqual(
    person.associatedLocationIds,
    event.associatedLocationIds,
    'les tableaux ne doivent pas partager leur état mutable'
  );
  assert.deepEqual(person.lifeSpan?.start?.yearMin, event.startYear);
  assert.deepEqual(person.lifeSpan?.end?.yearMax, event.endYear);
});

test('projette une personne migrée sans doublon ni perte de relation', () => {
  const event = createLegacyPerson();
  const otherEvent: EventData = {
    ...event,
    id: 'event-other',
    text: 'Autre événement',
    category: 'Événements Marquants'
  };
  const source = [event, otherEvent];
  const before = structuredClone(source);
  const person = legacyPersonEventToBiblicalPerson(event);
  const projection = createLegacyTimelineProjection(source, [person]);

  assert.deepEqual(source, before);
  assert.equal(projection.length, source.length);
  assert.equal(new Set(projection.map(item => item.id)).size, source.length);
  assert.deepEqual(
    projection.find(item => item.id === event.id)?.associatedLocationIds,
    event.associatedLocationIds
  );
  assert.deepEqual(
    projection.find(item => item.id === event.id)?.associatedRouteIds,
    event.associatedRouteIds
  );
  assert.deepEqual(
    projection.find(item => item.id === event.id)?.associatedCharacterIds,
    event.associatedCharacterIds
  );
  assert.equal(
    projection.find(item => item.id === event.id)?.startYear,
    event.startYear
  );
  assert.equal(
    projection.find(item => item.id === event.id)?.endYear,
    event.endYear
  );
});
