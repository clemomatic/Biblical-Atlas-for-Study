import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventData, EraData, CategoryData, TimelinePeriod } from '../types';
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
  Layers,
  BookOpen,
  Maximize2,
  X,
  Compass
} from 'lucide-react';

interface TimelineViewProps {
  eras: EraData[];
  categories: CategoryData[];
  events: EventData[];
  selectedEventId: string | null;
  onSelectEvent: (event: EventData) => void;
  onVisiblePeriodChange: (period: TimelinePeriod) => void;
  searchQuery: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  eras,
  categories,
  events,
  selectedEventId,
  onSelectEvent,
  onVisiblePeriodChange,
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

  // Label display mode: 'auto' (adaptive by zoom) vs 'compact' vs 'full'
  const [labelDisplayMode, setLabelDisplayMode] = useState<'auto' | 'compact' | 'full'>('auto');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<PositionedCluster | null>(null);
  const [enableClustering, setEnableClustering] = useState<boolean>(true);
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
  const viewportRenderMargin = 240;

  // Map year position to X coordinate in pixels
  const getXFromYear = (pos: number) => {
    return ((pos - minYear) / totalYears) * timelineWidth;
  };

  const getYearFromX = (x: number) =>
    minYear + (Math.max(0, Math.min(timelineWidth, x)) / timelineWidth) * totalYears;

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

  useEffect(() => {
    setVisibleCategories(new Set(categories.map(category => category.name)));
    setCollapsedCategories(previous => {
      const availableNames = new Set(categories.map(category => category.name));
      return new Set([...previous].filter(name => availableNames.has(name)));
    });
  }, [categories]);

