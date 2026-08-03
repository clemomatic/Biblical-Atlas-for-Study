import chronologyJson from './generated/authoritative-chronology.generated.json';
import type {
  AuthoritativeTimelinePresentation,
  CertaintyLevel,
  EventData,
  HistoricalPersonLaneId,
  SourceReference,
  TimelineDisplayLevel
} from '../types.ts';
import type {
  PersonActivityPeriod,
  PersonActivityType,
  TemporalBoundary,
  TemporalPrecision,
  TemporalSpan
} from '../domain/history/types.ts';
import { historicalYearToTimelineIndex } from '../domain/history/temporal.ts';
import { createCategoryId } from '../utils/stableIds.ts';
import { BIBLICAL_PLACES } from './mapData.ts';
import type { SourceCatalogEntry } from '../domain/history/contentTypes.ts';

interface AuthoritativeChronologyRecord {
  id: string;
  status?: string;
  recordType?: string;
  category?: string;
  subject?: string;
  title: string;
  placeLabel?: string;
  startLabel?: string;
  startYear?: number;
  startMonth?: string;
  startDay?: number;
  startPrecision?: string;
  endLabel?: string;
  endYear?: number;
  endMonth?: string;
  endDay?: number;
  endPrecision?: string;
  sourceText: string;
  sourceUrls: string[];
  citedReferences: string[];
  notes?: string;
  datingMethod?: string;
  normalizedMethod?: string;
  confidence?: string;
  positioningNotes?: string;
  layer?: string;
  importance?: number;
  personId?: string;
  linkedPersonIds: string[];
  defaultVisible: boolean;
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
  geographicKey?: string;
  mapMatchStatus?: string;
  itineraryIds: string[];
  itineraryStepOrder?: number;
  mapAction?: string;
}

interface AuthoritativeChronologyBundle {
  schemaVersion: number;
  authorityPolicy: string;
  bookPeriodVisualPolicy: string;
  recordCount: number;
  records: AuthoritativeChronologyRecord[];
  sources: Array<{
    id: string;
    publication?: string;
    section?: string;
    purpose?: string;
    url?: string;
    datingRule?: string;
  }>;
}

const bundle = chronologyJson as AuthoritativeChronologyBundle;
export const AUTHORITATIVE_CHRONOLOGY_RECORDS = bundle.records;
export const AUTHORITATIVE_CHRONOLOGY_POLICY = {
  authorityPolicy: bundle.authorityPolicy,
  bookPeriodVisualPolicy: bundle.bookPeriodVisualPolicy
};

export const AUTHORITATIVE_SOURCE_CATALOG: SourceCatalogEntry[] = bundle.sources.map(source => ({
  id: `source-research-${source.id.toLocaleLowerCase('fr')}`,
  title: [source.publication, source.section].filter(Boolean).join(' — ') || source.id,
  publication: source.publication ?? 'Recherche chronologique validée',
  chapterOrAppendix: source.section,
  url: source.url,
  documentType: source.section?.toLocaleLowerCase('fr').includes('frise') ? 'timeline' : 'book',
  language: 'fr',
  notes: [source.purpose, source.datingRule].filter(Boolean).join(' · '),
  factualDataUseAllowed: true,
  longTextReproductionAllowed: false,
  imageReproductionAllowed: false,
  verificationStatus: 'verified'
}));

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const placeByKey = new Map<string, string>();
BIBLICAL_PLACES.forEach(place => {
  [place.id, place.name, ...(place.alternateNames ?? [])].forEach(candidate => {
    placeByKey.set(normalizeText(candidate), place.id);
  });
});

const resolveLocationIds = (record: AuthoritativeChronologyRecord): string[] => {
  const candidates = [record.geographicKey, record.placeLabel]
    .filter((value): value is string => Boolean(value))
    .flatMap(value => [value, ...value.split(/[→,;/]/)])
    .map(normalizeText);
  return [...new Set(candidates.map(candidate => placeByKey.get(candidate)).filter((id): id is string => Boolean(id)))];
};

