import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import type {
  SourceCatalogEntry,
  StagingHistoricalRecord
} from './contentTypes.ts';
import { generateDerivedHistoricalRelations } from './contentGeneration.ts';
import { loadHistoricalDataset } from './contentIO.ts';
import {
  promoteReviewedStagingEvents,
  StagingPromotionError
} from './stagingPromotion.ts';

const contentRoot = join(process.cwd(), 'content');

const readJson = async <T>(relativePath: string): Promise<T> =>
  JSON.parse(
    await readFile(join(contentRoot, relativePath), 'utf8')
  ) as T;

const loadPilot = async () => Promise.all([
  readJson<StagingHistoricalRecord[]>(
    'staging/a7-b-debut-ministere.json'
  ),
  readJson<SourceCatalogEntry[]>('sources/source-catalog.json')
]);

test('promeut les neuf lignes relues du pilote A7-B', async () => {
  const [records, sources] = await loadPilot();
  const promotion = promoteReviewedStagingEvents(records, sources);

  assert.equal(promotion.promotedRecordIds.length, 9);
  assert.equal(promotion.skippedRecordIds.length, 0);
  assert.equal(promotion.events.length, 9);
  assert.equal(promotion.claims.length, 27);
  assert.equal(promotion.presences.length, 11);
  assert.equal(promotion.unresolvedItems.length, 6);
  assert.ok(
    promotion.events.every(
      record =>
        record.event.period &&
        record.event.certainty &&
        record.event.biblicalReferences?.length
    )
  );
});

test('ignore explicitement une ligne qui n’est pas relue', async () => {
  const [records, sources] = await loadPilot();
  const pendingRecords = structuredClone(records);
  const payload = pendingRecords[0].payload as {
    review: { status: string };
  };
  payload.review.status = 'pending';

  const promotion = promoteReviewedStagingEvents(pendingRecords, sources);
  assert.deepEqual(promotion.skippedRecordIds, [
    'staging-a7b-01-bapteme'
  ]);
  assert.equal(promotion.events.length, 8);
  assert.equal(
    promotion.events.some(
      record => record.event.id === 'event-a7b-bapteme-jesus'
    ),
    false
  );
});

test('refuse une promotion dont les identifiants ne sont pas vérifiés', async () => {
  const [records, sources] = await loadPilot();
  const invalidRecords = structuredClone(records);
  const payload = invalidRecords[0].payload as {
    review: { entityIdsVerified: boolean };
  };
  payload.review.entityIdsVerified = false;

  assert.throws(
    () => promoteReviewedStagingEvents(invalidRecords, sources),
    (error: unknown) =>
      error instanceof StagingPromotionError &&
      error.issues.some(issue =>
        issue.message.includes('identifiants')
      )
  );
});

test('conserve les mentions non modélisées sans inventer de personne', async () => {
  const [records, sources] = await loadPilot();
  const promotion = promoteReviewedStagingEvents(records, sources);
  const baptism = promotion.events.find(
    record => record.event.id === 'event-a7b-bapteme-jesus'
  );

  assert.ok(baptism);
  assert.ok(
    baptism.event.participantMentions?.some(
      mention => mention.label === 'Jéhovah' && !mention.personId
    )
  );
  assert.equal(
    promotion.claims.some(
      claim => claim.subject.entityId.includes('jehovah')
    ),
    false
  );
});

test('génère les relations A7-B sans transformer une période commune en rencontre', async () => {
  const dataset = await loadHistoricalDataset(contentRoot);
  const relations = generateDerivedHistoricalRelations(dataset);
  const crossEventPresence = relations.find(
    relation =>
      relation.relationLevel === 'same-place' &&
      relation.eventIds?.includes('event-a7b-purification-temple') &&
      relation.eventIds?.includes('event-a7b-entretien-nicodeme')
  );

  assert.equal(crossEventPresence?.certainty, 'possible');
  assert.equal(
    relations.filter(
      relation => relation.relationLevel === 'documented-interaction'
    ).length,
    2
  );
  assert.equal(
    relations.some(
      relation =>
        relation.relationLevel === 'documented-interaction' &&
        relation.subjectIds.includes('event-jean-le-baptiseur-dvgl2c') &&
        relation.subjectIds.includes(
          'event-jesus-en-tant-qu-humain-1f4ceyz'
        )
    ),
    false
  );
});
