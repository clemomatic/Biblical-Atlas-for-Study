import React from 'react';
import { ActiveTab } from '../types';
import { Compass, Clock, Upload, Search, RefreshCw, BookOpen } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenImportModal: () => void;
  onResetData: () => void;
  totalEventsCount: number;
  totalPlacesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  onOpenImportModal,
  onResetData,
  totalEventsCount,
  totalPlacesCount
}) => {
  return (
    <header className="bg-slate-900 text-slate-100 border-b border-amber-600/30 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-amber-200 tracking-wide leading-tight">
                Atlas Biblique Interactif
              </h1>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                Chronologie & Géographie Sainte
              </p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              id="tab-timeline-btn"
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'timeline'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Frise Chronologique</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-950/40 text-amber-200">
                {totalEventsCount}
              </span>
            </button>

            <button
              id="tab-map-btn"
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Carte Biblique</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-950/40 text-amber-200">
                {totalPlacesCount}
              </span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-48 lg:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                id="search-input"
                placeholder="Rechercher personnage, événement..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ×
                </button>
              )}
            </div>

            <button
              id="import-xml-btn"
              onClick={onOpenImportModal}
              title="Importer un fichier .timeline XML"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Importer .timeline</span>
            </button>

            <button
              id="reset-data-btn"
              onClick={onResetData}
              title="Réinitialiser les données d'origine"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
