import { useEffect, useMemo, useState, type Key } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Map as MapIcon,
  MapPin,
  ScrollText,
  UserRound,
  UsersRound
} from 'lucide-react';
import type { BiblicalPlace, EventData } from '../types.ts';
import {
  clipFocusedTimelineSpan,
  eventDataToTemporalSpan,
  focusedTimelinePositionPercent,
  getFocusedTimelineDomain,
  type FocusedTimelineModel,
  type FocusedTimelinePersonLane,
  type FocusedTimelineScale,
  type FocusedTimelineSpan
} from '../domain/history/focusedTimeline.ts';
import {
  calculatePersonAtEvent
} from '../domain/history/eventChronology.ts';
import { getActivityVisual } from '../domain/history/activityVisuals.ts';
import {
  formatTemporalSpanFrench,
  timelineIndexToHistoricalYear
} from '../domain/history/temporal.ts';
import { formatEventSpan } from '../utils/dateUtils.ts';

interface FocusedTimelineMobileProps {
  model: FocusedTimelineModel;
  places: readonly BiblicalPlace[];
  onBack: () => void;
  onSelectPerson: (personId: string) => void;
  onOpenDetails: (event?: EventData) => void;
  onOpenMap: (event: EventData) => void;
}

const scaleOptions: Array<{
  id: FocusedTimelineScale;
  label: string;
  duration?: number;
}> = [
  { id: 'full', label: 'Vue entière' },
  { id: '25-years', label: '25 ans', duration: 25 },
  { id: '10-years', label: '10 ans', duration: 10 }
];

const focusKindLabels: Record<FocusedTimelineModel['kind'], string> = {
  person: 'Vie et contemporains',
  event: 'Événement et contexte',
  book: 'Période racontée'
};

const compactYear = (position: number): string => {
  const year = timelineIndexToHistoricalYear(Math.round(position));
  return year < 0 ? `${Math.abs(year)} av.` : `${year}`;
};

const formatFocusedEventPeriod = (event: EventData): string => {
  const period = eventDataToTemporalSpan(event);
  return period
    ? formatTemporalSpanFrench(period)
    : formatEventSpan(
        event.startYear,
        event.endYear,
        event.isPoint,
        event.fuzzyStart,
        event.fuzzyEnd
      );
};

const spanStyle = (
  span: FocusedTimelineSpan,
  domain: FocusedTimelineSpan,
  minimumWidth = 1.5
) => {
  const clipped = clipFocusedTimelineSpan(span, domain);
  if (!clipped) return null;
  const left = focusedTimelinePositionPercent(clipped.start, domain);
  const right = focusedTimelinePositionPercent(clipped.end, domain);
  return {
    left: `${left}%`,
    width: `${Math.max(minimumWidth, right - left)}%`
  };
};

const laneIsActiveAt = (
  lane: FocusedTimelinePersonLane,
  position: number
): boolean => lane.span.start <= position && lane.span.end >= position;

