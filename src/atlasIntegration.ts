import type { BiblicalPlace, BiblicalRoute, CategoryData, EventData, TimelinePeriod, ActiveTab } from './types';
import type { BiblicalPerson, TemporalSpan } from './domain/history/types';
import type { HistoricalSnapshot } from './domain/history/historicalSnapshot';
import type { ReactNode } from 'react';
import type { Layer } from 'leaflet';

export type AtlasEntityType = 'person' | 'place' | 'event' | 'route';
export type AtlasEntityKey = `${AtlasEntityType}:${string}`;

export interface AtlasNavigationState {
  activeTab: ActiveTab;
  eventId: string | null;
  placeId: string | null;
  routeId: string | null;
  personId: string | null;
  visiblePeriod: TimelinePeriod | null;
  historicalControlOpen: boolean;
}

export interface AtlasSelection {
  key: AtlasEntityKey;
  type: AtlasEntityType;
  id: string;
  title: string;
  entity: EventData | BiblicalPlace | BiblicalPerson | import('./types').BiblicalRoute;
}

export interface AtlasOfflineBackground {
  land: GeoJSON.GeoJsonObject;
  lakes: GeoJSON.GeoJsonObject;
}

export interface AtlasDataset {
  people: BiblicalPerson[];
  events: EventData[];
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
}
export interface AtlasMapEditing {
  onMovePlace: (id: string, coordinates: [number, number]) => void;
  onMoveRoutePoint: (routeId: string, pointId: string, coordinates: [number, number]) => void;
  onAddRoutePoint: (routeId: string, coordinates: [number, number]) => void;
  onRemoveRoutePoint: (routeId: string, pointId: string) => void;
}
export interface AtlasMapBounds { west: number; south: number; east: number; north: number }
export interface AtlasMapTiles { revision: number; createLayer: (style: 'natural-relief' | 'light-map') => Layer }
export interface AtlasAgeProbe {
  position: number;
  dateLabel: string;
  ages: Map<string, { label: string; explanation: string }>;
  onPosition: (position: number) => void;
}

/** Host-specific behavior is optional: the web application keeps its own routing. */
export interface AtlasIntegration {
  initialState?: AtlasNavigationState;
  navigation?: { sequence: number; state: AtlasNavigationState };
  events?: EventData[];
  places?: BiblicalPlace[];
  categories?: CategoryData[];
  dataset?: AtlasDataset;
  mapEditing?: AtlasMapEditing;
  replaceHistoricalRoads?: boolean;
  mapTiles?: AtlasMapTiles;
  ageProbe?: AtlasAgeProbe;
  snapshotForPeriod?: (period: TemporalSpan) => HistoricalSnapshot;
  onMapViewport?: (bounds: AtlasMapBounds) => void;
  allowOnlineMaps?: boolean;
  offlineBackground?: AtlasOfflineBackground;
  onNavigate?: (state: AtlasNavigationState) => void;
  onSelectionChange?: (selection: AtlasSelection | null) => void;
  linkForSelection?: (selection: AtlasSelection | null) => string;
  renderMarkdown?: (text: string, sourcePath?: string) => ReactNode;
}

export const emptyAtlasNavigation = (): AtlasNavigationState => ({
  activeTab: 'timeline', eventId: null, placeId: null, routeId: null,
  personId: null, visiblePeriod: null, historicalControlOpen: false
});
