import { type App, Notice, TFile } from 'obsidian';
import {
  readBackup,readJwpub,rows,scalar,openDb,digest,sanitizeFilename,makeJwNote,parseJwNote,
  decryptDocument,jwHtmlToMarkdown,encodeBackup,MAX_ARCHIVE,
  type JwBackup,type JwPublication
} from './nativeJwCore';

const baseFolder=(folder:string)=>folder.replace(/\/$/,'')+'/Imports';
async function ensure(app:App,path:string):Promise<void>{
  const parts=path.split('/').filter(Boolean);let current='';
  for(const part of parts){
    current=current?current+'/'+part:part;
    if(!app.vault.getAbstractFileByPath(current))await app.vault.createFolder(current);
  }
}
async function uniqueFolder(app:App,folder:string,title:string):Promise<string>{
  await ensure(app,folder);
  const root=folder+'/'+sanitizeFilename(title);
  let candidate=root;
  for(let n=2;app.vault.getAbstractFileByPath(candidate);n++)candidate=root+' ('+n+')';
  await ensure(app,candidate);
  return candidate;
}
function nextFrame():Promise<void>{return new Promise(resolve=>setTimeout(resolve,0));}
export interface Progress {onProgress?:(done:number,total:number)=>void}
export interface ImportedResult{path:string;notes:number;images:number;index:number}
const safeLabel=(value:unknown):string=>String(value??'').replace(/[\r\n]/g,' ').slice(0,180);
export async function importJwpubToVault(app:App,file:File,folder:string,progress:Progress={}):Promise<ImportedResult>{
  const pub=await readJwpub(file);
  let target='';
  try{
    const docs=rows(pub.db,'SELECT DocumentId,Title,Content FROM Document ORDER BY DocumentId');
    if(docs.length!==pub.documentCount)throw Error('Le nombre de documents ne correspond pas.');
    // Read and authenticate the very first document before creating anything.
    if(docs.length)await decryptDocument(docs[0].Content as Uint8Array,pub.key,pub.iv);
    target=await uniqueFolder(app,baseFolder(folder),pub.title+' '+pub.year);
    const assets=new Set<string>(),images=new Set<string>();
    const names=new Set(Object.keys(pub.files));
    for(let i=0;i<docs.length;i++){
      const doc=docs[i],id=Number(doc.DocumentId),title=safeLabel(doc.Title)||'Document '+id;
      const html=await decryptDocument(doc.Content as Uint8Array,pub.key,pub.iv);
      const converted=jwHtmlToMarkdown(html,title,names);
      for(const name of converted.imageNames)assets.add(name);
      const pre=['---','bible_lab_kind: jwpub-document',
        'publication: '+JSON.stringify(pub.title),
        'publication_symbol: '+JSON.stringify(pub.symbol),
        'document_id: '+id,
        'source_jwpub: '+JSON.stringify(file.name),
        '---','',''].join('\n');
      const note=target+'/'+String(id).padStart(3,'0')+' — '+sanitizeFilename(title)+'.md';
      await app.vault.create(note,pre+converted.markdown);
      progress.onProgress?.(i+1,docs.length);
      if(i%12===0)await nextFrame();
    }
    if(assets.size)await ensure(app,target+'/assets');
    for(const name of assets){
      const bytes=pub.files[name];
      if(!bytes || bytes.length>12*1024*1024 || name.includes('/') || name.includes('..'))continue;
      const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer;
      await app.vault.createBinary(target+'/assets/'+name,data);
      images.add(name);
    }
    const first=docs[0];
    const overview=['# '+pub.title,'','> [!info] Import JWPUB local',
      '> '+docs.length+' documents · '+images.size+' illustrations',
      '> Publication : '+pub.symbol+' '+pub.year,
      '', '## Documents','',
      ...docs.map(row=>'- [['+String(row.DocumentId).padStart(3,'0')+' — '+sanitizeFilename(safeLabel(row.Title)||'Document '+row.DocumentId)+']]'),''].join('\n');
    await app.vault.create(target+'/00 — Sommaire Bible Lab.md',overview);
    return {path:target,notes:docs.length+1,images:images.size,index:1};
  }finally{pub.db.close();}
}
export interface BackupPreview{count:number;schema:number;tags:number;foreignKeyIssues:number;size:number}
export async function previewBackupFile(file:File):Promise<BackupPreview>{
  const data=await readBackup(file);
  return {count:data.count,schema:data.schema,tags:data.tags,foreignKeyIssues:data.foreignKeyIssues,size:file.size};
}
export async function importBackupToVault(app:App,file:File,folder:string,progress:Progress={}):Promise<ImportedResult>{
  const source=await readBackup(file);
  const db=await openDb(source.dbBytes);
  let target='';
  try{
    const tags=new Map<number,string[]>();
    for(const row of rows(db,'SELECT tm.NoteId, t.Name FROM TagMap tm JOIN Tag t ON tm.TagId=t.TagId WHERE tm.NoteId IS NOT NULL ORDER BY tm.Position')){
      const noteId=Number(row.NoteId);
      if(!tags.has(noteId))tags.set(noteId,[]);
      tags.get(noteId)!.push(safeLabel(row.Name));
    }
    const notes=rows(db,'SELECT NoteId,Guid,Title,Content,Created,LastModified,LocationId,UserMarkId FROM Note ORDER BY NoteId');
    if(notes.length!==source.count)throw Error('Notes incomplètes : import refusé.');
    target=await uniqueFolder(app,baseFolder(folder),'JW Library '+String(source.manifest.creationDate||source.schema));
    const topicFiles=new Map<string,{file:string;refs:string[]}>();
    const seen=new Set<string>();
    for(let i=0;i<notes.length;i++){
      const note=notes[i],guid=String(note.Guid||'');
      if(!/^[0-9a-f-]{36}$/i.test(guid)||seen.has(guid))throw Error('GUID de note invalide ou en double.');
      seen.add(guid);
      const title=String(note.Title??''),body=String(note.Content??'');
      const baseline=await digest(new TextEncoder().encode(title+'\0'+body));
      const stem=sanitizeFilename(title)+' — '+guid;
      await app.vault.create(target+'/'+stem+'.md',makeJwNote(
        guid,title,body,note.Created??null,note.LastModified??null,note.LocationId??null,
        note.UserMarkId??null,tags.get(Number(note.NoteId))||[],baseline));
      for(const tag of tags.get(Number(note.NoteId))||[]){
        if(!topicFiles.has(tag))topicFiles.set(tag,{file:sanitizeFilename(tag),refs:[]});
        topicFiles.get(tag)!.refs.push('- [['+stem+'|'+(title.replace(/[\[\]|]/g,'')||'Sans titre')+']]');
      }
      progress.onProgress?.(i+1,notes.length);
      if(i%25===0)await nextFrame();
    }
    await ensure(app,target+'/INDEX/Thèmes');
    let numTags=0;
    const overview=['---','bible_lab_kind: jw-library-index','---','# Mon laboratoire d’étude','',
      '> [!info] Mes notes JW Library','> **'+notes.length+' notes** · **'+topicFiles.size+' thèmes**',
      '', '## Parcourir mes thèmes',''];
    for(const [label,record] of [...topicFiles.entries()].sort((a,b)=>b[1].refs.length-a[1].refs.length)){
      const key=await digest(new TextEncoder().encode(label));
      const stem=record.file+'-'+key.slice(0,8);
      overview.push('- [[INDEX/Thèmes/'+stem+'|'+label.replace(/[\[\]|]/g,'')+']] · '+record.refs.length);
      await app.vault.create(target+'/INDEX/Thèmes/'+stem+'.md',['# '+label,'','> '+record.refs.length+' notes associées','',...record.refs,''].join('\n'));
      numTags++;
      if(numTags%40===0)await nextFrame();
    }
    await app.vault.create(target+'/INDEX/00 Tableau de recherche.md',overview.join('\n'));
    await app.vault.create(target+'/_BIBLE_LAB_IMPORT.json',JSON.stringify({
      source_name:file.name,source_sha256:source.sourceSha,
      schema_version:source.schema,note_count:notes.length,
      generated_at:new Date().toISOString(),format:'bible-lab-native-v1'
    },null,2));
    return {path:target,notes:notes.length,images:0,index:topicFiles.size+1};
  }finally{db.close();}
}
interface Metadata {source_name:string;source_sha256:string;schema_version:number;note_count:number;format:string}
export interface BackupChange{guid:string;title:string;type:'titre'|'contenu'|'titre et contenu';newTitle:string;newContent:string;noteId:number}
export interface BackupExportPlan {folder:string;schema:number;source: JwBackup;notes:number;changes:BackupChange[];baselineFk:string[];metadata:Metadata}
function fk(db:Awaited<ReturnType<typeof openDb>>):string[]{
  return rows(db,'PRAGMA foreign_key_check').map(row=>JSON.stringify(row)).sort();
}
function listBackupImports(app:App):TFile[]{
  return app.vault.getFiles().filter(f=>f.name==='_BIBLE_LAB_IMPORT.json'&&f.path.includes('/Imports/'));
}
export async function prepareBackupExport(app:App,file:File):Promise<BackupExportPlan>{
  const source=await readBackup(file);
  const candidates:listMetadata[]=[];
  type listMetadata={file:TFile;metadata:Metadata};
  for(const path of listBackupImports(app)){
    try{
      const info=JSON.parse(await app.vault.cachedRead(path)) as Metadata;
      if(info.source_sha256===source.sourceSha && info.schema_version===source.schema)candidates.push({file:path,metadata:info});
    }catch{ /* Other plugin JSON is not a JW import. */ }
  }
  if(candidates.length!==1)throw Error(candidates.length===0
      ?'Aucun import de cette sauvegarde : importe d’abord tes notes.'
      :'Plusieurs imports de cette sauvegarde. Conserve un seul dossier pour réexporter.');
  const {file:metaFile,metadata}=candidates[0];
  const folder=metaFile.parent?.path || metaFile.path.slice(0,metaFile.path.lastIndexOf('/'));
  const db=await openDb(source.dbBytes);
  try{
    const baselineFk=fk(db);
    const noteRows=rows(db,'SELECT NoteId,Guid,Title,Content FROM Note');
    const known=new Map(noteRows.map(x=>[String(x.Guid),x]));
    const files=app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(folder+'/') && f.parent?.path===folder);
    if(files.length!==source.count||metadata.note_count!==source.count)throw Error('Un fichier de note manque ou a été ajouté : réexportation refusée.');
    const changes:BackupChange[]=[];
    const seen=new Set<string>();
    for(let i=0;i<files.length;i++){
      const parsed=parseJwNote(await app.vault.cachedRead(files[i]));
      if(!parsed)throw Error('Une note a perdu ses marqueurs JW : '+files[i].basename);
      const original=known.get(parsed.guid);
      if(!original || seen.has(parsed.guid))throw Error('GUID inconnu ou en double : '+parsed.guid);
      seen.add(parsed.guid);
      const title=String(original.Title??''),body=String(original.Content??'');
      if(await digest(new TextEncoder().encode(title+'\0'+body))!==parsed.originalHash)throw Error('La note ne correspond plus à la sauvegarde : '+files[i].basename);
      const changeTitle=parsed.title!==title, changeContent=parsed.content!==body;
      if(changeTitle||changeContent)changes.push({
        guid:parsed.guid,title:title||'(Sans titre)',
        type:changeTitle&&changeContent?'titre et contenu':changeTitle?'titre':'contenu',
        newTitle:parsed.title,newContent:parsed.content,noteId:Number(original.NoteId)
      });
      if(i%75===0)await nextFrame();
    }
    if(seen.size!==source.count)throw Error('GUID manquants : réexportation refusée.');
    return {source,notes:source.count,changes,baselineFk,folder,schema:source.schema,metadata};
  }finally{db.close();}
}
export async function executeBackupExport(app:App,plan:BackupExportPlan,folder:string):Promise<string>{
  if(!plan.changes.length)throw Error('Aucune modification à exporter.');
  // Re-check the input archive against the original preview before writing.
  const source=await readBackup(plan.source.file);
  if(source.sourceSha!==plan.source.sourceSha)throw Error('La sauvegarde a changé depuis la prévisualisation.');
  const db=await openDb(source.dbBytes);
  let output:Uint8Array;
  try{
    if(JSON.stringify(fk(db))!==JSON.stringify(plan.baselineFk))throw Error('Les relations initiales ne correspondent plus.');
    db.run('BEGIN TRANSACTION');
    try{
      const statement=db.prepare('UPDATE Note SET Title=?, Content=?, LastModified=? WHERE NoteId=?');
      const now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
      for(const change of plan.changes){statement.bind([change.newTitle,change.newContent,now,change.noteId]);statement.step();statement.reset?.();}
      statement.free();
      db.run('UPDATE LastModified SET LastModified=?',[now]);
      if(scalar(db,'PRAGMA integrity_check')!=='ok')throw Error('SQLite integrity_check échoué.');
      if(Number(scalar(db,'SELECT count(*) FROM Note'))!==plan.notes)throw Error('Des notes ont été perdues.');
      if(JSON.stringify(fk(db))!==JSON.stringify(plan.baselineFk))throw Error('Une relation SQLite a été altérée.');
      db.run('COMMIT');
    }catch(error){db.run('ROLLBACK');throw error;}
    const bytes=db.export();
    output=await encodeBackup(source,bytes);
  }finally{db.close();}
  await ensure(app,folder+'/Exports');
  const basename='JW Library modifiée — '+new Date().toISOString().replace(/[:.]/g,'-');
  let dest=folder+'/Exports/'+basename+'.jwlibrary';
  for(let n=2;app.vault.getAbstractFileByPath(dest);n++)dest=folder+'/Exports/'+basename+' ('+n+').jwlibrary';
  await app.vault.createBinary(dest,output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength) as ArrayBuffer);
  new Notice(plan.changes.length+' notes mises à jour dans une nouvelle sauvegarde. Original intact.');
  return dest;
}
