import { createLegacyTimelineProjection } from '../adapters/legacyPeopleAdapter';
import { BIBLICAL_PEOPLE } from './biblicalPeople';
import { EVENTS } from './timelineEvents';

/**
 * Projection de compatibilité consommée par l’interface actuelle.
 *
 * Elle garde le même nombre de lignes, les mêmes IDs et les mêmes dates que
 * EVENTS, tout en faisant passer les personnages pilotes par BiblicalPerson.
 */
export const TIMELINE_EVENTS = createLegacyTimelineProjection(
  EVENTS,
  BIBLICAL_PEOPLE
);
