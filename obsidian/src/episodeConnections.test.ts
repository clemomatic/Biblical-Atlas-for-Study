import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  automaticEntityKeys, reconcileEntityKeys, validatePersonalEpisodeConnections
} from './episodeConnections.ts';

const people = new Set(['event-david-iixp36','person-joab']);
const places = new Set(['jerusalem','rabbah']);
const one = {
  id:'a1', personId:'event-david-iixp36', placeId:'jerusalem',
  reference:'2 Samuel 11:1', note:'David est resté à Jérusalem.'
};

test('a personal episode link requires an existing person and a source',()=>{
  assert.equal(validatePersonalEpisodeConnections([one],people,places).length,1);
  assert.throws(()=>validatePersonalEpisodeConnections([{...one,reference:''}],people,places),/référence/);
  assert.throws(()=>validatePersonalEpisodeConnections([{...one,personId:'unknown'}],people,places),/Personnage/);
  assert.throws(()=>validatePersonalEpisodeConnections([{...one,placeId:'unknown'}],people,places),/Lieu/);
});

test('a participation with no location does not invent one',()=>{
  const result=validatePersonalEpisodeConnections([{
    id:'b1',personId:'person-joab',reference:'2 Samuel 11:1'
  }],people,places);
  assert.equal(result[0].placeId,undefined);
  assert.deepEqual(automaticEntityKeys('episode-1',result),[
    'event:episode-1','person:person-joab'
  ]);
});

test('a second link cannot reuse the same local ID',()=>{
  assert.throws(()=>validatePersonalEpisodeConnections([one,one],people,places),/double/);
});

test('automatic Atlas links are removed on deletion without deleting manual links',()=>{
  const previous=['event:episode-1','person:event-david-iixp36','place:jerusalem','person:someone-else'];
  const oldAuto=['event:episode-1','person:event-david-iixp36','place:jerusalem'];
  const now=automaticEntityKeys('episode-1',[]);
  assert.deepEqual(reconcileEntityKeys(previous,oldAuto,now),[
    'person:someone-else','event:episode-1'
  ]);
});

test('raw Markdown or script is not accepted as an entity ID',()=>{
  assert.throws(()=>automaticEntityKeys('../episode',[]),/Identifiant/);
  assert.throws(()=>validatePersonalEpisodeConnections([{...one,personId:'<script>'}],people,places),/Personnage/);
});

test('trimming source lines never changes the cited historical entity',()=>{
  const items=validatePersonalEpisodeConnections([{...one,reference:' 2 Samuel 11:1\n ',note:'  Source relue.\n'}],people,places);
  assert.equal(items[0].reference,'2 Samuel 11:1');
  assert.equal(items[0].note,'Source relue.');
  assert.equal(items[0].personId,'event-david-iixp36');
});
