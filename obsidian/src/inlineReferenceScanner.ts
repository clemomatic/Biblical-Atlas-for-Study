import { findScriptureMentions, parseScripture } from './bibleLabData.ts';
import { passageUrl, type ReferenceEntry } from './referenceReader.ts';
import { findPublicationMentions } from './publicationReferences.ts';
import { markdownCitationScanText } from './markdownCitationScan.ts';

/** Matches in an individual visible line, not in Markdown syntax or code. */
export interface InlineReference {from:number;to:number;label:string;ref:ReferenceEntry}


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
export function findInlineReferences(line:string,inheritedBook?:string):InlineReference[]{
 if(line.length>14000||!line.trim()||/^\s*(?:>|#{1,6}\s+)?(?:\x60{3}|~~~)/.test(line)||
   /^\s*(?:---|<!--)/.test(line))return [];
 const protectedSpans=protectedRanges(line);
 const scan=markdownCitationScanText(line);
 const result:InlineReference[]=[];
 const add=(start:number,end:number,label:string,sourceUrl?:string,canonicalLabel?:string):void=>{
  if(!safeBoundary(line,start,end))return;
  if(protectedSpans.some(([a,b])=>start<b&&end>a))return;
  if(result.some(x=>start<x.to&&end>x.from))return;
  const finalLabel=canonicalLabel||label;
  const scripture=parseScripture(finalLabel);
  const ref:ReferenceEntry={label:finalLabel,url:sourceUrl||passageUrl(finalLabel),
   kind:scripture?'scripture':'publication',origin:'pinned'};
  result.push({from:start,to:end,label,ref});
 };
 // Use source offsets rather than re-searching a normalized label:
 // abbreviation punctuation, case and repeated occurrences remain exact.
 for(const citation of findScriptureMentions(scan,inheritedBook).slice(0,35)){
  add(citation.from,citation.to,line.slice(citation.from,citation.to),undefined,citation.ref.label);
 }
 for(const item of findPublicationMentions(scan)){
  const canonical=item.label.replace(/\s+/g,' ').trim();
  add(item.from,item.to,line.slice(item.from,item.to),item.url,canonical);
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
   const isBracketed=line[item.from-1]==='['&&line[item.to]===']'&&
     line[item.from-2]!=='['&&line[item.to+1]!==']';
   const from=isBracketed?item.from-1:item.from;
   const to=isBracketed?item.to+1:item.to;
   next=next.slice(0,from)+'['+item.label+']('+target+')'+next.slice(to);
  }
  return next;
 });
 return {text:result.join('\n'),count};
}
