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
const MAX_FILE_SIZE=140*1024*1024;
const MAX_UNCOMPRESSED=340*1024*1024;
const MAX_ENTRIES=1500;
function validateZip(bytes:Uint8Array):string[]{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  // Locate end-of-central-directory. Do not scan file bodies: a compressed entry
  // may contain the same signature by chance.
  let eocd=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
    if(view.getUint32(p,true)===0x06054b50){eocd=p;break;}
  }
  if(eocd<0)throw Error('Structure ZIP non reconnue.');
  const count=view.getUint16(eocd+10,true),size=view.getUint32(eocd+12,true),offset=view.getUint32(eocd+16,true);
  if(count>MAX_ENTRIES||count===0)throw Error('Nombre de fichiers ZIP non valide.');
  if(offset+size>eocd||offset+size>bytes.length)throw Error('Table centrale ZIP invalide.');
  let p=offset,total=0;
  const filenames:string[]=[];
  const decode=new TextDecoder();
  for(let n=0;n<count;n++){
    if(p+46>bytes.length||view.getUint32(p,true)!==0x02014b50)throw Error('Entrée ZIP centrale invalide.');
    const flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true);
    const uncompressed=view.getUint32(p+24,true);
    const nameLength=view.getUint16(p+28,true),extra=view.getUint16(p+30,true),comment=view.getUint16(p+32,true);
    if(flags&1)throw Error('Archives chiffrées non prises en charge.');
    if(method!==0&&method!==8)throw Error('Compression ZIP non prise en charge.');
    if(uncompressed===0xffffffff)throw Error('Archives ZIP64 non prises en charge.');
    total+=uncompressed;
    if(p+46+nameLength+extra+comment>bytes.length)throw Error('Nom de fichier ZIP tronqué.');
    const filename=decode.decode(bytes.subarray(p+46,p+46+nameLength));
    if(filename.startsWith('/') || filename.split('/').includes('..'))throw Error('Chemin ZIP interdit.');
    if(filenames.includes(filename))throw Error('Fichier ZIP en double.');
    filenames.push(filename);
    if(uncompressed>MAX_UNCOMPRESSED||total>MAX_UNCOMPRESSED)throw Error('Archive trop volumineuse une fois décompressée.');
    p+=46+nameLength+extra+comment;
  }
  if(p!==offset+size)throw Error('Taille de table centrale incohérente.');
  return filenames;
}
export async function inspectJwArchive(file:File):Promise<ArchiveReport>{
  const kind=file.name.toLowerCase().endsWith('.jwlibrary')?'jwlibrary':file.name.toLowerCase().endsWith('.jwpub')?'jwpub':null;
  if(!kind)throw Error('Choisis un fichier .jwpub ou .jwlibrary.');
  if(file.size>MAX_FILE_SIZE)throw Error('Archive trop volumineuse (limite 140 Mo).');
  const raw=new Uint8Array(await file.arrayBuffer());
  const names=validateZip(raw);
  // Avoid decompressing photos, media and playlists. A modern JW backup can
  // exceed 80 MB; only the manifest and database are needed for inspection.
  const entries=unzipSync(raw,{filter:entry=>entry.name==='manifest.json'||/userData\.db$/i.test(entry.name)});

  const manifest=names.find(x=>x==='manifest.json'||x.endsWith('/manifest.json'));
  if(!manifest)throw Error('Le manifest.json attendu est absent.');
  let metadata:Record<string,any>;
  try{metadata=JSON.parse(strFromU8(entries[manifest]));}catch{throw Error('Le manifeste n’est pas un JSON valide.');}
  const warnings:string[]=[];
  const hasDatabase=names.some(x=>/^(?:.*\/)?userData\.db$/i.test(x));
  if(kind==='jwlibrary'&&!hasDatabase)warnings.push('Aucune base userData.db : archive incomplète.');
  const dbName=names.find(x=>/^(?:.*\/)?userData\.db$/i.test(x));
  let databaseVersion:number|null=null, databaseSize=0;
  let checksum='Non vérifié';
  if(dbName){
    const db=entries[dbName];databaseSize=db.length;
    const isSqlite=db.length>=100 && strFromU8(db.subarray(0,16))==='SQLite format 3\0';
    if(isSqlite && kind==='jwlibrary'){
      const expected=typeof metadata.userDataBackup?.hash==='string'?metadata.userDataBackup.hash:'';
      if(expected){
        const digest=await crypto.subtle.digest('SHA-256',db as BufferSource);
        const computed=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
        if(computed!==expected)throw Error('Empreinte SHA-256 incorrecte : sauvegarde potentiellement corrompue.');
        checksum='SHA-256 conforme';
      }
    }
    if(!isSqlite)warnings.push('En-tête SQLite incomplet ou non valide : inspection structurelle seulement.');
    else databaseVersion=new DataView(db.buffer,db.byteOffset,db.byteLength).getUint32(60,false);
  }
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
    {label:'Base personnelle',value:hasDatabase?'Présente':'Non présente'},
    {label:'Taille base SQLite',value:databaseSize?Math.round(databaseSize/1024)+' Kio':'Non présente'},
    {label:'SQLite user_version',value:databaseVersion===null?'Non disponible':String(databaseVersion)},
    {label:'Intégrité du manifeste',value:checksum}
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
