import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEpisodeContext } from './episodeContext.ts';
import type { BiblicalPerson } from '../../src/domain/history/types.ts';
import type { ReviewedEventRecord } from '../../src/domain/history/contentTypes.ts';
import type { PresenceIndexEntry } from '../../src/domain/history/historicalIndex.ts';
import type { BiblicalPlace } from '../../src/types.ts';

const people: BiblicalPerson[] = [
  { id:'person-a', name:'Personne A', activityPeriods:[], lifeSpan:{
    start:{yearMin:-1050,yearMax:-1050,precision:'year',certainty:'certain'},
    end:{yearMin:-970,yearMax:-970,precision:'year',certainty:'certain'},
    displayLabel:'1050–970 av. n. è.'
  }},
  { id:'person-b', name:'Personne B', activityPeriods:[] }
];
const places: BiblicalPlace[] = [
  { id:'ville-a', name:'Ville A', coordinates:[0,0], description:'', biblicalReferences:[] },
  { id:'ville-b', name:'Ville B', coordinates:[1,1], description:'', biblicalReferences:[] }
];
const event: ReviewedEventRecord = {
  workflowStatus:'reviewed', sourceIds:[],
  event:{
    id:'episode-a', name:'Épisode A',
    participantMentions:[{label:'Personne A',personId:'person-a',certainty:'certain'},{label:'Personne B',personId:'person-b',certainty:'certain'}],
    placeMentions:[{label:'Ville A',placeId:'ville-a',certainty:'certain',granularity:'point'}],
    biblicalReferences:['Livre 1:2']
  }
};
const presence = (id:string,personId:string,placeId:string,eventIds:string[]): PresenceIndexEntry => ({
  id,personId,placeId,eventIds,regionIds:[],presenceType:'visitor',certainty:'certain',supportingClaimIds:['claim-1'],
  startIndex:-1000,endIndex:-999
});
const input = (overrides: Record<string,unknown> = {}) => ({
  eventId:'episode-a',reviewedEvents:[event],legacyEvents:[],people,places,sources:[],
  presences:[presence('pa','person-a','ville-b',['episode-a']),presence('pb','person-b','ville-a',['episode-unrelated'])],
  ...overrides
});

test('unknown date does not create a speculative numerical age',()=>{
  const result=buildEpisodeContext(input());
  assert.ok(result);
  assert.equal(result.period,undefined);
  assert.equal(result.participants[0].age.precision,'unknown');
  assert.match(result.warnings.join(' '),/Période non documentée/);
});

test('only event-linked presences become individual locations',()=>{
  const result=buildEpisodeContext(input());
  assert.ok(result);
  assert.deepEqual(result.participants.find(p=>p.personId==='person-a')?.locations.map(p=>p.name),['Ville B']);
  assert.deepEqual(result.participants.find(p=>p.personId==='person-b')?.locations,[]);
  assert.equal(result.places[0].name,'Ville A');
  assert.equal(result.references[0],'Livre 1:2');
});

test('calculate age only from an actual event period',()=>{
  const dated:ReviewedEventRecord={...event,event:{...event.event,period:{
    start:{yearMin:-1000,yearMax:-1000,precision:'year',certainty:'certain'},
    displayLabel:'1000 av. n. è.'
  }}};
  const result=buildEpisodeContext(input({reviewedEvents:[dated]}));
  assert.ok(result);
  assert.equal(result.participants.find(p=>p.personId==='person-a')?.age.precision,'exact');
  assert.equal(result.participants.find(p=>p.personId==='person-b')?.age.precision,'unknown');
});

test('unknown characters remain visible without an invented identity',()=>{
  const unknown:ReviewedEventRecord={...event,event:{...event.event,participantMentions:[
    {label:'Jean (non identifié)',certainty:'unknown'}
  ]}};
  const result=buildEpisodeContext(input({reviewedEvents:[unknown],presences:[]}));
  assert.ok(result);
  assert.equal(result.participants.length,1);
  assert.equal(result.participants[0].personId,undefined);
  assert.equal(result.participants[0].name,'Jean (non identifié)');
});

test('missing event returns null rather than a fabricated biography',()=>{
  assert.equal(buildEpisodeContext(input({eventId:'missing'})),null);
});
