import assert from 'node:assert/strict';
import test from 'node:test';
import type { BiblicalPerson, TemporalSpan } from './types.ts';
import {
  createEmptyEditorBatch,
  type EditorActivityProposal,
  type EditorEventProposal,
  type EditorStagingBatch
} from './editorTypes.ts';
import { validateEditorBatch } from './editorValidation.ts';

const span = (start: number, end = start): TemporalSpan => ({
  start: {
    yearMin: start,
    yearMax: start,
    precision: 'year',
    certainty: 'certain'
  },
  end: {
    yearMin: end,
    yearMax: end,
    precision: 'year',
    certainty: 'certain'
  },
  displayLabel: ''
});

const people: BiblicalPerson[] = [{
  id: 'person-fixture',
  name: 'Personne fictive',
  lifeSpan: span(-20, 20),
  activityPeriods: []
}];

const catalogs = {
  personIds: new Set(['person-fixture']),
  placeIds: new Set(['place-fixture']),
  eventIds: new Set(['event-fixture']),
  sourceIds: new Set(['source-fixture'])
};

const eventProposal = (): EditorEventProposal => ({
  id: 'proposal-event-fixture',
  kind: 'event',
  operation: 'create',
  sourceIds: ['source-fixture'],
  claimIds: [],
  extractionNote: 'Fixture sans donnée historique réelle.',
  data: {
    id: 'event-new-fixture',
    title: 'Événement fictif',
    period: span(1),
    category: 'Fixture',
    description: '',
    participantIds: ['person-fixture'],
    placeIds: ['place-fixture'],
    biblicalReferences: [],
    certainty: 'certain',
    timelineLevel: 'study'
  }
});

const validBatch = (): EditorStagingBatch => ({
  ...createEmptyEditorBatch('source-fixture'),
  id: 'editor-fixture',
  createdAt: '2026-01-01T00:00:00.000Z',
  proposals: [eventProposal()]
});

test('accepte un lot staging valide sans le déclarer relu', () => {
  const result = validateEditorBatch(validBatch(), catalogs, people);
  assert.equal(result.valid, true);
  assert.equal(result.issues.length, 0);
});

test('refuse l’année zéro', () => {
  const batch = validBatch();
  (batch.proposals[0] as EditorEventProposal).data.period = span(0);
  const result = validateEditorBatch(batch, catalogs, people);
  assert.equal(result.valid, false);
  assert.match(result.issues[0].message, /différente de zéro/i);
});

test('refuse une fin antérieure au début', () => {
  const batch = validBatch();
  (batch.proposals[0] as EditorEventProposal).data.period = span(10, 5);
  const result = validateEditorBatch(batch, catalogs, people);
  assert.equal(result.valid, false);
  assert.match(result.issues[0].message, /début/i);
});

test('refuse une source absente', () => {
  const batch = validBatch();
  batch.sourceId = 'source-inconnue';
  batch.proposals[0].sourceIds = [];
  const result = validateEditorBatch(batch, catalogs, people);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => /source/i.test(issue.message)));
});

test('refuse les relations vers des identifiants inexistants', () => {
  const batch = validBatch();
  (batch.proposals[0] as EditorEventProposal).data.participantIds = [
    'person-inconnue'
  ];
  const result = validateEditorBatch(batch, catalogs, people);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(issue => /Participant inexistant/i.test(issue.message)));
});

test('signale sans bloquer une activité hors de la vie connue', () => {
  const proposal: EditorActivityProposal = {
    id: 'proposal-activity-fixture',
    kind: 'activity',
    operation: 'create',
    sourceIds: ['source-fixture'],
    claimIds: [],
    extractionNote: 'Fixture sans donnée historique réelle.',
    data: {
      id: 'activity-fixture',
      personId: 'person-fixture',
      type: 'office',
      label: 'Fonction fictive',
      span: span(30, 35),
      certainty: 'possible',
      associatedLocationIds: [],
      associatedEventIds: []
    }
  };
  const batch = validBatch();
  batch.proposals = [proposal];
  const result = validateEditorBatch(batch, catalogs, people);
  assert.equal(result.valid, true);
  assert.ok(
    result.issues.some(
      issue => issue.severity === 'warning' && /hors de la vie/i.test(issue.message)
    )
  );
});

test('refuse un lot importé qui prétend être relu', () => {
  const unsafe = {
    ...validBatch(),
    workflowStatus: 'reviewed',
    humanReviewStatus: 'reviewed'
  } as unknown as EditorStagingBatch;
  const result = validateEditorBatch(unsafe, catalogs, people);
  assert.equal(result.valid, false);
  assert.match(result.issues[0].message, /staging/i);
});
