import initSqlJs from 'sql.js/dist/sql-wasm-inline.js';
import { unzipSync, strFromU8, strToU8 } from 'fflate';
import { replaceZipEntries } from './nativeZipPatch';
import { validateZip } from './archiveInspector';

type Database = InstanceType<(Awaited<ReturnType<typeof initSqlJs>>)['Database']>;
type Row = Record<string,unknown>;
let sqlPromise:ReturnType<typeof initSqlJs>|null=null;
async function openDb(bytes:Uint8Array):Promise<Database>{
  sqlPromise??=initSqlJs();
  const sql=await sqlPromise;
  return new sql.Database(bytes);
}
export function rows(db:Database,query:string):Row[]{
  const result=db.exec(query)[0];
  return result?result.values.map(values=>Object.fromEntries(result.columns.map((name,i)=>[name,values[i]]))):[];
}
export function scalar(db:Database,query:string):unknown{
  return db.exec(query)[0]?.values[0]?.[0] ?? null;
}
const enc=new TextEncoder();
function toBytes(buffer:ArrayBuffer):Uint8Array{return new Uint8Array(buffer);}
export async function digest(bytes:Uint8Array):Promise<string>{
  const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',toBytes(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer)));
  return Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
}
export function sanitizeFilename(text:string):string{
  return text.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,85)||'Sans titre';
}
export const NOTE_MARKER='<!-- BIBLE_LAB_NOTE_START -->\n';
export const MAX_ARCHIVE=145*1024*1024;
export type ArchiveKind='jwpub'|'jwlibrary';
export interface JwBackup {file:File; archive:Uint8Array; manifest:Record<string,any>; dbBytes:Uint8Array; dbName:string; schema:number; count:number; tags:number; mediaCount:number; sourceSha:string; foreignKeyIssues:number }
export interface JwPublication {file:File; title:string; documentCount:number; symbol:string; year:number; db:Database; files:Record<string,Uint8Array>; key:Uint8Array; iv:Uint8Array}
export async function readBackup(file:File):Promise<JwBackup>{
  if(file.size>MAX_ARCHIVE)throw Error('Sauvegarde trop volumineuse (145 Mo maximum).');
  const archive=new Uint8Array(await file.arrayBuffer());
  const names=validateZip(archive);
  if(names.length>10000)throw Error('Trop de fichiers dans la sauvegarde.');
  const entries=unzipSync(archive,{filter:entry=>entry.name==='manifest.json'||entry.name.toLowerCase().endsWith('userdata.db')});
  const manifestText=entries['manifest.json'];
  if(!manifestText)throw Error('manifest.json introuvable.');
  const manifest=JSON.parse(strFromU8(manifestText)) as Record<string,any>;
  const meta=manifest.userDataBackup;
  if(!meta||typeof meta.databaseName!=='string'||typeof meta.hash!=='string')throw Error('Format de sauvegarde JW Library non reconnu.');
  const dbBytes=entries[meta.databaseName];
  if(!dbBytes || dbBytes.length>60*1024*1024)throw Error('Base de données absente ou trop volumineuse.');
  if(strFromU8(dbBytes.subarray(0,16))!=='SQLite format 3\0')throw Error('En-tête SQLite invalide.');
  if(await digest(dbBytes)!==meta.hash.toLowerCase())throw Error('Intégrité SHA-256 de la sauvegarde incorrecte.');
  const db=await openDb(dbBytes);
  try{
    if(scalar(db,'PRAGMA integrity_check')!=='ok')throw Error('Intégrité SQLite invalide.');
    const schema=Number(scalar(db,'PRAGMA user_version'));
    if(![14,15,16].includes(schema)||Number(meta.schemaVersion)!==schema)throw Error('Schéma SQLite non validé (14 à 16).');
    const count=Number(scalar(db,'SELECT count(*) FROM Note'));
    const tags=Number(scalar(db,'SELECT count(*) FROM Tag'));
    const fk=rows(db,'PRAGMA foreign_key_check').length;
    return {file,archive,manifest,dbBytes,dbName:meta.databaseName,schema,count,tags,mediaCount:names.length-2,sourceSha:await digest(archive),foreignKeyIssues:fk};
  }finally{db.close();}
}
function byteArray(value:unknown):Uint8Array{
  if(value instanceof Uint8Array)return value;
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  throw Error('Contenu binaire SQLite absent.');
}
async function inflate(buffer:Uint8Array):Promise<string>{
  if(!('DecompressionStream' in window))throw Error('Le moteur de décompression zlib n’est pas disponible dans cette version d’Obsidian.');
  const stream=new Blob([toBytes(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength) as ArrayBuffer)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const output=await new Response(stream).arrayBuffer();
  if(output.byteLength>12*1024*1024)throw Error('Document décompressé trop volumineux.');
  return new TextDecoder('utf-8',{fatal:true}).decode(output);
}
export async function decryptDocument(bytes:Uint8Array,key:Uint8Array,iv:Uint8Array):Promise<string>{
  const cipher=await crypto.subtle.importKey('raw',toBytes(key.buffer.slice(key.byteOffset,key.byteOffset+key.byteLength) as ArrayBuffer),'AES-CBC',false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-CBC',iv:toBytes(iv.buffer.slice(iv.byteOffset,iv.byteOffset+iv.byteLength) as ArrayBuffer)},cipher,toBytes(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer));
  return inflate(new Uint8Array(plain));
}
export async function readJwpub(file:File):Promise<JwPublication>{
  if(file.size>MAX_ARCHIVE)throw Error('Publication trop volumineuse.');
  const raw=new Uint8Array(await file.arrayBuffer());
  validateZip(raw);
  const outer=unzipSync(raw,{filter:entry=>entry.name==='manifest.json'||entry.name==='contents'});
  if(!outer['contents'])throw Error('Le conteneur JWPUB interne est absent.');
  validateZip(outer['contents']);
  const files=unzipSync(outer['contents']);
  const dbName=Object.keys(files).find(name=>name.endsWith('.db'));
  if(!dbName)throw Error('Base documentaire introuvable.');
  const db=await openDb(files[dbName]);
  try{
    const pub=rows(db,'SELECT MepsLanguageIndex,Symbol,Year,IssueTagNumber,Title FROM Publication LIMIT 1')[0];
    if(!pub)throw Error('Métadonnées de publication absentes.');
    const card=String(pub.MepsLanguageIndex)+'_'+String(pub.Symbol)+'_'+String(pub.Year)
      +(String(pub.IssueTagNumber)!=='0'&&String(pub.IssueTagNumber)!=='null'?'_'+String(pub.IssueTagNumber):'');
    const hashed=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(card)));
    const constant=Uint8Array.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7'.match(/../g)!,hex=>parseInt(hex,16));
    const key=new Uint8Array(16),iv=new Uint8Array(16);
    for(let i=0;i<16;i++){key[i]=hashed[i]^constant[i];iv[i]=hashed[i+16]^constant[i+16];}
    const count=Number(scalar(db,'SELECT count(*) FROM Document'));
    return {file,title:String(pub.Title||file.name),documentCount:count,symbol:String(pub.Symbol),year:Number(pub.Year),db,files,key,iv};
  }catch(error){db.close();throw error;}
}
function escapeInline(value:string):string{
  return value.replace(/[\\*\[\]`]/g,'\\$&').replace(/\s+/g,' ');
}
function markdownLink(el:Element,inner:string):string{
  const href=el.getAttribute('href')||'';
  let url=href;
  const bib=href.match(/^jwpub:\/\/b\/NWTR\/(\d{7,9})/i);
  if(bib)url='https://www.jw.org/finder?wtlocale=F&bible='+bib[1];
  if(!/^(https?:\/\/|jwpub:\/\/)/i.test(url))return inner;
  return '['+inner+']('+url.replace(/[()\s]/g,encodeURIComponent)+')';
}
export interface ConvertedDocument{markdown:string;imageNames:string[]}
export function jwHtmlToMarkdown(html:string,title:string,images:Set<string>):ConvertedDocument{
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('script,style,.pageNum,.copyrightInfo').forEach(element=>element.remove());
  const usedImages=new Set<string>();
  const inline=(node:Node):string=>{
    if(node.nodeType===Node.TEXT_NODE)return escapeInline(node.textContent||'');
    if(!(node instanceof Element))return '';
    const type=node.tagName.toLowerCase();
    if(type==='img'){
      const src=node.getAttribute('src')||'';
      if(!src.startsWith('jwpub-media://'))return '';
      const name=src.slice('jwpub-media://'.length);
      if(!images.has(name)||name.includes('/')||name.includes('..'))return '';
      usedImages.add(name);
      return '!['+escapeInline(node.getAttribute('alt')||'Illustration')+'](assets/'+encodeURIComponent(name)+')';
    }
    const content=Array.from(node.childNodes,inline).join('').trim();
    if(!content)return '';
    if(type==='strong'||type==='b')return '**'+content+'**';
    if(type==='em'||type==='i')return '*'+content+'*';
    if(type==='a')return markdownLink(node,content);
    if(type==='sup')return '^'+content;
    if(type==='br')return '\n';
    return content;
  };
  const output:string[]=[];
  function walk(element:Element,depth=0):void{
    const tag=element.tagName.toLowerCase();
    if(/^h[1-6]$/.test(tag)){
      output.push('#'.repeat(Math.min(6,Number(tag.slice(1))+1))+' '+inline(element).trim());return;
    }
    if(tag==='p'){
      const text=inline(element).trim();if(text)output.push(text);return;
    }
    if(tag==='img'){
      const text=inline(element);if(text)output.push(text);return;
    }
    if(tag==='li'){
      const direct=Array.from(element.childNodes).filter(node=>!(node instanceof Element && /^(ul|ol)$/i.test(node.tagName)));
      const text=direct.map(inline).join('').trim();
      if(text)output.push('  '.repeat(depth)+'- '+text);
      element.querySelectorAll(':scope > ul, :scope > ol').forEach(child=>walk(child,depth+1));return;
    }
    if(tag==='figure' || tag==='header'||tag==='section'||tag==='body'||tag==='div'||tag==='article'||tag==='main'){
      for(const child of Array.from(element.children))walk(child,depth);
      return;
    }
    if(tag==='ul'||tag==='ol'){
      Array.from(element.children).forEach(child=>walk(child,depth));return;
    }
    for(const child of Array.from(element.children))walk(child,depth);
  }
  walk(doc.body);
  return {markdown:'# '+title+'\n\n'+output.join('\n\n').replace(/\n{3,}/g,'\n\n')+'\n',imageNames:Array.from(usedImages)};
}
export function makeJwNote(guid:string,title:string,content:string,created:unknown,modified:unknown,location:unknown,mark:unknown,tags:string[],originalHash:string):string{
  return ['---','bible_lab_kind: jw-library-note','jw_guid: '+JSON.stringify(guid),
  'title: '+JSON.stringify(title),'jw_created: '+JSON.stringify(created),
  'jw_last_modified: '+JSON.stringify(modified),'jw_location_id: '+JSON.stringify(location),
  'jw_user_mark_id: '+JSON.stringify(mark),'jw_tags: '+JSON.stringify(tags),'jw_original_hash: '+JSON.stringify(originalHash),'---','',NOTE_MARKER.trimEnd(),content].join('\n');
}
export function parseJwNote(raw:string):{guid:string;title:string;content:string;originalHash:string}|null{
  const marker=raw.indexOf(NOTE_MARKER);
  if(marker<0)return null;
  const head=raw.slice(0,marker),content=raw.slice(marker+NOTE_MARKER.length);
  const property=(key:string):unknown=>{
    const line=head.split('\n').find(value=>value.startsWith(key+': '));
    if(!line)throw Error('Champ JW manquant : '+key);
    return JSON.parse(line.slice(key.length+2));
  };
  const guid=String(property('jw_guid'));
  const title=String(property('title'));
  const originalHash=String(property('jw_original_hash'));
  if(!/^[0-9a-f-]{36}$/i.test(guid)||!/^[0-9a-f]{64}$/i.test(originalHash))throw Error('Métadonnées de note JW incorrectes.');
  return {guid,title,content,originalHash};
}
export async function encodeBackup(archive:JwBackup,newDb:Uint8Array):Promise<Uint8Array>{
  const metadata=JSON.parse(JSON.stringify(archive.manifest));
  metadata.userDataBackup.hash=await digest(newDb);
  metadata.userDataBackup.lastModifiedDate=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const out=replaceZipEntries(archive.archive,new Map<string,Uint8Array>([
    [archive.dbName,newDb],['manifest.json',strToU8(JSON.stringify(metadata))]
  ]));
  if(out.length>170*1024*1024)throw Error('Sauvegarde exportée trop volumineuse.');
  return out;
}
export {openDb};
