/** Bible Lab reference reader — official WOL pages only.
 * Explicit links are preserved; other publication citations use /wol/l/, not
 * the keyword search route /wol/s/. No HTML from the web is injected into Obsidian.
 */
import { extractReferences, normalizeSearch, parseScripture, wolLookup, type ScriptureRef } from './bibleLabData.ts';
import { wolLanguageFromUrl,wolPrefix,wolRoute,type BibleLabLanguage } from './researchPreferences.ts';

export type ReferenceKind='scripture'|'publication'|'document';
export interface ReferenceEntry {label:string;url:string;kind:ReferenceKind;origin:'verse'|'marker'|'markdown'|'brackets'|'pinned'}
export interface ReaderLine {type:'heading'|'paragraph'|'note';text:string}
export interface ReaderLink {label:string;url:string}
export interface ReaderResult {title:string;sourceUrl:string;lines:ReaderLine[];links:ReaderLink[];kind:'verse'|'article'|'results';notice?:string}
export const MAX_REFERENCES=60;
const urlPattern=/https?:\/\/(?:wol\.jw\.org|www\.jw\.org)\/[^\s<>\])]+/gi;

export function cleanWolUrl(raw:string):string|null {
 try{
   const url=new URL(raw.replace(/&amp;/g,'&').trim());
   if(url.protocol!=='https:'||url.username||url.password||url.hostname!=='wol.jw.org')return null;
   const language=wolLanguageFromUrl(url.href);
   if(!language)return null;
   // Repair old citation URLs, including links written by earlier versions of
   // Bible Lab into the vault. The route /s/ searches keywords, whereas /l/
   // resolves bibliographic references such as "w24 Novembre p. 14-19".
   if(url.pathname==='/'+language+'/wol/s/'+wolRoute(language)) {
     const query=url.searchParams.get('q')?.trim()||'';
     if(/^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2})\b/i.test(query)){
       url.pathname='/'+language+'/wol/l/'+wolRoute(language);
       url.search=new URLSearchParams({q:query}).toString();
     }
   }
   url.hash='';return url.toString();
 }catch{return null;}
}
export function bibleChapterUrl(scripture:ScriptureRef,language:BibleLabLanguage='fr'):string{
 return wolPrefix(language)+'b/'+wolRoute(language)+'/nwt/'+scripture.book+'/'+scripture.chapter;
}
export function passageUrl(reference:string,language:BibleLabLanguage='fr'):string {
 const scripture=parseScripture(reference);
 return scripture?bibleChapterUrl(scripture,language):wolLookup(reference,language);
}
export function extractReferenceEntries(markdown:string,language:BibleLabLanguage='fr'):ReferenceEntry[]{
 const results:ReferenceEntry[]=[];const keys=new Set<string>();
 const push=(label:string,url:string,origin:ReferenceEntry['origin'],kind?:ReferenceKind)=>{
   label=label.replace(/\s+/g,' ').trim();
   if(!label)return;
   const normalized=cleanWolUrl(url);
   if(!normalized)return;
   const ref=parseScripture(label);
   const type=kind|| (ref?'scripture':normalized.includes('/wol/d/')?'document':'publication');
   const key=normalizeSearch(label)+'\u0000'+normalized;
   if(keys.has(key)||results.length>=MAX_REFERENCES)return;
   keys.add(key);results.push({label,url:normalized,origin,kind:type});
 };
 // Exclude code and YAML headers: non-source material can contain thousands
 // of URLs, fenced examples and internal metadata.
 let text=markdown.replace(/^---\s*\n[\s\S]*?\n---\s*(?:\n|$)/,'')
    .replace(/^`{3,}[^\n]*\n[\s\S]*?^`{3,}\s*$/gm,'')
    .replace(/^~{3,}[^\n]*\n[\s\S]*?^~{3,}\s*$/gm,'')
    .replace(/`[^`\r\n]+`/g,'');
 // Markdown links: [label](https://wol.jw.org/fr/wol/...)
 const linked=/\[([^\]\n]{1,240})\]\(\s*(https?:\/\/[^\s)]+)(?:\s+["'][^"']+["'])?\s*\)/gi;
 for(const m of text.matchAll(linked)){
   const href=cleanWolUrl(m[2]);
   if(href)push(m[1],href,'markdown');
 }
 // [w24 Novembre p. 14-19] and [https://wol.jw.org/...] as independent
 // bracket references. Ignore Obsidian wiki links and ordinary checkboxes.
 text=text.replace(linked,'');
 for(const m of text.matchAll(/(?<!\[)\[([^\[\]\r\n]{2,230})\](?!\])/g)){
   const raw=m[1].trim();
   if(/^https?:\/\//i.test(raw)){
     const url=cleanWolUrl(raw);if(url)push(raw,url,'brackets');
   }else if(/^(?:w\d{2}(?:\.?\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|cl |lff |nwt |w\d{2}\s+|la tour de garde)/i.test(raw)) {
     push(raw,wolLookup(raw,language),'brackets','publication');
   }
 }
 // Marker citations must take precedence over the verse scanner.
 for(const m of text.matchAll(/!!([^!\r\n]{1,220})!!/g)){
   for(const part of m[1].split(';')){const label=part.trim();if(label)push(label,passageUrl(label,language),'marker');}
 }
 // Plain scripture references. Avoid detecting verse-like strings in web URLs
 // by removing URLs before scanning.
 const remainder=text.replace(urlPattern,'');
 for(const label of extractReferences(remainder)){
   if(parseScripture(label))push(label,passageUrl(label,language),'verse','scripture');
 }
 return results.slice(0,MAX_REFERENCES);
}
function normalizedText(node:Element|null,max=2200):string {
 return (node?.textContent||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
function findDocumentRoot(doc:Document):Element {
 return doc.querySelector('.bodyTxt, .document .bodyTxt, #article, article, main, #content, .document, .article')||doc.body;
}
function allowLink(raw:string,base:string):string|null {
 try{return cleanWolUrl(new URL(raw,base).toString());}catch{return null;}
}
function relevantVerseNode(doc:Document,scripture:ScriptureRef):Element|null {
 const {book,chapter,verse}=scripture;
 const ids=[`v${book}-${chapter}-${verse}`,`v${book}-${chapter}-${String(verse).padStart(2,'0')}`,`v${book}-${chapter}-${String(verse).padStart(3,'0')}`];
 for(const id of ids){const node=doc.getElementById(id);if(node)return node;}
 const candidates=[...doc.querySelectorAll('[id^="v"], [data-verse], .verse')];
 return candidates.find(el=>{
   const id=el.id||el.getAttribute('data-verse')||'';
   return ids.some(v=>id===v||id.startsWith(v+'-'))||id===String(verse);
 })||null;
}
function verseRelatedAnchors(root:Element,scripture:ScriptureRef):HTMLAnchorElement[]{
  const wanted=scripture.label.replace(/[-–]\d+$/,'');
  const headings=[...root.querySelectorAll('h2,h3,h4,h5')];
  const header=headings.find(x=>normalizedText(x,180)===wanted);
  if(!header)return [];
  const items:HTMLAnchorElement[]=[];
  let following=header.nextElementSibling,visited=0;
  while(following&&visited++<90){
    if(/^H[2-5]$/.test(following.tagName)&&
       /^.+\\s+\\d{1,3}:\\d{1,3}$/.test(normalizedText(following,160)))break;
    if(following.matches('a[href]'))items.push(following as HTMLAnchorElement);
    items.push(...following.querySelectorAll<HTMLAnchorElement>('a[href]'));
    following=following.nextElementSibling;
  }
  return items;
}
function studyNotesForVerse(root:Element,scripture:ScriptureRef):ReaderLine[]{
  const name=scripture.label.replace(/[-–]\d+$/,'');
  // WOL's Bible study view also renders a verse-keyed apparatus with
  // "Notes", "Renvois" and "Index". Take only the requested verse apparatus,
  // not the surrounding chapter's footnotes.
  const headings=[...root.querySelectorAll('h2,h3,h4,h5')];
  const start=headings.find(el=>normalizedText(el,180)===name);
  if(!start)return [];
  const lines:ReaderLine[]=[];
  let node=start.nextElementSibling;let scanned=0;let section='Note';
  while(node && scanned++<65 && lines.length<35){
    const current=node;
    if(/^H[2-5]$/.test(current.tagName)){
      const t=normalizedText(current,160);
      if(/^.+\s+\d{1,3}:\d{1,3}$/.test(t))break;
      if(/^(Notes|Renvois|Index|Guide de recherche|Index des publications)$/i.test(t))section=t;
      else if(t)lines.push({type:'heading',text:t});
    }else{
      const t=normalizedText(current,1200);
      if(t)lines.push({type:/note|renvoi/i.test(section)?'note':'paragraph',text:t});
    }
    node=node.nextElementSibling;
  }
  return lines;
}
function gatherSections(root:Element,limit=32):ReaderLine[]{
 const lines:ReaderLine[]=[];const seen=new Set<string>();
 for(const el of [...root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,dt,dd')]){
   if(el.closest('script,style,nav,footer,header,aside,[role="navigation"],.js-hidden'))continue;
   // Avoid copying ancestor and descendant text multiple times.
   if(el.matches('p,li,dd')&&el.querySelector('p,li,dd'))continue;
   const text=normalizedText(el,1400);
   if(!text||text.length<2||seen.has(text))continue;
   if(/^\s*(?:se connecter|partager|imprimer|précédent|suivant)$/i.test(text))continue;
   seen.add(text);
   const type:ReaderLine['type']=/^H[1-4]$/.test(el.tagName)?'heading':/note|renvoi|référence/i.test(el.className||'')?'note':'paragraph';
   lines.push({type,text});
   if(lines.length>=limit)break;
 }
 return lines;
}
export function parseWolDocument(html:string,url:string,requested?:string):ReaderResult{
 const official=cleanWolUrl(url);
 if(!official)throw Error('Seules les pages officielles WOL sont acceptées.');
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const node of [...doc.querySelectorAll('script,style,noscript,svg,form,iframe,nav,footer')])node.remove();
 const root=findDocumentRoot(doc);
 const heading=normalizedText(root.querySelector('h1, h2'),190);
 const scripture=requested?parseScripture(requested):null;
 const isVerse=!!scripture&&official.includes('/wol/b/');
 const isLookup=official.includes('/wol/l/');
 const links:ReaderLink[]=[];
 const keys=new Set<string>();
 const targeted=scripture&&isVerse?verseRelatedAnchors(root,scripture):[];
 const candidateLinks=[...targeted,...root.querySelectorAll<HTMLAnchorElement>('a[href]')];
 for(const a of candidateLinks){
   const href=allowLink(a.getAttribute('href')||'',official);
   const label=normalizedText(a,150);
   if(!href||!label||keys.has(href)||href===official)continue;
   keys.add(href);links.push({label,url:href});
   if(links.length>=35)break;
 }
 let lines:ReaderLine[]=[];let notice:string|undefined;
 if(isVerse&&scripture){
   const node=relevantVerseNode(doc,scripture);
   if(node){
     const wrap=node.closest('p, li, div')||node;
     const verseText=normalizedText(wrap,1100);
     if(verseText)lines.push({type:'paragraph',text:verseText});
     const apparatus=studyNotesForVerse(root,scripture);
     for(const part of apparatus)if(!lines.some(x=>x.text===part.text))lines.push(part);
     // The 2013 study Bible places notes, cross-references and research
     // indexes next to or beneath the verse, sometimes inside a sibling.
     const local=wrap.parentElement;
     if(local){
       const noteEls=[...local.querySelectorAll('.studyNote, .f, .fn, .xref, .reference, [class*="note"], [class*="xref"]')].slice(0,16);
       for(const item of noteEls){
         const t=normalizedText(item,750);if(t&&t!==verseText)lines.push({type:'note',text:t});
       }
     }
   }else{
     const apparatus=studyNotesForVerse(root,scripture);
     if(apparatus.length){
       lines=apparatus;
       notice='Notes et renvois trouvés ; utilise WOL pour vérifier le texte exact du verset.';
     }else{
       notice='Le verset précis n’a pas pu être isolé : extrait du chapitre et accès à la Bible d’étude.';
       lines=gatherSections(root,14);
     }
   }
 }else{
   lines=gatherSections(root,isLookup?22:145);
 }
 if(!lines.length&&normalizedText(root)){
   lines=[{type:'paragraph',text:normalizedText(root,2400)}];
 }
 if(!lines.length)notice='Le contenu n’a pas pu être extrait : ouvre le document sur WOL.';
 return {title:heading||(scripture?.label||requested||'Document WOL'),sourceUrl:official,lines,
   links,kind:isVerse?'verse':isLookup?'results':'article',notice};
}
