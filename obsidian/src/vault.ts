import { TFile, TFolder, type App } from 'obsidian';
import type { AtlasEntityKey, AtlasSelection } from '../../src/atlasIntegration';
import { atlasDeepLink, investigationCanvas, safeFilename, validFolder, type VaultNote } from './model';

export interface ResearchDraft {
  title: string;
  question: string;
  kind: 'research' | 'event' | 'place';
  keys: AtlasEntityKey[];
  startYear?: number;
  endYear?: number;
  latitude?: number;
  longitude?: number;
  references?: string[];
}

const yaml = (fields: Record<string, unknown>): string => `---\n${Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\n`;
const markdownText = (text: string): string => text.replace(/[\[\]\\]/g, '\\$&').replace(/[\r\n]/g, ' ');
const sourceLink = (label: string, url?: string): string => url && /^https?:\/\//.test(url)
  ? `[${markdownText(label)}](<${url.replace(/[<>\r\n]/g, '')}>)` : markdownText(label);

/** All writes use Vault/FileManager APIs, with create-only files and per-entity locks. */
export class AtlasVault {
  private pendingNotes = new Map<AtlasEntityKey, Promise<TFile>>();
  private createdNotes = new Map<AtlasEntityKey, TFile>();

  constructor(private app: App, private folder: () => string, private notes: () => readonly VaultNote[], private version: string) {}

  private async ensureFolder(path: string): Promise<void> {
    let current = '';
    for (const part of validFolder(path).split('/')) {
      current = current ? `${current}/${part}` : part;
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (existing instanceof TFolder) continue;
      if (existing) throw new Error(`« ${current} » est déjà un fichier.`);
      try { await this.app.vault.createFolder(current); }
      catch (error) { if (!(this.app.vault.getAbstractFileByPath(current) instanceof TFolder)) throw error; }
    }
  }

  private async createUnique(folder: string, title: string, extension: string, content: string): Promise<TFile> {
    await this.ensureFolder(folder);
    const basename = safeFilename(title);
    for (let index = 0; index < 100; index++) {
      const path = `${folder}/${basename}${index ? ` (${index + 1})` : ''}.${extension}`;
      if (this.app.vault.getAbstractFileByPath(path)) continue;
      try { return await this.app.vault.create(path, content); }
      catch (error) { if (!this.app.vault.getAbstractFileByPath(path)) throw error; }
    }
    throw new Error('Choisis un titre différent : trop de fichiers portent déjà ce nom.');
  }

  async open(path: string): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) throw new Error('Cette note a été déplacée ou supprimée.');
    await this.app.workspace.getLeaf('tab').openFile(file);
  }

  async link(file: TFile, key: AtlasEntityKey): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, frontmatter => {
      const previous = Array.isArray(frontmatter.atlas_entities) ? frontmatter.atlas_entities
        : typeof frontmatter.atlas_entities === 'string' ? [frontmatter.atlas_entities] : [];
      frontmatter.atlas_entities = [...new Set([...previous, key])];
      if (frontmatter.atlas_schema === undefined) frontmatter.atlas_schema = 1;
    });
  }

  ensureEntityNote(selection: AtlasSelection): Promise<TFile> {
    const existing = this.notes().find(note => note.keys.includes(selection.key));
    const file = existing && this.app.vault.getAbstractFileByPath(existing.path);
    if (file instanceof TFile) return Promise.resolve(file);
    const created = this.createdNotes.get(selection.key);
    if (created && this.app.vault.getAbstractFileByPath(created.path) === created) return Promise.resolve(created);
    const pending = this.pendingNotes.get(selection.key);
    if (pending) return pending;
    const operation = this.writeEntityNote(selection).then(file => { this.createdNotes.set(selection.key, file); return file; }).finally(() => this.pendingNotes.delete(selection.key));
    this.pendingNotes.set(selection.key, operation);
    return operation;
  }

  private async writeEntityNote(selection: AtlasSelection): Promise<TFile> {
    const entity = selection.entity;
    const references = entity.biblicalReferences ?? [];
    const sources = entity.sources ?? [];
    const encyclopedia = entity.encyclopediaReferences ?? [];
    const text = [
      yaml({ atlas_schema: 1, atlas_entities: [selection.key], atlas_origin: 'corpus-snapshot', atlas_corpus_version: this.version }),
      `# ${markdownText(selection.title)}\n`,
      `[Explorer dans l’Atlas](${atlasDeepLink(selection.key, this.app.vault.getName())})\n`,
      '> [!info] Repère documentaire\n> Cette fiche conserve un instantané du corpus. Tes recherches ci-dessous restent personnelles ; les mises à jour du plugin ne réécrivent pas cette note.\n',
      entity.description ? `${entity.description}\n` : '',
      `## Références bibliques\n\n${references.length ? references.map(ref => `- ${ref}`).join('\n') : 'À compléter.'}\n`,
      `## Sources\n\n${[...sources.map(source => `- ${sourceLink(source.label, source.url)}`), ...encyclopedia.map(source => `- ${sourceLink(source.articleTitle, source.url)}`)].join('\n') || 'Consulter « Sources et méthode » dans la fiche Atlas.'}\n`,
      `## Mes observations\n\n\n## Mes questions\n\n\n## Ce que j’en retiens\n\n`
    ].filter(Boolean).join('\n');
    return this.createUnique(`${validFolder(this.folder())}/Fiches`, selection.title, 'md', text);
  }

  async createResearch(draft: ResearchDraft): Promise<TFile> {
    const text = yaml({ atlas_schema: 1, atlas_kind: draft.kind, atlas_uid: crypto.randomUUID(), atlas_title: draft.title,
      atlas_entities: draft.keys, atlas_start_year: draft.startYear, atlas_end_year: draft.endYear,
      atlas_latitude: draft.latitude, atlas_longitude: draft.longitude, atlas_references: draft.references ?? [] }) +
      `# ${markdownText(draft.title)}\n\n## Ma question\n\n${draft.question.trim() || 'Qu’est-ce que je souhaite comprendre ?'}\n\n## Mes observations\n\n\n## Sources et versets\n\n\n## Ma méditation\n\nQue m’apprend cette recherche sur Jéhovah ? Comment agir ?\n`;
    return this.createUnique(`${validFolder(this.folder())}/Recherches`, draft.title, 'md', text);
  }

  async createInvestigation(selections: AtlasSelection[], question: string): Promise<TFile> {
    const unique = [...new Map(selections.map(item => [item.key, item])).values()].slice(0, 12);
    if (!unique.length) throw new Error('Sélectionne au moins une fiche pour commencer une enquête.');
    const files: string[] = [];
    for (const selection of unique) files.push((await this.ensureEntityNote(selection)).path);
    const questionFile = await this.createResearch({ title: `Enquête — ${unique[0].title}`, question, kind: 'research', keys: unique.map(item => item.key) });
    const canvas = investigationCanvas(questionFile.path, files);
    return this.createUnique(`${validFolder(this.folder())}/Enquêtes`, unique[0].title, 'canvas', `${JSON.stringify(canvas, null, 2)}\n`);
  }
}
