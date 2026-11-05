import { classifyLibraryVolume } from './libraryTaxonomy.ts';
import { gunzipSync } from 'fflate';
import { validPublicationSymbol } from './offlinePublications.ts';
import type { JwCatalogEntry } from './jwOrgCatalog.ts';

/**
 * Experimental read-only discovery of the publication catalogue distributed
 * by the JW Library app. Its endpoint and SQLite schema are not a public,
 * versioned API contract: fail safely and retain the ordinary JW.org shelf.
 */
export const JW_LIBRARY_CATALOG_MANIFEST =
  'https://app.jw-cdn.org/catalogs/publications/v4/manifest.json';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_CATALOG_GZIP_BYTES=96*1024*1024;
export const MAX_CATALOG_SQLITE_BYTES=180*1024*1024;
export const MAX_CATALOG_ENTRIES=20000;

export function parseJwLibraryCatalogManifest(input:unknown):string{
  if(input===null||typeof input!=='object'||Array.isArray(input))
    throw Error('Manifeste de catalogue non reconnu.');
  const manifest=input as Record<string,unknown>;
  if(!Number.isInteger(manifest.version)||Number(manifest.version)<1||
    typeof manifest.current!=='string'||!ID.test(manifest.current))
    throw Error('Manifeste JW Library : version ou identifiant de catalogue non reconnu.');
  return manifest.current;
}
export function jwLibraryCatalogDownloadUrl(current:string):string{
  if(!ID.test(current))throw Error('Identifiant de catalogue invalide.');
  return 'https://app.jw-cdn.org/catalogs/publications/v4/'+current+'/catalog.db.gz';
}
export function isSqliteDatabase(bytes:Uint8Array):boolean{
  return bytes.length>=16&&'SQLite format 3\0'.split('').every((c,i)=>bytes[i]===c.charCodeAt(0));
}

/**
 * requestUrl may expose either the HTTP-compressed body or a body already
 * decompressed by the platform. Accept both formats after verifying the
 * actual SQLite signature and enforcing strict size limits.
 */
