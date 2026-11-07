import {parseScripture,type ScriptureRef} from './bibleLabData.ts';
export interface EditorialNote {id:string;verse:string;html:string}
export function scriptureApiRange(ref:ScriptureRef):string {
  const code=(chapter:number,verse:number)=>String(ref.book)+String(chapter).padStart(3,'0')+String(verse).padStart(3,'0');
  return code(ref.chapter,ref.verse)+(ref.endChapter||ref.endVerse?'-'+code(ref.endChapter||ref.chapter,ref.endVerse||ref.verse):'');
}
export function studyNoteRanges(label:string):string[]{
  const ref=parseScripture(label);if(!ref)return [];
  if(ref.verses&&!ref.endVerse)return ref.verses.map(verse=>scriptureApiRange({...ref,verse,verses:undefined}));
  return [scriptureApiRange(ref)];
}
export function editorialNotes(payload:unknown):EditorialNote[]{
  const ranges=(payload as {ranges?:Record<string,{commentaries?:unknown[]}>})?.ranges;
  if(!ranges||typeof ranges!=='object')throw Error('Notes d’étude indisponibles.');
  const found=new Map<string,EditorialNote>();
  for(const entry of Object.values(ranges)){
    for(const raw of (Array.isArray(entry.commentaries)?entry.commentaries:[]).slice(0,120)){
      const note=raw as {id?:unknown;source?:unknown;content?:unknown};
      const source=String(note.source||'').replace(/^0/,'');
      if(typeof note.content!=='string'||note.content.length>100000||!/^\d{7,8}$/.test(source))continue;
      const id=String(note.id||source+'|'+note.content.slice(0,100));
      found.set(id,{id,verse:source,html:note.content});
    }
  }
  return [...found.values()];
}
/** Distinct language-specific IDs do not prove distinct editorial content.
 * We can establish absence only when that verse has no French study note.
 */
export function noteComparison(french:EditorialNote[],english:EditorialNote[]):Array<EditorialNote&{missingFrench:boolean}>{
  return english.map(note=>({...note,missingFrench:!french.some(n=>n.verse===note.verse)}));
}
/** The free endpoint accepts 500 UTF-8 bytes, not 500 JS characters. */
export function translationChunks(text:string):string[]{
  const encoder=new TextEncoder(),chunks:string[]=[];let current='';
  for(const token of text.match(/\S+\s*|\s+/gu)||[]){
    if(encoder.encode(current+token).length<=480){current+=token;continue;}
    if(current){chunks.push(current);current='';}
    for(const character of token){
      if(encoder.encode(current+character).length>480){chunks.push(current);current='';}
      current+=character;
    }
  }
  if(current)chunks.push(current);return chunks;
}
