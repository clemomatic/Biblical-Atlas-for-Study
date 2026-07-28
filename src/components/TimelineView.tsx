import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  Layers3,
  MapPin,
  Minus,
  Plus
} from 'lucide-react';
import type {
  BiblicalPlace,
  CategoryData,
  EraData,
  EventData,
  TimelinePeriod
} from '../types';
import type { BiblicalPerson } from '../domain/history/types';
import {
  ATLAS_CHRONOLOGY_RECORDS,
  ATLAS_LANES,
  ATLAS_RECORD_BY_ID,
  ATLAS_RENDER_BY_ID,
  ATLAS_VISUAL_GROUPS
} from '../data/atlasChronology';
import type {
  AtlasChronologyRecord,
  AtlasVisualGroup
} from '../data/atlasChronology';

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

interface RenderItem {
  id: string;
  event: EventData | null;
  record: AtlasChronologyRecord;
  group?: AtlasVisualGroup;
}

interface DisplayRow {
  id: string;
  label: string;
  lane: string;
  laneOrder: number;
  items: RenderItem[];
}

const LABEL_GUTTER = 176;
const INTRO_WIDTH = 280;
const BIBLICAL_START = -4025;
const BIBLICAL_END = 100;
const COMPRESSED_START = 100;
const COMPRESSED_END = 1870;
const MODERN_START = 1870;
const MODERN_END = 2026;
const AXIS_HEADER_HEIGHT = 126;
const ROW_HEIGHT = 48;
const GROUP_HEADER_HEIGHT = 28;
const MARKER_CLUSTER_DISTANCE = 24;
const FUTURE_CARD_WIDTH = 190;
const FUTURE_GAP = 12;

const BIBLICAL_WIDTHS = [1760, 2500, 3900, 6800, 11800];
const COMPRESSED_WIDTHS = [170, 190, 230, 290, 380];
const MODERN_WIDTHS = [560, 720, 980, 1500, 2600];

const LAYER_COLORS: Record<string, string> = {
  Personnages: '#2563eb',
  Règnes: '#e11d48',
  Prophètes: '#7c3aed',
  Juges: '#b45309',
  'Ministère chrétien': '#7c3aed',
  Événements: '#a855f7',
  Voyages: '#059669',
  Sanctuaire: '#0f766e',
  'Livres bibliques': '#4f46e5',
  'Puissances mondiales': '#64748b',
  Alliances: '#9a3412',
  'Repères scientifiques': '#334155'
};

const SOFT_LAYER_COLORS: Record<string, string> = {
  Personnages: '#dbeafe',
  Règnes: '#ffe4e6',
  Prophètes: '#ede9fe',
  Juges: '#fef3c7',
  'Ministère chrétien': '#ede9fe',
  Événements: '#f3e8ff',
  Voyages: '#d1fae5',
  Sanctuaire: '#ccfbf1',
  'Livres bibliques': '#e0e7ff',
  'Puissances mondiales': '#e2e8f0',
  Alliances: '#ffedd5',
  'Repères scientifiques': '#e2e8f0'
};

const EXPANDED_ITEM_LANES = new Set([
  'Personnages principaux',
  'Personnages secondaires',
  'Prophètes',
  'Voyages et déplacements',
  'Sanctuaire et Arche',
  'Juges'
]);

const laneBiographyId = (lane: string): string | undefined => {
  if (lane === 'Royaume uni et transition') return 'united-monarchy';
  if (lane === 'Royaume de Juda') return 'judah-kings';
  if (lane === 'Royaume d’Israël') return 'israel-kings';
  if (lane === 'Prophètes') return 'prophets';
  if (lane.startsWith('Personnages')) return 'people';
  return undefined;
};

const colorFor = (record: AtlasChronologyRecord): string =>
  LAYER_COLORS[record.layer] ?? '#475569';

const softColorFor = (record: AtlasChronologyRecord): string =>
  SOFT_LAYER_COLORS[record.layer] ?? '#f1f5f9';

const isBackground = (record: AtlasChronologyRecord): boolean =>
  record.renderMode === 'Bande d’arrière-plan';

const isOverlay = (record: AtlasChronologyRecord): boolean =>
  record.renderMode === 'Segment superposé sur vie';

const isMarker = (record: AtlasChronologyRecord): boolean =>
  record.renderMode === 'Marqueur regroupable';

const isHiddenMainAxisMode = (record: AtlasChronologyRecord): boolean =>
  record.renderMode === 'Sous-événement de fiche' ||
  record.renderMode === 'Surbrillance à la demande' ||
  record.renderMode === 'Zone d’axe comprimée';

