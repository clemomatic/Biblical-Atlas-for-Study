import { createRoot, type Root } from 'react-dom/client';
import { ItemView, Notice, Plugin, addIcon, PluginSettingTab, Setting, TFile, MarkdownRenderChild, debounce, parseYaml, type App as ObsidianApp, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
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
import { cleanWolUrl, extractReferenceEntries,passageUrl } from './referenceReader';
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
import episodeContextCss from './episodeContext.css?inline';
import { renderEpisodeContext } from './episodeContextView';
import { EpisodePickerModal } from './episodePickerModal';
import { EpisodeConnectionsStore } from './episodeConnectionsStore';
import { StudyFactIndex } from './studyFactIndex.ts';
import { EpisodeConnectionsModal } from './episodeConnectionsModal';
import { EpisodeContextModal } from './episodeContextModal';
import { PersonalEpisodeModal } from './personalEpisodeModal';
import { readLocalEpisodePassage } from './episodePassage';
import { parseScripture } from './bibleLabData';
import { REVIEWED_HISTORICAL_EVENTS } from '../../src/data/historicalStudyData';
import { normalizeSearch } from './bibleLabData';
import { TalkStudioModal, saveTalkToVault } from './talkStudio';
import { chooseJwArchive, inspectJwArchive, saveArchiveReport } from './archiveInspector';
import { saveDailyStudy, saveWeeklyStudy } from './studyNoteBuilder';
import type { DayPreview, MeetingPreview } from './studyLive';
import { chooseMarkdownZip, importMarkdownZip } from './markdownZipImporter';
import { NativeJwModal } from './NativeJwModal';
import { BIBLE_LAB_LIBRARY_VIEW, BibleLabLibraryView } from './BibleLabLibraryView';
import {JwPublicationCatalog} from './jwLibraryCatalogReader';
import { setLocalReferenceResolver } from './wolReferenceFetcher';
import { resolveOfflineDocument } from './offlineReferenceLibrary';
import {loadLatestAnnotationArchive} from './jwAnnotationLibrary';
import type { MapBounds } from './tileMath';
import {PublicationDownloads} from './publicationDownloads';
import {StudyDeskView,STUDY_DESK_VIEW} from './StudyDeskView';
import {StudyDeskBibleView,STUDY_DESK_BIBLE_VIEW} from './StudyDeskBibleView';
import {LocalBibleLibrary} from './localBibleLibrary';
import {readingSettings,type ReadingSettings} from './readingSettings';
import {StudyNotesService} from './studyNotes';
import {STUDY_DESK_CSS,STUDY_DESK_ICON,STUDY_DESK_ICON_SVG,renderDeskBrand,type DeskDestination} from './studyDeskBrand';

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
  return `${leafletCss}\n${responsive}\n${pluginCss}\n${STUDY_DESK_CSS}`;
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
  display(): void { this.plugin.renderStudyDeskSettings(this.containerEl); }
}

