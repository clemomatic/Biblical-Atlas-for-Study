import {
  ItemView, MarkdownRenderer, Notice, TFile, setIcon,
  type WorkspaceLeaf
} from 'obsidian';
import styles from './bibleLabLibrary.css?inline';
import {
  LIBRARY_FILTERS,filteredVolumes,loadLibraryVolumes,localDocumentFile,
  localDocumentUrl,searchLibrary,
  type LibraryCategory,type LibrarySearchResult,type LibraryVolume
} from './libraryCatalog';
import type { OfflineDocumentRecord } from './offlinePublications';

export const BIBLE_LAB_LIBRARY_VIEW='bible-lab-personal-library';
export interface LibraryActions {
  root:()=>string;
  importJwpub:()=>void;
  downloads:()=>void;
  readReference:(url:string,label:string)=>Promise<void>;
}
const button=(parent:HTMLElement,label:string,icon:string,fn:()=>void,cls=''):HTMLButtonElement=>{
  const b=parent.createEl('button',{cls:'blb-action '+cls,
    attr:{type:'button','aria-label':label,title:label}});
  const image=b.createSpan();setIcon(image,icon);
  b.createSpan({text:label});
  b.addEventListener('click',fn);
  return b;
};
const display=(value:string)=>value.length>165?value.slice(0,162)+'…':value;
const readerMarkdown=(text:string)=>text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'')
  .replace(/^# [^\n]+\r?\n/,'').trim();
const iconByCategory=(category:LibraryVolume['category']):string=>({
  bible:'book-open-text',books:'book-open',magazines:'newspaper',
  brochures:'files',assemblies:'calendar-days',schools:'graduation-cap',other:'book-marked'
})[category];
const categoryName=(category:LibraryVolume['category'])=>
  LIBRARY_FILTERS.find(f=>f.id===category)?.title||'Autres';

export class BibleLabLibraryView extends ItemView {
  private actions:LibraryActions;
  private volumes:LibraryVolume[]=[];
  private filter:LibraryCategory='all';
  private term='';
  private selectedPath:string|null=null;
  private selectedDocument:number|null=null;
  private content!:HTMLElement;
  private resultCount!:HTMLElement;
  private input!:HTMLInputElement;
  private token=0;
  private debounceId:number|null=null;
  private active=false;
  constructor(leaf:WorkspaceLeaf,actions:LibraryActions){super(leaf);this.actions=actions;}
  getViewType():string{return BIBLE_LAB_LIBRARY_VIEW;}
  getDisplayText():string{return 'Bible Lab · Ma bibliothèque';}
  getIcon():string{return 'library-big';}
  async onOpen():Promise<void>{
    this.active=true;
    this.contentEl.addClass('blb-library');
    this.renderChrome();
    await this.refresh();
  }
  async onClose():Promise<void>{
    this.active=false;this.token++;
    if(this.debounceId!==null)window.clearTimeout(this.debounceId);
    this.contentEl.empty();
  }
  /** Called after a new JWPUB has been imported or an index was removed. */
  async refresh():Promise<void>{
    const version=++this.token;
    try{
      const volumes=await loadLibraryVolumes(this.app,this.actions.root());
      if(!this.active||this.token!==version)return;
      this.volumes=volumes;
      if(this.selectedPath&&!volumes.some(v=>v.path===this.selectedPath)){
        this.selectedPath=null;this.selectedDocument=null;
      }
      this.renderContent();
    }catch{
      if(this.active)this.content.createEl('p',{cls:'blb-empty',text:'Impossible de lire la bibliothèque locale.'});
    }
  }
  private renderChrome():void{
    this.contentEl.empty();
    this.contentEl.createEl('style',{text:styles});
    const layout=this.contentEl.createDiv({cls:'blb-shell'});
    const hero=layout.createDiv({cls:'blb-hero'});
    const headline=hero.createDiv({cls:'blb-title-group'});
    const eyebrow=headline.createDiv({cls:'blb-eyebrow'});
    const emblem=eyebrow.createSpan();setIcon(emblem,'library-big');
    eyebrow.createSpan({text:'BIBLE LAB · BIBLIOTHÈQUE PERSONNELLE'});
    headline.createEl('h1',{text:'Ma bibliothèque'});
    headline.createEl('p',{text:'Tes publications, tes lectures et tes recherches. Même sans connexion.'});
    const actions=hero.createDiv({cls:'blb-head-actions'});
    button(actions,'Importer un JWPUB','file-plus-2',this.actions.importJwpub);
    button(actions,'Télécharger une publication','download',this.actions.downloads,'primary');
    const controls=layout.createDiv({cls:'blb-controls'});
    const search=controls.createDiv({cls:'blb-search'});
    const glass=search.createSpan();setIcon(glass,'search');
    this.input=search.createEl('input',{attr:{type:'search',
      placeholder:'Rechercher un livre, un article ou dans le texte…',
      'aria-label':'Rechercher dans ma bibliothèque',
      autocomplete:'off'}});
    this.input.value=this.term;
    this.input.addEventListener('input',()=>{
      this.term=this.input.value;
      this.token++;
      if(this.debounceId!==null)window.clearTimeout(this.debounceId);
      this.debounceId=window.setTimeout(()=>void this.renderContent(),200);
    });
    this.resultCount=controls.createSpan({cls:'blb-result-count'});
    const list=layout.createDiv({cls:'blb-filters',attr:{
      role:'group','aria-label':'Types de publications'}});
    for(const cat of LIBRARY_FILTERS){
      const tab=button(list,cat.title,cat.icon,()=>{this.filter=cat.id;this.renderContent();},
        'blb-category');
      tab.dataset.category=cat.id;
    }
    this.content=layout.createDiv({cls:'blb-content',attr:{'aria-live':'polite'}});
  }
  private selectedVolume():LibraryVolume|null{
    return this.volumes.find(v=>v.path===this.selectedPath)||null;
  }
  private updateFilters():void{
    this.contentEl.querySelectorAll<HTMLButtonElement>('.blb-category').forEach(btn=>{
      const active=btn.dataset.category===this.filter;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',String(active));
    });
  }
  private async renderContent():Promise<void>{
    if(!this.active)return;
    const ticket=++this.token;
    this.updateFilters();
    this.content.empty();
    const available=filteredVolumes(this.volumes,this.filter);
    this.resultCount.setText(this.volumes.length+' publication'+(this.volumes.length>1?'s':'')+' · hors ligne');
    const term=this.term.trim();
    if(term.length>=2){
      this.content.createEl('p',{cls:'blb-loading',text:'Recherche dans tes documents locaux…'});
      const results=await searchLibrary(this.app,available,term);
      if(!this.active||this.token!==ticket)return;
      this.content.empty();
      this.renderSearchResults(results);
      return;
    }
    if(!available.length){this.renderEmpty();return;}
    const selected=this.selectedVolume();
    if(selected&&available.some(x=>x.path===selected.path)){
      if(this.selectedDocument!==null){
        const document=selected.items.find(x=>x.documentId===this.selectedDocument);
        if(document){void this.renderReader(selected,document,ticket);return;}
      }
      this.renderVolume(selected);return;
    }
    this.selectedPath=null;this.selectedDocument=null;
    this.renderShelf(available);
  }
  private renderEmpty():void{
    const empty=this.content.createDiv({cls:'blb-empty'});
    const symbol=empty.createSpan();setIcon(symbol,'book-open');
    empty.createEl('h2',{text:this.volumes.length?'Aucune publication dans cette catégorie':'Une bibliothèque à toi'});
    empty.createEl('p',{text:this.volumes.length?
      'Choisis une autre catégorie, ou importe une nouvelle publication.':
      'Importe un fichier JWPUB que tu possèdes pour retrouver ici ses documents et les lire hors connexion.'});
    button(empty,'Importer mon premier JWPUB','file-plus',this.actions.importJwpub,'primary');
  }
  private renderCover(parent:HTMLElement,volume:LibraryVolume,large=false):void{
    const cover=parent.createDiv({cls:'blb-cover'+(large?' large':'')+
      ' category-'+volume.category});
    if(volume.coverPath){
      const file=this.app.vault.getAbstractFileByPath(volume.coverPath);
      if(file instanceof TFile){
        const img=cover.createEl('img',{attr:{
          src:this.app.vault.getResourcePath(file),alt:'Couverture de '+volume.title,loading:'lazy'}});
        img.addEventListener('error',()=>{img.remove();cover.classList.remove('has-image');});
        cover.addClass('has-image');
      }
    }
    const design=cover.createDiv({cls:'blb-cover-design'});
    const icon=design.createSpan();setIcon(icon,iconByCategory(volume.category));
    design.createSpan({cls:'blb-cover-symbol',text:volume.symbol.toUpperCase().slice(0,16)});
    design.createSpan({cls:'blb-cover-year',text:volume.year>0?String(volume.year):'BIBLE LAB'});
  }
  private renderShelf(volumes:LibraryVolume[]):void{
    const top=this.content.createDiv({cls:'blb-section-head'});
    top.createEl('h2',{text:this.filter==='all'?'Mes publications':
      LIBRARY_FILTERS.find(x=>x.id===this.filter)?.title||'Mes publications'});
    top.createSpan({text:volumes.length+' disponibles hors ligne'});
    const grid=this.content.createDiv({cls:'blb-book-grid'});
    for(const volume of volumes){
      const card=grid.createEl('button',{cls:'blb-book-card',attr:{
        type:'button','aria-label':'Ouvrir '+volume.title}});
      this.renderCover(card,volume);
      const text=card.createDiv({cls:'blb-book-meta'});
      text.createEl('strong',{text:display(volume.title)});
      text.createSpan({text:categoryName(volume.category)+' · '+volume.documents+' documents'});
      const badge=text.createSpan({cls:'blb-local-mark'});
      const status=badge.createSpan();setIcon(status,'hard-drive');
      badge.createSpan({text:volume.origin==='download'?'Téléchargée':'Importée'});
      card.addEventListener('click',()=>{
        this.selectedPath=volume.path;this.selectedDocument=null;void this.renderContent();
      });
    }
  }
  private crumbs(volume:LibraryVolume,doc?:OfflineDocumentRecord):void{
    const path=this.content.createDiv({cls:'blb-breadcrumb'});
    button(path,'Bibliothèque','arrow-left',()=>{
      this.selectedPath=null;this.selectedDocument=null;this.term='';this.input.value='';
      void this.renderContent();
    });
    if(doc)button(path,volume.title,'chevron-right',()=>{
      this.selectedDocument=null;void this.renderContent();
    });
    if(doc)path.createSpan({text:display(doc.title)});
  }
  private renderVolume(volume:LibraryVolume):void{
    this.crumbs(volume);
    const mast=this.content.createDiv({cls:'blb-volume-hero'});
    this.renderCover(mast,volume,true);
    const data=mast.createDiv({cls:'blb-volume-info'});
    data.createSpan({cls:'blb-eyebrow',text:categoryName(volume.category)+' · '+(volume.origin==='personal'?'Import personnel':'Téléchargement confirmé')});
    data.createEl('h2',{text:volume.title});
    data.createEl('p',{text:volume.documents+' documents disponibles hors connexion'+
      (volume.year?' · '+volume.year:'')});
    button(data,'Revenir aux publications','layout-grid',()=>{
      this.selectedPath=null;void this.renderContent();
    });
    const section=this.content.createDiv({cls:'blb-section-head'});
    section.createEl('h2',{text:'Sommaire'});
    const list=this.content.createDiv({cls:'blb-document-list'});
    for(let i=0;i<volume.items.length;i++){
      const doc=volume.items[i];
      const line=list.createEl('button',{cls:'blb-document-line',attr:{
        type:'button','aria-label':'Lire '+doc.title}});
      line.createSpan({cls:'blb-line-num',text:String(i+1).padStart(2,'0')});
      line.createSpan({cls:'blb-line-title',text:doc.title});
      const online=line.createSpan({cls:'blb-line-status'});
      setIcon(online,doc.mepsId?'link':'file-text');
      line.addEventListener('click',()=>{
        this.selectedDocument=doc.documentId;void this.renderContent();
      });
    }
  }
  private async renderReader(volume:LibraryVolume,doc:OfflineDocumentRecord,ticket:number):Promise<void>{
    this.crumbs(volume,doc);
    const nav=this.content.createDiv({cls:'blb-reader-actions'});
    const file=localDocumentFile(this.app,volume,doc);
    if(!file){
      this.content.createEl('p',{cls:'blb-empty',text:'Ce document a été déplacé ou supprimé du coffre.'});
      return;
    }
    button(nav,'Ouvrir la note modifiable','file-pen-line',
      ()=>{void this.app.workspace.getLeaf('tab').openFile(file)});
    button(nav,'Copier un lien vers cette note','link',()=>void this.copyNoteLink(file,doc.title));
    const official=localDocumentUrl(volume,doc);
    if(official)button(nav,'Ouvrir la référence dans Bible Lab','book-open-check',
      ()=>void this.actions.readReference(official,doc.title));
    const hero=this.content.createDiv({cls:'blb-reader-intro'});
    hero.createSpan({cls:'blb-eyebrow',text:volume.title+' · '+(volume.year||'')});
    hero.createEl('h1',{text:doc.title});
    const location=hero.createDiv({cls:'blb-reader-caption'});
    const check=location.createSpan();setIcon(check,'check-circle-2');
    location.createSpan({text:'Lecture locale · aucun accès Internet nécessaire'});
    const reader=this.content.createEl('article',{cls:'blb-reader-text markdown-rendered'});
    reader.createEl('p',{cls:'blb-loading',text:'Chargement du document local…'});
    try{
      const raw=await this.app.vault.cachedRead(file);
      if(!this.active||this.token!==ticket)return;
      reader.empty();
      await MarkdownRenderer.render(this.app,readerMarkdown(raw),reader,file.path,this);
      if(!this.active||this.token!==ticket)return;
      reader.addEventListener('click',event=>{
        const el=event.target as Element|null;
        const anchor=el?.closest?.('a[href]') as HTMLAnchorElement|null;
        if(!anchor)return;
        const href=anchor.getAttribute('href')||'';
        if(/^https:\/\/wol\.jw\.org\//.test(href)){
          event.preventDefault();
          void this.actions.readReference(href,anchor.textContent||'Référence WOL');
        }
      });
    }catch{
      reader.empty();
      reader.createEl('p',{text:'Lecture impossible. Tu peux ouvrir la note Markdown pour vérifier son contenu.'});
    }
    const bottom=this.content.createDiv({cls:'blb-reader-pager'});
    const index=volume.items.findIndex(x=>x.documentId===doc.documentId);
    const previous=volume.items[index-1],next=volume.items[index+1];
    if(previous)button(bottom,'Précédent','arrow-left',()=>{
      this.selectedDocument=previous.documentId;void this.renderContent();
    });
    if(next)button(bottom,'Suivant','arrow-right',()=>{
      this.selectedDocument=next.documentId;void this.renderContent();
    });
  }
  private async copyNoteLink(file:TFile,title:string):Promise<void>{
    const link='[['+file.path.replace(/\.md$/,'').replace(/\|/g,' ')+'|'+
      title.replace(/[\]|\[]/g,' ') +']]';
    try{await navigator.clipboard.writeText(link);new Notice('Lien vers la note copié.');}
    catch{new Notice('Copie indisponible sur cet appareil.');}
  }
  private renderSearchResults(items:LibrarySearchResult[]):void{
    const head=this.content.createDiv({cls:'blb-section-head'});
    head.createEl('h2',{text:'Dans ma bibliothèque'});
    head.createSpan({text:items.length+(items.length===60?' premiers':'')+' résultat(s)'});
    if(!items.length){
      const empty=this.content.createDiv({cls:'blb-empty'});
      empty.createEl('p',{text:'Aucun résultat local. Essaie un autre terme ou importe une publication.'});
      return;
    }
    const list=this.content.createDiv({cls:'blb-search-list'});
    for(const result of items){
      const card=list.createEl('button',{cls:'blb-search-result',attr:{
        type:'button','aria-label':'Lire '+result.item.title}});
      const badge=card.createSpan({cls:'blb-search-icon'});
      setIcon(badge,'file-search');
      const copy=card.createDiv();
      copy.createEl('strong',{text:result.item.title});
      copy.createSpan({cls:'blb-result-source',text:result.volume.title});
      if(result.snippet)copy.createEl('p',{text:result.snippet});
      card.addEventListener('click',()=>{
        this.term='';this.input.value='';
        this.selectedPath=result.volume.path;
        this.selectedDocument=result.item.documentId;
        void this.renderContent();
      });
    }
  }
}
