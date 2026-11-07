import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseScripture} from './bibleLabData.ts';
import {selectLocalPassage,searchableVerses,bibleSearchTerms,matchesBibleSearch,encodeLocalBible,decodeLocalBible,type LocalBibleData} from './localBibleData.ts';
const data:LocalBibleData={schema:1,sourceHash:'a'.repeat(64),publication:{symbol:'nwtsty',language:3,year:2026,title:'Bible de test'},chapters:[
  {book:19,chapter:3,verses:[{number:0,text:'Un titre distinct'},{number:1,text:'Ô Jéhovah, entends ma prière.'}]},
  {book:43,chapter:7,verses:[{number:23,text:'La patience.'},{number:24,text:'Le jugement équitable, au-delà de l’apparence.'},{number:25,text:'Un autre verset.'},{number:26,text:'La bonté et la patience.'}]},
  {book:43,chapter:8,verses:[{number:1,text:'Un début.'},{number:2,text:'La suite.'},{number:12,text:'Un verset après une lacune.'}]}
]};
test('Local passages select exact disjoint verses and preserve their numbers',()=>{
  const found=selectLocalPassage(data,parseScripture('Jean 7:24,26')!);
  assert.deepEqual(found?.map(v=>v.number),[24,26]);assert.ok(found?.[0].text.includes('équitable'));
});
test('The official Nahum label and the legacy Nahoum spelling identify the same book',()=>{
  assert.equal(parseScripture('Nahum 1:1')?.book,34);
  assert.equal(parseScripture('Nahoum 1:1')?.book,34);
  assert.equal(parseScripture('Nahoum 1:1')?.label,'Nahum 1:1');
});
test('A local range never substitutes its neighbouring paragraph for a missing verse',()=>{
  assert.equal(selectLocalPassage(data,parseScripture('Jean 8:1-12')!),null);
  assert.equal(selectLocalPassage(data,parseScripture('Jean 7:22')!),null);
  assert.equal(selectLocalPassage(data,parseScripture('Matthieu 7:24')!),null);
});
test('Cross-chapter selection includes the end verse and identifies both chapters',()=>{
  const found=selectLocalPassage(data,parseScripture('Jean 7:25-8:2')!);
  assert.deepEqual(found?.map(v=>[v.chapter,v.number]),[[7,25],[7,26],[8,1],[8,2]]);
});
test('Verse search ignores accents, case and apostrophe styles without joining separate verses',()=>{
  const index=searchableVerses(data);
  const find=(q:string,book=0)=>index.filter(v=>matchesBibleSearch(v,bibleSearchTerms(q),book));
  assert.equal(find('JEHOVAH PRIERE')[0]?.book,19);
  assert.deepEqual(find("EQUITABLE l'apparence").map(v=>v.number),[24]);
  assert.equal(find('patience apparence').length,0);
  assert.equal(find('titre').length,0);assert.equal(find('patience',19).length,0);
  assert.equal(find('').length,0);
});
test('Persisted verse data round-trips and rejects foreign, duplicate or corrupt records',()=>{
  assert.deepEqual(decodeLocalBible(encodeLocalBible(data)),data);
  assert.throws(()=>decodeLocalBible(new Uint8Array([1,2,3])));
  assert.throws(()=>encodeLocalBible({...data,publication:{...data.publication,language:0}}));
  assert.throws(()=>encodeLocalBible({...data,chapters:[...data.chapters,data.chapters[0]]}));
  assert.throws(()=>encodeLocalBible({...data,chapters:[{book:43,chapter:7,verses:[{number:2,text:'a'},{number:2,text:'b'}]}]}));
});
