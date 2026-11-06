import {catalogKey,trustedJwCover,validIssue,type JwCatalogEntry} from './jwOrgCatalog.ts';
import {validPublicationSymbol} from './offlinePublications.ts';

export const CATALOG_REFRESH_INTERVAL=24*60*60*1000;
export interface PublicationCatalogSnapshot {
  schema:1;version:string;checkedAt:number;entries:JwCatalogEntry[];
}
const categories=new Set(['bible','books','magazines','brochures','assemblies','schools','other']);
/** Persist only public metadata. Never trust executable URLs from an edited cache. */
export function parsePublicationCatalogCache(text:string):PublicationCatalogSnapshot|null {
  if(text.length>12*1024*1024)return null;
  try{
    const data=JSON.parse(text);
    if(data?.schema!==1||typeof data.version!=='string'||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.version)||!Number.isFinite(data.checkedAt)||
      data.checkedAt<=0||!Array.isArray(data.entries)||
      !data.entries.length||data.entries.length>20000)return null;
    const entries:JwCatalogEntry[]=[];
    const seen=new Set<string>();
    for(const item of data.entries){
      if(!item||typeof item.symbol!=='string'||!validPublicationSymbol(item.symbol)||
        typeof item.issue!=='string'||!validIssue(item.issue)||
        typeof item.title!=='string'||!item.title.trim()||item.title.length>240||
        !categories.has(item.category))return null;
      const key=catalogKey(item);
      if(seen.has(key))continue;
      seen.add(key);
      entries.push({symbol:item.symbol,issue:item.issue,title:item.title,
        category:item.category,coverUrl:typeof item.coverUrl==='string'?trustedJwCover(item.coverUrl):'',
        sourcePage:'https://www.jw.org/fr/biblioth%C3%A8que/'});
    }
    return {schema:1,version:data.version,checkedAt:data.checkedAt,entries};
  }catch{return null;}
}
export function catalogNeedsRefresh(snapshot:PublicationCatalogSnapshot|null,now=Date.now()):boolean {
  return !snapshot||snapshot.checkedAt>now||now-snapshot.checkedAt>=CATALOG_REFRESH_INTERVAL;
}
