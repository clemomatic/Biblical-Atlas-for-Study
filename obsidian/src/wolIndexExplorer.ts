import { cleanReadingText } from './readerText.ts';
import { cleanWolUrl } from './referenceReader.ts';

/**
 * Structural interpretation of an official WOL Index entry.
 * The sentence preceding each reference is the meaningful index context.
 * These data objects contain plain text and validated WOL URLs only.
 */
export interface WolIndexReference { label: string; url: string }
export interface WolIndexRow { context: string; section?: string; references: WolIndexReference[] }
export interface WolIndexEntry { title: string; url: string; rows: WolIndexRow[] }

export const MAX_INDEX_ROWS = 120;
export const MAX_INDEX_LINKS = 240;

const tidy = (value: string, max = 200): string =>
  cleanReadingText(value).replace(/\s+/g, ' ').trim().slice(0, max);

export function officialIndexHref(href: string, baseUrl: string): string | null {
  try {
    const absolute = new URL(href, baseUrl);
    // No non-HTTPS schemes, credentials, third-party hosts or unrelated routes.
    const safe = cleanWolUrl(absolute.toString());
    if (!safe) return null;
    if (!/^\/fr\/wol\/(?:d|l|b)\/r30\/lp-f(?:\/|$)/.test(new URL(safe).pathname)) return null;
    return safe;
  } catch { return null; }
}

/** Merge repeated phrases, preserving publication order and original source links. */
export function groupWolIndexRows(rows: WolIndexRow[]): WolIndexRow[] {
  const output: WolIndexRow[] = [];
  const byKey = new Map<string, WolIndexRow>();
  let count = 0;
  for (const row of rows) {
    const context = tidy(row.context, 180);
    const section = tidy(row.section || '', 160);
    if (!context || !row.references.length) continue;
    const key = section + '\u0000' + context;
    let target = byKey.get(key);
    if (!target) {
      if (output.length >= MAX_INDEX_ROWS) break;
      target = { context, ...(section ? { section } : {}), references: [] };
      byKey.set(key, target);
      output.push(target);
    }
    const seen = new Set(target.references.map(ref => ref.url));
    for (const ref of row.references) {
      const label = tidy(ref.label, 130);
      if (!label || !ref.url || seen.has(ref.url)) continue;
      if (count >= MAX_INDEX_LINKS) return output;
      target.references.push({ label, url: ref.url });
      seen.add(ref.url);
      count++;
    }
  }
  return output.filter(row => row.references.length > 0);
}

/**
 * Extracts textual index entries from an official WOL document.
 * It intentionally does not parse arbitrary search-result snippets as index rows.
 * On changed/dynamic HTML, return an empty list: the official link remains available.
 */
export function parseWolIndexDocument(html: string, sourceUrl: string): WolIndexEntry {
  const safeSource = officialIndexHref(sourceUrl, sourceUrl);
  if (!safeSource) return { title: '', url: sourceUrl, rows: [] };
  const document = new DOMParser().parseFromString(html, 'text/html');
  for (const node of document.querySelectorAll('script,style,noscript,nav,header,footer,form')) node.remove();
  const root = document.querySelector('.bodyTxt, #content .document, .document, article, main, #content');
  if (!root) return { title: '', url: safeSource, rows: [] };
  const title = tidy(document.querySelector('h1')?.textContent || document.title || '', 160);
  const rawRows: WolIndexRow[] = [];
  let section = '';
  const elements = [...root.querySelectorAll('p,li')].filter(
    row => !row.querySelector('p,li')
  );
  for (const element of elements.slice(0, 800)) {
    const text = tidy(element.textContent || '', 1400);
    if (!text) continue;
    const anchors = [...element.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const refs: WolIndexReference[] = [];
    let firstLabel = '';
    for (const anchor of anchors) {
      const url = officialIndexHref(anchor.getAttribute('href') || '', safeSource);
      const label = tidy(anchor.textContent || '', 130);
      if (!url || !label) continue;
      if (!firstLabel) firstLabel = label;
      refs.push({ label, url });
      if (refs.length >= 35) break;
    }
    if (!refs.length) {
      // WOL sometimes puts a subheading on its own line.
      if (text.length < 140 && /[:：]$/.test(text)) section = tidy(text.replace(/[:：]$/, ''), 160);
      continue;
    }
    const start = firstLabel ? text.indexOf(firstLabel) : -1;
    let context = start >= 0 ? text.slice(0, start) : '';
    context = tidy(context.replace(/[:：；;,\s]+$/, ''), 180);
    // If the HTML separates the label and its citations, inherit the last heading.
    if (!context) context = section || title;
    if (context) rawRows.push({ context, ...(section && section !== context ? { section } : {}), references: refs });
  }
  return { title, url: safeSource, rows: groupWolIndexRows(rawRows) };
}
