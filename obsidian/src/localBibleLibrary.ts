import {TFile,type App} from 'obsidian';
import {parseScripture} from './bibleLabData';
import type {ReferenceEntry,ReaderResult} from './referenceReader';
import {readVirtualPublications,VIRTUAL_SOURCE,type VirtualPublication} from './virtualJwpub';
import {readLocalBibleSource} from './nativeJw';
import {LOCAL_BIBLE_FILE,decodeLocalBible,encodeLocalBible,selectLocalPassage,localBibleLabel,type LocalBibleData} from './localBibleData';

export interface LocalBibleEdition {id:string;label:string;index:VirtualPublication}
const stamp=(file:TFile|null)=>file?file.path+':'+file.stat.mtime+':'+file.stat.size:'';
/** One shared local store for popups, chapter reading and verse search. */
export class LocalBibleLibrary {
  private loaded=new Map<string,{key:string;promise:Promise<LocalBibleData>}>();
  private disposed=false;
  constructor(private app:App,private root:()=>string){}
  dispose():void{this.disposed=true;this.loaded.clear();}
  private file(path:string):TFile|null {
    const f=this.app.vault.getAbstractFileByPath(path);return f instanceof TFile?f:null;
  }
  async editions():Promise<LocalBibleEdition[]>{
    const publications=await readVirtualPublications(this.app,this.root());
    const editions=publications.filter(({folder,index})=>index.publication.language===3&&
      ['nwt','nwtsty'].includes(index.publication.symbol)&&
      (this.file(folder+'/'+VIRTUAL_SOURCE)||this.file(folder+'/'+LOCAL_BIBLE_FILE)))
      .sort((a,b)=>(a.index.publication.symbol==='nwtsty'?0:1)-(b.index.publication.symbol==='nwtsty'?0:1)||
        b.index.publication.year-a.index.publication.year||a.folder.localeCompare(b.folder));
    const live=new Set(editions.map(e=>e.folder));for(const id of this.loaded.keys())if(!live.has(id))this.loaded.delete(id);
    return editions.map(({folder,index})=>({id:folder,label:localBibleLabel(index.publication.symbol)+' · '+index.publication.year,index}));
  }
  async load(edition:LocalBibleEdition,progress?:(percent:number|null)=>void):Promise<LocalBibleData>{
    if(this.disposed)throw Error('Lecture fermée.');
    const source=this.file(edition.id+'/'+VIRTUAL_SOURCE),cache=this.file(edition.id+'/'+LOCAL_BIBLE_FILE);
    const key=stamp(source)+'|'+stamp(cache)+'|'+(edition.index.sourceHash||'');
    const existing=this.loaded.get(edition.id);if(existing?.key===key)return existing.promise;
    const promise=this.read(edition,source,cache,progress);
    this.loaded.set(edition.id,{key,promise});
    while(this.loaded.size>2)this.loaded.delete(this.loaded.keys().next().value!);
    try{
      const data=await promise;
      // Our cache write changes its mtime. Keep the completed shared load.
      if(this.loaded.get(edition.id)?.promise===promise)this.loaded.set(edition.id,{key:stamp(source)+'|'+stamp(this.file(edition.id+'/'+LOCAL_BIBLE_FILE))+'|'+(edition.index.sourceHash||''),promise});
      return data;
    }catch(error){if(this.loaded.get(edition.id)?.promise===promise)this.loaded.delete(edition.id);throw error;}
  }
  private async read(edition:LocalBibleEdition,source:TFile|null,cache:TFile|null,progress?: (percent:number|null)=>void):Promise<LocalBibleData>{
    const pub=edition.index.publication;
    if(cache&&(!source||cache.stat.mtime>=source.stat.mtime)){
      try{
        const data=decodeLocalBible(new Uint8Array(await this.app.vault.readBinary(cache)));
        if(data.publication.symbol===pub.symbol&&data.publication.language===pub.language&&data.publication.year===pub.year&&
          (!edition.index.sourceHash||data.sourceHash===edition.index.sourceHash))return data;
      }catch{/* Rebuild a missing or damaged reading cache from the original. */}
    }
    if(!source)throw Error('Le fichier de cette Bible est introuvable. Ajoute-la à nouveau dans la bibliothèque.');
    const originalStamp=stamp(source);progress?.(null);
    const data=await readLocalBibleSource(new Uint8Array(await this.app.vault.readBinary(source)),{
      isCancelled:()=>this.disposed,
      onProgress:p=>progress?.(p.total?Math.round(100*(p.current||0)/p.total):null)
    });
    if(data.publication.symbol!==pub.symbol||data.publication.year!==pub.year||
      (edition.index.sourceHash&&edition.index.sourceHash!==data.sourceHash))throw Error('Le fichier de cette Bible a changé. Ajoute-la à nouveau dans la bibliothèque.');
    if(this.disposed||stamp(this.file(source.path))!==originalStamp)throw Error('La Bible a changé pendant son ouverture. Réessaie.');
    try{
      const bytes=encodeLocalBible(data);const target=this.file(edition.id+'/'+LOCAL_BIBLE_FILE);
      const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
      if(target)await this.app.vault.modifyBinary(target,buffer);
      else await this.app.vault.createBinary(edition.id+'/'+LOCAL_BIBLE_FILE,buffer);
    }catch{/* Reading still works when the vault cannot save an optional cache. */}
    return data;
  }
  async resolve(ref:ReferenceEntry):Promise<ReaderResult|null>{
    if(ref.kind!=='scripture')return null;
    const scripture=parseScripture(ref.label);if(!scripture)return null;
    // Respect an explicitly requested study edition when installed; otherwise
    // use an available French Bible and identify its actual edition to the reader.
    const editions=await this.editions();const requested=/\/nwtsty\//.test(ref.url)?'nwtsty':/\/nwt\//.test(ref.url)?'nwt':null;
    if(requested)editions.sort((a,b)=>Number(b.index.publication.symbol===requested)-Number(a.index.publication.symbol===requested));
    for(const edition of editions){
      try{
        const data=await this.load(edition),verses=selectLocalPassage(data,scripture);if(!verses)continue;
        const symbol=data.publication.symbol;
        return {kind:'verse',source:'local',title:scripture.label,
          sourceUrl:`https://wol.jw.org/fr/wol/b/r30/lp-f/${symbol}/${scripture.book}/${scripture.chapter}`,
          notice:'Lecture locale · '+localBibleLabel(symbol),links:[],
          lines:verses.map(v=>({type:'verse',number:String(scripture.endChapter?v.chapter+':'+v.number:v.number),text:v.text}))};
      }catch{/* Try the next installed edition, then leave the web reader available. */}
    }
    return null;
  }
}
