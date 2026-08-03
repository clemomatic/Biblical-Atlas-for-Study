import assert from 'node:assert/strict';
import test from 'node:test';
import type { BiblicalPerson } from '../domain/history/types.ts';
import type { EventData } from '../types.ts';
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

test('intègre les activités dans une seule ligne de vie', () => {
  const projection = createHistoricalPersonTimelineProjection([person]);
  assert.equal(projection.events.length, 1);
  assert.equal(projection.events[0].historicalPersonSpanKind, 'lifespan');
  assert.equal(projection.events[0].historicalActivityPeriods?.length, 1);
  assert.ok(
    projection.events.every(
      event => event.historicalPersonId === 'person-test'
    )
  );
  assert.ok(projection.supersededLegacyEventIds.has('event-legacy-test'));
  const life = projection.events.find(
    event => event.historicalPersonSpanKind === 'lifespan'
  );
  assert.equal(life?.historicalOpenEnd, false);
  assert.equal(life?.endYear, 20);
  assert.equal(life?.fuzzyEnd, true);
});

test('projette une naissance ouverte sans la transformer en année exacte', () => {
  const projection = createHistoricalPersonTimelineProjection([{
    id: 'person-open',
    name: 'Personne à naissance ouverte',
    lifeSpan: {
      start: { yearMax: -40, precision: 'before', approximate: true, certainty: 'possible' },
      end: { yearMin: 20, yearMax: 20, precision: 'year', certainty: 'certain' },
      displayLabel: 'Né avant 40 av. n. è. → mort en 20'
    },
    activityPeriods: []
  }]);
  assert.equal(projection.events.length, 1);
  assert.equal(projection.events[0].startYear, -40);
  assert.equal(projection.events[0].historicalOpenStart, true);
  assert.equal(projection.events[0].temporalSpan?.start?.precision, 'before');
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

test('réunit une ancienne ligne de règne avec la ligne de vie correspondante', () => {
  const david: BiblicalPerson = {
    ...person,
    id: 'person-david',
    legacyEventId: 'event-david-life',
    name: 'David',
    activityPeriods: []
  };
  const legacyReign: EventData = {
    id: 'event-david-reign',
    text: 'David - Israël (12 tribus)',
    categoryId: 'category-reigns',
    category: 'Règnes',
    startRaw: '-1076-01-01 00:00:00',
    endRaw: '-1036-01-01 00:00:00',
    startYear: -1076,
    endYear: -1036,
    startPos: -1076,
    endPos: -1036,
    isPoint: false,
    fuzzyStart: false,
    fuzzyEnd: false,
    certainty: 'certain'
  };

  const projection = createHistoricalPersonTimelineProjection(
    [david],
    [legacyReign]
  );
  const life = projection.events.find(
    event => event.historicalPersonSpanKind === 'lifespan'
  );

  assert.equal(projection.events.length, 1);
  assert.ok(
    projection.supersededLegacyEventIds.has('event-david-reign')
  );
  assert.equal(life?.historicalActivityPeriods?.length, 1);
  assert.equal(life?.historicalActivityPeriods?.[0]?.type, 'reign');
  assert.equal(life?.historicalPersonLaneId, 'united-monarchy');
});

test('ne duplique pas une activité canonique déjà présente', () => {
  const legacyMinistry: EventData = {
    id: 'activity-test',
    text: 'Personne test',
    categoryId: 'category-prophets',
    category: 'Prophètes (ou période de ministère)',
    startRaw: '5-01-01 00:00:00',
    endRaw: '10-01-01 00:00:00',
    startYear: 5,
    endYear: 10,
    startPos: 4,
    endPos: 9,
    isPoint: false,
    fuzzyStart: false,
    fuzzyEnd: false
  };
  const propheticPerson: BiblicalPerson = {
    ...person,
    activityPeriods: [
      {
        ...person.activityPeriods[0],
        type: 'prophecy'
      }
    ]
  };
  const projection = createHistoricalPersonTimelineProjection(
    [propheticPerson],
    [legacyMinistry]
  );
  const life = projection.events.find(
    event => event.historicalPersonSpanKind === 'lifespan'
  );
  assert.equal(life?.historicalActivityPeriods?.length, 1);
});

test('réunit les phases d’activité d’une personne sans durée de vie sur une seule ligne', () => {
  const king: BiblicalPerson = {
    id: 'person-king',
    name: 'Roi test',
    alternateNames: [],
    roles: ['king'],
    activityPeriods: [
      {
        id: 'activity-disputed',
        type: 'reign',
        phase: 'disputed-reign',
        label: 'Règne disputé',
        span: {
          start: {
            yearMin: -20,
            yearMax: -20,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          end: {
            yearMin: -16,
            yearMax: -16,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          displayLabel: 'vers 20-vers 16 av. n. è.'
        },
        realmId: 'territory-kingdom-israel'
      },
      {
        id: 'activity-established',
        type: 'reign',
        phase: 'fully-established-reign',
        label: 'Règne pleinement établi',
        span: {
          start: {
            yearMin: -16,
            yearMax: -16,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          end: {
            yearMin: -10,
            yearMax: -10,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          displayLabel: 'vers 16-vers 10 av. n. è.'
        },
        realmId: 'territory-kingdom-israel'
      }
    ]
  };

  const projection = createHistoricalPersonTimelineProjection([king]);

  assert.equal(projection.events.length, 1);
  assert.equal(projection.events[0].text, 'Roi test');
  assert.equal(projection.events[0].startYear, -20);
  assert.equal(projection.events[0].endYear, -10);
  assert.equal(projection.events[0].historicalActivityPeriods?.length, 2);
  assert.equal(projection.events[0].historicalPersonLaneId, 'israel-kings');
});

test('retire une ancienne ligne composite lorsque chaque règne est déjà modélisé', () => {
  const createKing = (id: string, name: string): BiblicalPerson => ({
    id,
    name,
    alternateNames: [],
    roles: ['king'],
    activityPeriods: [
      {
        id: `activity-${id}`,
        type: 'reign',
        phase: 'co-reign',
        label: 'Corègne',
        span: {
          start: {
            yearMin: -12,
            yearMax: -12,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          end: {
            yearMin: -9,
            yearMax: -9,
            precision: 'year',
            approximate: true,
            certainty: 'probable'
          },
          displayLabel: 'vers 12-vers 9 av. n. è.'
        },
        realmId: 'territory-kingdom-israel'
      }
    ]
  });
  const compositeLegacyEvent: EventData = {
    id: 'event-two-kings',
    text: 'Premier et Second',
    categoryId: 'category-israel-kings',
    category: 'Roi d’Israël',
    startRaw: '-11-01-01 00:00:00',
    endRaw: '-8-01-01 00:00:00',
    startYear: -11,
    endYear: -8,
    startPos: -11,
    endPos: -8,
    isPoint: false,
    fuzzyStart: true,
    fuzzyEnd: true
  };

  const projection = createHistoricalPersonTimelineProjection(
    [
      createKing('person-first', 'Premier'),
      createKing('person-second', 'Second')
    ],
    [compositeLegacyEvent]
  );

  assert.equal(projection.events.length, 2);
  assert.ok(
    projection.supersededLegacyEventIds.has('event-two-kings')
  );
});

test('conserve une ligne composite si une personne ou une phase manque', () => {
  const compositeLegacyEvent: EventData = {
    id: 'event-incomplete-pair',
    text: 'Premier et Inconnu',
    categoryId: 'category-israel-kings',
    category: 'Roi d’Israël',
    startRaw: '-11-01-01 00:00:00',
    endRaw: '-8-01-01 00:00:00',
    startYear: -11,
    endYear: -8,
    startPos: -11,
    endPos: -8,
    isPoint: false,
    fuzzyStart: true,
    fuzzyEnd: true
  };
  const known: BiblicalPerson = {
    id: 'person-first',
    name: 'Premier',
    alternateNames: [],
    roles: ['king'],
    activityPeriods: []
  };

  const projection = createHistoricalPersonTimelineProjection(
    [known],
    [compositeLegacyEvent]
  );

  assert.ok(
    !projection.supersededLegacyEventIds.has('event-incomplete-pair')
  );
});
