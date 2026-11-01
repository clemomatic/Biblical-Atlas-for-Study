import { Modal, Notice, setIcon, type App } from 'obsidian';
import styles from './bibleLab.css?inline';
import { renderReferenceAccordion, type ReaderState } from './referencePanel';
import { type ReferenceEntry } from './referenceReader';

/** Transient, read-only official reference reader. It never changes vault files. */
export class BibleLabReferenceModal extends Modal {
  constructor(app:App,private readonly reference:ReferenceEntry){super(app);}
  onOpen():void{
    this.modalEl.addClass('biblelab-reference-dialog');
    this.contentEl.addClass('biblelab-side','biblelab-reference-popup');
    this.contentEl.empty();
    this.contentEl.createEl('style',{text:styles});
    const head=this.contentEl.createDiv({cls:'biblelab-popup-head'});
    const icon=head.createSpan({cls:'biblelab-reader-glyph'});setIcon(icon,'book-open-check');
    const titles=head.createDiv({cls:'biblelab-reader-labels'});
    titles.createEl('strong',{text:'BIBLE LAB · LECTURE'});
    titles.createSpan({text:'Source officielle · WOL'});
    const close=head.createEl('button',{cls:'biblelab-btn',text:'Fermer',attr:{type:'button','aria-label':'Fermer la lecture'}});
    close.addEventListener('click',()=>this.close());
    const body=this.contentEl.createDiv({cls:'biblelab-popup-body'});
    const state:ReaderState={
      expanded:new Set([this.reference.url+'#'+this.reference.label]),
      cache:new Map(),
      pending:new Map(),
      copy:url=>{
        void navigator.clipboard.writeText(url).then(()=>new Notice('Lien WOL copié.')).catch(()=>new Notice('Copie indisponible.'));
      },
      open:url=>window.open(url,'_blank','noopener,noreferrer')
    };
    renderReferenceAccordion(body,this.reference,state);
    body.createEl('p',{cls:'biblelab-mini',text:'Le texte est consulté depuis WOL. Les notes du coffre restent inchangées.'});
  }
  onClose():void{this.contentEl.empty();}
}
