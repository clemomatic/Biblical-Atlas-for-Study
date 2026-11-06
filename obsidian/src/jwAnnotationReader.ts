import type {ReaderLine,ReaderResult,ReferenceEntry} from './referenceReader.ts';
import type {App} from 'obsidian';
import {parseScripture} from './bibleLabData.ts';
import {loadLatestAnnotationArchive,annotationsForBibleChapter} from './jwAnnotationLibrary.ts';
import type {VirtualBlock} from './virtualJwpub.ts';
import type {DocumentAnnotations} from './jwAnnotationLibrary.ts';
import {colorizeJwText} from './jwTextHighlight.ts';

export function readerLinesFromJwBlocks(
 blocks:readonly VirtualBlock[],annotations:DocumentAnnotations|null
):ReaderLine[]{
 return blocks.map(block=>{
  const parts=colorizeJwText(block.text,block,annotations?.marks||[])
    .map(piece=>({text:piece.text,...(piece.color?{highlightColor:piece.color}:{})}));
  return {
   type:block.kind==='verse'?'verse':block.kind==='heading'?'heading':'paragraph',
   text:block.text,
   ...(block.kind==='verse'?{number:String(block.identifier)}:{}),
   parts
  };
 });
}
export function readerPersonalNotes(
 annotations:DocumentAnnotations|null
):NonNullable<ReaderResult['personalNotes']>{
 if(!annotations)return [];
 return annotations.notes.map(note=>({
   title:note.title,content:note.content,
   tags:note.tags
 })).filter(note=>note.content.trim()||note.title.trim());
}


/** For official WOL fallback, show personal notes by exact Bible verse anchor.
 * Do not apply word colours to an unverified online edition. */
export async function attachPersonalBibleNotes(
 app:App,root:string,
 ref:ReferenceEntry,
 result:ReaderResult
):Promise<ReaderResult>{
 if(ref.kind!=='scripture'||result.personalNotes?.length)return result;
const passage=parseScripture(ref.label);
 if(!passage||passage.endChapter)return result;
const archive=await loadLatestAnnotationArchive(app,root);
 if(!archive)return result;
 const found=annotationsForBibleChapter(archive.index,passage.book,passage.chapter);
 if(!found)return result;
 const verses=new Set(passage.verses||Array.from({
   length:Math.max(1,Math.min(176,(passage.endVerse||passage.verse)-passage.verse+1))
 },(_,i)=>passage.verse+i));
 const personalNotes=readerPersonalNotes({
   ...found,notes:found.notes.filter(note=>
     note.blockIdentifier!==null&&verses.has(note.blockIdentifier))
 });
 return personalNotes.length?{...result,personalNotes}:result;
}
