import { requestUrl } from 'obsidian';
import { normalizeSearch, parseScripture } from './bibleLabData';
import { cleanWolUrl, parseWolDocument, parseWolLookupResults, type ReaderResult, type ReferenceEntry } from './referenceReader';
import { readableOfficialHtml, readableOfficialElement, meaningfulNoteSource, cleanReadingText, verseCrossReferenceOffsets } from './readerText.ts';
import { finderDocumentUrl, bookChapterLocator, referencedParagraphs, findPublicationMentions } from './publicationReferences.ts';
import { publicationPages, matchingPublicationPages } from './wolCitationGrammar.ts';
export { publicationPages, matchingPublicationPages } from './wolCitationGrammar.ts';

const WOL='https://wol.jw.org/fr/wol/';
const API='https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/livres/json/html/';
const DOC=/\/fr\/wol\/d\/r30\/lp-f\/\d+/;
// WOL contextual publication pointers are valid reading destinations too.
const CONTEXT=/^\/fr\/wol\/pc\/r30\/lp-f\/\d+\/\d+\/\d+\/?$/;
// Bible cross-reference links (/bc/) redirect to a WOL chapter; keep them readable.
const BIBLE_CONTEXT=/^\/fr\/wol\/bc\/r30\/lp-f\/\d+\/\d+\/\d+\/?$/;
const BIBLIO=/^(?:w\d{2}(?:\.\d{1,2})?|ws\d{2}|g\d{2}|mwb\d{2}|it(?:-[12])?|si|km|lmd)\b/i;
const simple=(v:string)=>normalizeSearch(v).replace(/[^a-z0-9]+/g,' ').trim();
const validateDocument=(value:string,base:string):string|null=>{
 try{
   const final=cleanWolUrl(new URL(value,base).href);
   return final && (DOC.test(new URL(final).pathname)||CONTEXT.test(new URL(final).pathname))?final:null;
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

/** Resolve an Insight headword from the same official index (not WOL search).
 * Headings are article titles; their linked page span identifies the volume.
 */
export function selectInsightIndexTitle(html:string,reference:string):string|null{
 const wanted=insightTitleReference(reference);
 if(!wanted||!/^it-[12]$/.test(wanted.code))return null;
 const volume=Number(wanted.code.slice(-1));
 const title=normalizeSearch(wanted.title).replace(/[^a-z0-9]+/g,' ').trim();
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const heading of doc.querySelectorAll('h2,h3,h4')){
  const clone=heading.cloneNode(true) as Element;
  for(const link of [...clone.querySelectorAll('a')])link.remove();
  const headingTitle=normalizeSearch(clone.textContent||'')
    .replace(/[^a-z0-9]+/g,' ').trim();
  if(headingTitle!==title)continue;
  for(const link of heading.querySelectorAll<HTMLAnchorElement>('a[href]')){
   if(!new RegExp('(?:^|[^\\d])'+volume+'\\s*:\\s*\\d{1,4}').test(link.textContent||''))continue;
   let href:string;
   try{href=new URL(link.getAttribute('href')||'',WOL).toString();}catch{continue;}
   if(/^https:\/\/wol\.jw\.org\/fr\/wol\/pc\/r30\/lp-f\/1200004775\/\d+\/\d+$/.test(href))return href;
   const direct=validateDocument(href,WOL);
   if(direct)return direct;
  }
 }
 return null;
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

/** Choose a paragraph-specific result only when WOL includes an explicit
 * matching bibliographic citation WITH § in that very result row. Without
 * that evidence, two articles sharing a page remain an ambiguous choice. */
export function selectExplicitParagraphCandidate(html:string,base:string,reference:string):string|null{
 const paragraphs=referencedParagraphs(reference);
 const page=publicationPages(reference);
 if(!page||!paragraphs.length)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 const root=doc.querySelector('#lookupResults,.lookupResults,#searchResults,.searchResults,.search-results');
 if(!root)return null;
 const matches=new Set<string>();
 for(const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(anchor.getAttribute('href')||'',base);
  if(!href)continue;
  const row=anchor.closest('li,article,.result,.searchResult,.search-result,.item')||anchor.parentElement;
  if(!row)continue;
  const text=[
   row.textContent||'',...Array.from(row.querySelectorAll('p,span,small,.pubRef'))
     .map(node=>node.textContent||'')
  ].join(' ');
  const citations=findPublicationMentions(text);
  if(!citations.some(item=>{
    const found=referencedParagraphs(item.label);
    return found.length===paragraphs.length&&found.every(n=>paragraphs.includes(n))&&
      matchingPublicationPages(reference,item.label);
  }))continue;
  matches.add(href);
  if(matches.size>1)return null;
 }
 return matches.size===1?[...matches][0]:null;
}
/** Exact citations are resolved without silently accepting a wrong issue. */
export function selectPublicationCandidate(html:string,base:string,reference:string):string|null{
 const request=publicationPages(reference);
 if(!request)return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 let shortest=Number.POSITIVE_INFINITY;
 const candidates=new Set<string>();
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(a.getAttribute('href')||'',base);
  if(!href)continue;
  // The requested page(s) may be inside a wider article range (21-24
  // belongs to 20-25). Require authoritative matching issue/page metadata.
  const box=a.closest('li,article,.result,.searchResult,.search-result,.item')||a.parentElement;
  const visible=(box?.textContent||'').slice(0,900);
  const page=publicationPages(visible);
  if(!page||!matchingPublicationPages(reference,visible))continue;
  const range=page.last-page.first;
  if(range<shortest){candidates.clear();shortest=range;}
  if(range===shortest)candidates.add(href);
 }
 // Multiple articles can have the SAME printed page (e.g. km 5/00 p. 8).
 // Keep their choices in #lookupResults rather than pick the first one.
 return candidates.size===1?[...candidates][0]:null;
}

/** A WOL search may return several different articles printed on the same
 * page, especially the old Kingdom Ministry. Show those official choices
 * rather than silently selecting a wrong paragraph-2 article. */
export function matchingSearchResultChoices(html:string,base:string,reference:string):ReaderResult|null{
 if(!publicationPages(reference))return null;
 const doc=new DOMParser().parseFromString(html,'text/html');
 const root=doc.querySelector('#lookupResults,.lookupResults,#searchResults,.searchResults,.search-results,#results,.resultList');
 if(!root)return null; // Never turn global navigation links into results.
 const links:ReaderResult['links']=[];
 const seen=new Set<string>();
 for(const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const href=validateDocument(anchor.getAttribute('href')||'',base);
  if(!href||seen.has(href))continue;
  const row=anchor.closest('li,article,.result,.searchResult,.search-result,.item')||anchor.parentElement;
  if(!row)continue;
  const metadata=[
   row.textContent||'',
   ...[...row.querySelectorAll('.pubRef,.publication,p,small,span')].slice(0,20)
     .map(el=>el.textContent||'')
  ];
  if(!metadata.some(text=>matchingPublicationPages(reference,text)))continue;
  const label=cleanReadingText(anchor.textContent||row.querySelector('h2,h3,h4')?.textContent||'').slice(0,150);
  if(label.length<5)continue;
  seen.add(href);links.push({label,url:href});
  if(links.length>=12)break;
 }
 if(!links.length)return null;
 return {
  title:'Références officielles WOL',sourceUrl:base,kind:'results',links,
  lines:links.map(link=>({type:'paragraph',text:link.label,
   parts:[{text:link.label,url:link.url,kind:'document'}]})),
  notice:links.length>1
    ?'Plusieurs documents correspondent à cette page imprimée. Choisis le bon article sur WOL ; le numéro de paragraphe seul ne permet pas de les départager.'
    :'Document identifié dans les résultats WOL. Ouvre le lien pour lire son texte intégral.'
 };
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

/** A validated WOL /d result link must come from the lookup-result panel,
 * not from navigation, the sidebar or the site's footer.
 * WOL sometimes returns only one article and omits page metadata entirely.
 */
export function selectSingleLookupDocument(html:string,base:string,reference?:string):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const results=doc.querySelector('#lookupResults,.lookupResults');
 if(!results)return null;
 const candidates=new Set<string>();
 for(const anchor of results.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const url=validateDocument(anchor.getAttribute('href')||'',base);
   if(url){
     // A single result must never override explicit evidence that its issue
     // or page range contradicts the citation in the note.
     if(reference&&publicationPages(reference)){
       const row=anchor.closest('li,article,.result,.searchResult,.search-result,.item')||anchor.parentElement;
       const metadata=row?.textContent||'';
       if(publicationPages(metadata)&&!matchingPublicationPages(reference,metadata))
         return null;
     }
     candidates.add(url);
   }
   if(candidates.size>1)return null; // Ambiguous result: show WOL's choices.
 }
 return candidates.size===1?[...candidates][0]:null;
}
function pickDocument(html:string,base:string,reference:string):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 // Scope all bibliographic matching to results; a navigation link can
 // otherwise outscore the article returned by the actual WOL lookup.
 const resultNode=doc.querySelector('#lookupResults,.lookupResults');
 const matchHtml=resultNode?.outerHTML||html;
 const requested=simple(reference);
 // A WOL result carrying the exact § locator outranks a page-only match.
 const paragraph=selectExplicitParagraphCandidate(matchHtml,base,reference);
 if(paragraph)return paragraph;
 const exact=selectPublicationCandidate(matchHtml,base,reference);
 if(exact)return exact;
 const bookPage=publicationBookPages(reference);
 if(bookPage){
   const identified=selectBookPageCandidate(matchHtml,base,reference);
   return identified||selectSingleLookupDocument(html,base,reference);
 }
 const insight=insightTitleReference(reference);
 if(insight){
   const identified=selectInsightCandidate(matchHtml,base,reference);
   return identified||selectSingleLookupDocument(html,base,reference);
 }
 const study=siStudyNumber(reference);
 if(study){
   const identified=selectSiStudyCandidate(matchHtml,base,reference);
   return identified||selectSingleLookupDocument(html,base,reference);
 }
 const chapter=bookChapterLocator(reference);
 if(chapter){
   const identified=selectBookChapterCandidate(matchHtml,base,reference);
   return identified||selectSingleLookupDocument(html,base,reference);
 }
 const onlyResult=selectSingleLookupDocument(html,base,reference);
 if(onlyResult)return onlyResult;
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
 const anchors=[...(resultNode||doc).querySelectorAll<HTMLAnchorElement>('a[href]')];
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
 if(citation?.issue==='w16.08'&&citation.first>=25&&citation.last<=29)
   return WOL+'d/r30/lp-f/2016609'; // w16 août p. 25-29
 if(citation?.issue==='w20.06'&&citation.first>=24&&citation.last<=29)
   return WOL+'d/r30/lp-f/2020441'; // w20 juin p. 24-29
 // WOL explicitly identifies this 2024 study article as pages 20–25;
 // a citation to pp. 21–24 is a subset, not a missing publication.
 if(citation?.issue==='w24.11'&&citation.first>=20&&citation.last<=25)
   return WOL+'d/r30/lp-f/2024643';
 // Verified directly against the official article: pages 14-19 include
 // paragraphs 15-20, even if the citation requests only pages 17-19.
 if(citation?.issue==='w24.11'&&citation.first>=14&&citation.last<=19)
   return WOL+'d/r30/lp-f/2024642';
 // One confirmed page + paragraph destination from WOL. Do not assume
 // that §2 means the second item in the issue, or synthesize #h=n offsets.
 const paragraphs=referencedParagraphs(reference);
 if(citation?.issue==='km 5/00'&&citation.first===8&&citation.last===8&&
    paragraphs.length===1&&paragraphs[0]==='2')
   return WOL+'d/r30/lp-f/202000163#h=3';
 // Small verified fallbacks for sources whose WOL bibliography /l/ redirects
 // are inaccessible in Obsidian. Never extrapolate an unverified document ID.
 if(/^w24\s+novembre\s+p\.?\s*14\s*[-–]\s*19$/i.test(reference.trim()))
   return WOL+'d/r30/lp-f/2024642';
 const pages=publicationPages(reference);
 if(pages?.issue==='w18.02' && pages.first>=23 && pages.last<=27)
   return WOL+'d/r30/lp-f/2018287';
 if(/^lmd\s+(?:leçon\s*)?11$/i.test(reference.trim()))
   return WOL+'d/r30/lp-f/1102023311';
 return null;
}
/** Validated HTML only: small memory cache to avoid repeated WOL calls for
 * a citation, its popup and its reading pane. Rejected/blocked responses are
 * never cached; concurrent requests for one official URL are deduplicated.
 * No background crawl, persistent site mirror or undocumented endpoint.
 */
