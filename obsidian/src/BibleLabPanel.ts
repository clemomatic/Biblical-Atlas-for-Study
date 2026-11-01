import { ItemView, MarkdownView, Notice, requestUrl, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import styles from './bibleLab.css?inline';
import {
  jwLibraryLink, mapChapterForPage, MAP_CHAPTERS,
  normalizeSearch, OFFICIAL_ATLAS, OFFICIAL_MAP_INDEX, parseMapIndex, parseScripture,
  RESOURCES, wolSearch, type MapLocation, type Resource
} from './bibleLabData';
import { OFFLINE_MAP_INDEX } from './bibleLabMapCorpus';
import { dayLink, parseDailyHtml, parseMeetingHtml, weekTitle, type StudyLive } from './studyLive';
import { extractReferenceEntries, cleanWolUrl, passageUrl, type ReferenceEntry } from './referenceReader';
import { renderReferenceAccordion, type ReaderState } from './referencePanel';

export const BIBLE_LAB_VIEW = 'bible-lab-sidebar';
type Tab = 'home' | 'wol' | 'refs' | 'maps' | 'library' | 'studio';
export interface BibleLabHost {
  openAtlas: () => Promise<void>;
  openAtlasPlace: (name:string) => void;
  newResearch: (keys: []) => void;
  newInvestigation: (selections: []) => void;
  createTalk: () => void;
  inspectArchive: () => void;
  importMarkdownArchive: () => void;
  openNativeBridge: () => void;
  saveDailyStudy: (day: import('./studyLive').DayPreview,date:Date) => void;
  saveWeeklyStudy: (week: import('./studyLive').MeetingPreview,date:Date) => void;
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
  private tab: Tab = 'home';
  private scroller!: HTMLElement;
  private tabs!: HTMLElement;
  private query='Matthieu 10:29';
  private mapTerm='';
  private libraryTerm='';
  private noteRefs: ReferenceEntry[] = [];
  private pinnedRef: ReferenceEntry|null=null;
  private readonly reader:ReaderState={expanded:new Set(),cache:new Map(),pending:new Map(),copy:url=>{void this.copy(url);},open:external};
  private noteTitle='';
  private mapIndex:MapLocation[]=OFFLINE_MAP_INDEX;
  private indexLoaded=false;
  private indexLoading=false;
  private sequence=0;
  private live: StudyLive = { day:null, meeting:null };
  private liveLoading=false;
  private liveLastUpdated=0;
  private liveError='';

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
    const logo=brand.createSpan({cls:'biblelab-logo'});setIcon(logo,'orbit');
    const identity=brand.createDiv({cls:'biblelab-identity'});
    identity.createSpan({cls:'biblelab-wordmark',text:'BIBLE LAB'});
    identity.createSpan({cls:'biblelab-tagline',text:'STUDY STUDIO'});
    const status=brand.createSpan({cls:'biblelab-status',attr:{'aria-label':'Données personnelles locales',title:'Données personnelles locales'}});
    setIcon(status,'shield-check');
    this.tabs=this.contentEl.createDiv({cls:'biblelab-tabs'});
    this.scroller=this.contentEl.createDiv({cls:'biblelab-scroller'});
    const footer=this.contentEl.createDiv({cls:'biblelab-footer'});
    footer.createSpan({text:'<SOURCE> · COFFRE LOCAL'});
    const atlas=footer.createEl('a',{cls:'biblelab-footlink',text:'Atlas ↗',href:'#'});
    atlas.addEventListener('click',event=>{event.preventDefault();void this.host.openAtlas();});
    await this.updateActiveNote(this.app.workspace.getActiveFile());
    this.render();
  }
  async onClose():Promise<void>{this.sequence++;this.contentEl.empty();}
  focusReference(value:string):void{
    const label=value.trim();if(!label)return;
    this.query=label;const direct=cleanWolUrl(label);
    this.pinnedRef={label,url:direct||passageUrl(label),kind:parseScripture(label)?'scripture':direct?'document':'publication',origin:'pinned'};
    this.reader.expanded.add(this.pinnedRef.url+'#'+label);
    this.tab='refs';if(this.scroller)this.render();
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
      this.noteTitle=file.basename;this.noteRefs=extractReferenceEntries(text);
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
      {key:'home',label:'Accueil',icon:'layout-dashboard'},
      {key:'wol',label:'WOL',icon:'scan-search'},
      {key:'refs',label:'Références',icon:'book-open-text'},
      {key:'maps',label:'Atlas',icon:'map-pinned'},
      {key:'library',label:'Sources',icon:'library-big'},
      {key:'studio',label:'Studio',icon:'notebook-pen'}
    ];
    for(const entry of entries){
      const tab=this.tabs.createEl('button',{cls:'biblelab-tab',attr:{'aria-selected':String(this.tab===entry.key),'aria-label':entry.label}});
      const symbol=tab.createSpan();setIcon(symbol,entry.icon);
      tab.createSpan({text:entry.label});
      tab.addEventListener('click',()=>this.setTab(entry.key));
    }
    this.scroller.empty();
    switch(this.tab){
      case 'home':this.renderHome();break;
      case 'wol':this.renderWol();break;
      case 'refs':this.renderRefs();break;
      case 'maps':this.renderMaps();break;
      case 'library':this.renderLibrary();break;
      case 'studio':this.renderStudio();break;
    }
  }
  private hero(parent:HTMLElement,eyebrow:string,title:string,subtitle:string,icon:string):HTMLElement {
    const hero=parent.createDiv({cls:'biblelab-hero'});
    const top=hero.createDiv({cls:'biblelab-hero-top'});
    top.createSpan({cls:'biblelab-kicker',text:eyebrow});
    const glyph=top.createSpan({cls:'biblelab-hero-icon'});setIcon(glyph,icon);
    hero.createEl('h2',{text:title});
    hero.createEl('p',{text:subtitle});
    return hero;
  }
  private renderHome():void{
    const now=new Date();
    const format=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'});
    this.hero(this.scroller,format.format(now).toLocaleUpperCase('fr'),'Un espace pour explorer.','Versets · découvertes · méditation','sparkles');
    const quick=this.scroller.createDiv({cls:'biblelab-launch-grid'});
    for(const item of [
      {label:'Rechercher',icon:'search',tab:'wol' as Tab},
      {label:'Enquêter',icon:'network',tab:'refs' as Tab},
      {label:'Explorer',icon:'map',tab:'maps' as Tab},
      {label:'Créer',icon:'pen-line',tab:'studio' as Tab}
    ]){
      const action=quick.createEl('button',{cls:'biblelab-launch'});
      const symbol=action.createSpan({cls:'biblelab-launch-icon'});setIcon(symbol,item.icon);
      action.createSpan({text:item.label});
      action.addEventListener('click',()=>this.setTab(item.tab));
    }
    const headingRow=this.scroller.createDiv({cls:'biblelab-section-head'});
    headingRow.createEl('h3',{text:'AUJOURD’HUI'});
    const reload=button(headingRow,this.liveLoading?'Chargement…':'Actualiser','refresh-cw',()=>void this.loadLive());
    reload.disabled=this.liveLoading;
    const daily=card(this.scroller,'Texte du jour',this.live.day?.date || 'WOL · Examinons les Écritures chaque jour');
    daily.addClass('biblelab-feature-card');
    const dateBadge=daily.createSpan({cls:'biblelab-feature-icon'});setIcon(dateBadge,'sun-medium');
    if(this.live.day){
      daily.createEl('p',{cls:'biblelab-verse-text',text:this.live.day.verse});
      if(this.live.day.excerpt)daily.createEl('p',{cls:'biblelab-excerpt',text:this.live.day.excerpt});
    }else daily.createEl('p',{cls:'biblelab-mini',text:this.liveError||'Aperçu disponible à la demande.'});
    const row=daily.createDiv({cls:'biblelab-buttons'});
    button(row,'Lire sur WOL','external-link',()=>external(dayLink(now)));
    if(this.live.day){button(row,'Créer une méditation','notebook-pen',()=>this.host.saveDailyStudy(this.live.day!,now),true);
      button(row,'Copier le lien','copy',()=>void this.copy(this.live.day!.source));}
    const week=card(this.scroller,'Réunion de semaine',this.live.meeting?.week||weekTitle(now));
    week.addClass('biblelab-feature-card');
    const weekSymbol=week.createSpan({cls:'biblelab-feature-icon'});setIcon(weekSymbol,'calendar-range');
    if(this.live.meeting){
      if(this.live.meeting.bibleReading)week.createEl('p',{cls:'biblelab-week-reading',text:this.live.meeting.bibleReading});
      for(const section of this.live.meeting.sections){
        const sectionEl=week.createDiv({cls:'biblelab-week-section'});
        sectionEl.createEl('strong',{text:section.section});
        for(const item of section.items) sectionEl.createEl('p',{text:item});
      }
    }else week.createEl('p',{cls:'biblelab-mini',text:'Programme officiel et sujets de la semaine.'});
    const weekActions=week.createDiv({cls:'biblelab-buttons'});
    button(weekActions,'Voir la réunion','external-link',()=>external(dayLink(now)));
    if(this.live.meeting)button(weekActions,'Préparer en note','notebook-pen',()=>this.host.saveWeeklyStudy(this.live.meeting!,now),true);
    this.scroller.createEl('div',{cls:'biblelab-eyebrow',text:'CONTINUER'});
    const research=card(this.scroller,'Une nouvelle découverte','Commencer une enquête ou reprendre une réflexion.');
    const researchRow=research.createDiv({cls:'biblelab-buttons'});
    button(researchRow,'Nouvelle enquête','network',()=>this.host.newResearch([]),true);
    button(researchRow,'Atelier discours','mic-2',()=>this.setTab('studio'));
    if(this.liveLastUpdated) this.scroller.createEl('p',{cls:'biblelab-mini',text:'Mise à jour depuis WOL · '+new Date(this.liveLastUpdated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})});
  }
  private async loadLive():Promise<void>{
    if(this.liveLoading)return;
    this.liveLoading=true;this.liveError='';this.render();
    const today=new Date();
    try{
      const response=await requestUrl({url:dayLink(today),throw:false});
      if(response.status!==200)throw Error('WOL indisponible ('+response.status+').');
      const day=parseDailyHtml(response.text,today),meeting=parseMeetingHtml(response.text,today);
      if(!day&&!meeting)throw Error('La présentation de la page a changé : extraction indisponible.');
      this.live={day,meeting};this.liveLastUpdated=Date.now();
    }catch(error){
      this.liveError=(error instanceof Error?error.message:'Connexion indisponible.')+' Utilise les liens officiels.';
    }finally{this.liveLoading=false;if(this.tab==='home')this.render();}
  }
  private renderStudio():void{
    this.hero(this.scroller,'ATELIER','Créer, structurer, méditer.','Des supports clairs, modifiables et reliés à tes découvertes.','pen-tool');
    const talk=card(this.scroller,'Plans de discours','Une idée, un objectif, des versets et un minutage.');
    talk.addClass('biblelab-feature-card');
    button(talk.createDiv({cls:'biblelab-buttons'}),'Nouveau discours','mic-2',()=>this.host.createTalk(),true);
    const investigation=card(this.scroller,'Tableau d’enquête','Connexions visuelles avec les Canvas Obsidian.');
    button(investigation.createDiv({cls:'biblelab-buttons'}),'Nouvelle enquête','network',()=>this.host.newResearch([]),true);
    const archive=card(this.scroller,'Passerelles JW Library','Imports JWPUB et sauvegardes directement dans Obsidian.');
    const archiveActions=archive.createDiv({cls:'biblelab-buttons'});
    button(archiveActions,'Ouvrir la passerelle','arrow-left-right',()=>this.host.openNativeBridge(),true);
    button(archiveActions,'Importer un ZIP Markdown','folder-input',()=>this.host.importMarkdownArchive());
    button(archiveActions,'Inspecter','file-archive',()=>this.host.inspectArchive());
    const archiveInfo=archive.createEl('details',{cls:'biblelab-disclosure'});
    archiveInfo.createEl('summary',{text:'Que fait l’inspection ?'});
    archiveInfo.createEl('p',{text:'L’inspection produit un rapport de manifeste sans importer de contenu. Utilise « Ouvrir la passerelle » pour convertir un JWPUB, récupérer tes notes ou préparer une sauvegarde modifiée.'});
    const prompt=card(this.scroller,'Bibliothèque de modèles','Tes notes restent des fichiers Markdown portables.');
    button(prompt.createDiv({cls:'biblelab-buttons'}),'Explorer les sources','library-big',()=>this.setTab('library'));
  }
  private searchField(parent:HTMLElement,value:string,placeholder:string,change:(text:string)=>void,submit:()=>void):HTMLInputElement{
    const area=parent.createDiv({cls:'biblelab-search'});
    const input=area.createEl('input',{attr:{type:'search',placeholder,'aria-label':placeholder}});
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
    button(actions,'Ouvrir le passage','book-open',()=>external(this.referenceUrl(this.query)));
    button(actions,'JW Library','book-marked',()=>{
      const link=jwLibraryLink(this.query);
      if(link)external(link);else new Notice('Indique un verset précis pour ouvrir JW Library.');
    });
    const actions2=this.scroller.createDiv({cls:'biblelab-buttons'});
    button(actions2,'Copier lien','copy',()=>void this.copyLink(this.query));
    button(actions2,'Insérer dans note','file-plus-2',()=>this.insertLink(this.query));
    button(actions2,'Créer une enquête','network',()=>this.host.newResearch([]));

    const read=this.scroller.createDiv({cls:'biblelab-reader-start'});
    read.createEl('h3',{text:'Lire dans le panneau'});
    read.createEl('p',{text:'Texte, notes et références extraits de la source officielle sur demande.'});
    const target=this.query.trim();
    if(target){
      const direct=cleanWolUrl(target);
      const item:ReferenceEntry={label:target,url:direct||passageUrl(target),
        kind:parseScripture(target)?'scripture':direct?'document':'publication',origin:'pinned'};
      renderReferenceAccordion(read,item,this.reader);
      button(read,'Déplier la référence','panel-right-open',()=>{
        this.reader.expanded.add(item.url+'#'+item.label);this.render();
      },true);
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
  private renderRefs():void{
    heading(this.scroller,'Références','Versets, notes d’étude et articles, sans quitter le panneau.');
    if(this.noteTitle){
      const context=this.scroller.createDiv({cls:'biblelab-ref-context'});
      context.createSpan({text:'NOTE ACTIVE'});
      context.createEl('strong',{text:this.noteTitle});
    }
    const pinned=this.pinnedRef;
    const entries=pinned?[pinned,...this.noteRefs.filter(x=>!(x.label===pinned.label&&x.url===pinned.url))]:this.noteRefs;
    if(!entries.length)this.scroller.createDiv({cls:'biblelab-empty',text:'Ouvre une note contenant Jean 7:24, !!Mt 10:29!! ou [w24 Novembre p. 14-19].'});
    if(entries.length){
      const row=this.scroller.createDiv({cls:'biblelab-reader-count'});
      row.createSpan({text:entries.length+' références détectées'});
      button(row,'Replier','chevrons-up',()=>{this.reader.expanded.clear();this.render();});
      for(const item of entries)renderReferenceAccordion(this.scroller,item,this.reader);
    }
    const info=this.scroller.createEl('details',{cls:'biblelab-disclosure'});
    info.createEl('summary',{text:'Formats reconnus'});
    info.createEl('p',{text:'Versets en clair, !!référence!!, [référence de publication] et [titre](lien WOL). Déplie une référence pour lire le texte officiel, puis les notes ou les articles cités.'});
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
    if(!this.indexLoaded){
      const info=this.scroller.createEl('details',{cls:'biblelab-disclosure'});
      info.createEl('summary',{text:'À propos des repères cartographiques'});
      info.createEl('p',{text:'La sélection hors ligne vient des données documentées de l’Atlas. Charger l’index complet tente de lire les noms et repères du site officiel ; la carte reste accessible si le chargement échoue.'});
    }
    const area=this.scroller.createDiv({cls:'biblelab-search'});
    const input=area.createEl('input',{attr:{type:'search',placeholder:'Jérusalem, Capharnaüm, Our…'}});
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
      button(row,'Atlas interactif','map',()=>this.host.openAtlasPlace(item.name));
    }
    if(results.length>35)parent.createDiv({cls:'biblelab-mini',text:'Affichage limité à 35 lieux : précise la recherche.'});
    if(!results.length)parent.createDiv({cls:'biblelab-empty',text:'Aucun lieu trouvé. Essaie une autre orthographe ou ouvre l’index officiel.'});
  }
  private renderLibrary():void{
    heading(this.scroller,'Bibliothèque d’étude','Accès direct aux annexes et aux outils documentaires officiels.');
    this.scroller.createEl('div',{cls:'biblelab-search'}).createEl('input',{attr:{type:'search',placeholder:'Filtrer les ressources…',value:this.libraryTerm}})
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
  private referenceUrl(reference:string):string{return cleanWolUrl(reference)||passageUrl(reference);}
  private async copyLink(reference:string):Promise<void>{await this.copy(this.referenceUrl(reference));}
  private insertLink(reference:string):void{this.insertMarkdownLink(reference,this.referenceUrl(reference));}
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
