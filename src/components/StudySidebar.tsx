import React from 'react';
import {
  CalendarRange,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import { CategoryData, EventData, TimelinePeriod } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import { IconButton, SectionHeading } from './ui/AtlasUi';

interface StudySidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  categories: CategoryData[];
  events: EventData[];
  activeCategoryIds: Set<string>;
  visiblePeriod: TimelinePeriod | null;
  onClose: () => void;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
  onToggleCategory: (categoryId: string) => void;
  onResetCategories: () => void;
}

const categoryShape = (category: CategoryData) => {
  const normalized = category.name.toLowerCase();
  if (category.displayMode === 'background-period') return 'rounded-[2px] w-4 h-2';
  if (normalized.includes('événement')) return 'rotate-45 rounded-[2px]';
  if (normalized.includes('personnage') || normalized.includes('fils de'))
    return 'rounded-full';
  if (normalized.includes('règne') || normalized.includes('roi'))
    return 'rounded-[2px]';
  return 'rounded-sm';
};

export const StudySidebar: React.FC<StudySidebarProps> = ({
  isOpen,
  isCollapsed,
  categories,
  events,
  activeCategoryIds,
  visiblePeriod,
  onClose,
  onToggleCollapse,
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
          className="fixed inset-0 z-40 bg-[rgb(23_32_51/28%)] backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`${
          isOpen
            ? 'translate-y-0'
            : 'pointer-events-none translate-y-full'
        } fixed inset-x-0 bottom-0 z-50 flex max-h-[78dvh] w-full flex-col rounded-t-[var(--radius-xl)] bg-[var(--color-paper)] shadow-[var(--shadow-high)] transition-[width,transform] duration-200 lg:static lg:z-auto lg:max-h-none lg:shrink-0 lg:translate-y-0 lg:rounded-none lg:border-r lg:border-[var(--color-stone)] lg:shadow-none lg:pointer-events-auto ${
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-[280px]'
        }`}
        aria-label="Légende et filtres de consultation"
      >
        <div
          className={`flex h-16 shrink-0 items-center border-b border-[var(--color-stone-light)] ${
            isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-4'
          }`}
        >
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <p className="atlas-kicker">Consultation</p>
            <h2 className="mt-1 text-[15px] font-bold text-[var(--color-ink)]">
              Légende de l’atlas
            </h2>
          </div>

          <IconButton
            label="Fermer les filtres"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="size-5" />
          </IconButton>
          <IconButton
            label={isCollapsed ? 'Déployer la légende' : 'Replier la légende'}
            onClick={onToggleCollapse}
            className="hidden lg:grid"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-4.5" />
            ) : (
              <PanelLeftClose className="size-4.5" />
            )}
          </IconButton>
        </div>

        <div
          className={`flex-1 overflow-y-auto ${
            isCollapsed ? 'lg:px-2 lg:py-3' : 'px-4 py-5'
          }`}
        >
          <button
            type="button"
            onClick={onOpenSearch}
            className={`flex min-h-11 w-full items-center text-left text-sm font-semibold text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-soft)] ${
              isCollapsed
                ? 'lg:justify-center lg:rounded-[var(--radius-md)] lg:px-0'
                : 'gap-3 rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] px-3'
            }`}
            aria-label="Rechercher dans l’atlas"
          >
            <Search className="size-4.5 shrink-0" />
            <span className={isCollapsed ? 'lg:hidden' : ''}>
              Rechercher dans l’atlas
            </span>
          </button>

          {visiblePeriod && (
            <section
              className={`mt-5 ${
                isCollapsed
                  ? 'lg:flex lg:justify-center lg:border-y lg:border-[var(--color-stone-light)] lg:py-3'
                  : 'border-y border-[var(--color-stone-light)] py-4'
              }`}
              title={`${formatDateFrench(
                Math.round(visiblePeriod.startYear)
              )} — ${formatDateFrench(Math.round(visiblePeriod.endYear))}`}
            >
              <div
                className={`flex items-center ${
                  isCollapsed ? 'lg:justify-center' : 'gap-2'
                }`}
              >
                <CalendarRange className="size-4 shrink-0 text-[var(--color-bronze)]" />
                <span
                  className={`atlas-kicker text-[var(--color-ink-muted)] ${
                    isCollapsed ? 'lg:hidden' : ''
                  }`}
                >
                  Période visible
                </span>
              </div>
              <p
                className={`mt-2 text-[13px] font-medium leading-relaxed text-[var(--color-ink)] tabular-nums ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {formatDateFrench(Math.round(visiblePeriod.startYear))}
                <span className="mx-1.5 text-[var(--color-ink-muted)]">—</span>
                {formatDateFrench(Math.round(visiblePeriod.endYear))}
              </p>
            </section>
          )}

          <section className="mt-5">
            <div className={isCollapsed ? 'lg:hidden' : ''}>
              <SectionHeading
                title="Catégories visibles"
                action={
                  <button
                    type="button"
                    onClick={onResetCategories}
                    className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                    title="Afficher toutes les catégories"
                  >
                    <RotateCcw className="size-3.5" />
                    Réinitialiser
                  </button>
                }
              />
            </div>

            <div className={`${isCollapsed ? 'lg:mt-0' : 'mt-3'} space-y-0.5`}>
              {categories.map(category => {
                const isActive = activeCategoryIds.has(category.id);
                const count = countsByCategory.get(category.id) || 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    className={`group flex min-h-11 w-full items-center text-left ${
                      isCollapsed
                        ? 'lg:justify-center lg:rounded-[var(--radius-md)] lg:px-0'
                        : 'gap-3 rounded-[var(--radius-sm)] px-2'
                    } ${
                      isActive
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-muted)] opacity-55'
                    } hover:bg-[var(--color-paper-muted)] hover:opacity-100`}
                    aria-pressed={isActive}
                    aria-label={`${category.name}, ${count} éléments, ${
                      isActive ? 'affichée' : 'masquée'
                    }`}
                    title={isCollapsed ? `${category.name} · ${count}` : undefined}
                  >
                    <span
                      className={`size-3 shrink-0 ${categoryShape(category)} ${
                        isActive ? '' : 'ring-1 ring-current ring-inset'
                      }`}
                      style={{
                        backgroundColor: isActive
                          ? category.hexColor
                          : 'transparent'
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-[13px] font-medium ${
                        isCollapsed ? 'lg:hidden' : ''
                      }`}
                    >
                      {category.name}
                    </span>
                    <span
                      className={`text-xs font-medium tabular-nums text-[var(--color-ink-muted)] ${
                        isCollapsed ? 'lg:hidden' : ''
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div
          className={`shrink-0 border-t border-[var(--color-stone-light)] py-3 text-xs text-[var(--color-ink-muted)] ${
            isCollapsed ? 'lg:px-2 lg:text-center' : 'px-5'
          }`}
        >
          <span className="font-semibold text-[var(--color-ink)]">
            {activeCategoryIds.size}
          </span>
          <span className={isCollapsed ? 'lg:hidden' : ''}>
            {' '}
            catégorie{activeCategoryIds.size > 1 ? 's' : ''} affichée
            {activeCategoryIds.size > 1 ? 's' : ''}
          </span>
        </div>
      </aside>
    </>
  );
};
