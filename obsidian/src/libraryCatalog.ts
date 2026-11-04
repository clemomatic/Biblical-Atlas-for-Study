import { TFile, type App } from 'obsidian';
import {
  readLocalPublicationIndexes,
  type LocalPublication
} from './offlineReferenceLibrary';
import type { OfflineDocumentRecord } from './offlinePublications';

import {
  classifyLibraryVolume,foldLibraryText as lower
} from './libraryTaxonomy';
import type { LibraryCategory } from './libraryTaxonomy';
export type { LibraryCategory } from './libraryTaxonomy';
export { LIBRARY_FILTERS,filteredVolumes,localDocumentUrl,jwpubPublicationId } from './libraryTaxonomy';
export interface LibraryVolume extends LocalPublication {
  category:Exclude<LibraryCategory,'all'|'personal'>;
  origin:'personal'|'download';
  items:OfflineDocumentRecord[];
  coverPath:string|null;
}
export interface LibrarySearchResult {
  volume:LibraryVolume;
  item:OfflineDocumentRecord;
  snippet:string;
  source:'title'|'content';
}
const IMG=/\.(png|jpe?g|webp|gif)$/i;
function findCover(app:App,folder:string):string|null{
  const all=app.vault.getFiles()
    .filter(f=>f.path.startsWith(folder+'/assets/')&&IMG.test(f.name));
  const cover=all.find(f=>/(?:^|[-_\s])(cover|couverture|front|title|page-?1)(?:[-_.\s]|$)/i.test(f.name));
  return cover?.path||null;
}
export async function loadLibraryVolumes(app:App,root:string):Promise<LibraryVolume[]>{
  const manifests=await readLocalPublicationIndexes(app,root);
  return manifests.map(({folder,index}):LibraryVolume=>({
    title:index.publication.title,
    symbol:index.publication.symbol,
    year:index.publication.year,
    language:index.publication.language,
    documents:index.documents.length,
    path:folder,
    category:classifyLibraryVolume(index.publication.symbol,index.publication.title),
    origin:index.origin==='download'?'download':'personal',
    items:index.documents,
    coverPath:findCover(app,folder)
  })).sort((a,b)=>b.year-a.year||a.title.localeCompare(b.title,'fr'));
}
export function localDocumentFile(app:App,volume:LibraryVolume,record:OfflineDocumentRecord):TFile|null{
  if(!volume.items.some(item=>item.path===record.path))return null;
  const abstract=app.vault.getAbstractFileByPath(volume.path+'/'+record.path);
  return abstract instanceof TFile?abstract:null;
}
export async function searchLibrary(
  app:App,volumes:LibraryVolume[],term:string,
  limit=60
):Promise<LibrarySearchResult[]>{
  const query=lower(term);
  if(query.length<2)return [];
  const found:LibrarySearchResult[]=[];
  const queryWords=query.split(' ').filter(Boolean);
  for(const volume of volumes){
    for(const item of volume.items){
      if(found.length>=limit)return found;
      const title=lower(volume.title+' '+item.title+' '+volume.symbol);
      if(queryWords.every(part=>title.includes(part))){
        found.push({volume,item,snippet:volume.title,source:'title'});
        continue;
      }
      const file=localDocumentFile(app,volume,item);
      if(!file)continue;
      try{
        const raw=(await app.vault.cachedRead(file)).slice(0,350000);
        const folded=lower(raw);
        const i=folded.indexOf(query);
        // This is an explicit local content search, not a web request.
        if(i<0)continue;
        const original=raw.slice(Math.max(0,i-80),Math.min(raw.length,i+160))
          .replace(/\s+/g,' ').replace(/^[#>*\s]+/,'');
        found.push({volume,item,snippet:original,source:'content'});
      }catch{/* A missing local note must not interrupt searches in other volumes. */}
    }
  }
  return found;
}
