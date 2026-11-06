import { TFile, type App } from 'obsidian';
import {
  OFFLINE_INDEX_NAME,directWolMepsId,validateOfflineIndex,
  type OfflineImportIndex
} from './offlinePublications';
import type { ReferenceEntry,ReaderLine,ReaderResult } from './referenceReader';
import {readVirtualPublications,loadVirtualRecords,type VirtualTextRecord} from './virtualJwpub';
import {parseScripture} from './bibleLabData';
import {loadLatestAnnotationArchive,annotationsForDocument,annotationsForBibleChapter} from './jwAnnotationLibrary';
import {readerLinesFromJwBlocks,readerPersonalNotes} from './jwAnnotationReader';

export interface LocalPublication {
  title:string;
  symbol:string;
  language:number;
  year:number;
  documents:number;
  path:string;
}
const validBase=(root:string)=>root.replace(/\/+$/,'')+'/Imports/';

/** Only manifests produced by explicit local JWPUB imports are considered. */
export async function readLocalPublicationIndexes(app:App,rootFolder:string):Promise<
  {folder:string;index:OfflineImportIndex}[]
>{
  const prefix=validBase(rootFolder);
  const found:{folder:string;index:OfflineImportIndex}[]=[];
  for(const file of app.vault.getFiles()){
    if(file.name!==OFFLINE_INDEX_NAME||!file.path.startsWith(prefix))continue;
    const folder=file.path.slice(0,-('/'+OFFLINE_INDEX_NAME).length);
    // Manifest must sit directly in its imported publication folder.
    if(folder.slice(prefix.length).includes('/'))continue;
    try{
      const content=await app.vault.cachedRead(file);
      if(content.length>4*1024*1024)continue;
      const parsed=validateOfflineIndex(JSON.parse(content));
      if(parsed)found.push({folder,index:parsed});
    }catch{/* A damaged manifest cannot make reading WOL references fail. */}
  }
  return found.sort((a,b)=>a.folder.localeCompare(b.folder,'fr'));
}
export async function listLocalPublications(app:App,root:string):Promise<LocalPublication[]>{
  const manifests=await readLocalPublicationIndexes(app,root);
  return manifests.map(item=>({
    title:item.index.publication.title,
    symbol:item.index.publication.symbol,
    language:item.index.publication.language,
    year:item.index.publication.year,
    documents:item.index.documents.length,path:item.folder
  }));
}
const cleanMarkdown=(input:string)=>input
  .replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'')
  .replace(/^# [^\n]+\n/,'')
  .trim();
function localReaderLines(markdown:string):ReaderLine[]{
  const text=cleanMarkdown(markdown).slice(0,600000);
  const blocks=text.split(/\n\s*\n/).slice(0,1000);
  const lines:ReaderLine[]=[];
  for(const block of blocks){
    const trimmed=block.trim();
    if(!trimmed)continue;
    const heading=/^#{1,6}\s+([^\n]+)/.exec(trimmed);
    const content=(heading?heading[1]:trimmed)
      // The local view displays readable text; Markdown links can still
      // be followed in the source note. No HTML is executed here.
      .replace(/!\[([^\]]*)\]\([^)]+\)/g,'$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
      .replace(/(?:^|\n)\s*[*_]{1,2}/g,'')
      .replace(/\*{2,}/g,'')
      .trim().slice(0,6500);
    if(content)lines.push({type:heading?'heading':'paragraph',text:content});
  }
  return lines;
}

/**
 * Uses exact MEPS document identifiers (not title inference). We cannot safely
 * map WOL's #h=N fragment to JWPUB paragraph IDs; the whole article is shown
 * with a visible precision warning rather than a fabricated location.
 */
const virtualCache=new Map<string,Map<number,VirtualTextRecord>>();
async function cachedVirtual(app:App,folder:string):Promise<Map<number,VirtualTextRecord>>{
 const old=virtualCache.get(folder);
 if(old)return old;
 const loaded=await loadVirtualRecords(app,folder);
 if(virtualCache.size>2)virtualCache.delete(virtualCache.keys().next().value!);
 virtualCache.set(folder,loaded);
 return loaded;
}
/**
 * Prefer the original JWPUB's verified verse / paragraph anchors when present,
 * so the same readable, coloured result powers popups and full reader panes.
 * Never infer token positions from a different WOL edition.
 */
