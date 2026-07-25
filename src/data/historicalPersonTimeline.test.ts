import assert from 'node:assert/strict';
import test from 'node:test';
import type { BiblicalPerson } from '../domain/history/types.ts';
import { createHistoricalPersonTimelineProjection } from './historicalPersonTimeline.ts';

const person: BiblicalPerson = {
  id: 'person-test',
  legacyEventId: 'event-legacy-test',
  name: 'Personne test',
  alternateNames: [],
  lifeSpan: {
    start: {
      yearMin: -10,
      yearMax: -10,
      precision: 'year',
      certainty: 'certain'
    },
    end: {
      yearMin: 20,
      yearMax: 20,
      precision: 'after',
      certainty: 'certain'
    },
    displayLabel: '10 av. n. è.-après 20 de n. è.'
  },
  activityPeriods: [
    {
      id: 'activity-test',
      type: 'ministry',
      label: 'Ministère',
      span: {
        start: {
          yearMin: 5,
          yearMax: 5,
          precision: 'year',
          certainty: 'certain'
        },
        end: {
          yearMin: 10,
          yearMax: 10,
          precision: 'year',
          certainty: 'certain'
        },
        displayLabel: '5-10 de n. è.'
      }
    }
  ]
};

test('projette séparément la vie et l’activité vers la frise', () => {
  const projection = createHistoricalPersonTimelineProjection([person]);
  assert.equal(projection.events.length, 2);
  assert.deepEqual(
    projection.events.map(event => event.historicalPersonSpanKind).sort(),
    ['activity', 'lifespan']
  );
  assert.ok(
    projection.events.every(
      event => event.historicalPersonId === 'person-test'
    )
  );
  assert.ok(projection.supersededLegacyEventIds.has('event-legacy-test'));
  const life = projection.events.find(
    event => event.historicalPersonSpanKind === 'lifespan'
  );
  assert.equal(life?.endYear, 20);
  assert.equal(life?.fuzzyEnd, true);
});

test('une fenêtre collective seule ne crée aucune ligne de vie', () => {
  const projection = createHistoricalPersonTimelineProjection([
    {
      id: 'person-context',
      name: 'Contexte',
      alternateNames: [],
      activityPeriods: [],
      sourceTimelineWindows: [
        {
          id: 'window-test',
          sourceId: 'source-test',
          kind: 'collective-context',
          label: 'Groupe',
          span: {
            start: {
              yearMin: -100,
              yearMax: -100,
              precision: 'year',
              certainty: 'possible'
            },
            end: {
              yearMin: -50,
              yearMax: -50,
              precision: 'year',
              certainty: 'possible'
            },
            displayLabel: 'Contexte'
          },
          supportingClaimIds: ['claim-test'],
          notes: 'Contexte seulement.'
        }
      ]
    }
  ]);
  assert.deepEqual(projection.events, []);
});
