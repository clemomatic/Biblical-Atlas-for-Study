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
  BiblicalPerson,
  HistoricalPersonRelationship,
  HistoricalPersonRelationshipKind,
  PersonActivityPeriod,
  PersonActivityType,
  TemporalBoundary,
  TemporalPrecision,
  TemporalSpan
} from '../domain/history/types.ts';
import {
  historicalYearToTimelineIndex,
  parseHebrewCalendarMonth
} from '../domain/history/temporal.ts';
import { createCategoryId } from '../utils/stableIds.ts';
import { BIBLICAL_PLACES } from './mapData.ts';
import type { SourceCatalogEntry } from '../domain/history/contentTypes.ts';

export interface AuthoritativeChronologyRecord {
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
  if (year === undefined || year === 0) return undefined;
  const calendarMonth = parseHebrewCalendarMonth(month);
  const precision = precisionFor(
    precisionLabel,
    Boolean(calendarMonth),
    Boolean(day)
  );
  const normalized = normalizeText(precisionLabel ?? '');
  return {
    yearMin: precision === 'before' ? undefined : year,
    yearMax: precision === 'after' ? undefined : year,
    day,
    calendar: calendarMonth ? 'hebrew' : undefined,
    calendarMonth,
    precision,
    approximate:
      normalized.includes('approxim') ||
      normalized.includes('estimation') ||
      certainty === 'possible',
    certainty
  };
};

/**
 * Relations explicites absentes du classeur d'extraction, mais établies par
 * le récit cité. Elles empêchent un événement central d'être présenté comme
 * un simple repère de contexte dans la frise focalisée.
 */
const CURATED_EVENT_PERSON_LINKS = new Map<string, string[]>([
  [
    'atlas-0073',
    ['atlas-0079', 'atlas-0146', 'atlas-0105', 'genese-cham']
  ]
]);

const reciprocalRelationship = (
  id: string,
  firstPersonId: string,
  secondPersonId: string,
  firstToSecondKind: HistoricalPersonRelationshipKind,
  secondToFirstKind: HistoricalPersonRelationshipKind,
  supportingRecordIds: string[]
): HistoricalPersonRelationship[] => [
  {
    id: `${id}-forward`,
    sourcePersonId: firstPersonId,
    targetPersonId: secondPersonId,
    kind: firstToSecondKind,
    supportingRecordIds
  },
  {
    id: `${id}-reverse`,
    sourcePersonId: secondPersonId,
    targetPersonId: firstPersonId,
    kind: secondToFirstKind,
    supportingRecordIds
  }
];

const fatherAndChild = (
  id: string,
  fatherId: string,
  childId: string,
  supportingRecordId: string,
  childKind: 'son' | 'daughter' = 'son'
): HistoricalPersonRelationship[] =>
  reciprocalRelationship(
    id,
    fatherId,
    childId,
    childKind,
    'father',
    [supportingRecordId]
  );

/**
 * Relations de famille explicitement documentées par les lignes du tableau.
 * Elles restent séparées des simples cooccurrences afin qu'une longue durée
 * de vie ne puisse pas masquer un père, un fils ou un conjoint.
 */
