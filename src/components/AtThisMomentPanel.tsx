import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Calculator,
  CheckCircle2,
  ChevronDown,
  CircleDotDashed,
  ExternalLink,
  Link2,
  MapPin,
  MapPinOff,
  Network,
  ShieldQuestion,
  Users,
  X
} from 'lucide-react';
import type { TimelinePeriod } from '../types';
import {
  buildHistoricalSnapshot,
  timelinePeriodToTemporalSpan,
  type HistoricalKnowledgeLevel,
  type HistoricalSnapshot
} from '../domain/history/historicalSnapshot';
import { HISTORICAL_SNAPSHOT_CATALOG } from '../data/historicalStudyData';
import { EmptyState, StatusNotice } from './ui/AtlasUi';

interface AtThisMomentPanelProps {
  isOpen: boolean;
  period: TimelinePeriod | null;
  onClose: () => void;
  onSelectPerson: (personId: string) => void;
  onSelectEvent: (eventId: string) => void;
  onSelectPlace: (placeId: string) => void;
}

const levelPresentation: Record<
  HistoricalKnowledgeLevel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  attested: {
    label: 'Attesté',
    icon: CheckCircle2,
    className:
      'bg-[var(--color-mineral-soft)] text-[var(--color-mineral)]'
  },
  calculated: {
    label: 'Calculé',
    icon: Calculator,
    className:
      'bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)]'
  },
  probable: {
    label: 'Probable',
    icon: CircleDotDashed,
    className:
      'bg-[var(--color-bronze-soft)] text-[var(--color-bronze)]'
  },
  possible: {
    label: 'Possible',
    icon: ShieldQuestion,
    className:
      'bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-paper))] text-[var(--color-warning)]'
  },
  'unknown-location': {
    label: 'Localisation inconnue',
    icon: MapPinOff,
    className:
      'bg-[var(--color-paper-muted)] text-[var(--color-ink-soft)]'
  }
};

const presenceTypeLabels: Record<string, string> = {
  resident: 'Résidence',
  visitor: 'Visite',
  traveler: 'Voyage',
  ministry: 'Ministère',
  'reign-seat': 'Règne depuis ce lieu',
  imprisonment: 'Emprisonnement',
  'possible-presence': 'Présence possible'
};

const evidenceMethodLabels = {
  direct: 'Preuve directe',
  calculated: 'Élément calculé',
  inferred: 'Inférence'
} as const;

function KnowledgeBadge({
  level
}: {
  level: HistoricalKnowledgeLevel;
}) {
  const presentation = levelPresentation[level];
  const Icon = presentation.icon;
  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${presentation.className}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {presentation.label}
    </span>
  );
}

