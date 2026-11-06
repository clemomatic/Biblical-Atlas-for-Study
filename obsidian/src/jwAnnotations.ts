/**
 * Import JW Library annotations into a compact read-only archive.
 *
 * Schema 14 (2025) and schema 16 (2026) verified against real user backups.
 * This module is independent of Obsidian and never uploads annotation data.
 */
import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';

export interface AnnotationSqlite {
  exec(query:string):{columns:string[];values:unknown[][]}[];
}
export interface JwAnnotationLocation {
  id:number;book:number|null;chapter:number|null;document:number|null;
  issue:number|null;symbol:string|null;language:number|null;type:number;
  specialty:string|null;edition:string|null;
}
export interface JwAnnotationMark {
  id:number;guid:string;color:number;style:number;location:number;
}
export interface JwAnnotationRange {
  mark:number;blockType:number;identifier:number;start:number;end:number;
}
export interface JwAnnotationNote {
  id:number;guid:string;title:string;content:string;location:number|null;
  mark:number|null;blockType:number|null;blockIdentifier:number|null;
  created:string|null;modified:string|null;tags:string[];
}
export interface JwAnnotationBookmark {
  id:number;location:number|null;publicationLocation:number|null;
  slot:number;title:string;snippet:string;blockType:number|null;
  blockIdentifier:number|null;
}
export interface JwAnnotationIndex {
  format:'bible-lab-annotations';version:1;schema:number;
  sourceHash:string;
  locations:JwAnnotationLocation[];
  marks:JwAnnotationMark[];
  ranges:JwAnnotationRange[];
  notes:JwAnnotationNote[];
  bookmarks:JwAnnotationBookmark[];
}
export const ANNOTATION_INDEX_NAME='annotations.json.gz';
export const ANNOTATION_META_NAME='_BIBLE_LAB_ANNOTATIONS.json';
const MAX_ANNOTATION_DATA=80*1024*1024;
const MAX_ROWS=150000;
function rows(db:AnnotationSqlite,query:string):Record<string,unknown>[] {
  const records=db.exec(query)[0];
  if(!records)return [];
  if(records.values.length>MAX_ROWS)throw Error('Trop de données JW Library.');
  return records.values.map(values=>Object.fromEntries(
    records.columns.map((column,i)=>[column,values[i]])
  ));
}
const num=(v:unknown):number|null=>
  typeof v==='number'&&Number.isSafeInteger(v)?v:null;
const str=(v:unknown):string|null=>
  typeof v==='string'?v:null;
