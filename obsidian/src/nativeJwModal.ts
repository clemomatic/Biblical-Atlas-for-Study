import { App, Modal, Notice, Setting } from 'obsidian';
import { importBackupToVault, importJwpubToVault, previewBackupFile, prepareBackupExport, executeBackupExport, type BackupExportPlan } from './nativeJwWorkflow';
import { readJwpub } from './nativeJwCore';

export type JwAction='jwpub'|'backup'|'export';
const descriptions={
  jwpub:{title:'Importer une publication',icon:'book-open',text:'Un fichier JWPUB devient un ensemble de notes et d’illustrations Markdown.'},
  backup:{title:'Importer mes notes JW',icon:'notebook-tabs',text:'Notes, identifiants et thèmes conservés, directement dans ton coffre.'},
  export:{title:'Exporter mes modifications',icon:'shield-check',text:'Compare les notes avec la sauvegarde originale avant de créer une nouvelle copie.'}
};
export class NativeJwModal extends Modal {
  private current:File|null=null;
  private plan:BackupExportPlan|null=null;
  private ready=false;
  private busy=false;
  private agreed=false;
  private fileSummary='';
  private error='';
  private progress='';
  constructor(app:App,private action:JwAction,private folder:string){super(app);}
  onOpen():void{this.modalEl.addClass('biblelab-import-modal');this.render();}
  onClose():void{this.current=null;this.plan=null;this.contentEl.empty();}
  private render():void{
    const root=this.contentEl;root.empty();
    const data=descriptions[this.action];
    const header=root.createDiv({cls:'biblelab-import-hero'});
    header.createEl('div',{cls:'biblelab-kicker',text:'BIBLE LAB · PASSERELLE LOCALE'});
    header.createEl('h2',{text:data.title});
    header.createEl('p',{text:data.text});
    const privacy=root.createDiv({cls:'biblelab-import-privacy'});
    privacy.createEl('strong',{text:'100 % local'});
    privacy.createSpan({text:' · Aucun fichier envoyé vers WOL, GitHub ou un serveur.'});
    const input=root.createEl('input',{attr:{type:'file',accept:this.action==='jwpub'?'.jwpub':'.jwlibrary','aria-label':'Choisir une archive JW'}});
    input.addClass('biblelab-import-file');
    input.disabled=this.busy;
    input.addEventListener('change',()=>{const file=input.files?.item(0);if(file)void this.load(file);});
    if(this.fileSummary){
      const card=root.createDiv({cls:'biblelab-import-card'});
      card.createEl('h3',{text:this.current?.name||'Archive'});
      card.createEl('p',{text:this.fileSummary});
    }
    if(this.action==='export'&&this.plan){
      const changes=this.plan.changes;
      const result=root.createDiv({cls:'biblelab-import-card'});
      result.createEl('h3',{text:changes.length+' note'+(changes.length===1?' modifiée':'s modifiées')});
      result.createEl('p',{text:this.plan.notes+' notes vérifiées · schéma '+this.plan.schema});
      if(changes.length){
        const items=result.createEl('ul',{cls:'biblelab-import-changes'});
        for(const change of changes.slice(0,12)){
          const line=items.createEl('li');
          line.createSpan({text:change.title||'Sans titre'});
          line.createSpan({cls:'biblelab-pill',text:change.type});
        }
        if(changes.length>12)result.createEl('p',{text:'… et '+(changes.length-12)+' autres modifications.'});
        const agree=root.createEl('label',{cls:'biblelab-import-consent'});
        const tick=agree.createEl('input',{attr:{type:'checkbox'}});
        tick.checked=this.agreed;
        tick.addEventListener('change',()=>{this.agreed=tick.checked;this.renderButton();});
        agree.createSpan({text:'Je veux créer une nouvelle sauvegarde, sans modifier l’original.'});
        root.createEl('p',{cls:'biblelab-mini',text:'La restauration dans JW Library remplace les données personnelles de l’appareil. Sauvegarde-les d’abord, et teste avec un profil vierge.'});
      }
    }
    if(this.error)root.createEl('p',{cls:'biblelab-import-error',text:this.error});
    if(this.progress)root.createEl('p',{cls:'biblelab-import-progress',text:this.progress});
    const actions=root.createDiv({cls:'biblelab-import-actions'});
    const cancel=actions.createEl('button',{text:'Fermer'});cancel.disabled=this.busy;cancel.addEventListener('click',()=>this.close());
    const run=actions.createEl('button',{cls:'mod-cta biblelab-import-confirm',text:this.action==='export'?'Créer la sauvegarde':'Importer dans Obsidian'});
    run.disabled=this.busy||!this.ready||(this.action==='export'&&(!this.agreed||!this.plan?.changes.length));
    run.addEventListener('click',()=>void this.execute());
  }
  private renderButton():void{
    const button=this.contentEl.querySelector<HTMLButtonElement>('.biblelab-import-confirm');
    if(button)button.disabled=this.busy||!this.ready||(this.action==='export'&&(!this.agreed||!this.plan?.changes.length));
  }
  private async load(file:File):Promise<void>{
    this.current=file;this.busy=true;this.ready=false;this.plan=null;this.error='';this.fileSummary='';this.progress='Analyse du fichier local…';this.render();
    try{
      if(this.action==='jwpub'){
        const publication=await readJwpub(file);
        try{this.fileSummary=publication.title+' · '+publication.documentCount+' documents · '+publication.year;}
        finally{publication.db.close();}
      }else if(this.action==='backup'){
        const info=await previewBackupFile(file);
        this.fileSummary=info.count+' notes · '+info.tags+' étiquettes · schéma '+info.schema;
        if(info.foreignKeyIssues)this.fileSummary+=' · '+info.foreignKeyIssues+' relations initialement incohérentes';
      }else{
        const plan=await prepareBackupExport(this.app,file);
        this.plan=plan;
        this.fileSummary=plan.changes.length+' modifications trouvées dans '+plan.notes+' notes. Les notes non modifiées restent identiques.';
      }
      this.ready=true;
    }catch(error){this.error=error instanceof Error?error.message:'Impossible de lire cette archive.';}
    finally{this.busy=false;this.progress='';this.render();}
  }
  private async execute():Promise<void>{
    if(!this.current||!this.ready||this.busy)return;
    if(this.action==='export'&&(!this.plan||!this.agreed||!this.plan.changes.length))return;
    const file=this.current;
    this.busy=true;this.error='';this.progress='Traitement local en cours…';this.render();
    try{
      if(this.action==='jwpub'){
        const output=await importJwpubToVault(this.app,file,this.folder,{onProgress:(n,total)=>{this.progress=n+' / '+total+' documents';this.updateProgress();}});
        this.close();
        new Notice(output.notes+' documents et '+output.images+' illustrations importés.');
        return;
      }
      if(this.action==='backup'){
        const output=await importBackupToVault(this.app,file,this.folder,{onProgress:(n,total)=>{this.progress=n+' / '+total+' notes';this.updateProgress();}});
        this.close();
        new Notice(output.notes+' notes et '+output.index+' pages d’index importées.');
        return;
      }
      if(this.plan){
        this.progress='Vérification de la base et reconstruction de l’archive…';this.updateProgress();
        const path=await executeBackupExport(this.app,this.plan,this.folder);
        this.close();
        new Notice('Nouvelle sauvegarde disponible : '+path);
        return;
      }
    }catch(error){this.error=error instanceof Error?error.message:'Échec du traitement.';this.busy=false;this.progress='';this.render();}
  }
  private updateProgress():void{const node=this.contentEl.querySelector('.biblelab-import-progress');if(node)node.textContent=this.progress;}
}
