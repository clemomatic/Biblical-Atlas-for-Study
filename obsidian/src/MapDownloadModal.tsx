import { useMemo, useState, useSyncExternalStore } from 'react';
import type { App } from 'obsidian';
import { ReactAtlasModal } from './editor';
import type { MapTileCache } from './MapTiles';
import { MAP_PRESETS, tilesForRegion, type MapBounds } from './tileMath';

function Downloads({ service, viewport, close }: { service: MapTileCache; viewport?: MapBounds; close: () => void }) {
  const state = useSyncExternalStore(service.subscribe, service.getSnapshot);
  const [preset, setPreset] = useState(viewport ? 'viewport' : 'promised');
  const [bounds, setBounds] = useState<MapBounds>(viewport ?? MAP_PRESETS.promised.bounds);
  const [zoom, setZoom] = useState(viewport ? 9 : MAP_PRESETS.promised.zoom);
  const [error, setError] = useState('');
  const estimate = useMemo(() => { try { return { count: tilesForRegion(bounds, zoom).length, error: '' }; } catch (error) { return { count: 0, error: error instanceof Error ? error.message : 'Zone invalide.' }; } }, [bounds, zoom]);
  const choose = (id: string) => { setPreset(id); if (id === 'viewport' && viewport) setBounds(viewport); else if (MAP_PRESETS[id]) { setBounds(MAP_PRESETS[id].bounds); setZoom(MAP_PRESETS[id].zoom); } };
  return <section className="ae-shell"><header><div><span className="ae-kicker">PRÉPARER SON ÉTUDE SANS CONNEXION</span><h2>Cartes hors connexion</h2></div><button type="button" className="ae-icon" aria-label="Fermer les cartes hors connexion" onClick={close}>×</button></header>
    <div className="ae-scroll"><p className="ae-help">Télécharge une zone une fois, puis retrouve son relief et ses détails géographiques sans réseau. Les fichiers sont conservés dans ton coffre. Le fond simplifié reste inclus partout ailleurs.</p>
      <label className="ae-field"><span>Zone à télécharger</span><select aria-label="Zone à télécharger" value={preset} disabled={state.busy} onChange={event => choose(event.target.value)}>{viewport && <option value="viewport">Zone affichée sur la carte</option>}{Object.entries(MAP_PRESETS).map(([id, value]) => <option key={id} value={id}>{value.name}</option>)}<option value="custom">Zone personnalisée</option></select></label>
      <div className="ae-grid">{(['west','east','south','north'] as const).map(key => <label key={key} className="ae-field"><span>{{west:'Ouest',east:'Est',south:'Sud',north:'Nord'}[key]}</span><input aria-label={{west:'Ouest',east:'Est',south:'Sud',north:'Nord'}[key]} type="number" step="any" disabled={state.busy} value={bounds[key]} onChange={event => { setPreset('custom'); setBounds(previous => ({ ...previous, [key]: Number(event.target.value) })); }} /></label>)}</div>
      <label className="ae-field"><span>Niveau de détail</span><select aria-label="Niveau de détail" value={zoom} disabled={state.busy} onChange={event => setZoom(Number(event.target.value))}>{[5,6,7,8,9,10,11,12].map(level => <option key={level} value={level}>{level < 8 ? 'Vue régionale' : level < 11 ? 'Étude locale' : 'Détail rapproché'} · {level}</option>)}</select></label>
      <p className="ae-help">{estimate.error || `${estimate.count} tuiles prévues. La taille réelle dépend de la zone.`} Le téléchargement est limité à 3 000 tuiles et 50 Mo ; le service arrête la préparation avant la limite de taille.</p>
      {state.busy ? <div><progress aria-label="Progression du téléchargement" max={Math.max(1,state.total)} value={state.completed} style={{width:'100%'}} /><p>{state.completed} / {state.total} tuiles · {(state.bytes/1_000_000).toFixed(1)} Mo</p><button className="ae-button" type="button" onClick={service.cancel}>Arrêter le téléchargement</button></div>
        : <button className="ae-button ae-primary" type="button" disabled={Boolean(estimate.error)} onClick={() => { setError(''); void service.download(preset === 'viewport' ? 'Zone affichée' : MAP_PRESETS[preset]?.name ?? 'Zone personnalisée', bounds, zoom).catch(error => setError(String(error))); }}>Télécharger cette zone</button>}
      {state.message && <p role="status" className="ae-help">{state.message}</p>}{(error || state.error) && <p role="alert" className="ae-error">{error || state.error}</p>}
      <h3>Zones préparées</h3>{!state.regions.length && <p className="ae-help">Aucune zone téléchargée pour le moment.</p>}{state.regions.map(region => <article className="ae-manager-row" key={region.id}><div><strong>{region.name}</strong><small>{region.status === 'complete' ? 'Disponible hors connexion' : 'Téléchargement partiel'} · {region.completed}/{region.total} tuiles · {(region.bytes/1_000_000).toFixed(1)} Mo · détail {region.maxZoom}</small></div></article>)}
      {state.regions.length > 0 && <button className="ae-button" type="button" disabled={state.busy} onClick={() => { void service.clear().catch(error => setError(error instanceof Error ? error.message : 'Impossible de retirer les cartes.')); }}>Retirer les cartes téléchargées</button>}
      <p className="ae-help">Données géographiques actuelles : OpenFreeMap, OpenMapTiles et OpenStreetMap. Relief : Natural Earth. Le zoom peut agrandir une tuile téléchargée ; il ne crée pas de détail supplémentaire.</p>
    </div></section>;
}
export class MapDownloadModal extends ReactAtlasModal {
  constructor(app: App, private service: MapTileCache, private viewport?: MapBounds) { super(app); }
  onOpen(): void { this.mount().render(<Downloads service={this.service} viewport={this.viewport} close={() => this.close()} />); }
}
