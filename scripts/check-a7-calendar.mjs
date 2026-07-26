import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { promoteReviewedStagingEvents } from '../src/domain/history/stagingPromotion.ts';

const contentRoot = join(process.cwd(), 'content');
const appendices = [
  ['a7-a', 'a7-a-avant-ministere.json'],
  ['a7-b', 'a7-b-debut-ministere.json'],
  ['a7-c', 'a7-c-ministere-galilee-1.json'],
  ['a7-d', 'a7-d-ministere-galilee-2.json'],
  ['a7-e', 'a7-e-galilee-3-judee.json'],
  ['a7-f', 'a7-f-est-jourdain.json'],
  ['a7-g', 'a7-g-ministere-final-1.json'],
  ['a7-h', 'a7-h-ministere-final-2.json']
];

const readJson = async (...segments) =>
  JSON.parse(await readFile(join(contentRoot, ...segments), 'utf8'));

const sources = await readJson('sources', 'source-catalog.json');
const sourceIds = new Set(sources.map(source => source.id));
const allEventIds = [];
const summary = [];

for (const [code, stagingFile] of appendices) {
  const expectedSourceId = `source-nwtsty-${code}`;
  const source = sources.find(candidate => candidate.id === expectedSourceId);
  if (!source || source.verificationStatus !== 'verified') {
    throw new Error(`${code} ne possède pas de source vérifiée.`);
  }
  const staging = await readJson('staging', stagingFile);
  const reviewedEvents = await readJson(
    'reviewed',
    'events',
    `${code}-events.json`
  );
  const reviewedClaims = await readJson(
    'reviewed',
    'claims',
    `${code}-claims.json`
  );
  const reviewedPresences = await readJson(
    'reviewed',
    'presences',
    `${code}-presences.json`
  );
  const promoted = promoteReviewedStagingEvents(staging, sources);

  for (const [label, actual, expected] of [
    ['événements', reviewedEvents, promoted.events],
    ['affirmations', reviewedClaims, promoted.claims],
    ['présences', reviewedPresences, promoted.presences]
  ]) {
    if (!isDeepStrictEqual(actual, expected)) {
      throw new Error(
        `${code} : les ${label} reviewed ne correspondent pas à la promotion reproductible du staging.`
      );
    }
  }
  reviewedEvents.forEach(record => {
    if (!record.sourceIds.every(sourceId => sourceIds.has(sourceId))) {
      throw new Error(`${record.event.id} cite une source inexistante.`);
    }
    if (!record.event.biblicalReferences?.length) {
      throw new Error(`${record.event.id} ne cite aucune référence biblique.`);
    }
    allEventIds.push(record.event.id);
  });
  summary.push({
    appendix: code.toUpperCase(),
    events: reviewedEvents.length,
    claims: reviewedClaims.length,
    presences: reviewedPresences.length,
    unresolved: promoted.unresolvedItems.length
  });
}

if (new Set(allEventIds).size !== allEventIds.length) {
  throw new Error('Des identifiants d’événements sont dupliqués entre appendices.');
}

const routes = await readJson('reviewed', 'routes', 'a7-routes.json');
if (routes.length !== appendices.length) {
  throw new Error(`8 itinéraires A7 attendus, ${routes.length} trouvés.`);
}
routes.forEach(record => {
  if (
    record.route.geometryPrecision !== 'schematic' ||
    record.route.notForExactNavigation !== true
  ) {
    throw new Error(
      `${record.route.id} doit rester schématique et impropre à la navigation exacte.`
    );
  }
});

console.table(summary);
console.log(
  `Calendrier A7 reproductible : ${allEventIds.length} événements relus, ` +
    `${routes.length} itinéraires schématiques, aucun doublon d’ID.`
);
