import test from 'node:test';
import assert from 'node:assert/strict';
import {
  talkDescendants0229, reparentTalkCard0229, deleteTalkBranch0229,
  promoteTalkChildren0229, duplicateTalkBranch0229
} from './talkGraph0229.ts';
import type { TalkPlan0229, TalkNode } from './talkStudio0229Recovery.ts';

const node = (id: string, parent: string | null, color: TalkNode['color']='blue'): TalkNode => ({
  id, parent, title:id, note:'', position:{x:0,y:0}, color,
  mode: parent==='theme'?'auto':'cue', seconds:0, collapsed:false,
  references:[], images:[]
});
const plan = (): TalkPlan0229 => ({
  version:1, kind:'public', status:'ready', target:1800, favorite:false, tags:[],
  nodes:[
    node('theme',null),
    node('intro','theme','blue'),
    node('illustration','intro','teal'),
    node('example','illustration','green'),
    node('body','theme','green'),
    node('finish','theme','amber')
  ],
  relations:[{from:'intro',to:'illustration',label:'illustration'},
    {from:'illustration',to:'body',label:'lien extérieur'}],
  lastRehearsal:{date:Date.now(),seconds:1500,checkpoints:{
    intro:0, illustration:250, example:400, body:600, finish:1200
  }}
});

test('reparenting a branch preserves descendants and rejects cycles',()=>{
  const original=plan();
  assert.deepEqual(talkDescendants0229(original,'intro').map(n=>n.id), ['illustration','example']);
  const moved=reparentTalkCard0229(original,'intro','body');
  assert.equal(moved?.nodes.find(n=>n.id==='intro')?.parent,'body');
  assert.equal(moved?.nodes.find(n=>n.id==='illustration')?.parent,'intro');
  assert.equal(original.nodes.find(n=>n.id==='intro')?.parent,'theme');
  assert.equal(reparentTalkCard0229(original,'intro','example'),null);
  assert.equal(reparentTalkCard0229(original,'theme','body'),null);
});

test('reordering a sibling preserves its original branches and inserts before the destination',()=>{
  const reordered=reparentTalkCard0229(plan(),'finish','theme','body');
  assert.deepEqual(reordered?.nodes.filter(n=>n.parent==='theme').map(n=>n.id),['intro','finish','body']);
  assert.equal(reparentTalkCard0229(plan(),'intro','theme','illustration'),null);
});

test('deleting an entire branch removes its links, children and timestamps',()=>{
  const before=plan();
  const after=deleteTalkBranch0229(before,'intro');
  assert.deepEqual(after.nodes.map(n=>n.id), ['theme','body','finish']);
  assert.equal(after.relations.length,0);
  assert.deepEqual(Object.keys(after.lastRehearsal!.checkpoints),['body','finish']);
  assert.equal(before.nodes.length,6);
  assert.equal(deleteTalkBranch0229(before,'theme').nodes.length,6);
});

test('deleting only a parent promotes children and keeps grandchildren',()=>{
  const result=promoteTalkChildren0229(plan(),'intro');
  assert.deepEqual(result.nodes.map(n=>n.id),['theme','illustration','example','body','finish']);
  assert.equal(result.nodes[1].parent,'theme');
  assert.equal(result.nodes[1].mode,'auto');
  assert.equal(result.nodes[2].parent,'illustration');
  assert.equal(result.relations.length,1);
  assert.deepEqual(result.lastRehearsal!.checkpoints.intro,undefined);
});

test('duplicating a branch uses fresh IDs and copies only internal relations',()=>{
  const original=plan();
  const dup=duplicateTalkBranch0229(original,'intro',(()=>{
    let i=0;return ()=> 'copy-'+(++i);
  })());
  assert.equal(dup.nodes.length,9);
  assert.equal(dup.nodes.find(n=>n.id==='copy-1')?.title,'intro (copie)');
  assert.equal(dup.nodes.find(n=>n.id==='copy-2')?.parent,'copy-1');
  assert.equal(dup.nodes.find(n=>n.id==='copy-3')?.parent,'copy-2');
  assert.ok(dup.relations.some(edge=>edge.from==='copy-1'&&edge.to==='copy-2'));
  assert.ok(!dup.relations.some(edge=>edge.from==='copy-2'&&edge.to==='body'));
  assert.equal(Object.keys(dup.lastRehearsal!.checkpoints).length,5);
  assert.equal(original.nodes.length,6);
});

test('duplicate IDs reject the entire operation without corrupting the input',()=>{
  const original=plan();
  assert.throws(()=>duplicateTalkBranch0229(original,'intro',()=> 'intro'),/non unique/);
  assert.deepEqual(original.nodes.map(n=>n.id),['theme','intro','illustration','example','body','finish']);
});
