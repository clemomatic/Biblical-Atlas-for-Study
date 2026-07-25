import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BiblicalMapCategory,
  BiblicalPlace,
  BiblicalRoute,
  EventData,
  MapLabelLevel,
  TimelinePeriod
} from '../types';
import {
  ChevronDown,
  X,
  Layers,
  Info,
  Map as MapIcon,
  Mountain
} from 'lucide-react';
import { formatDateFrench } from '../utils/dateUtils';
import { EmptyState, StatusNotice } from './ui/AtlasUi';

interface MapViewProps {
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  selectedPlace: BiblicalPlace | null;
  selectedEvent: EventData | null;
  visiblePeriod: TimelinePeriod | null;
  isActive: boolean;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectRoute: (route: BiblicalRoute) => void;
  searchQuery: string;
}

const overlapsPeriod = (
  startYear: number | undefined,
  endYear: number | undefined,
  period: TimelinePeriod | null
): boolean => {
  if (!period) return true;

  const hasKnownStart =
    typeof startYear === 'number' && Number.isFinite(startYear);
  const hasKnownEnd =
    typeof endYear === 'number' && Number.isFinite(endYear);

  // Sans datation exploitable, le lieu n'est pas limité par la frise.
  if (!hasKnownStart && !hasKnownEnd) return true;

  const start = hasKnownStart ? startYear : Number.NEGATIVE_INFINITY;
  const end = hasKnownEnd ? endYear : Number.POSITIVE_INFINITY;
  return end >= period.startYear && start <= period.endYear;
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      })[character] || character
  );

type BaseMapId = 'natural-relief' | 'light-map';

const BASE_MAP_STORAGE_KEY = 'atlas-base-map';

const getInitialBaseMap = (): BaseMapId => {
  if (typeof window === 'undefined') return 'natural-relief';

  try {
    const storedValue = window.localStorage.getItem(BASE_MAP_STORAGE_KEY);
    return storedValue === 'light-map' || storedValue === 'natural-relief'
      ? storedValue
      : 'natural-relief';
  } catch {
    return 'natural-relief';
  }
};

const getInitialLayerPanelOpen = (): boolean => {
  return false;
};

const createBaseMapLayer = (baseMap: BaseMapId): L.TileLayer => {
  if (baseMap === 'light-map') {
    return L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }
    );
  }

  return L.tileLayer(
    'https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 20
    }
  );
};

const MAP_MARKER_STYLES: Record<
  BiblicalMapCategory,
  { label: string; symbol: string; color: string; background: string }
> = {
  'levitical-city': {
    label: 'Ville lévitique',
    symbol: '▲',
    color: '#0f172a',
    background: '#ffffff'
  },
  'refuge-city': {
    label: 'Ville de refuge',
    symbol: '▲',
    color: '#dc2626',
    background: '#fff7ed'
  },
  'hebrew-scriptures': {
    label: 'Écritures hébraïques',
    symbol: '●',
    color: '#0f172a',
    background: '#ffffff'
  },
  'greek-scriptures': {
    label: 'Écritures grecques',
    symbol: '●',
    color: '#d97706',
    background: '#fffbeb'
  },
  'both-scriptures': {
    label: 'Écritures hébraïques et grecques',
    symbol: '■',
    color: '#0f172a',
    background: '#ffffff'
  },
  'ancient-city': {
    label: 'Grand centre antique',
    symbol: '■',
    color: '#7f1d1d',
    background: '#fff7ed'
  },
  'biblical-site': {
    label: 'Lieu biblique',
    symbol: '●',
    color: '#4338ca',
    background: '#eef2ff'
  },
  'exodus-stage': {
    label: 'Étape possible de l’Exode',
    symbol: '◆',
    color: '#b45309',
    background: '#fffbeb'
  },
  summit: {
    label: 'Sommet',
    symbol: '✚',
    color: '#7c2d12',
    background: '#fff7ed'
  },
  wadi: {
    label: 'Oued',
    symbol: '≈',
    color: '#0284c7',
    background: '#f0f9ff'
  },
  'body-of-water': {
    label: 'Étendue d’eau',
    symbol: '◉',
    color: '#0369a1',
    background: '#e0f2fe'
  },
  river: {
    label: 'Fleuve',
    symbol: '≈',
    color: '#0369a1',
    background: '#e0f2fe'
  },
  spring: {
    label: 'Source ou puits',
    symbol: '◆',
    color: '#0891b2',
    background: '#ecfeff'
  }
};

