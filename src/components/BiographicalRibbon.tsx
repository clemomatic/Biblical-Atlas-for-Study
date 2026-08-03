import type { CSSProperties } from 'react';
import { ACTIVITY_VISUALS } from '../domain/history/activityVisuals.ts';
import {
  BIOGRAPHY_LANE_BY_ID,
  getBiographyLaneIdForEvent
} from '../domain/history/timelineBiography.ts';
import type { PersonAtEventCalculation } from '../domain/history/eventChronology.ts';
import {
  getTemporalInterval,
  historicalYearToTimelineIndex
} from '../domain/history/temporal.ts';
import type { PersonActivityPeriod } from '../domain/history/types.ts';
import type { EventData } from '../types.ts';

interface BiographicalRibbonProps {
  event: EventData;
  width: number;
  isActive: boolean;
  label: string;
  labelOffset: number;
  labelWidth: number;
  markerOffset?: number;
  calculation?: PersonAtEventCalculation;
}

interface ActivitySegment {
  activity: PersonActivityPeriod;
  leftPercent: number;
  widthPercent: number;
  track: number;
}

const certaintyStyle = (
  activity: PersonActivityPeriod
): CSSProperties => {
  const fuzzy =
    activity.span.start?.approximate ||
    activity.span.end?.approximate;
  const possible =
    activity.certainty === 'possible' ||
    activity.span.start?.certainty === 'possible' ||
    activity.span.end?.certainty === 'possible';
  return {
    opacity: activity.certainty === 'probable' ? 0.82 : 1,
    borderStyle: possible ? 'dashed' : 'solid',
    maskImage: fuzzy
      ? 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)'
      : undefined
  };
};

const layoutActivities = (
  event: EventData
): ActivitySegment[] => {
  const duration = Math.max(1, event.endPos - event.startPos);
  const occupiedUntil = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ];

  return [...(event.historicalActivityPeriods ?? [])]
    .map(activity => {
      const interval = getTemporalInterval(activity.span);
      if (
        interval.unknown ||
        interval.yearMin === undefined ||
        interval.yearMax === undefined
      ) {
        return undefined;
      }
      const start = historicalYearToTimelineIndex(interval.yearMin);
      const end = historicalYearToTimelineIndex(interval.yearMax);
      const leftPercent = Math.max(
        0,
        Math.min(100, ((start - event.startPos) / duration) * 100)
      );
      const endPercent = Math.max(
        leftPercent + 1,
        Math.min(100, ((end - event.startPos) / duration) * 100)
      );
      const availableTrack = occupiedUntil.findIndex(value => value <= start);
      const track = availableTrack === -1 ? 2 : availableTrack;
      occupiedUntil[track] = Math.max(occupiedUntil[track], end);
      return {
        activity,
        leftPercent,
        widthPercent: Math.max(1, endPercent - leftPercent),
        track
      };
    })
    .filter((segment): segment is ActivitySegment => Boolean(segment));
};

