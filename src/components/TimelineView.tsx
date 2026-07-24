import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventData, EraData, CategoryData, TimelinePeriod } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Layers,
  BookOpen,
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

const MIN_PX_PER_YEAR = 0.35;
const MAX_PX_PER_YEAR = 720;
const DEFAULT_PX_PER_YEAR = 1.2;
const ZOOM_SLIDER_STEPS = 1000;
const INITIAL_CENTER_YEAR = -1000;
const MONTH_LABELS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.'
];

const scaleToSliderValue = (scale: number): number =>
  (Math.log(scale / MIN_PX_PER_YEAR) /
    Math.log(MAX_PX_PER_YEAR / MIN_PX_PER_YEAR)) *
  ZOOM_SLIDER_STEPS;

const sliderValueToScale = (value: number): number =>
  MIN_PX_PER_YEAR *
  Math.pow(
    MAX_PX_PER_YEAR / MIN_PX_PER_YEAR,
    value / ZOOM_SLIDER_STEPS
  );

const positionToCalendarYear = (position: number): number => {
  const positionYear = Math.floor(position + Number.EPSILON);
  return positionYear < 0 ? positionYear : positionYear + 1;
};

const formatTimelineTick = (position: number, interval: number): string => {
  const calendarYear = positionToCalendarYear(position);
  if (interval >= 1) return formatDateFrench(calendarYear);

  const positionYear = Math.floor(position + Number.EPSILON);
  const fraction = Math.max(0, position - positionYear);
  const monthIndex = Math.min(11, Math.round(fraction * 12));
  const compactYear =
    calendarYear < 0 ? `${Math.abs(calendarYear)} av.` : `${calendarYear}`;
  return `${MONTH_LABELS[monthIndex]} ${compactYear}`;
};

