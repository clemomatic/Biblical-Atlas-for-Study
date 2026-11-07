import type {App,TFile} from 'obsidian';
import {
  ANNOTATION_INDEX_NAME,ANNOTATION_META_NAME,decodeJwAnnotations,
  type JwAnnotationIndex,type JwAnnotationLocation,
  type JwAnnotationMark,type JwAnnotationNote,type JwAnnotationRange,
  type JwAnnotationBookmark
} from './jwAnnotations.ts';
import type {OfflineDocumentRecord} from './offlinePublications';
import {canonicalIssue} from './offlinePublications.ts';

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
const cleanIssue=(raw:string|number|null|undefined):number=>{
 const value=String(raw??'');return /^\d{6}(?:\d{2})?$/.test(value)?Number(canonicalIssue(value)):0;
};
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

const BIBLE_BOOKS_FR=[
 'Genèse','Exode','Lévitique','Nombres','Deutéronome','Josué','Juges','Ruth',
 '1 Samuel','2 Samuel','1 Rois','2 Rois','1 Chroniques','2 Chroniques',
 'Esdras','Néhémie','Esther','Job','Psaumes','Proverbes','Ecclésiaste',
 'Chant de Salomon','Isaïe','Jérémie','Lamentations','Ézéchiel','Daniel',
 'Osée','Joël','Amos','Obadia','Jonas','Michée','Nahum','Habacuc','Sophonie',
 'Aggée','Zacharie','Malachie','Matthieu','Marc','Luc','Jean','Actes',
 'Romains','1 Corinthiens','2 Corinthiens','Galates','Éphésiens','Philippiens',
 'Colossiens','1 Thessaloniciens','2 Thessaloniciens','1 Timothée',
 '2 Timothée','Tite','Philémon','Hébreux','Jacques','1 Pierre','2 Pierre',
 '1 Jean','2 Jean','3 Jean','Jude','Révélation'
];
export const bibleBookName=(book:number):string=>
  BIBLE_BOOKS_FR[book-1]||'Livre '+book;
export function bibleAnnotationChapters(index:JwAnnotationIndex):{
 book:number;chapter:number;locations:number;marks:number;notes:number
}[]{
 const byChapter=new Map<string,{book:number;chapter:number;locations:number;marks:number;notes:number}>();
 const markCount=new Map<number,number>();
 for(const mark of index.marks)markCount.set(mark.location,(markCount.get(mark.location)||0)+1);
 const notesByLocation=new Map<number,number>();
 const marks=new Map(index.marks.map(x=>[x.id,x]));
 for(const note of index.notes){
   const location=note.location??marks.get(note.mark??-1)?.location;
   if(location!==undefined&&location!==null)
     notesByLocation.set(location,(notesByLocation.get(location)||0)+1);
 }
 for(const loc of index.locations){
   if(loc.symbol?.toLowerCase()!=='nwtsty'||loc.language!==3||
      loc.book===null||loc.chapter===null||loc.book<1||loc.book>66||loc.chapter<1)continue;
   const key=loc.book+':'+loc.chapter;
   const current=byChapter.get(key)||{book:loc.book,chapter:loc.chapter,locations:0,marks:0,notes:0};
   current.locations++;
   current.marks+=markCount.get(loc.id)||0;
   current.notes+=notesByLocation.get(loc.id)||0;
   byChapter.set(key,current);
 }
 return [...byChapter.values()].sort((a,b)=>a.book-b.book||a.chapter-b.chapter);
}
/** Bible verses are anchored by book/chapter + token ranges, not document IDs. */
export function annotationsForBibleChapter(
 index:JwAnnotationIndex,book:number,chapter:number
):DocumentAnnotations|null{
 if(!Number.isInteger(book)||book<1||book>66||!Number.isInteger(chapter)||chapter<1)return null;
 const ids=new Set(index.locations.filter(l=>
   l.symbol?.toLowerCase()==='nwtsty'&&l.language===3&&
   l.book===book&&l.chapter===chapter).map(l=>l.id));
 if(!ids.size)return null;
 const marks=index.marks.filter(m=>ids.has(m.location));
 const markIds=new Set(marks.map(m=>m.id));
 const ranges=new Map<number,JwAnnotationRange[]>();
 for(const range of index.ranges)if(markIds.has(range.mark)){
   const items=ranges.get(range.mark)||[];items.push(range);ranges.set(range.mark,items);
 }
 return {confidence:'document-id',locationIds:[...ids],
   marks:marks.map(mark=>({mark,ranges:ranges.get(mark.id)||[]})),
   notes:index.notes.filter(n=>
     (n.location!==null&&ids.has(n.location))||
     (n.mark!==null&&markIds.has(n.mark))),
   bookmarks:index.bookmarks.filter(b=>
     (b.location!==null&&ids.has(b.location))||
     (b.publicationLocation!==null&&ids.has(b.publicationLocation)))
 };
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
