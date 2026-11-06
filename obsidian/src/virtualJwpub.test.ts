import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVirtualIndex,encodeVirtualTexts,decodeVirtualTexts,
  validateVirtualIndex,VIRTUAL_TEXT,VIRTUAL_SOURCE
} from './virtualJwpub.ts';

const publication={symbol:'it-1',year:1988,language:3,title:'Étude perspicace, volume 1'};
const docs=[
 {documentId:1,mepsId:123,title:'Abel',path:'001 · Abel.md',text:'# Abel\n\nUne réflexion sur la foi.'},
 {documentId:2,mepsId:null,title:'Aaron',path:'002 · Aaron.md',text:'# Aaron\n\nUne longue entrée d’étude.'}
];

test('virtual JWPUB stores one manifest and compressed text cache, not markdown notes',()=>{
 const index=createVirtualIndex(publication,docs);
 assert.equal(index.schema,1);
 assert.equal(index.contentsFile,VIRTUAL_TEXT);
 assert.equal(index.sourceFile,VIRTUAL_SOURCE);
 assert.equal(index.documents.length,2);
 assert.equal(index.documents[0].mepsId,123);
 assert.ok(index.documents.every(d=>!Object.hasOwn(d,'text')));
 assert.deepEqual(validateVirtualIndex(index),index);
 const bytes=encodeVirtualTexts(docs);
 const restored=decodeVirtualTexts(bytes);
 assert.equal(restored.get(1),docs[0].text);
 assert.equal(restored.get(2),docs[1].text);
});
test('virtual reader detects damaged data and rejects bad manifests',()=>{
 assert.throws(()=>decodeVirtualTexts(new Uint8Array([1,2,3])),/incorrect/);
 assert.equal(validateVirtualIndex({...createVirtualIndex(publication,docs),schema:2}),null);
 assert.equal(validateVirtualIndex({...createVirtualIndex(publication,docs),documents:[docs[0],docs[0]]}),null);
});
test('Bible coordinates survive indexing and invalid chapter metadata is rejected',()=>{
 const chapter={documentId:1800000007,mepsId:null,title:'Jean 7',path:'Jean 7.md',bookNumber:43,chapterNumber:7,text:'# Jean 7\n\nUn texte de test.'};
 const index=createVirtualIndex({symbol:'nwtsty',year:2026,language:3,title:'Bible'},[chapter]);
 assert.deepEqual(validateVirtualIndex(index)?.documents[0],{documentId:chapter.documentId,mepsId:null,title:chapter.title,path:chapter.path,bookNumber:43,chapterNumber:7});
 assert.equal(validateVirtualIndex({...index,documents:[{...index.documents[0],chapterNumber:0}]}),null);
});
