import {
  ItemView, MarkdownRenderer, Menu, Notice, TFile, setIcon,
  type WorkspaceLeaf
} from 'obsidian';
import styles from './bibleLabLibrary.css?inline';
import {
  LIBRARY_FILTERS,filteredVolumes,loadLibraryVolumes,localDocumentFile,
  localDocumentUrl,jwpubPublicationId,searchLibrary,virtualDocuments,
  type LibraryCategory,type LibrarySearchResult,type LibraryVolume
} from './libraryCatalog';
import type { OfflineDocumentRecord } from './offlinePublications';
import {annotationsForDocument,annotationsForBibleChapter,bibleAnnotationChapters,bibleBookName,loadLatestAnnotationArchive,searchPersonalAnnotations} from './jwAnnotationLibrary';
import type {DocumentAnnotations} from './jwAnnotationLibrary';
import type {JwAnnotationIndex} from './jwAnnotations';
import type { JwPublicationCatalog } from './jwLibraryCatalogReader';
import {publicationShelf,filterPublicationShelf,publicationSeries,type PublicationShelfEntry} from './publicationShelf';
import { foldLibraryText } from './libraryTaxonomy';
import {
  FEATURED_JW_ORG,JW_ORG_CATALOG_PAGE,combineJwCatalog,
  type JwCatalogEntry
} from './jwOrgCatalog';

export const BIBLE_LAB_LIBRARY_VIEW='bible-lab-personal-library';
export interface LibraryActions {
  root:()=>string;
  importJwpub:()=>void;
  importVirtualJwpub:()=>void;
  importAnnotations:()=>void;
  downloads:()=>void;
  catalog:JwPublicationCatalog;
  downloadPublication:(symbol:string,issue:string)=>Promise<boolean>;
  checkPublication:(symbol:string,issue:string)=>void;
  readReference:(url:string,label:string)=>Promise<void>;
  openWol:(url:string)=>Promise<void>;
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
  .replace(/^# [^\n]+\r?\n/,'')
  // Never load a remote illustration merely because a private document was opened.
  .replace(/!\[([^\]]*)\]\((?:https?:)?\/\/[^)]+\)/gi,'*[Illustration externe non chargée]*')
  .trim();
const iconByCategory=(category:LibraryVolume['category']):string=>({
  bible:'book-open-text',books:'book-open',magazines:'newspaper',
  brochures:'files',assemblies:'calendar-days',schools:'graduation-cap',other:'book-marked'
})[category];
const categoryName=(category:LibraryVolume['category'])=>
  LIBRARY_FILTERS.find(f=>f.id===category)?.title||'Autres';

