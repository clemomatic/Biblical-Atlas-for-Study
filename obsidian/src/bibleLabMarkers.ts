import { cleanWolUrl } from './referenceReader';
import { passageUrl } from './referenceReader';
import { findInlineReferences } from './inlineReferenceScanner';
import { parseScripture, BOOKS } from './bibleLabData';

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
 // A reference can cross styling boundaries:
 // <strong>w24 novembre</strong> p. 21-24 <em>§ 4-16</em>.
 // Scan the visible text of each paragraph/heading as ONE continuous string,
 // then wrap the precise DOM Range without editing the underlying note or
 // removing its emphasis nodes.
 const groups=new Map<Element,Text[]>();
 const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
 let node:Node|null;
 while((node=walker.nextNode())){
  if(!(node instanceof Text)||!node.textContent)continue;
  const parent=node.parentElement;
  if(!parent)continue;
  const block=parent.closest('p,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,dt,dd,figcaption,div.callout')||
    parent.closest('div')||parent;
  if(!groups.has(block))groups.set(block,[]);
  groups.get(block)!.push(node);
 }
 for(const [block,nodes] of groups){
  if(block.closest('pre,code,script,style,button,textarea,svg,math,.biblelab-ref,.biblelab-inline-popover'))
   continue;
  let text='';
  const spans:Array<{node:Text;from:number;to:number}>=[];
  for(const part of nodes){
   const value=part.textContent||'';
   const excluded=!!part.parentElement?.closest(
    'a,code,pre,kbd,script,style,button,textarea,svg,math,.biblelab-ref,.biblelab-inline-popover');
   // A private-use sentinel prevents a match from crossing a protected link or
   // code span. Preserve offsets for the original DOM text nodes.
   const from=text.length;
   text+=excluded?'\uE000'.repeat(value.length):value.replace(/[\r\n]/g,'\uE000');
   if(!excluded)spans.push({node:part,from,to:text.length});
   if(text.length>16000)break;
  }
  if(!text||text.length>16000||!spans.length)continue;
  type Candidate={from:number;to:number;label:string;url:string;resolved?:string;marker?:boolean};
  const candidates:Candidate[]=[];
  const add=(item:Candidate):void=>{
   if(candidates.some(x=>item.from<x.to&&item.to>x.from))return;
   if(!spans.some(x=>item.from>=x.from&&item.from<x.to)||
      !spans.some(x=>item.to>x.from&&item.to<=x.to))return;
   candidates.push(item);
  };
  const first=spans[0].node;
  const prior=[...block.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter(a=>!!(a.compareDocumentPosition(first)&Node.DOCUMENT_POSITION_FOLLOWING))
    .reverse().find(a=>parseScripture(a.dataset.biblelabResolvedLabel||a.textContent||''));
  const parsed=prior?parseScripture(prior.dataset.biblelabResolvedLabel||prior.textContent||''):null;
  const inherited=parsed?BOOKS[parsed.book-1]:undefined;
  for(const marker of text.matchAll(/!!([^!\r\n\uE000]{2,220})!!/g)){
   const from=marker.index??0,label=marker[1].trim();
   if(label)add({from,to:from+marker[0].length,label,url:passageUrl(label),marker:true});
  }
  for(const ref of findInlineReferences(text,inherited))
   add({from:ref.from,to:ref.to,label:ref.label,url:ref.ref.url,resolved:ref.ref.label});
  // Reverse order: extracting a later DOM Range doesn't invalidate offsets
  // in text nodes earlier in the note.
  candidates.sort((a,b)=>b.from-a.from);
  const position=(index:number,end=false):{node:Text;offset:number}|null=>{
   const span=spans.find(x=>end?index>x.from&&index<=x.to:index>=x.from&&index<x.to);
   return span?{node:span.node,offset:index-span.from}:null;
  };
  for(const item of candidates){
   const from=position(item.from),to=position(item.to,true);
   if(!from||!to||!from.node.isConnected||!to.node.isConnected)continue;
   const range=document.createRange();
   try{
    range.setStart(from.node,from.offset);
    range.setEnd(to.node,to.offset);
   }catch{continue;}
   const fragment=range.extractContents();
   const link=document.createElement('a');
   link.className='biblelab-ref biblelab-autolink';
   link.href=item.url;
   if(item.marker)link.textContent=item.label;
   else link.appendChild(fragment); // Retain bold/italic formatting inside.
   if(item.resolved)link.dataset.biblelabResolvedLabel=item.resolved;
   link.setAttribute('aria-label','Lire la référence '+(item.resolved||item.label));
   link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();event.stopPropagation();
    open(item.resolved||item.label,link);
   });
   range.insertNode(link);
  }
 }
}