export async function resolveOfflineDocument(
  app:App,root:string,ref:ReferenceEntry
):Promise<ReaderResult|null>{
  const virtual=await readVirtualPublications(app,root);
  const annotationArchive=await loadLatestAnnotationArchive(app,root);
  const annotationIndex=annotationArchive?.index;
  if(ref.kind==='scripture'){
    const passage=parseScripture(ref.label);
    if(!passage||passage.endChapter)return null;
    const available=virtual.filter(v=>v.index.publication.language===3&&
      (v.index.publication.symbol==='nwtsty'||v.index.publication.symbol==='nwt'))
      .sort((a,b)=>Number(b.index.publication.symbol==='nwtsty')-
                    Number(a.index.publication.symbol==='nwtsty'));
    for(const {folder,index} of available){
      const found=index.documents.find(d=>d.bibleBook===passage.book&&
        d.bibleChapter===passage.chapter);
      if(!found)continue;
      try{
        const record=(await cachedVirtual(app,folder)).get(found.documentId);
        if(!record?.blocks.length)continue;
        const desired=new Set(passage.verses||Array.from({
          length:Math.max(1,Math.min(176,(passage.endVerse||passage.verse)-passage.verse+1))
        },(_,i)=>passage.verse+i));
        const verses=record.blocks.filter(b=>b.kind==='verse'&&desired.has(b.identifier));
        if(!verses.length)continue;
        const chapterAnnotations=annotationIndex&&index.publication.symbol==='nwtsty'
          ?annotationsForBibleChapter(annotationIndex,passage.book,passage.chapter):null;
        const notes=chapterAnnotations?{
          ...chapterAnnotations,
          marks:chapterAnnotations.marks.filter(m=>
            m.ranges.some(r=>desired.has(r.identifier))),
          notes:chapterAnnotations.notes.filter(n=>
            n.blockIdentifier!==null&&desired.has(n.blockIdentifier)),
        }:null;
        return {
          title:passage.label,kind:'verse',sourceUrl:ref.url,
          lines:readerLinesFromJwBlocks(verses,notes),links:[],
          personalNotes:readerPersonalNotes(notes),
          notice:'Texte de la Bible locale · annotations personnelles de JW Library.'
        };
      }catch{/* Fallback to the official verse reader, never fabricate text. */}
    }
    return null;
  }
  const meps=directWolMepsId(ref.url);
  if(!meps)return null;
  for(const {folder,index} of virtual){
    if(index.publication.language!==3)continue;
    const match=index.documents.find(doc=>doc.mepsId===meps);
    if(!match)continue;
    try{
      const record=(await cachedVirtual(app,folder)).get(match.documentId);
      if(!record?.text)continue;
      const marks=annotationIndex?annotationsForDocument(annotationIndex,
        index.publication,match):null;
      return {
        title:match.title,kind:'article',sourceUrl:ref.url,links:[],
        lines:record.blocks.length?
          readerLinesFromJwBlocks(record.blocks,marks):localReaderLines(record.text),
        personalNotes:readerPersonalNotes(marks),
        notice:'Lecture de la publication locale · hors connexion.'
      };
    }catch{/* Continue to official source if the JWPUB cache is damaged. */}
  }
  const indexes=await readLocalPublicationIndexes(app,root);
  for(const {folder,index} of indexes){
    if(index.publication.language!==3)continue;
    const match=index.documents.find(doc=>doc.mepsId===meps);
    if(!match)continue;
    const file=app.vault.getAbstractFileByPath(folder+'/'+match.path);
    if(!(file instanceof TFile))continue;
    try{
      const content=await app.vault.cachedRead(file);
      return {
        title:match.title,kind:'article',sourceUrl:ref.url,
        lines:localReaderLines(content),links:[],
        notice:'Texte issu de ta bibliothèque locale · hors connexion. '+
          (new URL(ref.url).hash?
            'Le numéro de paragraphe WOL n’est pas confirmé dans cette copie ; vérifie la position dans la source officielle.':
            'Les liens officiels sont conservés.')
      };
    }catch{/* Fall back to WOL. */}
  }
  return null;
}