const mostCommon = <T,>(values: T[]): T | undefined => {
  const counts = new Map<T, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

const formatPositionYear = (position: number): string => {
  if (position < 0) return `${Math.abs(Math.floor(position)) + 1} av. n. è.`;
  return `${Math.floor(position)} de n. è.`;
};

const compactYear = (position: number): string => {
  if (position < 0) return `${Math.abs(Math.floor(position)) + 1} av.`;
  return `${Math.floor(position)}`;
};

const makeVirtualGroup = (
  group: AtlasVisualGroup,
  memberRecords: AtlasChronologyRecord[]
): AtlasChronologyRecord | null => {
  if (!memberRecords.length) return null;
  const dated = memberRecords.filter(
    record =>
      record.segment !== 'FUTUR_RELATIF' &&
      record.segment !== 'INTRO_HORS_ECHELLE'
  );
  const source = dated.length ? dated : memberRecords;
  const start = Math.min(...source.map(record => record.start));
  const end = Math.max(...source.map(record => record.end));
  const lane =
    mostCommon(source.map(record => record.lane)) ?? 'Événements';
  const laneOrder =
    ATLAS_LANES.find(candidate => candidate.name === lane)?.order ??
    Math.min(...source.map(record => record.laneOrder));
  const segment =
    mostCommon(source.map(record => record.segment)) ?? 'BIBLIQUE_PRINCIPAL';
  const layer =
    mostCommon(source.map(record => record.layer)) ?? 'Événements';

  return {
    id: `virtual-group-${group.id}`,
    status: 'Documenté',
    title: group.label,
    displayDateLabel:
      start === end
        ? formatPositionYear(start)
        : `${formatPositionYear(start)} – ${formatPositionYear(end)}`,
    start,
    end,
    certainty: 'probable',
    categoryName: 'Événements marquants',
    layer,
    defaultVisible: false,
    visualEra: mostCommon(source.map(record => record.visualEra).filter(Boolean) as string[]),
    segment,
    zoomMin: group.summaryZoom,
    zoomMax: Math.max(group.summaryZoom, group.expandedZoom - 1),
    renderMode: 'Groupe extensible',
    visualGroup: group.id,
    memberIds: group.memberIds,
    shortLabel: group.label,
    labelPriority: 1,
    lane,
    laneOrder,
    clusterKey: `GROUP:${group.id}`,
    clickBehavior: 'Développer le groupe',
    collisionPolicy: 'Masquer le label si largeur insuffisante',
    minLabelWidth: 82,
    notes: group.reason
  };
};

const clusterMarkers = (
  items: RenderItem[],
  xForRecord: (record: AtlasChronologyRecord) => number
): RenderItem[][] => {
  const sorted = [...items].sort(
    (left, right) => xForRecord(left.record) - xForRecord(right.record)
  );
  const clusters: RenderItem[][] = [];
  sorted.forEach(item => {
    const x = xForRecord(item.record);
    const current = clusters[clusters.length - 1];
    if (!current) {
      clusters.push([item]);
      return;
    }
    const lastX = xForRecord(current[current.length - 1].record);
    if (x - lastX < MARKER_CLUSTER_DISTANCE) current.push(item);
    else clusters.push([item]);
  });
  return clusters;
};

export const TimelineView: React.FC<TimelineViewProps> = ({
  eras: _eras,
  categories: _categories,
  events,
  people: _people,
  places: _places,
  selectedEventId,
  isActive,
  onSelectEvent,
  onVisiblePeriodChange,
  onOpenAtThisMoment,
  searchQuery
}) => {
  const [zoom, setZoom] = useState(0);
  const [showBooks, setShowBooks] = useState(false);
  const [showBackgrounds, setShowBackgrounds] = useState(true);
  const [isDisplayOpen, setIsDisplayOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const pendingCenterRef = useRef<number | null>(null);

  const eventById = useMemo(
    () => new Map(events.map(event => [event.id, event] as const)),
    [events]
  );

  const biblicalWidth = BIBLICAL_WIDTHS[zoom];
  const compressedWidth = COMPRESSED_WIDTHS[zoom];
  const modernWidth = MODERN_WIDTHS[zoom];
  const futureRecords = useMemo(
    () =>
      ATLAS_CHRONOLOGY_RECORDS.filter(
        record =>
          record.segment === 'FUTUR_RELATIF' &&
          record.zoomMin <= zoom &&
          record.zoomMax >= zoom
      ).sort((left, right) => left.laneOrder - right.laneOrder),
    [zoom]
  );
  const futureWidth = Math.max(
    790,
    futureRecords.length * FUTURE_CARD_WIDTH +
      Math.max(0, futureRecords.length - 1) * FUTURE_GAP +
      24
  );

  const biblicalX = LABEL_GUTTER + INTRO_WIDTH;
  const compressedX = biblicalX + biblicalWidth;
  const modernX = compressedX + compressedWidth;
  const futureX = modernX + modernWidth;
  const totalWidth = futureX + futureWidth;

  const xFromYear = useCallback(
    (year: number, segment: AtlasChronologyRecord['segment']): number => {
      if (segment === 'INTRO_HORS_ECHELLE') return LABEL_GUTTER + 20;
      if (segment === 'FUTUR_RELATIF') return futureX + 16;
      if (segment === 'INTERVALLE_COMPRIME') {
        const ratio = Math.max(
          0,
          Math.min(1, (year - COMPRESSED_START) / (COMPRESSED_END - COMPRESSED_START))
        );
        return compressedX + ratio * compressedWidth;
      }
      if (segment === 'TEMPS_DE_LA_FIN') {
        const ratio = Math.max(
          0,
          Math.min(1, (year - MODERN_START) / (MODERN_END - MODERN_START))
        );
        return modernX + ratio * modernWidth;
      }
      const ratio = Math.max(
        0,
        Math.min(1, (year - BIBLICAL_START) / (BIBLICAL_END - BIBLICAL_START))
      );
      return biblicalX + ratio * biblicalWidth;
    },
    [
      biblicalWidth,
      compressedWidth,
      compressedX,
      futureX,
      modernWidth,
      modernX,
      biblicalX
    ]
  );

  const xForRecord = useCallback(
    (record: AtlasChronologyRecord): number =>
      xFromYear(record.start, record.segment),
    [xFromYear]
  );

  const xForRecordEnd = useCallback(
    (record: AtlasChronologyRecord): number =>
      xFromYear(record.end, record.segment),
    [xFromYear]
  );

  const yearFromX = useCallback(
    (x: number): number => {
      if (x <= biblicalX) return BIBLICAL_START;
      if (x < compressedX) {
        return (
          BIBLICAL_START +
          ((x - biblicalX) / biblicalWidth) * (BIBLICAL_END - BIBLICAL_START)
        );
      }
      if (x < modernX) {
        return (
          COMPRESSED_START +
          ((x - compressedX) / compressedWidth) *
            (COMPRESSED_END - COMPRESSED_START)
        );
      }
      if (x < futureX) {
        return (
          MODERN_START +
          ((x - modernX) / modernWidth) * (MODERN_END - MODERN_START)
        );
      }
      return MODERN_END;
    },
    [
      biblicalWidth,
      biblicalX,
      compressedWidth,
      compressedX,
      futureX,
      modernWidth,
      modernX
    ]
  );

  const preserveCenterAndSetZoom = useCallback(
    (nextZoom: number) => {
      const next = Math.max(0, Math.min(4, nextZoom));
      if (next === zoom) return;
      const scroller = scrollerRef.current;
      if (scroller) {
        pendingCenterRef.current = yearFromX(
          scroller.scrollLeft + scroller.clientWidth / 2
        );
      }
      setZoom(next);
    },
    [yearFromX, zoom]
  );

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('fr');
    const eligible = ATLAS_CHRONOLOGY_RECORDS.filter(record => {
      if (record.zoomMin > zoom || record.zoomMax < zoom) return false;
      if (record.segment === 'FUTUR_RELATIF') return false;
      if (isHiddenMainAxisMode(record)) {
        return (
          record.renderMode === 'Surbrillance à la demande' &&
          record.id === selectedEventId
        );
      }
      if (record.renderMode === 'Ruban repliable' && !showBooks) return false;
      if (
        record.layer === 'Livres bibliques' &&
        !showBooks &&
        record.renderMode !== 'Surbrillance à la demande'
      ) {
        return false;
      }
      if (!query) return true;
      return [
        record.title,
        record.shortLabel,
        record.subject,
        record.visualEra,
        record.lane
      ].some(value => value?.toLocaleLowerCase('fr').includes(query));
    });

    const hiddenIds = new Set<string>();
    const virtualItems: RenderItem[] = [];

    const compoundSummaryModes = new Set([
      'Arrière-plan',
      'Bandes et événements',
      'Carte fixe',
      'Séquence ordinale',
      'Voie politique contiguë'
    ]);

    ATLAS_VISUAL_GROUPS.forEach(group => {
      if (zoom < group.summaryZoom || zoom >= group.expandedZoom) return;
      if (group.id.startsWith('LIVRES_') && !showBooks) return;
      if (compoundSummaryModes.has(group.summaryMode)) return;

      const memberRecords = group.memberIds
        .map(id => ATLAS_RECORD_BY_ID.get(id))
        .filter((record): record is AtlasChronologyRecord => Boolean(record));

      if (group.existingSummaryId) {
        memberRecords
          .filter(record => record.id !== group.existingSummaryId)
          .forEach(record => hiddenIds.add(record.id));
        return;
      }

      memberRecords.forEach(record => hiddenIds.add(record.id));
      const virtual = makeVirtualGroup(group, memberRecords);
      if (virtual) {
        virtualItems.push({
          id: virtual.id,
          event: null,
          record: virtual,
          group
        });
      }
    });

    const actualItems = eligible
      .filter(record => !hiddenIds.has(record.id))
      .map(record => ({
        id: record.id,
        event: eventById.get(record.id) ?? null,
        record
      }));

    return [...actualItems, ...virtualItems];
  }, [
    eventById,
    searchQuery,
    selectedEventId,
    showBooks,
    zoom
  ]);

  const backgroundItems = useMemo(
    () =>
      visibleItems.filter(
        item =>
          isBackground(item.record) &&
          item.record.segment !== 'INTRO_HORS_ECHELLE'
      ),
    [visibleItems]
  );

  const overlayByParent = useMemo(() => {
    const result = new Map<string, RenderItem[]>();
    visibleItems
      .filter(item => isOverlay(item.record) && item.record.parentVisualId)
      .forEach(item => {
        const parentId = item.record.parentVisualId as string;
        const list = result.get(parentId) ?? [];
        list.push(item);
        result.set(parentId, list);
      });
    return result;
  }, [visibleItems]);

  const rows = useMemo<DisplayRow[]>(() => {
    const laneOrder = new Map(
      ATLAS_LANES.map(lane => [lane.name, lane.order] as const)
    );
    const laneItems = new Map<string, RenderItem[]>();

    visibleItems
      .filter(item => {
        const record = item.record;
        return (
          record.segment !== 'INTRO_HORS_ECHELLE' &&
          record.segment !== 'FUTUR_RELATIF' &&
          !isBackground(record) &&
          !isOverlay(record)
        );
      })
      .forEach(item => {
        const list = laneItems.get(item.record.lane) ?? [];
        list.push(item);
        laneItems.set(item.record.lane, list);
      });

    const displayRows: DisplayRow[] = [];
    [...laneItems.entries()]
      .sort(
        ([left], [right]) =>
          (laneOrder.get(left) ?? 9999) - (laneOrder.get(right) ?? 9999)
      )
      .forEach(([lane, items]) => {
        const order = laneOrder.get(lane) ?? items[0]?.record.laneOrder ?? 9999;
        if (EXPANDED_ITEM_LANES.has(lane)) {
          items
            .sort((left, right) => {
              const yearDifference = left.record.start - right.record.start;
              if (yearDifference) return yearDifference;
              return left.record.shortLabel.localeCompare(
                right.record.shortLabel,
                'fr'
              );
            })
            .forEach(item => {
              displayRows.push({
                id: `${lane}:${item.id}`,
                label: item.record.shortLabel,
                lane,
                laneOrder: order,
                items: [item]
              });
            });
          return;
        }

        displayRows.push({
          id: lane,
          label: lane,
          lane,
          laneOrder: order,
          items: items.sort(
            (left, right) => left.record.start - right.record.start
          )
        });
      });
    return displayRows;
  }, [visibleItems]);

  const contentHeight =
    AXIS_HEADER_HEIGHT + rows.length * ROW_HEIGHT + GROUP_HEADER_HEIGHT;

  const updateVisiblePeriod = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    onVisiblePeriodChange({
      startYear: yearFromX(scroller.scrollLeft),
      endYear: yearFromX(scroller.scrollLeft + scroller.clientWidth)
    });
  }, [onVisiblePeriodChange, yearFromX]);

  useEffect(() => {
    if (!isActive) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const handleScroll = () => window.requestAnimationFrame(updateVisiblePeriod);
    handleScroll();
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isActive, updateVisiblePeriod]);

  useEffect(() => {
    if (!isActive || initializedRef.current || !scrollerRef.current) return;
    const scroller = scrollerRef.current;
    const initialX = xFromYear(-1000, 'BIBLIQUE_PRINCIPAL');
    scroller.scrollLeft = Math.max(0, initialX - scroller.clientWidth / 2);
    initializedRef.current = true;
    updateVisiblePeriod();
  }, [isActive, updateVisiblePeriod, xFromYear]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const centerYear = pendingCenterRef.current;
    if (!scroller || centerYear === null) return;
    const segment =
      centerYear >= MODERN_START
        ? 'TEMPS_DE_LA_FIN'
        : centerYear >= COMPRESSED_START
          ? 'INTERVALLE_COMPRIME'
          : 'BIBLIQUE_PRINCIPAL';
    const frame = window.requestAnimationFrame(() => {
      scroller.scrollLeft = Math.max(
        0,
        xFromYear(centerYear, segment) - scroller.clientWidth / 2
      );
      pendingCenterRef.current = null;
      updateVisiblePeriod();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [zoom, updateVisiblePeriod, xFromYear]);

  useEffect(() => {
    if (!selectedEventId || !isActive) return;
    const record = ATLAS_RENDER_BY_ID.get(selectedEventId);
    const scroller = scrollerRef.current;
    if (!record || !scroller) return;
    const frame = window.requestAnimationFrame(() => {
      const x = xForRecord(record);
      if (x < scroller.scrollLeft + LABEL_GUTTER) {
        scroller.scrollTo({ left: Math.max(0, x - LABEL_GUTTER - 40), behavior: 'smooth' });
      } else if (x > scroller.scrollLeft + scroller.clientWidth - 80) {
        scroller.scrollTo({
          left: Math.max(0, x - scroller.clientWidth / 2),
          behavior: 'smooth'
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isActive, selectedEventId, xForRecord]);

  const selectedRecord = selectedEventId
    ? ATLAS_RENDER_BY_ID.get(selectedEventId)
    : undefined;
  const selectedMarkerX =
    selectedRecord &&
    selectedRecord.segment !== 'INTRO_HORS_ECHELLE' &&
    selectedRecord.segment !== 'FUTUR_RELATIF'
      ? xForRecord(selectedRecord)
      : null;

  const activeReferenceCount = useMemo(
    () =>
      ATLAS_CHRONOLOGY_RECORDS.filter(
        record => record.zoomMin <= zoom && record.zoomMax >= zoom
      ).length,
    [zoom]
  );

  const biblicalTickInterval = [500, 250, 100, 50, 10][zoom];
  const modernTickInterval = [50, 25, 10, 5, 1][zoom];
  const biblicalTicks: number[] = [];
  for (
    let year = Math.ceil(BIBLICAL_START / biblicalTickInterval) *
      biblicalTickInterval;
    year <= BIBLICAL_END;
    year += biblicalTickInterval
  ) {
    biblicalTicks.push(year);
  }
  const modernTicks: number[] = [];
  for (
    let year = MODERN_START;
    year <= MODERN_END;
    year += modernTickInterval
  ) {
    modernTicks.push(year);
  }

  const introRecords = ATLAS_CHRONOLOGY_RECORDS.filter(
    record =>
      record.segment === 'INTRO_HORS_ECHELLE' &&
      record.zoomMin <= zoom &&
      record.zoomMax >= zoom &&
      record.renderMode !== 'Surbrillance à la demande'
  );
  const introLead =
    introRecords.find(record => record.renderMode.includes('Carte introductive')) ??
    introRecords[0];

  const renderBar = (item: RenderItem, rowTop: number) => {
    const { record, event, group } = item;
    const left = xForRecord(record);
    const width = Math.max(8, xForRecordEnd(record) - left);
    const labelVisible =
      width >= record.minLabelWidth &&
      (zoom >= 1 || (record.labelPriority ?? 3) === 1);
    const overlays = overlayByParent.get(record.id) ?? [];
    const isLife = record.renderMode === 'Barre de vie';
    const biographyLane = laneBiographyId(record.lane);
    const borderStyle =
      record.certainty === 'possible' || record.certainty === 'unknown'
        ? 'dashed'
        : 'solid';

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (group) {
            preserveCenterAndSetZoom(group.expandedZoom);
            return;
          }
          if (event) onSelectEvent(event);
        }}
        aria-label={`${record.title} · ${record.displayDateLabel}`}
        title={`${record.title}\n${record.displayDateLabel}${record.confidenceLabel ? `\nConfiance : ${record.confidenceLabel}` : ''}`}
        data-testid={isLife ? 'biographical-ribbon' : undefined}
        data-biography-lane={biographyLane}
        className={`absolute z-20 overflow-visible rounded-[5px] border text-left shadow-sm transition hover:z-40 hover:-translate-y-0.5 hover:shadow-md focus-visible:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
          selectedEventId === record.id
            ? 'ring-2 ring-[var(--color-primary)] ring-offset-1'
            : ''
        }`}
        style={{
          left,
          top: rowTop + 12,
          width,
          height: 25,
          borderColor: colorFor(record),
          borderStyle,
          backgroundColor: softColorFor(record)
        }}
      >
        {overlays.map(overlay => {
          const overlayLeft = Math.max(
            0,
            xForRecord(overlay.record) - left
          );
          const overlayWidth = Math.max(
            3,
            Math.min(
              width - overlayLeft,
              xForRecordEnd(overlay.record) - xForRecord(overlay.record)
            )
          );
          return (
            <span
              key={overlay.id}
              title={`${overlay.record.title} · ${overlay.record.displayDateLabel}`}
              className="absolute bottom-0 top-0 opacity-90"
              style={{
                left: overlayLeft,
                width: overlayWidth,
                backgroundColor: colorFor(overlay.record)
              }}
            />
          );
        })}
        {labelVisible && (
          <span
            data-testid={isLife ? 'biographical-label' : undefined}
            className="relative z-10 block truncate px-2 text-[11px] font-bold leading-[23px] text-[var(--color-ink)]"
          >
            {record.shortLabel}
          </span>
        )}
        {record.routeId && (
          <MapPin className="absolute right-1 top-1 size-3 text-[var(--color-olive)]" />
        )}
        {group && (
          <ChevronRight className="absolute right-1 top-1 size-3.5 text-[var(--color-ink-muted)]" />
        )}
      </button>
    );
  };

  const renderMarkers = (items: RenderItem[], rowTop: number) =>
    clusterMarkers(items, xForRecord).map(cluster => {
      const first = cluster[0];
      const x =
        cluster.reduce((sum, item) => sum + xForRecord(item.record), 0) /
        cluster.length;
      const isCluster = cluster.length > 1;
      const important =
        Math.min(...cluster.map(item => item.record.labelPriority ?? 3)) === 1;
      const showLabel = zoom >= 1 || important;
      const label = isCluster
        ? `${cluster.length} événements`
        : first.record.shortLabel;
      const title = cluster
        .map(item => `${item.record.title} — ${item.record.displayDateLabel}`)
        .join('\n');

      return (
        <button
          key={cluster.map(item => item.id).join('|')}
          type="button"
          onClick={() => {
            if (isCluster && zoom < 4) {
              preserveCenterAndSetZoom(zoom + 1);
              return;
            }
            if (first.event) onSelectEvent(first.event);
          }}
          aria-label={title}
          title={title}
          className={`absolute z-30 flex items-center justify-center border-2 bg-[var(--color-paper)] text-[10px] font-black shadow-sm transition hover:z-50 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
            isCluster ? 'rounded-full' : 'rotate-45 rounded-[3px]'
          }`}
          style={{
            left: x - (isCluster ? 15 : 7),
            top: rowTop + (isCluster ? 9 : 17),
            width: isCluster ? 30 : 14,
            height: isCluster ? 30 : 14,
            borderColor: colorFor(first.record),
            color: colorFor(first.record)
          }}
        >
          {isCluster && cluster.length}
          {showLabel && (
            <span
              className={`pointer-events-none absolute left-full ml-2 w-max max-w-44 truncate bg-[var(--color-paper)]/90 px-1.5 py-0.5 text-left text-[10px] font-bold text-[var(--color-ink)] shadow-sm ${
                isCluster ? '' : '-rotate-45'
              }`}
            >
              {label}
            </span>
          )}
        </button>
      );
    });

  return (
    <div
      data-testid="timeline-view"
      className="relative flex h-full min-h-0 flex-col bg-[var(--color-paper)]"
    >
      <div className="z-50 flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--color-stone-light)] bg-[var(--color-paper)] px-3 py-2 shadow-sm">
        <div className="flex items-center gap-1 border border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] p-1">
          <button
            type="button"
            aria-label="Réduire le niveau de détail"
            onClick={() => preserveCenterAndSetZoom(zoom - 1)}
            disabled={zoom === 0}
            className="atlas-icon-button size-8 disabled:opacity-35"
          >
            <Minus className="size-4" />
          </button>
          <input
            aria-label="Niveau de détail de la frise"
            type="range"
            min={0}
            max={4}
            step={1}
            value={zoom}
            onChange={event =>
              preserveCenterAndSetZoom(Number(event.currentTarget.value))
            }
            className="w-28 accent-[var(--color-primary)]"
          />
          <button
            type="button"
            aria-label="Augmenter le niveau de détail"
            onClick={() => preserveCenterAndSetZoom(zoom + 1)}
            disabled={zoom === 4}
            className="atlas-icon-button size-8 disabled:opacity-35"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <span className="min-w-28 text-xs font-bold text-[var(--color-ink)]">
          Niveau {zoom} ·{' '}
          {['Vue globale', 'Grandes périodes', 'Étude', 'Détails', 'Documentation'][zoom]}
        </span>
        <span className="text-xs text-[var(--color-ink-muted)]">
          {activeReferenceCount} éléments du référentiel actifs
        </span>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setIsDisplayOpen(previous => !previous)}
            aria-expanded={isDisplayOpen}
            className="atlas-button-secondary flex items-center gap-2 px-3 py-2 text-xs"
          >
            <Layers3 className="size-4" />
            Affichage
          </button>
          {isDisplayOpen && (
            <div className="absolute right-0 top-full z-[80] mt-2 w-72 border border-[var(--color-stone-light)] bg-[var(--color-paper)] p-4 shadow-[var(--shadow-3)]">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={showBackgrounds}
                  onChange={event => setShowBackgrounds(event.currentTarget.checked)}
                />
                Puissances en arrière-plan
              </label>
              <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={showBooks}
                  onChange={event => setShowBooks(event.currentTarget.checked)}
                />
                <BookOpen className="size-4" />
                Livres bibliques
              </label>
              <div
                role="region"
                aria-label="Légende des rubans biographiques"
                className="mt-4 border-t border-[var(--color-stone-light)] pt-3 text-xs leading-6 text-[var(--color-ink-muted)]"
              >
                <p><strong>Vie</strong> : barre principale.</p>
                <p><strong>Règne</strong> : rouge, superposé lorsque possible.</p>
                <p><strong>Prophétie / Ministère</strong> : violet.</p>
                <p><strong>Voyage</strong> : vert et lié à la carte.</p>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenAtThisMoment}
          className="atlas-button-secondary flex items-center gap-2 px-3 py-2 text-xs"
        >
          <CalendarRange className="size-4" />
          À cette date
        </button>
      </div>

      <div
        ref={scrollerRef}
        data-testid="timeline-scroll-container"
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div
          className="relative bg-[var(--color-paper)]"
          style={{ width: totalWidth, height: contentHeight }}
        >
          {showBackgrounds &&
            backgroundItems.map(item => {
              const left = xForRecord(item.record);
              const width = Math.max(12, xForRecordEnd(item.record) - left);
              return (
                <div
                  key={item.id}
                  className="pointer-events-none absolute z-0 border-x border-dashed"
                  style={{
                    left,
                    top: AXIS_HEADER_HEIGHT,
                    width,
                    height: Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT),
                    borderColor: colorFor(item.record),
                    backgroundColor: softColorFor(item.record),
                    opacity: 0.42
                  }}
                >
                  <span className="sticky left-[184px] top-[132px] block w-max px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {item.record.shortLabel}
                  </span>
                </div>
              );
            })}

          <div
            className="sticky left-0 top-0 z-40 border-b border-r border-[var(--color-stone-light)] bg-[var(--color-paper)] px-3 py-3"
            style={{ width: LABEL_GUTTER, height: AXIS_HEADER_HEIGHT }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--color-primary)]">
              Chronologie adaptative
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--color-ink-muted)]">
              Les formes restent visibles avant leurs labels. Les dates incertaines
              utilisent un contour pointillé.
            </p>
          </div>

          {introLead && (
            <article
              className="absolute z-20 overflow-hidden rounded-lg border border-slate-300 bg-gradient-to-br from-slate-900 to-slate-700 p-3 text-left text-white shadow-md"
              style={{
                left: LABEL_GUTTER + 12,
                top: 10,
                width: INTRO_WIDTH - 24,
                height: 88
              }}
              aria-label={`${introLead.title} · ${introLead.displayDateLabel}`}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                Introduction hors échelle
              </span>
              <strong className="mt-1 block text-sm">{introLead.shortLabel}</strong>
              <span className="mt-1 block text-[11px] leading-4 text-slate-200">
                Une carte fixe évite d’étirer l’axe jusqu’aux milliards d’années.
              </span>
            </article>
          )}

          <div
            className="absolute top-0 z-10 border-l border-[var(--color-stone-light)]"
            style={{ left: biblicalX, width: biblicalWidth, height: AXIS_HEADER_HEIGHT }}
          >
            <span className="absolute left-3 top-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-ink-muted)]">
              Chronologie biblique principale
            </span>
            {biblicalTicks.map(year => (
              <div
                key={year}
                className="absolute bottom-0 h-9 border-l border-[var(--color-stone-light)]"
                style={{ left: xFromYear(year, 'BIBLIQUE_PRINCIPAL') - biblicalX }}
              >
                <span className="absolute bottom-1 left-1 whitespace-nowrap text-[9px] font-semibold text-[var(--color-ink-muted)]">
                  {compactYear(year)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => preserveCenterAndSetZoom(Math.max(zoom, 2))}
            className="absolute top-0 z-20 flex flex-col items-center justify-center border-x border-dashed border-[var(--color-bronze)] bg-[var(--color-bronze-soft)]/70 text-center"
            style={{
              left: compressedX,
              width: compressedWidth,
              height: AXIS_HEADER_HEIGHT
            }}
            title="100-1870 : intervalle volontairement comprimé"
          >
            <span className="text-xl tracking-[0.3em] text-[var(--color-bronze)]">•••</span>
            <strong className="mt-1 text-[10px] uppercase tracking-wider">
              100–1870
            </strong>
            <span className="mt-1 px-2 text-[9px] leading-3 text-[var(--color-ink-muted)]">
              axe comprimé
            </span>
          </button>

          <div
            className="absolute top-0 z-10 border-l border-[var(--color-stone-light)]"
            style={{ left: modernX, width: modernWidth, height: AXIS_HEADER_HEIGHT }}
          >
            <span className="absolute left-3 top-3 text-[10px] font-black uppercase tracking-wider text-[var(--color-ink-muted)]">
              Temps de la fin
            </span>
            {modernTicks.map(year => (
              <div
                key={year}
                className="absolute bottom-0 h-9 border-l border-[var(--color-stone-light)]"
                style={{ left: xFromYear(year, 'TEMPS_DE_LA_FIN') - modernX }}
              >
                <span className="absolute bottom-1 left-1 whitespace-nowrap text-[9px] font-semibold text-[var(--color-ink-muted)]">
                  {year}
                </span>
              </div>
            ))}
          </div>

          <div
            className="absolute top-0 z-20 border-l-4 border-double border-[var(--color-primary)] bg-[var(--color-primary-soft)]/35"
            style={{ left: futureX, width: futureWidth, height: AXIS_HEADER_HEIGHT }}
          >
            <span className="absolute left-3 top-2 text-[10px] font-black uppercase tracking-wider text-[var(--color-primary-dark)]">
              Séquence prophétique future
            </span>
            <span className="absolute right-3 top-2 text-[9px] font-semibold text-[var(--color-ink-muted)]">
              ordre connu, dates et durées non révélées
            </span>
            <div className="absolute bottom-8 left-3 flex gap-3">
              {futureRecords.map((record, index) => {
                return (
                  <article
                    key={record.id}
                    className="flex h-14 shrink-0 items-center gap-2 rounded-md border border-[var(--color-primary)] bg-[var(--color-paper)] px-3 text-left shadow-sm"
                    style={{ width: FUTURE_CARD_WIDTH }}
                    aria-label={`${index + 1}. ${record.title}`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-primary)] text-[10px] font-black text-white">
                      {index + 1}
                    </span>
                    <span className="line-clamp-2 text-[10px] font-bold leading-4">
                      {record.shortLabel}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>

          {selectedMarkerX !== null && (
            <div
              data-testid="selected-event-marker"
              className="pointer-events-none absolute z-[60] w-px bg-[var(--color-primary)]"
              style={{
                left: selectedMarkerX,
                top: AXIS_HEADER_HEIGHT - 12,
                height: Math.max(ROW_HEIGHT, rows.length * ROW_HEIGHT + 12)
              }}
            >
              <span className="absolute -left-1.5 -top-1 size-3 rotate-45 bg-[var(--color-primary)]" />
            </div>
          )}

          {rows.map((row, index) => {
            const rowTop = AXIS_HEADER_HEIGHT + index * ROW_HEIGHT;
            const biographyLane = laneBiographyId(row.lane);
            const markerItems = row.items.filter(item => isMarker(item.record));
            const barItems = row.items.filter(item => !isMarker(item.record));
            return (
              <React.Fragment key={row.id}>
                <div
                  className="absolute left-0 border-b border-[var(--color-stone-light)]/70"
                  data-biography-lane={biographyLane}
                  style={{ top: rowTop, width: totalWidth, height: ROW_HEIGHT }}
                >
                  <div
                    className="sticky left-0 z-40 flex h-full items-center border-r border-[var(--color-stone-light)] bg-[var(--color-paper)] px-3"
                    style={{ width: LABEL_GUTTER }}
                  >
                    <span className="truncate text-[10px] font-bold text-[var(--color-ink-soft)]" title={`${row.lane} · ${row.label}`}>
                      {row.label}
                    </span>
                  </div>
                </div>
                {barItems.map(item => renderBar(item, rowTop))}
                {renderMarkers(markerItems, rowTop)}
              </React.Fragment>
            );
          })}

          <div
            className="absolute bottom-0 left-0 flex items-center border-t border-[var(--color-stone-light)] bg-[var(--color-paper-muted)] px-3 text-[10px] text-[var(--color-ink-muted)]"
            style={{ width: totalWidth, height: GROUP_HEADER_HEIGHT }}
          >
            <span className="sticky left-3">
              {zoom === 0
                ? 'Vue globale calibrée sur les 39 éléments du référentiel.'
                : 'Cliquez sur un groupe ou un amas pour développer le niveau suivant.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
