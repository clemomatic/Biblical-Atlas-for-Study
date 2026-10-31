export interface MapBounds { west: number; south: number; east: number; north: number }
export interface TileCoordinate { z: number; x: number; y: number; kind: 'vector' | 'relief' }
export const MAX_DOWNLOAD_TILES = 3000;
export const MAX_DOWNLOAD_BYTES = 50_000_000;
export const MAP_ATTRIBUTION = 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors · Natural Earth';
export const MAP_PRESETS: Record<string, { name: string; bounds: MapBounds; zoom: number }> = {
  promised: { name: 'Terre promise', bounds: { west: 34, south: 29, east: 36.8, north: 34 }, zoom: 10 },
  exodus: { name: 'Égypte et Sinaï', bounds: { west: 29, south: 27, east: 36, north: 32 }, zoom: 9 },
  mediterranean: { name: 'Méditerranée et Proche-Orient', bounds: { west: -7, south: 21, east: 56, north: 46 }, zoom: 7 }
};
export function validateBounds(bounds: MapBounds): void {
  if (Object.values(bounds).some(value => !Number.isFinite(value)) || bounds.west < -180 || bounds.east > 180 || bounds.south < -85 || bounds.north > 85 || bounds.west >= bounds.east || bounds.south >= bounds.north) throw new Error('La zone attend des coordonnées valides, avec l’ouest avant l’est et le sud avant le nord.');
}
export function tilesForRegion(bounds: MapBounds, maxZoom: number): TileCoordinate[] {
  validateBounds(bounds);
  if (!Number.isInteger(maxZoom) || maxZoom < 3 || maxZoom > 12) throw new Error('Choisis un niveau de détail entre 3 et 12.');
  const tiles: TileCoordinate[] = [];
  const append = (kind: TileCoordinate['kind'], z: number) => {
    const n = 2 ** z;
    const x = (longitude: number) => Math.max(0, Math.min(n - 1, Math.floor((longitude + 180) / 360 * n)));
    const y = (latitude: number) => { const radians = latitude * Math.PI / 180; return Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * n))); };
    const fromX = x(bounds.west), toX = x(bounds.east), fromY = y(bounds.north), toY = y(bounds.south);
    if (tiles.length + (toX - fromX + 1) * (toY - fromY + 1) > MAX_DOWNLOAD_TILES) throw new Error('Cette zone dépasse 3 000 tuiles. Réduis la zone ou le niveau de détail.');
    for (let column = fromX; column <= toX; column++) for (let row = fromY; row <= toY; row++) tiles.push({ kind, z, x: column, y: row });
  };
  for (let z = 0; z <= Math.min(maxZoom, 6); z++) append('relief', z);
  for (let z = 0; z <= maxZoom; z++) append('vector', z);
  return tiles;
}
