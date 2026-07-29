import { conservativeLifespanSpan } from '../domain/history/contentGeneration.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from '../domain/history/temporal.ts';
import {
  getBiographyLaneId,
  mergeLegacyActivitiesIntoBiographies
} from '../domain/history/timelineBiography.ts';
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

const categoryForActivities = (
  person: BiblicalPerson,
  activities: readonly PersonActivityPeriod[]
): string => {
  const representative =
    activities.find(activity => activity.type === 'reign') ??
    activities.find(activity => activity.type === 'prophecy') ??
    activities[0];
  return representative
    ? categoryForActivity(person, representative)
    : 'Personnage';
};

const activityEnvelopeSpan = (
  activities: readonly PersonActivityPeriod[]
): TemporalSpan | undefined => {
  const projectable = activities
    .map(activity => ({
      activity,
      interval: getTemporalInterval(activity.span)
    }))
    .filter(
      (
        item
      ): item is typeof item & {
        interval: { yearMin: number; yearMax: number; unknown: false };
      } =>
        !item.interval.unknown &&
        item.interval.yearMin !== undefined &&
        item.interval.yearMax !== undefined
    );

  if (projectable.length === 0) return undefined;

  const earliest = projectable.reduce((left, right) =>
    left.interval.yearMin <= right.interval.yearMin ? left : right
  );
  const latest = projectable.reduce((left, right) =>
    left.interval.yearMax >= right.interval.yearMax ? left : right
  );

  return {
    start: earliest.activity.span.start,
    end: latest.activity.span.end,
    displayLabel:
      projectable.length === 1
        ? projectable[0].activity.span.displayLabel
        : `${projectable.length} périodes d’activité documentées`
  };
};

const projectSpan = (
  person: BiblicalPerson,
  id: string,
  text: string,
  span: TemporalSpan,
  category: string,
  kind: EventData['historicalPersonSpanKind'],
  description?: string,
  displayActivities: PersonActivityPeriod[] = person.activityPeriods
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
      displayActivities.length > 0 ? displayActivities : undefined,
    historicalPersonLaneId: getBiographyLaneId(
      person,
      displayActivities.length > 0 ? displayActivities : person.activityPeriods
    )
  };
};

export const createHistoricalPersonTimelineProjection = (
  people: readonly BiblicalPerson[],
  legacyEvents: readonly EventData[] = []
): {
  events: EventData[];
  supersededLegacyEventIds: Set<string>;
} => {
  const events: EventData[] = [];
  const supersededLegacyEventIds = new Set<string>();
  const legacyMerge = mergeLegacyActivitiesIntoBiographies(
    people,
    legacyEvents
  );

  people.forEach(person => {
    let projected = false;
    const displayActivities =
      legacyMerge.activitiesByPersonId.get(person.id) ??
      person.activityPeriods;
    if (person.lifeSpan) {
      const conservativeSpan = conservativeLifespanSpan(person.lifeSpan);
      const lifeEvent = projectSpan(
        person,
        person.id,
        person.name,
        conservativeSpan,
        'Personnage',
        'lifespan',
        person.description,
        displayActivities
      );
      if (lifeEvent) {
        events.push(lifeEvent);
        projected = true;
      }
      person.activityPeriods.forEach(activity => {
        if (person.id === 'event-david-iixp36') {
          return;
        }
        const activityEvent = projectSpan(
          person,
          activity.id,
          `${person.name} — ${activity.label}`,
          activity.span,
          categoryForActivity(person, activity),
          'activity',
          person.description,
          [activity]
        );
        if (activityEvent) {
          activityEvent.certainty = activity.certainty ?? person.certainty;
          activityEvent.associatedLocationIds = [
            ...new Set([
              ...(activity.associatedLocationIds ?? []),
              ...(person.associatedLocationIds ?? [])
            ])
          ];
          activityEvent.historicalPersonLaneId = getBiographyLaneId(person, [
            activity
          ]);
          events.push(activityEvent);
          projected = true;
        }
      });
    } else {
      const envelope = activityEnvelopeSpan(displayActivities);
      if (envelope) {
        const activityEvent = projectSpan(
          person,
          `biography-${person.id}`,
          person.name,
          envelope,
          categoryForActivities(person, displayActivities),
          'activity',
          person.description,
          displayActivities
        );
        if (activityEvent) {
          activityEvent.associatedLocationIds = [
            ...new Set([
              ...displayActivities.flatMap(
                activity => activity.associatedLocationIds ?? []
              ),
              ...(person.associatedLocationIds ?? [])
            ])
          ];
          activityEvent.historicalPersonLaneId = getBiographyLaneId(
            person,
            displayActivities
          );
          events.push(activityEvent);
          projected = true;
        }
      }
    }

    if (projected && person.legacyEventId) {
      supersededLegacyEventIds.add(person.legacyEventId);
    }
  });

  legacyMerge.supersededLegacyEventIds.forEach(eventId => {
    supersededLegacyEventIds.add(eventId);
  });

  return {
    events: events.sort(
      (left, right) =>
        left.startPos - right.startPos || left.id.localeCompare(right.id)
    ),
    supersededLegacyEventIds
  };
};
