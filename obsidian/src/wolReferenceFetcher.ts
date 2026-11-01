import { requestUrl } from 'obsidian';
import { normalizeSearch, parseScripture } from './bibleLabData';
import { cleanWolUrl, parseWolDocument, type ReaderResult, type ReferenceEntry } from './referenceReader';
import { readableOfficialHtml, meaningfulNoteSource } from './readerText.ts';

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

interface PublicationPage {issue:string;first:number;last:number}
const FRENCH_MONTHS='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
/** The citation may refer to pages INSIDE a longer article. */
export function publicationPages(raw:string):PublicationPage|null{
 const t=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .toLocaleLowerCase('fr').replace(/\u00a0/g,' ').replace(/[–—]/g,'-');
 const match=t.match(new RegExp(
  '\\b(w\\d{2}|wp\\d{2}(?:\\.\\d+)?|g\\d{2}|mwb\\d{2})\\s+('+FRENCH_MONTHS+
  ')\\s+p\\.?\\s*(\\d{1,3})(?:\\s*-\\s*(\\d{1,3}))?\\b','i'));
 if(!match)return null;
 const first=Number(match[3]),last=Number(match[4]||match[3]);
 if(first<1||last<first||last>300)return null;
 return {issue:match[1]+' '+match[2],first,last};
}
export function matchingPublicationPages(requested:string,listing:string):boolean{
 const a=publicationPages(requested),b=publicationPages(listing);
 return !!a&&!!b&&a.issue===b.issue&&b.first<=a.first&&b.last>=a.last;
}
/** Exact citations are resolved without silently accepting a wrong issue. */
export function selectPublicationCandidate(html:string,base:string,reference:string):string|null{
 const request=publicationPages(reference);
 if(!request)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 let best:string|null=null;
 let shortest=Number.POSITIVE_INFINITY;
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(a.getAttribute('href')||'',base);
  if(!href)continue;
  // WOL results commonly attach the publication/pages to the article row.
  const box=a.closest('li,article,.result,.searchResult,.search-result,.item')||a.parentElement;
  const visible=(box?.textContent||'').slice(0,900);
  const page=publicationPages(visible);
  if(!page||!matchingPublicationPages(reference,visible))continue;
  const range=page.last-page.first;
  if(range<shortest){best=href;shortest=range;}
 }
 return best;
}