const safe=(v:unknown,max=10000):string=>(str(v)||'').slice(0,max);
const maxArray=<T>(values:T[],limit:number,what:string):T[]=>{
  if(values.length>limit)throw Error('Trop de '+what+' dans la sauvegarde.');
  return values;
};
function columns(db:AnnotationSqlite,table:string):string[]{
  return rows(db,'PRAGMA table_info("'+table+'")').map(x=>safe(x.name,100));
}
function fieldSql(db:AnnotationSqlite,table:string,optional:string[]):string {
  const present=new Set(columns(db,table));
  return optional.map(name=>present.has(name)?'"'+name+'"':'NULL AS "'+name+'"').join(',');
}
export function extractJwAnnotations(
  db:AnnotationSqlite,schema:number,sourceHash:string
):JwAnnotationIndex {
  if(schema<14||schema>16)throw Error('Schéma JW Library non pris en charge.');
  const locations=rows(db,'SELECT LocationId,BookNumber,ChapterNumber,DocumentId,'+
    'IssueTagNumber,KeySymbol,MepsLanguage,Type,'+
    fieldSql(db,'Location',['Specialty','Edition'])+' FROM Location')
    .map(r=>({
      id:num(r.LocationId)??0,book:num(r.BookNumber),chapter:num(r.ChapterNumber),
      document:num(r.DocumentId),issue:num(r.IssueTagNumber),
      symbol:str(r.KeySymbol),language:num(r.MepsLanguage),
      type:num(r.Type)??0,specialty:str(r.Specialty),edition:str(r.Edition)
    }));
  const marks=rows(db,'SELECT UserMarkId,UserMarkGuid,ColorIndex,StyleIndex,LocationId FROM UserMark')
    .map(r=>({
      id:num(r.UserMarkId)??0,guid:safe(r.UserMarkGuid,80),
      color:num(r.ColorIndex)??0,style:num(r.StyleIndex)??0,
      location:num(r.LocationId)??0
    }));
  const ranges=rows(db,'SELECT UserMarkId,BlockType,Identifier,StartToken,EndToken FROM BlockRange')
    .map(r=>({
      mark:num(r.UserMarkId)??0,blockType:num(r.BlockType)??0,
      identifier:num(r.Identifier)??0,start:num(r.StartToken)??0,
      end:num(r.EndToken)??0
    }));
  const tags=new Map<number,string[]>();
  for(const r of rows(db,'SELECT tm.NoteId,t.Name FROM TagMap tm JOIN Tag t ON '+
    'tm.TagId=t.TagId WHERE tm.NoteId IS NOT NULL ORDER BY tm.Position')){
    const id=num(r.NoteId);if(id===null)continue;
    const array=tags.get(id)||[];array.push(safe(r.Name,180));tags.set(id,array);
  }
  const notes=rows(db,'SELECT NoteId,Guid,Title,Content,LocationId,UserMarkId,'+
    'BlockType,BlockIdentifier,Created,LastModified FROM Note')
    .map(r=>({
      id:num(r.NoteId)??0,guid:safe(r.Guid,80),
      title:safe(r.Title,500),content:safe(r.Content,100000),
      location:num(r.LocationId),mark:num(r.UserMarkId),
      blockType:num(r.BlockType),blockIdentifier:num(r.BlockIdentifier),
      created:r.Created==null?null:String(r.Created),
      modified:r.LastModified==null?null:String(r.LastModified),
      tags:tags.get(num(r.NoteId)??-1)||[]
    }));
  const bookmarks=rows(db,'SELECT BookmarkId,LocationId,PublicationLocationId,'+
    'Slot,Title,Snippet,BlockType,BlockIdentifier FROM Bookmark')
    .map(r=>({
      id:num(r.BookmarkId)??0,location:num(r.LocationId),
      publicationLocation:num(r.PublicationLocationId),
      slot:num(r.Slot)??0,title:safe(r.Title,500),
      snippet:safe(r.Snippet,2000),blockType:num(r.BlockType),
      blockIdentifier:num(r.BlockIdentifier)
    }));
  maxArray(locations,25000,'emplacements');
  maxArray(marks,100000,'surlignages');
  maxArray(ranges,130000,'plages surlignées');
  maxArray(notes,20000,'notes');
  maxArray(bookmarks,5000,'signets');
  const locationIds=new Set(locations.map(x=>x.id));
  const markIds=new Set(marks.map(x=>x.id));
  if(marks.some(m=>!locationIds.has(m.location))||
     ranges.some(r=>!markIds.has(r.mark)))
    throw Error('Correspondances des surlignages incohérentes.');
  return {format:'bible-lab-annotations',version:1,schema,sourceHash,
    locations,marks,ranges,notes,bookmarks};
}
export function encodeJwAnnotations(value:JwAnnotationIndex):Uint8Array{
  const bytes=strToU8(JSON.stringify(value));
  if(bytes.length>MAX_ANNOTATION_DATA)throw Error('Annotations trop volumineuses.');
  return gzipSync(bytes,{level:6});
}
export function decodeJwAnnotations(bytes:Uint8Array):JwAnnotationIndex{
  if(bytes.byteLength>MAX_ANNOTATION_DATA||bytes[0]!==31||bytes[1]!==139)
    throw Error('Archive d’annotations invalide.');
  const raw=gunzipSync(bytes);
  if(raw.byteLength>MAX_ANNOTATION_DATA)throw Error('Annotations trop volumineuses.');
  const result:unknown=JSON.parse(strFromU8(raw));
  if(!result||typeof result!=='object')throw Error('Annotations invalides.');
  const v=result as Partial<JwAnnotationIndex>;
  if(v.format!=='bible-lab-annotations'||v.version!==1||
    !Array.isArray(v.locations)||!Array.isArray(v.marks)||
    !Array.isArray(v.ranges)||!Array.isArray(v.notes)||
    !Array.isArray(v.bookmarks))throw Error('Index d’annotations non reconnu.');
  return v as JwAnnotationIndex;
}
export function summarizeJwAnnotations(index:JwAnnotationIndex){
  return {
    schema:index.schema,highlights:index.marks.length,ranges:index.ranges.length,
    notes:index.notes.length,bookmarks:index.bookmarks.length,
    bibleLocations:index.locations.filter(l=>l.book!==null).length,
    publicationLocations:index.locations.filter(l=>l.document!==null).length
  };
}
