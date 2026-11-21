import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWolIndexRows, officialIndexHref, MAX_INDEX_ROWS, MAX_INDEX_LINKS } from './wolIndexExplorer.ts';

const BASE = 'https://wol.jw.org/fr/wol/d/r30/lp-f/1200271433';

test('official index links reject foreign domains and unsafe protocols', () => {
  assert.equal(officialIndexHref('javascript:alert(1)', BASE), null);
  assert.equal(officialIndexHref('https://other.example/fr/wol/d/r30/lp-f/123', BASE), null);
  assert.equal(officialIndexHref('http://wol.jw.org/fr/wol/d/r30/lp-f/123', BASE), null);
  assert.equal(officialIndexHref('https://wol.jw.org/other/path', BASE), null);
  assert.equal(officialIndexHref('/fr/wol/d/r30/lp-f/2019485', BASE),
    'https://wol.jw.org/fr/wol/d/r30/lp-f/2019485');
});

test('index context preceding references stays grouped with each article', () => {
  const result = groupWolIndexRows([
    { context: 'comment cultiver', references: [
      { label: 'w19.07 5-6', url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/2019485' },
      { label: 'mwb17.08 4', url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/202017285' }
    ]},
    { context: 'comment rester courageux', references: [
      { label: 'w93 15/11 21-22', url: 'https://wol.jw.org/fr/wol/d/r30/lp-f/1993845' }
    ]}
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].context, 'comment cultiver');
  assert.deepEqual(result[0].references.map(ref => ref.label), ['w19.07 5-6','mwb17.08 4']);
  assert.equal(result[1].context, 'comment rester courageux');
});

test('duplicate citations are deduplicated but distinct Index sections are preserved', () => {
  const url = 'https://wol.jw.org/fr/wol/d/r30/lp-f/2019485';
  const rows = groupWolIndexRows([
    { section: 'exemples', context: 'dans la famille', references: [{ label: 'w19', url }] },
    { section: 'exemples', context: 'dans la famille', references: [{ label: 'w19', url }] },
    { section: 'facteurs', context: 'dans la famille', references: [{ label: 'w19', url }] }
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].references.length, 1);
  assert.equal(rows[1].section, 'facteurs');
});

test('limits protect the sidebar from Index documents with thousands of links', () => {
  const items = Array.from({length: MAX_INDEX_ROWS + 50}, (_, i) => ({
    context: 'rubrique '+i,
    references: [{label:'w'+i, url:'https://wol.jw.org/fr/wol/d/r30/lp-f/'+(100000+i)}]
  }));
  assert.equal(groupWolIndexRows(items).length, MAX_INDEX_ROWS);
  const large = groupWolIndexRows([{context:'refs',references:Array.from({length: MAX_INDEX_LINKS + 50}, (_, i) => ({
    label:'citation '+i, url:'https://wol.jw.org/fr/wol/d/r30/lp-f/'+(300000+i)
  }))}]);
  assert.equal(large[0].references.length, MAX_INDEX_LINKS);
});
