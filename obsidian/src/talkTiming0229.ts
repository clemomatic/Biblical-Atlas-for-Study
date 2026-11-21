/**
 * JW Study Desk 0.22.9 — pure Atelier discours timing engine.
 *
 * Faithful reconstruction of the bundled Lo() scheduling algorithm.
 * This module has no Obsidian dependency and never reads/writes a vault.
 */
import { validateTalkPlan0229, type TalkPlan0229, type TalkNode } from './talkStudio0229Recovery.ts';

export interface TalkTimingSlot {
  /** Seconds from the beginning of the speech. */
  start: number;
  end: number;
  seconds: number;
  /** A fixed node whose descendants need more time than its own budget. */
  over: boolean;
}

export interface TalkTimingResult {
  total: number;
  slots: Map<string, TalkTimingSlot>;
}

const childrenOf = (plan: TalkPlan0229, parent: string | null): TalkNode[] =>
  plan.nodes.filter(node => node.parent === parent);

/**
 * Preserve the ordering of nodes stored in the original plan. The original
 * version distributes unused time only to nodes whose mode is "auto".
 * "cue" nodes do not receive a share; fixed nodes retain their minimum.
 */
export function computeTalkTiming0229(value: TalkPlan0229): TalkTimingResult {
  const plan = validateTalkPlan0229(value);
  const minimal = new Map<string, number>();
  const slots = new Map<string, TalkTimingSlot>();

  const minSeconds = (node: TalkNode): number => {
    const childMinimum = childrenOf(plan, node.id).reduce((sum, child) => sum + minSeconds(child), 0);
    const minimum = Math.max(childMinimum, node.mode === 'fixed' ? node.seconds : 0);
    minimal.set(node.id, minimum);
    return minimum;
  };

  const assign = (nodes: TalkNode[], available: number, start: number): number => {
    const reserved = nodes.reduce((sum, node) => sum + (minimal.get(node.id) ?? 0), 0);
    const autoCount = nodes.filter(node => node.mode === 'auto').length;
    const remaining = Math.max(0, available - reserved);
    const perAuto = autoCount ? Math.floor(remaining / autoCount) : 0;
    let remainder = autoCount ? remaining % autoCount : 0;
    let cursor = start;

    for (const node of nodes) {
      let seconds = minimal.get(node.id) ?? 0;
      if (node.mode === 'auto') {
        seconds += perAuto;
        if (remainder > 0) { seconds++; remainder--; }
      }
      const end = cursor + seconds;
      slots.set(node.id, {
        start: cursor, end, seconds,
        over: node.mode === 'fixed' && seconds > node.seconds
      });
      assign(childrenOf(plan, node.id), seconds, cursor);
      cursor = end;
    }
    return cursor;
  };

  minSeconds(plan.nodes[0]);
  return { total: assign(childrenOf(plan, 'theme'), plan.target, 0), slots };
}

export interface TalkSpeakerBranch {
  id: string;
  title: string;
  index: number;
  timing: TalkTimingSlot;
}

/** The delivered Orateur screen navigates top-level branches in node order. */
export function speakerBranches0229(plan: TalkPlan0229): TalkSpeakerBranch[] {
  const { slots } = computeTalkTiming0229(plan);
  const branches = childrenOf(plan, 'theme');
  return branches.map((node, index) => ({
    id: node.id, title: node.title, index,
    timing: slots.get(node.id) ?? { start: 0, end: 0, seconds: 0, over: false }
  }));
}

/** Return the branch corresponding to a current speaker clock, without mutation. */
export function speakerBranchAt0229(plan: TalkPlan0229, elapsed: number): TalkSpeakerBranch | null {
  const branches = speakerBranches0229(plan);
  if (!branches.length) return null;
  const t = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  return branches.find(branch => t >= branch.timing.start && t < branch.timing.end) ?? branches[branches.length - 1];
}
