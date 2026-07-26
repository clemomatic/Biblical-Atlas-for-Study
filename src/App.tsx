import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActiveTab,
  BiblicalPlace,
  BiblicalRoute,
  EventData,
  HistoricalPersonLaneId,
  TimelinePeriod
} from './types';
import { ERAS, CATEGORIES } from './data/erasData';
import { TIMELINE_EVENTS } from './data/historicalData';
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
import { AppHeader } from './components/AppHeader';
import { AtThisMomentPanel } from './components/AtThisMomentPanel';
import { HistoricalOverlapControl } from './components/HistoricalOverlapControl';
import { normalizeDataRelations } from './utils/dataRelations';
import { Clock3, Map as MapIcon, Search } from 'lucide-react';
import {
  HISTORICAL_PEOPLE,
  HISTORICAL_SOURCE_CATALOG
} from './data/historicalStudyData';
import {
  BIOGRAPHY_LANES,
  getBiographyLaneIdForEvent
} from './domain/history/timelineBiography';

const LocalDataEditor = __ATLAS_EDITOR_ENABLED__
  ? lazy(() => import('./components/editor/LocalDataEditor'))
  : null;

const SIDEBAR_COLLAPSE_KEY = 'atlas-sidebar-collapsed';
const BIOGRAPHY_LANES_KEY = 'atlas-visible-biography-lanes';

const categoryIdsForRoot = (rootName: string): string[] => {
  const descendants = new Set<string>();
  const visit = (name: string) => {
    CATEGORIES.filter(category => category.parent === name).forEach(category => {
      descendants.add(category.id);
      visit(category.name);
    });
  };
  const root = CATEGORIES.find(category => category.name === rootName);
  if (root) descendants.add(root.id);
  visit(rootName);
  return [...descendants];
};

const CATEGORY_GROUP_IDS = new Map(
  CATEGORIES.map(category => [
    category.id,
    categoryIdsForRoot(category.name)
  ])
);
const PERSON_CATEGORY_IDS = new Set(categoryIdsForRoot('Personnage'));

const readInitialBiographyLanes = (): Set<HistoricalPersonLaneId> => {
  const all = BIOGRAPHY_LANES.map(lane => lane.id);
  if (typeof window === 'undefined') return new Set(all);
  try {
    const saved = window.localStorage.getItem(BIOGRAPHY_LANES_KEY);
    if (!saved) return new Set(all);
    const available = new Set(all);
    return new Set(
      (JSON.parse(saved) as HistoricalPersonLaneId[]).filter(id =>
        available.has(id)
      )
    );
  } catch {
    return new Set(all);
  }
};

const readInitialView = (): ActiveTab => {
  if (typeof window === 'undefined') return 'timeline';
  return new URLSearchParams(window.location.search).get('view') === 'map'
    ? 'map'
    : 'timeline';
};

const readInitialIds = () => {
  if (typeof window === 'undefined') {
    return {
      eventId: null,
      placeId: null,
      routeId: null,
      personId: null
    };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    eventId: params.get('event'),
    placeId: params.get('place'),
    routeId: params.get('route'),
    personId: params.get('person')
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

const readInitialSidebarState = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true';
};

const readInitialHistoricalControlState = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.endsWith('/historical-overlaps') ||
    new URLSearchParams(window.location.search).get('control') ===
      'historical-overlaps'
  );
};

