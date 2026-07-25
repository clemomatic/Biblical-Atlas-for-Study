import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONTENT_ROOT = join(ROOT, 'content');
const SOURCE_ID = 'source-nwtsty-b10';

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const readJsonDirectory = async directory => {
  const entries = await readdir(directory, { withFileTypes: true });
  const values = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) values.push(...await readJsonDirectory(path));
    else if (entry.name.endsWith('.json')) {
      const value = await readJson(path);
      values.push(...(Array.isArray(value) ? value : [value]));
    }
  }
  return values;
};
const assert = (condition, message) => {
  if (!condition) throw new Error(`B10 invalide : ${message}`);
};

const [catalog, report, staging, links, events, presences, routes] =
  await Promise.all([
    readJson(join(CONTENT_ROOT, 'sources', 'source-catalog.json')),
    readJson(join(CONTENT_ROOT, 'generated', 'b10-geography-report.json')),
    readJson(join(CONTENT_ROOT, 'staging', 'b10-israel-temps-jesus.json')),
    readJson(join(CONTENT_ROOT, 'reviewed', 'geography', 'b10-israel-temps-jesus.json')),
    readJsonDirectory(join(CONTENT_ROOT, 'reviewed', 'events')),
    readJsonDirectory(join(CONTENT_ROOT, 'reviewed', 'presences')),
    readJsonDirectory(join(CONTENT_ROOT, 'reviewed', 'routes'))
  ]);

const source = catalog.find(entry => entry.id === SOURCE_ID);
assert(source, 'la source B10 manque au catalogue.');
assert(source.documentType === 'map', 'B10 doit être catalogué comme carte.');
assert(source.factualDataUseAllowed === true, 'l’usage factuel doit être explicite.');
assert(source.longTextReproductionAllowed === false, 'les longs extraits doivent rester interdits.');
assert(source.imageReproductionAllowed === false, 'la reproduction de l’image doit rester interdite.');

assert(report.sourceId === SOURCE_ID && report.mapId === 'B10', 'le rapport ne cible pas B10.');
assert(report.policy.imageCopied === false, 'aucune image source ne doit être copiée.');
assert(report.policy.coordinatesChanged === false, 'aucune coordonnée ne doit être modifiée.');
assert(report.policy.routesCreated === 0, 'B10 ne documente aucun ordre de déplacement exploitable.');
assert(report.counts.routesCreated === 0, 'le compteur de routes doit rester nul.');
assert(report.inventory.length === report.counts.sourceLabels, 'le décompte des libellés est incohérent.');
assert(
  report.counts.matchedLabels + report.counts.missingLabels === report.counts.sourceLabels,
  'les libellés rapprochés et manquants ne couvrent pas l’inventaire.'
);

const matchedInventory = report.inventory.filter(item => item.status === 'matched');
const missingInventory = report.inventory.filter(item => item.status === 'missing');
const placeLinks = links.filter(link => link.subject.entityType === 'place');
const eventLinks = links.filter(link => link.subject.entityType === 'event');
assert(staging.length === report.counts.sourceLabels, 'le staging doit conserver chaque libellé source.');
assert(staging.every(item => item.workflowStatus === 'staging'), 'un enregistrement de staging est présenté comme validé.');
assert(placeLinks.length === matchedInventory.length, 'chaque rapprochement de lieu doit avoir une provenance.');
assert(placeLinks.length === report.counts.placeLinks, 'le compteur des provenances de lieux est incohérent.');
assert(eventLinks.length === report.counts.eventLinks, 'le compteur des provenances d’événements est incohérent.');

const inventoryPlaceIds = new Set(matchedInventory.map(item => item.placeId));
const eventIds = new Set(events.map(record => record.event.id));
const presenceById = new Map(presences.map(presence => [presence.id, presence]));

links.forEach(link => {
  assert(link.workflowStatus === 'reviewed' && link.origin === 'reviewed', `${link.id} n’est pas une provenance relue.`);
  assert(link.sourceIds.includes(SOURCE_ID), `${link.id} ne cite pas B10.`);
  assert(link.primarySourceId === SOURCE_ID, `${link.id} n’identifie pas B10 comme source cartographique principale.`);
  assert(link.coordinatesChanged === false, `${link.id} prétend modifier une coordonnée.`);
  assert(Boolean(link.limitations?.trim()), `${link.id} ne précise pas ses limites.`);
  assert(inventoryPlaceIds.has(link.placeId), `${link.id} cible un lieu absent de l’inventaire rapproché.`);

  if (link.subject.entityType === 'event') {
    assert(eventIds.has(link.subject.entityId), `${link.id} cible un événement inexistant.`);
    assert(link.eventIds?.includes(link.subject.entityId), `${link.id} ne reprend pas son événement sujet.`);
    assert(link.sourceIds.some(sourceId => /^source-nwtsty-a7-[a-h]$/.test(sourceId)), `${link.id} ne cite pas l’appendice A7 qui porte l’événement.`);
    for (const presenceId of link.presenceEpisodeIds ?? []) {
      const presence = presenceById.get(presenceId);
      assert(presence, `${link.id} cite une présence inexistante : ${presenceId}.`);
      assert(presence.placeId === link.placeId, `${presenceId} ne concerne pas le lieu de ${link.id}.`);
      assert(presence.associatedEventIds?.includes(link.subject.entityId), `${presenceId} ne justifie pas l’événement de ${link.id}.`);
    }
  }
});

const reusedPresenceCount = new Set(
  eventLinks.flatMap(link => link.presenceEpisodeIds ?? [])
).size;
assert(
  reusedPresenceCount === report.counts.presenceEpisodesReused,
  'le compteur des présences réutilisées est incohérent.'
);
assert(
  routes.every(record => !record.sourceIds.includes(SOURCE_ID)),
  'une route a été créée ou attribuée à B10 sans ordre de déplacement documenté.'
);

const quranEntry = report.inventory.find(item => item.label === 'Qumran');
assert(quranEntry?.status === 'missing', 'Qumran ne doit pas être assimilé automatiquement à Sekaka.');
for (const [label, expectedId] of [
  ['Capharnaüm', 'capernaum'],
  ['Bethléem', 'bethlehem'],
  ['Bersabée', 'beersheba']
]) {
  const item = report.inventory.find(candidate => candidate.label === label);
  assert(item?.placeId === expectedId, `${label} n’est pas rapproché de son identifiant stable.`);
}

console.log(
  `B10 vérifié : ${matchedInventory.length}/${report.counts.sourceLabels} libellés rapprochés, ` +
    `${missingInventory.length} à examiner, ${eventLinks.length} événement(s), ` +
    `${reusedPresenceCount} présence(s), 0 route créée.`
);
