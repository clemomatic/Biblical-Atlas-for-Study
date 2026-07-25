import { createLegacyTimelineProjection } from '../adapters/legacyPeopleAdapter';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import {
  REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS,
  REVIEWED_TIMELINE_EVENTS
} from './reviewedHistoricalEvents';
import { EVENTS } from './timelineEvents';

/**
 * Projection de compatibilité consommée par l’interface actuelle.
 *
 * Elle garde le même nombre de lignes, les mêmes IDs et les mêmes dates que
 * EVENTS, tout en faisant passer les personnages pilotes par BiblicalPerson.
 */
const LEGACY_TIMELINE_EVENTS = createLegacyTimelineProjection(
  EVENTS,
  BIBLICAL_PEOPLE
);

export const TIMELINE_EVENTS = [
  ...LEGACY_TIMELINE_EVENTS.filter(
    event => !REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS.has(event.id)
  ),
  ...REVIEWED_TIMELINE_EVENTS
];
