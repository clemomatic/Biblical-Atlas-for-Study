import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identifyEpisodePassage,pastedEpisodeVerses,passageFromLocalBible,suggestEpisodeMentions} from './episodePassage.ts';
import type {BiblicalPerson} from '../../src/domain/history/types.ts';
import type {BiblicalPlace} from '../../src/types.ts';
import type {LocalBibleData} from './localBibleData.ts';

const people=[
 {id:'david',name:'David',activityPeriods:[],alternateNames:[]},
 {id:'joab',name:'Joab',activityPeriods:[],alternateNames:[]},
 {id:'bethsabee',name:'Bethsabée',activityPeriods:[],alternateNames:['Bath-Shéba']},
 {id:'jean-1',name:'Jean',activityPeriods:[]},
 {id:'jean-2',name:'Jean',activityPeriods:[]}
] as BiblicalPerson[];
const places=[
 {id:'jerusalem',name:'Jérusalem',coordinates:[31.77,35.2]},
 {id:'raba',name:'Raba',coordinates:[31.95,35.9]}
] as BiblicalPlace[];

test('mentions only: name matching never assigns a location or an interaction',()=>{
 const found=suggestEpisodeMentions([
  {reference:'2 Samuel 11:1',text:'Joab partit vers Raba. Mais David resta à Jérusalem.'},
  {reference:'2 Samuel 11:2',text:'Plus tard David aperçut Bethsabée.'}
 ],people,places);
 assert.equal(found.kind,'text-mentions-only');
 assert.deepEqual(found.suggestions.map(item=>item.personId),['david','joab','david','bethsabee']);
 assert.deepEqual(found.locations.map(item=>item.id).sort(),['jerusalem','raba']);
 assert.ok(found.suggestions.every(item=>!("placeId" in item)));
 assert.deepEqual(found.suggestions[0].placeNames.sort(),['Jérusalem','Raba']);
});

test('homonyms require human disambiguation and are not linked by guessing',()=>{
 const found=suggestEpisodeMentions([{reference:'Jean 1:1',text:'Jean et David'}],people,places);
 assert.deepEqual(found.suggestions.map(item=>item.personId),['david']);
 assert.ok(found.ambiguousNames.includes('Personnage : jean'));
});

test('full-word accents and alias matching without substring false positives',()=>{
 const found=suggestEpisodeMentions([{reference:'2 Samuel 11:3',text:'Bath-Shéba. DAVID. Davidique. Jean-Claude.'}],people,places);
 assert.deepEqual(found.suggestions.map(item=>item.personId),['david','bethsabee']);
});

test('numbered pasted verses preserve exact source; unnumbered text does not invent verse numbers',()=>{
 assert.deepEqual(pastedEpisodeVerses('2 Samuel 11','1 David à Jérusalem\n2 Joab à Raba'),[
  {reference:'2 Samuel 11:1',text:'David à Jérusalem'},
  {reference:'2 Samuel 11:2',text:'Joab à Raba'}
 ]);
 assert.deepEqual(pastedEpisodeVerses('2 Samuel 11','David à Jérusalem\nJoab à Raba'),[
  {reference:'2 Samuel 11',text:'David à Jérusalem\nJoab à Raba'}
 ]);
});

test('the local Bible source is used in memory and verses are not stored in notes',()=>{
 const data={schema:1,sourceHash:'a'.repeat(64),
  publication:{symbol:'nwt',year:2026,language:3,title:'Bible'},
  chapters:[{book:10,chapter:11,verses:[
   {number:1,text:'Joab part, David reste à Jérusalem.'},
   {number:2,text:'David voit Bethsabée.'}
  ]}]
 } as LocalBibleData;
 assert.deepEqual(passageFromLocalBible(data,'2 Samuel 11'),[
  {reference:'2 Samuel 11:1',text:'Joab part, David reste à Jérusalem.'},
  {reference:'2 Samuel 11:2',text:'David voit Bethsabée.'}
 ]);
 assert.deepEqual(passageFromLocalBible(data,'2 Samuel 11:2'),[
  {reference:'2 Samuel 11:2',text:'David voit Bethsabée.'}
 ]);
 assert.equal(passageFromLocalBible(data,'2 Samuel 12'),null);
 assert.deepEqual(identifyEpisodePassage('2 Samuel 11'),{book:10,chapter:11,scripture:null});
});
