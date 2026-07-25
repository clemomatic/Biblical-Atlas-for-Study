import reviewedEventsJson from '../../content/reviewed/events/a7-b-events.json';
import sourceCatalogJson from '../../content/sources/source-catalog.json';
import type {
  ReviewedEventRecord,
  SourceCatalogEntry
} from '../domain/history/contentTypes';
import type {
  TemporalBoundary,
  TemporalSpan
} from '../domain/history/types';
import type { EventData } from '../types';
import { parseTimelineDate } from '../utils/dateUtils';
import { normalizeCategoryName } from '../utils/dataVocabulary';
import { createCategoryId } from '../utils/stableIds';

const REVIEWED_EVENT_RECORDS =
  reviewedEventsJson as unknown as ReviewedEventRecord[];
const SOURCE_CATALOG =
  sourceCatalogJson as unknown as SourceCatalogEntry[];

const TECHNICAL_SEASON_ANCHORS: Record<
  string,
  Array<{ month: number; day: number }>
> = {
  '29-autumn': [
    { month: 9, day: 15 },
    { month: 10, day: 1 },
    { month: 10, day: 15 },
    { month: 11, day: 1 }
  ],
  '30-spring': [
    { month: 3, day: 1 },
    { month: 3, day: 20 },
    { month: 4, day: 8 },
    { month: 4, day: 27 },
    { month: 5, day: 16 }
  ]
};

const getBoundaryYear = (
  boundary: TemporalBoundary | undefined
): number | undefined => boundary?.yearMin ?? boundary?.yearMax;

/**
 * Produit uniquement une ancre de rendu pour séparer les lignes partageant la
 * même cellule de date dans A7-B. Cette valeur n’est jamais une nouvelle
 * datation historique : le TemporalSpan et son libellé restent la référence.
 */
const createTechnicalTimelineRaw = (
  period: TemporalSpan,
  sourceOrder: number
): string => {
  const boundary = period.start ?? period.end;
  const year = getBoundaryYear(boundary) ?? 1;
  const season = boundary?.season;
  const groupKey = season ? `${year}-${season}` : '';
  const anchors = TECHNICAL_SEASON_ANCHORS[groupKey];
  const groupIndex = sourceOrder <= 4 ? sourceOrder - 1 : sourceOrder - 5;
  const anchor = anchors?.[groupIndex] ?? { month: 1, day: 1 };
  return [
    String(year),
    String(anchor.month).padStart(2, '0'),
    String(anchor.day).padStart(2, '0')
  ].join('-') + ' 12:00:00';
};

export const REVIEWED_TIMELINE_EVENTS: EventData[] =
  REVIEWED_EVENT_RECORDS.map(record => {
    const event = record.event;
    if (!event.period || event.sourceOrder === undefined) {
      throw new Error(
        `L’événement relu ${event.id} doit fournir une période et un ordre de source.`
      );
    }
    const startRaw = createTechnicalTimelineRaw(
      event.period,
      event.sourceOrder
    );
    const parsed = parseTimelineDate(startRaw);
    const category = normalizeCategoryName(
      event.category ?? 'Événements Marquants'
    );
    const sources = record.sourceIds.map(sourceId => {
      const source = SOURCE_CATALOG.find(candidate => candidate.id === sourceId);
      if (!source) {
        throw new Error(`Source historique introuvable : ${sourceId}.`);
      }
      return {
        id: `${event.id}-${source.id}`,
        label: source.chapterOrAppendix ?? source.title,
        url: source.url,
        citation:
          `${source.publication} — ${source.pageOrSection ?? source.title}`
      };
    });

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
      fuzzyStart: true,
      fuzzyEnd: true,
      description: event.description,
      timelineLevel: 'study',
      associatedLocationIds: event.placeMentions
        ?.flatMap(mention => mention.placeId ? [mention.placeId] : []),
      associatedCharacterIds: event.participantMentions
        ?.flatMap(mention => mention.personId ? [mention.personId] : []),
      biblicalReferences: event.biblicalReferences,
      documentaryReferences: ['Appendice A7-B'],
      sources,
      certainty: event.certainty,
      notes: [
        `Datation de la source : ${event.period.displayLabel}.`,
        'La position dans la saison sert uniquement à séparer visuellement les lignes qui partagent la même cellule de date.'
      ].join(' ')
    };
  });
