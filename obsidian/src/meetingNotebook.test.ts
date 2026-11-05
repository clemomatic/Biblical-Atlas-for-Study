import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWeeklyMeetingNotebook,buildJwpubMeetingNotebooks
} from './meetingNotebook.ts';

test('weekly live preparation is a single markdown note with the three parts',()=>{
  const result=renderWeeklyMeetingNotebook({
    week:'9–15 novembre',
    bibleReading:'Ésaïe 1–2',
    source:'https://wol.jw.org/fr/wol/d/r30/lp-f/123456',
    sections:[
      {section:'Trésors bibliques',items:['Les pierres précieuses']},
      {section:'Ministère',items:['Engager la conversation']},
      {section:'Vie chrétienne',items:['Un beau témoignage']}
    ]
  },'2026-11-09');
  assert.match(result,/bible_lab_kind: meeting-preparation/);
  assert.match(result,/bible_lab_version: 2/);
  assert.match(result,/week_monday: 2026-11-09/);
  assert.equal((result.match(/## Joyaux de la Parole de Dieu/g)||[]).length,1);
  assert.equal((result.match(/## Applique-toi au ministère/g)||[]).length,1);
  assert.equal((result.match(/## Vie chrétienne/g)||[]).length,1);
  assert.match(result,/\[!blb-jewels\]/);
  assert.match(result,/\[!blb-ministry\]/);
  assert.match(result,/\[!blb-life\]/);
  assert.match(result,/\[!blb-idea\]/);
  assert.match(result,/\[\[#Joyaux de la Parole de Dieu\]\]/);
  assert.match(result,/\- \[ \] Lire les chapitres/);
});

test('three JWPUB weekly parts produce one notebook, preserving sources',()=>{
  const documents=[
    {path:'001 · Joyaux.md',title:'9-15 novembre 2026 — Joyaux',markdown:'## JOYAUX DE LA PAROLE DE DIEU\n\nLire le texte.',sourceUrl:'https://wol.jw.org/fr/wol/d/r30/lp-f/12345'},
    {path:'002 · Ministère.md',title:'9–15 novembre — Ministère',markdown:'## APPLIQUE-TOI AU MINISTÈRE\n\n*Exercice*'},
    {path:'003 · Vie chrétienne.md',title:'9-15 novembre — Vie chrétienne',markdown:'## VIE CHRÉTIENNE\n\n![Visuel](assets/photo.png)'}
  ];
  const result=buildJwpubMeetingNotebooks('mwb',2026,documents);
  assert.equal(result.length,1);
  assert.match(result[0].title,/9–15 novembre 2026/);
  assert.equal(result[0].sources.length,3);
  assert.match(result[0].path,/^Carnets\/.*\.md$/);
  assert.match(result[0].markdown,/source_documents:/);
  assert.match(result[0].markdown,/001 · Joyaux\.md/);
  assert.match(result[0].markdown,/002 · Ministère\.md/);
  assert.match(result[0].markdown,/003 · Vie chrétienne\.md/);
  assert.match(result[0].markdown,/!\[Visuel\]\(\.\.\/assets\/photo\.png\)/);
  assert.match(result[0].markdown,/\[Consulter sur WOL\]/);
});

test('different weeks are not merged and unrecognised dates are left alone',()=>{
  const documents=[
    {path:'01.md',title:'2–8 novembre',markdown:'Programme A'},
    {path:'02.md',title:'9-15 novembre',markdown:'Programme B'},
    {path:'03.md',title:'Informations générales',markdown:'Sans semaine.'}
  ];
  const result=buildJwpubMeetingNotebooks('mwb',2026,documents);
  assert.equal(result.length,2);
  assert.equal(result.reduce((sum,v)=>sum+v.sources.length,0),2);
  assert.equal(buildJwpubMeetingNotebooks('w',2026,documents).length,0);
  assert.equal(buildJwpubMeetingNotebooks('mwb',2026,[
    {path:'01.md',title:'Semaine inconnue',markdown:'Aucun titre daté'}
  ]).length,0);
});

test('cross-month and ordinal dates are grouped correctly',()=>{
  const documents=[
    {path:'a.md',title:'26 octobre – 1er novembre',markdown:'Première partie'},
    {path:'b.md',title:'26 octobre - 1 novembre 2026',markdown:'Deuxième partie'}
  ];
  const result=buildJwpubMeetingNotebooks('mwb',2026,documents);
  assert.equal(result.length,1);
  assert.equal(result[0].sources.length,2);
});
