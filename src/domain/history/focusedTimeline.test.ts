import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventData } from '../../types.ts';
import {
  buildFocusedTimeline,
  getFocusedTimelineDomain
} from './focusedTimeline.ts';
import type {
  BiblicalPerson,
  HistoricalPersonRelationship,
  TemporalSpan
} from './types.ts';

const yearSpan = (
  start: number,
  end = start,
  approximate = false
): TemporalSpan => ({
  start: {
    yearMin: start,
    yearMax: start,
    precision: 'year',
    approximate,
    certainty: approximate ? 'probable' : 'certain'
  },
  end: {
    yearMin: end,
    yearMax: end,
    precision: 'year',
    approximate,
    certainty: approximate ? 'probable' : 'certain'
  },
  displayLabel: `${Math.abs(start)}-${Math.abs(end)} av. n. è.`
});

const person = (
  id: string,
  name: string,
  start: number,
  end: number,
  overrides: Partial<BiblicalPerson> = {}
): BiblicalPerson => ({
  id,
  name,
  lifeSpan: yearSpan(start, end),
  activityPeriods: [],
  certainty: 'certain',
  ...overrides
});

const event = (
  id: string,
  text: string,
  start: number,
  end = start,
  overrides: Partial<EventData> = {}
): EventData => ({
  id,
  text,
  categoryId: 'category-evenements',
  category: 'Événements marquants',
  startRaw: String(start),
  endRaw: String(end),
  startYear: start,
  endYear: end,
  startPos: start,
  endPos: end,
  isPoint: start === end,
  fuzzyStart: false,
  fuzzyEnd: false,
  certainty: 'certain',
  ...overrides
});

const samuel = person('samuel', 'Samuel', -1180, -1080, {
  associatedEventIds: ['onction-saul']
});
const saul = person('saul', 'Saül', -1138, -1078, {
  roles: ['king'],
  activityPeriods: [
    {
      id: 'regne-saul',
      type: 'reign',
      label: 'Règne de Saül',
      span: yearSpan(-1117, -1078),
      certainty: 'certain'
    }
  ]
});
const david = person('david', 'David', -1107, -1037, {
  roles: ['king']
});
const moise = person('moise', 'Moïse', -1592, -1472);
const onction = event('onction-saul', 'Onction de Saül par Samuel', -1117, -1117, {
  associatedCharacterIds: ['samuel', 'saul']
});
const davidEvent = event('onction-david', 'Onction de David', -1090, -1090, {
  associatedCharacterIds: ['samuel', 'david']
});
const contextualEvent = event('conflit', 'Conflit avec les Philistins', -1105);

test('focalise une personne sur sa vie, ses contemporains et ses événements liés', () => {
  const model = buildFocusedTimeline({
    person: samuel,
    people: [samuel, saul, david, moise],
    events: [onction, davidEvent, contextualEvent]
  });

  assert.ok(model);
  assert.equal(model.kind, 'person');
  assert.equal(model.people[0]?.person.name, 'Samuel');
  assert.deepEqual(
    new Set(model.people.slice(1).map(lane => lane.person.name)),
    new Set(['Saül', 'David'])
  );
  assert.ok(
    model.markers.some(
      marker => marker.event.id === 'onction-saul' && marker.directlyRelated
    )
  );
  assert.ok(model.fullDomain.start < -1180);
  assert.ok(model.fullDomain.end > -1080);
});

test('donne à un événement ponctuel une fenêtre de cinquante ans', () => {
  const model = buildFocusedTimeline({
    event: onction,
    people: [samuel, saul, david, moise],
    events: [onction, davidEvent, contextualEvent]
  });

  assert.ok(model);
  assert.equal(model.kind, 'event');
  assert.equal(model.fullDomain.end - model.fullDomain.start, 50);
  assert.ok(model.people.some(lane => lane.person.name === 'Samuel'));
  assert.ok(model.people.some(lane => lane.person.name === 'Saül'));
  assert.ok(model.markers.some(marker => marker.event.id === onction.id));
});