export const AUTHORITATIVE_PERSON_RELATIONSHIPS: HistoricalPersonRelationship[] = [
  ...fatherAndChild('adam-seth', 'atlas-0080', 'atlas-0104', 'atlas-0104'),
  ...fatherAndChild('seth-enosh', 'atlas-0104', 'atlas-0119', 'atlas-0119'),
  ...fatherAndChild('enosh-kenan', 'atlas-0119', 'genese-kenan', 'genese-kenan'),
  ...fatherAndChild('kenan-mahalalel', 'genese-kenan', 'genese-mahalalel', 'genese-mahalalel'),
  ...fatherAndChild('mahalalel-jared', 'genese-mahalalel', 'genese-jared', 'genese-jared'),
  ...fatherAndChild('jared-henoch', 'genese-jared', 'atlas-0144', 'atlas-0144'),
  ...fatherAndChild('henoch-mathusalem', 'atlas-0144', 'atlas-0057', 'atlas-0057'),
  ...fatherAndChild('mathusalem-lamek', 'atlas-0057', 'atlas-0133', 'atlas-0133'),
  ...fatherAndChild('lamek-noe', 'atlas-0133', 'atlas-0079', 'atlas-0079'),
  ...fatherAndChild('noe-japhet', 'atlas-0079', 'atlas-0146', 'atlas-0146'),
  ...fatherAndChild('noe-sem', 'atlas-0079', 'atlas-0105', 'atlas-0146'),
  ...fatherAndChild('noe-cham', 'atlas-0079', 'genese-cham', 'genese-cham'),
  ...fatherAndChild('sem-arpakshad', 'atlas-0105', 'atlas-0120', 'atlas-0120'),
  ...fatherAndChild('arpakshad-shelah', 'atlas-0120', 'atlas-0134', 'atlas-0134'),
  ...fatherAndChild('shelah-eber', 'atlas-0134', 'atlas-0058', 'atlas-0058'),
  ...fatherAndChild('eber-peleg', 'atlas-0058', 'atlas-0145', 'atlas-0145'),
  ...fatherAndChild('peleg-reou', 'atlas-0145', 'genese-reou', 'genese-reou'),
  ...fatherAndChild('reou-seroug', 'genese-reou', 'genese-seroug', 'genese-seroug'),
  ...fatherAndChild('seroug-nahor', 'genese-seroug', 'genese-nahor', 'genese-nahor'),
  ...fatherAndChild('nahor-tera', 'genese-nahor', 'atlas-0158', 'atlas-0158'),
  ...fatherAndChild('tera-abraham', 'atlas-0158', 'atlas-0147', 'atlas-0158'),
  ...reciprocalRelationship(
    'abraham-sara',
    'atlas-0147',
    'atlas-0155',
    'wife',
    'husband',
    ['atlas-0155']
  ),
  ...fatherAndChild('abraham-ismael', 'atlas-0147', 'genese-ismael', 'genese-ismael'),
  ...fatherAndChild('abraham-isaac', 'atlas-0147', 'atlas-0081', 'atlas-0081'),
  ...reciprocalRelationship(
    'isaac-rebecca',
    'atlas-0081',
    'wcg-rebecca',
    'wife',
    'husband',
    ['it-isaac-mariage-1878']
  ),
  ...fatherAndChild('isaac-jacob', 'atlas-0081', 'atlas-0106', 'atlas-0106'),
  ...fatherAndChild('isaac-esau', 'atlas-0081', 'genese-esau', 'genese-esau'),
  ...fatherAndChild('jacob-ruben', 'atlas-0106', 'atlas-0061', 'atlas-0061'),
  ...fatherAndChild('jacob-simeon', 'atlas-0106', 'atlas-0121', 'atlas-0121'),
  ...fatherAndChild('jacob-juda', 'atlas-0106', 'atlas-0148', 'atlas-0148'),
  ...fatherAndChild('jacob-levi', 'atlas-0106', 'atlas-0135', 'atlas-0135'),
  ...fatherAndChild('jacob-dan', 'atlas-0106', 'atlas-0156', 'atlas-0156'),
  ...fatherAndChild('jacob-nephtali', 'atlas-0106', 'atlas-0161', 'atlas-0161'),
  ...fatherAndChild('jacob-aser', 'atlas-0106', 'atlas-0164', 'atlas-0164'),
  ...fatherAndChild('jacob-gad', 'atlas-0106', 'atlas-0162', 'atlas-0162'),
  ...fatherAndChild('jacob-issachar', 'atlas-0106', 'atlas-0165', 'atlas-0165'),
  ...fatherAndChild('jacob-zabulon', 'atlas-0106', 'atlas-0166', 'atlas-0166'),
  ...fatherAndChild('jacob-dinah', 'atlas-0106', 'genese-dina', 'genese-dina', 'daughter'),
  ...fatherAndChild('jacob-joseph', 'atlas-0106', 'atlas-0159', 'atlas-0159'),
  ...fatherAndChild('jacob-benjamin', 'atlas-0106', 'atlas-0168', 'atlas-0168')
];

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
  if (layer === 'prophetes' || category.includes('prophet')) return 'prophecy';
  if (category.includes('residence')) return 'residence';
  if (layer === 'voyages') return 'journey';
  if (
    layer === 'juges' ||
    layer === 'sanctuaire' ||
    category.includes('fonction') ||
    category.includes('service')
  ) return 'office';
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
  label: record.title,
  span: temporalSpanFor(record),
  associatedLocationIds: resolveLocationIds(record),
  associatedRouteIds: record.itineraryIds.map(id => `historical-itinerary-${id.toLocaleLowerCase('fr')}`),
  associatedPersonIds: record.linkedPersonIds,
  associatedEventIds: [record.id],
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
    associatedCharacterIds: [
      ...new Set(
        [
          record.personId,
          ...record.linkedPersonIds,
          ...(CURATED_EVENT_PERSON_LINKS.get(record.id) ?? [])
        ].filter((id): id is string => Boolean(id))
      )
    ],
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
const PERIOD_DETAIL_LAYERS = new Set([...ACTIVITY_LAYERS, 'sanctuaire']);