function SnapshotSection({
  icon,
  title,
  count,
  children
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`snapshot-${title.replace(/\s/g, '-')}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[var(--color-bronze)]" aria-hidden="true">
          {icon}
        </span>
        <h3
          id={`snapshot-${title.replace(/\s/g, '-')}`}
          className="text-sm font-bold text-[var(--color-ink)]"
        >
          {title}
        </h3>
        <span className="ml-auto min-w-6 rounded-full bg-[var(--color-paper-muted)] px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-[var(--color-ink-muted)]">
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function EntityButton({
  title,
  meta,
  level,
  onClick
}: {
  key?: React.Key;
  title: string;
  meta?: string;
  level: HistoricalKnowledgeLevel;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-14 w-full items-center gap-3 border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] px-3 py-2.5 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-ink)]">
          {title}
        </span>
        {meta && (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-ink-muted)]">
            {meta}
          </span>
        )}
      </span>
      <KnowledgeBadge level={level} />
      <ArrowRight
        className="size-4 shrink-0 text-[var(--color-stone)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]"
        aria-hidden="true"
      />
    </button>
  );
}

const groupEventsByPeriod = (snapshot: HistoricalSnapshot) =>
  snapshot.events.reduce<Record<string, HistoricalSnapshot['events']>>(
    (groups, event) => {
      groups[event.periodLabel] = [
        ...(groups[event.periodLabel] ?? []),
        event
      ];
      return groups;
    },
    {}
  );

export function AtThisMomentPanel({
  isOpen,
  period,
  onClose,
  onSelectPerson,
  onSelectEvent,
  onSelectPlace
}: AtThisMomentPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const [expandedConnectionId, setExpandedConnectionId] = useState<
    string | null
  >(null);

  const snapshot = useMemo(() => {
    if (!period) return null;
    return buildHistoricalSnapshot(
      HISTORICAL_SNAPSHOT_CATALOG,
      timelinePeriodToTemporalSpan(period)
    );
  }, [period]);

  const groupedEvents: Record<
    string,
    HistoricalSnapshot['events']
  > = useMemo(
    () => (snapshot ? groupEventsByPeriod(snapshot) : {}),
    [snapshot]
  );

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    const frame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus()
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      ];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setExpandedConnectionId(null);
  }, [isOpen, period?.startYear, period?.endYear]);

  if (!isOpen) return null;

  const navigate = (action: () => void) => {
    onClose();
    action();
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-end justify-end md:items-stretch md:pt-16">
      <button
        type="button"
        aria-label="Fermer la vue À ce moment-là"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--color-ink)]/28 backdrop-blur-[2px]"
      />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="at-this-moment-title"
        className="atlas-enter relative z-10 flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-[var(--radius-xl)] border border-[var(--color-stone-light)] bg-[var(--color-paper)] shadow-[var(--shadow-3)] md:h-full md:max-h-none md:w-[min(480px,46vw)] md:rounded-none md:border-y-0 md:border-r-0"
      >
        <header className="shrink-0 border-b border-[var(--color-stone-light)] bg-[var(--color-paper)] px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start gap-4">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary-dark)] text-[var(--color-paper)]"
              aria-hidden="true"
            >
              <CalendarRange className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="atlas-kicker">Vue d’étude</p>
              <h2
                id="at-this-moment-title"
                className="mt-1 font-[var(--font-editorial)] text-2xl font-semibold leading-tight text-[var(--color-ink)]"
              >
                À ce moment-là
              </h2>
              <p className="mt-1 text-sm font-medium tabular-nums text-[var(--color-primary)]">
                {snapshot?.period.displayLabel ??
                  'Période en cours de chargement'}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="atlas-icon-button shrink-0"
              aria-label="Fermer la vue À ce moment-là"
            >
              <X className="size-5" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Cette synthèse reflète uniquement les données validées actuellement
            disponibles. Une personne vivante n’est pas nécessairement
            localisée, et une contemporanéité ne prouve jamais une rencontre.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {!snapshot ? (
            <EmptyState
              title="Période indisponible"
              message="Déplacez légèrement la frise puis réessayez."
              icon={<CalendarRange className="size-5" />}
            />
          ) : (
            <div className="space-y-8" aria-live="polite">
              {snapshot.isBroadPeriod && (
                <StatusNotice
                  title="Plage chronologique étendue"
                  message="Les résultats sont regroupés sur toute la plage. Les personnes et les présences affichées n’ont pas nécessairement coexisté pendant toute sa durée."
                />
              )}

              <SnapshotSection
                icon={<Users className="size-4" />}
                title="Personnes vivantes"
                count={snapshot.peopleLiving.length}
              >
                {snapshot.peopleLiving.length ? (
                  <div className="space-y-2">
                    {snapshot.peopleLiving.map(person => (
                      <EntityButton
                        key={person.personId}
                        title={person.name}
                        meta={
                          person.periodLabel
                            ? `Période de vie : ${person.periodLabel}`
                            : 'Chevauchement avec la période consultée'
                        }
                        level={person.knowledgeLevel}
                        onClick={() =>
                          navigate(() => onSelectPerson(person.personId))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="atlas-empty-row">
                    Aucune durée de vie validée ne permet de répondre pour
                    cette période.
                  </p>
                )}
              </SnapshotSection>

              <SnapshotSection
                icon={<Activity className="size-4" />}
                title="Personnes actives"
                count={snapshot.peopleActive.length}
              >
                {snapshot.peopleActive.length ? (
                  <div className="space-y-2">
                    {snapshot.peopleActive.map((person, index) => (
                      <EntityButton
                        key={`${person.personId}-${person.activityType}-${person.periodLabel}-${index}`}
                        title={person.name}
                        meta={[
                          person.activityLabel,
                          person.periodLabel
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        level={person.knowledgeLevel}
                        onClick={() =>
                          navigate(() => onSelectPerson(person.personId))
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="atlas-empty-row">
                    Aucune période d’activité validée ne recoupe la période
                    consultée.
                  </p>
                )}
              </SnapshotSection>

              <SnapshotSection
                icon={<CalendarRange className="size-4" />}
                title="Événements"
                count={snapshot.events.length}
              >
                {snapshot.events.length ? (
                  <div className="space-y-5">
                    {Object.entries(groupedEvents).map(
                      ([periodLabel, events]) => (
                        <div key={periodLabel}>
                          <p className="mb-2 text-xs font-semibold tabular-nums text-[var(--color-ink-muted)]">
                            {periodLabel}
                          </p>
                          <div className="space-y-2">
                            {events.map(event => (
                              <EntityButton
                                key={event.eventId}
                                title={event.name}
                                meta={
                                  event.placeIds.length
                                    ? event.placeIds
                                        .map(placeId =>
                                          HISTORICAL_SNAPSHOT_CATALOG.placeNamesById.get(
                                            placeId
                                          )
                                        )
                                        .filter(Boolean)
                                        .join(' · ')
                                    : 'Lieu non précisé'
                                }
                                level={event.knowledgeLevel}
                                onClick={() =>
                                  navigate(() =>
                                    onSelectEvent(event.eventId)
                                  )
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="atlas-empty-row">
                    Aucun événement validé n’est indexé dans cette période.
                  </p>
                )}
              </SnapshotSection>

              <SnapshotSection
                icon={<MapPin className="size-4" />}
                title="Présences documentées"
                count={snapshot.presences.reduce(
                  (count, group) => count + group.people.length,
                  0
                )}
              >
                {snapshot.presences.length ? (
                  <div className="space-y-4">
                    {snapshot.presences.map(group => (
                      <article
                        key={group.placeId}
                        className="border-l-2 border-[var(--color-mineral)] pl-3"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            navigate(() => onSelectPlace(group.placeId))
                          }
                          className="group flex min-h-11 w-full items-center gap-2 text-left"
                        >
                          <MapPin className="size-4 text-[var(--color-mineral)]" />
                          <span className="font-[var(--font-editorial)] text-lg font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">
                            {group.placeName}
                          </span>
                          <ArrowRight className="ml-auto size-4 text-[var(--color-stone)] group-hover:text-[var(--color-primary)]" />
                        </button>
                        <div className="space-y-2 pb-1">
                          {group.people.map(person => (
                            <button
                              type="button"
                              key={person.presenceId}
                              onClick={() =>
                                navigate(() =>
                                  onSelectPerson(person.personId)
                                )
                              }
                              className="flex min-h-12 w-full items-center gap-2 bg-[var(--color-paper-muted)] px-3 py-2 text-left hover:bg-[var(--color-mineral-soft)]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-[var(--color-ink)]">
                                  {person.name}
                                </span>
                                <span className="block text-xs text-[var(--color-ink-muted)]">
                                  {presenceTypeLabels[
                                    person.presenceType
                                  ] ?? person.presenceType}
                                  {' · '}
                                  {person.periodLabel}
                                </span>
                              </span>
                              <KnowledgeBadge
                                level={person.knowledgeLevel}
                              />
                            </button>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="atlas-empty-row">
                    Aucun épisode de présence validé n’est indexé dans cette
                    période.
                  </p>
                )}
              </SnapshotSection>

              <SnapshotSection
                icon={<Network className="size-4" />}
                title="Connexions remarquables"
                count={snapshot.connections.length}
              >
                {snapshot.connections.length ? (
                  <div className="space-y-2">
                    {snapshot.connections.map(connection => {
                      const isExpanded =
                        expandedConnectionId === connection.relationId;
                      return (
                        <article
                          key={connection.relationId}
                          className="border border-[var(--color-stone-light)] bg-[var(--color-paper-muted)]"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedConnectionId(previous =>
                                previous === connection.relationId
                                  ? null
                                  : connection.relationId
                              )
                            }
                            aria-expanded={isExpanded}
                            className="flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                                {connection.title}
                              </span>
                              <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                                {[
                                  connection.periodLabel,
                                  ...connection.eventNames
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            </span>
                            <KnowledgeBadge
                              level={connection.knowledgeLevel}
                            />
                            <ChevronDown
                              className={`size-4 shrink-0 text-[var(--color-ink-muted)] transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="border-t border-[var(--color-stone-light)] bg-[var(--color-paper)] p-4">
                              <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
                                {connection.explanation}
                              </p>
                              {connection.placeIds.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {connection.placeIds.map(
                                    (placeId, index) => (
                                      <button
                                        type="button"
                                        key={placeId}
                                        onClick={() =>
                                          navigate(() =>
                                            onSelectPlace(placeId)
                                          )
                                        }
                                        className="atlas-chip min-h-10"
                                      >
                                        <MapPin className="size-3.5" />
                                        {connection.placeNames[index]}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                              {connection.eventIds.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {connection.eventIds.map(
                                    (eventId, index) => (
                                      <button
                                        type="button"
                                        key={eventId}
                                        onClick={() =>
                                          navigate(() =>
                                            onSelectEvent(eventId)
                                          )
                                        }
                                        className="atlas-chip min-h-10"
                                      >
                                        <CalendarRange className="size-3.5" />
                                        {connection.eventNames[index]}
                                      </button>
                                    )
                                  )}
                                </div>
                              )}

                              <h4 className="mt-5 flex items-center gap-2 text-xs font-bold text-[var(--color-ink)]">
                                <Link2 className="size-3.5 text-[var(--color-bronze)]" />
                                Preuves utilisées
                              </h4>
                              <div className="mt-2 space-y-3">
                                {connection.proofs.map(proof => (
                                  <div
                                    key={proof.claimId}
                                    className="border-l-2 border-[var(--color-bronze)] pl-3"
                                  >
                                    <p className="text-xs font-semibold text-[var(--color-ink)]">
                                      {proof.predicate}
                                    </p>
                                    {proof.evidence.map(
                                      (evidence, index) => (
                                        <div
                                          key={`${proof.claimId}-${evidence.sourceId}-${index}`}
                                          className="mt-2 text-xs leading-relaxed text-[var(--color-ink-soft)]"
                                        >
                                          <p>
                                            {
                                              evidenceMethodLabels[
                                                evidence.method
                                              ]
                                            }
                                            {' · '}
                                            {evidence.shortReference}
                                          </p>
                                          {evidence.sourceUrl ? (
                                            <a
                                              href={evidence.sourceUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="mt-1 inline-flex min-h-10 items-center gap-1.5 font-semibold text-[var(--color-primary)] hover:underline"
                                            >
                                              {evidence.sourceTitle}
                                              <ExternalLink className="size-3" />
                                            </a>
                                          ) : (
                                            <p className="mt-1 font-semibold">
                                              {evidence.sourceTitle}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="atlas-empty-row">
                    Aucune connexion de même lieu, de même événement ou
                    interaction attestée n’est indexée ici.
                  </p>
                )}
              </SnapshotSection>

              <SnapshotSection
                icon={<ShieldQuestion className="size-4" />}
                title="Informations incertaines"
                count={
                  snapshot.uncertainResultCount +
                  snapshot.unknownLocations.length
                }
              >
                {snapshot.unknownLocations.length > 0 && (
                  <div className="space-y-2">
                    {snapshot.unknownLocations.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() =>
                          navigate(() =>
                            onSelectPerson(item.personId)
                          )
                        }
                        className="flex min-h-14 w-full items-center gap-3 border-l-2 border-[var(--color-ink-muted)] bg-[var(--color-paper-muted)] px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[var(--color-ink)]">
                            {item.personName}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-ink-muted)]">
                            {item.eventName
                              ? `${item.eventName} · `
                              : ''}
                            {item.explanation}
                          </span>
                        </span>
                        <KnowledgeBadge level="unknown-location" />
                      </button>
                    ))}
                  </div>
                )}
                {snapshot.uncertainResultCount > 0 && (
                  <StatusNotice
                    title={`${snapshot.uncertainResultCount} résultat${
                      snapshot.uncertainResultCount > 1 ? 's' : ''
                    } à lire avec prudence`}
                    message="Ils sont signalés directement dans les sections précédentes par les mentions « Probable » ou « Possible »."
                    variant="warning"
                  />
                )}
                {!snapshot.unknownLocations.length &&
                  !snapshot.uncertainResultCount && (
                    <p className="atlas-empty-row">
                      Aucun résultat affiché ne porte actuellement un niveau
                      probable, possible ou une localisation inconnue.
                    </p>
                  )}
              </SnapshotSection>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
