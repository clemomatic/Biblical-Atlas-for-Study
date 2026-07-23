import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventData, EraData, CategoryData } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Check,
  Search,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Layers
} from 'lucide-react';

interface TimelineViewProps {
  eras: EraData[];
  categories: CategoryData[];
  events: EventData[];
  selectedEventId: string | null;
  onSelectEvent: (event: EventData) => void;
  searchQuery: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  eras,
  categories,
  events,
  selectedEventId,
  onSelectEvent,
  searchQuery
}) => {
  // Category visibility toggle
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(() => {
    return new Set(categories.map(c => c.name));
  });

  const [showCategoryFilter, setShowCategoryFilter] = useState<boolean>(false);
  const [autoFilterViewport, setAutoFilterViewport] = useState<boolean>(true);
  const [viewportX, setViewportX] = useState<{ startX: number; endX: number }>({ startX: 0, endX: 2000 });

  // Zoom level: pixels per year
  const [pxPerYear, setPxPerYear] = useState<number>(0.5); // Default scale
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);

  // Label display mode: 'smart' (show label on closest to center + hovered + selected) vs 'all'
  const [labelDisplayMode, setLabelDisplayMode] = useState<'smart' | 'all'>('smart');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [isControlBarCollapsed, setIsControlBarCollapsed] = useState<boolean>(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCollapseCategory = (catName: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  // Touch pinch zoom refs
  const touchStartDistRef = useRef<number | null>(null);
  const initialPxPerYearRef = useRef<number>(pxPerYear);

  // Calculate timeline min & max bounds
  const minYear = -4100;
  const maxYear = 2050;
  const totalYears = maxYear - minYear;

  const timelineWidth = Math.max(1200, totalYears * pxPerYear);

  // Map year position to X coordinate in pixels
  const getXFromYear = (pos: number) => {
    return ((pos - minYear) / totalYears) * timelineWidth;
  };

  // Track viewport boundaries (scrollLeft to scrollLeft + clientWidth)
  const updateViewport = () => {
    if (containerRef.current) {
      const sLeft = containerRef.current.scrollLeft;
      const cWidth = containerRef.current.clientWidth;
      setViewportX({
        startX: sLeft,
        endX: sLeft + cWidth
      });
    }
  };

  useEffect(() => {
    updateViewport();
    const el = containerRef.current;
    if (!el) return;

    let animFrame: number;
    const handleScroll = () => {
      animFrame = requestAnimationFrame(updateViewport);
    };

    el.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateViewport);

    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateViewport);
    };
  }, [pxPerYear, timelineWidth]);

  // Toggle single category
  const toggleCategory = (catName: string) => {
    const newSet = new Set(visibleCategories);
    if (newSet.has(catName)) {
      newSet.delete(catName);
    } else {
      newSet.add(catName);
    }
    setVisibleCategories(newSet);
  };

  // Toggle all categories
  const toggleAllCategories = () => {
    if (visibleCategories.size === categories.length) {
      setVisibleCategories(new Set());
    } else {
      setVisibleCategories(new Set(categories.map(c => c.name)));
    }
  };

  // 1. Filter events based on search query & manual category toggles
  const baseFilteredEvents = useMemo(() => {
    return events.filter(e => {
      const isCatVisible = visibleCategories.has(e.category);
      if (!isCatVisible) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchText = e.text.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q) || false;
      return matchText || matchCat || matchDesc;
    });
  }, [events, visibleCategories, searchQuery]);

  // 2. Identify categories with events in the visible scroll window
  const categoriesInViewport = useMemo(() => {
    const set = new Set<string>();
    baseFilteredEvents.forEach(e => {
      const startX = getXFromYear(e.startPos);
      const endX = e.isPoint ? startX : getXFromYear(e.endPos);
      // Include buffer of 80px so items near edges are counted smoothly
      if (endX >= viewportX.startX - 80 && startX <= viewportX.endX + 80) {
        set.add(e.category);
      }
    });
    return set;
  }, [baseFilteredEvents, viewportX, timelineWidth, minYear, maxYear]);

  // 3. Final events list filtered by auto-viewport setting if active
  const finalFilteredEvents = useMemo(() => {
    if (!autoFilterViewport) return baseFilteredEvents;
    return baseFilteredEvents.filter(e => categoriesInViewport.has(e.category));
  }, [baseFilteredEvents, autoFilterViewport, categoriesInViewport]);

  // Compute event closest to the center of the current viewport
  const closestEventId = useMemo(() => {
    if (finalFilteredEvents.length === 0) return null;
    const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;

    let minDistance = Infinity;
    let closestId: string | null = null;

    finalFilteredEvents.forEach(e => {
      const eventX = getXFromYear(e.startPos);
      const dist = Math.abs(eventX - viewportCenterX);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = e.id;
      }
    });

    return closestId;
  }, [finalFilteredEvents, viewportX, timelineWidth, minYear, maxYear]);

  // Compute year corresponding to the center of the current viewport
  const centerYear = useMemo(() => {
    const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;
    return Math.round(minYear + (viewportCenterX / timelineWidth) * totalYears);
  }, [viewportX, timelineWidth, minYear, maxYear]);

  // Touch Pinch-to-Zoom Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      initialPxPerYearRef.current = pxPerYear;
    } else if (e.touches.length === 1 && containerRef.current) {
      setIsDragging(true);
      setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
      setScrollLeft(containerRef.current.scrollLeft);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const zoomRatio = currentDist / touchStartDistRef.current;
      const newScale = Math.min(10, Math.max(0.1, initialPxPerYearRef.current * zoomRatio));
      setPxPerYear(newScale);
    } else if (e.touches.length === 1 && isDragging && containerRef.current) {
      const x = e.touches[0].pageX - containerRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
    setIsDragging(false);
  };

  // Category Color Map
  const categoryColorMap = useMemo(() => {
    const map: { [name: string]: string } = {};
    categories.forEach(c => {
      map[c.name] = c.hexColor;
    });
    return map;
  }, [categories]);

  // Helper for fuzzy date bar styling (gradient fade for uncertain dates)
  const getEventBarStyle = (ev: EventData, baseColor: string) => {
    const colorStr = ev.defaultColor
      ? (ev.defaultColor.startsWith('#') || ev.defaultColor.startsWith('rgb') ? ev.defaultColor : `rgb(${ev.defaultColor})`)
      : baseColor;

    if (ev.fuzzyStart && ev.fuzzyEnd) {
      return {
        backgroundImage: `linear-gradient(to right, transparent 0%, ${colorStr} 30%, ${colorStr} 70%, transparent 100%)`
      };
    } else if (ev.fuzzyStart) {
      return {
        backgroundImage: `linear-gradient(to right, transparent 0%, ${colorStr} 35%)`
      };
    } else if (ev.fuzzyEnd) {
      return {
        backgroundImage: `linear-gradient(to right, ${colorStr} 65%, transparent 100%)`
      };
    }
    return {
      backgroundColor: colorStr
    };
  };

  interface PositionedEvent {
    event: EventData;
    startX: number;
    endX: number;
    sublaneIndex: number;
  }

  interface CategoryLane {
    categoryName: string;
    catColor: string;
    events: PositionedEvent[];
    numSublanes: number;
  }

  // Calculate layout with intelligent sublane allocation to prevent label & event overlap
  const layoutLanes = useMemo(() => {
    const lanesMap: { [cat: string]: CategoryLane } = {};

    const eventsByCat: { [cat: string]: EventData[] } = {};
    finalFilteredEvents.forEach(e => {
      if (!eventsByCat[e.category]) eventsByCat[e.category] = [];
      eventsByCat[e.category].push(e);
    });

    Object.entries(eventsByCat).forEach(([catName, catEvents]) => {
      // Sort events by start position
      const sortedEvents = [...catEvents].sort((a, b) => a.startPos - b.startPos);

      const tracks: { lastX: number }[] = [];
      const positioned: PositionedEvent[] = [];

      sortedEvents.forEach(ev => {
        const startX = getXFromYear(ev.startPos);
        const endX = ev.isPoint ? startX : getXFromYear(ev.endPos);
        const rangeWidth = Math.max(12, endX - startX);

        // Estimate visual label width for sublane allocation
        const labelWidthEstimate = ev.text.length * 6.5 + (ev.icon ? 24 : 12);
        const visualWidth = Math.max(rangeWidth, labelWidthEstimate);
        const visualEndX = startX + visualWidth + 12; // 12px safety gap between items on same track

        // Find available track
        let sublaneIndex = tracks.findIndex(t => t.lastX <= startX);
        if (sublaneIndex === -1) {
          tracks.push({ lastX: visualEndX });
          sublaneIndex = tracks.length - 1;
        } else {
          tracks[sublaneIndex].lastX = visualEndX;
        }

        positioned.push({
          event: ev,
          startX,
          endX,
          sublaneIndex
        });
      });

      lanesMap[catName] = {
        categoryName: catName,
        catColor: categoryColorMap[catName] || '#0080ff',
        events: positioned,
        numSublanes: tracks.length
      };
    });

    return lanesMap;
  }, [finalFilteredEvents, pxPerYear, timelineWidth, minYear, maxYear, categoryColorMap]);

  // Mouse Dragging (Panning)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Wheel Zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;
      setPxPerYear(prev => Math.min(10, Math.max(0.1, prev * zoomFactor)));
    }
  };

  // Ticks calculation
  const tickInterval = useMemo(() => {
    if (pxPerYear > 4) return 25;
    if (pxPerYear > 2) return 50;
    if (pxPerYear > 0.8) return 100;
    if (pxPerYear > 0.3) return 250;
    return 500;
  }, [pxPerYear]);

  const ticks = useMemo(() => {
    const list = [];
    let y = Math.ceil(minYear / tickInterval) * tickInterval;
    while (y <= maxYear) {
      if (y !== 0) list.push(y);
      y += tickInterval;
    }
    return list;
  }, [tickInterval, minYear, maxYear]);

  // Scroll to selected event when changed
  useEffect(() => {
    if (selectedEventId && containerRef.current) {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev) {
        const x = getXFromYear(ev.startPos);
        containerRef.current.scrollTo({
          left: Math.max(0, x - containerRef.current.clientWidth / 2),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedEventId]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-50 text-stone-900 select-none overflow-hidden relative">
      
      {/* CONTROL BAR (Collapsible & Compact) */}
      {isControlBarCollapsed ? (
        <div className="px-3 py-1.5 bg-white border-b border-stone-200 flex items-center justify-between gap-2 shrink-0 z-20 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 rounded-lg border border-stone-200 p-0.5">
              <button
                onClick={() => setPxPerYear(prev => Math.min(10, prev * 1.3))}
                className="p-1 hover:bg-stone-200 rounded text-stone-600 hover:text-stone-900"
                title="Zoom Avant (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-purple-600 font-bold">{pxPerYear.toFixed(1)}px/an</span>
              <button
                onClick={() => setPxPerYear(prev => Math.max(0.1, prev / 1.3))}
                className="p-1 hover:bg-stone-200 rounded text-stone-600 hover:text-stone-900"
                title="Zoom Arrière (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {centerYear !== null && (
              <span className="hidden sm:inline-block font-mono text-purple-700 bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-200 text-[11px] font-semibold">
                Centre : {formatDateFrench(centerYear)}
              </span>
            )}

            <button
              onClick={() => setLabelDisplayMode(prev => prev === 'smart' ? 'all' : 'smart')}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition ${
                labelDisplayMode === 'smart' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              {labelDisplayMode === 'smart' ? 'Milestones' : 'Toutes étiquettes'}
            </button>
          </div>

          <button
            onClick={() => setIsControlBarCollapsed(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition text-xs font-semibold"
            title="Afficher les filtres et options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contrôles & Filtres</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-2.5 bg-white border-b border-stone-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20 text-xs shadow-md">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setPxPerYear(prev => Math.min(10, prev * 1.3))}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition"
              title="Zoom Avant (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            
            <input
              type="range"
              min="0.1"
              max="8"
              step="0.1"
              value={pxPerYear}
              onChange={(e) => setPxPerYear(parseFloat(e.target.value))}
              className="w-20 accent-purple-600 cursor-pointer"
            />

            <button
              onClick={() => setPxPerYear(prev => Math.max(0.1, prev / 1.3))}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition"
              title="Zoom Arrière (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setPxPerYear(0.5)}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-600 hover:text-stone-900 transition ml-0.5"
              title="Réinitialiser le zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Milestone Focus Mode Toggle */}
          <button
            onClick={() => setLabelDisplayMode(prev => prev === 'smart' ? 'all' : 'smart')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
              labelDisplayMode === 'smart'
                ? 'bg-purple-100 border-purple-200 text-purple-700'
                : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
            }`}
            title={labelDisplayMode === 'smart' ? 'Mode Milestones : seul l\'événement au centre de l\'écran est nommé' : 'Afficher le nom de tous les événements'}
          >
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>{labelDisplayMode === 'smart' ? 'Mode Milestones (Centre)' : 'Toutes les étiquettes'}</span>
          </button>

          {/* Center Year Badge */}
          {centerYear !== null && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-xl text-xs font-mono">
              <span className="text-stone-500 text-[10px] font-sans">Centre :</span>
              <span className="font-bold text-purple-700">{formatDateFrench(centerYear)}</span>
            </div>
          )}

          {/* Viewport Auto-Filter Toggle Button */}
          <button
            onClick={() => setAutoFilterViewport(!autoFilterViewport)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
              autoFilterViewport
                ? 'bg-purple-100 border-purple-200 text-purple-700'
                : 'bg-stone-100 border-stone-200 text-stone-500 hover:bg-stone-200 hover:text-stone-700'
            }`}
            title="N'afficher que les catégories présentes dans la période actuellement visible"
          >
            <Sparkles className={`w-3.5 h-3.5 ${autoFilterViewport ? 'text-purple-600' : ''}`} />
            <span>Période visible : {autoFilterViewport ? 'ON' : 'OFF'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 font-bold">
              {Object.keys(layoutLanes).length} cat.
            </span>
          </button>

          {/* Category Manual Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition ${
                visibleCategories.size < categories.length
                  ? 'bg-purple-100 border-purple-200 text-purple-700'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Catégories ({visibleCategories.size}/{categories.length})</span>
            </button>

            {/* Category Dropdown */}
            {showCategoryFilter && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl p-3 shadow-2xl z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-100">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Catégories ({categories.length})
                  </span>
                  <button
                    onClick={toggleAllCategories}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    {visibleCategories.size === categories.length ? 'Désélectionner tout' : 'Tout cocher'}
                  </button>
                </div>

                <div className="space-y-1">
                  {categories.map((cat) => {
                    const isChecked = visibleCategories.has(cat.name);
                    return (
                      <button
                        key={cat.name}
                        onClick={() => toggleCategory(cat.name)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition text-left ${
                          isChecked ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.hexColor }}
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>
                        {isChecked ? <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsControlBarCollapsed(true)}
            className="p-1 px-2 rounded-lg hover:bg-stone-200 text-stone-500 hover:text-purple-700 transition flex items-center gap-1 border border-stone-200 hover:border-stone-300"
            title="Masquer le panneau de contrôle pour maximiser la vue"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Masquer</span>
          </button>
        </div>
      )}

      {/* TIMELINE SCROLL CANVAS CONTAINER */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 overflow-x-auto overflow-y-auto relative cursor-grab ${
          isDragging ? 'cursor-grabbing select-none' : ''
        }`}
      >
        <div
          style={{ width: `${timelineWidth}px` }}
          className="min-h-full relative pb-20 pt-4"
        >
          {/* 1. ERAS BACKGROUND BANNERS */}
          <div className="absolute top-0 left-0 right-0 h-12 flex z-0 border-b border-stone-200/60">
            {eras.map((era) => {
              const left = getXFromYear(era.startPos);
              const width = Math.max(2, getXFromYear(era.endPos) - left);
              return (
                <div
                  key={era.id}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    backgroundColor: `rgba(${era.color}, 0.1)`,
                    borderLeft: `1px solid rgba(${era.color}, 0.3)`
                  }}
                  className="absolute top-0 bottom-0 px-2 py-1 flex items-center overflow-hidden transition-all"
                  title={`${era.name} (${formatDateFrench(era.startYear)} → ${formatDateFrench(era.endYear)})`}
                >
                  <span
                    className="text-[11px] font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ color: '#444' }}
                  >
                    {era.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. YEAR TICKS & RULER */}
          <div className="sticky top-12 left-0 right-0 h-8 bg-white/90 border-b border-stone-200 z-10 flex items-center">
            {ticks.map((year) => {
              const x = getXFromYear(year);
              return (
                <div
                  key={year}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-between"
                >
                  <span className="text-[10px] text-stone-500 font-mono tracking-tighter whitespace-nowrap pt-0.5">
                    {formatDateFrench(year)}
                  </span>
                  <div className="w-[1px] h-2 bg-stone-300" />
                </div>
              );
            })}
          </div>

          {/* VERTICAL GRID LINES */}
          <div className="absolute top-20 bottom-0 left-0 right-0 pointer-events-none z-0">
            {ticks.map((year) => {
              const x = getXFromYear(year);
              return (
                <div
                  key={year}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 w-[1px] bg-stone-100 border-r border-dashed border-stone-200"
                />
              );
            })}
          </div>

          {/* VIEWPORT CENTER GUIDE LINE */}
          <div
            style={{ left: `${(viewportX.startX + viewportX.endX) / 2}px` }}
            className="absolute top-0 bottom-0 w-[2px] bg-purple-500/30 border-r border-purple-400/40 pointer-events-none z-20"
          >
            <div className="sticky top-12 -ml-3 px-1.5 py-0.5 bg-purple-500/90 text-white text-[9px] font-extrabold rounded shadow-md whitespace-nowrap">
              ▲ Centre
            </div>
          </div>

          {/* 3. EVENT LANES & MARKS (Sublane Stacking) */}
          <div className="mt-8 space-y-1 px-3 relative z-10">
            {(Object.values(layoutLanes) as CategoryLane[])
              .filter((lane) => lane.events.length > 0)
              .map((lane) => {
                const isManuallyCollapsed = collapsedCategories.has(lane.categoryName);
                const effectiveSublanes = isManuallyCollapsed ? 0 : lane.numSublanes;
                const SUBLANE_HEIGHT = 24;
                const laneHeight = effectiveSublanes * SUBLANE_HEIGHT;
                const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;

                return (
                  <div
                    key={lane.categoryName}
                    className="relative py-0.5 border-b border-slate-900/40 transition-all duration-200"
                  >
                    {/* Category Name Sticky Badge with Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleCollapseCategory(lane.categoryName)}
                      style={{ left: `${Math.max(8, viewportX.startX + 8)}px` }}
                      className="sticky left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-stone-200 shadow-sm text-[10px] font-bold z-20 cursor-pointer mb-0.5 hover:border-purple-300 transition-all group/badge"
                      title={isManuallyCollapsed ? "Cliquer pour déplier la catégorie" : "Cliquer pour replier la catégorie"}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.catColor }} />
                      <span className="text-stone-700 uppercase tracking-wider group-hover/badge:text-purple-700">{lane.categoryName}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-500 font-mono border border-stone-200">
                        {lane.events.length} ev.
                      </span>
                      {isManuallyCollapsed ? (
                        <ChevronDown className="w-3 h-3 text-purple-600" />
                      ) : (
                        <ChevronUp className="w-3 h-3 text-stone-400 group-hover/badge:text-purple-600" />
                      )}
                    </button>

                    {/* Events Container with exact height based on active sublanes */}
                    {!isManuallyCollapsed && (
                      <div className="relative transition-all duration-200" style={{ height: `${laneHeight}px` }}>
                        {lane.events.map(({ event: ev, startX, endX, sublaneIndex }) => {
                      const width = Math.max(16, endX - startX);
                      const isSelected = selectedEventId === ev.id;
                      const isClosest = closestEventId === ev.id;
                      const isHovered = hoveredEventId === ev.id;
                      const topPos = sublaneIndex * SUBLANE_HEIGHT;

                      // Calculate label horizontal position aligned to central line
                      const relCenterX = viewportCenterX - startX;
                      const labelOffsetX = ev.isPoint
                        ? 0
                        : width <= 80
                        ? 4
                        : Math.max(4, Math.min(width - 100, relCenterX - 30));

                      const barStyle = getEventBarStyle(ev, lane.catColor);

                      return (
                        <div
                          key={ev.id}
                          style={{
                            left: `${startX}px`,
                            top: `${topPos}px`,
                            width: ev.isPoint ? 'auto' : `${width}px`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          onMouseEnter={() => setHoveredEventId(ev.id)}
                          onMouseLeave={() => setHoveredEventId(null)}
                          className={`absolute cursor-pointer transition-all duration-150 group ${
                            isSelected || isClosest
                              ? 'z-30 scale-[1.02]'
                              : isHovered
                              ? 'z-20 scale-[1.01]'
                              : 'z-10'
                          }`}
                        >
                          {/* POINT EVENT MARKER OR PERIOD BAR */}
                          {ev.isPoint ? (
                            <div className="flex items-center gap-1.5 py-0.5">
                              <div
                                className={`w-3.5 h-3.5 rounded-full shrink-0 border-2 shadow-md transition-all ${
                                  isClosest
                                    ? 'ring-4 ring-purple-400/80 scale-125 border-purple-300 animate-pulse'
                                    : isSelected
                                    ? 'ring-4 ring-purple-400/50 scale-125 border-white'
                                    : 'border-white group-hover:scale-125'
                                }`}
                                style={barStyle}
                                title={`${ev.text} (${formatDateFrench(ev.startYear)})`}
                              />
                              {/* White Text Label next to point event */}
                              <div className="flex items-center gap-1 pointer-events-none whitespace-nowrap">
                                {ev.icon && (
                                  <img
                                    src={`data:image/png;base64,${ev.icon}`}
                                    alt=""
                                    className="w-3.5 h-3.5 object-contain rounded bg-white/90 p-0.5 border border-stone-200 shrink-0"
                                  />
                                )}
                                <span
                                  className={`text-[10px] sm:text-[11px] font-bold text-stone-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] ${
                                    isClosest || isSelected ? 'text-purple-700 text-xs font-extrabold' : ''
                                  }`}
                                >
                                  {ev.text}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                width: `${width}px`,
                                ...barStyle
                              }}
                              className={`h-5 rounded relative flex items-center overflow-hidden transition-all shadow-sm ${
                                isClosest
                                  ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-stone-50 opacity-100'
                                  : isSelected
                                  ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-stone-50 opacity-100'
                                  : 'opacity-90 group-hover:opacity-100'
                              }`}
                              title={`${ev.text} (${formatDateFrench(ev.startYear)} - ${formatDateFrench(ev.endYear)}) ${ev.fuzzyStart ? '[Début incertain]' : ''} ${ev.fuzzyEnd ? '[Fin incertaine]' : ''}`}
                            >
                              {/* WHITE TEXT LABEL ON THE BAR (TRANSPARENT BACKGROUND, ALIGNED TO CENTRAL LINE) */}
                              <div
                                style={{ transform: `translateX(${labelOffsetX}px)` }}
                                className="absolute left-0 top-0 bottom-0 flex items-center gap-1 px-1 text-white font-bold text-[10px] sm:text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] whitespace-nowrap pointer-events-none transition-transform duration-75"
                              >
                                {ev.icon && (
                                  <img
                                    src={`data:image/png;base64,${ev.icon}`}
                                    alt=""
                                    className="w-3.5 h-3.5 object-contain rounded bg-white/60 p-0.5 border border-stone-200/60 shrink-0"
                                  />
                                )}
                                <span className={isClosest || isSelected ? 'text-purple-100 font-extrabold' : ''}>
                                  {ev.text}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* BOTTOM LEGEND BAR */}
      <div className="bg-white border-t border-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-30 shadow-2xl backdrop-blur-md">
        
        {/* Category Legend Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
          <span className="text-stone-500 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            Légende des catégories :
          </span>

          {categories.map((cat) => {
            const isVisible = visibleCategories.has(cat.name);
            const isInViewport = categoriesInViewport.has(cat.name);
            const catEventsCount = (layoutLanes[cat.name]?.events || []).length;

            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition shrink-0 ${
                  !isVisible
                    ? 'bg-stone-100 border-stone-200 text-stone-400 line-through opacity-50'
                    : autoFilterViewport && !isInViewport
                    ? 'bg-stone-50 border-stone-200 text-stone-500 opacity-60'
                    : 'bg-white border-stone-200 text-stone-900 hover:border-purple-300'
                }`}
                title={
                  !isVisible
                    ? `${cat.name} (Masquée)`
                    : autoFilterViewport && !isInViewport
                    ? `${cat.name} (Hors période visible)`
                    : `${cat.name} (${catEventsCount} événement${catEventsCount > 1 ? 's' : ''})`
                }
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isVisible ? cat.hexColor : '#cbd5e1' }}
                />
                <span>{cat.name}</span>
                {isVisible && (
                  <span className={`text-[10px] px-1.5 py-0.1 rounded-full font-bold ${
                    isInViewport ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {catEventsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Viewport Filter Status Indicator */}
        <div className="flex items-center gap-2 shrink-0 text-stone-500 text-[11px]">
          <span>
            {autoFilterViewport ? (
              <span className="text-purple-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Catégories de la zone visible ({Object.keys(layoutLanes).length})
              </span>
            ) : (
              <span>Toutes les catégories affichées ({categories.length})</span>
            )}
          </span>
        </div>

      </div>

    </div>
  );
};

