import { requestUrl } from 'obsidian';
import { normalizeSearch, parseScripture } from './bibleLabData';
import { cleanWolUrl, parseWolDocument, type ReaderResult, type ReferenceEntry } from './referenceReader';
import { readableOfficialHtml, meaningfulNoteSource, cleanReadingText, verseCrossReferenceOffsets } from './readerText.ts';
import { finderDocumentUrl, bookChapterLocator } from './publicationReferences.ts';

const WOL='https://wol.jw.org/fr/wol/';
const API='https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/livres/json/html/';
const DOC=/\/fr\/wol\/d\/r30\/lp-f\/\d+/;
const BIBLIO=/^(?:w\d{2}(?:\.\d{1,2})?|ws\d{2}|g\d{2}|mwb\d{2}|it(?:-[12])?|si|km|lmd)\b/i;
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
 if(!match){
   // Issues from the 1980s-2015 are indexed as w14 15/11 28-29
   // (and can include optional "p."), not "w14 novembre".
   const legacy=t.match(/\b((?:w|ws|g)\d{2})\s+(\d{1,2})\/(\d{1,2})\s+(?:p\.?\s*)?(\d{1,3})(?:\s*-\s*(\d{1,3}))?\b/i);
   if(!legacy)return null;
   const day=Number(legacy[2]),month=Number(legacy[3]);
   const first=Number(legacy[4]),last=Number(legacy[5]||legacy[4]);
   if(day<1||day>31||month<1||month>12||first<1||last<first||last>300)return null;
   return {issue:legacy[1]+' '+day+'/'+month,first,last};
 }
 const first=Number(match[3]),last=Number(match[4]||match[3]);
 if(first<1||last<first||last>300)return null;
 return {issue:match[1]+' '+match[2],first,last};
}
export function matchingPublicationPages(requested:string,listing:string):boolean{
 const a=publicationPages(requested),b=publicationPages(listing);
 return !!a&&!!b&&a.issue===b.issue&&b.first<=a.first&&b.last>=a.last;
}
interface BookPage {code:string;first:number;last:number}
export function publicationBookPages(raw:string):BookPage|null{
 const norm=normalizeSearch(raw).replace(/[–—]/g,'-');
 const match=norm.match(/^(it-[12]|si)\s+(?:p\.?\s*)?(\d{1,4})(?:\s*-\s*(\d{1,4}))?(?=\s|$)/);
 if(!match)return null;
 const first=Number(match[2]),last=Number(match[3]||match[2]);
 return first>0&&last>=first&&last<=2000?{code:match[1],first,last}:null;
}
export function selectBookPageCandidate(html:string,base:string,reference:string):string|null{
 const wanted=publicationBookPages(reference);
 if(!wanted)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 let best:string|null=null,span=Infinity;
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(a.getAttribute('href')||'',base);
  if(!href)continue;
  const row=a.closest('li,article,.result,.searchResult,.search-result,.item')||a.parentElement;
  const visible=normalizeSearch((row?.textContent||'').slice(0,1100));
  const labels=[...visible.matchAll(new RegExp('(?:^|[^a-z0-9])'+
    wanted.code.replace('-','\\-')+'\\s+(?:p\\.?\\s*)?(\\d{1,4})(?:\\s*-\\s*(\\d{1,4}))?','g'))];
  for(const item of labels){
   const first=Number(item[1]),last=Number(item[2]||item[1]);
   if(first<=wanted.first&&last>=wanted.last&&last-first<span){
    span=last-first;best=href;
   }
  }
 }
 return best;
}
/** The official Insight *index by subjects* supplies linked article headings
 * whose printed page spans are explicit: e.g. Congrégation — 1:509-511.
 * Unlike /wol/l, these links point to the actual article through /wol/pc.
 * Do not use subordinate topic links: those often belong to other articles.
 */
export function selectInsightIndexArticle(html:string,reference:string):string|null{
 const wanted=publicationBookPages(reference);
 if(!wanted||!/^it-[12]$/.test(wanted.code))return null;
 const volume=Number(wanted.code.slice(-1));
 const doc=new DOMParser().parseFromString(html,'text/html');
 const ranges=new RegExp('(?:^|[^\\d])'+volume+'\\s*:\\s*(\\d{1,4})(?:\\s*[-–—]\\s*(\\d{1,4}))?','g');
 let best:{url:string;span:number}|null=null;
 for(const heading of doc.querySelectorAll('h2,h3,h4')){
  for(const anchor of heading.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const text=normalizeSearch(anchor.textContent||'').replace(/[–—]/g,'-');
   for(const m of text.matchAll(ranges)){
    const first=Number(m[1]),last=Number(m[2]||m[1]);
    if(first>wanted.first||last<wanted.last||last<first)continue;
    let href:string;
    try{href=new URL(anchor.getAttribute('href')||'',WOL).toString();}catch{continue;}
    const direct=validateDocument(href,WOL);
    const related=/^https:\/\/wol\.jw\.org\/fr\/wol\/pc\/r30\/lp-f\/1200004775\/\d+\/\d+$/.test(href);
    if(!direct&&!related)continue;
    if(!best||last-first<best.span)best={url:direct||href,span:last-first};
   }
  }
 }
 return best?.url||null;
}

