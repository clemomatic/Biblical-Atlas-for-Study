import test from 'node:test';
import assert from 'node:assert/strict';
import {findImportedJwNotes,parseImportedJwNote} from './localJwSearch.ts';

const md=['---','bible_lab_kind: jw-library-note','jw_guid: "abc"',
  'title: "Une note sur la bonté"','---','','<!-- BibleLab marker -->',
  'Je médite sur l’exemple de Jésus et sa bonté.'].join('\n');
test('Finds imported JW Library notes locally by title or content',()=>{
 const entries=[{path:'Atlas biblique/Imports/Mes notes/note.md',markdown:md}];
 assert.equal(findImportedJwNotes(entries,'bonté').length,1);
 assert.equal(findImportedJwNotes(entries,'Jésus').length,1);
 assert.equal(findImportedJwNotes(entries,'autre chose').length,0);
});
test('Does not index unrelated vault notes or raw publications',()=>{
 assert.equal(parseImportedJwNote('Mes notes/note.md',md,'Jésus'),null);
 assert.equal(parseImportedJwNote('Atlas biblique/Imports/pub.md',md.replace('jw-library-note','jwpub-document'),'Jésus'),null);
});
test('Limits the number of returned results',()=>{
 const entries=Array.from({length:40},(_,i)=>({path:'Atlas biblique/Imports/'+i+'.md',markdown:md}));
 assert.equal(findImportedJwNotes(entries,'bonté',5).length,5);
});