  useEffect(() => {
    onVisiblePeriodChange({
      startYear: getYearFromX(viewportX.startX),
      endYear: getYearFromX(viewportX.endX)
    });
  }, [viewportX, timelineWidth, onVisiblePeriodChange]);

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
      if (
        endX >= viewportX.startX - viewportRenderMargin &&
        startX <= viewportX.endX + viewportRenderMargin
      ) {
        set.add(e.category);
      }
    });
    return set;
  }, [baseFilteredEvents, viewportX, timelineWidth, minYear, maxYear]);

  // 3. Filter each event interval, rather than retaining an entire category.
  const finalFilteredEvents = useMemo(() => {
    if (!autoFilterViewport) return baseFilteredEvents;
    return baseFilteredEvents.filter(event => {
      const eventStartX = getXFromYear(event.startPos);
      const eventEndX = event.isPoint
        ? eventStartX
        : getXFromYear(event.endPos);
      return (
        eventEndX >= viewportX.startX - viewportRenderMargin &&
        eventStartX <= viewportX.endX + viewportRenderMargin
      );
    });
  }, [
    baseFilteredEvents,
    autoFilterViewport,
    viewportX,
    timelineWidth,
    minYear,
    maxYear
  ]);

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

  // Global Progress Bar calculations
  const [hoveredProgressInfo, setHoveredProgressInfo] = useState<{ year: number; xRatio: number } | null>(null);

  const thumbLeftPercent = useMemo(() => {
    if (!timelineWidth) return 0;
    return (viewportX.startX / timelineWidth) * 100;
  }, [viewportX.startX, timelineWidth]);

  const thumbWidthPercent = useMemo(() => {
    if (!timelineWidth) return 0;
    const containerWidth = viewportX.endX - viewportX.startX;
    return (containerWidth / timelineWidth) * 100;
  }, [viewportX.startX, viewportX.endX, timelineWidth]);

  const centerPercent = useMemo(() => {
    if (!timelineWidth) return 0;
    const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;
    return (viewportCenterX / timelineWidth) * 100;
  }, [viewportX.startX, viewportX.endX, timelineWidth]);

  const currentEra = useMemo(() => {
    if (centerYear === null) return null;
    return eras.find(e => centerYear >= e.startYear && centerYear <= e.endYear) || null;
  }, [centerYear, eras]);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !timelineWidth) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const containerWidth = containerRef.current.clientWidth;
    const targetX = ratio * timelineWidth - containerWidth / 2;
    containerRef.current.scrollTo({
      left: Math.max(0, Math.min(timelineWidth - containerWidth, targetX)),
      behavior: 'smooth'
    });
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineWidth) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const hoveredYear = Math.round(minYear + ratio * totalYears);
    setHoveredProgressInfo({ year: hoveredYear, xRatio: ratio });
  };

  // Touch Pinch-to-Zoom Handlers (2-finger zoom; 1-finger native scroll)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      initialPxPerYearRef.current = pxPerYear;
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
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
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

  interface PositionedCluster {
    id: string;
    isCluster: boolean;
    events: EventData[];
    startX: number;
    endX: number;
    avgStartYear: number;
    minYear: number;
    maxYear: number;
    sublaneIndex: number;
    primaryEvent: EventData;
  }

  interface CategoryLane {
    categoryName: string;
    catColor: string;
    events: PositionedCluster[];
    numSublanes: number;
    totalEventsCount: number;
  }

  const isLowZoomMode =
    labelDisplayMode === 'compact' ||
    (labelDisplayMode === 'auto' && pxPerYear < 0.45);

  // Dynamic pixel distance threshold to merge adjacent events into a single cluster
  const clusterPixelRadius = useMemo(() => {
    if (!enableClustering) return 0;
    if (pxPerYear < 0.3) return 48; // Group items within 48px when heavily zoomed out
    if (pxPerYear < 0.65) return 36; // Group items within 36px at low zoom
    if (labelDisplayMode === 'compact') return 28;
    return 20; // Default threshold to merge exact overlapping items
  }, [enableClustering, pxPerYear, labelDisplayMode]);

  // Click handler to expand/zoom into a cluster and center timeline
  const handleClusterClick = (cluster: PositionedCluster) => {
    setSelectedCluster(cluster);

    // Calculate zoom level to expand the cluster
    const yearSpan = Math.max(12, cluster.maxYear - cluster.minYear + 8);
    const containerWidth = containerRef.current?.clientWidth || 800;
    const targetPx = Math.min(8, Math.max(containerWidth / (yearSpan * 1.6), pxPerYear * 2.2));

    setPxPerYear(targetPx);

    setTimeout(() => {
      if (containerRef.current) {
        const centerPos = getXFromYear(cluster.avgStartYear);
        containerRef.current.scrollTo({
          left: centerPos - containerWidth / 2,
          behavior: 'smooth'
        });
      }
    }, 60);
  };

  // Calculate layout with intelligent clustering and sublane allocation to prevent label & event overlap
  const layoutLanes = useMemo(() => {
    const lanesMap: { [cat: string]: CategoryLane } = {};

    const eventsByCat: { [cat: string]: EventData[] } = {};
    finalFilteredEvents.forEach(e => {
      const isBookPeriod =
        e.category.toLowerCase().includes('livre biblique') ||
        e.category.toLowerCase().includes('livres bibliques') ||
        e.category.toLowerCase().includes('période livre') ||
        e.category.toLowerCase().includes('periode livre');

      if (e.isPoint && !isBookPeriod) {
        const pointCatName = 'Événements';
        if (!eventsByCat[pointCatName]) eventsByCat[pointCatName] = [];
        eventsByCat[pointCatName].push(e);
      } else {
        if (!eventsByCat[e.category]) eventsByCat[e.category] = [];
        eventsByCat[e.category].push(e);
      }
    });

    // Ensure 'Événements' comes first if it exists
    const categoryKeys = Object.keys(eventsByCat).sort((a, b) => {
      if (a === 'Événements') return -1;
      if (b === 'Événements') return 1;
      return a.localeCompare(b);
    });

    categoryKeys.forEach(catName => {
      const catEvents = eventsByCat[catName];
      const sortedEvents = [...catEvents].sort((a, b) => a.startPos - b.startPos);

      const isBookCategory =
        catName.toLowerCase().includes('livre biblique') ||
        catName.toLowerCase().includes('période livre') ||
        catName.toLowerCase().includes('periode livre');

      // 1. Group nearby events into raw clusters (skip for biblical book background cards)
      const rawClusters: EventData[][] = [];
      if (clusterPixelRadius > 0 && !isBookCategory) {
        sortedEvents.forEach(ev => {
          const evX = getXFromYear(ev.startPos);
          if (rawClusters.length === 0) {
            rawClusters.push([ev]);
          } else {
            const currentGroup = rawClusters[rawClusters.length - 1];
            const lastInGroupX = getXFromYear(currentGroup[currentGroup.length - 1].startPos);
            const firstInGroupX = getXFromYear(currentGroup[0].startPos);

            // Merge into group if close in pixel distance
            if (evX - lastInGroupX <= clusterPixelRadius || evX - firstInGroupX <= clusterPixelRadius * 1.5) {
              currentGroup.push(ev);
            } else {
              rawClusters.push([ev]);
            }
          }
        });
      } else {
        sortedEvents.forEach(ev => rawClusters.push([ev]));
      }

      // 2. Position raw clusters into sublane tracks
      const tracks: { lastX: number }[] = [];
      const positionedClusters: PositionedCluster[] = [];

      rawClusters.forEach((group, groupIdx) => {
        const isCluster = group.length > 1;
        const primaryEvent = group[0];

        const minYear = Math.min(...group.map(e => e.startYear));
        const maxYear = Math.max(...group.map(e => e.endYear || e.startYear));
        const avgStartYear = Math.round(group.reduce((acc, e) => acc + e.startYear, 0) / group.length);

        const startX = getXFromYear(avgStartYear);
        const endX = isCluster
          ? Math.max(startX + 36, getXFromYear(maxYear))
          : (primaryEvent.isPoint ? startX : getXFromYear(primaryEvent.endPos));

        const rangeWidth = Math.max(16, endX - startX);

        let labelWidthEstimate: number;
        if (isCluster) {
          labelWidthEstimate = 65 + Math.min(30, group.length * 4);
        } else if (isLowZoomMode) {
          labelWidthEstimate = primaryEvent.isPoint ? 18 : Math.min(60, rangeWidth);
        } else {
          labelWidthEstimate = primaryEvent.text.length * 6.5 + (primaryEvent.icon ? 24 : 12) + (primaryEvent.isPoint ? 65 : 0);
        }

        const visualWidth = Math.max(rangeWidth, labelWidthEstimate);
        const visualEndX = startX + visualWidth + (isLowZoomMode ? 8 : 12);

        // Find available track
        let sublaneIndex = tracks.findIndex(t => t.lastX <= startX);
        if (sublaneIndex === -1) {
          tracks.push({ lastX: visualEndX });
          sublaneIndex = tracks.length - 1;
        } else {
          tracks[sublaneIndex].lastX = visualEndX;
        }

        positionedClusters.push({
          id: isCluster ? `cluster-${catName}-${groupIdx}-${group.length}` : primaryEvent.id,
          isCluster,
          events: group,
          startX,
          endX,
          avgStartYear,
          minYear,
          maxYear,
          sublaneIndex,
          primaryEvent
        });
      });

      lanesMap[catName] = {
        categoryName: catName,
        catColor: categoryColorMap[catName] || (catName === 'Événements' ? '#2563eb' : '#0080ff'),
        events: positionedClusters,
        numSublanes: tracks.length,
        totalEventsCount: catEvents.length
      };
    });

    return lanesMap;
  }, [finalFilteredEvents, pxPerYear, timelineWidth, minYear, maxYear, categoryColorMap, isLowZoomMode, clusterPixelRadius, enableClustering]);

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
          {/* Zoom Controls & Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
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

            {/* Quick Zoom Presets */}
            <div className="h-4 w-[1px] bg-stone-300 mx-0.5" />
            <button
              onClick={() => setPxPerYear(0.2)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear <= 0.25 ? 'bg-purple-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-200'
              }`}
              title="Vue d'ensemble complète (-4000 à +2000)"
            >
              Vue globale
            </button>
            <button
              onClick={() => setPxPerYear(0.6)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear > 0.25 && pxPerYear <= 1 ? 'bg-purple-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-200'
              }`}
              title="Vue d'ensemble équilibrée"
            >
              Standard
            </button>
            <button
              onClick={() => setPxPerYear(1.8)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear > 1 ? 'bg-purple-600 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-200'
              }`}
              title="Vue détaillée avec fort zoom"
            >
              Détails
            </button>
          </div>

          {/* Density / Readability Mode Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase px-1 hidden lg:inline">
              Densité :
            </span>
            <button
              onClick={() => setLabelDisplayMode('auto')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                labelDisplayMode === 'auto'
                  ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title="Affichage adaptatif : masque les étiquettes superflues en zoom arrière, les révèle au survol ou à la sélection"
            >
              <Sparkles className="w-3 h-3 text-purple-200" />
              <span>Auto</span>
            </button>
            <button
              onClick={() => setLabelDisplayMode('compact')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                labelDisplayMode === 'compact'
                  ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title="Mode épuré : affiche uniquement les marqueurs point, survolez un point pour voir son titre"
            >
              Épuré
            </button>
            <button
              onClick={() => setLabelDisplayMode('full')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                labelDisplayMode === 'full'
                  ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title="Mode complet : affiche toutes les étiquettes sans restriction"
            >
              Complet
            </button>
          </div>

          {/* Clustering Toggle Button */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setEnableClustering(!enableClustering)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                enableClustering
                  ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-800'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200'
              }`}
              title={
                enableClustering
                  ? "Regroupement activé : regroupe les événements proches à faible zoom"
                  : "Regroupement désactivé : affiche chaque événement individuellement"
              }
            >
              <Layers className="w-3.5 h-3.5 text-purple-200" />
              <span>Regroupement {enableClustering ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Center Year Badge */}
          {centerYear !== null && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-xl text-xs font-mono">
              <span className="text-stone-500 text-[10px] font-sans">Centre :</span>
              <span className="font-bold text-purple-700">{formatDateFrench(centerYear)}</span>
            </div>
          )}

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

      {/* READABILITY HELPER BANNER WHEN ZOOMED OUT */}
      {isLowZoomMode && (
        <div className="bg-purple-900/90 text-purple-100 px-3.5 py-1 text-xs flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm border-b border-purple-800 font-sans">
          <div className="flex items-center gap-2 font-medium truncate">
            <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Vue d'ensemble ({pxPerYear.toFixed(1)} px/an)</strong> : Survolez ou cliquez sur un événement pour révéler ses détails.
            </span>
          </div>
          <button
            onClick={() => setLabelDisplayMode('full')}
            className="text-[11px] uppercase font-bold underline text-purple-200 hover:text-white shrink-0 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-700/80 transition"
          >
            Tout afficher
          </button>
        </div>
      )}

      {/* DISCRETE GLOBAL BIBLICAL HISTORY PROGRESS BAR */}
      <div className="bg-stone-900/95 backdrop-blur-md text-stone-200 text-xs border-b border-stone-800 z-30 shrink-0 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 shadow-md select-none">
        {/* Current position badge */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <Compass className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
          <span className="font-sans font-medium text-stone-400 hidden sm:inline text-[11px]">Position :</span>
          <span className="font-bold text-white bg-purple-900/80 px-2 py-0.5 rounded border border-purple-600/60 shadow-sm text-[11px] sm:text-xs">
            {centerYear !== null ? formatDateFrench(centerYear) : '—'}
          </span>
          {currentEra && (
            <span className="text-stone-300 text-[10px] sm:text-[11px] font-sans truncate max-w-[150px] sm:max-w-[260px] hidden md:inline">
              · {currentEra.name}
            </span>
          )}
        </div>

        {/* Interactive Progress Track */}
        <div
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={() => setHoveredProgressInfo(null)}
          className="flex-1 max-w-lg h-3 sm:h-3.5 bg-stone-800/90 hover:bg-stone-800 rounded-full border border-stone-700/80 relative cursor-pointer overflow-hidden group shadow-inner transition-all"
          title="Cliquer ou survoler pour naviguer rapidement dans l'histoire biblique"
        >
          {/* Mini Eras color background track */}
          <div className="absolute inset-0 flex opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none">
            {eras.map((era) => {
              const eraStartRatio = Math.max(0, (era.startYear - minYear) / totalYears);
              const eraEndRatio = Math.min(1, (era.endYear - minYear) / totalYears);
              const eraWidthRatio = Math.max(0, eraEndRatio - eraStartRatio);
              return (
                <div
                  key={era.id}
                  style={{
                    left: `${eraStartRatio * 100}%`,
                    width: `${eraWidthRatio * 100}%`,
                    backgroundColor: `rgb(${era.color})`
                  }}
                  className="absolute top-0 bottom-0 border-r border-stone-900/40"
                />
              );
            })}
          </div>

          {/* Viewport Range Thumb Indicator */}
          <div
            style={{
              left: `${thumbLeftPercent}%`,
              width: `${Math.max(1.5, thumbWidthPercent)}%`
            }}
            className="absolute top-0 bottom-0 bg-purple-500/90 group-hover:bg-purple-400 rounded-full shadow-md ring-1 ring-white/60 transition-all pointer-events-none"
          />

          {/* Center line pin */}
          <div
            style={{ left: `${centerPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-sm -translate-x-1/2 z-10 pointer-events-none"
          />

          {/* Hover preview tooltip line */}
          {hoveredProgressInfo && (
            <div
              style={{ left: `${hoveredProgressInfo.xRatio * 100}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-purple-300 -translate-x-1/2 pointer-events-none z-20 shadow-sm"
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-stone-900 text-purple-200 border border-purple-600/80 text-[10px] font-mono rounded shadow-xl whitespace-nowrap">
                Aller à : {formatDateFrench(hoveredProgressInfo.year)}
              </div>
            </div>
          )}
        </div>

        {/* Global timeline span & percentage readout */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-stone-400 shrink-0">
          <span className="font-bold text-purple-300">{Math.round(centerPercent)}%</span>
          <span className="hidden lg:inline text-stone-500 text-[10px]">(-4100 → 2050)</span>
        </div>
      </div>

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
                 {/* VIEWPORT CENTER GUIDE LINE */}
          <div
            style={{ left: `${(viewportX.startX + viewportX.endX) / 2}px` }}
            className="absolute top-0 bottom-0 w-[2px] bg-purple-600/50 pointer-events-none z-30"
          >
            <div className="sticky top-2 -translate-x-1/2 w-max max-w-[90vw] px-4 py-1.5 bg-purple-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xl border-2 border-purple-300 whitespace-nowrap text-center z-40 pointer-events-auto font-mono tracking-tight ring-2 ring-purple-900/20">
              {centerYear !== null ? formatDateFrench(centerYear) : 'Centre'}
            </div>
          </div>

          {/* BIBLICAL BOOK PERIODS BACKGROUND OVERLAY LAYER (HABILLAGE DE FOND) */}
          <div className="absolute top-20 bottom-0 left-0 right-0 pointer-events-none z-0">
            {(Object.values(layoutLanes) as CategoryLane[])
              .filter((lane) =>
                lane.categoryName.toLowerCase().includes('livre biblique') ||
                lane.categoryName.toLowerCase().includes('période livre') ||
                lane.categoryName.toLowerCase().includes('periode livre')
              )
              .flatMap((lane) => lane.events)
              .map(({ primaryEvent: ev, startX, endX, sublaneIndex }) => {
                const width = Math.max(32, endX - startX);
                const isSelected = selectedEventId === ev.id;
                const isClosest = closestEventId === ev.id;
                const isHovered = hoveredEventId === ev.id;

                // Color palette variants for overlapping book periods
                const gradients = [
                  'from-purple-100/70 via-indigo-50/40 to-purple-50/20 border-purple-300/80',
                  'from-indigo-100/70 via-purple-50/40 to-indigo-50/20 border-indigo-300/80',
                  'from-fuchsia-100/70 via-purple-50/40 to-fuchsia-50/20 border-fuchsia-300/80',
                  'from-violet-100/70 via-purple-50/40 to-violet-50/20 border-violet-300/80',
                ];
                const gradientStyle = gradients[sublaneIndex % gradients.length];

                // Sticky label horizontal offset within the book period span
                const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;
                const relCenterX = viewportCenterX - startX;
                const labelOffsetX = Math.max(8, Math.min(width - 160, relCenterX - 40));

                // Vertical offset when book periods overlap
                const topOffset = sublaneIndex * 32;

                return (
                  <div
                    key={`bg-book-${ev.id}`}
                    style={{
                      left: `${startX}px`,
                      width: `${width}px`,
                      top: `${topOffset}px`,
                      bottom: '4px',
                    }}
                    onMouseEnter={() => setHoveredEventId(ev.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className={`absolute rounded-2xl border-2 transition-all duration-200 pointer-events-none group bg-gradient-to-b ${gradientStyle} ${
                      isSelected || isClosest
                        ? 'ring-2 ring-purple-600 border-purple-600 shadow-lg z-5 bg-purple-100/90'
                        : 'hover:border-purple-500 hover:shadow-md z-0'
                    }`}
                    title={`Période du livre biblique : ${ev.text} (${formatDateFrench(ev.startYear)} – ${formatDateFrench(ev.endYear)})`}
                  >
                    {/* STICKY HEADER BADGE FOR THE BOOK PERIOD BACKGROUND CARD (CLICKABLE) */}
                    <div
                      style={{ transform: `translateX(${labelOffsetX}px)` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="sticky top-10 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/95 backdrop-blur-sm border border-purple-300 shadow-md rounded-lg text-purple-950 font-extrabold text-[11px] sm:text-xs z-1 transition-transform duration-75 whitespace-nowrap hover:border-purple-600 hover:bg-purple-100 pointer-events-auto cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span className="font-serif tracking-tight font-bold">{ev.text}</span>
                      <span className="text-[10px] font-mono text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                        {formatDateFrench(ev.startYear)} → {formatDateFrench(ev.endYear)}
                      </span>
                    </div>

                    {/* BOTTOM WATERMARK NAME */}
                    <div className="absolute bottom-2 left-3 right-3 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                      <span className="text-xl sm:text-2xl font-serif font-black text-purple-900 tracking-wider uppercase block truncate">
                        {ev.text}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* 3. EVENT LANES & MARKS (Sublane Stacking) */}
          <div className="mt-8 space-y-1 px-3 relative z-20">
            {(Object.values(layoutLanes) as CategoryLane[])
              .filter(
                (lane) =>
                  lane.events.length > 0 &&
                  !lane.categoryName.toLowerCase().includes('livre biblique') &&
                  !lane.categoryName.toLowerCase().includes('période livre') &&
                  !lane.categoryName.toLowerCase().includes('periode livre')
              )
              .map((lane) => {
                const isManuallyCollapsed = collapsedCategories.has(lane.categoryName);
                const effectiveSublanes = isManuallyCollapsed ? 0 : lane.numSublanes;
                const SUBLANE_HEIGHT = 24;
                const laneHeight = effectiveSublanes * SUBLANE_HEIGHT;
                const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;

                return (
                  <div
                    key={lane.categoryName}
                    className="relative py-1 border-b border-stone-200/80 transition-all duration-200 my-1"
                  >
                    {/* Category Name Sticky Badge with Collapse Toggle */}
                    {lane.categoryName === 'Événements' ? (
                      <button
                        type="button"
                        onClick={() => toggleCollapseCategory(lane.categoryName)}
                        style={{ left: `${Math.max(8, viewportX.startX + 8)}px` }}
                        className="sticky left-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-md text-[10px] sm:text-[11px] font-extrabold z-35 cursor-pointer mb-1.5 transition-all group/badge bg-blue-700 text-white border-blue-800 hover:bg-blue-800 ring-2 ring-blue-500/20"
                        title={isManuallyCollapsed ? "Cliquer pour déplier la ligne des événements" : "Cliquer pour replier la ligne des événements"}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                        <span className="text-white uppercase tracking-wider font-extrabold">
                          Événements
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono border bg-blue-800 text-blue-100 border-blue-600">
                          {lane.totalEventsCount} ev.
                        </span>
                        {isManuallyCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-blue-200" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleCollapseCategory(lane.categoryName)}
                        style={{ left: `${Math.max(8, viewportX.startX + 8)}px` }}
                        className="sticky left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm text-[10px] sm:text-[11px] font-bold z-35 cursor-pointer mb-1 transition-all group/badge bg-white border-stone-200 text-stone-700 hover:border-purple-300"
                        title={isManuallyCollapsed ? "Cliquer pour déplier la catégorie" : "Cliquer pour replier la catégorie"}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.catColor }} />
                        <span className="text-stone-700 uppercase tracking-wider group-hover/badge:text-purple-700">
                          {lane.categoryName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono border bg-stone-100 text-stone-500 border-stone-200">
                          {lane.totalEventsCount} ev.
                        </span>
                        {isManuallyCollapsed ? (
                          <ChevronDown className="w-3 h-3 text-purple-600" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-stone-400 group-hover/badge:text-purple-600" />
                        )}
                      </button>
                    )}

                    {/* Events Container with exact height based on active sublanes */}
                    {!isManuallyCollapsed && (
                      <div className="relative transition-all duration-200" style={{ height: `${laneHeight}px` }}>
                        {lane.events.map((clusterItem) => {
                          const topPos = clusterItem.sublaneIndex * SUBLANE_HEIGHT;

                          // RENDER CLUSTER MARKER IF MULTIPLE EVENTS GROUPED
                          if (clusterItem.isCluster) {
                            const isHoveredCluster = hoveredClusterId === clusterItem.id;
                            const isClusterSelected = selectedCluster?.id === clusterItem.id;

                            return (
                              <div
                                key={clusterItem.id}
                                style={{
                                  left: `${clusterItem.startX}px`,
                                  top: `${topPos}px`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClusterClick(clusterItem);
                                }}
                                onMouseEnter={() => setHoveredClusterId(clusterItem.id)}
                                onMouseLeave={() => setHoveredClusterId(null)}
                                className={`absolute cursor-pointer transition-all duration-150 group hover:scale-105 select-none pointer-events-auto touch-manipulation ${
                                  isClusterSelected ? 'z-40' : isHoveredCluster ? 'z-30' : 'z-20'
                                }`}
                              >
                                {/* Cluster Badge Pill */}
                                <div
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white font-extrabold text-xs shadow-md border-2 border-white ring-2 transition-all ${
                                    isClusterSelected
                                      ? 'ring-purple-600 scale-110 shadow-lg'
                                      : 'ring-purple-400/50 hover:ring-purple-600 hover:shadow-lg'
                                  }`}
                                  style={{ backgroundColor: lane.catColor }}
                                >
                                  <Layers className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
                                  <span className="font-mono text-xs">{clusterItem.events.length}</span>
                                  <span className="text-[10px] font-sans font-medium opacity-90 hidden sm:inline">
                                    ({formatDateFrench(clusterItem.minYear)} → {formatDateFrench(clusterItem.maxYear)})
                                  </span>
                                </div>

                                {/* Floating Hover Popover Tooltip for Cluster */}
                                {isHoveredCluster && (
                                  <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-stone-900/95 text-white text-xs rounded-xl shadow-2xl border border-stone-700 z-50 pointer-events-none space-y-1.5 font-sans ring-2 ring-purple-500/30">
                                    <div className="flex items-center justify-between border-b border-stone-700 pb-1.5">
                                      <span className="font-extrabold text-purple-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                        <Layers className="w-3.5 h-3.5" />
                                        {clusterItem.events.length} événements regroupés
                                      </span>
                                      <span className="text-[10px] font-mono text-stone-400">
                                        {formatDateFrench(clusterItem.minYear)} à {formatDateFrench(clusterItem.maxYear)}
                                      </span>
                                    </div>
                                    <ul className="space-y-1.5 max-h-48 overflow-y-auto text-[11px] pr-1">
                                      {clusterItem.events.map((ev, idx) => (
                                        <li key={ev.id || idx} className="flex items-start gap-1.5 text-stone-200">
                                          <span className="text-purple-400 font-bold shrink-0">•</span>
                                          <div className="flex-1 min-w-0">
                                            <span className="font-bold truncate block">{ev.text}</span>
                                            <span className="text-[9px] text-stone-400 font-mono">
                                              {formatDateFrench(ev.startYear)} {ev.endYear ? `→ ${formatDateFrench(ev.endYear)}` : ''}
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="pt-1.5 border-t border-stone-800 text-[10px] text-purple-300 font-medium italic text-center flex items-center justify-center gap-1">
                                      <Sparkles className="w-3 h-3 text-purple-300" />
                                      Cliquer pour zoomer et déplier ces événements
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // RENDER SINGLE EVENT (WHEN NOT CLUSTERED)
                          const ev = clusterItem.primaryEvent;
                          const startX = clusterItem.startX;
                          const endX = clusterItem.endX;
                          const width = Math.max(16, endX - startX);
                          const isSelected = selectedEventId === ev.id;
                          const isClosest = closestEventId === ev.id;
                          const isHovered = hoveredEventId === ev.id;

                          // Calculate label horizontal position aligned to central line
                          const relCenterX = viewportCenterX - startX;
                          const labelOffsetX = ev.isPoint
                            ? 0
                            : width <= 80
                            ? 4
                            : Math.max(4, Math.min(width - 180, relCenterX - 40));

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
                              className={`absolute cursor-pointer transition-all duration-150 group pointer-events-auto touch-manipulation ${
                                isSelected || isClosest
                                  ? 'z-40 scale-[1.01]'
                                  : isHovered
                                  ? 'z-30 scale-[1.005]'
                                  : 'z-20'
                              }`}
                            >
                              {/* POINT EVENT MARKER OR PERIOD BAR */}
                              {ev.isPoint ? (
                                <div className="flex items-center gap-1.5 py-0.5 relative">
                                  <div
                                    className={`w-3.5 h-3.5 rounded-full shrink-0 border-2 shadow-md transition-all ${
                                      isClosest
                                        ? 'ring-4 ring-purple-400/80 scale-125 border-purple-300 animate-pulse'
                                        : isSelected
                                        ? 'ring-4 ring-purple-400/50 scale-125 border-white'
                                        : isHovered
                                        ? 'ring-2 ring-purple-300 scale-125 border-white'
                                        : 'border-white group-hover:scale-125'
                                    }`}
                                    style={barStyle}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)})`}
                                  />
                                  
                                  {/* Text Label next to point event (Always shown in full mode, or on hover/select/closest in low zoom mode) */}
                                  {(!isLowZoomMode || isSelected || isClosest || isHovered) && (
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
                                          isClosest || isSelected
                                            ? 'text-purple-900 text-xs font-extrabold bg-purple-100/90 px-1.5 py-0.5 rounded shadow-sm border border-purple-300'
                                            : isHovered && isLowZoomMode
                                            ? 'text-purple-900 text-[11px] font-extrabold bg-white/95 px-1.5 py-0.5 rounded shadow-md border border-purple-200 z-50'
                                            : ''
                                        }`}
                                      >
                                        {ev.text}
                                      </span>
                                    </div>
                                  )}

                                  {/* FLOATING HOVER TOOLTIP BADGE IN LOW ZOOM MODE */}
                                  {isLowZoomMode && isHovered && !isSelected && !isClosest && (
                                    <div className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1 bg-stone-900/95 text-white text-[11px] font-sans font-medium rounded-lg shadow-xl border border-stone-700 whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 ring-2 ring-purple-500/30">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                                        {formatDateFrench(ev.startYear)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative">
                                  <div
                                    style={{
                                      width: `${width}px`,
                                      ...barStyle
                                    }}
                                    className={`h-5 rounded-md relative flex items-center overflow-hidden transition-all shadow-sm ${
                                      isClosest
                                        ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-stone-50 opacity-100'
                                        : isSelected
                                        ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-stone-50 opacity-100'
                                        : 'opacity-90 group-hover:opacity-100'
                                    }`}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)} - ${formatDateFrench(ev.endYear)}) ${ev.fuzzyStart ? '[Début incertain]' : ''} ${ev.fuzzyEnd ? '[Fin incertaine]' : ''}`}
                                  >
                                    {/* WHITE TEXT LABEL ON THE BAR */}
                                    {(!isLowZoomMode || width >= 70 || isSelected || isClosest || isHovered) && (
                                      <div
                                        style={{ transform: `translateX(${labelOffsetX}px)` }}
                                        className="absolute left-0 top-0 bottom-0 flex items-center gap-1 px-1.5 text-white font-bold text-[10px] sm:text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] whitespace-nowrap pointer-events-none transition-transform duration-75"
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
                                    )}
                                  </div>

                                  {/* FLOATING HOVER TOOLTIP FOR NARROW BARS IN LOW ZOOM MODE */}
                                  {isLowZoomMode && width < 70 && isHovered && !isSelected && !isClosest && (
                                    <div className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1 bg-stone-900/95 text-white text-[11px] font-sans font-medium rounded-lg shadow-xl border border-stone-700 whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 ring-2 ring-purple-500/30">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                                        {formatDateFrench(ev.startYear)} → {formatDateFrench(ev.endYear)}
                                      </span>
                                    </div>
                                  )}
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
            const catEventsCount = layoutLanes[cat.name]?.totalEventsCount || 0;

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

      {/* CLUSTER SELECTION POPUP MODAL */}
      {selectedCluster && (
        <div className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-800 rounded-xl">
                  <Layers className="w-5 h-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {selectedCluster.events.length} événements regroupés
                  </h3>
                  <p className="text-xs text-purple-200 font-mono">
                    Période : {formatDateFrench(selectedCluster.minYear)} à {formatDateFrench(selectedCluster.maxYear)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCluster(null)}
                className="p-1.5 rounded-xl hover:bg-purple-800 text-purple-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between text-xs text-purple-900 font-medium shrink-0">
              <span>Zoom automatique appliqué ({pxPerYear.toFixed(1)} px/an)</span>
              <button
                onClick={() => {
                  setPxPerYear(prev => Math.min(10, prev * 1.8));
                }}
                className="px-2.5 py-1 bg-purple-700 text-white rounded-lg font-bold text-[11px] hover:bg-purple-800 transition flex items-center gap-1"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Zoomer davantage
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <p className="text-xs text-stone-500 font-medium mb-2">
                Sélectionnez un événement ci-dessous pour ouvrir sa fiche détaillée :
              </p>
              {selectedCluster.events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    onSelectEvent(ev);
                    setSelectedCluster(null);
                  }}
                  className="p-3 rounded-xl border border-stone-200 hover:border-purple-400 hover:bg-purple-50/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ev.icon ? (
                      <img
                        src={`data:image/png;base64,${ev.icon}`}
                        alt=""
                        className="w-7 h-7 object-contain rounded bg-stone-100 p-1 border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: categoryColorMap[ev.category] || '#2563eb' }} />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-stone-900 text-sm group-hover:text-purple-900 truncate">
                        {ev.text}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500">
                        <span className="font-mono text-purple-700 font-semibold">
                          {formatDateFrench(ev.startYear)} {ev.endYear ? `→ ${formatDateFrench(ev.endYear)}` : ''}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-medium text-stone-600">{ev.category}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>

            <div className="p-3 bg-stone-100 border-t border-stone-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCluster(null)}
                className="px-4 py-1.5 bg-stone-800 text-white rounded-xl text-xs font-bold hover:bg-stone-900 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

