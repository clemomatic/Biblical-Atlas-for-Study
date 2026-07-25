import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadHistoricalDataset } from './contentIO.ts';
import { generateDerivedHistoricalRelations } from './contentGeneration.ts';

const contentRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'content'
);

test('A6 sépare les corègnes et les règnes disputés', async () => {
  const dataset = await loadHistoricalDataset(contentRoot);
  const relations = generateDerivedHistoricalRelations(dataset);

  const joachazJoas = relations.find(
    relation =>
      relation.relationLevel === 'simultaneous-reigns' &&
      relation.subjectIds.includes('event-joachaz-1d329mk') &&
      relation.subjectIds.includes('event-joas-1o337ml')
  );
  assert.ok(joachazJoas);
  assert.equal(joachazJoas.certainty, 'possible');

  const omriTibni = relations.find(
    relation =>
      relation.relationLevel === 'simultaneous-reigns' &&
      relation.subjectIds.includes('event-omri-seul-ub6jpn') &&
      relation.subjectIds.includes('person-tibni-a6-a')
  );
  assert.ok(omriTibni);
  assert.equal(omriTibni.certainty, 'possible');
});

test('un chevauchement roi-prophète reste distinct d’une interaction', async () => {
  const dataset = await loadHistoricalDataset(contentRoot);
  const relations = generateDerivedHistoricalRelations(dataset);

  const overlap = relations.find(
    relation =>
      relation.relationLevel === 'prophet-during-reign' &&
      relation.subjectIds.includes('event-elie-1nckpyy') &&
      relation.subjectIds.includes('event-achab-rnxk2l')
  );
  assert.ok(overlap);
  assert.equal(overlap.certainty, 'possible');

  const interaction = relations.find(
    relation =>
      relation.relationLevel === 'documented-interaction' &&
      relation.subjectIds.includes('event-elie-1nckpyy') &&
      relation.subjectIds.includes('event-achab-rnxk2l')
  );
  assert.ok(interaction);
  assert.deepEqual(interaction.supportingClaimIds, [
    'claim-interaction-elie-achab'
  ]);
});

test('une capitale administrative ne produit pas une présence collective', async () => {
  const dataset = await loadHistoricalDataset(contentRoot);
  const reignSeatPresences = dataset.presences.filter(
    presence =>
      presence.presenceType === 'reign-seat' &&
      presence.supportingClaimIds.includes(
        'claim-joram-israel-presence-samaria'
      )
  );

  assert.equal(reignSeatPresences.length, 1);
  assert.equal(reignSeatPresences[0].personId, 'event-joram-dcjw4c');
  assert.equal(reignSeatPresences[0].placeId, 'samaria');
});
