import React, { useCallback, useMemo, useState } from 'react';
import {
  ActiveTab,
  EventData,
  BiblicalPlace,
  EraData,
  CategoryData,
  TimelinePeriod
} from './types';
import { ERAS, CATEGORIES } from './data/erasData';
import { EVENTS } from './data/timelineEvents';
import { BIBLICAL_PLACES, BIBLICAL_ROUTES, BIBLICAL_TERRITORIES } from './data/mapData';
import { TimelineView } from './components/TimelineView';
import { MapView } from './components/MapView';
import { DetailPanel } from './components/DetailPanel';
import { XmlImportModal } from './components/XmlImportModal';
import { ParsedTimelineData } from './utils/xmlParser';
import { normalizeDataRelations } from './utils/dataRelations';
import { Clock, Map as MapIcon, Upload, Search } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');

  // Timeline Data
  const [eras, setEras] = useState<EraData[]>(ERAS);
  const [categories, setCategories] = useState<CategoryData[]>(CATEGORIES);
  const [events, setEvents] = useState<EventData[]>(EVENTS);

  const { events: linkedEvents, places, routes } = useMemo(
    () => normalizeDataRelations(events, BIBLICAL_PLACES, BIBLICAL_ROUTES),
    [events]
  );
  const [visiblePeriod, setVisiblePeriod] = useState<TimelinePeriod | null>(null);

  // Selections & Filters
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<BiblicalPlace | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Handlers
  const handleSelectEvent = (event: EventData) => {
    setSelectedEvent(event);
    setSelectedPlace(null);
  };

  const handleSelectPlace = (place: BiblicalPlace) => {
    setSelectedPlace(place);
    setSelectedEvent(null);
  };

  const handleCloseDetailPanel = () => {
    setSelectedEvent(null);
    setSelectedPlace(null);
  };

  const handleImportXML = (data: ParsedTimelineData) => {
    setEras(data.eras);
    setCategories(data.categories);
    setEvents(data.events);
    setSelectedEvent(null);
    setSelectedPlace(null);
  };

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

  const NavItem = ({ tab, icon: Icon, label }: { tab: ActiveTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
        activeTab === tab ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-stone-600 hover:bg-stone-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-950">Atlas Biblique</h1>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavItem tab="timeline" icon={Clock} label="Timeline" />
            <NavItem tab="map" icon={MapIcon} label="Carte" />
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl transition"
              title="Importer"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Views Container */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'timeline' ? (
          <TimelineView
            eras={eras}
            categories={categories}
            events={linkedEvents}
            selectedEventId={selectedEvent?.id || null}
            onSelectEvent={handleSelectEvent}
            onVisiblePeriodChange={handleVisiblePeriodChange}
            searchQuery={searchQuery}
          />
        ) : (
          <MapView
            places={places}
            routes={routes}
            territories={BIBLICAL_TERRITORIES}
            selectedPlace={selectedPlace}
            selectedEvent={selectedEvent}
            visiblePeriod={visiblePeriod}
            onSelectPlace={handleSelectPlace}
            searchQuery={searchQuery}
          />
        )}

        <DetailPanel
          selectedEvent={selectedEvent}
          selectedPlace={selectedPlace}
          categories={categories}
          places={places}
          events={linkedEvents}
          onClose={handleCloseDetailPanel}
          onSelectPlace={handleSelectPlace}
          onSelectEvent={handleSelectEvent}
          onSwitchTab={setActiveTab}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden border-t border-stone-200 bg-white p-2 flex justify-around sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('timeline')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'timeline' ? 'text-purple-600' : 'text-stone-500'}`}>
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-medium">Timeline</span>
        </button>
        <button onClick={() => setActiveTab('map')} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${activeTab === 'map' ? 'text-purple-600' : 'text-stone-500'}`}>
          <MapIcon className="w-6 h-6" />
          <span className="text-[10px] font-medium">Carte</span>
        </button>
        <button onClick={() => setIsImportModalOpen(true)} className="p-3 rounded-xl flex flex-col items-center gap-1 text-stone-500">
          <Upload className="w-6 h-6" />
          <span className="text-[10px] font-medium">Upload</span>
        </button>
      </nav>

      {/* XML Import Modal */}
      <XmlImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportXML}
      />
    </div>
  );
}
