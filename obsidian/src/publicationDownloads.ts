import {canonicalPublicationSymbol} from './offlinePublications.ts';

export type DownloadStage='queued'|'locating'|'downloading'|'opening'|'reading'|'saving'|'ready'|'error';
export interface PublicationDownloadState {stage:DownloadStage;current?:number;total?:number;error?:string}
export type DownloadProgress=(state:PublicationDownloadState)=>void;
export const downloadKey=(symbol:string,issue='')=>canonicalPublicationSymbol(symbol)+'|'+issue;
export const downloadLabel=(state:PublicationDownloadState)=>({
  queued:'En attente…',locating:'Téléchargement…',downloading:'Téléchargement…',
  opening:'Préparation…',reading:'Préparation…',saving:'Enregistrement…',ready:'Lire',error:'Réessayer'
})[state.stage];

/** One heavy publication at a time; jobs survive closing the library tab. */
export class PublicationDownloads {
  private states=new Map<string,PublicationDownloadState>();
  private pending=new Map<string,Promise<void>>();
  private listeners=new Set<(key:string)=>void>();
  private tail:Promise<void>=Promise.resolve();
  private disposed=false;
  private execute:(symbol:string,issue:string,progress:DownloadProgress,isCancelled:()=>boolean)=>Promise<boolean>;
  constructor(execute:(symbol:string,issue:string,progress:DownloadProgress,isCancelled:()=>boolean)=>Promise<boolean>){this.execute=execute;}
  get=(symbol:string,issue='')=>this.states.get(downloadKey(symbol,issue));
  subscribe=(listener:(key:string)=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
  private update(key:string,state:PublicationDownloadState):void{
    this.states.set(key,state);for(const listener of this.listeners)listener(key);
  }
  download(symbol:string,issue=''):Promise<void>{
    const key=downloadKey(symbol,issue),existing=this.pending.get(key);
    if(existing)return existing;
    if(this.disposed)return Promise.resolve();
    this.update(key,{stage:'queued'});
    const job=this.tail.then(async()=>{
      if(this.disposed)return;
      try{
        this.update(key,{stage:'locating'});
        const success=await this.execute(canonicalPublicationSymbol(symbol),issue,state=>this.update(key,state),()=>this.disposed);
        if(!this.disposed)this.update(key,success?{stage:'ready'}:{stage:'error',error:'Le téléchargement a été interrompu. Réessaie.'});
      }catch(error){if(!this.disposed)this.update(key,{stage:'error',error:error instanceof Error?error.message:'Téléchargement impossible. Réessaie.'});}
    }).finally(()=>{this.pending.delete(key);});
    this.pending.set(key,job);this.tail=job;return job;
  }
  dispose():void{this.disposed=true;this.listeners.clear();}
}