function PersonLane({
  lane,
  domain,
  selectedPosition,
  onSelect
}: {
  key?: Key;
  lane: FocusedTimelinePersonLane;
  domain: FocusedTimelineSpan;
  selectedPosition?: number;
  onSelect: () => void;
}) {
  const baseStyle = spanStyle(lane.span, domain);
  const active =
    selectedPosition === undefined || laneIsActiveAt(lane, selectedPosition);
  const content = (
    <>
      <span
        className={`truncate text-left text-[11px] font-semibold ${
          lane.isFocus
            ? 'text-[var(--color-primary-dark)]'
            : active
              ? 'text-[var(--color-ink)]'
              : 'text-[var(--color-ink-muted)]'
        }`}
      >
        {lane.person.name}
      </span>
      <span className="relative h-9 min-w-0 overflow-hidden rounded-[8px] bg-[linear-gradient(to_right,var(--color-stone-light)_1px,transparent_1px)] bg-[length:33.333%_100%]">
        {baseStyle && (
          <span
            className={`absolute top-2.5 h-4 rounded-full ${
              lane.isFocus
                ? 'bg-[var(--color-primary-soft)] ring-1 ring-inset ring-[var(--color-primary)]/25'
                : 'bg-[var(--color-stone)]'
            } ${active ? 'opacity-100' : 'opacity-45'}`}
            style={baseStyle}
          />
        )}
        {lane.activities.map(activity => {
          const activityStyle = spanStyle(activity, domain);
          if (!activityStyle) return null;
          const visual = getActivityVisual(activity.type);
          const width = Number.parseFloat(activityStyle.width);
          return (
            <span
              key={activity.id}
              className={`absolute top-2 h-5 overflow-hidden rounded-full text-center text-[10px] font-semibold leading-5 text-white ${
                active ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                ...activityStyle,
                backgroundColor: visual.color,
                borderStyle: visual.pattern === 'solid' ? 'solid' : visual.pattern,
                borderWidth: visual.pattern === 'solid' ? 0 : 1,
                borderColor: 'var(--color-paper)'
              }}
            >
              {width >= 22 ? visual.label : ''}
            </span>
          );
        })}
      </span>
    </>
  );

  return lane.isFocus ? (
    <div className="grid min-h-11 grid-cols-[68px_minmax(0,1fr)] items-center gap-2 px-3">
      {content}
    </div>
  ) : (
    <button
      type="button"
      onClick={onSelect}
      className="grid min-h-11 w-full grid-cols-[68px_minmax(0,1fr)] items-center gap-2 px-3 hover:bg-[var(--color-paper-muted)]"
      aria-label={`Focaliser la frise sur ${lane.person.name}`}
    >
      {content}
    </button>
  );
}

export function FocusedTimelineMobile({
  model,
  places,
  onBack,
  onSelectPerson,
  onOpenDetails,
  onOpenMap
}: FocusedTimelineMobileProps) {
  const initialMarkerId =
    model.markers.find(marker => marker.event.id === model.focusEvent?.id)?.event
      .id ??
    model.markers.find(marker => marker.directlyRelated)?.event.id ??
    null;
  const [scale, setScale] = useState<FocusedTimelineScale>('full');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(
    initialMarkerId
  );

  useEffect(() => {
    const nextMarkerId =
      model.markers.find(marker => marker.event.id === model.focusEvent?.id)
        ?.event.id ??
      model.markers.find(marker => marker.directlyRelated)?.event.id ??
      null;
    setScale('full');
    setSelectedMarkerId(nextMarkerId);
  }, [model.id, model.focusEvent?.id, model.markers]);

  const currentMarker = selectedMarkerId
    ? model.markers.find(marker => marker.event.id === selectedMarkerId) ?? null
    : null;
  const currentMarkerIndex = currentMarker
    ? model.markers.findIndex(marker => marker.event.id === currentMarker.event.id)
    : -1;
  const domain = useMemo(
    () => getFocusedTimelineDomain(model, scale, currentMarker?.position),
    [currentMarker?.position, model, scale]
  );
  const visibleMarkers = useMemo(() => {
    const lastPositionByTrack = [-Infinity, -Infinity, -Infinity];
    return model.markers
      .filter(
        marker => marker.position >= domain.start && marker.position <= domain.end
      )
      .map(marker => ({
        marker,
        position: focusedTimelinePositionPercent(marker.position, domain)
      }))
      .map(item => {
        const availableTrack = lastPositionByTrack.findIndex(
          lastPosition => item.position - lastPosition >= 14
        );
        const track =
          availableTrack >= 0
            ? availableTrack
            : lastPositionByTrack.indexOf(Math.min(...lastPositionByTrack));
        lastPositionByTrack[track] = item.position;
        return { ...item, track };
      });
  }, [domain, model.markers]);
  const fullDuration = model.fullDomain.end - model.fullDomain.start;
  const guidePosition = currentMarker
    ? focusedTimelinePositionPercent(currentMarker.position, domain)
    : null;
  const anchorStyle = spanStyle(model.anchorSpan, domain, 2);
  const selectedPosition = currentMarker?.position;
  const activeContemporaries = selectedPosition === undefined
    ? []
    : model.people.filter(
        lane => !lane.isFocus && laneIsActiveAt(lane, selectedPosition)
      );
  const currentEvent = currentMarker?.event ?? model.focusEvent;
  const currentPlace = currentEvent?.associatedLocationIds
    ?.map(id => places.find(place => place.id === id))
    .find((place): place is BiblicalPlace => Boolean(place));
  const eventPeriod = currentEvent
    ? eventDataToTemporalSpan(currentEvent)
    : null;
  const personAtEvent =
    model.focusPerson?.lifeSpan && eventPeriod
      ? calculatePersonAtEvent(model.focusPerson, eventPeriod)
      : null;
  const age = personAtEvent?.outsideKnownLife ? null : personAtEvent?.age;
  const writingLabel = model.writingEvents.length
    ? model.writingEvents
        .map(formatFocusedEventPeriod)
        .join(' · ')
    : null;
  const canOpenMap = Boolean(currentEvent?.associatedLocationIds?.length);

  const selectPrevious = () => {
    if (currentMarkerIndex > 0) {
      setSelectedMarkerId(model.markers[currentMarkerIndex - 1].event.id);
    }
  };
  const selectNext = () => {
    if (currentMarkerIndex < 0 && model.markers.length > 0) {
      setSelectedMarkerId(model.markers[0].event.id);
      return;
    }
    if (currentMarkerIndex >= 0 && currentMarkerIndex < model.markers.length - 1) {
      setSelectedMarkerId(model.markers[currentMarkerIndex + 1].event.id);
    }
  };

  return (
    <div
      data-testid="focused-timeline"
      className="absolute inset-0 z-30 overflow-y-auto bg-[var(--color-canvas)] md:hidden"
    >
      <header className="sticky top-0 z-30 border-b border-[var(--color-stone)] bg-[color-mix(in_srgb,var(--color-paper)_96%,transparent)] px-3 py-2 backdrop-blur-xl">
        <div className="flex min-h-11 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Revenir à la frise globale"
            className="atlas-icon-button shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="atlas-kicker">Frise focalisée</p>
            <h2 className="truncate font-[var(--font-editorial)] text-xl font-semibold text-[var(--color-ink)]">
              {model.title}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-primary-dark)]">
            {focusKindLabels[model.kind]}
          </span>
        </div>
      </header>

      <div className="space-y-3 px-3 py-3 pb-8">
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-stone)] bg-[var(--color-paper)] shadow-[var(--shadow-low)]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-stone-light)] px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-ink)]">
                {model.kind === 'book'
                  ? 'Période couverte par le récit'
                  : model.kind === 'event'
                    ? 'Fenêtre autour de l’événement'
                    : 'Ligne de vie et périodes d’activité'}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                {model.periodLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenDetails()}
              aria-label={`Ouvrir la fiche de ${model.title}`}
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-stone)] px-2.5 text-[11px] font-semibold text-[var(--color-primary-dark)]"
            >
              <BookOpenText className="size-4" />
              Fiche
            </button>
          </div>

          <div
            className="grid grid-cols-3 gap-1 border-b border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] p-1.5"
            role="group"
            aria-label="Échelle de la frise focalisée"
          >
            {scaleOptions.map(option => {
              const isActive = scale === option.id;
              const disabled = Boolean(
                option.duration && fullDuration <= option.duration
              );
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setScale(option.id)}
                  disabled={disabled}
                  aria-pressed={isActive}
                  className={`min-h-10 rounded-[8px] px-2 text-[11px] font-semibold ${
                    isActive
                      ? 'bg-[var(--color-paper)] text-[var(--color-primary-dark)] shadow-[var(--shadow-low)]'
                      : 'text-[var(--color-ink-muted)]'
                  } disabled:opacity-35`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div
            className="relative py-2"
            role="group"
            aria-label={`${model.title}, ses contemporains et les événements correspondants`}
          >
            <div
              className="pointer-events-none absolute bottom-3 left-[88px] right-3 top-8 z-10"
              aria-hidden="true"
            >
              {guidePosition !== null && (
                <span
                  className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--color-bronze)]/75"
                  style={{ left: `${guidePosition}%` }}
                >
                  <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-[var(--color-bronze)]" />
                </span>
              )}
            </div>

            <div className="grid min-h-7 grid-cols-[68px_minmax(0,1fr)] items-end gap-2 px-3 text-[10px] font-semibold text-[var(--color-ink-muted)]">
              <span>Année</span>
              <span className="flex justify-between tabular-nums">
                {[0, 1, 2, 3].map(index => {
                  const position =
                    domain.start +
                    ((domain.end - domain.start) * index) / 3;
                  return <span key={index}>{compactYear(position)}</span>;
                })}
              </span>
            </div>

            {model.focusEvent && (
              <div className="grid min-h-11 grid-cols-[68px_minmax(0,1fr)] items-center gap-2 px-3">
                <span className="truncate text-[11px] font-semibold text-[var(--color-primary-dark)]">
                  {model.kind === 'book' ? 'Récit' : 'Événement'}
                </span>
                <span className="relative h-9 min-w-0 overflow-hidden rounded-[8px] bg-[linear-gradient(to_right,var(--color-stone-light)_1px,transparent_1px)] bg-[length:33.333%_100%]">
                  {anchorStyle && (
                    <span
                      className={`absolute top-2 h-5 min-w-2 rounded-full ${
                        model.kind === 'book'
                          ? 'bg-[var(--color-primary)]'
                          : 'bg-[var(--color-bronze)]'
                      }`}
                      style={anchorStyle}
                    />
                  )}
                </span>
              </div>
            )}

            {model.people.map(lane => (
              <PersonLane
                key={lane.person.id}
                lane={lane}
                domain={domain}
                selectedPosition={selectedPosition}
                onSelect={() => onSelectPerson(lane.person.id)}
              />
            ))}

            <div className="grid min-h-[92px] grid-cols-[68px_minmax(0,1fr)] items-center gap-2 px-3">
              <span className="text-[11px] font-semibold text-[var(--color-ink-muted)]">
                Événements
              </span>
              <span className="relative h-[84px] min-w-0 bg-[linear-gradient(to_right,var(--color-stone-light)_1px,transparent_1px)] bg-[length:33.333%_100%]">
                {visibleMarkers.map(({ marker, position, track }) => {
                  const isSelected = marker.event.id === currentMarker?.event.id;
                  return (
                    <button
                      key={marker.event.id}
                      type="button"
                      onClick={() => setSelectedMarkerId(marker.event.id)}
                      aria-pressed={isSelected}
                      aria-label={`${marker.event.text}, ${formatFocusedEventPeriod(
                        marker.event
                      )}`}
                      className="absolute grid size-11 -translate-x-1/2 place-items-center rounded-full"
                      style={{ left: `${position}%`, top: `${track * 20}px` }}
                    >
                      <span
                        className={`size-3 rounded-full border-2 border-[var(--color-paper)] shadow-[0_0_0_1px_var(--color-stone)] ${
                          isSelected
                            ? 'bg-[var(--color-bronze)] ring-4 ring-[var(--color-bronze-soft)]'
                            : marker.directlyRelated
                              ? 'bg-[var(--color-primary)]'
                              : 'bg-[var(--color-ink-muted)]'
                        }`}
                      />
                    </button>
                  );
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--color-stone-light)] px-3 py-2 text-[10px] text-[var(--color-ink-muted)]">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-[var(--color-stone)]" />vie</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-[var(--color-mineral)]" />ministère / prophétie</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded-full bg-[var(--color-bronze)]" />règne</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--color-primary)]" />lié au focus</span>
          </div>
        </section>

        {model.kind === 'book' && (
          <section className="rounded-[var(--radius-md)] border border-[var(--color-mineral)]/20 bg-[var(--color-mineral-soft)] px-3 py-2.5">
            <div className="flex items-start gap-2">
              <ScrollText className="mt-0.5 size-4 shrink-0 text-[var(--color-mineral)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink)]">
                  Rédaction ou compilation
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                  {writingLabel ??
                    'Aucune période de rédaction reliée à ce livre dans les données actuelles. Elle reste distincte de la période racontée.'}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-stone)] bg-[var(--color-paper)] p-3 shadow-[var(--shadow-low)]" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-bronze)]">
                {currentEvent
                  ? formatFocusedEventPeriod(currentEvent)
                  : model.periodLabel}
              </p>
              <h3 className="mt-1 font-[var(--font-editorial)] text-xl font-semibold leading-tight text-[var(--color-ink)]">
                {currentEvent?.text ?? model.title}
              </h3>
            </div>
            {currentMarker && (
              <span className="shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-ink-muted)]">
                {currentMarkerIndex + 1} / {model.markers.length}
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {currentEvent?.biblicalReferences?.[0] && (
              <div className="flex min-h-12 items-start gap-2 rounded-[9px] bg-[var(--color-paper-muted)] p-2 text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                <BookOpenText className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" />
                {currentEvent.biblicalReferences[0]}
              </div>
            )}
            {currentPlace && (
              <div className="flex min-h-12 items-start gap-2 rounded-[9px] bg-[var(--color-paper-muted)] p-2 text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" />
                {currentPlace.name}
              </div>
            )}
            {age && (
              <div className="flex min-h-12 items-start gap-2 rounded-[9px] bg-[var(--color-paper-muted)] p-2 text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                <UserRound className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" />
                {model.focusPerson?.name} : {age.label}
              </div>
            )}
            {activeContemporaries.length > 0 && (
              <div className="flex min-h-12 items-start gap-2 rounded-[9px] bg-[var(--color-paper-muted)] p-2 text-[11px] leading-relaxed text-[var(--color-ink-soft)]">
                <UsersRound className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" />
                {activeContemporaries
                  .slice(0, 2)
                  .map(lane => lane.person.name)
                  .join(', ')}
                {activeContemporaries.length > 2
                  ? ` +${activeContemporaries.length - 2}`
                  : ''}
              </div>
            )}
          </div>

          {currentEvent?.description && (
            <p className="mt-3 text-xs leading-relaxed text-[var(--color-ink-soft)]">
              {currentEvent.description}
            </p>
          )}

          <div className="mt-3 grid grid-cols-[44px_1fr_1fr_44px] gap-2">
            <button
              type="button"
              onClick={selectPrevious}
              disabled={currentMarkerIndex <= 0}
              aria-label="Événement précédent"
              className="atlas-icon-button border border-[var(--color-stone)] disabled:opacity-30"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDetails(currentEvent ?? undefined)}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-stone)] bg-[var(--color-paper)] px-2 text-xs font-semibold text-[var(--color-ink)]"
            >
              <Clock3 className="size-4" />
              Détails
            </button>
            <button
              type="button"
              onClick={() => currentEvent && onOpenMap(currentEvent)}
              disabled={!canOpenMap}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-2 text-xs font-semibold text-white disabled:bg-[var(--color-stone)] disabled:text-[var(--color-ink-muted)]"
            >
              <MapIcon className="size-4" />
              Carte
            </button>
            <button
              type="button"
              onClick={selectNext}
              disabled={
                model.markers.length === 0 ||
                currentMarkerIndex >= model.markers.length - 1
              }
              aria-label="Événement suivant"
              className="atlas-icon-button border border-[var(--color-stone)] disabled:opacity-30"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </section>

        <p className="px-1 text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
          Les âges et chevauchements sont calculés à partir des bornes actuellement retenues ; les estimations conservent leur degré d’incertitude.
        </p>
      </div>
    </div>
  );
}
