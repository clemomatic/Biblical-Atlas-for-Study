import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { generateDerivedHistoricalRelations } from './contentGeneration.ts';
import { loadHistoricalDataset } from './contentIO.ts';
import {
  HistoricalDataValidationError,
  validateGeneratedRelations,
  validateHistoricalDataset
} from './contentValidation.ts';
import type { HistoricalDataset } from './contentTypes.ts';

const fixtureRoot = join(process.cwd(), 'content', 'test-fixtures');

const loadFixture = (): Promise<HistoricalDataset> =>
  loadHistoricalDataset(fixtureRoot);

const expectInvalid = (
  dataset: HistoricalDataset,
  expectedMessage: RegExp
): void => {
  assert.throws(
    () => validateHistoricalDataset(dataset),
    error =>
      error instanceof HistoricalDataValidationError &&
      error.issues.some(issue => expectedMessage.test(issue.message))
  );
};

test('valide le jeu fictif isolé et génère une relation déterministe', async () => {
  const dataset = await loadFixture();

  assert.doesNotThrow(() => validateHistoricalDataset(dataset));
  const relations = generateDerivedHistoricalRelations(dataset);
  assert.equal(relations.length, 1);
  assert.equal(relations[0].origin, 'generated');
  assert.equal(relations[0].relationType, 'co-presence');
  assert.deepEqual(relations[0].generatedFromPresenceIds, [
    'presence-test-alpha',
    'presence-test-beta'
  ]);
  assert.equal(
    relations.some(relation => relation.id.includes('staging-test-record')),
    false,
    'staging ne doit jamais participer à la génération'
  );
  assert.doesNotThrow(() =>
    validateGeneratedRelations(relations, dataset)
  );
});

test('refuse un identifiant dupliqué', async () => {
  const dataset = await loadFixture();
  dataset.people[1].person.id = dataset.people[0].person.id;
  expectInvalid(dataset, /Identifiant dupliqué/);
});

test('refuse une source inexistante', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].evidence[0].sourceId = 'source-absente';
  expectInvalid(dataset, /Source inexistante/);
});

test('refuse un calcul sans affirmations d’entrée', async () => {
  const dataset = await loadFixture();
  const evidence = dataset.claims[2].evidence[0];
  evidence.inputClaimIds = [];
  expectInvalid(dataset, /affirmations d’entrée/);
});

test('refuse une donnée relue sans source', async () => {
  const dataset = await loadFixture();
  dataset.people[0].sourceIds = [];
  expectInvalid(dataset, /au moins une source/);
});

test('refuse une période impossible', async () => {
  const dataset = await loadFixture();
  const period = dataset.claims[0].period;
  assert.ok(period?.start && period.end);
  period.start.yearMin = -4;
  period.start.yearMax = -4;
  period.end.yearMin = -8;
  period.end.yearMax = -8;
  expectInvalid(dataset, /borne de début/);
});

test('refuse un personnage ou un lieu inexistant', async () => {
  const dataset = await loadFixture();
  dataset.presences[0].personId = 'personne-absente';
  dataset.presences[0].placeId = 'lieu-absent';
  expectInvalid(dataset, /Personnage inexistant/);
  expectInvalid(dataset, /Lieu inexistant/);
});

test('refuse un fichier staging présenté comme validé', async () => {
  const dataset = await loadFixture();
  dataset.staging[0].workflowStatus = 'reviewed';
  dataset.staging[0].presentedAsValidated = true;
  expectInvalid(dataset, /staging ne peut pas être présenté/);
});

test('refuse une affirmation générée déposée dans reviewed', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].origin = 'generated';
  expectInvalid(dataset, /générée ne peut pas être enregistrée dans reviewed/);
});

test('refuse une longue reproduction à la place d’une référence courte', async () => {
  const dataset = await loadFixture();
  dataset.claims[0].evidence[0].shortReference = 'x'.repeat(281);
  expectInvalid(dataset, /dépasse 280 caractères/);
});
