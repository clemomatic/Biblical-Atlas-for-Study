import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  BiblicalPlace,
  BiblicalRoute,
  EventData,
  TimelinePeriod
} from './types';
import { ERAS, CATEGORIES } from './data/erasData';
import { EVENTS } from './data/timelineEvents';
import {
  BIBLICAL_PLACES,
  BIBLICAL_ROUTES
} from './data/mapData';
import { TimelineView } from './components/TimelineView';
import { MapView } from './components/MapView';
import { DetailPanel } from './components/DetailPanel';
import { SearchPanel } from './components/SearchPanel';
import { StudySidebar } from './components/StudySidebar';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { normalizeDataRelations } from './utils/dataRelations';
import {
  BookOpen,
  Clock3,
  Map as MapIcon,
  PanelLeft,
  Search
} from 'lucide-react';

const readInitialView = (): ActiveTab => {
  if (typeof window === 'undefined') return 'timeline';
  return new URLSearchParams(window.location.search).get('view') === 'map'
    ? 'map'
    : 'timeline';
};

const readInitialIds = () => {
  if (typeof window === 'undefined') {
    return { eventId: null, placeId: null, routeId: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    eventId: params.get('event'),
    placeId: params.get('place'),
    routeId: params.get('route')
  };
};

const readInitialCategories = (): Set<string> => {
  if (typeof window === 'undefined') {
    return new Set(CATEGORIES.map(category => category.id));
  }
  try {
    const saved = window.localStorage.getItem('atlas-visible-categories');
    if (!saved) return new Set(CATEGORIES.map(category => category.id));
    const ids = JSON.parse(saved) as string[];
    const availableIds = new Set(CATEGORIES.map(category => category.id));
    return new Set(ids.filter(id => availableIds.has(id)));
  } catch {
    return new Set(CATEGORIES.map(category => category.id));
  }
};

export default function App() {
  const initialIds = useMemo(readInitialIds, []);
  const [activeTab, setActiveTab] = useState<ActiveTab>(readInitialView);
  const [activeCategoryIds, setActiveCategoryIds] =
    useState<Set<string>>(readInitialCategories);
  const [visiblePeriod, setVisiblePeriod] = useState<TimelinePeriod | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    initialIds.eventId
  );
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    initialIds.placeId
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
    initialIds.routeId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const {
    events: linkedEvents,
    places,
    routes
  } = useMemo(
    () => normalizeDataRelations(EVENTS, BIBLICAL_PLACES, BIBLICAL_ROUTES),
    []
  );

  const selectedEvent =
    linkedEvents.find(event => event.id === selectedEventId) || null;
  const selectedPlace =
    places.find(place => place.id === selectedPlaceId) || null;
  const selectedRoute =
    routes.find(route => route.id === selectedRouteId) || null;

  const filteredCategories = useMemo(
    () =>
      CATEGORIES.filter(category => activeCategoryIds.has(category.id)),
    [activeCategoryIds]
  );
  const filteredEvents = useMemo(
    () =>
      linkedEvents.filter(event => activeCategoryIds.has(event.categoryId)),
    [linkedEvents, activeCategoryIds]
  );

  useEffect(() => {
    window.localStorage.setItem(
      'atlas-visible-categories',
      JSON.stringify([...activeCategoryIds])
    );
  }, [activeCategoryIds]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', activeTab);
    if (selectedEventId) params.set('event', selectedEventId);
    if (selectedPlaceId) params.set('place', selectedPlaceId);
    if (selectedRouteId) params.set('route', selectedRouteId);
    if (visiblePeriod) {
      params.set('from', String(Math.round(visiblePeriod.startYear)));
      params.set('to', String(Math.round(visiblePeriod.endYear)));
    }
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }, [
    activeTab,
    selectedEventId,
    selectedPlaceId,
    selectedRouteId,
    visiblePeriod
  ]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEventId(null);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
  }, []);

  const handleSelectEvent = useCallback((event: EventData) => {
    setSelectedEventId(event.id);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setActiveTab('timeline');
    setIsSearchOpen(false);
  }, []);

  const handleSelectPlace = useCallback((place: BiblicalPlace) => {
    setSelectedPlaceId(place.id);
    setSelectedEventId(null);
    setSelectedRouteId(null);
    setActiveTab('map');
    setIsSearchOpen(false);
  }, []);

  const handleSelectRoute = useCallback((route: BiblicalRoute) => {
    setSelectedRouteId(route.id);
    setSelectedEventId(null);
    setSelectedPlaceId(null);
    setActiveTab('map');
    setIsSearchOpen(false);
  }, []);

  const handleVisiblePeriodChange = useCallback((period: TimelinePeriod) => {
    setVisiblePeriod(previous => {
      if (
        previous &&
        Math.abs(previous.startYear - period.startYear) < 0.01 &&
        Math.abs(previous.endYear - period.endYear) < 0.01
      ) {
        return previous;
      }
      return period;
    });
  }, []);

  const toggleCategory = (categoryId: string) => {
    setActiveCategoryIds(previous => {
      const next = new Set(previous);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const hasSelection = Boolean(
    selectedEvent || selectedPlace || selectedRoute
  );

  const NavButton = ({
    tab,
    icon: Icon,
    label
  }: {
    tab: ActiveTab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`relative flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
          isActive
            ? 'bg-slate-950 text-white shadow-sm'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className="size-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-100 font-sans text-slate-900">
      <header className="relative z-30 flex h-[72px] shrink-0 items-center border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur-xl sm:px-5">
        <button
          onClick={() => setIsFiltersOpen(true)}
          className="mr-2 grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Afficher les filtres"
        >
          <PanelLeft className="size-5" />
        </button>

        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-200">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">
              Atlas biblique interactif
            </h1>
            <p className="hidden text-[11px] font-medium text-slate-400 sm:block">
              Chronologie, géographie et références
            </p>
          </div>
        </div>

        <nav className="ml-6 hidden items-center gap-1 rounded-2xl bg-slate-50 p-1 md:flex">
          <NavButton tab="timeline" icon={Clock3} label="Frise" />
          <NavButton tab="map" icon={MapIcon} label="Carte" />
        </nav>

        <button
          onClick={() => setIsSearchOpen(true)}
          className="ml-auto flex h-11 w-11 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm sm:w-64 lg:w-80"
          aria-label="Ouvrir la recherche globale"
        >
          <Search className="size-4 shrink-0 text-indigo-600" />
          <span className="hidden flex-1 truncate sm:block">
            Rechercher dans l’atlas…
          </span>
          <span className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 lg:block">
            /
          </span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <StudySidebar
          isOpen={isFiltersOpen}
          categories={CATEGORIES}
          events={linkedEvents}
          activeCategoryIds={activeCategoryIds}
          visiblePeriod={visiblePeriod}
          onClose={() => setIsFiltersOpen(false)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleCategory={toggleCategory}
          onResetCategories={() =>
            setActiveCategoryIds(
              new Set(CATEGORIES.map(category => category.id))
            )
          }
        />

        <main className="relative min-w-0 flex-1 overflow-hidden border-r border-slate-200 bg-white">
          <section
            className={activeTab === 'timeline' ? 'h-full' : 'hidden h-full'}
            aria-hidden={activeTab !== 'timeline'}
          >
            <TimelineView
              eras={ERAS}
              categories={filteredCategories}
              events={filteredEvents}
              selectedEventId={selectedEvent?.id || null}
              isActive={activeTab === 'timeline'}
              onSelectEvent={handleSelectEvent}
              onVisiblePeriodChange={handleVisiblePeriodChange}
              searchQuery=""
            />
          </section>

          <section
            className={activeTab === 'map' ? 'h-full' : 'hidden h-full'}
            aria-hidden={activeTab !== 'map'}
          >
            <MapView
              places={places}
              selectedPlace={selectedPlace}
              selectedEvent={selectedEvent}
              visiblePeriod={visiblePeriod}
              isActive={activeTab === 'map'}
              onSelectPlace={handleSelectPlace}
              searchQuery=""
            />
          </section>
        </main>

        {hasSelection && (
          <DetailPanel
            selectedEvent={selectedEvent}
            selectedPlace={selectedPlace}
            selectedRoute={selectedRoute}
            categories={CATEGORIES}
            places={places}
            routes={routes}
            events={linkedEvents}
            onClose={clearSelection}
            onSelectPlace={handleSelectPlace}
            onSelectEvent={handleSelectEvent}
            onSelectRoute={handleSelectRoute}
            onSwitchTab={setActiveTab}
          />
        )}
      </div>

      <nav className="relative z-30 grid h-16 shrink-0 grid-cols-3 border-t border-slate-200 bg-white px-2 md:hidden">
        {[
          { tab: 'timeline' as const, icon: Clock3, label: 'Frise' },
          { tab: 'map' as const, icon: MapIcon, label: 'Carte' }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-slate-400"
        >
          <Search className="size-5" />
          Recherche
        </button>
      </nav>

      <SearchPanel
        isOpen={isSearchOpen}
        query={searchQuery}
        events={linkedEvents}
        places={places}
        routes={routes}
        onClose={() => setIsSearchOpen(false)}
        onQueryChange={setSearchQuery}
        onSelectEvent={handleSelectEvent}
        onSelectPlace={handleSelectPlace}
        onSelectRoute={handleSelectRoute}
      />

      <PwaInstallPrompt />
    </div>
  );
}