export function insightTitleReference(reference:string):{code:string;title:string}|null{
 const normalized=normalizeSearch(reference).replace(/[«»“”"]/g,'"');
 const match=normalized.match(/^(it(?:-[12])?)\s+"([^"]{2,95})"(?:\s*§\s*\d{1,3})?$/);
 return match?{code:match[1],title:match[2].trim()}:null;
}
export function siStudyNumber(reference:string):number|null{
 const m=normalizeSearch(reference).match(/^si\s+(?:etude(?:\s+numero)?|et\.)\s*(\d{1,2})$/);
 if(!m)return null;
 const number=Number(m[1]);
 return number>=1&&number<=10?number:null;
}
export function selectSiStudyCandidate(html:string,base:string,reference:string):string|null{
 const number=siStudyNumber(reference);
 if(!number)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 const check=new RegExp('(?:étude|etude)\\s+(?:numéro|numero|n°)?\\s*'+number+'\\b','i');
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const target=validateDocument(link.getAttribute('href')||'',base);
  if(!target)continue;
  const row=link.closest('li,article,.result,.searchResult,.search-result,.item')||link.parentElement;
  if(check.test(normalizeSearch((row?.textContent||'').slice(0,900))))return target;
 }
 return null;
}
export function selectInsightCandidate(html:string,base:string,reference:string):string|null{
 const wanted=insightTitleReference(reference);
 if(!wanted)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 const query=normalizeSearch(wanted.title);
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(a.getAttribute('href')||'',base);
  if(!href)continue;
  const row=a.closest('li,article,.result,.searchResult,.search-result,.item')||a.parentElement;
  const text=normalizeSearch((row?.textContent||'').slice(0,900));
  if(!text.includes(query))continue;
  // For unnumbered it citations, the volume is unknown. Only accept a
  // title when its associated result explicitly identifies the publication.
  if(wanted.code==='it'?/\bit-[12]\b/.test(text):text.includes(wanted.code))
   return href;
 }
 return null;
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

/** Choose a book chapter only when the WOL results explicitly identify it. */
export function selectBookChapterCandidate(html:string,base:string,reference:string):string|null{
 const wanted=bookChapterLocator(reference);
 if(!wanted)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 const marker=new RegExp('(?:^|[^a-z0-9])'+wanted.code.replace(/[-]/g,'\\-')+
  '\\s+chap(?:itre)?\\.?\\s*'+wanted.chapter+'\\b','i');
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(a.getAttribute('href')||'',base);
  if(!href)continue;
  const row=a.closest('li,article,.result,.searchResult,.search-result,.item')||a.parentElement;
  if(marker.test(normalizeSearch((row?.textContent||'').slice(0,1200))))return href;
 }
 return null;
}

