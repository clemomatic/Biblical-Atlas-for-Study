import { DISPLAY_HISTORICAL_PEOPLE, TIMELINE_EVENTS } from '../../src/data/historicalData';
import { BIBLICAL_PLACES, BIBLICAL_ROUTES } from '../../src/data/mapData';
import { normalizeDataRelations } from '../../src/utils/dataRelations';
import { canonicalizeHistoricalPersonId } from '../../src/domain/history/personIdentityProjection';
import type { AtlasEntityKey, AtlasSelection } from '../../src/atlasIntegration';
import { splitEntityKey, type VaultNote, projectPersonalNotes } from './model';

const normalized = normalizeDataRelations(TIMELINE_EVENTS, BIBLICAL_PLACES, BIBLICAL_ROUTES);
const corpus = new Map<AtlasEntityKey, AtlasSelection>();
for (const entity of DISPLAY_HISTORICAL_PEOPLE) corpus.set(`person:${entity.id}`, { key: `person:${entity.id}`, type: 'person', id: entity.id, title: entity.name, entity });
for (const entity of normalized.events) {
  if (!entity.historicalPersonId) corpus.set(`event:${entity.id}`, { key: `event:${entity.id}`, type: 'event', id: entity.id, title: entity.text, entity });
}
for (const entity of normalized.places) corpus.set(`place:${entity.id}`, { key: `place:${entity.id}`, type: 'place', id: entity.id, title: entity.name, entity });
for (const entity of normalized.routes) corpus.set(`route:${entity.id}`, { key: `route:${entity.id}`, type: 'route', id: entity.id, title: entity.name, entity });

export function buildCatalog(notes: VaultNote[]): Map<AtlasEntityKey, AtlasSelection> {
  const catalog = new Map(corpus);
  const personal = projectPersonalNotes(notes);
  for (const entity of personal.events) catalog.set(`event:${entity.id}`, { key: `event:${entity.id}`, type: 'event', id: entity.id, title: entity.text, entity });
  for (const entity of personal.places) catalog.set(`place:${entity.id}`, { key: `place:${entity.id}`, type: 'place', id: entity.id, title: entity.name, entity });
  return catalog;
}

export function resolveEntity(catalog: Map<AtlasEntityKey, AtlasSelection>, key: AtlasEntityKey): AtlasSelection | undefined {
  const { type, id } = splitEntityKey(key);
  return catalog.get(type === 'person' ? `person:${canonicalizeHistoricalPersonId(id)}` : key);
}

export function relatedEntities(selection: AtlasSelection, catalog: Map<AtlasEntityKey, AtlasSelection>): AtlasSelection[] {
  const entity = selection.entity;
  const pairs: Array<[string, string]> = [
    ['associatedLocationIds', 'place'], ['associatedPlaceIds', 'place'],
    ['associatedCharacterIds', 'person'], ['associatedPersonIds', 'person'],
    ['associatedEventIds', 'event'], ['associatedRouteIds', 'route']
  ];
  const result = new Map<AtlasEntityKey, AtlasSelection>();
  for (const [field, type] of pairs) {
    const ids: unknown = (entity as unknown as Record<string, unknown>)[field];
    if (!Array.isArray(ids)) continue;
    for (const id of ids) {
      const candidate = resolveEntity(catalog, `${type}:${id}` as AtlasEntityKey);
      if (candidate && candidate.key !== selection.key) result.set(candidate.key, candidate);
    }
  }
  return [...result.values()];
}
