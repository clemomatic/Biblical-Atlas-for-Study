/** Small, offline-only helpers for turning a source into a personal research lead.
 * The plugin stores a reference to WOL, never a copied publication.
 */
import { normalizeSearch } from './bibleLabData.ts';
import { cleanWolUrl, type ReferenceEntry } from './referenceReader.ts';

export function filterReferenceEntries(entries: readonly ReferenceEntry[], query: string): ReferenceEntry[] {
  const needle = normalizeSearch(query.trim());
  if (!needle) return [...entries];
  return entries.filter(item => normalizeSearch(item.label).includes(needle));
}

/** Escape the label as Markdown while keeping the source URL WOL-only. */
export function researchCaptureMarkdown(reference: ReferenceEntry, resolvedUrl?: string): string {
  const source = (resolvedUrl && cleanWolUrl(resolvedUrl)) || cleanWolUrl(reference.url);
  if (!source) throw new Error('La source doit être un lien WOL officiel.');
  const title = reference.label.replace(/[\r\n\t\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 180)
    .replace(/([\\\[\]_*\x60<>])/g, '\\$1');
  if (!title) throw new Error('La référence doit avoir un titre.');

  return [
    '',
    '> [!question] Piste à explorer · ' + title,
    '> Source : [' + title + '](' + source + ')',
    '>',
    '> **Ce que je remarque :**',
    '>',
    '> **Question à approfondir :**',
    '>',
    '> **Liens avec d’autres textes ou idées :**',
    '>',
    '> **Ce que je peux mettre en pratique :**',
    '',
  ].join('\n');
}
