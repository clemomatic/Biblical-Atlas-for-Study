import { normalizeResearchDesk, type ResearchDesk } from './researchDesk.ts';
import { normalizeResearchCollection, type ResearchCollection } from './researchCollection.ts';
import { normalizeBibleLabArchive, pruneMissingCaptures, type BibleLabArchive } from './researchArchive.ts';

export const BIBLE_LAB_BACKUP_TYPE='bible-lab-personal-research';
export const BIBLE_LAB_BACKUP_VERSION=1;
export const MAX_BIBLE_LAB_BACKUP_BYTES=22*1024*1024;
export const BACKUP_DIRECTORY='Bible-Lab_Sauvegardes';

export interface BibleLabResearchState {
  desk:ResearchDesk;
  collection:ResearchCollection;
  archive:BibleLabArchive;
}
export interface BibleLabBackup {
  type:typeof BIBLE_LAB_BACKUP_TYPE;
  version:typeof BIBLE_LAB_BACKUP_VERSION;
  exportedAt:string;
  data:BibleLabResearchState;
}
export interface BibleLabBackupCounts {
  plans:number;
  branches:number;
  captures:number;
  ideas:number;
  indexed:number;
  history:number;
}
const record=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)
    ?value as Record<string,unknown>:null;
const arr=(value:unknown,name:string,max:number):unknown[]=>{
  if(!Array.isArray(value))throw Error('La section '+name+' est absente ou invalide.');
  if(value.length>max)throw Error('La section '+name+' dépasse la limite de sécurité.');
  return value;
};
const version=(value:unknown,name:string):void=>{
  if(record(value)?.version!==1)throw Error('Version '+name+' incompatible avec Bible Lab.');
};
export function researchStateCounts(state:BibleLabResearchState):BibleLabBackupCounts{
  return {
    plans:state.desk.plans.length,
    branches:state.desk.plans.reduce((sum,plan)=>sum+plan.branches.length,0),
    captures:state.collection.captures.length,
    ideas:state.collection.ideas.length,
    indexed:state.archive.entries.length,
    history:state.archive.history.length
  };
}
export function buildBibleLabBackup(state:BibleLabResearchState,date:Date=new Date()):string{
  // Round-trip through the existing validators before saving portable data.
  const desk=normalizeResearchDesk(state.desk);
  const collection=normalizeResearchCollection(state.collection);
  const archive=pruneMissingCaptures(normalizeBibleLabArchive(state.archive),collection);
  const document:BibleLabBackup={
    type:BIBLE_LAB_BACKUP_TYPE,version:1,
    exportedAt:date.toISOString(),
    data:{desk,collection,archive}
  };
  const json=JSON.stringify(document,null,2);
  if(new TextEncoder().encode(json).length>MAX_BIBLE_LAB_BACKUP_BYTES)
    throw Error('Cette recherche dépasse la taille maximale de sauvegarde (22 Mo).');
  return json+'\n';
}
export function parseBibleLabBackup(json:string):{state:BibleLabResearchState;exportedAt:string;counts:BibleLabBackupCounts}{
  if(new TextEncoder().encode(json).length>MAX_BIBLE_LAB_BACKUP_BYTES)
    throw Error('Sauvegarde trop volumineuse (maximum 22 Mo).');
  let raw:unknown;
  try{raw=JSON.parse(json);}catch{throw Error('Ce fichier ne contient pas un JSON de sauvegarde valide.');}
  const root=record(raw);
  if(!root||root.type!==BIBLE_LAB_BACKUP_TYPE||root.version!==BIBLE_LAB_BACKUP_VERSION)
    throw Error('Ce fichier ne provient pas de la sauvegarde personnelle Bible Lab v1.');
  if(typeof root.exportedAt!=='string'||!Number.isFinite(Date.parse(root.exportedAt)))
    throw Error('Date de sauvegarde absente ou incorrecte.');
  const data=record(root.data);
  if(!data)throw Error('Le contenu de la sauvegarde est absent.');
  version(data.desk,'des plans');
  version(data.collection,'des trouvailles');
  version(data.archive,'de l’index');
  const d=record(data.desk)!;
  const c=record(data.collection)!;
  const a=record(data.archive)!;
  const plans=arr(d.plans,'des plans',50);
  const captures=arr(c.captures,'des trouvailles',1500);
  const ideas=arr(c.ideas,'des fiches',400);
  const entries=arr(a.entries,'des étiquettes',1600);
  const history=arr(a.history,'de l’historique WOL',120);
  for(const plan of plans)arr(record(plan)?.branches,'des pistes d’un plan',150);
  for(const idea of ideas)arr(record(idea)?.captureIds,'des sources d’une fiche',100);
  const desk=normalizeResearchDesk(d);
  const collection=normalizeResearchCollection(c);
  const archive=pruneMissingCaptures(normalizeBibleLabArchive(a),collection);
  const state:BibleLabResearchState={desk,collection,archive};
  const counts=researchStateCounts(state);
  // Reject partial restores rather than silently dropping malformed records.
  if(counts.plans!==plans.length||counts.captures!==captures.length||
     counts.ideas!==ideas.length||counts.indexed!==entries.length||
     counts.history!==history.length)
    throw Error('Cette sauvegarde contient des entrées invalides ou incomplètes.');
  for(const plan of plans){
    const item=record(plan);
    if(!item||!desk.plans.some(x=>x.id===item.id&&
      x.branches.length===(item.branches as unknown[]).length))
      throw Error('Une piste de recherche est invalide.');
  }
  for(const idea of ideas){
    const item=record(idea);
    if(!item||!collection.ideas.some(x=>x.id===item.id&&
      x.captureIds.length===(item.captureIds as unknown[]).length))
      throw Error('Une fiche référence une source absente ou en doublon.');
  }
  for(const capture of captures){
    const item=record(capture);
    const restored=collection.captures.find(x=>x.id===item?.id);
    if(!item||!restored||typeof item.url!=='string'||(item.url&&!restored.url))
      throw Error('Une source WOL est invalide dans cette sauvegarde.');
  }
  return {state,exportedAt:root.exportedAt,counts};
}
/** Used only to generate new backup names; never overwrites an existing file. */
export function backupFileName(now:Date=new Date(),suffix=0):string{
  const stamp=now.toISOString().replace(/[:.]/g,'-');
  return 'Bible-Lab_recherches_'+stamp+(suffix?'-'+suffix:'')+'.json';
}
