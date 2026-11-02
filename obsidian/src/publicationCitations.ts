import { cleanReadingText } from './readerText.ts';
import { STRUCTURED_PUBLICATION_CODES } from './publicationAbbreviations.ts';

/** The visible citation is preserved; the lookup excludes its paragraph suffix. */
const MONTHS='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const PAR='(?:\\s*(?:§|par(?:agraphe)?s?\\.?)\\s*\\d{1,3}(?:\\s*(?:,|;|et|[-–])\\s*\\d{1,3})*)?';
// Official catalog includes everyday words (e.g. « la », « si »):
// only recognize a code when a real section/page locator follows.
// All 114 official mnemonics contain only [a-z0-9-]; a hyphen outside a
// regex character class is literal, and escaping it breaks Unicode regexes.
const CODES=[...STRUCTURED_PUBLICATION_CODES]
 .filter(code=>/^[a-z0-9-]+$/.test(code))
 .sort((a,b)=>b.length-a.length).join('|');
const LOCATOR='(?:\\s+(?:le[cç]on|chap(?:itre)?|partie|p(?:ages?)?)\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?|\\s*§\\s*\\d{1,3}(?:\\s*(?:,|;|et|[-–])\\s*\\d{1,3})*)';
const MONTHLY='(?:w\\d{2}(?:\\.\\d{1,2})?|wp\\d{2}(?:\\.\\d{1,2})?|g\\d{2}(?:\\.\\d{1,2})?|mwb\\d{2}(?:\\.\\d{1,2})?)\\s+(?:(?:'+MONTHS+')\\s+)?p\\.?\\s*\\d{1,3}(?:\\s*[-–]\\s*\\d{1,3})?'+PAR;
const MANUAL='(?:th|lmd|lff)\\s+(?:le[cç]on\\s*)?\\d{1,3}'+PAR;
const INSTRUCTIONS='s\\s*[-‐‑–]\\s*\\d{1,3}'+PAR;
const STRUCTURED='(?:'+CODES+')(?=\\s)(?:'+LOCATOR+')+';
const pattern=new RegExp(
 '(?<![\\p{L}\\p{N}])(?:'+MONTHLY+'|'+INSTRUCTIONS+'|'+MANUAL+'|'+STRUCTURED+')',
 'giu'
);
const suffix=/\s*(?:§|par(?:agraphe)?s?\.?)\s*\d{1,3}(?:\s*(?:,|;|et|[-–])\s*\d{1,3})*\s*$/iu;
export function publicationLookupLabel(reference:string):string{
 return cleanReadingText(reference).replace(suffix,'').trim();
}
export function citationParagraphs(reference:string):number[]{
 const suffixMatch=cleanReadingText(reference).match(suffix);
 if(!suffixMatch)return [];
 return [...new Set((suffixMatch[0].match(/\d{1,3}/g)||[]).map(Number).filter(x=>x>0&&x<=300))].slice(0,12);
}
export function findPublicationCitations(line:string):{from:number;to:number;label:string}[]{
 const result:{from:number;to:number;label:string}[]=[];
 for(const match of line.matchAll(pattern)){
  const label=match[0];
  if(label.length>130)continue;
  const from=match.index??0;
  result.push({from,to:from+label.length,label});
  if(result.length>=60)break;
 }
 return result;
}
/** Only IDs verified against an official WOL document; no inferred docids. */
export function verifiedPublicationUrl(reference:string):string|null{
 const base=publicationLookupLabel(reference).normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
 const document=(id:string)=>'https://wol.jw.org/fr/wol/d/r30/lp-f/'+id;
 if(/^s\s*[-‐‑–]\s*38$/.test(base))return document('1201038');
 if(/^th\s+(?:lecon\s*)?12$/.test(base))return document('1102018452');
 if(/^w22\s+fevrier\s+p\.?\s*13$/.test(base))return document('2022281');
 return null;
}
