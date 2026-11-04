import { TFile, type App } from 'obsidian';
import {
  readLocalPublicationIndexes,
  type LocalPublication
} from './offlineReferenceLibrary';
import type { OfflineDocumentRecord } from './offlinePublications';

export type LibraryCategory =
  'all'|'bible'|'books'|'magazines'|'brochures'|'assemblies'|'schools'|'personal'|'other';

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
const lower=(value:string)=>value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();

export function classifyLibraryVolume(symbol:string,title:string):LibraryVolume['category']{
  const s=lower(symbol),t=lower(title);
  if(/^(nwt|nwtsty|nwtr|rbi8|bi12|bi7|nwtsp)(?:$|[-\d])/.test(s)||/\b(traduction du monde nouveau|la bible)\b/.test(t))return 'bible';
  if(/(?:^|[-_])(co-pgm|copgm|brpgm|ca-copgm|ca-brpgm)/.test('-'+s)||
    /assemblee (de circonscription|regionale)|programme (de|d')?assemblee|congres/.test(t))return 'assemblies';
  if(/^(s[-_]\d+|th|be|km|od|ks|sfl|sfg)(?:$|[-_\d])/.test(s)||
    /\b(ecole|formation|instructions?|manuel|seminaire)\b/.test(t))return 'schools';
  if(/^(w\d{0,6}|wp\d{0,6}|g\d{0,6}|mwb\d{0,6}|ws\d{0,6})$/.test(s)||
    /tour de garde|reveillez-vous|cahier vie et ministere/.test(t))return 'magazines';
  if(/^(it[-_]?\d+|lff|bh|bhs|lv|kr|cl|jy|rr|si|nwtstys)$/.test(s)||
    /etude perspicace|livre|volume|approchons-nous/.test(t))return 'books';
  if(/^(br|fg|brch|bro|t-)\d*/.test(s)||/\bbrochure\b/.test(t))return 'brochures';
  return 'other';
}

/** An internal JW Library publication link. This is not a public WOL URL. */
export function jwpubPublicationId(link:string):number|null {
  const match=/^jwpub:\/\/p\/[A-Za-z0-9_-]+:(\d+)(?:\/[^\s]*)?$/.exec(link);
  if(!match)return null;
  const id=Number(match[1]);
  return Number.isSafeInteger(id)&&id>0?id:null;
}

export const LIBRARY_FILTERS:ReadonlyArray<{
  id:LibraryCategory;title:string;icon:string
}>=[
  {id:'all',title:'Tout',icon:'library'},
  {id:'bible',title:'Bible',icon:'book-open'},
  {id:'books',title:'Livres',icon:'book'},
  {id:'magazines',title:'Revues',icon:'newspaper'},
  {id:'brochures',title:'Brochures',icon:'files'},
  {id:'assemblies',title:'Assemblées',icon:'calendar-days'},
  {id:'schools',title:'Écoles',icon:'graduation-cap'},
  {id:'personal',title:'Mes imports',icon:'folder-heart'},
  {id:'other',title:'Autres',icon:'archive'}
];

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
export function filteredVolumes(items:LibraryVolume[],category:LibraryCategory):LibraryVolume[]{
  if(category==='all')return items;
  if(category==='personal')return items.filter(p=>p.origin==='personal');
  return items.filter(p=>p.category===category);
}
export function localDocumentFile(app:App,volume:LibraryVolume,record:OfflineDocumentRecord):TFile|null{
  if(!volume.items.some(item=>item.path===record.path))return null;
  const abstract=app.vault.getAbstractFileByPath(volume.path+'/'+record.path);
  return abstract instanceof TFile?abstract:null;
}
export function localDocumentUrl(volume:LibraryVolume,document:OfflineDocumentRecord):string|null{
  if(volume.language!==3||!document.mepsId)return null;
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/'+document.mepsId;
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
