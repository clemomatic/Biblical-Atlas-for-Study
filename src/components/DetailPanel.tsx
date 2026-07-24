import React, { useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  BiblicalPlace,
  BiblicalRoute,
  CategoryData,
  CertaintyLevel,
  EventData,
  SourceReference
} from '../types';
import { formatEventSpan } from '../utils/dateUtils';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  FileText,
  HelpCircle,
  Library,
  MapPin,
  Navigation,
  Network,
  User,
  X
} from 'lucide-react';

type DetailSection = 'overview' | 'relations' | 'references';

interface DetailPanelProps {
  selectedEvent: EventData | null;
  selectedPlace: BiblicalPlace | null;
  selectedRoute: BiblicalRoute | null;
  categories: CategoryData[];
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  events: EventData[];
  onClose: () => void;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectEvent: (event: EventData) => void;
  onSelectRoute: (route: BiblicalRoute) => void;
  onSwitchTab: (tab: ActiveTab) => void;
}

const SectionTitle = ({
  icon,
  children
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
    <span className="text-indigo-600">{icon}</span>
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
    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:shadow-sm"
  >
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-indigo-600">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-slate-900">
        {title}
      </span>
      {meta && (
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {meta}
        </span>
      )}
    </span>
    <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
  </button>
);

const ReferenceList = ({
  title,
  values
}: {
  title: string;
  values: string[];
}) => {
  if (!values.length) return null;
  return (
    <section>
      <SectionTitle icon={<BookOpen className="size-4" />}>{title}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {values.map(reference => (
          <span
            key={reference}
            className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-900"
          >
            {reference}
          </span>
        ))}
      </div>
    </section>
  );
};

const SourcesList = ({ sources }: { sources: SourceReference[] }) => {
  if (!sources.length) return null;
  return (
    <section>
      <SectionTitle icon={<Library className="size-4" />}>Sources</SectionTitle>
      <div className="space-y-2">
        {sources.map(source => {
          const content = (
            <>
              <span className="block text-sm font-semibold text-slate-900">
                {source.label}
              </span>
              {source.citation && (
                <span className="mt-0.5 block text-xs text-slate-500">
                  {source.citation}
                </span>
              )}
            </>
          );
          return source.url ? (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:shadow-sm"
            >
              {content}
            </a>
          ) : (
            <div
              key={source.id}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              {content}
            </div>
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

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedEvent,
  selectedPlace,
  selectedRoute,
  categories,
  places,
  routes,
  events,
  onClose,
  onSelectPlace,
  onSelectEvent,
  onSelectRoute,
  onSwitchTab
}) => {
  const [activeSection, setActiveSection] =
    useState<DetailSection>('overview');

  useEffect(() => {
    setActiveSection('overview');
  }, [selectedEvent?.id, selectedPlace?.id, selectedRoute?.id]);

  const linkedEvents = useMemo(() => {
    if (!selectedPlace) return [];
    return (selectedPlace.associatedEventIds || [])
      .map(id => events.find(event => event.id === id))
      .filter((event): event is EventData => Boolean(event));
  }, [selectedPlace, events]);

  const linkedCharacters = useMemo(() => {
    if (!selectedPlace) return [];
    return (selectedPlace.associatedCharacterIds || [])
      .map(id => events.find(event => event.id === id))
      .filter((event): event is EventData => Boolean(event));
  }, [selectedPlace, events]);

  if (!selectedEvent && !selectedPlace && !selectedRoute) return null;

  const title =
    selectedEvent?.text || selectedPlace?.name || selectedRoute?.name || '';
  const type = selectedEvent
    ? selectedEvent.category
    : selectedPlace
      ? selectedPlace.category || 'Lieu biblique'
      : 'Itinéraire';
  const description =
    selectedEvent?.description ||
    selectedPlace?.description ||
    selectedRoute?.description;
  const certainty =
    selectedEvent?.certainty ||
    selectedPlace?.certainty ||
    selectedRoute?.certainty;
  const notes =
    selectedEvent?.notes || selectedPlace?.notes || selectedRoute?.notes;
  const biblicalReferences =
    selectedEvent?.biblicalReferences ||
    selectedPlace?.biblicalReferences ||
    selectedRoute?.biblicalReferences ||
    [];
  const documentaryReferences =
    selectedEvent?.documentaryReferences ||
    selectedPlace?.documentaryReferences ||
    selectedRoute?.documentaryReferences ||
    [];
  const sources =
    selectedEvent?.sources ||
    selectedPlace?.sources ||
    selectedRoute?.sources ||
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
      : [];

  const relatedPlaces = selectedEvent
    ? (selectedEvent.associatedLocationIds || [])
        .map(id => places.find(place => place.id === id))
        .filter((place): place is BiblicalPlace => Boolean(place))
    : [];

  return (
    <aside className="fixed inset-x-0 bottom-16 z-50 flex max-h-[78dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-slate-200 bg-slate-50 shadow-2xl md:bottom-0 lg:static lg:z-auto lg:h-full lg:max-h-none lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none">
      <div className="border-b border-slate-200 bg-white px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full bg-cyan-500"
                style={
                  category ? { backgroundColor: category.hexColor } : undefined
                }
              />
              <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">
                {type}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold leading-tight text-slate-950">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Fermer la fiche"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
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
                onClick={() => setActiveSection(section.id)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="size-3.5" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {activeSection === 'overview' && (
          <>
            {selectedEvent && (
              <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900">
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

            {selectedPlace?.periodDescription && (
              <div className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <Calendar className="mt-0.5 size-4 shrink-0 text-cyan-700" />
                <p className="text-sm leading-relaxed text-cyan-950">
                  {selectedPlace.periodDescription}
                </p>
              </div>
            )}

            {selectedRoute && (
              <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <Navigation className="size-4 shrink-0 text-amber-700" />
                <p className="text-sm font-semibold text-amber-950">
                  {selectedRoute.points.length} étapes
                  {selectedRoute.startYear !== undefined &&
                    ` · ${selectedRoute.startYear} à ${selectedRoute.endYear}`}
                </p>
              </div>
            )}

            {selectedPlace?.alternateNames?.length ? (
              <p className="text-xs italic text-slate-500">
                Aussi nommé : {selectedPlace.alternateNames.join(', ')}
              </p>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm leading-7 text-slate-700">
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
          </>
        )}

        {activeSection === 'relations' && (
          <div className="space-y-6">
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
              !relatedRoutes.length &&
              !routePlaces.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Aucune relation structurée disponible.
                </p>
              )}
          </div>
        )}

        {activeSection === 'references' && (
          <div className="space-y-6">
            <ReferenceList
              title="Références bibliques"
              values={biblicalReferences}
            />
            <ReferenceList
              title="Références documentaires"
              values={documentaryReferences}
            />
            <SourcesList sources={sources} />
            {!biblicalReferences.length &&
              !documentaryReferences.length &&
              !sources.length && (
                <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Aucune référence structurée disponible pour cette fiche.
                </p>
              )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        {selectedEvent ? (
          <button
            onClick={() => onSwitchTab('timeline')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <Calendar className="size-4" />
            Voir dans la frise
          </button>
        ) : (
          <button
            onClick={() => onSwitchTab('map')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
          >
            <MapPin className="size-4" />
            Voir sur la carte
          </button>
        )}
      </div>
    </aside>
  );
};
