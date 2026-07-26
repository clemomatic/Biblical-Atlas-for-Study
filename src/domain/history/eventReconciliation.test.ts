import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReviewedEventRecord } from './contentTypes.ts';
import {
  compareHistoricalEvents,
  findEventReconciliationCandidates
} from './eventReconciliation.ts';

const event = (
  id: string,
  name: string,
  references: string[],
  year: number,
  placeId: string
): ReviewedEventRecord => ({
  workflowStatus: 'reviewed',
  sourceIds: ['source-test'],
  event: {
    id,
    name,
    biblicalReferences: references,
    period: {
      start: {
        yearMin: year,
        yearMax: year,
        precision: 'year',
        certainty: 'certain'
      },
      end: {
        yearMin: year,
        yearMax: year,
        precision: 'year',
        certainty: 'certain'
      },
      displayLabel: String(year)
    },
    placeMentions: [
      {
        label: placeId,
        placeId,
        granularity: 'point',
        certainty: 'certain'
      }
    ]
  }
});

test('reconnaît immédiatement un identifiant stable identique', () => {
  const left = event('event-stable', 'Titre A', ['Luc 1:1'], 30, 'lieu-a');
  const right = event('event-stable', 'Titre B', ['Luc 2:1'], 31, 'lieu-b');
  assert.equal(
    compareHistoricalEvents(left.event, right.event).decision,
    'same-stable-id'
  );
});

test('propose sans fusionner deux lignes fortement concordantes', () => {
  const left = event(
    'event-a',
    'Jésus guérit un aveugle',
    ['Marc 8:22-26'],
    32,
    'bethsaida'
  );
  const right = event(
    'event-b',
    'Guérison d’un aveugle par Jésus',
    ['Marc 8:22-26'],
    32,
    'bethsaida'
  );
  assert.equal(
    compareHistoricalEvents(left.event, right.event).decision,
    'merge-candidate'
  );
});

test('conserve séparément deux épisodes proches mais distincts', () => {
  const records = [
    event('event-a', 'Jésus nourrit cinq mille hommes', ['Marc 6:30-44'], 32, 'galilee'),
    event('event-b', 'Jésus nourrit quatre mille hommes', ['Marc 8:1-9'], 32, 'galilee')
  ];
  const [candidate] = findEventReconciliationCandidates(records);
  assert.equal(candidate?.decision, 'review-required');
  assert.notEqual(candidate?.decision, 'merge-candidate');
});
