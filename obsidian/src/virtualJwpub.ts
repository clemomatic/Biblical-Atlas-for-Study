import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';
import type {App} from 'obsidian';
import {classifyLibraryVolume} from './libraryTaxonomy.ts';
import type {OfflineDocumentRecord} from './offlinePublications';

export const VIRTUAL_INDEX='_BIBLE_LAB_VIRTUAL_INDEX.json';
export const VIRTUAL_TEXT='_BIBLE_LAB_VIRTUAL_TEXT.json.gz';
export const VIRTUAL_SOURCE='publication.jwpub';
const MAX_VIRTUAL_TEXT_BYTES=80*1024*1024;
const MAX_VIRTUAL_DOCUMENTS=20000;
export interface VirtualBlock {
  identifier:number; kind:'verse'|'paragraph'|'heading';text:string;
}
export interface VirtualIndexDocument extends OfflineDocumentRecord {
  bibleBook?:number;bibleChapter?:number;
}
export interface VirtualDocument extends VirtualIndexDocument {
  text:string;blocks?:VirtualBlock[];
}
export interface VirtualPublication {
 schema:1;
 publication:{symbol:string;year:number;language:number;title:string;issue?:string};
 documents:VirtualIndexDocument[];
 contentsFile:typeof VIRTUAL_TEXT;
 sourceFile:typeof VIRTUAL_SOURCE;
}
export function createVirtualIndex(
 pub:VirtualPublication['publication'],docs:VirtualDocument[]
):VirtualPublication {
 if(docs.length<1||docs.length>MAX_VIRTUAL_DOCUMENTS)throw Error('Nombre de documents JWPUB invalide.');
 return {schema:1,publication:pub,
  documents:docs.map(({documentId,mepsId,title,path,bibleBook,bibleChapter})=>({
   documentId,mepsId,title,path,
   ...(bibleBook?{bibleBook}:{}),...(bibleChapter?{bibleChapter}:{})
  })),
  contentsFile:VIRTUAL_TEXT,sourceFile:VIRTUAL_SOURCE};
}
export function encodeVirtualTexts(docs:VirtualDocument[]):Uint8Array {
 if(docs.length>MAX_VIRTUAL_DOCUMENTS)throw Error('Trop de documents.');
 const raw=strToU8(JSON.stringify(docs.map(d=>({id:d.documentId,text:d.text,
   ...(d.blocks?.length?{blocks:d.blocks}:{})}))));
 if(raw.byteLength>MAX_VIRTUAL_TEXT_BYTES)throw Error('Publication trop volumineuse pour le cache de lecture.');
 return gzipSync(raw,{level:6});
}
export interface VirtualTextRecord {text:string;blocks:VirtualBlock[]}
export function decodeVirtualRecords(bytes:Uint8Array):Map<number,VirtualTextRecord>{
 if(bytes.byteLength>MAX_VIRTUAL_TEXT_BYTES)throw Error('Index de lecture compressé trop volumineux.');
 if(bytes[0]!==0x1f||bytes[1]!==0x8b)throw Error('Index de lecture incorrect.');
 const raw=gunzipSync(bytes);
 if(raw.byteLength>MAX_VIRTUAL_TEXT_BYTES)throw Error('Index de lecture décompressé trop volumineux.');
 const input:unknown=JSON.parse(strFromU8(raw));
 if(!Array.isArray(input)||input.length>MAX_VIRTUAL_DOCUMENTS)throw Error('Index de lecture invalide.');
 const results=new Map<number,VirtualTextRecord>();
 for(const item of input){
  if(!item||typeof item!=='object')throw Error('Document invalide.');
  const row=item as {id?:unknown;text?:unknown;blocks?:unknown};
  if(!Number.isSafeInteger(row.id)||Number(row.id)<0||
    typeof row.text!=='string'||row.text.length>800000)throw Error('Document de lecture invalide.');
  const blocks:VirtualBlock[]=[];
  if(row.blocks!==undefined){
    if(!Array.isArray(row.blocks)||row.blocks.length>500)
      throw Error('Paragraphes de lecture invalides.');
    for(const block of row.blocks){
      if(!block||typeof block!=='object')throw Error('Paragraphe invalide.');
      const b=block as Partial<VirtualBlock>;
      if(!Number.isSafeInteger(b.identifier)||Number(b.identifier)<0||
        (b.kind!=='verse'&&b.kind!=='paragraph'&&b.kind!=='heading')||
        typeof b.text!=='string'||b.text.length>12000)
        throw Error('Paragraphe de lecture invalide.');
      blocks.push({identifier:Number(b.identifier),kind:b.kind,text:b.text});
    }
  }
  results.set(Number(row.id),{text:row.text,blocks});
 }
 return results;
}
export function decodeVirtualTexts(bytes:Uint8Array):Map<number,string>{
 return new Map([...decodeVirtualRecords(bytes)].map(([id,record])=>[id,record.text]));
}
export function validateVirtualIndex(raw:unknown):VirtualPublication|null {
 if(!raw||typeof raw!=='object')return null;
 const data=raw as Partial<VirtualPublication>,pub=data.publication;
 if(data.schema!==1||data.contentsFile!==VIRTUAL_TEXT||data.sourceFile!==VIRTUAL_SOURCE||
  !pub||typeof pub.symbol!=='string'||typeof pub.title!=='string'||
  !Number.isInteger(pub.year)||!Number.isInteger(pub.language)||
  !Array.isArray(data.documents)||data.documents.length>MAX_VIRTUAL_DOCUMENTS)return null;
 const ids=new Set<number>();
 for(const doc of data.documents){
  if(!doc||!Number.isSafeInteger(doc.documentId)||doc.documentId<0||ids.has(doc.documentId)||
   (doc.mepsId!==null&&(!Number.isSafeInteger(doc.mepsId)||doc.mepsId<=0))||
   typeof doc.title!=='string'||typeof doc.path!=='string'||doc.title.length>240||
   doc.path.length>250||!doc.path.endsWith('.md')||
   (doc.bibleBook!==undefined&&(!Number.isInteger(doc.bibleBook)||doc.bibleBook<1||doc.bibleBook>66))||
   (doc.bibleChapter!==undefined&&(!Number.isInteger(doc.bibleChapter)||doc.bibleChapter<1||doc.bibleChapter>176)))return null;
  ids.add(doc.documentId);
 }
 return data as VirtualPublication;
}
export async function readVirtualPublications(app:App,root:string):Promise<
 {folder:string;index:VirtualPublication}[]
