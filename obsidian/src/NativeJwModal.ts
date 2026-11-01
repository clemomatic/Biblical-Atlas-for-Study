import { Modal, Notice, type App, type TFile } from 'obsidian';
import { readJwpub, readBackup, prepareExport, createExport, digest, type ImportPreview } from './nativeJw';

function selectFile(accept:string):Promise<File|null>{
 return new Promise(resolve=>{
   const input=document.createElement('input');input.type='file';input.accept=accept;input.hidden=true;
   let settled=false;
   const done=(value:File|null)=>{if(settled)return;settled=true;input.remove();resolve(value);};
   input.addEventListener('change',()=>done(input.files?.item(0)||null),{once:true});
   input.addEventListener('cancel',()=>done(null),{once:true});document.body.append(input);input.click();
 });
}
function shortName(value:string):string {return value.replace(/\.jwpub$|\.jwlibrary$/i,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').trim().slice(0,70)||'Archive JW';}
async function folder(app:App,path:string):Promise<void>{
 let current='';
 for(const part of path.split('/').filter(Boolean)){
   current=current?current+'/'+part:part;
   if(!app.vault.getAbstractFileByPath(current))await app.vault.createFolder(current);
 }
}
export class NativeJwModal extends Modal{
 private busy=false;
 constructor(app:App,private rootFolder:string){super(app);}
 onOpen():void{this.contentEl.addClass('biblelab-native-modal');this.menu();}
 private screen(title:string,subtitle:string):HTMLElement{
   this.contentEl.empty();
   const top=this.contentEl.createDiv({cls:'biblelab-native-head'});
   top.createSpan({cls:'biblelab-native-eyebrow',text:'BIBLE LAB · PASSERELLE LOCALE'});
   top.createEl('h2',{text:title});
   top.createEl('p',{text:subtitle});
   return this.contentEl;
 }
 private action(parent:HTMLElement,label:string,details:string,icon:string,callback:()=>void):void{
   const b=parent.createEl('button',{cls:'biblelab-native-action',attr:{type:'button'}});
   b.createSpan({cls:'biblelab-native-symbol',text:icon});
   const labels=b.createSpan();labels.createEl('strong',{text:label});labels.createEl('span',{text:details});
   b.createSpan({cls:'biblelab-native-arrow',text:'↗'});
   b.addEventListener('click',callback);
 }
 private menu():void{
   const root=this.screen('Bibliothèque personnelle','Import direct, sans script et sans envoi de fichiers. Les originaux ne sont jamais modifiés.');
   this.action(root,'Importer une publication JWPUB','Déchiffrement local, articles et illustrations au format Markdown','▤',()=>void this.load('jwpub'));
   this.action(root,'Importer une sauvegarde JW Library','Notes, étiquettes, identifiants et tableau de recherche','◈',()=>void this.load('jwlibrary'));
   this.action(root,'Créer une sauvegarde JW Library','Comparer les notes éditées avant de générer une copie','⇄',()=>void this.exportFlow());
   root.createEl('p',{cls:'biblelab-native-footnote',text:'Sauvegardes : schémas SQLite 14 à 16. L’export doit être testé sur un profil JW Library vierge avant toute restauration réelle.'});
 }
 private async load(kind:'jwpub'|'jwlibrary'):Promise<void>{
   if(this.busy)return;const file=await selectFile(kind==='jwpub'?'.jwpub':'.jwlibrary');if(!file)return;
   this.busy=true;
   const root=this.screen('Analyse de '+file.name,'Lecture locale en cours…');
   const loading=root.createEl('p',{cls:'biblelab-native-loading',text:'Vérification des données…'});
   try{
     const preview=kind==='jwpub'?await readJwpub(file):await readBackup(file);
     loading.remove();this.showPreview(preview,file.name);
   }catch(error){this.problem(error);}finally{this.busy=false;}
 }
 private showPreview(preview:ImportPreview,filename:string):void{
   const root=this.screen('Import prêt','Les documents seront créés dans un dossier neuf, sans écraser tes recherches.');
   const summary=root.createDiv({cls:'biblelab-native-summary'});
   summary.createEl('strong',{text:preview.count.toLocaleString('fr-FR')});
   summary.createEl('span',{text:preview.type==='jwpub'?'documents déchiffrés':'notes personnelles'});
   if(preview.schema)summary.createEl('span',{text:' · schéma '+preview.schema});
   const samples=root.createDiv({cls:'biblelab-native-samples'});
   for(const item of preview.entries.filter(x=>x.name.endsWith('.md')).slice(0,7))samples.createEl('p',{text:item.name});
   for(const warning of preview.warnings)root.createEl('p',{cls:'biblelab-native-footnote',text:warning});
   const actions=root.createDiv({cls:'biblelab-native-buttons'});
   const back=actions.createEl('button',{text:'Retour'});back.addEventListener('click',()=>this.menu());
   const go=actions.createEl('button',{cls:'mod-cta',text:'Importer dans Obsidian'});
   go.addEventListener('click',()=>{go.disabled=true;void this.writePreview(preview,filename);});
 }
 private async writePreview(preview:ImportPreview,filename:string):Promise<void>{
   const root=this.screen('Import en cours','Création des fichiers dans le coffre Obsidian.');
   const progress=root.createEl('p',{cls:'biblelab-native-loading',text:'Préparation…'});
   const base=this.rootFolder.replace(/\/$/,'')+'/Imports/'+shortName(filename);
   let target=base;
   for(let i=2;this.app.vault.getAbstractFileByPath(target);i++)target=base+' ('+i+')';
   try{
     await folder(this.app,target);
     for(let i=0;i<preview.entries.length;i++){
       const item=preview.entries[i];const full=target+'/'+item.name;
       if(item.name.startsWith('/')||item.name.split('/').includes('..'))throw Error('Chemin d’import interdit.');
       await folder(this.app,full.substring(0,full.lastIndexOf('/')));
       if(this.app.vault.getAbstractFileByPath(full))throw Error('Fichier répété : '+item.name);
       if(item.text!==undefined)await this.app.vault.create(full,item.text);
       else if(item.bytes){const bytes=item.bytes;await this.app.vault.createBinary(full,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer);}
       if(i%45===0){progress.setText((i+1)+' / '+preview.entries.length+' fichiers');await new Promise(resolve=>setTimeout(resolve,0));}
     }
     new Notice('Import réussi : '+preview.count+' documents.');
     const index=this.app.vault.getAbstractFileByPath(target+'/INDEX/00 Tableau de recherche.md');
     if(index && 'extension' in index)await this.app.workspace.getLeaf('tab').openFile(index as TFile);
     this.close();
   }catch(error){this.problem(error);}
 }
 private async exportFlow():Promise<void>{
   if(this.busy)return;const file=await selectFile('.jwlibrary');if(!file)return;this.busy=true;
   const root=this.screen('Préparer la sauvegarde','Comparaison des notes avec le fichier source, sans aucun changement.');
   const msg=root.createEl('p',{cls:'biblelab-native-loading',text:'Recherche de l’import correspondant…'});
   try{
     const sourceHash=await digest(new Uint8Array(await file.arrayBuffer()));
     const manifests=this.app.vault.getFiles().filter(f=>f.name==='_BIBLE_LAB_IMPORT.json'&&f.path.includes('/Imports/'));
     const matching:{path:string;hash:string}[]=[];
     for(const entry of manifests){
       try{const meta=JSON.parse(await this.app.vault.read(entry));
         if(meta.source_sha256===sourceHash)matching.push({path:entry.parent?.path||entry.path.slice(0,-entry.name.length-1),hash:sourceHash});
       }catch{ /* unrelated file */ }
     }
     msg.remove();
     if(!matching.length)throw Error('Aucune importation correspondant à cette sauvegarde. Importe-la d’abord.');
     if(matching.length>1)root.createEl('p',{cls:'biblelab-native-footnote',text:'Plusieurs imports trouvés : sélectionne celui à exporter.'});
     const choice=root.createEl('select',{attr:{'aria-label':'Dossier des notes à exporter'}});
     for(const entry of matching){const opt=choice.createEl('option',{text:entry.path});opt.value=entry.path;}
     const go=root.createEl('button',{cls:'mod-cta',text:'Comparer les changements'});
     go.addEventListener('click',()=>{go.disabled=true;void this.showDiff(file,choice.value,sourceHash);});
   }catch(error){this.problem(error);}finally{this.busy=false;}
 }
 private async showDiff(file:File,path:string,sha:string):Promise<void>{
   const root=this.screen('Comparaison','Lecture des notes et des identifiants originaux.');
   const loading=root.createEl('p',{cls:'biblelab-native-loading',text:'Vérification des GUID et des empreintes…'});
   try{
     const files=this.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(path+'/')&&!f.path.slice(path.length+1).includes('/'));
     const notes=await Promise.all(files.map(async f=>({path:f.path,content:await this.app.vault.read(f)})));
     const plan=await prepareExport(file,notes,sha);
     loading.remove();
     const count=root.createEl('h3',{text:plan.changes.length+' note(s) modifiée(s) sur '+plan.notes});
     const samples=root.createDiv({cls:'biblelab-native-diffs'});
     for(const change of plan.changes.slice(0,30)){
       const row=samples.createEl('details');row.createEl('summary',{text:change.titleAfter||change.guid});
       row.createEl('p',{text:'Avant : '+change.titleBefore+' · '+change.contentBefore.slice(0,140)});
       row.createEl('p',{text:'Après : '+change.titleAfter+' · '+change.contentAfter.slice(0,140)});
     }
     if(plan.baselineFk.length)root.createEl('p',{cls:'biblelab-native-footnote',text:plan.baselineFk.length+' anomalie(s) de relation préexistante(s). Aucune nouvelle ne sera acceptée.'});
     if(!plan.changes.length){plan.db.close();count.createEl('small',{text:' · export inutile'});return;}
     const actions=root.createDiv({cls:'biblelab-native-buttons'});
     const cancel=actions.createEl('button',{text:'Annuler'});cancel.addEventListener('click',()=>{plan.db.close();this.menu();});
     const confirm=actions.createEl('button',{cls:'mod-cta',text:'Créer une nouvelle sauvegarde'});
     confirm.addEventListener('click',async()=>{
       confirm.disabled=true;
       const info=root.createEl('p',{cls:'biblelab-native-loading',text:'Reconstruction et validation en cours…'});
       try{
         const bytes=await createExport(plan,file);
         const dirname=this.rootFolder.replace(/\/$/,'')+'/Exports';await folder(this.app,dirname);
         let name=dirname+'/BibleLab-'+new Date().toISOString().replace(/[:.]/g,'-')+'.jwlibrary';
         for(let i=2;this.app.vault.getAbstractFileByPath(name);i++)name=dirname+'/BibleLab-'+new Date().toISOString().slice(0,10)+' ('+i+').jwlibrary';
         await this.app.vault.createBinary(name,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer);
         new Notice('Nouvelle sauvegarde enregistrée : '+name);this.close();
       }catch(error){this.problem(error);}finally{info.remove();}
     });
   }catch(error){this.problem(error);}
 }
 private problem(error:unknown):void{
   const root=this.screen('Opération interrompue','Aucun fichier d’origine n’a été modifié.');
   root.createEl('p',{cls:'biblelab-native-error',text:error instanceof Error?error.message:String(error)});
   root.createEl('button',{text:'Retour',attr:{type:'button'}}).addEventListener('click',()=>this.menu());
   new Notice('Bible Lab : '+(error instanceof Error?error.message:'Échec de l’opération.'));
 }
}
