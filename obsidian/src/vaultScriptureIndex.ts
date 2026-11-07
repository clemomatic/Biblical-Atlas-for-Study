import {MarkdownView,TFile,type App} from 'obsidian';
import {noteScriptures,findNoteScriptures,type NoteScriptureOccurrence} from './noteScriptureIndex';

/** Reuses unchanged notes; searches all Markdown files, not just Atlas notes. */
export class VaultScriptureIndex {
  private cache=new Map<string,{stamp:string;items:NoteScriptureOccurrence[]}>();
  constructor(private app:App){}
  clear():void{this.cache.clear();}
  async search(query:string):Promise<{hits:NoteScriptureOccurrence[];unread:number}> {
    const files=this.app.vault.getMarkdownFiles(),live=new Set(files.map(f=>f.path));
    for(const key of this.cache.keys())if(!live.has(key))this.cache.delete(key);
    let cursor=0,unread=0;
    await Promise.all(Array.from({length:Math.min(6,files.length)},async()=>{
      while(cursor<files.length){
        const file=files[cursor++],stamp=file.stat.mtime+':'+file.stat.size;
        if(this.cache.get(file.path)?.stamp===stamp)continue;
        try{
          const text=await this.app.vault.cachedRead(file);
          this.cache.set(file.path,{stamp,items:noteScriptures(file.path,file.basename,text)});
        }catch{unread++;this.cache.delete(file.path);}
      }
    }));
    return {hits:findNoteScriptures([...this.cache.values()].flatMap(c=>c.items),query)
      .sort((a,b)=>a.path.localeCompare(b.path,'fr')||a.line-b.line),unread};
  }
  async open(hit:NoteScriptureOccurrence):Promise<void>{
    const file=this.app.vault.getAbstractFileByPath(hit.path);
    if(!(file instanceof TFile))throw Error('Cette note a été déplacée. Relance la recherche.');
    const leaf=this.app.workspace.getLeaf(false);await leaf.openFile(file,{eState:{line:hit.line}});
    if(leaf.view instanceof MarkdownView){
      const editor=leaf.view.editor;
      editor.setCursor({line:hit.line,ch:hit.from});
      editor.scrollIntoView({from:{line:hit.line,ch:hit.from},to:{line:hit.line,ch:hit.to}},true);
    }
  }
}
