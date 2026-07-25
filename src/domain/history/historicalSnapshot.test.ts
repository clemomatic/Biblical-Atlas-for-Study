import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { loadHistoricalDataset } from './contentIO.ts';
import type { DerivedHistoricalRelation } from './contentTypes.ts';
import type { HistoricalIndexBundle } from './historicalIndex.ts';
import {
  buildHistoricalSnapshot,
  createHistoricalSnapshotCatalog,
  timelinePeriodToTemporalSpan
} from './historicalSnapshot.ts';
import type { TemporalSpan } from './types.ts';

const contentRoot = join(process.cwd(), 'content');

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, 'utf8')) as T;

const exactPeriod = (startYear: number, endYear: number): TemporalSpan => ({
  start: {
    yearMin: startYear,
    yearMax: startYear,
    precision: 'year',
    certainty: 'certain'
  },
  end: {
    yearMin: endYear,
    yearMax: endYear,
    precision: 'year',
    certainty: 'certain'
  },
  displayLabel: `${startYear}–${endYear}`
});

const loadPilotCatalog = async () => {
  const [dataset, index, relations] = await Promise.all([
    loadHistoricalDataset(contentRoot),
    readJson<HistoricalIndexBundle>(
      join(contentRoot, 'generated', 'historical-index.json')
    ),
    readJson<DerivedHistoricalRelation[]>(
      join(contentRoot, 'generated', 'relations.json')
    )
  ]);
  return {
    dataset,
    catalog: createHistoricalSnapshotCatalog(dataset, index, relations)
  };
};

test('convertit la plage visible sans créer une année zéro', () => {
  const crossing = timelinePeriodToTemporalSpan({
    startYear: -0.2,
    endYear: 0.2
  });
  assert.equal(crossing.start?.yearMin, -1);
  assert.equal(crossing.end?.yearMax, 1);
  assert.equal(crossing.displayLabel, '1 av. n. è. – 1 de n. è.');

  const withinYear29 = timelinePeriodToTemporalSpan({
    startYear: 28.2,
    endYear: 28.8
  });
  assert.equal(withinYear29.start?.yearMin, 29);
  assert.equal(withinYear29.end?.yearMax, 29);
});

test('construit le parcours A7-B depuis les index générés', async () => {
  const { dataset, catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(29, 30));

  assert.equal(
    snapshot.events.filter(event => event.eventId.startsWith('event-a7b-'))
      .length,
    9
  );
  assert.equal(
    dataset.presences.filter(presence =>
      presence.associatedEventIds?.some(eventId =>
        eventId.startsWith('event-a7b-')
      )
    ).length,
    11
  );
  assert.ok(
    snapshot.peopleLiving.some(
      person =>
        person.personId === 'event-jesus-en-tant-qu-humain-1f4ceyz'
    )
  );
  assert.ok(
    snapshot.peopleLiving.some(
      person => person.personId === 'event-jean-le-baptiseur-dvgl2c'
    )
  );
  assert.ok(
    snapshot.peopleActive.some(
      person =>
        person.personId ===
          'event-jesus-en-tant-qu-humain-1f4ceyz' &&
        person.activityType === 'ministry'
    )
  );
});

test('une barre collective WCG ne fabrique pas une personne vivante', async () => {
  const { catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(-1200, -1200));

  assert.ok(
    !snapshot.peopleLiving.some(
      person => person.personId === 'person-wcg-ruth'
    )
  );
});

test('relie événements, lieux et personnes du panneau aux entités relues', async () => {
  const { dataset, catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(30, 30));

  const nicodemusEvent = snapshot.events.find(
    event => event.eventId === 'event-a7b-entretien-nicodeme'
  );
  assert.ok(nicodemusEvent);
  assert.ok(
    dataset.events.some(
      record => record.event.id === nicodemusEvent.eventId
    )
  );
  assert.ok(
    snapshot.presences.some(group => group.placeId === 'jerusalem')
  );
  const mapDataSource = await readFile(
    join(process.cwd(), 'src', 'data', 'mapData.ts'),
    'utf8'
  );
  assert.match(mapDataSource, /id:\s*['"]jerusalem['"]/);
  assert.ok(
    dataset.people.some(
      record => record.person.id === 'person-a7b-nicodeme'
    )
  );
});

test('expose les preuves des interactions sans confondre relation calculée et rencontre', async () => {
  const { catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(29, 30));
  const interaction = snapshot.connections.find(
    connection =>
      connection.relationLevel === 'documented-interaction' &&
      connection.subjectIds.includes('person-a7b-nicodeme')
  );

  assert.ok(interaction);
  assert.equal(interaction.knowledgeLevel, 'attested');
  assert.ok(interaction.proofs.length > 0);
  assert.ok(
    interaction.proofs.every(proof =>
      proof.evidence.every(
        evidence =>
          evidence.humanReviewStatus === 'reviewed' &&
          evidence.shortReference.length > 0
      )
    )
  );

  const sameEvent = snapshot.connections.find(
    connection => connection.relationLevel === 'same-event'
  );
  assert.ok(sameEvent);
  assert.equal(sameEvent.knowledgeLevel, 'calculated');
  assert.match(sameEvent.explanation, /ne prouve pas/i);
});

test('signale une localisation inconnue seulement faute de présence validée pour cet événement', async () => {
  const { catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(30, 30));
  const unknownJean = snapshot.unknownLocations.find(
    item =>
      item.personId === 'event-jean-le-baptiseur-dvgl2c' &&
      item.eventId === 'event-a7b-emprisonnement-jean'
  );

  assert.ok(unknownJean);
  assert.equal(unknownJean.knowledgeLevel, 'unknown-location');
  assert.match(unknownJean.explanation, /aucun épisode de présence validé/i);
});

test('marque les longues plages afin que l’interface affiche son avertissement', async () => {
  const { catalog } = await loadPilotCatalog();
  const snapshot = buildHistoricalSnapshot(catalog, exactPeriod(1, 100));
  assert.equal(snapshot.isBroadPeriod, true);
});
