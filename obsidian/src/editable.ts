import type { AtlasEntityKey, AtlasEntityType, AtlasSelection } from '../../src/atlasIntegration';
import type { BiblicalPerson, TemporalBoundary, TemporalSpan } from '../../src/domain/history/types';
import type { BiblicalPlace, BiblicalRoute, EventData } from '../../src/types';
import { parseTimelineDate } from '../../src/utils/dateUtils.ts';
import { parseEntityKey, parseYear, splitEntityKey } from './model.ts';

export type EditableEntity = AtlasSelection['entity'];
export interface EntityEdit {
  key: AtlasEntityKey;
  data: Record<string, unknown>;
  hidden: boolean;
  created: boolean;
  revision: number;
  path: string;
  rawContent?: string;
}
export interface EntityDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}
export const ENTITY_LABELS: Record<AtlasEntityType, string> = { person: 'Personnage', event: 'Événement', place: 'Lieu', route: 'Itinéraire' };

export function cloneEntity<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
export function entityTitle(type: AtlasEntityType, entity: EditableEntity): string {
  return type === 'event' ? (entity as EventData).text : (entity as BiblicalPlace).name;
}
export function selectionFromEntity(type: AtlasEntityType, entity: EditableEntity): AtlasSelection {
  return { key: `${type}:${entity.id}`, type, id: entity.id, title: entityTitle(type, entity), entity };
}
export function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
}

export function editFromMetadata(path: string, frontmatter: Record<string, unknown>): EntityEdit | undefined {
  const key = parseEntityKey(frontmatter.atlas_entity);
  if (!key) return undefined;
  const data = frontmatter.atlas_data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('La personnalisation attend un objet atlas_data.');
  return { key, data: cloneEntity(data) as Record<string, unknown>, hidden: frontmatter.atlas_hidden === true,
    created: frontmatter.atlas_created === true, revision: Number.isSafeInteger(frontmatter.atlas_revision) ? Number(frontmatter.atlas_revision) : 0, path };
}

function validJson(value: unknown, depth = 0): void {
  if (depth > 40) throw new Error('Les données sont trop imbriquées.');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Une valeur numérique est invalide.');
  if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Une propriété de données est interdite.');
    validJson(item, depth + 1);
  }
}
function assertYear(value: unknown, label: string): number {
  const result = parseYear(value);
  if (result === undefined) throw new Error(`${label} : saisis une année entière, sans année zéro.`);
  return result;
}
export function spanFromYears(start?: number, end?: number): TemporalSpan | undefined {
  if (start === undefined && end === undefined) return undefined;
  const boundary = (year: number): TemporalBoundary => ({ yearMin: year, yearMax: year, precision: 'year', certainty: 'unknown', approximate: true });
  return { start: start === undefined ? undefined : boundary(start), end: end === undefined ? undefined : boundary(end), displayLabel: '' };
}
function validateSpan(span: unknown, label: string): void {
  if (span === undefined) return;
  if (!span || typeof span !== 'object' || Array.isArray(span)) throw new Error(`${label} : période invalide.`);
  const value = span as TemporalSpan;
  if (value.displayLabel !== undefined && typeof value.displayLabel !== 'string') throw new Error(`${label} : libellé invalide.`);
  value.displayLabel ??= '';
  for (const boundary of [value.start, value.end]) {
    if (!boundary) continue;
    if (!['day', 'month', 'season', 'year', 'range', 'before', 'after', 'unknown'].includes(boundary.precision)) throw new Error(`${label} : précision de date invalide.`);
    for (const field of ['yearMin','yearMax'] as const) if (boundary[field] !== undefined) boundary[field] = assertYear(boundary[field], label);
    if (!['certain','probable','possible','unknown'].includes(boundary.certainty)) throw new Error(`${label} : degré de certitude invalide.`);
    if (boundary.month !== undefined && (!Number.isInteger(boundary.month) || boundary.month < 1 || boundary.month > 12)) throw new Error(`${label} : mois invalide.`);
    if (boundary.day !== undefined && (!Number.isInteger(boundary.day) || boundary.day < 1 || boundary.day > 31 || (!boundary.month && !boundary.calendarMonth))) throw new Error(`${label} : jour invalide.`);
    if (boundary.calendar !== undefined && !['gregorian','hebrew'].includes(boundary.calendar)) throw new Error(`${label} : calendrier invalide.`);
    if (boundary.uncertaintyYears !== undefined && (typeof boundary.uncertaintyYears !== 'number' || boundary.uncertaintyYears < 0)) throw new Error(`${label} : marge d’incertitude invalide.`);
    if (boundary.yearMin !== undefined && boundary.yearMax !== undefined && boundary.yearMin > boundary.yearMax) throw new Error(`${label} : les bornes sont inversées.`);
  }
  const from = value.start?.yearMin ?? value.start?.yearMax;
  const to = value.end?.yearMax ?? value.end?.yearMin;
  if (from !== undefined && to !== undefined && from > to) throw new Error(`${label} : la fin doit suivre le début.`);
}
function coordinates(value: unknown): [number, number] {
  if (!Array.isArray(value) || value.length !== 2 || value.some(item => typeof item !== 'number' || !Number.isFinite(item)) || Math.abs(value[0]) > 85 || Math.abs(value[1]) > 180) throw new Error('Coordonnées invalides : latitude entre −85 et 85, longitude entre −180 et 180.');
  return [value[0], value[1]];
}

