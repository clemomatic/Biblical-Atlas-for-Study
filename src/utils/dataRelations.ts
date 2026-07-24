import {
  BiblicalPlace,
  BiblicalRoute,
  EventData
} from '../types';

const normalizeLabel = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const unique = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

export function normalizeDataRelations(
  events: EventData[],
  places: BiblicalPlace[],
  routes: BiblicalRoute[]
): { events: EventData[]; places: BiblicalPlace[]; routes: BiblicalRoute[] } {
  const eventsById = new Map(events.map(event => [event.id, event]));
  const eventsByLabel = new Map(
    events.map(event => [normalizeLabel(event.text), event])
  );
  const charactersByLabel = new Map(
    events
      .filter(event => event.category === 'Personnage')
      .map(event => [normalizeLabel(event.text), event])
  );

  const normalizedPlaces = places.map(place => {
    const associatedEventIds = unique([
      ...(place.associatedEventIds || []),
      ...(place.associatedEvents || []).map(reference =>
        eventsById.has(reference)
          ? reference
          : eventsByLabel.get(normalizeLabel(reference))?.id
      )
    ]);
    const associatedCharacterIds = unique([
      ...(place.associatedCharacterIds || []),
      ...(place.associatedCharacters || []).map(reference =>
        eventsById.has(reference)
          ? reference
          : charactersByLabel.get(normalizeLabel(reference))?.id
      )
    ]);

    return {
      ...place,
      associatedEventIds,
      associatedCharacterIds
    };
  });

  const normalizedRoutes = routes.map(route => {
    const points = route.points.map((point, index) => {
      const matchingPlace = normalizedPlaces.find(place =>
        place.coordinates[0] === point.coordinates[0] &&
        place.coordinates[1] === point.coordinates[1]
      );
      return {
        ...point,
        id: point.id || `${route.id}-step-${index + 1}`,
        placeId: point.placeId || matchingPlace?.id
      };
    });

    return {
      ...route,
      points,
      associatedPlaceIds: unique([
        ...(route.associatedPlaceIds || []),
        ...points.map(point => point.placeId)
      ]),
      associatedCharacterIds: unique([
        ...(route.associatedCharacterIds || []),
        ...(route.associatedCharacters || []).map(reference =>
          eventsById.has(reference)
            ? reference
            : charactersByLabel.get(normalizeLabel(reference))?.id
        )
      ])
    };
  });

  const routeIdsByPlaceId = new Map<string, string[]>();
  const routeIdsByEventId = new Map<string, string[]>();
  normalizedRoutes.forEach(route => {
    route.associatedPlaceIds?.forEach(placeId => {
      routeIdsByPlaceId.set(placeId, [
        ...(routeIdsByPlaceId.get(placeId) || []),
        route.id
      ]);
    });
    route.associatedEventIds?.forEach(eventId => {
      routeIdsByEventId.set(eventId, [
        ...(routeIdsByEventId.get(eventId) || []),
        route.id
      ]);
    });
  });

  return {
    events: events.map(event => ({
      ...event,
      associatedRouteIds: unique([
        ...(event.associatedRouteIds || []),
        ...(routeIdsByEventId.get(event.id) || [])
      ])
    })),
    routes: normalizedRoutes,
    places: normalizedPlaces.map(place => ({
      ...place,
      routeIds: unique([
        ...(place.routeIds || []),
        place.routeId,
        ...(routeIdsByPlaceId.get(place.id) || [])
      ])
    }))
  };
}
