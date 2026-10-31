import { ItemView, MarkdownView, Notice, requestUrl, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import styles from './bibleLab.css?inline';
import {
  extractReferences, jwLibraryLink, mapChapterForPage, MAP_CHAPTERS, MAP_FALLBACK,
  normalizeSearch, OFFICIAL_ATLAS, OFFICIAL_MAP_INDEX, parseMapIndex, parseScripture,
  RESOURCES, wolLookup, wolSearch, type MapLocation, type Resource
} from './bibleLabData';

export const BIBLE_LAB_VIEW = 'bible-lab-sidebar';
type Tab = 'wol' | 'refs' | 'maps' | 'library';
export interface BibleLabHost {
  openAtlas: () => Promise<void>;
  newResearch: (keys: []) => void;
  newInvestigation: (selections: []) => void;
}

function external(url: string): void {
  // Link navigation never sends note content; only a search term or the requested URL.
  window.open(url, '_blank', 'noopener,noreferrer');
}
function button(parent: HTMLElement, label: string, icon: string, fn: () => void, primary=false): HTMLButtonElement {
  const el = parent.createEl('button', { cls: 'biblelab-btn' + (primary ? ' is-primary' : '') });
  el.type='button';
  const symbol=el.createSpan(); setIcon(symbol, icon);
  el.createSpan({text:label});
  el.addEventListener('click', fn);
  return el;
}
function card(parent:HTMLElement,title:string,description?:string): HTMLElement {
  const el=parent.createDiv({cls:'biblelab-card'});
  el.createEl('h3',{text:title});
  if(description) el.createEl('p',{text:description});
  return el;
}
function heading(parent:HTMLElement,title:string,desc:string): void {
  parent.createEl('h2',{cls:'biblelab-title',text:title});
  parent.createEl('p',{cls:'biblelab-description',text:desc});
}

export class BibleLabSidebarView extends ItemView {
  private host: BibleLabHost;
  private tab: Tab = 'wol';
  private scroller!: HTMLElement;
  private tabs!: HTMLElement;
  private query='Matthieu 10:29';
  private mapTerm='';
  private libraryTerm='';
  private noteRefs: string[] = [];
  private noteTitle='';
  private mapIndex:MapLocation[]=MAP_FALLBACK;
  private indexLoaded=false;
  private indexLoading=false;
  private sequence=0;
  private previewFor='';
  private previewLines:string[]=[];
  private previewLoading=false;
  private readonly cache=new Map<string,{at:number;lines:string[]}>();

  constructor(leaf:WorkspaceLeaf,host:BibleLabHost) {
    super(leaf); this.host=host;
  }
  getViewType():string{return BIBLE_LAB_VIEW;}
  getDisplayText():string{return 'Bible Lab · Explorateur';}
  getIcon():string{return 'book-open-check';}

  async onOpen():Promise<void>{
    this.contentEl.empty();
    this.contentEl.addClass('biblelab-side');
    this.contentEl.createEl('style',{text:styles});
    const header=this.contentEl.createDiv({cls:'biblelab-side-header'});
    const brand=header.createDiv({cls:'biblelab-brand'});
    const logo=brand.createSpan({cls:'biblelab-logo'});setIcon(logo,'network');
    brand.createSpan({text:'BIBLE LAB'});
    header.createDiv({cls:'biblelab-subtitle',text:'Ton laboratoire de recherche biblique'});
    this.tabs=this.contentEl.createDiv({cls:'biblelab-tabs'});
    this.scroller=this.contentEl.createDiv({cls:'biblelab-scroller'});
    const footer=this.contentEl.createDiv({cls:'biblelab-footer'});
    footer.createSpan({text:'Sources officielles · Notes locales'});
    const atlas=footer.createEl('a',{cls:'biblelab-footlink',text:'Atlas ↗',href:'#'});
    atlas.addEventListener('click',event=>{event.preventDefault();void this.host.openAtlas();});
    await this.updateActiveNote(this.app.workspace.getActiveFile());
    this.render();
  }
  async onClose():Promise<void>{this.sequence++;this.contentEl.empty();}
  focusReference(value:string):void{
    this.query=value.trim() || this.query;
    this.tab='wol';this.previewFor='';this.previewLines=[];
    if(this.scroller){this.render();this.scroller.querySelector('input')?.focus();}
  }
  async updateActiveNote(file:TFile|null):Promise<void>{
    const generation=++this.sequence;
    if(!file || file.extension!=='md'){
      this.noteTitle='';this.noteRefs=[];
      if(this.tab==='refs' && this.scroller) this.render();
      return;
    }
    try{
      const text=await this.app.vault.cachedRead(file);
      if(generation!==this.sequence)return;
      this.noteTitle=file.basename;this.noteRefs=extractReferences(text);
    }catch{
      if(generation!==this.sequence)return;
      this.noteTitle=file.basename;this.noteRefs=[];
    }
    if(this.tab==='refs' && this.scroller)this.render();
  }
  private setTab(tab:Tab):void{this.tab=tab;this.render();}
  private render():void{
    this.tabs.empty();
    const entries:{key:Tab;label:string;icon:string}[]=[
      {key:'wol',label:'WOL',icon:'search'},
      {key:'refs',label:'Versets',icon:'book-open'},
      {key:'maps',label:'Cartes',icon:'map'},
      {key:'library',label:'Outils',icon:'library-big'}
    ];
    for(const entry of entries){
      const tab=this.tabs.createEl('button',{cls:'biblelab-tab',attr:{'aria-selected':String(this.tab===entry.key),'aria-label':entry.label}});
      const symbol=tab.createSpan();setIcon(symbol,entry.icon);
      tab.createSpan({text:entry.label});
      tab.addEventListener('click',()=>this.setTab(entry.key));
    }
    this.scroller.empty();
    switch(this.tab){
      case 'wol':this.renderWol();break;
      case 'refs':this.renderRefs();break;
      case 'maps':this.renderMaps();break;
      case 'library':this.renderLibrary();break;
    }
  }
  private searchField(parent:HTMLElement,value:string,placeholder:string,change:(text:string)=>void,submit:()=>void):HTMLInputElement{
    const area=parent.createDiv({cls:'biblelab-search'});
    const input=area.createEl('input',{type:'search',placeholder,attr:{'aria-label':placeholder}});
    input.value=value;
    input.addEventListener('input',()=>change(input.value));
    input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();submit();}});
    button(area,'Go','arrow-right',submit,true);
    return input;
  }
  private renderWol():void{
    heading(this.scroller,'Explorer la Bibliothèque','Recherche rapide en français dans WOL, références bibliques et ressources documentaires.');
    this.searchField(this.scroller,this.query,'Mot, sujet ou verset…',text=>{this.query=text;},()=>this.openSearch());
    const actions=this.scroller.createDiv({cls:'biblelab-buttons'});
    button(actions,'Rechercher WOL','external-link',()=>this.openSearch(),true);
    button(actions,'Ouvrir le passage','book-open',()=>external(wolLookup(this.query)));
    const jw=jwLibraryLink(this.query);
    if(jw) button(actions,'JW Library','book-marked',()=>external(jw));
    const actions2=this.scroller.createDiv({cls:'biblelab-buttons'});
    button(actions2,'Copier lien','copy',()=>void this.copyLink(this.query));
    button(actions2,'Insérer dans note','file-plus-2',()=>this.insertLink(this.query));
    button(actions2,'Créer une enquête','network',()=>this.host.newResearch([]));

    const ref=parseScripture(this.query);
    if(ref){
      const info=card(this.scroller,ref.label,'Référence biblique reconnue · lien officiel JW Finder.');
      const links=info.createDiv({cls:'biblelab-buttons'});
      button(links,'Copier référence','copy',()=>void this.copy(ref.label));
      button(links,'Copier JW Library','link',()=>void this.copy(jwLibraryLink(this.query)||''));
    }
    this.scroller.createEl('div',{cls:'biblelab-eyebrow',text:'Aperçu du texte (facultatif)'});
    const note=this.scroller.createDiv({cls:'biblelab-alert'});
    note.setText('Inspiré de WOL Reference Tools : cet aperçu facultatif utilise le service tiers wol-worker.iaremark.us. Seule la recherche saisie lui est envoyée. Le reste du plugin fonctionne sans ce service.');
    const row=this.scroller.createDiv({cls:'biblelab-buttons'});
    const preview=button(row,this.previewLoading?'Chargement…':'Charger un aperçu','eye',()=>void this.fetchPreview());
    preview.disabled=this.previewLoading;
    if(this.previewFor===this.query&&this.previewLines.length){
      const box=card(this.scroller,'Aperçu · '+this.previewFor,'Texte fourni par le service tiers, à vérifier dans WOL.');
      for(const line of this.previewLines.slice(0,12))box.createEl('p',{text:line});
    }else if(this.previewFor===this.query&&!this.previewLoading){
      this.scroller.createDiv({cls:'biblelab-mini',text:'Aucun aperçu disponible. Utilise le lien officiel WOL.'});
    }
    this.scroller.createEl('div',{cls:'biblelab-eyebrow',text:'Raccourcis'});
    for(const value of ['Jean 7:24','Matthieu 10:29','Jérémie 45:3']){
      const b=card(this.scroller,value);
      b.addEventListener('click',()=>this.focusReference(value));b.style.cursor='pointer';
    }
  }
  private openSearch():void{
    const term=this.query.trim();if(!term){new Notice('Saisis une référence ou un sujet.');return;}
    external(wolSearch(term));
  }
  private async fetchPreview():Promise<void>{
    const term=this.query.trim();
    if(!term || this.previewLoading)return;
    const cached=this.cache.get(term);
    if(cached && Date.now()-cached.at<30*60*1000){
      this.previewFor=term;this.previewLines=cached.lines;this.render();return;
    }
    this.previewLoading=true;this.render();
    try{
      const response=await requestUrl({url:'https://wol-worker.iaremark.us/'+encodeURIComponent(term),throw:false});
      if(response.status!==200)throw Error('Service tiers indisponible ('+response.status+').');
      const data=response.json as {results?:unknown};
      const html=Array.isArray(data.results)?data.results:[];
      const lines:string[]=[];
      for(const part of html.slice(0,12)){
        if(typeof part!=='string')continue;
        // Do not inject remote HTML into the Obsidian DOM.
        const parsed=new DOMParser().parseFromString(part,'text/html');
        const text=(parsed.body.textContent||'').replace(/\s+/g,' ').trim();
        if(text)lines.push(text.slice(0,1600));
      }
      this.cache.set(term,{at:Date.now(),lines});
      if(this.query===term){this.previewFor=term;this.previewLines=lines;}
    }catch(error){
      if(this.query===term){this.previewFor=term;this.previewLines=[];}
      new Notice(error instanceof Error?error.message:'Aperçu WOL indisponible.');
    }finally{this.previewLoading=false;if(this.scroller)this.render();}
  }
  private renderRefs():void{
    heading(this.scroller,'Références de ma note','Les expressions !!référence!! sont détectées, ainsi que les références bibliques explicites.');
    if(this.noteTitle)this.scroller.createEl('div',{cls:'biblelab-pill',text:'Note : '+this.noteTitle});
    if(!this.noteRefs.length){
      this.scroller.createDiv({cls:'biblelab-empty',text:'Ouvre une note contenant des versets, ou écris !!Jean 3:16!! pour voir les références ici.'});
    }
    for(const ref of this.noteRefs){
      const c=card(this.scroller,ref,parseScripture(ref)?'Verset reconnu':'Recherche documentaire');
      const row=c.createDiv({cls:'biblelab-buttons'});
      button(row,'WOL','external-link',()=>external(wolLookup(ref)));
      const jw=jwLibraryLink(ref);
      if(jw)button(row,'JW Library','book-open',()=>external(jw));
      button(row,'Copier','copy',()=>void this.copy(ref));
      button(row,'Insérer','link',()=>this.insertLink(ref));
      button(row,'Explorer','search',()=>this.focusReference(ref));
    }
    this.scroller.createDiv({cls:'biblelab-alert',text:'Astuce : les marqueurs !!Jean 3:16!! restent du Markdown ordinaire et ne modifient pas tes notes.'});
  }
  private async loadIndex():Promise<void>{
    if(this.indexLoading)return;
    this.indexLoading=true;this.render();
    try{
      const response=await requestUrl({url:OFFICIAL_MAP_INDEX,throw:false});
      if(response.status!==200)throw Error('Accès au site indisponible ('+response.status+').');
      const entries=parseMapIndex(response.text);
      if(entries.length<100)throw Error('Index incomplet ou structure de page modifiée.');
      this.mapIndex=entries;this.indexLoaded=true;
      new Notice(entries.length+' lieux chargés depuis l’index officiel.');
    }catch(error){
      new Notice((error instanceof Error?error.message:'Index inaccessible')+' · Index de secours conservé.');
    }finally{this.indexLoading=false;if(this.scroller)this.render();}
  }
  private renderMaps():void{
    heading(this.scroller,'Cartothèque biblique','Retrouve les lieux dans l’index de Voyez le bon pays, puis consulte les cartes officielles ou ton Atlas.');
    const top=this.scroller.createDiv({cls:'biblelab-buttons'});
    button(top,'Ouvrir l’index','external-link',()=>external(OFFICIAL_MAP_INDEX));
    button(top,'Mon Atlas','map-pin',()=>void this.host.openAtlas(),true);
    const load=button(top,this.indexLoaded?'Actualiser l’index':'Charger l’index complet','refresh-cw',()=>void this.loadIndex());
    load.disabled=this.indexLoading;
    if(!this.indexLoaded)this.scroller.createDiv({cls:'biblelab-alert',text:'Index de secours limité affiché. « Charger l’index complet » tente de lire uniquement les noms et repères du site officiel. Si WOL bloque la requête, le lien officiel reste accessible.'});
    const area=this.scroller.createDiv({cls:'biblelab-search'});
    const input=area.createEl('input',{type:'search',placeholder:'Jérusalem, Capharnaüm, Our…'});
    input.value=this.mapTerm;input.addEventListener('input',()=>{this.mapTerm=input.value;this.renderMapResults(results);});
    const results=this.scroller.createDiv();
    this.renderMapResults(results);
    this.scroller.createEl('div',{cls:'biblelab-eyebrow',text:'Parcourir les cartes'});
    for(const [label,page,url] of MAP_CHAPTERS){
      const el=card(this.scroller,label,'Pages '+page+'–'+(page+1));
      const actions=el.createDiv({cls:'biblelab-buttons'});
      button(actions,'Ouvrir cette carte','external-link',()=>external(url));
      button(actions,'Copier la référence','copy',()=>void this.copy('Voyez le bon pays, p. '+page+'–'+(page+1)));
    }
  }
  private renderMapResults(parent:HTMLElement):void{
    parent.empty();
    const term=normalizeSearch(this.mapTerm);
    const results=this.mapIndex.filter(item=>normalizeSearch(item.name).includes(term));
    const info=parent.createDiv({cls:'biblelab-eyebrow'});
    info.setText('Index des lieux · '+results.length+' résultat(s)'+(this.indexLoaded?'':' · aperçu'));
    for(const item of results.slice(0,35)){
      const c=card(parent,item.name,item.coordinates);
      c.createDiv({cls:'biblelab-mini',text:'Cartes : '+item.pages.map(p=>mapChapterForPage(p)+' (p. '+p+')').join(' · ')});
      const row=c.createDiv({cls:'biblelab-buttons'});
      const chapter=MAP_CHAPTERS.find(([,page])=>item.pages.some(p=>p>=page&&p<page+2));
      if(chapter)button(row,'Voir la carte','external-link',()=>external(chapter[2]),true);
      button(row,'Index officiel','list',()=>external(OFFICIAL_MAP_INDEX));
      button(row,'Copier repères','copy',()=>void this.copy(item.name+' — '+item.coordinates+' — Voyez le bon pays'));
      button(row,'Atlas interactif','map',()=>void this.host.openAtlas());
    }
    if(results.length>35)parent.createDiv({cls:'biblelab-mini',text:'Affichage limité à 35 lieux : précise la recherche.'});
    if(!results.length)parent.createDiv({cls:'biblelab-empty',text:'Aucun lieu trouvé. Essaie une autre orthographe ou ouvre l’index officiel.'});
  }
  private renderLibrary():void{
    heading(this.scroller,'Bibliothèque d’étude','Accès direct aux annexes et aux outils documentaires officiels.');
    this.scroller.createEl('div',{cls:'biblelab-search'}).createEl('input',{type:'search',placeholder:'Filtrer les ressources…',attr:{value:this.libraryTerm}})
      .addEventListener('input',event=>{this.libraryTerm=(event.target as HTMLInputElement).value;this.renderLibraryResults(resultContainer);});
    const resultContainer=this.scroller.createDiv();
    this.renderLibraryResults(resultContainer);
    this.scroller.createDiv({cls:'biblelab-alert',text:'Les documents restent consultés sur les sites officiels. Bible Lab conserve seulement des liens et tes notes locales.'});
  }
  private renderLibraryResults(parent:HTMLElement):void{
    parent.empty();
    const term=normalizeSearch(this.libraryTerm);
    for(const resource of RESOURCES.filter(x=>normalizeSearch(x.title+' '+x.section+' '+(x.subtitle||'')).includes(term)))this.resourceCard(parent,resource);
  }
  private resourceCard(parent:HTMLElement,resource:Resource):void{
    const c=card(parent,resource.title,resource.subtitle);
    c.createDiv({cls:'biblelab-mini',text:resource.section});
    const row=c.createDiv({cls:'biblelab-buttons'});
    button(row,'Consulter','external-link',()=>external(resource.url),true);
    button(row,'Copier lien','copy',()=>void this.copy(resource.url));
    button(row,'Insérer','file-plus-2',()=>this.insertMarkdownLink(resource.title,resource.url));
  }
  private async copy(text:string):Promise<void>{
    try{await navigator.clipboard.writeText(text);new Notice('Copié dans le presse-papiers.');}
    catch{new Notice('Copie indisponible sur cet appareil.');}
  }
  private async copyLink(reference:string):Promise<void>{await this.copy(wolLookup(reference));}
  private insertLink(reference:string):void{this.insertMarkdownLink(reference,wolLookup(reference));}
  private insertMarkdownLink(title:string,url:string):void{
    const safeTitle=title.replace(/[\[\]]/g,'');
    const currentFile=this.app.workspace.getActiveFile();
    // The sidebar can take focus. Locate a Markdown editor for the active file.
    const leaves=this.app.workspace.getLeavesOfType('markdown');
    const view=leaves.map(leaf=>leaf.view).find(view=>view instanceof MarkdownView && view.file?.path===currentFile?.path)
      || leaves.map(leaf=>leaf.view).find(view=>view instanceof MarkdownView);
    if(!(view instanceof MarkdownView)){new Notice('Ouvre une note Markdown avant d’insérer un lien.');return;}
    view.editor.replaceSelection('['+safeTitle+']('+url+')');
    new Notice('Lien inséré dans la note.');
  }
}
