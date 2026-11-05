import {
  ItemView, MarkdownRenderer, Notice, requestUrl, TFile, setIcon,
  type WorkspaceLeaf
} from 'obsidian';
import styles from './bibleLabLibrary.css?inline';
import {
  LIBRARY_FILTERS,filteredVolumes,loadLibraryVolumes,localDocumentFile,
  localDocumentUrl,jwpubPublicationId,searchLibrary,virtualDocuments,
  type LibraryCategory,type LibrarySearchResult,type LibraryVolume
} from './libraryCatalog';
import type { OfflineDocumentRecord } from './offlinePublications';
import { loadJwLibraryPublicCatalog } from './jwLibraryCatalogReader';
import { foldLibraryText } from './libraryTaxonomy';
import {
  FEATURED_JW_ORG,JW_ORG_CATALOG_PAGE,combineJwCatalog,
  parseJwOrgCatalogHtml,decodeMediaCatalogLink,type JwCatalogEntry
} from './jwOrgCatalog';

export const BIBLE_LAB_LIBRARY_VIEW='bible-lab-personal-library';
export interface LibraryActions {
  root:()=>string;
  importJwpub:()=>void;
  importVirtualJwpub:()=>void;
  downloads:()=>void;
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
  private browsingOfficialCatalog=false;
  private officialCatalog:JwCatalogEntry[]=[...FEATURED_JW_ORG];
  private catalogLoading=false;
  private catalogError='';
  private lastCatalogRefresh=0;
  private catalogSource:'selection'|'site'|'jwlibrary'='selection';
  private jwCatalogVersion='';
  private jwCatalogLoading=false;
  private catalogVisible=48;
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
    this.officialCatalog=[...FEATURED_JW_ORG];
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
    button(actions,'Ajouter un JWPUB sans notes','library-big',this.actions.importVirtualJwpub);
    button(actions,'Convertir en Markdown','file-plus-2',this.actions.importJwpub);
    button(actions,'Télécharger une publication','download',this.actions.downloads);
    button(actions,'Mes publications','hard-drive',()=>{
      this.browsingOfficialCatalog=false;this.term='';this.filter='all';this.renderChrome();void this.renderContent();
    });
    button(actions,'Explorer JW.org','globe-2',()=>{
      this.browsingOfficialCatalog=true;this.term='';this.filter='all';this.renderChrome();void this.renderContent();
    },'primary');
    const controls=layout.createDiv({cls:'blb-controls'});
    const search=controls.createDiv({cls:'blb-search'});
    const glass=search.createSpan();setIcon(glass,'search');
    this.input=search.createEl('input',{attr:{type:'search',
      placeholder:'Rechercher un livre, un article ou dans le texte…',
      'aria-label':'Rechercher dans ma bibliothèque',
      autocomplete:'off'}});
    this.input.value=this.term;
    this.input.addEventListener('input',()=>{
      this.catalogVisible=48;
      this.term=this.input.value;
      this.token++;
      if(this.debounceId!==null)window.clearTimeout(this.debounceId);
      this.debounceId=window.setTimeout(()=>void this.renderContent(),200);
    });
    this.resultCount=controls.createSpan({cls:'blb-result-count'});
    const list=layout.createDiv({cls:'blb-filters',attr:{
      role:'group','aria-label':'Types de publications'}});
    for(const cat of LIBRARY_FILTERS){
      const tab=button(list,cat.title,cat.icon,()=>{this.catalogVisible=48;this.filter=cat.id;this.renderContent();},
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
    this.contentEl.classList.toggle('blb-online-mode',this.browsingOfficialCatalog);
    this.updateFilters();
    this.content.empty();
    if(this.browsingOfficialCatalog){this.renderOfficialCatalog();return;}
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
  /** Only explicit clicks fetch the public JW.org catalogue page. */
  private async refreshOfficialCatalog():Promise<void>{
    if(this.catalogLoading)return;
    this.catalogLoading=true;this.catalogError='';
    this.renderOfficialCatalog();
    try{
      const response=await requestUrl({url:JW_ORG_CATALOG_PAGE,throw:false});
      if(response.status!==200)throw Error('JW.org a répondu HTTP '+response.status+'.');
      const html=response.text;
      if(html.length>5_000_000)throw Error('Page trop volumineuse.');
      const discovered=parseJwOrgCatalogHtml(html,JW_ORG_CATALOG_PAGE);
      if(discovered.length===0)throw Error(
        'Le catalogue n’est pas accessible sous forme HTML exploitable (la page peut exiger un navigateur).'
      );
      this.officialCatalog=combineJwCatalog(FEATURED_JW_ORG,discovered);
      this.lastCatalogRefresh=Date.now();
      this.catalogSource='site';
      this.catalogVisible=48;
    }catch(error){
      this.catalogError=(error instanceof Error?error.message:'Consultation impossible')+
        ' · La sélection de départ reste disponible. Tu peux vérifier ses JWPUB un par un.';
    }finally{
      this.catalogLoading=false;
      if(this.active&&this.browsingOfficialCatalog)this.renderOfficialCatalog();
    }
  }
  /** Read-only full-catalog experiment, triggered by the user's click only. */
  private async loadFullPublicationCatalog():Promise<void>{
    if(this.jwCatalogLoading||this.catalogLoading)return;
    this.jwCatalogLoading=true;
    this.catalogError='';
    this.renderOfficialCatalog();
    try{
      const {entries,version}=await loadJwLibraryPublicCatalog();
      this.officialCatalog=combineJwCatalog(
        [...FEATURED_JW_ORG,...this.officialCatalog],entries);
      this.jwCatalogVersion=version;
      this.catalogSource='jwlibrary';
      this.lastCatalogRefresh=Date.now();
      this.catalogVisible=48;
    }catch(error){
      this.catalogError=(error instanceof Error?error.message:'Catalogue indisponible')+
        ' · Les références déjà affichées sont conservées.';
    }finally{
      this.jwCatalogLoading=false;
      if(this.active&&this.browsingOfficialCatalog)this.renderOfficialCatalog();
    }
  }
  private renderOfficialCatalog():void{
    if(!this.active)return;
    this.content.empty();
    const term=foldLibraryText(this.term);
    const installed=this.volumes.filter(v=>v.language===3);
    // A single discovery shelf: show existing personal imports alongside
    // the official public metadata, without hiding an unlisted local volume.
    const catalog=combineJwCatalog(installed.map(v=>({
      symbol:v.symbol,issue:v.issue,title:v.title,coverUrl:'',
      sourcePage:JW_ORG_CATALOG_PAGE,category:v.category
    })),this.officialCatalog);
    const personalKeys=new Set(installed.filter(v=>v.origin==='personal')
      .map(v=>v.symbol.toLowerCase()+'|'+v.issue));
    const available=catalog.filter(item=>
      (this.filter==='all'||this.filter==='personal'?
        (this.filter!=='personal'||personalKeys.has(item.symbol.toLowerCase()+'|'+item.issue)):
        item.category===this.filter)&&
      (!term||foldLibraryText(item.title+' '+item.symbol+' '+item.issue).includes(term))
    );
    this.resultCount.setText(catalog.length+' références · '+installed.length+' hors ligne · '+
      (this.catalogSource==='jwlibrary'?'catalogue JW Library':
       this.catalogSource==='site'?'catalogue JW.org':'sélection JW.org'));
    const top=this.content.createDiv({cls:'blb-online-intro'});
    top.createEl('h2',{text:'Toutes les publications · JW.org et mes fichiers'});
    top.createEl('p',{text:this.catalogSource==='jwlibrary'?
      'Catalogue de métadonnées JW Library consulté à la demande. Certains ouvrages peuvent ne pas être téléchargeables au format JWPUB sur JW.org ; chaque fichier reste à vérifier.' :
      'Une sélection de publications visibles dans la bibliothèque française officielle. La disponibilité du format JWPUB se vérifie séparément, avant tout téléchargement.'});
    const controls=top.createDiv({cls:'blb-online-actions'});
    const refresh=button(controls,this.catalogLoading?'Consultation…':'Actualiser depuis JW.org',
      'refresh-cw',()=>void this.refreshOfficialCatalog());
    refresh.disabled=this.catalogLoading||this.jwCatalogLoading;
    const full=button(controls,this.jwCatalogLoading?'Chargement du catalogue…':
      'Charger le catalogue JW Library','database',()=>void this.loadFullPublicationCatalog());
    full.disabled=this.jwCatalogLoading||this.catalogLoading;
    button(controls,'Voir la bibliothèque officielle','external-link',()=>{
      window.open(JW_ORG_CATALOG_PAGE,'_blank','noopener,noreferrer');
    });
    if(this.lastCatalogRefresh)top.createEl('p',{cls:'blb-online-meta',text:
      'Dernière consultation : '+new Date(this.lastCatalogRefresh).toLocaleString('fr-FR')+
      (this.jwCatalogVersion?' · Version '+this.jwCatalogVersion.slice(0,8):'')});
    if(this.catalogError)top.createEl('p',{cls:'blb-online-error',text:this.catalogError});
    else if(this.catalogSource==='site')top.createEl('p',{cls:'blb-online-meta',text:
      'Résultats extraits de la page d’accueil uniquement : ce n’est pas le catalogue intégral.'});
    else if(this.catalogSource==='jwlibrary')top.createEl('p',{cls:'blb-online-meta',text:
      'Lecture de métadonnées du catalogue de JW Library (service susceptible de changer). Les publications ne sont pas téléchargées automatiquement.'});
    else top.createEl('p',{cls:'blb-online-meta',text:
      'Charger le catalogue JW Library télécharge une base SQLite compressée, potentiellement volumineuse (jusqu’à 32 Mo). Sur appareil modeste, cela peut être lent.'});
    const manual=top.createEl('details',{cls:'blb-online-manual'});
    manual.createEl('summary',{text:'J’ai un code ou un lien officiel de téléchargement'});
    const direct=manual.createDiv({cls:'blb-online-direct'});
    const code=direct.createEl('input',{attr:{
      type:'text',placeholder:'Code ou lien de téléchargement JW.org',
      'aria-label':'Code ou lien officiel de téléchargement'
    }});
    const issue=direct.createEl('input',{attr:{
      type:'text',placeholder:'Numéro facultatif (ex. 202609)',
      'aria-label':'Numéro de publication pour une revue'
    }});
    button(direct,'Vérifier ce JWPUB','search',()=>{
      const official=decodeMediaCatalogLink(code.value.trim());
      this.actions.checkPublication(official?.symbol||code.value.trim(),
        official?.issue||issue.value.trim());
    });
    if(!available.length){
      const empty=this.content.createDiv({cls:'blb-empty'});
      empty.createEl('p',{text:this.term.trim()?
        'Aucun résultat pour cette recherche dans le filtre sélectionné.':
        this.filter!=='all'?'Aucune publication dans cette catégorie parmi les références chargées.':
        'Aucune publication dans le catalogue actuellement disponible.'});
      if(this.filter!=='all'||this.term.trim())
        button(empty,'Voir toutes les publications','library',()=>{
          this.term='';this.filter='all';this.input.value='';this.catalogVisible=48;
          this.updateFilters();this.renderOfficialCatalog();
        },'primary');
      button(empty,'Ouvrir la bibliothèque officielle','external-link',()=>{
        window.open(JW_ORG_CATALOG_PAGE,'_blank','noopener,noreferrer');
      });
      return;
    }
    if(available.length>this.catalogVisible)top.createEl('p',{
      cls:'blb-online-meta',text:available.length.toLocaleString('fr-FR')+
        ' références correspondantes · '+Math.min(this.catalogVisible,available.length)+
        ' affichées'});
    const originals=this.app.vault.getFiles().filter(file=>
      file.path.startsWith(this.actions.root().replace(/\/$/,'')+'/Bibliothèque JWPUB/')&&
      file.extension.toLowerCase()==='jwpub');
    const grid=this.content.createDiv({cls:'blb-book-grid blb-online-grid'});
    const visible=available.slice(0,this.catalogVisible);
    for(const item of visible){
      const local=installed.find(v=>
        v.symbol.toLowerCase()===item.symbol.toLowerCase()&&v.issue===item.issue);
      const card=grid.createDiv({cls:'blb-book-card blb-online-book'});
      const cover=card.createDiv({cls:'blb-cover category-'+item.category});
      if(item.coverUrl){
        const image=cover.createEl('img',{attr:{
          src:item.coverUrl,alt:'Couverture de '+item.title,loading:'lazy',
          referrerpolicy:'no-referrer'
        }});
        cover.addClass('has-image');
        image.addEventListener('error',()=>{image.remove();cover.removeClass('has-image');});
      }
      const fallback=cover.createDiv({cls:'blb-cover-design'});
      const icon=fallback.createSpan();setIcon(icon,'book-open');
      fallback.createSpan({cls:'blb-cover-symbol',text:item.symbol.toUpperCase()});
      const info=card.createDiv({cls:'blb-book-meta'});
      info.createEl('strong',{text:item.title});
      info.createSpan({text:item.symbol+(item.issue?' · '+item.issue:'')});
      const stem=item.symbol.toLowerCase()+'_F'+(item.issue?'_'+item.issue:'');
      const original=originals.find(file=>{
        const name=file.name.toLowerCase();
        return name===stem+'.jwpub'||name.startsWith(stem+' (');
      });
      const size=original?(original.stat.size/1048576).toFixed(1)+' Mo':'non renseignée';
      info.createSpan({cls:'blb-local-mark',
        text:local?'Disponible hors ligne · taille : '+size:
          'Taille du JWPUB : à vérifier'});
      const actions=card.createDiv({cls:'blb-online-card-actions'});
      if(local)button(actions,'Lire','book-open',()=>{
        this.browsingOfficialCatalog=false;
        this.selectedPath=local.path;this.selectedDocument=null;
        this.term='';this.filter='all';this.renderChrome();void this.renderContent();
      });
      // The catalog metadata does not include an article-specific official URL.
      // Open an actual WOL search rather than inventing a publication address.
      button(actions,'Rechercher sur WOL','book-open-text',()=>{
        void this.actions.openWol('https://wol.jw.org/fr/wol/s/r30/lp-f?q='+
          encodeURIComponent(item.title.split(' · ')[0]));
      });
      button(actions,'Vérifier le JWPUB','download',()=>{
        this.actions.checkPublication(item.symbol,item.issue);
      },local?'':'primary');
    }
    if(available.length>visible.length){
      const more=this.content.createDiv({cls:'blb-online-more'});
      button(more,'Afficher 48 publications supplémentaires','plus',()=>{
        this.catalogVisible=Math.min(this.catalogVisible+48,available.length);
        this.renderOfficialCatalog();
      });
    }
    this.content.createEl('p',{cls:'blb-online-meta',text:
      'Les couvertures disponibles se chargent depuis le CDN officiel. Chaque téléchargement JWPUB nécessite une vérification et une confirmation. Les publications déjà importées restent locales.'});
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
      text.createSpan({text:categoryName(volume.category)+' · '+volume.documents+' documents'+
        (volume.virtual?' · sans notes Markdown':'')});
      const badge=text.createSpan({cls:'blb-local-mark'});
      const status=badge.createSpan();setIcon(status,'hard-drive');
      badge.createSpan({text:volume.virtual?'Lecteur virtuel':
        volume.origin==='download'?'Téléchargée':'Importée'});
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
      (volume.virtual?' · zéro note Markdown':'')+
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
        'Lecture virtuelle impossible : vérifie l’archive ou réimporte le JWPUB.':
        'Lecture impossible. Tu peux ouvrir la note Markdown pour vérifier son contenu.'});
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
