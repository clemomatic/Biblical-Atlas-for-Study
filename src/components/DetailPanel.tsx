import React from 'react';
import { EventData, BiblicalPlace, CategoryData, ActiveTab } from '../types';
import { formatDateFrench, formatEventSpan } from '../utils/dateUtils';
import { X, Calendar, MapPin, Book, Compass, User, Tag, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface DetailPanelProps {
  selectedEvent: EventData | null;
  selectedPlace: BiblicalPlace | null;
  categories: CategoryData[];
  places: BiblicalPlace[];
  events: EventData[];
  onClose: () => void;
  onSelectPlace: (place: BiblicalPlace) => void;
  onSelectEvent: (event: EventData) => void;
  onSwitchTab: (tab: ActiveTab) => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedEvent,
  selectedPlace,
  categories,
  places,
  events,
  onClose,
  onSelectPlace,
  onSelectEvent,
  onSwitchTab
}) => {
  if (!selectedEvent && !selectedPlace) return null;

  // Helper to resolve category color
  const getCategoryColor = (event: EventData) => {
    const cat = categories.find(
      category =>
        category.id === event.categoryId || category.name === event.category
    );
    return cat ? cat.hexColor : '#0080ff';
  };

  const linkedPlaceEvents = selectedPlace
    ? (selectedPlace.associatedEventIds || [])
        .map(eventId => events.find(event => event.id === eventId))
        .filter((event): event is EventData => Boolean(event))
    : [];
  const linkedPlaceCharacters = selectedPlace
    ? (selectedPlace.associatedCharacterIds || [])
        .map(eventId => events.find(event => event.id === eventId))
        .filter((event): event is EventData => Boolean(event))
    : [];

  return (
    <div className="fixed bottom-0 right-0 sm:top-16 sm:bottom-0 sm:w-96 w-full max-h-[85vh] sm:max-h-none z-40 bg-white border-t sm:border-t-0 sm:border-l border-stone-200 shadow-2xl flex flex-col text-stone-900 transition-all duration-300">
      
      {/* Panel Header */}
      <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
        <div className="flex items-center gap-2">
          {selectedEvent ? (
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(selectedEvent) }}
            />
          ) : (
            <MapPin className="w-4 h-4 text-purple-600 shrink-0" />
          )}
          <span className="text-xs uppercase tracking-wider font-semibold text-purple-700/80">
            {selectedEvent ? selectedEvent.category : selectedPlace?.category || 'Lieu Biblique'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-200 transition"
          title="Fermer le panneau"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="p-5 overflow-y-auto flex-1 space-y-5">
        
        {/* EVENT DETAILS */}
        {selectedEvent && (
          <>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-950 leading-snug">
                {selectedEvent.text}
              </h2>
              
              {/* Date pill */}
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-stone-100 border border-stone-200 rounded-full text-xs font-medium text-purple-700">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {formatEventSpan(
                    selectedEvent.startYear,
                    selectedEvent.endYear,
                    selectedEvent.isPoint,
                    selectedEvent.fuzzyStart,
                    selectedEvent.fuzzyEnd
                  )}
                </span>
              </div>
            </div>

            {/* Base64 Icon or Image */}
            {selectedEvent.icon && (
              <div className="rounded-xl overflow-hidden border border-stone-200 bg-stone-50 p-3 text-center shadow-inner">
                <img
                  src={`data:image/png;base64,${selectedEvent.icon}`}
                  alt={selectedEvent.text}
                  referrerPolicy="no-referrer"
                  className="max-h-48 max-w-full mx-auto object-contain rounded-lg shadow"
                />
              </div>
            )}

            {/* Description */}
            {selectedEvent.description ? (
              <div className="bg-stone-100 p-4 rounded-xl border border-stone-200 text-sm text-stone-600 leading-relaxed font-sans">
                {selectedEvent.description}
              </div>
            ) : (
              <p className="text-xs italic text-stone-500">
                Aucune description supplémentaire spécifiée pour cet élément dans la chronologie.
              </p>
            )}

            {selectedEvent.biblicalReferences &&
              selectedEvent.biblicalReferences.length > 0 && (
                <div className="pt-2 border-t border-stone-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700/80 mb-2 flex items-center gap-1.5">
                    <Book className="w-3.5 h-3.5" />
                    <span>Références bibliques</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.biblicalReferences.map(reference => (
                      <span
                        key={reference}
                        className="text-xs px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-mono"
                      >
                        {reference}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Associated Places on Map */}
            {selectedEvent.associatedLocationIds && selectedEvent.associatedLocationIds.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700/80 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Lieux associés sur la carte</span>
                </h4>
                
                <div className="space-y-2">
                  {selectedEvent.associatedLocationIds.map(locId => {
                    const place = places.find(p => p.id === locId);
                    if (!place) return null;
                    return (
                      <div
                        key={place.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 transition group cursor-pointer"
                        onClick={() => {
                          onSelectPlace(place);
                          onSwitchTab('map');
                        }}
                      >
                        <div>
                          <div className="text-sm font-semibold text-stone-900 group-hover:text-purple-700 transition">
                            {place.name}
                          </div>
                          <div className="text-xs text-stone-500">
                            {place.territory || place.category}
                          </div>
                        </div>
                        <button
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-100 hover:bg-purple-600 text-purple-700 hover:text-white rounded transition"
                        >
                          <Compass className="w-3 h-3" />
                          <span>Voir carte</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* MAP PLACE DETAILS */}
        {!selectedEvent && selectedPlace && (
          <>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-950 leading-snug">
                {selectedPlace.name}
              </h2>
              {selectedPlace.alternateNames && selectedPlace.alternateNames.length > 0 && (
                <p className="text-xs text-stone-500 italic mt-0.5">
                  Aussi nommé : {selectedPlace.alternateNames.join(', ')}
                </p>
              )}

              {/* Category & Territory */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {selectedPlace.territory && (
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-100 text-purple-700">
                    Territoire : {selectedPlace.territory}
                  </span>
                )}
                {selectedPlace.category && (
                  <span className="px-2.5 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-600">
                    {selectedPlace.category}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm text-stone-600 leading-relaxed font-sans">
              {selectedPlace.description}
            </div>

            {/* Period */}
            {selectedPlace.periodDescription && (
              <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
                <Calendar className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-700">Période historique</div>
                  <div>{selectedPlace.periodDescription}</div>
                </div>
              </div>
            )}

            {/* Biblical Scriptures */}
            {selectedPlace.biblicalReferences && selectedPlace.biblicalReferences.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700/80 mb-2 flex items-center gap-1.5">
                  <Book className="w-3.5 h-3.5" />
                  <span>Références bibliques</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlace.biblicalReferences.map((ref, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-stone-700 font-mono"
                    >
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {linkedPlaceEvents.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700/80 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Événements associés</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {linkedPlaceEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => {
                        onSelectEvent(event);
                        onSwitchTab('timeline');
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border transition bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      {event.text}
                      <span className="ml-1 text-[10px] text-purple-600">➔ Frise</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {linkedPlaceCharacters.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700/80 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Personnages associés</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {linkedPlaceCharacters.map(character => (
                    <button
                      key={character.id}
                      onClick={() => {
                        onSelectEvent(character);
                        onSwitchTab('timeline');
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border transition bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      {character.text}
                      <span className="ml-1 text-[10px] text-purple-600">➔ Frise</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