export default class BiblicalAtlasPlugin extends Plugin implements AtlasHost {
  private publicationDownloads!:PublicationDownloads;
  private publicationCatalog!:JwPublicationCatalog;
  settings: AtlasSettings = { ...DEFAULT_SETTINGS };
  private indexedNotes = new Map<string, VaultNote>();
  private listeners = new Set<() => void>();
  private inlinePopup?:BibleLabInlinePopover;
  private studyNotes=new StudyNotesService(()=>this.getReadingSettings());
  getReadingSettings=():ReadingSettings=>readingSettings(this.settings.reading);
  setReadingSettings=async(change:Partial<ReadingSettings>):Promise<void>=>{
    await this.updateSettings({reading:readingSettings({...this.getReadingSettings(),...change})});
    if(this.getReadingSettings().mode!=='popup')this.inlinePopup?.close();
    for(const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW))
      if(leaf.view instanceof BibleLabSidebarView)leaf.view.refreshReaderSettings();
  };
  renderStudySupplements=(parent:HTMLElement,ref:ReferenceEntry):void=>this.studyNotes.render(parent,ref);
  private previewReference=(label:string,anchor:HTMLElement,sourceUrl?:string):void=>{
    const url=cleanWolUrl(sourceUrl||(anchor instanceof HTMLAnchorElement?anchor.href:''))||passageUrl(label);
    const mode=this.getReadingSettings().mode;
    if(mode==='panel')this.run((async()=>{
      await this.openBibleLab(url,label);
      const view=this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)[0]?.view;
      if(view instanceof BibleLabSidebarView)view.setReferenceContext(anchor.closest('p,li,blockquote,.cm-line')?.textContent||'');
    })());
    else if(mode==='popup')this.inlinePopup?.open(label,anchor,sourceUrl);
    else if(url)window.open(url,'_blank','noopener,noreferrer');
  };
  private localBible!:LocalBibleLibrary;
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
    new Notice('Sauvegarde JW Study Desk créée : '+file.path);
    return file.path;
  };
  openRestoreResearchBackup=():void=>{
    const backups=this.app.vault.getFiles()
      .filter(file=>file.path.startsWith(BACKUP_DIRECTORY+'/')&&file.extension==='json')
      .sort((a,b)=>b.name.localeCompare(a.name,'fr'));
    if(!backups.length){
      new Notice('Aucune sauvegarde JW Study Desk trouvée. Crée d’abord une sauvegarde.');
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
    new Notice('Recherches JW Study Desk restaurées. Les notes Markdown sont inchangées.');
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
  private snapshot: AtlasSnapshot = { notes: [], settings: this.settings, atlas: buildWorkspace([]), studyFacts: { byPerson: {} } };
  private indexVersions = new Map<string, number>();
  private ready: Promise<void> = Promise.resolve();
  maps!: MapTileCache;
  private mapViewport?: MapBounds;
  private storage!: AtlasVault;
  private episodeConnectionsStore!: EpisodeConnectionsStore;
  private studyFactIndex = new StudyFactIndex();
  private episodeModuleRefreshers=new Map<HTMLElement,{eventId:string;refresh:()=>Promise<void>}>();
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
    this.snapshot = { notes: checked.map(note => atlas.diagnostics.has(note.path) ? { ...note, warnings: [...note.warnings, ...atlas.diagnostics.get(note.path)!] } : note), settings: this.settings, atlas, studyFacts: this.studyFactIndex.snapshot() };
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
    // Index personal episode facts from the actual saved YAML. MetadataCache
    // can lag behind writes, particularly during initial creation.
    const mayBeEpisode = frontmatter?.jwsd_kind === 'episode-connections' ||
      path.includes('/Connexions/') || this.studyFactIndex.hasPath(path);
    let episodeFrontmatter: unknown = undefined;
    let episodeError: string | undefined;
    if (mayBeEpisode) {
      try {
        const raw = await this.app.vault.read(file);
        const match = /^---\\r?\\n([\\s\\S]*?)\\r?\\n---(?:\\r?\\n|$)/.exec(raw);
        episodeFrontmatter = match ? parseYaml(match[1]) : undefined;
      } catch (error) {
        episodeError = error instanceof Error ? error.message : 'Carnet d’épisode invalide.';
      }
    }
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
    let episodeChanged = false;
    if (mayBeEpisode) {
      try { episodeChanged = this.studyFactIndex.update(path, episodeFrontmatter); }
      catch (error) {
        episodeChanged = this.studyFactIndex.remove(path);
        episodeError = error instanceof Error ? error.message : 'Indexation des faits impossible.';
      }
    }
    if (episodeError && note) note.warnings.push(episodeError);
    const noteChanged = JSON.stringify(note) !== JSON.stringify(this.indexedNotes.get(file.path) ?? null);
    if (note) this.indexedNotes.set(file.path, note); else this.indexedNotes.delete(file.path);
    if (publish && (noteChanged || episodeChanged)) this.publish();
  }
  private async indexAll(): Promise<void> { await Promise.all(this.app.vault.getMarkdownFiles().map(file => this.indexFile(file, false))); this.publish(); }
  async updateSettings(change: Partial<AtlasSettings>): Promise<void> {
    this.settings = { ...this.settings, ...change, noteFolder: validFolder(change.noteFolder ?? this.settings.noteFolder) };
    await this.enqueuePluginData(); this.publish();
  }
  async onload(): Promise<void> {
    addIcon(STUDY_DESK_ICON,STUDY_DESK_ICON_SVG);
    const brandStyle=document.createElement('style');
    brandStyle.dataset.jwStudyDesk='identity';brandStyle.textContent=STUDY_DESK_CSS;
    document.head.append(brandStyle);this.register(()=>brandStyle.remove());
    const episodeStyle=document.createElement('style');
    episodeStyle.dataset.jwStudyDeskEpisode='context';episodeStyle.textContent=episodeContextCss;
    document.head.append(episodeStyle);this.register(()=>episodeStyle.remove());
    const stored = await this.loadData() as (Partial<AtlasSettings> & {bibleLabResearch?:unknown;bibleLabCollection?:unknown;bibleLabArchive?:unknown}) | null;
    try { this.settings = { noteFolder: validFolder(stored?.noteFolder ?? DEFAULT_SETTINGS.noteFolder), allowOnlineMaps: stored?.allowOnlineMaps === true,reading:readingSettings(stored?.reading) }; }
    catch { this.settings = { ...DEFAULT_SETTINGS }; }
    this.researchDesk=normalizeResearchDesk(stored?.bibleLabResearch);
    this.researchCollection=normalizeResearchCollection(stored?.bibleLabCollection);
    this.researchArchive=pruneMissingCaptures(normalizeBibleLabArchive(stored?.bibleLabArchive),this.researchCollection);
    this.storage = new AtlasVault(this.app, () => this.settings.noteFolder, () => this.snapshot.notes, this.manifest.version);
    this.episodeConnectionsStore = new EpisodeConnectionsStore(this.app, () => this.settings.noteFolder);
    this.maps = new MapTileCache(this.app, this.settings.noteFolder); await this.maps.load();
    this.publish();
    this.localBible=new LocalBibleLibrary(this.app,()=>this.settings.noteFolder);
    this.register(()=>this.localBible.dispose());
    this.registerView(VIEW_TYPE, leaf => new AtlasView(leaf, this));
    this.registerView(STUDY_DESK_BIBLE_VIEW,leaf=>new StudyDeskBibleView(leaf,{
      library:this.localBible,navigate:this.navigateStudyDesk,
      openLibrary:()=>this.run((async()=>{
        await this.openVisualLibrary();
        const view=this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)[0]?.view;
        if(view instanceof BibleLabLibraryView)view.openBibles();
      })()),
      preview:this.previewReference
    }));
    this.registerView(BIBLE_LAB_VIEW, leaf => new BibleLabSidebarView(leaf, this));
    this.registerView(STUDY_DESK_VIEW,leaf=>new StudyDeskView(leaf,{
      navigate:this.navigateStudyDesk,
      getDesk:this.getResearchDesk,getCollection:this.getResearchCollection,getArchive:this.getResearchArchive,
      openStudy:()=>this.run(this.openDeskPanel(view=>view.openStudyFromDesk())),
      openIdea:id=>this.run(this.openDeskPanel(view=>view.openIdeaFromDesk(id))),
      openCapture:id=>this.run(this.openDeskPanel(view=>view.openInboxFromDesk(id))),
      search:(query,scope)=>this.run(this.openDeskPanel(view=>view.searchFromDesk(query,scope))),
      openDailyStudy:()=>this.run(this.openDeskPanel(view=>view.openStudyFromDesk(true))),
      createTalk:this.createTalk,
      openAnnotations:()=>this.run((async()=>{
        await this.openVisualLibrary();
        const view=this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)[0]?.view;
        if(view instanceof BibleLabLibraryView)view.openAnnotations();
      })()),
      renderSettings:parent=>this.renderStudyDeskSettings(parent)
    }));
    this.registerEvent(this.app.workspace.on('active-leaf-change',leaf=>{
      if(leaf?.view.getViewType()==='webviewer'){
        const state=leaf.view.getState() as {url?:unknown};
        if(typeof state?.url==='string'&&cleanWolUrl(state.url))
          this.lastActiveWolLeaf=leaf;
      }
      this.refreshWolCaptureIndicators();
      if(leaf?.view instanceof StudyDeskView)leaf.view.refresh();
    }));
    this.registerView(BIBLE_LAB_ARTICLE_VIEW, leaf => new BibleLabArticleView(leaf, this.openWolArticleTab));
    const catalogPath=(this.manifest.dir||this.app.vault.configDir+'/plugins/'+this.manifest.id)+'/publication-catalog.json';
    this.publicationCatalog=new JwPublicationCatalog({
      read:()=>this.app.vault.adapter.read(catalogPath),
      write:text=>this.app.vault.adapter.write(catalogPath,text)
    });
    this.publicationDownloads=new PublicationDownloads((symbol,issue,onProgress,isCancelled)=>
      new NativeJwModal(this.app,this.settings.noteFolder).downloadCatalogPublication(symbol,issue,{background:true,onProgress,isCancelled}));
    this.register(()=>this.publicationDownloads.dispose());
    this.registerView(BIBLE_LAB_LIBRARY_VIEW,leaf=>new BibleLabLibraryView(leaf,{
      localBible:this.localBible,
      catalog:this.publicationCatalog,
      root:()=>this.settings.noteFolder,
      navigate:this.navigateStudyDesk,
      importJwpub:()=>new NativeJwModal(this.app,this.settings.noteFolder,()=>this.run(this.openVisualLibrary())).openImportJwpub(),
      importVirtualJwpub:()=>new NativeJwModal(this.app,this.settings.noteFolder,()=>this.run(this.openVisualLibrary())).openImportVirtualJwpub(),
      importAnnotations:()=>new NativeJwModal(this.app,this.settings.noteFolder,()=>this.run(this.openVisualLibrary())).openImportAnnotations(),
      downloads:this.openNativeBridge,
      publicationDownloads:this.publicationDownloads,
      checkPublication:(symbol,issue)=>new NativeJwModal(this.app,this.settings.noteFolder,()=>this.run(this.openVisualLibrary()))
        .openCatalogPublication(symbol,issue),
      readReference:(url,label)=>this.openBibleLab(url,label),
      openWol:(url)=>this.openWolSearchTab(url)
    }));
    const refreshBookcase=(file:{path:string})=>{
      if(!file.path.endsWith('/_BIBLE_LAB_OFFLINE_INDEX.json')&&
         !file.path.endsWith('/_BIBLE_LAB_VIRTUAL_INDEX.json')&&
         !file.path.endsWith('/_BIBLE_LAB_ANNOTATIONS.json'))return;
      for(const leaf of this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)){
        if(leaf.view instanceof BibleLabLibraryView)void leaf.view.refresh(file.path.endsWith('/_BIBLE_LAB_ANNOTATIONS.json'));
      }
    };
    this.registerEvent(this.app.vault.on('create',refreshBookcase));
    this.registerEvent(this.app.vault.on('modify',refreshBookcase));
    this.registerEvent(this.app.vault.on('delete',refreshBookcase));
    this.registerEvent(this.app.vault.on('rename',(file,oldPath)=>{
      refreshBookcase(file);refreshBookcase({path:oldPath});
    }));
    setLocalReferenceResolver(ref=>ref.kind==='scripture'?this.localBible.resolve(ref):resolveOfflineDocument(this.app,this.settings.noteFolder,ref));
    this.register(()=>setLocalReferenceResolver(null));
    this.wolClipBridge=new WolContextCaptureBridge(this.app,this.saveWolQuote);
    this.wolClipBridge.start();
    this.register(()=>{this.wolClipBridge?.stop();this.wolClipBridge=undefined;});
    this.addRibbonIcon(STUDY_DESK_ICON, 'Ouvrir JW Study Desk', () => this.run(this.openStudyDesk()));
    this.addCommand({id:'open-jw-study-desk',name:'Ouvrir JW Study Desk',callback:()=>this.run(this.openStudyDesk())});
    this.addCommand({id:'open-jw-study-desk-bible',name:'Ouvrir la Bible',callback:()=>this.run(this.openStudyDesk('bible'))});
    this.addCommand({ id: 'open-atlas', name: 'Ouvrir l’Atlas', callback: () => this.run(this.openAtlas()) });
    this.addCommand({id:'create-personal-study-episode',name:'Créer un épisode biblique personnel',callback:()=>{
      new PersonalEpisodeModal(this.app,async(title,reference)=>{
        const created=await this.episodeConnectionsStore.createPersonalEpisode(title,reference);
        await this.indexFile(created.file);
        await this.storage.open(created.file.path);
        this.editEpisodeConnections(created.id);
      }).open();
    }});
    this.addCommand({id:'edit-episode-connections',name:'Compléter les connexions d’un épisode',callback:()=>{
      const options=new Map<string,string>();
      for(const entry of this.snapshot.atlas.catalog.values())if(entry.type==='event')options.set(entry.id,entry.title);
      for(const record of REVIEWED_HISTORICAL_EVENTS)options.set(record.event.id,record.event.name);
      for(const item of this.episodeConnectionsStore.listPersonalEpisodes())options.set(item.id,item.title);
      new EpisodePickerModal(this.app,[...options].map(([id,title])=>({id,title})).sort((a,b)=>a.title.localeCompare(b.title,'fr')),
        choice=>this.editEpisodeConnections(choice.id)).open();
    }});
    this.addCommand({ id:'insert-episode-context', name:'Insérer le contexte d’un épisode de l’Atlas', editorCallback:editor=>{
      const options=new Map<string,string>();
      for(const entry of this.snapshot.atlas.catalog.values())if(entry.type==='event')options.set(entry.id,entry.title);
      for(const record of REVIEWED_HISTORICAL_EVENTS)options.set(record.event.id,record.event.name);
      for(const item of this.episodeConnectionsStore.listPersonalEpisodes())options.set(item.id,item.title);
      new EpisodePickerModal(this.app,[...options].map(([id,title])=>({id,title})).sort((a,b)=>a.title.localeCompare(b.title,'fr')),
        choice=>editor.replaceSelection('\n'+'\x60\x60\x60'+'jwsd\nevent:'+choice.id+'\n'+'\x60\x60\x60'+'\n')).open();
    }});
    this.addCommand({ id: 'open-bible-lab', name: 'Ouvrir le panneau d’étude', callback: () => this.run(this.openBibleLab()) });
    this.addCommand({ id: 'open-wol-browser', name: 'Ouvrir la Bibliothèque en ligne WOL dans un onglet', callback: () => this.run(this.openWolSearchTab(WOL_HOME)) });
    this.addCommand({ id: 'create-discourse', name: 'Créer un plan de discours', callback: this.createTalk });
    this.addCommand({ id: 'inspect-jw-archive', name: 'Inspecter une archive JWPUB ou JW Library', callback: this.inspectArchive });
    this.addCommand({ id: 'import-jw-markdown', name: 'Importer une archive ZIP Markdown de JW Study Desk', callback: this.importMarkdownArchive });
    this.addCommand({ id: 'native-jw-library', name: 'Importer JWPUB ou sauvegarde JW Library directement', callback: this.openNativeBridge });
    this.addCommand({ id:'open-bible-lab-visual-library',
      name:'Ouvrir ma bibliothèque personnelle dans un onglet',
      callback:()=>this.run(this.openVisualLibrary())
    });
    this.addCommand({ id: 'personal-offline-jwpub-library',
      name: 'Ouvrir ma bibliothèque',
      callback: this.openOfflineLibrary });
    this.addCommand({ id: 'wol-search-selection', name: 'Rechercher la sélection dans WOL (onglet web)', editorCallback: editor => { const term=(editor.getSelection()||editor.getLine(editor.getCursor().line)).trim(); if(term)this.run(this.openWolSearchTab(wolResearchUrl(term,{match:'par',scope:'all'}))); } });
    this.addCommand({ id: 'new-research', name: 'Créer une recherche personnelle', callback: () => this.newResearch([]) });
    this.addCommand({
      id:'bible-lab-keep-wol-portion',
      name:'WOL : garder la portion sélectionnée dans JW Study Desk',
      callback:()=>this.run(this.captureCurrentWolSelection())
    });
    this.addCommand({
      id:'bible-lab-backup-research',
      name:'Sauvegarder mes recherches, idées et références JW Study Desk',
      callback:()=>this.run(this.exportResearchBackup())
    });
    this.addCommand({
      id:'bible-lab-restore-research',
      name:'Restaurer une sauvegarde de recherches JW Study Desk',
      callback:()=>this.openRestoreResearchBackup()
    });
    this.addCommand({
      id:'bible-lab-quick-capture',
      name:'Capturer rapidement le texte copié ou l’onglet WOL dans JW Study Desk',
      callback:()=>this.run(this.quickCaptureToInbox())
    });
    this.addCommand({
      id:'bible-lab-keep-selection',name:'Conserver la sélection dans le bac JW Study Desk',
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
      ref => this.run(this.openWolArticleTab(ref)),
      async()=> (await loadLatestAnnotationArchive(this.app,this.settings.noteFolder))?.index||null,
      ()=>this.getReadingSettings().closeOnOutsideClick,
      this.renderStudySupplements
    );
    this.register(()=>{this.inlinePopup?.destroy();this.inlinePopup=undefined;});
    const showInline=this.previewReference;
    this.registerMarkdownPostProcessor(el=>enhanceBibleLabMarkers(el,showInline));
    this.registerEditorExtension(inlineBibleLabEditorExtension(showInline));
    this.addCommand({id:'search-note-scriptures',name:'Retrouver un verset ou une idée dans toutes mes notes',
      callback:()=>this.run(this.openDeskPanel(view=>view.searchNotesFromDesk()))});
    this.addCommand({id:'search-selection-scriptures',name:'Retrouver la sélection dans mes notes',
      editorCallback:editor=>{const query=(editor.getSelection()||editor.getLine(editor.getCursor().line)).trim();
        this.run(this.openDeskPanel(view=>view.searchNotesFromDesk(query)));}});
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
    this.registerMarkdownCodeBlockProcessor('jwsd',async (source,element,ctx)=>{
      const line=source.split(/\r?\n/).map(item=>item.trim()).find(item=>item.startsWith('event:'));
      const eventId=line?.slice('event:'.length).trim();
      if(!eventId||!/^[\w-]{1,300}$/.test(eventId)){
        element.createEl('p',{text:'Module JW Study Desk : indique un identifiant d’événement valide.'});return;
      }
      const refresh=async()=>{
        try {
          const personal=await this.episodeConnectionsStore.read(eventId);
          // Obsidian may prepare Reading view in a detached Markdown fragment.
          if(!this.episodeModuleRefreshers.has(element))return;
          renderEpisodeContext(element,eventId,this.snapshot.atlas,{
            openEntity:this.openEntity,
            readReference:reference=>{
              if(parseScripture(reference))this.run(this.openBibleLab(passageUrl(reference),reference));
              else this.run(this.openWolSearchTab(wolResearchUrl(reference,{match:'par',scope:'all'})));
            },
            editConnections:id=>this.editEpisodeConnections(id,refresh),
            personalConnections:personal.items,
            personalFacts:personal.facts,
            ...(personal.personalTitle&&personal.personalReference
              ?{personalEpisode:{title:personal.personalTitle,reference:personal.personalReference}}:{})
          });
        } catch(error) {
          element.empty();
          element.createEl('p',{text:error instanceof Error?error.message:'Impossible de charger les connexions personnelles.'});
        }
      };
      this.episodeModuleRefreshers.set(element,{eventId,refresh});
      const plugin=this;
      ctx.addChild(new (class extends MarkdownRenderChild {
        onunload():void{plugin.episodeModuleRefreshers.delete(element);}
      })(element));
      await refresh();
    });
    this.registerEvent(this.app.metadataCache.on('changed', file => {
      this.run(this.indexFile(file));
      const frontmatter=this.app.metadataCache.getFileCache(file)?.frontmatter;
      if(frontmatter?.jwsd_kind==='episode-connections'&&typeof frontmatter.jwsd_episode_id==='string'){
        this.run(this.refreshEpisodeModules(frontmatter.jwsd_episode_id));
      }
    }));
    this.registerEvent(this.app.vault.on('delete', file => {
      let changed = false;
      for (const path of this.indexedNotes.keys()) if (path === file.path || path.startsWith(`${file.path}/`)) { changed = true; this.indexedNotes.delete(path); this.indexVersions.set(path, (this.indexVersions.get(path) ?? 0) + 1); }
      for (const path of this.studyFactIndex.paths()) {
        if (path === file.path || path.startsWith(file.path + '/')) {
          changed = this.studyFactIndex.remove(path) || changed;
        }
      }
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
      for (const path of this.studyFactIndex.paths()) {
        if (path !== oldPath && !path.startsWith(oldPath + '/')) continue;
        this.studyFactIndex.rename(path, file.path + path.slice(oldPath.length));
      }
      this.publish();
      if (file instanceof TFile) this.run(this.indexFile(file));
    }));
    this.app.workspace.onLayoutReady(() => { this.ready = this.indexAll(); this.run(this.ready); });
  }
  onunload(): void { this.inlinePopup?.destroy();this.listeners.clear();this.episodeModuleRefreshers.clear(); this.maps?.dispose(); }
  saveDailyStudy = (day:DayPreview,date:Date):void => {this.run(saveDailyStudy(this.app,this.settings.noteFolder,day,date));};
  saveWeeklyStudy = (week:MeetingPreview,date:Date):void => {this.run(saveWeeklyStudy(this.app,this.settings.noteFolder,week,date));};
  createTalk = ():void => {
    new TalkStudioModal(this.app, async draft => {
      await saveTalkToVault(this.app,this.settings.noteFolder,draft);
      new Notice('Plan de discours créé et ouvert.');
    }).open();
  };
  /** Keep existing notes and identifiers; navigation only changes the active view. */
  openStudyDesk = async(destination:DeskDestination='home'):Promise<void>=>{
    if(destination==='library'){await this.openVisualLibrary();return;}
    await this.ready;
    if(destination==='bible'){
      let leaf=this.app.workspace.getLeavesOfType(STUDY_DESK_BIBLE_VIEW)[0];
      if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:STUDY_DESK_BIBLE_VIEW,active:true});}
      else if(leaf.view instanceof StudyDeskBibleView)await leaf.view.refresh();
      await this.app.workspace.revealLeaf(leaf);return;
    }
    let leaf=this.app.workspace.getLeavesOfType(STUDY_DESK_VIEW)[0];
    if(!leaf){
      leaf=this.app.workspace.getLeaf('tab');
      await leaf.setViewState({type:STUDY_DESK_VIEW,active:true});
    }
    if(leaf.view instanceof StudyDeskView)leaf.view.show(destination);
    await this.app.workspace.revealLeaf(leaf);
  };
  private navigateStudyDesk=(destination:DeskDestination):void=>{this.run(this.openStudyDesk(destination));};
  private async openDeskPanel(action:(view:BibleLabSidebarView)=>void):Promise<void>{
    await this.openBibleLab();
    const view=this.app.workspace.getLeavesOfType(BIBLE_LAB_VIEW)[0]?.view;
    if(view instanceof BibleLabSidebarView)action(view);
  }
  renderStudyDeskSettings(container:HTMLElement):void{
    container.empty();container.addClass('jwsd-theme','jwsd-settings');renderDeskBrand(container);
    new Setting(container).setName('Ma bibliothèque').setDesc('Publications, téléchargements et annotations personnelles.').addButton(button=>button.setButtonText('Ouvrir').onClick(()=>{this.run(this.openVisualLibrary());}));
    new Setting(container).setName('Mes fichiers et sauvegardes').setDesc('Ajouter une publication ou retrouver mes annotations JW Library.').addButton(button=>button.setButtonText('Ajouter').onClick(this.openNativeBridge));
    const reading=container.createDiv({cls:'jwsd-reading-settings'});
    reading.createEl('h3',{text:'Lecture des références'});
    const current=this.getReadingSettings();
    new Setting(reading).setName('Ouvrir les références').addDropdown(dropdown=>dropdown.addOptions({popup:'Fenêtre popup',panel:'Panneau latéral',none:'Lien vers WOL'}).setValue(current.mode).onChange(value=>this.setReadingSettings({mode:value as ReadingSettings['mode']})));
    new Setting(reading).setName('Fermer la popup après un clic à l’extérieur').setDesc('Désactivé : la fenêtre reste ouverte jusqu’à Fermer ou Échap.').addToggle(toggle=>toggle.setValue(current.closeOnOutsideClick).onChange(value=>this.setReadingSettings({closeOnOutsideClick:value})));
    new Setting(reading).setName('Lire automatiquement après la saisie').setDesc('Dans le panneau, ouvre un verset reconnu après une pause de saisie. Le bouton Lire reste disponible.').addToggle(toggle=>toggle.setValue(current.automaticReference).onChange(value=>this.setReadingSettings({automaticReference:value})));
    new Setting(reading).setName('Suivre le défilement de la note').setDesc('Affiche les références visibles dans la note en lecture ou en aperçu direct.').addToggle(toggle=>toggle.setValue(current.followNote).onChange(value=>this.setReadingSettings({followNote:value})));
    new Setting(reading).setName('Affichage des références').addDropdown(dropdown=>dropdown.addOptions({preview:'Aperçus repliables',expanded:'Références dépliées'}).setValue(current.display).onChange(value=>this.setReadingSettings({display:value as ReadingSettings['display']})));
    new Setting(reading).setName('Comparer les notes d’étude françaises et anglaises').setDesc('À l’ouverture d’un passage, consulte les deux éditions officielles en ligne. Désactivé : la lecture locale ne lance pas cette comparaison.').addToggle(toggle=>toggle.setValue(current.englishNotes).onChange(value=>this.setReadingSettings({englishNotes:value})));
    new Setting(reading).setName('Traduire les notes anglaises en français').setDesc('MyMemory, service gratuit soumis à quota. Seul le texte public de la note anglaise est transmis. L’original reste consultable.').addToggle(toggle=>toggle.setValue(current.translateEnglish).onChange(value=>this.setReadingSettings({translateEnglish:value})));
    new Setting(container).setName('Dossier des recherches').setDesc('Les nouvelles notes et enquêtes seront créées ici. Les fichiers existants restent à leur emplacement.').addText(text=>{
      text.setValue(this.settings.noteFolder);
      text.onChange(value=>{try{validFolder(value);void this.updateSettings({noteFolder:value}).catch(error=>this.report(error));}catch{/* Allow typing an incomplete path. */}});
    });
    const maps=container.createEl('details');maps.createEl('summary',{text:'Atlas et cartes'});
    new Setting(maps).setName('Charger les fonds de carte en ligne').setDesc('Charge les tuiles OpenFreeMap et les conserve dans le coffre. Désactivé : les cartes déjà téléchargées restent accessibles.').addToggle(toggle=>toggle.setValue(this.settings.allowOnlineMaps).onChange(async value=>{await this.updateSettings({allowOnlineMaps:value});}));
    new Setting(maps).setName('Cartes hors connexion').setDesc('Préparer une région, consulter les téléchargements ou libérer leur espace.').addButton(button=>button.setButtonText('Préparer les cartes').onClick(this.openMapDownloads));
    container.createEl('p',{cls:'jwsd-version',text:`JW Study Desk · Version ${this.manifest.version}`});
  }
  openVisualLibrary = async():Promise<void>=>{
    let leaf=this.app.workspace.getLeavesOfType(BIBLE_LAB_LIBRARY_VIEW)[0];
    if(!leaf){
      leaf=this.app.workspace.getLeaf('tab');
      await leaf.setViewState({type:BIBLE_LAB_LIBRARY_VIEW,active:true});
    }
    await this.app.workspace.revealLeaf(leaf);
    if(leaf.view instanceof BibleLabLibraryView)await leaf.view.refresh();
  };
  openNativeBridge = ():void => {new NativeJwModal(this.app,this.settings.noteFolder,()=>this.run(this.openVisualLibrary())).open();};
  openOfflineLibrary = ():void => {
    this.run(this.openVisualLibrary());
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
   * A source clicked in notes, popovers or the JW Study Desk sidebar becomes a
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
  private async refreshEpisodeModules(eventId:string):Promise<void>{
    const refreshers:Array<Promise<void>>=[];
    for(const [element,entry] of this.episodeModuleRefreshers){
      if(!element.isConnected){this.episodeModuleRefreshers.delete(element);continue;}
      if(entry.eventId===eventId)refreshers.push(entry.refresh());
    }
    await Promise.allSettled(refreshers);
  }
  openPersonEpisodes=(personId:string):void=>{
    const episodes = [...new Map([
      ...REVIEWED_HISTORICAL_EVENTS.filter(record =>
        record.event.participantMentions?.some(mention => mention.personId === personId)
      ).map(record => [record.event.id, {id:record.event.id,title:record.event.name}] as const),
      ...this.studyFactIndex.forPerson(personId).map(item =>
        [item.id, {id:item.id,title:item.title}] as const)
    ]).values()].sort((a,b) => a.title.localeCompare(b.title,'fr'));
    if(!episodes.length){new Notice('Aucun épisode associé à cette personne.');return;}
    const open=(id:string)=>{
      new EpisodeContextModal(this.app,id,this.snapshot.atlas,this.episodeConnectionsStore,{
        openEntity:this.openEntity,
        readReference:reference=>{
          if(parseScripture(reference))this.run(this.openBibleLab(passageUrl(reference),reference));
          else this.run(this.openWolSearchTab(wolResearchUrl(reference,{match:'par',scope:'all'})));
        },
        editConnections:(eventId,onSaved)=>this.editEpisodeConnections(eventId,onSaved)
      }).open();
    };
    if(episodes.length===1)open(episodes[0].id);
    else new EpisodePickerModal(this.app,episodes,choice=>open(choice.id),
      'Rechercher un épisode documenté de cette personne…').open();
  };
  editEpisodeConnections=(eventId:string,onSaved?:()=>Promise<void>):void=>{
    const record=REVIEWED_HISTORICAL_EVENTS.find(item=>item.event.id===eventId);
    const title=record?.event.name??this.snapshot.atlas.catalog.get(('event:'+eventId) as AtlasEntityKey)?.title??this.episodeConnectionsStore.listPersonalEpisodes().find(item=>item.id===eventId)?.title??eventId;
    new EpisodeConnectionsModal(this.app,eventId,title,this.snapshot.atlas,this.episodeConnectionsStore,async file=>{
      await this.indexFile(file);
      await this.refreshEpisodeModules(eventId);
      if(onSaved)await onSaved();
    },reference=>readLocalEpisodePassage(this.localBible,reference)).open();
  };
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