const certaintyFor = (confidence?: string): CertaintyLevel => {
  const value = normalizeText(confidence ?? '');
  if (value.includes('tres elevee')) return 'certain';
  if (value.includes('elevee')) return 'probable';
  if (value.includes('moyenne')) return 'possible';
  return 'unknown';
};

const precisionFor = (value?: string, hasMonth = false, hasDay = false): TemporalPrecision => {
  const normalized = normalizeText(value ?? '');
  if (normalized.includes('inconn')) return 'unknown';
  if (normalized.includes('avant')) return 'before';
  if (normalized.includes('apres')) return 'after';
  if (normalized.includes('plage') || normalized.includes('interval')) return 'range';
  if (hasDay) return 'day';
  if (hasMonth) return 'month';
  return 'year';
};

const boundaryFor = (
  year: number | undefined,
  precisionLabel: string | undefined,
  month: string | undefined,
  day: number | undefined,
  certainty: CertaintyLevel
): TemporalBoundary | undefined => {
  if (!year) return undefined;
  const precision = precisionFor(precisionLabel, Boolean(month), Boolean(day));
  const normalized = normalizeText(precisionLabel ?? '');
  return {
    yearMin: year,
    yearMax: year,
    day,
    precision,
    approximate:
      normalized.includes('approxim') ||
      normalized.includes('estimation') ||
      certainty === 'possible',
    certainty
  };
};

const temporalSpanFor = (record: AuthoritativeChronologyRecord): TemporalSpan => {
  const certainty = certaintyFor(record.confidence);
  return {
    start: boundaryFor(record.startYear, record.startPrecision, record.startMonth, record.startDay, certainty),
    end: boundaryFor(record.endYear, record.endPrecision, record.endMonth, record.endDay, certainty),
    displayLabel: [record.startLabel, record.endLabel].filter(Boolean).join(' → ') || 'Datation non précisée'
  };
};

const timelineLevelFor = (zoomMin: number): TimelineDisplayLevel =>
  zoomMin <= 1 ? 'overview' : zoomMin <= 2 ? 'study' : 'detail';

const categoryFor = (record: AuthoritativeChronologyRecord): string => {
  const layer = normalizeText(record.layer ?? '');
  const category = normalizeText(record.category ?? '');
  if (category.includes('redaction') || category.includes('ecriture biblique')) {
    return 'Rédaction d’un livre biblique';
  }
  if (layer === 'livres bibliques') return 'Période des livres bibliques';
  if (layer === 'personnages') return 'Personnage';
  if (layer === 'prophetes') return 'Prophètes (ou période de ministère)';
  if (layer === 'regnes') {
    if (category.includes('juda')) return 'Roi de Juda';
    if (category.includes('israel') || category.includes('10 tribus')) return 'Roi d’Israël';
    return 'Règnes';
  }
  if (layer === 'voyages' && category.includes('paul')) return 'Voyages de Paul';
  return 'Événements marquants';
};

const laneFor = (record: AuthoritativeChronologyRecord): HistoricalPersonLaneId => {
  const lane = normalizeText(record.laneId ?? '');
  const category = normalizeText(record.category ?? '');
  if (lane.includes('juda') || category.includes('juda')) return 'judah-kings';
  if (lane.includes('10 tribus') || lane.includes('israel') || category.includes('israel')) return 'israel-kings';
  if (lane.includes('prophete') || normalizeText(record.layer ?? '') === 'prophetes') return 'prophets';
  if (lane.includes('monarchie unie')) return 'united-monarchy';
  return 'people';
};

const activityTypeFor = (record: AuthoritativeChronologyRecord): PersonActivityType => {
  const layer = normalizeText(record.layer ?? '');
  const category = normalizeText(record.category ?? '');
  if (layer === 'regnes') return 'reign';
  if (layer === 'prophetes') return 'prophecy';
  if (layer === 'voyages') return 'journey';
  if (layer === 'juges' || category.includes('fonction')) return 'office';
  if (layer === 'ministere chretien') return 'ministry';
  return 'other';
};

