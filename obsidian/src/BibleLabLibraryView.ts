import {ItemView,MarkdownRenderer,Notice,setIcon,TFile,type TAbstractFile,type ViewStateResult,type WorkspaceLeaf} from 'obsidian';
import {readLocalPublicationIndexes} from './offlineReferenceLibrary';
import type {OfflineImportIndex,OfflineDocumentRecord} from './offlinePublications';
import {LIBRARY_GROUPS,classifyLibraryPublication,normalizeLibrarySearch,chooseLocalCover,
 localBookIcon,stripImportFrontmatter,documentSearchSnippet,lookupLocalDocumentId,
 bibleJwpubWebLink,type LibraryGroup} from './localLibraryCatalog';
import {cleanWolUrl} from './referenceReader';
import styles from './libraryView.css?inline';

export const BIBLE_LAB_LIBRARY_VIEW='bible-lab-personal-library';
type ShelfBook={folder:string;index:OfflineImportIndex;group:Exclude<LibraryGroup,'all'>;cover:string|null};
type SearchHit={book:ShelfBook;doc:OfflineDocumentRecord;snippet:string};
export type LibraryViewHost={folder:()=>string;importJwpub:()=>void;openWol:(url:string)=>Promise<void>};

export class BibleLabLibraryView extends ItemView{
 private books:ShelfBook[]=[];
 private activeFolder:string|null=null;
 private activeDoc:number|null=null;
 private group:LibraryGroup='all';
 private query='';
 private results:SearchHit[]=[];
 private searching=false;
 private searchTruncated=false;
 private searchSeq=0;
 private renderSeq=0;
 private queryTimer:number|null=null;
 private root!:HTMLElement;
 private content!:HTMLElement;
 private resultHost!:HTMLElement;

