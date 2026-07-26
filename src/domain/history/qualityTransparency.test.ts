import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import type { BiblicalPlace, EventData } from '../../types.ts';
import { generateCalculatedHistoricalClaims } from './calculatedClaims.ts';
import { generateDerivedHistoricalRelations } from './contentGeneration.ts';
import { loadHistoricalDataset } from './contentIO.ts';
import { buildCorpusQualityReport } from './corpusQuality.ts';
import { buildEntityMethodology } from './entityMethodology.ts';
import { resolveAllPersonLifeClaims } from './personClaimResolution.ts';

const fixtureRoot = join(process.cwd(), 'content', 'test-fixtures');

const eventProjection = (id: string, name: string): EventData => ({
  id,
  text: name,
  categoryId: 'events',
  category: '?v?nements',
  startRaw: '1',
  endRaw: '1',
  startYear: 1,
  endYear: 1,
  startPos: 0,
  endPos: 0,
  isPoint: true,
  fuzzyStart: false,
  fuzzyEnd: false
});

const placeProjection = (id: string, name: string): BiblicalPlace => ({
  id,
  name,
  coordinates: [0, 0],
  description: 'Fixture de test.',
  biblicalReferences: [],
  geographicProvenance: [{
    id: `geo-${id}`,
    sourceId: 'source-test-atlas',
    sourceLabel: 'Source fictive',
    mapId: 'map-test',
    mapReference: 'A1',
    method: 'source-map-location',
    certainty: 'certain',
    sourceMapCertainty: 'certain',
    limitations: 'Fixture uniquement.',
    coordinatesChanged: false
  }]
});

test('le rapport qualit? distingue les blocages du travail ?ditorial restant', async () => {
  const dataset = await loadHistoricalDataset(fixtureRoot);
  const relations = generateDerivedHistoricalRelations(dataset);
  const report = buildCorpusQualityReport({
    dataset,
    knownEntities: {},
    generatedRelations: relations,
    storedCalculatedClaims: [],
    personLifeResolutions: resolveAllPersonLifeClaims(dataset.claims),
    applicationEvents: dataset.events.map(record =>
      eventProjection(record.event.id, record.event.name)
    ),
    applicationPlaces: dataset.places.map(record =>
      placeProjection(record.place.id, record.place.name)
    ),
    migratedPersonIds: dataset.people.map(record => record.person.id)
  });

  assert.equal(report.summary.blockingIssues, 0);
  assert.deepEqual(report.peopleWithoutSource, []);
  assert.deepEqual(report.impossiblePeriods, []);
  assert.deepEqual(report.orphanIdentifiers, []);
  assert.deepEqual(report.relationsWithoutSufficientEvidence, []);
  assert.deepEqual(report.nonReproducibleCalculations, []);
});

test('le rapport signale une ann?e z?ro et une preuve non relue', async () => {
  const dataset = await loadHistoricalDataset(fixtureRoot);
  dataset.claims[0].period = {
    start: {
      yearMin: 0,
      yearMax: 0,
      precision: 'year',
      certainty: 'certain'
    },
    end: {
      yearMin: 0,
      yearMax: 0,
      precision: 'year',
      certainty: 'certain'
    },
    displayLabel: 'Date impossible'
  };
  dataset.claims[0].evidence[0].humanReviewStatus = 'pending';

  const report = buildCorpusQualityReport({
    dataset,
    knownEntities: {},
    generatedRelations: [],
    storedCalculatedClaims: [],
    personLifeResolutions: [],
    applicationEvents: [],
    applicationPlaces: [],
    migratedPersonIds: []
  });

  assert.ok(report.impossiblePeriods.some(issue => issue.id === dataset.claims[0].id));
  assert.ok(report.unreviewedClaims.includes(dataset.claims[0].id));
  assert.ok(report.summary.blockingIssues >= 2);
});

test('la m?thode d?une fiche s?pare preuve directe et relation g?n?r?e', async () => {
  const dataset = await loadHistoricalDataset(fixtureRoot);
  const relations = generateDerivedHistoricalRelations(dataset);
  const person = dataset.people[0].person;
  const methodology = buildEntityMethodology('person', person, {
    claims: dataset.claims,
    calculatedClaims: [],
    relations,
    sources: dataset.sources,
    sourceIdsByEntity: {
      person: { [person.id]: dataset.people[0].sourceIds }
    }
  });

  assert.ok(methodology.methods.includes('direct'));
  assert.ok(methodology.methods.includes('generated-overlap'));
  assert.ok(methodology.sources.length > 0);
  assert.ok(methodology.limitations.some(limit => /rencontre/i.test(limit)));
});