function pickDocument(html:string,base:string,reference:string):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const requested=simple(reference);
 const exact=selectPublicationCandidate(html,base,reference);
 if(exact)return exact;
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
   // A search result with explicit, contradictory issue/page metadata
   // must not be presented as a match for the requested bibliography.
   const requestedPages=publicationPages(reference);
   const listed=publicationPages((anchor.closest('li,article,.result,.searchResult,.search-result,.item')||anchor.parentElement||anchor).textContent||'');
   if(requestedPages&&listed&&!matchingPublicationPages(reference,(anchor.closest('li,article,.result,.searchResult,.search-result,.item')||anchor.parentElement||anchor).textContent||''))continue;
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
 if(response.status!==200)throw Error('WOL HTTP '+response.status+
   (response.status===403||response.status===429?' : accès automatisé limité.':''));
 const html=response.text||'';
 const title=new DOMParser().parseFromString(html,'text/html').title.toLowerCase();
 if(/(?:access denied|just a moment|captcha|robot check|forbidden|accès refusé)/i.test(title))
   throw Error('WOL refuse la consultation automatisée de cette page.');
 if(!html.trim()||!/<(?:html|body|main|article|div|p)\b/i.test(html))
   throw Error('WOL a répondu sans document HTML exploitable.');
 return html;
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
 let networkProblem='';
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
 }catch(error){
   networkProblem=error instanceof Error?error.message:'Requête WOL interrompue';
   // WOL can fail to expose a JavaScript redirect on the /l/ endpoint.
   // Try the official bibliographic result listing instead of fabricating content.
 }
 if(!docUrl){
   const page=publicationPages(query);
   // Prefer an issue search for citations inside a document's page range.
   const searchTerms=page?[page.issue,query]:[query];
   for(const term of searchTerms){
     const fallback=WOL+'s/r30/lp-f?'+new URLSearchParams({q:term});
     try{
       docUrl=pickDocument(await officialText(fallback),fallback,query);
       if(docUrl)break;
     }catch(error){
       networkProblem+=(networkProblem?' ; ':'')+
         (error instanceof Error?error.message:'Recherche WOL indisponible');
     }
   }
 }
 docUrl=docUrl||knownCitation(query);
 if(!docUrl){
   const empty=parseWolDocument(text||'<main></main>',lookup,query);
   empty.lines=[];
   empty.notice=networkProblem
      ?'Impossible de récupérer cette référence depuis WOL : '+networkProblem+'. Ouvre la source officielle.'
      :'Référence non résolue automatiquement. Vérifie le lien sur WOL.';
   empty.kind='results';return empty;
 }
 const article=readerForDocument(await officialText(docUrl),docUrl,query);
 article.kind='article';
 return article;
}
interface JwVerseExtras {
 html:string;citation?:string;
 footnotes?:{content?:string;source?:string}[];
 crossReferences?:{source?:string;targets?:{vs?:string;standardCitation?:string}[]}[];
 commentaries?:{content?:string;source?:string}[];
}
export function parseOfficialVerseExtras(entry:JwVerseExtras,ref:ReferenceEntry):ReaderResult {
 const scripture=parseScripture(ref.label);
 if(!scripture)throw Error('Référence de verset invalide.');
 const lines:ReaderResult['lines']=[];
 const text=readableOfficialHtml(entry.html,'verse')
   .replace(new RegExp('^'+scripture.verse+'(?=\\s)'),'').trim();
 if(text)lines.push({type:'verse',text});
 for(const note of entry.footnotes||[]){
   const value=readableOfficialHtml(note.content||'','note');
   if(value)lines.push({type:'note',text:value,source:meaningfulNoteSource(note.source)});
 }
 for(const commentary of entry.commentaries||[]){
   const value=readableOfficialHtml(commentary.content||'','note');
   if(value)lines.push({type:'study',text:value,source:meaningfulNoteSource(commentary.source)});
 }
 const links:ReaderResult['links']=[];
 const linked=new Set<string>();
 for(const row of entry.crossReferences||[]){
   const labels:string[]=[];
   for(const target of row.targets||[]){
     const citation=(target.standardCitation||'').trim();
     if(citation)labels.push(citation);
     const targetCode=(target.vs||'').replace(/[^0-9]/g,'');
     if(citation&&/^\d{8}$/.test(targetCode)){
       const book=Number(targetCode.slice(0,2)),chapter=Number(targetCode.slice(2,5));
       if(book>=1&&book<=66&&chapter>=1&&chapter<=150){
         const url=WOL+'b/r30/lp-f/nwt/'+book+'/'+chapter;
         const key=citation+'|'+url;
         if(!linked.has(key)){links.push({label:citation,url});linked.add(key);}
       }
     }
   }
   // Cross-references must not be mixed with commentary or footnotes.
   if(labels.length)lines.push({type:'crossref',text:labels.join(' · '),
     source:meaningfulNoteSource(row.source)});
 }
 if(!text)throw Error('Texte du verset absent.');
 return {title:entry.citation||scripture.label,
   sourceUrl:ref.url,kind:'verse',lines,links,
   notice:'Bible d’étude · texte, notes et renvois · jw.org'};
}
export async function fetchStudyVerse(ref:ReferenceEntry):Promise<ReaderResult>{
 const scripture=parseScripture(ref.label);
 if(!scripture)return fetchPublication(ref);
 const range=(n:number)=>String(scripture.book).padStart(2,'0')+String(scripture.chapter).padStart(3,'0')+String(n).padStart(3,'0');
 const one=range(scripture.verse), last=scripture.endVerse&&scripture.endVerse!==scripture.verse?range(scripture.endVerse):null;
 const key=(p:string)=>String(Number(p.slice(0,2)))+p.slice(2);
 const code=key(one)+(last?'-'+key(last):'');
 try{
   const response=await requestUrl({url:API+code,throw:false});
   if(response.status!==200)throw Error('API Bible : '+response.status);
   const data=response.json as {ranges?:Record<string,JwVerseExtras>};
   const entry=data?.ranges?.[code];
   if(!entry||typeof entry.html!=='string')throw Error('Verset absent des données reçues.');
   return parseOfficialVerseExtras(entry,ref);
 }catch{
   // WOL chapter pages have both an ordinary translation and the Study
   // edition. A single unavailable JW.org fragment must not empty the reader.
   const urls=[
     WOL+'b/r30/lp-f/nwt/'+scripture.book+'/'+scripture.chapter,
     WOL+'b/r30/lp-f/nwtsty/'+scripture.book+'/'+scripture.chapter
   ];
   let partial:ReaderResult|null=null;
   for(const url of urls){
     try{
       const parsed=parseWolDocument(await officialText(url),url,scripture.label);
       if(parsed.lines.some(line=>line.type==='verse'))return parsed;
       if(parsed.lines.length&&!partial)partial=parsed;
     }catch{ /* Try the next official translation. */ }
   }
   if(partial){
     partial.notice='Texte du verset non isolé ; notes et sources officielles disponibles. Vérifie le passage sur WOL.';
     return partial;
   }
   return {
     title:scripture.label,sourceUrl:urls[0],kind:'verse',lines:[],links:[],
     notice:'Aucune des deux sources officielles n’a fourni le texte exact du verset au lecteur. Utilise le lien WOL pour le consulter.'
   };
 }
}
export async function fetchReferenceContent(ref:ReferenceEntry):Promise<ReaderResult>{
 return ref.kind==='scripture'?fetchStudyVerse(ref):fetchPublication(ref);
}
