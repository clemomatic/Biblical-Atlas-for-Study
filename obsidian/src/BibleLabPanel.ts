import { ItemView, MarkdownView, Notice, requestUrl, setIcon, TFile, type WorkspaceLeaf } from 'obsidian';
import styles from './bibleLab.css?inline';
import {
  jwLibraryLink, mapChapterForPage, MAP_CHAPTERS,
  normalizeSearch, OFFICIAL_ATLAS, OFFICIAL_MAP_INDEX, parseMapIndex, parseScripture,
  RESOURCES, wolSearch, type MapLocation, type Resource
} from './bibleLabData';
import { OFFLINE_MAP_INDEX } from './bibleLabMapCorpus';
import { dayLink, meetingIssueLink, findMeetingProgramme, wolMeetingLink, parseDailyHtml, parseMeetingHtml, weekTitle, type StudyLive } from './studyLive';
import { extractReferenceEntries, cleanWolUrl, passageUrl, parseWolDocument, type ReferenceEntry } from './referenceReader';
import { findPublicationMentions } from './publicationReferences';
import { renderReferenceAccordion, type ReaderState } from './referencePanel';
import { jwOrgResearchUrl, wolResearchUrl, type WolMatchMode, type WolSearchScope } from './wolResearch';
import { parseImportedJwNote, type LocalJwHit } from './localJwSearch';
import { cleanReadingText } from './readerText';
import {
  emptyResearchDesk, normalizeResearchDesk, activeResearchPlan,
  addResearchPlan, activateResearchPlan, deleteResearchPlan, renameResearchPlan,
  addResearchBranch, renameResearchBranch, moveResearchBranch, removeResearchBranch,
  type ResearchDesk
 } from './researchDesk';
import {
  emptyResearchCollection, normalizeResearchCollection, addResearchCapture,
  addResearchIdea, renameResearchIdea, assignCaptureToIdea,
  unassignCaptureFromIdea, moveIdeaCapture, removeResearchCapture,
  deleteResearchIdea, updateResearchCapture, unassignedResearchCaptures,
  citationMarkdown, ideaMarkdown, type ResearchCollection,
  type ResearchCapture
} from './researchCollection';
import {
  emptyBibleLabArchive, normalizeBibleLabArchive, libraryEntry,
  updateLibraryEntry,recordWolSearch,clearResearchHistory,removeHistoryEntry,
  libraryResults, type BibleLabArchive,type ArchiveFilter,type ArchiveSort,
  type SearchHistoryEntry
} from './researchArchive';

export const BIBLE_LAB_VIEW = 'bible-lab-sidebar';
type Tab = 'home' | 'wol' | 'collect' | 'archive' | 'refs' | 'maps' | 'library' | 'studio';
export interface BibleLabHost {
  openAtlas: () => Promise<void>;
  getResearchDesk: () => ResearchDesk;
  saveResearchDesk: (desk:ResearchDesk) => Promise<void>;
  getResearchCollection: () => ResearchCollection;
  saveResearchCollection: (collection:ResearchCollection) => Promise<void>;
  getResearchArchive: () => BibleLabArchive;
  saveResearchArchive: (archive:BibleLabArchive) => Promise<void>;
  getOpenWolUrls: () => string[];
  openWolArticleTab: (ref: ReferenceEntry) => Promise<void>;
  openWolSearchTab: (url: string) => Promise<void>;
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
  const el = parent.createEl('button', { cls: 'biblelab-btn' + (primary ? ' is-primary' : ''), attr: { 'aria-label': label } });
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
  private researchDesk:ResearchDesk=emptyResearchDesk();
  private collection:ResearchCollection=emptyResearchCollection();
  private archive:BibleLabArchive=emptyBibleLabArchive();
  private archiveTerm='';
  private archiveFilter:ArchiveFilter='all';
  private archiveSort:ArchiveSort='recent';
  private archivePlanFilter:string|null=null;
  private archiveVisible=35;
  private showSearchHistory=true;
  private captureDraft={label:'',url:'',excerpt:'',comment:''};
  private captureFilter='';
  private showAllCaptures=false;
  private tabScroll=new Map<Tab,number>();
  private scroller!: HTMLElement;
  private tabs!: HTMLElement;
  private query='';
  private searchMatch:WolMatchMode='par';
  private searchScope:WolSearchScope='all';
  private researchContext='';
  private sourceCheckLoading=false;
  private searchAdvancedOpen=false;
  private sourceCheckMessage='';
  private localHits:LocalJwHit[]=[];
  private localHitsQuery='';
  private localSearchLoading=false;
  private localSearchError='';
  private localSearchSequence=0;
  private mapTerm='';
  private libraryTerm='';
  private noteRefs: ReferenceEntry[] = [];
  private noteRefsOpen:boolean|null=null;
  private pinnedRef: ReferenceEntry|null=null;
  private referenceHistory:ReferenceEntry[]=[];
  private referencePosition:number[]=[];
  private referenceCursor=-1;
  private readonly reader:ReaderState={expanded:new Set(),cache:new Map(),pending:new Map(),copy:url=>{void this.copy(url);},open:external,navigate:ref=>this.focusReference(ref.url,ref.label),openInTab:ref=>{void this.host.openWolArticleTab(ref);},remember:ref=>this.rememberReference(ref),insert:ref=>this.insertMarkdownLink(ref.label,ref.url)};
  private noteTitle='';
  private lastMarkdownPath:string|null=null;
  private mapIndex:MapLocation[]=OFFLINE_MAP_INDEX;
  private indexLoaded=false;
  private indexLoading=false;
  private sequence=0;
  private live: StudyLive = { day:null, meeting:null };
  private liveLoading=false;
  private liveLastUpdated=0;
  private liveLastAttempt=0;
  private liveAttemptDate='';
  private liveViewOpen=false;
  private liveError='';

