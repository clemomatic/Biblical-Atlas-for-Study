/** Bible Lab reference reader — official WOL pages only.
 * Explicit links are preserved; other publication citations use /wol/l/, not
 * the keyword search route /wol/s/. No HTML from the web is injected into Obsidian.
 */
import { extractReferences, normalizeSearch, parseScripture, wolLookup, type ScriptureRef } from './bibleLabData.ts';
import { cleanReadingText, readableOfficialElement } from './readerText.ts';
import { findPublicationMentions, officialFinderUrl, publicationUrl } from './publicationReferences.ts';
import { articleImageFrom, type ArticleImage } from './articleImages.ts';

export type ReferenceKind='scripture'|'publication'|'document';
export interface ReferenceEntry {label:string;url:string;kind:ReferenceKind;origin:'verse'|'marker'|'markdown'|'brackets'|'pinned'}
export interface ReaderPart {text:string;url?:string;kind?:ReferenceKind}
export interface ReaderLine {type:'heading'|'paragraph'|'note'|'study'|'crossref'|'verse'|'question'|'caption'|'image';text:string;source?:string;number?:string;parts?:ReaderPart[];image?:ArticleImage}
export interface ReaderLink {label:string;url:string}
export interface ReaderResult {title:string;sourceUrl:string;lines:ReaderLine[];links:ReaderLink[];kind:'verse'|'article'|'results';notice?:string}
export const MAX_REFERENCES=60;
const urlPattern=/https?:\/\/(?:wol\.jw\.org|www\.jw\.org)\/[^\s<>\])]+/gi;

export function cleanWolUrl(raw:string):string|null {
 const finder=officialFinderUrl(raw);
 if(finder)return finder;
 try{
   const url=new URL(raw.replace(/&amp;/g,'&').trim());
   if(url.protocol!=='https:'||url.username||url.password||url.hostname!=='wol.jw.org')return null;
   if(!url.pathname.startsWith('/fr/wol/'))return null;
   // Repair old citation URLs, including links written by earlier versions of
   // Bible Lab into the vault. The route /s/ searches keywords, whereas /l/
   // resolves bibliographic references such as "w24 Novembre p. 14-19".
   if(url.pathname==='/fr/wol/s/r30/lp-f'){
     const query=url.searchParams.get('q')?.trim()||'';
     if(/^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2}|lmd)\b/i.test(query)){
       url.pathname='/fr/wol/l/r30/lp-f';
       url.search=new URLSearchParams({q:query}).toString();
     }
   }
   url.hash='';return url.toString();
 }catch{return null;}
}
export function bibleChapterUrl(scripture:ScriptureRef):string{
 return `https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/${scripture.book}/${scripture.chapter}`;
}
export function passageUrl(reference:string):string {
 const scripture=parseScripture(reference);
 return scripture?bibleChapterUrl(scripture):publicationUrl(reference);
}
export function extractReferenceEntries(markdown:string):ReferenceEntry[]{
 const results:ReferenceEntry[]=[];const keys=new Set<string>();
 const push=(label:string,url:string,origin:ReferenceEntry['origin'],kind?:ReferenceKind)=>{
   label=cleanReadingText(label);
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
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm,'')
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
   }else if(/^(?:w\d{2}(?:\.?\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|lmd\b|th\b|od\b|s\s*[-–]\s*\d+|cl |lff |nwt |w\d{2}\s+|la tour de garde)/i.test(raw)) {
     push(raw,publicationUrl(raw),'brackets','publication');
   }
 }
 // Marker citations must take precedence over the verse scanner.
 for(const m of text.matchAll(/!!([^!\r\n]{1,220})!!/g)){
   for(const part of m[1].split(';')){const label=part.trim();if(label)push(label,passageUrl(label),'marker');}
 }
 // Plain scripture references. Avoid detecting verse-like strings in web URLs
 // by removing URLs before scanning.
 const remainder=cleanReadingText(text.replace(urlPattern,' '));
 for(const label of extractReferences(remainder)){
   if(parseScripture(label))push(label,passageUrl(label),'verse','scripture');
 }
 for(const mention of findPublicationMentions(remainder))
   push(mention.label,mention.url,'brackets','publication');
 return results.slice(0,MAX_REFERENCES);
}
/**
 * Build safe, interactive text spans. Keep all content as textContent;
 * only links from the official WOL host or recognized Bible citations open
 * in the local reference reader. Nothing from remote HTML is injected.
 */
