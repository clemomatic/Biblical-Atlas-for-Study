import type { AtlasEntityKey, AtlasEntityType, AtlasNavigationState } from '../../src/atlasIntegration';
import { emptyAtlasNavigation } from '../../src/atlasIntegration.ts';
import type { BiblicalPlace, CategoryData, EventData } from '../../src/types';
import { parseTimelineDate } from '../../src/utils/dateUtils.ts';

export const PERSONAL_CATEGORY: CategoryData = {
  id: 'obsidian-research', name: 'Mes recherches', color: '155,100,53', hexColor: '#9b6435'
};

export interface VaultNote {
  path: string;
  title: string;
  keys: AtlasEntityKey[];
  kind: 'research' | 'event' | 'place';
  uid?: string;
  startYear?: number;
  endYear?: number;
  coordinates?: [number, number];
  references: string[];
  warnings: string[];
}

export interface AtlasSettings { noteFolder: string; allowOnlineMaps: boolean }
export const DEFAULT_SETTINGS: AtlasSettings = { noteFolder: 'Atlas biblique', allowOnlineMaps: false };

export function validFolder(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Choisis un dossier dans ton coffre.');
  const path = value.trim().replaceAll('\\', '/').replace(/\/+$/, '');
  if (!path || path.startsWith('/') || path.split('/').some(part => !part || part.startsWith('.') || /[:*?"<>|\x00-\x1f]/.test(part))) {
    throw new Error('Le dossier doit être un chemin relatif, sans dossier caché ni « .. ».');
  }
  return path;
}

export function parseEntityKey(value: unknown): AtlasEntityKey | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  return /^(person|place|event|route):[^\s\x00-\x1f]+$/.test(value) ? value as AtlasEntityKey : null;
}

export function splitEntityKey(key: AtlasEntityKey): { type: AtlasEntityType; id: string } {
  const colon = key.indexOf(':');
  return { type: key.slice(0, colon) as AtlasEntityType, id: key.slice(colon + 1) };
}

export function navigationForKey(key: AtlasEntityKey): AtlasNavigationState {
  const { type, id } = splitEntityKey(key);
  const state = emptyAtlasNavigation();
  state.activeTab = type === 'place' || type === 'route' ? 'map' : 'timeline';
  state[`${type}Id`] = id;
  return state;
}

/** Dates use historical years: -1 is followed by 1. Missing dates stay missing. */
export function parseYear(value: unknown): number | undefined {
  if (typeof value === 'string' && !/^-?\d{1,5}$/.test(value.trim())) return undefined;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const number = Number(value);
  return Number.isInteger(number) && number !== 0 && Math.abs(number) <= 50_000 ? number : undefined;
}

const stringList = (value: unknown): string[] =>
  (Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    .map(item => item.trim());

export function noteFromMetadata(path: string, basename: string, frontmatter: Record<string, unknown> | undefined): VaultNote | null {
  if (!frontmatter) return null;
  const keys = [...new Set(stringList(frontmatter.atlas_entities).map(parseEntityKey).filter((key): key is AtlasEntityKey => key !== null))];
  const uid = typeof frontmatter.atlas_uid === 'string' && /^[a-z0-9-]{1,80}$/i.test(frontmatter.atlas_uid) ? frontmatter.atlas_uid : undefined;
  const kind = frontmatter.atlas_kind === 'event' || frontmatter.atlas_kind === 'place' ? frontmatter.atlas_kind : 'research';
  if (!keys.length && frontmatter.atlas_schema !== 1) return null;
  const warnings: string[] = [];
  if (frontmatter.atlas_schema !== undefined && frontmatter.atlas_schema !== 1) warnings.push('Version de fiche non prise en charge : affichage des liens uniquement.');
  const startYear = parseYear(frontmatter.atlas_start_year);
  const endYear = parseYear(frontmatter.atlas_end_year) ?? startYear;
  const latitude = frontmatter.atlas_latitude;
  const longitude = frontmatter.atlas_longitude;
  const coordinates: [number, number] | undefined = typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 85 && Math.abs(longitude) <= 180
      ? [latitude, longitude] : undefined;
  if (kind === 'event' && (startYear === undefined || endYear === undefined || endYear < startYear)) warnings.push('La frise attend une année non nulle et une fin postérieure ou égale au début.');
  if (kind === 'event' && frontmatter.atlas_end_year !== undefined && parseYear(frontmatter.atlas_end_year) === undefined) warnings.push('L’année de fin est invalide.');
  if (kind === 'place' && !coordinates) warnings.push('La carte attend une latitude entre −85 et 85 et une longitude entre −180 et 180.');
  if (kind !== 'research' && !uid) warnings.push('La fiche personnelle attend un atlas_uid stable.');
  if (uid && kind !== 'research' && !warnings.length) keys.push(`${kind}:vault-${uid}`);
  return { path, title: typeof frontmatter.atlas_title === 'string' ? frontmatter.atlas_title.slice(0, 200).replace(/[\r\n]/g, ' ') : basename,
    keys: [...new Set(keys)], kind, uid, startYear, endYear, coordinates,
    references: stringList(frontmatter.atlas_references), warnings };
}

export function projectPersonalNotes(notes: VaultNote[]): { events: EventData[]; places: BiblicalPlace[] } {
  const events: EventData[] = [];
  const places: BiblicalPlace[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    if (!note.uid || note.warnings.length || seen.has(note.uid)) continue;
    seen.add(note.uid);
    const metadata = { certainty: 'unknown' as const, biblicalReferences: note.references,
      notes: 'Recherche personnelle conservée dans le coffre Obsidian ; elle ne modifie pas le corpus documentaire.',
      sources: [{ id: `vault-${note.uid}`, label: `Note personnelle : ${note.path}` }] };
    if (note.kind === 'event' && note.startYear !== undefined && note.endYear !== undefined) {
      const startRaw = `${note.startYear}-01-01`;
      const endRaw = `${note.endYear}-01-01`;
      events.push({ ...metadata, id: `vault-${note.uid}`, text: note.title, categoryId: PERSONAL_CATEGORY.id,
        category: PERSONAL_CATEGORY.name, startRaw, endRaw, startYear: note.startYear, endYear: note.endYear,
        startPos: parseTimelineDate(startRaw).position, endPos: parseTimelineDate(endRaw).position,
        isPoint: note.startYear === note.endYear, fuzzyStart: true, fuzzyEnd: true,
        description: 'Une recherche personnelle. Ouvre la note liée pour poursuivre ton étude.',
        associatedLocationIds: note.keys.filter(key => key.startsWith('place:')).map(key => splitEntityKey(key).id),
        associatedCharacterIds: note.keys.filter(key => key.startsWith('person:')).map(key => splitEntityKey(key).id) });
    }
    if (note.kind === 'place' && note.coordinates) places.push({ ...metadata, id: `vault-${note.uid}`,
      name: note.title, coordinates: note.coordinates, description: 'Un lieu ajouté dans tes recherches personnelles.',
      mapCategory: 'biblical-site', mapLabelLevel: 'regional', coordinatePrecision: 'approximate' });
  }
  return { events, places };
}

export function safeFilename(title: string): string {
  return title.normalize('NFC').replace(/[\\/:*?"<>|\[\]#^\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').replace(/^[. ]+|[. ]+$/g, '').slice(0, 100) || 'Recherche';
}

export function atlasDeepLink(key: AtlasEntityKey, vaultName: string): string {
  return `obsidian://atlas-biblique?vault=${encodeURIComponent(vaultName)}&entity=${encodeURIComponent(key)}`;
}

export interface CanvasDocument {
  nodes: Array<{ id: string; type: 'file' | 'text'; x: number; y: number; width: number; height: number; file?: string; text?: string; color?: string }>;
  edges: Array<{ id: string; fromNode: string; toNode: string; fromSide: string; toSide: string; label: string; color: string }>;
}

export function investigationCanvas(questionPath: string, entityPaths: string[]): CanvasDocument {
  const files = [...new Set(entityPaths)].filter(path => path !== questionPath);
  const nodes: CanvasDocument['nodes'] = [{ id: 'question', type: 'file', file: questionPath, x: 0, y: 0, width: 420, height: 300, color: '6' }];
  const edges: CanvasDocument['edges'] = [];
  files.forEach((file, index) => {
    const left = index % 2 === 0;
    const id = `fiche-${index}`;
    nodes.push({ id, type: 'file', file, x: left ? -500 : 520, y: Math.floor(index / 2) * 340, width: 380, height: 260 });
    edges.push({ id: `lien-${index}`, fromNode: 'question', toNode: id, fromSide: left ? 'left' : 'right', toSide: left ? 'right' : 'left', label: 'À explorer', color: '6' });
  });
  const bottom = Math.max(1, Math.ceil(files.length / 2)) * 340 + 80;
  [ ['observer', 'Ce que je remarque', 'Quels détails attirent mon attention ?'],
    ['verifier', 'Ce que je vérifie', 'Quel verset ou quelle source appuie cette idée ?'],
    ['mediter', 'Ce que j’en retiens', 'Que m’apprend cette recherche sur Jéhovah ? Comment agir ?']
  ].forEach(([id, title, text], index) => {
    nodes.push({ id, type: 'text', text: `## ${title}\n\n${text}`, x: -500 + index * 510, y: bottom, width: 400, height: 180, color: String(index + 3) });
    edges.push({ id: `piste-${id}`, fromNode: 'question', toNode: id, fromSide: 'bottom', toSide: 'top', label: 'Piste de réflexion', color: '6' });
  });
  return { nodes, edges };
}
