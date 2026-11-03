import { ItemView, Notice, setIcon, type ViewStateResult, type WorkspaceLeaf } from 'obsidian';
import styles from './bibleLab.css?inline';
import { parseScripture } from './bibleLabData';
import { cleanWolUrl, type ReferenceEntry } from './referenceReader';
import { renderReferenceAccordion, type ReaderState } from './referencePanel';
import { cleanReadingText } from './readerText';

/** A real Obsidian tab, not an iframe, a WebView or a new Markdown file. */
export const BIBLE_LAB_ARTICLE_VIEW = 'bible-lab-wol-article';

function articleState(value: unknown): ReferenceEntry | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (typeof data.url !== 'string') return null;
  const url = cleanWolUrl(data.url);
  if (!url) return null;
  const label = typeof data.label === 'string'
    ? cleanReadingText(data.label).slice(0, 180) : '';
  const scripture = url.includes('/wol/b/') || !!parseScripture(label);
  return {
    url, label: label || 'Document WOL',
    kind: scripture ? 'scripture' : url.includes('/wol/d/') ? 'document' : 'publication',
    origin: 'pinned'
  };
}

export class BibleLabArticleView extends ItemView {
  private current: ReferenceEntry | null = null;
  private history: ReferenceEntry[] = [];
  private historyIndex = -1;
  private readonly reader: ReaderState;

  constructor(leaf: WorkspaceLeaf, private readonly openInNewTab: (ref: ReferenceEntry) => Promise<void>) {
    super(leaf);
    this.reader = {
      expanded: new Set(), cache: new Map(), pending: new Map(),
      copy: text => {
        void navigator.clipboard.writeText(text).then(
          () => new Notice('Copié dans le presse-papiers.'),
          () => new Notice('Copie indisponible sur cet appareil.')
        );
      },
      open: url => window.open(url, '_blank', 'noopener,noreferrer'),
      navigate: ref => this.navigate(ref),
      openInTab: ref => { void this.openInNewTab(ref); }
    };
  }

  getViewType(): string { return BIBLE_LAB_ARTICLE_VIEW; }
  getDisplayText(): string { return this.current?.label || 'Article WOL'; }
  getIcon(): string { return 'book-open-text'; }
  getState(): Record<string, unknown> {
    return { url: this.current?.url || '', label: this.current?.label || '' };
  }
  async setState(state: unknown, _result: ViewStateResult): Promise<void> {
    const ref = articleState(state);
    if (!ref) return;
    this.current = ref;
    this.history = [ref];
    this.historyIndex = 0;
    this.render();
  }
  async onOpen(): Promise<void> { this.render(); }
  async onClose(): Promise<void> {
    this.reader.expanded.clear();
    this.reader.cache.clear();
    this.reader.pending.clear();
    this.contentEl.empty();
  }

  private navigate(ref: ReferenceEntry): void {
    const safe = articleState(ref);
    if (!safe) { new Notice('Ce lien ne correspond pas à une page officielle WOL.'); return; }
    if (this.current?.url === safe.url && this.current?.label === safe.label) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(safe);
    if (this.history.length > 40) this.history.shift();
    this.historyIndex = this.history.length - 1;
    this.current = safe;
    this.render();
    this.app.workspace.requestSaveLayout();
  }
  private move(direction: -1 | 1): void {
    const index = this.historyIndex + direction;
    if (index < 0 || index >= this.history.length) return;
    this.historyIndex = index;
    this.current = this.history[index];
    this.render();
    this.app.workspace.requestSaveLayout();
  }
  private button(parent: HTMLElement, label: string, icon: string, action: () => void): HTMLButtonElement {
    const btn = parent.createEl('button', {
      cls: 'biblelab-btn',
      attr: { type: 'button', 'aria-label': label }
    });
    const glyph = btn.createSpan(); setIcon(glyph, icon);
    btn.createSpan({ text: label });
    btn.addEventListener('click', action);
    return btn;
  }
  private render(): void {
    this.contentEl.empty();
    this.contentEl.addClass('biblelab-side', 'biblelab-article-tab');
    this.contentEl.createEl('style', { text: styles });
    const scrolling = this.contentEl.createDiv({ cls: 'biblelab-article-tab-scroll' });
    const page = scrolling.createDiv({ cls: 'biblelab-article-tab-inner' });
    const heading = page.createDiv({ cls: 'biblelab-article-tab-heading' });
    const identity = heading.createDiv();
    identity.createSpan({ cls: 'biblelab-article-tab-eyebrow', text: 'BIBLE LAB · LECTURE WOL' });
    identity.createEl('h2', { text: this.current?.label || 'Article WOL' });
    if (!this.current) {
      page.createEl('p', { cls: 'biblelab-reader-hint', text: 'Sélectionne un document WOL depuis la recherche Bible Lab.' });
      return;
    }
    const toolbar = page.createDiv({ cls: 'biblelab-article-tab-toolbar' });
    const previous = this.button(toolbar, 'Précédent', 'arrow-left', () => this.move(-1));
    previous.disabled = this.historyIndex <= 0;
    const next = this.button(toolbar, 'Suivant', 'arrow-right', () => this.move(1));
    next.disabled = this.historyIndex >= this.history.length - 1;
    if (this.history.length > 1) toolbar.createSpan({
      cls: 'biblelab-reader-history-count',
      text: (this.historyIndex + 1) + ' / ' + this.history.length
    });
    this.button(toolbar, 'Dupliquer dans un onglet', 'copy-plus', () => {
      if (this.current) void this.openInNewTab(this.current);
    });
    this.button(toolbar, 'Ouvrir sur WOL', 'external-link', () => {
      if (this.current) window.open(this.current.url, '_blank', 'noopener,noreferrer');
    });
    this.reader.expanded.clear();
    this.reader.expanded.add(this.current.url + '#' + this.current.label);
    const reading = page.createDiv({ cls: 'biblelab-article-tab-reading' });
    renderReferenceAccordion(reading, this.current, this.reader);
  }
}
