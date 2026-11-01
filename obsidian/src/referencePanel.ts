import { setIcon } from 'obsidian';
import { jwLibraryLink } from './bibleLabData';
import { type ReaderResult, type ReferenceEntry } from './referenceReader';
import { fetchReferenceContent } from './wolReferenceFetcher';

export interface ReaderState {
 expanded:Set<string>;
 cache:Map<string,{date:number;result:ReaderResult}>;
 pending:Map<string,Promise<ReaderResult>>;
 copy:(url:string)=>void;
 open:(url:string)=>void;
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
 if(ref.kind==='scripture'){const jw=jwLibraryLink(ref.label);if(jw)action(buttons,'JW Library','book-marked',()=>state.open(jw));}
 const contents=body.createDiv({cls:'biblelab-reader-contents'});
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
       const content=verse.createEl('p',{cls:'biblelab-verse-reading-copy',text:line.text});
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
         note.createEl('p',{text:part.text,attr:{lang:'fr'}});
       }
     }
     for(const part of result.lines.filter(x=>x.type==='heading'||x.type==='question')){
       contents.createEl('p',{cls:'biblelab-reader-hint',text:part.text});
     }
   }else if(result.lines.length){
     const article=contents.createDiv({cls:'biblelab-reader-text biblelab-article-reading'});
     // Long articles should remain usable on narrow mobile sidebars.
     // Rendering more is local and does not trigger extra website requests.
     let displayed=0;
     const batchSize=16;
     const lines=result.lines.filter((line,i)=>
       !(i===0&&line.type==='heading'&&line.text===result.title));
     const append=(amount:number):void=>{
       const to=Math.min(displayed+amount,lines.length);
       for(;displayed<to;displayed++){
         const part=lines[displayed];
         if(part.type==='heading'){
           article.createEl('h5',{cls:'biblelab-article-heading',text:part.text});
         }else if(part.type==='question'){
           article.createEl('p',{cls:'biblelab-article-question',text:part.text});
         }else if(part.type==='caption'){
           article.createEl('p',{cls:'biblelab-article-caption',text:part.text});
         }else{
           const wrap=article.createDiv({cls:'biblelab-article-paragraph'});
           if(part.number)wrap.createSpan({cls:'biblelab-article-parnum',text:part.number});
           wrap.createEl('p',{text:part.text,attr:{lang:'fr'},
             cls:part.type==='note'?'biblelab-reader-note':''});
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
     append(batchSize);
   }

   if(result.links.length&&depth<2){
     const related=contents.createEl('details',{cls:'biblelab-reader-related'});
     related.createEl('summary',{text:result.kind==='verse'?
       'Ouvrir les références et documents liés ('+result.links.length+')':
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
     state.cache.set(id,{date:Date.now(),result});
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
