import { setIcon } from 'obsidian';
import { parseScripture, jwLibraryLink } from './bibleLabData';
import { passageUrl, cleanWolUrl, linkifyReaderText, type ReaderResult, type ReferenceEntry, type ReaderLine } from './referenceReader';
import { fetchReferenceContent } from './wolReferenceFetcher';
import { renderArticleImage } from './articleImages';

const fromLabel=(label:string):ReferenceEntry=>{
 const scripture=parseScripture(label);
 const url=cleanWolUrl(label)||passageUrl(label);
 return {label,url,kind:scripture?'scripture':url.includes('/wol/d/')?'document':'publication',origin:'pinned'};
};
/** A single overlay owned by the plugin, not an iframe and not a vault edit. */
export class BibleLabInlinePopover {
 private root:HTMLElement|null=null;
 private current:ReferenceEntry|null=null;
 private history:ReferenceEntry[]=[];
 private backFocus:HTMLElement|null=null;
 private serial=0;
 private cache=new Map<string,{value:ReaderResult;date:number}>();
 private inFlight=new Map<string,Promise<ReaderResult>>();
 private readonly cacheDuration=20*60*1000;
 constructor(private readonly openPanel:(ref:ReferenceEntry)=>void){}
 isOpen():boolean{return !!this.root;}
 open(label:string,anchor:HTMLElement):void{
  const ref=fromLabel(label);
  // A rendered Markdown link already contains its authoritative WOL URL.
  // Never replace it with a guessed bibliographic search based on its title.
  const href=anchor instanceof HTMLAnchorElement?cleanWolUrl(anchor.href):null;
  if(href){ref.url=href;if(ref.kind!=='scripture')ref.kind='document';}
  this.backFocus=anchor;
  this.history=[ref];
  this.render(ref,anchor);
 }
 close(restoreFocus=false):void{
  this.serial++;
  const previous=this.root;
  const focusInside=!!previous?.contains(document.activeElement);
  this.root=null;this.current=null;this.history=[];
  previous?.remove();
  document.removeEventListener('pointerdown',this.outside,true);
  document.removeEventListener('keydown',this.keydown,true);
  if(restoreFocus&&focusInside&&this.backFocus?.isConnected)
    this.backFocus.focus({preventScroll:true});
  this.backFocus=null;
 }
 private outside=(ev:PointerEvent):void=>{
  // A zoom dialog belongs to this preview, even though it is mounted on body.
  const target=ev.target as Element;
  if(target.closest?.('.biblelab-image-lightbox'))return;
  if(this.root&&!this.root.contains(target))this.close();
 };
 private keydown=(ev:KeyboardEvent):void=>{
  // Let Escape close the picture first, not the underlying article preview.
  if(document.querySelector('dialog.biblelab-image-lightbox[open]'))return;
  if(ev.key==='Escape'&&this.root){ev.preventDefault();ev.stopPropagation();this.close(true);}
 };
 private button(parent:HTMLElement,name:string,icon:string,fn:()=>void):HTMLButtonElement{
  const b=parent.createEl('button',{cls:'biblelab-popover-btn',attr:{type:'button',title:name,'aria-label':name}});
  const glyph=b.createSpan();setIcon(glyph,icon);
  b.createSpan({text:name});
  b.addEventListener('click',fn);
  return b;
 }
 private position(root:HTMLElement,anchor:HTMLElement):void{
  const rect=anchor.getBoundingClientRect();
  const maxWidth=Math.min(430,window.innerWidth-24);
  const left=Math.max(12,Math.min(rect.left,window.innerWidth-maxWidth-12));
  root.style.width=maxWidth+'px';
  root.style.left=left+'px';
  const below=window.innerHeight-rect.bottom;
  const above=rect.top;
  root.style.top=(below>=Math.min(360,window.innerHeight*.5)||below>=above
    ?Math.min(window.innerHeight-60,rect.bottom+9)
    :Math.max(10,rect.top-Math.min(440,above-12)))+'px';
  root.style.maxHeight=Math.max(190,Math.min(490,window.innerHeight-38))+'px';
  // Keep the popup within the viewport on mobile and in narrow side panes.
  const bounds=root.getBoundingClientRect();
  if(bounds.bottom>window.innerHeight-12)
   root.style.top=Math.max(12,window.innerHeight-bounds.height-12)+'px';
 }
 private render(ref:ReferenceEntry,anchor:HTMLElement):void{
  this.serial++;
  const token=this.serial;
  const root=this.root||document.body.createDiv({cls:'biblelab-inline-popover'});
  this.root=root;this.current=ref;root.empty();
  root.setAttribute('role','dialog');root.setAttribute('aria-label','Aperçu biblique : '+ref.label);
  root.setAttribute('aria-modal','false');
  const header=root.createDiv({cls:'biblelab-popover-header'});
  const title=header.createDiv({cls:'biblelab-popover-title'});
  title.createSpan({text:ref.kind==='scripture'?'BIBLE D’ÉTUDE':'PUBLICATION',cls:'biblelab-popover-eyebrow'});
  title.createEl('strong',{text:ref.label});
  const close=this.button(header,'Fermer','x',()=>this.close(true));close.addClass('biblelab-popover-close');
  const content=root.createDiv({cls:'biblelab-popover-content'});
  const footer=root.createDiv({cls:'biblelab-popover-footer'});
  const prev=this.button(footer,'Retour','arrow-left',()=>{
    if(this.history.length<=1)return;
    this.history.pop();
    this.render(this.history[this.history.length-1],anchor);
  });
  prev.disabled=this.history.length<=1;
  this.button(footer,'Dans le panneau','panel-right',()=>{this.openPanel(ref);this.close();});
  const jw=ref.kind==='scripture'?jwLibraryLink(ref.label):null;
  if(jw)this.button(footer,'JW Library','book-open-check',()=>
    window.open(jw,'_blank','noopener,noreferrer'));
  this.button(footer,'WOL','external-link',()=>{
    window.open(ref.url,'_blank','noopener,noreferrer');
  });
  this.position(root,anchor);
  document.removeEventListener('pointerdown',this.outside,true);
  document.removeEventListener('keydown',this.keydown,true);
  document.addEventListener('pointerdown',this.outside,true);
  document.addEventListener('keydown',this.keydown,true);
  const key=ref.url+'#'+ref.label;
  const cached=this.cache.get(key);
  if(cached&&Date.now()-cached.date<this.cacheDuration){
    this.cache.delete(key);this.cache.set(key,cached);
    this.draw(content,cached.value,anchor);return;
  }
  if(cached)this.cache.delete(key);
  content.createDiv({cls:'biblelab-popover-loading',attr:{role:'status'},
    text:'Chargement de la référence…'});
  let request=this.inFlight.get(key);
  if(!request){
    request=fetchReferenceContent(ref);
    this.inFlight.set(key,request);
    // Keep the request shared until it settles, then release it even if the
    // popup was closed or navigated elsewhere.
    void request.then(()=>this.inFlight.delete(key),()=>this.inFlight.delete(key));
  }
  void request.then(result=>{
    if(token!==this.serial||!root.isConnected)return;
    if(result.lines.length){
      this.cache.delete(key);
      this.cache.set(key,{value:result,date:Date.now()});
      while(this.cache.size>35)this.cache.delete(this.cache.keys().next().value!);
    }
    content.empty();this.draw(content,result,anchor);
  }).catch(error=>{
    if(token!==this.serial||!root.isConnected)return;
    content.empty();
    content.createEl('p',{cls:'biblelab-popover-feedback',text:
      (error instanceof Error?error.message:'Source indisponible')+
      ' — Utilise le site officiel ou le panneau latéral.'});
    this.button(content,'Réessayer','refresh-cw',()=>this.render(ref,anchor));
  });
 }
 private draw(container:HTMLElement,result:ReaderResult,anchor:HTMLElement):void{
  if(result.title&&result.title!==this.current?.label)
   container.createEl('h3',{cls:'biblelab-popover-document-title',text:result.title});
  if(result.notice)container.createEl('p',{cls:'biblelab-popover-notice',text:result.notice});
  if(!result.lines.length){
   container.createEl('p',{cls:'biblelab-popover-feedback',text:'Aucun texte lisible reçu. La référence reste accessible sur WOL.'});
   return;
  }
  let visible=0;
  const chunks=result.lines.filter(x=>x.type!=='caption').slice(0,85);
  const append=(size:number):void=>{
   const end=Math.min(chunks.length,visible+size);
   for(;visible<end;visible++){
    const line=chunks[visible];
    if(line.type==='image'&&line.image){
      renderArticleImage(container,line.image);
      continue;
    }
    const element=container.createEl(line.type==='heading'?'h4':'p',{
      cls:'biblelab-popover-line biblelab-popover-'+line.type});
    if(line.source)element.createEl('strong',{text:line.source+' · '});
    this.linkLine(element,line,anchor);
   }
   more.remove();
   if(visible<chunks.length){more.setText('Afficher la suite ('+(chunks.length-visible)+')');container.appendChild(more);}
  };
  const more=container.createEl('button',{cls:'biblelab-popover-more',attr:{type:'button'}});
  more.addEventListener('click',()=>append(10));
  append(12);
  if(result.links.length){
   const moreLinks=container.createEl('details',{cls:'biblelab-popover-related'});
   moreLinks.createEl('summary',{text:'Renvois et publications ('+result.links.length+')'});
   const links=moreLinks.createDiv();
   for(const link of result.links.slice(0,12)){
    this.button(links,link.label,'arrow-up-right',()=>{
     const next=fromLabel(link.label);next.url=link.url;
     next.kind=parseScripture(link.label)?'scripture':'document';
     this.history.push(next);this.render(next,anchor);
    });
   }
  }
 }
 private linkLine(target:HTMLElement,line:ReaderLine,anchor:HTMLElement):void{
  for(const part of line.parts||linkifyReaderText(line.text)){
   if(!part.url){target.appendChild(document.createTextNode(part.text));continue;}
   const button=target.createEl('button',{cls:'biblelab-popover-inline-link',text:part.text,
     attr:{type:'button','aria-label':'Lire '+part.text}});
   button.addEventListener('click',()=>{
    const ref=fromLabel(part.text);ref.url=part.url!;
    ref.kind=part.kind||ref.kind;this.history.push(ref);this.render(ref,anchor);
   });
  }
 }
 destroy():void{this.close();this.cache.clear();this.inFlight.clear();}
}