function pickDocument(html:string,base:string,reference:string):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const requested=simple(reference);
 const exact=selectPublicationCandidate(html,base,reference);
 if(exact)return exact;
 const bookPage=publicationBookPages(reference);
 if(bookPage)return selectBookPageCandidate(html,base,reference);
 const insight=insightTitleReference(reference);
 if(insight)return selectInsightCandidate(html,base,reference);
 const study=siStudyNumber(reference);
 if(study)return selectSiStudyCandidate(html,base,reference);
 const chapter=bookChapterLocator(reference);
 if(chapter){
   // Do not silently open chapter 1 for a request about chapter 8.
   return selectBookChapterCandidate(html,base,reference);
 }
 // WOL may redirect the /l/ query to a /d/ document in its canonical metadata.
 const canonical=doc.querySelector('link[rel="canonical"],meta[property="og:url"]');
 const canonicalHref=canonical?.getAttribute('href')||canonical?.getAttribute('content');
 const canonicalDoc=canonicalHref&&validateDocument(canonicalHref,base);
 if(canonicalDoc)return canonicalDoc;
 // Page-range citations cannot be resolved by keyword overlap alone:
 // a WOL search often returns neighbouring articles from the same issue.
 // Prefer a citation with matching page metadata, or a verified fallback.
 if(publicationPages(reference)||publicationBookPages(reference)||insightTitleReference(reference)||siStudyNumber(reference))
   return null;
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
export function knownCitation(reference:string):string|null{
 // Verified book spans: links into the middle of a chapter/article must open
 // the document itself rather than the WOL site's bibliographic navigation.
 const exact=publicationBookPages(reference);
 if(exact?.code==='si'&&exact.first>=199&&exact.last<=205)
   return WOL+'d/r30/lp-f/1101990105'; // Livre de la Bible numéro 44 — Actes
 if(exact?.code==='it-1'&&exact.first===510&&exact.last===510)
   return WOL+'d/r30/lp-f/1200001021'; // Congrégation, tome 1, p. 510
 if(siStudyNumber(reference)===10)
   return WOL+'d/r30/lp-f/1101990137';
 const historic=publicationPages(reference);
 if(historic?.issue==='w14 15/11'&&historic.first>=28&&historic.last<=30)
   return WOL+'d/r30/lp-f/2014847';
 const insight=insightTitleReference(reference);
 if(insight?.code==='it-2'&&insight.title==='sanctuaire')
   return WOL+'d/r30/lp-f/1200003828';
 const book=publicationBookPages(reference);
 if(book?.code==='si'&&book.first>=337&&book.last<=349)
   return WOL+'d/r30/lp-f/1101990137';
 if(book?.code==='si'&&book.first>=5&&book.last<=6)
   return WOL+'d/r30/lp-f/1101990140';
 // Full articles verified against WOL's own publication metadata.
 // A single cited page may fall inside the complete page range.
 const citation=publicationPages(reference);
 if(citation?.issue==='w16 aout'&&citation.first>=25&&citation.last<=29)
   return WOL+'d/r30/lp-f/2016609'; // w16 août p. 25-29
 if(citation?.issue==='w20 juin'&&citation.first>=24&&citation.last<=29)
   return WOL+'d/r30/lp-f/2020441'; // w20 juin p. 24-29
 // Small verified fallbacks for sources whose WOL bibliography /l/ redirects
 // are inaccessible in Obsidian. Never extrapolate an unverified document ID.
 if(/^w24\s+novembre\s+p\.?\s*14\s*[-–]\s*19$/i.test(reference.trim()))
   return WOL+'d/r30/lp-f/2024642';
 const pages=publicationPages(reference);
 if(pages?.issue==='w18 fevrier' && pages.first>=23 && pages.last<=27)
   return WOL+'d/r30/lp-f/2018287';
 if(/^lmd\s+(?:leçon\s*)?11$/i.test(reference.trim()))
   return WOL+'d/r30/lp-f/1102023311';
 return null;
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
/** The SI book and study articles occupy an ordered official WOL document
 * sequence. IDs are used ONLY as candidates: each downloaded document must
 * state its actual SI page range, or it is discarded. No guessed link is shown.
 * A binary search needs at most seven requests rather than 78 full articles.
 */
export function siDocumentPageRange(html:string):{first:number;last:number}|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const body=cleanReadingText(doc.body?.textContent||'').slice(0,2600);
 const match=body.match(/(?:^|[^\p{L}\p{N}])si\s+p\.?\s*(\d{1,4})\s*[-–—]\s*(\d{1,4})(?=\s|$)/u);
 if(!match)return null;
 const first=Number(match[1]),last=Number(match[2]);
 return first>0&&last>=first&&last<=400?{first,last}:null;
}
const siPageCache=new Map<string,string>();
async function findSiDocumentByPage(reference:string):Promise<string|null>{
 const request=publicationBookPages(reference);
 if(!request||request.code!=='si')return null;
 const key=request.first+'-'+request.last;
 const cached=siPageCache.get(key);
 if(cached)return cached;
 // Official 1990s SI articles are ordered: introductory chapter, 66 Bible
 // books, then 10 studies. Always inspect real article metadata before use.
 let low=1101990061,high=1101990137,iterations=0;
 while(low<=high&&iterations++<9){
  const middle=Math.floor((low+high)/2);
  const url=WOL+'d/r30/lp-f/'+middle;
  let html:string;
  try{html=await officialText(url);}catch{break;}
  const range=siDocumentPageRange(html);
  if(!range)break; // Missing metadata: do not assume candidate is correct
  if(range.first<=request.first&&range.last>=request.last){
   siPageCache.set(key,url);return url;
  }
  if(request.first>range.last)low=middle+1;
  else if(request.last<range.first)high=middle-1;
  else break; // Crosses two articles; cannot claim one exact match
 }
 return null;
}
const insightPageCache=new Map<string,string>();
async function findInsightDocumentByIndex(reference:string):Promise<string|null>{
 const requested=publicationBookPages(reference);
 if(!requested||!/^it-[12]$/.test(requested.code))return null;
 const key=requested.code+':'+requested.first+'-'+requested.last;
 const cached=insightPageCache.get(key);
 if(cached)return cached;
 const indexUrl=WOL+'d/r30/lp-f/1200004775';
 const index=await officialText(indexUrl);
 const link=selectInsightIndexArticle(index,reference);
 if(!link)return null;
 // The index links /wol/pc/ resolve to the full article. Check the actual
 // volume in the returned HTML to avoid using index links as document text.
 const html=await officialText(link);
 const document=new DOMParser().parseFromString(html,'text/html');
 const intro=cleanReadingText(document.body?.textContent||'').slice(0,1600);
 const expected=new RegExp('(?:^|[^a-z0-9])'+requested.code.replace('-','\\-')+
  '\\s+[«“"\\u201c]','i');
 if(!expected.test(normalizeSearch(intro)))return null;
 if(!hasReadableArticleBody(parseWolDocument(html,link,reference)))return null;
 insightPageCache.set(key,link);
 return link;
}
function hasReadableArticleBody(result:ReaderResult):boolean{
 return result.lines.some(line=>line.type!=='heading'&&line.type!=='caption'&&
  line.type!=='image'&&line.text.trim().length>=8);
}
function readerForDocument(html:string,url:string,label:string):ReaderResult{
 const result=parseWolDocument(html,url,label);
 if(!hasReadableArticleBody(result))
   throw Error('La page officielle a répondu, mais Bible Lab ne reconnaît pas sa structure HTML. Consulte le document directement sur WOL.');
 return result;
}
/** An existing official page may send a dynamic shell instead of its article
 * body to Obsidian's HTTP client. Do not claim WOL has no text.
 * Keep the canonical source link and explain the local reader limitation.
 */
