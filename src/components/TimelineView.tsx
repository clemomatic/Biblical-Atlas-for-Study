import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventData, EraData, CategoryData, TimelinePeriod } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  isActive: boolean;
  onSelectEvent: (event: EventData) => void;
  onVisiblePeriodChange: (period: TimelinePeriod) => void;
  searchQuery: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  eras,
  categories,
  events,
  selectedEventId,
  isActive,
  onSelectEvent,
  onVisiblePeriodChange,
  searchQuery
}) => {
  // Category visibility toggle
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(() => {
    return new Set(categories.map(c => c.name));
  });

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
  const [enableClustering, setEnableClustering] = useState<boolean>(false);
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
    if (!isActive) return;
    const frame = window.requestAnimationFrame(updateViewport);
    return () => window.cancelAnimationFrame(frame);
  }, [isActive, timelineWidth]);

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
    labelWidth: number;
    showLabel: boolean;
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

  const backgroundCategoryNames = useMemo(
    () =>
      new Set(
        categories
          .filter(category => category.displayMode === 'background-period')
          .map(category => category.name)
      ),
    [categories]
  );

  // Optional grouping is deliberately limited to true visual collisions.
  const clusterPixelRadius = useMemo(() => {
    if (!enableClustering) return 0;
    if (pxPerYear < 0.3) return 8;
    if (pxPerYear < 0.65) return 6;
    return 4;
  }, [enableClustering, pxPerYear]);

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
      const isBookPeriod = backgroundCategoryNames.has(e.category);

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

      const isBookCategory = backgroundCategoryNames.has(catName);

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

            // Both limits are required to prevent long chain clusters.
            if (
              evX - lastInGroupX <= clusterPixelRadius &&
              evX - firstInGroupX <= clusterPixelRadius * 1.5
            ) {
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

      const rawClusterStartXs = rawClusters.map(group => {
        const averageYear =
          group.reduce((acc, event) => acc + event.startYear, 0) / group.length;
        return getXFromYear(averageYear);
      });

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
        const nextStartX =
          rawClusterStartXs[groupIdx + 1] ?? Number.POSITIVE_INFINITY;

        let labelWidthEstimate: number;
        if (isCluster) {
          labelWidthEstimate = 65 + Math.min(30, group.length * 4);
        } else if (isLowZoomMode) {
          labelWidthEstimate = primaryEvent.isPoint ? 18 : Math.min(60, rangeWidth);
        } else {
          labelWidthEstimate = primaryEvent.text.length * 6.5 + (primaryEvent.icon ? 24 : 12) + (primaryEvent.isPoint ? 65 : 0);
        }

        const availableBeforeNext = Number.isFinite(nextStartX)
          ? Math.max(0, nextStartX - startX - 18)
          : 112;
        const lowZoomLabelWidth = primaryEvent.isPoint
          ? Math.min(112, availableBeforeNext)
          : Math.min(140, Math.max(0, rangeWidth - 10));
        const labelWidth = isLowZoomMode && !isBookCategory
          ? lowZoomLabelWidth
          : labelWidthEstimate;
        const showLabel =
          !isLowZoomMode ||
          isBookCategory ||
          labelWidth >= 30;

        let sublaneIndex: number;
        if (isLowZoomMode && !isBookCategory && primaryEvent.isPoint) {
          sublaneIndex = 0;
          if (tracks.length === 0) tracks.push({ lastX: 0 });
        } else {
          const visualWidth = Math.max(
            rangeWidth,
            isLowZoomMode ? labelWidth : labelWidthEstimate
          );
          const visualEndX = startX + visualWidth + (isLowZoomMode ? 8 : 12);
          sublaneIndex = tracks.findIndex(track => track.lastX <= startX);
          if (sublaneIndex === -1) {
            tracks.push({ lastX: visualEndX });
            sublaneIndex = tracks.length - 1;
          } else {
            tracks[sublaneIndex].lastX = visualEndX;
          }
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
          primaryEvent,
          labelWidth,
          showLabel
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
  }, [finalFilteredEvents, pxPerYear, timelineWidth, minYear, maxYear, categoryColorMap, isLowZoomMode, clusterPixelRadius, enableClustering, backgroundCategoryNames]);

  const backgroundPeriodItems = useMemo(
    () =>
      (Object.values(layoutLanes) as CategoryLane[])
        .filter(lane => backgroundCategoryNames.has(lane.categoryName))
        .flatMap(lane => lane.events),
    [layoutLanes, backgroundCategoryNames]
  );

  const visibleBackgroundPeriodItems = useMemo(() => {
    const viewportWidth = viewportX.endX - viewportX.startX;
    const renderMargin = Math.max(80, viewportWidth * 0.08);
    const trackEnds: number[] = [];

    return backgroundPeriodItems
      .filter(
        item =>
          item.endX >= viewportX.startX - renderMargin &&
          item.startX <= viewportX.endX + renderMargin
      )
      .sort((left, right) => left.startX - right.startX)
      .map(item => {
        const visualEndX = Math.max(item.startX + 24, item.endX) + 6;
        let visibleTrackIndex = trackEnds.findIndex(endX => endX <= item.startX);

        if (visibleTrackIndex === -1) {
          visibleTrackIndex = trackEnds.length;
          trackEnds.push(visualEndX);
        } else {
          trackEnds[visibleTrackIndex] = visualEndX;
        }

        return { ...item, visibleTrackIndex };
      });
  }, [backgroundPeriodItems, viewportX.startX, viewportX.endX]);

  const backgroundTrackCount = useMemo(
    () =>
      visibleBackgroundPeriodItems.length
        ? Math.max(
            ...visibleBackgroundPeriodItems.map(item => item.visibleTrackIndex)
          ) + 1
        : 0,
    [visibleBackgroundPeriodItems]
  );

  const backgroundRailHeight =
    backgroundTrackCount > 0 ? 32 + backgroundTrackCount * 28 + 6 : 0;
  const eventBodyTop = 48 + backgroundRailHeight;

  const centeredBackgroundPeriodId = useMemo(() => {
    if (centerYear === null) return null;
    return (
      backgroundPeriodItems
        .filter(
          item =>
            centerYear >= item.minYear &&
            centerYear <= item.maxYear
        )
        .sort(
          (left, right) =>
            left.maxYear -
            left.minYear -
            (right.maxYear - right.minYear)
        )[0]?.primaryEvent.id || null
    );
  }, [backgroundPeriodItems, centerYear]);

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
    <div className="relative flex h-full flex-col select-none overflow-hidden bg-slate-50 text-slate-900">
      
      {/* CONTROL BAR (Collapsible & Compact) */}
      {isControlBarCollapsed ? (
        <div className="px-3 py-1.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 z-20 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5">
              <button
                onClick={() => setPxPerYear(prev => Math.min(10, prev * 1.3))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900"
                title="Zoom Avant (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-indigo-600 font-bold">{pxPerYear.toFixed(1)}px/an</span>
              <button
                onClick={() => setPxPerYear(prev => Math.max(0.1, prev / 1.3))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900"
                title="Zoom Arrière (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {centerYear !== null && (
              <span className="hidden sm:inline-block font-mono text-indigo-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                Centre : {formatDateFrench(centerYear)}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsControlBarCollapsed(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition text-xs font-semibold"
            title="Afficher les filtres et options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contrôles & Filtres</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20 text-xs shadow-md">
          {/* Zoom Controls & Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setPxPerYear(prev => Math.min(10, prev * 1.3))}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
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
              className="w-20 accent-indigo-600 cursor-pointer"
            />

            <button
              onClick={() => setPxPerYear(prev => Math.max(0.1, prev / 1.3))}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="Zoom Arrière (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Quick Zoom Presets */}
            <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />
            <button
              onClick={() => setPxPerYear(0.2)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear <= 0.25 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue d'ensemble complète (-4000 à +2000)"
            >
              Vue globale
            </button>
            <button
              onClick={() => setPxPerYear(0.6)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear > 0.25 && pxPerYear <= 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue d'ensemble équilibrée"
            >
              Standard
            </button>
            <button
              onClick={() => setPxPerYear(1.8)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear > 1 ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue détaillée avec fort zoom"
            >
              Détails
            </button>
          </div>

          {/* Density / Readability Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1 hidden lg:inline">
              Densité :
            </span>
            <button
              onClick={() => setLabelDisplayMode('auto')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                labelDisplayMode === 'auto'
                  ? 'bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Affichage adaptatif : conserve les événements sur une ligne et tronque les titres selon l’espace disponible"
            >
              <Sparkles className="w-3 h-3 text-indigo-200" />
              <span>Auto</span>
            </button>
            <button
              onClick={() => setLabelDisplayMode('compact')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                labelDisplayMode === 'compact'
                  ? 'bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Mode épuré : une ligne compacte par catégorie avec titres tronqués"
            >
              Épuré
            </button>
            <button
              onClick={() => setLabelDisplayMode('full')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                labelDisplayMode === 'full'
                  ? 'bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title="Mode complet : affiche toutes les étiquettes sans restriction"
            >
              Complet
            </button>
          </div>

          {/* Exact collision grouping toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setEnableClustering(!enableClustering)}
              aria-pressed={enableClustering}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                enableClustering
                  ? 'bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
              title={
                enableClustering
                  ? "Collisions regroupées : seuls les événements presque superposés sont réunis"
                  : "Collisions séparées : chaque événement conserve son marqueur"
              }
            >
              <Layers className={`w-3.5 h-3.5 ${enableClustering ? 'text-indigo-200' : 'text-slate-400'}`} />
              <span>Collisions {enableClustering ? 'groupées' : 'séparées'}</span>
            </button>
          </div>

          {/* Center Year Badge */}
          {centerYear !== null && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono">
              <span className="text-slate-500 text-[10px] font-sans">Centre :</span>
              <span className="font-bold text-indigo-700">{formatDateFrench(centerYear)}</span>
            </div>
          )}

          {/* Collapse Button */}
          <button
            onClick={() => setIsControlBarCollapsed(true)}
            className="p-1 px-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-indigo-700 transition flex items-center gap-1 border border-slate-200 hover:border-slate-300"
            title="Masquer le panneau de contrôle pour maximiser la vue"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden md:inline">Masquer</span>
          </button>
        </div>
      )}

      {/* READABILITY HELPER BANNER WHEN ZOOMED OUT */}
      {isLowZoomMode && (
        <div className="bg-indigo-900/90 text-indigo-100 px-3.5 py-1 text-xs flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm border-b border-indigo-800 font-sans">
          <div className="flex items-center gap-2 font-medium truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Vue d'ensemble ({pxPerYear.toFixed(1)} px/an)</strong> : les événements restent sur leur ligne et les titres s’adaptent à l’espace disponible.
            </span>
          </div>
          <button
            onClick={() => setLabelDisplayMode('full')}
            className="text-[11px] uppercase font-bold underline text-indigo-200 hover:text-white shrink-0 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/80 transition"
          >
            Titres complets
          </button>
        </div>
      )}

      {/* DISCRETE GLOBAL BIBLICAL HISTORY PROGRESS BAR */}
      <div className="bg-slate-900/95 backdrop-blur-md text-slate-200 text-xs border-b border-slate-800 z-30 shrink-0 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3 shadow-md select-none">
        {/* Current position badge */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
          <span className="font-sans font-medium text-slate-400 hidden sm:inline text-[11px]">Position :</span>
          <span className="font-bold text-white bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600/60 shadow-sm text-[11px] sm:text-xs">
            {centerYear !== null ? formatDateFrench(centerYear) : '—'}
          </span>
          {currentEra && (
            <span className="text-slate-300 text-[10px] sm:text-[11px] font-sans truncate max-w-[150px] sm:max-w-[260px] hidden md:inline">
              · {currentEra.name}
            </span>
          )}
        </div>

        {/* Interactive Progress Track */}
        <div
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={() => setHoveredProgressInfo(null)}
          className="flex-1 max-w-lg h-3 sm:h-3.5 bg-slate-800/90 hover:bg-slate-800 rounded-full border border-slate-700/80 relative cursor-pointer overflow-hidden group shadow-inner transition-all"
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
                  className="absolute top-0 bottom-0 border-r border-slate-900/40"
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
            className="absolute top-0 bottom-0 bg-indigo-500/90 group-hover:bg-indigo-400 rounded-full shadow-md ring-1 ring-white/60 transition-all pointer-events-none"
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
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-300 -translate-x-1/2 pointer-events-none z-20 shadow-sm"
            >
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900 text-indigo-200 border border-indigo-600/80 text-[10px] font-mono rounded shadow-xl whitespace-nowrap">
                Aller à : {formatDateFrench(hoveredProgressInfo.year)}
              </div>
            </div>
          )}
        </div>

        {/* Global timeline span & percentage readout */}
        <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <span className="font-bold text-indigo-300">{Math.round(centerPercent)}%</span>
          <span className="hidden lg:inline text-slate-500 text-[10px]">(-4100 → 2050)</span>
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
          <div className="absolute top-0 left-0 right-0 h-12 flex z-0 border-b border-slate-200/60">
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
          <div className="sticky top-12 left-0 right-0 h-8 bg-white/90 border-b border-slate-200 z-10 flex items-center">
            {ticks.map((year) => {
              const x = getXFromYear(year);
              return (
                <div
                  key={year}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-between"
                >
                  <span className="text-[10px] text-slate-500 font-mono tracking-tighter whitespace-nowrap pt-0.5">
                    {formatDateFrench(year)}
                  </span>
                  <div className="w-[1px] h-2 bg-slate-300" />
                </div>
              );
            })}
          </div>

          {/* BIBLICAL BOOK PERIOD RAIL */}
          {visibleBackgroundPeriodItems.length > 0 && (
            <div
              style={{ height: `${backgroundRailHeight}px` }}
              className="relative border-b border-indigo-200/70 bg-gradient-to-b from-indigo-50/90 to-white/40 shadow-[inset_0_-1px_0_rgba(99,102,241,0.08)]"
              aria-label="Périodes des livres bibliques"
            >
              <div
                style={{ left: `${Math.max(8, viewportX.startX + 8)}px` }}
                className="absolute top-1 z-20 inline-flex h-6 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white/95 px-2 text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 shadow-sm backdrop-blur"
              >
                <BookOpen className="size-3.5" />
                Livres bibliques
              </div>

              {visibleBackgroundPeriodItems.map(item => {
                const event = item.primaryEvent;
                const width = Math.max(24, item.endX - item.startX);
                const isSelected = selectedEventId === event.id;
                const isHovered = hoveredEventId === event.id;
                const isCentered = centeredBackgroundPeriodId === event.id;
                const isActive = isSelected || isHovered || isCentered;
                const desiredLeft =
                  Math.max(viewportX.startX - item.startX, 0) + 8;
                const labelLeft = Math.max(
                  4,
                  Math.min(Math.max(4, width - 28), desiredLeft)
                );
                const remainingVisibleWidth =
                  viewportX.endX - (item.startX + labelLeft) - 8;
                const labelWidth = Math.max(
                  20,
                  Math.min(360, width - labelLeft - 4, remainingVisibleWidth)
                );

                return (
                  <button
                    key={`book-rail-${event.id}`}
                    type="button"
                    style={{
                      left: `${item.startX}px`,
                      top: `${32 + item.visibleTrackIndex * 28}px`,
                      width: `${width}px`
                    }}
                    onClick={clickEvent => {
                      clickEvent.stopPropagation();
                      onSelectEvent(event);
                    }}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className={`absolute h-6 overflow-hidden rounded-lg border text-left transition-all ${
                      isActive
                        ? 'z-20 border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300/70'
                        : 'z-10 border-indigo-200 bg-white/90 text-indigo-950 hover:border-indigo-400 hover:bg-indigo-100'
                    }`}
                    aria-label={`${event.text}, ${formatDateFrench(event.startYear)} à ${formatDateFrench(event.endYear)}`}
                    title={`${event.text} (${formatDateFrench(event.startYear)} → ${formatDateFrench(event.endYear)})`}
                  >
                    <span
                      style={{
                        marginLeft: `${labelLeft}px`,
                        width: `${labelWidth}px`
                      }}
                      className="flex h-full min-w-0 items-center gap-1 px-1.5"
                    >
                      <BookOpen className="size-3 shrink-0 opacity-80" />
                      <span className="min-w-0 flex-1 truncate text-[10px] font-bold sm:text-[11px]">
                        {event.text}
                      </span>
                      {labelWidth >= 280 && !isLowZoomMode && (
                        <span className={`shrink-0 font-mono text-[9px] ${isActive ? 'text-indigo-100' : 'text-indigo-500'}`}>
                          {formatDateFrench(event.startYear)} → {formatDateFrench(event.endYear)}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* VERTICAL GRID LINES */}
          <div
            style={{ top: `${eventBodyTop}px` }}
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-0"
          >
            {ticks.map((year) => {
              const x = getXFromYear(year);
              return (
                <div
                  key={year}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 w-[1px] bg-slate-100 border-r border-dashed border-slate-200"
                />
              );
            })}
            {/* VIEWPORT CENTER GUIDE LINE */}
            <div
              style={{ left: `${(viewportX.startX + viewportX.endX) / 2}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-indigo-600/50 pointer-events-none z-30"
            >
              <div className="sticky top-2 hidden sm:block -translate-x-1/2 w-max max-w-[90vw] px-4 py-1.5 bg-indigo-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-xl border-2 border-indigo-300 whitespace-nowrap text-center z-40 pointer-events-auto font-mono tracking-tight ring-2 ring-indigo-900/20">
                {centerYear !== null ? formatDateFrench(centerYear) : 'Centre'}
              </div>
            </div>
          </div>

          {/* SUBTLE TEMPORAL FRAMES BEHIND EVENT LANES */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            {backgroundPeriodItems.map(item => {
              const event = item.primaryEvent;
              const width = Math.max(24, item.endX - item.startX);
              const isActive =
                selectedEventId === event.id ||
                hoveredEventId === event.id ||
                centeredBackgroundPeriodId === event.id;

              return (
                <div
                  key={`book-frame-${event.id}`}
                  style={{
                    left: `${item.startX}px`,
                    top: `${eventBodyTop}px`,
                    width: `${width}px`,
                    bottom: '4px',
                    background: isActive
                      ? 'linear-gradient(to bottom, rgba(99,102,241,0.10), rgba(99,102,241,0.035))'
                      : isLowZoomMode
                        ? 'linear-gradient(to bottom, rgba(99,102,241,0.012), rgba(99,102,241,0.004))'
                        : 'linear-gradient(to bottom, rgba(99,102,241,0.035), rgba(99,102,241,0.012))',
                    boxShadow: isActive
                      ? 'inset 2px 0 rgba(79,70,229,0.5), inset -2px 0 rgba(79,70,229,0.5)'
                      : isLowZoomMode
                        ? 'none'
                        : 'inset 1px 0 rgba(99,102,241,0.14), inset -1px 0 rgba(99,102,241,0.14)'
                  }}
                  className="absolute rounded-b-2xl transition-all duration-200"
                />
              );
            })}
          </div>

          {/* 3. EVENT LANES & MARKS (Sublane Stacking) */}
          <div className="relative z-20 mt-2 space-y-1 px-3">
            {(Object.values(layoutLanes) as CategoryLane[])
              .filter(
                (lane) =>
                  lane.events.length > 0 &&
                  !backgroundCategoryNames.has(lane.categoryName)
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
                    className="relative py-1 border-b border-slate-200/80 transition-all duration-200 my-1"
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
                        className="sticky left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm text-[10px] sm:text-[11px] font-bold z-35 cursor-pointer mb-1 transition-all group/badge bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                        title={isManuallyCollapsed ? "Cliquer pour déplier la catégorie" : "Cliquer pour replier la catégorie"}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lane.catColor }} />
                        <span className="text-slate-700 uppercase tracking-wider group-hover/badge:text-indigo-700">
                          {lane.categoryName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono border bg-slate-100 text-slate-500 border-slate-200">
                          {lane.totalEventsCount} ev.
                        </span>
                        {isManuallyCollapsed ? (
                          <ChevronDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ChevronUp className="w-3 h-3 text-slate-400 group-hover/badge:text-indigo-600" />
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
                                      ? 'ring-indigo-600 scale-110 shadow-lg'
                                      : 'ring-indigo-400/50 hover:ring-indigo-600 hover:shadow-lg'
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
                                  <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 text-white text-xs rounded-xl shadow-2xl border border-slate-700 z-50 pointer-events-none space-y-1.5 font-sans ring-2 ring-indigo-500/30">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1.5">
                                      <span className="font-extrabold text-indigo-300 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                                        <Layers className="w-3.5 h-3.5" />
                                        {clusterItem.events.length} événements regroupés
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {formatDateFrench(clusterItem.minYear)} à {formatDateFrench(clusterItem.maxYear)}
                                      </span>
                                    </div>
                                    <ul className="space-y-1.5 max-h-48 overflow-y-auto text-[11px] pr-1">
                                      {clusterItem.events.map((ev, idx) => (
                                        <li key={ev.id || idx} className="flex items-start gap-1.5 text-slate-200">
                                          <span className="text-indigo-400 font-bold shrink-0">•</span>
                                          <div className="flex-1 min-w-0">
                                            <span className="font-bold truncate block">{ev.text}</span>
                                            <span className="text-[9px] text-slate-400 font-mono">
                                              {formatDateFrench(ev.startYear)} {ev.endYear ? `→ ${formatDateFrench(ev.endYear)}` : ''}
                                            </span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="pt-1.5 border-t border-slate-800 text-[10px] text-indigo-300 font-medium italic text-center flex items-center justify-center gap-1">
                                      <Sparkles className="w-3 h-3 text-indigo-300" />
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
                                        ? 'ring-4 ring-indigo-400/80 scale-125 border-indigo-300 animate-pulse'
                                        : isSelected
                                        ? 'ring-4 ring-indigo-400/50 scale-125 border-white'
                                        : isHovered
                                        ? 'ring-2 ring-indigo-300 scale-125 border-white'
                                        : 'border-white group-hover:scale-125'
                                    }`}
                                    style={barStyle}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)})`}
                                  />
                                  
                                  {/* Adaptive point label: truncated in overview, expanded on interaction. */}
                                  {(!isLowZoomMode || clusterItem.showLabel || isSelected || isClosest || isHovered) && (
                                    <div
                                      style={
                                        isLowZoomMode && !isSelected && !isClosest && !isHovered
                                          ? { width: `${clusterItem.labelWidth}px` }
                                          : undefined
                                      }
                                      className="flex min-w-0 items-center gap-1 pointer-events-none"
                                    >
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white/90 p-0.5 border border-slate-200 shrink-0"
                                        />
                                      )}
                                      <span
                                        className={`block min-w-0 truncate text-[10px] sm:text-[11px] font-bold text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] ${
                                          isClosest || isSelected
                                            ? 'text-indigo-900 text-xs font-extrabold bg-indigo-100/90 px-1.5 py-0.5 rounded shadow-sm border border-indigo-300'
                                            : isHovered && isLowZoomMode
                                            ? 'text-indigo-900 text-[11px] font-extrabold bg-white/95 px-1.5 py-0.5 rounded shadow-md border border-indigo-200 z-50'
                                            : ''
                                        }`}
                                      >
                                        {ev.text}
                                      </span>
                                    </div>
                                  )}

                                  {/* FLOATING HOVER TOOLTIP BADGE IN LOW ZOOM MODE */}
                                  {isLowZoomMode && isHovered && !isSelected && !isClosest && (
                                    <div className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-sans font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 ring-2 ring-indigo-500/30">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-800">
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
                                        ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-50 opacity-100'
                                        : isSelected
                                        ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-50 opacity-100'
                                        : 'opacity-90 group-hover:opacity-100'
                                    }`}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)} - ${formatDateFrench(ev.endYear)}) ${ev.fuzzyStart ? '[Début incertain]' : ''} ${ev.fuzzyEnd ? '[Fin incertaine]' : ''}`}
                                  >
                                    {/* WHITE TEXT LABEL ON THE BAR */}
                                    {(!isLowZoomMode || clusterItem.showLabel || isSelected || isClosest || isHovered) && (
                                      <div
                                        style={{ transform: `translateX(${labelOffsetX}px)` }}
                                        className="absolute left-0 top-0 bottom-0 flex min-w-0 items-center gap-1 overflow-hidden px-1.5 text-white font-bold text-[10px] sm:text-[11px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] pointer-events-none transition-transform duration-75"
                                      >
                                        {ev.icon && (
                                          <img
                                            src={`data:image/png;base64,${ev.icon}`}
                                            alt=""
                                            className="w-3.5 h-3.5 object-contain rounded bg-white/60 p-0.5 border border-slate-200/60 shrink-0"
                                          />
                                        )}
                                        <span
                                          style={{
                                            maxWidth: `${Math.max(
                                              20,
                                              width - labelOffsetX - (ev.icon ? 28 : 10)
                                            )}px`
                                          }}
                                          className={`block min-w-0 truncate ${isClosest || isSelected ? 'text-indigo-100 font-extrabold' : ''}`}
                                        >
                                          {ev.text}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* FLOATING HOVER TOOLTIP FOR NARROW BARS IN LOW ZOOM MODE */}
                                  {isLowZoomMode && width < 70 && isHovered && !isSelected && !isClosest && (
                                    <div className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-sans font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 ring-2 ring-indigo-500/30">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-800">
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

      {/* BOTTOM LEGEND BAR */}
      <div className="bg-white border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-30 shadow-2xl backdrop-blur-md">
        
        {/* Category Legend Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
          <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
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
                    ? 'bg-slate-100 border-slate-200 text-slate-400 line-through opacity-50'
                    : autoFilterViewport && !isInViewport
                    ? 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                    : 'bg-white border-slate-200 text-slate-900 hover:border-indigo-300'
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
                    isInViewport ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {catEventsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Viewport Filter Status Indicator */}
        <div className="flex items-center gap-2 shrink-0 text-slate-500 text-[11px]">
          <span>
            {autoFilterViewport ? (
              <span className="text-indigo-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
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
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-800 rounded-xl">
                  <Layers className="w-5 h-5 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {selectedCluster.events.length} événements regroupés
                  </h3>
                  <p className="text-xs text-indigo-200 font-mono">
                    Période : {formatDateFrench(selectedCluster.minYear)} à {formatDateFrench(selectedCluster.maxYear)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCluster(null)}
                className="p-1.5 rounded-xl hover:bg-indigo-800 text-indigo-200 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-medium shrink-0">
              <span>Zoom automatique appliqué ({pxPerYear.toFixed(1)} px/an)</span>
              <button
                onClick={() => {
                  setPxPerYear(prev => Math.min(10, prev * 1.8));
                }}
                className="px-2.5 py-1 bg-indigo-700 text-white rounded-lg font-bold text-[11px] hover:bg-indigo-800 transition flex items-center gap-1"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Zoomer davantage
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <p className="text-xs text-slate-500 font-medium mb-2">
                Sélectionnez un événement ci-dessous pour ouvrir sa fiche détaillée :
              </p>
              {selectedCluster.events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    onSelectEvent(ev);
                    setSelectedCluster(null);
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {ev.icon ? (
                      <img
                        src={`data:image/png;base64,${ev.icon}`}
                        alt=""
                        className="w-7 h-7 object-contain rounded bg-slate-100 p-1 border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: categoryColorMap[ev.category] || '#2563eb' }} />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-900 truncate">
                        {ev.text}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono text-indigo-700 font-semibold">
                          {formatDateFrench(ev.startYear)} {ev.endYear ? `→ ${formatDateFrench(ev.endYear)}` : ''}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-medium text-slate-600">{ev.category}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedCluster(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition"
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

