import { requestUrl } from 'obsidian';
import { gunzipSync } from 'fflate';
import { openDb } from './nativeJw';
import {
  JW_LIBRARY_CATALOG_MANIFEST,MAX_CATALOG_GZIP_BYTES,MAX_CATALOG_SQLITE_BYTES,
  parseJwLibraryCatalogManifest,jwLibraryCatalogDownloadUrl,isSqliteDatabase,
  extractJwLibraryCatalog
} from './jwLibraryCatalog';
import type { JwCatalogEntry } from './jwOrgCatalog';

function boundedGzip(bytes:Uint8Array):Uint8Array{
  if(bytes.length<18||bytes.length>MAX_CATALOG_GZIP_BYTES||
    bytes[0]!==0x1f||bytes[1]!==0x8b||bytes[2]!==8)
    throw Error('Archive de catalogue compressée non reconnue ou trop volumineuse.');
  // The standard gzip ISIZE field is modulo 2^32. The actual size is
  // checked again after decompression, before invoking SQLite.
  const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
    .getUint32(bytes.byteLength-4,true);
  if(length>MAX_CATALOG_SQLITE_BYTES)
    throw Error('Base de données trop grande pour Bible Lab.');
  const decoded=gunzipSync(bytes);
  if(decoded.length<32||decoded.length>MAX_CATALOG_SQLITE_BYTES||
    !isSqliteDatabase(decoded))
    throw Error('La réponse ne contient pas une base SQLite exploitable.');
  return decoded;
}
/**
 * User-initiated only: two GET requests to the app's official CDN.
 * No login, no JW Library user data, no publication content downloaded.
 */
export async function loadJwLibraryPublicCatalog():Promise<{
  version:string;entries:JwCatalogEntry[]
}>{
  const manifestResponse=await requestUrl({url:JW_LIBRARY_CATALOG_MANIFEST,throw:false});
  if(manifestResponse.status!==200)
    throw Error('Manifeste de JW Library inaccessible (HTTP '+manifestResponse.status+').');
  if(manifestResponse.text.length>100_000)
    throw Error('Manifeste de JW Library trop volumineux.');
  const version=parseJwLibraryCatalogManifest(JSON.parse(manifestResponse.text));
  const response=await requestUrl({url:jwLibraryCatalogDownloadUrl(version),throw:false});
  if(response.status!==200)
    throw Error('Catalogue JW Library indisponible (HTTP '+response.status+').');
  const bytes=new Uint8Array(response.arrayBuffer);
  const sqlite=boundedGzip(bytes);
  const db=await openDb(sqlite);
  try{
    return {version,entries:extractJwLibraryCatalog(db)};
  }finally{
    db.close();
  }
}
