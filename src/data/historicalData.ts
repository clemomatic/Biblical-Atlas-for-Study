import type { EventData, SourceReference } from '../types';
import { createLegacyTimelineProjection } from '../adapters/legacyPeopleAdapter';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import {
  REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
  REVIEWED_TIMELINE_EVENTS
} from './reviewedHistoricalEvents';
import { EVENTS } from './timelineEvents';
import { HISTORICAL_PEOPLE } from './historicalStudyData';
import { createHistoricalPersonTimelineProjection } from './historicalPersonTimeline';
import {
  AUTHORITATIVE_TIMELINE_EVENTS,
  getAuthoritativeReplacementForLegacyEvent
} from './authoritativeChronology';
import {
  mergeHistoricalPeopleForDisplay,
  mergePersonTimelineEventsForDisplay
} from '../domain/history/personIdentityProjection';

/**
 * Projection de compatibilité consommée par l’interface actuelle.
 *
 * Les fiches du classeur validé prennent le pas sur les fiches historiques
 * correspondantes, tout en laissant disponibles les anciennes entrées qui
 * ne possèdent pas encore de correspondance démontrée.
 */
const LEGACY_TIMELINE_EVENTS = createLegacyTimelineProjection(
  EVENTS,
  BIBLICAL_PEOPLE
);
export const HISTORICAL_PERSON_TIMELINE =
  createHistoricalPersonTimelineProjection(
    HISTORICAL_PEOPLE,
    LEGACY_TIMELINE_EVENTS
  );

const mergeValues = <T>(left: T[] | undefined, right: T[] | undefined): T[] | undefined => {
  const values = [...(left ?? []), ...(right ?? [])];
  return values.length ? [...new Set(values)] : undefined;
};

const mergeSources = (
  left: SourceReference[] | undefined,
  right: SourceReference[] | undefined
): SourceReference[] | undefined => {
  const values = [...(left ?? []), ...(right ?? [])];
  if (!values.length) return undefined;
  const seen = new Set<string>();
  return values.filter(source => {
    const key = source.id || source.url || source.label;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * La recherche validée remplace les champs documentaires et chronologiques,
 * mais l'identifiant et les relations de compatibilité restent stables. Les
 * liens historiques par ID ou par libellé continuent ainsi de fonctionner.
 */
const mergeAuthoritativeEvent = (
  compatible: EventData,
  authoritative: EventData
): EventData => ({
  ...compatible,
  ...authoritative,
  id: compatible.id,
  text: compatible.text,
  historicalPersonId:
    compatible.historicalPersonId ?? authoritative.historicalPersonId,
  historicalPersonSpanKind:
    compatible.historicalPersonSpanKind ?? authoritative.historicalPersonSpanKind,
  historicalPersonLaneId:
    authoritative.historicalPersonLaneId ?? compatible.historicalPersonLaneId,
  associatedLocationIds: mergeValues(
    compatible.associatedLocationIds,
    authoritative.associatedLocationIds
  ),
  associatedRouteIds: mergeValues(
    compatible.associatedRouteIds,
    authoritative.associatedRouteIds
  ),
  associatedCharacterIds: mergeValues(
    compatible.associatedCharacterIds,
    authoritative.associatedCharacterIds
  ),
  biblicalReferences: mergeValues(
    compatible.biblicalReferences,
    authoritative.biblicalReferences
  ),
  documentaryReferences: mergeValues(
    compatible.documentaryReferences,
    authoritative.documentaryReferences
  ),
  sources: mergeSources(compatible.sources, authoritative.sources),
  notes: [compatible.notes, authoritative.notes]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, values) => values.indexOf(value) === index)
    .join('\n\n')
});

const claimedAuthoritativeIds = new Set<string>();
const applyAuthoritativeResearch = (events: EventData[]): EventData[] =>
  events.map(event => {
    const replacement = getAuthoritativeReplacementForLegacyEvent(event);
    if (!replacement || claimedAuthoritativeIds.has(replacement.id)) return event;
    claimedAuthoritativeIds.add(replacement.id);
    return mergeAuthoritativeEvent(event, replacement);
  });

const personEvents = applyAuthoritativeResearch(HISTORICAL_PERSON_TIMELINE.events);
const legacyEvents = applyAuthoritativeResearch(
  LEGACY_TIMELINE_EVENTS.filter(
    event =>
      !REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS.has(event.id) &&
      !HISTORICAL_PERSON_TIMELINE.supersededLegacyEventIds.has(event.id)
  )
);
const reviewedEvents = applyAuthoritativeResearch(REVIEWED_TIMELINE_EVENTS);
const RAW_TIMELINE_EVENTS = [
  ...legacyEvents,
  ...personEvents,
  ...reviewedEvents,
  ...AUTHORITATIVE_TIMELINE_EVENTS.filter(
    event => !claimedAuthoritativeIds.has(event.id)
  )
];



export const DISPLAY_HISTORICAL_PEOPLE =
  mergeHistoricalPeopleForDisplay(HISTORICAL_PEOPLE);

export const TIMELINE_EVENTS =
  mergePersonTimelineEventsForDisplay(RAW_TIMELINE_EVENTS);
