import { useMemo, useState, useSyncExternalStore } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {STUDY_DESK_CSS} from './studyDeskBrand';
import { Modal, type App } from 'obsidian';
import type { AtlasEntityKey, AtlasEntityType, AtlasSelection } from '../../src/atlasIntegration';
import type { AtlasWorkspace } from './catalog';
import type { AtlasHost } from './host';
import { CATEGORIES } from '../../src/data/erasData';
import { PERSONAL_CATEGORY } from './model';
import { cloneEntity, ENTITY_LABELS, spanFromYears, validateEntity, type EditableEntity } from './editable';
import editorCss from './editor.css?inline';

const categories = [...CATEGORIES, PERSONAL_CATEGORY];
const listText = (value: unknown): string => Array.isArray(value) ? value.join('\n') : '';
const fromLines = (value: string): string[] => value.split('\n').map(line => line.trim()).filter(Boolean);
const optionalYear = (value: string): number | undefined => value.trim() ? Number(value) : undefined;
const typeOptions: AtlasEntityType[] = ['person', 'event', 'place', 'route'];

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return <label className="ae-field"><span>{label}</span>{children}{help && <small>{help}</small>}</label>;
}

function EntityForm({ selection, atlas, save, close, openNote }: {
  selection: AtlasSelection; atlas: AtlasWorkspace; save: (entity: EditableEntity) => Promise<void>; close: () => void; openNote?: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, any>>(() => { const entity = cloneEntity(selection.entity) as any; delete entity.personalization; return entity; });
  const [tab, setTab] = useState('fiche');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [relationType, setRelationType] = useState<AtlasEntityType>('place');
  const [relationQuery, setRelationQuery] = useState('');
  const [pointLimit, setPointLimit] = useState(20);
  const set = (key: string, value: unknown) => setDraft(previous => ({ ...previous, [key]: value }));
  const titleKey = selection.type === 'event' ? 'text' : 'name';
  const places = useMemo(() => [...atlas.catalog.values()].filter(item => item.type === 'place'), [atlas]);
  const switchTab = (next: string) => {
    try {
      if (tab === 'avance') setDraft(validateEntity(selection.type, JSON.parse(raw), selection.id) as any);
      if (next === 'avance') setRaw(JSON.stringify(draft, null, 2));
      setError(''); setTab(next);
    } catch (error) { setError(error instanceof Error ? error.message : 'Données invalides.'); }
  };
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const entity = validateEntity(selection.type, tab === 'avance' ? JSON.parse(raw) : draft, selection.id);
      await save(entity); close();
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };
  const routePoint = (index: number, patch: Record<string, unknown>) => set('points', draft.points.map((point: any, i: number) => i === index ? { ...point, ...patch } : point));
  const movePoint = (index: number, direction: number) => {
    const next = [...draft.points]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; set('points', next);
  };
  const relationField = (type: AtlasEntityType): string => type === 'person' ? selection.type === 'person' ? 'associatedPersonIds' : 'associatedCharacterIds'
    : type === 'place' ? selection.type === 'route' ? 'associatedPlaceIds' : 'associatedLocationIds'
      : type === 'event' ? 'associatedEventIds' : selection.type === 'place' ? 'routeIds' : 'associatedRouteIds';
  const relationResults = [...atlas.catalog.values()].filter(item => item.key !== selection.key && item.type === relationType && item.title.toLocaleLowerCase('fr').includes(relationQuery.toLocaleLowerCase('fr'))).slice(0, 20);
  return <section className="ae-shell">
    <header><div><span className="ae-kicker">ATLAS PERSONNALISABLE · {ENTITY_LABELS[selection.type]}</span><h2>Modifier la fiche</h2></div><button className="ae-icon" type="button" aria-label="Fermer l’éditeur" onClick={close}>×</button></header>
    <nav aria-label="Sections de l’éditeur">{[['fiche','Texte et dates'],['carte','Carte et étapes'],['liens','Liens et sources'],['avance','Données complètes']].map(([id, title]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => switchTab(id)}>{title}</button>)}</nav>
    <div className="ae-scroll">
      {tab === 'fiche' && <>
        <Field label="Titre"><input aria-label="Titre" value={draft[titleKey] ?? ''} onChange={event => { const title = event.target.value; setDraft(previous => ({ ...previous, [titleKey]: title, ...(selection.type === 'event' && previous.timelinePresentation ? { timelinePresentation: { ...previous.timelinePresentation, shortLabel: title } } : {}) })); }} /></Field>
        <Field label="Texte de la fiche" help="Le texte est également modifiable dans sa note Obsidian. Tu peux utiliser Markdown."><textarea aria-label="Texte de la fiche" rows={7} value={draft.description ?? ''} onChange={event => set('description', event.target.value)} /></Field>
        <Field label="Notes complémentaires"><textarea aria-label="Notes complémentaires" rows={3} value={draft.notes ?? ''} onChange={event => set('notes', event.target.value)} /></Field>
        <div className="ae-grid">
          <Field label="Degré de certitude"><select aria-label="Degré de certitude" value={draft.certainty ?? 'unknown'} onChange={event => set('certainty', event.target.value)}>{[['unknown','Non précisé'],['certain','Établi'],['probable','Probable'],['possible','Possible']].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
          {selection.type === 'event' && <Field label="Catégorie"><select aria-label="Catégorie" value={draft.categoryId} onChange={event => { const category = categories.find(category => category.id === event.target.value)!; setDraft(previous => ({ ...previous, categoryId: category.id, category: category.name })); }}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>}
        </div>
        <div className="ae-grid">
          <Field label={selection.type === 'person' ? 'Début de la vie' : 'Année de début'} help="Nombre négatif avant notre ère ; pas d’année zéro."><input aria-label="Année de début" type="number" value={selection.type === 'person' ? draft.lifeSpan?.start?.yearMin ?? draft.lifeSpan?.start?.yearMax ?? '' : draft.startYear ?? ''} onChange={event => {
            const year = optionalYear(event.target.value);
            if (selection.type === 'person') set('lifeSpan', spanFromYears(year, draft.lifeSpan?.end?.yearMax ?? draft.lifeSpan?.end?.yearMin));
            else setDraft(previous => ({ ...previous, startYear: year, ...(selection.type === 'event' ? { startRaw: `${year}-01-01`, temporalSpan: spanFromYears(year, previous.endYear) } : {}) }));
          }} /></Field>
          <Field label={selection.type === 'person' ? 'Fin de la vie' : 'Année de fin'}><input aria-label="Année de fin" type="number" value={selection.type === 'person' ? draft.lifeSpan?.end?.yearMax ?? draft.lifeSpan?.end?.yearMin ?? '' : draft.endYear ?? ''} onChange={event => {
            const year = optionalYear(event.target.value);
            if (selection.type === 'person') set('lifeSpan', spanFromYears(draft.lifeSpan?.start?.yearMin ?? draft.lifeSpan?.start?.yearMax, year));
            else setDraft(previous => ({ ...previous, endYear: year, ...(selection.type === 'event' ? { endRaw: `${year}-01-01`, temporalSpan: spanFromYears(previous.startYear, year) } : {}) }));
          }} /></Field>
        </div>
        <p className="ae-help">Les périodes détaillées, activités, illustrations et autres propriétés restent accessibles dans « Données complètes ».</p>
      </>}
      {tab === 'carte' && <>
        {selection.type === 'place' ? <>
          <div className="ae-grid"><Field label="Latitude"><input aria-label="Latitude" type="number" step="any" value={draft.coordinates?.[0] ?? ''} onChange={event => set('coordinates', [Number(event.target.value), draft.coordinates?.[1] ?? 0])} /></Field><Field label="Longitude"><input aria-label="Longitude" type="number" step="any" value={draft.coordinates?.[1] ?? ''} onChange={event => set('coordinates', [draft.coordinates?.[0] ?? 0, Number(event.target.value)])} /></Field></div>
          <div className="ae-grid"><Field label="Symbole"><select aria-label="Symbole" value={draft.mapCategory ?? 'biblical-site'} onChange={event => set('mapCategory', event.target.value)}>{Object.entries({ 'biblical-site':'Lieu biblique', 'ancient-city':'Centre antique', 'levitical-city':'Ville lévitique', 'refuge-city':'Ville de refuge', 'hebrew-scriptures':'Écritures hébraïques', 'greek-scriptures':'Écritures grecques', 'both-scriptures':'Les deux périodes', 'exodus-stage':'Étape de l’Exode', summit:'Sommet', wadi:'Oued', river:'Fleuve', spring:'Source', 'body-of-water':'Étendue d’eau' }).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Couleur du repère"><input aria-label="Couleur du repère" type="color" value={draft.mapColor ?? '#397b78'} onChange={event => set('mapColor', event.target.value)} /></Field></div>
          <Field label="Priorité d’affichage"><select aria-label="Priorité d’affichage" value={draft.mapLabelLevel ?? 'local'} onChange={event => set('mapLabelLevel', event.target.value)}>{[['major','Vue d’ensemble'],['regional','Régionale'],['study','Étude'],['local','Détail local']].map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
          <p className="ae-help">Le mode « Modifier la carte » permet aussi de déplacer ce repère directement.</p>
        </> : selection.type === 'route' ? <>
          <Field label="Couleur du tracé"><input aria-label="Couleur du tracé" type="color" value={draft.color} onChange={event => set('color', event.target.value)} /></Field>
          <div className="ae-section-title"><h3>Étapes de l’itinéraire</h3><span>{draft.points?.length ?? 0} étapes</span></div>
          {(draft.points ?? []).slice(0, pointLimit).map((point: any, index: number) => <article key={point.id ?? index} className="ae-point">
            <div className="ae-point-heading"><strong>Étape {index + 1}</strong><div><button type="button" aria-label={`Monter l’étape ${index + 1}`} disabled={index === 0} onClick={() => movePoint(index, -1)}>↑</button><button type="button" aria-label={`Descendre l’étape ${index + 1}`} disabled={index === draft.points.length - 1} onClick={() => movePoint(index, 1)}>↓</button><button type="button" aria-label={`Supprimer l’étape ${index + 1}`} onClick={() => set('points', draft.points.filter((_: any, i: number) => i !== index))}>×</button></div></div>
            <Field label="Nom de l’étape"><input aria-label={`Nom de l’étape ${index + 1}`} value={point.name} onChange={event => routePoint(index, { name: event.target.value })} /></Field>
            <div className="ae-grid"><Field label="Latitude"><input aria-label={`Latitude de l’étape ${index + 1}`} type="number" step="any" value={point.coordinates[0]} onChange={event => routePoint(index, { placeId: undefined, coordinates: [Number(event.target.value), point.coordinates[1]] })} /></Field><Field label="Longitude"><input aria-label={`Longitude de l’étape ${index + 1}`} type="number" step="any" value={point.coordinates[1]} onChange={event => routePoint(index, { placeId: undefined, coordinates: [point.coordinates[0], Number(event.target.value)] })} /></Field></div>
            <Field label="Associer à un lieu existant"><select aria-label={`Lieu de l’étape ${index + 1}`} value={point.placeId ?? ''} onChange={event => { const place = places.find(item => item.id === event.target.value); routePoint(index, place ? { placeId: place.id, coordinates: (place.entity as any).coordinates, name: place.title } : { placeId: undefined }); }}><option value="">Position indépendante</option>{places.map(place => <option key={place.key} value={place.id}>{place.title}</option>)}</select></Field>
          </article>)}
          {pointLimit < (draft.points?.length ?? 0) && <button className="ae-button" type="button" onClick={() => setPointLimit(limit => limit + 20)}>Afficher les étapes suivantes</button>}
          <button className="ae-button" type="button" onClick={() => { set('points', [...(draft.points ?? []), { id: crypto.randomUUID(), name: `Étape ${(draft.points?.length ?? 0) + 1}`, coordinates: [0, 0], stepNumber: (draft.points?.length ?? 0) + 1 }]); setPointLimit(Math.max(pointLimit, (draft.points?.length ?? 0) + 1)); }}>Ajouter une étape</button>
          <p className="ae-help">Sur la carte en mode édition, déplace les étapes, clique pour en ajouter et utilise un appui long ou le clic droit pour en retirer.</p>
        </> : <p className="ae-help">Pour situer cette fiche, relie-la à des lieux ou à des itinéraires dans « Liens et sources ».</p>}
      </>}
      {tab === 'liens' && <>
        <Field label="Références bibliques" help="Une référence par ligne."><textarea aria-label="Références bibliques" rows={4} value={listText(draft.biblicalReferences)} onChange={event => set('biblicalReferences', fromLines(event.target.value))} /></Field>
        <h3>Sources documentaires</h3>
        {(draft.sources ?? []).map((source: any, index: number) => <div className="ae-source" key={source.id ?? index}><Field label="Libellé"><input aria-label={`Source ${index + 1}`} value={source.label} onChange={event => set('sources', draft.sources.map((item: any, i: number) => i === index ? { ...item, label: event.target.value } : item))} /></Field><Field label="Adresse"><input aria-label={`Adresse de la source ${index + 1}`} value={source.url ?? ''} onChange={event => set('sources', draft.sources.map((item: any, i: number) => i === index ? { ...item, url: event.target.value } : item))} /></Field><button type="button" aria-label={`Retirer la source ${index + 1}`} onClick={() => set('sources', draft.sources.filter((_: any, i: number) => i !== index))}>×</button></div>)}
        <button className="ae-button" type="button" onClick={() => set('sources', [...(draft.sources ?? []), { id: crypto.randomUUID(), label: '', url: '' }])}>Ajouter une source</button>
        <h3>Fiches liées</h3>
        {typeOptions.map(type => <div className="ae-relations" key={type}><strong>{ENTITY_LABELS[type]}</strong>{(draft[relationField(type)] ?? []).map((id: string) => <button type="button" key={id} title="Retirer ce lien" onClick={() => set(relationField(type), draft[relationField(type)].filter((value: string) => value !== id))}>{atlas.all.get(`${type}:${id}`)?.title ?? id} ×</button>)}</div>)}
        <div className="ae-grid"><Field label="Type de fiche à relier"><select aria-label="Type de fiche à relier" value={relationType} onChange={event => setRelationType(event.target.value as AtlasEntityType)}>{typeOptions.map(type => <option key={type} value={type}>{ENTITY_LABELS[type]}</option>)}</select></Field><Field label="Chercher une fiche"><input aria-label="Chercher une fiche à relier" value={relationQuery} onChange={event => setRelationQuery(event.target.value)} /></Field></div>
        <div className="ae-results">{relationResults.map(item => <button key={item.key} type="button" disabled={(draft[relationField(item.type)] ?? []).includes(item.id)} onClick={() => set(relationField(item.type), [...new Set([...(draft[relationField(item.type)] ?? []), item.id])])}>+ {item.title}</button>)}</div>
      </>}
      {tab === 'avance' && <Field label="Données complètes de la fiche" help="Toutes les propriétés sont accessibles ici. L’identifiant est conservé pour que les liens continuent de fonctionner."><textarea className="ae-json" aria-label="Données complètes de la fiche" rows={24} spellCheck={false} value={raw} onChange={event => setRaw(event.target.value)} /></Field>}
      {error && <p className="ae-error" role="alert">{error}</p>}
    </div>
    <footer><span>{selection.entity.personalization ? 'Personnalisation dans ton coffre' : 'Une note éditable sera créée dans ton coffre'}</span><div>{openNote && <button className="ae-button" type="button" onClick={() => { openNote(); close(); }}>Ouvrir la note</button>}<button className="ae-button" type="button" onClick={close}>Annuler</button><button className="ae-button ae-primary" type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div></footer>
  </section>;
}

export abstract class ReactAtlasModal extends Modal {
  protected root?: Root;
  protected mount(): Root {
    this.modalEl.addClass('atlas-edit-modal','jwsd-modal','jwsd-theme');
    this.contentEl.addClass('jwsd-theme');
    const host = this.contentEl.createDiv(); const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = editorCss+STUDY_DESK_CSS; shadow.append(style);
    const mount = document.createElement('div');mount.className='jwsd-theme';shadow.append(mount); return this.root = createRoot(mount);
  }
  onClose(): void { this.root?.unmount(); this.root = undefined; this.contentEl.empty(); }
}
export class EntityEditorModal extends ReactAtlasModal {
  constructor(app: App, private selection: AtlasSelection, private atlas: AtlasWorkspace, private save: (entity: EditableEntity) => Promise<void>, private openNote?: () => void) { super(app); }
  onOpen(): void { this.mount().render(<EntityForm selection={this.selection} atlas={this.atlas} save={this.save} close={() => this.close()} openNote={this.openNote} />); }
}

function Manager({ host, close, actions }: { host: AtlasHost; close: () => void; actions: { hide: (selection: AtlasSelection) => Promise<void>; restore: (key: AtlasEntityKey) => Promise<void> } }) {
  const { atlas } = useSyncExternalStore(host.subscribe, host.getSnapshot);
  const [query, setQuery] = useState(''), [type, setType] = useState('all'), [limit, setLimit] = useState(60), [busy, setBusy] = useState(''), [error, setError] = useState('');
  const records = useMemo(() => [...atlas.all.values()].filter(item => (type === 'all' || item.type === type) && `${item.title} ${item.id}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a,b) => a.title.localeCompare(b.title,'fr')), [atlas, type, query]);
  const action = async (key: string, task: () => Promise<void>) => { setBusy(key); setError(''); try { await task(); } catch (error) { setError(error instanceof Error ? error.message : 'Opération impossible.'); } finally { setBusy(''); } };
  return <section className="ae-shell"><header><div><span className="ae-kicker">TON ATLAS, TES RECHERCHES</span><h2>Gérer toutes les fiches</h2></div><button type="button" className="ae-icon" aria-label="Fermer la gestion" onClick={close}>×</button></header>
    <div className="ae-create">{typeOptions.map(type => <button className="ae-button" key={type} type="button" onClick={() => host.newAtlasEntity(type)}>+ {ENTITY_LABELS[type]}</button>)}</div>
    <div className="ae-grid ae-filters"><Field label="Rechercher dans l’Atlas"><input aria-label="Rechercher dans l’Atlas à modifier" value={query} onChange={event => { setQuery(event.target.value); setLimit(60); }} /></Field><Field label="Type de fiche"><select aria-label="Type de fiche" value={type} onChange={event => { setType(event.target.value); setLimit(60); }}><option value="all">Tous les types</option>{typeOptions.map(type => <option key={type} value={type}>{ENTITY_LABELS[type]}</option>)}</select></Field></div>
    <div className="ae-scroll"><p className="ae-help">{records.length} fiches · {atlas.hidden.size} masquées. Les modifications restent dans tes notes Obsidian.</p>{error && <p role="alert" className="ae-error">{error}</p>}
      {records.slice(0,limit).map(item => <article key={item.key} className={`ae-manager-row ${atlas.hidden.has(item.key) ? 'ae-hidden' : ''}`}><div><strong>{item.title}</strong><small>{ENTITY_LABELS[item.type]}{atlas.hidden.has(item.key) ? ' · Masquée' : ''}{item.entity.personalization ? ' · Personnalisée' : ''}</small></div><div>
        {!atlas.hidden.has(item.key) && <button className="ae-button" type="button" onClick={() => { host.openEntity(item.key); close(); }}>Ouvrir</button>}
        <button className="ae-button" type="button" aria-label={`Modifier ${item.title}`} onClick={() => host.editEntity(item)}>Modifier</button>
        <button className="ae-button" type="button" disabled={Boolean(busy)} onClick={() => void action(item.key, () => actions.hide(item))}>{atlas.hidden.has(item.key) ? 'Réafficher' : 'Masquer'}</button>
        {item.entity.personalization && <button className="ae-button" type="button" disabled={Boolean(busy)} onClick={() => void action(item.key, () => actions.restore(item.key))}>{item.entity.personalization.created ? 'Retirer la fiche' : 'Restaurer l’original'}</button>}
      </div></article>)}
      {records.length > limit && <button className="ae-button" type="button" onClick={() => setLimit(value => value + 60)}>Afficher les fiches suivantes</button>}
    </div></section>;
}
export class AtlasManagerModal extends ReactAtlasModal {
  constructor(app: App, private host: AtlasHost, private actions: { hide: (selection: AtlasSelection) => Promise<void>; restore: (key: AtlasEntityKey) => Promise<void> }) { super(app); }
  onOpen(): void { this.mount().render(<Manager host={this.host} close={() => this.close()} actions={this.actions} />); }
}
