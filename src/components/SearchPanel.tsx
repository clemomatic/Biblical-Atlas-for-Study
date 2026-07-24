import React, { useDeferredValue, useEffect, useMemo } from 'react';
import {
  BiblicalPlace,
  BiblicalRoute,
  EventData
} from '../types';
import {
  ArrowRight,
  Calendar,
  MapPin,
  Navigation,
  Search,
  User,
  X
} from 'lucide-react';
import { formatEventSpan } from '../utils/dateUtils';

interface SearchPanelProps {
  isOpen: boolean;
  query: string;
  events: EventData[];
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelectEvent: (event: EventData) => void;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectRoute: (route: BiblicalRoute) => void;
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const includesQuery = (
  query: string,
  values: Array<string | undefined>
): boolean => values.some(value => value && normalize(value).includes(query));

const ResultButton = ({
  icon,
  title,
  meta,
  color,
  onClick
}: {
  key?: React.Key;
  icon: React.ReactNode;
  title: string;
  meta: string;
  color: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-slate-200 hover:bg-white hover:shadow-sm"
  >
    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-slate-900">
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs text-slate-500">
        {meta}
      </span>
    </span>
    <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
  </button>
);

export const SearchPanel: React.FC<SearchPanelProps> = ({
  isOpen,
  query,
  events,
  places,
  routes,
  onClose,
  onQueryChange,
  onSelectEvent,
  onSelectPlace,
  onSelectRoute
}) => {
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery.trim());

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return { characters: [], events: [], places: [], routes: [] };
    }

    const matchingEvents = events.filter(event =>
      includesQuery(normalizedQuery, [
        event.text,
        event.category,
        event.description,
        ...(event.biblicalReferences || []),
        ...(event.encyclopediaReferences || []).flatMap(reference => [
          reference.articleTitle,
          reference.linkedName
        ])
      ])
    );

    return {
      characters: matchingEvents
        .filter(event => event.category === 'Personnage')
        .slice(0, 6),
      events: matchingEvents
        .filter(event => event.category !== 'Personnage')
        .slice(0, 8),
      places: places
        .filter(place =>
          includesQuery(normalizedQuery, [
            place.name,
            place.description,
            place.category,
            place.territory,
            ...(place.alternateNames || []),
            ...place.biblicalReferences,
            ...(place.encyclopediaReferences || []).flatMap(reference => [
              reference.articleTitle,
              reference.linkedName
            ])
          ])
        )
        .slice(0, 8),
      routes: routes
        .filter(route =>
          includesQuery(normalizedQuery, [
            route.name,
            route.description,
            ...route.biblicalReferences
          ])
        )
        .slice(0, 5)
    };
  }, [normalizedQuery, events, places, routes]);

  if (!isOpen) return null;

  const totalResults =
    results.characters.length +
    results.events.length +
    results.places.length +
    results.routes.length;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-slate-950/45 px-3 pt-[8vh] backdrop-blur-md sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-slate-50 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <Search className="size-5 shrink-0 text-indigo-600" />
          <input
            autoFocus
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            placeholder="Rechercher un lieu, un événement, un personnage…"
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
          />
          <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400 sm:block">
            Échap
          </span>
          <button
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Fermer la recherche"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {normalizedQuery.length < 2 ? (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-600">
                  <Search className="size-6" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">
                  Explorer tout l’atlas
                </h2>
                <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
                  Saisissez au moins deux caractères pour rechercher dans la
                  frise, la carte et les références.
                </p>
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="grid min-h-64 place-items-center px-6 text-center">
              <div>
                <p className="text-base font-bold text-slate-900">
                  Aucun résultat pour « {deferredQuery} »
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Essayez un nom de lieu, une catégorie ou une référence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {results.places.length > 0 && (
                <section>
                  <h2 className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Lieux · {results.places.length}
                  </h2>
                  <div className="mt-1.5">
                    {results.places.map(place => (
                      <ResultButton
                        key={place.id}
                        icon={<MapPin className="size-4" />}
                        title={place.name}
                        meta={place.territory || place.category || 'Lieu biblique'}
                        color="bg-cyan-100 text-cyan-700"
                        onClick={() => onSelectPlace(place)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {results.characters.length > 0 && (
                <section>
                  <h2 className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Personnages · {results.characters.length}
                  </h2>
                  <div className="mt-1.5">
                    {results.characters.map(event => (
                      <ResultButton
                        key={event.id}
                        icon={<User className="size-4" />}
                        title={event.text}
                        meta={formatEventSpan(
                          event.startYear,
                          event.endYear,
                          event.isPoint,
                          event.fuzzyStart,
                          event.fuzzyEnd
                        )}
                        color="bg-indigo-100 text-indigo-700"
                        onClick={() => onSelectEvent(event)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {results.events.length > 0 && (
                <section>
                  <h2 className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Événements · {results.events.length}
                  </h2>
                  <div className="mt-1.5">
                    {results.events.map(event => (
                      <ResultButton
                        key={event.id}
                        icon={<Calendar className="size-4" />}
                        title={event.text}
                        meta={event.category}
                        color="bg-violet-100 text-violet-700"
                        onClick={() => onSelectEvent(event)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {results.routes.length > 0 && (
                <section>
                  <h2 className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Itinéraires · {results.routes.length}
                  </h2>
                  <div className="mt-1.5">
                    {results.routes.map(route => (
                      <ResultButton
                        key={route.id}
                        icon={<Navigation className="size-4" />}
                        title={route.name}
                        meta={`${route.points.length} étapes`}
                        color="bg-amber-100 text-amber-700"
                        onClick={() => onSelectRoute(route)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