export function BiographicalRibbon({
  event,
  width,
  isActive,
  label,
  labelOffset,
  labelWidth,
  markerOffset,
  calculation
}: BiographicalRibbonProps) {
  const segments = layoutActivities(event);
  const lane = BIOGRAPHY_LANE_BY_ID.get(
    getBiographyLaneIdForEvent(event)
  );
  const lifeColor = lane?.color ?? ACTIVITY_VISUALS.lifespan.color;
  const lifeSoftColor =
    lane?.softColor ?? ACTIVITY_VISUALS.lifespan.softColor;
  const hasLifeSpan = event.historicalPersonSpanKind === 'lifespan';
  const markerLabel = calculation
    ? [
        calculation.age.label,
        calculation.activeActivities[0]?.label ??
          calculation.pendingActivities[0]?.label
      ].filter(Boolean).join(' · ')
    : undefined;

  return (
    <div
      style={{ width: `${width}px` }}
      className={`relative h-11 overflow-visible rounded-[4px] transition-shadow ${
        isActive
          ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-paper)]'
          : ''
      }`}
      aria-label={`${label}, ${hasLifeSpan ? 'ruban de vie' : 'période d’activité'}${event.historicalOpenStart ? ', commencé avant la limite affichée' : ''}${event.historicalOpenEnd ? ', poursuivi après la limite affichée' : ''}, avec ${segments.length} période${segments.length === 1 ? '' : 's'} d’activité`}
      data-testid="biographical-ribbon"
      data-event-id={event.id}
      data-person-id={event.historicalPersonId}
      data-person-subcategory={lane?.id ?? 'people'}
    >
      <div
        className="absolute inset-x-0 top-[22px] h-3 rounded-[3px] border"
        style={{
          backgroundColor: hasLifeSpan
            ? lifeSoftColor
            : lane?.softColor ?? ACTIVITY_VISUALS.other.softColor,
          borderColor: hasLifeSpan
            ? lifeColor
            : lane?.color ?? ACTIVITY_VISUALS.other.color,
          opacity: event.certainty === 'possible' ? 0.72 : 1,
          borderStyle:
            event.certainty === 'possible' || event.certainty === 'unknown'
              ? 'dashed'
              : 'solid',
          maskImage:
            event.fuzzyStart || event.fuzzyEnd
              ? `linear-gradient(to right, ${event.fuzzyStart ? 'transparent, black 10%,' : ''} black ${event.fuzzyEnd ? '90%, transparent' : '100%'})`
              : undefined
        }}
      />
      {event.historicalOpenStart && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-[19px] z-20 -translate-x-1/2 text-base font-bold text-[var(--color-ink-muted)]"
          title="La personne est née avant la borne affichée"
        >
          ‹
        </span>
      )}
      {event.historicalOpenEnd && (
        <span
          aria-hidden="true"
          className="absolute right-0 top-[19px] z-20 translate-x-1/2 text-base font-bold text-[var(--color-ink-muted)]"
          title="La période continue après la borne affichée"
        >
          ›
        </span>
      )}
      {segments.map(segment => {
        const visual = ACTIVITY_VISUALS[segment.activity.type];
        const height = segment.track === 0 ? 10 : 4;
        const top = segment.track === 0 ? 23 : 36 + (segment.track - 1) * 5;
        const background =
          visual.pattern === 'solid'
            ? visual.color
            : visual.pattern === 'dashed'
              ? `repeating-linear-gradient(90deg, ${visual.color} 0 7px, transparent 7px 11px)`
              : `repeating-linear-gradient(90deg, ${visual.color} 0 2px, transparent 2px 5px)`;
        return (
          <span
            key={segment.activity.id}
            style={{
              left: `${segment.leftPercent}%`,
              width: `${segment.widthPercent}%`,
              top,
              height,
              background,
              borderColor: visual.color,
              ...certaintyStyle(segment.activity)
            }}
            className="absolute min-w-1 rounded-[2px] border"
            title={`${segment.activity.label} — ${segment.activity.span.displayLabel}. ${visual.label}.`}
            aria-label={`${segment.activity.label}, ${segment.activity.span.displayLabel}`}
          />
        );
      })}
      <span
        style={{
          left: `${Math.max(2, labelOffset)}px`,
          width: `${labelWidth}px`,
          borderColor: lane?.color ?? 'var(--color-ink-muted)'
        }}
        className="pointer-events-none absolute top-0 z-30 flex h-5 items-center truncate border-l-2 bg-[rgb(255_253_248/92%)] px-1.5 text-[11px] font-bold text-[var(--color-ink)] shadow-[0_1px_2px_rgb(23_32_51/10%)] backdrop-blur-sm"
        title={`${label} · ${event.temporalSpan?.displayLabel ?? `${event.startYear}–${event.endYear}`}`}
        data-testid="biographical-label"
      >
        <span className="truncate">{label}</span>
      </span>
      {markerOffset !== undefined && markerLabel && (
        <span
          style={{
            left: `${Math.max(0, Math.min(width, markerOffset))}px`
          }}
          className="pointer-events-none absolute bottom-full z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2 py-1 text-[10px] font-semibold text-white shadow-[var(--shadow-2)]"
          data-testid="participant-intersection"
        >
          {markerLabel}
        </span>
      )}
    </div>
  );
}
