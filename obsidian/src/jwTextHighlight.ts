/** Recreate JW Library colours on text without exposing database coordinates. */
import type {JwAnnotationRange,JwAnnotationMark,JwAnnotationNote} from './jwAnnotations.ts';
import type {VirtualBlock} from './virtualJwpub.ts';

export interface HighlightedFragment {text:string;color?:number}
export interface MarkForReading {mark:JwAnnotationMark;ranges:JwAnnotationRange[]}
/** JW Library colour indices: 1 yellow, 2 green, 3 blue, 4 red, 5 orange, 6 purple. */
export const JW_HIGHLIGHT_COLORS:Readonly<Record<number,string>>={
 1:'#ffe58a',2:'#b7eb9c',3:'#a8d5ff',4:'#ffc0ba',5:'#ffd1a3',6:'#d9baff'
};
/**
 * Treat token positions as 0-based word ranges. Never highlight a whole
 * paragraph when the recorded position cannot be verified within its text.
 */
export function colorizeJwText(text:string,block:VirtualBlock,marks:readonly MarkForReading[]):HighlightedFragment[]{
 if(!text)return [];
 const tokens=[...text.matchAll(/\S+/gu)].map(m=>({start:m.index!,end:m.index!+m[0].length}));
 if(!tokens.length)return [{text}];
 const colors=new Array<number|undefined>(tokens.length).fill(undefined);
 for(const {mark,ranges} of marks){
  if(!JW_HIGHLIGHT_COLORS[mark.color])continue;
  for(const range of ranges){
   if(range.identifier!==block.identifier||range.start<0||range.end<range.start||
      range.end>=tokens.length)continue;
   // Study Bible verses use block type 2. Generic publication paragraphs use 1.
   // Other types are kept for future mapping, not guessed.
   if(block.kind==='verse'&&range.blockType!==2&&range.blockType!==1)continue;
   if(block.kind!=='verse'&&range.blockType!==1)continue;
   for(let n=range.start;n<=range.end;n++)colors[n]=mark.color;
  }
 }
 const result:HighlightedFragment[]=[];
 const add=(value:string,color?:number)=>{
  if(!value)return;
  const previous=result[result.length-1];
  if(previous&&previous.color===color)previous.text+=value;
  else result.push({text:value,...(color?{color}:{})});
 };
 let pos=0;
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i],color=colors[i];
  // Keep spaces between consecutive highlighted words in the same mark.
  add(text.slice(pos,token.start),i>0&&colors[i-1]===color?color:undefined);
  add(text.slice(token.start,token.end),color);
  pos=token.end;
 }
 add(text.slice(pos));
 return result;
}
export function notesForBlock(notes:readonly JwAnnotationNote[],block:VirtualBlock):JwAnnotationNote[]{
 return notes.filter(note=>note.blockIdentifier===block.identifier&&
   (block.kind==='verse'?(note.blockType===2||note.blockType===1):note.blockType===1));
}
