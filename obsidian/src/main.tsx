import { createRoot, type Root } from 'react-dom/client';
import { ItemView, Notice, Plugin, PluginSettingTab, Setting, TFile, debounce, type App as ObsidianApp, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import appCss from '../../src/index.css?inline';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import pluginCss from './plugin.css?inline';
import type { AtlasEntityKey, AtlasEntityType, AtlasIntegration, AtlasMapEditing, AtlasNavigationState, AtlasSelection } from '../../src/atlasIntegration';
import { emptyAtlasNavigation } from '../../src/atlasIntegration';
import { buildWorkspace, originalEntity, relatedEntities, resolveEntity } from './catalog';
import { editFromMetadata, newEntity, parseEditBody, selectionFromEntity, type EditableEntity } from './editable';
import { EntityEditorModal, AtlasManagerModal } from './editor';
import type { BiblicalPlace, BiblicalRoute } from '../../src/types';
import type { AtlasHost, AtlasSnapshot } from './host';
import { atlasDeepLink, DEFAULT_SETTINGS, navigationForKey, noteFromMetadata, parseEntityKey, validFolder, type AtlasSettings, type VaultNote } from './model';
import { InvestigationModal, LinkNoteModal, ResearchModal } from './modals';
import { PluginApp } from './PluginApp';
import { AtlasVault } from './vault';
import { MarkdownContent } from './MarkdownContent';
import { MapTileCache } from './MapTiles';
import { MapDownloadModal } from './MapDownloadModal';
import { BIBLE_LAB_VIEW, BibleLabSidebarView } from './BibleLabPanel';
import { emptyResearchDesk, normalizeResearchDesk, type ResearchDesk } from './researchDesk';
import {
  emptyResearchCollection, normalizeResearchCollection, addResearchCapture,
  type ResearchCollection
} from './researchCollection';
import { cleanWolUrl, extractReferenceEntries } from './referenceReader';
import { quickCaptureCandidate } from './researchQuickCapture';
import { WolContextCaptureBridge } from './wolContextCapture';
import {
  quoteFromWolSelection,sourceFromWolPage,
  type WolPageSnapshot,type WolCapturedQuote
} from './wolSelectionCapture';
import {
  buildBibleLabBackup, BACKUP_DIRECTORY, backupFileName,
  type BibleLabResearchState
} from './researchBackup';
import { BibleLabRestoreModal } from './researchBackupModal';
import {
  emptyBibleLabArchive,normalizeBibleLabArchive,pruneMissingCaptures,
  type BibleLabArchive
} from './researchArchive';
import { BIBLE_LAB_ARTICLE_VIEW, BibleLabArticleView } from './BibleLabArticleView';
import { type ReferenceEntry } from './referenceReader';
import { openWolInObsidian, WOL_HOME } from './wolWebViewer';
import { wolResearchUrl } from './wolResearch';
import { enhanceBibleLabMarkers } from './bibleLabMarkers';
import { inlineBibleLabEditorExtension } from './inlineEditorExtension';
import { BibleLabInlinePopover } from './BibleLabInlinePopover';
import { linkReferencesInMarkdown } from './inlineReferenceScanner';
import inlineReferenceCss from './inlineReferences.css?inline';
import { normalizeSearch } from './bibleLabData';
import { TalkStudioModal, saveTalkToVault } from './talkStudio';
import { chooseJwArchive, inspectJwArchive, saveArchiveReport } from './archiveInspector';
import { saveDailyStudy, saveWeeklyStudy } from './studyNoteBuilder';
import type { DayPreview, MeetingPreview } from './studyLive';
import { chooseMarkdownZip, importMarkdownZip } from './markdownZipImporter';
import { NativeJwModal } from './NativeJwModal';
import { BIBLE_LAB_LIBRARY_VIEW, BibleLabLibraryView } from './BibleLabLibraryView';
import { setLocalReferenceResolver } from './wolReferenceFetcher';
import { resolveOfflineDocument } from './offlineReferenceLibrary';
import type { MapBounds } from './tileMath';

const VIEW_TYPE = 'atlas-biblique';

function readViewState(raw: unknown): AtlasNavigationState {
  const state = emptyAtlasNavigation();
  if (!raw || typeof raw !== 'object') return state;
  const value = raw as Partial<AtlasNavigationState>;
  if (value.activeTab === 'map') state.activeTab = 'map';
  for (const field of ['eventId', 'personId', 'placeId', 'routeId'] as const) {
    if (typeof value[field] === 'string' && value[field]!.length < 300) state[field] = value[field]!;
  }
  const period = value.visiblePeriod;
  if (period && Number.isFinite(period.startYear) && Number.isFinite(period.endYear) && period.startYear < period.endYear) state.visiblePeriod = period;
  return state;
}

function isolatedStyles(): string {
  // Layout breakpoints follow this pane, including split panes and tablets.
  const responsive = appCss.replaceAll(':root', ':host')
    .replace(/@media\s*(\([^{}]*width[^{}]*\))/g, '@container atlas $1')
    .replace(/(\d+(?:\.\d+)?)dvh(?=[;)}\s])/g, '$1cqh');
  return `${leafletCss}\n${responsive}\n${pluginCss}`;
}

