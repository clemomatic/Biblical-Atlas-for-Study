import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BiblicalPlace, BiblicalRoute, BiblicalTerritory, EventData } from '../types';
import { MapPin, Navigation, Map as MapIcon, Layers, Info } from 'lucide-react';

// Fix Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
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
  onSelectPlace: (place: BiblicalPlace) => void;
  searchQuery: string;
}

export const MapView: React.FC<MapViewProps> = ({
  places,
  routes,
  territories,
  selectedPlace,
  selectedEvent,
  onSelectPlace,
  searchQuery
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showTerritories, setShowTerritories] = useState<boolean>(true);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [31.7767, 35.2345], // Jerusalem center
        zoom: 7,
        zoomControl: false
      });

      // CartoDB Voyager / Light map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      // Custom Zoom Control
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers, Routes, & Polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers & layers
    Object.values(markersRef.current).forEach(m => (m as L.Marker).remove());
    markersRef.current = {};

    // Filter places based on search query or selected event associations
    const filteredPlaces = places.filter(p => {
      // If an event is selected, check if this place is linked
      if (selectedEvent && selectedEvent.associatedLocationIds && selectedEvent.associatedLocationIds.length > 0) {
        return selectedEvent.associatedLocationIds.includes(p.id);
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.territory && p.territory.toLowerCase().includes(q))
      );
    });

    // Add Place Markers
    filteredPlaces.forEach(place => {
      const isSelected = selectedPlace?.id === place.id;
      const isHighlightedByEvent =
        selectedEvent?.associatedLocationIds?.includes(place.id) || false;

      const markerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform ${
            isSelected || isHighlightedByEvent
              ? 'bg-purple-600 text-white scale-125 ring-4 ring-purple-400/50'
              : 'bg-white text-purple-700 border border-purple-200 hover:scale-110'
          }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <span class="absolute -bottom-5 whitespace-nowrap text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/90 text-stone-900 border border-stone-200 shadow">
            ${place.name}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(place.coordinates, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectPlace(place);
      });

      markersRef.current[place.id] = marker;
    });

    // Add Routes if enabled
    if (showRoutes) {
      routes.forEach(route => {
        const latLngs = route.points.map(pt => pt.coordinates);
        L.polyline(latLngs, {
          color: route.color,
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.8
        }).addTo(map);
      });
    }

    // Add Territories if enabled
    if (showTerritories) {
      territories.forEach(terr => {
        L.polygon(terr.bounds, {
          color: terr.color,
          fillColor: terr.color,
          fillOpacity: 0.15,
          weight: 1.5
        }).addTo(map);
      });
    }

  }, [places, routes, territories, selectedPlace, selectedEvent, searchQuery, showRoutes, showTerritories]);

  // Center map on selected place
  useEffect(() => {
    if (selectedPlace && mapRef.current) {
      mapRef.current.flyTo(selectedPlace.coordinates, 10, {
        duration: 1.2
      });
    }
  }, [selectedPlace]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-50 relative overflow-hidden">
      
      {/* Map Control Bar Overlay */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        
        {/* Layer Toggles */}
        <div className="bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl p-2.5 shadow-xl space-y-2 text-xs text-stone-800">
          <div className="font-bold text-purple-700 uppercase tracking-wider px-1 pb-1 border-b border-stone-100 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Couches de la carte</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer hover:text-stone-950 px-1">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Itinéraires & Voyages</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:text-stone-950 px-1">
            <input
              type="checkbox"
              checked={showTerritories}
              onChange={(e) => setShowTerritories(e.target.checked)}
              className="accent-purple-600 rounded"
            />
            <span>Territoires & Royaumes</span>
          </label>
        </div>

        {/* Selected Event Context Banner */}
        {selectedEvent && (
          <div className="bg-purple-50/90 backdrop-blur-md border border-purple-200 rounded-xl p-3 shadow-xl text-xs text-purple-900 max-w-xs">
            <div className="font-bold text-purple-700 flex items-center gap-1.5 mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Filtre lié à l'événement :</span>
            </div>
            <p className="font-semibold text-stone-950">{selectedEvent.text}</p>
            <p className="text-[11px] text-purple-800/80 mt-1">
              Seuls les lieux associés à cet événement sont affichés sur la carte.
            </p>
          </div>
        )}

      </div>

      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

    </div>
  );
};