test('sépare la période racontée par un livre de sa rédaction', () => {
  const book = event(
    'book-1-samuel',
    'Période couverte : 1 Samuel',
    -1179,
    -1077,
    {
    categoryId: 'category-books',
      category: 'Période couverte par un livre biblique'
    }
  );
  const writing = event(
    'writing-1-samuel',
    'Fin de la rédaction : 1 Samuel',
    -1000,
    -1000,
    {
      categoryId: 'category-writing',
      category: 'Rédaction d’un livre biblique'
    }
  );
  const model = buildFocusedTimeline({
    event: book,
    people: [samuel, saul, david, moise],
    events: [book, writing, onction, davidEvent, contextualEvent]
  });

  assert.ok(model);
  assert.equal(model.kind, 'book');
  assert.deepEqual(model.writingEvents.map(item => item.id), [writing.id]);
  assert.ok(!model.markers.some(marker => marker.event.id === writing.id));
  assert.ok(model.markers.some(marker => marker.event.id === onction.id));
});

test('recentre les vues de 25 et 10 ans autour de l’événement actif', () => {
  const model = buildFocusedTimeline({
    person: samuel,
    people: [samuel, saul, david],
    events: [onction, davidEvent]
  });

  assert.ok(model);
  const twentyFiveYears = getFocusedTimelineDomain(
    model,
    '25-years',
    onction.startPos
  );
  const tenYears = getFocusedTimelineDomain(
    model,
    '10-years',
    onction.startPos
  );
  assert.equal(twentyFiveYears.end - twentyFiveYears.start, 25);
  assert.equal(tenYears.end - tenYears.start, 10);
  assert.ok(
    twentyFiveYears.start <= onction.startPos &&
      twentyFiveYears.end >= onction.startPos
  );
});

test('retire les longues bandes de contexte et les doublons d’un même événement', () => {
  const reviewedDuplicate = event(
    'onction-saul-reviewed',
    'Onction de Saül par Samuel',
    -1117,
    -1117,
    {
      associatedCharacterIds: ['samuel', 'saul'],
      startPos: -1116.5,
      endPos: -1116.5
    }
  );
  const authoritativeDuplicate = event(
    'onction-saul-authoritative',
    'Samuel oint Saül comme roi',
    -1117,
    -1117,
    {
      associatedCharacterIds: ['samuel', 'saul'],
      authoritativeRecordId: 'atlas-onction-saul'
    }
  );
  const backgroundPeriod = event(
    'alliance-longue',
    'Alliance couvrant plusieurs siècles',
    -1500,
    30
  );
  const model = buildFocusedTimeline({
    person: samuel,
    people: [samuel, saul, david],
    events: [reviewedDuplicate, authoritativeDuplicate, backgroundPeriod]
  });

  assert.ok(model);
  assert.deepEqual(
    model.markers.map(marker => marker.event.id),
    ['onction-saul-authoritative']
  );
});

test('ne calcule pas un âge pour un événement postérieur à la mort', () => {
  const afterSamuel = event(
    'naissance-apres-samuel',
    'Naissance après la mort de Samuel',
    -1075
  );
  const model = buildFocusedTimeline({
    person: samuel,
    people: [samuel, saul, david],
    events: [onction, afterSamuel]
  });

  assert.ok(model);
  assert.equal(
    model.markers.some(marker => marker.event.id === afterSamuel.id),
    false
  );
});

test('déduplique deux périodes contextuelles presque identiques sans participants', () => {
  const noe = person('noe', 'Noé', -2970, -2020);
  const authoritativeBabel = event(
    'babel-authoritative',
    'Construction de la tour de Babel et confusion des langues',
    -2269,
    -2030,
    { authoritativeRecordId: 'atlas-babel' }
  );
  const legacyBabel = event(
    'babel-legacy',
    'Période possible de la tour de Babel',
    -2268,
    -2028,
    { fuzzyStart: true, fuzzyEnd: true }
  );
  const model = buildFocusedTimeline({
    person: noe,
    people: [noe],
    events: [legacyBabel, authoritativeBabel]
  });

  assert.ok(model);
  assert.deepEqual(
    model.markers.map(marker => marker.event.id),
    ['babel-authoritative']
  );
});

