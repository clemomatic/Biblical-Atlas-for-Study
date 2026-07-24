export type CertaintyLevel = 'certain' | 'probable' | 'possible' | 'unknown';
export type TimelineDisplayLevel = 'overview' | 'study' | 'detail';

export interface SourceReference {
  id: string;
  label: string;
  url?: string;
  citation?: string;
}

export interface EntityMetadata {
  biblicalReferences?: string[];
  documentaryReferences?: string[];
  sources?: SourceReference[];
  certainty?: CertaintyLevel;
  notes?: string;
  lastVerified?: string;
}

export interface EraData {
  id: string;
  name: string;
  startRaw: string;
  endRaw: string;
  startYear: number;
  endYear: number;
  startPos: number;
  endPos: number;
  color: string; // RGB string "196,205,219"
  hexColor: string;
}

export interface CategoryData {
  id: string;
  name: string;
  color: string; // RGB string "0,128,255"
  hexColor: string;
  parent?: string;
  displayMode?: 'lane' | 'background-period';
  progressColor?: string;
  doneColor?: string;
  fontColor?: string;
}

export interface EventData extends EntityMetadata {
  id: string;
  text: string;
  categoryId: string;
  category: string;
  startRaw: string;
  endRaw: string;
  startYear: number;
  endYear: number;
  startPos: number;
  endPos: number;
  isPoint: boolean;
  fuzzyStart: boolean;
  fuzzyEnd: boolean;
  description?: string;
  icon?: string; // base64 string
  defaultColor?: string;
  /**
   * Controls progressive disclosure on the timeline.
   * Existing events default to "study"; background periods stay visible in overview.
   */
  timelineLevel?: TimelineDisplayLevel;
  // Relations use stable IDs. Legacy title/name fields remain supported on map entities.
  associatedLocationIds?: string[];
  associatedRouteIds?: string[];
  associatedCharacterIds?: string[];
}

export interface BiblicalPlace extends EntityMetadata {
  id: string;
  name: string;
  alternateNames?: string[];
  coordinates: [number, number]; // [lat, lng]
  startYear?: number;
  endYear?: number;
  periodDescription?: string;
  description: string;
  biblicalReferences: string[];
  associatedEventIds?: string[];
  associatedCharacterIds?: string[];
  /** @deprecated Compatibility with existing data; normalized to associatedEventIds. */
  associatedEvents?: string[];
  /** @deprecated Compatibility with existing data; normalized to associatedCharacterIds. */
  associatedCharacters?: string[];
  territory?: string;
  routeId?: string;
  routeIds?: string[];
  category?: string;
}

export interface BiblicalRoute extends EntityMetadata {
  id: string;
  name: string;
  description: string;
  color: string;
  startYear?: number;
  endYear?: number;
  points: {
    id?: string;
    placeId?: string;
    name: string;
    coordinates: [number, number];
    stepNumber: number;
    description?: string;
  }[];
  biblicalReferences: string[];
  associatedPlaceIds?: string[];
  associatedEventIds?: string[];
  associatedCharacterIds?: string[];
  /** @deprecated Compatibility with existing data; normalized to associatedCharacterIds. */
  associatedCharacters?: string[];
}

export interface BiblicalTerritory extends EntityMetadata {
  id: string;
  name: string;
  color: string;
  bounds: [number, number][]; // Polygon coordinates
  period: string;
  startYear?: number;
  endYear?: number;
  description: string;
}

export interface TimelinePeriod {
  startYear: number;
  endYear: number;
}

export type ActiveTab = 'timeline' | 'map';

export interface TimelineFilterState {
  searchQuery: string;
  selectedCategories: Set<string>;
  selectedEraId: string | null;
  selectedEventId: string | null;
}
