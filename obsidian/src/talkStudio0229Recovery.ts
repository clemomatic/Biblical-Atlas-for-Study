/**
 * Recovery boundary for the 0.22.9 Atelier discours Markdown format.
 *
 * Based on the actual shipped 0.22.9 bundle, not on the old talkStudio.ts
 * modal still present on GitHub main. This module never rewrites a user's
 * note unless an explicit, unchanged original source is provided.
 */
export type TalkKind = 'meeting' | 'public' | 'personal';
export type TalkStatus = 'draft' | 'ready' | 'archived';
export type TalkColor = 'blue' | 'green' | 'amber' | 'violet' | 'teal' | 'rose' | 'indigo' | 'orange';

export interface TalkReference {
  label: string;
  url: string;
  read: boolean;
  excerpt?: string;
}
export interface TalkImage {
  path: string;
  caption: string;
  show: boolean;
  mapRatio?: number;
}
export interface TalkNode {
  id: string;
  parent: string | null;
  title: string;
  note: string;
  position: { x: number; y: number };
  color: TalkColor;
  mode: 'auto' | 'fixed' | 'cue';
  seconds: number;
  collapsed: boolean;
  references: TalkReference[];
  images: TalkImage[];
  mapText?: boolean;
  mapWidth?: number;
  mapColor?: string;
  mapDirection?: 'left' | 'right' | 'up' | 'down';
}
export interface TalkIntroSong {
  number: number;
  title: string;
  url: string;
}
export interface TalkPlan0229 {
  version: 1;
  kind: TalkKind;
  status: TalkStatus;
  target: number; // seconds
  favorite: boolean;
  tags: string[];
  nodes: TalkNode[];
  relations: Array<{ from: string; to: string; label: string }>;
  introSong?: TalkIntroSong;
  [key: string]: unknown; // preserve outline, Xmind, pictures, rehearsals, etc.
}

