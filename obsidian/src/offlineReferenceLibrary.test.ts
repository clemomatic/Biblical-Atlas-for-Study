import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOfflineIndex,directWolMepsId } from './offlinePublications.ts';
test('An exact document ID maps only to the matching imported French document',()=>{
 const manifests=[
  {schema:1,publication:{symbol:'w26',year:2026,language:3,title:'La Tour de Garde'},documents:[
    {documentId:10,mepsId:2026440,title:'Article 1',path:'010 · Article 1.md'},
    {documentId:11,mepsId:2026441,title:'Article 2',path:'011 · Article 2.md'}
  ]},
  {schema:1,publication:{symbol:'int',year:2026,language:0,title:'Instruction privée'},documents:[
    {documentId:10,mepsId:2026440,title:'Instruction',path:'010 · Instruction.md'}
  ]}
 ];
 const matches=manifests.map(validateOfflineIndex).filter(x=>x&&x.publication.language===3)
   .flatMap(x=>x!.documents.filter(x=>x.mepsId===directWolMepsId('https://wol.jw.org/fr/wol/d/r30/lp-f/2026441#h=8')));
 assert.deepEqual(matches.map(x=>x.title),['Article 2']);
 assert.equal(directWolMepsId('https://wol.jw.org/fr/wol/s/r30/lp-f?q=2026441'),null);
});
