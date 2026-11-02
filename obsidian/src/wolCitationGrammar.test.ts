import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationPages,matchingPublicationPages} from './wolCitationGrammar.ts';

const item=(input:string,issue:string,first:number,last=first)=>{
 assert.deepEqual(publicationPages(input),{issue,first,last},input);
};

test('WOL periodical grammar normalizes printed month and compact issue identifiers',()=>{
 item('w24.08 28 § 7-8','w24.08',28);
 item('w24 août p. 28','w24.08',28);
 item('w24 Août p. 25-29','w24.08',25,29);
 item('w20 juin p. 24-29','w20.06',24,29);
 item('w16 août p. 25-29','w16.08',25,29);
 item('w18 février p. 23-27','w18.02',23,27);
 item('w22.11 5-6','w22.11',5,6);
 item('wp23.1 14-15','wp23.01',14,15);
 item('g22.1 11','g22.01',11);
 item('mwb20.03 7','mwb20.03',7);
});

test('Historical issues, Kingdom Ministry and yearbooks keep distinct identities',()=>{
 item('w14 15/11 28-29','w14 15/11',28,29);
 item('w14 15/11 p. 28-30','w14 15/11',28,30);
 item('w09 1/5 13-15','w09 1/5',13,15);
 item('g 2/12 3-13','g 2/12',3,13);
 item('km 05/95 p. 2','km 5/95',2);
 item('km 5/95 1-3','km 5/95',1,3);
 item('yb17 197','yb17',197);
});

test('Match exact edition and page containment, not just keyword overlap',()=>{
 assert.ok(matchingPublicationPages('w24.08 28','w24 août p. 25-29'));
 assert.ok(matchingPublicationPages('w24 août p. 28','w24.08 25-29'));
 assert.ok(matchingPublicationPages('wp23.1 14','wp23.01 14-15'));
 assert.ok(matchingPublicationPages('km 05/95 2','km 5/95 p. 1-3'));
 assert.ok(matchingPublicationPages('w14 15/11 28','w14 15/11 26-30'));
 assert.equal(matchingPublicationPages('w24.08 28','w24.09 25-29'),false);
 assert.equal(matchingPublicationPages('w14 15/11 28','w14 1/11 28-30'),false);
 assert.equal(matchingPublicationPages('w24.08 28','w24.08 29-31'),false);
 assert.equal(matchingPublicationPages('w24.08 28-29','w24.08 28'),false);
 assert.equal(matchingPublicationPages('w24.08 28','it-1 28'),false);
});

test('Reject incomplete, malformed and unsupported issue/page references',()=>{
 for(const value of ['w24.08','km 5/95','w24.00 28','w24.13 28',
  'km 00/95 2','g 13/12 4','w14 33/11 28','w14 15/13 28',
  'w24.08 31-29','w24.08 0','w24.08 28-1000','it-1 450']){
   assert.equal(publicationPages(value),null,value);
 }
});
