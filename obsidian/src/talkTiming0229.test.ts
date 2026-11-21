import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTalkTiming0229, speakerBranches0229, speakerBranchAt0229 } from './talkTiming0229.ts';
import type { TalkPlan0229, TalkNode } from './talkStudio0229Recovery.ts';

const node = (id: string, parent: string | null, mode: TalkNode['mode'], seconds = 0): TalkNode => ({
  id, parent, title: id, note: '', position: { x: 0, y: 0 }, color: 'blue',
  mode, seconds, collapsed: false, references: [], images: []
});
const plan = (target: number, nodes: TalkNode[]): TalkPlan0229 => ({
  version: 1, kind: 'public', status: 'ready', target, favorite: false,
  tags: [], nodes: [node('theme', null, 'cue'), ...nodes], relations: []
});

test('0.22.9 distributes remaining time equally among auto top-level branches', () => {
  const result = computeTalkTiming0229(plan(1200, [
    node('intro', 'theme', 'fixed', 300),
    node('body', 'theme', 'auto'),
    node('outro', 'theme', 'auto')
  ]));
  assert.equal(result.total, 1200);
  assert.deepEqual(result.slots.get('intro'), { start: 0, end: 300, seconds: 300, over: false });
  assert.deepEqual(result.slots.get('body'), { start: 300, end: 750, seconds: 450, over: false });
  assert.deepEqual(result.slots.get('outro'), { start: 750, end: 1200, seconds: 450, over: false });
});

test('0.22.9 gives deterministic one-second remainder to earlier auto nodes', () => {
  const result = computeTalkTiming0229(plan(601, [
    node('a', 'theme', 'auto'), node('b', 'theme', 'auto')
  ]));
  assert.equal(result.slots.get('a')?.seconds, 301);
  assert.equal(result.slots.get('b')?.seconds, 300);
});

test('nested fixed child budgets are reserved and can overrun a fixed parent', () => {
  const result = computeTalkTiming0229(plan(1200, [
    node('part', 'theme', 'fixed', 300),
    node('sub1', 'part', 'fixed', 250),
    node('sub2', 'part', 'fixed', 200),
    node('finish', 'theme', 'auto')
  ]));
  assert.deepEqual(result.slots.get('part'), { start: 0, end: 450, seconds: 450, over: true });
  assert.equal(result.slots.get('sub2')?.start, 250);
  assert.equal(result.slots.get('finish')?.seconds, 750);
  assert.equal(result.total, 1200);
});

test('0.22.9 cue-only plans do not invent time for unallocated slots', () => {
  const result = computeTalkTiming0229(plan(900, [
    node('cue', 'theme', 'cue', 300),
    node('fixed', 'theme', 'fixed', 180)
  ]));
  assert.equal(result.slots.get('cue')?.seconds, 0);
  assert.equal(result.total, 180);
});

test('speaker navigation uses saved order of top-level branches, not child cards', () => {
  const speech = plan(600, [
    node('intro', 'theme', 'fixed', 100),
    node('subtopic', 'intro', 'cue'),
    node('main', 'theme', 'auto')
  ]);
  const branches = speakerBranches0229(speech);
  assert.deepEqual(branches.map(b => b.id), ['intro', 'main']);
  assert.equal(speakerBranchAt0229(speech, 99)?.id, 'intro');
  assert.equal(speakerBranchAt0229(speech, 101)?.id, 'main');
  assert.equal(speakerBranchAt0229(speech, 9999)?.id, 'main');
  assert.equal(speakerBranchAt0229(speech, -10)?.id, 'intro');
});

test('corrupted cyclic maps are rejected before timing rather than recursing forever', () => {
  const broken = plan(600, [node('orphan', 'missing', 'auto')]);
  assert.throws(() => computeTalkTiming0229(broken), /cyclique|manquant/);
});