const formatZoomScale = (scale: number): string =>
  scale >= 10 ? Math.round(scale).toString() : scale.toFixed(1);

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
  const [pxPerYear, setPxPerYear] =
    useState<number>(DEFAULT_PX_PER_YEAR);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedViewportRef = useRef(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);

  // Label display mode: 'auto' (adaptive by zoom) vs 'compact' vs 'full'
  const [labelDisplayMode, setLabelDisplayMode] = useState<'auto' | 'compact' | 'full'>('auto');
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
  const pinchAnchorRatioRef = useRef<number>(0.5);
  const pinchAnchorOffsetRef = useRef<number>(0);

  // Calculate timeline min & max bounds
  const minYear = -4100;
  const maxYear = 2050;
  const totalYears = maxYear - minYear;
  const overviewMaxPxPerYear = 0.75;
  const detailMinPxPerYear = 8;

  const timelineWidth = Math.max(1200, totalYears * pxPerYear);
  const viewportRenderMargin = 240;
  const zoomDisplayLevel =
    pxPerYear < overviewMaxPxPerYear
      ? 'overview'
      : pxPerYear < detailMinPxPerYear
        ? 'study'
        : 'detail';

  const backgroundCategoryNames = useMemo(
    () =>
      new Set(
        categories
          .filter(category => category.displayMode === 'background-period')
          .map(category => category.name)
      ),
    [categories]
  );

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
    if (
      !isActive ||
      hasInitializedViewportRef.current ||
      !containerRef.current
    ) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const centerRatio = (INITIAL_CENTER_YEAR - minYear) / totalYears;
      containerRef.current.scrollLeft = Math.max(
        0,
        centerRatio * timelineWidth - containerRef.current.clientWidth / 2
      );
      hasInitializedViewportRef.current = true;
      updateViewport();
    });

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

  // 2. Filter each event interval, rather than retaining an entire category.
  const viewportFilteredEvents = useMemo(() => {
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

  // 3. Apply semantic zoom without ever merging distinct events.
  const finalFilteredEvents = useMemo(() => {
    if (searchQuery.trim()) return viewportFilteredEvents;

    return viewportFilteredEvents.filter(event => {
      if (backgroundCategoryNames.has(event.category)) return true;

      const eventLevel = event.timelineLevel || 'study';
      if (zoomDisplayLevel === 'overview') {
        return eventLevel === 'overview';
      }
      if (zoomDisplayLevel === 'study') {
        return eventLevel !== 'detail';
      }
      return true;
    });
  }, [
    viewportFilteredEvents,
    searchQuery,
    zoomDisplayLevel,
    backgroundCategoryNames
  ]);

  const hiddenByZoomCount =
    viewportFilteredEvents.length - finalFilteredEvents.length;

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

  const setZoomAroundAnchor = (
    requestedScale: number,
    anchorOffset: number,
    anchorRatio = containerRef.current
      ? (containerRef.current.scrollLeft + anchorOffset) / timelineWidth
      : 0.5
  ) => {
    const nextScale = Math.min(
      MAX_PX_PER_YEAR,
      Math.max(MIN_PX_PER_YEAR, requestedScale)
    );
    const nextTimelineWidth = Math.max(1200, totalYears * nextScale);
    setPxPerYear(nextScale);

    window.requestAnimationFrame(() => {
      if (!containerRef.current) return;
      containerRef.current.scrollLeft = Math.max(
        0,
        anchorRatio * nextTimelineWidth - anchorOffset
      );
      updateViewport();
    });
  };

  // Two fingers zoom the timeline itself; one finger keeps native panning.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && containerRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const rect = containerRef.current.getBoundingClientRect();
      const anchorOffset = (t1.clientX + t2.clientX) / 2 - rect.left;

      touchStartDistRef.current = dist;
      initialPxPerYearRef.current = pxPerYear;
      pinchAnchorOffsetRef.current = anchorOffset;
      pinchAnchorRatioRef.current =
        (containerRef.current.scrollLeft + anchorOffset) / timelineWidth;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const zoomRatio = currentDist / touchStartDistRef.current;
      setZoomAroundAnchor(
        initialPxPerYearRef.current * zoomRatio,
        pinchAnchorOffsetRef.current,
        pinchAnchorRatioRef.current
      );
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

  interface PositionedEvent {
    id: string;
    startX: number;
    endX: number;
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
    events: PositionedEvent[];
    numSublanes: number;
    totalEventsCount: number;
  }

  const isLowZoomMode =
    labelDisplayMode === 'compact' ||
    (labelDisplayMode === 'auto' && pxPerYear < 0.45);

  // Every event keeps its own visual identity. Tracks are only used to offset
  // exact visual collisions; events are never merged into a synthetic item.
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
      const tracks: { lastX: number }[] = [];
      const positionedEvents: PositionedEvent[] = [];
      const eventStartXs = sortedEvents.map(event => getXFromYear(event.startPos));

      sortedEvents.forEach((primaryEvent, eventIndex) => {
        const minYear = primaryEvent.startYear;
        const maxYear = primaryEvent.endYear || primaryEvent.startYear;
        const startX = eventStartXs[eventIndex];
        const endX = primaryEvent.isPoint
          ? startX
          : getXFromYear(primaryEvent.endPos);

        const rangeWidth = Math.max(16, endX - startX);
        const nextStartX =
          eventStartXs[eventIndex + 1] ?? Number.POSITIVE_INFINITY;

        const labelWidthEstimate = isLowZoomMode
          ? primaryEvent.isPoint
            ? 18
            : Math.min(60, rangeWidth)
          : primaryEvent.text.length * 6.5 +
            (primaryEvent.icon ? 24 : 12) +
            (primaryEvent.isPoint ? 65 : 0);

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
          // Only markers that would physically overlap are offset vertically.
          // They remain independent and selectable.
          const markerVisualEndX = startX + 12;
          sublaneIndex = tracks.findIndex(track => track.lastX <= startX);
          if (sublaneIndex === -1) {
            tracks.push({ lastX: markerVisualEndX });
            sublaneIndex = tracks.length - 1;
          } else {
            tracks[sublaneIndex].lastX = markerVisualEndX;
          }
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

        positionedEvents.push({
          id: primaryEvent.id,
          startX,
          endX,
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
        events: positionedEvents,
        numSublanes: tracks.length,
        totalEventsCount: catEvents.length
      };
    });

    return lanesMap;
  }, [
    finalFilteredEvents,
    timelineWidth,
    categoryColorMap,
    isLowZoomMode,
    backgroundCategoryNames
  ]);

  const backgroundPeriodItems = useMemo(
    () =>
      (Object.values(layoutLanes) as CategoryLane[])
        .filter(lane => backgroundCategoryNames.has(lane.categoryName))
        .flatMap(lane => lane.events),
    [layoutLanes, backgroundCategoryNames]
  );

  const legendCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    finalFilteredEvents.forEach(event => {
      const startX = getXFromYear(event.startPos);
      const endX = event.isPoint ? startX : getXFromYear(event.endPos);
      if (endX < viewportX.startX || startX > viewportX.endX) return;
      counts.set(event.category, (counts.get(event.category) || 0) + 1);
    });

    return counts;
  }, [
    finalFilteredEvents,
    viewportX.startX,
    viewportX.endX,
    timelineWidth
  ]);

  const legendCategories = useMemo(
    () =>
      categories.filter(category => {
        const count = legendCategoryCounts.get(category.name) || 0;
        return visibleCategories.has(category.name) && count > 0;
      }),
    [categories, legendCategoryCounts, visibleCategories]
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

  // The desktop wheel directly controls timeline zoom and keeps the year
  // under the pointer anchored in place.
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const anchorOffset = e.clientX - rect.left;
    const zoomFactor = Math.exp(-e.deltaY * 0.004);
    setZoomAroundAnchor(pxPerYear * zoomFactor, anchorOffset);
  };

  // Ticks calculation
  const tickInterval = useMemo(() => {
    const targetYears = 60 / pxPerYear;
    const intervals = [
      1 / 12,
      1 / 4,
      1 / 2,
      1,
      2,
      5,
      10,
      25,
      50,
      100,
      250,
      500
    ];
    return (
      intervals.find(interval => interval >= targetYears) ||
      intervals[intervals.length - 1]
    );
  }, [pxPerYear]);

  const ticks = useMemo(() => {
    const list: { position: number; label: string }[] = [];
    const renderMargin = 120;
    const visibleStart =
      minYear +
      (Math.max(0, viewportX.startX - renderMargin) / timelineWidth) *
        totalYears;
    const visibleEnd =
      minYear +
      (Math.min(timelineWidth, viewportX.endX + renderMargin) /
        timelineWidth) *
        totalYears;
    const firstTick =
      Math.ceil((visibleStart - Number.EPSILON) / tickInterval) *
      tickInterval;

    for (
      let position = firstTick;
      position <= visibleEnd + Number.EPSILON;
      position += tickInterval
    ) {
      const normalizedPosition = Number(position.toFixed(8));
      list.push({
        position: normalizedPosition,
        label: formatTimelineTick(normalizedPosition, tickInterval)
      });
    }
    return list;
  }, [
    tickInterval,
    minYear,
    totalYears,
    timelineWidth,
    viewportX.startX,
    viewportX.endX
  ]);

  // Scroll to selected event when changed
  useEffect(() => {
    if (selectedEventId && containerRef.current) {
      const ev = events.find(e => e.id === selectedEventId);
      if (ev) {
        const targetScale =
          pxPerYear < overviewMaxPxPerYear &&
          !backgroundCategoryNames.has(ev.category)
            ? 12
            : pxPerYear;
        const targetTimelineWidth = Math.max(1200, totalYears * targetScale);

        if (targetScale !== pxPerYear) setPxPerYear(targetScale);

        window.setTimeout(() => {
          if (!containerRef.current) return;
          const x =
            ((ev.startPos - minYear) / totalYears) * targetTimelineWidth;
          containerRef.current.scrollTo({
            left: Math.max(0, x - containerRef.current.clientWidth / 2),
            behavior: 'smooth'
          });
        }, targetScale !== pxPerYear ? 60 : 0);
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
                onClick={() =>
                  setZoomAroundAnchor(
                    pxPerYear * 2,
                    (containerRef.current?.clientWidth || 0) / 2
                  )
                }
                className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-slate-900"
                title="Zoom Avant (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-indigo-600 font-bold">{formatZoomScale(pxPerYear)} px/an</span>
              <button
                onClick={() =>
                  setZoomAroundAnchor(
                    pxPerYear / 2,
                    (containerRef.current?.clientWidth || 0) / 2
                  )
                }
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
              onClick={() =>
                setZoomAroundAnchor(
                  pxPerYear * 2,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="Zoom Avant (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            
            <input
              type="range"
              min="0"
              max={ZOOM_SLIDER_STEPS}
              step="1"
              value={scaleToSliderValue(pxPerYear)}
              onChange={(e) =>
                setZoomAroundAnchor(
                  sliderValueToScale(parseFloat(e.target.value)),
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className="w-20 accent-indigo-600 cursor-pointer"
            />

            <button
              onClick={() =>
                setZoomAroundAnchor(
                  pxPerYear / 2,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="Zoom Arrière (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* Quick Zoom Presets */}
            <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />
            <button
              onClick={() =>
                setZoomAroundAnchor(
                  MIN_PX_PER_YEAR,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                zoomDisplayLevel === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue synthétique : grandes périodes uniquement"
            >
              Vue globale
            </button>
            <button
              onClick={() =>
                setZoomAroundAnchor(
                  2.4,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                zoomDisplayLevel === 'study' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue d’étude : événements et périodes"
            >
              Étude
            </button>
            <button
              onClick={() =>
                setZoomAroundAnchor(
                  36,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                zoomDisplayLevel === 'detail' && pxPerYear < 360
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue détaillée sur quelques décennies"
            >
              Détails
            </button>
            <button
              onClick={() =>
                setZoomAroundAnchor(
                  MAX_PX_PER_YEAR,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                pxPerYear >= 360
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
              title="Vue annuelle avec repères mensuels"
            >
              1 an
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

          <div
            className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800"
            title="Les événements ne sont jamais fusionnés"
          >
            <Eye className="size-3.5 text-indigo-600" />
            <span>
              {zoomDisplayLevel === 'overview'
                ? 'Synthèse'
                : zoomDisplayLevel === 'study'
                  ? 'Étude'
                  : 'Détail'}
            </span>
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

      {/* SEMANTIC OVERVIEW OR READABILITY HELPER */}
      {zoomDisplayLevel === 'overview' ? (
        <div className="bg-indigo-900/95 text-indigo-100 px-3.5 py-1.5 text-xs flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm border-b border-indigo-800 font-sans">
          <div className="flex min-w-0 items-center gap-2 font-medium">
            <BookOpen className="size-3.5 shrink-0 text-indigo-300" />
            <span className="truncate">
              <strong>Vue synthétique</strong> : grandes périodes uniquement.
              {hiddenByZoomCount > 0 &&
                ` ${hiddenByZoomCount} élément${hiddenByZoomCount > 1 ? 's' : ''} masqué${hiddenByZoomCount > 1 ? 's' : ''}.`}
            </span>
          </div>
          <button
            onClick={() =>
              setZoomAroundAnchor(
                2.4,
                (containerRef.current?.clientWidth || 0) / 2
              )
            }
            className="shrink-0 rounded border border-indigo-600 bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold uppercase text-indigo-100 transition hover:bg-indigo-800"
          >
            Voir les événements
          </button>
        </div>
      ) : isLowZoomMode ? (
        <div className="bg-indigo-900/90 text-indigo-100 px-3.5 py-1 text-xs flex items-center justify-between gap-2 shrink-0 z-20 shadow-sm border-b border-indigo-800 font-sans">
          <div className="flex items-center gap-2 font-medium truncate">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300 shrink-0 animate-pulse" />
            <span className="truncate">
              <strong>Vue d'ensemble ({formatZoomScale(pxPerYear)} px/an)</strong> : les événements restent sur leur ligne et les titres s’adaptent à l’espace disponible.
            </span>
          </div>
          <button
            onClick={() => setLabelDisplayMode('full')}
            className="text-[11px] uppercase font-bold underline text-indigo-200 hover:text-white shrink-0 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/80 transition"
          >
            Titres complets
          </button>
        </div>
      ) : null}

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
        style={{ touchAction: 'pan-x pan-y' }}
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
            {ticks.map(tick => {
              const x = getXFromYear(tick.position);
              return (
                <div
                  key={tick.position}
                  style={{ left: `${x}px` }}
                  className="absolute top-0 bottom-0 flex flex-col items-center justify-between"
                >
                  <span className="text-[10px] text-slate-500 font-mono tracking-tighter whitespace-nowrap pt-0.5">
                    {tick.label}
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
            {ticks.map(tick => {
              const x = getXFromYear(tick.position);
              return (
                <div
                  key={tick.position}
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

          {legendCategories.length === 0 && (
            <span className="shrink-0 text-[11px] italic text-slate-400">
              Aucune catégorie dans cette période
            </span>
          )}

          {legendCategories.map((cat) => {
            const catEventsCount = legendCategoryCounts.get(cat.name) || 0;
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 transition hover:border-indigo-300"
                title={`${cat.name} (${catEventsCount} événement${catEventsCount > 1 ? 's' : ''} dans la période visible)`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.hexColor }}
                />
                <span>{cat.name}</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.1 text-[10px] font-bold text-indigo-700">
                  {catEventsCount}
                </span>
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
                Catégories de la période visible ({legendCategories.length})
              </span>
            ) : (
              <span>Catégories de la période visible ({legendCategories.length})</span>
            )}
          </span>
        </div>

      </div>

    </div>
  );
};