const CODE_FENCE = /^\`\`\`jwsd-discours[ \t]*\r?\n([\s\S]*?)^\`\`\`[ \t]*$/m;
const KINDS = new Set<TalkKind>(['meeting', 'public', 'personal']);
const STATUSES = new Set<TalkStatus>(['draft', 'ready', 'archived']);
const COLORS = new Set<TalkColor>(['blue', 'green', 'amber', 'violet', 'teal', 'rose', 'indigo', 'orange']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const boundedSeconds = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 359999;

export function validateTalkPlan0229(value: unknown): TalkPlan0229 {
  if (!isRecord(value) || value.version !== 1 ||
      !KINDS.has(value.kind as TalkKind) ||
      !STATUSES.has(value.status as TalkStatus) ||
      !boundedSeconds(value.target) || value.target === 0 ||
      typeof value.favorite !== 'boolean' ||
      !Array.isArray(value.tags) || value.tags.some(tag => typeof tag !== 'string') ||
      !Array.isArray(value.nodes) || value.nodes.length < 1 || value.nodes.length > 500 ||
      !Array.isArray(value.relations)) {
    throw new Error('Format de carte de discours inconnu ou incomplet.');
  }
  const nodes = value.nodes as unknown[];
  const byId = new Map<string, string | null>();
  for (const node of nodes) {
    if (!isRecord(node) || typeof node.id !== 'string' || !node.id || byId.has(node.id) ||
        !(node.parent === null || typeof node.parent === 'string') ||
        typeof node.title !== 'string' || typeof node.note !== 'string' ||
        !isRecord(node.position) || typeof node.position.x !== 'number' ||
        typeof node.position.y !== 'number' ||
        !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y) ||
        !COLORS.has(node.color as TalkColor) ||
        !['auto', 'fixed', 'cue'].includes(String(node.mode)) ||
        !boundedSeconds(node.seconds) || typeof node.collapsed !== 'boolean' ||
        !Array.isArray(node.references) || !Array.isArray(node.images)) {
      throw new Error('Une bulle de la carte de discours est invalide.');
    }
    byId.set(node.id, node.parent);
  }
  if (byId.get('theme') !== null || (nodes[0] as TalkNode).id !== 'theme') {
    throw new Error('La carte doit conserver le sujet central « theme ».');
  }
  for (const id of byId.keys()) {
    const visited = new Set([id]);
    for (let current = byId.get(id); current !== null && current !== undefined;) {
      if (visited.has(current) || !byId.has(current)) {
        throw new Error('La carte contient un rattachement cyclique ou manquant.');
      }
      visited.add(current);
      current = byId.get(current);
    }
  }
  for (const relation of value.relations) {
    if (!isRecord(relation) || typeof relation.from !== 'string' ||
        typeof relation.to !== 'string' || relation.from === relation.to ||
        !byId.has(relation.from) || !byId.has(relation.to) ||
        typeof relation.label !== 'string') {
      throw new Error('Une relation entre bulles est invalide.');
    }
  }
  if (value.introSong !== undefined) {
    const song = value.introSong;
    if (!isRecord(song) || !Number.isInteger(song.number) ||
        Number(song.number) < 1 || Number(song.number) > 164 ||
        typeof song.title !== 'string' || typeof song.url !== 'string' ||
        !/^https:\/\/www\.jw\.org\/fr\//.test(song.url)) {
      throw new Error('Le cantique associé au discours est invalide.');
    }
  }
  return value as unknown as TalkPlan0229;
}

/** Read the embedded JSON, without editing Markdown outside its fenced block. */
export function readTalkPlan0229(markdown: string): TalkPlan0229 {
  const match = CODE_FENCE.exec(markdown);
  if (!match) throw new Error('La note ne contient pas de carte jwsd-discours.');
  try { return validateTalkPlan0229(JSON.parse(match[1])); }
  catch (error) {
    if (error instanceof SyntaxError) throw new Error('Le JSON de la carte est incomplet.');
    throw error;
  }
}

/**
 * Replace only the expected embedded JSON; preserve surrounding Markdown.
 * Caller must compare the complete original against the latest vault content
 * before invoking this function, to avoid silently overwriting another edit.
 */
export function writeTalkPlan0229(
  original: string, expectedOriginal: string, plan: TalkPlan0229
): string {
  if (original !== expectedOriginal) {
    throw new Error('Le plan a changé depuis son ouverture. Recharge la note.');
  }
  const valid = validateTalkPlan0229(plan);
  const match = CODE_FENCE.exec(original);
  if (!match || match.index === undefined) throw new Error('Carte introuvable.');
  const prefix = original.slice(0, match.index);
  const suffix = original.slice(match.index + match[0].length);
  return prefix + '```jwsd-discours\n' + JSON.stringify(valid, null, 2) +
    '\n```' + suffix;
}

/** 0.22.9 keeps the original playlist as a sibling of the .md plan. */
export function companionPlaylistPath(planPath: string): string {
  const path = planPath.replace(/\\/g, '/');
  if (!path || !path.endsWith('.md') ||
      path.startsWith('/') || path.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
    throw new Error('Chemin du discours invalide.');
  }
  return path.slice(0, -3) + '.jwlplaylist';
}

/** Make replacement explicitly opt-in; this does not delete either file. */
export function assertPlaylistReplacementAllowed(existing: boolean, confirmed: boolean): void {
  if (existing && !confirmed) {
    throw new Error('Une playlist est déjà associée. Confirme son remplacement.');
  }
}

export interface SpeakerRecoveryState {
  currentBranch: number;
  followBranch: boolean;
  inlineNotes: boolean;
}
export const initialSpeakerState = (): SpeakerRecoveryState => ({
  currentBranch: 0, followBranch: true, inlineNotes: false
});
export const toggleSpeakerFollow = (state: SpeakerRecoveryState): SpeakerRecoveryState => ({
  ...state, followBranch: !state.followBranch
});
