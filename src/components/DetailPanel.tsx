import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveTab,
  BiblicalPlace,
  BiblicalRoute,
  CategoryData,
  CertaintyLevel,
  EncyclopediaReference,
  EventData,
  SourceReference
} from '../types';
import { formatEventSpan } from '../utils/dateUtils';
import type { BiblicalPerson } from '../domain/history/types';
import {
  getActiveProphetsDuringReign,
  getCalculatedDatesForPerson,
  HISTORICAL_METHODOLOGY_CATALOG,
  getContemporaryKingsForProphet,
  type HistoricalPersonAssociation
} from '../data/historicalStudyData';
import { formatTemporalSpanFrench } from '../domain/history/temporal';
import { buildEntityMethodology } from '../domain/history/entityMethodology';
import {
  getBibleReferenceTarget,
  getDocumentaryReferenceTarget,
  getJwDocumentTarget,
  JwReferenceTarget
} from '../utils/jwLinks';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  ExternalLink,
  FileText,
  HelpCircle,
  Library,
  MapPin,
  Navigation,
  Network,
  User,
  X
} from 'lucide-react';
import { GeographicProvenancePanel } from './GeographicProvenancePanel';
import { HistoricalCalculationPanel } from './HistoricalCalculationPanel';
import { MediaHeader } from './MediaHeader';
import { PersonChronologySummary } from './PersonChronologySummary';
import { SourcesAndMethodPanel } from './SourcesAndMethodPanel';

type DetailSection = 'overview' | 'relations' | 'references';

interface DetailPanelProps {
  selectedEvent: EventData | null;
  selectedPlace: BiblicalPlace | null;
  selectedRoute: BiblicalRoute | null;
  selectedPerson: BiblicalPerson | null;
  categories: CategoryData[];
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  events: EventData[];
  people: BiblicalPerson[];
  onClose: () => void;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectEvent: (event: EventData) => void;
  onSelectRoute: (route: BiblicalRoute) => void;
  onSelectPerson: (personId: string) => void;
  onSwitchTab: (tab: ActiveTab) => void;
  hideOnMobile?: boolean;
}

const SectionTitle = ({
  icon,
  children
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
    <span className="text-[var(--color-bronze)]">{icon}</span>
    {children}
  </h3>
);

const RelationButton = ({
  title,
  meta,
  icon,
  onClick
}: {
  key?: React.Key;
  title: string;
  meta?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group flex min-h-14 w-full items-center gap-3 border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] p-3 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
  >
    <span className="grid size-9 shrink-0 place-items-center text-[var(--color-primary)]">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
        {title}
      </span>
      {meta && (
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-muted)]">
          {meta}
        </span>
      )}
    </span>
    <ArrowRight className="size-4 text-[var(--color-stone)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
  </button>
);

const ReferenceList = ({
  title,
  values,
  kind
}: {
  title: string;
  values: string[];
  kind: 'bible' | 'documentary';
}) => {
  if (!values.length) return null;
  return (
    <section>
      <SectionTitle icon={<BookOpen className="size-4" />}>{title}</SectionTitle>
      <div className="space-y-2">
        {values.map(reference => {
          const target =
            kind === 'bible'
              ? getBibleReferenceTarget(reference)
              : getDocumentaryReferenceTarget(reference);

          return target ? (
            <JwReferenceRow
              key={reference}
              label={reference}
              target={target}
              accent={kind === 'bible' ? 'indigo' : 'slate'}
            />
          ) : (
            <span
              key={reference}
              className="block border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] px-3 py-2 text-xs font-medium text-[var(--color-ink-soft)]"
            >
              {reference}
            </span>
          );
        })}
      </div>
    </section>
  );
};

