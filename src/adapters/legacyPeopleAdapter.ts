import type {
  BiblicalPerson,
  TemporalSpan
} from '../domain/history/types.ts';
import {
  getTemporalInterval,
  legacyYearsToTemporalSpan
} from '../domain/history/temporal.ts';
import type {
  EncyclopediaReference,
  EventData,
  MediaAsset,
  SourceReference
} from '../types.ts';

const cloneStrings = (values: string[] | undefined): string[] | undefined =>
  values ? [...values] : undefined;

const cloneSources = (
  sources: SourceReference[] | undefined
): SourceReference[] | undefined =>
  sources?.map(source => ({ ...source }));

const cloneEncyclopediaReferences = (
  references: EncyclopediaReference[] | undefined
): EncyclopediaReference[] | undefined =>
  references?.map(reference => ({ ...reference }));

const cloneMedia = (media: MediaAsset[] | undefined): MediaAsset[] | undefined =>
  media?.map(asset => ({
    ...asset,
    focalPoint: asset.focalPoint ? { ...asset.focalPoint } : undefined
  }));

const unique = (values: Array<string | undefined>): string[] =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

export function legacyEventPeriodToTemporalSpan(
  event: Pick<
    EventData,
    'startYear' | 'endYear' | 'fuzzyStart' | 'fuzzyEnd' | 'certainty'
  >
): TemporalSpan {
  return legacyYearsToTemporalSpan({
    startYear: event.startYear,
    endYear: event.endYear,
    fuzzyStart: event.fuzzyStart,
    fuzzyEnd: event.fuzzyEnd,
    certainty: event.certainty
  });
}

/**
 * Crée une personne canonique pilote sans modifier l’EventData fourni.
 *
 * L’identifiant est volontairement conservé. Les tableaux et objets de
 * métadonnées sont copiés afin que les deux représentations ne partagent pas
 * d’état mutable pendant la transition.
 */
export function legacyPersonEventToBiblicalPerson(
  event: EventData
): BiblicalPerson {
  if (event.category !== 'Personnage') {
    throw new TypeError(
      `L’événement ${event.id} n’appartient pas à la catégorie Personnage.`
    );
  }

  return {
    id: event.id,
    legacyEventId: event.id,
    name: event.text,
    alternateNames: [],
    description: event.description,
    lifeSpan: legacyEventPeriodToTemporalSpan(event),
    activityPeriods: [],
    associatedEventIds: [],
    associatedLocationIds: cloneStrings(event.associatedLocationIds),
    associatedRouteIds: cloneStrings(event.associatedRouteIds),
    associatedPersonIds: cloneStrings(event.associatedCharacterIds),
    biblicalReferences: cloneStrings(event.biblicalReferences),
    documentaryReferences: cloneStrings(event.documentaryReferences),
    sources: cloneSources(event.sources),
    encyclopediaReferences: cloneEncyclopediaReferences(
      event.encyclopediaReferences
    ),
    certainty: event.certainty ?? 'unknown',
    notes: event.notes,
    lastVerified: event.lastVerified,
    media: cloneMedia(event.media)
  };
}

const assertLifeSpanMatchesLegacyEvent = (
  person: BiblicalPerson,
  event: EventData
): void => {
  if (!person.lifeSpan) {
    throw new TypeError(
      `La personne migrée ${person.id} doit conserver une période de vie.`
    );
  }
  const interval = getTemporalInterval(person.lifeSpan, {
    includeUncertainty: false
  });
  if (
    interval.unknown ||
    interval.yearMin !== event.startYear ||
    interval.yearMax !== event.endYear
  ) {
    throw new RangeError(
      `La période de ${person.id} diffère de l’EventData historique.`
    );
  }
};

const projectPersonOntoLegacyEvent = (
  person: BiblicalPerson,
  event: EventData
): EventData => {
  assertLifeSpanMatchesLegacyEvent(person, event);

  return {
    ...event,
    id: person.id,
    text: person.name,
    description: person.description ?? event.description,
    associatedLocationIds: unique([
      ...(event.associatedLocationIds ?? []),
      ...(person.associatedLocationIds ?? [])
    ]),
    associatedRouteIds: unique([
      ...(event.associatedRouteIds ?? []),
      ...(person.associatedRouteIds ?? [])
    ]),
    associatedCharacterIds: unique([
      ...(event.associatedCharacterIds ?? []),
      ...(person.associatedPersonIds ?? [])
    ]),
    biblicalReferences:
      cloneStrings(person.biblicalReferences) ??
      cloneStrings(event.biblicalReferences),
    documentaryReferences:
      cloneStrings(person.documentaryReferences) ??
      cloneStrings(event.documentaryReferences),
    sources: cloneSources(person.sources) ?? cloneSources(event.sources),
    encyclopediaReferences:
      cloneEncyclopediaReferences(person.encyclopediaReferences) ??
      cloneEncyclopediaReferences(event.encyclopediaReferences),
    certainty:
      event.certainty ??
      (person.certainty === 'unknown' ? undefined : person.certainty),
    notes: person.notes ?? event.notes,
    lastVerified: person.lastVerified ?? event.lastVerified,
    media: cloneMedia(person.media) ?? cloneMedia(event.media)
  };
};

/**
 * Produit exactement une ligne de frise par EventData historique.
 *
 * Les personnes migrées remplacent leur propre projection par identifiant ;
 * elles ne sont jamais ajoutées à la fin du tableau. Ce choix évite les
 * doublons dans la frise, la recherche et le panneau de détail.
 */
export function createLegacyTimelineProjection(
  legacyEvents: readonly EventData[],
  people: readonly BiblicalPerson[]
): EventData[] {
  const peopleById = new Map<string, BiblicalPerson>();
  people.forEach(person => {
    if (peopleById.has(person.id)) {
      throw new TypeError(`Identifiant de personne dupliqué : ${person.id}.`);
    }
    if (person.legacyEventId && person.legacyEventId !== person.id) {
      throw new TypeError(
        `La migration pilote doit conserver l’identifiant ${person.legacyEventId}.`
      );
    }
    peopleById.set(person.id, person);
  });

  const legacyIds = new Set(legacyEvents.map(event => event.id));
  people.forEach(person => {
    if (!legacyIds.has(person.id)) {
      throw new TypeError(
        `Aucun EventData historique ne correspond à ${person.id}.`
      );
    }
  });

  return legacyEvents.map(event => {
    const person = peopleById.get(event.id);
    return person ? projectPersonOntoLegacyEvent(person, event) : event;
  });
}
