import type { EventData } from '../../types.ts';
import { formatEventSpan } from '../../utils/dateUtils.ts';
import { canonicalizeHistoricalPersonId } from './personIdentityProjection.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex,
  timelineIndexToHistoricalYear
} from './temporal.ts';
import type {
  BiblicalPerson,
  PersonActivityPeriod,
  TemporalSpan
} from './types.ts';

export type FocusedTimelineKind = 'person' | 'event' | 'book';
export type FocusedTimelineScale = 'full' | '25-years' | '10-years';

export interface FocusedTimelineSpan {
  start: number;
  end: number;
  fuzzyStart?: boolean;
  fuzzyEnd?: boolean;
}

export interface FocusedTimelineActivitySpan extends FocusedTimelineSpan {
  id: string;
  label: string;
  type: PersonActivityPeriod['type'];
}

export interface FocusedTimelinePersonLane {
  person: BiblicalPerson;
  span: FocusedTimelineSpan;
  activities: FocusedTimelineActivitySpan[];
  isFocus: boolean;
}

export interface FocusedTimelineMarker {
  event: EventData;
  position: number;
  directlyRelated: boolean;
}

export interface FocusedTimelineModel {
  kind: FocusedTimelineKind;
  id: string;
  title: string;
  periodLabel: string;
  anchorSpan: FocusedTimelineSpan;
  fullDomain: FocusedTimelineSpan;
  focusPerson: BiblicalPerson | null;
  focusEvent: EventData | null;
  people: FocusedTimelinePersonLane[];
  markers: FocusedTimelineMarker[];
  writingEvents: EventData[];
}

export interface FocusedTimelineInput {
  person?: BiblicalPerson | null;
  event?: EventData | null;
  people: readonly BiblicalPerson[];
  events: readonly EventData[];
}

const BOOK_PERIOD_CATEGORY = 'période des livres bibliques';
const BOOK_WRITING_CATEGORY = 'rédaction d’un livre biblique';
const MAX_CONTEXT_PEOPLE = 5;
const MAX_MARKERS = 9;

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[’']/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(livre|lettre|epitre|de|du|des|la|le|aux|a)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const isBookCoverageEvent = (event: EventData): boolean => {
  const category = normalize(event.category);
  return (
    category === normalize(BOOK_PERIOD_CATEGORY) ||
    (category.includes('periode') &&
      category.includes('biblique') &&
      !category.includes('redaction'))
  );
};

export const isBookWritingEvent = (event: EventData): boolean => {
  const category = normalize(event.category);
  return (
    category === normalize(BOOK_WRITING_CATEGORY) ||
    (category.includes('redaction') && category.includes('biblique'))
  );
};

const bookIdentity = (value: string): string =>
  normalize(value)
    .replace(
      /\b(periode|couverte|couvre|recit|racontee|fin|redaction|ecriture|composition|compilation|achevement|achevee|biblique|par|un)\b/g,
      ' '
    )
    .trim()
    .replace(/\s+/g, ' ');

const orderedSpan = (
  start: number,
  end: number,
  options: Pick<FocusedTimelineSpan, 'fuzzyStart' | 'fuzzyEnd'> = {}
): FocusedTimelineSpan => ({
  start: Math.min(start, end),
  end: Math.max(start, end),
  ...options
});

const temporalSpanToTimelineSpan = (
  span: TemporalSpan | undefined
): FocusedTimelineSpan | null => {
  if (!span) return null;
  const interval = getTemporalInterval(span);
  if (
    interval.unknown ||
    interval.yearMin === undefined ||
    interval.yearMax === undefined ||
    interval.yearMin === 0 ||
    interval.yearMax === 0
  ) {
    return null;
  }

  return orderedSpan(
    historicalYearToTimelineIndex(interval.yearMin),
    historicalYearToTimelineIndex(interval.yearMax),
    {
      fuzzyStart:
        span.start?.approximate === true ||
        span.start?.certainty !== 'certain' ||
        span.start?.precision !== 'year',
      fuzzyEnd:
        span.end?.approximate === true ||
        span.end?.certainty !== 'certain' ||
        span.end?.precision !== 'year'
    }
  );
};

const eventSpan = (event: EventData): FocusedTimelineSpan =>
  orderedSpan(event.startPos, event.endPos, {
    fuzzyStart: event.fuzzyStart,
    fuzzyEnd: event.fuzzyEnd
  });

