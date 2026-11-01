import { ItemView, MarkdownView, Notice, requestUrl, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import styles from './bibleLab.css?inline';
import {
  jwLibraryLink, mapChapterForPage, MAP_CHAPTERS,
  normalizeSearch, OFFICIAL_ATLAS, OFFICIAL_MAP_INDEX, parseMapIndex, parseScripture,
  RESOURCES, wolSearch, type MapLocation, type Resource
} from './bibleLabData';
import { OFFLINE_MAP_INDEX } from './bibleLabMapCorpus';
import { dayLink, meetingIssueLink, findMeetingProgramme, wolMeetingLink, parseDailyHtml, parseMeetingHtml, weekTitle, type StudyLive } from './studyLive';
import { extractReferenceEntries, cleanWolUrl, passageUrl, type ReferenceEntry } from './referenceReader';
import { renderReferenceAccordion, type ReaderState } from './referencePanel';
import { jwOrgResearchUrl, wolResearchUrl, parseWolSearchResults, type WolMatchMode, type WolSearchScope, type WolSearchHit } from './wolResearch';
import { parseImportedJwNote, type LocalJwHit } from './localJwSearch';
import { cleanReadingText } from './readerText';

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
  private tabScroll=new Map<Tab,number>();
  private scroller!: HTMLElement;
  private tabs!: HTMLElement;
  private query='';
  private searchMatch:WolMatchMode='par';
  private searchScope:WolSearchScope='all';
  private wolResults:WolSearchHit[]=[];
  private wolResultsQuery='';
  private wolResultsError='';
  private wolResultsLoading=false;
  private sourceCheckLoading=false;
  private searchAdvancedOpen=false;
  private sourceCheckMessage='';
  private wolResultsSequence=0;
  private localHits:LocalJwHit[]=[];
  private localHitsQuery='';
  private localSearchLoading=false;
  private localSearchError='';
  private localSearchSequence=0;
  private mapTerm='';
  private libraryTerm='';
  private noteRefs: ReferenceEntry[] = [];
  private pinnedRef: ReferenceEntry|null=null;
  private referenceHistory:ReferenceEntry[]=[];
  private referencePosition:number[]=[];
  private referenceCursor=-1;
  private readonly reader:ReaderState={expanded:new Set(),cache:new Map(),pending:new Map(),copy:url=>{void this.copy(url);},open:external,navigate:ref=>this.focusReference(ref.url,ref.label),remember:ref=>this.rememberReference(ref),insert:ref=>this.insertMarkdownLink(ref.label,ref.url)};
  private noteTitle='';
  private lastMarkdownPath:string|null=null;
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
  getDisplayText():string{return 'Bible Lab · Recherche';}
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
    footer.createSpan({text:'Notes locales · Sources officielles en ligne'});
    const atlas=footer.createEl('a',{cls:'biblelab-footlink',text:'Atlas ↗',href:'#'});
    atlas.addEventListener('click',event=>{event.preventDefault();void this.host.openAtlas();});
    await this.updateActiveNote(this.app.workspace.getActiveFile());
    this.render();
  }
  async onClose():Promise<void>{this.sequence++;this.contentEl.empty();}
  private rememberReference(ref:ReferenceEntry):void{
    const current=this.referenceHistory[this.referenceCursor];
    if(current?.url===ref.url && current.label===ref.label)return;
    if(this.referenceCursor>=0&&this.scroller)
      this.referencePosition[this.referenceCursor]=this.scroller.scrollTop;
    this.referenceHistory=this.referenceHistory.slice(0,this.referenceCursor+1);
    this.referencePosition=this.referencePosition.slice(0,this.referenceCursor+1);
    this.referenceHistory.push(ref);this.referencePosition.push(0);
    if(this.referenceHistory.length>40){this.referenceHistory.shift();this.referencePosition.shift();}
    this.referenceCursor=this.referenceHistory.length-1;
  }
  focusReference(value:string,displayLabel?:string):void{
    const label=cleanReadingText(displayLabel||value);if(!label)return;
    const direct=cleanWolUrl(value);
    const ref:ReferenceEntry={label,url:direct||passageUrl(label),
      kind:parseScripture(label)?'scripture':direct?'document':'publication',origin:'pinned'};
    this.rememberReference(ref);
    this.pinnedRef=ref;
    if(this.tab!=='refs'&&this.scroller)this.tabScroll.set(this.tab,this.scroller.scrollTop);
    this.reader.expanded.clear();
    this.reader.expanded.add(ref.url+'#'+label);
    this.tab='refs';if(this.scroller){this.render();this.scroller.scrollTop=0;}
  }
  private moveReference(direction:-1|1):void{
    const next=this.referenceCursor+direction;
    if(next<0||next>=this.referenceHistory.length)return;
    this.referencePosition[this.referenceCursor]=this.scroller.scrollTop;
    this.referenceCursor=next;
    const ref=this.referenceHistory[next];
    this.pinnedRef=ref;this.tab='refs';
    this.reader.expanded.clear();
    this.reader.expanded.add(ref.url+'#'+ref.label);
    this.render();
    const scroll=this.referencePosition[next]||0;
    window.requestAnimationFrame(()=>{if(this.scroller&&this.tab==='refs')this.scroller.scrollTop=scroll;});
  }
  async updateActiveNote(file:TFile|null):Promise<void>{
    const generation=++this.sequence;
    if(!file || file.extension!=='md'){
      this.noteTitle='';this.noteRefs=[];
      if((this.tab==='refs'||this.tab==='home')&&this.scroller)this.render();
      return;
    }
    try{
      const text=await this.app.vault.cachedRead(file);
      if(generation!==this.sequence)return;
      this.noteTitle=file.basename;this.lastMarkdownPath=file.path;this.noteRefs=extractReferenceEntries(text);
    }catch{
      if(generation!==this.sequence)return;
      this.noteTitle=file.basename;this.lastMarkdownPath=file.path;this.noteRefs=[];
    }
    if((this.tab==='refs'||this.tab==='home')&&this.scroller)this.render();
  }
  private setTab(tab:Tab):void{
    if(this.tab===tab)return;
    if(this.scroller)this.tabScroll.set(this.tab,this.scroller.scrollTop);
    this.tab=tab;this.render();
    const previous=this.tabScroll.get(tab)||0;
    if(this.scroller)this.scroller.scrollTop=previous;
  }
  private render():void{
    this.tabs.empty();
    const primary=this.tabs.createDiv({cls:'biblelab-nav-primary',attr:{'role':'group','aria-label':'Parcours d’étude'}});
    const secondary=this.tabs.createDiv({cls:'biblelab-nav-secondary',attr:{'role':'group','aria-label':'Outils complémentaires'}});
    const entries:{key:Tab;label:string;icon:string}[]=[
      {key:'home',label:'Étudier',icon:'house'},
      {key:'wol',label:'Chercher',icon:'search'},
      {key:'refs',label:'Lire',icon:'book-open-text'},
      {key:'maps',label:'Atlas',icon:'map-pinned'},
      {key:'library',label:'Sources',icon:'library-big'},
      {key:'studio',label:'Studio',icon:'notebook-pen'}
    ];
    for(const entry of entries){
      const parent=['home','wol','refs'].includes(entry.key)?primary:secondary;
      const tab=parent.createEl('button',{cls:'biblelab-tab',attr:{
        type:'button','aria-selected':String(this.tab===entry.key),
        'aria-label':entry.key==='home'?'Accueil':entry.key==='wol'?'WOL':entry.key==='refs'?'Références':entry.label,'title':entry.label}});
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
  private launchStudy(value:string):void{
    const term=cleanReadingText(value);
    if(!term){this.setTab('wol');return;}
    this.query=term;
    if(parseScripture(term) || cleanWolUrl(term) || /^(?:w\d{2}|g\d{2}|mwb\d{2}|it-\d)/i.test(term)){
      this.focusReference(term);
      return;
    }
    this.setTab('wol');
    void this.loadWolResults();
  }
  private renderStudySearch(parent:HTMLElement):void{
    const form=parent.createEl('form',{cls:'biblelab-quick-search'});
    const text=form.createEl('input',{attr:{
      type:'search',autocomplete:'off',placeholder:'Sujet, verset ou lien WOL…',
      'aria-label':'Rechercher dans Bible Lab'}});
    text.value=this.query;
    text.addEventListener('input',()=>{this.query=text.value;});
    const submit=form.createEl('button',{attr:{type:'submit','aria-label':'Lancer une recherche'},cls:'biblelab-quick-submit'});
    setIcon(submit,'arrow-right');
    form.addEventListener('submit',(event)=>{event.preventDefault();this.launchStudy(text.value);});
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
    const welcome=this.scroller.createDiv({cls:'biblelab-study-welcome'});
    welcome.createSpan({cls:'biblelab-study-overline',text:format.format(now)});
    welcome.createEl('h2',{text:'Que veux-tu approfondir ?'});
    welcome.createEl('p',{text:'Une idée, un verset, une publication : commence ici.'});
    this.renderStudySearch(welcome);
    if(this.pinnedRef){
      const resume=this.scroller.createDiv({cls:'biblelab-resume-card'});
      const copy=resume.createDiv();
      copy.createSpan({cls:'biblelab-study-overline',text:'DERNIÈRE LECTURE'});
      copy.createEl('strong',{text:this.pinnedRef.label});
      const b=button(resume,'Reprendre','book-open',()=>this.setTab('refs'),true);
      b.setAttribute('aria-label','Reprendre '+this.pinnedRef.label);
    }
    if(this.noteTitle){
      const note=this.scroller.createDiv({cls:'biblelab-active-note'});
      const symbol=note.createSpan();setIcon(symbol,'file-text');
      const details=note.createDiv({cls:'biblelab-active-note-copy'});
      details.createSpan({text:'NOTE ACTIVE'});
      details.createEl('strong',{text:this.noteTitle});
      details.createSpan({text:this.noteRefs.length+' références repérées'});
      button(note,'Voir','arrow-right',()=>this.setTab('refs'));
    }
    const shortcuts=this.scroller.createDiv({cls:'biblelab-journey-actions'});
    button(shortcuts,'Rechercher dans WOL','search',()=>this.setTab('wol'));
    button(shortcuts,'Lire mes références','book-open-text',()=>this.setTab('refs'));
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
    }else week.createEl('p',{cls:'biblelab-mini',text:this.liveError||'Programme officiel disponible sur WOL et dans le cahier Vie et ministère.'});
    const weekActions=week.createDiv({cls:'biblelab-buttons'});
    button(weekActions,'Voir la réunion','external-link',()=>external(this.live.meeting?.source||dayLink(now)));
    if(this.live.meeting)button(weekActions,'Préparer en note','notebook-pen',()=>this.host.saveWeeklyStudy(this.live.meeting!,now),true);
    if(this.liveLastUpdated) this.scroller.createEl('p',{cls:'biblelab-mini',text:'Mise à jour depuis WOL · '+new Date(this.liveLastUpdated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})});
  }
  private async loadLive():Promise<void>{
    if(this.liveLoading)return;
    this.liveLoading=true;this.liveError='';this.render();
    const today=new Date();
    const warnings:string[]=[];
    let day:StudyLive['day']=null,meeting:StudyLive['meeting']=null;
    const dailyUrl=dayLink(today);
    try{
      // The WOL /dt/ page contains both the Daily Text and this week's
      // full Life and Ministry programme. Read it once and validate both.
      try{
        const response=await requestUrl({url:dailyUrl,throw:false});
        if(response.status!==200)throw Error('WOL HTTP '+response.status);
        if(!response.text||!response.text.trim())throw Error('Page WOL vide');
        day=parseDailyHtml(response.text,today);
        const programmeLink=wolMeetingLink(response.text,today,dailyUrl)||dailyUrl;
        meeting=parseMeetingHtml(response.text,today,programmeLink);
        if(!day)warnings.push('Texte du jour non reconnu sur la page WOL.');
      }catch(error){
        warnings.push('Chargement WOL impossible ('+
          (error instanceof Error?error.message:'connexion')+').');
      }
      if(!meeting){
        // JW.org provides the same programme in a separate weekly document.
        // This is a fallback; an unavailable index must not discard a good
        // Daily Text loaded above.
        const issueUrl=meetingIssueLink(today);
        try{
          const index=await requestUrl({url:issueUrl,throw:false});
          if(index.status!==200)throw Error('JW.org HTTP '+index.status);
          const source=findMeetingProgramme(index.text,today,issueUrl);
          if(!source)throw Error('Semaine absente de la page du cahier');
          const response=await requestUrl({url:source,throw:false});
          if(response.status!==200)throw Error('JW.org HTTP '+response.status);
          meeting=parseMeetingHtml(response.text,today,source);
          if(!meeting)throw Error('Programme non reconnu');
        }catch(error){
          warnings.push('Programme non récupéré : '+
            (error instanceof Error?error.message:'connexion')+'.');
        }
      }
      if(day||meeting){
        this.live={day,meeting};this.liveLastUpdated=Date.now();
      }else{
        this.live={day:null,meeting:null};
      }
      this.liveError=warnings.join(' ');
    }finally{
      this.liveLoading=false;
      if(this.tab==='home')this.render();
    }
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
    heading(this.scroller,'Recherche documentaire','Un sujet ou une référence, puis les sources officielles.');
    this.searchField(this.scroller,this.query,'Sujet, publication ou verset…',text=>{
      if(this.query!==text){
        this.query=text;this.wolResults=[];this.wolResultsQuery='';this.wolResultsError='';
        this.wolResultsSequence++;this.wolResultsLoading=false;
        this.localSearchSequence++;this.localSearchLoading=false;this.localHits=[];this.localHitsQuery='';this.localSearchError='';
      }
    },()=>void this.loadWolResults());

    const primary=this.scroller.createDiv({cls:'biblelab-search-primary'});
    const find=button(primary,this.wolResultsLoading?'Recherche…':'Voir les résultats','search',()=>void this.loadWolResults(),true);
    find.disabled=this.wolResultsLoading;
    button(primary,'Lire dans le panneau','book-open-text',()=>{
      const term=this.query.trim();
      if(!term){new Notice('Saisis un verset, une référence ou un lien WOL.');return;}
      this.focusReference(cleanWolUrl(term)||this.referenceUrl(term),term);
    });

    if(this.wolResultsLoading){
      const status=this.scroller.createDiv({cls:'biblelab-search-state',attr:{role:'status','aria-live':'polite'}});
      const icon=status.createSpan();setIcon(icon,'loader-circle');
      status.createSpan({text:'Recherche de documents sur WOL…'});
    }
    if(this.wolResultsError){
      const info=this.scroller.createDiv({cls:'biblelab-search-feedback'});
      const symbol=info.createSpan();setIcon(symbol,'info');
      info.createEl('p',{text:this.wolResultsError});
      button(info,'Continuer sur WOL','external-link',()=>this.openSearch());
    }
    if(this.wolResultsQuery&&!this.wolResultsLoading&&this.wolResults.length){
      const headingRow=this.scroller.createDiv({cls:'biblelab-section-head'});
      headingRow.createEl('h3',{text:'RÉSULTATS · '+this.wolResults.length+' LIENS'});
      for(const hit of this.wolResults){
        const el=this.scroller.createDiv({cls:'biblelab-search-result'});
        const icon=el.createSpan({cls:'biblelab-search-result-icon'});setIcon(icon,'file-text');
        const copy=el.createDiv({cls:'biblelab-search-result-copy'});
        copy.createEl('strong',{text:hit.title});
        if(hit.excerpt)copy.createEl('p',{text:hit.excerpt});
        const row=el.createDiv({cls:'biblelab-search-result-actions'});
        button(row,'Lire ici','book-open',()=>this.focusReference(hit.url,hit.title),true);
        button(row,'WOL','external-link',()=>external(hit.url));
      }
      this.scroller.createEl('p',{cls:'biblelab-mini',
        text:'Aperçu de la première page seulement. Les autres résultats restent accessibles sur WOL.'});
    }

    // Progressive disclosure: occasional advanced tools should never obscure
    // the result list or the reading workflow.
    const advanced=this.scroller.createEl('details',{cls:'biblelab-search-advanced'});
    advanced.open=this.searchAdvancedOpen;
    advanced.addEventListener('toggle',()=>{if(advanced.isConnected)this.searchAdvancedOpen=advanced.open;});
    advanced.createEl('summary',{text:'Filtres et actions supplémentaires'});
    const advancedBody=advanced.createDiv({cls:'biblelab-search-advanced-body'});
    const controls=advancedBody.createDiv({cls:'biblelab-search-controls'});
    const matchLabel=controls.createEl('label',{text:'Correspondance'});
    const match=matchLabel.createEl('select',{attr:{'aria-label':'Type de correspondance WOL'}});
    for(const [value,label] of [['par','Même paragraphe'],['sen','Même phrase']] as const){
      const option=match.createEl('option',{text:label,attr:{value}});
      option.selected=this.searchMatch===value;
    }
    match.addEventListener('change',()=>{
      this.searchMatch=match.value==='sen'?'sen':'par';
      this.wolResults=[];this.wolResultsQuery='';this.wolResultsError='';
      this.wolResultsSequence++;this.wolResultsLoading=false;
    });
    const scopeLabel=controls.createEl('label',{text:'Sources'});
    const scope=scopeLabel.createEl('select',{attr:{'aria-label':'Sources WOL'}});
    for(const [value,label] of [['all','Toutes les publications'],['index','Index des publications']] as const){
      const option=scope.createEl('option',{text:label,attr:{value}});
      option.selected=this.searchScope===value;
    }
    scope.addEventListener('change',()=>{
      this.searchScope=scope.value==='index'?'index':'all';
      this.wolResults=[];this.wolResultsQuery='';this.wolResultsError='';
      this.wolResultsSequence++;this.wolResultsLoading=false;
    });
    const actions=advancedBody.createDiv({cls:'biblelab-buttons'});
    button(actions,'Rechercher WOL','external-link',()=>this.openSearch());
    button(actions,'Recherche JW.org','globe',()=>{
      try{external(jwOrgResearchUrl(this.query));}
      catch{new Notice('Saisis un sujet à rechercher.');}
    });
    button(actions,'Tester les sources','activity',()=>void this.testOfficialAccess());
    const other=advancedBody.createDiv({cls:'biblelab-buttons'});
    button(other,'JW Library','book-marked',()=>{
      const link=jwLibraryLink(this.query);
      if(link)external(link);
      else new Notice('La passerelle JW Library ne prend en charge que les versets reconnus.');
    });
    button(other,'Copier le lien','copy',()=>void this.copyLink(this.query));
    button(other,'Insérer le lien','file-plus-2',()=>this.insertLink(this.query));
    if(this.sourceCheckMessage){
      const check=advancedBody.createDiv({cls:'biblelab-reader-hint'});
      check.createSpan({text:this.sourceCheckMessage});
      check.createEl('p',{text:'Les sites officiels peuvent limiter la consultation automatisée. Ouvre WOL si nécessaire.'});
    }

    const personal=this.scroller.createEl('details',{cls:'biblelab-search-advanced biblelab-personal-search'});
    personal.open=!!this.localHitsQuery||!!this.localSearchError;
    personal.createEl('summary',{text:'Rechercher dans mes notes JW Library'});
    const local=personal.createDiv({cls:'biblelab-search-advanced-body'});
    local.createEl('p',{cls:'biblelab-mini',text:'Uniquement les notes importées dans Obsidian. Aucune donnée privée n’est transmise en ligne.'});
    const localBtn=button(local,this.localSearchLoading?'Recherche locale…':'Chercher mes notes','file-search',()=>void this.searchImportedNotes());
    localBtn.disabled=this.localSearchLoading;
    if(this.localSearchError)local.createEl('p',{cls:'biblelab-reader-hint',text:this.localSearchError});
    if(this.localHitsQuery&&!this.localSearchLoading){
      local.createEl('p',{cls:'biblelab-mini',text:this.localHits.length+' résultat(s) sur les 30 premiers trouvés'});
      for(const hit of this.localHits){
        const item=card(local,hit.title,hit.excerpt);
        item.addClass('biblelab-local-jw-result');
        button(item,'Ouvrir la note','file-text',()=>{
          const file=this.app.vault.getAbstractFileByPath(hit.path);
          if(!(file instanceof TFile)){new Notice('Cette note a été déplacée ou supprimée.');return;}
          void this.app.workspace.getLeaf('tab').openFile(file);
        });
      }
    }
    const links=this.scroller.createDiv({cls:'biblelab-search-shortcuts'});
    button(links,'Bibliothèque d’étude','library-big',()=>external('https://www.jw.org/fr/la-bible-et-vous/outils-etude-bible/'));
    button(links,'Index WOL','book-open-check',()=>external('https://wol.jw.org/fr/wol/d/r30/lp-f/1200270070'));
  }
  private async loadWolResults():Promise<void>{
    const term=this.query.trim();
    if(!term){new Notice('Saisis un sujet ou une expression.');return;}
    const direct=cleanWolUrl(term);
    if(direct && /\/fr\/wol\/(?:d|b)\//.test(new URL(direct).pathname)){
      this.focusReference(direct,'Document WOL');
      return;
    }
    const scripture=parseScripture(term);
    if(scripture){this.focusReference(scripture.label);return;}
    if(this.wolResultsLoading)return;
    const seq=++this.wolResultsSequence;
    const url=wolResearchUrl(term,{match:this.searchMatch,scope:this.searchScope});
    this.wolResultsLoading=true;this.wolResultsError='';this.wolResults=[];this.wolResultsQuery='';
    if(this.tab==='wol')this.render();
    try{
      const response=await requestUrl({url,throw:false});
      if(response.status!==200)throw Error('WOL a répondu avec le code '+response.status+
         (response.status===403||response.status===429?' (accès automatisé limité).':'.'));
      const items=parseWolSearchResults(response.text,url);
      if(!items.length)throw Error('Réponse WOL reçue, mais aucun lien de document exploitable. La recherche peut dépendre de scripts ou d’une structure différente.');
      if(seq!==this.wolResultsSequence)return;
      this.wolResults=items;this.wolResultsQuery=term;
    }catch(error){
      if(seq!==this.wolResultsSequence)return;
      this.wolResultsError=(error instanceof Error?error.message:'Recherche indisponible.')+
        ' Tu peux toujours consulter les résultats sur le site officiel.';
    }finally{
      if(seq===this.wolResultsSequence){
        this.wolResultsLoading=false;if(this.tab==='wol')this.render();
      }
    }
  }
  private async testOfficialAccess():Promise<void>{
    if(this.sourceCheckLoading)return;
    this.sourceCheckLoading=true;
    this.sourceCheckMessage='Diagnostic des sources officielles…';
    if(this.tab==='wol')this.render();
    const examples=[
      {name:'Texte du jour WOL',url:dayLink(new Date())},
      {name:'Article WOL',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024642'},
      {name:'Cahier JW.org',url:meetingIssueLink(new Date())}
    ];
    const results:string[]=[];
    for(const item of examples){
      try{
        const response=await requestUrl({url:item.url,throw:false});
        const ok=response.status===200 && /<(?:html|main|article|body)\b/i.test(response.text||'');
        results.push(item.name+' : '+(ok?'page HTML accessible':'HTTP '+response.status+' / page illisible'));
      }catch(error){
        results.push(item.name+' : erreur de connexion ('+
          (error instanceof Error?error.message:'inconnue')+').');
      }
    }
    this.sourceCheckMessage=results.join(' · ');
    this.sourceCheckLoading=false;
    if(this.tab==='wol')this.render();
  }
  private async searchImportedNotes():Promise<void>{
    const term=this.query.trim();
    if(!term){new Notice('Saisis un terme pour retrouver tes notes importées.');return;}
    if(this.localSearchLoading)return;
    const seq=++this.localSearchSequence;
    this.localSearchLoading=true;this.localSearchError='';this.localHits=[];this.localHitsQuery='';
    if(this.tab==='wol')this.render();
    try{
      const files=this.app.vault.getMarkdownFiles().filter(f=>f.path.toLowerCase().includes('/imports/'));
      let scanned=0;
      const matches:LocalJwHit[]=[];
      // Indexed on demand only. Keep a small bounded read queue to avoid
      // exhausting mobile memory when the backup contains thousands of notes.
      for(let i=0;i<Math.min(files.length,3000) && matches.length<30;i+=12){
        const batch=files.slice(i,Math.min(i+12,3000));
        const notes=await Promise.all(batch.map(async f=>{
          try{return {path:f.path,markdown:await this.app.vault.cachedRead(f)};}
          catch{return null;}
        }));
        if(seq!==this.localSearchSequence)return;
        for(const note of notes){
          if(!note)continue;
          scanned++;
          const hit=parseImportedJwNote(note.path,note.markdown,term);
          if(hit){matches.push(hit);if(matches.length>=30)break;}
        }
      }
      if(seq!==this.localSearchSequence)return;
      this.localHits=matches;this.localHitsQuery=term;
      if(!matches.length)this.localSearchError=files.length
       ?'Aucune note JW Library importée ne correspond à ce terme.'
       :'Aucune note JW Library importée : utilise Studio → Bibliothèque personnelle pour importer une sauvegarde.';
      if(files.length>3000)this.localSearchError+=' Recherche limitée aux 3 000 premiers fichiers importés.';
    }catch(error){
      if(seq!==this.localSearchSequence)return;
      this.localSearchError=error instanceof Error?error.message:'Lecture des notes impossible.';
    }finally{
      if(seq===this.localSearchSequence){
        this.localSearchLoading=false;if(this.tab==='wol')this.render();
      }
    }
  }
  private openSearch():void{
    const term=this.query.trim();if(!term){new Notice('Saisis une référence ou un sujet.');return;}
    const isCitation=/^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2})\b/i.test(term);
    external(isCitation?this.referenceUrl(term):this.searchMatch==='par'&&this.searchScope==='all'?wolSearch(term):wolResearchUrl(term,{match:this.searchMatch,scope:this.searchScope}));
  }
  private renderRefs():void{
    heading(this.scroller,'Lecture','Les sources, leurs notes et leurs renvois, sans perdre le fil.');
    if(this.referenceHistory.length>1){
      const trail=this.scroller.createDiv({cls:'biblelab-reader-history'});
      const previous=button(trail,'Précédent','arrow-left',()=>this.moveReference(-1));
      previous.disabled=this.referenceCursor<=0;
      trail.createSpan({cls:'biblelab-reader-history-count',
        text:(this.referenceCursor+1)+' / '+this.referenceHistory.length});
      const next=button(trail,'Suivant','arrow-right',()=>this.moveReference(1));
      next.disabled=this.referenceCursor>=this.referenceHistory.length-1;
    }
    if(this.pinnedRef){
      const focus=this.scroller.createDiv({cls:'biblelab-focused-reading'});
      const header=focus.createDiv({cls:'biblelab-focused-reading-header'});
      const lead=header.createDiv({cls:'biblelab-focused-reading-caption'});
      lead.createSpan({text:'EN COURS DE LECTURE'});
      lead.createEl('strong',{text:this.pinnedRef.label});
      button(header,'Autre source','search',()=>this.setTab('wol'));
      renderReferenceAccordion(focus,this.pinnedRef,this.reader);
    }else{
      const intro=this.scroller.createDiv({cls:'biblelab-reader-intro'});
      const symbol=intro.createSpan();setIcon(symbol,'book-open');
      intro.createEl('p',{text:'Choisis une référence dans ta note ou recherche un passage pour commencer.'});
      button(intro,'Rechercher une source','search',()=>this.setTab('wol'),true);
    }
    if(this.noteTitle){
      const context=this.scroller.createDiv({cls:'biblelab-ref-context'});
      context.createSpan({text:'NOTE ACTIVE'});
      context.createEl('strong',{text:this.noteTitle});
      context.createSpan({text:this.noteRefs.length+' références'});
    }
    const entries=this.pinnedRef
      ?this.noteRefs.filter(x=>!(x.label===this.pinnedRef?.label&&x.url===this.pinnedRef?.url))
      :this.noteRefs;
    if(entries.length){
      const group=this.scroller.createEl('details',{cls:'biblelab-note-references'});
      group.open=!this.pinnedRef;
      group.createEl('summary',{text:'Références de ma note · '+entries.length});
      const list=group.createDiv({cls:'biblelab-note-reference-list'});
      const actions=list.createDiv({cls:'biblelab-reader-count'});
      button(actions,'Tout replier','chevrons-up',()=>{this.reader.expanded.clear();this.render();});
      for(const item of entries)renderReferenceAccordion(list,item,this.reader);
    }else if(!this.pinnedRef){
      this.scroller.createDiv({cls:'biblelab-empty',
        text:this.noteTitle?'Aucune référence biblique détectée dans cette note pour l’instant.':
          'Ouvre une note avec des versets, ou lance une recherche pour consulter WOL.'});
    }
    const help=this.scroller.createEl('details',{cls:'biblelab-disclosure'});
    help.createEl('summary',{text:'Reconnaissance des références'});
    help.createEl('p',{text:'Sont reconnus les versets en clair, !!référence!!, [référence de publication] et [titre](lien WOL).'});
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
    const safeTitle=cleanReadingText(title).replace(/[\[\]]/g,'');
    const currentFile=this.app.workspace.getActiveFile();
    // Sidebar focus can hide the active editor. Only use a previously
    // validated Markdown path, never the first unrelated open editor.
    const targetPath=currentFile?.extension==='md'?currentFile.path:this.lastMarkdownPath;
    const view=this.app.workspace.getLeavesOfType('markdown').map(leaf=>leaf.view)
      .find(v=>v instanceof MarkdownView && v.file?.path===targetPath);
    if(!(view instanceof MarkdownView)){
      new Notice('Ouvre une note Markdown dans un éditeur avant d’insérer un lien.');
      return;
    }
    view.editor.replaceSelection('['+safeTitle+']('+url+')');
    new Notice('Lien inséré dans '+view.file?.basename+'.');
  }
}