const JwReferenceRow = ({
  label,
  target,
  accent = 'indigo'
}: {
  key?: React.Key;
  label: string;
  target: JwReferenceTarget;
  accent?: 'indigo' | 'slate';
}) => (
  <div
    className={`flex overflow-hidden border-l-2 bg-[var(--color-paper-muted)] ${
      accent === 'indigo'
        ? 'border-[var(--color-primary)]'
        : 'border-[var(--color-stone)]'
    }`}
  >
    <a
      href={target.finderUrl}
      target="_blank"
      rel="noreferrer"
      title="Ouvrir avec JW Library si disponible"
      className={`group flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
        accent === 'indigo'
          ? 'text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-soft)]'
          : 'text-[var(--color-ink)] hover:bg-[var(--color-stone-light)]'
      }`}
    >
      <BookOpen
        className={`size-4 shrink-0 ${
          accent === 'indigo'
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-ink-muted)]'
        }`}
      />
      <span className="min-w-0 flex-1">{label}</span>
      <span className="hidden shrink-0 bg-[var(--color-primary-dark)] px-1.5 py-0.5 text-xs font-semibold text-white sm:inline">
        JW Library
      </span>
      <ExternalLink className="size-3.5 shrink-0 opacity-50 transition group-hover:opacity-100" />
    </a>
    <a
      href={target.wolUrl}
      target="_blank"
      rel="noreferrer"
      title="Ouvrir directement dans la Bibliothèque en ligne"
      aria-label={`${label} sur WOL`}
      className="grid min-w-12 shrink-0 place-items-center border-l border-[var(--color-stone-light)] px-3 text-xs font-semibold text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
    >
      WOL
    </a>
  </div>
);

