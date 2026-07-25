import sourceCatalogJson from '../../content/sources/source-catalog.json';
import type {
  ReviewedEventRecord,
  ReviewedRouteRecord,
  SourceCatalogEntry
} from '../domain/history/contentTypes';
import { getTemporalInterval } from '../domain/history/temporal';
import type { TemporalSpan } from '../domain/history/types';
import type { EventData } from '../types';
import { parseTimelineDate } from '../utils/dateUtils';
import { normalizeCategoryName } from '../utils/dataVocabulary';
import { createCategoryId } from '../utils/stableIds';

const flattenJsonModules = <T>(
  modules: Record<string, unknown>
): T[] =>
  Object.entries(modules)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([, value]) => (Array.isArray(value) ? (value as T[]) : []));

const REVIEWED_EVENT_RECORDS = flattenJsonModules<ReviewedEventRecord>(
  import.meta.glob('../../content/reviewed/events/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const REVIEWED_ROUTE_RECORDS = flattenJsonModules<ReviewedRouteRecord>(
  import.meta.glob('../../content/reviewed/routes/**/*.json', {
    eager: true,
    import: 'default'
  })
);
const SOURCE_CATALOG =
  sourceCatalogJson as unknown as SourceCatalogEntry[];

const getAppendixRank = (sourceIds: string[]): number => {
  const match = sourceIds.join(' ').match(/a7-([a-h])/);
  return match ? match[1].charCodeAt(0) - 97 : 99;
};

const getTechnicalYear = (period: TemporalSpan): number => {
  const interval = getTemporalInterval(period);
  if (interval.unknown) {
    throw new Error(`Période sans année exploitable : ${period.displayLabel}.`);
  }
  const min = interval.yearMin ?? interval.yearMax;
  const max = interval.yearMax ?? interval.yearMin;
  if (min === undefined || max === undefined) {
    throw new Error(`Période sans borne exploitable : ${period.displayLabel}.`);
  }
  const midpoint = Math.round((min + max) / 2);
  return midpoint === 0 ? (max > 0 ? 1 : -1) : midpoint;
};

interface TimelineAnchor {
  year: number;
  month: number;
  day: number;
}

/**
 * Répartit les événements partageant une même année sur l'espace disponible.
 * Ces ancres servent uniquement au rendu : la date éditoriale reste le
 * TemporalSpan sourcé, notamment pour les jours du calendrier hébreu.
 */
const createTimelineAnchors = (
  records: ReviewedEventRecord[]
): Map<string, TimelineAnchor> => {
  const recordsByYear = new Map<number, ReviewedEventRecord[]>();
  records.forEach(record => {
    if (!record.event.period) return;
    const year = getTechnicalYear(record.event.period);
    recordsByYear.set(year, [
      ...(recordsByYear.get(year) ?? []),
      record
    ]);
  });

  const anchors = new Map<string, TimelineAnchor>();
  recordsByYear.forEach((yearRecords, year) => {
    const ordered = [...yearRecords].sort(
      (left, right) =>
        getAppendixRank(left.sourceIds) - getAppendixRank(right.sourceIds) ||
        (left.event.sourceOrder ?? 0) - (right.event.sourceOrder ?? 0) ||
        left.event.id.localeCompare(right.event.id)
    );
    ordered.forEach((record, index) => {
      const dayOfYear = Math.max(
        1,
        Math.min(
          359,
          Math.round(((index + 1) * 360) / (ordered.length + 1))
        )
      );
      anchors.set(record.event.id, {
        year,
        month: Math.min(12, Math.floor(dayOfYear / 30) + 1),
        day: (dayOfYear % 30) + 1
      });
    });
  });
  return anchors;
};

const TIMELINE_ANCHORS = createTimelineAnchors(REVIEWED_EVENT_RECORDS);
const ROUTE_IDS_BY_EVENT = new Map<string, string[]>();
REVIEWED_ROUTE_RECORDS.forEach(record => {
  record.route.associatedEventIds.forEach(eventId => {
    ROUTE_IDS_BY_EVENT.set(eventId, [
      ...(ROUTE_IDS_BY_EVENT.get(eventId) ?? []),
      record.route.id
    ]);
  });
});

const createTechnicalTimelineRaw = (eventId: string): string => {
  const anchor = TIMELINE_ANCHORS.get(eventId);
  if (!anchor) {
    throw new Error(`Ancre technique introuvable pour ${eventId}.`);
  }
  return [
    String(anchor.year),
    String(anchor.month).padStart(2, '0'),
    String(anchor.day).padStart(2, '0')
  ].join('-') + ' 12:00:00';
};

export const REVIEWED_SUPERSEDED_LEGACY_EVENT_IDS = new Set(
  REVIEWED_EVENT_RECORDS.flatMap(
    record => record.event.supersedesLegacyEventIds ?? []
  )
);

export const REVIEWED_TIMELINE_EVENTS: EventData[] =
  REVIEWED_EVENT_RECORDS.map(record => {
    const event = record.event;
    if (!event.period || event.sourceOrder === undefined) {
      throw new Error(
        `L’événement relu ${event.id} doit fournir une période et un ordre de source.`
      );
    }
    const startRaw = createTechnicalTimelineRaw(event.id);
    const parsed = parseTimelineDate(startRaw);
    const category = normalizeCategoryName(
      event.category ?? 'Événements Marquants'
    );
    const sourceEntries = record.sourceIds.map(sourceId => {
      const source = SOURCE_CATALOG.find(candidate => candidate.id === sourceId);
      if (!source) {
        throw new Error(`Source historique introuvable : ${sourceId}.`);
      }
      return source;
    });
    const sources = sourceEntries.map(source => ({
      id: `${event.id}-${source.id}`,
      label: source.chapterOrAppendix ?? source.title,
      url: source.url,
      citation:
        `${source.publication} — ${source.pageOrSection ?? source.title}`
    }));
    const isApproximate =
      event.period.start?.approximate === true ||
      event.period.end?.approximate === true ||
      event.certainty !== 'certain';

    return {
      id: event.id,
      text: event.name,
      categoryId: createCategoryId(category),
      category,
      startRaw,
      endRaw: startRaw,
      startYear: parsed.year,
      endYear: parsed.year,
      startPos: parsed.position,
      endPos: parsed.position,
      isPoint: true,
      fuzzyStart: isApproximate,
      fuzzyEnd: isApproximate,
      description: event.description,
      timelineLevel: 'detail',
      associatedLocationIds: event.placeMentions
        ?.flatMap(mention => mention.placeId ? [mention.placeId] : []),
      associatedCharacterIds: event.participantMentions
        ?.flatMap(mention => mention.personId ? [mention.personId] : []),
      associatedRouteIds: ROUTE_IDS_BY_EVENT.get(event.id),
      biblicalReferences: event.biblicalReferences,
      documentaryReferences: sourceEntries.map(
        source => source.chapterOrAppendix ?? source.title
      ),
      sources,
      certainty: event.certainty,
      notes: [
        `Datation de la source : ${event.period.displayLabel}.`,
        'La position à l’intérieur de l’année est une ancre de rendu et non une conversion ou une datation supplémentaire.',
        event.notes
      ].filter(Boolean).join(' ')
    };
  });