 constructor(leaf:WorkspaceLeaf,private host:LibraryViewHost){
  super(leaf);
  const changed=(file:TAbstractFile)=>{
   if(file.name==='_BIBLE_LAB_OFFLINE_INDEX.json')void this.reload();
  };
  this.registerEvent(this.app.vault.on('create',changed));
  this.registerEvent(this.app.vault.on('delete',changed));
  this.registerEvent(this.app.vault.on('rename',changed));
 }
 getViewType():string{return BIBLE_LAB_LIBRARY_VIEW;}
 getDisplayText():string{return 'Bible Lab · Ma bibliothèque';}
 getIcon():string{return 'library-big';}
 getState():Record<string,unknown>{return {folder:this.activeFolder,documentId:this.activeDoc,group:this.group};}
 async setState(state:unknown,_result:ViewStateResult):Promise<void>{
  if(state&&typeof state==='object'){
   const data=state as Record<string,unknown>;
   if(typeof data.folder==='string'&&data.folder.length<400)this.activeFolder=data.folder;
   if(typeof data.documentId==='number'&&Number.isSafeInteger(data.documentId))this.activeDoc=data.documentId;
   if(typeof data.group==='string'&&LIBRARY_GROUPS.some(c=>c.key===data.group))
    this.group=data.group as LibraryGroup;
  }
  if(this.root)await this.reload();
 }
 async onOpen():Promise<void>{
  this.contentEl.empty();this.contentEl.addClass('bl-library-tab');
  this.contentEl.createEl('style',{text:styles});
  this.root=this.contentEl.createDiv({cls:'bl-library-surface'});
  await this.reload();
 }
 async onClose():Promise<void>{
  this.searchSeq++;this.renderSeq++;
  if(this.queryTimer!==null)window.clearTimeout(this.queryTimer);
  this.contentEl.empty();
 }
 async reload():Promise<void>{
  const seq=++this.renderSeq;
  const indexes=await readLocalPublicationIndexes(this.app,this.host.folder());
  if(seq!==this.renderSeq)return;
  const files=this.app.vault.getFiles();
  this.books=indexes.map(({folder,index})=>{
   const assets=files.filter(file=>file.path.startsWith(folder+'/assets/'))
    .map(file=>file.path.slice(folder.length+1));
   return {folder,index,
    group:classifyLibraryPublication(index.publication.symbol,index.publication.title),
    cover:chooseLocalCover(assets)};
  });
  if(this.activeFolder&&!this.books.some(book=>book.folder===this.activeFolder)){
   this.activeFolder=null;this.activeDoc=null;
  }
  this.render();
  if(this.query.length>=2)void this.runSearch();
 }
 private glyph(parent:HTMLElement,name:string):void{
  const symbol=parent.createSpan({cls:'bl-library-symbol'});setIcon(symbol,name);
 }
 private button(parent:HTMLElement,title:string,icon:string,fn:()=>void,cls=''):HTMLButtonElement{
  const element=parent.createEl('button',{cls:'bl-library-action '+cls,
   attr:{type:'button','aria-label':title,title}});
  this.glyph(element,icon);element.createSpan({text:title});
  element.addEventListener('click',fn);
  return element;
 }
 private render():void{
  if(!this.root)return;
  this.root.empty();
  const header=this.root.createDiv({cls:'bl-library-header'});
  const title=header.createDiv({cls:'bl-library-title'});
  title.createSpan({cls:'bl-library-eyebrow',text:'BIBLE LAB  /  HORS LIGNE'});
  title.createEl('h1',{text:'Ma bibliothèque'});
  title.createEl('p',{text:'Publications, chapitres et idées au même endroit.'});
  const tools=header.createDiv({cls:'bl-library-header-tools'});
  this.button(tools,'Importer ou télécharger un JWPUB','download',this.host.importJwpub,'is-primary');
  this.button(tools,'Actualiser la bibliothèque','refresh-cw',()=>void this.reload(),'is-icon');
  const layout=this.root.createDiv({cls:'bl-library-layout'});
  const menu=layout.createEl('nav',{cls:'bl-library-nav',attr:{'aria-label':'Catégories de publications'}});
  menu.createSpan({cls:'bl-library-nav-label',text:'COLLECTIONS'});
  for(const category of LIBRARY_GROUPS){
   const n=category.key==='all'?this.books.length:this.books.filter(b=>b.group===category.key).length;
   const item=menu.createEl('button',{cls:'bl-library-nav-item'+
    (this.group===category.key?' is-selected':''),
    attr:{type:'button','aria-label':category.label,'aria-pressed':String(this.group===category.key)}});
   this.glyph(item,category.icon);
   item.createSpan({cls:'bl-library-nav-text',text:category.label});
   item.createSpan({cls:'bl-library-nav-count',text:String(n)});
   item.addEventListener('click',()=>{
    this.group=category.key;this.activeFolder=null;this.activeDoc=null;
    this.query='';this.results=[];this.searchSeq++;
    this.searching=false;this.render();
   });
  }
  const hint=menu.createDiv({cls:'bl-library-nav-hint'});
  this.glyph(hint,'hard-drive');hint.createSpan({text:'Tout est conservé dans ton coffre.'});
  this.content=layout.createDiv({cls:'bl-library-content'});
  this.renderContent();
 }
 private renderContent():void{
  if(!this.content)return;
  this.content.empty();
  if(this.activeFolder){this.renderBook();return;}
  const search=this.content.createDiv({cls:'bl-library-search'});
  this.glyph(search,'search');
  const field=search.createEl('input',{attr:{type:'search',
   placeholder:'Rechercher une publication ou un passage…',
   'aria-label':'Rechercher dans la bibliothèque locale'}});
  field.value=this.query;
  field.addEventListener('input',()=>{
   this.query=field.value;
   if(this.queryTimer!==null)window.clearTimeout(this.queryTimer);
   this.queryTimer=window.setTimeout(()=>void this.runSearch(),250);
   this.renderResults();
  });
  this.button(search,'Effacer la recherche','x',()=>{
   this.query='';this.results=[];this.searchSeq++;
   this.searching=false;this.renderContent();
  },'is-icon');
  this.resultHost=this.content.createDiv({cls:'bl-library-stage'});
  this.renderResults();
 }
 private renderResults():void{
  if(!this.resultHost)return;
  this.resultHost.empty();
  const term=normalizeLibrarySearch(this.query);
  const visible=this.books.filter(b=>(this.group==='all'||b.group===this.group)&&
   (!term||normalizeLibrarySearch(b.index.publication.title+' '+b.index.publication.symbol).includes(term)));
  const heading=this.resultHost.createDiv({cls:'bl-library-section-heading'});
  const summary=heading.createDiv();
  summary.createEl('h2',{text:this.group==='all'?'Mes publications':
   LIBRARY_GROUPS.find(c=>c.key===this.group)?.label||'Mes publications'});
  summary.createEl('p',{text:String(visible.length)+' publication(s) · accessibles hors ligne'});
  if(!this.books.length){
   const empty=this.resultHost.createDiv({cls:'bl-library-empty'});
   this.glyph(empty,'book-open-check');
   empty.createEl('h3',{text:'Ta bibliothèque commence ici'});
   empty.createEl('p',{text:'Importe un fichier JWPUB, y compris des documents d’école ou des programmes, pour les lire sans connexion.'});
   this.button(empty,'Importer mon premier JWPUB','plus',this.host.importJwpub,'is-primary');
   return;
  }
  const grid=this.resultHost.createDiv({cls:'bl-library-grid'});
  for(const book of visible)this.renderCard(grid,book);
  if(!visible.length)grid.createEl('p',{cls:'bl-library-muted',text:'Aucune publication correspondante.'});
  if(term.length>=2){
   const results=this.resultHost.createDiv({cls:'bl-library-results'});
   const sub=results.createDiv({cls:'bl-library-section-heading'});
   sub.createEl('h2',{text:'Dans les textes'});
   sub.createSpan({text:this.searching?'Recherche locale…':this.results.length+' résultat(s)'});
   for(const hit of this.results.filter(h=>this.group==='all'||h.book.group===this.group)){
    const item=results.createEl('button',{cls:'bl-library-search-hit',
     attr:{type:'button','aria-label':'Lire '+hit.doc.title}});
    this.glyph(item,'file-text');
    const text=item.createDiv();
    text.createEl('strong',{text:hit.doc.title});
    text.createSpan({text:hit.book.index.publication.title});
    text.createEl('p',{text:hit.snippet});
    this.glyph(item,'arrow-up-right');
    item.addEventListener('click',()=>{
     this.activeFolder=hit.book.folder;this.activeDoc=hit.doc.documentId;
     this.query='';this.searchSeq++;this.results=[];this.renderContent();
    });
   }
   if(!this.searching&&!this.results.length)
    results.createEl('p',{cls:'bl-library-muted',text:'Aucun passage correspondant dans les documents importés.'});
   if(this.searchTruncated)results.createEl('p',{cls:'bl-library-muted',
    text:'Résultats limités aux 60 premières correspondances.'});
  }
 }
 private renderCard(parent:HTMLElement,book:ShelfBook):void{
  const card=parent.createEl('button',{cls:'bl-library-card',attr:{
   type:'button','aria-label':'Ouvrir '+book.index.publication.title}});
  const cover=card.createDiv({cls:'bl-library-cover is-'+book.group});
  const image=book.cover&&this.app.vault.getAbstractFileByPath(book.folder+'/'+book.cover);
  if(image instanceof TFile && typeof this.app.vault.getResourcePath==='function')
   cover.createEl('img',{attr:{src:this.app.vault.getResourcePath(image),
    alt:'Couverture de '+book.index.publication.title,loading:'lazy'}});
  else{
   this.glyph(cover,localBookIcon(book.group));
   cover.createSpan({cls:'bl-library-cover-mark',text:book.index.publication.symbol.toUpperCase().slice(0,14)});
  }
  const info=card.createDiv({cls:'bl-library-card-info'});
  const status=info.createSpan({cls:'bl-library-available'});
  this.glyph(status,'check-circle-2');status.createSpan({text:'Hors ligne'});
  info.createEl('strong',{text:book.index.publication.title});
  info.createSpan({cls:'bl-library-card-meta',
   text:book.index.publication.year+' · '+book.index.documents.length+' document(s)'});
  card.addEventListener('click',()=>{
   this.activeFolder=book.folder;this.activeDoc=null;
   this.searchSeq++;this.searching=false;this.renderContent();
   this.app.workspace.requestSaveLayout();
  });
 }
 private renderBook():void{
  const book=this.books.find(b=>b.folder===this.activeFolder);
  if(!book){this.activeFolder=null;this.renderContent();return;}
  const breadcrumb=this.content.createDiv({cls:'bl-library-breadcrumb'});
  this.button(breadcrumb,'Toutes les publications','arrow-left',()=>{
   this.activeFolder=null;this.activeDoc=null;this.renderContent();
   this.app.workspace.requestSaveLayout();
  });
  breadcrumb.createSpan({text:book.index.publication.title});
  const hero=this.content.createDiv({cls:'bl-library-book-hero'});
  const artwork=hero.createDiv({cls:'bl-library-book-art is-'+book.group});
  this.glyph(artwork,localBookIcon(book.group));
  const copy=hero.createDiv({cls:'bl-library-book-copy'});
  copy.createSpan({cls:'bl-library-eyebrow',text:'PUBLICATION PERSONNELLE · HORS LIGNE'});
  copy.createEl('h2',{text:book.index.publication.title});
  copy.createEl('p',{text:book.index.publication.symbol+' · '+book.index.publication.year+
   ' · '+book.index.documents.length+' documents'});
  const reading=this.content.createDiv({cls:'bl-library-reading'});
  const outline=reading.createDiv({cls:'bl-library-outline'});
  const head=outline.createDiv({cls:'bl-library-outline-heading'});
  head.createEl('h3',{text:'Sommaire'});
  head.createSpan({text:String(book.index.documents.length)});
  const list=outline.createDiv({cls:'bl-library-outline-list'});
  for(const doc of book.index.documents){
   const button=list.createEl('button',{cls:'bl-library-outline-item'+
    (this.activeDoc===doc.documentId?' is-active':''),
    attr:{type:'button','aria-label':'Lire '+doc.title}});
   button.createSpan({cls:'bl-library-outline-number',text:String(doc.documentId).padStart(2,'0')});
   button.createSpan({text:doc.title});
   button.addEventListener('click',()=>{
    this.activeDoc=doc.documentId;this.renderContent();
    this.app.workspace.requestSaveLayout();
   });
  }
  const reader=reading.createDiv({cls:'bl-library-reader'});
  const selected=book.index.documents.find(d=>d.documentId===this.activeDoc);
  if(selected){void this.showDocument(reader,book,selected);return;}
  const first=book.index.documents[0];
  if(first){this.activeDoc=first.documentId;this.renderContent();return;}
  reader.createEl('p',{text:'Aucun document disponible dans cette publication.'});
 }
 private async showDocument(parent:HTMLElement,book:ShelfBook,doc:OfflineDocumentRecord):Promise<void>{
  const generation=++this.renderSeq;
  const file=this.app.vault.getAbstractFileByPath(book.folder+'/'+doc.path);
  if(!(file instanceof TFile)){
   parent.createEl('p',{text:'La note correspondante est introuvable. Actualise la bibliothèque.'});return;
  }
  const head=parent.createDiv({cls:'bl-library-reader-header'});
  head.createSpan({cls:'bl-library-eyebrow',text:'LECTURE'});
  head.createEl('h2',{text:doc.title});
  const actions=head.createDiv({cls:'bl-library-reader-tools'});
  this.button(actions,'Ouvrir la note éditable','file-pen-line',
   ()=>void this.app.workspace.getLeaf('tab').openFile(file));
  this.button(actions,'Copier le lien Obsidian','link',()=>{
   const target=file.path.slice(0,-3).replace(/[|\]]/g,' ');
   const alias=doc.title.replace(/[|\]]/g,' ');
   void navigator.clipboard.writeText('[['+target+'|'+alias+']]')
    .then(()=>new Notice('Lien Obsidian copié.'),()=>new Notice('Presse-papiers indisponible.'));
  });
  if(doc.mepsId&&book.index.publication.language===3)
   this.button(actions,'Consulter la source WOL','external-link',
    ()=>void this.host.openWol('https://wol.jw.org/fr/wol/d/r30/lp-f/'+doc.mepsId));
  const output=parent.createDiv({cls:'bl-library-reader-body'});
  output.createSpan({cls:'bl-library-loading',text:'Chargement local…'});
  try{
   const raw=await this.app.vault.cachedRead(file);
   if(generation!==this.renderSeq||!parent.isConnected)return;
   output.empty();output.setAttribute('lang','fr');
   output.addEventListener('click',event=>this.openReference(event));
   await MarkdownRenderer.render(this.app,stripImportFrontmatter(raw),output,file.path,this);
  }catch{
   if(generation!==this.renderSeq)return;
   output.empty();output.createEl('p',{text:'Impossible de lire cette note locale.'});
  }
 }
 private openReference(event:MouseEvent):void{
  const element=event.target;
  if(!(element instanceof Element))return;
  const anchor=element.closest('a[href]');
  const href=anchor?.getAttribute('href')||'';
  if(!href)return;
  const meps=lookupLocalDocumentId(href);
  if(meps){
   event.preventDefault();event.stopPropagation();
   for(const book of this.books){
    if(book.index.publication.language!==3)continue;
    const target=book.index.documents.find(doc=>doc.mepsId===meps);
    if(target){
     this.activeFolder=book.folder;this.activeDoc=target.documentId;
     this.renderContent();return;
    }
   }
   void this.host.openWol('https://wol.jw.org/fr/wol/d/r30/lp-f/'+meps);
   return;
  }
  const official=bibleJwpubWebLink(href)||cleanWolUrl(href);
  if(official){
   event.preventDefault();event.stopPropagation();void this.host.openWol(official);
  }
 }
 private async runSearch():Promise<void>{
  const token=++this.searchSeq;
  const query=this.query.trim();
  this.results=[];this.searchTruncated=false;
  if(query.length<2){this.searching=false;this.renderResults();return;}
  const needle=normalizeLibrarySearch(query);
  this.searching=true;this.renderResults();
  const found:SearchHit[]=[];
  outer:for(const book of this.books){
   if(this.group!=='all'&&book.group!==this.group)continue;
   for(const doc of book.index.documents){
    if(token!==this.searchSeq)return;
    if(normalizeLibrarySearch(doc.title).includes(needle)){
     found.push({book,doc,snippet:'Titre du document'});
    }else{
     const file=this.app.vault.getAbstractFileByPath(book.folder+'/'+doc.path);
     if(!(file instanceof TFile))continue;
     try{
      const raw=await this.app.vault.cachedRead(file);
      if(token!==this.searchSeq)return;
      if(!normalizeLibrarySearch(stripImportFrontmatter(raw)).includes(needle))continue;
      found.push({book,doc,snippet:documentSearchSnippet(raw,query)});
     }catch{/* A damaged note cannot prevent other results. */}
    }
    if(found.length>=60){this.searchTruncated=true;break outer;}
   }
  }
  if(token!==this.searchSeq)return;
  this.results=found;this.searching=false;
  if(!this.activeFolder)this.renderResults();
 }
}
