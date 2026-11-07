import {catalogKey,type JwCatalogEntry} from './jwOrgCatalog.ts';
import {foldLibraryText,type LibraryCategory} from './libraryTaxonomy.ts';
import {canonicalIssue,canonicalPublicationSymbol} from './offlinePublications.ts';

export interface ShelfLocalVolume {
  symbol:string;issue:string;title:string;language:number;path:string;
  category:JwCatalogEntry['category'];origin:'personal'|'download';virtual?:boolean;
}
export interface PublicationShelfEntry<T extends ShelfLocalVolume=ShelfLocalVolume> extends JwCatalogEntry {
  key:string;local:T|null;
}
/** Match public French editions exactly, while retaining ALL private/language imports. */
export function publicationShelf<T extends ShelfLocalVolume>(official:readonly JwCatalogEntry[],local:readonly T[]):PublicationShelfEntry<T>[] {
  const shelf=new Map<string,PublicationShelfEntry<T>>();
  for(const entry of official)shelf.set(catalogKey(entry),{...entry,key:catalogKey(entry),local:null});
  for(const volume of [...local].sort((a,b)=>Number(!!b.virtual)-Number(!!a.virtual))){
    const key=volume.language===3?catalogKey(volume):'local:'+volume.path;
    const old=shelf.get(key);
    if(old?.local&&foldLibraryText(old.local.title)===foldLibraryText(volume.title))continue;
    const localKey=old?.local?'local:'+volume.path:key;
    shelf.set(localKey,{symbol:canonicalPublicationSymbol(volume.symbol),issue:canonicalIssue(volume.issue),title:volume.title,
      coverUrl:old?.coverUrl||'',sourcePage:old?.sourcePage||'',category:volume.category,key:localKey,local:volume});
  }
  return [...shelf.values()].sort((a,b)=>Number(!!b.local)-Number(!!a.local));
}
export function filterPublicationShelf<T extends ShelfLocalVolume>(items:PublicationShelfEntry<T>[],category:LibraryCategory,term:string,downloaded=false):PublicationShelfEntry<T>[] {
  const words=foldLibraryText(term).split(' ').filter(Boolean);
  return items.filter(item=>(!downloaded||!!item.local)&&
    (category==='all'||(category==='personal'?item.local?.origin==='personal':item.category===category))&&
    words.every(word=>foldLibraryText(item.title+' '+item.symbol+' '+item.issue).includes(word)));
}
export interface PublicationSeries<T extends ShelfLocalVolume=ShelfLocalVolume> {
  title:string;symbol:string;entries:PublicationShelfEntry<T>[];
}
export function publicationSeries<T extends ShelfLocalVolume>(items:PublicationShelfEntry<T>[]):PublicationSeries<T>[] {
  const groups=new Map<string,PublicationSeries<T>>();
  for(const item of items){
    const groupable=item.category==='magazines'&&!!item.issue&&(!item.local||item.local.language===3);
    const key=groupable?item.symbol.toLowerCase():item.key;
    const group=groups.get(key)||{symbol:item.symbol,title:seriesTitle(item),entries:[]};
    group.entries.push(item);groups.set(key,group);
  }
  for(const group of groups.values())group.entries.sort((a,b)=>b.issue.localeCompare(a.issue));
  return [...groups.values()];
}
function seriesTitle(item:JwCatalogEntry):string {
  const names:Record<string,string>={w:'La Tour de Garde · édition d’étude',wp:'La Tour de Garde · édition publique',g:'Réveillez-vous !',mwb:'Vie et ministère',ws:'La Tour de Garde · édition simplifiée'};
  return names[item.symbol.toLowerCase()]||item.title.split(' · ')[0];
}
