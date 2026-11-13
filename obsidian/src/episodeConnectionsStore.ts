import { parseYaml, stringifyYaml, TFile, TFolder, type App } from 'obsidian';
import type { PersonalEpisodeConnection } from './episodeConnections.ts';
import { automaticEntityKeys, EPISODE_CONNECTIONS_SCHEMA, reconcileEntityKeys } from './episodeConnections.ts';
import type { StudyFact } from './studyFacts.ts';
import { studyFactEntityKeys, validateStudyFacts } from './studyFacts.ts';
import { safeFilename, validFolder } from './model.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const stringArray = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [])
    .filter((value): value is string => typeof value === 'string');

export interface EpisodeConnectionsDocument {
  file?: TFile;
  raw?: string;
  items: PersonalEpisodeConnection[];
  facts: StudyFact[];
  personalTitle?: string;
  personalReference?: string;
}

/** A personal, human-editable Markdown document per episode; no writes to corpus. */
export class EpisodeConnectionsStore {
  private recentPaths = new Map<string, string>();
  private recentTitles = new Map<string, string>();
  private queues = new Map<string, Promise<unknown>>();
  constructor(private app: App, private folder: () => string) {}

  private async folderExists(folder: string): Promise<void> {
    let path = '';
    for (const part of validFolder(folder).split('/')) {
      path = path ? path + '/' + part : part;
      const found = this.app.vault.getAbstractFileByPath(path);
      if (found instanceof TFolder) continue;
      if (found) throw new Error('Un fichier empêche de créer le dossier ' + path);
      try { await this.app.vault.createFolder(path); }
      catch (error) {
        if (!(this.app.vault.getAbstractFileByPath(path) instanceof TFolder)) throw error;
      }
    }
  }