export class BibleLabLibraryView extends ItemView {
  private actions:LibraryActions;
  private volumes:LibraryVolume[]=[];
  private browsingAnnotations=false;
  private selectedBibleBook:number|null=null;
  private selectedBibleChapter:number|null=null;
  private officialCatalog:JwCatalogEntry[]=[...FEATURED_JW_ORG];
  private catalogLoading=false;
  private catalogError='';
  private downloadedOnly=false;
  private selectedSeries:string|null=null;
  private pendingDownloads=new Set<string>();
  private catalogVisible=48;
  private filter:LibraryCategory='all';
  private term='';
  private selectedPath:string|null=null;
  private selectedDocument:number|null=null;
  private content!:HTMLElement;
  private resultCount!:HTMLElement;
  private input!:HTMLInputElement;
  private token=0;
  private refreshGeneration=0;
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
    void this.updateCatalog();
  }
  async onClose():Promise<void>{
    this.active=false;this.token++;
    if(this.debounceId!==null)window.clearTimeout(this.debounceId);
    this.contentEl.empty();
    this.officialCatalog=[...FEATURED_JW_ORG];
  }
  /** Called after a new JWPUB has been imported or an index was removed. */
  async refresh():Promise<void>{
    const version=++this.refreshGeneration;
    try{
      const volumes=await loadLibraryVolumes(this.app,this.actions.root());
      if(!this.active||this.refreshGeneration!==version)return;
      this.volumes=volumes;
      if(this.selectedPath&&!volumes.some(v=>v.path===this.selectedPath)){
        this.selectedPath=null;this.selectedDocument=null;
      }
      this.renderContent();
    }catch{
      if(this.active)this.content.createEl('p',{cls:'blb-empty',text:'Impossible de lire la bibliothèque locale.'});
    }
  }
  private options(parent:HTMLElement,label:string,entries:{label:string;icon:string;run:()=>void}[],cls=''):void{
    const trigger=parent.createEl('button',{cls:'blb-action blb-icon-button '+cls,
      attr:{type:'button','aria-label':label,title:label,'aria-haspopup':'menu'}});
    setIcon(trigger,'ellipsis');
    trigger.addEventListener('click',event=>{
      event.stopPropagation();
      const menu=new Menu();
      for(const entry of entries)menu.addItem(item=>item.setTitle(entry.label).setIcon(entry.icon).onClick(entry.run));
      const rect=trigger.getBoundingClientRect();
      menu.showAtPosition({x:Math.max(0,Math.min(rect.left,window.innerWidth-235)),y:rect.bottom+4});
    });
  }
  private showPublications():void{
    this.browsingAnnotations=false;this.selectedPath=null;this.selectedDocument=null;
    this.term='';this.selectedSeries=null;this.renderChrome();void this.renderContent();
  }
  private renderChrome():void{
    this.contentEl.empty();
    this.contentEl.createEl('style',{text:styles});
    const layout=this.contentEl.createDiv({cls:'blb-shell'});
    const hero=layout.createDiv({cls:'blb-hero'});
    const headline=hero.createDiv({cls:'blb-title-group'});
    headline.createEl('h1',{text:'Ma bibliothèque'});
    const actions=hero.createDiv({cls:'blb-head-actions'});
    button(actions,'Ajouter un fichier','plus',this.actions.importVirtualJwpub);
    this.options(actions,'Options de la bibliothèque',[
      {label:'Importer une sauvegarde JW Library',icon:'archive',run:this.actions.importAnnotations},
      {label:'Actualiser les publications',icon:'refresh-cw',run:()=>void this.updateCatalog(true)},
      {label:'Ouvrir la bibliothèque officielle',icon:'external-link',run:()=>window.open(JW_ORG_CATALOG_PAGE,'_blank','noopener,noreferrer')},
      {label:'Outils d’import et d’export',icon:'settings-2',run:this.actions.downloads}
    ]);
    const sections=layout.createDiv({cls:'blb-sections',attr:{role:'group','aria-label':'Ma bibliothèque'}});
    const publications=button(sections,'Publications','library-big',()=>this.showPublications(),this.browsingAnnotations?'':'active');
    publications.setAttribute('aria-pressed',String(!this.browsingAnnotations));
    const annotations=button(sections,'Mes annotations','highlighter',()=>{
      this.browsingAnnotations=true;this.term='';this.selectedPath=null;this.selectedDocument=null;
      this.renderChrome();void this.renderContent();
    },this.browsingAnnotations?'active':'');
    annotations.setAttribute('aria-pressed',String(this.browsingAnnotations));
    const controls=layout.createDiv({cls:'blb-controls'});
    const search=controls.createDiv({cls:'blb-search'});
    const glass=search.createSpan();setIcon(glass,'search');
    this.input=search.createEl('input',{attr:{type:'search',
      placeholder:this.browsingAnnotations?'Rechercher dans mes notes…':'Un titre, un sujet, un mot…',
      'aria-label':'Rechercher dans ma bibliothèque',autocomplete:'off'}});
    this.input.value=this.term;
    this.input.addEventListener('input',()=>{
      this.catalogVisible=48;this.term=this.input.value;this.selectedPath=null;this.selectedDocument=null;
      this.token++;
      if(this.debounceId!==null)window.clearTimeout(this.debounceId);
      this.debounceId=window.setTimeout(()=>void this.renderContent(),200);
    });
    if(!this.browsingAnnotations){
      const availability=controls.createEl('select',{attr:{'aria-label':'Disponibilité des publications'}});
      availability.createEl('option',{text:'Toutes les publications',attr:{value:'all'}});
      availability.createEl('option',{text:'Téléchargées',attr:{value:'local'}});
      availability.value=this.downloadedOnly?'local':'all';
      availability.addEventListener('change',()=>{
        this.downloadedOnly=availability.value==='local';this.catalogVisible=48;
        this.selectedPath=null;this.selectedDocument=null;this.selectedSeries=null;void this.renderContent();
      });
      const list=layout.createDiv({cls:'blb-filters',attr:{role:'group','aria-label':'Types de publications'}});
      for(const cat of LIBRARY_FILTERS){
        const tab=button(list,cat.title,cat.icon,()=>{
          this.catalogVisible=48;this.filter=cat.id;this.selectedPath=null;
          this.selectedDocument=null;this.selectedSeries=null;void this.renderContent();
        },'blb-category');
        tab.dataset.category=cat.id;
      }
    }
    this.resultCount=layout.createDiv({cls:'blb-result-count',attr:{role:'status','aria-live':'polite'}});
    this.content=layout.createDiv({cls:'blb-content'});
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
    this.updateFilters();this.content.empty();
    if(this.browsingAnnotations){await this.renderAnnotationSearch(ticket);return;}
    const selected=this.selectedVolume();
    if(selected){
      if(this.selectedDocument!==null){
        const doc=selected.items.find(item=>item.documentId===this.selectedDocument);
        if(doc){await this.renderReader(selected,doc,ticket);return;}
      }
      this.renderVolume(selected);return;
    }
    this.renderPublicationShelf();
    if(this.term.trim().length>=2){
      const results=await searchLibrary(this.app,filteredVolumes(this.volumes,this.filter),this.term);
      if(!this.active||this.token!==ticket)return;
      // Search public titles AND the text of downloaded publications in one place.
      if(results.length)this.renderSearchResults(results);
    }
  }
  private async updateCatalog(force=false):Promise<void>{
    if(this.catalogLoading)return;
    this.catalogLoading=true;this.catalogError='';
    const cached=await this.actions.catalog.cached();
    if(!this.active){this.catalogLoading=false;return;}
    if(cached)this.officialCatalog=combineJwCatalog(FEATURED_JW_ORG,cached.entries);
    void this.renderContent();
    try{
      const snapshot=await this.actions.catalog.load(force);
      this.officialCatalog=combineJwCatalog(FEATURED_JW_ORG,snapshot.entries);
    }catch{
      this.catalogError='La liste complète est momentanément indisponible. Les publications déjà affichées restent accessibles.';
    }finally{
      this.catalogLoading=false;
      // Never interrupt an article or a personal annotation search when loading finishes.
      if(this.active&&!this.browsingAnnotations&&!this.selectedPath)void this.renderContent();
    }
  }
  private openVolume(volume:LibraryVolume):void{
    this.browsingAnnotations=false;this.selectedPath=volume.path;this.selectedDocument=null;
    this.term='';this.input.value='';void this.renderContent();
  }
  private async download(item:PublicationShelfEntry<LibraryVolume>):Promise<void>{
    if(this.pendingDownloads.has(item.key))return;
    this.pendingDownloads.add(item.key);void this.renderContent();
    try{await this.actions.downloadPublication(item.symbol,item.issue);}
    catch{new Notice('Le téléchargement n’a pas pu aboutir. Réessaie depuis la publication.');}
    finally{
      this.pendingDownloads.delete(item.key);
      if(this.active)await this.refresh();
    }
  }
  private renderPublicationShelf():void{
    const shelf=publicationShelf(this.officialCatalog,this.volumes);
    let available=filterPublicationShelf(shelf,this.filter,this.term,this.downloadedOnly);
    if(this.selectedSeries)available=available.filter(item=>item.symbol.toLowerCase()===this.selectedSeries);
    const locals=shelf.filter(item=>item.local).length;
    this.resultCount.setText(shelf.length.toLocaleString('fr-FR')+' publications · '+locals+' téléchargée'+(locals>1?'s':''));
    if(this.selectedSeries){
      const crumbs=this.content.createDiv({cls:'blb-breadcrumb'});
      button(crumbs,'Toutes les publications','arrow-left',()=>{
        this.selectedSeries=null;this.catalogVisible=48;void this.renderContent();
      });
    }
    if(this.catalogLoading)this.content.createEl('p',{cls:'blb-loading',text:'Mise à jour des publications…'});
    if(this.catalogError){
      const notice=this.content.createDiv({cls:'blb-catalog-notice'});
      notice.createEl('p',{text:this.catalogError});
      button(notice,'Réessayer','refresh-cw',()=>void this.updateCatalog(true));
    }
    if(!available.length){
      const empty=this.content.createDiv({cls:'blb-empty'});
      empty.createEl('h2',{text:this.downloadedOnly?'Aucune publication téléchargée':'Aucune publication trouvée'});
      empty.createEl('p',{text:this.downloadedOnly?'Choisis un ouvrage dans le catalogue ou ajoute un fichier.':'Essaie un autre mot ou une autre catégorie.'});
      button(empty,'Afficher toutes les publications','library-big',()=>{
        this.downloadedOnly=false;this.filter='all';this.term='';this.selectedSeries=null;
        this.renderChrome();void this.renderContent();
      });
      return;
    }
    const groups=publicationSeries(available);
    const entries=this.selectedSeries||this.term.trim()?available.map(item=>({title:item.title,symbol:item.symbol,entries:[item]})):groups;
    const grid=this.content.createDiv({cls:'blb-book-grid'});
    for(const group of entries.slice(0,this.catalogVisible)){
      const item=group.entries[0],series=group.entries.length>1;
      const title=series?group.title:item.title;
      const card=grid.createEl('article',{cls:'blb-book-card blb-online-book',attr:{'aria-label':title}});
      const art=card.createDiv({cls:'blb-card-art'});
      const open=art.createEl('button',{cls:'blb-cover-link',attr:{type:'button',
        'aria-label':series?'Choisir un numéro de '+title:item.local?'Ouvrir '+title:'Télécharger '+title}});
      const invoke=()=>{if(series){this.selectedSeries=item.symbol.toLowerCase();this.catalogVisible=48;void this.renderContent();}
        else if(item.local)this.openVolume(item.local);else void this.download(item);};
      open.addEventListener('click',invoke);
      if(item.local)this.renderCover(open,item.local,false,item.local.origin==='download'?item.coverUrl:'');
      else{
        const cover=open.createDiv({cls:'blb-cover category-'+item.category});
        if(item.coverUrl){
          const image=cover.createEl('img',{attr:{src:item.coverUrl,alt:'Couverture de '+title,loading:'lazy',referrerpolicy:'no-referrer'}});
          cover.addClass('has-image');
          image.addEventListener('error',()=>{image.remove();cover.removeClass('has-image');});
        }
        const fallback=cover.createDiv({cls:'blb-cover-design'});
        const icon=fallback.createSpan();setIcon(icon,iconByCategory(item.category));
        fallback.createSpan({cls:'blb-cover-title',text:series?group.title:item.title});
      }
      const options:{label:string;icon:string;run:()=>void}[]=[];
      // A private or foreign-language import must never become an external French query.
      if(!item.local||item.local.origin==='download')options.push({label:'Rechercher sur WOL',icon:'search',run:()=>{
        void this.actions.openWol('https://wol.jw.org/fr/wol/s/r30/lp-f?q='+encodeURIComponent(title));
      }});
      if(item.local)options.push({label:'Afficher le sommaire',icon:'list',run:()=>this.openVolume(item.local!)});
      else options.push({label:'Détails du téléchargement',icon:'info',run:()=>this.actions.checkPublication(item.symbol,item.issue)});
      this.options(art,'Options de '+title,options,'blb-card-options');
      const info=card.createDiv({cls:'blb-book-meta'});
      info.createEl('strong',{text:title});
      info.createSpan({text:series?group.entries.length+' numéros':categoryName(item.category)});
      if(item.local)info.createSpan({cls:'blb-local-mark',text:'Disponible hors connexion'});
      const actions=card.createDiv({cls:'blb-card-actions'});
      const pending=this.pendingDownloads.has(item.key);
      const primary=button(actions,series?'Voir les numéros':item.local?'Lire':pending?'Téléchargement…':'Télécharger',
        series?'layers':item.local?'book-open':'download',invoke,item.local||series?'':'primary');
      primary.disabled=pending;
      open.disabled=pending;
    }
    if(entries.length>this.catalogVisible){
      const more=this.content.createDiv({cls:'blb-online-more'});
      button(more,'Afficher plus','plus',()=>{this.catalogVisible+=48;void this.renderContent();});
    }
  }
  private renderCover(parent:HTMLElement,volume:LibraryVolume,large=false,officialCover=''):void{
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
    if(!volume.coverPath&&officialCover){
      const img=cover.createEl('img',{attr:{src:officialCover,alt:'Couverture de '+volume.title,loading:'lazy',referrerpolicy:'no-referrer'}});
      img.addEventListener('error',()=>{img.remove();cover.removeClass('has-image');});
      cover.addClass('has-image');
    }
    const design=cover.createDiv({cls:'blb-cover-design'});
    const icon=design.createSpan();setIcon(icon,iconByCategory(volume.category));
    design.createSpan({cls:'blb-cover-title',text:volume.title});
    design.createSpan({cls:'blb-cover-year',text:volume.year>0?String(volume.year):categoryName(volume.category)});
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
    data.createSpan({cls:'blb-eyebrow',text:categoryName(volume.category)});
    data.createEl('h2',{text:volume.title});
    data.createEl('p',{text:volume.documents+' articles disponibles hors connexion'+
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
    if(!file&&!volume.virtual){
      this.content.createEl('p',{cls:'blb-empty',text:'Ce document a été déplacé ou supprimé du coffre.'});
      return;
    }
    if(file)button(nav,'Ouvrir la note modifiable','file-pen-line',
      ()=>{void this.app.workspace.getLeaf('tab').openFile(file)});
    if(file)button(nav,'Copier un lien vers cette note','link',()=>void this.copyNoteLink(file,doc.title));
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
      const raw=volume.virtual?(await virtualDocuments(this.app,volume)).get(doc.documentId)||'':
        await this.app.vault.cachedRead(file!);
      if(!this.active||this.token!==ticket)return;
      reader.empty();
      await MarkdownRenderer.render(this.app,readerMarkdown(raw),reader,
        file?.path||volume.path+'/'+doc.path,this);
      if(!this.active||this.token!==ticket)return;
      reader.addEventListener('click',event=>{
        const el=event.target as Element|null;
        const anchor=el?.closest?.('a[href]') as HTMLAnchorElement|null;
        if(!anchor)return;
        const href=anchor.getAttribute('href')||'';
        if(/^https:\/\/wol\.jw\.org\//.test(href)){
          event.preventDefault();
          void this.actions.readReference(href,anchor.textContent||'Référence WOL');
          return;
        }
        // JWPUB links use internal document IDs. Navigate to the imported
        // document only: do not leak an unpublished school ID to an online URL.
        const mepsId=jwpubPublicationId(href);
        if(mepsId!==null){
          event.preventDefault();
          const local=this.volumes.flatMap(v=>
            v.items.filter(item=>item.mepsId===mepsId).map(item=>({volume:v,item})))[0];
          if(local){
            this.selectedPath=local.volume.path;
            this.selectedDocument=local.item.documentId;
            void this.renderContent();
          }else new Notice('Cette publication n’est pas encore disponible dans ta bibliothèque locale.');
        }
      });
    }catch{
      reader.empty();
      reader.createEl('p',{text:volume.virtual?
        'Ce document ne peut pas être lu. Essaie d’ajouter à nouveau la publication.':
        'Ce document ne peut pas être lu. Tu peux ouvrir la note pour vérifier son contenu.'});
    }
    if(volume.virtual)await this.renderArticleAnnotations(volume,doc,ticket);
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

  private async renderArticleAnnotations(
    volume:LibraryVolume,doc:OfflineDocumentRecord,ticket:number
  ):Promise<void>{
    const holder=this.content.createDiv({cls:'blb-annotations'});
    holder.createEl('p',{cls:'blb-online-meta',text:'Recherche des annotations personnelles…'});
    const archive=await loadLatestAnnotationArchive(this.app,this.actions.root());
    if(!this.active||this.token!==ticket)return;
    holder.empty();
    if(!archive)return;
    const found=annotationsForDocument(archive.index,{
      symbol:volume.symbol,issue:volume.issue,language:volume.language
    },doc);
    if(!found||(!found.marks.length&&!found.notes.length&&!found.bookmarks.length))return;
    this.displayArticleAnnotations(holder,found);
  }
  private displayArticleAnnotations(parent:HTMLElement,data:DocumentAnnotations,bible=false):void{
    const title=parent.createDiv({cls:'blb-annotation-head'});
    title.createEl('h2',{text:'Mes annotations JW Library'});
    title.createEl('p',{text:data.marks.length+' surlignage(s) · '+
      data.notes.length+' note(s) · '+data.bookmarks.length+' signet(s)'});
    const precision=parent.createEl('details',{cls:'blb-annotation-precision'});
    precision.createEl('summary',{text:'À propos de la précision des surlignages'});
    precision.createEl('p',{text:'Ces annotations concernent '+(bible?'ce chapitre.':'cet article.')+
      ' Le surlignage mot à mot reste à vérifier ; les notes personnelles sont affichées ci-dessous.'});
    for(const item of data.marks.slice(0,100)){
      const card=parent.createDiv({cls:'blb-annotation-item'});
      const head=card.createDiv({cls:'blb-annotation-label'});
      const mark=head.createSpan();setIcon(mark,'highlighter');
      const colors=['','Jaune','Vert','Bleu','Rose','Orange','Violet'];
      head.createSpan({text:'Surlignage'+(colors[item.mark.color]?' · '+colors[item.mark.color]:'')});
      if(item.ranges.length)card.createEl('p',{text:item.ranges.map(r=>
        (bible?'Verset ':'Paragraphe ')+r.identifier
      ).join(' ; ')});
    }
    for(const note of data.notes.slice(0,100)){
      const card=parent.createDiv({cls:'blb-annotation-item'});
      const head=card.createDiv({cls:'blb-annotation-label'});
      const ico=head.createSpan();setIcon(ico,'sticky-note');
      head.createSpan({text:note.title||'Note personnelle'});
      if(note.content)card.createEl('p',{text:note.content});
      if(note.tags.length)card.createEl('p',{cls:'blb-online-meta',text:note.tags.join(' · ')});
    }
    for(const bookmark of data.bookmarks.slice(0,50)){
      const card=parent.createDiv({cls:'blb-annotation-item'});
      const head=card.createDiv({cls:'blb-annotation-label'});
      const ico=head.createSpan();setIcon(ico,'bookmark');
      head.createSpan({text:bookmark.title||'Signet JW Library'});
      if(bookmark.snippet)card.createEl('p',{text:bookmark.snippet});
    }
  }
  private async renderAnnotationSearch(ticket:number):Promise<void>{
    this.content.createEl('p',{cls:'blb-loading',text:'Chargement des annotations personnelles…'});
    const archive=await loadLatestAnnotationArchive(this.app,this.actions.root());
    if(!this.active||this.token!==ticket)return;
    this.content.empty();
    const top=this.content.createDiv({cls:'blb-online-intro'});
    top.createEl('h2',{text:'Mes notes et surlignages JW Library'});
    if(!archive){
      top.createEl('p',{text:'Aucune archive d’annotations trouvée. '+
        'Ajoute une sauvegarde pour retrouver ici tes notes et surlignages.'});
      button(top,'Importer une sauvegarde JW Library','archive',this.actions.importAnnotations,'primary');
      this.resultCount.setText('Aucune annotation importée');
      return;
    }
    this.resultCount.setText(archive.index.notes.length+' notes · '+
      archive.index.marks.length+' surlignages');
    top.createEl('p',{text:'Recherche locale dans les titres, textes et étiquettes '+
      'de tes notes JW Library. Les surlignages sans note ne possèdent pas '+
      'de texte autonome dans cette sauvegarde.'});
    if(this.term.trim().length<2){
      this.renderBibleAnnotationBrowser(archive.index);
    }
    if(this.term.trim().length<2){
      top.createEl('p',{cls:'blb-online-meta',text:
        'Saisis au moins deux caractères dans la barre de recherche pour explorer tes annotations.'});
      return;
    }
    const hits=searchPersonalAnnotations(archive.index,this.term,60);
    const results=this.content.createDiv({cls:'blb-search-list'});
    if(!hits.length){
      results.createEl('p',{cls:'blb-empty',text:'Aucune note personnelle correspondante.'});
      return;
    }
    for(const hit of hits){
      const card=results.createDiv({cls:'blb-annotation-item'});
      const head=card.createDiv({cls:'blb-annotation-label'});
      const ico=head.createSpan();setIcon(ico,'sticky-note');
      head.createSpan({text:hit.note.title||'Note personnelle'});
      if(hit.note.content)card.createEl('p',{text:hit.note.content.slice(0,1200)});
      if(hit.location){
        const source=card.createEl('p',{cls:'blb-online-meta',text:
          'Source : '+(hit.location.symbol||'Bible')+
          (hit.location.book!==null?' · livre '+hit.location.book:'')+
          (hit.location.chapter!==null?' · chapitre '+hit.location.chapter:'')+
          (hit.location.document!==null?' · document '+hit.location.document:'')});
        if(hit.location.symbol){
          const volume=this.volumes.find(v=>v.symbol.toLowerCase()===
            hit.location!.symbol!.toLowerCase()&&v.language===hit.location!.language&&
            v.items.some(d=>d.mepsId===hit.location!.document||
              d.documentId===hit.location!.document));
          const doc=volume?.items.find(d=>d.mepsId===hit.location!.document||
            d.documentId===hit.location!.document);
          if(volume&&doc){
            button(card,'Lire la publication','book-open',()=>{
              this.browsingAnnotations=false;this.term='';this.input.value='';
              this.selectedPath=volume.path;this.selectedDocument=doc.documentId;
              void this.renderContent();
            });
          }
        }
      }
    }
  }

  private renderBibleAnnotationBrowser(index:JwAnnotationIndex):void{
    const groups=bibleAnnotationChapters(index);
    const section=this.content.createDiv({cls:'blb-bible-annotations'});
    section.createEl('h3',{text:'Surlignages de la Bible d’étude'});
    section.createEl('p',{cls:'blb-online-meta',text:
      groups.length+' chapitres annotés · navigation selon les emplacements enregistrés par JW Library.'});
    const books=[...new Set(groups.map(g=>g.book))];
    const picker=section.createDiv({cls:'blb-bible-books'});
    button(picker,'Tous les livres','book-open',()=>{
      this.selectedBibleBook=null;this.selectedBibleChapter=null;
      void this.renderContent();
    });
    for(const book of books){
      const count=groups.filter(g=>g.book===book).reduce((sum,g)=>sum+g.marks,0);
      button(picker,bibleBookName(book)+' ('+count+')','book',()=>{
        this.selectedBibleBook=book;this.selectedBibleChapter=null;
        void this.renderContent();
      },book===this.selectedBibleBook?'primary':'');
    }
    if(this.selectedBibleBook===null)return;
    const matching=groups.filter(g=>g.book===this.selectedBibleBook);
    const chapters=section.createDiv({cls:'blb-bible-chapters'});
    chapters.createEl('h4',{text:bibleBookName(this.selectedBibleBook)});
    for(const entry of matching){
      button(chapters,'Ch. '+entry.chapter+' · '+entry.marks+' surlignage(s)',
        'highlighter',()=>{
        this.selectedBibleChapter=entry.chapter;void this.renderContent();
      },entry.chapter===this.selectedBibleChapter?'primary':'');
    }
    if(this.selectedBibleChapter===null)return;
    const matched=annotationsForBibleChapter(
      index,this.selectedBibleBook,this.selectedBibleChapter);
    if(matched)this.displayArticleAnnotations(section,matched,true);
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
