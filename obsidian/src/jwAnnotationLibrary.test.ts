import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annotationsForDocument,annotationsForBibleChapter,bibleAnnotationChapters,
  bibleBookName,searchPersonalAnnotations
} from './jwAnnotationLibrary.ts';
import type {JwAnnotationIndex} from './jwAnnotations.ts';

const base:JwAnnotationIndex={
 format:'bible-lab-annotations',version:1,schema:16,sourceHash:'fixture',
 locations:[
  {id:1,book:null,chapter:null,document:120030,issue:202609,symbol:'w',language:3,type:0,specialty:null,edition:null},
  {id:2,book:null,chapter:null,document:4,issue:202609,symbol:'w',language:3,type:0,specialty:null,edition:null},
  {id:3,book:41,chapter:10,document:null,issue:null,symbol:'nwtsty',language:3,type:0,specialty:null,edition:null},
  {id:4,book:41,chapter:11,document:null,issue:null,symbol:'nwtsty',language:3,type:0,specialty:null,edition:null},
  {id:5,book:null,chapter:null,document:120030,issue:202610,symbol:'w',language:3,type:0,specialty:null,edition:null}
 ],
 marks:[
  {id:10,guid:'m1',color:3,style:0,location:1},
  {id:11,guid:'m2',color:2,style:0,location:3},
  {id:12,guid:'m3',color:4,style:0,location:5}
 ],
 ranges:[
  {mark:10,blockType:1,identifier:7,start:0,end:4},
  {mark:11,blockType:1,identifier:14,start:0,end:6}
 ],
 notes:[
  {id:9,guid:'n1',title:'Patience et amitié',content:'Cultiver la patience',location:1,mark:10,blockType:1,blockIdentifier:7,created:null,modified:null,tags:['Relations']},
  {id:10,guid:'n2',title:'La justice',content:'Jésus réagit',location:3,mark:11,blockType:1,blockIdentifier:14,created:null,modified:null,tags:[]}
 ],
 bookmarks:[
  {id:1,location:1,publicationLocation:1,slot:0,title:'Revenir',snippet:'Passage',blockType:1,blockIdentifier:7}
 ]
};
test('article annotations prefer exact MEPS IDs and avoid magazine issue collisions',()=>{
 const found=annotationsForDocument(base,{symbol:'w',issue:'202609',language:3},
   {documentId:4,mepsId:120030});
 assert.equal(found?.confidence,'exact-meps');
 assert.deepEqual(found?.marks.map(x=>x.mark.id),[10]);
 assert.deepEqual(found?.notes.map(x=>x.title),['Patience et amitié']);
 assert.equal(found?.bookmarks.length,1);
 assert.equal(annotationsForDocument(base,{symbol:'w',issue:'202608',language:3},
   {documentId:4,mepsId:120030}),null);
 assert.equal(annotationsForDocument(base,{symbol:'mwb',issue:'202609',language:3},
   {documentId:4,mepsId:120030}),null);
});
test('Bible study annotations resolve book and chapter without requiring DocumentId',()=>{
 assert.equal(bibleBookName(41),'Marc');
 assert.equal(bibleBookName(66),'Révélation');
 const chapters=bibleAnnotationChapters(base);
 assert.equal(chapters.length,2);
 assert.deepEqual(chapters[0],{book:41,chapter:10,locations:1,marks:1,notes:1});
 const found=annotationsForBibleChapter(base,41,10);
 assert.equal(found?.marks[0].mark.color,2);
 assert.deepEqual(found?.marks[0].ranges.map(r=>r.identifier),[14]);
 assert.deepEqual(found?.notes.map(n=>n.content),['Jésus réagit']);
 assert.equal(annotationsForBibleChapter(base,40,10),null);
});
test('personal note search includes tags but is accent insensitive and bounded',()=>{
 assert.equal(searchPersonalAnnotations(base,'amitie').length,1);
 assert.equal(searchPersonalAnnotations(base,'relations').length,1);
 const found=searchPersonalAnnotations(base,'justice');
 assert.equal(found[0].location?.book,41);
 assert.equal(searchPersonalAnnotations(base,'j',20).length,0);
});
