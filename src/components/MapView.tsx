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
import { Layers, Info } from 'lucide-react';

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
  visiblePeriod: TimelinePeriod | null;
  onSelectPlace: (place: BiblicalPlace) => void;
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

export const MapView: React.FC<MapViewProps> = ({
  places,
  routes,
  territories,
  selectedPlace,
  selectedEvent,
  visiblePeriod,
  onSelectPlace,
  searchQuery
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const territoryLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  const [showRoutes, setShowRoutes] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.7767, 35.2345],
      zoom: 7,
      zoomControl: false
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }
    ).addTo(map);
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
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      routeLayerRef.current = null;
      territoryLayerRef.current = null;
    };
  }, []);

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
      if (!overlapsPeriod(place.startYear, place.endYear, visiblePeriod)) return false;
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
              ? 'bg-purple-600 text-white scale-125 ring-4 ring-purple-400/50'
              : 'bg-white text-purple-700 border border-purple-200 hover:scale-110'
          }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span class="absolute -bottom-5 whitespace-nowrap text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-stone-900 border border-stone-200 shadow">
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
        .filter(route =>
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
          L.polyline(
            route.points.map(point => point.coordinates),
            {
              color: route.color,
              weight: 3,
              dashArray: '6, 8',
              opacity: 0.8
            }
          )
            .bindTooltip(escapeHtml(route.name))
            .addTo(routeLayer);
        });
    }
  }, [
    places,
    routes,
    territories,
    selectedPlace,
    selectedEvent,
    visiblePeriod,
    searchQuery,
    showRoutes,
    showTerritories,
    onSelectPlace
  ]);

  useEffect(() => {
    if (selectedPlace && mapRef.current && markersRef.current[selectedPlace.id]) {
      mapRef.current.flyTo(selectedPlace.coordinates, 10, { duration: 1.2 });
    }
  }, [selectedPlace]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-50 relative overflow-hidden">
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl p-2.5 shadow-xl space-y-2 text-xs text-stone-800">
          <div className="font-bold text-purple-700 uppercase tracking-wider px-1 pb-1 border-b border-stone-100 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Couches de la carte</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer hover:text-stone-950 px-1">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={event => setShowRoutes(event.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Itinéraires et voyages</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-stone-950 px-1">
            <input
              type="checkbox"
              checked={showTerritories}
              onChange={event => setShowTerritories(event.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Territoires et royaumes</span>
          </label>
        </div>

        {visiblePeriod && (
          <div className="bg-white/90 backdrop-blur-md border border-stone-200 rounded-xl p-3 shadow-xl text-xs text-stone-700 max-w-xs">
            Période de la frise : {Math.round(visiblePeriod.startYear)} à{' '}
            {Math.round(visiblePeriod.endYear)}
          </div>
        )}

        {selectedEvent && (
          <div className="bg-purple-50/90 backdrop-blur-md border border-purple-200 rounded-xl p-3 shadow-xl text-xs text-purple-900 max-w-xs">
            <div className="font-bold text-purple-700 flex items-center gap-1.5 mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Filtre lié à l’événement :</span>
            </div>
            <p className="font-semibold text-stone-950">{selectedEvent.text}</p>
            <p className="text-[11px] text-purple-800/80 mt-1">
              Les lieux et itinéraires associés sont mis en contexte avec la période de la frise.
            </p>
          </div>
        )}
      </div>

      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
