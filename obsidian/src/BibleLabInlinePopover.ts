import { setIcon } from 'obsidian';
import { parseScripture, jwLibraryLink } from './bibleLabData';
import { passageUrl, cleanWolUrl, linkifyReaderText, type ReaderResult, type ReferenceEntry, type ReaderLine } from './referenceReader';
import { fetchReferenceContent } from './wolReferenceFetcher';
import { referencedParagraphs } from './publicationReferences';
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
 private currentSource:string|null=null;
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
  this.root=null;this.current=null;this.currentSource=null;this.history=[];
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
  const maxWidth=Math.min(this.current?.kind==='scripture'?750:430,window.innerWidth-24);
  const left=Math.max(12,Math.min(rect.left,window.innerWidth-maxWidth-12));
  root.style.width=maxWidth+'px';
  root.style.left=left+'px';
  const below=window.innerHeight-rect.bottom;
  const above=rect.top;
  root.style.top=(below>=Math.min(360,window.innerHeight*.5)||below>=above
    ?Math.min(window.innerHeight-60,rect.bottom+9)
    :Math.max(10,rect.top-Math.min(440,above-12)))+'px';
  root.style.maxHeight=Math.max(190,Math.min(this.current?.kind==='scripture'?620:490,window.innerHeight-38))+'px';
  // Keep the popup within the viewport on mobile and in narrow side panes.
  const bounds=root.getBoundingClientRect();
  if(bounds.bottom>window.innerHeight-12)
   root.style.top=Math.max(12,window.innerHeight-bounds.height-12)+'px';
 }
 private render(ref:ReferenceEntry,anchor:HTMLElement):void{
  this.serial++;
  const token=this.serial;
  const root=this.root||document.body.createDiv({cls:'biblelab-inline-popover'});
  this.root=root;this.current=ref;this.currentSource=ref.url;root.empty();
  root.classList.toggle('is-scripture',ref.kind==='scripture');
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
    window.open(this.currentSource||ref.url,'_blank','noopener,noreferrer');
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
  this.currentSource=cleanWolUrl(result.sourceUrl)||this.current?.url||null;
  if(result.title&&result.title!==this.current?.label)
   container.createEl('h3',{cls:'biblelab-popover-document-title',text:result.title});
  if(result.notice)container.createEl('p',{cls:'biblelab-popover-notice',text:result.notice});
  if(!result.lines.length){
   container.createEl('p',{cls:'biblelab-popover-feedback',text:'Aucun texte lisible reçu. La référence reste accessible sur WOL.'});
   return;
  }
  // A Bible reference gets one uninterrupted reading column and a separate
  // collapsible rail for study notes, footnotes and cross references.
  if(result.kind==='verse'){
   this.drawScripture(container,result,anchor);
   return;
  }
  let visible=0;
  const chunks=result.lines.filter(x=>x.type!=='caption').slice(0,85);
  const requestedParagraphs=this.current?referencedParagraphs(this.current.label):[];
  let focus:HTMLElement|null=null;
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
    if(line.number&&requestedParagraphs.includes(line.number)){
      element.addClass('biblelab-article-target-paragraph');
      if(!focus)focus=element;
    }
    if(line.source)element.createEl('strong',{text:line.source+' · '});
    this.linkLine(element,line,anchor);
   }
   more.remove();
   if(visible<chunks.length){more.setText('Afficher la suite ('+(chunks.length-visible)+')');container.appendChild(more);}
  };
  const more=container.createEl('button',{cls:'biblelab-popover-more',attr:{type:'button'}});
  more.addEventListener('click',()=>append(10));
  // Load through the requested paragraph when available, rather than
  // making §15 inaccessible behind the "Afficher la suite" control.
  const index=requestedParagraphs.length?chunks.reduce((n,x,i)=>x.number&&requestedParagraphs.includes(x.number)?i:n,-1):-1;
  append(Math.max(12,index+1));
  if(focus)window.requestAnimationFrame(()=>{
    if(focus?.isConnected)focus.scrollIntoView({block:'nearest',behavior:'instant'});
  });
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
 private drawScripture(container:HTMLElement,result:ReaderResult,anchor:HTMLElement):void{
  const verses=result.lines.filter(line=>line.type==='verse'||line.type==='paragraph');
  const apparatus=result.lines.filter(line=>
    line.type==='crossref'||line.type==='note'||line.type==='study');
  // JW.org returns each Bible cross-reference twice: as an apparatus row
  // AND as a generic related link. Do not show both to the reader.
  const normalizeLabel=(label:string)=>label.normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const crossrefLabels=new Set<string>();
  for(const line of apparatus.filter(item=>item.type==='crossref')){
    for(const link of line.references||[])crossrefLabels.add(normalizeLabel(link.label));
    for(const label of line.text.split(/\s*·\s*/))crossrefLabels.add(normalizeLabel(label));
  }
  const extraLinks=result.links.filter(link=>!crossrefLabels.has(normalizeLabel(link.label)));
  const layout=container.createDiv({cls:'biblelab-popover-scripture-layout'});
  const reading=layout.createDiv({cls:'biblelab-popover-scripture-reading'});
  reading.setAttribute('role','region');
  reading.setAttribute('aria-label','Texte biblique');
  const parsed=this.current?parseScripture(this.current.label):null;
  let aside:HTMLDetailsElement|null=null;
  for(const [index,line] of verses.entries()){
   const row=reading.createDiv({cls:'biblelab-popover-scripture-verse'});
   const number=row.createSpan({cls:'biblelab-popover-scripture-number',
     text:line.number||String(parsed?.verses?.[index]||parsed?.verse||'')});
   number.setAttribute('aria-hidden','true');
   const text=row.createEl('p',{cls:'biblelab-popover-scripture-copy'});
   text.setAttribute('lang','fr');
   // Restore the original "+" positions when the official verse HTML
   // contains them; otherwise keep one unobtrusive fallback marker.
   const verseRef=line.references||[];
   const source=line.source||'';
   const hasFallback=apparatus.some(item=>item.type==='crossref'&&
     (verses.length===1||(source&&item.source===source)));
   const addPlus=(targets:readonly {label:string;url:string}[]):void=>{
     const marker=text.createEl('button',{
       cls:'biblelab-popover-verse-plus',text:'+',
       attr:{type:'button',title:'Renvois bibliques',
         'aria-label':'Afficher les renvois du verset '+(line.number||
           String(parsed?.verses?.[index]||parsed?.verse||index+1))}
     });
     marker.addEventListener('click',()=>{
       if(!aside)return;
       aside.open=true;
       const buttons=[...aside.querySelectorAll<HTMLElement>(
         '.biblelab-popover-apparatus-crossref .biblelab-popover-inline-link')];
       const matching=buttons.find(btn=>btn.getAttribute('aria-label')==='Lire '+targets[0]?.label);
       const focus=matching||buttons[0];
       if(focus)focus.focus({preventScroll:true});
       aside.scrollIntoView({block:'nearest',behavior:'smooth'});
     });
   };
   const markers=(line.referenceMarkers||[])
     .filter(marker=>marker.offset>=0&&marker.offset<=line.text.length)
     .sort((a,b)=>a.offset-b.offset);
   if((verseRef.length||hasFallback)&&markers.length){
     let cursor=0;
     for(const marker of markers){
       this.linkLine(text,{...line,text:line.text.slice(cursor,marker.offset),parts:undefined},anchor);
       addPlus(marker.targets);
       cursor=marker.offset;
     }
     this.linkLine(text,{...line,text:line.text.slice(cursor),parts:undefined},anchor);
   }else{
     this.linkLine(text,line,anchor);
     if(verseRef.length||hasFallback)addPlus(verseRef);
   }
  }
  if(!verses.length){
   reading.createEl('p',{cls:'biblelab-popover-feedback',
     text:'Le texte des versets n’est pas disponible ici. Consulte WOL.'});
  }
  if(!apparatus.length&&!extraLinks.length)return;
  aside=layout.createEl('details',{cls:'biblelab-popover-scripture-aside'});
  aside.open=window.innerWidth>=700;
  aside.createEl('summary',{text:'Notes et renvois ('+
    (apparatus.length+extraLinks.length)+')'});
  const area=aside.createDiv({cls:'biblelab-popover-scripture-apparatus'});
  const groups=[
   {type:'study',title:'Notes d’étude'},
   {type:'note',title:'Notes de traduction'},
   {type:'crossref',title:'Renvois bibliques'}
  ] as const;
  for(const group of groups){
   const items=apparatus.filter(line=>line.type===group.type);
   if(!items.length)continue;
   area.createEl('h4',{cls:'biblelab-popover-apparatus-heading',text:group.title});
   for(const line of items){
    const item=area.createDiv({cls:'biblelab-popover-apparatus-item biblelab-popover-apparatus-'+group.type});
    if(line.source)item.createEl('strong',{text:line.source});
    const content=item.createEl('p');
    this.linkLine(content,line.references?.length
      ?{...line,parts:linkifyReaderText(line.text,line.references)}
      :line,anchor);
   }
  }
  if(extraLinks.length){
   area.createEl('h4',{cls:'biblelab-popover-apparatus-heading',
     text:'Autres références'});
   const links=area.createDiv({cls:'biblelab-popover-scripture-links'});
   for(const link of extraLinks.slice(0,24)){
    const button=links.createEl('button',{
     cls:'biblelab-popover-scripture-link',text:link.label,
     attr:{type:'button','aria-label':'Lire '+link.label}
    });
    button.addEventListener('click',()=>{
     const next=fromLabel(link.label);
     next.url=link.url;
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
