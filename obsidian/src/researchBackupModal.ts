import { Modal, type App, type TFile } from 'obsidian';
import {
  parseBibleLabBackup, type BibleLabResearchState
} from './researchBackup';

/** Explicit, previewed restore; nothing is imported when a modal is dismissed. */
export class BibleLabRestoreModal extends Modal {
  constructor(
    app:App,
    private readonly backups:TFile[],
    private readonly restore:(file:TFile,state:BibleLabResearchState)=>Promise<string>
  ){super(app);}
  onOpen():void{
    this.modalEl.addClass('jwsd-theme','jwsd-modal');this.contentEl.addClass('jwsd-theme');
    const body=this.contentEl;
    body.empty();
    body.addClass('biblelab-restore-modal');
    body.createEl('h2',{text:'Restaurer mes recherches JW Study Desk'});
    body.createEl('p',{text:
      'Choisis une sauvegarde du coffre. Tes plans, trouvailles, fiches, étiquettes et recherches WOL seront remplacés. Les notes Markdown du coffre ne seront pas modifiées.'});
    const selection=body.createEl('select',{attr:{'aria-label':'Choisir une sauvegarde JW Study Desk'}});
    for(const backup of this.backups){
      selection.createEl('option',{text:backup.name,attr:{value:backup.path}});
    }
    const preview=body.createDiv({cls:'biblelab-backup-preview',attr:{role:'status'}});
    const consent=body.createEl('label',{cls:'biblelab-backup-consent'});
    const checkbox=consent.createEl('input',{attr:{type:'checkbox'}});
    consent.createSpan({text:'Je confirme le remplacement de mes recherches actuelles.'});
    const controls=body.createDiv({cls:'biblelab-backup-modal-actions'});
    const cancel=controls.createEl('button',{text:'Annuler',attr:{type:'button'}});
    cancel.addEventListener('click',()=>this.close());
    const apply=controls.createEl('button',{text:'Restaurer cette sauvegarde',cls:'mod-cta',
      attr:{type:'button'}});
    apply.disabled=true;
    let selected:BibleLabResearchState|null=null;
    let loading=false;
    let generation=0;
    const synchronize=()=>{
      apply.disabled=loading||!checkbox.checked||!selected;
      selection.disabled=loading;
      cancel.disabled=loading;
    };
    const load=async()=>{
      const current=++generation;
      selected=null;
      checkbox.checked=false;
      loading=true;
      synchronize();
      preview.setText('Vérification de la sauvegarde…');
      const file=this.backups.find(item=>item.path===selection.value);
      if(!file){preview.setText('Fichier introuvable.');loading=false;synchronize();return;}
      try{
        const text=await this.app.vault.read(file);
        const parsed=parseBibleLabBackup(text);
        if(current!==generation)return;
        selected=parsed.state;
        preview.setText(
          'Sauvegarde du '+new Date(parsed.exportedAt).toLocaleString('fr-FR')+
          ' · '+parsed.counts.plans+' plan(s), '+
          parsed.counts.captures+' trouvaille(s), '+
          parsed.counts.ideas+' fiche(s), '+
          parsed.counts.history+' recherche(s) WOL. Une copie de ton état actuel sera créée AVANT la restauration.'
        );
      }catch(error){
        if(current!==generation)return;
        preview.setText('Restauration refusée : '+
          (error instanceof Error?error.message:'fichier invalide.'));
      }finally{
        if(current===generation){loading=false;synchronize();}
      }
    };
    selection.addEventListener('change',()=>{void load();});
    checkbox.addEventListener('change',synchronize);
    apply.addEventListener('click',async()=>{
      if(!selected||!checkbox.checked||loading)return;
      const file=this.backups.find(item=>item.path===selection.value);
      if(!file)return;
      loading=true;
      synchronize();
      preview.setText('Création de la sauvegarde de sécurité et restauration…');
      try{
        const name=await this.restore(file,selected);
        preview.setText('Restauration terminée. Sauvegarde de sécurité : '+name);
        this.close();
      }catch(error){
        preview.setText('Restauration impossible : '+
          (error instanceof Error?error.message:'erreur inconnue.'));
      }finally{loading=false;synchronize();}
    });
    void load();
  }
  onClose():void{this.contentEl.empty();}
}