const sourceReferencesFor = (record: AuthoritativeChronologyRecord): SourceReference[] =>
  record.sourceUrls.map((url, index) => ({
    id: `authoritative-source-${record.id}-${index + 1}`,
    label: index === 0 ? 'Source principale de la recherche validée' : `Source complémentaire ${index + 1}`,
    url,
    citation: record.citedReferences.join(' ; ') || undefined
  }));

const presentationFor = (record: AuthoritativeChronologyRecord): AuthoritativeTimelinePresentation => ({
  axisSegment: record.axisSegment,
  zoomMin: record.zoomMin,
  zoomMax: record.zoomMax,
  renderMode: record.renderMode,
  visualGroupId: record.visualGroupId,
  visualParentId: record.visualParentId,
  visualMemberIds: record.visualMemberIds,
  shortLabel: record.shortLabel,
  labelPriority: record.labelPriority,
  laneId: record.laneId,
  laneOrder: record.laneOrder,
  groupingKey: record.groupingKey,
  clickBehavior: record.clickBehavior,
  collisionPolicy: record.collisionPolicy,
  minLabelWidth: record.minLabelWidth
});

const activityFor = (record: AuthoritativeChronologyRecord): PersonActivityPeriod => ({
  id: record.id,
  type: activityTypeFor(record),
  phase: activityTypeFor(record) === 'prophecy' ? 'prophetic-ministry' : activityTypeFor(record) === 'office' ? 'official-office' : 'standard',
  label: record.shortLabel ?? record.title,
  span: temporalSpanFor(record),
  associatedLocationIds: resolveLocationIds(record),
  associatedRouteIds: record.itineraryIds.map(id => `historical-itinerary-${id.toLocaleLowerCase('fr')}`),
  associatedPersonIds: record.linkedPersonIds,
  sources: sourceReferencesFor(record),
  documentaryReferences: record.citedReferences,
  certainty: certaintyFor(record.confidence),
  notes: record.notes
});

const recordToEvent = (
  record: AuthoritativeChronologyRecord,
  overrides: Partial<EventData> = {}
): EventData | undefined => {
  if (!record.startYear) return undefined;
  const endYear = record.endYear ?? record.startYear;
  const category = categoryFor(record);
  const certainty = certaintyFor(record.confidence);
  const startBoundary = boundaryFor(record.startYear, record.startPrecision, record.startMonth, record.startDay, certainty);
  const endBoundary = boundaryFor(record.endYear, record.endPrecision, record.endMonth, record.endDay, certainty);
  return {
    id: record.id,
    text: record.title,
    category,
    categoryId: createCategoryId(category),
    startRaw: `${record.startYear}-01-01 12:00:00`,
    endRaw: `${endYear}-01-01 12:00:00`,
    startYear: record.startYear,
    endYear,
    startPos: historicalYearToTimelineIndex(record.startYear),
    endPos: historicalYearToTimelineIndex(endYear),
    isPoint: record.startYear === endYear,
    fuzzyStart: Boolean(startBoundary?.approximate) || startBoundary?.precision === 'before' || startBoundary?.precision === 'after',
    fuzzyEnd: Boolean(endBoundary?.approximate) || endBoundary?.precision === 'before' || endBoundary?.precision === 'after',
    description: record.notes ?? record.positioningNotes,
    timelineLevel: timelineLevelFor(record.zoomMin),
    associatedLocationIds: resolveLocationIds(record),
    associatedCharacterIds: [...new Set([record.personId, ...record.linkedPersonIds].filter((id): id is string => Boolean(id)))],
    associatedRouteIds: record.itineraryIds.map(id => `historical-itinerary-${id.toLocaleLowerCase('fr')}`),
    documentaryReferences: record.citedReferences,
    sources: sourceReferencesFor(record),
    certainty,
    notes: [record.notes, record.datingMethod, record.normalizedMethod, record.positioningNotes].filter(Boolean).join('\n'),
    temporalSpan: temporalSpanFor(record),
    authoritativeRecordId: record.id,
    authoritativeItineraryIds: record.itineraryIds,
    timelinePresentation: presentationFor(record),
    ...overrides
  };
};

