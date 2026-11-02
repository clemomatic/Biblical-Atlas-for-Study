import { cleanReadingText } from './readerText.ts';
import { wolLookup } from './bibleLabData.ts';

/** Bibliographical citations are not Bible verses; recognize them separately. */
export interface PublicationMention {from:number;to:number;label:string;url:string}
const months='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const boundaries='(?<![\\p{L}\\p{N}])';
const sources=[
 new RegExp(boundaries+'((?:w|wp|g)\\d{2}(?:\\.\\d{1,2})?\\s+(?:'+months+')\\s+p\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?(?:\\s*§\\s*\\d{1,3}(?:\\s*[-–,]\\s*\\d{1,3})*)?)','giu'),
 new RegExp(boundaries+'((?:w|wp|g)\\d{2}\\.\\d{1,2}\\s+p\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?(?:\\s*§\\s*\\d{1,3})?)','giu'),
 new RegExp(boundaries+'(s\\s*[-–]\\s*\\d{1,3}\\s*§\\s*\\d{1,3}(?:\\s*[,;]\\s*\\d{1,3})*)','giu'),
 new RegExp(boundaries+'(od\\s+\\d{1,2}\\s*:\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?)','giu'),
 new RegExp(boundaries+'((?:th|lmd|lff)\\s+(?:leçon\\s*)?\\d{1,3})','giu')
];
function finder(docid:string,par?:number):string{
 const q=new URLSearchParams({wtlocale:'F',docid,srctype:'wol',srcid:'share'});
 if(par!==undefined)q.set('par',String(par));
 return 'https://www.jw.org/finder?'+q;
}
/** Restrict finder to an actual official WOL document, never arbitrary URLs. */
export function officialFinderUrl(value:string):string|null{
 try{
  const url=new URL(value.replace(/&amp;/g,'&'));
  if(url.protocol!=='https:'||url.hostname!=='www.jw.org'||url.pathname!=='/finder'||url.username||url.password)return null;
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
 if(/^od\s+8\s*:\s*8$/.test(s))return finder('1102014931',11);
 if(/^th\s+(?:leçon\s*)?12$/.test(s))
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102018452';
 const w22=s.match(/^w22\s+f[ée]vrier\s+p\.?\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?(?:\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*)?$/);
 if(w22&&Number(w22[1])>=8&&Number(w22[2]||w22[1])<=13)
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/2022281';
 return wolLookup(cleanReadingText(reference).replace(/\s*§\s*\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\s*$/,''));
}
export function findPublicationMentions(text:string):PublicationMention[]{
 const found:PublicationMention[]=[];
 for(const pattern of sources){
  for(const m of text.matchAll(pattern)){
   const label=m[1],from=(m.index||0)+(m[0].length-label.length),to=from+label.length;
   if(/[\p{L}\p{N}]/u.test(text[to]||''))continue;
   if(found.some(x=>from<x.to&&to>x.from))continue;
   found.push({from,to,label,url:publicationUrl(label)});
   if(found.length>=60)return found.sort((a,b)=>a.from-b.from);
  }
 }
 return found.sort((a,b)=>a.from-b.from);
}
