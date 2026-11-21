/**
 * JW Study Desk 0.22.9 — reconstructed pure card/tree editing operations.
 * Based on the shipped Qd(), LS(), DS() and kS() routines.
 * Every operation validates the input and its output, never saving a vault file.
 */
import {
  validateTalkPlan0229, type TalkPlan0229, type TalkNode, type TalkColor
} from './talkStudio0229Recovery.ts';

const MAX_NODES = 500;
const COLORS: TalkColor[] = ['blue','green','amber','violet','teal','rose','indigo','orange'];
const children = (plan: TalkPlan0229, parent: string | null): TalkNode[] =>
  plan.nodes.filter(n => n.parent === parent && n.id !== 'theme');
const get = (plan: TalkPlan0229, id: string): TalkNode | undefined => plan.nodes.find(n => n.id === id);
const copy = (plan: TalkPlan0229): TalkPlan0229 => structuredClone(validateTalkPlan0229(plan));
const unusedColor = (plan: TalkPlan0229, parent: string | null): TalkColor => {
  const siblings = children(plan, parent);
  const used = new Set(siblings.map(n => n.color));
  return COLORS.find(c => !used.has(c)) ?? COLORS[siblings.length % COLORS.length];
};

export function talkDescendants0229(plan: TalkPlan0229, id: string): TalkNode[] {
  validateTalkPlan0229(plan);
  const result: TalkNode[] = [];
  const visit = (parent: string): void => {
    for (const child of children(plan, parent)) {
      result.push(child);
      visit(child.id);
    }
  };
  visit(id);
  return result;
}

/**
 * The original editor can move a card to another parent and optionally place
 * it immediately before one of that parent's children. Returns null when
 * the requested move would be a no-op or produce a cycle.
 */
export function reparentTalkCard0229(
  value: TalkPlan0229, id: string, parent: string | null,
  beforeId?: string
): TalkPlan0229 | null {
  const plan = copy(value);
  const card = get(plan, id);
  if (!card || id === 'theme' || parent === id || beforeId === id ||
      (parent !== null && !get(plan, parent)) ||
      talkDescendants0229(plan, id).some(n => n.id === parent) ||
      (beforeId && !children(plan, parent).some(n => n.id === beforeId))) return null;
  plan.nodes.splice(plan.nodes.indexOf(card), 1);
  if (parent !== card.parent && (parent === 'theme' || parent === null) &&
      children(plan, parent).some(n => n.color === card.color)) {
    card.color = unusedColor(plan, parent);
  }
  card.parent = parent;
  const next = beforeId ? plan.nodes.findIndex(n => n.id === beforeId) : -1;
  if (next < 0) plan.nodes.push(card);
  else plan.nodes.splice(next, 0, card);
  if (parent === 'theme' && card.mode === 'cue') card.mode = 'auto';
  if (parent) get(plan, parent)!.collapsed = false;
  return validateTalkPlan0229(plan);
}

/** Delete one card, all descendants, their relations and speaker checkpoints. */
export function deleteTalkBranch0229(value: TalkPlan0229, id: string): TalkPlan0229 {
  const plan = copy(value);
  if (id === 'theme' || !get(plan, id)) return plan;
  const removed = new Set([id, ...talkDescendants0229(plan, id).map(n => n.id)]);
  plan.nodes = plan.nodes.filter(n => !removed.has(n.id));
  plan.relations = plan.relations.filter(r => !removed.has(r.from) && !removed.has(r.to));
  if (plan.lastRehearsal) {
    for (const key of removed) delete plan.lastRehearsal.checkpoints[key];
  }
  return validateTalkPlan0229(plan);
}

/** Remove just one card and promote its children to the deleted card's parent. */
export function promoteTalkChildren0229(value: TalkPlan0229, id: string): TalkPlan0229 {
  const plan = copy(value);
  const card = get(plan, id);
  if (!card || id === 'theme') return plan;
  const promoted = children(plan, id);
  for (const child of promoted) {
    child.parent = card.parent;
    if (card.parent === 'theme' || card.parent === null) {
      child.color = card.color;
      if (!child.mapColor && card.mapColor) child.mapColor = card.mapColor;
    }
    if (card.parent === 'theme' && child.mode === 'cue') child.mode = 'auto';
  }
  const ids = new Set(promoted.map(n => n.id));
  plan.nodes = plan.nodes.flatMap(n => n.id === id ? promoted : ids.has(n.id) ? [] : [n]);
  plan.relations = plan.relations.filter(r => r.from !== id && r.to !== id);
  if (plan.lastRehearsal) delete plan.lastRehearsal.checkpoints[id];
  return validateTalkPlan0229(plan);
}

/** Clone a whole branch, preserving its internal links with new IDs. */
export function duplicateTalkBranch0229(
  value: TalkPlan0229, id: string, makeId: () => string
): TalkPlan0229 {
  const plan = copy(value);
  const root = get(plan, id);
  if (!root || id === 'theme') return plan;
  const branch = [root, ...talkDescendants0229(plan, id)];
  if (plan.nodes.length + branch.length > MAX_NODES) {
    throw new Error('Ce plan contient trop de sujets pour dupliquer cette branche.');
  }
  const originalIds = new Set(plan.nodes.map(n => n.id));
  const assigned = new Set<string>();
  const replacements = new Map<string,string>();
  for (const n of branch) {
    const next = makeId();
    if (!next || originalIds.has(next) || assigned.has(next)) {
      throw new Error('La duplication a produit un identifiant de sujet non unique.');
    }
    assigned.add(next); replacements.set(n.id, next);
  }
  const newRootX = root.position.x + (root.position.x < 0 ? -260 : 260);
  const newRootY = root.position.y + 220;
  const copies = branch.map(n => {
    const duplicate = structuredClone(n);
    duplicate.id = replacements.get(n.id)!;
    duplicate.parent = replacements.get(n.parent || '') ?? n.parent;
    duplicate.position = {
      x: newRootX + n.position.x - root.position.x,
      y: newRootY + n.position.y - root.position.y
    };
    return duplicate;
  });
  copies[0].title += ' (copie)';
  copies[0].color = unusedColor(plan, root.parent);
  plan.nodes.push(...copies);
  for (const edge of [...plan.relations]) {
    const from = replacements.get(edge.from), to = replacements.get(edge.to);
    if (from && to) plan.relations.push({...edge, from, to});
  }
  // 0.22.9 does not duplicate rehearsal checkpoints for newly-created cards.
  return validateTalkPlan0229(plan);
}
