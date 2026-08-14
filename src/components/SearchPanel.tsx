import React, {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { BiblicalPlace, BiblicalRoute, EventData } from '../types';
import type { BiblicalPerson } from '../domain/history/types';
import { formatTemporalSpanFrench } from '../domain/history/temporal';
import {
  ArrowRight,
  Calendar,
  Clock3,
  MapPin,
  Navigation,
  Search,
  User,
  X
} from 'lucide-react';
import { formatEventSpan } from '../utils/dateUtils';
import { EmptyState } from './ui/AtlasUi';

interface SearchPanelProps {
  isOpen: boolean;
  query: string;
  events: EventData[];
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  people: BiblicalPerson[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onSelectEvent: (event: EventData) => void;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectRoute: (route: BiblicalRoute) => void;
  onSelectPerson: (personId: string) => void;
}

type SearchItemKind = 'place' | 'character' | 'event' | 'route';

interface SearchItem {
  key: string;
  kind: SearchItemKind;
  title: string;
  meta: string;
  description?: string;
  onSelect: () => void;
}

const RECENT_SEARCHES_KEY = 'atlas-recent-searches';

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const includesQuery = (
  query: string,
  values: Array<string | undefined>
): boolean => values.some(value => value && normalize(value).includes(query));

const getRecentSearches = (): string[] => {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(RECENT_SEARCHES_KEY) || '[]'
    );
    return Array.isArray(stored)
      ? stored.filter(value => typeof value === 'string').slice(0, 5)
      : [];
  } catch {
    return [];
  }
};

