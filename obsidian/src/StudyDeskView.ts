import {ItemView,TFile,setIcon,type WorkspaceLeaf,type ViewStateResult} from 'obsidian';
import {renderDeskShell,deskButton,STUDY_DESK_NAME,STUDY_DESK_ICON,STUDY_DESK_LOGO,STUDY_DESK_PANORAMA,type DeskDestination} from './studyDeskBrand';
import {personalDeskNotes,type DeskNote} from './studyDeskModel';
import {activeResearchPlan,type ResearchDesk} from './researchDesk';
import {unassignedResearchCaptures,type ResearchCollection,type ResearchCapture} from './researchCollection';
import {libraryEntry,type BibleLabArchive} from './researchArchive';
import type {WolSearchScope} from './wolResearch';

export const STUDY_DESK_VIEW='jw-study-desk-workspace';
export interface StudyDeskActions {
  navigate:(destination:DeskDestination)=>void;
  getDesk:()=>ResearchDesk;
  getCollection:()=>ResearchCollection;
  getArchive:()=>BibleLabArchive;
  openStudy:()=>void;
  openIdea:(id?:string)=>void;
  openCapture:(id?:string)=>void;
  search:(query:string,scope:WolSearchScope)=>void;
  openDailyStudy:()=>void;
  createTalk:()=>void;
  openAnnotations:()=>void;
  renderSettings:(parent:HTMLElement)=>void;
}
const pages=new Set<DeskDestination>(['home','search','notes','ideas','inbox','preparation','settings']);
const glyph=(parent:HTMLElement,name:string,cls=''):HTMLElement=>{
  const el=parent.createSpan({cls});setIcon(el,name);return el;
};
export class StudyDeskView extends ItemView {
  private destination:DeskDestination='home';
  private query='';
  private searchScope:WolSearchScope='all';
  private active=false;
  constructor(leaf:WorkspaceLeaf,private actions:StudyDeskActions){super(leaf);}
  getViewType():string{return STUDY_DESK_VIEW;}
  getDisplayText():string{return STUDY_DESK_NAME;}
  getIcon():string{return STUDY_DESK_ICON;}
  getState():Record<string,unknown>{return {destination:this.destination};}
  async setState(state:unknown,_result:ViewStateResult):Promise<void>{
    const d=(state as {destination?:unknown})?.destination;
    if(typeof d==='string'&&pages.has(d as DeskDestination))this.destination=d as DeskDestination;
    if(this.active)this.refresh();
  }
  async onOpen():Promise<void>{this.active=true;this.contentEl.addClass('jwsd-workspace');this.refresh();}
  async onClose():Promise<void>{this.active=false;this.contentEl.empty();}
  show(destination:DeskDestination='home'):void{
    if(!pages.has(destination)){this.actions.navigate(destination);return;}
    if(this.destination!==destination)this.query='';
    this.destination=destination;this.refresh();this.app.workspace.requestSaveLayout();
  }
  refresh():void{
    if(!this.active)return;
    this.contentEl.empty();
    const stage=renderDeskShell(this.contentEl,this.destination,{navigate:d=>this.show(d)});
    const toolbar=stage.createDiv({cls:'jwsd-toolbar'});
    const location=toolbar.createDiv({cls:'jwsd-toolbar-label'});
    location.createEl('img',{attr:{src:STUDY_DESK_LOGO,alt:'',width:'26',height:'26'}});
    location.createSpan({text:STUDY_DESK_NAME+' / '+this.pageLabel()});
    deskButton(toolbar,'Actualiser le bureau','refresh-cw',()=>this.refresh(),'is-icon');
    const page=stage.createDiv({cls:'jwsd-page'});
    switch(this.destination){
      case 'home':this.renderHome(page);break;
      case 'search':this.renderSearch(page);break;
      case 'notes':this.renderNotes(page);break;
      case 'ideas':this.renderIdeas(page);break;
      case 'inbox':this.renderInbox(page);break;
      case 'preparation':this.renderPreparation(page);break;
      case 'settings':this.title(page,'Paramètres','Votre espace, vos préférences.');
        this.actions.renderSettings(page.createDiv({cls:'jwsd-settings'}));break;
    }
  }
  private pageLabel():string{return ({home:'Accueil',bible:'Bible',search:'Recherche',notes:'Mes notes',ideas:'Fiches d’idées',inbox:'Bac à idées',preparation:'Préparation',settings:'Paramètres',library:'Bibliothèque'})[this.destination];}
  private title(parent:HTMLElement,title:string,description:string):void{
    const heading=parent.createDiv({cls:'jwsd-page-title'});
    heading.createEl('h1',{text:title});heading.createEl('p',{text:description});
  }
  private notes():DeskNote[]{
    return this.app.vault.getMarkdownFiles().map(file=>({path:file.path,title:file.basename,modified:file.stat.mtime,
      kind:this.app.metadataCache.getFileCache(file)?.frontmatter?.bible_lab_kind as string|undefined}));
  }
  private inbox():ResearchCapture[]{
    return unassignedResearchCaptures(this.actions.getCollection())
      .filter(item=>!libraryEntry(this.actions.getArchive(),item.id).archived);
  }
  private renderHome(page:HTMLElement):void{
    const welcome=page.createEl('header',{cls:'jwsd-welcome'});
    welcome.style.setProperty('--jwsd-panorama',`url("${STUDY_DESK_PANORAMA}")`);
    welcome.createSpan({cls:'jwsd-welcome-kicker',text:'VOTRE ESPACE D’ÉTUDE'});
    welcome.createEl('h1',{text:'Prenez le temps d’approfondir.'});
    welcome.createEl('p',{text:'Lire, relier et donner forme à vos idées.'});
    deskButton(welcome,'Ouvrir la Bible','book-open-text',()=>this.actions.navigate('bible'),'jwsd-welcome-bible');
    const layout=page.createDiv({cls:'jwsd-home-grid'});
    const primary=layout.createDiv({cls:'jwsd-home-primary'});
    const tools=primary.createDiv({cls:'jwsd-tool-grid',attr:{'aria-label':'Outils d’étude'}});
    for(const item of [
      {id:'library',title:'Bibliothèque',description:'Publications et lectures',icon:'layers',tone:'violet'},
      {id:'search',title:'Recherche',description:'Versets, sujets et références',icon:'search',tone:'petrol'},
      {id:'notes',title:'Mes notes',description:'Vos réflexions dans Obsidian',icon:'notebook-pen',tone:'sage'},
      {id:'ideas',title:'Fiches d’idées',description:'Une phrase, ses sources',icon:'lightbulb',tone:'amber'},
      {id:'inbox',title:'Bac à idées',description:'Vos découvertes à trier',icon:'inbox',tone:'coral'},
      {id:'preparation',title:'Préparation',description:'Réunions, discours, études',icon:'calendar-days',tone:'sage'}
    ] as const){
      const card=tools.createEl('button',{cls:'jwsd-tool-card tone-'+item.tone,attr:{type:'button','aria-label':item.title}});
      glyph(card,item.icon,'jwsd-tool-symbol');glyph(card,'arrow-up-right','jwsd-tool-arrow');
      card.createEl('strong',{text:item.title});card.createEl('small',{text:item.description});
      card.addEventListener('click',()=>this.show(item.id));
    }
    const recent=primary.createEl('section',{cls:'jwsd-section'});
    const heading=recent.createDiv({cls:'jwsd-section-heading'});
    const title=heading.createEl('h2');glyph(title,'book-open');title.createSpan({text:'Reprendre'});
    deskButton(heading,'Toutes mes notes','arrow-right',()=>this.show('notes'));
    const notes=personalDeskNotes(this.notes()).slice(0,4);
    if(notes.length)this.renderNoteRows(recent,notes);
    else this.empty(recent,'Votre prochaine idée commence ici.','Vos notes d’étude apparaîtront ici au fil de vos recherches.');
    const aside=layout.createEl('aside',{cls:'jwsd-home-aside',attr:{'aria-label':'Mon étude en cours'}});
    const plan=activeResearchPlan(this.actions.getDesk());
    const collection=this.actions.getCollection();
    const project=aside.createEl('section',{cls:'jwsd-insight'});
    const projectHead=project.createDiv({cls:'jwsd-insight-head'});glyph(projectHead,'list-tree');projectHead.createSpan({text:'Mon sujet'});
    project.createEl('h3',{text:plan?.title||'Une recherche libre'});
    project.createEl('p',{text:plan?'Retrouvez votre plan et poursuivez votre réflexion.':'Partez d’une question. Gardez une référence. Laissez votre étude prendre forme.'});
    if(plan){
      const stats=project.createDiv({cls:'jwsd-plan-stats'});
      const branches=stats.createSpan();branches.createEl('strong',{text:String(plan.branches.length)});branches.createSpan({text:'pistes'});
      const ideas=stats.createSpan();ideas.createEl('strong',{text:String(collection.ideas.filter(idea=>idea.planId===plan.id).length)});ideas.createSpan({text:'idées'});
    }
    deskButton(project,plan?'Reprendre mon étude':'Commencer une étude','arrow-right',this.actions.openStudy);
    const today=aside.createEl('section',{cls:'jwsd-insight'});
    const todayHead=today.createDiv({cls:'jwsd-insight-head'});glyph(todayHead,'calendar-days');todayHead.createSpan({text:'À préparer'});
    today.createEl('h3',{text:'Garder du temps pour l’essentiel.'});
    today.createEl('p',{text:'Texte du jour, réunion de semaine ou prochain discours : retrouvez vos supports de préparation.'});
    deskButton(today,'Ouvrir la préparation','arrow-right',()=>this.show('preparation'));
  }
  private renderSearch(page:HTMLElement):void{
    this.title(page,'Recherche','Un sujet à creuser, un verset à retrouver.');
    const form=page.createEl('form',{cls:'jwsd-search-form'});
    const search=form.createDiv({cls:'jwsd-note-search'});glyph(search,'search');
    const field=search.createEl('input',{attr:{type:'search','aria-label':'Rechercher dans JW Study Desk',placeholder:'Sujet, verset ou référence…',autocomplete:'off'}});
    field.value=this.query;field.addEventListener('input',()=>{this.query=field.value;});
    const scopes=form.createDiv({cls:'jwsd-search-scopes',attr:{role:'group','aria-label':'Sources de recherche'}});
    for(const entry of [{id:'all',label:'Publications',icon:'library-big'},{id:'index',label:'Index',icon:'list-tree'},{id:'guide',label:'Guide de recherche',icon:'compass'},{id:'perspicace',label:'Perspicace',icon:'book-open-check'}] as const){
      const b=deskButton(scopes,entry.label,entry.icon,()=>{this.searchScope=entry.id;this.refresh();});
      b.setAttribute('aria-pressed',String(entry.id===this.searchScope));
      if(entry.id===this.searchScope)b.addClass('is-current');
    }
    const submit=deskButton(form,'Rechercher','arrow-right',()=>{},'is-primary');submit.type='submit';
    form.addEventListener('submit',event=>{event.preventDefault();if(this.query.trim())this.actions.search(this.query.trim(),this.searchScope);else field.focus();});
    const local=page.createDiv({cls:'jwsd-section jwsd-insight'});
    local.createEl('h3',{text:'Chercher dans vos publications téléchargées'});
    local.createEl('p',{text:'La bibliothèque recherche aussi dans le texte des ouvrages déjà disponibles sur cet appareil.'});
    deskButton(local,'Rechercher dans la bibliothèque','library-big',()=>this.actions.navigate('library'));
  }
  private renderNotes(page:HTMLElement,preparationOnly=false):void{
    if(!preparationOnly)this.title(page,'Mes notes','Vos réflexions, à retrouver et à poursuivre dans Obsidian.');
    const search=page.createDiv({cls:'jwsd-note-search'});glyph(search,'search');
    const field=search.createEl('input',{attr:{type:'search','aria-label':'Rechercher dans mes notes',placeholder:'Retrouver une note…'}});field.value=this.query;
    const results=page.createDiv();
    const draw=()=>{
      results.empty();const notes=personalDeskNotes(this.notes(),this.query,preparationOnly);
      results.createDiv({cls:'jwsd-notes-count',text:notes.length+' note'+(notes.length>1?'s':'')});
      if(notes.length)this.renderNoteRows(results,notes.slice(0,60));
      else this.empty(results,'Aucune note pour cette recherche.','Essayez un autre titre ou commencez une nouvelle étude.');
      if(notes.length>60)results.createEl('p',{cls:'jwsd-notes-count',text:'Affichage des 60 notes les plus récentes. Précisez la recherche pour retrouver les autres.'});
    };
    field.addEventListener('input',()=>{this.query=field.value;draw();});draw();
    if(!preparationOnly)deskButton(page,'Mes annotations JW Library','highlighter',this.actions.openAnnotations);
  }
  private renderNoteRows(parent:HTMLElement,notes:DeskNote[]):void{
    const list=parent.createDiv({cls:'jwsd-note-list'});
    for(const note of notes){
      const row=list.createEl('button',{cls:'jwsd-note-row',attr:{type:'button','aria-label':'Ouvrir la note '+note.title}});
      glyph(row,'file-text','jwsd-note-icon');const copy=row.createSpan({cls:'jwsd-note-copy'});
      copy.createEl('strong',{text:note.title});
      const folder=note.path.split('/').slice(-2,-1)[0]||'Mes notes';
      const date=note.modified?new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(note.modified)):'';
      copy.createEl('small',{text:folder+(date?' · '+date:'')});glyph(row,'chevron-right');
      row.addEventListener('click',()=>{const file=this.app.vault.getAbstractFileByPath(note.path);if(file instanceof TFile)void this.app.workspace.getLeaf('tab').openFile(file);});
    }
  }
  private renderIdeas(page:HTMLElement):void{
    this.title(page,'Fiches d’idées','Une idée claire, appuyée sur les références que vous avez retenues.');
    deskButton(page,'Nouvelle fiche d’idée','plus',()=>this.actions.openIdea(),'is-primary');
    const ideas=this.actions.getCollection().ideas;
    const list=page.createDiv({cls:'jwsd-section jwsd-note-list'});
    if(!ideas.length){list.remove();this.empty(page,'Tout commence par une idée.','Gardez une source, formulez votre phrase, puis réunissez les références qui l’appuient.');}
    for(const idea of ideas){
      const row=list.createEl('button',{cls:'jwsd-note-row',attr:{type:'button','aria-label':'Ouvrir l’idée '+(idea.statement||'Idée à formuler')}});
      glyph(row,'lightbulb','jwsd-note-icon');const text=row.createSpan({cls:'jwsd-note-copy'});
      text.createEl('strong',{text:idea.statement||'Idée à formuler'});text.createEl('small',{text:idea.captureIds.length+' référence(s)'});glyph(row,'chevron-right');
      row.addEventListener('click',()=>this.actions.openIdea(idea.id));
    }
  }
  private renderInbox(page:HTMLElement):void{
    this.title(page,'Bac à idées','Une découverte intéressante, même sans savoir encore où la ranger.');
    deskButton(page,'Garder une trouvaille','bookmark-plus',()=>this.actions.openCapture(),'is-primary');
    const captures=this.inbox();const list=page.createDiv({cls:'jwsd-section jwsd-note-list'});
    if(!captures.length){list.remove();this.empty(page,'Votre bac est prêt.','Gardez une référence ou un passage depuis vos lectures. Vous pourrez le classer plus tard.');}
    for(const capture of captures){
      const row=list.createEl('button',{cls:'jwsd-note-row',attr:{type:'button','aria-label':'Ouvrir la trouvaille '+capture.label}});
      glyph(row,'inbox','jwsd-note-icon');const text=row.createSpan({cls:'jwsd-note-copy'});
      text.createEl('strong',{text:capture.label});text.createEl('small',{text:(capture.comment||capture.excerpt||'Une piste à explorer').slice(0,140)});glyph(row,'chevron-right');
      row.addEventListener('click',()=>this.actions.openCapture(capture.id));
    }
  }
  private renderPreparation(page:HTMLElement):void{
    this.title(page,'Préparation','Réservez votre attention au contenu. Retrouvez ici vos supports.');
    const tools=page.createDiv({cls:'jwsd-preparation-grid'});
    const week=tools.createDiv({cls:'jwsd-insight'});glyph(week,'calendar-days','jwsd-tool-symbol');
    week.createEl('h3',{text:'Texte du jour et réunion'});week.createEl('p',{text:'Consultez le programme et créez votre note de préparation de la semaine.'});
    deskButton(week,'Préparer la réunion','arrow-right',this.actions.openDailyStudy,'is-primary');
    const talk=tools.createDiv({cls:'jwsd-insight'});glyph(talk,'presentation','jwsd-tool-symbol');
    talk.createEl('h3',{text:'Discours et interventions'});talk.createEl('p',{text:'Construisez un plan autour de votre idée, de vos versets et du temps disponible.'});
    deskButton(talk,'Créer un plan de discours','plus',this.actions.createTalk);
    const heading=page.createDiv({cls:'jwsd-section-heading'});heading.createEl('h2',{text:'Mes préparations'});
    this.renderNotes(page,true);
  }
  private empty(parent:HTMLElement,title:string,description:string):void{
    const empty=parent.createDiv({cls:'jwsd-empty'});empty.createEl('h3',{text:title});empty.createEl('p',{text:description});
  }
}
