import test from 'node:test';
import assert from 'node:assert/strict';
import { findScriptureMentions, extractReferences, jwLibraryLink, normalizeSearch, parseScripture, wolLookup, wolSearch, MAP_CHAPTERS, RESOURCES } from './bibleLabData.ts';

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
  assert.equal(wolLookup('w24 Novembre p. 14-19'),'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19');
  assert.equal(wolLookup('Jean 3:16'),'https://wol.jw.org/fr/wol/l/r30/lp-f?q=Jean+3%3A16');
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


test('Compiled citation matcher preserves original French text order, ranges and 40-entry cap',()=>{
 const line='Éph. 5:28-29 ; Ps. 145:16 ; 1 Corinthiens 13:4 ; Jean 7:24';
 assert.deepEqual(extractReferences(line),['Éph. 5:28-29','Ps. 145:16','1 Corinthiens 13:4','Jean 7:24']);
 assert.equal(extractReferences('Jean 7:24 et Jean 7:24').length,1);
 const large=Array.from({length:60},(_,i)=>'Psaumes '+(i+1)+':1').join('; ');
 const result=extractReferences(large);
 assert.equal(result.length,40);
 assert.equal(result[0],'Psaumes 1:1');
 assert.equal(result[39],'Psaumes 40:1');
});

test('Official French Bible abbreviations and exact verse list/range semantics',()=>{
 const examples=[
  ['Mat. 4:2, 3',40,4,[2,3]],
  ['Matt. 4:2,3',40,4,[2,3]],
  ['Jér. 3:1-4',24,3,[1,2,3,4]],
  ['Jér. 3:1–4',24,3,[1,2,3,4]],
  ['1Co 13:4-7',46,13,[4,5,6,7]],
  ['Php 2:5, 6',50,2,[5,6]],
  ['Sph 3:9',36,3,[9]],
  ['Ézéch. 36:26',26,36,[26]],
  ['2 Tim. 3:16, 17',55,3,[16,17]],
  ['Rév. 21:3, 4',66,21,[3,4]]
 ] as const;
 for(const [citation,book,chapter,verses] of examples){
  const parsed=parseScripture(citation);
  assert.equal(parsed?.book,book,citation);
  assert.equal(parsed?.chapter,chapter,citation);
  assert.deepEqual(parsed?.verses||[parsed?.verse],verses,citation);
 }
 assert.equal(parseScripture('Mat. 4:2, 3')?.endVerse,undefined,
  'Comma lists are not ranges');
 assert.equal(parseScripture('Jér. 3:1-4')?.endVerse,4,
  'Dash ranges include their upper endpoint');
 for(const invalid of ['Mat. 4:2-1','Mat. 4:2, 0','Mat. 4:170-300',
  'Mat. 4:2, 500','km 05/95','1Co 0:1'])assert.equal(parseScripture(invalid),null,invalid);
});
test('Extract citations without splitting comma lists or swallowing punctuation',()=>{
 const text='Lire Mat. 4:2, 3 ; Jér. 3:1-4 et Php 2:5, 6. Puis 1Co 13:4-7.';
 assert.deepEqual(extractReferences(text),
  ['Mat. 4:2, 3','Jér. 3:1-4','Php 2:5, 6','1Co 13:4-7']);
});

test('Semicolon continuations inherit the preceding canonical Bible book, not its chapter',()=>{
 const sample='Actes 1:8 ; 2:1-4, 32, 33 ; 3:6, 7 ; 7:56 ; 9:3-6, 10-16 ; 11:15-17 ; 13:2-4 ; 16:6-10';
 const matches=findScriptureMentions(sample);
 assert.deepEqual(matches.map(x=>x.ref.label),[
  'Actes 1:8','Actes 2:1-4, 32, 33','Actes 3:6, 7','Actes 7:56',
  'Actes 9:3-6, 10-16','Actes 11:15-17','Actes 13:2-4','Actes 16:6-10']);
 assert.deepEqual(matches[1].ref.verses,[1,2,3,4,32,33]);
 assert.deepEqual(matches[4].ref.verses,[3,4,5,6,10,11,12,13,14,15,16]);
 assert.deepEqual(findScriptureMentions('Rendez-vous à 2:30 ; 3:15'),[],
  'No bare chapters without an explicit book');
});

test('A reference spanning chapters is one complete source, never chapter 1 verse 1-3',()=>{
 const samples=['Dn 1:1 – 3:30','Dn 1:1-3:30','Dan. 1:1 — 3:30','Daniel 1:1–3:30'];
 for(const value of samples){
  const parsed=parseScripture(value);
  assert.equal(parsed?.book,27,value);
  assert.equal(parsed?.chapter,1,value);
  assert.equal(parsed?.verse,1,value);
  assert.equal(parsed?.endChapter,3,value);
  assert.equal(parsed?.endVerse,30,value);
  assert.equal(parsed?.label,'Daniel 1:1-3:30',value);
  const matches=findScriptureMentions('Lire '+value+' puis méditer.');
  assert.deepEqual(matches.map(x=>x.label),[value],value);
  assert.equal(matches[0]?.ref.endChapter,3,value);
 }
 assert.deepEqual(extractReferences('Dn 1:1 – 3:30'),['Dn 1:1 – 3:30']);
 const continued=findScriptureMentions('Daniel 1:1 ; 2:1 – 3:30');
 assert.deepEqual(continued.map(x=>x.ref.label),['Daniel 1:1','Daniel 2:1-3:30']);
 for(const invalid of ['Dn 3:30 – 1:1','Dn 1:1 – 0:30','Dn 1:1 – 9:30',
   'Dn 1:1 – 3:0','Dn 1:1 – 3:500']){
  assert.equal(parseScripture(invalid),null,invalid);
  assert.equal(findScriptureMentions(invalid).length,0,invalid);
 }
});
