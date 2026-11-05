/* Local-only JWPUB / JW Library engine. No third-party service sees the files.
 * This uses SQL.js compiled into the Obsidian bundle, with its WASM inlined.
 * The original source bytes are never modified. */
import initSqlJs from 'sql.js/dist/sql-wasm.js';
import wasmAsset from 'sql.js/dist/sql-wasm.wasm?inline';
import { unzipSync, unzlibSync, strFromU8, strToU8 } from 'fflate';
import { patchZip } from './zipPatch';
import { OFFLINE_INDEX_NAME, type OfflineDocumentRecord, type OfflineImportIndex } from './offlinePublications';
import { buildJwpubMeetingNotebooks, type MeetingDocument } from './meetingNotebook';

export type Db = {exec:(sql:string,params?:unknown[])=>{columns:string[];values:unknown[][]}[];
 run:(sql:string,params?:unknown[])=>Db; export:()=>Uint8Array; close:()=>void};
type Source = { zip:Record<string,Uint8Array>;manifest:any;database:Uint8Array; dbName:string;hash:string; schema:number };
export type ImportEntry = {name:string;text?:string;bytes?:Uint8Array};
export type ImportPreview = {type:'jwpub'|'jwlibrary';title:string;sourceHash:string;entries:ImportEntry[];count:number;schema?:number;warnings:string[]};
export type ChangeItem = {guid:string;titleBefore:string;titleAfter:string;contentBefore:string;contentAfter:string; noteId:number};
export type ExportPlan = {source:Source;changes:ChangeItem[];db:Db;baselineFk:string[];notes:number};
const MAX_BYTES=150*1024*1024, MAX_EXPANDED=410*1024*1024;
const KEY_MASK='11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7';
const MARKER='<!-- BIBLE_LAB_NOTE_START -->\n';
let sqlPromise:Promise<any>|null=null;
function assert(cond:unknown,msg:string):asserts cond {if(!cond)throw Error(msg);}
function u8(data:ArrayBuffer|Uint8Array):Uint8Array {return data instanceof Uint8Array?data:new Uint8Array(data);}
function string(bytes:Uint8Array){return strFromU8(bytes);}
function hex(bytes:Uint8Array){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
export async function digest(bytes:Uint8Array){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)));}
async function digestText(text:string){return digest(strToU8(text));}
export async function getSql():Promise<any> {
 if(!sqlPromise)sqlPromise=(async()=>{
   const base64=wasmAsset.slice(wasmAsset.indexOf(',')+1);
   assert(wasmAsset.startsWith('data:'),'Moteur SQLite non intégré au plugin.');
   const raw=atob(base64);const bytes=new Uint8Array(raw.length);
   for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   return initSqlJs({wasmBinary:bytes.buffer});
 })();
 return sqlPromise;
}
export async function openDb(bytes:Uint8Array):Promise<Db> {
 assert(string(bytes.subarray(0,16))==='SQLite format 3\0','Base SQLite non valide.');
 const Sql=await getSql();return new Sql.Database(bytes);
}
function query(db:Db,sql:string):any[]{const r=db.exec(sql);if(!r.length)return [];return r[0].values.map(values=>Object.fromEntries(r[0].columns.map((c,i)=>[c,values[i]])));}
function one(db:Db,sql:string):any {return query(db,sql)[0]||null;}
function safeName(name:string):string{return name.normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,82)||'Sans titre';}
function safeZip(data:Uint8Array):string[] {
 assert(data.length<=MAX_BYTES,'Archive trop volumineuse (150 Mo maximum).');
 const v=new DataView(data.buffer,data.byteOffset,data.byteLength);let end=-1;
 for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){
   if(v.getUint32(i,true)===0x06054b50){end=i;break;}
 }
 assert(end>=0,'Archive ZIP non reconnue.');
 const count=v.getUint16(end+10,true), offset=v.getUint32(end+16,true), size=v.getUint32(end+12,true);
 assert(count>0&&count<8000&&offset+size<=end,'Archive ZIP trop complexe.');
 let total=0,pos=offset;const names=new Set<string>();
 for(let i=0;i<count;i++){
   assert(pos+46<=data.length&&v.getUint32(pos,true)===0x02014b50,'Table ZIP invalide.');
   const len=v.getUint16(pos+28,true),extra=v.getUint16(pos+30,true),comment=v.getUint16(pos+32,true);
   const unpacked=v.getUint32(pos+24,true);
   assert(unpacked!==0xffffffff,'ZIP64 non pris en charge.');
   total+=unpacked;assert(total<=MAX_EXPANDED,'Archive décompressée trop volumineuse.');
   const name=string(data.subarray(pos+46,pos+46+len));
   assert(!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').includes('..')&&!names.has(name),'Chemin ZIP dangereux ou répété.');
   names.add(name);pos+=46+len+extra+comment;
 }
 assert(pos===offset+size,'Table ZIP incohérente.');
 return Array.from(names);
}
function extract(bytes:Uint8Array, filter?:(name:string)=>boolean):Record<string,Uint8Array>{
 safeZip(bytes);
 return unzipSync(bytes,filter?{filter:file=>filter(file.name)}:undefined);
}
async function openSource(bytes:Uint8Array,includeMedia=false):Promise<Source>{
 const zip=extract(bytes,includeMedia?undefined:n=>n==='manifest.json'||n.endsWith('.db'));
 assert(zip['manifest.json'],'Manifeste manquant.');
 const manifest=JSON.parse(string(zip['manifest.json']));
 const name=manifest.userDataBackup?.databaseName;
 assert(typeof name==='string'&&zip[name],'Sauvegarde JW Library non reconnue.');
 const database=zip[name] as Uint8Array;
 assert(await digest(database)===manifest.userDataBackup.hash,'SHA-256 de la sauvegarde incorrect.');
 const db=await openDb(database);
 try{
   const schema=Number(one(db,'PRAGMA user_version')?.user_version??db.exec('PRAGMA user_version')[0]?.values[0]?.[0]);
   assert(schema>=14&&schema<=16,'Schéma '+schema+' non validé (14 à 16 pris en charge).');
   return {zip,manifest,database,dbName:name,hash:await digest(bytes),schema};
 }finally{db.close();}
}
function formatNote(row:any,tags:string[],source:string):Promise<string>{
 const title=String(row.Title??''),content=String(row.Content??'');
 const meta=[
 '---','bible_lab_kind: jw-library-note','jw_guid: '+JSON.stringify(String(row.Guid)),
 'title: '+JSON.stringify(title),'jw_source_sha256: '+JSON.stringify(source),
 'jw_created: '+JSON.stringify(row.Created??null),'jw_last_modified: '+JSON.stringify(row.LastModified??null),
 'jw_location_id: '+JSON.stringify(row.LocationId??null),'jw_user_mark_id: '+JSON.stringify(row.UserMarkId??null),
 'jw_tags: '+JSON.stringify(tags),'jw_original_hash: '
 ];
 return digestText(title+'\0'+content).then(hash=>meta.join('\n')+hash+'\n---\n\n'+MARKER+content);
}
export async function readBackup(file:File):Promise<ImportPreview>{
 const bytes=u8(await file.arrayBuffer());const source=await openSource(bytes);
 const db=await openDb(source.database);
 try{
   assert(one(db,'PRAGMA integrity_check')?.integrity_check==='ok','SQLite integrity_check a échoué.');
   const rows=query(db,'SELECT NoteId, Guid, Title, Content, Created, LastModified, LocationId, UserMarkId FROM Note ORDER BY NoteId');
   assert(rows.length<=10000,'Trop de notes pour cet import.');
   const tags=new Map<number,string[]>();
   for(const tag of query(db,'SELECT tm.NoteId, t.Name FROM TagMap tm JOIN Tag t ON tm.TagId=t.TagId WHERE tm.NoteId IS NOT NULL ORDER BY tm.Position')){
      const id=Number(tag.NoteId);const arr=tags.get(id)||[];arr.push(String(tag.Name));tags.set(id,arr);
   }
   const entries:ImportEntry[]=[];
   const labelGroups=new Map<string,{title:string;name:string}[]>();
   for(let i=0;i<rows.length;i++){
     const row=rows[i];assert(typeof row.Guid==='string'&&row.Guid.length===36,'GUID de note absent.');
     const name=safeName(String(row.Title||'Note'))+' — '+row.Guid+'.md';
     entries.push({name,text:await formatNote(row,tags.get(Number(row.NoteId))||[],source.hash)});
     for(const label of tags.get(Number(row.NoteId))||[]){
       const list=labelGroups.get(label)||[];list.push({title:String(row.Title||'Sans titre'),name:name.slice(0,-3)});labelGroups.set(label,list);
     }
   }
   const home=['---','bible_lab_kind: jw-library-index','---','# Mon laboratoire d’étude','',
       '> [!summary] Notes JW Library', '> **'+rows.length+' notes · '+labelGroups.size+' thèmes**','','## Explorer par thème',''];
   for(const [label,notes] of [...labelGroups.entries()].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0],'fr'))){
     const name=safeName(label)+'-'+(await digestText(label)).slice(0,8);
     home.push('- [['+name+'|'+label.replace(/\|/g,' ')+']] · '+notes.length);
     entries.push({name:'INDEX/Thèmes/'+name+'.md',text:'# '+label+'\n\n'+notes.map(x=>'- [['+x.name+'|'+x.title.replace(/\|/g,' ')+']]').join('\n')+'\n'});
   }
   entries.push({name:'INDEX/00 Tableau de recherche.md',text:home.join('\n')+'\n'});
   entries.push({name:'_BIBLE_LAB_IMPORT.json',text:JSON.stringify({source_name:file.name,source_sha256:source.hash,schema_version:source.schema,note_count:rows.length},null,2)});
   return {type:'jwlibrary',title:'Notes JW Library · '+file.name,sourceHash:source.hash,entries,count:rows.length,schema:source.schema,
     warnings:['L’import est une copie. La sauvegarde d’origine reste intacte.']};
 }finally{db.close();}
}
export async function readJwpub(file:File):Promise<ImportPreview>{
 const bytes=u8(await file.arrayBuffer());const zip=extract(bytes,n=>n==='contents'||n==='manifest.json');
 assert(zip['contents'],'Conteneur JWPUB sans fichier contents.');
 const inner=extract(zip['contents']);const dbName=Object.keys(inner).find(x=>x.endsWith('.db'));
 assert(dbName,'Publication sans base SQLite.');const db=await openDb(inner[dbName]);
 try{
   const pub=one(db,'SELECT MepsLanguageIndex, Symbol, Year, IssueTagNumber FROM Publication LIMIT 1');
   assert(pub,'Métadonnées de publication introuvables.');
   const card=[pub.MepsLanguageIndex,pub.Symbol,pub.Year].join('_')+(Number(pub.IssueTagNumber)?'_'+pub.IssueTagNumber:'');
   const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',strToU8(card) as BufferSource));
   const mask=Uint8Array.from(KEY_MASK.match(/../g)!.map(x=>parseInt(x,16)));
   const x=hash.map((b,i)=>b^mask[i]);
   const key=await crypto.subtle.importKey('raw',x.subarray(0,16) as BufferSource,'AES-CBC',false,['decrypt']);
   const iv=x.subarray(16);
   const documentCols=new Set(query(db,'PRAGMA table_info(Document)').map(x=>String(x.name)));
   // Older and specialist JWPUB files may omit MepsDocumentId.
   const docs=query(db,'SELECT DocumentId, Title, Content'+
     (documentCols.has('MepsDocumentId')?', MepsDocumentId':'')+
     ' FROM Document ORDER BY DocumentId');
   const entries:ImportEntry[]=[];let count=0;
   const indexDocuments:OfflineDocumentRecord[]=[];
   const notebookSources:MeetingDocument[]=[];
   const manifest=JSON.parse(zip['manifest.json']?string(zip['manifest.json']):'{}');
   const publicationTitle=String(manifest?.publication?.title||
     manifest?.publication?.displayTitle||pub.Symbol+' '+pub.Year).trim().slice(0,240);
   for(const doc of docs){
     const ciphertext=u8(doc.Content as Uint8Array);
     const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-CBC',iv:iv as BufferSource},key,ciphertext as BufferSource));
     const html=string(unzlibSync(plain));
     const parsed=new DOMParser().parseFromString(html,'text/html');
     for(const el of Array.from(parsed.querySelectorAll('script,style,.pageNum')))el.remove();
     for(const img of Array.from(parsed.querySelectorAll('img[src]'))){
        const src=img.getAttribute('src')||'';
        if(src.startsWith('jwpub-media://')){
          const asset=src.slice('jwpub-media://'.length);
          if(inner[asset] && !entries.some(x=>x.name==='assets/'+asset.split('/').pop())){
            const name=asset.split('/').pop()!;
            entries.push({name:'assets/'+name,bytes:inner[asset]});
            img.setAttribute('src','assets/'+name);
          }
        }
     }
     const body=parsed.body||parsed.documentElement;
     const markdown=htmlToMd(body).trim();
     if(!markdown)continue;
     const title=String(doc.Title||parsed.querySelector('h1')?.textContent||'Document '+doc.DocumentId).trim();
     const id=String(doc.DocumentId).padStart(3,'0');
     const filename=id+' · '+safeName(title)+'.md';
     const mepsId=Number(doc.MepsDocumentId);
     const validMeps=Number.isSafeInteger(mepsId)&&mepsId>0?mepsId:null;
     const language=Number(pub.MepsLanguageIndex);
     const wolUrl=validMeps&&language===3
       ?'https://wol.jw.org/fr/wol/d/r30/lp-f/'+validMeps:null;
     entries.push({name:filename,text:'---\nbible_lab_kind: jwpub-document'+
       '\nsource_symbol: '+JSON.stringify(pub.Symbol)+
       '\nsource_year: '+pub.Year+
       '\nsource_document: '+doc.DocumentId+
       '\nsource_meps_docid: '+(validMeps??'null')+
       (wolUrl?'\nsource_url: '+JSON.stringify(wolUrl):'')+
       '\n---\n# '+title+'\n\n'+markdown+'\n'});
     indexDocuments.push({documentId:Number(doc.DocumentId),mepsId:validMeps,
       title,path:filename});
     notebookSources.push({path:filename,title,markdown,sourceUrl:wolUrl});
     count++;
   }
   assert(count>0,'Aucun document converti.');
   // Preserve every original document and its MEPS identifier for offline
   // reference resolution; the notebook is an additional editable entry.
   const notebooks=buildJwpubMeetingNotebooks(String(pub.Symbol),Number(pub.Year),notebookSources);
   for(let i=notebooks.length-1;i>=0;i--){
     const notebook=notebooks[i];
     entries.push({name:notebook.path,text:notebook.markdown});
     indexDocuments.unshift({documentId:1900000000+i,mepsId:null,
       title:notebook.title,path:notebook.path});
   }
   const issueNumber=String(Number(pub.IssueTagNumber)||'');
   const index:OfflineImportIndex={schema:1,publication:{
     symbol:String(pub.Symbol),year:Number(pub.Year),language:Number(pub.MepsLanguageIndex),
     title:publicationTitle,
     ...(/^(?:19|20)\d{4}$/.test(issueNumber)?{issue:issueNumber}:{})
   },documents:indexDocuments};
   entries.push({name:OFFLINE_INDEX_NAME,text:JSON.stringify(index,null,2)});
   return {type:'jwpub',title:publicationTitle,sourceHash:await digest(bytes),entries,count,
     warnings:['Les publications restent la propriété de leur éditeur. Réserver les copies à ton usage personnel.']};
 }finally{db.close();}
}
function htmlToMd(root:Element):string{
 function walk(node:Node):string{
   if(node.nodeType===Node.TEXT_NODE)return (node.textContent||'').replace(/\s+/g,' ');
   if(node.nodeType!==Node.ELEMENT_NODE)return '';
   const e=node as Element,t=e.tagName.toLowerCase(),content=Array.from(e.childNodes).map(walk).join('');
   if(/^h[1-6]$/.test(t))return '\n\n'+'#'.repeat(Number(t[1]))+' '+content.trim()+'\n\n';
   if(t==='p'||t==='div'||t==='section'||t==='article')return content+'\n\n';
   if(t==='br')return '\n';
   if(t==='li')return '- '+content.trim()+'\n';
   if(t==='ul'||t==='ol')return '\n'+content+'\n';
   if(t==='em'||t==='i')return '*'+content+'*';
   if(t==='strong'||t==='b')return '**'+content+'**';
   if(t==='a'){const href=e.getAttribute('href');return href?'['+content.trim()+']('+href.replace(/[\s<>]/g,'')+')':content;}
   if(t==='img'){const src=e.getAttribute('src')||'';return src?'!['+(e.getAttribute('alt')||'')+']('+src.replace(/[\s<>]/g,'')+')':'';}
   return content;
 }
 return walk(root).replace(/\n{3,}/g,'\n\n');
}
export function getNoteFromMd(text:string):{guid:string;title:string;originalHash:string;content:string;source:string}|null{
 const position=text.indexOf(MARKER);if(position<0)return null;
 const head=text.slice(0,position);
 const field=(name:string)=>{const m=head.match(new RegExp('^'+name+':\\s*(.+)$','m'));assert(m,'Champ '+name+' manquant.');return m[1].trim();};
 const guid=JSON.parse(field('jw_guid')),title=JSON.parse(field('title'));
 const originalHash=field('jw_original_hash'),source=JSON.parse(field('jw_source_sha256'));
 assert(/^[0-9a-f-]{36}$/i.test(guid)&&/^[a-f0-9]{64}$/i.test(originalHash),'Identifiant ou empreinte invalide.');
 return {guid,title,originalHash,source,content:text.slice(position+MARKER.length)};
}
export async function prepareExport(file:File,rawNotes:{path:string;content:string}[],expectedSha:string):Promise<ExportPlan>{
 const sourceBytes=u8(await file.arrayBuffer());
 assert(await digest(sourceBytes)===expectedSha,'La sauvegarde sélectionnée ne correspond pas aux notes importées.');
 const source=await openSource(sourceBytes);
 const db=await openDb(source.database);
 try{
   assert(one(db,'PRAGMA integrity_check')?.integrity_check==='ok','Base SQLite invalide.');
   const rows=query(db,'SELECT NoteId, Guid, Title, Content FROM Note');
   const known=new Map(rows.map(row=>[row.Guid,row]));
   const baselineFk=query(db,'PRAGMA foreign_key_check').map(x=>JSON.stringify(x)).sort();
   const seen=new Set<string>(),changes:ChangeItem[]=[];
   for(const item of rawNotes){
     const parsed=getNoteFromMd(item.content);assert(parsed,'Marqueur manquant : '+item.path);
     assert(parsed.source===expectedSha,'Source différente pour '+item.path);
     assert(!seen.has(parsed.guid),'GUID dupliqué : '+parsed.guid);seen.add(parsed.guid);
     const row=known.get(parsed.guid);assert(row,'GUID inconnu : '+parsed.guid);
     const oldTitle=String(row.Title??''),oldContent=String(row.Content??'');
     assert(await digestText(oldTitle+'\0'+oldContent)===parsed.originalHash,'Note source incohérente : '+parsed.guid);
     if(parsed.title!==oldTitle || parsed.content!==oldContent)changes.push({
        guid:parsed.guid,titleBefore:oldTitle,titleAfter:parsed.title,
        contentBefore:oldContent,contentAfter:parsed.content,noteId:Number(row.NoteId)
     });
   }
   assert(seen.size===known.size,'L’ensemble des notes est incomplet : '+seen.size+'/'+known.size+'.');
   return {source,db,changes,baselineFk,notes:known.size};
 }catch(e){db.close();throw e;}
}
export async function createExport(plan:ExportPlan, original:File):Promise<Uint8Array>{
 const {db,changes,baselineFk,notes}=plan;
 try{
   assert(changes.length>0,'Aucune note modifiée.');
   const now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
   db.run('BEGIN TRANSACTION');
   for(const change of changes)db.run('UPDATE Note SET Title=?, Content=?, LastModified=? WHERE NoteId=?',
      [change.titleAfter,change.contentAfter,now,change.noteId]);
   db.run('UPDATE LastModified SET LastModified=?',[now]);
   db.run('COMMIT');
   assert(one(db,'PRAGMA integrity_check')?.integrity_check==='ok','Intégrité SQLite non conforme.');
   const afterFk=query(db,'PRAGMA foreign_key_check').map(x=>JSON.stringify(x)).sort();
   assert(JSON.stringify(afterFk)===JSON.stringify(baselineFk),'Des relations SQLite ont changé.');
   assert(Number(one(db,'SELECT COUNT(*) AS n FROM Note')?.n)===notes,'Des notes ont été perdues.');
   const outDb=db.export();
   const manifest=structuredClone(plan.source.manifest);
   manifest.userDataBackup.hash=await digest(outDb);manifest.userDataBackup.lastModifiedDate=now;
   // Recompress ONLY the two changed entries. All media and unknown records
   // remain byte-identical in their original compressed representation.
   const originalBytes=u8(await original.arrayBuffer());
   assert(await digest(originalBytes)===plan.source.hash,'La sauvegarde source a changé pendant l’export.');
   const sourceNames=safeZip(originalBytes).sort();
   const zipped=patchZip(originalBytes,{
     [plan.source.dbName]:outDb,
     'manifest.json':strToU8(JSON.stringify(manifest))
   });
   const exportedNames=safeZip(zipped).sort();
   assert(JSON.stringify(exportedNames)===JSON.stringify(sourceNames),'Fichiers de la sauvegarde modifiés ou perdus.');
   const checked=await openSource(zipped);
   assert(checked.schema===plan.source.schema,'Le schéma de la sauvegarde a changé.');
   assert(checked.manifest.userDataBackup.hash===await digest(outDb),'Empreinte de la base modifiée.');
   return zipped;
 }finally{db.close();}
}
