import { requestUrl } from 'obsidian';
import { normalizeSearch, parseScripture } from './bibleLabData';
import { cleanWolUrl, parseWolDocument, type ReaderResult, type ReferenceEntry } from './referenceReader';

const WOL='https://wol.jw.org/fr/wol/';
const API='https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/livres/json/html/';
const DOC=/\/fr\/wol\/d\/r30\/lp-f\/\d+/;
const BIBLIO=/^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2})\b/i;
const simple=(v:string)=>normalizeSearch(v).replace(/[^a-z0-9]+/g,' ').trim();
const validateDocument=(value:string,base:string):string|null=>{
 try{
   const final=cleanWolUrl(new URL(value,base).href);
   return final && DOC.test(new URL(final).pathname)?final:null;
 }catch{return null;}
};
export function canonicalReferenceUrl(raw:string):string|null{
 const url=cleanWolUrl(raw);
 if(!url)return null;
 const u=new URL(url);
 if(u.pathname==='/fr/wol/s/r30/lp-f'){
   const query=u.searchParams.get('q')?.trim();
   if(query && BIBLIO.test(query)){
     return 'https://wol.jw.org/fr/wol/l/r30/lp-f?'+new URLSearchParams({q:query});
   }
 }
 return url;
}
function pickDocument(html:string,base:string,reference:string):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const requested=simple(reference);
 // WOL may redirect the /l/ query to a /d/ document in its canonical metadata.
 const canonical=doc.querySelector('link[rel="canonical"],meta[property="og:url"]');
 const canonicalHref=canonical?.getAttribute('href')||canonical?.getAttribute('content');
 const canonicalDoc=canonicalHref&&validateDocument(canonicalHref,base);
 if(canonicalDoc)return canonicalDoc;
 const anchors=[...doc.querySelectorAll<HTMLAnchorElement>('a[href]')];
 let best:string|null=null,score=-1;
 const keywords=requested.split(' ').filter(x=>x.length>2);
 for(const anchor of anchors.slice(0,1400)){
   const href=validateDocument(anchor.getAttribute('href')||'',base);
   if(!href)continue;
   const surrounding=simple((anchor.closest('li,article,.result,.searchResult,.item')||anchor.parentElement||anchor).textContent||'').slice(0,600);
   const label=simple(anchor.textContent||'');
   let weight=0;
   if(requested && (label.includes(requested)||surrounding.includes(requested)))weight+=100;
   for(const word of keywords) if(surrounding.includes(word))weight+=word.length>4?6:3;
   if(label.length>8)weight+=2;
   if(weight>score){score=weight;best=href;}
 }
 // A direct reference lookup is normally an exact or near-exact match.
 // Never silently present an arbitrary keyword search result as a verified article.
 return score>=10?best:null;
}
function isDocument(html:string):boolean{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const region=doc.querySelector('.bodyTxt, .document, article .bodyTxt, #article');
 return !!region && ((region.querySelectorAll('p').length>=2)||(region.textContent||'').trim().length>450);
}
function knownCitation(reference:string):string|null{
 // Verified WOL bibliographic reference. Useful when the /l/ endpoint
 // responds with a JS redirect that Obsidian requestUrl cannot follow.
 return /^w24\s+novembre\s+p\.?\s*14\s*[-–]\s*19$/i.test(reference.trim())
   ? WOL+'d/r30/lp-f/2024642':null;
}
async function officialText(url:string):Promise<string>{
 const safe=canonicalReferenceUrl(url);
 if(!safe)throw Error('Adresse WOL externe non autorisée.');
 const response=await requestUrl({url:safe,throw:false});
 if(response.status!==200)throw Error('WOL indisponible ('+response.status+').');
 return response.text;
}
function readerForDocument(html:string,url:string,label:string):ReaderResult{
 const result=parseWolDocument(html,url,label);
 if(!result.lines.length)throw Error('WOL n’a pas fourni de texte exploitable.');
 return result;
}
export async function fetchPublication(ref:ReferenceEntry):Promise<ReaderResult>{
 const url=canonicalReferenceUrl(ref.url);
 if(!url)throw Error('Référence WOL non reconnue.');
 const path=new URL(url).pathname;
 if(DOC.test(path)||path.startsWith('/fr/wol/b/')){
   return readerForDocument(await officialText(url),url,ref.label);
 }
 if(!path.startsWith('/fr/wol/l/')&&!path.startsWith('/fr/wol/s/'))
   throw Error('Cette source ne correspond pas à une page WOL consultable.');
 const query=new URL(url).searchParams.get('q')?.trim()||ref.label;
 const lookup=path.startsWith('/fr/wol/s/')
   ? WOL+'l/r30/lp-f?'+new URLSearchParams({q:query}):url;
 let text='';let docUrl:string|null=null;
 try{
   text=await officialText(lookup);
   docUrl=pickDocument(text,lookup,query);
   if(!docUrl && isDocument(text)){
     const direct=readerForDocument(text,lookup,query);
     // The server supplied the full document instead of a list.
     direct.sourceUrl=lookup;
     direct.kind='article';
     return direct;
   }
 }catch{
   // WOL can fail to expose a JavaScript redirect on the /l/ endpoint.
   // Try the official bibliographic result listing instead of fabricating content.
 }
 if(!docUrl){
   const fallback=WOL+'s/r30/lp-f?'+new URLSearchParams({q:query});
   try{docUrl=pickDocument(await officialText(fallback),fallback,query);}catch{ /* no matching result */ }
 }
 docUrl=docUrl||knownCitation(query);
 if(!docUrl){
   const empty=parseWolDocument(text||'<main></main>',lookup,query);
   empty.lines=[];
   empty.notice='Référence non résolue automatiquement. Ouvre le lien WOL pour consulter la publication.';
   empty.kind='results';return empty;
 }
 const article=readerForDocument(await officialText(docUrl),docUrl,query);
 article.kind='article';
 return article;
}
function readText(raw:string):string{
 const doc=new DOMParser().parseFromString(raw,'text/html');
 return (doc.body.textContent||'').replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim();
}
interface JwVerseExtras {
 html:string;citation?:string;
 footnotes?:{content?:string;source?:string}[];
 crossReferences?:{source?:string;targets?:{vs?:string;standardCitation?:string}[]}[];
 commentaries?:{content?:string;source?:string}[];
}
export async function fetchStudyVerse(ref:ReferenceEntry):Promise<ReaderResult>{
 const scripture=parseScripture(ref.label);
 if(!scripture)return fetchPublication(ref);
 const range=(n:number)=>String(scripture.book).padStart(2,'0')+String(scripture.chapter).padStart(3,'0')+String(n).padStart(3,'0');
 const one=range(scripture.verse), last=scripture.endVerse&&scripture.endVerse!==scripture.verse?range(scripture.endVerse):null;
 // Exact endpoint and response schema follow traVERture's fetchVerseWithExtras.
 const key=(p:string)=>String(Number(p.slice(0,2)))+p.slice(2);
 const code=key(one)+(last?'-'+key(last):'');
 try{
   const response=await requestUrl({url:API+code,throw:false});
   if(response.status!==200)throw Error('API Bible : '+response.status);
   const data=response.json as {ranges?:Record<string,JwVerseExtras>};
   const entry=data?.ranges?.[code];
   if(!entry||typeof entry.html!=='string')throw Error('Verset absent des données reçues.');
   const lines:ReaderResult['lines']=[];
   const text=readText(entry.html);
   if(text)lines.push({type:'paragraph',text});
   for(const note of entry.footnotes||[]){
     const value=readText(note.content||'');if(value)lines.push({type:'note',text:(note.source?readText(note.source)+' — ':'')+value});
   }
   for(const commentary of entry.commentaries||[]){
     const value=readText(commentary.content||'');if(value)lines.push({type:'note',text:(commentary.source?readText(commentary.source)+' — ':'')+value});
   }
   const links:ReaderResult['links']=[];
   const linked=new Set<string>();
   for(const row of entry.crossReferences||[]){
     const labels:string[]=[];
     for(const target of row.targets||[]){
       const citation=(target.standardCitation||'').trim();
       if(citation)labels.push(citation);
       const targetCode=(target.vs||'').replace(/[^0-9]/g,'');
       if(citation&&/^\\d{8}$/.test(targetCode)){
         const book=Number(targetCode.slice(0,2)),chapter=Number(targetCode.slice(2,5));
         if(book>=1&&book<=66&&chapter>=1&&chapter<=150){
           const url=WOL+'b/r30/lp-f/nwt/'+book+'/'+chapter;
           const key=citation+'|'+url;
           if(!linked.has(key)){links.push({label:citation,url});linked.add(key);}
         }
       }
     }
     if(labels.length)lines.push({type:'note',text:'Renvois : '+labels.join(' · ')});
   }
   if(!lines.length)throw Error('Bible d’étude vide.');
   return {title:entry.citation||scripture.label,
      sourceUrl:ref.url,kind:'verse',lines,links,
      notice:'Texte et notes de la Bible d’étude · jw.org'};
 }catch{
   // Official WOL remains the fallback for unsupported languages/older Bible editions.
   return fetchPublication(ref);
 }
}
export async function fetchReferenceContent(ref:ReferenceEntry):Promise<ReaderResult>{
 return ref.kind==='scripture'?fetchStudyVerse(ref):fetchPublication(ref);
}
