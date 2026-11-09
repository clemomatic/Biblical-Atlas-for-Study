import type { BiblicalPerson } from '../../src/domain/history/types.ts';
import type { BiblicalPlace } from '../../src/types.ts';
import { BOOKS, parseScripture } from './bibleLabData.ts';
import type { LocalBibleLibrary } from './localBibleLibrary.ts';
import { selectLocalPassage, type LocalBibleData } from './localBibleData.ts';

/**
 * Proposals from explicit words in passages. Shared text or chapter does not
 * prove a meeting, participation or physical presence. Nothing is saved here.
 */
export interface EpisodeVerse { reference:string; text:string }
export interface EpisodePersonSuggestion {
  key:string;
  personId:string;
  name:string;
  reference:string;
  matchedName:string;
  /** Other places mentioned in the SAME verse; never individual locations. */
  placeNames:string[];
}
export interface EpisodePassageAnalysis {
  suggestions:EpisodePersonSuggestion[];
  ambiguousNames:string[];
  locations:Array<{id:string;name:string;references:string[]}>;
  verseCount:number;
  kind:'text-mentions-only';
}
export interface EpisodeLocalPassage { verses:EpisodeVerse[]; editionLabel:string }

const fold=(value:string):string=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[’‘]/g,"'").toLocaleLowerCase('fr').replace(/\s+/gu,' ').trim();
const quote=(value:string):string=>[...value].map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
const hasWord=(text:string,name:string):boolean=>name.length>=3&&
  new RegExp('(?:^|[^\\p{L}\\p{N}])'+quote(name)+'(?=$|[^\\p{L}\\p{N}])','u').test(text);
interface Alias { id:string; display:string }
const indexes=(items:readonly {id:string;name:string;alternateNames?:string[]}[]):Map<string,Alias[]>=>{
  const result=new Map<string,Alias[]>();
  for(const item of items)for(const label of [item.name,...(item.alternateNames??[])]){
    const key=fold(label);if(key.length<3)continue;
    const values=result.get(key)??[];
    if(!values.some(value=>value.id===item.id))values.push({id:item.id,display:item.name});
    result.set(key,values);
  }
  return result;
};

export function suggestEpisodeMentions(
  verses:readonly EpisodeVerse[],
  people:readonly BiblicalPerson[],
  places:readonly BiblicalPlace[]
):EpisodePassageAnalysis {
  if(verses.length>100)throw Error('Limite de 100 versets par analyse.');
  const personAliases=indexes(people);
  const placeAliases=indexes(places);
  const suggestions=new Map<string,EpisodePersonSuggestion>();
  const ambiguousNames=new Set<string>();
  const locations=new Map<string,{id:string;name:string;references:string[]}>();
  for(const verse of verses){
    if(typeof verse.reference!=='string'||!verse.reference.trim()||verse.reference.length>280||
       typeof verse.text!=='string'||verse.text.length>16000)throw Error('Verset invalide ou trop volumineux.');
    const text=fold(verse.text);
    const placeNames=new Map<string,string>();
    for(const [alias,candidates] of placeAliases){
      if(!hasWord(text,alias))continue;
      if(candidates.length!==1){ambiguousNames.add('Lieu : '+alias);continue;}
      const place=candidates[0];placeNames.set(place.id,place.display);
      const current=locations.get(place.id)??{id:place.id,name:place.display,references:[]};
      if(!current.references.includes(verse.reference))current.references.push(verse.reference);
      locations.set(place.id,current);
    }
    for(const [alias,candidates] of personAliases){
      if(!hasWord(text,alias))continue;
      if(candidates.length!==1){ambiguousNames.add('Personnage : '+alias);continue;}
      const person=candidates[0],key=person.id+'|'+verse.reference;
      if(!suggestions.has(key))suggestions.set(key,{
        key,personId:person.id,name:person.display,reference:verse.reference,
        matchedName:alias,placeNames:[...placeNames.values()]
      });
    }
  }
  return {kind:'text-mentions-only',verseCount:verses.length,
    suggestions:[...suggestions.values()],
    ambiguousNames:[...ambiguousNames].sort((a,b)=>a.localeCompare(b,'fr')),
    locations:[...locations.values()]};
}

/** Accept a Bible chapter (2 Samuel 11) or verse range (2 Samuel 11:1-7). */
export function identifyEpisodePassage(reference:string):
  {book:number;chapter:number;scripture:ReturnType<typeof parseScripture>}|null {
  const raw=reference.trim(),full=parseScripture(raw);
  if(full)return {book:full.book,chapter:full.chapter,scripture:full};
  const chapter=raw.match(/^(.+?)\s+(\d{1,3})$/u);
  if(!chapter)return null;
  const sample=parseScripture(chapter[1]+' '+chapter[2]+':1');
  return sample?{book:sample.book,chapter:sample.chapter,scripture:null}:null;
}

export function pastedEpisodeVerses(reference:string,text:string):EpisodeVerse[]{
  if(!reference.trim()||reference.length>280)throw Error('Indique la référence du passage.');
  if(!text.trim()||text.length>16000)throw Error('Colle un passage de moins de 16 000 caractères.');
  const parsed=identifyEpisodePassage(reference);
  const lines=text.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trim()).filter(Boolean);
  const numbered=parsed?.scripture===null&&lines.every(line=>/^\d{1,3}[.:\s]\s*\S/u.test(line));
  if(!parsed||!numbered)return [{reference:reference.trim(),text:text.trim()}];
  return lines.map(line=>{
    const match=/^(\d{1,3})[.:\s]\s*(.*)$/u.exec(line)!;
    const n=Number(match[1]);
    if(n<1||n>176||!match[2])throw Error('Numérotation des versets invalide.');
    return {reference:BOOKS[parsed.book-1]+' '+parsed.chapter+':'+n,text:match[2]};
  });
}

export function passageFromLocalBible(data:LocalBibleData,reference:string):EpisodeVerse[]|null{
  const parsed=identifyEpisodePassage(reference);
  if(!parsed)return null;
  const verses=parsed.scripture?selectLocalPassage(data,parsed.scripture):
    data.chapters.find(item=>item.book===parsed.book&&item.chapter===parsed.chapter)?.verses
      .filter(v=>v.number>0).map(v=>({book:parsed.book,chapter:parsed.chapter,number:v.number,text:v.text}))??null;
  if(!verses?.length||verses.length>100)return null;
  return verses.map(v=>({reference:BOOKS[v.book-1]+' '+v.chapter+':'+v.number,text:v.text}));
}

export async function readLocalEpisodePassage(
  library:Pick<LocalBibleLibrary,'editions'|'load'>,reference:string
):Promise<EpisodeLocalPassage|null>{
  if(!identifyEpisodePassage(reference))throw Error('Référence biblique non reconnue. Ex. : 2 Samuel 11.');
  for(const edition of await library.editions()){
    try{
      const data=await library.load(edition),verses=passageFromLocalBible(data,reference);
      if(verses)return {verses,editionLabel:edition.label};
    }catch{/* Try another installed edition, without contacting a network service. */}
  }
  return null;
}