const isCollectivePersonWindow = (
  record: AuthoritativeChronologyRecord
): boolean => normalizeText(record.category ?? '') === 'periode collective';

export const isAuthoritativePersonBaseRecord = (
  record: AuthoritativeChronologyRecord
): boolean =>
  normalizeText(record.layer ?? '') === PERSON_BASE_LAYER &&
  !isCollectivePersonWindow(record) &&
  (record.id === record.personId ||
    normalizeText(record.category ?? '') === 'vie' ||
    (!record.personId &&
      normalizeText(record.recordType ?? '') === 'periode' &&
      Boolean(record.subject)));

const isPersonBaseRecord = isAuthoritativePersonBaseRecord;

const basePersonIdsBySubject = new Map<string, string[]>();
bundle.records.filter(isPersonBaseRecord).forEach(record => {
  const personId = record.personId ?? record.id;
  if (!record.subject) return;
  const key = normalizeText(record.subject);
  basePersonIdsBySubject.set(key, [
    ...(basePersonIdsBySubject.get(key) ?? []),
    personId
  ]);
});

const resolvedPersonIdFor = (record: AuthoritativeChronologyRecord): string | undefined => {
  if (isPersonBaseRecord(record)) return record.personId ?? record.id;
  if (record.personId) return record.personId;
  if (record.id === 'atlas-0087') return record.id;
  if (!record.subject) return undefined;
  const candidates = [...new Set(basePersonIdsBySubject.get(normalizeText(record.subject)) ?? [])];
  return candidates.length === 1 ? candidates[0] : undefined;
};

const isBiographicalPeriod = (record: AuthoritativeChronologyRecord): boolean => {
  const layer = normalizeText(record.layer ?? '');
  return (
    normalizeText(record.recordType ?? '') === 'periode' &&
    !isPersonBaseRecord(record) &&
    layer !== 'livres bibliques' &&
    (PERIOD_DETAIL_LAYERS.has(layer) || Boolean(record.visualParentId))
  );
};
const recordsByPersonId = new Map<string, AuthoritativeChronologyRecord[]>();

bundle.records.forEach(record => {
  const personId = resolvedPersonIdFor(record);
  if (!personId || (!isPersonBaseRecord(record) && !isBiographicalPeriod(record))) return;
  const records = recordsByPersonId.get(personId) ?? [];
  records.push(record);
  recordsByPersonId.set(personId, records);
});

