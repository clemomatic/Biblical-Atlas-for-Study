import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BiblicalPlace, EventData, EraData, CategoryData, TimelinePeriod } from '../types';
import { formatDateFrench } from '../utils/dateUtils';
import { getAuthoritativeDisplayLabel } from '../data/authoritativeChronology';
import type {
  BiblicalPerson,
  PersonActivityType
} from '../domain/history/types';
import { calculateEventParticipants } from '../domain/history/eventChronology';
import { ACTIVITY_VISUALS } from '../domain/history/activityVisuals';
import {
  BIOGRAPHY_LANES,
  BIOGRAPHY_LANE_BY_ID,
  getBiographyLaneIdForEvent
} from '../domain/history/timelineBiography';
import {
  getTimelineSemanticLane,
  getTimelineSemanticLaneCounts,
  TIMELINE_SEMANTIC_LANES,
  TIMELINE_SEMANTIC_LANE_BY_ID
} from '../domain/history/timelineSemanticLanes';
import { BiographicalRibbon } from './BiographicalRibbon';
import { EventContextPreview } from './EventContextPreview';
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
  people: readonly BiblicalPerson[];
  places: readonly BiblicalPlace[];
  selectedEventId: string | null;
  isActive: boolean;
  onSelectEvent: (event: EventData) => void;
  onVisiblePeriodChange: (period: TimelinePeriod) => void;
  onOpenAtThisMoment: () => void;
  searchQuery: string;
}

