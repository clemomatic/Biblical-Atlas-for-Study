import { setIcon } from 'obsidian';
import { jwLibraryLink } from './bibleLabData';
import { linkifyReaderText, type ReaderResult, type ReaderLine, type ReferenceEntry } from './referenceReader';
import { fetchReferenceContent } from './wolReferenceFetcher';

export interface ReaderState {
 expanded:Set<string>;
 cache:Map<string,{date:number;result:ReaderResult}>;
 pending:Map<string,Promise<ReaderResult>>;
 copy:(url:string)=>void;
 open:(url:string)=>void;
 navigate?:(ref:ReferenceEntry)=>void;
 articleFontSize?:number;
 remember?:(ref:ReferenceEntry)=>void;
 insert?:(ref:ReferenceEntry)=>void;
}
function key(item:ReferenceEntry):string{return item.url+'#'+item.label;}
function action(parent:HTMLElement,label:string,icon:string,callback:()=>void):void {
 const btn=parent.createEl('button',{cls:'biblelab-reader-action',attr:{type:'button',title:label,'aria-label':label}});
 const svg=btn.createSpan();setIcon(svg,icon);btn.createSpan({text:label});
 btn.addEventListener('click',event=>{event.stopPropagation();callback();});
}
export function renderReferenceAccordion(parent:HTMLElement,ref:ReferenceEntry,state:ReaderState,depth=0):void {
 const id=key(ref);
 const details=parent.createEl('details',{cls:'biblelab-reader'+(depth?' is-nested':'')});
 const summary=details.createEl('summary',{cls:'biblelab-reader-summary'});
 const glyph=summary.createSpan({cls:'biblelab-reader-glyph'});
 setIcon(glyph,ref.kind==='scripture'?'book-open':ref.kind==='document'?'file-text':'bookmark');
 const labels=summary.createSpan({cls:'biblelab-reader-labels'});
 labels.createEl('strong',{text:ref.label});
 labels.createSpan({text:ref.kind==='scripture'?'Bible d’étude · notes / renvois':ref.kind==='document'?'Document WOL':'Publication · référence'});
 const chevron=summary.createSpan({cls:'biblelab-reader-chevron'});setIcon(chevron,'chevron-down');
 const body=details.createDiv({cls:'biblelab-reader-body'});
 const buttons=body.createDiv({cls:'biblelab-reader-actions'});
 let currentUrl=ref.url;
 action(buttons,'WOL','external-link',()=>state.open(currentUrl));
 action(buttons,'Copier','copy',()=>state.copy(currentUrl));
 if(state.insert)action(buttons,'Insérer dans ma note','file-plus',()=>state.insert?.({...ref,url:currentUrl}));
 if(depth>0 && state.navigate)action(buttons,'Lire en grand','panel-top',()=>state.navigate?.(ref));
 if(ref.kind==='scripture'){const jw=jwLibraryLink(ref.label);if(jw)action(buttons,'JW Library','book-marked',()=>state.open(jw));}
 const contents=body.createDiv({cls:'biblelab-reader-contents'});
 const readable=(container:HTMLElement,line:ReaderLine):void=>{
   const fragments=line.parts||linkifyReaderText(line.text);
   for(const part of fragments){
     if(!part.url){container.appendChild(document.createTextNode(part.text));continue;}
     const clickable=container.createEl('button',{cls:'biblelab-reader-inline-link',
       text:part.text,attr:{type:'button',title:'Consulter '+part.text,
         'aria-label':'Lire la référence '+part.text}});
     clickable.addEventListener('click',event=>{
       event.preventDefault();event.stopPropagation();
       if(!part.url)return;
       const destination:ReferenceEntry={label:part.text,url:part.url,
         kind:part.kind||'publication',origin:'pinned'};
       if(state.navigate)state.navigate(destination);else state.open(part.url);
     });
   }
 };

 const draw=(result:ReaderResult):void=>{
   currentUrl=result.sourceUrl;
   contents.empty();
   if(result.title&&result.title!==ref.label)
     contents.createEl('h4',{cls:'biblelab-reader-document-title',text:result.title});
   if(result.notice)contents.createEl('p',{cls:'biblelab-reader-hint',text:result.notice});
   if(!result.lines.length)
     contents.createDiv({cls:'biblelab-reader-hint',text:'Contenu indisponible ici. Consulte la page originale sur WOL.'});

   if(result.kind==='verse'){
     const verses=result.lines.filter(x=>x.type==='verse'||x.type==='paragraph');
     for(const line of verses){
       const verse=contents.createDiv({cls:'biblelab-verse-reading'});
       const marker=verse.createDiv({cls:'biblelab-verse-reading-label',text:'TEXTE BIBLIQUE'});
       const content=verse.createEl('p',{cls:'biblelab-verse-reading-copy'});
       readable(content,line);
       marker.setAttribute('aria-label','Texte biblique');
       content.setAttribute('lang','fr');
     }
     const sections=[
       {kind:'study',title:'Notes d’étude',icon:'book-open-check'},
       {kind:'note',title:'Notes de traduction',icon:'notebook-pen'},
       {kind:'crossref',title:'Renvois bibliques',icon:'link-2'},
     ] as const;
     for(const section of sections){
       const parts=result.lines.filter(x=>x.type===section.kind);
       if(!parts.length)continue;
       const group=contents.createEl('details',{cls:'biblelab-reader-section'});
       if(section.kind!=='crossref')group.open=true;
       const summary=group.createEl('summary',{cls:'biblelab-reader-section-title'});
       const glyph=summary.createSpan();setIcon(glyph,section.icon);
       summary.createSpan({text:section.title});
       summary.createSpan({cls:'biblelab-reader-section-count',text:String(parts.length)});
       const list=group.createDiv({cls:'biblelab-reader-section-list'});
       for(const part of parts){
         const note=list.createDiv({cls:'biblelab-reader-note-card'});
         if(part.source)note.createEl('strong',{cls:'biblelab-reader-note-source',text:part.source});
         const noteBody=note.createEl('p',{attr:{lang:'fr'}});
         readable(noteBody,part);
       }
     }
     for(const part of result.lines.filter(x=>x.type==='heading'||x.type==='question')){
       contents.createEl('p',{cls:'biblelab-reader-hint',text:part.text});
     }
   }else if(result.lines.length){
     // A concise editorial toolbar stays within the current reference.
     const controls=contents.createDiv({cls:'biblelab-article-controls'});
     controls.createSpan({text:'LECTURE',cls:'biblelab-article-control-label'});
     const article=contents.createDiv({cls:'biblelab-reader-text biblelab-article-reading'});
     const applySize=():void=>article.style.setProperty('--bl-article-font-size',(state.articleFontSize||13)+'px');
     const shrink=controls.createEl('button',{text:'A−',cls:'biblelab-reader-font-button',
       attr:{type:'button','aria-label':'Réduire la taille du texte'}});
     shrink.addEventListener('click',()=>{state.articleFontSize=Math.max(11,(state.articleFontSize||13)-1);applySize();});
     const grow=controls.createEl('button',{text:'A+',cls:'biblelab-reader-font-button',
       attr:{type:'button','aria-label':'Augmenter la taille du texte'}});
     grow.addEventListener('click',()=>{state.articleFontSize=Math.min(19,(state.articleFontSize||13)+1);applySize();});
     applySize();

     const lines=result.lines.filter((line,i)=>
       !(i===0&&line.type==='heading'&&line.text===result.title));
     let displayed=0;
     const batchSize=18;
     const headings=new Map<number,HTMLElement>();
     const append=(amount:number):void=>{
       const to=Math.min(displayed+amount,lines.length);
       for(;displayed<to;displayed++){
         const part=lines[displayed];
         if(part.type==='heading'){
           const header=article.createEl('h5',{cls:'biblelab-article-heading',text:part.text});
           header.id='bl-article-section-'+depth+'-'+displayed;
           headings.set(displayed,header);
         }else if(part.type==='question'){
           const question=article.createEl('p',{cls:'biblelab-article-question'});
           readable(question,part);
         }else if(part.type==='caption'){
           const caption=article.createEl('p',{cls:'biblelab-article-caption'});
           readable(caption,part);
         }else{
           const wrap=article.createDiv({cls:'biblelab-article-paragraph'});
           if(part.number)wrap.createSpan({cls:'biblelab-article-parnum',text:part.number});
           const paragraph=wrap.createEl('p',{attr:{lang:'fr'},
             cls:part.type==='note'?'biblelab-reader-note':''});
           readable(paragraph,part);
         }
       }
       more.remove();
       if(displayed<lines.length){
         more.setText('Afficher la suite · '+(lines.length-displayed)+' blocs');
         article.appendChild(more);
       }
     };
     const more=article.createEl('button',{cls:'biblelab-reader-more',attr:{type:'button'}});
     more.addEventListener('click',()=>append(batchSize));
     const sections=lines.map((line,i)=>({line,i})).filter(item=>item.line.type==='heading').slice(0,18);
     if(sections.length>=2){
       const outline=contents.createEl('details',{cls:'biblelab-article-outline'});
       contents.insertBefore(outline,article);
       outline.createEl('summary',{text:'Plan de l’article · '+sections.length+' sections'});
       const list=outline.createDiv({cls:'biblelab-article-outline-list'});
       for(const section of sections){
         const link=list.createEl('button',{text:section.line.text,
           attr:{type:'button',title:'Aller à '+section.line.text}});
         link.addEventListener('click',()=>{
           while(displayed<=section.i&&displayed<lines.length)append(batchSize);
           const header=headings.get(section.i);
           if(header)header.scrollIntoView({block:'nearest',behavior:'instant'});
         });
       }
     }
     append(batchSize);
   }

   if(result.links.length&&depth<2){
     const related=contents.createEl('details',{cls:'biblelab-reader-related'});
     related.createEl('summary',{text:result.kind==='verse'?
       'Notes et références liées':
       'Parcourir les références de l’article ('+result.links.length+')'});
     const list=related.createDiv({cls:'biblelab-reader-related-list'});
     const current=new URL(currentUrl);
     let shown=0;
     for(const link of result.links){
       if(link.url===current.href||shown++>=20)continue;
       renderReferenceAccordion(list,{
         label:link.label,url:link.url,
         kind:link.url.includes('/wol/b/')?'scripture':link.url.includes('/wol/d/')?'document':'publication',
         origin:'markdown'
       },state,depth+1);
     }
   }
 };
 const load=async():Promise<void>=>{
   const cached=state.cache.get(id);
   if(cached&&Date.now()-cached.date<30*60*1000){draw(cached.result);return;}
   contents.empty();contents.createDiv({cls:'biblelab-reader-loading',text:'Lecture de WOL…'});
   try{
     let task=state.pending.get(id);
     if(!task){
       task=fetchReferenceContent(ref);
       state.pending.set(id,task);
     }
     const result=await task;
     // Keep only a bounded number of parsed publications in memory.
     state.cache.delete(id);
     state.cache.set(id,{date:Date.now(),result});
     while(state.cache.size>48){
       const oldest=state.cache.keys().next().value;
       if(oldest===undefined)break;
       state.cache.delete(oldest);
     }
     if(contents.isConnected)draw(result);
   }catch(error){
     if(contents.isConnected){
       contents.empty();
       contents.createDiv({cls:'biblelab-reader-failure',text:error instanceof Error?error.message:'Lecture impossible'});
       action(contents,'Ouvrir WOL','external-link',()=>state.open(currentUrl));
     }
   }finally{state.pending.delete(id);}
 };
 details.addEventListener('toggle',()=>{
   if(details.open){state.expanded.add(id);void load();}
   else state.expanded.delete(id);
 });
 if(state.expanded.has(id)){details.open=true;void load();}
}
