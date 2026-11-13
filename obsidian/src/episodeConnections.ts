import type { AtlasEntityKey } from '../../src/atlasIntegration.ts';

export interface PersonalEpisodeConnection {
  id: string;
  personId: string;
  /** Optional personal observation; never imply a location from participation alone. */
  placeId?: string;
  /** Human-entered source label (Bible passage or other publication). */
  reference: string;
  note?: string;
}

export const EPISODE_CONNECTIONS_SCHEMA = 2;
const identity = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 300 &&
  /^[a-zA-Z0-9_-]+$/.test(value);
const clean = (value: string): string => value.replace(/[\r\n\x00-\x1f]+/g, ' ').trim();

/**
 * This validates user-authored research links, not the reviewed historical corpus.
 * Every link has an explicit reference; "linked" does not mean "verified".
 */
export function validatePersonalEpisodeConnections(
  raw: unknown,
  knownPeople: ReadonlySet<string>,
  knownPlaces: ReadonlySet<string>
): PersonalEpisodeConnection[] {
  if (!Array.isArray(raw) || raw.length > 200) throw new Error('Le nombre de connexions dépasse la limite autorisée.');
  const seenIds = new Set<string>();
  const connections: PersonalEpisodeConnection[] = [];
  for (const value of raw) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Connexion invalide.');
    const item = value as Record<string, unknown>;
    if (!identity(item.id) || seenIds.has(item.id)) throw new Error('Identifiant de connexion absent ou en double.');
    if (!identity(item.personId) || !knownPeople.has(item.personId)) throw new Error('Personnage non reconnu : choisir une fiche Atlas existante.');
    if (item.placeId !== undefined && (!identity(item.placeId) || !knownPlaces.has(item.placeId))) {
      throw new Error('Lieu non reconnu : choisir un lieu Atlas existant.');
    }
    if (typeof item.reference !== 'string' || !clean(item.reference) || item.reference.length > 280) {
      throw new Error('Chaque connexion doit comporter une référence documentaire (280 caractères maximum).');
    }
    if (item.note !== undefined && (typeof item.note !== 'string' || item.note.length > 1200)) {
      throw new Error('La remarque est trop longue (1 200 caractères maximum).');
    }
    seenIds.add(item.id);
    connections.push({
      id: item.id,
      personId: item.personId,
      ...(typeof item.placeId === 'string' ? {placeId:item.placeId} : {}),
      reference: clean(item.reference),
      ...(typeof item.note === 'string' && clean(item.note) ? { note: clean(item.note) } : {})
    });
  }
  return connections;
}

export function automaticEntityKeys(eventId: string, items: readonly PersonalEpisodeConnection[]): AtlasEntityKey[] {
  if (!identity(eventId)) throw new Error('Identifiant d’épisode incorrect.');
  return [...new Set([
    `event:${eventId}`,
    ...items.map(item => `person:${item.personId}`),
    ...items.flatMap(item => item.placeId ? [`place:${item.placeId}`] : [])
  ])] as AtlasEntityKey[];
}

export function reconcileEntityKeys(
  existing: readonly string[],
  previouslyAutomatic: readonly string[],
  currentAutomatic: readonly AtlasEntityKey[]
): string[] {
  const oldSet = new Set(previouslyAutomatic);
  return [...new Set([...existing.filter(key => !oldSet.has(key)), ...currentAutomatic])];
}
