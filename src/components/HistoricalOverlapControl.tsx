import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShieldCheck, X } from 'lucide-react';
import {
  DERIVED_HISTORICAL_RELATIONS,
  HISTORICAL_PEOPLE,
  PERSON_LIFE_RESOLUTIONS
} from '../data/historicalStudyData';
import { conservativeLifespanSpan } from '../domain/history/contentGeneration';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from '../domain/history/temporal';
import type { TemporalSpan } from '../domain/history/types';

interface HistoricalOverlapControlProps {
  isOpen: boolean;
  onClose: () => void;
}

const PARTS = {
  '1': {
    label: 'Partie 1 · Patriarches aux juges',
    min: -4026,
    max: -1080,
    sourceId: 'source-wcg-timeline-part-1'
  },
  '2': {
    label: 'Partie 2 · Rois à la reconstruction',
    min: -1180,
    max: -385,
    sourceId: 'source-wcg-timeline-part-2'
  },
  '3': {
    label: 'Partie 3 · Débuts du christianisme',
    min: -70,
    max: 100,
    sourceId: 'source-wcg-timeline-part-3'
  }
} as const;

type PartId = keyof typeof PARTS;

const STATUS_LABELS = {
  resolved: 'Source unique',
  compatible: 'Sources compatibles',
  divergent: 'Divergence',
  insufficient: 'Période insuffisante'
} as const;

const createSegment = (
  span: TemporalSpan,
  min: number,
  max: number
): { left: number; width: number } | undefined => {
  const interval = getTemporalInterval(span);
  if (
    interval.unknown ||
    interval.yearMin === undefined ||
    interval.yearMax === undefined
  ) {
    return undefined;
  }
  const axisMin = historicalYearToTimelineIndex(min);
  const axisMax = historicalYearToTimelineIndex(max);
  const start = Math.max(
    axisMin,
    historicalYearToTimelineIndex(interval.yearMin)
  );
  const end = Math.min(
    axisMax,
    historicalYearToTimelineIndex(interval.yearMax)
  );
  if (end < start) return undefined;
  const total = axisMax - axisMin || 1;
  return {
    left: ((start - axisMin) / total) * 100,
    width: Math.max(0.8, ((end - start) / total) * 100)
  };
};