test('priorise un fils documenté avant des contemporains courts sans relation', () => {
  const noe = person('noe', 'Noé', -2970, -2020);
  const sem = person('sem', 'Sem', -2468, -1868);
  const relationships: HistoricalPersonRelationship[] = [
    {
      id: 'noe-sem-forward',
      sourcePersonId: 'noe',
      targetPersonId: 'sem',
      kind: 'son',
      supportingRecordIds: ['record-sem']
    },
    {
      id: 'noe-sem-reverse',
      sourcePersonId: 'sem',
      targetPersonId: 'noe',
      kind: 'father',
      supportingRecordIds: ['record-sem']
    }
  ];
  const shortContemporaries = [
    person('peleg', 'Péleg', -2269, -2030),
    person('reou', 'Réou', -2239, -2000),
    person('seroug', 'Seroug', -2207, -1977),
    person('nahor', 'Nahor', -2177, -2029),
    person('tera', 'Téra', -2148, -2025)
  ];

  const model = buildFocusedTimeline({
    person: noe,
    people: [noe, sem, ...shortContemporaries],
    events: [],
    relationships
  });

  assert.ok(model);
  const semLane = model.people.find(lane => lane.person.id === sem.id);
  assert.ok(semLane);
  assert.equal(semLane.relationshipLabel, 'fils');
  assert.equal(semLane.relationshipDepth, 1);
  assert.equal(model.people[1]?.person.id, sem.id);
});

test('conserve les bornes connues et la contemporanéité d’une vie ouverte', () => {
  const saulOpenStart = person('saul-open', 'Saül', -1138, -1078, {
    lifeSpan: {
      start: {
        yearMax: -1138,
        precision: 'before',
        approximate: true,
        certainty: 'possible'
      },
      end: {
        yearMin: -1078,
        yearMax: -1078,
        precision: 'year',
        approximate: true,
        certainty: 'probable'
      },
      displayLabel: 'Avant 1138 → 1078 av. n. è.'
    }
  });
  const japhetOpenEnd = person('japhet', 'Japhet', -2468, -2468, {
    lifeSpan: {
      start: {
        yearMin: -2468,
        yearMax: -2468,
        precision: 'year',
        certainty: 'certain'
      },
      displayLabel: 'Né en 2468 av. n. è.'
    }
  });
  const flood = event('flood', 'Déluge', -2370, -2369, {
    associatedCharacterIds: ['japhet']
  });

  const saulModel = buildFocusedTimeline({
    person: saulOpenStart,
    people: [saulOpenStart],
    events: []
  });
  const floodModel = buildFocusedTimeline({
    event: flood,
    people: [japhetOpenEnd],
    events: [flood]
  });

  assert.ok(saulModel);
  assert.equal(saulModel.anchorSpan.start, -1138);
  assert.equal(saulModel.anchorSpan.end, -1078);
  assert.equal(saulModel.anchorSpan.openStart, true);
  assert.ok(floodModel);
  assert.equal(floodModel.people[0]?.person.id, japhetOpenEnd.id);
  assert.equal(floodModel.people[0]?.span.openEnd, true);
});

test('déduplique un événement quand une seule source a renseigné le participant', () => {
  const abraham = person('abraham', 'Abraham', -2018, -1843);
  const detailed = event(
    'alliance-detaillee',
    'Entrée en vigueur de l’alliance abrahamique',
    -1943,
    -1943,
    {
      associatedCharacterIds: ['abraham'],
      authoritativeRecordId: 'atlas-alliance',
      sources: [
        {
          id: 'source-detaillee',
          label: 'Source détaillée',
          url: 'https://example.test/alliance'
        }
      ]
    }
  );
  const thematic = event(
    'alliance-thematique',
    'Alliance avec Abraham',
    -1943,
    -1943,
    {
      authoritativeRecordId: 'alliance-abrahamique',
      sources: [
        {
          id: 'source-thematique',
          label: 'Source thématique',
          url: 'https://example.test/alliance'
        }
      ]
    }
  );
  const model = buildFocusedTimeline({
    person: abraham,
    people: [abraham],
    events: [thematic, detailed]
  });

  assert.ok(model);
  assert.deepEqual(model.markers.map(marker => marker.event.id), [detailed.id]);
});
