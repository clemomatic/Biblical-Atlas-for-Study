import test from 'node:test';
import assert from 'node:assert/strict';
import {colorizeJwText,notesForBlock,JW_HIGHLIGHT_COLORS} from './jwTextHighlight.ts';

const verse={kind:'verse' as const,identifier:14,text:'Jésus aime ses disciples et réagit avec justice.'};
const mark={mark:{id:1,guid:'fixture',color:2,style:0,location:12},
 ranges:[{mark:1,blockType:2,identifier:14,start:3,end:5}]};
test('display actual highlighted words, not database positions',()=>{
 const pieces=colorizeJwText(verse.text,verse,[mark]);
 assert.equal(pieces.map(x=>x.text).join(''),verse.text);
 assert.equal(pieces.filter(x=>x.color===2).map(x=>x.text).join(' '),'disciples et réagit');
 assert.equal(JW_HIGHLIGHT_COLORS[2],'#b7eb9c');
 assert.deepEqual(colorizeJwText(verse.text,{...verse,identifier:15},[mark]),[{text:verse.text}]);
});
test('reject ranges that cannot be mapped precisely to this verse',()=>{
 const wrong={...mark,ranges:[{mark:1,blockType:2,identifier:14,start:0,end:120}]};
 assert.deepEqual(colorizeJwText(verse.text,verse,[wrong]),[{text:verse.text}]);
 const oldArticle={...mark,ranges:[{mark:1,blockType:2,identifier:14,start:0,end:2}]};
 assert.deepEqual(colorizeJwText(verse.text,{...verse,kind:'paragraph'},[oldArticle]),[{text:verse.text}]);
});
test('notes appear only beside the exact referenced verse',()=>{
 const note={id:1,guid:'fixture',title:'Réflexion',content:'Une note',location:12,mark:1,
 blockType:2,blockIdentifier:14,created:null,modified:null,tags:[]};
 assert.deepEqual(notesForBlock([note],verse),[note]);
 assert.deepEqual(notesForBlock([note],{...verse,identifier:15}),[]);
});
