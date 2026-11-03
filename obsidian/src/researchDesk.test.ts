import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyResearchDesk, normalizeResearchDesk, addResearchPlan, activeResearchPlan,
  activateResearchPlan, addResearchBranch, renameResearchBranch,
  moveResearchBranch, removeResearchBranch, deleteResearchPlan, renameResearchPlan
} from './researchDesk.ts';

test('Research starts freely, without imposing an outline or a first idea',()=>{
  const desk=normalizeResearchDesk(undefined);
  assert.deepEqual(desk,emptyResearchDesk());
  assert.equal(activeResearchPlan(desk),undefined);
});
test('Plans can be drafted, reordered and removed without disturbing any source',()=>{
  let desk=addResearchPlan(emptyResearchDesk());
  const planId=desk.activeId!;
  desk=renameResearchPlan(desk,planId,'Les anciens et l’amitié');
  desk=addResearchBranch(addResearchBranch(desk,planId),planId);
  const [first,second]=activeResearchPlan(desk)!.branches;
  desk=renameResearchBranch(desk,planId,first.id,'Anciens');
  desk=renameResearchBranch(desk,planId,second.id,'Amitié');
  desk=moveResearchBranch(desk,planId,second.id,-1);
  assert.deepEqual(activeResearchPlan(desk)!.branches.map(x=>x.title),['Amitié','Anciens']);
  const loaded=normalizeResearchDesk(JSON.parse(JSON.stringify(desk)));
  assert.deepEqual(loaded,desk);
  desk=removeResearchBranch(desk,planId,second.id);
  assert.deepEqual(activeResearchPlan(desk)!.branches.map(x=>x.title),['Anciens']);
  desk=activateResearchPlan(desk,null);
  assert.equal(activeResearchPlan(desk),undefined);
  assert.equal(desk.plans.length,1);
  desk=deleteResearchPlan(desk,planId);
  assert.equal(desk.plans.length,0);
});
test('Invalid or duplicated persisted plan and branch identifiers are discarded',()=>{
  const source={plans:[{id:'one',title:'A',branches:[
    {id:'b',title:'Première piste'},{id:'b',title:'Duplication'},{id:'bad',title:12}
  ]},{id:'one',title:'Duplicate'}],activeId:'missing'};
  const desk=normalizeResearchDesk(source);
  assert.equal(desk.activeId,null);
  assert.equal(desk.plans.length,1);
  assert.deepEqual(desk.plans[0].branches.map(b=>b.title),['Première piste','Piste sans titre']);
});