export function decodeJwLibraryCatalogPayload(bytes:Uint8Array):Uint8Array{
  const mib=(n:number)=>(n/1048576).toFixed(1)+' Mo';
  if(!bytes.length)throw Error('Le serveur a retourné un catalogue vide.');
  if(isSqliteDatabase(bytes)){
    if(bytes.length>MAX_CATALOG_SQLITE_BYTES)
      throw Error('Catalogue SQLite décompressé trop volumineux ('+mib(bytes.length)+').');
    return bytes;
  }
  if(bytes.length<18 || bytes[0]!==0x1f || bytes[1]!==0x8b || bytes[2]!==8){
    const preview=new TextDecoder().decode(bytes.subarray(0,200)).trim().slice(0,120);
    const hint=/^(?:<!doctype|<html|<\?xml)/i.test(preview)?' (réponse HTML)':
      /^[\[{]/.test(preview)?' (réponse JSON)':'';
    throw Error('Le serveur ne fournit pas une archive GZIP ni une base SQLite'+hint+
      ' · '+mib(bytes.length)+' reçus.');
  }
  if(bytes.length>MAX_CATALOG_GZIP_BYTES)
    throw Error('Catalogue compressé trop volumineux ('+mib(bytes.length)+
      ', limite '+mib(MAX_CATALOG_GZIP_BYTES)+').');
  const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
    .getUint32(bytes.byteLength-4,true);
  if(length>MAX_CATALOG_SQLITE_BYTES)
    throw Error('Catalogue SQLite trop volumineux ('+mib(length)+').');
  let decoded:Uint8Array;
  try{decoded=gunzipSync(bytes);}
  catch{throw Error('Décompression du catalogue GZIP impossible.');}
  if(decoded.length>MAX_CATALOG_SQLITE_BYTES)
    throw Error('Catalogue SQLite décompressé trop volumineux ('+mib(decoded.length)+').');
  if(!isSqliteDatabase(decoded))
    throw Error('Le contenu décompressé n’est pas une base SQLite valide.');
  return decoded;
}

export type CatalogPublicationRow = Record<string,unknown>;
const string=(value:unknown):string=>typeof value==='string'?value.trim():'';
const number=(value:unknown):number=>typeof value==='number'&&Number.isFinite(value)?
  value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):0;
function field(row:CatalogPublicationRow,...keys:string[]):unknown{
  const entries=Object.entries(row);
  for(const key of keys){
    const candidate=entries.find(([name])=>name.toLowerCase()===key.toLowerCase());
    if(candidate)return candidate[1];
  }
  return null;
}
/** Strict French-only mapping, without making up issue tags or image URLs. */
export function jwLibraryCatalogRow(
  row:CatalogPublicationRow,rootSymbol='',frenchMepsLanguage=3
):JwCatalogEntry|null{
  if(number(field(row,'MepsLanguageId','MepsLanguageIndex'))!==frenchMepsLanguage)return null;
  if(number(field(row,'Reserved'))>0)return null;
  const symbol=validPublicationSymbol(
    string(field(row,'KeySymbol'))||
    string(field(row,'Symbol'))||
    rootSymbol
  );
  if(!symbol)return null;
  const year=number(field(row,'Year'));
  const issueRaw=String(number(field(row,'IssueTagNumber'))||'');
  const issue=/^(?:19|20)\d{4}$/.test(issueRaw)?issueRaw:'';
  const generic=string(field(row,'Title','ShortTitle'));
  const issueTitle=string(field(row,'IssueTitle'));
  const title=(generic||string(field(row,'CoverTitle'))||symbol).slice(0,180);
  const label=issueTitle&&!title.toLocaleLowerCase('fr').includes(issueTitle.toLocaleLowerCase('fr'))?
    title+' · '+issueTitle:title+(issue?' · '+issue:'');
  return {
    symbol,issue,title:label.slice(0,220),coverUrl:'',
    sourcePage:JW_LIBRARY_CATALOG_MANIFEST,
    category:classifyLibraryVolume(symbol,label)
  };
}

export interface CatalogSqlResult{
  columns:string[];
  values:unknown[][];
}
export interface CatalogSqlite{
  exec(query:string):CatalogSqlResult[];
}
const safeColumn=(name:string):string=>'"'+name.replace(/"/g,'""')+'"';
const rows=(db:CatalogSqlite,sql:string):CatalogPublicationRow[]=>{
  const result=db.exec(sql)[0];
  if(!result)return [];
  return result.values.map(cells=>Object.fromEntries(result.columns.map((col,i)=>[col,cells[i]])));
};
/**
 * Avoid assuming a published database schema. Query read-only tables and
 * retain only publications explicitly marked as French (MEPS language 3).
 */
export function extractJwLibraryCatalog(db:CatalogSqlite):JwCatalogEntry[]{
  const tables=rows(db,"SELECT name FROM sqlite_master WHERE type='table'")
    .map(row=>string(row.name));
  const table=tables.find(name=>name.toLowerCase()==='publication');
  if(!table)throw Error('Table Publication absente du catalogue.');
  const columns=rows(db,'PRAGMA table_info('+safeColumn(table)+')').map(row=>string(row.name));
  const lang=columns.find(name=>/^(MepsLanguageId|MepsLanguageIndex)$/i.test(name));
  if(!lang)throw Error('La table Publication ne fournit pas de langue vérifiable.');
  let roots=new Map<number,string>();
  const rootTable=tables.find(name=>name.toLowerCase()==='publicationrootkey');
  if(rootTable){
    const rootColumns=rows(db,'PRAGMA table_info('+safeColumn(rootTable)+')').map(row=>string(row.name).toLowerCase());
    if(rootColumns.includes('id')&&rootColumns.includes('symbol')){
      roots=new Map(rows(db,'SELECT Id,Symbol FROM '+safeColumn(rootTable))
        .map(row=>[number(field(row,'Id')),string(field(row,'Symbol'))] as const));
    }
  }
  const result=rows(db,'SELECT * FROM '+safeColumn(table)+
    ' WHERE '+safeColumn(lang)+'=3 LIMIT '+(MAX_CATALOG_ENTRIES+1));
  if(result.length>MAX_CATALOG_ENTRIES)
    throw Error('Catalogue trop volumineux ; aucune liste partielle n’a été conservée.');
  const found=new Map<string,JwCatalogEntry>();
  for(const row of result){
    const root=roots.get(number(field(row,'PublicationRootKeyID')))||'';
    const item=jwLibraryCatalogRow(row,root);
    if(!item)continue;
    const key=item.symbol+'|'+item.issue;
    if(!found.has(key))found.set(key,item);
  }
  if(found.size<1)throw Error('Aucune publication française exploitable dans cette version du catalogue.');
  return [...found.values()].sort((a,b)=>a.title.localeCompare(b.title,'fr'));
}
