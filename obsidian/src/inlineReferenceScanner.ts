import { extractReferences, parseScripture } from './bibleLabData';
import { passageUrl, type ReferenceEntry } from './referenceReader';

/** Matches in an individual visible line, not in Markdown syntax or code. */
export interface InlineReference {from:number;to:number;label:string;ref:ReferenceEntry}
const publication=/\b(?:w\d{2}(?:\.\d{1,2})?|wp\d{2}(?:\.\d{1,2})?|g\d{2}(?:\.\d{1,2})?)\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+p\.?\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?|\b(?:lmd|lff)\s+(?:leçon\s*)?\d{1,3}\b/giu;

/** Skip code, Markdown links, wiki links, autolinks, and raw URLs. */
function protectedRanges(line:string):Array<[number,number]>{
 const ranges:Array<[number,number]>=[];
 const patterns=[
  /\x60[^\x60\r\n]*\x60/g, /\[[^\]\r\n]*\]\([^)\r\n]*\)/g,
  /\[\[[^\]\r\n]*\]\]/g, /https?:\/\/[^\s<>()]+/g,
  /<https?:\/\/[^>]+>/g
 ];
 for(const expression of patterns){
  for(const match of line.matchAll(expression))ranges.push([match.index!,match.index!+match[0].length]);
 }
 return ranges;
}
const isWord=(text:string)=>/[\p{L}\p{N}]/u.test(text);
const safeBoundary=(text:string,start:number,end:number)=>
  (start===0||!isWord(text[start-1]))&&(end===text.length||!isWord(text[end]));
export function findInlineReferences(line:string):InlineReference[]{
 if(line.length>14000||!line.trim()||/^\s*(?:>|#{1,6}\s+)?(?:\x60{3}|~~~)/.test(line)||
   /^\s*(?:---|<!--)/.test(line))return [];
 const protectedSpans=protectedRanges(line);
 const result:InlineReference[]=[];
 const add=(start:number,end:number,label:string):void=>{
  if(!safeBoundary(line,start,end))return;
  if(protectedSpans.some(([a,b])=>start<b&&end>a))return;
  if(result.some(x=>start<x.to&&end>x.from))return;
  const scripture=parseScripture(label);
  const ref:ReferenceEntry={label,url:passageUrl(label),
   kind:scripture?'scripture':'publication',origin:'pinned'};
  result.push({from:start,to:end,label,ref});
 };
 // Reuse the same French Bible book aliases as the sidebar.
 for(const citation of extractReferences(line).slice(0,35)){
  let offset=0;
  const lowered=line.toLocaleLowerCase('fr');
  const needle=citation.toLocaleLowerCase('fr');
  for(let n=0;n<12;n++){
   const at=lowered.indexOf(needle,offset);
   if(at<0)break;
   add(at,at+citation.length,line.slice(at,at+citation.length));
   offset=at+citation.length;
  }
 }
 for(const match of line.matchAll(publication)){
  const at=match.index??0;
  add(at,at+match[0].length,match[0]);
 }
 return result.sort((a,b)=>a.from-b.from);
}

/** Explicit conversion is optional. Automatic highlighting never edits notes. */
export function linkReferencesInMarkdown(markdown:string):{text:string;count:number}{
 let count=0;
 let inFence=false;
 let inYaml=false;
 const lines=markdown.split('\n');
 const result=lines.map((line,index)=>{
  if(index===0&&line.trim()==='---'){inYaml=true;return line;}
  if(inYaml){if(line.trim()==='---'||line.trim()==='...')inYaml=false;return line;}
  if(/^\s*(\x60{3,}|~{3,})/.test(line)){inFence=!inFence;return line;}
  if(inFence)return line;
  const refs=findInlineReferences(line);
  if(!refs.length)return line;
  count+=refs.length;
  let next=line;
  for(const item of refs.slice().reverse()){
   const target=item.ref.url.replaceAll(')','%29');
   next=next.slice(0,item.from)+'['+item.label+']('+target+')'+next.slice(item.to);
  }
  return next;
 });
 return {text:result.join('\n'),count};
}
