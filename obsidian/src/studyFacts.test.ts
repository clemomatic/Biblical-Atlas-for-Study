import { test } from 'node:test';
import assert from 'node:assert/strict';
import { studyFactEntityKeys, validateStudyFacts } from './studyFacts.ts';

const people = new Set(['david', 'joab', 'bethsabee']);
const places = new Set(['jerusalem']);
const david = { id:'fact-david', personId:'david', kind:'presence', placeId:'jerusalem',
  reference:'2 Samuel 11:1', assessment:'sourced' };

test('a sourced personal presence requires a precise subject, place and reference', () => {
  const facts = validateStudyFacts([david], people, places);
  assert.equal(facts[0].placeId, 'jerusalem');
  assert.deepEqual(studyFactEntityKeys('episode-a', facts), [
    'event:episode-a', 'person:david', 'place:jerusalem'
  ]);
  assert.throws(() => validateStudyFacts([{...david,reference:''}], people, places), /référence/);
  assert.throws(() => validateStudyFacts([{...david,placeId:'unknown'}], people, places), /lieu/);
  assert.throws(() => validateStudyFacts([{...david,placeId:undefined}], people, places), /lieu/);
});

test('unlocated names remain literal; they never gain invented map coordinates', () => {
  const joab = validateStudyFacts([{
    id:'fact-joab',personId:'joab',kind:'presence',placeLabel:'Raba',
    reference:'2 Samuel 11:1',assessment:'sourced'
  }], people, places)[0];
  assert.equal(joab.placeLabel, 'Raba');
  assert.equal(joab.placeId, undefined);
  assert.deepEqual(studyFactEntityKeys('episode-a',[joab]), [
    'event:episode-a','person:joab'
  ]);
});

test('person-to-person relationships are indexed in both directions', () => {
  const fact = validateStudyFacts([{
    id:'fact-david-joab',personId:'david',targetPersonId:'joab',kind:'interaction',
    reference:'2 Samuel 11:14',assessment:'hypothesis'
  }],people,places)[0];
  assert.deepEqual(studyFactEntityKeys('episode-a',[fact]), [
    'event:episode-a','person:david','person:joab'
  ]);
  assert.throws(() => validateStudyFacts([{
    ...fact,placeId:'jerusalem'
  }],people,places),/réservé/);
  assert.throws(() => validateStudyFacts([{...fact,targetPersonId:'david'}],people,places),/distinct/);
});

test('no unsourced, duplicate or ambiguous structural data can be stored', () => {
  assert.throws(() => validateStudyFacts([david,david], people, places),/double/);
  assert.throws(() => validateStudyFacts([{...david,kind:'meeting'}],people,places),/Type/);
  assert.throws(() => validateStudyFacts([{...david,personId:'<script>'}],people,places),/Personnage/);
  assert.throws(() => validateStudyFacts([{...david,assessment:'verified'}],people,places),/vérification/);
});