export function HistoricalOverlapControl({
  isOpen,
  onClose
}: HistoricalOverlapControlProps) {
  const [partId, setPartId] = useState<PartId>('1');
  const [query, setQuery] = useState('');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const part = PARTS[partId];

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  const resolutionByPersonId = useMemo(
    () =>
      new Map(
        PERSON_LIFE_RESOLUTIONS.map(resolution => [
          resolution.personId,
          resolution
        ])
      ),
    []
  );

  const rows = useMemo(() => {
    const normalizedQuery = query
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    return HISTORICAL_PEOPLE.flatMap(person => {
      const normalizedName = person.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (normalizedQuery && !normalizedName.includes(normalizedQuery)) {
        return [];
      }

      const lifeSpan = person.lifeSpan
        ? conservativeLifespanSpan(person.lifeSpan)
        : undefined;
      const lifeSegment = lifeSpan
        ? createSegment(lifeSpan, part.min, part.max)
        : undefined;
      const activitySegments = person.activityPeriods.flatMap(activity => {
        const segment = createSegment(activity.span, part.min, part.max);
        return segment ? [{ activity, segment }] : [];
      });
      const contextSegments = (person.sourceTimelineWindows ?? [])
        .filter(window => window.sourceId === part.sourceId)
        .flatMap(window => {
          const segment = createSegment(window.span, part.min, part.max);
          return segment ? [{ window, segment }] : [];
        });

      if (!lifeSegment && !activitySegments.length && !contextSegments.length) {
        return [];
      }

      const contemporaryCount = new Set(
        DERIVED_HISTORICAL_RELATIONS.filter(
          relation =>
            relation.relationLevel === 'lifespan-overlap' &&
            relation.subjectIds.includes(person.id)
        ).flatMap(relation =>
          relation.subjectIds.filter(personId => personId !== person.id)
        )
      ).size;

      return [{
        person,
        lifeSpan,
        lifeSegment,
        activitySegments,
        contextSegments,
        contemporaryCount,
        resolution: resolutionByPersonId.get(person.id)
      }];
    }).sort((left, right) => {
      const leftStart =
        left.lifeSpan
          ? getTemporalInterval(left.lifeSpan).yearMin
          : left.contextSegments[0]?.window.span.start?.yearMin;
      const rightStart =
        right.lifeSpan
          ? getTemporalInterval(right.lifeSpan).yearMin
          : right.contextSegments[0]?.window.span.start?.yearMin;
      return (
        (leftStart ?? Number.MAX_SAFE_INTEGER) -
          (rightStart ?? Number.MAX_SAFE_INTEGER) ||
        left.person.name.localeCompare(right.person.name)
      );
    });
  }, [part, query, resolutionByPersonId]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="historical-control-title"
      className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-canvas)] text-[var(--color-ink)]"
    >
      <header className="flex min-h-16 flex-wrap items-center gap-3 border-b border-[var(--color-stone)] bg-[var(--color-paper)] px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--color-ink-muted)]">
              Contrôle interne · données relues
            </p>
            <h1
              id="historical-control-title"
              className="truncate font-[var(--font-editorial)] text-xl font-semibold"
            >
              Chevauchements historiques
            </h1>
          </div>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <X className="size-4" aria-hidden="true" />
          Fermer
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] px-4 py-3 md:px-6">
        <label className="text-sm font-semibold">
          Frise
          <select
            value={partId}
            onChange={event => setPartId(event.target.value as PartId)}
            className="ml-2 min-h-11 border border-[var(--color-stone)] bg-[var(--color-paper)] px-3 text-sm"
          >
            {Object.entries(PARTS).map(([id, value]) => (
              <option key={id} value={id}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative min-w-64 flex-1 md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-muted)]"
            aria-hidden="true"
          />
          <span className="sr-only">Filtrer les personnages</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Filtrer les personnages"
            className="min-h-11 w-full border border-[var(--color-stone)] bg-[var(--color-paper)] pl-10 pr-3 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-3 text-xs font-medium text-[var(--color-ink-soft)]">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2 w-5 bg-[var(--color-primary)]" /> Vie
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-1.5 w-5 bg-[var(--color-mineral)]" /> Activité
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2 w-5 border border-dashed border-[var(--color-bronze)]" /> Contexte collectif
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 md:px-6">
        <div className="mx-auto min-w-[760px] max-w-[1500px]">
          <div className="grid grid-cols-[220px_1fr_190px] gap-4 border-b border-[var(--color-stone)] pb-2 text-xs font-semibold text-[var(--color-ink-muted)]">
            <span>Personnage</span>
            <span className="flex justify-between tabular-nums">
              <span>{Math.abs(part.min)} {part.min < 0 ? 'av. n. è.' : 'de n. è.'}</span>
              <span>{Math.abs(part.max)} {part.max < 0 ? 'av. n. è.' : 'de n. è.'}</span>
            </span>
            <span>Contrôle</span>
          </div>

          {rows.map(row => (
            <article
              key={row.person.id}
              className="grid min-h-[74px] grid-cols-[220px_1fr_190px] items-center gap-4 border-b border-[var(--color-stone-light)]"
            >
              <div className="min-w-0">
                <h2 className="truncate font-[var(--font-editorial)] text-base font-semibold">
                  {row.person.name}
                </h2>
                <p className="truncate text-xs text-[var(--color-ink-muted)]">
                  {row.lifeSpan?.displayLabel ??
                    row.contextSegments[0]?.window.span.displayLabel ??
                    'Période non déterminée'}
                </p>
              </div>
              <div className="relative h-10 bg-[var(--color-stone-light)]/55">
                {row.lifeSegment && (
                  <span
                    className="absolute top-2 h-3 bg-[var(--color-primary)]"
                    style={{
                      left: `${row.lifeSegment.left}%`,
                      width: `${row.lifeSegment.width}%`
                    }}
                    title={`Vie : ${row.lifeSpan?.displayLabel}`}
                  />
                )}
                {row.activitySegments.map(({ activity, segment }, index) => (
                  <span
                    key={activity.id}
                    className="absolute h-1.5 bg-[var(--color-mineral)]"
                    style={{
                      top: `${24 + (index % 2) * 7}px`,
                      left: `${segment.left}%`,
                      width: `${segment.width}%`
                    }}
                    title={`${activity.label} : ${activity.span.displayLabel}`}
                  />
                ))}
                {row.contextSegments.map(({ window, segment }) => (
                  <span
                    key={window.id}
                    className="absolute top-2 h-3 border border-dashed border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/45"
                    style={{
                      left: `${segment.left}%`,
                      width: `${segment.width}%`
                    }}
                    title={`${window.label} — contexte collectif, pas une durée de vie`}
                  />
                ))}
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-[var(--color-ink-soft)]">
                  {row.resolution
                    ? STATUS_LABELS[row.resolution.status]
                    : row.contextSegments.length
                      ? 'Contexte seulement'
                      : 'Activité seulement'}
                </p>
                <p className="text-[var(--color-ink-muted)]">
                  {row.contemporaryCount} contemporain
                  {row.contemporaryCount > 1 ? 's' : ''} calculé
                  {row.contemporaryCount > 1 ? 's' : ''}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
