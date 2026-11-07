import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';
import {normalizeSearch,type ScriptureRef} from './bibleLabData.ts';

export const LOCAL_BIBLE_FILE='_JW_STUDY_DESK_BIBLE.json.gz';
export interface LocalVerse {number:number;text:string}
export interface LocalChapter {book:number;chapter:number;verses:LocalVerse[]}
export interface LocalBibleData {
  schema:1;
  sourceHash:string;
  publication:{symbol:string;year:number;language:number;title:string};
  chapters:LocalChapter[];
}
export interface LocatedVerse extends LocalVerse {book:number;chapter:number}
const MAX_BYTES=32*1024*1024;
export function validateLocalBible(raw:unknown):LocalBibleData {
  const data=raw as LocalBibleData;
  if(data?.schema!==1||!data.publication||!['nwt','nwtsty'].includes(data.publication.symbol)||
    data.publication.language!==3||!Number.isInteger(data.publication.year)||
    typeof data.publication.title!=='string'||data.publication.title.length>240||
    !/^[a-f0-9]{64}$/.test(data.sourceHash)||!Array.isArray(data.chapters)||
    !data.chapters.length||data.chapters.length>1200)throw Error('Bible locale non reconnue.');
  const keys=new Set<string>();let count=0;
  for(const ch of data.chapters){
    const key=ch.book+':'+ch.chapter;
    if(!Number.isInteger(ch.book)||ch.book<1||ch.book>66||!Number.isInteger(ch.chapter)||
      ch.chapter<1||ch.chapter>150||keys.has(key)||!Array.isArray(ch.verses)||
      !ch.verses.length||ch.verses.length>200)throw Error('Chapitre local invalide.');
    keys.add(key);let previous=-1;
    for(const v of ch.verses){
      if(!Number.isInteger(v.number)||v.number<0||v.number>200||v.number<=previous||
        typeof v.text!=='string'||!v.text.trim()||v.text.length>16000)throw Error('Verset local invalide.');
      previous=v.number;if(++count>40000)throw Error('Bible locale trop volumineuse.');
    }
  }
  return data;
}
export function encodeLocalBible(data:LocalBibleData):Uint8Array {
  validateLocalBible(data);const raw=strToU8(JSON.stringify(data));
  if(raw.byteLength>MAX_BYTES)throw Error('Bible locale trop volumineuse.');
  return gzipSync(raw,{level:6});
}
export function decodeLocalBible(bytes:Uint8Array):LocalBibleData {
  if(bytes.length<18||bytes.length>MAX_BYTES||bytes[0]!==31||bytes[1]!==139||
    new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(bytes.length-4,true)>MAX_BYTES)
    throw Error('Bible locale non reconnue.');
  const raw=gunzipSync(bytes);
  if(raw.byteLength>MAX_BYTES)throw Error('Bible locale trop volumineuse.');
  return validateLocalBible(JSON.parse(strFromU8(raw)));
}
/** Official chapter identifiers, never digit splitting or paragraph order.
 * Poetry can split the same verse across several spans; keep every fragment.
 * The chapter numeral, footnote letters and cross-reference markers are not text.
 */
export function extractLocalChapter(doc:Document,book:number,chapter:number):LocalChapter|null {
  const fragments=new Map<number,string[]>();
  for(const element of Array.from(doc.querySelectorAll('span.v[id]'))){
    const match=/^v(\d+)-(\d+)-(\d+)(?:-\d+)?$/.exec(element.id);
    if(!match||Number(match[1])!==book||Number(match[2])!==chapter)continue;
    const number=Number(match[3]);if(number>200)continue;
    const copy=element.cloneNode(true) as HTMLElement;
    for(const marker of Array.from(copy.querySelectorAll('.vl,.cl,.fn,.m,.tt,[data-fnid],[data-mid],[data-xref],.xrefRef,.fnRef,sup,script,style')))marker.remove();
    const text=(copy.textContent||'').replace(/\s+/gu,' ').trim();
    if(text){const parts=fragments.get(number)||[];parts.push(text);fragments.set(number,parts);}
  }
  const verses=[...fragments].sort(([a],[b])=>a-b).map(([number,text])=>({number,text:text.join(' ')}));
  return verses.length?{book,chapter,verses}:null;
}
/** A local preview must cover the whole requested passage. */
export function selectLocalPassage(data:LocalBibleData,ref:ScriptureRef):LocatedVerse[]|null {
  const endChapter=ref.endChapter||ref.chapter;
  const selected:LocatedVerse[]=[];
  for(let number=ref.chapter;number<=endChapter;number++){
    const ch=data.chapters.find(c=>c.book===ref.book&&c.chapter===number);
    if(!ch)return null;
    const start=number===ref.chapter?ref.verse:1;
    const end=number===endChapter?(ref.endVerse||ref.verse):Math.max(...ch.verses.map(v=>v.number));
    const numbers=ref.verses&&endChapter===ref.chapter?ref.verses:
      Array.from({length:Math.max(0,end-start+1)},(_,i)=>start+i);
    if(!numbers.length)return null;
    for(const n of numbers){
      const v=ch.verses.find(v=>v.number===n);
      if(!v)return null;
      selected.push({book:ch.book,chapter:ch.chapter,...v});
    }
  }
  return selected.length?selected:null;
}
export interface SearchableVerse extends LocatedVerse {folded:string}
export function searchableVerses(data:LocalBibleData):SearchableVerse[]{
  return data.chapters.flatMap(ch=>ch.verses.filter(v=>v.number>0)
    .map(v=>({book:ch.book,chapter:ch.chapter,...v,folded:normalizeSearch(v.text)})));
}
export function bibleSearchTerms(query:string):string[]{
  return [...new Set(normalizeSearch(query).split(/\s+/u).filter(Boolean))];
}
export function matchesBibleSearch(verse:SearchableVerse,terms:string[],book=0):boolean {
  return terms.length>0&&(!book||verse.book===book)&&terms.every(term=>verse.folded.includes(term));
}
export function localBibleLabel(symbol:string):string {
  return symbol==='nwtsty'?'Bible · édition d’étude':'Bible · Traduction du monde nouveau';
}
