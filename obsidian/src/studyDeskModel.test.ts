import test from 'node:test';
import assert from 'node:assert/strict';
import {personalDeskNotes,type DeskNote} from './studyDeskModel.ts';

const notes:DeskNote[]=[
  {path:'Mes études/La patience.md',title:'La patience',modified:3},
  {path:'Mon étude/Discours/Une amitié précieuse.md',title:'Une amitié précieuse',modified:7},
  {path:'Mon étude/Imports/Ancien import/001.md',title:'Une source',modified:20,kind:'jwpub-document'},
  {path:'Mon étude/Bibliothèque virtuelle/INDEX.md',title:'Source compacte',modified:20},
  {path:'Mon étude/Annotations JW Library/sauvegarde/001.md',title:'Copie de notes importées',modified:20},
  {path:'Mon étude/Imports/Ancien import/INDEX/001.md',title:'Sommaire',modified:20},
  {path:'Mon étude/Imports/Mes réflexions personnelles.md',title:'Mes réflexions personnelles',modified:5}
];
test('The desk lists personal notes without flooding them with source documents or managed indexes',()=>{
  const original=structuredClone(notes);
  assert.deepEqual(personalDeskNotes(notes).map(note=>note.title),['Une amitié précieuse','Mes réflexions personnelles','La patience']);
  assert.deepEqual(notes,original);
});
test('Title and folder search ignore French accents and letter case',()=>{
  assert.equal(personalDeskNotes(notes,' AMITIE ')[0]?.title,'Une amitié précieuse');
  assert.equal(personalDeskNotes(notes,'mes etudes')[0]?.title,'La patience');
  assert.deepEqual(personalDeskNotes(notes,'inconnu'),[]);
});
test('Preparation keeps actual meeting and talk notes and orders by modification',()=>{
  const meeting={path:'Préparations/Réunion 2026-11-06.md',title:'Réunion',modified:9};
  assert.deepEqual(personalDeskNotes([...notes,meeting],'',true).map(note=>note.title),['Réunion','Une amitié précieuse']);
});
