import type { BiblicalPlace, CategoryData, EventData, TimelinePeriod, ActiveTab } from './types';
import type { BiblicalPerson } from './domain/history/types';

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

/** Host-specific behavior is optional: the web application keeps its own routing. */
export interface AtlasIntegration {
  initialState?: AtlasNavigationState;
  navigation?: { sequence: number; state: AtlasNavigationState };
  events?: EventData[];
  places?: BiblicalPlace[];
  categories?: CategoryData[];
  allowOnlineMaps?: boolean;
  offlineBackground?: AtlasOfflineBackground;
  onNavigate?: (state: AtlasNavigationState) => void;
  onSelectionChange?: (selection: AtlasSelection | null) => void;
  linkForSelection?: (selection: AtlasSelection | null) => string;
}

export const emptyAtlasNavigation = (): AtlasNavigationState => ({
  activeTab: 'timeline', eventId: null, placeId: null, routeId: null,
  personId: null, visiblePeriod: null, historicalControlOpen: false
});