/** Validation is shared by the editor, direct Markdown edits and geographic actions. */
export function validateEntity(type: AtlasEntityType, input: unknown, expectedId: string): EditableEntity {
  validJson(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('La fiche doit être un objet de données.');
  const data = cloneEntity(input) as Record<string, any>;
  if (data.id !== expectedId) throw new Error('Conserve l’identifiant de cette fiche pour préserver ses liens.');
  const nameField = type === 'event' ? 'text' : 'name';
  if (typeof data[nameField] !== 'string' || !data[nameField].trim()) throw new Error('Ajoute un titre à cette fiche.');
  data[nameField] = data[nameField].trim();
  for (const field of ['description', 'notes', 'category', 'periodDescription', 'territory']) if (data[field] !== undefined && typeof data[field] !== 'string') throw new Error(`Le champ ${field} attend du texte.`);
  for (const field of ['biblicalReferences', 'documentaryReferences', 'alternateNames', 'associatedEventIds', 'associatedLocationIds', 'associatedPlaceIds', 'associatedCharacterIds', 'associatedPersonIds', 'associatedRouteIds', 'associatedEvents', 'associatedCharacters', 'routeIds', 'realmIds', 'lifeSpanClaimIds']) {
    if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].some((item: unknown) => typeof item !== 'string'))) throw new Error(`Le champ ${field} attend une liste de textes.`);
  }
  if (data.certainty !== undefined && !['certain', 'probable', 'possible', 'unknown'].includes(data.certainty)) throw new Error('Le degré de certitude est invalide.');
  if (data.sources !== undefined && (!Array.isArray(data.sources) || data.sources.some((item: any) => !item || typeof item.id !== 'string' || typeof item.label !== 'string' || (item.url !== undefined && typeof item.url !== 'string')))) throw new Error('Chaque source attend un identifiant et un libellé.');
  if (data.media !== undefined && (!Array.isArray(data.media) || data.media.some((item: any) => !item || typeof item.src !== 'string' || typeof item.alt !== 'string'))) throw new Error('Chaque image attend une adresse et un texte alternatif.');
  for (const [field, required] of [['encyclopediaReferences',['id','articleTitle','url']],['geographicProvenance',['id','sourceId','sourceLabel','mapId','mapReference','limitations']]] as const) {
    if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].some((item: any) => !item || required.some(key => typeof item[key] !== 'string')))) throw new Error(`Le champ ${field} contient une référence invalide.`);
  }
  if (type === 'event') {
    data.startYear = assertYear(data.startYear, 'Début'); data.endYear = assertYear(data.endYear, 'Fin');
    if (data.endYear < data.startYear) throw new Error('La fin doit suivre le début.');
    if (typeof data.categoryId !== 'string' || !data.categoryId) throw new Error('Choisis une catégorie.');
    for (const [raw, year, position] of [['startRaw', 'startYear', 'startPos'], ['endRaw', 'endYear', 'endPos']]) {
      if (typeof data[raw] !== 'string' || parseTimelineDate(data[raw]).year !== data[year]) data[raw] = `${data[year]}-01-01`;
      data[position] = parseTimelineDate(data[raw]).position;
    }
    data.isPoint = data.startPos === data.endPos;
    validateSpan(data.temporalSpan, 'Période de l’événement');
  } else if (type === 'person') {
    validateSpan(data.lifeSpan, 'Période de vie');
    for (const field of ['activityPeriods', 'sourceTimelineWindows']) {
      if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field].some((item: any) => !item || typeof item.id !== 'string' || !item.span))) throw new Error(`Le champ ${field} attend des périodes identifiées.`);
      data[field]?.forEach((item: any) => validateSpan(item.span, field));
    }
    data.activityPeriods ??= [];
    for (const activity of data.activityPeriods) if (!['ministry','reign','office','prophecy','journey','residence','imprisonment','other'].includes(activity.type) || typeof activity.label !== 'string') throw new Error('Chaque activité attend un type et un libellé valides.');
    if (data.roles !== undefined && (!Array.isArray(data.roles) || data.roles.some((role: any) => !['king','queen','prophet','other'].includes(role)))) throw new Error('Les rôles doivent former une liste valide.');
  } else {
    for (const field of ['startYear', 'endYear']) if (data[field] !== undefined) data[field] = assertYear(data[field], field === 'startYear' ? 'Début' : 'Fin');
    if (data.startYear !== undefined && data.endYear !== undefined && data.endYear < data.startYear) throw new Error('La fin doit suivre le début.');
    if (type === 'place') {
      data.coordinates = coordinates(data.coordinates);
      if (data.mapLabelLevel !== undefined && !['major', 'regional', 'study', 'local'].includes(data.mapLabelLevel)) throw new Error('La priorité d’affichage du lieu est invalide.');
      if (data.mapCategory !== undefined && !['levitical-city','refuge-city','hebrew-scriptures','greek-scriptures','both-scriptures','ancient-city','biblical-site','exodus-stage','summit','wadi','body-of-water','river','spring'].includes(data.mapCategory)) throw new Error('Le symbole du lieu est invalide.');
      if (data.mapColor !== undefined && !/^#[0-9a-f]{6}$/i.test(data.mapColor)) throw new Error('La couleur attend un code hexadécimal, par exemple #397b78.');
    } else {
      if (!/^#[0-9a-f]{6}$/i.test(data.color)) throw new Error('La couleur de la route est invalide.');
      if (!Array.isArray(data.points) || data.points.length < 2) throw new Error('Un itinéraire attend au moins deux étapes.');
      const ids = new Set<string>();
      data.points = data.points.map((point: any, index: number) => {
        if (!point || typeof point.name !== 'string' || !point.name.trim()) throw new Error(`Ajoute un nom à l’étape ${index + 1}.`);
        const id = typeof point.id === 'string' && point.id ? point.id : `${expectedId}-step-${index + 1}`;
        if (ids.has(id)) throw new Error('Chaque étape doit avoir un identifiant différent.'); ids.add(id);
        return { ...point, id, coordinates: coordinates(point.coordinates), stepNumber: index + 1 };
      });
      data.biblicalReferences ??= [];
    }
  }
  delete data.personalization;
  return data as EditableEntity;
}

export function newEntity(type: AtlasEntityType, id: string): EditableEntity {
  const common = { id, description: '', biblicalReferences: [], sources: [], certainty: 'unknown' as const };
  if (type === 'person') return { ...common, name: 'Nouveau personnage', activityPeriods: [] };
  if (type === 'place') return { ...common, name: 'Nouveau lieu', coordinates: [0, 0], mapCategory: 'biblical-site', mapLabelLevel: 'regional' };
  if (type === 'route') return { ...common, name: 'Nouvel itinéraire', color: '#397b78', points: [], geometryPrecision: 'schematic' };
  return { ...common, text: 'Nouvel événement', categoryId: 'obsidian-research', category: 'Mes recherches', startYear: -1, endYear: -1,
    startRaw: '-1-01-01', endRaw: '-1-01-01', startPos: -1, endPos: -1, isPoint: true, fuzzyStart: true, fuzzyEnd: true };
}

export function entityDataForNote(entity: EditableEntity): Record<string, unknown> {
  const result = cloneEntity(entity) as unknown as Record<string, unknown>;
  delete result.personalization; delete result.description;
  return result;
}

export function parseEditBody(edit: EntityEdit, content: string, fromBody: boolean): EntityEdit {
  return { ...edit, data: fromBody ? { ...edit.data, description: stripFrontmatter(content).replace(/^\r?\n/, '').trimEnd() } : edit.data, rawContent: content };
}