  private candidates(eventId: string): TFile[] {
    const result = this.app.vault.getMarkdownFiles().filter(file => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return frontmatter?.jwsd_kind === 'episode-connections' && frontmatter.jwsd_episode_id === eventId;
    });
    const recent = this.recentPaths.get(eventId);
    const file = recent && this.app.vault.getAbstractFileByPath(recent);
    if (file instanceof TFile && !result.some(item => item.path === file.path)) result.push(file);
    return result;
  }

  async read(eventId: string): Promise<EpisodeConnectionsDocument> {
    const candidates = this.candidates(eventId);
    if (candidates.length > 1) {
      throw new Error('Plusieurs carnets personnels utilisent cet épisode. Renomme ou réconcilie ces fiches avant de poursuivre.');
    }
    const file = candidates[0];
    if (!file) return { items: [], facts: [] };
    const raw = await this.app.vault.read(file);
    const match = FRONTMATTER.exec(raw);
    if (!match) throw new Error('Le carnet de connexions n’a pas de propriétés YAML valides.');
    const data = parseYaml(match[1]) as Record<string, unknown> | null;
    if (!data || data.jwsd_kind !== 'episode-connections' || data.jwsd_episode_id !== eventId ||
      ![1, EPISODE_CONNECTIONS_SCHEMA].includes(data.jwsd_schema as number)) {
      throw new Error('Carnet de connexions incomplet ou version de données non reconnue.');
    }
    if (!Array.isArray(data.jwsd_episode_connections)) throw new Error('Les connexions du carnet ne sont pas un tableau valide.');
    return { file, raw, items: data.jwsd_episode_connections as PersonalEpisodeConnection[],
      facts: validateStudyFacts(data.jwsd_episode_facts ?? []),
      personalTitle: typeof data.jwsd_episode_title === 'string' ? data.jwsd_episode_title : undefined,
      personalReference: typeof data.jwsd_episode_reference === 'string' ? data.jwsd_episode_reference : undefined };
  }

  listPersonalEpisodes(): Array<{id:string;title:string}> {
    const items=new Map(this.recentTitles);
    for(const file of this.app.vault.getMarkdownFiles()){
      const meta=this.app.metadataCache.getFileCache(file)?.frontmatter;
      if(meta?.jwsd_kind==='episode-connections' && typeof meta.jwsd_episode_id==='string' &&
        typeof meta.jwsd_episode_title==='string')items.set(meta.jwsd_episode_id,meta.jwsd_episode_title);
    }
    return [...items].map(([id,title])=>({id,title})).sort((a,b)=>a.title.localeCompare(b.title,'fr'));
  }

  async createPersonalEpisode(title:string,reference:string):Promise<{id:string;file:TFile}>{
    const name=title.replace(/[\r\n\x00-\x1f]/g,' ').trim();
    const source=reference.replace(/[\r\n\x00-\x1f]/g,' ').trim();
    if(!name||name.length>160)throw new Error('Donne un titre précis (160 caractères maximum).');
    if(!source||source.length>280)throw new Error('Ajoute une référence documentaire (280 caractères maximum).');
    const id='study-'+crypto.randomUUID();
    const file=await this.save(id,name,[],undefined,[]);
    await this.app.fileManager.processFrontMatter(file,metadata=>{
      if(metadata.jwsd_episode_id!==id)throw new Error('Cet épisode a changé pendant sa création.');
      metadata.jwsd_episode_title=name;
      metadata.jwsd_episode_reference=source;
    });
    this.recentTitles.set(id,name);
    return {id,file};
  }

  async save(
    eventId: string,
    title: string,
    items: PersonalEpisodeConnection[],
    expectedRaw: string | undefined,
    facts: StudyFact[]
  ): Promise<TFile> {
    const previous = this.queues.get(eventId) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(() => this.saveNow(eventId, title, items, expectedRaw, facts));
    this.queues.set(eventId, operation);
    try { return await operation; }
    finally { if (this.queues.get(eventId) === operation) this.queues.delete(eventId); }
  }

  private async saveNow(
    eventId: string,
    title: string,
    items: PersonalEpisodeConnection[],
    expectedRaw: string | undefined,
    facts: StudyFact[]
  ): Promise<TFile> {
    const current = await this.read(eventId);
    if (current.raw !== expectedRaw) throw new Error('Cette fiche a été modifiée depuis son ouverture. Rouvre l’éditeur pour éviter de perdre des changements.');
    const validatedFacts = validateStudyFacts(facts);
    const auto = [...new Set([
      ...automaticEntityKeys(eventId, items),
      ...studyFactEntityKeys(eventId, validatedFacts)
    ])];
    if (!current.file) {
      const folder = validFolder(this.folder()) + '/Connexions';
      await this.folderExists(folder);
      const base = safeFilename('Contexte — ' + title).slice(0, 86);
      const body = '\n# ' + title.replace(/[\r\n]/g,' ') +
        '\n\n> [!info] Mes connexions d’étude\n> Les liens enregistrés ici sont des ajouts personnels, distincts des données historiques relues de l’Atlas.\n\n' +
        '\x60\x60\x60jwsd\nevent:' + eventId + '\n\x60\x60\x60\n\n## Mes observations\n\n';
      const properties = {
        jwsd_schema: EPISODE_CONNECTIONS_SCHEMA, jwsd_kind: 'episode-connections',
        jwsd_episode_id: eventId, jwsd_episode_connections: items,
        jwsd_episode_facts: validatedFacts,
        jwsd_auto_entities: auto, atlas_entities: auto
      };
      const content = '---\n' + stringifyYaml(properties) + '---\n' + body;
      for (let index = 0; index < 100; index++) {
        const path = folder + '/' + base + (index ? ' (' + (index+1) + ')' : '') + '.md';
        if (this.app.vault.getAbstractFileByPath(path)) continue;
        try {
          const file = await this.app.vault.create(path, content);
          this.recentPaths.set(eventId, file.path);
          return file;
        } catch (error) {
          if (!this.app.vault.getAbstractFileByPath(path)) throw error;
        }
      }
      throw new Error('Impossible de choisir un nom de carnet libre.');
    }
    const file = current.file;
    await this.app.vault.process(file, raw => {
      if (raw !== expectedRaw) throw new Error('Cette fiche a changé depuis son ouverture. Aucune modification n’a été enregistrée.');
      const match = FRONTMATTER.exec(raw);
      if (!match) throw new Error('Propriétés YAML introuvables.');
      const metadata = parseYaml(match[1]) as Record<string, unknown> | null;
      if (!metadata || metadata.jwsd_kind !== 'episode-connections' || metadata.jwsd_episode_id !== eventId) {
        throw new Error('Le carnet ne correspond plus à cet événement.');
      }
      const updated = {
        ...metadata,
        jwsd_schema: EPISODE_CONNECTIONS_SCHEMA,
        jwsd_episode_connections: items,
        jwsd_episode_facts: validatedFacts,
        jwsd_auto_entities: auto,
        atlas_entities: reconcileEntityKeys(
          stringArray(metadata.atlas_entities), stringArray(metadata.jwsd_auto_entities), auto
        )
      };
      return '---\n' + stringifyYaml(updated) + '---\n' + raw.slice(match[0].length);
    });
    this.recentPaths.set(eventId, file.path);
    return file;
  }
}
