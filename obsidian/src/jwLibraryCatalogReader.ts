import { requestUrl } from 'obsidian';
import { openDb } from './nativeJw';
import {
  JW_LIBRARY_CATALOG_MANIFEST,
  parseJwLibraryCatalogManifest,jwLibraryCatalogDownloadUrl,
  decodeJwLibraryCatalogPayload,extractJwLibraryCatalog
} from './jwLibraryCatalog';
import type { JwCatalogEntry } from './jwOrgCatalog';

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
  const sqlite=decodeJwLibraryCatalogPayload(bytes);
  const db=await openDb(sqlite);
  try{
    return {version,entries:extractJwLibraryCatalog(db)};
  }finally{
    db.close();
  }
}
