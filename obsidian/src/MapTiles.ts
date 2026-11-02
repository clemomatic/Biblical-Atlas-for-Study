import L from 'leaflet';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import { requestUrl, TFile, TFolder, type App } from 'obsidian';
import { MAP_ATTRIBUTION, MAX_DOWNLOAD_BYTES, tilesForRegion, type MapBounds, type TileCoordinate } from './tileMath';
import { validFolder } from './model';

interface TileSource { template: string; version: string; attribution: string; maxZoom: number }
export interface CachedRegion { id: string; name: string; bounds: MapBounds; maxZoom: number; total: number; completed: number; bytes: number; status: 'complete' | 'partial'; downloadedAt: string }
export interface MapCacheState { revision: number; regions: CachedRegion[]; busy: boolean; total: number; completed: number; bytes: number; message: string; error: string }

const USER_AGENT = 'AtlasBibliqueObsidian/0.2.0 (+https://github.com/clemomatic/Biblical-Atlas-for-Study)';
const ATTRIBUTION = '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a> · Natural Earth';

function drawVector(canvas: HTMLCanvasElement, buffer: ArrayBuffer, light: boolean, factor = 1, offsetX = 0, offsetY = 0): void {
  const context = canvas.getContext('2d'); if (!context) return;
  context.save(); context.setTransform(factor, 0, 0, factor, -offsetX * canvas.width, -offsetY * canvas.height);
  const tile = new VectorTile(new Pbf(new Uint8Array(buffer)));
  for (const name of ['landcover', 'landuse', 'water', 'waterway', 'building']) {
    const layer = tile.layers[name]; if (!layer) continue;
    const scale = canvas.width / layer.extent;
    for (let index = 0; index < layer.length; index++) {
      const feature = layer.feature(index);
      const category = String(feature.properties.class ?? '');
      const fill = name === 'water' ? '#b6dce8' : name === 'building' ? '#d7d1c8'
        : name === 'landcover' ? category === 'wood' ? '#c1d0b1' : '#dce1c7' : '#e9e5d9';
      context.beginPath();
      for (const ring of feature.loadGeometry()) ring.forEach((point, i) => { if (i === 0) context.moveTo(point.x * scale, point.y * scale); else context.lineTo(point.x * scale, point.y * scale); });
      if (feature.type === 3) { context.globalAlpha = name === 'water' ? 1 : light ? 0.9 : name === 'building' ? 0.45 : 0.28; context.fillStyle = fill; context.fill('evenodd'); }
      if (feature.type === 2 && name === 'waterway') { context.globalAlpha = 0.9; context.strokeStyle = '#8fc4db'; context.lineWidth = Math.max(0.6, canvas.width / 512); context.stroke(); }
    }
  }
  context.globalAlpha = 1;
  context.restore();
}

