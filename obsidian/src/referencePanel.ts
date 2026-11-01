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
   if(result.title && result.title!==ref.label)contents.createEl('h4',{cls:'biblelab-reader-document-title',text:result.title});
   if(result.notice)contents.createEl('p',{cls:'biblelab-reader-hint',text:result.notice});
   if(result.lines.length){
     const lines=contents.createDiv({cls:'biblelab-reader-text'});
     for(const part of result.lines){
       lines.createEl(part.type==='heading'?'h5':'p',{text:part.text,cls:part.type==='note'?'biblelab-reader-note':''});
     }
   }else contents.createDiv({cls:'biblelab-reader-hint',text:'Texte indisponible sur cette page. Consulter WOL.'});
   if(result.links.length&&depth<2){
     const related=contents.createEl('details',{cls:'biblelab-reader-related'});
     related.createEl('summary',{text:result.kind==='verse'?'Notes et références liées':'Articles et références liées'});
     const list=related.createDiv({cls:'biblelab-reader-related-list'});
     for(const link of result.links.slice(0,20)){
       renderReferenceAccordion(list,{
         label:link.label,url:link.url,
         kind:link.url.includes('/wol/b/')?'scripture':link.url.includes('/wol/d/')?'document':'publication',origin:'markdown'
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
