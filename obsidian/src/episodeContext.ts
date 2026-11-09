import { calculateAgeAtPeriod, eventDataToTemporalSpan, type AgeEstimate } from '../../src/domain/history/eventChronology.ts';
import type { BiblicalPerson, TemporalSpan } from '../../src/domain/history/types.ts';
import type { ReviewedEventRecord, SourceCatalogEntry } from '../../src/domain/history/contentTypes.ts';
import type { PresenceIndexEntry } from '../../src/domain/history/historicalIndex.ts';
import type { BiblicalPlace, EventData, SourceReference } from '../../src/types.ts';

/**
 * One contextual answer assembled from the reviewed corpus and legacy Atlas.
 * A shared period is NOT evidence that two people met or shared a location.
 */
export interface EpisodeLocation {
  placeId: string;
  name: string;
  certainty: PresenceIndexEntry['certainty'];
  supportingClaimIds: string[];
}
export interface EpisodeParticipant {
  personId?: string;
  name: string;
  age: AgeEstimate;
  locations: EpisodeLocation[];
  /** A participant mention is not automatically a documented physical presence. */
  mentionedInEvent: boolean;
}
export interface EpisodePlace {
  placeId?: string;
  name: string;
  /** Event-wide mention; never attributed to an individual without a presence. */
  certainty?: string;
}
export interface EpisodeContext {
  eventId: string;
  title: string;
  description: string;
  period?: TemporalSpan;
  periodLabel: string;
  participants: EpisodeParticipant[];
  places: EpisodePlace[];
  references: string[];
  sources: SourceReference[];
  supportingClaimIds: string[];
  warnings: string[];
}
export interface EpisodeContextInput {
  eventId: string;
  reviewedEvents: readonly ReviewedEventRecord[];
  legacyEvents: readonly EventData[];
  people: readonly BiblicalPerson[];
  places: readonly BiblicalPlace[];
  presences: readonly PresenceIndexEntry[];
  sources: readonly SourceCatalogEntry[];
}

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];
const unknownAge = (explanation: string): AgeEstimate => ({
  precision: 'unknown', label: 'Âge impossible à déterminer', explanation
});

/**
 * Return null when the event has no corresponding record. Never fabricate an
 * episode, identity, chronology or geographic position from a free-text label.
 */
export function buildEpisodeContext(input: EpisodeContextInput): EpisodeContext | null {
  const { eventId, reviewedEvents, legacyEvents, people, places, presences, sources } = input;
  const reviewed = reviewedEvents.find(record => record.event.id === eventId);
  const legacy = legacyEvents.find(record => record.id === eventId);
  if (!reviewed && !legacy) return null;

  const peopleById = new Map(people.map(person => [person.id, person]));
  const placesById = new Map(places.map(place => [place.id, place.name]));
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const eventPresences = presences.filter(presence => presence.eventIds.includes(eventId));
  const mentioned = reviewed?.event.participantMentions ?? [];

  const participantIds = unique([
    ...(legacy?.associatedCharacterIds ?? []),
    ...mentioned.flatMap(mention => mention.personId ? [mention.personId] : []),
    ...eventPresences.map(presence => presence.personId)
  ]);
  const period = reviewed
    ? reviewed.event.period
    : legacy?.temporalSpan ?? (legacy ? eventDataToTemporalSpan(legacy) : undefined);

  const participants: EpisodeParticipant[] = participantIds.map(personId => {
    const person = peopleById.get(personId);
    const mention = mentioned.find(item => item.personId === personId);
    const individualPresences = eventPresences.filter(item => item.personId === personId);
    const locationMap = new Map<string, EpisodeLocation>();
    individualPresences.forEach(presence => {
      const name = placesById.get(presence.placeId);
      if (!name) return;
      const previous = locationMap.get(presence.placeId);
      locationMap.set(presence.placeId, {
        placeId: presence.placeId, name, certainty: presence.certainty,
        supportingClaimIds: unique([
          ...(previous?.supportingClaimIds ?? []),
          ...presence.supportingClaimIds
        ])
      });
    });
    return {
      personId,
      name: person?.name ?? mention?.label ?? personId,
      mentionedInEvent: Boolean(mention) || (legacy?.associatedCharacterIds ?? []).includes(personId),
      age: period && person
        ? calculateAgeAtPeriod(person.lifeSpan, period)
        : unknownAge(period ? 'Identité ou naissance insuffisamment documentée.' : 'Période de cet épisode non établie.'),
      locations: [...locationMap.values()]
    };
  });
  // Preserve unresolved names as explicit mentions, without linking homonyms.
  for (const mention of mentioned) {
    if (!mention.personId && !participants.some(item => item.name === mention.label)) {
      participants.push({
        name: mention.label,
        mentionedInEvent: true,
        age: unknownAge('Personnage non identifié dans le corpus.'),
        locations: []
      });
    }
  }

  const eventPlaces = new Map<string, EpisodePlace>();
  (reviewed?.event.placeMentions ?? []).forEach(mention => {
    const key = mention.placeId ?? 'unresolved:' + mention.label;
    eventPlaces.set(key, {
      placeId: mention.placeId,
      name: mention.placeId ? placesById.get(mention.placeId) ?? mention.label : mention.label,
      certainty: mention.certainty
    });
  });
  (legacy?.associatedLocationIds ?? []).forEach(placeId => {
    if (!eventPlaces.has(placeId)) {
      const name = placesById.get(placeId);
      if (name) eventPlaces.set(placeId, { placeId, name });
    }
  });
  eventPresences.forEach(presence => {
    const name = placesById.get(presence.placeId);
    if (name && !eventPlaces.has(presence.placeId)) {
      eventPlaces.set(presence.placeId, { placeId: presence.placeId, name });
    }
  });

  const linkedSources: SourceReference[] = [
    ...(legacy?.sources ?? []),
    ...(reviewed?.sourceIds ?? []).flatMap(id => {
      const source = sourceById.get(id);
      return source ? [{ id, label: source.title, url: source.url }] : [];
    })
  ];
  const uniqueSources = [...new Map(linkedSources.map(source => [source.id, source])).values()];
  const references = unique([
    ...(reviewed?.event.biblicalReferences ?? []),
    ...(legacy?.biblicalReferences ?? [])
  ]);
  const warnings: string[] = [];
  if (!period) warnings.push('Période non documentée : aucun âge ne peut être calculé.');
  if (!eventPresences.length) warnings.push('Aucune présence individuelle reliée explicitement à cet épisode.');
  if (!uniqueSources.length && !references.length) warnings.push('Aucune source documentaire associée à cet épisode.');

  return {
    eventId,
    title: reviewed?.event.name ?? legacy?.text ?? eventId,
    description: reviewed?.event.description ?? legacy?.description ?? '',
    period,
    periodLabel: period?.displayLabel || 'Période non précisée',
    participants,
    places: [...eventPlaces.values()],
    references,
    sources: uniqueSources,
    supportingClaimIds: unique([
      ...(reviewed?.event.supportingClaimIds ?? []),
      ...eventPresences.flatMap(item => item.supportingClaimIds)
    ]),
    warnings
  };
}
