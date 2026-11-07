import {ItemView,Notice,type WorkspaceLeaf,type ViewStateResult} from 'obsidian';
import {renderDeskShell,deskButton,STUDY_DESK_NAME,type DeskDestination} from './studyDeskBrand';
import {bibleBookName} from './jwAnnotationLibrary';
import {searchableVerses,bibleSearchTerms,matchesBibleSearch,type LocalBibleData,type SearchableVerse} from './localBibleData';
import {LocalBibleLibrary,type LocalBibleEdition} from './localBibleLibrary';

export const STUDY_DESK_BIBLE_VIEW='jw-study-desk-bible';
let nextBibleViewId=0;
interface BibleActions {
  library:LocalBibleLibrary;
  navigate:(destination:DeskDestination)=>void;
  openLibrary:()=>void;
  preview:(label:string,anchor:HTMLElement,url:string)=>void;
}
export class StudyDeskBibleView extends ItemView {
  private readonly panelId='jwsd-bible-panel-'+(++nextBibleViewId);
  private edition='';
  private book=1;
  private chapter=1;
  private tab:'read'|'search'='read';
  private query='';
  private searchBook=0;
  private serial=0;
  private searchSerial=0;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private active=false;
  private observer:ResizeObserver|undefined;
  private wide:boolean|undefined;
  private data:LocalBibleData|null=null;
  private searchIndex:SearchableVerse[]=[];
  private body:HTMLElement|null=null;
  constructor(leaf:WorkspaceLeaf,private actions:BibleActions){super(leaf);}
  getViewType():string{return STUDY_DESK_BIBLE_VIEW;}
  getDisplayText():string{return 'Bible · '+STUDY_DESK_NAME;}
  getIcon():string{return 'book-open-text';}
  getState():Record<string,unknown>{return {edition:this.edition,book:this.book,chapter:this.chapter,tab:this.tab,query:this.query,searchBook:this.searchBook};}
  async setState(raw:unknown,_result:ViewStateResult):Promise<void>{
    const state=raw as Record<string,unknown>|null;
    if(!state||typeof state!=='object')return;
    if(typeof state.edition==='string')this.edition=state.edition;
    if(Number.isInteger(state.book)&&Number(state.book)>0&&Number(state.book)<=66)this.book=Number(state.book);
    if(Number.isInteger(state.chapter)&&Number(state.chapter)>0&&Number(state.chapter)<=150)this.chapter=Number(state.chapter);
    if(state.tab==='read'||state.tab==='search')this.tab=state.tab;
    if(typeof state.query==='string')this.query=state.query.slice(0,180);
    if(Number.isInteger(state.searchBook)&&Number(state.searchBook)>=0&&Number(state.searchBook)<=66)this.searchBook=Number(state.searchBook);
    if(this.active)await this.refresh();
  }
  async onOpen():Promise<void>{
    this.active=true;this.contentEl.addClass('jwsd-workspace','jwsd-bible');
    this.observer=new ResizeObserver(()=>{
      const wide=this.contentEl.clientWidth>740;
      if(wide!==this.wide){this.wide=wide;const picker=this.body?.querySelector('details');if(picker)picker.open=wide;}
    });
    this.observer.observe(this.contentEl);await this.refresh();
  }
  async onClose():Promise<void>{this.active=false;this.observer?.disconnect();this.observer=undefined;this.serial++;this.stopSearch();this.data=null;this.searchIndex=[];this.body=null;this.contentEl.empty();}
  private save():void{this.app.workspace.requestSaveLayout();}
  private stopSearch():void{this.searchSerial++;if(this.timer)clearTimeout(this.timer);}
  async refresh():Promise<void>{
    if(!this.active)return;
    const token=++this.serial;this.stopSearch();this.data=null;this.searchIndex=[];
    this.contentEl.empty();
    const stage=renderDeskShell(this.contentEl,'bible',{navigate:this.actions.navigate});
    const toolbar=stage.createDiv({cls:'jwsd-toolbar'});
    toolbar.createSpan({cls:'jwsd-toolbar-label',text:STUDY_DESK_NAME+' / Bible'});
    deskButton(toolbar,'Mes Bibles','library-big',this.actions.openLibrary);
    const page=stage.createDiv({cls:'jwsd-page jwsd-bible-page'});
    const heading=page.createDiv({cls:'jwsd-page-title jwsd-bible-heading'});
    heading.createEl('h1',{text:'Bible'});
    heading.createEl('p',{text:'Un passage à lire, un verset à retrouver.'});
    const status=page.createEl('p',{cls:'jwsd-bible-status',text:'Ouverture de votre Bible…',attr:{role:'status'}});
    try{
      const editions=await this.actions.library.editions();if(token!==this.serial)return;
      if(!editions.length){status.remove();this.empty(page);return;}
      const current=editions.find(e=>e.id===this.edition)||editions[0];this.edition=current.id;
      this.editionPicker(page,editions,current);
      const data=await this.actions.library.load(current,percent=>{
        if(token===this.serial)status.textContent='Préparation de votre Bible pour la lecture hors connexion'+(percent===null?'…':' · '+percent+' %');
      });
      if(token!==this.serial)return;
      this.data=data;this.searchIndex=searchableVerses(data);status.remove();
      if(!data.chapters.some(c=>c.book===this.book&&c.chapter===this.chapter)){
        const first=data.chapters.find(c=>c.book===this.book)||data.chapters[0];this.book=first.book;this.chapter=first.chapter;
      }
      const tabs=page.createDiv({cls:'jwsd-bible-tabs',attr:{role:'tablist','aria-label':'Utiliser la Bible'}});
      for(const [id,label,icon] of [['read','Lire','book-open-text'],['search','Rechercher','search']] as const){
        const b=deskButton(tabs,label,icon,()=>{this.tab=id;this.save();this.renderBody();},'jwsd-bible-tab');
        b.dataset.tab=id;b.setAttribute('role','tab');b.setAttribute('id',this.panelId+'-'+id);b.setAttribute('aria-controls',this.panelId);
        b.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
          event.preventDefault();const next=tabs.querySelector<HTMLButtonElement>(`[data-tab="${id==='read'?'search':'read'}"]`);next?.click();next?.focus();
        }});
      }
      this.body=page.createDiv({cls:'jwsd-bible-body',attr:{id:this.panelId,role:'tabpanel'}});
      this.renderBody();this.save();
    }catch(error){
      if(token!==this.serial)return;status.remove();
      const box=page.createDiv({cls:'jwsd-bible-empty',attr:{role:'alert'}});
      box.createEl('h2',{text:'Cette Bible ne peut pas être ouverte.'});
      box.createEl('p',{text:error instanceof Error?error.message:'Réessaie ou ajoute à nouveau cette Bible dans la bibliothèque.'});
      deskButton(box,'Réessayer','refresh-cw',()=>{void this.refresh();});
      deskButton(box,'Ouvrir la bibliothèque','library-big',this.actions.openLibrary);
    }
  }
  private empty(page:HTMLElement):void{
    const box=page.createDiv({cls:'jwsd-bible-empty'});
    box.createEl('h2',{text:'Votre Bible, toujours à portée de main.'});
    box.createEl('p',{text:'Téléchargez une Bible en français dans la bibliothèque. Vous pourrez ensuite la lire et y rechercher des versets, même sans connexion.'});
    deskButton(box,'Télécharger une Bible','download',this.actions.openLibrary,'is-primary');
  }
  private editionPicker(page:HTMLElement,editions:LocalBibleEdition[],current:LocalBibleEdition):void{
    const row=page.createDiv({cls:'jwsd-bible-edition'});
    const label=row.createEl('label',{text:'Bible téléchargée'});
    const select=label.createEl('select',{attr:{'aria-label':'Bible téléchargée'}});
    for(const edition of editions)select.createEl('option',{text:edition.label,attr:{value:edition.id}});
    select.value=current.id;select.addEventListener('change',()=>{this.edition=select.value;this.save();void this.refresh();});
    row.createSpan({cls:'jwsd-bible-local',text:'Disponible hors connexion'});
  }
  private renderBody(target?:number):void{
    this.stopSearch();if(!this.body||!this.data)return;
    this.contentEl.querySelectorAll<HTMLButtonElement>('.jwsd-bible-tab').forEach(b=>{
      const selected=b.dataset.tab===this.tab;b.classList.toggle('is-active',selected);
      b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
    });
    this.body.setAttribute('aria-labelledby',this.panelId+'-'+this.tab);this.body.empty();
    if(this.tab==='read')this.renderReading(this.body,target);else this.renderSearch(this.body);
  }
  private books():number[]{return [...new Set(this.data!.chapters.map(c=>c.book))].sort((a,b)=>a-b);}
  private go(book:number,chapter:number,verse?:number):void{
    this.book=book;this.chapter=chapter;this.tab='read';this.save();this.renderBody(verse);
  }
  private renderReading(parent:HTMLElement,target?:number):void{
    const data=this.data!;const ch=data.chapters.find(c=>c.book===this.book&&c.chapter===this.chapter)!;
    const title=bibleBookName(this.book)+' '+this.chapter;
    const layout=parent.createDiv({cls:'jwsd-bible-reading'});
    const picker=layout.createEl('details',{cls:'jwsd-bible-picker'});picker.open=this.contentEl.clientWidth>740;
    picker.createEl('summary',{text:'Livre et chapitre · '+title});
    const options=picker.createDiv({cls:'jwsd-bible-picker-content'});
    const label=options.createEl('label',{text:'Livre de la Bible'});
    const select=label.createEl('select',{attr:{'aria-label':'Livre de la Bible'}});
    for(const [caption,books] of [['Écritures hébraïques',this.books().filter(b=>b<=39)],['Écritures grecques chrétiennes',this.books().filter(b=>b>39)]] as const){
      if(!books.length)continue;const group=select.createEl('optgroup',{attr:{label:caption}});
      for(const book of books)group.createEl('option',{text:bibleBookName(book),attr:{value:String(book)}});
    }
    select.value=String(this.book);select.addEventListener('change',()=>{
      const book=Number(select.value),first=data.chapters.find(c=>c.book===book)!;this.go(book,first.chapter);
      this.body?.querySelector('details')?.setAttribute('open','');
    });
    options.createEl('p',{cls:'jwsd-bible-picker-label',text:'CHAPITRE'});
    const grid=options.createDiv({cls:'jwsd-bible-chapters',attr:{'aria-label':'Chapitres de '+bibleBookName(this.book)}});
    for(const item of data.chapters.filter(c=>c.book===this.book).sort((a,b)=>a.chapter-b.chapter)){
      const b=grid.createEl('button',{text:String(item.chapter),attr:{type:'button','aria-label':'Lire '+bibleBookName(this.book)+' '+item.chapter}});
      if(item.chapter===this.chapter){b.classList.add('is-active');b.setAttribute('aria-current','true');}
      b.addEventListener('click',()=>this.go(this.book,item.chapter));
    }
    const reader=layout.createEl('article',{cls:'jwsd-bible-reader',attr:{'aria-label':title}});
    const head=reader.createDiv({cls:'jwsd-bible-reader-heading'});head.createEl('h2',{text:title});
    const controls=head.createDiv({cls:'jwsd-bible-chapter-nav'});
    const ordered=[...data.chapters].sort((a,b)=>a.book-b.book||a.chapter-b.chapter),index=ordered.indexOf(ch);
    for(const [offset,label,icon] of [[-1,'Chapitre précédent','chevron-left'],[1,'Chapitre suivant','chevron-right']] as const){
      const adjacent=ordered[index+offset];
      const b=deskButton(controls,label,icon,()=>{if(adjacent)this.go(adjacent.book,adjacent.chapter);},'is-icon');b.disabled=!adjacent;
    }
    const text=reader.createDiv({cls:'jwsd-bible-text'});
    for(const verse of ch.verses){
      const p=text.createEl('p',{cls:verse.number?'jwsd-bible-verse':'jwsd-bible-superscription',attr:{'data-verse':String(verse.number)}});
      if(verse.number){
        const label=title+':'+verse.number;
        const button=p.createEl('button',{cls:'jwsd-bible-verse-number',text:String(verse.number),attr:{type:'button','aria-label':'Aperçu de '+label}});
        button.addEventListener('click',()=>this.actions.preview(label,button,`https://wol.jw.org/fr/wol/b/r30/lp-f/${data.publication.symbol}/${this.book}/${this.chapter}`));
      }
      p.createSpan({text:verse.text});
      if(target===verse.number){p.classList.add('is-target');p.tabIndex=-1;}
    }
    const foot=reader.createDiv({cls:'jwsd-bible-reader-footer'});
    deskButton(foot,'Copier ce chapitre','copy',()=>{
      const content=title+'\n\n'+ch.verses.map(v=>(v.number?v.number+' ':'')+v.text).join('\n');
      void navigator.clipboard.writeText(content).then(()=>new Notice('Chapitre copié.'),()=>new Notice('Sélectionne le texte pour le copier.'));
    });
    if(target!==undefined)requestAnimationFrame(()=>{
      if(!reader.isConnected)return;const selected=reader.querySelector<HTMLElement>('.is-target');selected?.scrollIntoView({block:'center'});selected?.focus({preventScroll:true});
    });
  }
  private renderSearch(parent:HTMLElement):void{
    const section=parent.createDiv({cls:'jwsd-bible-search'});
    const form=section.createEl('form',{cls:'jwsd-bible-search-form',attr:{role:'search','aria-label':'Rechercher un verset'}});
    const label=form.createEl('label',{text:'Quels mots vous reviennent ?'});
    const input=label.createEl('input',{attr:{type:'search','aria-label':'Mots du verset',placeholder:'Un mot ou plusieurs mots…',maxlength:'180',autocomplete:'off'}});input.value=this.query;
    const scope=form.createEl('select',{attr:{'aria-label':'Rechercher dans un livre'}});
    scope.createEl('option',{text:'Toute la Bible',attr:{value:'0'}});
    for(const book of this.books())scope.createEl('option',{text:bibleBookName(book),attr:{value:String(book)}});
    if(!this.books().includes(this.searchBook))this.searchBook=0;scope.value=String(this.searchBook);
    form.createEl('p',{text:'Tous les mots sont recherchés dans un même verset. Les accents et les majuscules ne changent pas les résultats.'});
    const results=section.createDiv({cls:'jwsd-bible-search-results'});
    const run=()=>{this.query=input.value;this.searchBook=Number(scope.value);this.save();void this.search(results);};
    input.addEventListener('input',()=>{this.stopSearch();this.timer=setTimeout(run,220);});
    scope.addEventListener('change',run);form.addEventListener('submit',e=>{e.preventDefault();this.stopSearch();run();});
    void this.search(results);
  }
  private async search(results:HTMLElement):Promise<void>{
    const token=++this.searchSerial;results.empty();const terms=bibleSearchTerms(this.query);
    if(this.query.trim().length<2||!terms.length){results.createEl('p',{cls:'jwsd-bible-search-help',text:'Saisissez au moins deux caractères pour retrouver un verset.'});return;}
    const status=results.createEl('p',{cls:'jwsd-bible-status',attr:{role:'status'},text:'Recherche dans votre Bible…'});
    const found:SearchableVerse[]=[];
    for(let i=0;i<this.searchIndex.length;i++){
      if(i%1200===0){await new Promise(r=>setTimeout(r,0));if(token!==this.searchSerial||!results.isConnected)return;}
      const verse=this.searchIndex[i];if(matchesBibleSearch(verse,terms,this.searchBook))found.push(verse);
    }
    if(token!==this.searchSerial||!results.isConnected)return;
    status.textContent=found.length?found.length+' verset'+(found.length>1?'s trouvés':' trouvé'):'Aucun verset trouvé. Essayez un autre mot ou recherchez dans toute la Bible.';
    const list=results.createDiv({cls:'jwsd-bible-results-list'});let visible=0;
    const more=deskButton(results,'Voir plus de versets','chevron-down',()=>append());
    const append=()=>{
      const end=Math.min(visible+50,found.length);
      for(const verse of found.slice(visible,end)){
        const reference=bibleBookName(verse.book)+' '+verse.chapter+':'+verse.number;
        const b=list.createEl('button',{cls:'jwsd-bible-result',attr:{type:'button','aria-label':'Lire '+reference}});
        b.createEl('strong',{text:reference});highlight(b.createSpan(),verse.text,terms);
        b.addEventListener('click',()=>this.go(verse.book,verse.chapter,verse.number));
      }
      visible=end;more.hidden=visible>=found.length;
    };append();
  }
}
function highlight(parent:HTMLElement,text:string,terms:string[]):void{
  let folded='';const positions:number[]=[];let offset=0;
  for(const char of text){
    const normal=char.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").toLocaleLowerCase('fr');
    for(let i=0;i<normal.length;i++)positions.push(offset);folded+=normal;offset+=char.length;
  }
  const marked=new Set<number>();
  for(const term of terms){let i=folded.indexOf(term);while(i>=0){for(let j=i;j<i+term.length;j++)marked.add(positions[j]);i=folded.indexOf(term,i+Math.max(1,term.length));}}
  let start=0;
  while(start<text.length){const active=marked.has(start);let end=start+1;while(end<text.length&&marked.has(end)===active)end++;
    if(active)parent.createEl('mark',{text:text.slice(start,end)});else parent.appendChild(document.createTextNode(text.slice(start,end)));start=end;}
}
