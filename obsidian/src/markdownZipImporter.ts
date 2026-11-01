import { unzipSync } from 'fflate';
import { Notice, type App } from 'obsidian';

export interface MarkdownArchiveSummary { files:number;notes:number;images:number;folder:string }
const MAX_COMPRESSED=40*1024*1024;
const MAX_EXPANDED=160*1024*1024;
const ACCEPTED=new Set(['md','json','png','jpg','jpeg','webp','gif']);
const decoder=new TextDecoder('utf-8',{fatal:true});
function filenameOnly(value:string):string {
  return value.replace(/\.zip$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').trim().slice(0,85)||'Import';
}
export function chooseMarkdownZip():Promise<File|null>{
  return new Promise(resolve=>{
    const input=document.createElement('input');input.type='file';input.accept='.zip';input.hidden=true;
    let settled=false;
    const finish=(file:File|null)=>{if(settled)return;settled=true;input.remove();resolve(file);};
    input.addEventListener('change',()=>finish(input.files?.item(0)||null),{once:true});
    input.addEventListener('cancel',()=>finish(null),{once:true});
    document.body.append(input);input.click();
  });
}
export async function importMarkdownZip(app:App,file:File,folder:string):Promise<MarkdownArchiveSummary>{
  if(!file.name.toLowerCase().endsWith('.zip'))throw Error('Choisis un dossier Markdown compressé en ZIP.');
  if(file.size>MAX_COMPRESSED)throw Error('ZIP trop volumineux (40 Mo maximum).');
  const data=new Uint8Array(await file.arrayBuffer());
  const unpacked=unzipSync(data);
  const files=Object.entries(unpacked).filter(([name])=>!name.endsWith('/'));
  if(files.length===0||files.length>5000)throw Error('Nombre de documents hors limites.');
  if(files.reduce((sum,[,bytes])=>sum+bytes.length,0)>MAX_EXPANDED)throw Error('Fichiers décompressés trop volumineux.');
  const seen=new Set<string>();
  for(const [name,bytes] of files){
    const parts=name.split('/');
    if(name.startsWith('/')||name.includes('\\')||parts.some(x=>x==='..'||x==='.'||!x||/[\x00-\x1f]/.test(x)))throw Error('Chemin de fichier ZIP non autorisé.');
    if(seen.has(name))throw Error('Fichier répété dans l’archive.');
    seen.add(name);
    const ext=name.includes('.')?name.split('.').pop()!.toLowerCase():'';
    if(!ACCEPTED.has(ext))throw Error('Format non autorisé dans le ZIP : '+name);
    if(bytes.length>24*1024*1024)throw Error('Document individuel trop volumineux.');
    if(ext==='md'||ext==='json')decoder.decode(bytes);
  }
  let target=folder.replace(/\/$/,'')+'/Imports/'+filenameOnly(file.name);
  for(let n=2;app.vault.getAbstractFileByPath(target);n++)target=folder.replace(/\/$/,'')+'/Imports/'+filenameOnly(file.name)+' ('+n+')';
  const ensure=async(path:string):Promise<void>=>{
    let prefix='';
    for(const item of path.split('/').filter(Boolean)){
      prefix=prefix?prefix+'/'+item:item;
      if(!app.vault.getAbstractFileByPath(prefix))await app.vault.createFolder(prefix);
    }
  };
  await ensure(target);
  let notes=0,images=0;
  // The root destination is always new and never coincides with an existing
  // user document. We create no links outside this destination.
  for(const [name,bytes] of files){
    const full=target+'/'+name;
    await ensure(full.substring(0,full.lastIndexOf('/')));
    if(app.vault.getAbstractFileByPath(full))throw Error('Chemin déjà occupé dans le nouvel import : '+name);
    const ext=name.split('.').pop()!.toLowerCase();
    if(ext==='md'){await app.vault.create(full,decoder.decode(bytes));notes++;}
    else {await app.vault.createBinary(full,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer);
      if(ext!=='json')images++;
    }
  }
  new Notice(notes+' notes et '+images+' illustrations importées dans '+target);
  return {files:files.length,notes,images,folder:target};
}