class DetailedTileLayer extends L.GridLayer {
  constructor(private service: MapTileCache, private online: boolean, private light: boolean) { super({ tileSize: 256, maxNativeZoom: 12, maxZoom: 19, minZoom: 0, pane: 'tilePane', attribution: ATTRIBUTION }); }
  createTile(coordinates: L.Coords, done: L.DoneCallback): HTMLElement {
    const canvas = document.createElement('canvas'); const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.height = 256 * ratio; canvas.style.width = canvas.style.height = '256px';
    void this.service.tileWithFallback({ ...coordinates, kind: 'vector' }, this.online).then(result => {
      if (result) { if (this.light) { const context = canvas.getContext('2d'); if (context) { context.fillStyle = '#f4f2ed'; context.fillRect(0,0,canvas.width,canvas.height); } } const factor = 2 ** (coordinates.z - result.z); drawVector(canvas, result.buffer, this.light, factor, coordinates.x - result.x * factor, coordinates.y - result.y * factor); }
      done(undefined, canvas);
    }).catch(() => done(undefined, canvas));
    return canvas;
  }
}
class ReliefTileLayer extends L.GridLayer {
  constructor(private service: MapTileCache, private online: boolean) { super({ tileSize: 256, maxNativeZoom: 6, maxZoom: 19, minZoom: 0, pane: 'tilePane' }); }
  createTile(coordinates: L.Coords, done: L.DoneCallback): HTMLElement {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const image = document.createElement('img'); image.alt = '';
    void this.service.tileWithFallback({ ...coordinates, kind: 'relief' }, this.online).then(result => {
      if (!result) { done(undefined, canvas); return; }
      const url = URL.createObjectURL(new Blob([result.buffer], { type: 'image/png' }));
      image.onload = () => { const factor = 2 ** (coordinates.z - result.z); canvas.getContext('2d')?.drawImage(image, -(coordinates.x - result.x * factor) * 256, -(coordinates.y - result.y * factor) * 256, 256 * factor, 256 * factor); URL.revokeObjectURL(url); done(undefined, canvas); };
      image.onerror = () => { URL.revokeObjectURL(url); done(undefined, canvas); };
      image.src = url;
    }).catch(() => done(undefined, canvas));
    return canvas;
  }
}

