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
function nearestResult(link: HTMLAnchorElement): HTMLElement {
  return link.closest<HTMLElement>(
    '.searchResultItem,.search-result-item,.resultItem,.result-item,' +
    '.searchResult,.search-result,.result,article,li'
  ) || link.parentElement || link;
}
function getSource(item: HTMLElement): WolCollection {
  // The publication label can be in a sibling of the title, not in the link.
  // Check a bounded local neighbourhood, never the complete search page.
  let current: HTMLElement | null = item;
  for (let depth = 0; current && depth < 3; depth++, current = current.parentElement) {
    const nodes = current.querySelectorAll('small,.publication,.pubTitle,.pubRef,.documentMeta,p,span');
    const metadata = [...nodes].map(node => compact(node.textContent || '', 180)).join(' ').slice(0, 1300);
    const collection = sourceCollection(metadata);
    if (collection !== 'other') return collection;
    if (depth === 0) {
      const own = sourceCollection(compact(current.textContent || '', 700));
      if (own !== 'other') return own;
    }
    // Ascending into a large result container risks classifying all links alike.
    if ((current.textContent || '').length > 1800) break;
  }
  return 'other';
}

/** Parse official links as text only. Untrusted HTML is never inserted in Obsidian. */
export function parseWolSearchResults(html: string, requestedUrl: string): WolSearchHit[] {
  if (isWolAccessChallenge(html)) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const node of [...doc.querySelectorAll('script,style,noscript,nav,footer,header,form')]) node.remove();
  const roots = [
    ...doc.querySelectorAll<HTMLElement>(
      '#lookupResults,.lookupResults,#searchResults,.searchResults,.search-results,' +
      '.resultList,.result-list,#results,main,#content'
    ),
    doc.body
  ];
  const seen = new Set<string>();
  const hits: WolSearchHit[] = [];
  for (const root of roots) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const url = officialResultHref(link.getAttribute('href') || '', requestedUrl);
      if (!url || seen.has(url)) continue;
      const item = nearestResult(link);
      const heading = item.querySelector('h2,h3,h4');
      const title = compact(link.textContent || heading?.textContent || link.getAttribute('title') || '', 170);
      if (title.length < 3 || /^(?:image|imprimer|pr.c.dent|suivant|sommaire|ouvrir|lire|.couter|watchtower)$/i.test(title)) continue;
      const surrounding = compact(item.textContent || '', 550);
      const excerpt = compact(surrounding.replace(title, '').trim(), 190);
      seen.add(url);
      hits.push({ title, url, excerpt: excerpt.length > 14 ? excerpt : '', collection: getSource(item) });
      if (hits.length >= MAX_WOL_RESULTS) return hits;
    }
  }
  return hits;
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