export function linkifyReaderText(
 text:string, explicit:readonly {label:string;url:string}[]=[]
):ReaderPart[]{
 if(!text)return [];
 type Candidate={start:number;end:number;url:string;kind:ReferenceKind;priority:number};
 const candidates:Candidate[]=[];
 const add=(label:string,url:string,kind:ReferenceKind,priority:number):void=>{
  if(!label||label.length>160||candidates.length>180)return;
  const needle=label.toLocaleLowerCase('fr');
  const content=text.toLocaleLowerCase('fr');
  let at=0;
  for(let i=0;i<24;i++){
   const start=content.indexOf(needle,at);
   if(start<0)break;
   const end=start+label.length;
   // A link must not match part of a longer word.
   const before=start?text[start-1]:'';
   const after=text[end]||'';
   if(!/\p{L}|\p{N}/u.test(before)&&!/\p{L}|\p{N}/u.test(after))
    candidates.push({start,end,url,kind,priority});
   at=end;
  }
 };
 for(const item of explicit){
  const url=cleanWolUrl(item.url);
  if(!url)continue;
  const label=cleanReadingText(item.label);
  if(label.length>=2)add(label,url,parseScripture(label)?'scripture':url.includes('/wol/d/')?'document':'publication',0);
 }
 for(const label of extractReferences(text).slice(0,30)){
  const scripture=parseScripture(label);
  if(!scripture)continue;
  add(label,bibleChapterUrl(scripture),'scripture',1);
 }
 for(const mention of findPublicationMentions(text).slice(0,30))
   add(mention.label,mention.url,'publication',1);
 candidates.sort((a,b)=>a.start-b.start||a.priority-b.priority||(b.end-b.start)-(a.end-a.start));
 const parts:ReaderPart[]=[];
 let offset=0;
 for(const item of candidates){
  if(item.start<offset||parts.length>=90)continue;
  if(item.start>offset)parts.push({text:text.slice(offset,item.start)});
  parts.push({text:text.slice(item.start,item.end),url:item.url,kind:item.kind});
  offset=item.end;
 }
 if(offset<text.length)parts.push({text:text.slice(offset)});
 return parts.length?parts:[{text}];
}

function normalizedText(node:Element|null,max=2200):string {
 return cleanReadingText(node?.textContent||'').slice(0,max);
}
function findDocumentRoot(doc:Document):Element {
 // A WOL layout may contain an empty .bodyTxt placeholder before the real
 // article; selecting the first matching element hides its actual contents.
 const selectors='.bodyTxt, .document .bodyTxt, #article, article, [role="main"], main, #content, .document, .article, .articleBody, .documentBody';
 const candidates=[...doc.querySelectorAll(selectors)];
 for(const candidate of candidates){
   const readable=readableOfficialElement(candidate,'article',15000);
   if(readable.length>=35&&candidate.querySelector('h1,h2,p,li,blockquote,dt,dd,[data-pid],.par,.paragraph'))
     return candidate;
 }
 for(const candidate of candidates)
   if(readableOfficialElement(candidate,'article',15000).length>=75)return candidate;
 return doc.body;
}
function allowLink(raw:string,base:string):string|null {
 try{return cleanWolUrl(new URL(raw,base).toString());}catch{return null;}
}
function relevantVerseNode(doc:Document,scripture:ScriptureRef):Element|null {
 const {book,chapter,verse}=scripture;
 const compact=String(book).padStart(2,'0')+String(chapter).padStart(3,'0')+
   String(verse).padStart(3,'0');
 const ids=['v'+compact,'v'+book+'-'+chapter+'-'+verse,
   'v'+book+'-'+chapter+'-'+String(verse).padStart(2,'0'),
   'v'+book+'-'+chapter+'-'+String(verse).padStart(3,'0')];
 for(const id of ids){const node=doc.getElementById(id);if(node)return node;}
 const candidates=[...doc.querySelectorAll(
   '[id^="v"], [data-verse], [data-bid], [data-vs], .verse')];
 return candidates.find(el=>{
   const values=[el.id,el.getAttribute('data-verse'),el.getAttribute('data-bid'),
     el.getAttribute('data-vs')].filter(Boolean) as string[];
   return values.some(value=>ids.some(id=>value===id||value===id.slice(1))||
     value===String(verse)||value===compact);
 })||null;
}
/** Isolate this single verse, including when the ID marks the number only. */
function exactVerseText(marker:Element,scripture:ScriptureRef):string {
 const n=String(scripture.verse);
 const text=readableOfficialElement(marker,'verse',1600).trim();
 if(text.length>25 && !/^\d{1,3}$/.test(text) &&
   (marker.matches('p,li,[id^="v"],[data-verse],.verse')||marker.querySelector('p')))
   return text.replace(new RegExp('^'+n+'[\\s\\u00a0\\u202f]*'),'').trim();
 const parent=marker.closest('p,li')||marker.parentElement;
 if(!parent)return '';
 const clone=parent.cloneNode(true) as Element;
 const original=[...clone.querySelectorAll('[id],[data-verse]')].find(el=>
   marker.id?el.id===marker.id:el.getAttribute('data-verse')===n);
 if(original){
   const range=clone.ownerDocument.createRange();
   range.selectNodeContents(clone);range.setStartAfter(original);
   const host=clone.ownerDocument.createElement('div');
   host.appendChild(range.cloneContents());
   const next=host.querySelector('[id^="v"],[data-verse],.verseNum,.v');
   if(next){
     const end=host.ownerDocument.createRange();
     end.selectNodeContents(host);end.setEndBefore(next);
     host.replaceChildren(end.cloneContents());
   }
   const isolated=readableOfficialElement(host,'verse',1600).trim();
   if(isolated.length>8)return isolated;
 }
 const markers=parent.querySelectorAll('[id^="v"],[data-verse],.verseNum,.v');
 if(markers.length===1){
   const isolated=readableOfficialElement(parent,'verse',1600)
     .replace(new RegExp('^'+n+'[\\s\\u00a0\\u202f]*'),'').trim();
   if(isolated.length>8)return isolated;
 }
 return '';
}

