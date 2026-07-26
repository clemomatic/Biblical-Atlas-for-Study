import { conservativeLifespanSpan } from '../domain/history/contentGeneration.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from '../domain/history/temporal.ts';
import type {
  BiblicalPerson,
  PersonActivityPeriod,
  TemporalBoundary,
  TemporalSpan
} from '../domain/history/types.ts';
import type { EventData } from '../types.ts';
import { createCategoryId } from '../utils/stableIds.ts';

const boundaryIsFuzzy = (boundary: TemporalBoundary | undefined): boolean =>
  !boundary ||
  boundary.approximate === true ||
  boundary.certainty !== 'certain' ||
  boundary.precision !== 'year';

const rawYear = (year: number): string =>
  `${year}-01-01 12:00:00`;

const categoryForActivity = (
  person: BiblicalPerson,
  activity: PersonActivityPeriod
): string => {
  if (activity.type === 'reign') {
    if (activity.realmId === 'territory-kingdom-judah') return 'Roi de Juda';
    if (activity.realmId === 'territory-kingdom-israel') {
      return 'Roi d’Israël';
    }
    return 'Règnes';
  }
  if (activity.type === 'prophecy' || activity.phase === 'prophetic-ministry') {
    return 'Prophètes (ou période de ministère)';
  }
  return 'Personnage';
};

const projectSpan = (
  person: BiblicalPerson,
  id: string,
  text: string,
  span: TemporalSpan,
  category: string,
  kind: EventData['historicalPersonSpanKind'],
  description?: string
): EventData | undefined => {
  const interval = getTemporalInterval(span);
  const startYear = interval.yearMin;
  const endYear = interval.yearMax;
  if (interval.unknown || startYear === undefined || endYear === undefined) {
    return undefined;
  }
  const startPos = historicalYearToTimelineIndex(startYear);
  const endPos = historicalYearToTimelineIndex(endYear);
  const sourceLabel =
    kind === 'lifespan' ? 'Durée de vie sourcée' : 'Période d’activité sourcée';

  return {
    id,
    text,
    categoryId: createCategoryId(category),
    category,
    startRaw: rawYear(startYear),
    endRaw: rawYear(endYear),
    startYear,
    endYear,
    startPos,
    endPos,
    isPoint: startYear === endYear,
    fuzzyStart: boundaryIsFuzzy(span.start),
    fuzzyEnd: boundaryIsFuzzy(span.end),
    description,
    timelineLevel: 'study',
    associatedLocationIds: person.associatedLocationIds ?? [],
    associatedRouteIds: person.associatedRouteIds ?? [],
    associatedCharacterIds: [person.id],
    biblicalReferences: person.biblicalReferences,
    documentaryReferences: person.documentaryReferences,
    sources: person.sources,
    encyclopediaReferences: person.encyclopediaReferences,
    certainty: person.certainty,
    notes: `${sourceLabel} : ${span.displayLabel}. ${person.notes ?? ''}`.trim(),
    lastVerified: person.lastVerified,
    media: person.media,
    historicalPersonId: person.id,
    historicalPersonSpanKind: kind,
    temporalSpan: span,
    historicalActivityPeriods:
      kind === 'lifespan' ? person.activityPeriods : undefined
  };
};

export const createHistoricalPersonTimelineProjection = (
  people: readonly BiblicalPerson[]
): {
  events: EventData[];
  supersededLegacyEventIds: Set<string>;
} => {
  const events: EventData[] = [];
  const supersededLegacyEventIds = new Set<string>();

  people.forEach(person => {
    let projected = false;
    if (person.lifeSpan) {
      const conservativeSpan = conservativeLifespanSpan(person.lifeSpan);
      const lifeEvent = projectSpan(
        person,
        person.id,
        person.name,
        conservativeSpan,
        'Personnage',
        'lifespan',
        person.description
      );
      if (lifeEvent) {
        events.push(lifeEvent);
        projected = true;
      }
    }

    person.activityPeriods.forEach(activity => {
      const activityEvent = projectSpan(
        person,
        activity.id,
        `${person.name} — ${activity.label}`,
        activity.span,
        categoryForActivity(person, activity),
        'activity',
        person.description
      );
      if (activityEvent) {
        activityEvent.certainty = activity.certainty ?? person.certainty;
        activityEvent.associatedLocationIds = [
          ...new Set([
            ...(activity.associatedLocationIds ?? []),
            ...(person.associatedLocationIds ?? [])
          ])
        ];
        events.push(activityEvent);
        projected = true;
      }
    });

    if (projected && person.legacyEventId) {
      supersededLegacyEventIds.add(person.legacyEventId);
    }
  });

  return {
    events: events.sort(
      (left, right) =>
        left.startPos - right.startPos || left.id.localeCompare(right.id)
    ),
    supersededLegacyEventIds
  };
};