>{
 const prefix=root.replace(/\/$/,'')+'/Bibliothèque virtuelle/';
 const files=app.vault.getFiles().filter(f=>f.name===VIRTUAL_INDEX&&
  f.path.startsWith(prefix)&&f.path.slice(prefix.length).split('/').length===2);
 const found:{folder:string;index:VirtualPublication}[]=[];
 for(const f of files){
  try {
   const folder=f.path.slice(0,-('/'+VIRTUAL_INDEX).length);
   const parsed=validateVirtualIndex(JSON.parse(await app.vault.cachedRead(f)));
   if(!parsed)continue;
   if(!app.vault.getAbstractFileByPath(folder+'/'+VIRTUAL_TEXT))continue;
   found.push({folder,index:parsed});
  }catch{/* Keep damaged imports from breaking the rest of the library. */}
 }
 return found;
}
export async function loadVirtualRecords(app:App,folder:string):Promise<Map<number,VirtualTextRecord>>{
 const file=app.vault.getAbstractFileByPath(folder+'/'+VIRTUAL_TEXT);
 if(!file||!('extension' in file))throw Error('Cache de lecture introuvable.');
 const bytes=new Uint8Array(await app.vault.readBinary(file as import('obsidian').TFile));
 return decodeVirtualRecords(bytes);
}
export async function loadVirtualText(app:App,folder:string):Promise<Map<number,string>>{
 const records=await loadVirtualRecords(app,folder);
 return new Map([...records].map(([id,record])=>[id,record.text]));
}
export function virtualCategory(pub:VirtualPublication['publication']) {
 return classifyLibraryVolume(pub.symbol,pub.title);
}
