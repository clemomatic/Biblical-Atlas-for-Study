import { unzipSync, strFromU8 } from 'fflate';
import { Notice, type App } from 'obsidian';
import { safeFilename } from './model';

export type JwArchiveKind='jwpub'|'jwlibrary';
export interface ArchiveReport {
  kind:JwArchiveKind;
  filename:string;
  entries:string[];
  title:string;
  details:{label:string;value:string}[];
  warnings:string[];
  hasDatabase:boolean;
}
const MAX_FILE_SIZE=65*1024*1024;
const MAX_UNCOMPRESSED=160*1024*1024;
const MAX_ENTRIES=1500;
function validateZip(bytes:Uint8Array):void{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let count=0,total=0,found=false;
  for(let p=0;p+46<=bytes.length;){
    const sig=view.getUint32(p,true);
    if(sig===0x02014b50){
      found=true;count++;
      if(count>MAX_ENTRIES)throw Error('Archive contenant trop de fichiers.');
      const size=view.getUint32(p+24,true),nameLength=view.getUint16(p+28,true);
      const extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
      if(size===0xffffffff)throw Error('Les archives ZIP64 ne sont pas prises en charge.');
      total+=size;
      if(size>MAX_UNCOMPRESSED||total>MAX_UNCOMPRESSED)throw Error('Archive trop volumineuse une fois décompressée.');
      p+=46+nameLength+extra+comment;
    }else p++;
  }
  if(!found)throw Error('Structure ZIP non reconnue.');
}
export async function inspectJwArchive(file:File):Promise<ArchiveReport>{
  const kind=file.name.toLowerCase().endsWith('.jwlibrary')?'jwlibrary':file.name.toLowerCase().endsWith('.jwpub')?'jwpub':null;
  if(!kind)throw Error('Choisis un fichier .jwpub ou .jwlibrary.');
  if(file.size>MAX_FILE_SIZE)throw Error('Archive trop volumineuse (limite 65 Mo).');
  const raw=new Uint8Array(await file.arrayBuffer());validateZip(raw);
  const entries=unzipSync(raw);
  const names=Object.keys(entries);
  const manifest=names.find(x=>x==='manifest.json'||x.endsWith('/manifest.json'));
  if(!manifest)throw Error('Le manifest.json attendu est absent.');
  let metadata:Record<string,any>;
  try{metadata=JSON.parse(strFromU8(entries[manifest]));}catch{throw Error('Le manifeste n’est pas un JSON valide.');}
  const warnings:string[]=[];
  const hasDatabase=names.some(x=>/^(?:.*\/)?userData\.db$/i.test(x));
  if(kind==='jwlibrary'&&!hasDatabase)warnings.push('Aucune base userData.db : archive incomplète.');
  if(kind==='jwpub'&&!names.some(x=>/\.zip$/i.test(x)))warnings.push('Le conteneur interne de la publication n’a pas été trouvé.');
  if(kind==='jwlibrary') warnings.push('L’édition des notes et la génération d’une sauvegarde ne sont pas encore activées : la base SQLite doit être traitée sans perte de données.');
  if(kind==='jwpub')warnings.push('Les textes JWPUB ne sont pas importés à cette étape : leur contenu peut nécessiter déchiffrement et décodage SQLite.');
  const info=kind==='jwpub'?metadata.publication||{}:metadata.userDataBackup||{};
  const title=String(info.title||info.displayTitle||metadata.name||file.name).slice(0,240);
  const details=[
    {label:'Type',value:kind.toUpperCase()},
    {label:'Titre',value:title},
    {label:'Version du schéma',value:String(info.schemaVersion??metadata.version??'Non indiquée')},
    {label:'Langue',value:String(info.language??info.MepsLanguageIndex??'Non indiquée')},
    {label:'Fichiers',value:String(names.length)},
    {label:'Base personnelle',value:hasDatabase?'Présente':'Non présente'}
  ];
  return {kind,filename:file.name,entries:names,title,details,warnings,hasDatabase};
}
export function createArchiveReportMarkdown(report:ArchiveReport):string {
  const header=[
    '---','bible_lab_kind: archive-inspection','bible_lab_version: 1',
    'source_file: '+JSON.stringify(report.filename),'archive_type: '+report.kind,
    '---','# '+report.title,'',
    '> [!info] Analyse locale',
    '> Ce document décrit seulement la structure du fichier. Il ne contient pas le texte chiffré des publications ni les notes personnelles.','',
    ...report.details.map(item=>'- **'+item.label+'** : '+item.value),
    '', '## Points à vérifier',
    ...report.warnings.map(item=>'- '+item),'','## Références et notes personnelles','',''
  ];
  return header.join('\n');
}
export async function saveArchiveReport(app:App,report:ArchiveReport,folder:string):Promise<string>{
  const dir=folder.replace(/\/$/,'')+'/Imports';
  let segment='';
  for(const part of dir.split('/')){segment=segment?segment+'/'+part:part;if(!app.vault.getAbstractFileByPath(segment))await app.vault.createFolder(segment);}
  const base=safeFilename(report.title).slice(0,90)||'Archive JW';
  let path=dir+'/'+base+' — inventaire.md';
  for(let i=2;app.vault.getAbstractFileByPath(path);i++)path=dir+'/'+base+' — inventaire ('+i+').md';
  const note=await app.vault.create(path,createArchiveReportMarkdown(report));
  await app.workspace.getLeaf('tab').openFile(note);
  new Notice('Rapport d’analyse enregistré dans le coffre.');
  return path;
}
export function chooseJwArchive():Promise<File|null>{
  return new Promise(resolve=>{
    const input=document.createElement('input');
    input.type='file';input.accept='.jwpub,.jwlibrary';input.hidden=true;
    let settled=false;
    const finish=(file:File|null)=>{if(settled)return;settled=true;input.remove();resolve(file);};
    input.addEventListener('change',()=>finish(input.files?.item(0)||null),{once:true});
    document.body.append(input);
    input.click();
    // Some mobile pickers do not emit cancel. A return of null is safe;
    // the promise remains pending only until the picker is dismissed.
    input.addEventListener('cancel',()=>finish(null),{once:true});
  });
}
