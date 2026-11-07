import { requestUrl } from 'obsidian';
import { openDb } from './nativeJw';
import {
  JW_LIBRARY_CATALOG_MANIFEST,
  parseJwLibraryCatalogManifest,jwLibraryCatalogDownloadUrl,
  decodeJwLibraryCatalogPayload,extractJwLibraryCatalog
} from './jwLibraryCatalog';
import type { JwCatalogEntry } from './jwOrgCatalog';
import {catalogNeedsRefresh,parsePublicationCatalogCache,type PublicationCatalogSnapshot} from './publicationCatalogCache';

/**
 * Read-only requests to the app's official CDN.
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

export interface CatalogStorage {read:()=>Promise<string>;write:(text:string)=>Promise<void>}
/** One shared catalogue per plugin, across tab openings. A fresh cache avoids ALL requests. */
export class JwPublicationCatalog {
  private snapshot:PublicationCatalogSnapshot|null=null;
  private hydrate:Promise<PublicationCatalogSnapshot|null>|null=null;
  private pending:Promise<PublicationCatalogSnapshot>|null=null;
  constructor(private storage?:CatalogStorage){}
  cached():Promise<PublicationCatalogSnapshot|null>{
    if(!this.hydrate)this.hydrate=(async()=>{
      try{this.snapshot=parsePublicationCatalogCache(await this.storage?.read()||'');}catch{/* First use. */}
      return this.snapshot;
    })();
    return this.hydrate.then(()=>this.snapshot);
  }
  load(force=false):Promise<PublicationCatalogSnapshot>{
    if(this.pending)return this.pending;
    this.pending=this.update(force).finally(()=>{this.pending=null;});
    return this.pending;
  }
  private async update(force:boolean):Promise<PublicationCatalogSnapshot>{
    const cached=await this.cached();
    if(cached?.mappingRevision===2&&!force&&!catalogNeedsRefresh(cached))return cached;
    const response=await requestUrl({url:JW_LIBRARY_CATALOG_MANIFEST,throw:false});
    if(response.status!==200||response.text.length>100_000)throw Error('Catalogue indisponible.');
    const version=parseJwLibraryCatalogManifest(JSON.parse(response.text));
    let entries=cached?.entries;
    if(!entries||cached?.version!==version||cached?.mappingRevision!==2){
      const payload=await requestUrl({url:jwLibraryCatalogDownloadUrl(version),throw:false});
      if(payload.status!==200)throw Error('Catalogue indisponible.');
      const db=await openDb(decodeJwLibraryCatalogPayload(new Uint8Array(payload.arrayBuffer)));
      try{entries=extractJwLibraryCatalog(db);}finally{db.close();}
    }
    const snapshot:PublicationCatalogSnapshot={schema:1,version,checkedAt:Date.now(),entries,mappingRevision:2};
    this.snapshot=snapshot;
    try{await this.storage?.write(JSON.stringify(snapshot));}catch{/* Keep usable in memory on read-only vaults. */}
    return snapshot;
  }
}
