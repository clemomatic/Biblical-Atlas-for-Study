import { cleanReadingText } from './readerText.ts';
import { wolLookup, parseScripture } from './bibleLabData.ts';
import { PUBLICATION_CODES } from './publicationCatalog.ts';

/** Bibliographical citations are not Bible verses; recognize them separately. */
export interface PublicationMention {from:number;to:number;label:string;url:string}
const months='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const boundaries='(?<![\\p{L}\\p{N}])';
const paragraph='\\s*§\\s*\\d{1,3}(?:\\s*[,;–-]\\s*\\d{1,3})*';
const page='p\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?';
const chapters='chap(?:itre)?\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})*';
const sourceCodes=PUBLICATION_CODES.slice().sort((a,b)=>b.length-a.length)
 .map(v=>v.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&')).join('|');
// A bare "cl" or "be" is not necessarily a bibliographic citation.
const locators=[
 chapters+'(?:\\s+'+page+')?(?:'+paragraph+')?',
 '(?:leçon|lecons?|hist(?:oire)?|partie|étude|annexe|appendice)\\.?\\s*\\d{1,3}(?:'+paragraph+')?',
 page+'(?:'+paragraph+')?',
 '\\d{1,3}\\s*:\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?',
 paragraph,
 // Index quotations frequently omit "p." (e.g. "it-1 875", "od 42-43").
 '\\d{1,4}(?:\\s*[-–,]\\s*\\d{1,4})*(?:'+paragraph+')?'
].join('|');
const sources=[
 new RegExp(boundaries+'((?:w|wp|g)\\d{2}(?:\\.\\d{1,2})?\\s+(?:'+months+')\\s+'+page+'(?:'+paragraph+')?)','giu'),
 new RegExp(boundaries+'((?:w|wp|g)\\d{2}\\.\\d{1,2}\\s+'+page+'(?:'+paragraph+')?)','giu'),
 // Compact date/page references used by the official Index.
 new RegExp(boundaries+'((?:w|wp|g|mwb)\\d{2}\\.\\d{1,2}\\s+\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})*)','giu'),
 // Ministry of the Kingdom is cited by month/year without a page, e.g.
 // "km 05/95" = May 1995; WOL's own short form is "km 5/95".
 new RegExp(boundaries+'(km\\s+(?:0?[1-9]|1[0-2])/\\d{2}(?:\\s+p\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?)?)','giu'),
 new RegExp(boundaries+'(s\\s*[-–]\\s*\\d{1,3}'+paragraph+')','giu'),
 new RegExp(boundaries+'(('+sourceCodes+')\\s+(?:'+locators+'))','giu'),
 new RegExp(boundaries+'((?:th|lmd|lff|lffi)\\s+\\d{1,3})','giu')
];
/** Numbers cited after a § marker, including separated paragraph lists. */
export function referencedParagraphs(reference:string):string[]{
 const clean=cleanReadingText(reference);
 const marked=clean.match(/§\s*(\d{1,3}(?:\s*[,;]\s*\d{1,3})*)/);
 if(marked)return [...new Set((marked[1].match(/\d{1,3}/g)||[]))].slice(0,12);
 const colon=clean.match(/^od\s+\d{1,3}\s*:\s*(\d{1,3})$/i);
 return colon?[colon[1]]:[];
}
export function referencedParagraph(reference:string):string|undefined{
 return referencedParagraphs(reference)[0];
}
export function bookChapterLocator(reference:string):{code:string;chapter:number}|null{
 const clean=cleanReadingText(reference).toLocaleLowerCase('fr');
 const m=clean.match(/^([a-z][a-z0-9-]{0,9})\s+(?:chap(?:itre)?\.?\s*(\d{1,3})\b|(\d{1,3})\s*:\s*\d{1,3}\b)/);
 if(!m||!PUBLICATION_CODES.includes(m[1]))return null;
 return {code:m[1],chapter:Number(m[2]||m[3])};
}

function finder(docid:string,par?:number):string{
 const q=new URLSearchParams({wtlocale:'F',docid,srctype:'wol',srcid:'share'});
 if(par!==undefined)q.set('par',String(par));
 return 'https://www.jw.org/finder?'+q;
}
/** Restrict finder to an actual official WOL document, never arbitrary URLs. */
export function officialFinderUrl(value:string):string|null{
 try{
  const url=new URL(value.replace(/\\&/g,'&').replace(/&amp;/gi,'&'));
  if(url.protocol!=='https:'||!['www.jw.org','jw.org'].includes(url.hostname)||url.pathname!=='/finder'||url.username||url.password)return null;
  const q=url.searchParams;
  const docid=q.get('docid')||'';
  const par=q.get('par');
  if(!/^\d{7,11}$/.test(docid)||q.get('wtlocale')!=='F'||!['wol',null].includes(q.get('srctype')))return null;
  if(par!==null&&(!/^\d{1,5}$/.test(par)||Number(par)<1))return null;
  if([...q.keys()].some(k=>!['wtlocale','docid','srctype','srcid','par'].includes(k)))return null;
  return finder(docid,par===null?undefined:Number(par));
 }catch{return null;}
}
export function finderDocumentUrl(value:string):string|null{
 const url=officialFinderUrl(value);
 if(!url)return null;
 const docid=new URL(url).searchParams.get('docid');
 return docid?'https://wol.jw.org/fr/wol/d/r30/lp-f/'+docid:null;
}
/** Exact user-verified paragraph links, never infer a made-up par offset. */
export function publicationUrl(reference:string):string{
 const s=cleanReadingText(reference).toLocaleLowerCase('fr').replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
 if(/^s\s*-\s*38\s*§\s*1$/.test(s))return finder('1201038',31);
 if(/^s\s*-\s*38\s*§\s*20\s*,\s*25$/.test(s))return finder('1201038',60);
 if(/^s\s*-\s*38\s*§\s*\d{1,3}(?:\s*[,;]\s*\d{1,3})*$/.test(s))
  return finder('1201038'); // known document, paragraph not verified
 if(/^od\s+8\s*:\s*8$/.test(s))return 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102014938';
 if(/^th\s+(?:leçon\s*)?12$/.test(s))
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102018452';
 const w22=s.match(/^w22\s+f[ée]vrier\s+p\.?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)?$/);
 if(w22&&Number(w22[1])>=8&&Number(w22[2]||w22[1])<=13)
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/2022281';
 const km=s.match(/^km\s+0?([1-9]|1[0-2])\/(\d{2})(?:\s+p\.?\s*(\d{1,3}))?$/);
 if(km){
   // Never infer an article ID from only the month and year. Resolve through
   // WOL's official bibliography using its canonical non-zero-padded code.
   return wolLookup('km '+Number(km[1])+'/'+km[2]+(km[3]?' p. '+km[3]:''));
 }
 return wolLookup(cleanReadingText(reference).replace(/\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*$/,''));
}
export function findPublicationMentions(text:string):PublicationMention[]{
 const found:PublicationMention[]=[];
 for(const pattern of sources){
  for(const m of text.matchAll(pattern)){
   const label=m[1],from=(m.index||0)+(m[0].length-label.length),to=from+label.length;
   if(/[\p{L}\p{N}]/u.test(text[to]||''))continue;
   if(parseScripture(label))continue; // e.g. jr 45:3 is Scripture
   if(found.some(x=>from<x.to&&to>x.from))continue;
   found.push({from,to,label,url:publicationUrl(label)});
   if(found.length>=60)return found.sort((a,b)=>a.from-b.from);
  }
 }
 return found.sort((a,b)=>a.from-b.from);
}