const SourcesList = ({ sources }: { sources: SourceReference[] }) => {
  if (!sources.length) return null;
  return (
    <section>
      <SectionTitle icon={<Library className="size-4" />}>Sources</SectionTitle>
      <div className="space-y-2">
        {sources.map(source => {
          const jwTarget = source.url
            ? getJwDocumentTarget(source.url)
            : null;
          const content = (
            <>
              <span className="block text-sm font-semibold text-[var(--color-ink)]">
                {source.label}
              </span>
              {source.citation && (
                <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                  {source.citation}
                </span>
              )}
            </>
          );
          return jwTarget ? (
            <div
              key={source.id}
              className="flex overflow-hidden border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] transition-colors hover:border-[var(--color-primary)]"
            >
              <a
                href={jwTarget.finderUrl}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir avec JW Library si disponible"
                className="group flex min-w-0 flex-1 items-center gap-3 p-3"
              >
                <span className="min-w-0 flex-1">{content}</span>
                <ExternalLink className="size-4 shrink-0 text-[var(--color-ink-muted)] transition group-hover:text-[var(--color-primary)]" />
              </a>
              <a
                href={jwTarget.wolUrl}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir directement dans la Bibliothèque en ligne"
                aria-label={`${source.label} sur WOL`}
                className="grid min-w-12 shrink-0 place-items-center border-l border-[var(--color-stone-light)] px-3 text-xs font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]"
              >
                WOL
              </a>
            </div>
          ) : source.url ? (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] p-3 transition-colors hover:border-[var(--color-primary)]"
            >
              {content}
            </a>
          ) : (
            <div
              key={source.id}
              className="border-l-2 border-[var(--color-stone)] bg-[var(--color-paper-muted)] p-3"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
};

const EncyclopediaReferences = ({
  references
}: {
  references: EncyclopediaReference[];
}) => {
  if (!references.length) return null;

  return (
    <section>
      <SectionTitle icon={<Library className="size-4" />}>
        {references.some(reference => reference.work === 'wol')
          ? 'Étude perspicace et WOL'
          : 'Étude perspicace'}
      </SectionTitle>
      <div className="space-y-2">
        {references.map(reference => {
          const jwTarget = getJwDocumentTarget(
            reference.url,
            reference.work === 'insight' ? 'insight' : 'publication'
          );
          const usesConvertedName =
            reference.linkedName &&
            reference.linkedName.localeCompare(reference.articleTitle, 'fr', {
              sensitivity: 'base'
            }) !== 0;

          const content = (
            <>
              <span className="grid size-10 shrink-0 place-items-center text-[var(--color-bronze)]">
                <BookOpen className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--color-ink)]">
                  {reference.articleTitle}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                  {reference.work === 'wol'
                    ? 'Documentation WOL complémentaire'
                    : reference.matchType === 'article-mention'
                      ? 'Article d’Étude perspicace contenant ce lieu'
                      : usesConvertedName
                        ? `Correspondance de « ${reference.linkedName} » dans l’édition Rbi8`
                        : 'Article encyclopédique correspondant'}
                </span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-[var(--color-bronze)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </>
          );

          return jwTarget ? (
            <div
              key={reference.id}
              className="flex overflow-hidden border-l-2 border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/65 transition-colors hover:bg-[var(--color-bronze-soft)]"
            >
              <a
                href={jwTarget.finderUrl}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir avec JW Library si disponible"
                className="group flex min-w-0 flex-1 items-center gap-3 p-3"
              >
                {content}
              </a>
              <a
                href={jwTarget.wolUrl}
                target="_blank"
                rel="noreferrer"
                title="Ouvrir directement dans la Bibliothèque en ligne"
                aria-label={`${reference.articleTitle} sur WOL`}
                className="grid min-w-12 shrink-0 place-items-center border-l border-[var(--color-bronze)]/25 px-3 text-xs font-semibold text-[var(--color-bronze)] hover:bg-[var(--color-paper)]/45"
              >
                WOL
              </a>
            </div>
          ) : (
            <a
              key={reference.id}
              href={reference.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 border-l-2 border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/65 p-3 transition-colors hover:bg-[var(--color-bronze-soft)]"
            >
              {content}
            </a>
          );
        })}
      </div>
    </section>
  );
};

const certaintyLabels: Record<CertaintyLevel, string> = {
  certain: 'Établi',
  probable: 'Probable',
  possible: 'Possible',
  unknown: 'Non précisé'
};

const routeNatureLabels: Record<NonNullable<BiblicalRoute['routeNature']>, string> = {
  documented: 'Déplacement documenté',
  reconstructed: 'Déplacement reconstitué',
  schematic: 'Déplacement schématique'
};
const routePrecisionLabels: Record<NonNullable<BiblicalRoute['tracePrecision']>, string> = {
  exact: 'tracé exact',
  approximate: 'tracé approximatif',
  'indicative-place-sequence': 'liaison indicative entre lieux connus'
};
const routeStepOrderLabels: Record<NonNullable<BiblicalRoute['stepOrder']>, string> = {
  'source-chronology': 'ordre chronologique de la source',
  'documented-sequence': 'ordre des étapes explicitement documenté'
};

const associationStatusLabels: Record<
  HistoricalPersonAssociation['status'],
  string
> = {
  'calculated-overlap': 'Chevauchement calculé',
  'biblically-attested': 'Relation bibliquement attestée',
  'documented-interaction': 'Interaction directement documentée'
};

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedEvent,
  selectedPlace,
  selectedRoute,
  selectedPerson,
  categories,
  places,
  routes,
  events,
  people,
  onClose,
  onSelectPlace,
  onSelectEvent,
  onSelectRoute,
  onSelectPerson,
  onSwitchTab,
  hideOnMobile = false
}) => {
  const [activeSection, setActiveSection] =
    useState<DetailSection>('overview');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveSection('overview');
  }, [
    selectedEvent?.id,
    selectedPlace?.id,
    selectedRoute?.id,
    selectedPerson?.id
  ]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [
    activeSection,
    selectedEvent?.id,
    selectedPlace?.id,
    selectedRoute?.id,
    selectedPerson?.id
  ]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const linkedEvents = useMemo(() => {
    const eventIds = selectedPlace
      ? selectedPlace.associatedEventIds || []
      : selectedPerson?.associatedEventIds || [];
    return eventIds
      .map(id => events.find(event => event.id === id))
      .filter((event): event is EventData => Boolean(event));
  }, [selectedPlace, selectedPerson, events]);

  const linkedCharacters = useMemo(() => {
    if (!selectedPlace) return [];
    return (selectedPlace.associatedCharacterIds || [])
      .map(id => events.find(event => event.id === id))
      .filter((event): event is EventData => Boolean(event));
  }, [selectedPlace, events]);

  if (
    !selectedEvent &&
    !selectedPlace &&
    !selectedRoute &&
    !selectedPerson
  ) {
    return null;
  }

  const title =
    selectedEvent?.text ||
    selectedPlace?.name ||
    selectedRoute?.name ||
    selectedPerson?.name ||
    '';
  const type = selectedEvent
    ? selectedEvent.category
    : selectedPlace
      ? selectedPlace.category || 'Lieu biblique'
      : selectedRoute
        ? 'Itinéraire'
        : 'Personnage biblique';
  const description =
    selectedEvent?.description ||
    selectedPlace?.description ||
    selectedRoute?.description ||
    selectedPerson?.description;
  const certainty =
    selectedEvent?.certainty ||
    selectedPlace?.certainty ||
    selectedRoute?.certainty ||
    selectedPerson?.certainty;
  const notes =
    selectedEvent?.notes ||
    selectedPlace?.notes ||
    selectedRoute?.notes ||
    selectedPerson?.notes;
  const biblicalReferences =
    selectedEvent?.biblicalReferences ||
    selectedPlace?.biblicalReferences ||
    selectedRoute?.biblicalReferences ||
    selectedPerson?.biblicalReferences ||
    [];
  const documentaryReferences =
    selectedEvent?.documentaryReferences ||
    selectedPlace?.documentaryReferences ||
    selectedRoute?.documentaryReferences ||
    selectedPerson?.documentaryReferences ||
    [];
  const sources =
    selectedEvent?.sources ||
    selectedPlace?.sources ||
    selectedRoute?.sources ||
    selectedPerson?.sources ||
    [];
  const encyclopediaReferences =
    selectedEvent?.encyclopediaReferences ||
    selectedPlace?.encyclopediaReferences ||
    selectedRoute?.encyclopediaReferences ||
    selectedPerson?.encyclopediaReferences ||
    [];
  const category = selectedEvent
    ? categories.find(
        item =>
          item.id === selectedEvent.categoryId ||
          item.name === selectedEvent.category
      )
    : null;

  const routePlaces = selectedRoute
    ? selectedRoute.points
        .map(point => ({
          point,
          place: places.find(place => place.id === point.placeId)
        }))
        .filter(
          (
            relation
          ): relation is {
            point: BiblicalRoute['points'][number];
            place: BiblicalPlace;
          } => Boolean(relation.place)
        )
    : [];

  const relatedRoutes = selectedEvent
    ? (selectedEvent.associatedRouteIds || [])
        .map(id => routes.find(route => route.id === id))
        .filter((route): route is BiblicalRoute => Boolean(route))
    : selectedPlace
      ? (selectedPlace.routeIds || [])
          .map(id => routes.find(route => route.id === id))
          .filter((route): route is BiblicalRoute => Boolean(route))
      : selectedPerson
        ? (selectedPerson.associatedRouteIds || [])
            .map(id => routes.find(route => route.id === id))
            .filter((route): route is BiblicalRoute => Boolean(route))
        : [];

  const relatedPlaces = selectedEvent
    ? (selectedEvent.associatedLocationIds || [])
        .map(id => places.find(place => place.id === id))
        .filter((place): place is BiblicalPlace => Boolean(place))
      : selectedPerson
        ? (selectedPerson.associatedLocationIds || [])
            .map(id => places.find(place => place.id === id))
            .filter((place): place is BiblicalPlace => Boolean(place))
        : [];
  const relatedPeople = selectedPerson
    ? (selectedPerson.associatedPersonIds || [])
        .map(id => people.find(person => person.id === id))
        .filter((person): person is BiblicalPerson => Boolean(person))
    : [];
  const profilePerson =
    selectedPerson ??
    people.find(person => person.id === selectedEvent?.historicalPersonId) ??
    people.find(person => person.legacyEventId === selectedEvent?.id);
  const activeProphets = profilePerson
    ? getActiveProphetsDuringReign(profilePerson.id)
    : [];
  const contemporaryKings = profilePerson
    ? getContemporaryKingsForProphet(profilePerson.id)
    : [];
  const media =
    selectedEvent?.media ||
    selectedPlace?.media ||
    selectedRoute?.media ||
    selectedPerson?.media;
  const geographicProvenance =
    selectedEvent?.geographicProvenance ||
    selectedPlace?.geographicProvenance ||
    selectedRoute?.geographicProvenance ||
    selectedPerson?.geographicProvenance ||
    [];
  const calculatedDates = profilePerson
    ? getCalculatedDatesForPerson(profilePerson.id)
    : [];
  const methodologyEntity = (
    selectedEvent ?? selectedPlace ?? selectedRoute ?? selectedPerson
  )!;
  const methodology = buildEntityMethodology(
    selectedEvent
      ? 'event'
      : selectedPlace
        ? 'place'
        : selectedRoute
          ? 'route'
          : 'person',
    methodologyEntity,
    HISTORICAL_METHODOLOGY_CATALOG
  );

  return (
    <aside
      aria-label={`Fiche documentaire : ${title}`}
      data-testid="detail-panel"
      className={`atlas-enter fixed inset-x-0 bottom-16 z-50 max-h-[82dvh] flex-col overflow-hidden rounded-t-[var(--radius-xl)] border-t border-[var(--color-stone-light)] bg-[var(--color-paper)] shadow-[var(--shadow-3)] md:bottom-0 lg:static lg:z-auto lg:h-full lg:max-h-none lg:w-[440px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none xl:w-[460px] ${
        hideOnMobile ? 'hidden md:flex' : 'flex'
      }`}
    >
      <div className="relative shrink-0">
        <MediaHeader
          title={title}
          type={type}
          media={media}
          coordinates={selectedPlace?.coordinates}
          accentColor={category?.hexColor}
        />
        <button
          onClick={onClose}
          className="atlas-icon-button absolute right-4 top-4 border-white/20 bg-[var(--color-ink)]/45 text-white hover:bg-[var(--color-ink)]/70"
          aria-label="Fermer la fiche"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Sections de la fiche"
        className="grid shrink-0 grid-cols-3 gap-1 border-b border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] p-2"
      >
        {[
          { id: 'overview' as const, label: 'Présentation', icon: FileText },
          { id: 'relations' as const, label: 'Relations', icon: Network },
          { id: 'references' as const, label: 'Références', icon: Library }
        ].map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(section.id)}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-[var(--color-paper)] text-[var(--color-primary-dark)] shadow-[var(--shadow-1)]'
                  : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={contentRef}
        role="tabpanel"
        className="flex-1 space-y-8 overflow-y-auto bg-[var(--color-paper)] p-5 sm:p-6"
      >
        {activeSection === 'overview' && (
          <>
            <SectionTitle icon={<FileText className="size-4" />}>
              En bref
            </SectionTitle>
            {selectedEvent && (
              <div className="flex items-center gap-2 border-l-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-primary-dark)]">
                <Calendar className="size-4 shrink-0" />
                {formatEventSpan(
                  selectedEvent.startYear,
                  selectedEvent.endYear,
                  selectedEvent.isPoint,
                  selectedEvent.fuzzyStart,
                  selectedEvent.fuzzyEnd
                )}
              </div>
            )}

            {profilePerson && <PersonChronologySummary person={profilePerson} />}

            {calculatedDates.length > 0 && (
              <HistoricalCalculationPanel items={calculatedDates} />
            )}

            {profilePerson?.sourceTimelineWindows?.map(window => (
              <div
                key={window.id}
                className="border-l-2 border-dashed border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/45 px-4 py-3"
              >
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  Fenêtre chronologique collective ·{' '}
                  {formatTemporalSpanFrench(window.span)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Cette barre situe un groupe dans la frise source. Elle ne
                  constitue pas une date individuelle de naissance ou de décès
                  et ne génère aucun contemporain.
                </p>
              </div>
            ))}


            {selectedPlace?.periodDescription && (
              <div className="flex items-start gap-3 border-l-2 border-[var(--color-mineral)] bg-[var(--color-mineral-soft)] p-4">
                <Calendar className="mt-0.5 size-4 shrink-0 text-[var(--color-mineral)]" />
                <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                  {selectedPlace.periodDescription}
                </p>
              </div>
            )}

            {selectedRoute && (
              <div className="flex items-start gap-3 border-l-2 border-[var(--color-olive)] bg-[var(--color-olive-soft)] p-4">
                <Navigation className="mt-0.5 size-4 shrink-0 text-[var(--color-olive)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {selectedRoute.points.length} étapes
                    {selectedRoute.startYear !== undefined &&
                      ` · ${selectedRoute.startYear} à ${selectedRoute.endYear}`}
                  </p>
                  {(selectedRoute.routeNature ||
                    selectedRoute.tracePrecision ||
                    selectedRoute.stepOrder) && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                      {[
                        selectedRoute.routeNature && routeNatureLabels[selectedRoute.routeNature],
                        selectedRoute.tracePrecision && routePrecisionLabels[selectedRoute.tracePrecision],
                        selectedRoute.stepOrder && routeStepOrderLabels[selectedRoute.stepOrder]
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedPlace?.alternateNames?.length ? (
              <p className="text-xs italic text-[var(--color-ink-muted)]">
                Aussi nommé : {selectedPlace.alternateNames.join(', ')}
              </p>
            ) : null}
            {selectedPerson?.alternateNames?.length ? (
              <p className="text-xs italic text-[var(--color-ink-muted)]">
                Aussi nommé : {selectedPerson.alternateNames.join(', ')}
              </p>
            ) : null}

            <div className="bg-[var(--color-paper-muted)] p-4">
              <p className="text-[15px] leading-7 text-[var(--color-ink-soft)]">
                {description || 'Aucune présentation détaillée disponible.'}
              </p>
            </div>

            {certainty && (
              <div className="flex items-center gap-3">
                {certainty === 'certain' ? (
                  <CheckCircle2 className="size-5 text-emerald-600" />
                ) : (
                  <HelpCircle className="size-5 text-amber-600" />
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Degré de certitude
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {certaintyLabels[certainty]}
                  </p>
                </div>
              </div>
            )}

            {notes && (
              <div className="border-l-2 border-indigo-300 pl-4 text-sm leading-relaxed text-slate-600">
                {notes}
              </div>
            )}

            <GeographicProvenancePanel items={geographicProvenance} />
            <SourcesAndMethodPanel methodology={methodology} />
          </>
        )}

        {activeSection === 'relations' && (
          <div className="space-y-6">
            <SectionTitle icon={<Network className="size-4" />}>
              Personnes, lieux et événements liés
            </SectionTitle>
            {activeProphets.length > 0 && (
              <section>
                <SectionTitle icon={<User className="size-4" />}>
                  Prophètes actifs pendant son règne
                </SectionTitle>
                <div className="space-y-2">
                  {activeProphets.map(association => (
                    <RelationButton
                      key={association.personId}
                      title={association.name}
                      meta={`${association.contextLabel ? `${association.contextLabel} · ` : ''}${associationStatusLabels[association.status]}${association.periodLabel ? ` · ${association.periodLabel}` : ''}`}
                      icon={<User className="size-4" />}
                      onClick={() => onSelectPerson(association.personId)}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Un chevauchement de périodes ne prouve ni une rencontre ni
                  une présence dans la même ville.
                </p>
              </section>
            )}

            {contemporaryKings.length > 0 && (
              <section>
                <SectionTitle icon={<User className="size-4" />}>
                  Rois contemporains
                </SectionTitle>
                <div className="space-y-2">
                  {contemporaryKings.map(association => (
                    <RelationButton
                      key={association.personId}
                      title={association.name}
                      meta={`${association.contextLabel ? `${association.contextLabel} · ` : ''}${associationStatusLabels[association.status]}${association.periodLabel ? ` · ${association.periodLabel}` : ''}`}
                      icon={<User className="size-4" />}
                      onClick={() => onSelectPerson(association.personId)}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Ces contemporanéités sont calculées à partir des périodes
                  relues. Une interaction n’est indiquée que lorsqu’un passage
                  la documente directement.
                </p>
              </section>
            )}
            {relatedPlaces.length > 0 && (
              <section>
                <SectionTitle icon={<MapPin className="size-4" />}>
                  Lieux associés
                </SectionTitle>
                <div className="space-y-2">
                  {relatedPlaces.map(place => (
                    <RelationButton
                      key={place.id}
                      title={place.name}
                      meta={place.territory || place.category}
                      icon={<MapPin className="size-4" />}
                      onClick={() => {
                        onSelectPlace(place);
                        onSwitchTab('map');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {linkedEvents.length > 0 && (
              <section>
                <SectionTitle icon={<Calendar className="size-4" />}>
                  Événements associés
                </SectionTitle>
                <div className="space-y-2">
                  {linkedEvents.map(event => (
                    <RelationButton
                      key={event.id}
                      title={event.text}
                      meta={event.category}
                      icon={<Calendar className="size-4" />}
                      onClick={() => {
                        onSelectEvent(event);
                        onSwitchTab('timeline');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {linkedCharacters.length > 0 && (
              <section>
                <SectionTitle icon={<User className="size-4" />}>
                  Personnages associés
                </SectionTitle>
                <div className="space-y-2">
                  {linkedCharacters.map(character => (
                    <RelationButton
                      key={character.id}
                      title={character.text}
                      meta={formatEventSpan(
                        character.startYear,
                        character.endYear,
                        character.isPoint,
                        character.fuzzyStart,
                        character.fuzzyEnd
                      )}
                      icon={<User className="size-4" />}
                      onClick={() => {
                        onSelectEvent(character);
                        onSwitchTab('timeline');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {relatedPeople.length > 0 && (
              <section>
                <SectionTitle icon={<User className="size-4" />}>
                  Personnes associées
                </SectionTitle>
                <div className="space-y-2">
                  {relatedPeople.map(person => (
                    <RelationButton
                      key={person.id}
                      title={person.name}
                      meta={
                        person.lifeSpan
                          ? formatTemporalSpanFrench(person.lifeSpan)
                          : 'Période de vie non précisée'
                      }
                      icon={<User className="size-4" />}
                      onClick={() => onSelectPerson(person.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {relatedRoutes.length > 0 && (
              <section>
                <SectionTitle icon={<Navigation className="size-4" />}>
                  Itinéraires associés
                </SectionTitle>
                <div className="space-y-2">
                  {relatedRoutes.map(route => (
                    <RelationButton
                      key={route.id}
                      title={route.name}
                      meta={`${route.points.length} étapes`}
                      icon={<Navigation className="size-4" />}
                      onClick={() => {
                        onSelectRoute(route);
                        onSwitchTab('map');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {routePlaces.length > 0 && (
              <section>
                <SectionTitle icon={<Compass className="size-4" />}>
                  Étapes de l’itinéraire
                </SectionTitle>
                <div className="space-y-2">
                  {routePlaces.map(({ point, place }) => (
                    <RelationButton
                      key={point.id || `${selectedRoute?.id}-${point.stepNumber}`}
                      title={`${point.stepNumber}. ${point.name}`}
                      meta={point.description}
                      icon={<MapPin className="size-4" />}
                      onClick={() => {
                        onSelectPlace(place);
                        onSwitchTab('map');
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {!relatedPlaces.length &&
              !linkedEvents.length &&
              !linkedCharacters.length &&
              !relatedPeople.length &&
              !relatedRoutes.length &&
              !routePlaces.length &&
              !activeProphets.length &&
              !contemporaryKings.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Aucune relation structurée disponible.
                </p>
              )}
          </div>
        )}

        {activeSection === 'references' && (
          <div className="space-y-6">
            <SectionTitle icon={<Library className="size-4" />}>
              Références et sources
            </SectionTitle>
            <ReferenceList
              title="Références bibliques"
              values={biblicalReferences}
              kind="bible"
            />
            <ReferenceList
              title="Références documentaires"
              values={documentaryReferences}
              kind="documentary"
            />
            <EncyclopediaReferences references={encyclopediaReferences} />
            <SourcesList sources={sources} />
            {!biblicalReferences.length &&
              !documentaryReferences.length &&
              !encyclopediaReferences.length &&
              !sources.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Aucune référence structurée disponible pour cette fiche.
                </p>
              )}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] p-4">
        {selectedEvent ? (
          <button
            onClick={() => onSwitchTab('timeline')}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]"
          >
            <Calendar className="size-4" />
            Voir dans la frise
          </button>
        ) : selectedPerson ? (
          selectedPerson.legacyEventId &&
          events.find(event => event.id === selectedPerson.legacyEventId) ? (
            <button
              onClick={() => {
                const legacyEvent = events.find(
                  event => event.id === selectedPerson.legacyEventId
                );
                if (legacyEvent) onSelectEvent(legacyEvent);
                onSwitchTab('timeline');
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]"
            >
              <Calendar className="size-4" />
              Voir sa période dans la frise
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]"
            >
              <User className="size-4" />
              Fermer la fiche
            </button>
          )
        ) : (
          <button
            onClick={() => onSwitchTab('map')}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-primary-dark)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]"
          >
            <MapPin className="size-4" />
            Voir sur la carte
          </button>
        )}
      </div>
    </aside>
  );
};