const uniqueSources = (records: AuthoritativeChronologyRecord[]): SourceReference[] => {
  const seen = new Set<string>();
  return records.flatMap(sourceReferencesFor).filter(source => {
    const key = source.url ?? source.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueValues = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

const saulLifeSpan = (): TemporalSpan => ({
  start: { yearMax: -1138, precision: 'before', approximate: true, certainty: 'possible' },
  end: { yearMin: -1078, yearMax: -1078, precision: 'year', approximate: true, certainty: 'probable' },
  displayLabel: 'Né avant vers 1138 av. n. è. → mort vers 1078 av. n. è.'
});

export const AUTHORITATIVE_HISTORICAL_PEOPLE: BiblicalPerson[] =
  [...recordsByPersonId.entries()].map(([personId, records]) => {
    const base = records.find(isPersonBaseRecord);
    const activities = records.filter(isBiographicalPeriod).map(activityFor);
    const anchor = base ?? records[0];
    const jonathan = bundle.records.find(record => record.id === 'wcg-jonathan');
    const sourceRecords = personId === 'atlas-0087' && jonathan ? [...records, jonathan] : records;
    const isSaul = personId === 'atlas-0087';
    const notes = uniqueValues([
      ...records.map(record => record.notes),
      isSaul
        ? 'La naissance n’est pas datée. La borne ouverte repose sur la naissance approximative de son fils Jonathan vers 1138 av. n. è. : elle prouve seulement que Saül est né plus tôt et permet des âges minimaux, jamais un âge exact.'
        : undefined
    ]).join('\n\n');
    return {
      id: personId,
      name: anchor.subject ?? anchor.shortLabel ?? anchor.title,
      alternateNames: [],
      roles: activities.some(activity => activity.type === 'reign')
        ? ['king']
        : activities.some(activity => activity.type === 'prophecy')
          ? ['prophet']
          : ['other'],
      description: base?.notes ?? anchor.notes,
      lifeSpan: base ? temporalSpanFor(base) : isSaul ? saulLifeSpan() : undefined,
      activityPeriods: activities,
      associatedEventIds: uniqueValues(
        bundle.records
          .filter(record => resolvedPersonIdFor(record) === personId && !isPersonBaseRecord(record))
          .map(record => record.id)
      ),
      associatedLocationIds: uniqueValues(
        bundle.records
          .filter(record => resolvedPersonIdFor(record) === personId)
          .flatMap(resolveLocationIds)
      ),
      associatedRouteIds: uniqueValues(records.flatMap(record =>
        record.itineraryIds.map(id => `historical-itinerary-${id.toLocaleLowerCase('fr')}`)
      )),
      associatedPersonIds: uniqueValues([
        ...records
          .flatMap(record => record.linkedPersonIds)
          .filter(relatedPersonId => relatedPersonId !== personId),
        ...AUTHORITATIVE_PERSON_RELATIONSHIPS
          .filter(relationship => relationship.sourcePersonId === personId)
          .map(relationship => relationship.targetPersonId),
        isSaul ? 'wcg-jonathan' : undefined
      ]),
      biblicalReferences: uniqueValues(records.flatMap(record => record.citedReferences)),
      documentaryReferences: uniqueValues(records.flatMap(record => record.citedReferences)),
      sources: uniqueSources(sourceRecords),
      certainty: isSaul ? 'possible' : certaintyFor(base?.confidence ?? anchor.confidence),
      notes: notes || undefined
    } satisfies BiblicalPerson;
  });

const biographyRecordsByPersonId = new Map<string, AuthoritativeChronologyRecord[]>();
bundle.records.forEach(record => {
  const personId = resolvedPersonIdFor(record);
  if (!personId) return;
  biographyRecordsByPersonId.set(personId, [
    ...(biographyRecordsByPersonId.get(personId) ?? []),
    record
  ]);
});

export const getAuthoritativeBiographicalRecords = (
  personId: string
): readonly AuthoritativeChronologyRecord[] => biographyRecordsByPersonId.get(personId) ?? [];

const personEvents: EventData[] = [];
const absorbedActivityRecordIds = new Set<string>();
recordsByPersonId.forEach((records, personId) => {
  const base = records.find(isPersonBaseRecord);
  const activities = records.filter(isBiographicalPeriod);
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
  .filter(record => {
    const notes = normalizeText([record.notes, record.positioningNotes].filter(Boolean).join(' '));
    return !(
      notes.includes('uniquement de repere de tri') ||
      notes.includes('seulement de repere de tri')
    );
  })
  .map(record => recordToEvent(record))
  .filter((event): event is EventData => Boolean(event));

const allAuthoritativeEvents = [...personEvents, ...genericEvents]
  .sort((left, right) => left.startPos - right.startPos || left.id.localeCompare(right.id));
export const AUTHORITATIVE_TIMELINE_EVENTS: EventData[] = genericEvents
  .sort((left, right) => left.startPos - right.startPos || left.id.localeCompare(right.id));

const authoritativeEventsByRecordId = new Map<string, EventData>();
allAuthoritativeEvents.forEach(event => {
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
  const identityLabels = isPersonBaseRecord(record)
    ? [record.title, record.shortLabel, record.subject]
    : [record.title, record.shortLabel];
  identityLabels
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