export class MapTileCache {
  private listeners = new Set<() => void>();
  private state: MapCacheState = { revision: 0, regions: [], busy: false, total: 0, completed: 0, bytes: 0, message: '', error: '' };
  private source: TileSource | null = null;
  private sourcePromise?: Promise<TileSource | null>;
  private activeRequests = 0;
  private waiters: Array<() => void> = [];
  private pending = new Map<string, Promise<ArrayBuffer | null>>();
  private cancelled = false;
  private disposed = false;
  constructor(private app: App, private folder: string) { validFolder(folder); }
  getSnapshot = (): MapCacheState => this.state;
  subscribe = (callback: () => void): (() => void) => { this.listeners.add(callback); return () => this.listeners.delete(callback); };
  private publish(change: Partial<MapCacheState>): void { this.state = { ...this.state, ...change }; this.listeners.forEach(callback => callback()); }
  private path(relative: string): string { return `${validFolder(this.folder)}/Cartes/${relative}`; }
  private async ensureFolder(path: string): Promise<void> {
    let current = '';
    for (const part of path.split('/')) {
      current = current ? `${current}/${part}` : part;
      const file = this.app.vault.getAbstractFileByPath(current);
      if (file instanceof TFolder) continue; if (file) throw new Error('Un fichier occupe le dossier des cartes.');
      try { await this.app.vault.createFolder(current); } catch (error) { if (!(this.app.vault.getAbstractFileByPath(current) instanceof TFolder)) throw error; }
    }
  }
  private async writeJson(relative: string, value: unknown): Promise<void> {
    const path = this.path(relative); await this.ensureFolder(path.slice(0,path.lastIndexOf('/')));
    const content = JSON.stringify(value, null, 2); const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) await this.app.vault.process(existing, () => content); else await this.app.vault.create(path, content);
  }
  private async readJson(relative: string): Promise<any> {
    const file = this.app.vault.getAbstractFileByPath(this.path(relative));
    return file instanceof TFile ? JSON.parse(await this.app.vault.cachedRead(file)) : null;
  }
  async load(): Promise<void> {
    try {
      const source = await this.readJson('source.json');
      if (source?.atlas_map_cache === 1 && typeof source.template === 'string' && /^https:\/\/tiles\.openfreemap\.org\//.test(source.template) && /^[a-z0-9-]+$/i.test(source.version)) this.source = source;
      const regions = await this.readJson('regions.json');
      if (regions?.atlas_map_cache === 1 && Array.isArray(regions.regions)) this.publish({ regions: regions.regions });
    } catch { this.publish({ error: 'Un fichier de cartes est invalide. Le fond simplifié reste disponible.' }); }
  }
  private async network<T>(task: () => Promise<T>): Promise<T> {
    if (this.activeRequests >= 4) await new Promise<void>(resolve => this.waiters.push(resolve));
    else this.activeRequests++;
    try { if (this.disposed) throw new Error('Plugin fermé.'); return await task(); }
    finally { const next = this.waiters.shift(); if (next) next(); else this.activeRequests--; }
  }
  private async getSource(online: boolean): Promise<TileSource | null> {
    if (this.source) return this.source; if (!online || this.disposed) return null;
    if (!this.sourcePromise) this.sourcePromise = this.network(async () => {
      const response = await requestUrl({ url: 'https://tiles.openfreemap.org/planet', headers: { 'User-Agent': USER_AGENT }, throw: false });
      if (response.status !== 200) throw new Error(`Le serveur cartographique répond ${response.status}.`);
      const json = response.json; const template = json.tiles?.[0];
      if (typeof template !== 'string' || !/^https:\/\/tiles\.openfreemap\.org\//.test(template) || !template.includes('{z}')) throw new Error('La source cartographique ne fournit pas de tuiles valides.');
      let hash = 2166136261; for (const character of template) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      this.source = { template, version: `ofm-${(hash >>> 0).toString(36)}`, attribution: MAP_ATTRIBUTION, maxZoom: Math.min(12, json.maxzoom ?? 12) };
      await this.writeJson('source.json', { atlas_map_cache: 1, ...this.source }); return this.source;
    }).catch(error => { this.sourcePromise = undefined; this.publish({ error: error instanceof Error ? error.message : 'Connexion aux cartes impossible.' }); throw error; });
    return this.sourcePromise;
  }
  async tile(coordinates: TileCoordinate, online: boolean): Promise<ArrayBuffer | null> {
    const n = 2 ** coordinates.z; const x = ((coordinates.x % n) + n) % n;
    if (coordinates.y < 0 || coordinates.y >= n) return null;
    const source = coordinates.kind === 'vector' ? await this.getSource(online) : null;
    if (coordinates.kind === 'vector' && !source) return null;
    const version = coordinates.kind === 'vector' ? source!.version : 'natural-earth-2';
    const path = this.path(`tiles/${version}/${coordinates.z}/${x}/${coordinates.y}.${coordinates.kind === 'vector' ? 'pbf' : 'png'}`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) return this.app.vault.readBinary(existing);
    if (!online || this.disposed) return null;
    if (this.pending.has(path)) return this.pending.get(path)!;
    const operation = this.network(async () => {
      const url = coordinates.kind === 'vector' ? source!.template.replace('{z}', String(coordinates.z)).replace('{x}', String(x)).replace('{y}', String(coordinates.y))
        : `https://tiles.openfreemap.org/natural_earth/ne2sr/${coordinates.z}/${x}/${coordinates.y}.png`;
      const response = await requestUrl({ url, headers: { 'User-Agent': USER_AGENT }, throw: false });
      if (response.status !== 200 && !(coordinates.kind === 'vector' && response.status === 204)) throw new Error(`Une tuile n’a pas pu être chargée (${response.status}). Le fond simplifié reste disponible.`);
      const data = response.arrayBuffer;
      if ((coordinates.kind === 'relief' && !data.byteLength) || data.byteLength > 5_000_000) throw new Error('Une tuile reçue est invalide ou trop volumineuse.');
      if (coordinates.kind === 'vector') new VectorTile(new Pbf(new Uint8Array(data)));
      else if (new Uint8Array(data)[0] !== 137) throw new Error('Le serveur n’a pas renvoyé une image de carte.');
      if (this.disposed) return data;
      await this.ensureFolder(path.slice(0,path.lastIndexOf('/')));
      if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFile)) await this.app.vault.createBinary(path, data);
      return data;
    }).catch(error => { this.publish({ error: error instanceof Error ? error.message : 'Une tuile est indisponible.' }); throw error; }).finally(() => this.pending.delete(path));
    this.pending.set(path, operation); return operation;
  }
  async tileWithFallback(coordinates: TileCoordinate, online: boolean): Promise<({ buffer: ArrayBuffer } & TileCoordinate) | null> {
    try { const buffer = await this.tile(coordinates, online); if (buffer) return { ...coordinates, buffer }; } catch { /* Display cached parent tiles when the network fails. */ }
    for (let z = coordinates.z - 1; z >= 0; z--) {
      const factor = 2 ** (coordinates.z - z); const parent = { kind: coordinates.kind, z, x: Math.floor(coordinates.x / factor), y: Math.floor(coordinates.y / factor) };
      const buffer = await this.tile(parent, false); if (buffer) return { ...parent, buffer };
    }
    return null;
  }
  createLayer = (style: 'natural-relief' | 'light-map', online: boolean): L.Layer => {
    return L.layerGroup([...(style === 'natural-relief' ? [new ReliefTileLayer(this, online)] : []), new DetailedTileLayer(this, online, style === 'light-map')]);
  };
  async download(name: string, bounds: MapBounds, zoom: number): Promise<void> {
    if (this.state.busy) throw new Error('Un téléchargement est déjà en cours.');
    const tiles = tilesForRegion(bounds, zoom); this.cancelled = false;
    this.publish({ busy: true, total: tiles.length, completed: 0, bytes: 0, message: `Téléchargement de ${name}`, error: '' });
    let cursor = 0, completed = 0, bytes = 0, error = '';
    try {
      await this.getSource(true);
      const worker = async () => {
        while (cursor < tiles.length && !this.cancelled && !this.disposed) {
          const tile = tiles[cursor++];
          try {
            const data = await this.tile(tile, true);
            if (data) bytes += data.byteLength;
            if (bytes > MAX_DOWNLOAD_BYTES - 15_000_000) { this.cancelled = true; error = 'La limite de taille est atteinte. Choisis une zone plus petite pour compléter le téléchargement.'; }
            completed++; this.publish({ completed, bytes });
          } catch (cause) { this.cancelled = true; error = cause instanceof Error ? cause.message : 'Téléchargement interrompu.'; }
        }
      };
      await Promise.all([worker(),worker(),worker()]);
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Connexion aux cartes impossible.'; }
    finally {
      const region: CachedRegion = { id: crypto.randomUUID(), name, bounds, maxZoom: zoom, total: tiles.length, completed, bytes, status: completed === tiles.length && !error ? 'complete' : 'partial', downloadedAt: new Date().toISOString() };
      const regions = [...this.state.regions, region];
      try { if (!this.disposed) await this.writeJson('regions.json', { atlas_map_cache: 1, attribution: MAP_ATTRIBUTION, regions }); } catch (cause) { error ||= 'Les tuiles sont conservées, mais le bilan du téléchargement n’a pas pu être enregistré.'; }
      this.publish({ busy: false, regions, revision: this.state.revision + 1, message: region.status === 'complete' ? 'Zone disponible hors connexion.' : 'Téléchargement partiel ; les tuiles reçues sont conservées.', error });
    }
  }
  cancel = (): void => { this.cancelled = true; };
  async clear(): Promise<void> {
    if (this.state.busy || this.pending.size) throw new Error('Termine les chargements de cartes avant de vider les téléchargements.');
    const prefix = this.path('tiles/');
    for (const file of this.app.vault.getFiles()) if (file.path.startsWith(prefix) && /\.(pbf|png)$/.test(file.path)) await this.app.vault.trash(file, true);
    await this.writeJson('regions.json', { atlas_map_cache: 1, regions: [] });
    this.publish({ regions: [], completed: 0, bytes: 0, message: 'Cartes téléchargées retirées.', error: '', revision: this.state.revision + 1 });
  }
  dispose(): void { this.cancelled = true; this.disposed = true; this.listeners.clear(); }
}