export const eventDataToTemporalSpan = (
  event: EventData
): TemporalSpan | null => {
  if (event.temporalSpan) return event.temporalSpan;
  if (event.startYear === 0 || event.endYear === 0) return null;
  const certainty =
    event.certainty ??
    (event.fuzzyStart || event.fuzzyEnd ? 'probable' : 'certain');
  return {
    start: {
      yearMin: event.startYear,
      yearMax: event.startYear,
      precision: 'year',
      approximate: event.fuzzyStart,
      certainty
    },
    end: event.isPoint
      ? undefined
      : {
          yearMin: event.endYear,
          yearMax: event.endYear,
          precision: 'year',
          approximate: event.fuzzyEnd,
          certainty
        },
    displayLabel: formatEventSpan(
      event.startYear,
      event.endYear,
      event.isPoint,
      event.fuzzyStart,
      event.fuzzyEnd
    )
  };
};

const activitySpans = (
  person: BiblicalPerson
): FocusedTimelineActivitySpan[] =>
  person.activityPeriods.flatMap(activity => {
    const span = temporalSpanToTimelineSpan(activity.span);
    return span
      ? [
          {
            ...span,
            id: activity.id,
            label: activity.label,
            type: activity.type
          }
        ]
      : [];
  });

const envelope = (
  spans: readonly FocusedTimelineSpan[]
): FocusedTimelineSpan | null => {
  if (!spans.length) return null;
  return orderedSpan(
    Math.min(...spans.map(span => span.start)),
    Math.max(...spans.map(span => span.end)),
    {
      fuzzyStart: spans.some(span => span.fuzzyStart),
      fuzzyEnd: spans.some(span => span.fuzzyEnd)
    }
  );
};

const personSpan = (
  person: BiblicalPerson,
  events: readonly EventData[]
): FocusedTimelineSpan | null => {
  const lifeSpan = temporalSpanToTimelineSpan(person.lifeSpan);
  if (lifeSpan) return lifeSpan;

  const activities = activitySpans(person);
  const activityEnvelope = envelope(activities);
  if (activityEnvelope) return activityEnvelope;

  const canonicalId = canonicalizeHistoricalPersonId(person.id);
  const projection = events.find(
    event =>
      canonicalizeHistoricalPersonId(event.historicalPersonId) === canonicalId ||
      event.id === person.legacyEventId
  );
  return projection ? eventSpan(projection) : null;
};

const overlaps = (
  left: FocusedTimelineSpan,
  right: FocusedTimelineSpan
): boolean => left.start <= right.end && right.start <= left.end;

const overlapRatio = (
  left: FocusedTimelineSpan,
  right: FocusedTimelineSpan
): number => {
  if (!overlaps(left, right)) return 0;
  const intersection = Math.max(
    0,
    Math.min(left.end, right.end) - Math.max(left.start, right.start)
  );
  const denominator = Math.max(1, Math.min(left.end - left.start, right.end - right.start));
  return Math.min(1, intersection / denominator);
};

const domainForAnchor = (
  kind: FocusedTimelineKind,
  span: FocusedTimelineSpan
): FocusedTimelineSpan => {
  const duration = Math.max(0, span.end - span.start);
  let padding: number;
  if (kind === 'event' && duration < 1) {
    padding = 25;
  } else if (kind === 'person') {
    padding = Math.min(12, Math.max(2, duration * 0.06));
  } else if (kind === 'book') {
    padding = Math.min(10, Math.max(2, duration * 0.04));
  } else {
    padding = Math.min(25, Math.max(5, duration * 0.18));
  }
  return orderedSpan(span.start - padding, span.end + padding);
};

const canonicalPersonIds = (values: readonly string[] | undefined): Set<string> =>
  new Set(
    (values ?? []).map(value => canonicalizeHistoricalPersonId(value) ?? value)
  );

const eventParticipantIds = (event: EventData): Set<string> =>
  canonicalPersonIds(event.associatedCharacterIds);

const eventIsPersonProjection = (event: EventData): boolean =>
  Boolean(event.historicalPersonId) ||
  normalize(event.category) === 'personnage' ||
  normalize(event.category).includes('prophetes') ||
  normalize(event.category).includes('roi de') ||
  normalize(event.category) === 'regnes';

const isMajorEvent = (event: EventData): boolean =>
  normalize(event.category).includes('evenements marquants');