const MAP_LEGEND = Object.entries(MAP_MARKER_STYLES) as [
  BiblicalMapCategory,
  (typeof MAP_MARKER_STYLES)[BiblicalMapCategory]
][];

const MAP_LABEL_MIN_ZOOM: Record<MapLabelLevel, number> = {
  major: 4,
  regional: 6,
  study: 8,
  local: 10
};

export const MapView: React.FC<MapViewProps> = ({
  places,
  routes,
  selectedPlace,
  selectedEvent,
  visiblePeriod,
  isActive,
  onSelectPlace,
  onSelectRoute,
  searchQuery
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseMapLayerRef = useRef<L.TileLayer | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const hasReliefFallbackRef = useRef(false);

  const [baseMap, setBaseMap] = useState<BaseMapId>(getInitialBaseMap);
  const [mapZoom, setMapZoom] = useState(7);
  const [isBaseMapLoading, setIsBaseMapLoading] = useState(true);
  const [mapNotice, setMapNotice] = useState<string | null>(null);
  const [visiblePlaceCount, setVisiblePlaceCount] = useState(0);
  const [showSchematicRoutes, setShowSchematicRoutes] = useState(true);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(
    getInitialLayerPanelOpen
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.7767, 35.2345],
      zoom: 7,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const handleZoomEnd = () => setMapZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.off('zoomend', handleZoomEnd);
      markerLayerRef.current?.clearLayers();
      routeLayerRef.current?.clearLayers();
      markersRef.current = {};
      baseMapLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
    }

    const nextLayer = createBaseMapLayer(baseMap);
    setIsBaseMapLoading(true);
    const handleLoad = () => setIsBaseMapLoading(false);
    const handleTileError = () => {
      setIsBaseMapLoading(false);
      if (
        baseMap === 'natural-relief' &&
        !hasReliefFallbackRef.current
      ) {
        hasReliefFallbackRef.current = true;
        setMapNotice(
          'Le fond de relief est momentanément indisponible. La carte claire a été affichée à la place.'
        );
        setBaseMap('light-map');
      }
    };
    nextLayer.once('load', handleLoad);
    nextLayer.once('tileerror', handleTileError);
    nextLayer.addTo(map);
    nextLayer.bringToBack();
    baseMapLayerRef.current = nextLayer;

    try {
      window.localStorage.setItem(BASE_MAP_STORAGE_KEY, baseMap);
    } catch {
      // The map remains usable when storage is unavailable.
    }

    return () => {
      nextLayer.off('load', handleLoad);
      nextLayer.off('tileerror', handleTileError);
    };
  }, [baseMap]);

  useEffect(() => {
    if (!isActive || !mapRef.current) return;
    const timeout = window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
    return () => window.clearTimeout(timeout);
  }, [isActive]);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current = {};

    const query = searchQuery.trim().toLowerCase();
    const filteredPlaces = places.filter(place => {
      if (
        selectedPlace?.id !== place.id &&
        !overlapsPeriod(place.startYear, place.endYear, visiblePeriod)
      ) {
        return false;
      }
      if (
        selectedEvent?.associatedLocationIds?.length &&
        !selectedEvent.associatedLocationIds.includes(place.id)
      ) {
        return false;
      }
      const labelLevel = place.mapLabelLevel || 'local';
      const isEventPlace =
        selectedEvent?.associatedLocationIds?.includes(place.id) || false;
      if (
        !query &&
        selectedPlace?.id !== place.id &&
        !isEventPlace &&
        mapZoom < MAP_LABEL_MIN_ZOOM[labelLevel]
      ) {
        return false;
      }
      if (!query) return true;
      return (
        place.name.toLowerCase().includes(query) ||
        place.description.toLowerCase().includes(query) ||
        place.territory?.toLowerCase().includes(query) ||
        place.category?.toLowerCase().includes(query) ||
        place.alternateNames?.some(name =>
          name.toLowerCase().includes(query)
        ) ||
        place.biblicalReferences.some(reference =>
          reference.toLowerCase().includes(query)
        ) ||
        place.mapReferences?.some(reference =>
          reference.toLowerCase().includes(query)
        ) ||
        false
      );
    });
    setVisiblePlaceCount(filteredPlaces.length);

    filteredPlaces
      .sort((left, right) => {
        if (left.id === selectedPlace?.id) return 1;
        if (right.id === selectedPlace?.id) return -1;
        return 0;
      })
      .forEach(place => {
      const isHighlighted =
        selectedPlace?.id === place.id ||
        selectedEvent?.associatedLocationIds?.includes(place.id);
      const markerStyle = place.mapCategory
        ? MAP_MARKER_STYLES[place.mapCategory]
        : {
            label: 'Lieu biblique',
            symbol: '●',
            color: '#4338ca',
            background: '#ffffff'
          };
      const labelLevel = place.mapLabelLevel || 'local';
      const showLabel =
        mapZoom >= MAP_LABEL_MIN_ZOOM[labelLevel] || isHighlighted;
      const markerShape =
        place.mapCategory === 'levitical-city' ||
        place.mapCategory === 'refuge-city' ||
        place.mapCategory === 'summit'
          ? 'triangle'
          : place.mapCategory === 'both-scriptures' ||
              place.mapCategory === 'ancient-city'
            ? 'square'
            : place.mapCategory === 'exodus-stage' ||
                place.mapCategory === 'spring'
              ? 'diamond'
              : place.mapCategory === 'wadi' ||
                  place.mapCategory === 'river' ||
                  place.mapCategory === 'body-of-water'
                ? 'natural'
                : 'circle';
      const isNaturalLabel =
        place.mapCategory === 'wadi' ||
        place.mapCategory === 'river' ||
        place.mapCategory === 'body-of-water' ||
        place.mapCategory === 'summit';
      const markerHtml = `
        <div class="atlas-map-marker-host">
          <div
            class="atlas-map-marker atlas-map-marker--${markerShape} ${
              isHighlighted ? 'atlas-map-marker--selected' : ''
            }"
            style="--marker-color:${markerStyle.color};--marker-fill:${markerStyle.background}"
            title="${escapeHtml(markerStyle.label)}"
          >
            <span class="sr-only">${escapeHtml(markerStyle.symbol)}</span>
          </div>
          ${
            showLabel
              ? `<span class="map-label map-label--${labelLevel} ${
                  isNaturalLabel ? 'map-label--natural' : ''
                }">
                  ${escapeHtml(place.name)}
                </span>`
              : ''
          }
        </div>`;

      const marker = L.marker(place.coordinates, {
        icon: L.divIcon({
          html: markerHtml,
          className: 'map-label-host',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      });
      marker.on('click', () => onSelectPlace(place));
      marker.bindTooltip(escapeHtml(place.name), {
        direction: 'top',
        offset: [0, -8]
      });
      marker.addTo(markerLayer);
      markersRef.current[place.id] = marker;
    });

  }, [
    places,
    selectedPlace,
    selectedEvent,
    visiblePeriod,
    searchQuery,
    mapZoom,
    onSelectPlace
  ]);

  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;
    routeLayer.clearLayers();
    if (!showSchematicRoutes) return;

    routes
      .filter(route => {
        if (!overlapsPeriod(route.startYear, route.endYear, visiblePeriod)) {
          return false;
        }
        if (selectedEvent?.associatedRouteIds?.length) {
          return selectedEvent.associatedRouteIds.includes(route.id);
        }
        return true;
      })
      .forEach(route => {
        if (route.points.length < 2) return;
        const polyline = L.polyline(
          route.points.map(point => point.coordinates),
          {
            color: route.color,
            weight: 3,
            opacity: 0.82,
            dashArray: '7 7',
            lineCap: 'round',
            lineJoin: 'round',
            interactive: true
          }
        );
        polyline.bindTooltip(
          `${escapeHtml(route.name)} · tracé schématique`,
          { sticky: true }
        );
        polyline.on('click', () => onSelectRoute(route));
        polyline.addTo(routeLayer);
      });

    routeLayer.bringToBack();
  }, [
    routes,
    visiblePeriod,
    selectedEvent,
    showSchematicRoutes,
    onSelectRoute
  ]);

  useEffect(() => {
    if (
      !isActive ||
      !selectedPlace ||
      !mapRef.current ||
      !markersRef.current[selectedPlace.id]
    ) {
      return;
    }
    const [latitude, longitude] = selectedPlace.coordinates;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const frame = window.requestAnimationFrame(() => {
      const map = mapRef.current;
      if (!map) return;
      map.invalidateSize({ pan: false });
      map.flyTo(selectedPlace.coordinates, 11, { duration: 1.2 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPlace, isActive]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--color-paper-muted)]">
      <div className="absolute left-3 top-3 z-[420] flex max-w-[calc(100%-1.5rem)] flex-col items-start gap-2 sm:left-4 sm:top-4">
        <button
          type="button"
          aria-expanded={isLayerPanelOpen}
          aria-controls="atlas-map-layer-menu"
          onClick={() => setIsLayerPanelOpen(current => !current)}
          className="atlas-control min-h-11 gap-2 bg-[var(--color-paper)]/94 px-3.5 shadow-[var(--shadow-2)] backdrop-blur"
        >
          {baseMap === 'natural-relief' ? (
            <Mountain className="size-4 text-[var(--color-mineral)]" />
          ) : (
            <MapIcon className="size-4 text-[var(--color-primary)]" />
          )}
          <span>
            {baseMap === 'natural-relief' ? 'Relief naturel' : 'Carte claire'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 text-[var(--color-ink-muted)] transition-transform ${
              isLayerPanelOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {visiblePeriod && (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-paper)]/90 px-3 py-2 text-xs text-[var(--color-ink-soft)] shadow-[var(--shadow-1)] backdrop-blur">
            <span className="font-semibold text-[var(--color-ink)]">
              Période visible
            </span>{' '}
            <span className="tabular-nums">
              {formatDateFrench(Math.round(visiblePeriod.startYear))} à{' '}
              {formatDateFrench(Math.round(visiblePeriod.endYear))}
            </span>
          </p>
        )}
      </div>

      {isLayerPanelOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer les couches de la carte"
            className="fixed inset-0 z-[430] bg-[var(--color-ink)]/18 sm:hidden"
            onClick={() => setIsLayerPanelOpen(false)}
          />
          <section
            id="atlas-map-layer-menu"
            aria-label="Couches de la carte"
            className="fixed inset-x-0 bottom-0 z-[440] max-h-[78dvh] overflow-y-auto rounded-t-[var(--radius-xl)] bg-[var(--color-paper)] p-5 shadow-[var(--shadow-3)] sm:absolute sm:bottom-auto sm:left-4 sm:right-auto sm:top-[4.5rem] sm:w-[22rem] sm:rounded-[var(--radius-lg)] sm:border sm:border-[var(--color-stone-light)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="atlas-kicker">Cartographie</p>
                <h2 className="mt-1 text-base font-bold text-[var(--color-ink)]">
                  Couches de la carte
                </h2>
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setIsLayerPanelOpen(false)}
                className="atlas-icon-button"
              >
                <X className="size-4" />
              </button>
            </div>

            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-[var(--color-ink)]">
                Fond de carte
              </legend>
              <div
                role="radiogroup"
                aria-label="Fond de carte"
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {([
                  [
                    'natural-relief',
                    'Relief naturel',
                    'Sans routes modernes',
                    Mountain
                  ],
                  ['light-map', 'Carte claire', 'Fond CartoDB', MapIcon]
                ] as const).map(([id, label, description, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={baseMap === id}
                    onClick={() => {
                      if (id === 'natural-relief') {
                        hasReliefFallbackRef.current = false;
                      }
                      setBaseMap(id);
                    }}
                    className={`min-h-20 border-l-2 px-3 py-2.5 text-left transition-colors ${
                      baseMap === id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
                        : 'border-[var(--color-stone)] hover:bg-[var(--color-paper-muted)]'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
                      <Icon className="size-4" />
                      {label}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-5 border-t border-[var(--color-stone-light)] pt-4">
              <legend className="text-sm font-semibold text-[var(--color-ink)]">
                Données d’étude
              </legend>
              <button
                type="button"
                role="switch"
                aria-checked={showSchematicRoutes}
                onClick={() =>
                  setShowSchematicRoutes(current => !current)
                }
                className="mt-2 flex min-h-11 w-full items-center gap-3 bg-[var(--color-paper-muted)] px-3 py-2 text-left"
              >
                <span
                  aria-hidden="true"
                  className="h-0 w-8 border-t-[3px] border-dashed border-[var(--color-primary)]"
                />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-[var(--color-ink)]">
                    Déplacements schématiques
                  </span>
                  <span className="block text-xs leading-relaxed text-[var(--color-ink-muted)]">
                    Relient les lieux cités, sans représenter le chemin exact.
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                    showSchematicRoutes
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-[var(--color-stone)]'
                  }`}
                >
                  <span
                    className={`block size-4 rounded-full bg-[var(--color-paper)] transition-transform ${
                      showSchematicRoutes ? 'translate-x-4' : ''
                    }`}
                  />
                </span>
              </button>
            </fieldset>

            <details className="mt-5 border-t border-[var(--color-stone-light)] pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
                Légende des lieux
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                {MAP_LEGEND.map(([category, style]) => {
                  const count = places.filter(
                    place =>
                      place.mapCategory === category &&
                      overlapsPeriod(
                        place.startYear,
                        place.endYear,
                        visiblePeriod
                      ) &&
                      mapZoom >=
                        MAP_LABEL_MIN_ZOOM[place.mapLabelLevel || 'local']
                  ).length;
                  if (count === 0) return null;
                  return (
                    <div
                      key={category}
                      className="flex min-w-0 items-center gap-2 text-xs leading-snug text-[var(--color-ink-soft)]"
                    >
                      <span
                        aria-hidden="true"
                        className="grid size-4 shrink-0 place-items-center text-xs font-bold"
                        style={{ color: style.color }}
                      >
                        {style.symbol}
                      </span>
                      <span>
                        {style.label}{' '}
                        <span className="tabular-nums text-[var(--color-ink-muted)]">
                          {count}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Les lieux apparaissent progressivement selon leur importance et
                le niveau de zoom.
              </p>
            </details>
          </section>
        </>
      )}

      <div className="hidden">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-2.5 text-xs text-slate-800 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
          <button
            type="button"
            aria-expanded={isLayerPanelOpen}
            aria-controls="map-layer-panel-content"
            onClick={() => setIsLayerPanelOpen(current => !current)}
            className={`flex w-full items-center gap-1.5 px-1 font-bold uppercase tracking-wider text-indigo-700 sm:pointer-events-none ${
              isLayerPanelOpen ? 'border-b border-slate-100 pb-2' : ''
            }`}
          >
            <Layers className="size-3.5" />
            <span className="flex-1 text-left">Couches de la carte</span>
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform sm:hidden ${
                isLayerPanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            id="map-layer-panel-content"
            className={`${isLayerPanelOpen ? 'block' : 'hidden'} space-y-2 pt-2 sm:block`}
          >
            <fieldset className="space-y-1.5">
            <legend className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Fond de carte
            </legend>
            <div
              role="radiogroup"
              aria-label="Fond de carte"
              className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            >
              <button
                type="button"
                role="radio"
                aria-checked={baseMap === 'natural-relief'}
                onClick={() => setBaseMap('natural-relief')}
                className={`flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition ${
                  baseMap === 'natural-relief'
                    ? 'bg-white text-emerald-900 shadow-sm ring-1 ring-emerald-200'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <Mountain className="size-3.5 shrink-0" />
                  <span>Relief naturel</span>
                </span>
                <span className="text-[10px] font-medium opacity-70">
                  Sans routes ni étiquettes
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={baseMap === 'light-map'}
                onClick={() => setBaseMap('light-map')}
                className={`flex min-w-0 flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left transition ${
                  baseMap === 'light-map'
                    ? 'bg-white text-indigo-900 shadow-sm ring-1 ring-indigo-200'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <MapIcon className="size-3.5 shrink-0" />
                  <span>Carte claire</span>
                </span>
                <span className="text-[10px] font-medium opacity-70">
                  Fond CartoDB
                </span>
              </button>
            </div>
            </fieldset>

            <div className="h-px bg-slate-100" />

            <details className="group rounded-xl border border-slate-100 bg-white/70">
            <summary className="cursor-pointer list-none px-2.5 py-2 font-semibold text-slate-700 marker:content-none">
              <span className="flex items-center justify-between gap-3">
                <span>Légende des lieux</span>
                <span
                  aria-hidden="true"
                  className="text-slate-400 transition group-open:rotate-180"
                >
                  ▾
                </span>
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 px-2.5 py-2.5">
              {MAP_LEGEND.map(([category, style]) => {
                const count = places.filter(
                  place =>
                    place.mapCategory === category &&
                    overlapsPeriod(
                      place.startYear,
                      place.endYear,
                      visiblePeriod
                    ) &&
                    mapZoom >=
                      MAP_LABEL_MIN_ZOOM[place.mapLabelLevel || 'local']
                ).length;
                if (count === 0) return null;
                return (
                  <div
                    key={category}
                    className="flex min-w-0 items-center gap-2 text-[10px] leading-tight text-slate-600"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-4 shrink-0 items-center justify-center rounded-full border border-slate-200 font-black"
                      style={{
                        color: style.color,
                        backgroundColor: style.background
                      }}
                    >
                      {style.symbol}
                    </span>
                    <span className="min-w-0">
                      {style.label}{' '}
                      <span className="text-slate-400">({count})</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="border-t border-slate-100 px-2.5 py-2 text-[10px] leading-relaxed text-slate-500">
              Les grands centres restent nommés dans la vue générale. Les
              centres régionaux, lieux d’étude puis repères locaux apparaissent
              progressivement jusqu’au zoom 10.
            </p>
            </details>
          </div>
        </div>

        {visiblePeriod && (
          <div className="max-w-xs rounded-xl border border-white/70 bg-white/90 p-3 text-xs text-slate-600 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
            <span className="font-semibold text-slate-900">Période visible</span>
            <br />
            {formatDateFrench(Math.round(visiblePeriod.startYear))} à{' '}
            {formatDateFrench(Math.round(visiblePeriod.endYear))}
          </div>
        )}

        {selectedEvent && (
          <div className="max-w-xs rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 text-xs text-indigo-950 shadow-xl shadow-indigo-900/10 backdrop-blur-xl">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-indigo-700">
              <Info className="size-4 shrink-0" />
              <span>Contexte de l’événement</span>
            </div>
            <p className="font-semibold text-slate-950">{selectedEvent.text}</p>
            <p className="mt-1 text-[11px] text-indigo-800/80">
              Seuls les lieux associés sont affichés.
            </p>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-20 z-[410] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-4 sm:right-16 sm:w-[22rem]">
        {mapNotice && (
          <div className="pointer-events-auto w-full shadow-[var(--shadow-2)]">
            <StatusNotice
              title="Fond de carte remplacé"
              message={mapNotice}
              variant="warning"
              action={
                <button
                  type="button"
                  aria-label="Fermer la notification"
                  onClick={() => setMapNotice(null)}
                  className="atlas-icon-button size-8"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </div>
        )}

        {selectedEvent && (
          <div className="pointer-events-auto w-full border-l-2 border-[var(--color-bronze)] bg-[var(--color-paper)]/94 px-4 py-3 text-xs shadow-[var(--shadow-2)] backdrop-blur">
            <p className="flex items-center gap-2 font-semibold text-[var(--color-bronze)]">
              <Info className="size-4 shrink-0" />
              Contexte de l’événement
            </p>
            <p className="mt-1.5 font-semibold text-[var(--color-ink)]">
              {selectedEvent.text}
            </p>
            <p className="mt-1 text-[var(--color-ink-soft)]">
              Seuls les lieux associés sont affichés.
            </p>
          </div>
        )}
      </div>

      {isBaseMapLoading && (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-0 top-0 z-[405] h-0.5 overflow-hidden bg-[var(--color-stone-light)]"
        >
          <span className="block h-full w-1/3 animate-[atlas-map-load_1.2s_ease-in-out_infinite] bg-[var(--color-mineral)]" />
          <span className="sr-only">Chargement du fond de carte</span>
        </div>
      )}

      {visiblePlaceCount === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center p-5">
          <div className="w-full max-w-md bg-[var(--color-paper)]/94 shadow-[var(--shadow-2)] backdrop-blur">
            <EmptyState
              icon={<MapIcon className="size-5" />}
              title="Aucun lieu pour cette période"
              message="Élargissez la période visible dans la frise ou retirez le contexte de l’événement sélectionné."
            />
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