export default function App() {
  const initialIds = useMemo(readInitialIds, []);
  const [activeTab, setActiveTab] = useState<ActiveTab>(readInitialView);
  const [activeCategoryIds, setActiveCategoryIds] =
    useState<Set<string>>(readInitialCategories);
  const [activeBiographyLaneIds, setActiveBiographyLaneIds] =
    useState<Set<HistoricalPersonLaneId>>(readInitialBiographyLanes);
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
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    initialIds.personId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAtThisMomentOpen, setIsAtThisMomentOpen] = useState(false);
  const [isHistoricalControlOpen, setIsHistoricalControlOpen] = useState(
    readInitialHistoricalControlState
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    readInitialSidebarState
  );

  const {
    events: linkedEvents,
    places,
    routes
  } = useMemo(
    () =>
      normalizeDataRelations(
        TIMELINE_EVENTS,
        BIBLICAL_PLACES,
        BIBLICAL_ROUTES
      ),
    []
  );

  const selectedEvent =
    linkedEvents.find(event => event.id === selectedEventId) || null;
  const selectedPlace =
    places.find(place => place.id === selectedPlaceId) || null;
  const selectedRoute =
    routes.find(route => route.id === selectedRouteId) || null;
  const selectedPerson =
    HISTORICAL_PEOPLE.find(person => person.id === selectedPersonId) ||
    null;

  const filteredCategories = useMemo(
    () =>
      CATEGORIES.filter(category => activeCategoryIds.has(category.id)),
    [activeCategoryIds]
  );
  const filteredEvents = useMemo(
    () =>
      linkedEvents.filter(event => {
        if (!activeCategoryIds.has(event.categoryId)) return false;
        if (!PERSON_CATEGORY_IDS.has(event.categoryId)) return true;
        return activeBiographyLaneIds.has(
          getBiographyLaneIdForEvent(event)
        );
      }),
    [linkedEvents, activeCategoryIds, activeBiographyLaneIds]
  );

  useEffect(() => {
    window.localStorage.setItem(
      'atlas-visible-categories',
      JSON.stringify([...activeCategoryIds])
    );
  }, [activeCategoryIds]);

  useEffect(() => {
    window.localStorage.setItem(
      BIOGRAPHY_LANES_KEY,
      JSON.stringify([...activeBiographyLaneIds])
    );
  }, [activeBiographyLaneIds]);

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSE_KEY,
      String(isSidebarCollapsed)
    );
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', activeTab);
    if (selectedEventId) params.set('event', selectedEventId);
    if (selectedPlaceId) params.set('place', selectedPlaceId);
    if (selectedRouteId) params.set('route', selectedRouteId);
    if (selectedPersonId) params.set('person', selectedPersonId);
    if (visiblePeriod) {
      params.set('from', String(Math.round(visiblePeriod.startYear)));
      params.set('to', String(Math.round(visiblePeriod.endYear)));
    }
    if (isHistoricalControlOpen) {
      params.set('control', 'historical-overlaps');
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
    selectedPersonId,
    visiblePeriod,
    isHistoricalControlOpen
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
    setSelectedPersonId(null);
  }, []);

  const handleSelectEvent = useCallback((event: EventData) => {
    if (event.historicalPersonId) {
      setSelectedPersonId(event.historicalPersonId);
      setSelectedEventId(null);
      setSelectedPlaceId(null);
      setSelectedRouteId(null);
      setActiveTab('timeline');
      setIsSearchOpen(false);
      return;
    }
    setSelectedEventId(event.id);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
    setSelectedPersonId(null);
    setActiveTab('timeline');
    setIsSearchOpen(false);
  }, []);

  const handleSelectPlace = useCallback((place: BiblicalPlace) => {
    setSelectedPlaceId(place.id);
    setSelectedEventId(null);
    setSelectedRouteId(null);
    setSelectedPersonId(null);
    setActiveTab('map');
    setIsSearchOpen(false);
  }, []);

  const handleSelectRoute = useCallback((route: BiblicalRoute) => {
    setSelectedRouteId(route.id);
    setSelectedEventId(null);
    setSelectedPlaceId(null);
    setSelectedPersonId(null);
    setActiveTab('map');
    setIsSearchOpen(false);
  }, []);

  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setSelectedEventId(null);
    setSelectedPlaceId(null);
    setSelectedRouteId(null);
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

  const closeHistoricalControl = useCallback(() => {
    setIsHistoricalControlOpen(false);
    if (window.location.pathname.endsWith('/historical-overlaps')) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  const toggleCategory = (categoryId: string) => {
    setActiveCategoryIds(previous => {
      const next = new Set(previous);
      const groupIds = CATEGORY_GROUP_IDS.get(categoryId) ?? [categoryId];
      const groupIsActive = groupIds.every(id => next.has(id));
      groupIds.forEach(id => {
        if (groupIsActive) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  };

  const toggleBiographyLane = (laneId: HistoricalPersonLaneId) => {
    setActiveBiographyLaneIds(previous => {
      const next = new Set(previous);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  };

  const hasSelection = Boolean(
    selectedEvent || selectedPlace || selectedRoute || selectedPerson
  );

  if (
    __ATLAS_EDITOR_ENABLED__ &&
    LocalDataEditor &&
    window.location.pathname.endsWith('/edition')
  ) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-sm text-[var(--color-ink-soft)]">
            Chargement de l’éditeur local…
          </div>
        }
      >
        <LocalDataEditor
          people={HISTORICAL_PEOPLE}
          events={linkedEvents}
          places={places}
          sources={HISTORICAL_SOURCE_CATALOG}
        />
      </Suspense>
    );
  }

  if (isHistoricalControlOpen) {
    return (
      <HistoricalOverlapControl
        isOpen
        onClose={closeHistoricalControl}
      />
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--color-canvas)] font-sans text-[var(--color-ink)]">
      <AppHeader
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenFilters={() => setIsFiltersOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        <StudySidebar
          isOpen={isFiltersOpen}
          isCollapsed={isSidebarCollapsed}
          categories={CATEGORIES}
          events={linkedEvents}
          activeCategoryIds={activeCategoryIds}
          activeBiographyLaneIds={activeBiographyLaneIds}
          visiblePeriod={visiblePeriod}
          onClose={() => setIsFiltersOpen(false)}
          onToggleCollapse={() =>
            setIsSidebarCollapsed(previous => !previous)
          }
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleCategory={toggleCategory}
          onToggleBiographyLane={toggleBiographyLane}
          onResetCategories={() => {
            setActiveCategoryIds(
              new Set(CATEGORIES.map(category => category.id))
            );
            setActiveBiographyLaneIds(
              new Set(BIOGRAPHY_LANES.map(lane => lane.id))
            );
          }}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden border-r border-[var(--color-stone)] bg-[var(--color-paper)]">
          <section
            className={activeTab === 'timeline' ? 'h-full' : 'hidden h-full'}
            aria-hidden={activeTab !== 'timeline'}
          >
            <TimelineView
              eras={ERAS}
              categories={filteredCategories}
              events={filteredEvents}
              people={HISTORICAL_PEOPLE}
              places={places}
              selectedEventId={selectedEvent?.id || null}
              isActive={activeTab === 'timeline'}
              onSelectEvent={handleSelectEvent}
              onVisiblePeriodChange={handleVisiblePeriodChange}
              onOpenAtThisMoment={() => setIsAtThisMomentOpen(true)}
              searchQuery=""
            />
          </section>

          <section
            className={activeTab === 'map' ? 'h-full' : 'hidden h-full'}
            aria-hidden={activeTab !== 'map'}
          >
            <MapView
              places={places}
              routes={routes}
              selectedPlace={selectedPlace}
              selectedEvent={selectedEvent}
              visiblePeriod={visiblePeriod}
              isActive={activeTab === 'map'}
              onSelectPlace={handleSelectPlace}
              onSelectRoute={handleSelectRoute}
              searchQuery=""
            />
          </section>
        </main>

        {hasSelection && (
          <DetailPanel
            selectedEvent={selectedEvent}
            selectedPlace={selectedPlace}
            selectedRoute={selectedRoute}
            selectedPerson={selectedPerson}
            categories={CATEGORIES}
            places={places}
            routes={routes}
            events={linkedEvents}
            people={HISTORICAL_PEOPLE}
            onClose={clearSelection}
            onSelectPlace={handleSelectPlace}
            onSelectEvent={handleSelectEvent}
            onSelectRoute={handleSelectRoute}
            onSelectPerson={handleSelectPerson}
            onSwitchTab={setActiveTab}
          />
        )}
      </div>

      <nav className="relative z-40 grid h-16 shrink-0 grid-cols-3 border-t border-[var(--color-stone)] bg-[var(--color-paper)] px-2 md:hidden">
        {[
          { tab: 'timeline' as const, icon: Clock3, label: 'Frise' },
          { tab: 'map' as const, icon: MapIcon, label: 'Carte' }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => setActiveTab(item.tab)}
              aria-pressed={isActive}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Ouvrir la recherche globale"
          className="flex flex-col items-center justify-center gap-1 text-xs font-semibold text-[var(--color-ink-muted)]"
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
        people={HISTORICAL_PEOPLE}
        onClose={() => setIsSearchOpen(false)}
        onQueryChange={setSearchQuery}
        onSelectEvent={handleSelectEvent}
        onSelectPlace={handleSelectPlace}
        onSelectRoute={handleSelectRoute}
        onSelectPerson={handleSelectPerson}
      />

      <AtThisMomentPanel
        isOpen={isAtThisMomentOpen}
        period={visiblePeriod}
        onClose={() => setIsAtThisMomentOpen(false)}
        onSelectPerson={handleSelectPerson}
        onSelectEvent={eventId => {
          const event = linkedEvents.find(candidate => candidate.id === eventId);
          if (event) handleSelectEvent(event);
        }}
        onSelectPlace={placeId => {
          const place = places.find(candidate => candidate.id === placeId);
          if (place) handleSelectPlace(place);
        }}
      />

      <PwaInstallPrompt />
    </div>
  );
}