const markerTitleTokens = (event: EventData): Set<string> =>
  new Set(
    normalize(event.text)
      .replace(/\b(par|comme|roi|reine|evenement)\b/g, ' ')
      .split(' ')
      .filter(Boolean)
  );

const markerSourceScore = (event: EventData): number =>
  (event.authoritativeRecordId ? 100 : 0) +
  (event.biblicalReferences?.length ?? 0) * 2 +
  (event.sources?.length ?? 0);

const markersDescribeSameEvent = (
  left: EventData,
  right: EventData
): boolean => {
  const leftSpan = eventSpan(left);
  const rightSpan = eventSpan(right);
  const leftDuration = leftSpan.end - leftSpan.start;
  const rightDuration = rightSpan.end - rightSpan.start;
  const samePublishedYears =
    left.startYear === right.startYear && left.endYear === right.endYear;
  const positionsWithinOneYear =
    Math.abs(leftSpan.start - rightSpan.start) <= 1 &&
    Math.abs(leftSpan.end - rightSpan.end) <= 1;
  const nearIdenticalPeriods =
    leftDuration > 0 &&
    rightDuration > 0 &&
    overlapRatio(leftSpan, rightSpan) >= 0.9;
  if (
    (leftSpan.start !== rightSpan.start || leftSpan.end !== rightSpan.end) &&
    !(samePublishedYears && positionsWithinOneYear) &&
    !nearIdenticalPeriods
  ) {
    return false;
  }

  const leftParticipants = [...eventParticipantIds(left)].sort();
  const rightParticipants = [...eventParticipantIds(right)].sort();
  const participantsMatch =
    leftParticipants.length > 0 &&
    leftParticipants.join('|') === rightParticipants.join('|');
  const participantsAreBothUnknown =
    leftParticipants.length === 0 && rightParticipants.length === 0;
  if (!participantsMatch && !participantsAreBothUnknown) {
    return false;
  }
  if (
    participantsAreBothUnknown &&
    normalize(left.category) !== normalize(right.category)
  ) {
    return false;
  }

  const leftTokens = markerTitleTokens(left);
  const rightTokens = markerTitleTokens(right);
  const sharedCount = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const similarity =
    sharedCount / Math.max(1, Math.min(leftTokens.size, rightTokens.size));
  return participantsAreBothUnknown
    ? sharedCount >= 2 && similarity >= 0.5
    : similarity >= 0.5;
};

const selectEvenly = <T,>(items: readonly T[], count: number): T[] => {
  if (count <= 0) return [];
  if (items.length <= count) return [...items];
  if (count === 1) return [items[Math.floor(items.length / 2)]];
  const selected = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    selected.add(Math.round((index * (items.length - 1)) / (count - 1)));
  }
  return [...selected].map(index => items[index]);
};