const htmlCache=new Map<string,{html:string;expires:number}>();
const pendingHtml=new Map<string,Promise<string>>();
const MAX_HTML_ENTRIES=12;
const MAX_CACHED_HTML_LENGTH=180_000;
async function officialText(url:string,verbatimSearch=false):Promise<string>{
 // /wol/s is the official search fallback. Do not rewrite it to /wol/l:
 // that would repeat the *same* empty bibliographic shell instead of
 // querying WOL's search-result list.
 let safe:string|null=canonicalReferenceUrl(url);
 if(verbatimSearch){
   try{
     const parsed=new URL(url);
     if(parsed.protocol==='https:'&&parsed.hostname==='wol.jw.org'&&
       !parsed.username&&!parsed.password&&
       parsed.pathname==='/fr/wol/s/r30/lp-f'&&
       !!parsed.searchParams.get('q')?.trim()){
       parsed.hash='';safe=parsed.toString();
     }else safe=null;
   }catch{safe=null;}
 }
 if(!safe)throw Error('Adresse WOL externe non autorisée.');
 // Fragments such as #h=3 are client-side reading positions. Keep them
 // for the WOL button, but never send them in an HTTP request or cache key.
 const requestTarget=new URL(safe);
 requestTarget.hash='';
 safe=requestTarget.toString();
 const cached=htmlCache.get(safe);
 if(cached){
   htmlCache.delete(safe);
   if(cached.expires>Date.now()){
     htmlCache.set(safe,cached); // LRU: recently read documents stay hot.
     return cached.html;
   }
 }
 const pending=pendingHtml.get(safe);
 if(pending)return pending;
 const work=(async()=>{
   const response=await requestUrl({url:safe,throw:false});
   if(response.status!==200)throw Error('WOL HTTP '+response.status+
     (response.status===403||response.status===429?' : accès automatisé limité.':''));
   const html=response.text||'';
   const document=new DOMParser().parseFromString(html,'text/html');
   const title=document.title.toLowerCase();
   const preliminary=cleanReadingText(document.body?.textContent||'').slice(0,1300);
   if(/javascript is disabled|verify that you(?:’|'| a)re not a robot|vérifi(?:er|cation).{0,45}(?:robot|navigateur)|enable javascript and then reload/i.test(preliminary))
     throw Error('WOL demande une vérification du navigateur : la réponse ne contient pas le document.');
   if(/(?:access denied|just a moment|captcha|robot check|forbidden|accès refusé)/i.test(title))
     throw Error('WOL refuse la consultation automatisée de cette page.');
   if(!html.trim()||!/<(?:html|body|main|article|div|p)\b/i.test(html))
     throw Error('WOL a répondu sans document HTML exploitable.');
   if(html.length<=MAX_CACHED_HTML_LENGTH){
     const brief=/\/wol\/(?:l|s)\//.test(safe);
     htmlCache.set(safe,{html,expires:Date.now()+(brief?60_000:600_000)});
     while(htmlCache.size>MAX_HTML_ENTRIES)
       htmlCache.delete(htmlCache.keys().next().value!);
   }
   return html;
 })();
 pendingHtml.set(safe,work);
 try{return await work;}
 finally{pendingHtml.delete(safe);}
}
/** The SI book and study articles occupy an ordered official WOL document
 * sequence. IDs are used ONLY as candidates: each downloaded document must
 * state its actual SI page range, or it is discarded. No guessed link is shown.
 * A binary search needs at most seven requests rather than 78 full articles.
 */
export function siDocumentPageRange(html:string):{first:number;last:number}|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 // textContent joins neighbouring block tags without spaces. On real WOL
 // pages the title may concatenate with "si p. 199-205", hiding the
 // publication label from a naive whole-page regex.
 const pattern=/(?:^|[^\p{L}\p{N}])si\s+p\.?\s*(\d{1,4})\s*[-–—]\s*(\d{1,4})(?=\s|$|[.,;])/u;
 const candidates=[
   ...doc.querySelectorAll('.pubRef,.pubCitation,.publicationCitation,[class*="publicationCitation"],p,span,div')
 ].slice(0,180);
 for(const node of candidates){
   const text=cleanReadingText(node.textContent||'').slice(0,2000);
   const match=text.match(pattern);
   if(!match)continue;
   const first=Number(match[1]),last=Number(match[2]);
   if(first>0&&last>=first&&last<=400)return {first,last};
 }
 return null;
}
/** WOL's own SI table of contents links every study directly and lists
 * its printed starting page. This is safer than guessing document IDs.
 */
const SI_CONTENTS=WOL+'d/r30/lp-f/1101990140';
let siContentsPromise:Promise<string>|null=null;
function loadSiContents():Promise<string>{
 if(!siContentsPromise)
  siContentsPromise=officialText(SI_CONTENTS)
   .catch(error=>{siContentsPromise=null;throw error;});
 return siContentsPromise;
}
export function selectSiContentsCandidates(html:string,reference:string):string[]{
 const request=publicationBookPages(reference);
 if(!request||request.code!=='si')return [];
 const doc=new DOMParser().parseFromString(html,'text/html');
 const entries:{start:number;url:string}[]=[];
 // The volume's table has items "199 44 Actes" and "337 10 La Bible...".
 // The later illustration links must not be interpreted as chapters.
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  let url:URL;
  try{url=new URL(a.getAttribute('href')||'',SI_CONTENTS);}catch{continue;}
  const match=url.pathname.match(/^\/fr\/wol\/pc\/r30\/lp-f\/1101990140\/(\d+)\/\d+$/);
  if(url.protocol!=='https:'||url.hostname!=='wol.jw.org'||!match||
    Number(match[1])>76)continue;
  const row=a.closest('p,li,tr')||a.parentElement;
  if(!row)continue;
  // In actual WOL markup the page number appears before the article link.
  // Do not treat the book/study number inside the linked title as a page.
  const full=cleanReadingText(row.textContent||'');
  const label=cleanReadingText(a.textContent||'');
  const before=full.slice(0,full.indexOf(label));
  const candidates=[before,cleanReadingText(a.previousSibling?.textContent||'')];
  const page=candidates.map(x=>x.match(/(?:^|[^\d])(\d{1,3})\s*$/))
    .find(Boolean);
  if(!page)continue;
  const start=Number(page[1]);
  if(start>=5&&start<=360&&start<=request.first)
   entries.push({start,url:url.toString()});
 }
 // The nearest preceding entry is usually correct; inspect up to four
 // competing/overlapping articles and verify their own printed page spans.
 return [...new Map(entries.sort((a,b)=>b.start-a.start)
   .map(row=>[row.url,row.url])).values()].slice(0,4);
}
const siPageCache=new Map<string,string>();
async function findSiDocumentByPage(reference:string):Promise<string|null>{
 const request=publicationBookPages(reference);
 if(!request||request.code!=='si')return null;
 const key=request.first+'-'+request.last;
 const cached=siPageCache.get(key);
 if(cached)return cached;
 const candidateUrls=selectSiContentsCandidates(await loadSiContents(),reference);
 for(const url of candidateUrls){
  let html:string;
  try{html=await officialText(url);}catch{continue;}
  const range=siDocumentPageRange(html);
  if(!range||range.first>request.first||range.last<request.last)continue;
  if(!hasReadableArticleBody(parseWolDocument(html,url,reference)))continue;
  siPageCache.set(key,url);
  return url;
 }
 return null;
}
const insightPageCache=new Map<string,string>();
let insightIndexPromise:Promise<string>|null=null;
function loadInsightIndex():Promise<string>{
 if(!insightIndexPromise)
   insightIndexPromise=officialText(WOL+'d/r30/lp-f/1200004775')
     .catch(error=>{insightIndexPromise=null;throw error;});
 return insightIndexPromise;
}
async function findInsightDocumentByTitle(reference:string):Promise<string|null>{
 const title=insightTitleReference(reference);
 if(!title||!/^it-[12]$/.test(title.code))return null;
 const key=title.code+':"'+normalizeSearch(title.title)+'"';
 const cached=insightPageCache.get(key);
 if(cached)return cached;
 const link=selectInsightIndexTitle(await loadInsightIndex(),reference);
 if(!link)return null;
 const html=await officialText(link);
 const doc=new DOMParser().parseFromString(html,'text/html');
 const intro=normalizeSearch(cleanReadingText(doc.body?.textContent||'').slice(0,1400));
 if(!intro.includes(title.code)||!intro.includes(normalizeSearch(title.title)))return null;
 if(!hasReadableArticleBody(parseWolDocument(html,link,reference)))return null;
 insightPageCache.set(key,link);
 return link;
}
async function findInsightDocumentByIndex(reference:string):Promise<string|null>{
 const requested=publicationBookPages(reference);
 if(!requested||!/^it-[12]$/.test(requested.code))return null;
 const key=requested.code+':'+requested.first+'-'+requested.last;
 const cached=insightPageCache.get(key);
 if(cached)return cached;
 const index=await loadInsightIndex();
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
function isNavigationShell(result:ReaderResult):boolean{
 // Test the TITLE OF THE ISOLATED DOCUMENT, not the first <h1> in the entire
 // WOL page: a real article may follow a generic site navigation heading.
 const title=normalizeSearch(result.title).replace(/\s+/g,' ');
 // WOL may return "Rechercher — Bibliothèque en ligne Watchtower" or
 // "Consulter - ..." with enough menu paragraphs to fool a length check.
 // The actual article title is isolated before testing this predicate.
 return /^(?:(?:consulter|rechercher)(?:\s*[-–—|:]\s*bibliotheque en ligne watchtower)?|bibliotheque en ligne watchtower|watchtower bibliotheque en ligne)$/.test(title);
}
function readerForDocument(html:string,url:string,label:string):ReaderResult{
 const result=parseWolDocument(html,url,label);
 if(isNavigationShell(result))
   throw Error('WOL a renvoyé un menu de navigation, pas un article.');
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
 if(isNavigationShell(result))
   return {title:label,sourceUrl:url,kind:'results',lines:[],links:[],
     notice:'WOL a renvoyé son menu plutôt que le texte du document. Ouvre la source officielle.'};
 if(!hasReadableArticleBody(result)){
   result.lines=[];
   result.notice='La page officielle a répondu, mais son texte ne peut pas être extrait dans Obsidian (structure HTML ou chargement dynamique). Ouvre ce document sur WOL pour le lire.';
 }
 return result;
}
/** WOL /pc/ and /bc/ links are contextual navigation, not separate
 * publications. If their response is only a navigation shell, follow ONLY
 * the page's own canonical official document URL (never a menu/sidebar link).
 */
export function canonicalContextDestination(html:string,base:string):string|null {
 const doc=new DOMParser().parseFromString(html,'text/html');
 // The canonical tag may point back to /pc/ while og:url identifies /d/.
 // Check all official page metadata rather than stopping at the first tag.
 for(const meta of doc.querySelectorAll('link[rel="canonical"],meta[property="og:url"]')){
   const raw=meta.getAttribute('href')||meta.getAttribute('content');
   if(!raw)continue;
   let safe:string|null=null;
   try{safe=cleanWolUrl(new URL(raw,base).href);}catch{continue;}
   if(!safe||safe===base)continue;
   const path=new URL(safe).pathname;
   if(DOC.test(path)||/^\/fr\/wol\/b\/r30\/lp-f\/[^/]+\/\d+\/\d+$/.test(path))
     return safe;
 }
 return null;
}
async function contextualDocumentReader(url:string,label:string):Promise<ReaderResult>{
 const html=await officialText(url);
 const result=directDocumentReader(html,url,label);
 if(result.lines.length)return result;
 const canonical=canonicalContextDestination(html,url);
 if(!canonical)return result;
 try{
   const resolved=directDocumentReader(await officialText(canonical),canonical,label);
   if(resolved.lines.length){
     // Keep the reference supplied by WOL for external navigation;
     // the canonical page is only used for retrieving its readable text.
     resolved.sourceUrl=url;
     return resolved;
   }
 }catch{ /* Show the original official link if canonical retrieval fails. */ }
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
 if(CONTEXT.test(path)||BIBLE_CONTEXT.test(path))
   return contextualDocumentReader(url,ref.label);
 if(DOC.test(path)||path.startsWith('/fr/wol/b/'))
   return directDocumentReader(await officialText(url),url,ref.label);
 if(!path.startsWith('/fr/wol/l/')&&!path.startsWith('/fr/wol/s/'))
   throw Error('Cette source ne correspond pas à une page WOL consultable.');
 const query=new URL(url).searchParams.get('q')?.trim()||ref.label;
 // A small set of source IDs was verified directly on WOL. Try those
 // first, so a known article is not held hostage by broken /l/ redirects
 // or by the /s/ search HTML. Fall back to ordinary resolution if blocked.
 const verified=knownCitation(ref.label)||knownCitation(query);
 if(verified){
   try{
     const article=readerForDocument(await officialText(verified),verified,ref.label);
     article.kind='article';
     return article;
   }catch{ /* Continue through official bibliography lookup. */ }
 }
 // First inspect the content WOL actually provides for this lookup.
 // The result container is often present while the rest of the HTML is
 // only the library navigation. Prefer a real article link when available,
 // otherwise display the result content, not the website menu.
 const lookup=path.startsWith('/fr/wol/s/')
   ? WOL+'l/r30/lp-f?'+new URLSearchParams({q:query}):url;
 let lookupHtml:string|undefined;
 let lookupExcerpt:ReaderResult|null=null;
 try{
   lookupHtml=await officialText(lookup);
   lookupExcerpt=parseWolLookupResults(lookupHtml,lookup,query);
   if(lookupExcerpt){
     const target=pickDocument(lookupHtml,lookup,query);
     if(target){
       try{
         const full=readerForDocument(await officialText(target),target,query);
         full.kind='article';return full;
       }catch{ /* The official result is available even if its full article fails. */ }
     }
     // Keep the excerpt as a fallback; first try the publication's own
     // index and verified article links to find the FULL reading text.
   }
 }catch{ /* Continue with the book index and standard lookup fallback. */ }
 // A paragraph belongs to the reading target, but WOL may need the FULL
 // citation (with §) to populate #lookupResults on its /l endpoint.
 // Query both forms, never discard the user's paragraph label.
 if(!lookupExcerpt&&ref.label.trim()!==query){
   const fullLookup=WOL+'l/r30/lp-f?'+new URLSearchParams({q:ref.label.trim()});
   try{
     const fullHtml=await officialText(fullLookup);
     lookupExcerpt=parseWolLookupResults(fullHtml,fullLookup,query);
     const target=pickDocument(fullHtml,fullLookup,query);
     if(target){
       try{
         const full=readerForDocument(await officialText(target),target,ref.label);
         full.kind='article';return full;
       }catch{ /* The lookup panel remains available as a fallback. */ }
     }
   }catch{ /* Continue with the original lookup and other official sources. */ }
 }
 // Book page numbers are not keywords. Resolve them using the official
 // publication structure instead of expecting /l?q=it-1+118 to be an article.
 const bookPages=publicationBookPages(query);
 const insightTitle=insightTitleReference(query);
 if(bookPages||insightTitle){
   try{
     const matched=bookPages
       ?(bookPages.code==='si'?await findSiDocumentByPage(query):await findInsightDocumentByIndex(query))
       :await findInsightDocumentByTitle(query);
     if(matched){
       const article=readerForDocument(await officialText(matched),matched,query);
       article.kind='article';return article;
     }
   }catch{ /* One structured source failed: try the standard WOL results. */ }
 }
 let text='';let docUrl:string|null=null;
 let networkProblem='';
 try{
   text=lookupHtml||await officialText(lookup);
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
   // First search the exact printed page; a broad issue-only search can
   // contain unrelated articles and must never be treated as an exact hit.
   const searchTerms=page
     ?[query,page.issue+' '+page.first+(page.last!==page.first?'-'+page.last:''),page.issue]
     :[query];
   for(const term of [...new Set(searchTerms)]){
     const fallback=WOL+'s/r30/lp-f?'+new URLSearchParams({q:term});
     try{
       const html=await officialText(fallback,true);
       // Search pages often use #searchResults rather than #lookupResults.
       // Retain only article rows carrying authoritative issue/page metadata.
       if(!lookupExcerpt){
         lookupExcerpt=parseWolLookupResults(html,fallback,query)
           ||matchingSearchResultChoices(html,fallback,query);
       }
       docUrl=pickDocument(html,fallback,query);
       if(docUrl||lookupExcerpt?.lines.length)break;
     }catch(error){
       networkProblem+=(networkProblem?' ; ':'')+
         (error instanceof Error?error.message:'Recherche WOL indisponible');
     }
   }
 }
 docUrl=docUrl||knownCitation(ref.label)||knownCitation(query);
 if(!docUrl){
   if(lookupExcerpt&&lookupExcerpt.lines.length)return lookupExcerpt;
   const empty=parseWolDocument(text||'<main></main>',lookup,query);
   empty.lines=[];
   empty.notice=networkProblem
      ?'Impossible de récupérer cette référence depuis WOL : '+networkProblem+'. Ouvre la source officielle.'
      :'Référence non résolue automatiquement. Vérifie le lien sur WOL.';
   empty.kind='results';return empty;
 }
 try{
   const article=readerForDocument(await officialText(docUrl),docUrl,ref.label);
   article.kind='article';
   return article;
 }catch(error){
   // Never lose the content already extracted from #lookupResults just because
   // a linked /d page is blocked or contains only WOL's navigation shell.
   if(lookupExcerpt&&lookupExcerpt.lines.length){
     // A set of candidate articles is useful information, not a generic
     // excerpt; do not overwrite its ambiguity explanation.
     if(!lookupExcerpt.notice?.startsWith('Plusieurs documents correspondent'))
       lookupExcerpt.notice='Résultat de consultation WOL (extrait, pas forcément l’article intégral). Le document complet n’a pas pu être chargé dans Obsidian.';
     return lookupExcerpt;
   }
   const empty=parseWolDocument(text||'<main></main>',lookup,query);
   empty.kind='results';empty.lines=[];
   empty.notice='La source WOL a été trouvée, mais son article est inaccessible dans le lecteur : '+
     (error instanceof Error?error.message:'réponse incomplète')+
     '. Ouvre le document sur WOL.';
   empty.sourceUrl=docUrl;
   return empty;
 }
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
/** Request a complete, bounded cross-chapter passage as ONE official Bible
 * range, instead of mistaking the end chapter for a verse or issuing a
 * hundred individual requests. Never silently truncate a long passage. */
async function fetchCrossChapterPassage(ref:ReferenceEntry,scripture:NonNullable<ReturnType<typeof parseScripture>>):Promise<ReaderResult>{
 const start=scripture.chapter,finish=scripture.endChapter!,last=scripture.endVerse!;
 const digits=(chapter:number,verse:number)=>
   String(scripture.book)+String(chapter).padStart(3,'0')+String(verse).padStart(3,'0');
 const code=digits(start,scripture.verse)+'-'+digits(finish,last);
 const sourceUrl=WOL+'b/r30/lp-f/nwt/'+scripture.book+'/'+start;
 const label=scripture.label;
 try{
   const response=await requestUrl({url:API+code,throw:false});
   if(response.status!==200)throw Error('Passage non disponible (HTTP '+response.status+').');
   const body=response.json as {ranges?:Record<string,JwVerseExtras>};
   const entry=body?.ranges?.[code];
   if(!entry||typeof entry.html!=='string')throw Error('Passage absent des données officielles.');
   const document=new DOMParser().parseFromString(entry.html,'text/html');
   // A whole passage must not use readableOfficialHtml's normal 12k limit:
   // silently cutting off the final chapter would misrepresent the citation.
   const text=readableOfficialElement(document.body,'verse',100000);
   if(!text)throw Error('Texte du passage indisponible.');
   return {
     title:label,sourceUrl,kind:'verse',links:[],
     lines:[{type:'verse',number:start+':'+scripture.verse+'–'+finish+':'+last,text}],
     notice:'Passage continu · chapitres '+start+' à '+finish+' · source officielle jw.org'
   };
 }catch{
   // The official range endpoint isn't always available. Expose EVERY
   // requested chapter rather than falsely presenting chapter 1 as the range.
   const lines:ReaderResult['lines']=[];
   const links:ReaderResult['links']=[];
   for(let chapter=start;chapter<=finish;chapter++){
     const url=WOL+'b/r30/lp-f/nwt/'+scripture.book+'/'+chapter;
     const name=label.slice(0,label.indexOf(' '+start+':'))+' '+chapter;
     const title='Chapitre '+chapter+(chapter===start?' (à partir du verset '+scripture.verse+')':
       chapter===finish?' (jusqu’au verset '+last+')':' (entier)');
     lines.push({type:'heading',text:title});
     lines.push({type:'paragraph',text:'Lire '+title+' sur WOL.',
       parts:[{text:'Lire '+title+' sur WOL',url,kind:'scripture'},{text:'.'}]});
     links.push({label:name,url});
   }
   return {title:label,sourceUrl,kind:'article',lines,links,
     notice:'Le texte intégral de cette plage sur plusieurs chapitres n’a pas pu être extrait automatiquement. Ouvre les chapitres officiels ci-dessous pour parcourir tout le passage.'};
 }
}
export async function fetchStudyVerse(ref:ReferenceEntry):Promise<ReaderResult>{
 const scripture=parseScripture(ref.label);
 if(!scripture)return fetchPublication(ref);
 if(scripture.endChapter)return fetchCrossChapterPassage(ref,scripture);
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
