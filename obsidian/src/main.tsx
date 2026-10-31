import { createRoot, type Root } from 'react-dom/client';
import { ItemView, Notice, Plugin, PluginSettingTab, Setting, TFile, type App as ObsidianApp, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import appCss from '../../src/index.css?inline';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import pluginCss from './plugin.css?inline';
import type { AtlasEntityKey, AtlasIntegration, AtlasNavigationState, AtlasSelection } from '../../src/atlasIntegration';
import { emptyAtlasNavigation } from '../../src/atlasIntegration';
import { buildCatalog, relatedEntities, resolveEntity } from './catalog';
import type { AtlasHost, AtlasSnapshot } from './host';
import { atlasDeepLink, DEFAULT_SETTINGS, navigationForKey, noteFromMetadata, parseEntityKey, validFolder, type AtlasSettings, type VaultNote } from './model';
import { InvestigationModal, LinkNoteModal, ResearchModal } from './modals';
import { PluginApp } from './PluginApp';
import { AtlasVault } from './vault';

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
    new Setting(this.containerEl).setName('Charger les fonds de carte en ligne').setDesc('Télécharge les tuiles détaillées auprès de CARTO ou Stadia Maps. Désactivé : un fond Natural Earth simplifié, inclus dans le plugin, situe les lieux sans téléchargement.').addToggle(toggle => toggle.setValue(this.plugin.settings.allowOnlineMaps).onChange(async value => { await this.plugin.updateSettings({ allowOnlineMaps: value }); }));
    this.containerEl.createEl('p', { text: 'Le corpus est inclus dans le plugin. Tes recherches restent des notes Markdown ; une mise à jour du plugin ne les réécrit pas. Aucun service d’IA ni compte distant n’est utilisé.' });
    this.containerEl.createEl('p', { text: `Version ${this.plugin.manifest.version} · Consulte le guide fourni pour installer les mises à jour et créer des fiches personnelles.` });
  }
}

