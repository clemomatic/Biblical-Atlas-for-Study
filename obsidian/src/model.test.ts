import test from 'node:test';
import assert from 'node:assert/strict';
import { atlasDeepLink, investigationCanvas, navigationForKey, noteFromMetadata, parseEntityKey, parseYear, projectPersonalNotes, safeFilename, validFolder } from './model.ts';

test('historical years reject zero, decimals, non-dates and impossible ranges', () => {
  for (const value of [0, '0', null, '', 'vers -607', '-607.5', true, Infinity, 50_001]) assert.equal(parseYear(value), undefined);
  assert.equal(parseYear('-607'), -607); assert.equal(parseYear(1), 1); assert.equal(parseYear(-1), -1);
});

test('vault paths cannot escape the selected folder or overwrite hidden configuration', () => {
  for (const path of ['/tmp', '../notes', 'Atlas/../notes', '.obsidian', 'Atlas//notes', 'C:\\notes', 'Atlas/.secret', 'Atlas\nsecret']) assert.throws(() => validFolder(path));
  assert.equal(validFolder('Étude\\Atlas/'), 'Étude/Atlas');
  assert.equal(safeFilename('../A:B#C[?]'), 'A B C');
});

test('only explicit entity metadata opts a note into the Atlas', () => {
  assert.equal(noteFromMetadata('Mes notes.md', 'Mes notes', { tags: ['Bible'] }), null);
  const note = noteFromMetadata('Mon étude.md', 'Mon étude', { atlas_entities: ['place:jerusalem', 'place:jerusalem', null, 'https://example.org', 'person:paul'] });
  assert.deepEqual(note?.keys, ['place:jerusalem', 'person:paul']);
  assert.equal(parseEntityKey('place:jerusalem\nscript'), null);
});

test('personal events retain stable IDs across renames and use the existing year-one bridge', () => {
  const fields = { atlas_schema: 1, atlas_kind: 'event', atlas_uid: 'event-stable', atlas_start_year: -1, atlas_end_year: 1, atlas_entities: ['place:jerusalem'] };
  const first = noteFromMetadata('Ancien.md', 'Ancien', fields)!;
  const renamed = noteFromMetadata('Dossier/Nouveau.md', 'Nouveau', fields)!;
  assert.deepEqual(first.keys, renamed.keys);
  const projection = projectPersonalNotes([first]);
  assert.equal(projection.events[0].id, 'vault-event-stable');
  assert.equal(projection.events[0].endPos - projection.events[0].startPos, 1);
  assert.deepEqual(projection.events[0].associatedLocationIds, ['jerusalem']);
  assert.equal(projection.events[0].certainty, 'unknown');
});

test('invalid or future-schema personal facts never become historical projections', () => {
  for (const fields of [
    { atlas_kind: 'event', atlas_uid: 'a', atlas_start_year: 0 },
    { atlas_kind: 'event', atlas_uid: 'a', atlas_start_year: 10, atlas_end_year: 5 },
    { atlas_kind: 'event', atlas_uid: 'a', atlas_start_year: -607, atlas_end_year: 'unknown' },
    { atlas_kind: 'event', atlas_start_year: -607 },
    { atlas_kind: 'place', atlas_uid: 'a', atlas_latitude: 95, atlas_longitude: 35 },
    { atlas_kind: 'place', atlas_uid: 'a', atlas_latitude: '31', atlas_longitude: 35 }
  ]) {
    const note = noteFromMetadata('Recherche.md', 'Recherche', { atlas_schema: 1, ...fields })!;
    assert.ok(note.warnings.length);
    assert.deepEqual(projectPersonalNotes([note]), { events: [], places: [] });
  }
  const future = noteFromMetadata('future.md', 'future', { atlas_schema: 2, atlas_kind: 'event', atlas_uid: 'a', atlas_start_year: -1, atlas_entities: ['place:jerusalem'] })!;
  assert.ok(future.warnings.length);
  assert.deepEqual(projectPersonalNotes([future]), { events: [], places: [] });
});

test('personal coordinates accept zero and stay separate from documentary places', () => {
  const note = noteFromMetadata('Lieu.md', 'Lieu', { atlas_schema: 1, atlas_kind: 'place', atlas_uid: 'equator', atlas_latitude: 0, atlas_longitude: 0 })!;
  const { places } = projectPersonalNotes([note]);
  assert.deepEqual(places[0].coordinates, [0, 0]);
  assert.equal(places[0].coordinatePrecision, 'approximate');
  assert.equal(places[0].sources?.[0].label, 'Note personnelle : Lieu.md');
});

test('Canvas contains real file references, unique IDs and valid edge endpoints', () => {
  const canvas = investigationCanvas('Question.md', ['A.md', 'B.md', 'A.md', 'Question.md']);
  const ids = canvas.nodes.map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(canvas.nodes.filter(node => node.type === 'file').map(node => node.file), ['Question.md', 'A.md', 'B.md']);
  for (const edge of canvas.edges) { assert.ok(ids.includes(edge.fromNode)); assert.ok(ids.includes(edge.toNode)); }
  assert.ok(canvas.nodes.every(node => node.width > 0 && node.height > 0));
  assert.equal(canvas.edges.filter(edge => edge.label === 'À explorer').length, 2);
});

test('deep links preserve vault names, exact IDs and route to the right view', () => {
  const link = new URL(atlasDeepLink('place:jerusalem', 'Étude & méditation'));
  assert.equal(link.searchParams.get('vault'), 'Étude & méditation');
  assert.equal(link.searchParams.get('entity'), 'place:jerusalem');
  assert.equal(navigationForKey('place:jerusalem').activeTab, 'map');
  assert.equal(navigationForKey('person:paul').personId, 'paul');
});
