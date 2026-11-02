import { cleanWolUrl } from './referenceReader';
import { passageUrl } from './referenceReader';
import { findInlineReferences } from './inlineReferenceScanner';

/** Reading-mode source preview. Only mutate rendered DOM, never vault text.
 * No scanning of existing links, code, scripts, or form controls.
 */
export function enhanceBibleLabMarkers(
 container:HTMLElement,open:(reference:string,anchor:HTMLElement)=>void
):void{
 for(const link of Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]'))){
  const href=link.getAttribute('href')||'';
  const cleaned=cleanWolUrl(href);
  if(!cleaned)continue;
  if(href!==cleaned)link.setAttribute('href',cleaned);
  if(link.classList.contains('biblelab-ref')||link.dataset.biblelabIntercepted)continue;
  link.dataset.biblelabIntercepted='true';
  link.classList.add('biblelab-rendered-source-link');
  link.addEventListener('click',event=>{
   if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   event.preventDefault();event.stopPropagation();
   open(link.textContent?.trim()||cleaned,link);
  });
 }
 const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
 const nodes:Text[]=[];
 let node:Node|null;
 while((node=walker.nextNode())){
  if(!(node instanceof Text)||!node.textContent||node.textContent.length>16000)continue;
  const parent=node.parentElement;
  if(!parent||parent.closest('a,code,pre,kbd,script,style,button,textarea,svg,math,.biblelab-ref,.biblelab-inline-popover'))continue;
  nodes.push(node);
 }
 for(const original of nodes){
  const text=original.textContent||'';
  const candidates:Array<{from:number;to:number;label:string;url:string}>=[];
  for(const marker of text.matchAll(/!!([^!\r\n]{2,220})!!/g)){
   const from=marker.index??0;
   const label=marker[1].trim();
   if(label)candidates.push({from,to:from+marker[0].length,label,url:passageUrl(label)});
  }
  // Text nodes may contain line breaks; preserve their offsets accurately.
  let position=0;
  for(const line of text.split('\n')){
   for(const ref of findInlineReferences(line)){
    const from=position+ref.from,to=position+ref.to;
    if(!candidates.some(x=>from<x.to&&to>x.from))
     candidates.push({from,to,label:ref.label,url:ref.ref.url});
   }
   position+=line.length+1;
  }
  if(!candidates.length)continue;
  candidates.sort((a,b)=>a.from-b.from);
  const fragment=document.createDocumentFragment();
  let cursor=0;
  for(const item of candidates){
   if(item.from<cursor)continue;
   if(cursor<item.from)fragment.appendChild(document.createTextNode(text.slice(cursor,item.from)));
   const link=document.createElement('a');
   link.className='biblelab-ref biblelab-autolink';
   link.textContent=item.label;
   link.href=item.url;
   link.setAttribute('aria-label','Lire la référence '+item.label);
   link.addEventListener('click',event=>{
     if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
     event.preventDefault();event.stopPropagation();
     open(item.label,link);
   });
   fragment.appendChild(link);
   cursor=item.to;
  }
  if(cursor<text.length)fragment.appendChild(document.createTextNode(text.slice(cursor)));
  original.replaceWith(fragment);
 }
}
