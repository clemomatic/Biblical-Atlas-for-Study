import { cleanReadingText } from './readerText.ts';
import type { ReaderPart } from './referenceReader.ts';

type StyledRun = { start: number; end: number; bold: boolean; italic: boolean };
const OMIT = 'script,style,noscript,svg,iframe,form,button,[aria-hidden="true"],[hidden]';

/**
 * Read only *formatting semantics* from official HTML. The source markup is
 * never mounted in Obsidian: the display receives text nodes, <strong>, <em>
 * and separately validated WOL reference buttons.
 */
export function preserveInlineEmphasis(source: Element, text: string, parts: ReaderPart[]): ReaderPart[] {
  if (!text || !parts.length) return parts;
  const clone = source.cloneNode(true) as Element;
  for (const node of [...clone.querySelectorAll(OMIT)]) node.remove();
  for (const br of [...clone.querySelectorAll('br')]) br.replaceWith(' ');

  const raw: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  const collect = (node: Node, bold: boolean, italic: boolean): void => {
    if (node.nodeType === 3) {
      const value = node.nodeValue || '';
      if (value) raw.push({ text: value, bold, italic });
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    const classes = element.getAttribute('class') || '';
    const nextBold = bold || tag === 'strong' || tag === 'b' ||
      /(?:^|\s)(?:bold|font-weight-bold)(?:\s|$)/i.test(classes);
    const nextItalic = italic || tag === 'em' || tag === 'i' ||
      /(?:^|\s)(?:italic|font-italic)(?:\s|$)/i.test(classes);
    for (const child of [...element.childNodes]) collect(child, nextBold, nextItalic);
  };
  collect(clone, false, false);

  const rawText = raw.map(part => part.text).join('');
  // If a publication changes its HTML in an unexpected way, never misplace
  // bold around the wrong words. Plain text is the safe fallback.
  if (cleanReadingText(rawText) !== text) return parts;
  const offsetAt = (index: number): number =>
    Math.min(text.length, Math.max(0, cleanReadingText(rawText.slice(0, index) + '\uE000').length - 1));
  const marks: StyledRun[] = [];
  let cursor = 0;
  for (const segment of raw) {
    const from = cursor;
    cursor += segment.text.length;
    if (!segment.bold && !segment.italic) continue;
    const start = offsetAt(from), end = offsetAt(cursor);
    if (end > start) marks.push({ start, end, bold: segment.bold, italic: segment.italic });
  }
  if (!marks.length) return parts;

  const result: ReaderPart[] = [];
  let absolute = 0;
  for (const part of parts) {
    const start = absolute, end = start + part.text.length;
    absolute = end;
    const boundaries = new Set<number>([start, end]);
    for (const mark of marks) {
      if (mark.start > start && mark.start < end) boundaries.add(mark.start);
      if (mark.end > start && mark.end < end) boundaries.add(mark.end);
    }
    const cuts = [...boundaries].sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1];
      const content = part.text.slice(a - start, b - start);
      if (!content) continue;
      const matching = marks.filter(mark => mark.start < b && mark.end > a);
      result.push({
        ...part, text: content,
        bold: matching.some(mark => mark.bold) || undefined,
        italic: matching.some(mark => mark.italic) || undefined
      });
    }
  }
  return result;
}

/** Only create trusted, native DOM nodes; never use innerHTML for remote text. */
export function appendStyledReaderText(parent: HTMLElement, part: ReaderPart): void {
  let target: HTMLElement = parent;
  if (part.highlightColor && part.highlightColor >= 1 && part.highlightColor <= 6) {
    const swatches:Record<number,string>={1:'#ffe58a',2:'#b7eb9c',
      3:'#a8d5ff',4:'#ffc0ba',5:'#ffd1a3',6:'#d9baff'};
    const mark=target.createEl('mark',{cls:'biblelab-personal-highlight'});
    mark.style.backgroundColor=swatches[part.highlightColor];
    mark.style.color='#242424';
    mark.style.borderRadius='2px';
    mark.style.boxDecorationBreak='clone';
    target=mark;
  }
  if (part.bold) target = target.createEl('strong');
  if (part.italic) target = target.createEl('em');
  target.appendChild(document.createTextNode(part.text));
}
