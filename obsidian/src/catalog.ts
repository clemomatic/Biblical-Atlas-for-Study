import { DISPLAY_HISTORICAL_PEOPLE, TIMELINE_EVENTS } from '../../src/data/historicalData';
import { BIBLICAL_PLACES, BIBLICAL_ROUTES } from '../../src/data/mapData';
import { normalizeDataRelations } from '../../src/utils/dataRelations';
import { canonicalizeHistoricalPersonId } from '../../src/domain/history/personIdentityProjection';
import type { AtlasEntityKey, AtlasSelection } from '../../src/atlasIntegration';
import { splitEntityKey, type VaultNote, projectPersonalNotes } from './model';
import { HISTORICAL_ROAD_SEGMENTS, getHistoricalRoadSegmentsForItineraries } from '../../src/data/historicalRoadNetwork';
import { selectionFromEntity, validateEntity, type EditableEntity } from './editable';
import { createHistoricalPersonTimelineProjection } from '../../src/data/historicalPersonTimeline';
import type { AtlasDataset } from '../../src/atlasIntegration';
import type { BiblicalRoute, EventData } from '../../src/types';

const normalized = normalizeDataRelations(TIMELINE_EVENTS, BIBLICAL_PLACES, BIBLICAL_ROUTES);
const corpus = new Map<AtlasEntityKey, AtlasSelection>();
for (const entity of DISPLAY_HISTORICAL_PEOPLE) corpus.set(`person:${entity.id}`, { key: `person:${entity.id}`, type: 'person', id: entity.id, title: entity.name, entity });
for (const entity of normalized.events) {
  if (!entity.historicalPersonId) {
    const roads = getHistoricalRoadSegmentsForItineraries(entity.authoritativeItineraryIds ?? []);
    const current = roads.length ? { ...entity, associatedRouteIds: [...new Set([...(entity.associatedRouteIds ?? []), ...roads.map(road => `atlas-road-${road.id}`)])] } : entity;
    corpus.set(`event:${entity.id}`, { key: `event:${entity.id}`, type: 'event', id: entity.id, title: entity.text, entity: current });
  }
}
for (const entity of normalized.places) corpus.set(`place:${entity.id}`, { key: `place:${entity.id}`, type: 'place', id: entity.id, title: entity.name, entity });
for (const entity of normalized.routes) corpus.set(`route:${entity.id}`, { key: `route:${entity.id}`, type: 'route', id: entity.id, title: entity.name, entity });

// Corridors previously drawn as a separate static layer become ordinary editable routes.
for (const road of HISTORICAL_ROAD_SEGMENTS) {
  const route: BiblicalRoute = { id: `atlas-road-${road.id}`, name: road.name,
    description: road.geometryBasis ?? 'Corridor du réseau historique.', notes: road.notes,
    color: '#8b6a42', mapLayer: 'road-network', routeCategory: 'ancient-road', startYear: road.startYear, endYear: road.endYear,
    points: road.coordinates.map((coordinates, index) => ({ id: `${road.id}-${index}`, name: `${road.name} · ${index + 1}`, coordinates, stepNumber: index + 1 })),
    biblicalReferences: [], sources: road.sourceUrl ? [{ id: road.id, label: `${road.name}${road.sourcePage ? ` · ${road.sourcePage}` : ''}`, url: road.sourceUrl }] : [],
    certainty: road.certainty === 'high' ? 'certain' : road.certainty === 'probable' ? 'probable' : 'possible',
    routeNature: 'documented', tracePrecision: 'approximate', geometryPrecision: 'schematic', notForExactNavigation: true };
  corpus.set(`route:${route.id}`, selectionFromEntity('route', route));
}

export interface AtlasWorkspace {
  catalog: Map<AtlasEntityKey, AtlasSelection>;
  all: Map<AtlasEntityKey, AtlasSelection>;
  hidden: Set<AtlasEntityKey>;
  dataset: AtlasDataset;
  diagnostics: Map<string, string[]>;
}

export function originalEntity(key: AtlasEntityKey): AtlasSelection | undefined { return corpus.get(key); }

