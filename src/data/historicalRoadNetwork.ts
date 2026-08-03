import roadsJson from './generated/historical-roads.generated.json';
import nodesJson from './generated/historical-road-nodes.generated.json';
import linksJson from './generated/historical-itinerary-links.generated.json';
import chronologyJson from './generated/authoritative-chronology.generated.json';
import type { TimelinePeriod } from '../types.ts';

export type HistoricalRoadCertainty = 'high' | 'probable' | 'hypothetical';

export interface HistoricalRoadSegment {
  id: string;
  name: string;
  system: string;
  roadType: string;
  certainty: HistoricalRoadCertainty;
  startYear: number;
  endYear: number;
  coordinates: [number, number][];
  sourceUrl?: string;
  sourcePage?: string;
  geometryBasis?: string;
  needsHumanValidation: boolean;
  notes?: string;
}

export interface HistoricalRoadNode {
  id: string;
  name: string;
  coordinates: [number, number];
  coordinateStatus?: string;
  needsFeatureMatch: boolean;
}

interface RoadFeature {
  id?: string;
  properties: {
    road_segment_id: string;
    road_name: string;
    road_system: string;
    road_type: string;
    certainty: HistoricalRoadCertainty;
    period_start: number;
    period_end: number;
    geometry_basis?: string;
    source_url?: string;
    source_page?: string;
    needs_human_validation?: boolean;
    notes?: string;
  };
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}

interface NodeFeature {
  properties: {
    node_id: string;
    name: string;
    coordinate_status?: string;
    needs_feature_match?: boolean;
  };
  geometry: { type: 'Point'; coordinates: [number, number] };
}

interface ItineraryLinksBundle {
  metadata: { warning: string };
  itineraries: Record<string, {
    itinerary_id: string;
    legs: Array<{
      leg_name: string;
      route_variant: string;
      road_segments: Array<{ segment_id: string; direction: 'forward' | 'reverse' }>;
      status: string;
      note?: string;
    }>;
  }>;
}

interface ChronologyBundle {
  itineraries: Array<{
    id: string;
    name?: string;
    precision?: string;
    sourceUrl?: string;
  }>;
}

const roadFeatures = (roadsJson as unknown as { features: RoadFeature[] }).features;
const nodeFeatures = (nodesJson as unknown as { features: NodeFeature[] }).features;
const itineraryLinks = linksJson as ItineraryLinksBundle;
const itineraryMetadata = new Map(
  (chronologyJson as ChronologyBundle).itineraries.map(itinerary => [itinerary.id, itinerary])
);

export const HISTORICAL_ROAD_WARNING = itineraryLinks.metadata.warning;

export const HISTORICAL_ROAD_SEGMENTS: HistoricalRoadSegment[] = roadFeatures.map(feature => ({
  id: feature.properties.road_segment_id || feature.id || 'road-segment',
  name: feature.properties.road_name,
  system: feature.properties.road_system,
  roadType: feature.properties.road_type,
  certainty: feature.properties.certainty,
  startYear: feature.properties.period_start,
  endYear: feature.properties.period_end,
  coordinates: feature.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
  sourceUrl: feature.properties.source_url,
  sourcePage: feature.properties.source_page,
  geometryBasis: feature.properties.geometry_basis,
  needsHumanValidation: feature.properties.needs_human_validation === true,
  notes: feature.properties.notes || undefined
}));

export const HISTORICAL_ROAD_NODES: HistoricalRoadNode[] = nodeFeatures.map(feature => ({
  id: feature.properties.node_id,
  name: feature.properties.name,
  coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
  coordinateStatus: feature.properties.coordinate_status,
  needsFeatureMatch: feature.properties.needs_feature_match === true
}));

const segmentById = new Map(HISTORICAL_ROAD_SEGMENTS.map(segment => [segment.id, segment]));

export const getHistoricalRoadSegmentsForItineraries = (
  itineraryIds: readonly string[]
): HistoricalRoadSegment[] => {
  const ids = new Set<string>();
  itineraryIds.forEach(itineraryId => {
    const itinerary = itineraryLinks.itineraries[itineraryId];
    itinerary?.legs.forEach(leg => {
      leg.road_segments.forEach(segment => ids.add(segment.segment_id));
    });
  });
  return [...ids].map(id => segmentById.get(id)).filter((segment): segment is HistoricalRoadSegment => Boolean(segment));
};

export const getHistoricalItinerarySummary = (itineraryId: string) => {
  const links = itineraryLinks.itineraries[itineraryId];
  const metadata = itineraryMetadata.get(itineraryId);
  if (!links && !metadata) return undefined;
  return {
    id: itineraryId,
    name: metadata?.name ?? itineraryId,
    precision: metadata?.precision,
    sourceUrl: metadata?.sourceUrl,
    legs: links?.legs ?? [],
    warning: HISTORICAL_ROAD_WARNING
  };
};

export const historicalRoadOverlapsPeriod = (
  segment: HistoricalRoadSegment,
  period: TimelinePeriod | null
): boolean =>
  !period || (segment.endYear >= period.startYear && segment.startYear <= period.endYear);
