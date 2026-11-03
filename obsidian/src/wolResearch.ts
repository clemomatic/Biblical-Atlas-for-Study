import { cleanReadingText } from './readerText.ts';
/**
 * Official WOL document search. Only public search URLs and document links
 * are used: no private endpoint, proxy, external index, or note contents.
 * WOL can sometimes return an anti-bot challenge instead of search HTML.
 */
import { cleanWolUrl } from './referenceReader.ts';

export type WolMatchMode = 'par' | 'sen';
export type WolSearchScope = 'all' | 'index' | 'guide' | 'perspicace';
export type WolCollection = 'index' | 'guide' | 'perspicace' | 'other';
export interface WolSearchOptions {
  match: WolMatchMode;
  scope: WolSearchScope;
  page?: number;
}
export interface WolSearchHit {
  title: string;
  url: string;
  excerpt: string;
  collection?: WolCollection;
}
export const MAX_WOL_RESULTS = 120;
export const WOL_RESULTS_PAGE_SIZE = 30;
export const JW_STUDY_TOOLS = 'https://www.jw.org/fr/la-bible-et-vous/outils-etude-bible/';

export function wolResearchUrl(query: string, options: WolSearchOptions): string {
  const q = query.trim().slice(0, 250);
  if (!q) throw Error('Saisis un sujet ou une expression.');
  const params = new URLSearchParams();
  params.set('q', q);
  params.set('p', options.match === 'sen' ? 'sen' : 'par');
  // WOL itself submits both sorting parameters. The bare /s?q= form
  // sometimes responds with an unpopulated page shell to HTTP clients.
  params.set('r', 'occ');
  params.set('st', 'a');
  // Index and Research Guide share the official "Index" category in WOL.
  if (options.scope === 'index' || options.scope === 'guide') params.append('fc[]', 'dx');
  if (options.scope === 'perspicace') params.append('fc[]', 'it');
  const page = Math.floor(options.page || 1);
  if (page > 1) params.set('pg', String(Math.min(page, 100)));
  return 'https://wol.jw.org/fr/wol/s/r30/lp-f?' + params.toString();
}
export function jwOrgResearchUrl(query: string): string {
  const q = query.trim().slice(0, 250);
  if (!q) throw Error('Saisis un sujet ou une expression.');
  return 'https://www.jw.org/fr/rechercher/?' + new URLSearchParams({ q }).toString();
}

export function isWolAccessChallenge(html: string): boolean {
  const text = cleanReadingText(html.replace(/<[^>]*>/g, ' ')).slice(0, 4000);
  return /verify that you.re not a robot|v.rifier que vous n..tes pas un robot|javascript is disabled|captcha|access denied|acc.s refus.|unusual traffic/i.test(text);
}

