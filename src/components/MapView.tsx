import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BiblicalPlace,
  BiblicalRoute,
  BiblicalTerritory,
  EventData,
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
  const [showTerritories, setShowTerritories] = useState(true);
  const [baseMap, setBaseMap] = useState<BaseMapId>(getInitialBaseMap);

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

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
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
      if (!query) return true;
      return (
        place.name.toLowerCase().includes(query) ||
        place.description.toLowerCase().includes(query) ||
        place.territory?.toLowerCase().includes(query) ||
        false
      );
    });

    filteredPlaces.forEach(place => {
      const isHighlighted =
        selectedPlace?.id === place.id ||
        selectedEvent?.associatedLocationIds?.includes(place.id);
      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
            isHighlighted
              ? 'bg-indigo-600 text-white scale-125 ring-4 ring-cyan-400/40'
              : 'bg-white text-indigo-700 border border-indigo-200 hover:scale-110'
          }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span class="absolute -bottom-5 whitespace-nowrap text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-slate-900 border border-slate-200 shadow">
            ${escapeHtml(place.name)}
          </span>
        </div>`;

      const marker = L.marker(place.coordinates, {
        icon: L.divIcon({
          html: markerHtml,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      });
      marker.on('click', () => onSelectPlace(place));
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
            overlapsPeriod(route.startYear, route.endYear, visiblePeriod)
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
          const polyline = L.polyline(
            route.points.map(point => point.coordinates),
            {
              color: route.color,
              weight: isSelected ? 6 : 3,
              dashArray: isSelected ? undefined : '6, 8',
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
    showTerritories,
    onSelectPlace,
    onSelectRoute
  ]);

  useEffect(() => {
    if (selectedPlace && mapRef.current && markersRef.current[selectedPlace.id]) {
      mapRef.current.flyTo(selectedPlace.coordinates, 10, { duration: 1.2 });
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