const markerCandidates = (
  kind: FocusedTimelineKind,
  anchorSpan: FocusedTimelineSpan,
  domain: FocusedTimelineSpan,
  focusPerson: BiblicalPerson | null,
  focusEvent: EventData | null,
  events: readonly EventData[]
): FocusedTimelineMarker[] => {
  const focusPersonId = canonicalizeHistoricalPersonId(focusPerson?.id);
  const personEventIds = new Set(focusPerson?.associatedEventIds ?? []);
  const focusParticipants = focusEvent
    ? eventParticipantIds(focusEvent)
    : new Set<string>();

  const domainDuration = Math.max(1, domain.end - domain.start);
  const markerDomain = kind === 'person' ? anchorSpan : domain;
  const rankedCandidates = events
    .filter(event => {
      if (eventIsPersonProjection(event)) return false;
      if (isBookCoverageEvent(event) || isBookWritingEvent(event)) return false;
      const span = eventSpan(event);
      if (!overlaps(span, markerDomain)) return false;
      return (
        event.id === focusEvent?.id ||
        span.end - span.start <= domainDuration * 1.5
      );
    })
    .map(event => {
      const participants = eventParticipantIds(event);
      const directlyRelated = Boolean(
        event.id === focusEvent?.id ||
          (focusPersonId && participants.has(focusPersonId)) ||
          personEventIds.has(event.id) ||
          [...focusParticipants].some(personId => participants.has(personId))
      );
      const span = eventSpan(event);
      const midpoint = (span.start + span.end) / 2;
      const anchorMidpoint = (anchorSpan.start + anchorSpan.end) / 2;
      const position =
        span.start <= anchorMidpoint && span.end >= anchorMidpoint
          ? anchorMidpoint
          : Math.max(domain.start, Math.min(domain.end, midpoint));
      return {
        event,
        position,
        directlyRelated,
        distance: Math.abs(position - anchorMidpoint)
      };
    })
    .sort(
      (left, right) => markerSourceScore(right.event) - markerSourceScore(left.event)
    );
  const candidates = rankedCandidates.filter(
    (candidate, index) =>
      !rankedCandidates
        .slice(0, index)
        .some(previous => markersDescribeSameEvent(previous.event, candidate.event))
  );

  if (kind === 'event') {
    return candidates
      .sort((left, right) => {
        if (left.event.id === focusEvent?.id) return -1;
        if (right.event.id === focusEvent?.id) return 1;
        if (left.directlyRelated !== right.directlyRelated) {
          return left.directlyRelated ? -1 : 1;
        }
        return left.distance - right.distance;
      })
      .slice(0, MAX_MARKERS)
      .sort((left, right) => left.position - right.position)
      .map(({ distance: _distance, ...marker }) => marker);
  }

  const chronological = [...candidates].sort(
    (left, right) => left.position - right.position
  );
  const direct = chronological.filter(candidate => candidate.directlyRelated);
  const contextual = chronological.filter(candidate => !candidate.directlyRelated);
  const selectedDirect = selectEvenly(direct, Math.min(6, MAX_MARKERS));
  const remaining = MAX_MARKERS - selectedDirect.length;
  const majorContext = contextual.filter(candidate => isMajorEvent(candidate.event));
  const contextPool = majorContext.length >= remaining ? majorContext : contextual;
  const selectedContext = selectEvenly(contextPool, remaining);

  return [...selectedDirect, ...selectedContext]
    .sort((left, right) => left.position - right.position)
    .map(({ distance: _distance, ...marker }) => marker);
};

const matchingWritingEvents = (
  bookEvent: EventData | null,
  events: readonly EventData[]
): EventData[] => {
  if (!bookEvent) return [];
  const bookName = bookIdentity(bookEvent.text);
  if (!bookName) return [];
  const bookTokens = new Set(bookName.split(' ').filter(Boolean));

  return events
    .filter(isBookWritingEvent)
    .map(event => {
      const writingName = bookIdentity(event.text);
      const writingTokens = new Set(writingName.split(' ').filter(Boolean));
      const shared = [...bookTokens].filter(token => writingTokens.has(token));
      return {
        event,
        score:
          writingName.includes(bookName) || bookName.includes(writingName)
            ? 100
            : shared.length / Math.max(1, bookTokens.size)
      };
    })
    .filter(item => item.score >= 0.75)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(item => item.event);
};

