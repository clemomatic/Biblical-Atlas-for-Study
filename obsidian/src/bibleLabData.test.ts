import test from 'node:test';
import assert from 'node:assert/strict';
import { extractReferences, jwLibraryLink, normalizeSearch, parseScripture, wolLookup, wolSearch, MAP_CHAPTERS, RESOURCES } from './bibleLabData.ts';

test('French and abbreviated scripture references yield stable JW Library links', () => {
  assert.equal(jwLibraryLink('Matthieu 10:29'),'https://www.jw.org/finder?wtlocale=F&bible=40010029');
  assert.equal(jwLibraryLink('Mt 10:29'),jwLibraryLink('Matthieu 10:29'));
  assert.equal(jwLibraryLink('Jean 7:24'),'https://www.jw.org/finder?wtlocale=F&bible=43007024');
  assert.equal(jwLibraryLink('1 Corinthiens 13:4'),'https://www.jw.org/finder?wtlocale=F&bible=46013004');
  assert.equal(parseScripture('Révélation 21:4')?.book,66);
  assert.equal(parseScripture('Psaumes 145:16')?.book,19);
  assert.equal(jwLibraryLink('enquête personnelle'),null);
  assert.equal(jwLibraryLink('Jean 0:10'),null);
  assert.equal(jwLibraryLink('Jean 7:0'),null);
});
test('WOL links safely encode the requested French query',()=>{
  assert.equal(wolSearch('Jéhovah & amour'),'https://wol.jw.org/fr/wol/s/r30/lp-f?q=J%C3%A9hovah%20%26%20amour');
  assert.equal(wolLookup('Jean 3:16'),'https://wol.jw.org/fr/wol/l/r30/lp-f?q=Jean%203%3A16');
});
test('Reference Tools markers and plain French verses can be found in a study note',()=>{
  const note='!!Matthieu 10:29; Jean 7:24!!\nUn détail : 1 Corinthiens 13:4 et Jean 7:24\n!!prophétie!!';
  const refs=extractReferences(note);
  for(const term of ['Matthieu 10:29','Jean 7:24','1 Corinthiens 13:4','prophétie'])assert.ok(refs.includes(term));
  assert.equal(refs.filter(x=>x==='Jean 7:24').length,1);
  assert.ok(extractReferences('Mt 10:29 ; Ps 145:16 ; 2 Co 4:16').includes('Mt 10:29'));
  assert.ok(extractReferences('Mt 10:29 ; Ps 145:16 ; 2 Co 4:16').includes('2 Co 4:16'));
  assert.ok(refs.length<=40);
});
test('Resources remain official links and map chapters are indexed',()=>{
  assert.equal(normalizeSearch('Jérusalem'), 'jerusalem');
  assert.ok(RESOURCES.some(r=>r.id==='appendix-c'&&r.url.startsWith('https://www.jw.org/')));
  assert.ok(MAP_CHAPTERS.some(([title,page])=>title==='La Terre promise'&&page===18));
});
