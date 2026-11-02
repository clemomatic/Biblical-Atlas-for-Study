import { HISTORICAL_SNAPSHOT_CATALOG } from '../../src/data/historicalStudyData';
import { buildHistoricalSnapshot, type HistoricalSnapshot, type HistoricalSnapshotPerson } from '../../src/domain/history/historicalSnapshot';
import { canonicalizeHistoricalPersonId } from '../../src/domain/history/personIdentityProjection';
import { getTemporalInterval, getTemporalOverlap, legacyYearsToTemporalSpan } from '../../src/domain/history/temporal';
import type { TemporalSpan } from '../../src/domain/history/types';
import type { AtlasWorkspace } from './catalog';

/** A local change must not keep assertions or calculations made for the old dates. */
export function workspaceSnapshot(atlas: AtlasWorkspace, period: TemporalSpan): HistoricalSnapshot {
  const base = buildHistoricalSnapshot(HISTORICAL_SNAPSHOT_CATALOG, period);
  const people = new Map(atlas.dataset.people.map(person => [person.id, person]));
  const places = new Map(atlas.dataset.places.map(place => [place.id, place]));
  const events = new Map(atlas.dataset.events.map(event => [event.id, event]));
  const unchangedPerson = (id: string) => { const person = people.get(canonicalizeHistoricalPersonId(id)); return person && !person.personalization; };
  const unchangedEvent = (id: string) => { const event = events.get(id); return event && !event.personalization; };
  const unchangedPlace = (id: string) => { const place = places.get(id); return place && !place.personalization; };
  const overlap = (span?: TemporalSpan) => span && !getTemporalInterval(span).unknown && ['definite','possible'].includes(getTemporalOverlap(span, period));
  const peopleLiving = base.peopleLiving.filter(row => unchangedPerson(row.personId));
  const peopleActive = base.peopleActive.filter(row => unchangedPerson(row.personId));
  for (const person of people.values()) {
    if (!person.personalization) continue;
    const row: HistoricalSnapshotPerson = { personId: person.id, name: person.name, certainty: person.certainty ?? 'unknown', knowledgeLevel: 'calculated', supportingClaimIds: [], periodLabel: 'Selon ta fiche personnalisée' };
    if (overlap(person.lifeSpan)) peopleLiving.push(row);
    for (const activity of person.activityPeriods) if (overlap(activity.span)) peopleActive.push({ ...row, activityType: activity.type, activityLabel: activity.label });
  }
  const currentEvents = base.events.filter(row => unchangedEvent(row.eventId));
  for (const event of events.values()) if (event.personalization && !event.historicalPersonId && overlap(event.temporalSpan ?? legacyYearsToTemporalSpan(event))) {
    currentEvents.push({ eventId: event.id, name: event.text, certainty: event.certainty ?? 'unknown', knowledgeLevel: 'calculated', periodLabel: 'Selon ta fiche personnalisée', placeIds: event.associatedLocationIds ?? [], participantIds: event.associatedCharacterIds ?? [], supportingClaimIds: [] });
  }
  const presences = base.presences.filter(row => unchangedPlace(row.placeId)).map(row => ({ ...row, people: row.people.filter(person => unchangedPerson(person.personId) && person.eventIds.every(unchangedEvent)) })).filter(row => row.people.length);
  const connections = base.connections.filter(row => row.subjectIds.every(unchangedPerson) && row.eventIds.every(unchangedEvent) && row.placeIds.every(unchangedPlace));
  const unknownLocations = base.unknownLocations.filter(row => unchangedPerson(row.personId) && (!row.eventId || unchangedEvent(row.eventId)));
  return { ...base, peopleLiving, peopleActive, events: currentEvents, presences, connections, unknownLocations,
    uncertainResultCount: [...peopleLiving, ...peopleActive, ...currentEvents, ...connections].filter(row => row.certainty !== 'certain').length };
}
