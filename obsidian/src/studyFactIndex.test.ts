import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StudyFactIndex } from './studyFactIndex.ts';

test('new facts appear from both participants, with no duplicated episode', () => {
  const index = new StudyFactIndex();
  assert.equal(index.update('Connexions/ep.md',{
    jwsd_kind:'episode-connections',jwsd_episode_id:'episode-a',jwsd_episode_title:'David et Joab',
    jwsd_episode_connections:[{personId:'david',reference:'2 Samuel 11:1'}],
    jwsd_episode_facts:[{
      id:'fact-1',personId:'david',targetPersonId:'joab',kind:'interaction',
      reference:'2 Samuel 11:14',assessment:'sourced'
    }]
  }), true);
  assert.equal(index.forPerson('david').length,1);
  assert.equal(index.forPerson('joab')[0].id,'episode-a');
  assert.equal(index.forPerson('joab')[0].factCount,1);
  assert.equal(index.update('Connexions/ep.md',{
    jwsd_kind:'episode-connections',jwsd_episode_id:'episode-a',jwsd_episode_title:'David et Joab',
    jwsd_episode_connections:[{personId:'david',reference:'2 Samuel 11:1'}],
    jwsd_episode_facts:[{
      id:'fact-1',personId:'david',targetPersonId:'joab',kind:'interaction',
      reference:'2 Samuel 11:14',assessment:'sourced'
    }]
  }),false);
});

test('legacy links remain associations and preserve searchability after rename', () => {
  const index = new StudyFactIndex();
  index.update('notes/ep.md',{
    jwsd_kind:'episode-connections',jwsd_episode_id:'episode-a',jwsd_episode_title:'Un épisode',
    jwsd_episode_connections:[{personId:'david',placeId:'jerusalem',reference:'2 Samuel 11:1'}],
    atlas_entities:['person:joab','place:jerusalem']
  });
  assert.equal(index.forPerson('david')[0].legacyCount,1);
  assert.equal(index.forPerson('joab').length,1);
  assert.equal(index.rename('notes/ep.md','archives/ep.md'),true);
  assert.equal(index.forPerson('joab')[0].path,'archives/ep.md');
  assert.equal(index.forPerson('david')[0].path,'archives/ep.md');
  assert.equal(index.remove('archives/ep.md'),true);
  assert.deepEqual(index.snapshot(),{byPerson:{}});
});

test('changing a note removes old associations and repoints the reverse index', () => {
  const index = new StudyFactIndex();
  index.update('episode.md',{jwsd_kind:'episode-connections',jwsd_episode_id:'event-a',
    jwsd_episode_facts:[{id:'a',personId:'david',kind:'mention',reference:'2 Samuel 11:1',assessment:'sourced'}]});
  index.update('episode.md',{jwsd_kind:'episode-connections',jwsd_episode_id:'event-a',
    jwsd_episode_facts:[{id:'b',personId:'joab',kind:'mention',reference:'2 Samuel 11:1',assessment:'sourced'}]});
  assert.deepEqual(index.forPerson('david'),[]);
  assert.equal(index.forPerson('joab').length,1);
  assert.equal(index.update('episode.md',{}),true);
  assert.deepEqual(index.forPerson('joab'),[]);
});
