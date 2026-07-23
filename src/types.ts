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
  name: string;
  color: string; // RGB string "0,128,255"
  hexColor: string;
  parent?: string;
  progressColor?: string;
  doneColor?: string;
  fontColor?: string;
}

export interface EventData {
  id: string;
  text: string;
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
  // Associated map place IDs or route IDs for cross-linking
  associatedLocationIds?: string[];
}

export interface BiblicalPlace {
  id: string;
  name: string;
  alternateNames?: string[];
  coordinates: [number, number]; // [lat, lng]
  startYear?: number;
  endYear?: number;
  periodDescription?: string;
  description: string;
  biblicalReferences: string[];
  documentaryReferences?: string[];
  associatedEvents?: string[]; // IDs or titles of events
  associatedCharacters?: string[]; // IDs or names of characters
  territory?: string;
  routeId?: string;
  category?: string;
}

export interface BiblicalRoute {
  id: string;
  name: string;
  description: string;
  color: string;
  points: {
    name: string;
    coordinates: [number, number];
    stepNumber: number;
    description?: string;
  }[];
  biblicalReferences: string[];
  associatedCharacters?: string[];
}

export interface BiblicalTerritory {
  id: string;
  name: string;
  color: string;
  bounds: [number, number][]; // Polygon coordinates
  period: string;
  description: string;
}

export type ActiveTab = 'timeline' | 'map';

export interface TimelineFilterState {
  searchQuery: string;
  selectedCategories: Set<string>;
  selectedEraId: string | null;
  selectedEventId: string | null;
}
