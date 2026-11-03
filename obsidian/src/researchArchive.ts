import { cleanWolUrl } from './referenceReader.ts';
import type { ResearchCapture, ResearchCollection } from './researchCollection.ts';
import type { WolMatchMode, WolSearchScope } from './wolResearch.ts';

export interface LibraryEntry {
  captureId:string;
  tags:string[];
  starred:boolean;
  archived:boolean;
  updatedAt:number;
}
export interface SearchHistoryEntry {
  id:string;
  query:string;
  scope:WolSearchScope;
  match:WolMatchMode;
  url:string;
  planId:string|null;
  at:number;
}
export interface BibleLabArchive {
  version:1;
  entries:LibraryEntry[];
  history:SearchHistoryEntry[];
}
export type ArchiveFilter='all'|'favorites'|'inbox'|'archived';
export type ArchiveSort='recent'|'title';
const asRecord=(x:unknown):Record<string,unknown>|null=>
  x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:null;
const safeId=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=120;
const optionalId=(x:unknown):string|null=>safeId(x)?x:null;
const number=(x:unknown):number=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:0;
const clean=(x:unknown,max=180):string=>typeof x==='string'
  ?x.replace(/[\t\r\n]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const queryKey=(x:string):string=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr');
const cleanTags=(value:unknown):string[]=>{
  const tags=Array.isArray(value)?value:typeof value==='string'?value.split(/[,;]+/):[];
  const normalized:string[]=[];
  for(const candidate of tags){
    const tag=clean(candidate,45).replace(/^#+/,'');
    if(tag&&!normalized.some(t=>queryKey(t)===queryKey(tag))){
      normalized.push(tag);
      if(normalized.length===15)break;
    }
  }
  return normalized;
};
export const emptyBibleLabArchive=():BibleLabArchive=>({version:1,entries:[],history:[]});
export function normalizeBibleLabArchive(input:unknown):BibleLabArchive{
  const value=asRecord(input);
  if(!value)return emptyBibleLabArchive();
  const entries:LibraryEntry[]=[];
  const seen=new Set<string>();
  for(const candidate of (Array.isArray(value.entries)?value.entries:[]).slice(0,1600)){
    const entry=asRecord(candidate);
    if(!entry||!safeId(entry.captureId)||seen.has(entry.captureId))continue;
    seen.add(entry.captureId);
    entries.push({
      captureId:entry.captureId,tags:cleanTags(entry.tags),
      starred:entry.starred===true,archived:entry.archived===true,
      updatedAt:number(entry.updatedAt)
    });
  }
  const history:SearchHistoryEntry[]=[];
  const historySeen=new Set<string>();
  for(const candidate of (Array.isArray(value.history)?value.history:[]).slice(0,120)){
    const event=asRecord(candidate);
    if(!event||!safeId(event.id)||historySeen.has(event.id))continue;
    const url=typeof event.url==='string'?cleanWolUrl(event.url)||'':'';
    if(!url)continue;
    historySeen.add(event.id);
    const scope:WolSearchScope=['index','guide','perspicace'].includes(String(event.scope))
      ?event.scope as WolSearchScope:'all';
    history.push({
      id:event.id,query:clean(event.query,300),
      scope,match:event.match==='sen'?'sen':'par',
      url,planId:optionalId(event.planId),at:number(event.at)
    });
  }
  return {version:1,entries,history};
}
export const libraryEntry=(archive:BibleLabArchive,id:string):LibraryEntry=>
  archive.entries.find(item=>item.captureId===id)??{
    captureId:id,tags:[],starred:false,archived:false,updatedAt:0
  };
export function updateLibraryEntry(archive:BibleLabArchive,captureId:string,update:Partial<
  Pick<LibraryEntry,'tags'|'starred'|'archived'>
>):BibleLabArchive{
  if(!safeId(captureId))return archive;
  const previous=libraryEntry(archive,captureId);
  const entry:LibraryEntry={
    ...previous,
    tags:update.tags===undefined?previous.tags:cleanTags(update.tags),
    starred:update.starred===undefined?previous.starred:update.starred,
    archived:update.archived===undefined?previous.archived:update.archived,
    updatedAt:Date.now()
  };
  return {...archive,entries:[entry,...archive.entries.filter(item=>item.captureId!==captureId)].slice(0,1600)};
}
export function pruneMissingCaptures(archive:BibleLabArchive,collection:ResearchCollection):BibleLabArchive{
  const ids=new Set(collection.captures.map(x=>x.id));
  return {...archive,entries:archive.entries.filter(item=>ids.has(item.captureId))};
}
export function recordWolSearch(archive:BibleLabArchive,details:{
  query:string;scope:WolSearchScope;match:WolMatchMode;url:string;planId?:string|null
}):BibleLabArchive{
  const url=cleanWolUrl(details.url);
  const query=clean(details.query,300);
  if(!url||!query)return archive;
  const last=archive.history[0];
  if(last?.query===query&&last.url===url&&last.planId===(details.planId||null))return archive;
  const history:SearchHistoryEntry={
    id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10),
    query,scope:details.scope,match:details.match,url,
    planId:optionalId(details.planId),at:Date.now()
  };
  // A repeated query is shown only once per plan in recent history.
  return {...archive,history:[history,...archive.history.filter(item=>
    item.url!==url||item.planId!==history.planId)].slice(0,120)};
}
export function clearResearchHistory(archive:BibleLabArchive):BibleLabArchive{
  return {...archive,history:[]};
}
export function removeHistoryEntry(archive:BibleLabArchive,id:string):BibleLabArchive{
  return {...archive,history:archive.history.filter(item=>item.id!==id)};
}
export function libraryResults(
  archive:BibleLabArchive,collection:ResearchCollection,
  options:{term?:string;filter?:ArchiveFilter;sort?:ArchiveSort;planId?:string|null}
):ResearchCapture[]{
  const term=queryKey(clean(options.term,300));
  const filter=options.filter||'all';
  const assigned=new Set(collection.ideas.flatMap(idea=>idea.captureIds));
  const matches=collection.captures.filter(capture=>{
    const extra=libraryEntry(archive,capture.id);
    if(options.planId&&capture.planId!==options.planId)return false;
    if(filter==='favorites'&&!extra.starred)return false;
    if(filter==='archived'&&!extra.archived)return false;
    if(filter==='inbox'&&(extra.archived||assigned.has(capture.id)))return false;
    if(!term)return true;
    return queryKey([capture.label,capture.excerpt,capture.comment,capture.url,...extra.tags]
      .join(' ')).includes(term);
  });
  if(options.sort==='title')matches.sort((a,b)=>a.label.localeCompare(b.label,'fr'));
  else matches.sort((a,b)=>b.createdAt-a.createdAt);
  return matches;
}