const contextPeople = (
  anchorSpan: FocusedTimelineSpan,
  focusPerson: BiblicalPerson | null,
  focusEvent: EventData | null,
  markers: readonly FocusedTimelineMarker[],
  people: readonly BiblicalPerson[],
  events: readonly EventData[]
): FocusedTimelinePersonLane[] => {
  const focusId = canonicalizeHistoricalPersonId(focusPerson?.id);
  const explicitlyRelated = canonicalPersonIds(
    focusPerson?.associatedPersonIds
  );
  const participantIds = new Set<string>();
  if (focusEvent) {
    eventParticipantIds(focusEvent).forEach(id => participantIds.add(id));
  }
  markers
    .filter(marker => marker.directlyRelated)
    .forEach(marker =>
      eventParticipantIds(marker.event).forEach(id => participantIds.add(id))
    );

  return people
    .flatMap(person => {
      const canonicalId = canonicalizeHistoricalPersonId(person.id);
      if (canonicalId === focusId) return [];
      const span = personSpan(person, events);
      if (!span || !overlaps(span, anchorSpan)) return [];
      const directlyRelated = Boolean(
        (canonicalId && explicitlyRelated.has(canonicalId)) ||
          (canonicalId && participantIds.has(canonicalId))
      );
      const activityBonus = person.activityPeriods.some(
        activity => activity.type === 'reign'
      )
        ? 18
        : person.activityPeriods.some(activity => activity.type === 'prophecy')
          ? 15
          : 0;
      const score =
        (directlyRelated ? 200 : 0) +
        overlapRatio(span, anchorSpan) * 50 +
        activityBonus;
      return [
        {
          person,
          span,
          activities: activitySpans(person),
          isFocus: false,
          score
        }
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.span.start - right.span.start ||
        left.person.name.localeCompare(right.person.name, 'fr')
    )
    .slice(0, MAX_CONTEXT_PEOPLE)
    .map(({ score: _score, ...lane }) => lane);
};

const focusPersonLane = (
  person: BiblicalPerson,
  events: readonly EventData[]
): FocusedTimelinePersonLane | null => {
  const span = personSpan(person, events);
  return span
    ? {
        person,
        span,
        activities: activitySpans(person),
        isFocus: true
      }
    : null;
};

export const buildFocusedTimeline = (
  input: FocusedTimelineInput
): FocusedTimelineModel | null => {
  const focusPerson = input.person ?? null;
  const focusEvent = input.event ?? null;
  if (!focusPerson && !focusEvent) return null;

  const kind: FocusedTimelineKind = focusPerson
    ? 'person'
    : focusEvent && isBookCoverageEvent(focusEvent)
      ? 'book'
      : 'event';
  const anchorSpan = focusPerson
    ? personSpan(focusPerson, input.events)
    : focusEvent
      ? eventSpan(focusEvent)
      : null;
  if (!anchorSpan) return null;

  const fullDomain = domainForAnchor(kind, anchorSpan);
  const markers = markerCandidates(
    kind,
    anchorSpan,
    fullDomain,
    focusPerson,
    focusEvent,
    input.events
  );
  const contextualPeople = contextPeople(
    anchorSpan,
    focusPerson,
    focusEvent,
    markers,
    input.people,
    input.events
  );
  const primaryLane = focusPerson
    ? focusPersonLane(focusPerson, input.events)
    : null;
  const periodLabel = focusPerson
    ? focusPerson.lifeSpan?.displayLabel ??
      formatEventSpan(
        timelineIndexToHistoricalYear(Math.round(anchorSpan.start)),
        timelineIndexToHistoricalYear(Math.round(anchorSpan.end)),
        anchorSpan.start === anchorSpan.end,
        anchorSpan.fuzzyStart,
        anchorSpan.fuzzyEnd
      )
    : focusEvent
      ? formatEventSpan(
          focusEvent.startYear,
          focusEvent.endYear,
          focusEvent.isPoint,
          focusEvent.fuzzyStart,
          focusEvent.fuzzyEnd
        )
      : '';

  return {
    kind,
    id: focusPerson?.id ?? focusEvent!.id,
    title: focusPerson?.name ?? focusEvent!.text,
    periodLabel,
    anchorSpan,
    fullDomain,
    focusPerson,
    focusEvent,
    people: primaryLane
      ? [primaryLane, ...contextualPeople]
      : contextualPeople,
    markers,
    writingEvents:
      kind === 'book' ? matchingWritingEvents(focusEvent, input.events) : []
  };
};

export const getFocusedTimelineDomain = (
  model: FocusedTimelineModel,
  scale: FocusedTimelineScale,
  center?: number
): FocusedTimelineSpan => {
  if (scale === 'full') return model.fullDomain;
  const duration = scale === '25-years' ? 25 : 10;
  const fullDuration = model.fullDomain.end - model.fullDomain.start;
  if (fullDuration <= duration) return model.fullDomain;
  const desiredCenter =
    center ?? (model.anchorSpan.start + model.anchorSpan.end) / 2;
  const half = duration / 2;
  let start = desiredCenter - half;
  let end = desiredCenter + half;
  if (start < model.fullDomain.start) {
    start = model.fullDomain.start;
    end = start + duration;
  }
  if (end > model.fullDomain.end) {
    end = model.fullDomain.end;
    start = end - duration;
  }
  return orderedSpan(start, end);
};

export const clipFocusedTimelineSpan = (
  span: FocusedTimelineSpan,
  domain: FocusedTimelineSpan
): FocusedTimelineSpan | null => {
  if (!overlaps(span, domain)) return null;
  return {
    start: Math.max(span.start, domain.start),
    end: Math.min(span.end, domain.end),
    fuzzyStart: span.fuzzyStart || span.start < domain.start,
    fuzzyEnd: span.fuzzyEnd || span.end > domain.end
  };
};

export const focusedTimelinePositionPercent = (
  position: number,
  domain: FocusedTimelineSpan
): number => {
  const duration = Math.max(0.0001, domain.end - domain.start);
  return Math.max(0, Math.min(100, ((position - domain.start) / duration) * 100));
};