function verseRelatedAnchors(root:Element,scripture:ScriptureRef):HTMLAnchorElement[]{
 const heading=[...root.querySelectorAll('h2,h3,h4,h5')].find(el=>normalizedText(el,180)===scripture.label.replace(/[-–]\d+$/,''));
 if(!heading)return [];
 const results:HTMLAnchorElement[]=[];
 let next=heading.nextElementSibling,visited=0;
 while(next&&visited++<90){
  if(/^H[2-5]$/.test(next.tagName)&&/:\d{1,3}$/.test(normalizedText(next,180)))break;
  results.push(...next.querySelectorAll<HTMLAnchorElement>('a[href]'));
  if(next.matches('a[href]'))results.push(next as HTMLAnchorElement);
  next=next.nextElementSibling;
 }
 return results;
}
function studyNotesForVerse(root:Element,scripture:ScriptureRef):ReaderLine[]{
 const name=scripture.label.replace(/[-–]\d+$/,'');
 const start=[...root.querySelectorAll('h2,h3,h4,h5')].find(el=>normalizedText(el,180)===name);
 if(!start)return [];
 const lines:ReaderLine[]=[];
 let node=start.nextElementSibling,scanned=0;
 let section:'note'|'crossref'|'study'='note';
 while(node&&scanned++<65&&lines.length<28){
  if(/^H[2-5]$/.test(node.tagName)){
   const heading=normalizedText(node,160);
   if(/^.+\s+\d{1,3}:\d{1,3}$/.test(heading))break;
   if(/^renvois$/i.test(heading))section='crossref';
   else if(/^(index|guide de recherche|index des publications)$/i.test(heading))section='study';
   else if(/^notes$/i.test(heading))section='note';
  }else{
   const text=readableOfficialElement(node,'note',950).replace(/^[+*†‡]\s*/,'').trim();
   if(text&&text.length>2&&text!=='Index des publications')lines.push({type:section,text});
  }
  node=node.nextElementSibling;
 }
 return lines;
}
function articleParagraphNumber(node:Element):string|undefined{
 const mark=node.querySelector('.parNum, .pNum, [class~="parnum"]');
 const value=mark&&normalizedText(mark,6);
 return value&&/^\d{1,3}\.?$/.test(value)?value.replace(/\.$/,''):undefined;
}
function gatherSections(root:Element,sourceUrl:string,limit=360):ReaderLine[]{
 const lines:ReaderLine[]=[];
 const seen=new Set<string>();
 const selectors='h1,h2,h3,h4,p,li,blockquote,dt,dd,figure,img,figcaption,div.p,div.par,div.paragraph,div[data-pid],section[data-pid],div.pGroup';
 const images=new Set<string>();
 const addImage=(img:HTMLImageElement):void=>{
  const image=articleImageFrom(img,sourceUrl);
  if(!image||images.has(image.src)||images.size>=35)return;
  images.add(image.src);
  lines.push({type:'image',text:image.caption||image.alt,image});
 };
 for(const el of root.querySelectorAll(selectors)){
  if(el.closest('script,style,nav,footer,header,aside,[role="navigation"],.js-hidden,[hidden]'))continue;
  if(el.matches('figure')){
   for(const img of el.querySelectorAll<HTMLImageElement>('img'))addImage(img);
   if(lines.length>=limit)break;
   continue;
  }
  // A figure's picture and its caption are represented together in one
  // image block; don't duplicate the text or its nested image nodes.
  if(el.closest('figure'))continue;
  if(el.matches('img')){
   addImage(el as HTMLImageElement);
   if(lines.length>=limit)break;
   continue;
  }
  // Nested WOL groups must not duplicate their child paragraphs.
  if(el.matches('div.pGroup')&&el.querySelector('p,li,dd,div.p,div.par,div.paragraph,div[data-pid],section[data-pid]'))continue;
  if(el.matches('p,li,dd,div.p,div.par,div.paragraph,div[data-pid],section[data-pid]')&&
     el.querySelector('p,li,dd,div.p,div.par,div.paragraph,div[data-pid],section[data-pid]'))continue;
  const number=articleParagraphNumber(el);
  const readable=el.cloneNode(true) as Element;
  if(number)for(const marker of readable.querySelectorAll('.parNum,.pNum,[class~="parnum"]'))marker.remove();
  const text=readableOfficialElement(readable,'article',3500);
  if(text.length<3||seen.has(text)||/^ta réponse$/i.test(text)||/^(?:précédent|suivant|imprimer|partager)$/i.test(text))continue;
  seen.add(text);
  const classes=typeof el.className==='string'?el.className:'';
  let type:ReaderLine['type']='paragraph';
  if(/^H[1-4]$/.test(el.tagName))type='heading';
  else if(el.tagName==='FIGCAPTION'||/caption|legend/i.test(classes))type='caption';
  else if(/question|studyQ|questionText/i.test(classes)||/^\d{1,2}\.\s+.{6,}\?$/.test(text))type='question';
  else if(/studyNote|footnote/i.test(classes))type='note';
  else if(/crossRef|xref/i.test(classes))type='crossref';
  const explicit=[...el.querySelectorAll<HTMLAnchorElement>('a[href]')].slice(0,30)
   .map(a=>({label:cleanReadingText(a.textContent||''),
     url:allowLink(a.getAttribute('href')||'',sourceUrl)||''}))
   .filter(item=>item.url);
  lines.push({type,text,number,parts:linkifyReaderText(text,explicit)});
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
 // On chapter pages, links from other verses aren't pertinent.
 const selected=scripture&&isVerse?relevantVerseNode(doc,scripture):null;
 const local=selected?.closest('p,li,[data-verse]')||selected?.parentElement;
 const localLinks=local?[...local.querySelectorAll<HTMLAnchorElement>('a[href]'),
   ...(local.nextElementSibling?.querySelectorAll<HTMLAnchorElement>('a[href]')||[])]:[];
 const candidateLinks=isVerse?[...targeted,...localLinks]:root.querySelectorAll<HTMLAnchorElement>('a[href]');
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
     const candidate=node.closest('p, li, [data-verse]')||node.parentElement||node;
     const wrap=(candidate.textContent||'').length<1400?candidate:node;
     const verseText=exactVerseText(node,scripture);
     if(verseText)lines.push({type:'verse',text:verseText});
     else notice='Référence repérée, mais le texte exact du verset n’a pas été isolé. Vérifie sur WOL.';
     const apparatus=studyNotesForVerse(root,scripture);
     for(const part of apparatus)if(!lines.some(x=>x.text===part.text))lines.push(part);
     // The 2013 study Bible places notes, cross-references and research
     // indexes next to or beneath the verse, sometimes inside a sibling.
     const local=wrap.parentElement;
     if(local){
       const noteEls=[...local.querySelectorAll('.studyNote, .footnoteText, .crossReferenceText')].slice(0,12);
       for(const item of noteEls){
         const t=readableOfficialElement(item,'note',950);
         if(t&&t!==verseText&&!lines.some(x=>x.text===t))lines.push({type:item.matches('.crossReferenceText')?'crossref':'note',text:t});
       }
     }
   }else{
     const apparatus=studyNotesForVerse(root,scripture);
     if(apparatus.length){
       lines=apparatus;
       notice='Notes et renvois trouvés ; utilise WOL pour vérifier le texte exact du verset.';
     }else{
       notice='Le verset précis n’a pas pu être isolé : extrait du chapitre et accès à la Bible d’étude.';
       lines=[];
     }
   }
 }else{
   lines=gatherSections(root,official,isLookup?40:360);
   if(lines.length>=360)notice='Article très long : affichage limité. Ouvre WOL pour consulter la suite.';
 }
 if(!isVerse&&!lines.length&&normalizedText(root)){
   const fallback=readableOfficialElement(root,'article',2400);
   const articleStructure=!!root.querySelector(
     'h1,h2,p,li,blockquote,[data-pid],.par,.paragraph,.bodyTxt');
   if(fallback.length>=35&&articleStructure)
     lines=[{type:'paragraph',text:fallback}];
 }
 if(!lines.length)notice='Le contenu n’a pas pu être extrait : ouvre le document sur WOL.';
 return {title:heading||(scripture?.label||requested||'Document WOL'),sourceUrl:official,lines,
   links,kind:isVerse?'verse':isLookup?'results':'article',notice};
}
