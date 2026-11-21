/**
 * JW Study Desk 0.22.9 — reconstruction of Markdown-outline import.
 * Derived from the shipped u2(), qs(), g2() and Qc() routines.
 * Pure conversion only: no file writes and no synthetic JWPub content.
 */
import { validateTalkPlan0229, type TalkKind, type TalkColor,
  type TalkNode, type TalkPlan0229 } from './talkStudio0229Recovery.ts';

export interface TalkMarkdownImportOptions {
  title?: string;
  discourse_type?: string;
  duration_minutes?: number | string;
}
export type TalkIdFactory = () => string;

const PALETTE: TalkColor[] = ['blue','green','amber','violet','teal','rose','indigo','orange'];
const SPECIAL_SECTIONS = new Set([
  'sources vérifiables', 'idées et liens à explorer', 'chronométrage et répétitions'
]);
const TIME_SUFFIX = /\s*(?:[—–-]\s*|\(\s*)(?:(\d{1,4}:[0-5]\d)|(\d{1,4}(?:[,.]\d{1,2})?)\s*min(?:utes?)?\b)\s*\)?\s*$/i;
const MAX_NODES = 500;
const MAX_SECONDS = 359999;

function parseMinutesOrClock(value: string): number | null {
  const normalized = value.trim();
  const clock = /^(\d{1,4}):([0-5]\d)$/.exec(normalized);
  const seconds = clock
    ? Number(clock[1]) * 60 + Number(clock[2])
    : /^\d{1,4}(?:[,.]\d{1,2})?$/.test(normalized)
      ? Math.round(Number(normalized.replace(',', '.')) * 60)
      : NaN;
  return Number.isInteger(seconds) && seconds >= 0 && seconds <= MAX_SECONDS ? seconds : null;
}
const children = (plan: TalkPlan0229, parent: string | null): TalkNode[] =>
  plan.nodes.filter(node => node.parent === parent);

function makeNode(id: string, parent: string | null, title: string, color: TalkColor): TalkNode {
  return {
    id, parent, title, note: '', position: {x: 0, y: 0}, color,
    mode: parent === 'theme' ? 'auto' : 'cue',
    seconds: 0, collapsed: false, references: [], images: []
  };
}

function pickColor(plan: TalkPlan0229, parent: string | null): TalkColor {
  const siblings = children(plan, parent);
  const used = new Set(siblings.map(node => node.color));
  return PALETTE.find(color => !used.has(color)) ?? PALETTE[siblings.length % PALETTE.length];
}

/**
 * Restore 0.22.9's simple horizontal card arrangement. Odd and even
 * top-level branches go on opposite sides; leaf weight controls spacing.
 */
export function layoutMarkdownTalk0229(plan: TalkPlan0229): void {
  const root = plan.nodes[0];
  const weight = new Map<string, number>();
  const descendants = (id: string): number => {
    const value = Math.max(1, children(plan, id).reduce((sum, child) => sum + descendants(child.id), 0));
    weight.set(id, value);
    return value;
  };
  const top = children(plan, 'theme');
  top.forEach(node => descendants(node.id));
  const left = top.filter((_, index) => index % 2 === 0);
  const right = top.filter((_, index) => index % 2 !== 0);

  const place = (siblings: TalkNode[], x: number, y: number, direction: number): void => {
    let cursor = y;
    for (const node of siblings) {
      const height = (weight.get(node.id) ?? 1) * 116;
      node.position = {x, y: cursor + height / 2};
      place(children(plan, node.id), x + 250 * direction, cursor, direction);
      cursor += height;
    }
  };
  for (const [siblings, direction] of [[left, -1], [right, 1]] as const) {
    const height = siblings.reduce((sum, node) => sum + (weight.get(node.id) ?? 1) * 116, 0);
    place(siblings, root.position.x + 250 * direction, root.position.y - height / 2, direction);
  }
}

/**
 * Import a note containing Markdown headings. The first level-1 heading
 * becomes the central title unless it was supplied in frontmatter; following
 * headings become cards. Ordinary lines stay in the preceding card's notes.
 *
 * This is not the full S-34 or JWPub importer; those have a different parser.
 */
export function importMarkdownTalk0229(
  markdown: string, fallbackTitle: string,
  options: TalkMarkdownImportOptions = {},
  makeId: TalkIdFactory = () => crypto.randomUUID()
): TalkPlan0229 {
  const declaredMinutes = Number(options.duration_minutes);
  const suppliedDuration = Number.isFinite(declaredMinutes) && declaredMinutes > 0;
  const kind: TalkKind = ['meeting','public','personal'].includes(String(options.discourse_type))
    ? options.discourse_type as TalkKind : 'personal';
  const title = typeof options.title === 'string' ? options.title : fallbackTitle;
  const seconds = suppliedDuration ? Math.max(1, Math.min(MAX_SECONDS, Math.round(declaredMinutes * 60))) : 600;
  const root = makeNode('theme', null, title.trim() || 'Nouveau discours', 'blue');
  const plan: TalkPlan0229 = {
    version: 1, kind, status: 'draft', target: seconds, favorite: false,
    tags: [], mapLayout: 'auto', nodes: [root], relations: []
  };
  const source = markdown.replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
  const stack: { level: number; node: TalkNode }[] = [{level: 0, node: root}];
  const usedIds = new Set(['theme']);
  let fenced: { character: string; length: number } | undefined;
  let sawTitle = false;
  let topFixedSeconds = 0;

  for (const line of source.split(/\r?\n/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (fenced) {
        if (fence[0] === fenced.character && fence.length >= fenced.length &&
            /^ {0,3}[`~]+\s*$/.test(line)) fenced = undefined;
      } else fenced = {character: fence[0], length: fence.length};
    }
    const heading = !fenced && !fence
      ? /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line) : null;
    if (!heading) {
      stack[stack.length - 1].node.note += line + '\n';
      continue;
    }
    const level = heading[1].length;
    if (!sawTitle && level === 1) {
      sawTitle = true;
      if (typeof options.title !== 'string') root.title = heading[2].trim();
      continue;
    }
    sawTitle = true;
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
    const parent = stack[stack.length - 1].node;
    const time = TIME_SUFFIX.exec(heading[2]);
    const label = (time ? heading[2].slice(0, time.index) : heading[2])
      .replace(/^\d+\s*·\s*/, '').replace(/\s+[—–]\s*$/, '').trim();
    const special = parent.id === 'theme' && SPECIAL_SECTIONS.has(label.toLocaleLowerCase('fr'));
    const parentId = special ? null : parent.id;
    if (plan.nodes.length >= MAX_NODES) throw new Error('Ce plan contient déjà 500 sujets.');
    const id = makeId();
    if (!id || id === 'theme' || usedIds.has(id)) throw new Error('Identifiant de sujet invalide ou dupliqué.');
    usedIds.add(id);
    const card = makeNode(id, parentId, label || heading[2], pickColor(plan, parentId));
    plan.nodes.push(card);
    if (!special) parent.collapsed = false;
    if (time) {
      const duration = parseMinutesOrClock(time[1] ?? time[2]);
      if (duration !== null) {
        card.mode = 'fixed';
        card.seconds = duration;
        if (parent.id === 'theme' && !special) topFixedSeconds += duration;
      }
    }
    stack.push({level, node: card});
  }
  if (!suppliedDuration && topFixedSeconds > 0) plan.target = Math.min(MAX_SECONDS, topFixedSeconds);
  for (const node of plan.nodes) node.note = node.note.trim();
  layoutMarkdownTalk0229(plan);
  return validateTalkPlan0229(plan);
}