const PERSON_BASE_LAYER = 'personnages';
const ACTIVITY_LAYERS = new Set(['regnes', 'prophetes', 'voyages', 'juges', 'ministere chretien']);
const recordsByPersonId = new Map<string, AuthoritativeChronologyRecord[]>();

bundle.records.forEach(record => {
  if (!record.personId) return;
  const layer = normalizeText(record.layer ?? '');
  if (layer !== PERSON_BASE_LAYER && !ACTIVITY_LAYERS.has(layer)) return;
  const records = recordsByPersonId.get(record.personId) ?? [];
  records.push(record);
  recordsByPersonId.set(record.personId, records);
});

const personEvents: EventData[] = [];
const absorbedActivityRecordIds = new Set<string>();
recordsByPersonId.forEach((records, personId) => {
  const base = records.find(record => normalizeText(record.layer ?? '') === PERSON_BASE_LAYER);
  const activities = records.filter(record => ACTIVITY_LAYERS.has(normalizeText(record.layer ?? '')));
  activities.forEach(record => absorbedActivityRecordIds.add(record.id));
  const anchor = base ?? activities[0];
  if (!anchor) return;
  const projected = recordToEvent(anchor, {
    historicalPersonId: personId,
    historicalPersonSpanKind: base ? 'lifespan' : 'activity',
    historicalPersonLaneId: laneFor(anchor),
    historicalActivityPeriods: activities.map(activityFor)
  });
  if (projected) personEvents.push(projected);
});

const genericEvents = bundle.records
  .filter(record => normalizeText(record.layer ?? '') !== PERSON_BASE_LAYER)
  .filter(record => !absorbedActivityRecordIds.has(record.id))
  .map(record => recordToEvent(record))
  .filter((event): event is EventData => Boolean(event));

export const AUTHORITATIVE_TIMELINE_EVENTS: EventData[] = [...personEvents, ...genericEvents]
  .sort((left, right) => left.startPos - right.startPos || left.id.localeCompare(right.id));

const authoritativeEventsByRecordId = new Map<string, EventData>();
AUTHORITATIVE_TIMELINE_EVENTS.forEach(event => {
  if (event.authoritativeRecordId) {
    authoritativeEventsByRecordId.set(event.authoritativeRecordId, event);
  }
  event.historicalActivityPeriods?.forEach(activity => {
    authoritativeEventsByRecordId.set(activity.id, event);
  });
});

const authoritativeReplacementByTitle = new Map<string, EventData>();
bundle.records.forEach(record => {
  const event = authoritativeEventsByRecordId.get(record.id);
  if (!event) return;
  [record.title, record.shortLabel, record.subject]
    .filter((value): value is string => Boolean(value))
    .forEach(value => {
      const key = normalizeText(value);
      if (!authoritativeReplacementByTitle.has(key)) {
        authoritativeReplacementByTitle.set(key, event);
      }
    });
});

export const getAuthoritativeReplacementForLegacyEvent = (
  event: EventData
): EventData | undefined =>
  authoritativeReplacementByTitle.get(normalizeText(event.text));

export const isLegacyEventSupersededByAuthoritativeResearch = (event: EventData): boolean =>
  Boolean(getAuthoritativeReplacementForLegacyEvent(event));

export const getAuthoritativeDisplayLabel = (
  event: EventData,
  availableWidth: number,
  expanded = false
): string => {
  const presentation = event.timelinePresentation;
  if (!presentation?.shortLabel || expanded) return event.text;
  return availableWidth < presentation.minLabelWidth ? presentation.shortLabel : event.text;
};