export function buildWorkspace(notes: VaultNote[]): AtlasWorkspace {
  const all = new Map(corpus);
  const personal = projectPersonalNotes(notes);
  for (const entity of personal.events) all.set(`event:${entity.id}`, selectionFromEntity('event', entity));
  for (const entity of personal.places) all.set(`place:${entity.id}`, selectionFromEntity('place', entity));
  const hidden = new Set<AtlasEntityKey>();
  const diagnostics = new Map<string, string[]>();
  const editCounts = new Map<AtlasEntityKey, number>();
  for (const note of notes) if (note.edit) editCounts.set(note.edit.key, (editCounts.get(note.edit.key) ?? 0) + 1);
  for (const note of notes) {
    if (!note.edit) continue;
    const edit = note.edit;
    try {
      if (editCounts.get(edit.key)! > 1) throw new Error('Plusieurs personnalisations de cette fiche existent : conserve un seul fichier pour lever le conflit.');
      if (note.warnings.length) continue;
      const { type, id } = splitEntityKey(edit.key);
      const base = all.get(edit.key);
      if (!base && !edit.created) throw new Error('La fiche d’origine est introuvable. Active atlas_created pour une nouvelle fiche.');
      const entity = validateEntity(type, { ...(base?.entity ?? {}), ...edit.data }, id);
      entity.personalization = { path: edit.path, created: edit.created, revision: edit.revision };
      all.set(edit.key, selectionFromEntity(type, entity));
      if (edit.hidden) hidden.add(edit.key);
    } catch (error) { diagnostics.set(note.path, [error instanceof Error ? error.message : 'Personnalisation invalide.']); }
  }
  const catalog = new Map([...all].filter(([key]) => !hidden.has(key)));
  const places = [...catalog.values()].filter(item => item.type === 'place').map(item => item.entity as import('../../src/types').BiblicalPlace);
  const byPlaceId = new Map(places.map(place => [place.id, place]));
  const isHidden = (type: string, id: string): boolean => hidden.has(`${type}:${id}` as AtlasEntityKey) || (type === 'person' && hidden.has(`person:${canonicalizeHistoricalPersonId(id)}`));
  const clean = <T extends Record<string, any>>(entity: T): T => {
    const copy = { ...entity };
    for (const [field, type] of [['associatedEventIds','event'],['associatedLocationIds','place'],['associatedPlaceIds','place'],['associatedCharacterIds','person'],['associatedPersonIds','person'],['associatedRouteIds','route'],['routeIds','route']]) {
      if (Array.isArray(copy[field])) (copy as any)[field] = copy[field].filter((id: string) => !isHidden(type, id));
    }
    return copy;
  };
  const routes = [...catalog.values()].filter(item => item.type === 'route').map(item => {
    const route = clean(item.entity as BiblicalRoute);
    return { ...route, points: route.points.map(point => {
      const place = point.placeId ? byPlaceId.get(point.placeId) : undefined;
      return { ...point, ...(place ? { coordinates: place.coordinates } : {}) };
    }) };
  });
  const people = [...catalog.values()].filter(item => item.type === 'person').map(item => clean(item.entity as import('../../src/domain/history/types').BiblicalPerson));
  const personalizedPeople = people.filter(person => person.personalization);
  const personalizedIds = new Set(personalizedPeople.map(person => person.id));
  const events: EventData[] = normalized.events.filter(event => event.historicalPersonId && !isHidden('person', event.historicalPersonId) && !personalizedIds.has(event.historicalPersonId));
  events.push(...createHistoricalPersonTimelineProjection(personalizedPeople).events.map(event => ({ ...event, personalization: people.find(person => person.id === event.historicalPersonId)?.personalization, notes: 'Période issue de ta fiche personnalisée.' })));
  events.push(...[...catalog.values()].filter(item => item.type === 'event').map(item => clean(item.entity as EventData)));
  const linked = normalizeDataRelations(events, places.map(clean), routes);
  const reapply = <T extends EditableEntity>(type: AtlasSelection['type'], entity: T): T => {
    const custom = catalog.get(`${type}:${entity.id}`)?.entity;
    return custom?.personalization ? clean({ ...entity, ...custom }) as T : entity;
  };
  const dataset: AtlasDataset = { people, events: linked.events.map(event => event.historicalPersonId ? event : reapply('event', event)),
    places: linked.places.map(place => reapply('place', place)), routes: linked.routes.map(route => ({ ...reapply('route', route), points: route.points })) };
  for (const [type, entities] of [['person', dataset.people], ['event', dataset.events.filter(event => !event.historicalPersonId)], ['place', dataset.places], ['route', dataset.routes]] as const) {
    for (const entity of entities) { const selection = selectionFromEntity(type, entity); catalog.set(selection.key, selection); all.set(selection.key, selection); }
  }
  return { catalog, all, hidden, diagnostics, dataset };
}

export function buildCatalog(notes: VaultNote[]): Map<AtlasEntityKey, AtlasSelection> {
  return buildWorkspace(notes).catalog;
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
