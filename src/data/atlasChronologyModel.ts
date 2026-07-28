import type { CertaintyLevel } from '../types';

export type AtlasAxisSegment =
  | 'INTRO_HORS_ECHELLE'
  | 'BIBLIQUE_PRINCIPAL'
  | 'INTERVALLE_COMPRIME'
  | 'TEMPS_DE_LA_FIN'
  | 'FUTUR_RELATIF';

export interface AtlasSourceLink {
  id: string;
  label: string;
  url: string;
}

export interface AtlasChronologyRecord {
  id: string;
  status: string;
  type?: string;
  sourceCategory?: string;
  subject?: string;
  title: string;
  place?: string;
  startLabel?: string;
  endLabel?: string;
  displayDateLabel: string;
  start: number;
  end: number;
  startMin?: number;
  startMax?: number;
  endMin?: number;
  endMax?: number;
  description?: string;
  notes?: string;
  method?: string;
  confidenceLabel?: string;
  certainty: CertaintyLevel;
  biblicalReferences?: string[];
  documentaryReferences?: string[];
  sources?: AtlasSourceLink[];
  categoryName: string;
  layer: string;
  importance?: number;
  scale?: string;
  primaryPersonId?: string;
  linkedPersonIds?: string[];
  durationYears?: number;
  defaultVisible?: boolean;
  visualEra?: string;
  segment: AtlasAxisSegment;
  zoomMin: number;
  zoomMax: number;
  renderMode: string;
  visualGroup?: string;
  parentVisualId?: string;
  memberIds?: string[];
  shortLabel: string;
  labelPriority?: number;
  lane: string;
  laneOrder: number;
  clusterKey?: string;
  clickBehavior?: string;
  collisionPolicy?: string;
  minLabelWidth: number;
  allianceIds?: string[];
  calendarAuto?: boolean;
  contextMonth?: string;
  contextDay?: number;
  computableFestivals?: string;
  climateContext?: string;
  calendarPrecision?: string;
  geographicKey?: string;
  mapStatus?: string;
  routeId?: string;
  routeStepOrder?: number;
  mapAction?: string;
}

export interface AtlasVisualGroup {
  id: string;
  label: string;
  memberCount: number;
  summaryZoom: number;
  expandedZoom: number;
  summaryMode: string;
  reason?: string;
  memberIds: string[];
  existingSummaryId?: string;
}

export interface AtlasLane {
  order: number;
  name: string;
  count: number;
  renderMode: string;
  rule?: string;
}