class AtlasView extends ItemView {
  private root: Root | null = null;
  private atlasState = emptyAtlasNavigation();
  private request: AtlasIntegration['navigation'];
  private sequence = 0;
  constructor(leaf: WorkspaceLeaf, private plugin: BiblicalAtlasPlugin) { super(leaf); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Atlas biblique'; }
  getIcon(): string { return 'map'; }
  getState(): Record<string, unknown> { return { ...this.atlasState }; }
  async setState(state: unknown, _result: ViewStateResult): Promise<void> {
    this.atlasState = readViewState(state);
    this.request = { sequence: ++this.sequence, state: this.atlasState };
    this.render();
  }
  private onNavigate = (state: AtlasNavigationState) => { this.atlasState = state; this.app.workspace.requestSaveLayout(); };
  private render(): void {
    this.root?.render(<PluginApp host={this.plugin} initialState={this.atlasState} navigation={this.request} onNavigate={this.onNavigate} />);
  }
  async onOpen(): Promise<void> {
    this.contentEl.empty(); this.contentEl.addClass('atlas-obsidian-host');
    const host = this.contentEl.createDiv({ cls: 'atlas-obsidian-surface' });
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = isolatedStyles(); shadow.append(style);
    const mount = document.createElement('div'); mount.className = 'atlas-obsidian-mount'; shadow.append(mount);
    this.root = createRoot(mount); this.render();
  }
  async onClose(): Promise<void> { this.root?.unmount(); this.root = null; this.contentEl.empty(); }
}

class AtlasSettingTab extends PluginSettingTab {
  constructor(app: ObsidianApp, private plugin: BiblicalAtlasPlugin) { super(app, plugin); }
  display(): void {
    this.containerEl.empty(); this.containerEl.createEl('h2', { text: 'Atlas biblique interactif' });
    new Setting(this.containerEl).setName('Dossier des recherches').setDesc('Les nouvelles notes et enquêtes seront créées ici. Les fichiers existants restent à leur emplacement.').addText(text => {
      text.setValue(this.plugin.settings.noteFolder);
      text.onChange(value => { try { validFolder(value); void this.plugin.updateSettings({ noteFolder: value }).catch(error => this.plugin.report(error)); } catch { /* Allow typing an incomplete path. */ } });
    });
    new Setting(this.containerEl).setName('Charger les fonds de carte en ligne').setDesc('Charge les tuiles OpenFreeMap sans clé et les conserve dans le coffre. Désactivé : seules les tuiles déjà téléchargées et le fond Natural Earth inclus sont utilisés.').addToggle(toggle => toggle.setValue(this.plugin.settings.allowOnlineMaps).onChange(async value => { await this.plugin.updateSettings({ allowOnlineMaps: value }); }));
    new Setting(this.containerEl).setName('Cartes hors connexion').setDesc('Préparer une région, consulter les téléchargements ou libérer leur espace.').addButton(button => button.setButtonText('Préparer les cartes').onClick(this.plugin.openMapDownloads));
    this.containerEl.createEl('p', { text: 'Le corpus est inclus dans le plugin. Tes recherches restent des notes Markdown ; une mise à jour du plugin ne les réécrit pas. Aucun service d’IA ni compte distant n’est utilisé.' });
    this.containerEl.createEl('p', { text: `Version ${this.plugin.manifest.version} · Consulte le guide fourni pour installer les mises à jour et créer des fiches personnelles.` });
  }
}

export default class BiblicalAtlasPlugin extends Plugin implements AtlasHost {
  settings: AtlasSettings = { ...DEFAULT_SETTINGS };
  private indexedNotes = new Map<string, VaultNote>();
  private listeners = new Set<() => void>();
  private inlinePopup?:BibleLabInlinePopover;
  private wolSearchLeaf: WorkspaceLeaf|null=null;
  private lastActiveWolLeaf:WorkspaceLeaf|null=null;
  private wolClipBridge?:WolContextCaptureBridge;
  getWolPageSnapshot=(url?:string|null):Promise<WolPageSnapshot|null>=>
    this.wolClipBridge?.readPage(url)||Promise.resolve(null);
  private saveWolQuote=async(capture:WolCapturedQuote):Promise<void>=>{
    const next=addResearchCapture(this.researchCollection,{
      ...capture,planId:this.researchDesk.activeId
    });
    if(next===this.researchCollection){
      new Notice('Le bac est plein ou la portion est vide.');return;
    }
    await this.saveResearchCollection(next);
    await this.openBibleLabCollection();
    new Notice('Citation WOL conservée avec son lien source.');
  };
  private captureCurrentWolSelection=async():Promise<void>=>{
    const preferred=this.getPreferredWolUrl();
    const snapshot=await this.getWolPageSnapshot(preferred);
    const quote=quoteFromWolSelection(snapshot,snapshot?.selectionText||'',preferred||'');
    if(!quote){
      new Notice('Sélectionne un passage dans la Visionneuse web WOL avant de lancer la capture.');
      return;
    }
    await this.saveWolQuote(quote);
  };
  getPreferredWolUrl=():string|null=>{
    const leaves=this.app.workspace.getLeavesOfType('webviewer');
    const active=this.app.workspace.activeLeaf;
    const selected=leaves.find(leaf=>leaf===active);
    const remembered=leaves.find(leaf=>leaf===this.lastActiveWolLeaf);
    const preferred=selected||remembered||(leaves.length===1?leaves[0]:null);
    const webview=(preferred?.view as ItemView|undefined)?.containerEl?.querySelector('webview') as
      (HTMLElement&{getURL?:()=>string})|null|undefined;
    const current=webview?.getURL?.();
    if(current&&cleanWolUrl(current))return cleanWolUrl(current);
    const raw=preferred?.view.getState() as {url?:unknown}|undefined;
    return typeof raw?.url==='string'?cleanWolUrl(raw.url):null;
  };
  private researchDesk:ResearchDesk=emptyResearchDesk();
  private researchCollection:ResearchCollection=emptyResearchCollection();
  private researchArchive:BibleLabArchive=emptyBibleLabArchive();
  private researchState=():BibleLabResearchState=>({
    desk:this.researchDesk,collection:this.researchCollection,archive:this.researchArchive
  });
  exportResearchBackup=async():Promise<string>=>{
    // Drain all pending data writes before capturing a consistent snapshot.
    await this.dataWriteQueue;
    if(!this.app.vault.getAbstractFileByPath(BACKUP_DIRECTORY))
      await this.app.vault.createFolder(BACKUP_DIRECTORY);
    const contents=buildBibleLabBackup(this.researchState());
    const now=new Date();
    let filename='';
    for(let attempt=0;attempt<100;attempt++){
      filename=BACKUP_DIRECTORY+'/'+backupFileName(now,attempt);
      if(!this.app.vault.getAbstractFileByPath(filename))break;
      if(attempt===99)throw Error('Impossible de créer un nom de sauvegarde unique.');
    }
    const file=await this.app.vault.create(filename,contents);
    new Notice('Sauvegarde Bible Lab créée : '+file.path);
    return file.path;
  };
  openRestoreResearchBackup=():void=>{
    const backups=this.app.vault.getFiles()
      .filter(file=>file.path.startsWith(BACKUP_DIRECTORY+'/')&&file.extension==='json')
      .sort((a,b)=>b.name.localeCompare(a.name,'fr'));
    if(!backups.length){
      new Notice('Aucune sauvegarde Bible Lab trouvée. Crée d’abord une sauvegarde.');
      return;
    }
    new BibleLabRestoreModal(this.app,backups,this.applyResearchRestore).open();
  };
  private applyResearchRestore=async(_source:TFile,next:BibleLabResearchState):Promise<string>=>{
    // A restorable snapshot is created before ANY stored research data is replaced.
    await this.dataWriteQueue;
    const safetyCopy=await this.exportResearchBackup();
    const before=this.researchState();
    this.researchDesk=next.desk;
    this.researchCollection=next.collection;
    this.researchArchive=pruneMissingCaptures(next.archive,next.collection);
    try{
      await this.enqueuePluginData();
    }catch(error){
      // In-memory state is also rolled back if the storage write failed.
      this.researchDesk=before.desk;
      this.researchCollection=before.collection;
      this.researchArchive=before.archive;
      try{await this.enqueuePluginData();}catch{/* Safety file remains available. */}
      throw error;
    }
    for(const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)){
      if(leaf.view instanceof BibleLabSidebarView)leaf.view.reloadResearchState();
    }
    new Notice('Recherches Bible Lab restaurées. Les notes Markdown sont inchangées.');
    return safetyCopy;
  };
  getResearchArchive=():BibleLabArchive=>this.researchArchive;
  saveResearchArchive=(archive:BibleLabArchive):Promise<void>=>{
    this.researchArchive=pruneMissingCaptures(normalizeBibleLabArchive(archive),this.researchCollection);
    return this.enqueuePluginData();
  };
  getResearchCollection=():ResearchCollection=>this.researchCollection;
  saveResearchCollection=(store:ResearchCollection):Promise<void>=>{
    this.researchCollection=normalizeResearchCollection(store);
    this.researchArchive=pruneMissingCaptures(this.researchArchive,this.researchCollection);
    return this.enqueuePluginData();
  };
  getOpenWolUrls=():string[]=>{
    const leaves=this.app.workspace.getLeavesOfType('webviewer');
    const urls:string[]=[];
    for(const leaf of leaves){
      const webview=(leaf.view as ItemView).containerEl.querySelector('webview') as
        (HTMLElement&{getURL?:()=>string})|null;
      const current=webview?.getURL?.();
      const state=leaf.view.getState() as {url?:unknown};
      const url=current&&cleanWolUrl(current)||
        (typeof state?.url==='string'?cleanWolUrl(state.url):null);
      if(url&&!urls.includes(url))urls.push(url);
    }
    return urls;
  };
  private dataWriteQueue:Promise<void>=Promise.resolve();
  getResearchDesk=():ResearchDesk=>this.researchDesk;
  private enqueuePluginData():Promise<void>{
    const snapshot={...this.settings,bibleLabResearch:this.researchDesk,bibleLabCollection:this.researchCollection,bibleLabArchive:this.researchArchive};
    // Serialize writes so rapid edits do not replace newer data with stale saves.
    this.dataWriteQueue=this.dataWriteQueue.catch(()=>undefined).then(()=>this.saveData(snapshot));
    return this.dataWriteQueue;
  }
  saveResearchDesk=(desk:ResearchDesk):Promise<void>=>{
    this.researchDesk=normalizeResearchDesk(desk);
    return this.enqueuePluginData();
  };
  private snapshot: AtlasSnapshot = { notes: [], settings: this.settings, atlas: buildWorkspace([]) };
  private indexVersions = new Map<string, number>();
  private ready: Promise<void> = Promise.resolve();
  maps!: MapTileCache;
  private mapViewport?: MapBounds;
  private storage!: AtlasVault;
  getSnapshot = (): AtlasSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(): void {
    const notes = [...this.indexedNotes.values()];
    const counts = new Map<string, number>();
    for (const note of notes) if (note.uid && note.kind !== 'research') counts.set(note.uid, (counts.get(note.uid) ?? 0) + 1);
    const checked = notes.map(note => note.uid && note.kind !== 'research' && counts.get(note.uid)! > 1
      ? { ...note, warnings: [...note.warnings, 'Identifiant personnel en double : attribue un atlas_uid différent à chaque fiche.'] } : note)
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    const atlas = buildWorkspace(checked);
    this.snapshot = { notes: checked.map(note => atlas.diagnostics.has(note.path) ? { ...note, warnings: [...note.warnings, ...atlas.diagnostics.get(note.path)!] } : note), settings: this.settings, atlas };
    this.listeners.forEach(listener => listener());
  }
  report(error: unknown): void { new Notice(error instanceof Error ? error.message : 'L’opération n’a pas pu aboutir.'); }
  private run(operation: Promise<unknown>): void { void operation.catch(error => this.report(error)); }
  private async indexFile(file: TFile, publish = true): Promise<void> {
    if (file.extension !== 'md') return;
    const path = file.path;
    const generation = (this.indexVersions.get(path) ?? 0) + 1; this.indexVersions.set(path, generation);
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const note = noteFromMetadata(path, file.basename, frontmatter);
    if (note && frontmatter?.atlas_entity) {
      try {
        const edit = editFromMetadata(path, frontmatter);
        if (edit) {
          note.edit = parseEditBody(edit, await this.app.vault.cachedRead(file), frontmatter.atlas_description === true);
          note.title = String(note.edit.data.text ?? note.edit.data.name ?? note.title);
        }
      } catch (error) { note.warnings.push(error instanceof Error ? error.message : 'Personnalisation invalide.'); }
    }
    if (this.indexVersions.get(path) !== generation || file.path !== path || this.app.vault.getAbstractFileByPath(path) !== file) return;
    if (JSON.stringify(note) === JSON.stringify(this.indexedNotes.get(file.path) ?? null)) return;
    if (note) this.indexedNotes.set(file.path, note); else this.indexedNotes.delete(file.path);
    if (publish) this.publish();
  }
  private async indexAll(): Promise<void> { await Promise.all(this.app.vault.getMarkdownFiles().map(file => this.indexFile(file, false))); this.publish(); }
  async updateSettings(change: Partial<AtlasSettings>): Promise<void> {
    this.settings = { ...this.settings, ...change, noteFolder: validFolder(change.noteFolder ?? this.settings.noteFolder) };
    await this.enqueuePluginData(); this.publish();
  }
  async onload(): Promise<void> {
    const stored = await this.loadData() as (Partial<AtlasSettings> & {bibleLabResearch?:unknown;bibleLabCollection?:unknown;bibleLabArchive?:unknown}) | null;
    try { this.settings = { noteFolder: validFolder(stored?.noteFolder ?? DEFAULT_SETTINGS.noteFolder), allowOnlineMaps: stored?.allowOnlineMaps === true }; }
    catch { this.settings = { ...DEFAULT_SETTINGS }; }
    this.researchDesk=normalizeResearchDesk(stored?.bibleLabResearch);
    this.researchCollection=normalizeResearchCollection(stored?.bibleLabCollection);
    this.researchArchive=pruneMissingCaptures(normalizeBibleLabArchive(stored?.bibleLabArchive),this.researchCollection);
    this.storage = new AtlasVault(this.app, () => this.settings.noteFolder, () => this.snapshot.notes, this.manifest.version);
    this.maps = new MapTileCache(this.app, this.settings.noteFolder); await this.maps.load();
    this.publish();
    this.registerView(VIEW_TYPE, leaf => new AtlasView(leaf, this));
    this.registerView(BIBLE_LAB_VIEW, leaf => new BibleLabSidebarView(leaf, this));
    this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{
      if(leaf?.view.getViewType()==='webviewer'){
        const state=leaf.view.getState() as {url?:unknown};
        if(typeof state?.url==='string'&&cleanWolUrl(state.url))
          this.lastActiveWolLeaf=leaf;
      }
      this.refreshWolCaptureIndicators();
    }));
    this.registerView(BIBLE_LAB_ARTICLE_VIEW, leaf => new BibleLabArticleView(leaf, this.openWolArticleTab));
    this.registerView(BIBLE_LAB_LIBRARY_VIEW,leaf=>new BibleLabLibraryView(leaf,{
      root:()=>this.settings.noteFolder,
      importJwpub:()=>new NativeJwModal(this.app,this.settings.noteFolder).openImportJwpub(),
      importVirtualJwpub:()=>new NativeJwModal(this.app,this.settings.noteFolder).openImportVirtualJwpub(),
      importAnnotations:()=>new NativeJwModal(this.app,this.settings.noteFolder).openImportAnnotations(),
      downloads:this.openOfflineLibrary,
      checkPublication:(symbol,issue)=>new NativeJwModal(this.app,this.settings.noteFolder)
        .openCatalogPublication(symbol,issue),
      readReference:(url,label)=>this.openBibleLab(url,label),
      openWol:(url)=>this.openWolSearchTab(url)
    }));
    const refreshBookcase=(file:{path:string})=>{
      if(!file.path.endsWith('/_BIBLE_LAB_OFFLINE_INDEX.json')&&
         !file.path.endsWith('/_BIBLE_LAB_VIRTUAL_INDEX.json'))return;
      for(const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)){
        if(leaf.view instanceof BibleLabLibraryView)void leaf.view.refresh();
      }
    };
    this.registerEvent(this.app.vault.on('create',refreshBookcase));
    this.registerEvent(this.app.vault.on('delete',refreshBookcase));
    this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{
      refreshBookcase(file);refreshBookcase({path:oldPath});
    }));
    setLocalReferenceResolver(ref=>resolveOfflineDocument(this.app,this.settings.noteFolder,ref));
    this.register(()=>setLocalReferenceResolver(null));
    this.wolClipBridge=new WolContextCaptureBridge(this.app,this.saveWolQuote);
    this.wolClipBridge.start();
    this.register(()=>{this.wolClipBridge?.stop();this.wolClipBridge=undefined;});
    this.addRibbonIcon('map', 'Ouvrir l’Atlas biblique', () => this.run(this.openAtlas()));
    this.addRibbonIcon('book-open-check', 'Ouvrir Bible Lab', () => this.run(this.openBibleLab()));
    this.addCommand({ id: 'open-atlas', name: 'Ouvrir l’Atlas', callback: () => this.run(this.openAtlas()) });
    this.addCommand({ id: 'open-bible-lab', name: 'Ouvrir le laboratoire biblique', callback: () => this.run(this.openBibleLab()) });
    this.addCommand({ id: 'open-wol-browser', name: 'Ouvrir la Bibliothèque en ligne WOL dans un onglet', callback: () => this.run(this.openWolSearchTab(WOL_HOME)) });
    this.addCommand({ id: 'create-discourse', name: 'Créer un plan de discours', callback: this.createTalk });
    this.addCommand({ id: 'inspect-jw-archive', name: 'Inspecter une archive JWPUB ou JW Library', callback: this.inspectArchive });
    this.addCommand({ id: 'import-jw-markdown', name: 'Importer une archive ZIP Markdown de Bible Lab', callback: this.importMarkdownArchive });
    this.addCommand({ id: 'native-jw-library', name: 'Importer JWPUB ou sauvegarde JW Library directement', callback: this.openNativeBridge });
    this.addCommand({ id:'open-bible-lab-visual-library',
      name:'Ouvrir ma bibliothèque personnelle dans un onglet',
      callback:()=>this.run(this.openVisualLibrary())
    });
    this.addCommand({ id: 'personal-offline-jwpub-library',
      name: 'Ouvrir ma bibliothèque JWPUB hors ligne',
      callback: this.openOfflineLibrary });
    this.addCommand({ id: 'wol-search-selection', name: 'Rechercher la sélection dans WOL (onglet web)', editorCallback: editor => { const term=(editor.getSelection()||editor.getLine(editor.getCursor().line)).trim(); if(term)this.run(this.openWolSearchTab(wolResearchUrl(term,{match:'par',scope:'all'}))); } });
    this.addCommand({ id: 'new-research', name: 'Créer une recherche personnelle', callback: () => this.newResearch([]) });
    this.addCommand({
      id:'bible-lab-keep-wol-portion',
      name:'WOL : garder la portion sélectionnée dans Bible Lab',
      callback:()=>this.run(this.captureCurrentWolSelection())
    });
    this.addCommand({
      id:'bible-lab-backup-research',
      name:'Sauvegarder mes recherches, idées et références Bible Lab',
      callback:()=>this.run(this.exportResearchBackup())
    });
    this.addCommand({
      id:'bible-lab-restore-research',
      name:'Restaurer une sauvegarde de recherches Bible Lab',
      callback:()=>this.openRestoreResearchBackup()
    });
    this.addCommand({
      id:'bible-lab-quick-capture',
      name:'Capturer rapidement le texte copié ou l’onglet WOL dans Bible Lab',
      callback:()=>this.run(this.quickCaptureToInbox())
    });
    this.addCommand({
      id:'bible-lab-keep-selection',name:'Conserver la sélection dans le bac Bible Lab',
      editorCallback: editor=>{
        const selected=editor.getSelection().trim();
        if(!selected){new Notice('Sélectionne une référence ou un extrait dans la note.');return;}
        const refs=extractReferenceEntries(selected);
        const first=refs[0];
        this.researchCollection=addResearchCapture(this.researchCollection,{
          label:first?.label||selected.slice(0,110),
          excerpt:selected.length>180||first?.label!==selected?selected:'',
          url:first?.url||'',
          planId:this.researchDesk.activeId
        });
        this.run(this.enqueuePluginData().then(()=>this.openBibleLabCollection()));
      }
    });
    this.addCommand({ id: 'manage-atlas', name: 'Gérer et personnaliser toutes les fiches', callback: this.manageAtlas });
    this.addCommand({ id: 'offline-maps', name: 'Télécharger des cartes hors connexion', callback: this.openMapDownloads });
    this.addCommand({ id: 'explore-active-note', name: 'Explorer les fiches de la note active', checkCallback: checking => {
      const file = this.app.workspace.getActiveFile(); const note = file && this.indexedNotes.get(file.path);
      const key = note?.keys.find(candidate => resolveEntity(this.snapshot.atlas.catalog, candidate));
      if (!key) return false;
      if (!checking) this.run(this.openAtlas(key));
      return true;
    } });
    this.addSettingTab(new AtlasSettingTab(this.app, this));
    // Reading view and Live Preview use the same preview, without rewriting
    // Markdown as the user types or opening untrusted HTML inside Obsidian.
    const floatingStyle=document.head.createEl('style',{text:inlineReferenceCss});
    this.register(()=>floatingStyle.remove());
    this.inlinePopup=new BibleLabInlinePopover(
      ref => this.run(this.openBibleLab(ref.url,ref.label)),
      ref => this.run(this.openWolArticleTab(ref))
    );
    this.register(()=>{this.inlinePopup?.destroy();this.inlinePopup=undefined;});
    const showInline=(label:string,anchor:HTMLElement)=>
      this.inlinePopup?.open(label,anchor);
    this.registerMarkdownPostProcessor(el=>enhanceBibleLabMarkers(el,showInline));
    this.registerEditorExtension(inlineBibleLabEditorExtension(showInline));
    this.addCommand({id:'link-bible-references-in-selection',
      name:'Transformer les références de la sélection en liens Markdown',
      editorCallback:editor=>{
        const selection=editor.getSelection();
        if(!selection){new Notice('Sélectionne un passage de note contenant des références.');return;}
        const result=linkReferencesInMarkdown(selection);
        if(result.count){editor.replaceSelection(result.text);
          new Notice(result.count+' référence(s) reliée(s), annulation possible avec Ctrl+Z.');}
        else new Notice('Aucune nouvelle référence détectée dans la sélection.');
      }});
    const refreshBibleLab = debounce(() => {
      const file = this.app.workspace.getActiveFile();
      for (const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)) {
        if (leaf.view instanceof BibleLabSidebarView) this.run(leaf.view.updateActiveNote(file));
      }
    }, 450);
    this.registerEvent(this.app.workspace.on('file-open', refreshBibleLab));
    this.registerEvent(this.app.workspace.on('editor-change', refreshBibleLab));
    this.registerObsidianProtocolHandler('atlas-biblique', parameters => {
      if (!parameters.entity) { this.run(this.openAtlas()); return; }
      const key = parseEntityKey(parameters.entity);
      if (key) this.run(this.openAtlas(key)); else new Notice('Ce lien ne contient pas d’identifiant Atlas valide.');
    });
    this.registerMarkdownCodeBlockProcessor('atlas', (source, element) => {
      const catalog = this.snapshot.atlas.catalog;
      for (const line of source.split('\n').map(value => value.trim()).filter(Boolean)) {
        const key = parseEntityKey(line); const selection = key && resolveEntity(catalog, key);
        if (!selection) { element.createEl('p', { text: `Fiche introuvable : ${line}` }); continue; }
        const button = element.createEl('button', { text: `Explorer ${selection.title}`, cls: 'atlas-obsidian-link' });
        button.addEventListener('click', () => this.openEntity(selection.key));
      }
    });
    this.registerEvent(this.app.metadataCache.on('changed', file => this.run(this.indexFile(file))));
    this.registerEvent(this.app.vault.on('delete', file => {
      let changed = false;
      for (const path of this.indexedNotes.keys()) if (path === file.path || path.startsWith(`${file.path}/`)) { changed = true; this.indexedNotes.delete(path); this.indexVersions.set(path, (this.indexVersions.get(path) ?? 0) + 1); }
      if (changed) this.publish();
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      for (const [path, note] of [...this.indexedNotes]) {
        if (path !== oldPath && !path.startsWith(`${oldPath}/`)) continue;
        const nextPath = `${file.path}${path.slice(oldPath.length)}`;
        this.indexedNotes.delete(path);
        const oldBasename = path.split('/').pop()?.replace(/\.md$/, '');
        const newBasename = nextPath.split('/').pop()?.replace(/\.md$/, '') ?? note.title;
        this.indexVersions.set(path, (this.indexVersions.get(path) ?? 0) + 1);
        this.indexedNotes.set(nextPath, { ...note, path: nextPath, ...(note.edit ? { edit: { ...note.edit, path: nextPath } } : {}), title: note.title === oldBasename ? newBasename : note.title });
      }
      this.publish();
      if (file instanceof TFile) this.run(this.indexFile(file));
    }));
    this.app.workspace.onLayoutReady(() => { this.ready = this.indexAll(); this.run(this.ready); });
  }
  onunload(): void { this.inlinePopup?.destroy();this.listeners.clear(); this.maps?.dispose(); }
  saveDailyStudy = (day:DayPreview,date:Date):void => {this.run(saveDailyStudy(this.app,this.settings.noteFolder,day,date));};
  saveWeeklyStudy = (week:MeetingPreview,date:Date):void => {this.run(saveWeeklyStudy(this.app,this.settings.noteFolder,week,date));};
  createTalk = ():void => {
    new TalkStudioModal(this.app, async draft => {
      await saveTalkToVault(this.app,this.settings.noteFolder,draft);
      new Notice('Plan de discours créé et ouvert.');
    }).open();
  };
  openVisualLibrary = async():Promise<void>=>{
    let leaf=this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)[0];
    if(!leaf){
      leaf=this.app.workspace.getLeaf('tab');
      await leaf.setViewState({type:BIBLE_LAB_LIBRARY_VIEW,active:true});
    }
    await this.app.workspace.revealLeaf(leaf);
    if(leaf.view instanceof BibleLabLibraryView)await leaf.view.refresh();
  };
  openNativeBridge = ():void => {new NativeJwModal(this.app,this.settings.noteFolder).open();};
  openOfflineLibrary = ():void => {
    new NativeJwModal(this.app,this.settings.noteFolder).openOfflineLibrary();
  };
  importMarkdownArchive = ():void => {
    this.run((async()=>{
      const file=await chooseMarkdownZip();
      if(!file)return;
      const result=await importMarkdownZip(this.app,file,this.settings.noteFolder);
      new Notice('Import terminé : '+result.notes+' notes Markdown.');
    })());
  };
  inspectArchive = ():void => {
    this.run((async () => {
      const file=await chooseJwArchive();
      if(!file)return;
      const report=await inspectJwArchive(file);
      await saveArchiveReport(this.app,report,this.settings.noteFolder);
      new Notice('Archive '+report.kind+' analysée : '+report.entries.length+' fichiers. Aucun original modifié.');
    })());
  };
  openAtlasPlace = (name: string): void => {
    const normalized = normalizeSearch(name.replace(/\s*\[.*$/, ''));
    const selection = [...this.snapshot.atlas.catalog.values()]
      .find(item => item.key.startsWith('place:') && normalizeSearch(item.title) === normalized);
    if (!selection) new Notice('Lieu non identifié dans l’Atlas interactif ; ouverture de la carte générale.');
    this.run(this.openAtlas(selection?.key));
  };
  /**
   * A source clicked in notes, popovers or the Bible Lab sidebar becomes a
   * genuine WOL browser tab. Follow links, use WOL search and Obsidian's
   * native Web viewer Reader mode without recreating WOL's HTML.
   */
  private refreshWolCaptureIndicators():void{
    for(const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)){
      if(leaf.view instanceof BibleLabSidebarView)
        leaf.view.refreshWolSourceIndicator();
    }
  }
  openWolArticleTab = async (ref: ReferenceEntry): Promise<void> => {
    await openWolInObsidian(this.app,ref.url);
    this.refreshWolCaptureIndicators();
  };
  /** Subsequent searches reuse ONLY the dedicated search tab, not article tabs. */
  openWolSearchTab = async (url: string): Promise<void> => {
    this.wolSearchLeaf=await openWolInObsidian(this.app,url,this.wolSearchLeaf);
    this.refreshWolCaptureIndicators();
  };
  private async quickCaptureToInbox():Promise<void>{
    // No clipboard reads in background: executed only by the explicit command.
    let clip='';
    try{clip=await navigator.clipboard.readText();}
    catch{new Notice('Presse-papiers indisponible : ouvre le bac pour coller manuellement.');}
    const candidate=quickCaptureCandidate(clip,this.getPreferredWolUrl());
    if(!candidate){
      await this.openBibleLabCollection();
      new Notice('Copie un passage WOL, ou ouvre une page WOL puis relance la capture.');
      return;
    }
    const snapshot=await this.getWolPageSnapshot(candidate.url);
    const named=candidate.excerpt
      ?quoteFromWolSelection(snapshot,candidate.excerpt,candidate.url)
      :sourceFromWolPage(snapshot,candidate.url);
    const next=addResearchCapture(this.researchCollection,{
      ...candidate,
      ...(named?{label:named.label,url:named.url}:{}),
      planId:this.researchDesk.activeId
    });
    if(next===this.researchCollection){
      new Notice('Le bac à trouvailles est plein.');
      return;
    }
    await this.saveResearchCollection(next);
    await this.openBibleLabCollection();
    new Notice('Trouvaille conservée. Tu peux maintenant la renommer ou la classer.');
  }
  async openBibleLabCollection():Promise<void>{
    await this.openBibleLab();
    const leaf=this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)[0];
    if(leaf?.view instanceof BibleLabSidebarView)leaf.view.openCollection();
  }
  async openBibleLab(reference?: string, displayLabel?: string): Promise<void> {
    await this.ready;
    let leaf = this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: BIBLE_LAB_VIEW, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
    if (leaf.view instanceof BibleLabSidebarView) {
      await leaf.view.updateActiveNote(this.app.workspace.getActiveFile());
      if (reference?.trim()) leaf.view.focusReference(reference.trim(),displayLabel?.trim());
    }
  }
  async openAtlas(key?: AtlasEntityKey): Promise<void> {
    await this.ready;
    const selection = key && resolveEntity(this.snapshot.atlas.catalog, key);
    if (key && !selection) throw new Error('Cette fiche n’existe pas dans le corpus ou les recherches de ce coffre.');
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) { leaf = this.app.workspace.getLeaf('tab'); await leaf.setViewState({ type: VIEW_TYPE, active: true }); }
    if (selection) await leaf.setViewState({ type: VIEW_TYPE, active: true, state: { ...navigationForKey(selection.key) } });
    await this.app.workspace.revealLeaf(leaf);
  }
  openEntity = (key: AtlasEntityKey): void => { this.run(this.openAtlas(key)); };
  linkForSelection = (selection: AtlasSelection | null): string => selection
    ? atlasDeepLink(selection.key, this.app.vault.getName())
    : `obsidian://atlas-biblique?vault=${encodeURIComponent(this.app.vault.getName())}`;
  openNote = (path: string): void => { this.run(this.storage.open(path)); };
  openMapDownloads = (): void => { new MapDownloadModal(this.app, this.maps, this.mapViewport).open(); };
  setMapViewport = (bounds: MapBounds): void => { this.mapViewport = bounds; };
  renderMarkdown = (text: string, sourcePath?: string) => <MarkdownContent app={this.app} text={text} sourcePath={sourcePath} />;
  openEntityNote = (selection: AtlasSelection): void => {
    this.run(this.storage.ensureEntityNote(selection).then(async file => { await this.indexFile(file); return this.storage.open(file.path); }));
  };
  linkNote = (selection: AtlasSelection): void => {
    new LinkNoteModal(this.app, async file => { await this.storage.link(file, selection.key); await this.indexFile(file); new Notice(`Note reliée à ${selection.title}.`); }).open();
  };
  newResearch = (keys: AtlasEntityKey[]): void => {
    new ResearchModal(this.app, keys, async draft => { const file = await this.storage.createResearch(draft); await this.indexFile(file); await this.storage.open(file.path); }).open();
  };
  newInvestigation = (selections: AtlasSelection[]): void => {
    const catalog = this.snapshot.atlas.catalog;
    const related = [...new Map(selections.flatMap(selection => relatedEntities(selection, catalog)).filter(selection => !selections.some(item => item.key === selection.key)).map(item => [item.key, item])).values()].slice(0, Math.max(0, 12 - selections.length));
    new InvestigationModal(this.app, selections, related, async (items, question) => { const file = await this.storage.createInvestigation(items, question); await this.storage.open(file.path); }).open();
  };

  private async persistEntity(selection: AtlasSelection, entity: EditableEntity | ((current: EditableEntity) => EditableEntity), options: { created?: boolean; hidden?: boolean; expectedRaw?: string | null } = {}): Promise<void> {
    const file = await this.storage.saveEditable(selection, entity, options);
    await this.indexFile(file);
  }
  editEntity = (selection: AtlasSelection): void => {
    const current = this.snapshot.atlas.all.get(selection.key) ?? selection;
    const note = this.snapshot.notes.find(note => note.edit?.key === selection.key);
    new EntityEditorModal(this.app, current, this.snapshot.atlas, async entity => {
      await this.persistEntity(current, entity, { created: note?.edit?.created ?? (!originalEntity(current.key) && !this.snapshot.atlas.all.has(current.key)), expectedRaw: note?.edit?.rawContent ?? null });
      new Notice('Fiche enregistrée.');
    }, note ? () => this.openNote(note.path) : undefined).open();
  };
  newAtlasEntity = (type: AtlasEntityType): void => {
    const selection = selectionFromEntity(type, newEntity(type, `vault-${crypto.randomUUID()}`));
    new EntityEditorModal(this.app, selection, this.snapshot.atlas, async entity => {
      await this.persistEntity(selection, entity, { created: true }); await this.openAtlas(selection.key);
    }).open();
  };
  manageAtlas = (): void => {
    new AtlasManagerModal(this.app, this, {
      hide: async selection => { await this.persistEntity(selection, current => current, { hidden: !this.snapshot.atlas.hidden.has(selection.key), created: selection.entity.personalization?.created ?? false }); },
      restore: async key => { await this.storage.restoreEditable(key); this.indexedNotes.delete(this.snapshot.notes.find(note => note.edit?.key === key)?.path ?? ''); this.publish(); }
    }).open();
  };
  mapActions: AtlasMapEditing = {
    onMovePlace: (id, coordinates) => {
      const item = this.snapshot.atlas.catalog.get(`place:${id}`); if (item) this.run(this.persistEntity(item, current => ({ ...current, coordinates }) as BiblicalPlace));
    },
    onMoveRoutePoint: (id, pointId, coordinates) => {
      const item = this.snapshot.atlas.catalog.get(`route:${id}`); if (item) this.run(this.persistEntity(item, current => ({ ...current, points: (current as BiblicalRoute).points.map(point => point.id === pointId ? { ...point, coordinates, placeId: undefined } : point) }) as BiblicalRoute));
    },
    onAddRoutePoint: (id, coordinates) => {
      const item = this.snapshot.atlas.catalog.get(`route:${id}`); if (item) this.run(this.persistEntity(item, current => ({ ...current, points: [...(current as BiblicalRoute).points, { id: crypto.randomUUID(), name: `Étape ${(current as BiblicalRoute).points.length + 1}`, coordinates, stepNumber: (current as BiblicalRoute).points.length + 1 }] }) as BiblicalRoute));
    },
    onRemoveRoutePoint: (id, pointId) => {
      const item = this.snapshot.atlas.catalog.get(`route:${id}`); if (item) this.run(this.persistEntity(item, current => ({ ...current, points: (current as BiblicalRoute).points.filter(point => point.id !== pointId) }) as BiblicalRoute));
    }
  };
}
