import React from 'react';
import {
  CategoryData,
  EventData,
  TimelinePeriod
} from '../types';
import {
  CalendarRange,
  Check,
  Filter,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { formatDateFrench } from '../utils/dateUtils';

interface StudySidebarProps {
  isOpen: boolean;
  categories: CategoryData[];
  events: EventData[];
  activeCategoryIds: Set<string>;
  visiblePeriod: TimelinePeriod | null;
  onClose: () => void;
  onOpenSearch: () => void;
  onToggleCategory: (categoryId: string) => void;
  onResetCategories: () => void;
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
  isOpen,
  categories,
  events,
  activeCategoryIds,
  visiblePeriod,
  onClose,
  onOpenSearch,
  onToggleCategory,
  onResetCategories
}) => {
  const countsByCategory = React.useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(event => {
      counts.set(event.categoryId, (counts.get(event.categoryId) || 0) + 1);
    });
    return counts;
  }, [events]);

  return (
    <>
      {isOpen && (
        <button
          aria-label="Fermer les filtres"
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-50 w-[min(88vw,320px)] flex-col border-r border-slate-200 bg-white shadow-2xl lg:static lg:z-auto lg:flex lg:w-72 lg:shrink-0 lg:shadow-none`}
        aria-label="Filtres de consultation"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
              Consultation
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-950">
              Filtres d’étude
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Fermer les filtres"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <button
            onClick={onOpenSearch}
            className="flex w-full items-center gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-cyan-50 px-4 py-3 text-left text-sm font-semibold text-indigo-950 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <Search className="size-4" />
            </span>
            <span className="flex-1">
              Rechercher
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                Lieux, événements, personnages…
              </span>
            </span>
          </button>

          {visiblePeriod && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <CalendarRange className="size-4 text-cyan-600" />
                Période visible
              </div>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">
                {formatDateFrench(Math.round(visiblePeriod.startYear))}
                <span className="mx-1.5 text-slate-400">—</span>
                {formatDateFrench(Math.round(visiblePeriod.endYear))}
              </p>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Catégories
                </h3>
              </div>
              <button
                onClick={onResetCategories}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                title="Afficher toutes les catégories"
              >
                <RotateCcw className="size-3.5" />
                Tout afficher
              </button>
            </div>

            <div className="space-y-1.5">
              {categories.map(category => {
                const isActive = activeCategoryIds.has(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => onToggleCategory(category.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      isActive
                        ? 'border-slate-200 bg-white text-slate-900 shadow-sm'
                        : 'border-transparent bg-slate-50 text-slate-400'
                    }`}
                    aria-pressed={isActive}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.hexColor }}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                      {category.name}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-400">
                      {countsByCategory.get(category.id) || 0}
                    </span>
                    <span
                      className={`grid size-5 place-items-center rounded-md ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isActive && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">
            {activeCategoryIds.size}
          </span>{' '}
          catégorie{activeCategoryIds.size > 1 ? 's' : ''} affichée
          {activeCategoryIds.size > 1 ? 's' : ''}
        </div>
      </aside>
    </>
  );
};
