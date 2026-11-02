import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_PRESETS, MAX_DOWNLOAD_TILES, tilesForRegion } from './tileMath.ts';
test('offline packs contain unique detail and parent tiles within the provider limit', () => {
  for (const preset of Object.values(MAP_PRESETS)) {
    const tiles = tilesForRegion(preset.bounds,preset.zoom);
    assert.ok(tiles.length > 0 && tiles.length <= MAX_DOWNLOAD_TILES);
    assert.equal(new Set(tiles.map(t => `${t.kind}/${t.z}/${t.x}/${t.y}`)).size,tiles.length);
    assert.equal(Math.max(...tiles.filter(t=>t.kind==='relief').map(t=>t.z)),6);
    assert.equal(Math.max(...tiles.filter(t=>t.kind==='vector').map(t=>t.z)),preset.zoom);
    assert.ok(tiles.some(t=>t.z===0 && t.kind==='vector'));
  }
});
test('oversized, reversed and invalid regions fail before network access', () => {
  assert.throws(()=>tilesForRegion({west:-180,east:180,south:-85,north:85},12),/3 000/);
  assert.throws(()=>tilesForRegion({west:40,east:30,south:20,north:30},5));
  assert.throws(()=>tilesForRegion({...MAP_PRESETS.promised.bounds,north:Infinity},5));
  assert.throws(()=>tilesForRegion(MAP_PRESETS.promised.bounds,20));
});