function directDocumentReader(html:string,url:string,label:string):ReaderResult{
 const result=parseWolDocument(html,url,label);
 if(!hasReadableArticleBody(result)){
   result.lines=[];
   result.notice='La page officielle a répondu, mais son texte ne peut pas être extrait dans Obsidian (structure HTML ou chargement dynamique). Ouvre ce document sur WOL pour le lire.';
 }
 return result;
}
export async function fetchPublication(ref:ReferenceEntry):Promise<ReaderResult>{
 const url=canonicalReferenceUrl(ref.url);
 if(!url)throw Error('Référence WOL non reconnue.');
 const path=new URL(url).pathname;
 const finderDocument=finderDocumentUrl(url);
 if(finderDocument){
   const result=directDocumentReader(await officialText(finderDocument),finderDocument,ref.label);
   // Preserve the exact paragraph destination for the official-site button.
   result.sourceUrl=url;
   result.kind='article';
   return result;
 }
 if(DOC.test(path)||path.startsWith('/fr/wol/b/')){
   return directDocumentReader(await officialText(url),url,ref.label);
 }
 if(!path.startsWith('/fr/wol/l/')&&!path.startsWith('/fr/wol/s/'))
   throw Error('Cette source ne correspond pas à une page WOL consultable.');
 const query=new URL(url).searchParams.get('q')?.trim()||ref.label;
 // A small set of source IDs was verified directly on WOL. Try those
 // first, so a known article is not held hostage by broken /l/ redirects
 // or by the /s/ search HTML. Fall back to ordinary resolution if blocked.
 const verified=knownCitation(query);
 if(verified){
   try{
     const article=readerForDocument(await officialText(verified),verified,query);
     article.kind='article';
     return article;
   }catch{ /* Continue through official bibliography lookup. */ }
 }
 // Book page numbers are not keywords. Resolve them using the official
 // publication structure instead of expecting /l?q=it-1+118 to be an article.
 const bookPages=publicationBookPages(query);
 if(bookPages){
   try{
     const matched=bookPages.code==='si'
       ?await findSiDocumentByPage(query)
       :await findInsightDocumentByIndex(query);
     if(matched){
       const article=readerForDocument(await officialText(matched),matched,query);
       article.kind='article';return article;
     }
   }catch{ /* One structured source failed: try the standard WOL results. */ }
 }
 const lookup=path.startsWith('/fr/wol/s/')
   ? WOL+'l/r30/lp-f?'+new URLSearchParams({q:query}):url;
 let text='';let docUrl:string|null=null;
 let networkProblem='';
 try{
   text=await officialText(lookup);
   // /wol/l and /wol/s are search and navigation pages. Even if their
   // HTML contains several paragraphs, it must NEVER be read as the article.
   // Only a resolved /wol/d or verified publication-index /wol/pc may be read.
   docUrl=pickDocument(text,lookup,query);
 }catch(error){
   networkProblem=error instanceof Error?error.message:'Requête WOL interrompue';
   // WOL can fail to expose a JavaScript redirect on the /l/ endpoint.
   // Try the official bibliographic result listing instead of fabricating content.
 }
 if(!docUrl){
   const page=publicationPages(query);
   // Prefer an issue search for citations inside a document's page range.
   const issueLabel=page?query.trim().replace(/\s+p\.?\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*$/i,''):'';
   const searchTerms=page?[issueLabel||page.issue,query]:[query];
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
 const markerTargets:ReaderResult['links'][]=[];
 for(const row of entry.crossReferences||[]){
   const labels:string[]=[];
   const rowLinks:ReaderResult['links']=[];
   for(const target of row.targets||[]){
     const citation=cleanReadingText(target.standardCitation||'');
     if(citation)labels.push(citation);
     const targetCode=(target.vs||'').replace(/[^0-9]/g,'');
     if(citation&&/^\d{8}$/.test(targetCode)){
       const book=Number(targetCode.slice(0,2)),chapter=Number(targetCode.slice(2,5));
       if(book>=1&&book<=66&&chapter>=1&&chapter<=150){
         const url=WOL+'b/r30/lp-f/nwt/'+book+'/'+chapter;
         const key=citation+'|'+url;
         const item={label:citation,url};
         if(!rowLinks.some(link=>link.label===citation&&link.url===url))rowLinks.push(item);
         if(!linked.has(key)){links.push(item);linked.add(key);}
       }
     }
   }
   // Cross-references must not be mixed with commentary or footnotes.
   if(labels.length){
     lines.push({type:'crossref',text:labels.join(' · '),
       source:meaningfulNoteSource(row.source),references:rowLinks});
     markerTargets.push(rowLinks);
   }
 }
 if(!text)throw Error('Texte du verset absent.');
 // Associate the discreet '+' cross-reference marker with this exact verse.
 const verse=lines.find(line=>line.type==='verse');
 if(verse&&links.length){
   verse.references=links;
   const positions=verseCrossReferenceOffsets(entry.html,scripture.verse);
   if(positions.length)verse.referenceMarkers=positions.map((offset,i)=>({
     offset,targets:markerTargets[i]||links
   }));
 }
 return {title:cleanReadingText(entry.citation||scripture.label),
   sourceUrl:ref.url,kind:'verse',lines,links,
   notice:'Bible d’étude · texte, notes et renvois · jw.org'};
}
export async function fetchStudyVerse(ref:ReferenceEntry):Promise<ReaderResult>{
 const scripture=parseScripture(ref.label);
 if(!scripture)return fetchPublication(ref);
 const requested=scripture.verses||[];
 if(requested.length>1){
   // Lists (2, 3) and ranges (1-4) are not single verses.
   // Fetch separately so that the UI never silently displays only verse 2.
   // A bounded queue avoids flooding JW.org for longer references.
   const chapters=scripture.label.split(':')[0];
   const collected:ReaderResult['lines']=[];
   const links:ReaderResult['links']=[];
   const known=new Set<string>();
   const missing:number[]=[];
   for(let offset=0;offset<requested.length;offset+=4){
     const batch=requested.slice(offset,offset+4);
     const results=await Promise.all(batch.map(verse=>
       fetchStudyVerse({...ref,label:chapters+':'+verse}).catch(()=>null)));
     for(let i=0;i<batch.length;i++){
       const verse=batch[i],result=results[i];
       if(!result){missing.push(verse);continue;}
       const content=result.lines.filter(line=>line.type==='verse'||line.type==='paragraph');
       if(!content.length){missing.push(verse);continue;}
       for(const line of content)collected.push({...line,type:'verse',number:String(verse),
         source:chapters+':'+verse});
       for(const line of result.lines)if(line.type!=='verse'&&line.type!=='paragraph')
         collected.push({...line,source:line.source||chapters+':'+verse});
       for(const link of result.links){
         const key=link.label+'|'+link.url;
         if(!known.has(key)){known.add(key);links.push(link);}
       }
     }
   }
   return {
     title:scripture.label,sourceUrl:WOL+'b/r30/lp-f/nwt/'+scripture.book+'/'+scripture.chapter,
     kind:'verse',lines:collected,links,
     ...(missing.length?{notice:'Certains versets ne sont pas disponibles dans le lecteur ('+
       missing.join(', ')+'). Consulte le chapitre sur WOL.'}:{})
   };
 }
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