const compact = (v: string, max = 220) => cleanReadingText(v).slice(0, max);
function officialResultHref(href: string, base: string): string | null {
  try {
    const safe = cleanWolUrl(new URL(href, base).toString());
    if (!safe) return null;
    const parsed = new URL(safe);
    // Only open an actual WOL document, never a search form, script or menu.
    return /^\/fr\/wol\/(?:d\/r30\/lp-f\/\d+|pc\/r30\/lp-f\/\d+\/\d+\/\d+\/?|b\/r30\/lp-f\/[^?#]+)$/.test(parsed.pathname)
      ? safe : null;
  } catch {
    return null;
  }
}
function sourceCollection(value: string): WolCollection {
  if (/(?:^|[^a-z0-9])rsg(?:\d{2})?\b|guide de recherche/i.test(value)) return 'guide';
  if (/(?:^|[^a-z0-9])dx(?:\d{2}[-–]\d{2})?\b|index (?:19|20)\d{2}[-–](?:19|20)\d{2}|index des publications/i.test(value)) return 'index';
  if (/(?:^|[^a-z0-9])it-[12]\b|.tude perspicace/i.test(value)) return 'perspicace';
  return 'other';
}
/**
 * WOL's own HTML is NOT laid out as one <article> per hit. Each result is
 * usually an <ul class="resultContentTopic|resultContentDocument">:
 *   <li class="caption"><a href="/fr/wol/d/...">Heading</a></li>
 *   <li class="ref">dx86-23 / it-1 / publication title</li>
 *   <div class="document"><p>matching passage</p></div>
 * Reading only the nearest <li> loses the actual publication and excerpt.
 */
const WOL_RESULT_BLOCKS='ul.resultContentTopic,ul.resultContentDocument';
function nearestResult(link: HTMLAnchorElement): HTMLElement {
  return link.closest<HTMLElement>(
    WOL_RESULT_BLOCKS+',.searchResultItem,.search-result-item,.resultItem,.result-item,' +
    '.searchResult,.search-result,.result,article,li'
  ) || link.parentElement || link;
}
function getSource(item: HTMLElement): WolCollection {
  const publication=item.querySelector('li.ref,.ref,.pubRef,.publication,.pubTitle,.documentMeta');
  const explicit=sourceCollection(compact(publication?.textContent||'',500));
  if(explicit!=='other')return explicit;
  // The publication label can live beside the link, not in the same <li>.
  // Never infer one result's category from another result or from navigation.
  let current:HTMLElement|null=item;
  for(let depth=0;current&&depth<3;depth++,current=current.parentElement){
    if(depth>0&&(current.matches(WOL_RESULT_BLOCKS)||
       current.querySelectorAll(WOL_RESULT_BLOCKS).length>1))break;
    const nodes=current.querySelectorAll('small,.publication,.pubTitle,.pubRef,.documentMeta,p,span');
    const metadata=[...nodes].slice(0,24).map(node=>compact(node.textContent||'',180)).join(' ').slice(0,1300);
    const collection=sourceCollection(metadata);
    if(collection!=='other')return collection;
    if(depth===0){
      const own=sourceCollection(compact(current.textContent||'',700));
      if(own!=='other')return own;
    }
    if((current.textContent||'').length>1800)break;
  }
  return 'other';
}
function appendSearchHit(
  hits:WolSearchHit[],seen:Set<string>,link:HTMLAnchorElement,base:string,item:HTMLElement
):void{
  const url=officialResultHref(link.getAttribute('href')||'',base);
  if(!url||seen.has(url))return;
  const heading=item.querySelector('li.caption a,h2,h3,h4');
  const title=compact(link.textContent||heading?.textContent||link.getAttribute('title')||'',170);
  if(title.length<3||
    /^(?:image|imprimer|pr.c.dent|suivant|sommaire|ouvrir|lire|.couter|watchtower)$/i.test(title))return;
  const snippet=item.querySelector('.document p,.resultSnippet,.resultExcerpt,.snippet,.searchSnippet');
  const snippetText=compact(snippet?.textContent||'',300);
  const rowText=compact(item.textContent||'',700);
  const excerpt=snippetText||compact(rowText.replace(title,'').trim(),190);
  seen.add(url);
  hits.push({title,url,excerpt:excerpt.length>14?excerpt.slice(0,190):'',collection:getSource(item)});
}

/** Parse actual WOL search-result blocks before generic HTML fallbacks.
 * Only official document URLs are retained. Remote HTML is never mounted.
 */
export function parseWolSearchResults(html:string,requestedUrl:string):WolSearchHit[]{
  if(isWolAccessChallenge(html))return [];
  const doc=new DOMParser().parseFromString(html,'text/html');
  for(const node of [...doc.querySelectorAll('script,style,noscript,nav,footer,header,form')])node.remove();
  const hits:WolSearchHit[]=[];
  const seen=new Set<string>();
  const officialBlocks=[...doc.querySelectorAll<HTMLElement>(WOL_RESULT_BLOCKS)];
  if(officialBlocks.length){
    for(const block of officialBlocks){
      const caption=block.querySelector<HTMLAnchorElement>('li.caption a[href]');
      if(caption)appendSearchHit(hits,seen,caption,requestedUrl,block);
      // Some publication-topic entries have a list of distinct destinations.
      // Keep those if the caption is absent, but don't mistake subheading
      // cross-links for separate articles when the caption exists.
      if(!caption)for(const link of block.querySelectorAll<HTMLAnchorElement>('a[href]')){
        appendSearchHit(hits,seen,link,requestedUrl,block);
        if(hits.length>=MAX_WOL_RESULTS)break;
      }
      if(hits.length>=MAX_WOL_RESULTS)break;
    }
    return hits;
  }

  const roots=[...doc.querySelectorAll<HTMLElement>(
    '#lookupResults,.lookupResults,#searchResults,.searchResults,.search-results,'+
    '.resultList,.result-list,#results,main,#content'
  )];
  // Only fall back to body if it is a narrowly scoped result page, not a
  // library navigation shell. This also works for compact WOL HTML variants.
  if(!roots.length&&doc.body.querySelector('article,.searchResultItem,.resultItem'))
    roots.push(doc.body);
  for(const root of roots){
    for(const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
      if(link.closest('aside,[role="navigation"],.resultNavigation,#resultNavigation,.libraryNav,.resultFilters'))continue;
      appendSearchHit(hits,seen,link,requestedUrl,nearestResult(link));
      if(hits.length>=MAX_WOL_RESULTS)return hits;
    }
  }
  return hits;
}

/** Distinguish an explicit "no results" page from a shell with no result
 * markup. A browser can populate a shell later via JavaScript; requestUrl
 * cannot, so it must not be called a real zero-result search. */
export function wolHtmlHasExplicitlyNoResults(html:string):boolean{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const count=cleanReadingText(doc.querySelector('#resultsCount')?.textContent||'');
  if(/^0(?:\s|$)/.test(count))return true;
  const resultArea=doc.querySelector('#searchResults,.searchResults,#results,.resultList,main');
  if(!resultArea)return false;
  const notice=cleanReadingText(resultArea.textContent||'').slice(0,500);
  return /^(?:aucun résultat|aucun document|no results|nothing found)(?:\s|[.!,]|$)/i.test(notice);
}

/** WOL accepts more than one form of its official search URL. When a page
 * with HTTP 200 is only a navigation shell, retry without sorting parameters
 * and then with the official bibliographic /l route. Never invent hits. */
export function wolSearchAlternateUrls(url:string):string[]{
  const first=new URL(url);
  const plain=new URL(url);
  plain.searchParams.delete('r');plain.searchParams.delete('st');
  const lookup=new URL(url);
  lookup.pathname=lookup.pathname.replace('/wol/s/','/wol/l/');
  lookup.search=new URLSearchParams({q:first.searchParams.get('q')||''}).toString();
  return [...new Set([plain.toString(),lookup.toString()])]
    .filter(alternate=>alternate!==url);
}

/**
 * WOL does not promise a fixed page size. Prefer the next-page link in its
 * public HTML; when pagination is built by script, a full-looking result page
 * may still have more entries. A false positive is harmless: users can go back.
 */
export function hasWolNextPage(html: string, requestedUrl: string, resultCount: number): boolean {
  const current = new URL(requestedUrl);
  const page = Number(current.searchParams.get('pg') || 1);
  if (page >= 100) return false;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const link of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    try {
      const next = new URL(link.getAttribute('href') || '', requestedUrl);
      if (next.origin !== current.origin || next.pathname !== current.pathname) continue;
      const nextPage = Number(next.searchParams.get('pg') || 1);
      if (nextPage === page + 1) return true;
    } catch { /* Ignore invalid page links. */ }
  }
  // WOL's own search pages commonly contain 10 or more entries, including
  // its reference-work shortcuts. Never require an arbitrary 30 results.
  return resultCount >= 10;
}

export function preferredWolHits(hits: WolSearchHit[], query: string, scope: WolSearchScope): WolSearchHit[] {
  const target = compact(query, 250).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const selected = scope === 'all' ? hits : hits.filter(hit => hit.collection === scope);
  // Exact subject entries first; unlike full-text occurrences, these directly
  // open the appropriate page of the reference work.
  const exact = (title: string) =>
    compact(title, 200).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === target;
  const rank = (hit: WolSearchHit) =>
    (exact(hit.title) ? 0 : 4) +
    (hit.collection === 'index' ? 0 : hit.collection === 'guide' ? 1 : hit.collection === 'perspicace' ? 2 : 3);
  return [...selected].sort((a, b) => rank(a) - rank(b));
}
