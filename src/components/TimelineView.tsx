import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventData, EraData, CategoryData, TimelinePeriod } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import {
  ZoomIn,
  ZoomOut,
  Eye,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crown,
  Flag,
  Landmark,
  SlidersHorizontal,
  Sparkles,
  Layers,
  BookOpen,
  Compass,
  ScrollText,
  UserRound
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
const MAX_CHARACTER_SUBLANES = 10;
const CHARACTER_SUBLANE_HEIGHT = 22;
const ERA_RAIL_HEIGHT = 60;
const YEAR_RULER_HEIGHT = 30;
const BIBLICAL_BOOK_TRACK_COUNT = 2;
const BIBLICAL_BOOK_TRACK_TOP = 32;
const BIBLICAL_BOOK_TRACK_SPACING = 28;
const BIBLICAL_BOOK_ITEM_HEIGHT = 24;
const BIBLICAL_BOOK_RAIL_BOTTOM_PADDING = 10;
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

const getCategoryIcon = (categoryName: string) => {
  if (categoryName.includes('Roi') || categoryName === 'Règnes') {
    return Crown;
  }
  if (categoryName.includes('Prophète')) return ScrollText;
  if (
    categoryName === 'Personnage' ||
    categoryName === 'Personnages' ||
    categoryName.startsWith('Fils de')
  ) {
    return UserRound;
  }
  if (categoryName.includes('livre biblique')) return BookOpen;
  if (
    categoryName.includes('Événement') ||
    categoryName === 'Événements'
  ) {
    return Flag;
  }
  return Layers;
};

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

  const visibleYearRange = useMemo(
    () => ({
      start: Math.round(
        minYear + (viewportX.startX / timelineWidth) * totalYears
      ),
      end: Math.round(
        minYear + (viewportX.endX / timelineWidth) * totalYears
      )
    }),
    [viewportX.startX, viewportX.endX, timelineWidth, minYear, totalYears]
  );

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

  const categoryNamesByRoot = useMemo(() => {
    const categoriesByName = new Map<string, CategoryData>(
      categories.map(category => [category.name, category] as const)
    );

    const belongsTo = (categoryName: string, rootName: string): boolean => {
      let currentName: string | undefined = categoryName;
      const visited = new Set<string>();

      while (currentName && !visited.has(currentName)) {
        if (currentName === rootName) return true;
        visited.add(currentName);
        currentName = categoriesByName.get(currentName)?.parent;
      }

      return false;
    };

    return {
      characters: new Set(
        categories
          .filter(category => belongsTo(category.name, 'Personnage'))
          .map(category => category.name)
      ),
      events: new Set(
        categories
          .filter(category =>
            belongsTo(category.name, 'Événements marquants')
          )
          .map(category => category.name)
      )
    };
  }, [categories]);

  // Helper for fuzzy date bar styling (gradient fade for uncertain dates)
  const getEventBarStyle = (ev: EventData, baseColor: string) => {
    const colorStr = ev.defaultColor
      ? (ev.defaultColor.startsWith('#') || ev.defaultColor.startsWith('rgb') ? ev.defaultColor : `rgb(${ev.defaultColor})`)
      : baseColor;
    const certaintyStyle =
      ev.certainty === 'possible' || ev.certainty === 'unknown'
        ? {
            outline: '1px dashed rgba(15, 23, 42, 0.55)',
            outlineOffset: '1px'
          }
        : ev.certainty === 'probable'
          ? {
              outline: '1px dotted rgba(15, 23, 42, 0.4)',
              outlineOffset: '1px'
            }
          : {};

    if (ev.fuzzyStart && ev.fuzzyEnd) {
      return {
        backgroundImage: `linear-gradient(to right, transparent 0%, ${colorStr} 30%, ${colorStr} 70%, transparent 100%)`,
        ...certaintyStyle
      };
    } else if (ev.fuzzyStart) {
      return {
        backgroundImage: `linear-gradient(to right, transparent 0%, ${colorStr} 35%)`,
        ...certaintyStyle
      };
    } else if (ev.fuzzyEnd) {
      return {
        backgroundImage: `linear-gradient(to right, ${colorStr} 65%, transparent 100%)`,
        ...certaintyStyle
      };
    }
    return {
      backgroundColor: colorStr,
      ...certaintyStyle
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

      if (!isBookPeriod && categoryNamesByRoot.events.has(e.category)) {
        if (!eventsByCat['Événements']) eventsByCat['Événements'] = [];
        eventsByCat['Événements'].push(e);
      } else if (
        !isBookPeriod &&
        categoryNamesByRoot.characters.has(e.category)
      ) {
        if (!eventsByCat['Personnages']) eventsByCat['Personnages'] = [];
        eventsByCat['Personnages'].push(e);
      } else if (e.isPoint && !isBookPeriod) {
        if (!eventsByCat['Événements']) eventsByCat['Événements'] = [];
        eventsByCat['Événements'].push(e);
      } else {
        if (!eventsByCat[e.category]) eventsByCat[e.category] = [];
        eventsByCat[e.category].push(e);
      }
    });

    // Ensure 'Événements' comes first if it exists
    const categoryKeys = Object.keys(eventsByCat).sort((a, b) => {
      if (a === 'Événements') return -1;
      if (b === 'Événements') return 1;
      if (a === 'Personnages') return -1;
      if (b === 'Personnages') return 1;
      return a.localeCompare(b);
    });

    categoryKeys.forEach(catName => {
      const catEvents = eventsByCat[catName];
      const sortedEvents = [...catEvents].sort((a, b) => a.startPos - b.startPos);

      const isBookCategory = backgroundCategoryNames.has(catName);
      const isEventLane = catName === 'Événements';
      const isCharacterLane = catName === 'Personnages';
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
        const eventLaneLabelWidth = Math.max(
          28,
          Math.min(
            360,
            labelWidthEstimate,
            Number.isFinite(nextStartX)
              ? Math.max(28, nextStartX - startX - 18)
              : labelWidthEstimate
          )
        );
        const labelWidth = isEventLane
          ? eventLaneLabelWidth
          : isLowZoomMode && !isBookCategory
            ? lowZoomLabelWidth
            : labelWidthEstimate;
        const showLabel =
          isEventLane ||
          !isLowZoomMode ||
          isBookCategory ||
          labelWidth >= 30;

        let sublaneIndex: number;
        if (isBookCategory || isEventLane) {
          sublaneIndex = 0;
          if (tracks.length === 0) tracks.push({ lastX: Number.POSITIVE_INFINITY });
        } else if (isLowZoomMode && primaryEvent.isPoint) {
          // Only markers that would physically overlap are offset vertically.
          // They remain independent and selectable.
          const markerVisualEndX = startX + 12;
          sublaneIndex = tracks.findIndex(track => track.lastX <= startX);
          if (
            sublaneIndex === -1 &&
            isCharacterLane &&
            tracks.length >= MAX_CHARACTER_SUBLANES
          ) {
            sublaneIndex = tracks.reduce(
              (earliestTrack, track, trackIndex) =>
                track.lastX < tracks[earliestTrack].lastX
                  ? trackIndex
                  : earliestTrack,
              0
            );
            tracks[sublaneIndex].lastX = markerVisualEndX;
          } else if (sublaneIndex === -1) {
            tracks.push({ lastX: markerVisualEndX });
            sublaneIndex = tracks.length - 1;
          } else {
            tracks[sublaneIndex].lastX = markerVisualEndX;
          }
        } else {
          const visualWidth =
            isCharacterLane && !primaryEvent.isPoint
              ? Math.max(16, rangeWidth)
              : Math.max(
                  rangeWidth,
                  isLowZoomMode ? labelWidth : labelWidthEstimate
                );
          const visualEndX = startX + visualWidth + (isLowZoomMode ? 8 : 12);
          sublaneIndex = tracks.findIndex(track => track.lastX <= startX);
          if (
            sublaneIndex === -1 &&
            isCharacterLane &&
            tracks.length >= MAX_CHARACTER_SUBLANES
          ) {
            sublaneIndex = tracks.reduce(
              (earliestTrack, track, trackIndex) =>
                track.lastX < tracks[earliestTrack].lastX
                  ? trackIndex
                  : earliestTrack,
              0
            );
            tracks[sublaneIndex].lastX = visualEndX;
          } else if (sublaneIndex === -1) {
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
        catColor:
          categoryColorMap[catName] ||
          (catName === 'Événements'
            ? '#2563eb'
            : catName === 'Personnages'
              ? categoryColorMap.Personnage || '#2563eb'
              : '#0080ff'),
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
    backgroundCategoryNames,
    categoryNamesByRoot
  ]);

  const backgroundPeriodItems = useMemo(
    () =>
      (Object.values(layoutLanes) as CategoryLane[])
        .filter(lane => backgroundCategoryNames.has(lane.categoryName))
        .flatMap(lane => lane.events),
    [layoutLanes, backgroundCategoryNames]
  );

  const trackedBackgroundPeriodItems = useMemo(() => {
    const trackEndXs = Array.from(
      { length: BIBLICAL_BOOK_TRACK_COUNT },
      () => Number.NEGATIVE_INFINITY
    );

    return [...backgroundPeriodItems]
      .sort(
        (left, right) =>
          left.startX - right.startX ||
          right.endX - right.startX - (left.endX - left.startX)
      )
      .map(item => {
        const availableTrackIndex = trackEndXs.findIndex(
          trackEndX => trackEndX <= item.startX
        );
        const visibleTrackIndex =
          availableTrackIndex >= 0
            ? availableTrackIndex
            : trackEndXs[0] <= trackEndXs[1]
              ? 0
              : 1;

        trackEndXs[visibleTrackIndex] = Math.max(
          trackEndXs[visibleTrackIndex],
          item.endX
        );

        return { ...item, visibleTrackIndex };
      });
  }, [backgroundPeriodItems]);

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

    return trackedBackgroundPeriodItems
      .filter(
        item =>
          item.endX >= viewportX.startX - renderMargin &&
          item.startX <= viewportX.endX + renderMargin
      )
      .sort(
        (left, right) =>
          right.maxYear -
            right.minYear -
            (left.maxYear - left.minYear) ||
          left.startX - right.startX
      );
  }, [trackedBackgroundPeriodItems, viewportX.startX, viewportX.endX]);

  const backgroundRailHeight =
    visibleBackgroundPeriodItems.length > 0
      ? BIBLICAL_BOOK_TRACK_TOP +
        (BIBLICAL_BOOK_TRACK_COUNT - 1) * BIBLICAL_BOOK_TRACK_SPACING +
        BIBLICAL_BOOK_ITEM_HEIGHT +
        BIBLICAL_BOOK_RAIL_BOTTOM_PADDING
      : 0;
  const eventBodyTop =
    ERA_RAIL_HEIGHT + YEAR_RULER_HEIGHT + backgroundRailHeight;

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
          <Compass className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
          <span className="font-sans font-medium text-slate-400 hidden sm:inline text-[11px]">Position :</span>
          <span className="font-bold text-white bg-indigo-900/80 px-2 py-0.5 rounded border border-indigo-600/60 shadow-sm text-[11px] sm:text-xs">
            {centerYear !== null ? formatDateFrench(centerYear) : '—'}
          </span>
          {currentEra && (
            <span className="hidden max-w-[280px] items-center gap-1.5 truncate font-sans text-[10px] text-slate-300 md:flex sm:text-[11px]">
              <span
                className="size-2 shrink-0 rounded-full ring-1 ring-white/40"
                style={{ backgroundColor: currentEra.hexColor }}
              />
              {currentEra.name}
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

        {/* Visible range and global progress */}
        <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-slate-400 sm:text-[11px]">
          <span
            className="hidden items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-slate-200 lg:flex"
            title="Période actuellement visible dans la frise"
          >
            <CalendarRange className="size-3 text-indigo-300" />
            {formatDateFrench(visibleYearRange.start)} →{' '}
            {formatDateFrench(visibleYearRange.end)}
          </span>
          <span className="font-bold text-indigo-300">
            {Math.round(centerPercent)}%
          </span>
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
          className="min-h-full relative pb-20"
        >
          {/* 1. HISTORICAL ERA CHAPTER RAIL */}
          <div
            style={{ height: `${ERA_RAIL_HEIGHT}px` }}
            className="relative z-[6] overflow-hidden border-b border-slate-300 bg-slate-100 shadow-[inset_0_-1px_0_rgba(15,23,42,0.06)]"
            aria-label="Ères historiques"
          >
            {eras.map((era) => {
              const left = getXFromYear(era.startPos);
              const width = Math.max(2, getXFromYear(era.endPos) - left);
              const eraEndX = left + width;
              const visibleStartX = Math.max(left, viewportX.startX);
              const visibleEndX = Math.min(eraEndX, viewportX.endX);
              const visibleWidth = Math.max(0, visibleEndX - visibleStartX);
              const isCurrent = currentEra?.id === era.id;
              const labelInset = Math.max(
                8,
                Math.min(
                  Math.max(8, width - 64),
                  visibleStartX - left + 10
                )
              );
              const labelMaxWidth = Math.max(
                52,
                Math.min(
                  440,
                  eraEndX - (left + labelInset) - 8,
                  visibleEndX - (left + labelInset) - 8
                )
              );
              const showPersistentLabel =
                visibleWidth >= 76 && (isCurrent || visibleWidth >= 110);

              return (
                <div
                  key={era.id}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    backgroundImage: `linear-gradient(115deg, rgba(${era.color}, ${
                      isCurrent ? 0.62 : 0.42
                    }), rgba(${era.color}, ${isCurrent ? 0.26 : 0.14}))`,
                    borderTop: `3px solid rgba(${era.color}, 0.98)`,
                    borderLeft: `1px solid rgba(${era.color}, 0.8)`,
                    boxShadow: isCurrent
                      ? `inset 0 -3px 0 rgba(${era.color}, 0.95)`
                      : 'none'
                  }}
                  className="absolute inset-y-0 overflow-hidden transition-[filter,box-shadow] duration-200"
                  title={`${era.name} (${formatDateFrench(era.startYear)} → ${formatDateFrench(era.endYear)})`}
                >
                  {showPersistentLabel && (
                    <div
                      style={{
                        left: `${labelInset}px`,
                        width: `${labelMaxWidth}px`
                      }}
                      className={`absolute top-2.5 flex h-10 min-w-0 items-center gap-2 rounded-xl border px-2.5 shadow-sm backdrop-blur-md transition-all ${
                        isCurrent
                          ? 'border-slate-700/70 bg-slate-950/90 text-white shadow-slate-950/20'
                          : 'border-white/80 bg-white/80 text-slate-800'
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-lg border ${
                          isCurrent
                            ? 'border-white/20 bg-white/10'
                            : 'border-slate-200 bg-white/80'
                        }`}
                      >
                        <Landmark
                          className={`size-3.5 ${
                            isCurrent ? 'text-indigo-200' : 'text-slate-600'
                          }`}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[8px] font-black uppercase tracking-[0.2em] ${
                            isCurrent ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        >
                          Ère
                        </span>
                        <span className="block truncate text-[10px] font-extrabold leading-tight sm:text-[11px]">
                          {era.name}
                        </span>
                      </span>
                      {labelMaxWidth >= 330 && !isLowZoomMode && (
                        <span
                          className={`shrink-0 font-mono text-[9px] ${
                            isCurrent ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {formatDateFrench(era.startYear)} →{' '}
                          {formatDateFrench(era.endYear)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {currentEra &&
              getXFromYear(currentEra.endPos) -
                getXFromYear(currentEra.startPos) <
                260 &&
              (() => {
                const overlayWidth = Math.min(
                  300,
                  Math.max(210, viewportX.endX - viewportX.startX - 24)
                );
                const centeredLeft =
                  (viewportX.startX + viewportX.endX) / 2 -
                  overlayWidth / 2;
                const overlayLeft = Math.max(
                  viewportX.startX + 8,
                  Math.min(
                    viewportX.endX - overlayWidth - 8,
                    centeredLeft
                  )
                );

                return (
                  <div
                    style={{
                      left: `${overlayLeft}px`,
                      width: `${overlayWidth}px`
                    }}
                    className="absolute top-2.5 z-30 flex h-10 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/95 px-2.5 text-white shadow-xl shadow-slate-950/20 ring-2 ring-white/30 backdrop-blur-md"
                    title={`${currentEra.name} (${formatDateFrench(currentEra.startYear)} → ${formatDateFrench(currentEra.endYear)})`}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                      <Landmark className="size-3.5 text-indigo-200" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-indigo-200">
                        Ère active
                      </span>
                      <span className="block truncate text-[10px] font-extrabold leading-tight sm:text-[11px]">
                        {currentEra.name}
                      </span>
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* 2. YEAR TICKS & RULER */}
          <div
            style={{ height: `${YEAR_RULER_HEIGHT}px` }}
            className="sticky top-0 z-10 flex items-center border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur"
            aria-label="Règle chronologique"
          >
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
                className="absolute top-1 z-20 inline-flex h-6 items-center gap-1.5 rounded-lg border border-indigo-800 bg-indigo-950/95 px-2 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md shadow-indigo-950/10 backdrop-blur"
              >
                <BookOpen className="size-3.5 text-indigo-200" />
                Livres bibliques
                <span className="rounded-full border border-indigo-600 bg-indigo-800 px-1.5 font-mono text-[9px] text-indigo-100">
                  {visibleBackgroundPeriodItems.length}
                </span>
              </div>

              {visibleBackgroundPeriodItems.map(item => {
                const event = item.primaryEvent;
                const width = Math.max(24, item.endX - item.startX);
                const isSelected = selectedEventId === event.id;
                const isHovered = hoveredEventId === event.id;
                const isCentered = centeredBackgroundPeriodId === event.id;
                const isActive = isSelected || isHovered || isCentered;
                const duration = Math.max(1, item.maxYear - item.minYear);
                const nestingZIndex = Math.max(
                  10,
                  40 - Math.round(Math.log10(duration + 1) * 5)
                );
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
                      top: `${
                        BIBLICAL_BOOK_TRACK_TOP +
                        item.visibleTrackIndex * BIBLICAL_BOOK_TRACK_SPACING
                      }px`,
                      width: `${width}px`,
                      zIndex: isActive ? 50 : nestingZIndex
                    }}
                    onClick={clickEvent => {
                      clickEvent.stopPropagation();
                      onSelectEvent(event);
                    }}
                    onMouseEnter={() => setHoveredEventId(event.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className={`absolute h-6 overflow-hidden rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300/70'
                        : 'border-indigo-200 bg-white/90 text-indigo-950 hover:border-indigo-400 hover:bg-indigo-100'
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

          {/* ERA COLOR WASHES THROUGH THE STUDY LANES */}
          <div
            style={{ top: `${eventBodyTop}px` }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
            aria-hidden="true"
          >
            {eras.map(era => {
              const left = getXFromYear(era.startPos);
              const width = Math.max(2, getXFromYear(era.endPos) - left);
              const isCurrent = currentEra?.id === era.id;
              return (
                <div
                  key={`era-wash-${era.id}`}
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    background: `linear-gradient(to bottom, rgba(${era.color}, ${
                      isCurrent ? 0.13 : 0.07
                    }), rgba(${era.color}, 0.015) 70%)`,
                    borderLeft: `1px solid rgba(${era.color}, ${
                      isCurrent ? 0.45 : 0.22
                    })`
                  }}
                  className="absolute inset-y-0"
                />
              );
            })}
          </div>

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
              className="pointer-events-none absolute inset-y-0 z-30 w-[2px] bg-gradient-to-b from-indigo-700/90 via-indigo-500/55 to-indigo-400/15"
            />
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
                const isEventLane = lane.categoryName === 'Événements';
                const isCharacterLane = lane.categoryName === 'Personnages';
                const isManuallyCollapsed =
                  !isEventLane &&
                  collapsedCategories.has(lane.categoryName);
                const effectiveSublanes = isManuallyCollapsed ? 0 : lane.numSublanes;
                const SUBLANE_HEIGHT = isCharacterLane
                  ? CHARACTER_SUBLANE_HEIGHT
                  : 24;
                const laneHeight = effectiveSublanes * SUBLANE_HEIGHT;
                const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;
                const LaneIcon = getCategoryIcon(lane.categoryName);

                return (
                  <div
                    key={lane.categoryName}
                    className={`relative my-1 border-b py-1 transition-all duration-200 ${
                      isEventLane
                        ? 'border-blue-200 bg-gradient-to-r from-blue-50/90 via-white/90 to-blue-50/30 shadow-[inset_3px_0_0_#2563eb]'
                        : isCharacterLane
                          ? 'border-slate-200 bg-gradient-to-r from-slate-100/90 via-white/90 to-slate-50/30 shadow-[inset_3px_0_0_#475569]'
                          : 'border-slate-200/80'
                    }`}
                  >
                    {/* Category Name Sticky Badge with Collapse Toggle */}
                    {isEventLane ? (
                      <div
                        className="sticky left-2 z-35 mb-1.5 inline-flex items-center gap-1.5 rounded-lg border border-blue-800 bg-blue-700 px-3 py-1 text-[10px] font-extrabold text-white shadow-md ring-2 ring-blue-500/20 sm:text-[11px]"
                      >
                        <Flag className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                        <span className="text-white uppercase tracking-wider font-extrabold">
                          Événements
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono border bg-blue-800 text-blue-100 border-blue-600">
                          {lane.totalEventsCount}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleCollapseCategory(lane.categoryName)}
                        className={`sticky left-2 z-35 mb-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold shadow-sm transition-all group/badge sm:text-[11px] ${
                          isCharacterLane
                            ? 'border-slate-300 bg-slate-900 text-white hover:border-indigo-300 hover:bg-slate-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                        }`}
                        title={isManuallyCollapsed ? "Cliquer pour déplier la catégorie" : "Cliquer pour replier la catégorie"}
                      >
                        <LaneIcon
                          className={`size-3.5 shrink-0 ${
                            isCharacterLane
                              ? 'text-blue-300'
                              : 'text-slate-500'
                          }`}
                        />
                        <span
                          className={`uppercase tracking-wider ${
                            isCharacterLane
                              ? 'text-white'
                              : 'text-slate-700 group-hover/badge:text-indigo-700'
                          }`}
                        >
                          {lane.categoryName}
                        </span>
                        <span
                          className={`rounded-full border px-1.5 py-0.2 font-mono text-[9px] ${
                            isCharacterLane
                              ? 'border-slate-600 bg-slate-800 text-slate-200'
                              : 'border-slate-200 bg-slate-100 text-slate-500'
                          }`}
                        >
                          {lane.totalEventsCount}{' '}
                          {isCharacterLane ? 'pers.' : 'él.'}
                        </span>
                        {isManuallyCollapsed ? (
                          <ChevronDown
                            className={`size-3 ${
                              isCharacterLane
                                ? 'text-blue-300'
                                : 'text-indigo-600'
                            }`}
                          />
                        ) : (
                          <ChevronUp
                            className={`size-3 ${
                              isCharacterLane
                                ? 'text-slate-300'
                                : 'text-slate-400 group-hover/badge:text-indigo-600'
                            }`}
                          />
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
                          const continuesBeforeViewport =
                            !ev.isPoint &&
                            startX < viewportX.startX &&
                            endX >= viewportX.startX;
                          const continuesAfterViewport =
                            !ev.isPoint &&
                            endX > viewportX.endX &&
                            startX <= viewportX.endX;
                          const duration = Math.max(
                            0.01,
                            ev.endPos - ev.startPos
                          );
                          const eventLaneZIndex = Math.max(
                            20,
                            45 - Math.round(Math.log10(duration + 1) * 6)
                          );

                          // Calculate label horizontal position aligned to central line
                          const relCenterX = viewportCenterX - startX;
                          const labelOffsetX = ev.isPoint
                            ? 0
                            : width <= 80
                            ? 4
                            : Math.max(4, Math.min(width - 180, relCenterX - 40));

                          const barStyle = getEventBarStyle(
                            ev,
                            categoryColorMap[ev.category] || lane.catColor
                          );

                          return (
                            <div
                              key={ev.id}
                              style={{
                                left: `${startX}px`,
                                top: `${topPos}px`,
                                width: ev.isPoint ? 'auto' : `${width}px`,
                                zIndex:
                                  isSelected || isClosest
                                    ? 60
                                    : isHovered
                                      ? 55
                                      : isEventLane
                                        ? eventLaneZIndex
                                        : undefined
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
                                        (isEventLane || isLowZoomMode) &&
                                        !isSelected &&
                                        !isClosest &&
                                        !isHovered
                                          ? {
                                              width: `${clusterItem.labelWidth}px`
                                            }
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

                                    {continuesBeforeViewport && (
                                      <span
                                        style={{
                                          left: `${Math.max(
                                            2,
                                            viewportX.startX - startX + 2
                                          )}px`
                                        }}
                                        className="pointer-events-none absolute top-1/2 z-20 flex size-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-slate-950/75 text-white shadow"
                                        title="Cette période commence avant la zone visible"
                                      >
                                        <ChevronLeft className="size-3" />
                                      </span>
                                    )}

                                    {continuesAfterViewport && (
                                      <span
                                        style={{
                                          left: `${Math.max(
                                            2,
                                            Math.min(
                                              width - 18,
                                              viewportX.endX - startX - 18
                                            )
                                          )}px`
                                        }}
                                        className="pointer-events-none absolute top-1/2 z-20 flex size-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-slate-950/75 text-white shadow"
                                        title="Cette période continue après la zone visible"
                                      >
                                        <ChevronRight className="size-3" />
                                      </span>
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
            const CategoryIcon = getCategoryIcon(cat.name);
            return (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/40"
                title={`${cat.name} (${catEventsCount} événement${catEventsCount > 1 ? 's' : ''} dans la période visible)`}
              >
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${cat.hexColor}18` }}
                >
                  <CategoryIcon
                    className="size-3"
                    style={{ color: cat.hexColor }}
                  />
                </span>
                <span>{cat.name}</span>
                <span className="rounded-full bg-indigo-100 px-1.5 py-0.1 text-[10px] font-bold text-indigo-700">
                  {catEventsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Viewport Filter Status Indicator */}
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-slate-500">
          <span className="hidden items-center gap-2 xl:flex">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-5 rounded bg-slate-700" />
              Date établie
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-5 rounded border border-dashed border-slate-600 bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
              Datation incertaine
            </span>
          </span>
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

