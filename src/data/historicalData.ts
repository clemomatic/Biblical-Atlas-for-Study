import { createLegacyTimelineProjection } from '../adapters/legacyPeopleAdapter';
import type { EventData } from '../types';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import { ATLAS_CHRONOLOGY_EVENTS } from './atlasChronology';
import {
  REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
  REVIEWED_TIMELINE_EVENTS
} from './reviewedHistoricalEvents';
import { EVENTS } from './timelineEvents';
import { HISTORICAL_PEOPLE } from './historicalStudyData';
import { createHistoricalPersonTimelineProjection } from './historicalPersonTimeline';

const LEGACY_TIMELINE_EVENTS = createLegacyTimelineProjection(
  EVENTS,
  BIBLICAL_PEOPLE
);

export const HISTORICAL_PERSON_TIMELINE =
  createHistoricalPersonTimelineProjection(
    HISTORICAL_PEOPLE,
    LEGACY_TIMELINE_EVENTS
  );

const PREVIOUS_TIMELINE_EVENTS: EventData[] = [
  ...LEGACY_TIMELINE_EVENTS.filter(
    event =>
      !REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS.has(event.id) &&
      !HISTORICAL_PERSON_TIMELINE.supersededLegacyEventIds.has(event.id)
  ),
  ...HISTORICAL_PERSON_TIMELINE.events,
  ...REVIEWED_TIMELINE_EVENTS
];

const previousById = new Map(
  PREVIOUS_TIMELINE_EVENTS.map(event => [event.id, event] as const)
);

const mergeUnique = (
  ...values: Array<readonly string[] | undefined>
): string[] | undefined => {
  const result = [...new Set(values.flatMap(value => value ?? []))];
  return result.length ? result : undefined;
};

const mergeReferenceEvent = (reference: EventData): EventData => {
  const previous = previousById.get(reference.id);
  if (!previous) return reference;

  const preservedHistoricalFields: Partial<EventData> = {};
  if (previous.historicalPersonId) {
    preservedHistoricalFields.historicalPersonId = previous.historicalPersonId;
  }
  if (previous.historicalPersonSpanKind) {
    preservedHistoricalFields.historicalPersonSpanKind =
      previous.historicalPersonSpanKind;
  }
  if (previous.temporalSpan) {
    preservedHistoricalFields.temporalSpan = previous.temporalSpan;
  }
  if (previous.historicalActivityPeriods) {
    preservedHistoricalFields.historicalActivityPeriods =
      previous.historicalActivityPeriods;
  }
  if (previous.historicalPersonLaneId) {
    preservedHistoricalFields.historicalPersonLaneId =
      previous.historicalPersonLaneId;
  }

  return {
    ...previous,
    ...reference,
    ...preservedHistoricalFields,
    description: reference.description ?? previous.description,
    notes: reference.notes ?? previous.notes,
    media: reference.media ?? previous.media,
    encyclopediaReferences:
      reference.encyclopediaReferences ?? previous.encyclopediaReferences,
    geographicProvenance:
      reference.geographicProvenance ?? previous.geographicProvenance,
    associatedLocationIds: mergeUnique(
      reference.associatedLocationIds,
      previous.associatedLocationIds
    ),
    associatedRouteIds: mergeUnique(
      reference.associatedRouteIds,
      previous.associatedRouteIds
    ),
    associatedCharacterIds: mergeUnique(
      reference.associatedCharacterIds,
      previous.associatedCharacterIds
    )
  };
};

/**
 * La feuille « Chronologie globale » est désormais l’unique référentiel des
 * éléments affichés. Les anciennes projections ne servent plus qu’à conserver
 * les relations et métadonnées déjà vérifiées lorsque les identifiants
 * correspondent.
 */
export const TIMELINE_EVENTS: EventData[] =
  ATLAS_CHRONOLOGY_EVENTS.map(mergeReferenceEvent);
