import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BiblicalMapCategory,
  BiblicalPlace,
  BiblicalRoute,
  BiblicalRouteCategory,
  BiblicalTerritory,
  EventData,
  MapLabelLevel,
  TimelinePeriod
} from '../types';
import { Layers, Info, Map as MapIcon, Mountain } from 'lucide-react';
import { formatDateFrench } from '../utils/dateUtils';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

interface MapViewProps {
  places: BiblicalPlace[];
  routes: BiblicalRoute[];
  territories: BiblicalTerritory[];
  selectedPlace: BiblicalPlace | null;
  selectedEvent: EventData | null;
  selectedRouteId: string | null;
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
  if (!period || (startYear === undefined && endYear === undefined)) return true;
  const start = startYear ?? Number.NEGATIVE_INFINITY;
  const end = endYear ?? Number.POSITIVE_INFINITY;
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

const ROUTE_CATEGORY_STYLES: Record<
  BiblicalRouteCategory,
  { label: string; color: string; dashArray?: string }
> = {
  'patriarch-abraham': {
    label: 'Voyages d’Abraham',
    color: '#e11d48'
  },
  'patriarch-isaac': {
    label: 'Voyages d’Isaac',
    color: '#7e22ce'
  },
  'patriarch-jacob': {
    label: 'Voyages de Jacob',
    color: '#059669'
  },
  'ancient-road': {
    label: 'Routes de l’époque',
    color: '#9a5b3f',
    dashArray: '2, 7'
  },
  exodus: {
    label: 'Itinéraire possible de l’Exode',
    color: '#dc2626',
    dashArray: '9, 6'
  },
  missionary: {
    label: 'Voyages missionnaires',
    color: '#13a30c',
    dashArray: '6, 8'
  }
};

const ROUTE_LEGEND = Object.entries(ROUTE_CATEGORY_STYLES) as [
  BiblicalRouteCategory,
  (typeof ROUTE_CATEGORY_STYLES)[BiblicalRouteCategory]
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
  territories,
  selectedPlace,
  selectedEvent,
  selectedRouteId,
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
  const territoryLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [showRoutes, setShowRoutes] = useState(true);
  const [visibleRouteCategories, setVisibleRouteCategories] = useState<
    Set<BiblicalRouteCategory>
  >(() => new Set(ROUTE_LEGEND.map(([category]) => category)));
  const [showTerritories, setShowTerritories] = useState(true);
  const [baseMap, setBaseMap] = useState<BaseMapId>(getInitialBaseMap);
  const [mapZoom, setMapZoom] = useState(7);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.7767, 35.2345],
      zoom: 7,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    territoryLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const handleZoomEnd = () => setMapZoom(map.getZoom());
    map.on('zoomend', handleZoomEnd);

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.off('zoomend', handleZoomEnd);
      markerLayerRef.current?.clearLayers();
      routeLayerRef.current?.clearLayers();
      territoryLayerRef.current?.clearLayers();
      markersRef.current = {};
      baseMapLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      territoryLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseMapLayerRef.current) {
      map.removeLayer(baseMapLayerRef.current);
    }

    const nextLayer = createBaseMapLayer(baseMap);
    nextLayer.addTo(map);
    nextLayer.bringToBack();
    baseMapLayerRef.current = nextLayer;

    try {
      window.localStorage.setItem(BASE_MAP_STORAGE_KEY, baseMap);
    } catch {
      // The map remains usable when storage is unavailable.
    }
  }, [baseMap]);

  useEffect(() => {
    if (!isActive || !mapRef.current) return;
    const timeout = window.setTimeout(() => mapRef.current?.invalidateSize(), 0);
    return () => window.clearTimeout(timeout);
  }, [isActive]);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    const routeLayer = routeLayerRef.current;
    const territoryLayer = territoryLayerRef.current;
    if (!markerLayer || !routeLayer || !territoryLayer) return;

    markerLayer.clearLayers();
    routeLayer.clearLayers();
    territoryLayer.clearLayers();
    markersRef.current = {};

    const query = searchQuery.trim().toLowerCase();
    const selectedEventRoutePlaceIds = new Set(
      routes
        .filter(route =>
          selectedEvent?.associatedRouteIds?.includes(route.id)
        )
        .flatMap(route => route.associatedPlaceIds || [])
    );
    const filteredPlaces = places.filter(place => {
      if (
        selectedPlace?.id !== place.id &&
        !overlapsPeriod(place.startYear, place.endYear, visiblePeriod)
      ) {
        return false;
      }
      if (
        selectedEvent?.associatedLocationIds?.length &&
        !selectedEvent.associatedLocationIds.includes(place.id) &&
        !selectedEventRoutePlaceIds.has(place.id)
      ) {
        return false;
      }
      const labelLevel = place.mapLabelLevel || 'local';
      const isEventPlace =
        selectedEvent?.associatedLocationIds?.includes(place.id) ||
        selectedEventRoutePlaceIds.has(place.id);
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

    filteredPlaces
      .sort((left, right) => {
        if (left.id === selectedPlace?.id) return 1;
        if (right.id === selectedPlace?.id) return -1;
        return 0;
      })
      .forEach(place => {
      const isHighlighted =
        selectedPlace?.id === place.id ||
        selectedEvent?.associatedLocationIds?.includes(place.id) ||
        selectedEventRoutePlaceIds.has(place.id);
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
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div
            class="flex h-4 w-4 items-center justify-center rounded-full border border-white/90 text-[11px] font-black leading-none shadow-sm transition-transform ${
              isHighlighted
                ? 'scale-150 ring-2 ring-cyan-400/60'
                : 'hover:scale-125'
            }"
            style="color:${markerStyle.color};background:${markerStyle.background}"
            title="${escapeHtml(markerStyle.label)}"
          >
            ${markerStyle.symbol}
          </div>
          ${
            showLabel
              ? `<span class="absolute left-1/2 -bottom-5 -translate-x-1/2 whitespace-nowrap rounded border ${
                  labelLevel === 'major'
                    ? 'border-indigo-300 bg-indigo-50/95 text-[12px] font-extrabold text-indigo-950 shadow-md'
                    : 'border-slate-200 bg-white/95 text-[11px] font-bold text-slate-900 shadow'
                } px-1.5 py-0.5">
                  ${escapeHtml(place.name)}
                </span>`
              : ''
          }
        </div>`;

      const marker = L.marker(place.coordinates, {
        icon: L.divIcon({
          html: markerHtml,
          className: 'custom-div-icon',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
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

    if (showTerritories) {
      territories
        .filter(territory =>
          overlapsPeriod(territory.startYear, territory.endYear, visiblePeriod)
        )
        .forEach(territory => {
          L.polygon(territory.bounds, {
            color: territory.color,
            fillColor: territory.color,
            fillOpacity: 0.15,
            weight: 1.5
          })
            .bindTooltip(
              `<strong>${escapeHtml(territory.name)}</strong><br>${escapeHtml(territory.period)}`
            )
            .addTo(territoryLayer);
        });
    }

    if (showRoutes) {
      routes
        .filter(
          route =>
            route.id === selectedRouteId ||
            (overlapsPeriod(route.startYear, route.endYear, visiblePeriod) &&
              (!route.routeCategory ||
                visibleRouteCategories.has(route.routeCategory)))
        )
        .filter(route => {
          if (!selectedEvent) return true;
          if (selectedEvent.associatedRouteIds?.includes(route.id)) return true;
          return route.associatedPlaceIds?.some(placeId =>
            selectedEvent.associatedLocationIds?.includes(placeId)
          );
        })
        .forEach(route => {
          const isSelected = route.id === selectedRouteId;
          const categoryStyle = route.routeCategory
            ? ROUTE_CATEGORY_STYLES[route.routeCategory]
            : undefined;
          const polyline = L.polyline(
            route.points.map(point => point.coordinates),
            {
              color: route.color,
              weight: isSelected ? 6 : 3,
              dashArray: isSelected ? undefined : categoryStyle?.dashArray,
              opacity: isSelected ? 1 : 0.76
            }
          );
          polyline.on('click', () => onSelectRoute(route));
          polyline
            .bindTooltip(escapeHtml(route.name), { sticky: true })
            .addTo(routeLayer);
          if (isSelected) polyline.bringToFront();
        });
    }
  }, [
    places,
    routes,
    territories,
    selectedPlace,
    selectedEvent,
    selectedRouteId,
    visiblePeriod,
    searchQuery,
    showRoutes,
    visibleRouteCategories,
    showTerritories,
    mapZoom,
    onSelectPlace,
    onSelectRoute
  ]);

  useEffect(() => {
    if (selectedPlace && mapRef.current && markersRef.current[selectedPlace.id]) {
      mapRef.current.flyTo(selectedPlace.coordinates, 11, { duration: 1.2 });
    }
  }, [selectedPlace]);

  useEffect(() => {
    if (!selectedRouteId || !mapRef.current || !isActive) return;
    const route = routes.find(item => item.id === selectedRouteId);
    if (!route || route.points.length === 0) return;
    const bounds = L.latLngBounds(
      route.points.map(point => point.coordinates)
    );
    mapRef.current.fitBounds(bounds, {
      padding: [56, 56],
      maxZoom: 10,
      animate: true
    });
  }, [selectedRouteId, routes, isActive]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-50">
      <div className="absolute left-3 top-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-col gap-2 sm:left-4 sm:top-4">
        <div className="space-y-2 rounded-2xl border border-white/70 bg-white/90 p-2.5 text-xs text-slate-800 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-1 pb-2 font-bold uppercase tracking-wider text-indigo-700">
            <Layers className="size-3.5" />
            <span>Couches de la carte</span>
          </div>

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

          <div className="h-px bg-slate-100" />

          <button
            type="button"
            onClick={() => setShowRoutes(value => !value)}
            aria-pressed={showRoutes}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left font-semibold transition ${
              showRoutes
                ? 'bg-indigo-50 text-indigo-800'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                showRoutes ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            />
            <span>Itinéraires et voyages</span>
          </button>

          {showRoutes && (
            <details className="group rounded-xl border border-slate-100 bg-white/70">
              <summary className="cursor-pointer list-none px-2.5 py-2 font-semibold text-slate-700 marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  <span>Catégories d’itinéraires</span>
                  <span
                    aria-hidden="true"
                    className="text-slate-400 transition group-open:rotate-180"
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 p-2">
                {ROUTE_LEGEND.map(([category, style]) => {
                  const count = routes.filter(
                    route =>
                      route.routeCategory === category &&
                      overlapsPeriod(
                        route.startYear,
                        route.endYear,
                        visiblePeriod
                      )
                  ).length;
                  if (count === 0) return null;
                  const isVisible = visibleRouteCategories.has(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={isVisible}
                      onClick={() =>
                        setVisibleRouteCategories(current => {
                          const next = new Set(current);
                          if (next.has(category)) next.delete(category);
                          else next.add(category);
                          return next;
                        })
                      }
                      className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] leading-tight transition ${
                        isVisible
                          ? 'bg-slate-50 text-slate-700 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: style.color,
                          opacity: isVisible ? 1 : 0.3
                        }}
                      />
                      <span className="min-w-0">
                        {style.label}{' '}
                        <span className="text-slate-400">({count})</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          )}

          <button
            type="button"
            onClick={() => setShowTerritories(value => !value)}
            aria-pressed={showTerritories}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left font-semibold transition ${
              showTerritories
                ? 'bg-cyan-50 text-cyan-800'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                showTerritories ? 'bg-cyan-500' : 'bg-slate-300'
              }`}
            />
            <span>Territoires et royaumes</span>
          </button>
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
              Seuls les lieux et itinéraires associés sont affichés.
            </p>
          </div>
        )}
      </div>

      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
