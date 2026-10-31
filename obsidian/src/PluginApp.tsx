import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, BookOpen, CalendarDays, ChevronRight, Download, Link2, MapPin, Move, Network, NotebookPen, Pencil, Plus, Search, Settings2, X } from 'lucide-react';
import App from '../../src/App';
import type { AtlasIntegration, AtlasNavigationState, AtlasOfflineBackground, AtlasSelection } from '../../src/atlasIntegration';
import offlineLand from '../data/land.json';
import offlineLakes from '../data/lakes.json';
import { PERSONAL_CATEGORY } from './model';
import type { AtlasHost } from './host';
import { ageAtCursor, dateFromPosition, type ProbeDate } from './ages';
import { AgeProbe } from './AgeProbe';
import { workspaceSnapshot } from './snapshot';

const EXTRA_CATEGORIES = [PERSONAL_CATEGORY];
const OFFLINE_BACKGROUND = { land: offlineLand, lakes: offlineLakes } as unknown as AtlasOfflineBackground;

export function PluginApp({ host, initialState, navigation, onNavigate }: {
  host: AtlasHost;
  initialState: AtlasNavigationState;
  navigation?: AtlasIntegration['navigation'];
  onNavigate: (state: AtlasNavigationState) => void;
}) {
  const snapshot = useSyncExternalStore(host.subscribe, host.getSnapshot);
  const mapCache = useSyncExternalStore(host.maps.subscribe, host.maps.getSnapshot);
  const [selection, setSelection] = useState<AtlasSelection | null>(null);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [query, setQuery] = useState('');
  const [basket, setBasket] = useState<AtlasSelection[]>([]);
  const [activeView, setActiveView] = useState(initialState.activeTab);
  const [isMapEditing, setIsMapEditing] = useState(false);
  const [ageViewport, setAgeViewport] = useState(initialState.visiblePeriod);
  const [pinnedAgeDate, setPinnedAgeDate] = useState<ProbeDate | null>(null);
  const setPinnedAgePosition = useCallback((position: number) => setPinnedAgeDate(dateFromPosition(position)), []);
  const catalog = snapshot.atlas.catalog;
  const handleNavigate = useCallback((state: AtlasNavigationState) => { setActiveView(state.activeTab); setAgeViewport(previous => previous?.startYear === state.visiblePeriod?.startYear && previous?.endYear === state.visiblePeriod?.endYear ? previous : state.visiblePeriod); onNavigate(state); }, [onNavigate]);
  const ageDate = useMemo(() => pinnedAgeDate ?? dateFromPosition(selection?.type === 'event' ? (selection.entity as import('../../src/types').EventData).startPos : ageViewport ? (ageViewport.startYear + ageViewport.endYear) / 2 : -1100), [pinnedAgeDate, selection, ageViewport]);
  const ages = useMemo(() => new Map(snapshot.atlas.dataset.people.map(person => [person.id, ageAtCursor(person, ageDate)])), [snapshot.atlas.dataset.people, ageDate]);
  const ageProbe = useMemo(() => ({ position: ageDate.position, dateLabel: ageDate.label, ages, onPosition: setPinnedAgePosition }), [ageDate, ages]);
  const snapshotForPeriod = useCallback((period: import('../../src/domain/history/types').TemporalSpan) => workspaceSnapshot(snapshot.atlas, period), [snapshot.atlas]);
  const mapTiles = useMemo(() => ({ revision: mapCache.revision, createLayer: (style: 'natural-relief' | 'light-map') => host.maps.createLayer(style, snapshot.settings.allowOnlineMaps) }), [host, mapCache.revision, snapshot.settings.allowOnlineMaps]);
  const updateSelection = useCallback((next: AtlasSelection | null) => {
    setSelection(previous => previous?.key === next?.key && previous?.entity === next?.entity ? previous : next);
  }, []);
  const integration = useMemo<AtlasIntegration>(() => ({ initialState, navigation,
    dataset: snapshot.atlas.dataset, categories: EXTRA_CATEGORIES, replaceHistoricalRoads: true,
    mapEditing: isMapEditing && activeView === 'map' ? host.mapActions : undefined,
    mapTiles, onMapViewport: host.setMapViewport, ageProbe, snapshotForPeriod,
    allowOnlineMaps: snapshot.settings.allowOnlineMaps, offlineBackground: OFFLINE_BACKGROUND, onNavigate: handleNavigate, onSelectionChange: updateSelection,
    linkForSelection: host.linkForSelection, renderMarkdown: host.renderMarkdown
  }), [initialState, navigation, snapshot.atlas, snapshot.settings.allowOnlineMaps, handleNavigate, updateSelection, host, isMapEditing, activeView, mapTiles, ageProbe, snapshotForPeriod]);

  const linkedNotes = useMemo(() => selection ? snapshot.notes.filter(note => note.keys.includes(selection.key)) : [], [snapshot.notes, selection?.key]);
  const displayedNotes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('fr');
    const notes = selection && !showAllNotes ? linkedNotes : snapshot.notes;
    return notes.filter(note => !needle || `${note.title} ${note.path}`.toLocaleLowerCase('fr').includes(needle));
  }, [query, selection?.key, showAllNotes, linkedNotes, snapshot.notes]);
  const pinned = selection && basket.some(item => item.key === selection.key);
  const openKey = (key: AtlasSelection['key']) => {
    host.openEntity(key);
    setIsNotebookOpen(false);
  };
  const addToBasket = () => {
    if (selection) setBasket(previous => previous.some(item => item.key === selection.key) ? previous.filter(item => item.key !== selection.key) : previous.length < 12 ? [...previous, selection] : previous);
  };
  return (
    <div className="atlas-plugin-shell">
      <header className="atlas-vault-toolbar" aria-label="Mon étude biblique">
        <div className="atlas-vault-context">
          <span className="atlas-vault-monogram" aria-hidden="true"><NotebookPen size={19} /></span>
          <div><span className="atlas-vault-eyebrow">MON ESPACE D’ÉTUDE</span>
            <p>{selection ? selection.title : 'Chaque découverte peut devenir une piste.'}</p></div>
        </div>
        <div className="atlas-vault-actions">
          {selection && <button type="button" className="atlas-vault-button" onClick={() => host.openEntityNote(selection)}><BookOpen size={16} /><span>Note d’étude</span></button>}
          {selection && <button type="button" className="atlas-vault-button" onClick={() => host.editEntity(selection)}><Pencil size={16} /><span>Modifier</span></button>}
          <button type="button" className={`atlas-vault-button ${isNotebookOpen ? 'is-active' : ''}`} aria-expanded={isNotebookOpen} aria-controls="atlas-personal-notebook" onClick={() => setIsNotebookOpen(open => !open)}><NotebookPen size={16} /><span>Mon carnet</span><span className="atlas-vault-count">{snapshot.notes.length}</span></button>
          {activeView === 'map' && <button type="button" className={`atlas-vault-button ${isMapEditing ? 'is-active' : ''}`} aria-label={isMapEditing ? 'Terminer la modification de la carte' : 'Modifier la carte'} aria-pressed={isMapEditing} onClick={() => { setIsMapEditing(value => !value); setIsNotebookOpen(false); }}><Move size={16} /></button>}
          <button type="button" className="atlas-vault-button" aria-label="Gérer toutes les fiches" title="Gérer toutes les fiches" onClick={host.manageAtlas}><Settings2 size={16} /></button>
          <button type="button" className="atlas-vault-button" aria-label="Cartes hors connexion" title="Cartes hors connexion" onClick={host.openMapDownloads}><Download size={16} /></button>
        </div>
      </header>
      {activeView === 'timeline' && <AgeProbe date={ageDate} ages={ages} people={snapshot.atlas.dataset.people} selection={selection} pinned={pinnedAgeDate !== null} onDate={setPinnedAgeDate} onFollow={() => setPinnedAgeDate(null)} onPerson={id => host.openEntity(`person:${id}`)} />}
      {activeView === 'map' && mapCache.error && <div className="atlas-map-edit-banner"><span>{mapCache.error}</span><button type="button" onClick={host.openMapDownloads}>Cartes hors connexion</button></div>}
      {isMapEditing && activeView === 'map' && <div className="atlas-map-edit-banner"><span><strong>Édition de la carte</strong> · Déplace les repères. Pour une route sélectionnée, déplace les étapes, clique pour en ajouter ou fais un appui long pour en retirer.</span><button type="button" onClick={() => setIsMapEditing(false)}>Terminer</button></div>}
      <div className="atlas-plugin-workspace">
        <App integration={integration} />
        {isNotebookOpen && <aside id="atlas-personal-notebook" className="atlas-notebook" aria-label="Mon carnet d’étude">
          <div className="atlas-notebook-heading"><div><span className="atlas-vault-eyebrow">DES QUESTIONS AUX DÉCOUVERTES</span><h2>Mon carnet d’étude</h2></div>
            <button type="button" className="atlas-vault-icon" aria-label="Fermer le carnet" onClick={() => setIsNotebookOpen(false)}><X size={18} /></button></div>
          <p className="atlas-notebook-intro">Tes observations, tes versets, tes liens. Un carnet qui grandit avec ton étude.</p>
          <button type="button" className="atlas-vault-button atlas-vault-primary" onClick={() => host.newResearch(selection ? [selection.key] : [])}><Plus size={17} />Nouvelle recherche</button>
          {selection && <div className="atlas-notebook-context"><span className="atlas-vault-eyebrow">AUTOUR DE CETTE FICHE</span><strong>{selection.title}</strong><div className="atlas-notebook-inline">
            <button type="button" className="atlas-vault-button" onClick={() => host.editEntity(selection)}><Pencil size={14} />Modifier la fiche</button>
            <button type="button" className="atlas-vault-button" onClick={() => host.linkNote(selection)}><Link2 size={14} />Relier une note</button>
            <button type="button" className="atlas-vault-button" onClick={addToBasket} disabled={!pinned && basket.length >= 12}><Plus size={14} />{pinned ? 'Retirer du tableau' : 'Garder pour l’enquête'}</button>
          </div></div>}
          {(basket.length > 0 || selection) && <div className="atlas-investigation-box"><Network size={21} /><div><strong>Relie les indices</strong><p>{basket.length ? `${basket.length} fiche${basket.length > 1 ? 's' : ''} retenue${basket.length > 1 ? 's' : ''} pour ton enquête.` : 'Transforme cette fiche en tableau d’enquête.'}</p></div>
            <button type="button" className="atlas-vault-icon" aria-label="Créer une enquête Canvas" onClick={() => host.newInvestigation(basket.length ? basket : selection ? [selection] : [])}><ChevronRight size={20} /></button>
          </div>}
          {basket.length > 0 && <div className="atlas-basket">{basket.map(item => <button key={item.key} type="button" title="Retirer de l’enquête" onClick={() => setBasket(previous => previous.filter(candidate => candidate.key !== item.key))}>{item.title}<X size={12} /></button>)}</div>}
          <div className="atlas-notebook-search"><Search size={16} /><input aria-label="Rechercher dans mon carnet" placeholder="Retrouver une recherche…" value={query} onChange={event => setQuery(event.target.value)} /></div>
          {selection && <div className="atlas-notebook-tabs" role="group" aria-label="Filtrer les notes"><button type="button" aria-pressed={!showAllNotes} onClick={() => setShowAllNotes(false)}>Cette fiche · {linkedNotes.length}</button><button type="button" aria-pressed={showAllNotes} onClick={() => setShowAllNotes(true)}>Tout le carnet</button></div>}
          <div className="atlas-notebook-list" aria-live="polite">
            {displayedNotes.map(note => <article key={note.path} className="atlas-note-card">
              <button type="button" className="atlas-note-title" onClick={() => host.openNote(note.path)}><span>{note.kind === 'place' ? <MapPin size={16} /> : note.kind === 'event' ? <CalendarDays size={16} /> : <NotebookPen size={16} />}{note.title}</span><ArrowUpRight size={16} /></button>
              <p className="atlas-note-path">{note.path}</p>
              <div className="atlas-note-links">{note.keys.map(key => { const item = catalog.get(key); return item ? <button key={key} type="button" onClick={() => openKey(key)}>{item.title}</button> : <span key={key} title={key}>Lien à vérifier</span>; })}</div>
              {note.warnings.map(warning => <p key={warning} className="atlas-note-warning">{warning}</p>)}
            </article>)}
            {!displayedNotes.length && <div className="atlas-notebook-empty"><NotebookPen size={30} /><h3>Commence par un détail.</h3><p>{query ? 'Aucune recherche ne correspond à ce titre.' : selection ? 'Qu’est-ce qui t’intrigue dans cette fiche ? Crée une recherche ou relie une note existante.' : 'Choisis un personnage, un lieu ou un événement, puis note la question qu’il t’inspire.'}</p></div>}
          </div>
          <footer className="atlas-notebook-footer">Tes recherches sont des notes Obsidian. Elles restent à toi.</footer>
        </aside>}
      </div>
      {selection && <div className="atlas-selection-bar"><span><span className="atlas-selection-dot" />{linkedNotes.length ? `${linkedNotes.length} note${linkedNotes.length > 1 ? 's' : ''} reliée${linkedNotes.length > 1 ? 's' : ''}` : 'Une piste à explorer'}</span><div>
        <button type="button" onClick={() => host.linkNote(selection)}><Link2 size={15} /><span>Relier</span></button>
        <button type="button" onClick={addToBasket} aria-pressed={Boolean(pinned)} disabled={!pinned && basket.length >= 12}><Plus size={15} /><span>{pinned ? 'Retenue' : 'Retenir'}</span></button>
        <button type="button" onClick={() => host.newInvestigation(basket.length ? basket : [selection])}><Network size={15} /><span>Enquête{basket.length ? ` · ${basket.length}` : ''}</span></button>
      </div></div>}
    </div>
  );
}