  constructor(leaf:WorkspaceLeaf,host:BibleLabHost) {
    super(leaf); this.host=host;
    this.researchDesk=normalizeResearchDesk(host.getResearchDesk());
    this.collection=normalizeResearchCollection(host.getResearchCollection());
    this.archive=normalizeBibleLabArchive(host.getResearchArchive());
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
    this.liveViewOpen=true;
    // First launch should be useful without requiring the Refresh button.
    void this.loadLive();
  }
  async onClose():Promise<void>{this.liveViewOpen=false;this.sequence++;this.contentEl.empty();}
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
    this.noteRefsOpen=null;
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
    this.noteRefsOpen=null;
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
      if(this.lastMarkdownPath!==file.path)this.noteRefsOpen=null;
      this.noteTitle=file.basename;this.lastMarkdownPath=file.path;this.noteRefs=extractReferenceEntries(text);
    }catch{
      if(generation!==this.sequence)return;
      this.noteTitle=file.basename;this.lastMarkdownPath=file.path;this.noteRefs=[];
    }
    if((this.tab==='refs'||this.tab==='home')&&this.scroller)this.render();
  }
  openCollection():void{
    this.collection=normalizeResearchCollection(this.host.getResearchCollection());
    if(this.tab==='collect')this.render();
    else this.setTab('collect');
  }
  private setTab(tab:Tab):void{
    if(this.tab===tab)return;
    if(this.scroller)this.tabScroll.set(this.tab,this.scroller.scrollTop);
    this.tab=tab;this.render();
    if(tab==='home')void this.loadLive();
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
      {key:'collect',label:'Trouvailles',icon:'inbox'},
      {key:'refs',label:'Lire',icon:'book-open-text'},
      {key:'archive',label:'Mon index',icon:'book-marked'},
      {key:'maps',label:'Atlas',icon:'map-pinned'},
      {key:'library',label:'Sources',icon:'library-big'},
      {key:'studio',label:'Studio',icon:'notebook-pen'}
    ];
    for(const entry of entries){
      const parent=['home','wol','collect','refs'].includes(entry.key)?primary:secondary;
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
      case 'collect':this.renderCollection();break;
      case 'archive':this.renderArchive();break;
      case 'refs':this.renderRefs();break;
      case 'maps':this.renderMaps();break;
      case 'library':this.renderLibrary();break;
      case 'studio':this.renderStudio();break;
    }
  }
  /** Research outlines remain independent from the existing reference reader. */
  private updateResearchDesk(desk:ResearchDesk,rerender=true):void{
    if(desk===this.researchDesk)return;
    this.researchDesk=desk;
    void this.host.saveResearchDesk(desk).catch(()=>new Notice('Le plan de recherche n’a pas pu être enregistré.'));
    if(rerender&&this.scroller){
      const scroll=this.scroller.scrollTop;
      this.render();
      this.scroller.scrollTop=scroll;
    }
  }
  private searchResearchBranch(term:string):void{
    this.query=term;
    if(this.tab!=='wol')this.setTab('wol');
    this.openSearch();
  }
  /** Flexible outline: optional for free exploration and non-destructive to notes. */
  private renderResearchPlan(parent:HTMLElement,compact=false):void{
    const plan=activeResearchPlan(this.researchDesk);
    const box=parent.createDiv({cls:'biblelab-plan-board'+(compact?' is-compact':'')});
    const header=box.createDiv({cls:'biblelab-plan-header'});
    const intro=header.createDiv({cls:'biblelab-plan-heading'});
    const glyph=intro.createSpan();setIcon(glyph,'list-tree');
    intro.createEl('strong',{text:'Mon plan de recherche'});
    if(!compact)intro.createEl('p',{text:'Pars d’un plan clair ou explore librement. Les pistes restent modifiables.'});
    const actions=header.createDiv({cls:'biblelab-plan-header-actions'});
    button(actions,'Nouvelle recherche','plus',()=>{
      const next=addResearchPlan(this.researchDesk);
      this.updateResearchDesk(next);
      if(compact)this.setTab('home');
    });
    if(compact){
      const summary=box.createDiv({cls:'biblelab-plan-compact-summary'});
      summary.createEl('strong',{text:plan?.title||'Recherche libre'});
      summary.createSpan({text:plan
        ?plan.branches.length+' piste(s) · enregistrées localement'
        :'Aucun plan obligatoire pour chercher dans WOL.'});
      if(plan&&plan.branches.length){
        const branches=box.createDiv({cls:'biblelab-plan-quick-branches'});
        for(const branch of plan.branches){
          button(branches,branch.title,'search',()=>this.searchResearchBranch(branch.title));
        }
      }
      const tools=box.createDiv({cls:'biblelab-plan-toolbar'});
      button(tools,'Gérer mon plan','pencil',()=>this.setTab('home'));
      return;
    }
    const choose=box.createEl('select',{cls:'biblelab-plan-selector',attr:{'aria-label':'Choisir une recherche'}});
    choose.createEl('option',{text:'Recherche libre (sans plan)',attr:{value:''}});
    for(const item of this.researchDesk.plans){
      choose.createEl('option',{text:item.title,attr:{value:item.id}});
    }
    choose.value=plan?.id||'';
    choose.addEventListener('change',()=>{
      this.updateResearchDesk(activateResearchPlan(this.researchDesk,choose.value||null));
    });
    if(!plan){
      box.createEl('p',{cls:'biblelab-plan-empty',text:'Tu peux lancer une recherche WOL sans préparer de plan, ou créer une recherche pour organiser tes pistes au fur et à mesure.'});
      const controls=box.createDiv({cls:'biblelab-plan-toolbar'});
      button(controls,'Créer un plan','plus',()=>this.updateResearchDesk(addResearchPlan(this.researchDesk)),true);
      button(controls,'Chercher librement','search',()=>this.setTab('wol'));
      return;
    }
    const planEditor=box.createDiv({cls:'biblelab-plan-editor'});
    const name=planEditor.createEl('input',{cls:'biblelab-plan-title-input',attr:{
      type:'text','aria-label':'Titre de la recherche',placeholder:'Question ou sujet de recherche…',maxlength:'180'}});
    name.value=plan.title;
    name.addEventListener('change',()=>{
      this.updateResearchDesk(renameResearchPlan(this.researchDesk,plan.id,name.value),false);
    });
    const planActions=box.createDiv({cls:'biblelab-plan-toolbar'});
    button(planActions,'Ajouter une piste','plus',()=>{
      const next=addResearchBranch(this.researchDesk,plan.id);
      const previous=new Set(plan.branches.map(branch=>branch.id));
      const added=activeResearchPlan(next)?.branches.find(branch=>!previous.has(branch.id));
      this.updateResearchDesk(next);
      if(added){
        const input=[...this.scroller.querySelectorAll<HTMLInputElement>('input[data-research-branch]')]
          .find(element=>element.dataset.researchBranch===added.id);
        input?.focus();input?.select();
      }
    },true);
    button(planActions,'Supprimer le plan','trash-2',()=>{
      if(!window.confirm('Supprimer ce plan de recherche et ses pistes ? Cette action ne modifie aucune note Obsidian.'))return;
      this.updateResearchDesk(deleteResearchPlan(this.researchDesk,plan.id));
    });
    if(!plan.branches.length){
      box.createEl('p',{cls:'biblelab-plan-empty',text:'Ajoute une piste, un titre de partie ou un simple mot-clé. Tu pourras les réordonner plus tard.'});
    }
    const list=box.createDiv({cls:'biblelab-plan-list',attr:{'aria-label':'Pistes du plan'}});
    for(const [index,branch] of plan.branches.entries()){
      const row=list.createDiv({cls:'biblelab-plan-branch'});
      row.createSpan({cls:'biblelab-plan-counter',text:String(index+1).padStart(2,'0')});
      const label=row.createEl('input',{attr:{
        type:'text','aria-label':'Titre de la piste '+(index+1),
        'data-research-branch':branch.id,maxlength:'180'}});
      label.value=branch.title;
      label.addEventListener('change',()=>{
        this.updateResearchDesk(renameResearchBranch(this.researchDesk,plan.id,branch.id,label.value),false);
      });
      const commands=row.createDiv({cls:'biblelab-plan-branch-actions'});
      button(commands,'Rechercher cette piste dans WOL','search',()=>this.searchResearchBranch(label.value));
      const up=button(commands,'Monter la piste','arrow-up',()=>
        this.updateResearchDesk(moveResearchBranch(this.researchDesk,plan.id,branch.id,-1)));
      up.disabled=index===0;
      const down=button(commands,'Descendre la piste','arrow-down',()=>
        this.updateResearchDesk(moveResearchBranch(this.researchDesk,plan.id,branch.id,1)));
      down.disabled=index===plan.branches.length-1;
      button(commands,'Supprimer la piste','x',()=>
        this.updateResearchDesk(removeResearchBranch(this.researchDesk,plan.id,branch.id)));
    }
    box.createEl('p',{cls:'biblelab-plan-footnote',text:'Plan enregistré dans les données locales du plugin. Les références et citations pourront s’y rattacher dans la prochaine phase.'});
  }
  private launchStudy(value:string):void{
    const term=cleanReadingText(value);
    if(!term){this.setTab('wol');return;}
    this.query=term;
    if(parseScripture(term) || cleanWolUrl(term) || findPublicationMentions(term).some(x=>x.from===0&&x.to===term.length) || /^(?:w\d{2}|g\d{2}|mwb\d{2}|it-\d)/i.test(term)){
      this.focusReference(term);
      return;
    }
    this.setTab('wol');
    this.openSearch();
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
    this.renderResearchPlan(this.scroller);
    this.renderCollectionShortcut(this.scroller);
    const quick=this.scroller.createDiv({cls:'biblelab-home-wol-quick'});
    quick.createEl('strong',{text:'Recherche rapide WOL'});
    quick.createEl('p',{text:'Cherche un mot-clé, une publication ou un verset dans la vraie bibliothèque en ligne.'});
    this.searchField(quick,this.query,'Mot-clé, verset ou publication WOL…',
      value=>{this.query=value;},()=>this.openSearch());
    const sources=quick.createDiv({cls:'biblelab-plan-toolbar'});
    button(sources,'Publications','library-big',()=>{
      this.searchScope='all';
      if(this.query.trim())this.openSearch();else this.setTab('wol');
    });
    button(sources,'Index','list-tree',()=>{
      this.searchScope='index';
      if(this.query.trim())this.openSearch();else this.setTab('wol');
    });
    button(sources,'Guide','compass',()=>{
      this.searchScope='guide';
      if(this.query.trim())this.openSearch();else this.setTab('wol');
    });
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
    const reload=button(headingRow,this.liveLoading?'Chargement…':'Actualiser','refresh-cw',()=>void this.loadLive(true));
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
  private async loadLive(force=false):Promise<void>{
    if(this.liveLoading)return;
    const today=new Date();
    const stamp=dayLink(today);
    // Don't repeat network requests during same-day navigation or repeated
    // component renders. The explicit Refresh button always bypasses this.
    const since=Date.now()-this.liveLastAttempt;
    const ttl=this.live.day||this.live.meeting?20*60*1000:60*1000;
    if(!force&&this.liveAttemptDate===stamp&&since>=0&&since<ttl)return;
    this.liveAttemptDate=stamp;this.liveLastAttempt=Date.now();
    this.liveLoading=true;this.liveError='';
    if(this.tab==='home'&&this.liveViewOpen)this.render();
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
      }else if(this.liveAttemptDate===stamp){
        this.live={day:null,meeting:null};
      }
      this.liveError=warnings.join(' ');
    }finally{
      this.liveLoading=false;
      if(this.tab==='home'&&this.liveViewOpen)this.render();
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
  /**
   * WOL remains responsible for its search results, filters, page navigation
   * and article links. Bible Lab simply opens the official search URL in
   * Obsidian's native Chromium Web viewer. No requestUrl, scraper, retries or
   * reconstructed result list is needed for the main research workflow.
   */
  private renderWol():void{
    this.renderResearchPlan(this.scroller,true);
    this.renderCollectionShortcut(this.scroller,true);
    heading(this.scroller,'Recherche WOL','La vraie Bibliothèque en ligne, dans un onglet Obsidian.');
    this.searchField(this.scroller,this.query,'Sujet, publication ou verset…',text=>{
      this.query=text;
    },()=>this.openSearch());

    const modes=this.scroller.createDiv({cls:'biblelab-research-modes',attr:{
      role:'group','aria-label':'Outil de recherche'}});
    const researchModes:{value:WolSearchScope;title:string;icon:string}[]=[
      {value:'all',title:'Publications',icon:'library-big'},
      {value:'index',title:'Index',icon:'list-tree'},
      {value:'guide',title:'Guide de recherche',icon:'compass'},
      {value:'perspicace',title:'Perspicace',icon:'book-open-check'}
    ];
    for(const mode of researchModes){
      const selected=this.searchScope===mode.value;
      const toggle=modes.createEl('button',{cls:'biblelab-research-mode',attr:{
        type:'button','aria-pressed':String(selected),'aria-label':mode.title}});
      const glyph=toggle.createSpan();setIcon(glyph,mode.icon);
      toggle.createSpan({text:mode.title});
      toggle.addEventListener('click',()=>{
        if(this.searchScope===mode.value)return;
        this.searchScope=mode.value;
        this.render();
        // Replace only the plugin's own research tab when selecting a new
        // collection. Independent WOL articles and notes remain untouched.
        if(this.query.trim())this.openSearch();
      });
    }

    const primary=this.scroller.createDiv({cls:'biblelab-search-primary'});
    button(primary,'Rechercher dans WOL','search',()=>this.openSearch(),true);
    button(primary,'Conserver cette recherche','bookmark-plus',()=>{
      const query=this.query.trim();
      if(!query){new Notice('Saisis une recherche à conserver.');return;}
      this.captureDraft={label:query,url:this.officialSearchUrl(),excerpt:'',comment:''};
      this.setTab('collect');
    });
    // Keep the action available as the user types; empty input gets a Notice.
    button(primary,'Ouvrir WOL','panels-top-left',()=>
      void this.host.openWolSearchTab('https://wol.jw.org/fr/wol/h/r30/lp-f'));

    const hint=this.scroller.createDiv({cls:'biblelab-research-context'});
    const glyph=hint.createSpan();setIcon(glyph,'panels-top-left');
    hint.createEl('p',{text:'Les résultats et les articles s’ouvrent directement dans la visionneuse web d’Obsidian. Utilise les liens, le retour arrière et le mode lecture de WOL, tout en gardant tes notes à côté.'});
    if(this.searchScope==='guide'||this.searchScope==='index')
      hint.createEl('p',{text:'Sur WOL, Index et Guide de recherche utilisent le filtre officiel Index. Tu peux affiner la sélection dans la page WOL.'});

    const quick=this.scroller.createDiv({cls:'biblelab-buttons'});
    button(quick,'Lire dans le panneau','book-open-text',()=>{
      const term=this.query.trim();
      if(!term){new Notice('Saisis un verset, une référence ou un lien WOL.');return;}
      this.focusReference(cleanWolUrl(term)||this.referenceUrl(term),term);
    });
    if(this.query.trim()){
      button(quick,'Navigateur externe','external-link',()=>external(this.officialSearchUrl()));
    }

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
    match.addEventListener('change',()=>{this.searchMatch=match.value==='sen'?'sen':'par';});
    const scopeLabel=controls.createEl('label',{text:'Sources'});
    const scope=scopeLabel.createEl('select',{attr:{'aria-label':'Sources WOL'}});
    for(const [value,label] of [['all','Toutes les publications'],['index','Index des publications'],['guide','Guide de recherche'],['perspicace','Étude perspicace']] as const){
      const option=scope.createEl('option',{text:label,attr:{value}});
      option.selected=this.searchScope===value;
    }
    scope.addEventListener('change',()=>{
      this.searchScope=scope.value==='index'?'index':scope.value==='guide'?'guide':scope.value==='perspicace'?'perspicace':'all';
      this.render();
    });
    const actions=advancedBody.createDiv({cls:'biblelab-buttons'});
    button(actions,'Rechercher dans WOL','panels-top-left',()=>this.openSearch());
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
      check.createEl('p',{text:'Le diagnostic HTTP est distinct de la visionneuse web : celle-ci peut afficher WOL même lorsque requestUrl ne peut pas récupérer son texte.'});
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
    button(links,'Index WOL','book-open-check',()=>void this.host.openWolArticleTab({
      label:'Index des publications',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/1200270070',
      kind:'document',origin:'pinned'
    }));
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
        if(response.status!==200){
          results.push(item.name+' : HTTP '+response.status+' (accès indisponible)');
          continue;
        }
        const html=response.text||'';
        if(!/<(?:html|main|article|body)\b/i.test(html)){
          results.push(item.name+' : réponse sans page HTML utilisable');
          continue;
        }
        // A 200 response from WOL may only be a navigation shell. Check that
        // its *content* is readable, rather than reporting a false success.
        let label='';
        if(item.name==='Texte du jour WOL'){
          label=parseDailyHtml(html,new Date())
            ?'texte du jour reconnu'
            :'HTML accessible, mais texte du jour non reconnu';
        }else if(item.name==='Article WOL'){
          const reader=parseWolDocument(html,item.url,'Document WOL');
          const count=reader.lines.filter(x=>x.type==='paragraph'||x.type==='verse'||x.type==='question').length;
          label=count>0?'article exploitable ('+count+' blocs)':
            'HTML accessible, mais aucun paragraphe d’article exploitable';
        }else{
          label=findMeetingProgramme(html,new Date(),item.url)
            ?'cahier et semaine actuelle reconnus'
            :'HTML accessible, mais semaine actuelle non trouvée';
        }
        results.push(item.name+' : '+label);
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
  private officialSearchUrl():string{
    const term=this.query.trim();
    if(!term)return 'https://wol.jw.org/fr/wol/h/r30/lp-f';
    const direct=cleanWolUrl(term);
    if(direct && new URL(direct).hostname==='wol.jw.org')return direct;
    const citation=/^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2})\b/i.test(term);
    return citation&&this.searchScope==='all'
      ?this.referenceUrl(term)
      :wolResearchUrl(term,{match:this.searchMatch,scope:this.searchScope});
  }
  private exploreReference(ref:ReferenceEntry,scope:WolSearchScope):void{
    this.query=ref.label;this.searchScope=scope;
    this.setTab('wol');
    this.openSearch();
  }
  private openSearch():void{
    if(!this.query.trim()){new Notice('Saisis un sujet ou une référence à rechercher.');return;}
    const url=this.officialSearchUrl();
    this.updateArchive(recordWolSearch(this.archive,{
      query:this.query,scope:this.searchScope,match:this.searchMatch,
      url,planId:this.researchDesk.activeId
    }),false);
    void this.host.openWolSearchTab(url);
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
      button(header,'Nouvel onglet','panels-top-left',()=>{if(this.pinnedRef)void this.host.openWolArticleTab(this.pinnedRef);});
      button(header,'Garder la référence','bookmark-plus',()=>{
        if(this.pinnedRef)this.keepReference(this.pinnedRef.label,this.pinnedRef.url);
      });
      renderReferenceAccordion(focus,this.pinnedRef,this.reader);
      const research=focus.createDiv({cls:'biblelab-related-research'});
      research.createSpan({text:'PROLONGER L’ÉTUDE'});
      button(research,'Chercher dans l’Index','list-tree',()=>this.exploreReference(this.pinnedRef!,'index'));
      button(research,'Consulter le Guide','compass',()=>this.exploreReference(this.pinnedRef!,'guide'));
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
      group.open=this.noteRefsOpen??!this.pinnedRef;
      const summary=group.createEl('summary',{text:'Références de ma note · '+entries.length});
      // Preserve expansion when a note refresh or async reader update rerenders.
      summary.addEventListener('click',()=>{this.noteRefsOpen=!group.open;});
      group.addEventListener('toggle',()=>{if(group.isConnected)this.noteRefsOpen=group.open;});
      const list=group.createDiv({cls:'biblelab-note-reference-list'});
      const actions=list.createDiv({cls:'biblelab-reader-count'});
      button(actions,'Tout replier','chevrons-up',()=>{this.reader.expanded.clear();this.render();});
      for(const item of entries){
        const sourceRow=list.createDiv({cls:'biblelab-collect-ref-row'});
        button(sourceRow,'Garder '+item.label,'bookmark-plus',()=>this.keepReference(item.label,item.url));
        renderReferenceAccordion(list,item,this.reader);
      }
    }else if(!this.pinnedRef){
      this.scroller.createDiv({cls:'biblelab-empty',
        text:this.noteTitle?'Aucune référence biblique détectée dans cette note pour l’instant.':
          'Ouvre une note avec des versets, ou lance une recherche pour consulter WOL.'});
    }
    const help=this.scroller.createEl('details',{cls:'biblelab-disclosure'});
    help.createEl('summary',{text:'Reconnaissance des références'});
    help.createEl('p',{text:'Sont reconnus les versets en clair, !!référence!!, [référence de publication] et [titre](lien WOL).'});
  }
  /** Captured references never alter the popup reader or rewrite the note. */
  private updateArchive(next:BibleLabArchive,rerender=true):void{
    if(next===this.archive)return;
    this.archive=next;
    void this.host.saveResearchArchive(next).catch(()=>new Notice('Impossible de sauvegarder l’index de recherche.'));
    if(rerender&&this.scroller){
      const scroll=this.scroller.scrollTop;
      this.render();
      this.scroller.scrollTop=scroll;
    }
  }
  private editLibraryEntry(captureId:string,change:Partial<
    Pick<import('./researchArchive').LibraryEntry,'tags'|'starred'|'archived'>
  >):void{
    this.updateArchive(updateLibraryEntry(this.archive,captureId,change));
  }
  private inboxItems():ResearchCapture[]{
    return unassignedResearchCaptures(this.collection).filter(item=>
      !libraryEntry(this.archive,item.id).archived);
  }
  private updateCollection(next:ResearchCollection,rerender=true):void{
    if(next===this.collection)return;
    this.collection=next;
    void this.host.saveResearchCollection(next).catch(()=>new Notice('Impossible d’enregistrer les trouvailles.'));
    if(rerender&&this.scroller){
      const scroll=this.scroller.scrollTop;
      this.render();
      this.scroller.scrollTop=scroll;
    }
  }
  private keepReference(label:string,url:string):void{
    this.updateCollection(addResearchCapture(this.collection,{
      label,url,planId:this.researchDesk.activeId
    }),false);
    this.openCollection();
  }
  private renderCollectionShortcut(parent:HTMLElement,compact=false):void{
    const inbox=this.inboxItems().length;
    const section=parent.createDiv({cls:'biblelab-capture-shortcut'+(compact?' is-compact':'')});
    const title=section.createDiv({cls:'biblelab-capture-shortcut-info'});
    const badge=title.createSpan();setIcon(badge,'inbox');
    const text=title.createDiv();
    text.createEl('strong',{text:'Bac à trouvailles'});
    text.createSpan({text:inbox+' en attente · '+this.collection.ideas.length+' fiche(s) d’idées'});
    button(section,'Ouvrir mon bac','arrow-right',()=>this.setTab('collect'));
    if(!compact)button(section,'Mon index','book-marked',()=>this.setTab('archive'));
  }
  private async pasteCopiedExcerpt():Promise<void>{
    try{
      const clipboard=await navigator.clipboard.readText();
      if(!clipboard.trim()){new Notice('Le presse-papiers ne contient aucun texte.');return;}
      this.captureDraft.excerpt=clipboard.trim().slice(0,8000);
      this.render();
    }catch{new Notice('La lecture du presse-papiers est bloquée. Colle le texte dans le champ Extrait.');}
  }
  private saveCapture():void{
    const {label,url,excerpt,comment}=this.captureDraft;
    if(url.trim()&&!cleanWolUrl(url.trim())){
      new Notice('Saisis une adresse officielle WOL valide (ou laisse le lien vide).');return;
    }
    const next=addResearchCapture(this.collection,{
      label,excerpt,comment,url,planId:this.researchDesk.activeId
    });
    if(next===this.collection){
      new Notice('Ajoute au moins une référence, une intuition ou un extrait.');return;
    }
    this.captureDraft={label:'',url:'',excerpt:'',comment:''};
    this.updateCollection(next);
    new Notice('Trouvaille enregistrée dans le bac Bible Lab.');
  }
  private renderCaptureForm(parent:HTMLElement):void{
    const form=parent.createDiv({cls:'biblelab-collect-form'});
    form.createEl('h3',{text:'Garder une découverte'});
    form.createEl('p',{text:'Une référence, une intuition ou juste un extrait : aucun plan ni phrase complète exigés.'});
    const name=form.createEl('input',{attr:{
      type:'text','aria-label':'Nom de la trouvaille',placeholder:'Quelques mots pour la retrouver…',maxlength:'180'
    }});
    name.value=this.captureDraft.label;
    name.addEventListener('input',()=>{this.captureDraft.label=name.value;});
    const url=form.createEl('input',{attr:{
      type:'url','aria-label':'Lien WOL précis',placeholder:'Lien WOL (idéalement avec #h=…)'
    }});
    url.value=this.captureDraft.url;
    url.addEventListener('input',()=>{this.captureDraft.url=url.value;});
    const urls=this.host.getOpenWolUrls();
    if(urls.length){
      const sourceTools=form.createDiv({cls:'biblelab-collect-url-picker'});
      const chooser=sourceTools.createEl('select',{attr:{'aria-label':'Onglet WOL à conserver'}});
      for(const [index,link] of urls.entries())
        chooser.createEl('option',{text:(index+1)+' · '+link.slice(0,78),attr:{value:link}});
      button(sourceTools,'Utiliser ce lien','link',()=>{
        this.captureDraft.url=chooser.value;
        url.value=chooser.value;
      });
    }
    const excerpt=form.createEl('textarea',{attr:{
      'aria-label':'Extrait collecté',placeholder:'Passage intéressant (facultatif)',rows:'3'
    }});
    excerpt.value=this.captureDraft.excerpt;
    excerpt.addEventListener('input',()=>{this.captureDraft.excerpt=excerpt.value;});
    const memo=form.createEl('textarea',{attr:{
      'aria-label':'Pourquoi garder cette découverte',placeholder:'Pourquoi je garde ça ? (facultatif)',rows:'2'
    }});
    memo.value=this.captureDraft.comment;
    memo.addEventListener('input',()=>{this.captureDraft.comment=memo.value;});
    const actions=form.createDiv({cls:'biblelab-plan-toolbar'});
    button(actions,'Ajouter au bac','bookmark-plus',()=>this.saveCapture(),true);
    button(actions,'Coller le texte copié','clipboard-paste',()=>void this.pasteCopiedExcerpt());
    form.createEl('p',{cls:'biblelab-plan-footnote',text:'Dans la Visionneuse web, sélectionne puis copie le passage. Bible Lab ne peut pas lire automatiquement la sélection d’une page WOL. Le lien de paragraphe (#h=…) est conservé s’il existe ; sinon le lien renvoie à la page.'});
  }
  private openCapturedSource(item:ResearchCapture):void{
    if(!item.url){new Notice('Cette découverte n’a pas encore de lien WOL.');return;}
    void this.host.openWolArticleTab({label:item.label,url:item.url,kind:'document',origin:'pinned'});
  }
  private renderCaptureRow(parent:HTMLElement,item:ResearchCapture):void{
    const card=parent.createDiv({cls:'biblelab-capture-card'});
    card.createEl('strong',{text:item.label});
    if(item.excerpt)card.createEl('p',{cls:'biblelab-capture-excerpt',text:item.excerpt});
    if(item.comment)card.createEl('p',{cls:'biblelab-capture-comment',text:'💡 '+item.comment});
    if(item.url){
      const source=card.createEl('button',{cls:'biblelab-capture-source',text:item.url});
      source.type='button';
      source.addEventListener('click',()=>this.openCapturedSource(item));
    }else card.createSpan({cls:'biblelab-capture-no-source',text:'Sans lien (à compléter)'});
    const controls=card.createDiv({cls:'biblelab-plan-toolbar'});
    if(item.url)button(controls,'Ouvrir dans WOL','external-link',()=>this.openCapturedSource(item));
    button(controls,'Copier référence','copy',()=>void this.copy(citationMarkdown(item)));
    const metadata=libraryEntry(this.archive,item.id);
    button(controls,metadata.starred?'Retirer des favoris':'Ajouter aux favoris',
      metadata.starred?'star-off':'star',()=>
        this.editLibraryEntry(item.id,{starred:!metadata.starred}));
    button(controls,metadata.archived?'Remettre dans le bac':'Ranger dans mon index',
      metadata.archived?'inbox':'archive',()=>
        this.editLibraryEntry(item.id,{archived:!metadata.archived}));
    if(this.collection.ideas.length){
      const chooser=controls.createEl('select',{attr:{'aria-label':'Choisir une fiche pour '+item.label}});
      for(const idea of this.collection.ideas){
        chooser.createEl('option',{text:idea.statement||'Idée à formuler',attr:{value:idea.id}});
      }
      // These values are generated from stable IDs, not a guessed active idea.
      [...chooser.options].forEach((option,index)=>option.value=this.collection.ideas[index].id);
      button(controls,'Associer à la fiche','plus',()=>{
        this.updateCollection(assignCaptureToIdea(this.collection,chooser.value,item.id));
      });
    }
    button(controls,'Supprimer la trouvaille','trash-2',()=>{
      if(!window.confirm('Supprimer définitivement cette trouvaille, y compris de ses fiches d’idées ?'))return;
      this.updateCollection(removeResearchCapture(this.collection,item.id));
    });
  }
  private renderIdeaCard(parent:HTMLElement,ideaId:string):void{
    const idea=this.collection.ideas.find(item=>item.id===ideaId);
    if(!idea)return;
    const box=parent.createDiv({cls:'biblelab-idea-card'});
    const head=box.createDiv({cls:'biblelab-idea-head'});
    head.createSpan({text:'FICHE D’IDÉE'});
    button(head,'Supprimer la fiche','trash-2',()=>{
      if(!window.confirm('Supprimer cette fiche ? Les références restent dans le bac.'))return;
      this.updateCollection(deleteResearchIdea(this.collection,idea.id));
    });
    const statement=box.createEl('textarea',{attr:{
      'aria-label':'Phrase principale de l’idée',placeholder:'Exprime ton idée en une phrase…',rows:'2'
    }});
    statement.value=idea.statement;
    statement.addEventListener('change',()=>{
      this.updateCollection(renameResearchIdea(this.collection,idea.id,statement.value),false);
    });
    const list=box.createDiv({cls:'biblelab-idea-sources'});
    const references=idea.captureIds.map(id=>this.collection.captures.find(item=>item.id===id))
      .filter((item):item is ResearchCapture=>!!item);
    for(const [index,source] of references.entries()){
      const row=list.createDiv({cls:'biblelab-idea-source'});
      row.createEl('span',{cls:'biblelab-plan-counter',text:String(index+1).padStart(2,'0')});
      const sourceText=row.createDiv({cls:'biblelab-idea-source-text'});
      sourceText.createEl('strong',{text:source.label});
      if(source.excerpt)sourceText.createEl('p',{text:source.excerpt.slice(0,220)});
      const actions=row.createDiv({cls:'biblelab-idea-source-actions'});
      if(source.url)button(actions,'Ouvrir la source','external-link',()=>this.openCapturedSource(source));
      const up=button(actions,'Monter la référence','arrow-up',()=>this.updateCollection(
        moveIdeaCapture(this.collection,idea.id,source.id,-1)));
      up.disabled=index===0;
      const down=button(actions,'Descendre la référence','arrow-down',()=>this.updateCollection(
        moveIdeaCapture(this.collection,idea.id,source.id,1)));
      down.disabled=index===references.length-1;
      button(actions,'Retirer de la fiche','x',()=>this.updateCollection(
        unassignCaptureFromIdea(this.collection,idea.id,source.id)));
    }
    const available=this.collection.captures.filter(item=>!idea.captureIds.includes(item.id));
    if(available.length){
      const assign=box.createDiv({cls:'biblelab-idea-add-source'});
      const select=assign.createEl('select',{attr:{'aria-label':'Référence à ajouter à la fiche'}});
      for(const item of available)select.createEl('option',{text:item.label,attr:{value:item.id}});
      button(assign,'Ajouter cette référence','plus',()=>this.updateCollection(
        assignCaptureToIdea(this.collection,idea.id,select.value)));
    }else if(!references.length)box.createEl('p',{cls:'biblelab-plan-empty',
      text:'Collecte une référence dans ton bac, puis ajoute-la ici.'});
    const preview=box.createDiv({cls:'biblelab-idea-preview'});
    preview.createSpan({text:'APERÇU POUR LA NOTE'});
    preview.createEl('p',{text:ideaMarkdown(idea,this.collection)||'Ton idée et ses références apparaîtront ici.'});
    const actions=box.createDiv({cls:'biblelab-plan-toolbar'});
    button(actions,'Copier phrase et références','copy',()=>{
      const current=this.collection.ideas.find(item=>item.id===idea.id);
      const markdown=current&&ideaMarkdown(current,this.collection);
      if(markdown)void this.copy(markdown);else new Notice('Ajoute une phrase ou une référence.');
    },true);
    button(actions,'Insérer dans ma note','file-plus-2',()=>{
      const current=this.collection.ideas.find(item=>item.id===idea.id);
      const markdown=current&&ideaMarkdown(current,this.collection);
      if(markdown)this.insertMarkdownText(markdown);
      else new Notice('Ajoute une phrase ou une référence.');
    });
  }
  private renderCollection():void{
    heading(this.scroller,'Mes trouvailles','Capture libre et fiches d’idées · tu organises quand tu veux.');
    this.renderCaptureForm(this.scroller);
    const groups=this.scroller.createDiv({cls:'biblelab-collect-groups'});
    const inbox=this.inboxItems();
    const inboxHeader=groups.createDiv({cls:'biblelab-section-head'});
    inboxHeader.createEl('h3',{text:'BAC À TROUVAILLES · '+inbox.length});
    if(!inbox.length)groups.createEl('p',{cls:'biblelab-plan-empty',
      text:'Ton bac est vide. Garde simplement une référence, même sans idée précise.'});
    for(const item of inbox)this.renderCaptureRow(groups,item);
    const ideas=groups.createDiv({cls:'biblelab-section-head'});
    ideas.createEl('h3',{text:'MES FICHES D’IDÉES · '+this.collection.ideas.length});
    button(ideas,'Nouvelle fiche d’idée','plus',()=>this.updateCollection(
      addResearchIdea(this.collection,this.researchDesk.activeId)),true);
    for(const idea of this.collection.ideas)this.renderIdeaCard(groups,idea.id);
    const libraryShortcut=groups.createDiv({cls:'biblelab-collect-library-shortcut'});
    button(libraryShortcut,'Rechercher dans mon index','book-marked',()=>this.setTab('archive'));
    const all=groups.createEl('details',{cls:'biblelab-collect-all'});
    all.open=this.showAllCaptures;
    all.addEventListener('toggle',()=>{if(all.isConnected)this.showAllCaptures=all.open;});
    all.createEl('summary',{text:'Toutes mes références · '+this.collection.captures.length});
    const search=all.createEl('input',{attr:{type:'search',
      placeholder:'Retrouver une citation ou une référence…','aria-label':'Filtrer les trouvailles'}});
    search.value=this.captureFilter;
    const results=all.createDiv();
    const draw=():void=>{
      results.empty();
      const term=normalizeSearch(this.captureFilter);
      const filtered=this.collection.captures.filter(item=>normalizeSearch(
        item.label+' '+item.excerpt+' '+item.comment).includes(term));
      for(const item of filtered)this.renderCaptureRow(results,item);
      if(!filtered.length)results.createEl('p',{cls:'biblelab-plan-empty',text:'Aucune trouvaille correspondante.'});
    };
    search.addEventListener('input',()=>{this.captureFilter=search.value;draw();});
    draw();
  }
  private insertMarkdownText(markdown:string):void{
    const active=this.app.workspace.getActiveFile();
    const targetPath=active?.extension==='md'?active.path:this.lastMarkdownPath;
    const view=this.app.workspace.getLeavesOfType('markdown').map(leaf=>leaf.view)
      .find(v=>v instanceof MarkdownView&&v.file?.path===targetPath);
    if(!(view instanceof MarkdownView)){
      new Notice('Ouvre une note Markdown dans un éditeur avant d’insérer une idée.');
      return;
    }
    view.editor.replaceSelection(markdown);
    new Notice('Idée insérée dans '+view.file?.basename+'.');
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
  /** Source index is a view of captured items, not a second copy of WOL. */
  private renderArchive():void{
    heading(this.scroller,'Mon index personnel',
      'Retrouve tes sources, classe-les librement et reprends tes recherches.');
    const summary=this.scroller.createDiv({cls:'biblelab-archive-summary'});
    summary.createSpan({text:this.collection.captures.length+' sources conservées'});
    summary.createSpan({text:this.archive.entries.filter(entry=>entry.starred &&
      this.collection.captures.some(c=>c.id===entry.captureId)).length+' favorites'});
    summary.createSpan({text:this.archive.history.length+' recherches mémorisées'});

    const search=this.scroller.createEl('input',{cls:'biblelab-archive-search',attr:{
      type:'search','aria-label':'Rechercher dans mon index',
      placeholder:'Mots-clés, extrait, commentaire, étiquette…'
    }});
    search.value=this.archiveTerm;
    search.addEventListener('input',()=>{
      this.archiveTerm=search.value;
      this.archiveVisible=35;
      this.renderArchiveResults(resultContainer);
    });
    const filters=this.scroller.createDiv({cls:'biblelab-archive-filters'});
    for(const [filter,label] of [
      ['all','Toutes'],['favorites','Favoris'],['inbox','Non classées'],['archived','Rangées']
    ] as const){
      const toggle=filters.createEl('button',{cls:'biblelab-archive-filter',
        attr:{type:'button','aria-pressed':String(this.archiveFilter===filter)}});
      toggle.setText(label);
      toggle.addEventListener('click',()=>{
        this.archiveFilter=filter;this.archiveVisible=35;
        this.renderArchive();
      });
    }
    const controls=this.scroller.createDiv({cls:'biblelab-archive-controls'});
    const plan=controls.createEl('select',{attr:{'aria-label':'Filtrer par recherche'}});
    plan.createEl('option',{text:'Tous les sujets',attr:{value:''}});
    for(const item of this.researchDesk.plans){
      plan.createEl('option',{text:item.title,attr:{value:item.id}});
    }
    plan.value=this.archivePlanFilter||'';
    plan.addEventListener('change',()=>{
      this.archivePlanFilter=plan.value||null;
      this.archiveVisible=35;
      this.renderArchiveResults(resultContainer);
    });
    const sort=controls.createEl('select',{attr:{'aria-label':'Trier la bibliothèque'}});
    sort.createEl('option',{text:'Plus récentes',attr:{value:'recent'}});
    sort.createEl('option',{text:'Alphabétique',attr:{value:'title'}});
    sort.value=this.archiveSort;
    sort.addEventListener('change',()=>{
      this.archiveSort=sort.value==='title'?'title':'recent';
      this.renderArchiveResults(resultContainer);
    });
    const resultContainer=this.scroller.createDiv({cls:'biblelab-archive-results'});
    this.renderArchiveResults(resultContainer);
    this.renderSearchHistory(this.scroller);
  }
  private renderArchiveResults(parent:HTMLElement):void{
    parent.empty();
    const matches=libraryResults(this.archive,this.collection,{
      term:this.archiveTerm,filter:this.archiveFilter,sort:this.archiveSort,
      planId:this.archivePlanFilter
    });
    parent.createEl('p',{cls:'biblelab-archive-count',
      text:matches.length+' résultat(s) dans les sources enregistrées'});
    if(!matches.length){
      parent.createEl('p',{cls:'biblelab-plan-empty',text:'Aucune source correspondante. Tu peux continuer à explorer WOL et ajouter de nouvelles trouvailles.'});
      return;
    }
    for(const item of matches.slice(0,this.archiveVisible))this.renderArchiveItem(parent,item);
    if(matches.length>this.archiveVisible){
      button(parent,'Afficher davantage','chevrons-down',()=>{
        this.archiveVisible+=35;this.renderArchiveResults(parent);
      });
    }
  }
  private renderArchiveItem(parent:HTMLElement,item:ResearchCapture):void{
    const data=libraryEntry(this.archive,item.id);
    const card=parent.createDiv({cls:'biblelab-archive-card'});
    const lead=card.createDiv({cls:'biblelab-archive-card-head'});
    lead.createEl('strong',{text:item.label});
    if(data.starred){const star=lead.createSpan({cls:'biblelab-archive-star',attr:{
      'aria-label':'Favori'}});setIcon(star,'star');}
    if(item.excerpt)card.createEl('p',{cls:'biblelab-archive-excerpt',text:item.excerpt});
    if(item.comment)card.createEl('p',{cls:'biblelab-archive-comment',text:item.comment});
    if(data.tags.length)card.createEl('p',{cls:'biblelab-archive-tags',text:data.tags.map(x=>'#'+x).join(' · ')});
    const actions=card.createDiv({cls:'biblelab-archive-item-actions'});
    if(item.url)button(actions,'Ouvrir la source WOL','external-link',()=>this.openCapturedSource(item));
    button(actions,'Copier la référence','copy',()=>void this.copy(citationMarkdown(item)));
    button(actions,data.starred?'Retirer des favoris':'Ajouter aux favoris',
      data.starred?'star-off':'star',()=>this.editLibraryEntry(item.id,{starred:!data.starred}));
    const details=card.createEl('details',{cls:'biblelab-archive-edit'});
    details.createEl('summary',{text:'Classer ou modifier'});
    const name=details.createEl('input',{attr:{type:'text','aria-label':'Titre de la source',
      maxlength:'180',placeholder:'Titre court'}});
    name.value=item.label;
    const tags=details.createEl('input',{attr:{type:'text','aria-label':'Étiquettes de la source',
      placeholder:'Étiquettes séparées par des virgules'}});
    tags.value=data.tags.join(', ');
    const comment=details.createEl('textarea',{attr:{'aria-label':'Note personnelle sur la source',
      rows:'2',placeholder:'Pourquoi la garder ?'}});
    comment.value=item.comment;
    const url=details.createEl('input',{attr:{type:'url','aria-label':'URL précise de la source',
      placeholder:'Lien de la page WOL (avec #h=N si besoin)'}});
    url.value=item.url;
    const editActions=details.createDiv({cls:'biblelab-plan-toolbar'});
    button(editActions,'Enregistrer les changements','save',()=>{
      if(url.value.trim()&&!cleanWolUrl(url.value.trim())){
        new Notice('Seuls les liens officiels WOL sont acceptés.');return;
      }
      this.updateCollection(updateResearchCapture(this.collection,item.id,{
        label:name.value,comment:comment.value,url:url.value
      }),false);
      this.updateArchive(updateLibraryEntry(this.archive,item.id,{tags:tags.value.split(/[,;]+/)}));
      new Notice('Source et classement enregistrés.');
    },true);
    button(editActions,data.archived?'Remettre dans le bac':'Ranger hors du bac',
      data.archived?'inbox':'archive',
      ()=>this.editLibraryEntry(item.id,{archived:!data.archived}));
    if(this.collection.ideas.length){
      const picker=details.createEl('select',{attr:{'aria-label':'Fiche à alimenter depuis mon index'}});
      for(const idea of this.collection.ideas){
        picker.createEl('option',{text:idea.statement||'Idée à formuler',
          attr:{value:idea.id}});
      }
      button(editActions,'Ajouter à cette fiche','lightbulb',()=>{
        this.updateCollection(assignCaptureToIdea(this.collection,picker.value,item.id),false);
        new Notice('Référence associée à la fiche, sans supprimer la source.');
        this.setTab('collect');
      });
    }
  }
  private resumeSearch(entry:SearchHistoryEntry):void{
    this.query=entry.query;
    this.searchScope=entry.scope;
    this.searchMatch=entry.match;
    void this.host.openWolSearchTab(entry.url);
    this.setTab('wol');
  }
  private renderSearchHistory(parent:HTMLElement):void{
    const details=parent.createEl('details',{cls:'biblelab-history'});
    details.open=this.showSearchHistory;
    details.addEventListener('toggle',()=>{
      if(details.isConnected)this.showSearchHistory=details.open;
    });
    details.createEl('summary',{text:'Historique des recherches WOL · '+this.archive.history.length});
    details.createEl('p',{cls:'biblelab-plan-footnote',
      text:'Recherches lancées depuis Bible Lab uniquement. La navigation interne des pages WOL n’est pas suivie.'});
    if(this.archive.history.length){
      const actions=details.createDiv({cls:'biblelab-plan-toolbar'});
      button(actions,'Effacer l’historique','trash-2',()=>{
        if(!window.confirm('Effacer uniquement l’historique des recherches ? Les trouvailles restent intactes.'))return;
        this.updateArchive(clearResearchHistory(this.archive));
      });
    }
    const planId=this.archivePlanFilter;
    const trail=this.archive.history.filter(x=>!planId||x.planId===planId).slice(0,35);
    for(const entry of trail){
      const row=details.createDiv({cls:'biblelab-history-row'});
      const copy=row.createDiv({cls:'biblelab-history-row-text'});
      copy.createEl('strong',{text:entry.query});
      const plan=this.researchDesk.plans.find(p=>p.id===entry.planId);
      copy.createSpan({text:(plan?.title||'Recherche libre')+' · '+new Date(entry.at).toLocaleDateString('fr-FR')});
      button(row,'Reprendre la recherche','rotate-ccw',()=>this.resumeSearch(entry));
      button(row,'Effacer cette recherche','x',()=>this.updateArchive(removeHistoryEntry(this.archive,entry.id)));
    }
    if(!trail.length)details.createEl('p',{cls:'biblelab-plan-empty',
      text:'Aucune recherche enregistrée ici pour le moment.'});
    if(this.archive.history.length>35)details.createEl('p',{cls:'biblelab-plan-footnote',
      text:'Les 35 dernières recherches sont affichées. Les 120 dernières sont conservées.'});
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