function HighlightedText({
  value,
  query
}: {
  value: string;
  query: string;
}) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return <>{value}</>;

  const escaped = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = value.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLocaleLowerCase('fr') ===
        trimmedQuery.toLocaleLowerCase('fr') ? (
          <mark
            key={`${part}-${index}`}
            className="bg-[var(--color-bronze-soft)] text-inherit"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const kindMeta: Record<
  SearchItemKind,
  { label: string; icon: React.ElementType; color: string }
> = {
  place: {
    label: 'Lieux',
    icon: MapPin,
    color: 'var(--color-mineral)'
  },
  character: {
    label: 'Personnages',
    icon: User,
    color: 'var(--color-primary)'
  },
  event: {
    label: 'Événements',
    icon: Calendar,
    color: 'var(--color-bronze)'
  },
  route: {
    label: 'Itinéraires',
    icon: Navigation,
    color: 'var(--color-olive)'
  }
};

function SearchResultItem({
  item,
  query,
  isActive,
  onHover,
  onSelect
}: {
  key?: React.Key;
  item: SearchItem;
  query: string;
  isActive: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const meta = kindMeta[item.kind];
  const Icon = meta.icon;
  return (
    <button
      id={item.key}
      type="button"
      role="option"
      aria-selected={isActive}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onSelect}
      className={`group flex min-h-14 w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors ${
        isActive
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
          : 'border-transparent hover:bg-[var(--color-paper-muted)]'
      }`}
    >
      <span
        className="grid size-9 shrink-0 place-items-center"
        style={{ color: meta.color }}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">
          <HighlightedText value={item.title} query={query} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-muted)]">
          {item.meta}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-[var(--color-stone)] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  isOpen,
  query,
  events,
  places,
  routes,
  people,
  onClose,
  onQueryChange,
  onSelectEvent,
  onSelectPlace,
  onSelectRoute,
  onSelectPerson
}) => {
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalize(deferredQuery.trim());
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
    inputRef.current?.focus();
  };

  const handleClearQuery = () => {
    onQueryChange('');
    inputRef.current?.focus();
  };

  const matchingItems = useMemo<SearchItem[]>(() => {
    if (normalizedQuery.length < 2) return [];

    const placeItems = places
      .filter(place =>
        includesQuery(normalizedQuery, [
          place.name,
          place.description,
          place.category,
          place.territory,
          ...(place.alternateNames || []),
          ...place.biblicalReferences
        ])
      )
      .slice(0, 8)
      .map(place => ({
        key: `place-${place.id}`,
        kind: 'place' as const,
        title: place.name,
        meta: place.territory || place.category || 'Lieu biblique',
        description: place.description,
        onSelect: () => onSelectPlace(place)
      }));

    const matchingEvents = events.filter(event =>
      includesQuery(normalizedQuery, [
        event.text,
        event.category,
        event.description,
        ...(event.biblicalReferences || [])
      ])
    );
    const personIds = new Set(people.map(person => person.id));
    const personItems = people
      .filter(person =>
        includesQuery(normalizedQuery, [
          person.name,
          person.description,
          ...(person.alternateNames ?? []),
          ...(person.biblicalReferences ?? [])
        ])
      )
      .slice(0, 8)
      .map(person => ({
        key: `character-${person.id}`,
        kind: 'character' as const,
        title: person.name,
        meta:
          person.activityPeriods[0]?.span.displayLabel ??
          (person.lifeSpan
            ? formatTemporalSpanFrench(person.lifeSpan)
            : person.roles?.includes('prophet')
              ? 'Prophète'
              : 'Personnage biblique'),
        description: person.description,
        onSelect: () => onSelectPerson(person.id)
      }));
    const legacyCharacterItems = matchingEvents
      .filter(
        event =>
          event.category === 'Personnage' && !personIds.has(event.id)
      )
      .slice(0, 6)
      .map(event => ({
        key: `character-${event.id}`,
        kind: 'character' as const,
        title: event.text,
        meta: formatEventSpan(
          event.startYear,
          event.endYear,
          event.isPoint,
          event.fuzzyStart,
          event.fuzzyEnd
        ),
        description: event.description,
        onSelect: () => onSelectEvent(event)
      }));
    const eventItems = matchingEvents
      .filter(
        event =>
          event.category !== 'Personnage' && !personIds.has(event.id)
      )
      .slice(0, 8)
      .map(event => ({
        key: `event-${event.id}`,
        kind: 'event' as const,
        title: event.text,
        meta: event.category,
        description: event.description,
        onSelect: () => onSelectEvent(event)
      }));
    const routeItems = routes
      .filter(route =>
        includesQuery(normalizedQuery, [
          route.name,
          route.description,
          ...route.biblicalReferences
        ])
      )
      .slice(0, 5)
      .map(route => ({
        key: `route-${route.id}`,
        kind: 'route' as const,
        title: route.name,
        meta: `${route.points.length} étapes`,
        description: route.description,
        onSelect: () => onSelectRoute(route)
      }));

    return [
      ...placeItems,
      ...personItems,
      ...legacyCharacterItems,
      ...eventItems,
      ...routeItems
    ];
  }, [
    events,
    normalizedQuery,
    onSelectEvent,
    onSelectPlace,
    onSelectPerson,
    onSelectRoute,
    places,
    people,
    routes
  ]);

  const suggestions = useMemo<SearchItem[]>(() => {
    const suggestedPlaces = ['Jérusalem', 'Babylone', 'Ur']
      .map(name =>
        places.find(place => normalize(place.name) === normalize(name))
      )
      .filter((place): place is BiblicalPlace => Boolean(place))
      .map(place => ({
        key: `suggested-place-${place.id}`,
        kind: 'place' as const,
        title: `Explorer ${place.name}`,
        meta: place.territory || 'Lieu majeur',
        description: place.description,
        onSelect: () => onSelectPlace(place)
      }));
    const suggestedEvents = ['rois', 'paul']
      .map(term =>
        events.find(event => normalize(event.text).includes(term))
      )
      .filter((event): event is EventData => Boolean(event))
      .map(event => ({
        key: `suggested-event-${event.id}`,
        kind:
          event.category === 'Personnage'
            ? ('character' as const)
            : ('event' as const),
        title: event.text,
        meta: event.category,
        description: event.description,
        onSelect: () => onSelectEvent(event)
      }));
    return [...suggestedPlaces, ...suggestedEvents].slice(0, 6);
  }, [events, onSelectEvent, onSelectPlace, places]);

  const displayedItems =
    normalizedQuery.length >= 2 ? matchingItems : suggestions;
  const activeItem = displayedItems[activeIndex] || displayedItems[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [normalizedQuery, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeItem?.key) return;
    const element = document.getElementById(activeItem.key);
    element?.scrollIntoView({ block: 'nearest' });
  }, [activeItem?.key, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    setRecentSearches(getRecentSearches());
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => previousFocusRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown' && displayedItems.length) {
        event.preventDefault();
        setActiveIndex(index => (index + 1) % displayedItems.length);
      }
      if (event.key === 'ArrowUp' && displayedItems.length) {
        event.preventDefault();
        setActiveIndex(
          index => (index - 1 + displayedItems.length) % displayedItems.length
        );
      }
      if (event.key === 'Enter' && activeItem) {
        event.preventDefault();
        selectItem(activeItem);
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input, a[href], [tabindex]:not([tabindex="-1"])'
          )
        ];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, displayedItems.length, isOpen, onClose]);

  function selectItem(item: SearchItem) {
    const searchValue = query.trim() || item.title.replace(/^Explorer /, '');
    if (searchValue) {
      const next = [
        searchValue,
        ...recentSearches.filter(value => value !== searchValue)
      ].slice(0, 5);
      setRecentSearches(next);
      try {
        window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        // La recherche reste disponible sans stockage local.
      }
    }
    item.onSelect();
  }

  if (!isOpen) return null;

  const groupedItems = (['place', 'character', 'event', 'route'] as const)
    .map(kind => ({
      kind,
      items: displayedItems
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item.kind === kind)
    }))
    .filter(group => group.items.length);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-[var(--color-ink)]/48 px-0 pt-0 backdrop-blur-sm sm:px-6 sm:pt-[7vh]"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="atlas-enter flex h-full max-h-full w-full max-w-5xl flex-col overflow-hidden bg-[var(--color-paper)] shadow-[var(--shadow-3)] sm:h-auto sm:max-h-[86vh] sm:rounded-[var(--radius-xl)] sm:border sm:border-[var(--color-stone-light)]"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-[var(--color-stone-light)] px-4 sm:px-6">
          <Search className="size-5 shrink-0 text-[var(--color-primary)]" />
          <div className="relative flex min-w-0 flex-1 items-center">
            <input
              ref={inputRef}
              value={query}
              onChange={event => onQueryChange(event.target.value)}
              placeholder="Rechercher un lieu, un événement, un personnage…"
              className="min-w-0 flex-1 bg-transparent pr-10 text-base font-medium text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)]"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="search-results-list"
              aria-autocomplete="list"
              aria-activedescendant={activeItem ? activeItem.key : undefined}
            />
            {query && (
              <button
                type="button"
                onClick={handleClearQuery}
                className="absolute right-2 flex size-8 items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-stone-light)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label="Effacer le texte de recherche"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <span className="hidden text-xs font-medium text-[var(--color-ink-muted)] sm:block">
            Échap
          </span>
          <button
            type="button"
            onClick={onClose}
            className="atlas-icon-button"
            aria-label="Fermer la recherche"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
          <div
            id="search-results-list"
            className="min-h-0 overflow-y-auto border-[var(--color-stone-light)] p-4 md:border-r sm:p-5"
            role="listbox"
            aria-label="Résultats de recherche"
          >
            {normalizedQuery.length < 2 && recentSearches.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                    <Clock3 className="size-4 text-[var(--color-ink-muted)]" />
                    Recherches récentes
                  </h2>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-xs font-semibold text-[var(--color-primary-dark)] hover:underline"
                    aria-label="Effacer les recherches récentes"
                  >
                    Effacer
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentSearches.map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        onQueryChange(value);
                        inputRef.current?.focus();
                      }}
                      className="min-h-10 rounded-full bg-[var(--color-paper-muted)] px-3 text-xs font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {normalizedQuery.length < 2 && (
              <div className="mb-3">
                <p className="atlas-kicker">Suggestions</p>
                <h2 className="mt-1 text-base font-bold text-[var(--color-ink)]">
                  Explorer l’atlas
                </h2>
              </div>
            )}

            {normalizedQuery.length >= 2 && !displayedItems.length ? (
              <EmptyState
                icon={<Search className="size-5" />}
                title={`Aucun résultat pour « ${deferredQuery} »`}
                message="Essayez un nom de lieu, une époque, une catégorie ou une référence."
              />
            ) : (
              <div className="space-y-5">
                {groupedItems.map(group => (
                  <section key={group.kind}>
                    <h2 className="px-3 text-xs font-semibold text-[var(--color-ink-muted)]">
                      {kindMeta[group.kind].label} · {group.items.length}
                    </h2>
                    <div className="mt-1">
                      {group.items.map(({ item, index }) => (
                        <SearchResultItem
                          key={item.key}
                          item={item}
                          query={deferredQuery}
                          isActive={activeIndex === index}
                          onHover={() => setActiveIndex(index)}
                          onSelect={() => selectItem(item)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <aside className="hidden min-h-0 overflow-y-auto bg-[var(--color-paper-muted)] p-7 md:block">
            {activeItem ? (
              <>
                <p className="atlas-kicker">{kindMeta[activeItem.kind].label}</p>
                <div className="mt-5 grid aspect-[16/8] place-items-center overflow-hidden bg-[var(--color-primary-dark)] text-[var(--color-paper)]">
                  <div className="relative grid size-full place-items-center bg-[radial-gradient(circle_at_60%_40%,rgb(168_111_61/35%),transparent_4%),linear-gradient(28deg,transparent_49%,rgb(255_255_255/8%)_50%,transparent_51%)] bg-[length:auto,42px_42px]">
                    {React.createElement(kindMeta[activeItem.kind].icon, {
                      className: 'size-8'
                    })}
                  </div>
                </div>
                <h2 className="mt-6 font-[var(--font-editorial)] text-3xl font-semibold leading-tight text-[var(--color-ink)]">
                  {activeItem.title}
                </h2>
                <p className="mt-2 text-xs font-medium text-[var(--color-ink-muted)]">
                  {activeItem.meta}
                </p>
                <p className="mt-5 line-clamp-6 text-sm leading-7 text-[var(--color-ink-soft)]">
                  {activeItem.description ||
                    'Cette entrée peut être ouverte dans sa fiche documentaire.'}
                </p>
                <button
                  type="button"
                  onClick={() => selectItem(activeItem)}
                  className="mt-6 flex min-h-11 items-center gap-2 bg-[var(--color-primary-dark)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary)]"
                >
                  Ouvrir la fiche
                  <ArrowRight className="size-4" />
                </button>
              </>
            ) : (
              <EmptyState
                title="Commencez votre exploration"
                message="Les lieux, personnages et événements apparaîtront ici avec un aperçu documentaire."
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
