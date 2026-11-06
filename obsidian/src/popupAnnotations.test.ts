import test from 'node:test';
import assert from 'node:assert/strict';
import {annotationsForPopupReference} from './popupAnnotations.ts';
import type {JwAnnotationIndex} from './jwAnnotations.ts';
import type {ReferenceEntry} from './referenceReader.ts';

const fixture:JwAnnotationIndex={
 format:'bible-lab-annotations',version:1,schema:16,sourceHash:'test',
 locations:[
  {id:1,book:41,chapter:10,document:null,issue:null,symbol:'nwtsty',language:3,type:0,specialty:null,edition:null},
  {id:2,book:41,chapter:11,document:null,issue:null,symbol:'nwtsty',language:3,type:0,specialty:null,edition:null},
  {id:3,book:null,chapter:null,document:123456789,issue:202611,symbol:'w',language:3,type:0,specialty:null,edition:null}
 ],
 marks:[
  {id:1,guid:'highlight-1',color:2,style:0,location:1},
  {id:2,guid:'highlight-2',color:1,style:0,location:2},
  {id:3,guid:'highlight-3',color:4,style:0,location:3}
 ],
 ranges:[
  {mark:1,blockType:1,identifier:14,start:0,end:4},
  {mark:2,blockType:1,identifier:1,start:0,end:4},
  {mark:3,blockType:1,identifier:7,start:3,end:8}
 ],
 notes:[{id:1,guid:'test-guid',title:'Ma réflexion',content:'Justice et affection',
   location:1,mark:1,blockType:1,blockIdentifier:14,created:null,modified:null,tags:['Amour']}],
 bookmarks:[{id:1,location:3,publicationLocation:3,slot:0,title:'Revoir le paragraphe',snippet:'Note',blockType:1,blockIdentifier:7}]
};
const ref=(label:string,url:string,kind:ReferenceEntry['kind']='scripture'):ReferenceEntry=>
 ({label,url,kind,origin:'pinned'});
test('popup displays chapter-anchored JW highlights and notes without guessing exact tokens',()=>{
 const found=annotationsForPopupReference(fixture,ref('Marc 10:14',
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/41/10'));
 assert.equal(found?.scope,'chapter');
 assert.deepEqual(found?.marks.map(x=>x.mark.id),[1]);
 assert.deepEqual(found?.notes.map(x=>x.content),['Justice et affection']);
 assert.equal(found?.marks[0].ranges[0].identifier,14);
 assert.equal(annotationsForPopupReference(fixture,
  ref('Marc 12:1','https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/41/12')),null);
});
test('popup supports direct WOL passage URLs and exact publication document IDs',()=>{
 const bible=annotationsForPopupReference(fixture,
  ref('Voir le chapitre','https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/41/11','publication'));
 assert.equal(bible?.marks[0].mark.id,2);
 const article=annotationsForPopupReference(fixture,ref('Article',
  'https://wol.jw.org/fr/wol/d/r30/lp-f/123456789#h=7','document'));
 assert.equal(article?.scope,'document');
 assert.deepEqual(article?.marks.map(x=>x.mark.id),[3]);
 assert.equal(article?.bookmarks[0].title,'Revoir le paragraphe');
 assert.equal(annotationsForPopupReference(fixture,
  ref('Article','https://example.com/fr/wol/d/r30/lp-f/123456789','document')),null);
});
