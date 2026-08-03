import type { EventData } from '../../types';

export type TimelineSemanticKind = 'period' | 'point';

export interface TimelineSemanticLaneDefinition {
  id: string;
  kind: TimelineSemanticKind;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  softColor: string;
  order: number;
}

export const TIMELINE_SEMANTIC_LANES: readonly TimelineSemanticLaneDefinition[] = [
  {
    id: 'period-context',
    kind: 'period',
    label: 'Contextes historiques',
    shortLabel: 'Contextes',
    description: 'Cadres politiques, sociaux ou historiques de longue durée.',
    color: '#687258',
    softColor: '#e9ede2',
    order: 10
  },
  {
    id: 'period-reigns',
    kind: 'period',
    label: 'Règnes et pouvoirs',
    shortLabel: 'Pouvoirs',
    description: 'Règnes et périodes politiques qui ne sont pas des lignes de vie.',
    color: '#8d4f56',
    softColor: '#f2e5e5',
    order: 20
  },
  {
    id: 'period-covenants',
    kind: 'period',
    label: 'Alliances et fils conducteurs',
    shortLabel: 'Alliances',
    description: 'Alliances et thèmes qui se développent sur une durée.',
    color: '#a86f3d',
    softColor: '#f3e7d8',
    order: 30
  },
  {
    id: 'period-journeys',
    kind: 'period',
    label: 'Voyages et missions',
    shortLabel: 'Voyages',
    description: 'Déplacements et missions documentés sur une période.',
    color: '#397b78',
    softColor: '#e1f0ed',
    order: 40
  },
  {
    id: 'period-writing',
    kind: 'period',
    label: 'Rédaction et transmission',
    shortLabel: 'Rédaction',
    description: 'Périodes de rédaction ou de transmission documentaire.',
    color: '#3f4e78',
    softColor: '#e9edf7',
    order: 50
  },
  {
    id: 'period-other',
    kind: 'period',
    label: 'Autres périodes documentées',
    shortLabel: 'Autres périodes',
    description: 'Autres durées qui ne relèvent pas des livres bibliques.',
    color: '#7b8492',
    softColor: '#ebe7df',
    order: 60
  },
  {
    id: 'point-jesus',
    kind: 'point',
    label: 'Vie et ministère de Jésus',
    shortLabel: 'Jésus',
    description: 'Épisodes ponctuels du ministère et de la vie terrestre de Jésus.',
    color: '#a86f3d',
    softColor: '#f3e7d8',
    order: 110
  },
  {
    id: 'point-first-century',
    kind: 'point',
    label: 'Christianisme du Ier siècle',
    shortLabel: 'Ier siècle',
    description: 'Épisodes liés aux premières congrégations et aux voyages missionnaires.',
    color: '#397b78',
    softColor: '#e1f0ed',
    order: 120
  },
  {
    id: 'point-writing',
    kind: 'point',
    label: 'Écriture biblique',
    shortLabel: 'Écriture',
    description: 'Jalons ponctuels de rédaction des écrits bibliques.',
    color: '#3f4e78',
    softColor: '#e9edf7',
    order: 130
  },
  {
    id: 'point-history',
    kind: 'point',
    label: 'Repères historiques',
    shortLabel: 'Repères',
    description: 'Jalons politiques, chronologiques et documentaires.',
    color: '#687258',
    softColor: '#e9ede2',
    order: 140
  },
  {
    id: 'point-biblical',
    kind: 'point',
    label: 'Épisodes bibliques',
    shortLabel: 'Épisodes',
    description: 'Autres événements bibliques ponctuels.',
    color: '#6c5672',
    softColor: '#eee7ef',
    order: 150
  }
] as const;

export const TIMELINE_SEMANTIC_LANE_BY_ID = new Map(
  TIMELINE_SEMANTIC_LANES.map(lane => [lane.id, lane] as const)
);

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const hasA7Source = (event: EventData): boolean =>
  event.sources?.some(source => source.id.includes('source-nwtsty-a7-')) ?? false;

export const getTimelineSemanticLane = (
  event: EventData
): TimelineSemanticLaneDefinition => {
  const category = normalize(event.category);
  const label = normalize(event.text);
  const presentation = normalize(
    [
      event.timelinePresentation?.laneId,
      event.timelinePresentation?.renderMode,
      event.timelinePresentation?.groupingKey
    ]
      .filter(Boolean)
      .join(' ')
  );

  if (event.isPoint) {
    if (category.includes('redaction') || category.includes('livre biblique')) {
      return TIMELINE_SEMANTIC_LANE_BY_ID.get('point-writing')!;
    }
    if (hasA7Source(event)) {
      return TIMELINE_SEMANTIC_LANE_BY_ID.get(
        event.startYear <= 33 ? 'point-jesus' : 'point-first-century'
      )!;
    }
    if (
      category.includes('voyage') ||
      label.includes('paul') ||
      label.includes('congregation') ||
      (event.startYear >= 33 && event.startYear <= 100)
    ) {
      return TIMELINE_SEMANTIC_LANE_BY_ID.get('point-first-century')!;
    }
    if (
      category.includes('chronologie') ||
      category.includes('retablissement') ||
      category.includes('roi') ||
      category.includes('regne')
    ) {
      return TIMELINE_SEMANTIC_LANE_BY_ID.get('point-history')!;
    }
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('point-biblical')!;
  }

  if (
    category.includes('redaction') ||
    label.includes('redaction') ||
    label.includes('ecriture')
  ) {
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-writing')!;
  }
  if (
    category.includes('voyage') ||
    presentation.includes('voyage') ||
    presentation.includes('mission')
  ) {
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-journeys')!;
  }
  if (
    label.includes('alliance') ||
    presentation.includes('alliance') ||
    presentation.includes('fil thematique')
  ) {
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-covenants')!;
  }
  if (
    category.includes('roi') ||
    category.includes('regne') ||
    label.includes('domination') ||
    label.includes('empire')
  ) {
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-reigns')!;
  }
  if (
    presentation.includes('contexte') ||
    event.endYear - event.startYear >= 80
  ) {
    return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-context')!;
  }
  return TIMELINE_SEMANTIC_LANE_BY_ID.get('period-other')!;
};

export const getTimelineSemanticLaneCounts = (
  events: readonly EventData[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  events
    .filter(event => !event.historicalPersonId)
    .forEach(event => {
      const lane = getTimelineSemanticLane(event);
      counts.set(lane.id, (counts.get(lane.id) ?? 0) + 1);
    });
  return counts;
};
