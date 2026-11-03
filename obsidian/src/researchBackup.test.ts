import test from 'node:test';
import assert from 'node:assert/strict';
import {addResearchPlan,addResearchBranch,emptyResearchDesk} from './researchDesk.ts';
import {addResearchCapture,addResearchIdea,renameResearchIdea,assignCaptureToIdea,
  emptyResearchCollection} from './researchCollection.ts';
import {emptyBibleLabArchive,recordWolSearch,updateLibraryEntry} from './researchArchive.ts';
import {buildBibleLabBackup,parseBibleLabBackup,researchStateCounts,backupFileName,
  MAX_BIBLE_LAB_BACKUP_BYTES} from './researchBackup.ts';

function demoState(){
  let desk=addResearchPlan(emptyResearchDesk());
  desk=addResearchBranch(desk,desk.activeId!);
  let collection=addResearchCapture(emptyResearchCollection(),{
    label:'Jean 7:24',excerpt:'Juger avec justice',
    url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3',
    planId:desk.activeId
  });
  collection=addResearchIdea(collection,desk.activeId);
  collection=renameResearchIdea(collection,collection.ideas[0].id,'Les anciens aiment leurs frères');
  collection=assignCaptureToIdea(collection,collection.ideas[0].id,collection.captures[0].id);
  let archive=updateLibraryEntry(emptyBibleLabArchive(),collection.captures[0].id,{
    tags:['anciens','amitié'],starred:true
  });
  archive=recordWolSearch(archive,{query:'anciens amitié',scope:'index',match:'par',
    url:'https://wol.jw.org/fr/wol/s/r30/lp-f?q=anciens+amiti%C3%A9',planId:desk.activeId});
  return {desk,collection,archive};
}
test('Complete backup round-trip preserves plans, associations, precise sources, tags and WOL history',()=>{
  const state=demoState();
  const json=buildBibleLabBackup(state,new Date('2026-11-03T22:00:00.000Z'));
  const restored=parseBibleLabBackup(json);
  assert.deepEqual(restored.state,state);
  assert.deepEqual(restored.counts,{
    plans:1,branches:1,captures:1,ideas:1,indexed:1,history:1
  });
  assert.equal(restored.exportedAt,'2026-11-03T22:00:00.000Z');
  assert.equal(restored.state.collection.captures[0].url.endsWith('#h=3'),true);
});
test('Malformed, oversized, foreign and incomplete backups are safely rejected',()=>{
  const state=demoState();
  const json=buildBibleLabBackup(state);
  assert.throws(()=>parseBibleLabBackup('{'),/JSON/);
  assert.throws(()=>parseBibleLabBackup(JSON.stringify({type:'unknown',version:1,data:state})),/ne provient/);
  assert.throws(()=>parseBibleLabBackup(' '.repeat(MAX_BIBLE_LAB_BACKUP_BYTES+1)),/volumineuse/);
  const malformed=JSON.parse(json);
  malformed.data.collection.ideas[0].captureIds=['missing'];
  assert.throws(()=>parseBibleLabBackup(JSON.stringify(malformed)),/fiche référence/);
});
test('Reject a forged WOL URL instead of importing unsafe links',()=>{
  const raw=JSON.parse(buildBibleLabBackup(demoState()));
  raw.data.collection.captures[0].url='https://wol.jw.org.evil.example/fr/wol/d/r30/lp-f/2024663';
  assert.throws(()=>parseBibleLabBackup(JSON.stringify(raw)),/source WOL/);
});
test('Backup filename is stable and gets a disambiguation suffix',()=>{
  const date=new Date('2026-11-03T21:35:22Z');
  assert.equal(backupFileName(date),'Bible-Lab_recherches_2026-11-03T21-35-22-000Z.json');
  assert.equal(backupFileName(date,2),'Bible-Lab_recherches_2026-11-03T21-35-22-000Z-2.json');
  assert.equal(researchStateCounts(demoState()).captures,1);
});
