import { PROMISED_LAND_PLACES } from '../../src/data/promisedLandPlaces';
import { MAP_FALLBACK, normalizeSearch, type MapLocation } from './bibleLabData';

/**
 * Offline catalogue from the Atlas's own reviewed mapping of the
 * official « La Terre promise » (Voyez le bon pays, pp. 18–19).
 * No new historical or geographical claim is made.
 *
 * Keep the Atlas dataset separate from the lightweight pure reference
 * functions so those helpers can run in Node tests without Vite.
 */
const atlasEntries:MapLocation[]=PROMISED_LAND_PLACES
  .filter(place=>Array.isArray(place.mapReferences)&&place.mapReferences.length>0)
  .map(place=>({
    name:place.name,
    pages:[18],
    coordinates:'p. 18–19 · '+place.mapReferences!.join(' ; ')
  }));

export const OFFLINE_MAP_INDEX:MapLocation[]=[...new Map(
  [...atlasEntries,...MAP_FALLBACK].map(entry=>[normalizeSearch(entry.name),entry])
).values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
