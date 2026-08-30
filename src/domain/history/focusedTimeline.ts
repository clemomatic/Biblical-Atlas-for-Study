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
  HistoricalPersonRelationship,
  HistoricalPersonRelationshipKind,
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
  openStart?: boolean;
  openEnd?: boolean;
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
  relationshipLabel?: string;
  relationshipDepth?: 1 | 2;
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
  relationships?: readonly HistoricalPersonRelationship[];
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
  options: Pick<
    FocusedTimelineSpan,
    'fuzzyStart' | 'fuzzyEnd' | 'openStart' | 'openEnd'
  > = {}
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
  const startAnchorYear = span.start
    ? span.start.yearMin ?? span.start.yearMax
    : undefined;
  const endAnchorYear = span.end
    ? span.end.yearMax ?? span.end.yearMin
    : undefined;
  const startYear = startAnchorYear ?? endAnchorYear;
  const endYear = endAnchorYear ?? startAnchorYear;
  if (
    interval.unknown ||
    startYear === undefined ||
    endYear === undefined ||
    startYear === 0 ||
    endYear === 0
  ) {
    return null;
  }

  return orderedSpan(
    historicalYearToTimelineIndex(startYear),
    historicalYearToTimelineIndex(endYear),
    {
      fuzzyStart:
        span.start?.approximate === true ||
        span.start?.certainty !== 'certain' ||
        span.start?.precision !== 'year',
      fuzzyEnd:
        span.end?.approximate === true ||
        span.end?.certainty !== 'certain' ||
        span.end?.precision !== 'year',
      openStart:
        !span.start ||
        span.start.precision === 'before' ||
        span.start.yearMin === undefined,
      openEnd:
        !span.end ||
        span.end.precision === 'after' ||
        span.end.yearMax === undefined
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
  if (lifeSpan) {
    if (!lifeSpan.openStart && !lifeSpan.openEnd) return lifeSpan;
    const canonicalId = canonicalizeHistoricalPersonId(person.id);
    const associatedEventIds = new Set(person.associatedEventIds ?? []);
    const evidenceSpans = events
      .filter(
        event =>
          associatedEventIds.has(event.id) ||
          Boolean(
            event.authoritativeRecordId &&
              associatedEventIds.has(event.authoritativeRecordId)
          ) ||
          (event.associatedCharacterIds ?? []).some(
            personId =>
              canonicalizeHistoricalPersonId(personId) === canonicalId
          )
      )
      .map(eventSpan);
    const evidence = envelope(evidenceSpans);
    if (!evidence) return lifeSpan;
    return orderedSpan(
      lifeSpan.openStart
        ? Math.min(lifeSpan.start, evidence.start)
        : lifeSpan.start,
      lifeSpan.openEnd ? Math.max(lifeSpan.end, evidence.end) : lifeSpan.end,
      {
        fuzzyStart: lifeSpan.fuzzyStart,
        fuzzyEnd: lifeSpan.fuzzyEnd,
        openStart: lifeSpan.openStart,
        openEnd: lifeSpan.openEnd
      }
    );
  }

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

const spansMayOverlap = (
  left: FocusedTimelineSpan,
  right: FocusedTimelineSpan
): boolean => {
  const leftStart = left.openStart ? Number.NEGATIVE_INFINITY : left.start;
  const leftEnd = left.openEnd ? Number.POSITIVE_INFINITY : left.end;
  const rightStart = right.openStart ? Number.NEGATIVE_INFINITY : right.start;
  const rightEnd = right.openEnd ? Number.POSITIVE_INFINITY : right.end;
  return leftStart <= rightEnd && rightStart <= leftEnd;
};

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

const overlapDuration = (
  left: FocusedTimelineSpan,
  right: FocusedTimelineSpan
): number => {
  if (!spansMayOverlap(left, right)) return 0;
  const leftStart = left.openStart ? right.start : left.start;
  const leftEnd = left.openEnd ? right.end : left.end;
  const rightStart = right.openStart ? left.start : right.start;
  const rightEnd = right.openEnd ? left.end : right.end;
  return Math.max(
    0,
    Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart)
  );
};

/**
 * Part de la période focalisée réellement partagée par une autre personne.
 * Le dénominateur reste la durée du focus : une courte vie entièrement
 * incluse ne doit plus battre plusieurs siècles de contemporanéité.
 */
const overlapCoverageOfAnchor = (
  span: FocusedTimelineSpan,
  anchor: FocusedTimelineSpan
): number => {
  if (!spansMayOverlap(span, anchor)) return 0;
  const anchorDuration = anchor.end - anchor.start;
  if (anchorDuration <= 0) return 1;
  return Math.min(1, overlapDuration(span, anchor) / anchorDuration);
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

const relationshipLabels: Record<HistoricalPersonRelationshipKind, string> = {
  father: 'père',
  mother: 'mère',
  son: 'fils',
  daughter: 'fille',
  husband: 'mari',
  wife: 'épouse',
  brother: 'frère',
  sister: 'sœur',
  companion: 'compagnon'
};

interface CanonicalRelationshipEdge {
  targetPersonId: string;
  kind: HistoricalPersonRelationshipKind;
}

interface FocusedRelationshipContext {
  label: string;
  depth: 1 | 2;
}

const relationshipGraph = (
  relationships: readonly HistoricalPersonRelationship[]
): Map<string, CanonicalRelationshipEdge[]> => {
  const graph = new Map<string, CanonicalRelationshipEdge[]>();
  relationships.forEach(relationship => {
    const sourcePersonId =
      canonicalizeHistoricalPersonId(relationship.sourcePersonId) ??
      relationship.sourcePersonId;
    const targetPersonId =
      canonicalizeHistoricalPersonId(relationship.targetPersonId) ??
      relationship.targetPersonId;
    graph.set(sourcePersonId, [
      ...(graph.get(sourcePersonId) ?? []),
      { targetPersonId, kind: relationship.kind }
    ]);
  });
  return graph;
};

const composedRelationshipLabel = (
  first: HistoricalPersonRelationshipKind,
  second: HistoricalPersonRelationshipKind
): string | null => {
  const parentKinds = new Set<HistoricalPersonRelationshipKind>([
    'father',
    'mother'
  ]);
  const childKinds = new Set<HistoricalPersonRelationshipKind>([
    'son',
    'daughter'
  ]);

  if (parentKinds.has(first) && parentKinds.has(second)) {
    return second === 'mother' ? 'grand-mère' : 'grand-père';
  }
  if (childKinds.has(first) && childKinds.has(second)) {
    return second === 'daughter' ? 'petite-fille' : 'petit-fils';
  }
  if (parentKinds.has(first) && childKinds.has(second)) {
    return second === 'daughter' ? 'sœur' : 'frère';
  }
  return null;
};

const relationshipContextFor = (
  focusPersonId: string | undefined,
  targetPersonId: string | undefined,
  graph: ReadonlyMap<string, readonly CanonicalRelationshipEdge[]>
): FocusedRelationshipContext | null => {
  if (!focusPersonId || !targetPersonId) return null;
  const direct = graph
    .get(focusPersonId)
    ?.find(edge => edge.targetPersonId === targetPersonId);
  if (direct) {
    return { label: relationshipLabels[direct.kind], depth: 1 };
  }

  for (const first of graph.get(focusPersonId) ?? []) {
    for (const second of graph.get(first.targetPersonId) ?? []) {
      if (
        second.targetPersonId !== targetPersonId ||
        second.targetPersonId === focusPersonId
      ) {
        continue;
      }
      const label = composedRelationshipLabel(first.kind, second.kind);
      if (label) return { label, depth: 2 };
    }
  }
  return null;
};

const eventIsPersonProjection = (event: EventData): boolean =>
  Boolean(event.historicalPersonId) ||
  normalize(event.category) === 'personnage' ||
  normalize(event.category).startsWith('fils ') ||
  normalize(event.category).startsWith('fille ') ||
  normalize(event.category).includes('prophetes') ||
  normalize(event.category).includes('roi de') ||
  normalize(event.category) === 'regnes';

const isMajorEvent = (event: EventData): boolean =>
  normalize(event.category).includes('evenements marquants');

const canonicalMarkerToken = (token: string): string => {
  if (token === 'abrahamique') return 'abraham';
  if (token === 'israelites') return 'israel';
  return token;
};

const markerTitleTokens = (event: EventData): Set<string> => {
  const values = normalize(event.text)
    .replace(/\b(par|comme|roi|reine|evenement|avec|vers|fin|debut)\b/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(canonicalMarkerToken);
  const tokens = new Set(values);
  if (tokens.has('exode') || (tokens.has('sortie') && tokens.has('egypte'))) {
    tokens.add('exode');
    tokens.add('sortie');
    tokens.add('egypte');
  }
  return tokens;
};

const normalizedValues = (values: readonly string[]): Set<string> =>
  new Set(values.map(normalize).filter(Boolean));

const setsOverlap = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  [...left].some(value => right.has(value));

const markerBiblicalReferenceKeys = (event: EventData): Set<string> =>
  normalizedValues(event.biblicalReferences ?? []);

const markerSourceUrlKeys = (event: EventData): Set<string> =>
  normalizedValues(
    (event.sources ?? []).flatMap(source => (source.url ? [source.url] : []))
  );

const markerConcept = (event: EventData): string | null => {
  const title = normalize(event.text);
  const has = (...tokens: string[]) => tokens.every(token => title.includes(token));
  if (title.includes('babel')) return 'babel';
  if (title === 'exode' || has('sortie', 'egypte')) return 'exode';
  if (has('alliance', 'abraham')) return 'alliance-abrahamique';
  if (
    has('saul', 'samuel') &&
    (title.includes('onction') || title.includes('oint'))
  ) {
    return 'onction-saul';
  }
  if (has('division', 'israel', 'royaume')) return 'division-royaumes';
  if (title === 'mort jesus' || title.includes('jesus meurt')) {
    return 'mort-jesus';
  }
  if (
    title === 'resurrection jesus' ||
    title.includes('jesus est ressuscite')
  ) {
    return 'resurrection-jesus';
  }
  if (has('bapteme', 'jesus')) return 'bapteme-jesus';
  return null;
};

const markerSourceScore = (event: EventData): number =>
  (event.authoritativeRecordId ? 100 : 0) +
  (event.biblicalReferences?.length ?? 0) * 2 +
  (event.sources?.length ?? 0);

export const focusedTimelineEventsDescribeSameEvent = (
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
  const participantsMissingFromOneSource =
    (leftParticipants.length === 0) !== (rightParticipants.length === 0);
  if (
    !participantsMatch &&
    !participantsAreBothUnknown &&
    !participantsMissingFromOneSource
  ) {
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
  const leftBiblicalReferences = markerBiblicalReferenceKeys(left);
  const rightBiblicalReferences = markerBiblicalReferenceKeys(right);
  const biblicalReferencesConflict =
    leftBiblicalReferences.size > 0 &&
    rightBiblicalReferences.size > 0 &&
    !setsOverlap(leftBiblicalReferences, rightBiblicalReferences);
  const sourcesOverlap = setsOverlap(
    markerSourceUrlKeys(left),
    markerSourceUrlKeys(right)
  );
  const conceptsMatch = Boolean(
    markerConcept(left) && markerConcept(left) === markerConcept(right)
  );
  if (conceptsMatch || normalize(left.text) === normalize(right.text)) {
    return true;
  }
  if (biblicalReferencesConflict) return false;
  if (participantsMissingFromOneSource) {
    return (
      sourcesOverlap &&
      sharedCount >= 2 &&
      similarity >= 0.5
    );
  }
  return participantsAreBothUnknown
    ? sharedCount >= 2 &&
        similarity >= 0.5 &&
        (sourcesOverlap || nearIdenticalPeriods)
    : sourcesOverlap && sharedCount >= 2 && similarity >= 0.5;
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
      (left, right) =>
        Number(right.directlyRelated) - Number(left.directlyRelated) ||
        markerSourceScore(right.event) - markerSourceScore(left.event)
    );
  const candidates = rankedCandidates.filter(
    (candidate, index) =>
      !rankedCandidates
        .slice(0, index)
        .some(previous =>
          focusedTimelineEventsDescribeSameEvent(
            previous.event,
            candidate.event
          )
        )
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
  events: readonly EventData[],
  relationships: readonly HistoricalPersonRelationship[]
): FocusedTimelinePersonLane[] => {
  const focusId = canonicalizeHistoricalPersonId(focusPerson?.id);
  const relationshipsByPerson = relationshipGraph(relationships);
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
      if (!span) return [];
      const relationship = relationshipContextFor(
        focusId,
        canonicalId,
        relationshipsByPerson
      );
      const explicitlyLinked = Boolean(
        canonicalId && explicitlyRelated.has(canonicalId)
      );
      const eventParticipant = Boolean(
        canonicalId && participantIds.has(canonicalId)
      );
      const documentedOpenOverlap = Boolean(
        (relationship || explicitlyLinked || eventParticipant) &&
          spansMayOverlap(span, anchorSpan)
      );
      if (!overlaps(span, anchorSpan) && !documentedOpenOverlap) return [];
      const activityBonus = person.activityPeriods.some(
        activity => activity.type === 'reign'
      )
        ? 18
        : person.activityPeriods.some(activity => activity.type === 'prophecy')
          ? 15
          : 0;
      const sharedDuration = overlapDuration(span, anchorSpan);
      const boundedLifeBonus = span.openStart || span.openEnd ? 0 : 8;
      const score =
        (relationship?.depth === 1
          ? 500
          : relationship?.depth === 2
            ? 350
            : 0) +
        (eventParticipant ? 260 : 0) +
        (explicitlyLinked ? 180 : 0) +
        overlapCoverageOfAnchor(span, anchorSpan) * 100 +
        boundedLifeBonus +
        activityBonus;
      return [
        {
          person,
          span,
          activities: activitySpans(person),
          isFocus: false,
          relationshipLabel: relationship?.label,
          relationshipDepth: relationship?.depth,
          score,
          sharedDuration
        }
      ];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.sharedDuration - left.sharedDuration ||
        left.span.start - right.span.start ||
        left.person.name.localeCompare(right.person.name, 'fr')
    )
    .slice(0, MAX_CONTEXT_PEOPLE)
    .map(({ score: _score, sharedDuration: _sharedDuration, ...lane }) => lane);
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
    input.events,
    input.relationships ?? []
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
  if (!spansMayOverlap(span, domain)) return null;
  return {
    start: span.openStart ? domain.start : Math.max(span.start, domain.start),
    end: span.openEnd ? domain.end : Math.min(span.end, domain.end),
    fuzzyStart: span.fuzzyStart || span.start < domain.start,
    fuzzyEnd: span.fuzzyEnd || span.end > domain.end,
    openStart: span.openStart,
    openEnd: span.openEnd
  };
};

export const focusedTimelineSpanContainsPosition = (
  span: FocusedTimelineSpan,
  position: number
): boolean =>
  (span.openStart || span.start <= position) &&
  (span.openEnd || span.end >= position);

export const focusedTimelinePositionPercent = (
  position: number,
  domain: FocusedTimelineSpan
): number => {
  const duration = Math.max(0.0001, domain.end - domain.start);
  return Math.max(0, Math.min(100, ((position - domain.start) / duration) * 100));
};
