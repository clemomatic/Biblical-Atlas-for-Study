import type {ReaderLine,ReaderResult} from './referenceReader.ts';
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
