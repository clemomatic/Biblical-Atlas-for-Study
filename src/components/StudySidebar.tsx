import React from 'react';
import {
  CalendarRange,
  Flag,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  X
} from 'lucide-react';
import {
  CategoryData,
  EventData,
  HistoricalPersonLaneId,
  TimelinePeriod
} from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import {
  BIOGRAPHY_LANES,
  getBiographyLaneIdForEvent
} from '../domain/history/timelineBiography';
import { ACTIVITY_VISUALS } from '../domain/history/activityVisuals';
import {
  getTimelineSemanticLaneCounts,
  TIMELINE_SEMANTIC_LANES
} from '../domain/history/timelineSemanticLanes';
import { IconButton, SectionHeading } from './ui/AtlasUi';

interface StudySidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  categories: CategoryData[];
  events: EventData[];
  activeCategoryIds: Set<string>;
  activeBiographyLaneIds: Set<HistoricalPersonLaneId>;
  visiblePeriod: TimelinePeriod | null;
  onClose: () => void;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleBiographyLane: (laneId: HistoricalPersonLaneId) => void;
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
  activeBiographyLaneIds,
  visiblePeriod,
  onClose,
  onToggleCollapse,
  onOpenSearch,
  onToggleCategory,
  onToggleBiographyLane,
  onResetCategories
}) => {
  const countsByCategory = React.useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(event => {
      counts.set(event.categoryId, (counts.get(event.categoryId) || 0) + 1);
    });
    return counts;
  }, [events]);

  const semanticLaneCounts = React.useMemo(() => {
    const backgroundCategoryIds = new Set(
      categories
        .filter(category => category.displayMode === 'background-period')
        .map(category => category.id)
    );
    return getTimelineSemanticLaneCounts(
      events.filter(
        event =>
          !event.historicalPersonId &&
          !backgroundCategoryIds.has(event.categoryId)
      )
    );
  }, [categories, events]);

  const visibleSemanticLanes = React.useMemo(
    () =>
      TIMELINE_SEMANTIC_LANES
        .map(lane => ({
          ...lane,
          count: semanticLaneCounts.get(lane.id) ?? 0
        }))
        .filter(lane => lane.count > 0),
    [semanticLaneCounts]
  );

  const categoryStructure = React.useMemo(() => {
    const byName = new Map(
      categories.map(category => [category.name, category] as const)
    );
    const descendantsOf = (rootName: string): CategoryData[] => {
      const result: CategoryData[] = [];
      const visit = (name: string) => {
        categories
          .filter(category => category.parent === name)
          .forEach(category => {
            result.push(category);
            visit(category.name);
          });
      };
      visit(rootName);
      return result;
    };
    return categories
      .filter(category => !category.parent || !byName.has(category.parent))
      .map(root => ({
        root,
        descendants: descendantsOf(root.name)
      }));
  }, [categories]);

  const biographyCounts = React.useMemo(() => {
    const peopleByLane = new Map<
      HistoricalPersonLaneId,
      Set<string>
    >(BIOGRAPHY_LANES.map(lane => [lane.id, new Set<string>()]));
    const byName = new Map(
      categories.map(category => [category.name, category] as const)
    );
    events.forEach(event => {
      let category = categories.find(
        candidate => candidate.id === event.categoryId
      );
      let isPerson = false;
      const visited = new Set<string>();
      while (category && !visited.has(category.name)) {
        if (category.name === 'Personnage') {
          isPerson = true;
          break;
        }
        visited.add(category.name);
        category = category.parent
          ? byName.get(category.parent)
          : undefined;
      }
      if (!isPerson) return;
      const laneId = getBiographyLaneIdForEvent(event);
      peopleByLane
        .get(laneId)
        ?.add(event.historicalPersonId ?? event.id);
    });
    return new Map(
      [...peopleByLane].map(([laneId, ids]) => [laneId, ids.size])
    );
  }, [categories, events]);

  const groupCount = (root: CategoryData, descendants: CategoryData[]) => {
    if (root.name === 'Personnage') {
      return [...biographyCounts.values()].reduce(
        (total, count) => total + count,
        0
      );
    }
    const ids = new Set([root.id, ...descendants.map(item => item.id)]);
    return events.filter(event => ids.has(event.categoryId)).length;
  };

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

          <section className={`mt-5 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <SectionHeading title="Organisation de la frise" />
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Les durées et les faits datés sont répartis sur des lignes distinctes.
            </p>
            <div className="mt-3 space-y-3">
              {(['period', 'point'] as const).map(kind => {
                const lanes = visibleSemanticLanes.filter(lane => lane.kind === kind);
                if (lanes.length === 0) return null;
                const KindIcon = kind === 'point' ? Flag : CalendarRange;
                return (
                  <div key={kind}>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink-soft)]">
                      <KindIcon className="size-3.5" />
                      {kind === 'point' ? 'Événements ponctuels' : 'Périodes et contextes'}
                    </p>
                    <div className="space-y-1">
                      {lanes.map(lane => (
                        <div
                          key={lane.id}
                          className="flex min-h-8 items-center gap-2 px-1 text-xs text-[var(--color-ink)]"
                          title={lane.description}
                        >
                          <span
                            className={kind === 'point' ? 'size-2.5 rounded-full' : 'h-2 w-5 rounded-[2px]'}
                            style={{ backgroundColor: lane.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">{lane.shortLabel}</span>
                          <span className="tabular-nums text-[var(--color-ink-muted)]">{lane.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-6 border-t border-[var(--color-stone-light)] pt-5">
            <div className={isCollapsed ? 'lg:hidden' : ''}>
              <SectionHeading
                title="Filtres de contenu"
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

            <div className={`${isCollapsed ? 'lg:mt-0' : 'mt-3'} space-y-3`}>
              {categoryStructure.map(({ root, descendants }) => {
                const categoryIds = [
                  root.id,
                  ...descendants.map(category => category.id)
                ];
                const isActive = categoryIds.every(id =>
                  activeCategoryIds.has(id)
                );
                const count = groupCount(root, descendants);
                return (
                  <section
                    key={root.id}
                    className="border-b border-[var(--color-stone-light)] pb-3 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleCategory(root.id)}
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
                      aria-label={`${root.name}, ${count} éléments, ${
                        isActive ? 'affichés' : 'masqués'
                      }`}
                      title={isCollapsed ? `${root.name} · ${count}` : undefined}
                    >
                      <span
                        className={`size-3 shrink-0 ${categoryShape(root)} ${
                          isActive ? '' : 'ring-1 ring-current ring-inset'
                        }`}
                        style={{
                          backgroundColor: isActive
                            ? root.hexColor
                            : 'transparent'
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
                          isCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {root.name}
                      </span>
                      <span
                        className={`text-xs font-medium tabular-nums text-[var(--color-ink-muted)] ${
                          isCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {count}
                      </span>
                    </button>

                    {!isCollapsed && root.name === 'Personnage' && (
                      <div className="mt-1 space-y-0.5 pl-3">
                        {BIOGRAPHY_LANES.map(lane => {
                          const laneActive = activeBiographyLaneIds.has(lane.id);
                          const laneCount = biographyCounts.get(lane.id) ?? 0;
                          return (
                            <button
                              key={lane.id}
                              type="button"
                              onClick={() => onToggleBiographyLane(lane.id)}
                              className={`flex min-h-10 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-left text-xs transition-colors hover:bg-[var(--color-paper-muted)] ${
                                laneActive
                                  ? 'text-[var(--color-ink)]'
                                  : 'text-[var(--color-ink-muted)] opacity-50'
                              }`}
                              aria-pressed={laneActive}
                              title={lane.description}
                            >
                              <span
                                className="h-2.5 w-5 shrink-0 rounded-[2px] border"
                                style={{
                                  borderColor: lane.color,
                                  backgroundColor: laneActive
                                    ? lane.softColor
                                    : 'transparent',
                                  boxShadow: laneActive
                                    ? `inset 0 -3px ${lane.color}`
                                    : undefined
                                }}
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {lane.label}
                              </span>
                              <span className="tabular-nums text-[var(--color-ink-muted)]">
                                {laneCount}
                              </span>
                            </button>
                          );
                        })}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-2 text-[11px] text-[var(--color-ink-muted)]">
                          {(['lifespan', 'reign', 'prophecy'] as const).map(type => (
                            <span key={type} className="inline-flex items-center gap-1.5">
                              <span
                                className="h-1.5 w-4 rounded-full"
                                style={{ background: ACTIVITY_VISUALS[type].color }}
                              />
                              {ACTIVITY_VISUALS[type].label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isCollapsed &&
                      root.name !== 'Personnage' &&
                      descendants.length > 0 && (
                        <div className="mt-1 space-y-0.5 pl-5">
                          {descendants.map(category => {
                            const childActive = activeCategoryIds.has(category.id);
                            const childCount =
                              countsByCategory.get(category.id) || 0;
                            return (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => onToggleCategory(category.id)}
                                className={`flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 text-left text-xs hover:bg-[var(--color-paper-muted)] ${
                                  childActive
                                    ? 'text-[var(--color-ink-soft)]'
                                    : 'text-[var(--color-ink-muted)] opacity-50'
                                }`}
                                aria-pressed={childActive}
                              >
                                <span
                                  className={`size-2.5 shrink-0 ${categoryShape(category)}`}
                                  style={{
                                    backgroundColor: childActive
                                      ? category.hexColor
                                      : 'transparent',
                                    border: `1px solid ${category.hexColor}`
                                  }}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {category.name}
                                </span>
                                <span className="tabular-nums text-[var(--color-ink-muted)]">
                                  {childCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </section>
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
            {activeBiographyLaneIds.size}
          </span>
          <span className={isCollapsed ? 'lg:hidden' : ''}>
            {' '}
            groupe{activeBiographyLaneIds.size > 1 ? 's' : ''} biographique
            {activeBiographyLaneIds.size > 1 ? 's' : ''} affiché
            {activeBiographyLaneIds.size > 1 ? 's' : ''}
          </span>
        </div>
      </aside>
    </>
  );
};
