import type {App,TFile} from 'obsidian';
import {
  ANNOTATION_INDEX_NAME,ANNOTATION_META_NAME,decodeJwAnnotations,
  type JwAnnotationIndex,type JwAnnotationLocation,
  type JwAnnotationMark,type JwAnnotationNote,type JwAnnotationRange,
  type JwAnnotationBookmark
} from './jwAnnotations';
import type {OfflineDocumentRecord} from './offlinePublications';

export interface AnnotationArchive {
  folder:string;modified:number;index:JwAnnotationIndex;
}
export interface DocumentAnnotations {
  confidence:'exact-meps'|'document-id';
  marks:{mark:JwAnnotationMark;ranges:JwAnnotationRange[]}[];
  notes:JwAnnotationNote[];
  bookmarks:JwAnnotationBookmark[];
  locationIds:number[];
}
const cleanIssue=(raw:string|number|null|undefined):number=>
  typeof raw==='number'&&Number.isSafeInteger(raw)?raw:
  typeof raw==='string'&&/^\d{6}$/.test(raw)?Number(raw):0;
const matchSymbol=(a:string|null,b:string):boolean=>
  !!a&&a.toLowerCase()===b.toLowerCase();
const empty=(confidence:DocumentAnnotations['confidence']):DocumentAnnotations=>({
 confidence,marks:[],notes:[],bookmarks:[],locationIds:[]
});
/** Only link a single source publication; never match a bare document ID across books. */
export function annotationsForDocument(
 index:JwAnnotationIndex,pub:{symbol:string;issue?:string;language:number},
 doc:Pick<OfflineDocumentRecord,'documentId'|'mepsId'>
):DocumentAnnotations|null{
 const locations=index.locations.filter(l=>{
   if(!matchSymbol(l.symbol,pub.symbol)||l.language!==pub.language||
      l.document===null)return false;
   const issue=cleanIssue(pub.issue),fromBackup=cleanIssue(l.issue);
   if(issue&&fromBackup&&issue!==fromBackup)return false;
   return l.document===doc.mepsId||l.document===doc.documentId;
 });
 if(!locations.length)return null;
 // A location keyed by the exact MEPS ID is preferred over a local SQLite
 // document ID. Those IDs can differ between JW Library and the JWPUB.
 const exact=doc.mepsId!==null&&locations.some(l=>l.document===doc.mepsId);
 const matches=locations.filter(l=>l.document===(exact?doc.mepsId:doc.documentId));
 const ids=new Set(matches.map(l=>l.id));
 const marks=index.marks.filter(m=>ids.has(m.location));
 const markIds=new Set(marks.map(m=>m.id));
 const noteIds=new Set<number>();
 const notes=index.notes.filter(n=>{
   const good=(n.location!==null&&ids.has(n.location))||
     (n.mark!==null&&markIds.has(n.mark));
   if(good)noteIds.add(n.id);
   return good;
 });
 const bookmarks=index.bookmarks.filter(b=>
   (b.location!==null&&ids.has(b.location))||
   (b.publicationLocation!==null&&ids.has(b.publicationLocation)));
 const ranges=new Map<number,JwAnnotationRange[]>();
 for(const range of index.ranges)if(markIds.has(range.mark)){
   const arr=ranges.get(range.mark)||[];arr.push(range);ranges.set(range.mark,arr);
 }
 return {
   confidence:exact?'exact-meps':'document-id',
   marks:marks.map(mark=>({mark,ranges:ranges.get(mark.id)||[]})),
   notes,bookmarks,locationIds:[...ids]
 };
}
export function searchPersonalAnnotations(index:JwAnnotationIndex,query:string,limit=60):{
 note:JwAnnotationNote;location:JwAnnotationLocation|null
}[]{
 const normalized=query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(normalized.length<2)return [];
 const locations=new Map(index.locations.map(x=>[x.id,x]));
 const marks=new Map(index.marks.map(x=>[x.id,x]));
 const hits:{note:JwAnnotationNote;location:JwAnnotationLocation|null}[]=[];
 for(const note of index.notes){
   const text=[note.title,note.content,...note.tags].join(' ')
     .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   if(!text.includes(normalized))continue;
   const location=locations.get(note.location??marks.get(note.mark??-1)?.location??-1)||null;
   hits.push({note,location});
   if(hits.length>=limit)break;
 }
 return hits;
}
let cache:{path:string;mtime:number;index:JwAnnotationIndex}|null=null;
export async function loadLatestAnnotationArchive(app:App,root:string):Promise<AnnotationArchive|null>{
 const prefix=root.replace(/\/+$/,'')+'/Annotations JW Library/';
 // Metadata files are written last; never attempt a half-imported archive.
 const manifests=app.vault.getFiles().filter(f=>f.name===ANNOTATION_META_NAME&&
   f.path.startsWith(prefix)&&f.path.slice(prefix.length).split('/').length===2)
   .sort((a,b)=>b.stat.mtime-a.stat.mtime);
 for(const meta of manifests){
   try{
     const folder=meta.path.slice(0,-('/'+ANNOTATION_META_NAME).length);
     const source=app.vault.getAbstractFileByPath(folder+'/'+ANNOTATION_INDEX_NAME);
     if(!source||!('stat' in source))continue;
     const file=source as TFile;
     if(cache?.path===file.path&&cache.mtime===file.stat.mtime)
       return {folder,modified:meta.stat.mtime,index:cache.index};
     const data=new Uint8Array(await app.vault.readBinary(file));
     const index=decodeJwAnnotations(data);
     cache={path:file.path,mtime:file.stat.mtime,index};
     return {folder,modified:meta.stat.mtime,index};
   }catch{/* A damaged import must not interrupt other publications. */}
 }
 return null;
}