export default class BiblicalAtlasPlugin extends Plugin implements AtlasHost {
  settings: AtlasSettings = { ...DEFAULT_SETTINGS };
  private indexedNotes = new Map<string, VaultNote>();
  private listeners = new Set<() => void>();
  private snapshot: AtlasSnapshot = { notes: [], settings: this.settings };
  private storage!: AtlasVault;
  getSnapshot = (): AtlasSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(): void {
    const notes = [...this.indexedNotes.values()];
    const counts = new Map<string, number>();
    for (const note of notes) if (note.uid && note.kind !== 'research') counts.set(note.uid, (counts.get(note.uid) ?? 0) + 1);
    this.snapshot = { notes: notes.map(note => note.uid && note.kind !== 'research' && counts.get(note.uid)! > 1
      ? { ...note, warnings: [...note.warnings, 'Identifiant personnel en double : attribue un atlas_uid différent à chaque fiche.'] } : note)
      .sort((a, b) => a.title.localeCompare(b.title, 'fr')), settings: this.settings };
    this.listeners.forEach(listener => listener());
  }
  report(error: unknown): void { new Notice(error instanceof Error ? error.message : 'L’opération n’a pas pu aboutir.'); }
  private run(operation: Promise<unknown>): void { void operation.catch(error => this.report(error)); }
  private indexFile(file: TFile, publish = true): void {
    if (file.extension !== 'md') return;
    const note = noteFromMetadata(file.path, file.basename, this.app.metadataCache.getFileCache(file)?.frontmatter);
    if (JSON.stringify(note) === JSON.stringify(this.indexedNotes.get(file.path) ?? null)) return;
    if (note) this.indexedNotes.set(file.path, note); else this.indexedNotes.delete(file.path);
    if (publish) this.publish();
  }
  async updateSettings(change: Partial<AtlasSettings>): Promise<void> {
    this.settings = { ...this.settings, ...change, noteFolder: validFolder(change.noteFolder ?? this.settings.noteFolder) };
    await this.saveData(this.settings); this.publish();
  }
  async onload(): Promise<void> {
    const stored = await this.loadData() as Partial<AtlasSettings> | null;
    try { this.settings = { noteFolder: validFolder(stored?.noteFolder ?? DEFAULT_SETTINGS.noteFolder), allowOnlineMaps: stored?.allowOnlineMaps === true }; }
    catch { this.settings = { ...DEFAULT_SETTINGS }; }
    this.storage = new AtlasVault(this.app, () => this.settings.noteFolder, () => this.snapshot.notes, this.manifest.version);
    this.publish();
    this.registerView(VIEW_TYPE, leaf => new AtlasView(leaf, this));
    this.addRibbonIcon('map', 'Ouvrir l’Atlas biblique', () => this.run(this.openAtlas()));
    this.addCommand({ id: 'open-atlas', name: 'Ouvrir l’Atlas', callback: () => this.run(this.openAtlas()) });
    this.addCommand({ id: 'new-research', name: 'Créer une recherche personnelle', callback: () => this.newResearch([]) });
    this.addCommand({ id: 'explore-active-note', name: 'Explorer les fiches de la note active', checkCallback: checking => {
      const file = this.app.workspace.getActiveFile(); const note = file && this.indexedNotes.get(file.path);
      const key = note?.keys.find(candidate => resolveEntity(buildCatalog(this.snapshot.notes), candidate));
      if (!key) return false;
      if (!checking) this.run(this.openAtlas(key));
      return true;
    } });
    this.addSettingTab(new AtlasSettingTab(this.app, this));
    this.registerObsidianProtocolHandler('atlas-biblique', parameters => {
      if (!parameters.entity) { this.run(this.openAtlas()); return; }
      const key = parseEntityKey(parameters.entity);
      if (key) this.run(this.openAtlas(key)); else new Notice('Ce lien ne contient pas d’identifiant Atlas valide.');
    });
    this.registerMarkdownCodeBlockProcessor('atlas', (source, element) => {
      const catalog = buildCatalog(this.snapshot.notes);
      for (const line of source.split('\n').map(value => value.trim()).filter(Boolean)) {
        const key = parseEntityKey(line); const selection = key && resolveEntity(catalog, key);
        if (!selection) { element.createEl('p', { text: `Fiche introuvable : ${line}` }); continue; }
        const button = element.createEl('button', { text: `Explorer ${selection.title}`, cls: 'atlas-obsidian-link' });
        button.addEventListener('click', () => this.openEntity(selection.key));
      }
    });
    this.registerEvent(this.app.metadataCache.on('changed', file => this.indexFile(file)));
    this.registerEvent(this.app.vault.on('delete', file => {
      for (const path of this.indexedNotes.keys()) if (path === file.path || path.startsWith(`${file.path}/`)) this.indexedNotes.delete(path);
      this.publish();
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      for (const [path, note] of [...this.indexedNotes]) {
        if (path !== oldPath && !path.startsWith(`${oldPath}/`)) continue;
        const nextPath = `${file.path}${path.slice(oldPath.length)}`;
        this.indexedNotes.delete(path);
        const oldBasename = path.split('/').pop()?.replace(/\.md$/, '');
        const newBasename = nextPath.split('/').pop()?.replace(/\.md$/, '') ?? note.title;
        this.indexedNotes.set(nextPath, { ...note, path: nextPath, title: note.title === oldBasename ? newBasename : note.title });
      }
      this.publish();
      if (file instanceof TFile) this.indexFile(file);
    }));
    this.app.workspace.onLayoutReady(() => { for (const file of this.app.vault.getMarkdownFiles()) this.indexFile(file, false); this.publish(); });
  }
  onunload(): void { this.listeners.clear(); }
  async openAtlas(key?: AtlasEntityKey): Promise<void> {
    const selection = key && resolveEntity(buildCatalog(this.snapshot.notes), key);
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
  openEntityNote = (selection: AtlasSelection): void => {
    this.run(this.storage.ensureEntityNote(selection).then(file => { this.indexFile(file); return this.storage.open(file.path); }));
  };
  linkNote = (selection: AtlasSelection): void => {
    new LinkNoteModal(this.app, async file => { await this.storage.link(file, selection.key); this.indexFile(file); new Notice(`Note reliée à ${selection.title}.`); }).open();
  };
  newResearch = (keys: AtlasEntityKey[]): void => {
    new ResearchModal(this.app, keys, async draft => { const file = await this.storage.createResearch(draft); this.indexFile(file); await this.storage.open(file.path); }).open();
  };
  newInvestigation = (selections: AtlasSelection[]): void => {
    const catalog = buildCatalog(this.snapshot.notes);
    const related = [...new Map(selections.flatMap(selection => relatedEntities(selection, catalog)).filter(selection => !selections.some(item => item.key === selection.key)).map(item => [item.key, item])).values()].slice(0, Math.max(0, 12 - selections.length));
    new InvestigationModal(this.app, selections, related, async (items, question) => { const file = await this.storage.createInvestigation(items, question); await this.storage.open(file.path); }).open();
  };
}
