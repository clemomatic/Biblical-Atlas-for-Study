import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeLocalBibleApparatus} from './localBibleApparatus.ts';
import type {ReaderResult} from './referenceReader.ts';

const local:ReaderResult={
  title:'Jean 7:24',source:'local',kind:'verse',
  sourceUrl:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/43/7',
  notice:'Lecture locale',links:[],
  lines:[{type:'verse',number:'24',text:'Ne jugez pas sur l’apparence.'}]
};
const official:ReaderResult={
  title:'Jean 7:24',kind:'verse',sourceUrl:local.sourceUrl,links:[
    {label:'Lévitique 19:15',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/3/19'}
  ],
  lines:[
    {type:'verse',text:'Ne jugez pas sur l’apparence.',
      references:[{label:'Lévitique 19:15',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/3/19'}],
      referenceMarkers:[{offset:10,targets:[{label:'Lévitique 19:15',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/3/19'}]}]},
    {type:'study',text:'Le sens de ce jugement.',source:'Jugez'},
    {type:'crossref',text:'Lévitique 19:15',references:[{label:'Lévitique 19:15',url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/3/19'}]}
  ]
};

test('Local Bible remains readable with study notes and working cross references',()=>{
  const result=mergeLocalBibleApparatus(local,official);
  assert.equal(result.lines[0].text,local.lines[0].text);
  assert.equal(result.source,'local');
  assert.equal(result.lines.find(l=>l.type==='study')?.text,'Le sens de ce jugement.');
  assert.equal(result.lines.find(l=>l.type==='study')?.verse,'24');
  assert.equal(result.lines.find(l=>l.type==='crossref')?.verse,'24');
  assert.equal(result.links.length,1);
  assert.equal(result.lines[0].referenceMarkers?.[0].offset,10);
});
test('Different wording never moves inline cross reference markers to the wrong word',()=>{
  const changed={...local,lines:[{...local.lines[0],text:'Ne jugez pas selon l’apparence.'}]};
  const result=mergeLocalBibleApparatus(changed,official);
  assert.equal(result.lines[0].text,changed.lines[0].text);
  assert.equal(result.lines[0].referenceMarkers,undefined);
  assert.equal(result.lines[0].references?.length,1);
});
test('Notes from several selected verses stay attributed to the right verse',()=>{
  const localRange={...local,lines:[
    {type:'verse' as const,number:'23',text:'Texte local 23.'},
    {type:'verse' as const,number:'24',text:'Texte local 24.'}
  ]};
  const remote={...official,lines:[
    {type:'verse' as const,number:'23',text:'Texte officiel 23.'},
    {type:'crossref' as const,text:'Exode 23:1'},
    {type:'verse' as const,number:'24',text:'Texte officiel 24.'},
    {type:'study' as const,text:'Une note sur le jugement.'}
  ]};
  const result=mergeLocalBibleApparatus(localRange,remote);
  assert.equal(result.lines.find(l=>l.type==='crossref')?.verse,'23');
  assert.equal(result.lines.find(l=>l.type==='study')?.verse,'24');
  assert.equal(result.lines.filter(l=>l.type==='verse').length,2);
});
test('An unavailable official study apparatus leaves the local passage unchanged',()=>{
  const noRemote={...official,lines:[],links:[]};
  assert.equal(mergeLocalBibleApparatus(local,noRemote),local);
  assert.equal(mergeLocalBibleApparatus(local,{...official,kind:'article'}),local);
});
