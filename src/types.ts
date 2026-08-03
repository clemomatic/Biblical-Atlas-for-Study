import type {
  PersonActivityPeriod,
  TemporalSpan
} from './domain/history/types.ts';

export type CertaintyLevel = 'certain' | 'probable' | 'possible' | 'unknown';
export type TimelineDisplayLevel = 'overview' | 'study' | 'detail';
export type HistoricalPersonLaneId =
  | 'united-monarchy'
  | 'judah-kings'
  | 'israel-kings'
  | 'prophets'
  | 'people';
export type MapLabelLevel = 'major' | 'regional' | 'study' | 'local';
export type BiblicalMapCategory =
  | 'levitical-city'
  | 'refuge-city'
  | 'hebrew-scriptures'
  | 'greek-scriptures'
  | 'both-scriptures'
  | 'ancient-city'
  | 'biblical-site'
  | 'exodus-stage'
  | 'summit'
  | 'wadi'
  | 'body-of-water'
  | 'river'
  | 'spring';
export type BiblicalRouteCategory =
  | 'patriarch-abraham'
  | 'patriarch-isaac'
  | 'patriarch-jacob'
  | 'ancient-road'
  | 'exodus'
  | 'missionary'
  | 'jesus-ministry';

export interface SourceReference {
  id: string;
  label: string;
  url?: string;
  citation?: string;
}

export type GeographicProvenanceMethod =
  | 'source-map-location'
  | 'map-and-event-cross-reference'
  | 'documented-route'
  | 'reconstructed-route'
  | 'schematic-route';

export interface GeographicProvenance {
  id: string;
  sourceId: string;
  sourceLabel: string;
  sourceUrl?: string;
  mapId: string;
  mapReference: string;
  method: GeographicProvenanceMethod;
  /** Certitude du rapprochement géographique, pas de la date de l’événement. */
  certainty: CertaintyLevel;
  /** Certitude portée explicitement par le symbole de la carte source. */
  sourceMapCertainty: CertaintyLevel;
  limitations: string;
  /** Rend explicite qu’une simple association ne réécrit pas les coordonnées. */
  coordinatesChanged: boolean;
}

export interface EncyclopediaReference {
  id: string;
  work: 'insight' | 'wol';
  articleTitle: string;
  url: string;
  /** Nom actuel affiché dans l’application lorsqu’il diffère du titre Rbi8. */
  linkedName?: string;
  /** Un article peut traiter l’entité sans lui être entièrement consacré. */
  matchType?: 'dedicated-article' | 'article-mention';
}

export interface MediaAsset {
  id: string;
  src: string;
  thumbnailSrc?: string;
  alt: string;
  caption?: string;
  type: 'photo' | 'illustration' | 'reconstruction' | 'map';
  sourceLabel?: string;
  sourceUrl?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
}

export interface EntityMetadata {
  biblicalReferences?: string[];
  documentaryReferences?: string[];
  sources?: SourceReference[];
  encyclopediaReferences?: EncyclopediaReference[];
  certainty?: CertaintyLevel;
  notes?: string;
  lastVerified?: string;
  media?: MediaAsset[];
  geographicProvenance?: GeographicProvenance[];
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

export interface AuthoritativeTimelinePresentation {
  axisSegment?: string;
  zoomMin: number;
  zoomMax: number;
  renderMode?: string;
  visualGroupId?: string;
  visualParentId?: string;
  visualMemberIds: string[];
  shortLabel?: string;
  labelPriority: number;
  laneId?: string;
  laneOrder: number;
  groupingKey?: string;
  clickBehavior?: string;
  collisionPolicy?: string;
  minLabelWidth: number;
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
  /** Ouvre la fiche BiblicalPerson plutôt qu'une fiche d'évènement. */
  historicalPersonId?: string;
  /** Distingue la durée de vie d'une période d'activité dans la frise. */
  historicalPersonSpanKind?: 'lifespan' | 'activity';
  /** Période sourcée utilisée pour les calculs, distincte de l’ancre de rendu. */
  temporalSpan?: TemporalSpan;
  /** Activités intégrées au ruban de vie sans supprimer leur projection héritée. */
  historicalActivityPeriods?: PersonActivityPeriod[];
  /** Bande sémantique stable utilisée pour organiser les biographies. */
  historicalPersonLaneId?: HistoricalPersonLaneId;
  /** Fiche du nouveau corpus de recherche dont cette projection provient. */
  authoritativeRecordId?: string;
  /** Itinéraires du réseau historique associés par le classeur validé. */
  authoritativeItineraryIds?: string[];
  /** Directives de rendu sémantique validées dans le guide d’intégration. */
  timelinePresentation?: AuthoritativeTimelinePresentation;
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
  /** Classification visuelle provenant d'une légende cartographique. */
  mapCategory?: BiblicalMapCategory;
  /** Références de grille conservées depuis les documents cartographiques. */
  mapReferences?: string[];
  /** Nature de la coordonnée affichée, distincte du degré de certitude. */
  coordinatePrecision?: 'site' | 'cartographic' | 'representative' | 'approximate';
  /** Provenance vérifiable de la position utilisée par Leaflet. */
  coordinateSource?: {
    sourceId: string;
    sourceMapIds?: string[];
    mapReference?: string;
    sourcePixel?: [number, number];
    sourceImageSize?: [number, number];
    method:
      | 'source-symbol-georeferenced'
      | 'source-symbol-georeferenced-from-inset'
      | 'source-feature-representative-position';
  };
  /** Niveau de zoom à partir duquel le nom du lieu est affiché en permanence. */
  mapLabelLevel?: MapLabelLevel;
}

export interface BiblicalRoute extends EntityMetadata {
  id: string;
  name: string;
  description: string;
  color: string;
  /** Groupe visuel et filtre de consultation de l'itinéraire. */
  routeCategory?: BiblicalRouteCategory;
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
  /** Le tracé relie des lieux attestés sans prétendre restituer le chemin exact. */
  geometryPrecision?: 'schematic';
  routeNature?: 'documented' | 'reconstructed' | 'schematic';
  tracePrecision?: 'exact' | 'approximate' | 'indicative-place-sequence';
  stepOrder?: 'source-chronology' | 'documented-sequence';
  /** Empêche toute interprétation du tracé comme donnée de navigation. */
  notForExactNavigation?: boolean;
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