const MIN_PX_PER_YEAR = 0.35;
const MAX_PX_PER_YEAR = 720;
const DEFAULT_PX_PER_YEAR = 1.2;
const ZOOM_SLIDER_STEPS = 1000;
const INITIAL_CENTER_YEAR = -1000;
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
  people,
  places,
  selectedEventId,
  isActive,
  onSelectEvent,
  onVisiblePeriodChange,
  onOpenAtThisMoment,
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
  const [pinnedPreviewEventId, setPinnedPreviewEventId] = useState<string | null>(null);
  const touchPreviewClickRef = useRef<string | null>(null);
  const [isControlBarCollapsed, setIsControlBarCollapsed] = useState<boolean>(false);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
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
  const semanticZoomLevel =
    pxPerYear < overviewMaxPxPerYear
      ? 0
      : pxPerYear < 2.4
        ? 1
        : pxPerYear < detailMinPxPerYear
          ? 2
          : pxPerYear < 360
            ? 3
            : 4;

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
      // Exception éditoriale demandée : les périodes de livres bibliques
      // conservent exactement leur comportement et leur apparence actuels.
      if (backgroundCategoryNames.has(event.category)) return true;

      const presentation = event.timelinePresentation;
      if (
        presentation &&
        (semanticZoomLevel < presentation.zoomMin ||
          semanticZoomLevel > presentation.zoomMax)
      ) {
        return false;
      }

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
    semanticZoomLevel,
    backgroundCategoryNames
  ]);

  // Activity projections remain available to search and detail views, but a
  // person's activities are drawn inside the life ribbon when that ribbon exists.
  const timelineDisplayEvents = useMemo(() => {
    const peopleWithLifeRibbon = new Set(
      finalFilteredEvents
        .filter(
          event =>
            event.historicalPersonId &&
            event.historicalPersonSpanKind === 'lifespan'
        )
        .map(event => event.historicalPersonId as string)
    );

    return finalFilteredEvents.filter(
      event =>
        !(
          event.historicalPersonSpanKind === 'activity' &&
          event.historicalPersonId &&
          peopleWithLifeRibbon.has(event.historicalPersonId)
        )
    );
  }, [finalFilteredEvents]);

  const hiddenByZoomCount =
    viewportFilteredEvents.length - finalFilteredEvents.length;

  const selectedTimelineEvent = useMemo(
    () => events.find(event => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const previewEvent = useMemo(() => {
    const previewId = pinnedPreviewEventId ?? hoveredEventId;
    if (!previewId) return null;
    const event = events.find(candidate => candidate.id === previewId) ?? null;
    return event?.historicalPersonId ? null : event;
  }, [events, hoveredEventId, pinnedPreviewEventId]);

  const selectedParticipantCalculations = useMemo(
    () =>
      new Map(
        selectedTimelineEvent && !selectedTimelineEvent.historicalPersonId
          ? calculateEventParticipants(selectedTimelineEvent, people).map(
              calculation => [calculation.person.id, calculation] as const
            )
          : []
      ),
    [people, selectedTimelineEvent]
  );

  const selectedEventMarkerX =
    selectedTimelineEvent && !selectedTimelineEvent.historicalPersonId
      ? getXFromYear(
          (selectedTimelineEvent.startPos + selectedTimelineEvent.endPos) / 2
        )
      : null;

  // Compute event closest to the center of the current viewport
  const closestEventId = useMemo(() => {
    if (timelineDisplayEvents.length === 0) return null;
    const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;

    let minDistance = Infinity;
    let closestId: string | null = null;

    timelineDisplayEvents.forEach(e => {
      const eventX = getXFromYear(e.startPos);
      const dist = Math.abs(eventX - viewportCenterX);
      if (dist < minDistance) {
        minDistance = dist;
        closestId = e.id;
      }
    });

    return closestId;
  }, [timelineDisplayEvents, viewportX, timelineWidth, minYear, maxYear]);

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
    biographyLaneId?: EventData['historicalPersonLaneId'];
    semanticLaneId?: string;
    semanticKind?: 'period' | 'point';
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
    timelineDisplayEvents.forEach(e => {
      const isBookPeriod = backgroundCategoryNames.has(e.category);

      if (!isBookPeriod && categoryNamesByRoot.characters.has(e.category)) {
        const laneId = getBiographyLaneIdForEvent(e);
        const laneKey = `biography:${laneId}`;
        if (!eventsByCat[laneKey]) eventsByCat[laneKey] = [];
        eventsByCat[laneKey].push(e);
      } else if (isBookPeriod) {
        if (!eventsByCat[e.category]) eventsByCat[e.category] = [];
        eventsByCat[e.category].push(e);
      } else {
        const semanticLane = getTimelineSemanticLane(e);
        const laneKey = `semantic:${semanticLane.id}`;
        if (!eventsByCat[laneKey]) eventsByCat[laneKey] = [];
        eventsByCat[laneKey].push(e);
      }
    });

    const categoryKeys = Object.keys(eventsByCat).sort((a, b) => {
      const leftSemantic = a.startsWith('semantic:')
        ? TIMELINE_SEMANTIC_LANE_BY_ID.get(a.replace('semantic:', ''))
        : undefined;
      const rightSemantic = b.startsWith('semantic:')
        ? TIMELINE_SEMANTIC_LANE_BY_ID.get(b.replace('semantic:', ''))
        : undefined;
      if (leftSemantic || rightSemantic) {
        return (leftSemantic?.order ?? 900) - (rightSemantic?.order ?? 900);
      }
      const leftLane = a.startsWith('biography:')
        ? BIOGRAPHY_LANE_BY_ID.get(
            a.replace('biography:', '') as NonNullable<EventData['historicalPersonLaneId']>
          )
        : undefined;
      const rightLane = b.startsWith('biography:')
        ? BIOGRAPHY_LANE_BY_ID.get(
            b.replace('biography:', '') as NonNullable<EventData['historicalPersonLaneId']>
          )
        : undefined;
      if (leftLane || rightLane) {
        return (leftLane?.order ?? 999) - (rightLane?.order ?? 999);
      }
      return a.localeCompare(b);
    });

    categoryKeys.forEach(catName => {
      const catEvents = eventsByCat[catName];
      const sortedEvents = [...catEvents].sort((a, b) => a.startPos - b.startPos);

      const isBookCategory = backgroundCategoryNames.has(catName);
      const semanticLane = catName.startsWith('semantic:')
        ? TIMELINE_SEMANTIC_LANE_BY_ID.get(catName.replace('semantic:', ''))
        : undefined;
      const isEventLane = semanticLane?.kind === 'point';
      const isPeriodLane = semanticLane?.kind === 'period';
      const biographyLaneId = catName.startsWith('biography:')
        ? (catName.replace(
            'biography:',
            ''
          ) as NonNullable<EventData['historicalPersonLaneId']>)
        : undefined;
      const biographyLane = biographyLaneId
        ? BIOGRAPHY_LANE_BY_ID.get(biographyLaneId)
        : undefined;
      const isCharacterLane = Boolean(biographyLane);
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

        const biographyName = primaryEvent.historicalPersonId
          ? people.find(person => person.id === primaryEvent.historicalPersonId)
              ?.name ?? primaryEvent.text.split(' — ')[0]
          : primaryEvent.text;
        const biographyLabelWidth = Math.min(
          168,
          Math.max(72, biographyName.length * 7 + 22)
        );
        const labelWidthEstimate = isLowZoomMode
          ? primaryEvent.isPoint
            ? 18
            : Math.min(60, rangeWidth)
          : getAuthoritativeDisplayLabel(primaryEvent, rangeWidth).length * 6.5 +
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
        const labelWidth = isCharacterLane
          ? biographyLabelWidth
          : isEventLane
          ? eventLaneLabelWidth
          : isLowZoomMode && !isBookCategory
            ? lowZoomLabelWidth
            : labelWidthEstimate;
        let showLabel =
          isCharacterLane ||
          isBookCategory ||
          labelWidth >= 30;

        let sublaneIndex: number;
        if (isBookCategory) {
          sublaneIndex = 0;
          if (tracks.length === 0) tracks.push({ lastX: Number.POSITIVE_INFINITY });
        } else if (isEventLane || isPeriodLane) {
          const maxTracks = isEventLane
            ? isLowZoomMode
              ? 2
              : pxPerYear < 2
                ? 3
                : 4
            : isLowZoomMode
              ? 2
              : 3;
          const visualWidth = isEventLane
            ? Math.max(14, labelWidth + 10)
            : Math.max(rangeWidth, Math.min(labelWidthEstimate, 220));
          const visualEndX = startX + visualWidth + 10;
          const availableTrack = tracks.findIndex(track => track.lastX <= startX);
          if (availableTrack >= 0) {
            sublaneIndex = availableTrack;
            tracks[availableTrack].lastX = visualEndX;
          } else if (tracks.length < maxTracks) {
            tracks.push({ lastX: visualEndX });
            sublaneIndex = tracks.length - 1;
          } else {
            sublaneIndex = tracks.reduce(
              (best, track, index) =>
                track.lastX < tracks[best].lastX ? index : best,
              0
            );
            tracks[sublaneIndex].lastX = Math.max(
              tracks[sublaneIndex].lastX,
              startX + (isEventLane ? 14 : Math.max(16, rangeWidth))
            );
            showLabel = false;
          }
        } else if (isLowZoomMode && primaryEvent.isPoint) {
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
          const visualWidth =
            isCharacterLane && !primaryEvent.isPoint
              ? Math.max(16, rangeWidth, biographyLabelWidth + 10)
              : Math.max(
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
        categoryName: biographyLane?.label ?? semanticLane?.label ?? catName,
        catColor:
          biographyLane?.color ||
          semanticLane?.color ||
          categoryColorMap[catName] ||
          (isEventLane ? '#2563eb' : '#0080ff'),
        biographyLaneId,
        semanticLaneId: semanticLane?.id,
        semanticKind: semanticLane?.kind,
        events: positionedEvents,
        numSublanes: tracks.length,
        totalEventsCount: catEvents.length
      };
    });

    return lanesMap;
  }, [
    timelineDisplayEvents,
    timelineWidth,
    pxPerYear,
    categoryColorMap,
    isLowZoomMode,
    backgroundCategoryNames,
    categoryNamesByRoot,
    people
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

  const exactViewportEvents = useMemo(() => {
    return finalFilteredEvents.filter(event => {
      const startX = getXFromYear(event.startPos);
      const endX = event.isPoint ? startX : getXFromYear(event.endPos);
      return endX >= viewportX.startX && startX <= viewportX.endX;
    });
  }, [
    finalFilteredEvents,
    viewportX.startX,
    viewportX.endX,
    timelineWidth
  ]);

  const visibleSemanticLanes = useMemo(() => {
    const counts = getTimelineSemanticLaneCounts(
      exactViewportEvents.filter(
        event =>
          !categoryNamesByRoot.characters.has(event.category) &&
          !backgroundCategoryNames.has(event.category)
      )
    );
    return TIMELINE_SEMANTIC_LANES
      .map(lane => ({ ...lane, count: counts.get(lane.id) ?? 0 }))
      .filter(lane => lane.count > 0);
  }, [
    backgroundCategoryNames,
    categoryNamesByRoot.characters,
    exactViewportEvents
  ]);

  const visibleBiographyLanes = useMemo(() => {
    const identities = new Map(
      BIOGRAPHY_LANES.map(lane => [lane.id, new Set<string>()])
    );
    exactViewportEvents.forEach(event => {
      if (!categoryNamesByRoot.characters.has(event.category)) return;
      identities
        .get(getBiographyLaneIdForEvent(event))
        ?.add(event.historicalPersonId ?? event.id);
    });
    return BIOGRAPHY_LANES
      .map(lane => ({
        ...lane,
        count: identities.get(lane.id)?.size ?? 0
      }))
      .filter(lane => lane.count > 0);
  }, [categoryNamesByRoot.characters, exactViewportEvents]);

  const visibleActivityTypes = useMemo(() => {
    const counts = new Map<PersonActivityType, number>();
    exactViewportEvents.forEach(event => {
      if (!categoryNamesByRoot.characters.has(event.category)) return;
      (event.historicalActivityPeriods ?? []).forEach(activity => {
        counts.set(activity.type, (counts.get(activity.type) ?? 0) + 1);
      });
    });
    return (
      Object.keys(ACTIVITY_VISUALS) as Array<PersonActivityType | 'lifespan'>
    )
      .filter((type): type is PersonActivityType => type !== 'lifespan')
      .map(type => ({ type, count: counts.get(type) ?? 0 }))
      .filter(item => item.count > 0);
  }, [categoryNamesByRoot.characters, exactViewportEvents]);

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
        const needsDetailScale =
          ev.timelineLevel === 'detail' &&
          pxPerYear < detailMinPxPerYear;
        const targetScale =
          needsDetailScale
            ? 12
            : pxPerYear < overviewMaxPxPerYear &&
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

  useEffect(() => {
    if (!previewEvent) return;
    const closePreview = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPinnedPreviewEventId(null);
      setHoveredEventId(null);
    };
    window.addEventListener('keydown', closePreview);
    return () => window.removeEventListener('keydown', closePreview);
  }, [previewEvent]);

  useEffect(() => {
    if (!isDisplayMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDisplayMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isDisplayMenuOpen]);

  return (
    <div data-testid="timeline-view" className="relative flex h-full flex-col select-none overflow-hidden bg-[var(--color-paper)] text-[var(--color-ink)]">

      <div className="relative z-30 flex min-h-13 shrink-0 items-center gap-2 border-b border-[var(--color-stone)] bg-[color-mix(in_srgb,var(--color-paper)_95%,transparent)] px-2.5 py-1.5 backdrop-blur-xl sm:px-3">
        <div className="flex items-center rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-0.5">
          <button
            type="button"
            onClick={() =>
              setZoomAroundAnchor(
                pxPerYear / 2,
                (containerRef.current?.clientWidth || 0) / 2
              )
            }
            className="atlas-icon-button min-h-9 min-w-9"
            title="Zoom arrière"
            aria-label="Zoom arrière"
          >
            <ZoomOut className="size-4" />
          </button>
          <input
            type="range"
            min="0"
            max={ZOOM_SLIDER_STEPS}
            step="1"
            value={scaleToSliderValue(pxPerYear)}
            onChange={event =>
              setZoomAroundAnchor(
                sliderValueToScale(parseFloat(event.target.value)),
                (containerRef.current?.clientWidth || 0) / 2
              )
            }
            className="w-20 cursor-pointer accent-[var(--color-primary)] sm:w-24"
            aria-label="Niveau de zoom de la frise"
          />
          <button
            type="button"
            onClick={() =>
              setZoomAroundAnchor(
                pxPerYear * 2,
                (containerRef.current?.clientWidth || 0) / 2
              )
            }
            className="atlas-icon-button min-h-9 min-w-9"
            title="Zoom avant"
            aria-label="Zoom avant"
          >
            <ZoomIn className="size-4" />
          </button>
        </div>

        <div className="hidden items-center rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-0.5 sm:flex">
          {[
            {
              label: 'Global',
              scale: MIN_PX_PER_YEAR,
              active: zoomDisplayLevel === 'overview'
            },
            {
              label: 'Étude',
              scale: 2.4,
              active: zoomDisplayLevel === 'study'
            },
            {
              label: 'Détail',
              scale: 36,
              active: zoomDisplayLevel === 'detail' && pxPerYear < 360
            },
            {
              label: '1 an',
              scale: MAX_PX_PER_YEAR,
              active: pxPerYear >= 360
            }
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() =>
                setZoomAroundAnchor(
                  preset.scale,
                  (containerRef.current?.clientWidth || 0) / 2
                )
              }
              aria-pressed={preset.active}
              className={`min-h-9 rounded-[7px] px-3 text-xs font-semibold ${
                preset.active
                  ? 'bg-[var(--color-paper)] text-[var(--color-primary-dark)] shadow-[var(--shadow-low)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenAtThisMoment}
          aria-label="À ce moment-là"
          className="atlas-control flex shrink-0 items-center gap-2 px-2.5 sm:px-3"
          title="Explorer les personnes, événements et présences de la période visible"
        >
          <CalendarRange className="size-4 text-[var(--color-bronze)]" />
          <span className="hidden whitespace-nowrap md:inline">
            À ce moment-là
          </span>
        </button>

        {centerYear !== null && (
          <span className="ml-auto hidden text-xs font-medium tabular-nums text-[var(--color-ink-soft)] lg:block">
            Centre · {formatDateFrench(centerYear)}
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsDisplayMenuOpen(previous => !previous)}
          aria-expanded={isDisplayMenuOpen}
          className="atlas-control ml-auto flex items-center gap-2 px-3 lg:ml-0"
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Affichage</span>
          <ChevronDown
            className={`size-3.5 ${isDisplayMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isDisplayMenuOpen && (
          <div className="atlas-elevated atlas-enter absolute right-2 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-1rem))] rounded-[var(--radius-lg)] p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Eye className="size-4 text-[var(--color-primary)]" />
              Lisibilité de la frise
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              Les événements restent distincts ; seuls les titres s’adaptent à
              l’espace disponible.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-1 rounded-[var(--radius-md)] bg-[var(--color-paper-muted)] p-1">
              {[
                { id: 'auto' as const, label: 'Auto' },
                { id: 'compact' as const, label: 'Épuré' },
                { id: 'full' as const, label: 'Complet' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setLabelDisplayMode(mode.id)}
                  aria-pressed={labelDisplayMode === mode.id}
                  className={`min-h-10 rounded-[7px] text-xs font-semibold ${
                    labelDisplayMode === mode.id
                      ? 'bg-[var(--color-paper)] text-[var(--color-primary-dark)] shadow-[var(--shadow-low)]'
                      : 'text-[var(--color-ink-muted)]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <section className="mt-4 border-t border-[var(--color-stone-light)] pt-3" aria-label="Légende des rubans biographiques">
              <h3 className="text-xs font-bold text-[var(--color-ink)]">
                Rubans biographiques
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                {Object.values(ACTIVITY_VISUALS).map(visual => (
                  <span
                    key={visual.label}
                    className="flex items-center gap-2 text-xs text-[var(--color-ink-soft)]"
                  >
                    <span
                      className="h-1.5 w-7 rounded-full"
                      style={{
                        background:
                          visual.pattern === 'solid'
                            ? visual.color
                            : `repeating-linear-gradient(90deg, ${visual.color} 0 5px, transparent 5px 8px)`
                      }}
                      aria-hidden="true"
                    />
                    {visual.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
                Fondu : borne approximative · contour pointillé : période possible.
              </p>
            </section>

            <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 border-t border-[var(--color-stone-light)] pt-3 text-sm font-medium text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                checked={autoFilterViewport}
                onChange={event => setAutoFilterViewport(event.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              Adapter la légende à la période visible
            </label>
            {hiddenByZoomCount > 0 && (
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                {hiddenByZoomCount} élément
                {hiddenByZoomCount > 1 ? 's' : ''} secondaire
                {hiddenByZoomCount > 1 ? 's' : ''} masqué
                {hiddenByZoomCount > 1 ? 's' : ''} à ce niveau de zoom.
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* CONTROL BAR (Collapsible & Compact) */}
      {false && (isControlBarCollapsed ? (
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
      ))}

      {/* SEMANTIC OVERVIEW OR READABILITY HELPER */}
      {false && (zoomDisplayLevel === 'overview' ? (
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
      ) : null)}

      {/* DISCRETE GLOBAL BIBLICAL HISTORY PROGRESS BAR */}
      <div className="z-20 flex shrink-0 select-none items-center justify-between gap-3 border-b border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] px-3 py-1.5 text-xs text-[var(--color-ink-soft)] sm:px-4">
        {/* Current position badge */}
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <Compass className="size-3.5 shrink-0 text-[var(--color-bronze)]" />
          <span className="hidden text-[11px] font-medium text-[var(--color-ink-muted)] sm:inline">Position</span>
          <span className="text-[11px] font-semibold tabular-nums text-[var(--color-ink)] sm:text-xs">
            {centerYear !== null ? formatDateFrench(centerYear) : '—'}
          </span>
          {currentEra && (
            <span className="hidden max-w-[280px] items-center gap-1.5 truncate font-serif text-xs text-[var(--color-ink-soft)] md:flex">
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
          className="group relative h-2.5 max-w-lg flex-1 cursor-pointer overflow-visible rounded-full bg-[var(--color-stone)]"
          title="Cliquer ou survoler pour naviguer rapidement dans l'histoire biblique"
        >
          {/* Mini Eras color background track */}
          <div className="pointer-events-none absolute inset-0 flex overflow-hidden rounded-full opacity-45 transition-opacity group-hover:opacity-70">
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
                  className="absolute inset-y-0 border-r border-[var(--color-paper)]/60"
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
            className="pointer-events-none absolute inset-y-[-2px] rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-paper)] transition-all"
          />

          {/* Center line pin */}
          <div
            style={{ left: `${centerPercent}%` }}
            className="pointer-events-none absolute inset-y-[-3px] z-10 w-px -translate-x-1/2 bg-[var(--color-ink)]"
          />

          {/* Hover preview tooltip line */}
          {hoveredProgressInfo && (
            <div
              style={{ left: `${hoveredProgressInfo.xRatio * 100}%` }}
              className="pointer-events-none absolute inset-y-[-3px] z-20 w-px -translate-x-1/2 bg-[var(--color-bronze)]"
            >
              <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2 py-1 text-[11px] font-medium tabular-nums text-[var(--color-paper)] shadow-[var(--shadow-mid)]">
                Aller à : {formatDateFrench(hoveredProgressInfo.year)}
              </div>
            </div>
          )}
        </div>

        {/* Visible range and global progress */}
        <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium tabular-nums text-[var(--color-ink-muted)]">
          <span
            className="hidden items-center gap-1 lg:flex"
            title="Période actuellement visible dans la frise"
          >
            <CalendarRange className="size-3 text-[var(--color-bronze)]" />
            {formatDateFrench(visibleYearRange.start)} →{' '}
            {formatDateFrench(visibleYearRange.end)}
          </span>
          <span className="font-semibold text-[var(--color-primary)]">
            {Math.round(centerPercent)}%
          </span>
        </div>
      </div>

      {/* TIMELINE SCROLL CANVAS CONTAINER */}
      <div
        ref={containerRef}
        data-testid="timeline-scroll-container"
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
            className="relative z-[6] overflow-hidden border-b border-[var(--color-stone)] bg-[var(--color-paper-muted)]"
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
                      isCurrent ? 0.2 : 0.1
                    }), rgba(${era.color}, ${isCurrent ? 0.09 : 0.035}))`,
                    borderTop: `2px solid rgba(${era.color}, ${isCurrent ? 0.82 : 0.5})`,
                    borderLeft: `1px solid rgba(${era.color}, 0.28)`,
                    boxShadow: isCurrent
                      ? `inset 0 -2px 0 rgba(${era.color}, 0.58)`
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
                      className={`absolute top-2.5 flex h-10 min-w-0 items-center gap-2 border-l-2 px-2.5 transition-all ${
                        isCurrent
                          ? 'border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-paper)_82%,transparent)] text-[var(--color-ink)]'
                          : 'border-[var(--color-stone)] text-[var(--color-ink-soft)]'
                      }`}
                    >
                      <Landmark className="size-4 shrink-0 text-[var(--color-bronze)]" />
                      <span className="min-w-0 flex-1">
                        <span
                          className="atlas-kicker block text-[9px]"
                        >
                          Ère
                        </span>
                        <span className="block truncate font-serif text-[15px] font-semibold leading-tight">
                          {era.name}
                        </span>
                      </span>
                      {labelMaxWidth >= 330 && !isLowZoomMode && (
                        <span
                          className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--color-ink-muted)]"
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
                    className="absolute top-2.5 z-30 flex h-10 items-center gap-2 border-l-2 border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-paper)_94%,transparent)] px-3 text-[var(--color-ink)] shadow-[var(--shadow-low)] backdrop-blur"
                    title={`${currentEra.name} (${formatDateFrench(currentEra.startYear)} → ${formatDateFrench(currentEra.endYear)})`}
                  >
                    <Landmark className="size-4 shrink-0 text-[var(--color-bronze)]" />
                    <span className="min-w-0 flex-1">
                      <span className="atlas-kicker block text-[9px]">
                        Ère active
                      </span>
                      <span className="block truncate font-serif text-[15px] font-semibold leading-tight">
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
            className="sticky top-0 z-10 flex items-center border-b border-[var(--color-stone-light)] bg-[color-mix(in_srgb,var(--color-paper)_94%,transparent)] backdrop-blur"
            aria-label="Règle chronologique"
          >
            {ticks.map(tick => {
              const x = getXFromYear(tick.position);
              return (
                <div
                  key={tick.position}
                  style={{ left: `${x}px` }}
                  className="absolute inset-y-0 flex flex-col items-center justify-between"
                >
                  <span className="whitespace-nowrap pt-1 text-[11px] font-medium tabular-nums text-[var(--color-ink-muted)]">
                    {tick.label}
                  </span>
                  <div className="h-2 w-px bg-[var(--color-stone)]" />
                </div>
              );
            })}
          </div>

          {/* BIBLICAL BOOK PERIOD RAIL */}
          {visibleBackgroundPeriodItems.length > 0 && (
            <div
              style={{ height: `${backgroundRailHeight}px` }}
              className="relative border-b border-[color-mix(in_srgb,var(--color-bronze)_24%,var(--color-stone-light))] bg-[color-mix(in_srgb,var(--color-bronze-soft)_56%,var(--color-paper))]"
              aria-label="Périodes des livres bibliques"
            >
              <div
                style={{ left: `${Math.max(8, viewportX.startX + 8)}px` }}
                className="absolute top-1 z-20 inline-flex h-6 items-center gap-1.5 border-l-2 border-[var(--color-bronze)] bg-[color-mix(in_srgb,var(--color-paper)_90%,transparent)] px-2 text-[11px] font-semibold text-[var(--color-ink)] backdrop-blur"
              >
                <BookOpen className="size-3.5 text-[var(--color-bronze)]" />
                Livres bibliques
                <span className="font-medium tabular-nums text-[var(--color-ink-muted)]">
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
                    className={`absolute h-6 overflow-hidden border-l-2 text-left transition-all ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-low)]'
                        : 'border-[var(--color-bronze)] bg-[color-mix(in_srgb,var(--color-paper)_84%,transparent)] text-[var(--color-ink)] hover:bg-[var(--color-bronze-soft)]'
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
                      <span className="min-w-0 flex-1 truncate font-serif text-xs font-semibold">
                        {event.text}
                      </span>
                      {labelWidth >= 280 && !isLowZoomMode && (
                        <span className={`shrink-0 text-[10px] font-medium tabular-nums ${isActive ? 'text-white/80' : 'text-[var(--color-ink-muted)]'}`}>
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
                  className="absolute inset-y-0 w-px border-r border-dashed border-[var(--color-stone-light)]"
                />
              );
            })}
            {/* VIEWPORT CENTER GUIDE LINE */}
            {selectedEventMarkerX !== null && (
              <div
                style={{ left: `${selectedEventMarkerX}px` }}
                className="pointer-events-none absolute inset-y-0 z-40 w-px bg-[var(--color-primary)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-paper)_80%,transparent)]"
                aria-hidden="true"
                data-testid="selected-event-marker"
              >
                <span className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rotate-45 bg-[var(--color-primary)]" />
              </div>
            )}
            <div
              style={{ left: `${(viewportX.startX + viewportX.endX) / 2}px` }}
              className="pointer-events-none absolute inset-y-0 z-30 w-px bg-[var(--color-bronze)]/55"
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
                      ? 'linear-gradient(to bottom, rgba(168,111,61,0.11), rgba(168,111,61,0.025))'
                      : isLowZoomMode
                        ? 'linear-gradient(to bottom, rgba(168,111,61,0.012), rgba(168,111,61,0.004))'
                        : 'linear-gradient(to bottom, rgba(168,111,61,0.04), rgba(168,111,61,0.01))',
                    boxShadow: isActive
                      ? 'inset 2px 0 rgba(168,111,61,0.48), inset -2px 0 rgba(168,111,61,0.48)'
                      : isLowZoomMode
                        ? 'none'
                        : 'inset 1px 0 rgba(168,111,61,0.14), inset -1px 0 rgba(168,111,61,0.14)'
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
                const isEventLane = lane.semanticKind === 'point';
                const isPeriodLane = lane.semanticKind === 'period';
                const isCharacterLane = Boolean(lane.biographyLaneId);
                const isManuallyCollapsed = collapsedCategories.has(
                  lane.categoryName
                );
                const effectiveSublanes = isManuallyCollapsed ? 0 : lane.numSublanes;
                const SUBLANE_HEIGHT = isCharacterLane
                  ? 48
                  : isEventLane
                    ? 30
                    : isPeriodLane
                      ? 28
                      : 24;
                const laneHeight = effectiveSublanes * SUBLANE_HEIGHT;
                const viewportCenterX = (viewportX.startX + viewportX.endX) / 2;
                const LaneIcon = isEventLane
                  ? Flag
                  : isPeriodLane
                    ? CalendarRange
                    : lane.biographyLaneId === 'prophets'
                      ? ScrollText
                      : lane.biographyLaneId && lane.biographyLaneId !== 'people'
                        ? Crown
                        : getCategoryIcon(lane.categoryName);

                return (
                  <div
                    key={lane.categoryName}
                    data-biography-lane={lane.biographyLaneId}
                    data-timeline-kind={lane.semanticKind ?? 'biography'}
                    data-timeline-lane={lane.semanticLaneId ?? lane.biographyLaneId}
                    style={{
                      borderColor: `color-mix(in srgb, ${lane.catColor} 28%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${lane.catColor} ${isCharacterLane ? 7 : 5}%, var(--color-paper))`,
                      boxShadow: `inset 3px 0 0 ${lane.catColor}`
                    }}
                    className="relative my-1 border-b py-1 transition-[opacity,background-color] duration-200"
                  >
                    {/* Category Name Sticky Badge with Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleCollapseCategory(lane.categoryName)}
                      style={{ borderColor: lane.catColor }}
                      className="group/badge sticky left-2 z-35 mb-1 inline-flex min-h-8 cursor-pointer items-center gap-2 border-l-2 bg-[var(--color-paper)]/94 px-3 py-1 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-1)] backdrop-blur transition-colors hover:bg-[var(--color-paper-muted)]"
                      title={isManuallyCollapsed ? 'Déplier cette ligne' : 'Replier cette ligne'}
                    >
                      <LaneIcon
                        className="size-3.5 shrink-0"
                        style={{ color: lane.catColor }}
                      />
                      <span className="text-[var(--color-ink)]">
                        {lane.categoryName}
                      </span>
                      {lane.semanticKind && (
                        <span className="text-[10px] font-medium text-[var(--color-ink-muted)]">
                          {isEventLane ? 'ponctuels' : 'périodes'}
                        </span>
                      )}
                      <span className="tabular-nums text-xs text-[var(--color-ink-muted)]">
                        {lane.totalEventsCount} {isCharacterLane ? 'pers.' : 'él.'}
                      </span>
                      {isManuallyCollapsed ? (
                        <ChevronDown className="size-3" style={{ color: lane.catColor }} />
                      ) : (
                        <ChevronUp className="size-3" style={{ color: lane.catColor }} />
                      )}
                    </button>

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
                          const participantCalculation = ev.historicalPersonId
                            ? selectedParticipantCalculations.get(
                                ev.historicalPersonId
                              )
                            : undefined;
                          const isBiographicalRibbon =
                            isCharacterLane && !ev.isPoint;
                          const biographyLabel = ev.historicalPersonId
                            ? people.find(
                                person => person.id === ev.historicalPersonId
                              )?.name ?? ev.text.split(' — ')[0]
                            : ev.text.split(/\s[-—]\s/)[0];
                          const persistentLabelOffset = Math.max(
                            4,
                            Math.min(
                              Math.max(4, width - clusterItem.labelWidth),
                              Math.max(4, viewportX.startX - startX + 14)
                            )
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
                            <button
                              type="button"
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
                              onPointerUp={(e) => {
                                if (
                                  e.pointerType === 'touch' &&
                                  !ev.historicalPersonId
                                ) {
                                  e.stopPropagation();
                                  touchPreviewClickRef.current = ev.id;
                                  if (pinnedPreviewEventId !== ev.id) {
                                    setPinnedPreviewEventId(ev.id);
                                    setHoveredEventId(ev.id);
                                  } else {
                                    setPinnedPreviewEventId(null);
                                    setHoveredEventId(null);
                                    onSelectEvent(ev);
                                  }
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (touchPreviewClickRef.current === ev.id) {
                                  touchPreviewClickRef.current = null;
                                  return;
                                }
                                const isTouchFirst =
                                  !ev.historicalPersonId &&
                                  (
                                    window.matchMedia('(hover: none)').matches ||
                                    navigator.maxTouchPoints > 0
                                  ) &&
                                  pinnedPreviewEventId !== ev.id;
                                if (isTouchFirst) {
                                  setPinnedPreviewEventId(ev.id);
                                  setHoveredEventId(ev.id);
                                  return;
                                }
                                onSelectEvent(ev);
                              }}
                              onMouseEnter={() => setHoveredEventId(ev.id)}
                              onMouseLeave={() => {
                                if (pinnedPreviewEventId !== ev.id) setHoveredEventId(null);
                              }}
                              onFocus={() => setHoveredEventId(ev.id)}
                              onBlur={() => {
                                if (pinnedPreviewEventId !== ev.id) setHoveredEventId(null);
                              }}
                              aria-label={`${ev.text}, ${formatDateFrench(ev.startYear)}${ev.endYear !== ev.startYear ? ` à ${formatDateFrench(ev.endYear)}` : ''}`}
                              className={`group pointer-events-auto absolute cursor-pointer touch-manipulation transition-[opacity,transform] duration-200 ${
                                isSelected || isClosest
                                  ? 'z-40 scale-[1.01]'
                                  : isHovered
                                  ? 'z-30 scale-[1.005]'
                                  : 'z-20'
                              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]`}
                            >
                              {/* POINT EVENT MARKER OR PERIOD BAR */}
                              {ev.isPoint ? (
                                <div className="flex items-center gap-1.5 py-0.5 relative">
                                  <div
                                    className={`size-3.5 shrink-0 rounded-full border-2 transition-[transform,box-shadow] duration-200 ${
                                      isClosest
                                        ? 'scale-125 border-[var(--color-paper)] ring-2 ring-[var(--color-primary)]'
                                        : isSelected
                                        ? 'scale-125 border-[var(--color-paper)] ring-2 ring-[var(--color-primary)]'
                                        : isHovered
                                        ? 'scale-125 border-[var(--color-paper)] ring-2 ring-[var(--color-primary-soft)]'
                                        : 'border-[var(--color-paper)] group-hover:scale-110'
                                    }`}
                                    style={barStyle}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)})`}
                                  />
                                  
                                  {/* Adaptive point label: truncated in overview, expanded on interaction. */}
                                  {(clusterItem.showLabel || isSelected || isClosest || isHovered) && (
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
                                        className={`block min-w-0 truncate text-xs font-semibold text-[var(--color-ink)] [text-shadow:0_1px_0_var(--color-paper)] ${
                                          isClosest || isSelected
                                            ? 'bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[var(--color-primary-dark)]'
                                            : isHovered && isLowZoomMode
                                            ? 'z-50 bg-[var(--color-paper)]/95 px-1.5 py-0.5 text-[var(--color-primary-dark)] shadow-[var(--shadow-1)]'
                                            : ''
                                        }`}
                                      >
                                        {getAuthoritativeDisplayLabel(
                                          ev,
                                          clusterItem.labelWidth,
                                          isSelected || isClosest || isHovered
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {/* FLOATING HOVER TOOLTIP BADGE IN LOW ZOOM MODE */}
                                  {isLowZoomMode && isHovered && !isSelected && !isClosest && (
                                    <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2.5 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-2)]">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="tabular-nums text-xs text-[var(--color-stone)]">
                                        {formatDateFrench(ev.startYear)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative">
                                  {isBiographicalRibbon ? (
                                    <BiographicalRibbon
                                      event={ev}
                                      width={width}
                                      isActive={isSelected || isClosest}
                                      label={biographyLabel}
                                      labelOffset={persistentLabelOffset}
                                      labelWidth={clusterItem.labelWidth}
                                      markerOffset={
                                        participantCalculation && selectedEventMarkerX !== null
                                          ? selectedEventMarkerX - startX
                                          : undefined
                                      }
                                      calculation={participantCalculation}
                                    />
                                  ) : (
                                  <div
                                    style={{
                                      width: `${width}px`,
                                      ...barStyle
                                    }}
                                    className={`relative flex h-5 items-center overflow-hidden rounded-[3px] transition-[opacity,box-shadow] duration-200 ${
                                      isClosest
                                        ? 'opacity-100 ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-paper)]'
                                        : isSelected
                                        ? 'opacity-100 ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-paper)]'
                                        : 'opacity-90 group-hover:opacity-100'
                                    }`}
                                    title={`${ev.text} (${formatDateFrench(ev.startYear)} - ${formatDateFrench(ev.endYear)}) ${ev.fuzzyStart ? '[Début incertain]' : ''} ${ev.fuzzyEnd ? '[Fin incertaine]' : ''}`}
                                  >
                                    {/* WHITE TEXT LABEL ON THE BAR */}
                                    {(clusterItem.showLabel || isSelected || isClosest || isHovered) && (
                                      <div
                                        style={{ transform: `translateX(${labelOffsetX}px)` }}
                                        className="pointer-events-none absolute inset-y-0 left-0 flex min-w-0 items-center gap-1 overflow-hidden px-1.5 text-xs font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] transition-transform duration-75"
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
                                          {getAuthoritativeDisplayLabel(
                                            ev,
                                            clusterItem.labelWidth,
                                            isSelected || isClosest || isHovered
                                          )}
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
                                  )}

                                  {/* FLOATING HOVER TOOLTIP FOR NARROW BARS IN LOW ZOOM MODE */}
                                  {isLowZoomMode && width < 70 && isHovered && !isSelected && !isClosest && (
                                    <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-ink)] px-2.5 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-2)]">
                                      {ev.icon && (
                                        <img
                                          src={`data:image/png;base64,${ev.icon}`}
                                          alt=""
                                          className="w-3.5 h-3.5 object-contain rounded bg-white p-0.5 shrink-0"
                                        />
                                      )}
                                      <span className="font-bold">{ev.text}</span>
                                      <span className="tabular-nums text-xs text-[var(--color-stone)]">
                                        {formatDateFrench(ev.startYear)} → {formatDateFrench(ev.endYear)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

        </div>
        {previewEvent && (
          <EventContextPreview
            event={previewEvent}
            people={people}
            places={places}
            onOpenDetails={() => {
              setPinnedPreviewEventId(null);
              onSelectEvent(previewEvent);
            }}
            onClose={() => {
              setPinnedPreviewEventId(null);
              setHoveredEventId(null);
            }}
          />
        )}
      </div>

      {/* Légende contextuelle du viewport */}
      <div className="z-30 shrink-0 border-t border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] px-4 py-2 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <span className="mr-1 flex shrink-0 items-center gap-1.5 font-semibold text-[var(--color-ink-soft)]">
            <Layers className="size-3.5 text-[var(--color-primary)]" />
            Dans la période :
          </span>

          {visibleBiographyLanes.length === 0 &&
            visibleSemanticLanes.length === 0 && (
              <span className="shrink-0 italic text-[var(--color-ink-muted)]">
                Aucun élément dans cette période
              </span>
            )}

          {visibleBiographyLanes.map(lane => {
            const LaneIcon =
              lane.id === 'prophets'
                ? ScrollText
                : lane.id === 'people'
                  ? UserRound
                  : Crown;
            return (
              <span
                key={lane.id}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 border-b px-1.5 py-1 font-medium text-[var(--color-ink)]"
                style={{ borderColor: lane.color }}
                title={`${lane.description} ${lane.count} personne${lane.count > 1 ? 's' : ''} visible${lane.count > 1 ? 's' : ''}.`}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-[2px]"
                  style={{ backgroundColor: lane.softColor }}
                >
                  <LaneIcon className="size-3" style={{ color: lane.color }} />
                </span>
                <span>{lane.shortLabel}</span>
                <span className="tabular-nums text-[var(--color-ink-muted)]">
                  {lane.count}
                </span>
              </span>
            );
          })}

          {visibleSemanticLanes.map(lane => {
            const LaneIcon = lane.kind === 'point' ? Flag : CalendarRange;
            return (
              <span
                key={lane.id}
                className="inline-flex min-h-8 shrink-0 items-center gap-1.5 border-b px-1.5 py-1 font-medium text-[var(--color-ink)]"
                style={{ borderColor: lane.color }}
                title={`${lane.description} ${lane.count} élément${lane.count > 1 ? 's' : ''} visible${lane.count > 1 ? 's' : ''}.`}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-[2px]"
                  style={{ backgroundColor: lane.softColor }}
                >
                  <LaneIcon className="size-3" style={{ color: lane.color }} />
                </span>
                <span>{lane.shortLabel}</span>
                <span className="text-[10px] text-[var(--color-ink-muted)]">
                  {lane.kind === 'point' ? 'point' : 'période'}
                </span>
                <span className="tabular-nums text-[var(--color-ink-muted)]">
                  {lane.count}
                </span>
              </span>
            );
          })}
        </div>

        {visibleBiographyLanes.length > 0 && (
          <div className="mt-1.5 flex items-center gap-3 overflow-x-auto border-t border-[var(--color-stone-light)] pt-1.5 text-[11px] text-[var(--color-ink-muted)]">
            <span className="shrink-0 font-semibold text-[var(--color-ink-soft)]">
              Lecture d’un ruban :
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="h-2 w-5 rounded-[2px] border border-[var(--color-stone)] bg-[var(--color-stone-light)]" />
              Vie connue
            </span>
            {visibleActivityTypes.map(({ type }) => {
              const visual = ACTIVITY_VISUALS[type];
              const background =
                visual.pattern === 'solid'
                  ? visual.color
                  : visual.pattern === 'dashed'
                    ? `repeating-linear-gradient(90deg, ${visual.color} 0 6px, transparent 6px 9px)`
                    : `repeating-linear-gradient(90deg, ${visual.color} 0 2px, transparent 2px 5px)`;
              return (
                <span
                  key={type}
                  className="inline-flex shrink-0 items-center gap-1.5"
                >
                  <span
                    className="h-2 w-5 rounded-[2px] border"
                    style={{ borderColor: visual.color, background }}
                  />
                  {visual.label}
                </span>
              );
            })}
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="h-2 w-5 border border-dashed border-[var(--color-ink-muted)] bg-gradient-to-r from-transparent via-[var(--color-stone)] to-transparent" />
              Datation incertaine
            </span>
            {autoFilterViewport && (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--color-primary)]">
                <Sparkles className="size-3" />
                Légende adaptée au viewport
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

