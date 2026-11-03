import test from 'node:test';
import assert from 'node:assert/strict';
import { addResearchCapture, addResearchIdea, assignCaptureToIdea, emptyResearchCollection } from './researchCollection.ts';
import {
  emptyBibleLabArchive, normalizeBibleLabArchive, updateLibraryEntry, libraryResults,
  recordWolSearch, removeHistoryEntry, clearResearchHistory, pruneMissingCaptures
} from './researchArchive.ts';
test('Library tags are flexible, searchable, deduplicated and remain local',()=>{
  let collection=addResearchCapture(emptyResearchCollection(),{
    label:'Précieuse réflexion sur l’amitié',comment:'Bon pour une autre recherche'
  });
  const id=collection.captures[0].id;
  let archive=updateLibraryEntry(emptyBibleLabArchive(),id,{
    tags:['Anciens','amitié','AMITIÉ'],starred:true,archived:true
  });
  assert.deepEqual(archive.entries[0].tags,['Anciens','amitié']);
  assert.equal(libraryResults(archive,collection,{term:'AMITIE',filter:'favorites'}).length,1);
  assert.equal(libraryResults(archive,collection,{filter:'archived'}).length,1);
  assert.equal(libraryResults(archive,collection,{filter:'inbox'}).length,0);
  archive=updateLibraryEntry(archive,id,{archived:false});
  assert.equal(libraryResults(archive,collection,{filter:'inbox'}).length,1);
  collection=addResearchIdea(collection);
  collection=assignCaptureToIdea(collection,collection.ideas[0].id,id);
  assert.equal(libraryResults(archive,collection,{filter:'inbox'}).length,0);
});
test('WOL search history is scoped, deduplicated, limited and never stores non-WOL links',()=>{
  let archive=emptyBibleLabArchive();
  archive=recordWolSearch(archive,{query:'anciens',scope:'index',match:'par',
    url:'https://wol.jw.org/fr/wol/s/r30/lp-f?q=anciens&fc%5B%5D=dx',planId:'p1'});
  assert.equal(archive.history.length,1);
  assert.equal(archive.history[0].planId,'p1');
  archive=recordWolSearch(archive,{query:'anciens',scope:'index',match:'par',
    url:'https://wol.jw.org/fr/wol/s/r30/lp-f?q=anciens&fc%5B%5D=dx',planId:'p1'});
  assert.equal(archive.history.length,1);
  archive=recordWolSearch(archive,{query:'vol de données',scope:'all',match:'par',
    url:'https://wol.jw.org.evil.example/'});
  assert.equal(archive.history.length,1);
  const fromJson=normalizeBibleLabArchive(JSON.parse(JSON.stringify(archive)));
  assert.deepEqual(fromJson,archive);
  archive=removeHistoryEntry(archive,archive.history[0].id);
  assert.equal(archive.history.length,0);
  assert.equal(clearResearchHistory(fromJson).history.length,0);
});
test('Deleting a captured source can prune its library metadata but not search history',()=>{
  const collection=addResearchCapture(emptyResearchCollection(),{label:'source'});
  let archive=updateLibraryEntry(emptyBibleLabArchive(),collection.captures[0].id,{tags:['un sujet']});
  archive=pruneMissingCaptures(archive,emptyResearchCollection());
  assert.equal(archive.entries.length,0);
});
