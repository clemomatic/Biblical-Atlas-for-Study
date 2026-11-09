import { Modal, Setting, type App } from 'obsidian';

/** Creates a research episode without fabricating a date or Atlas event. */
export class PersonalEpisodeModal extends Modal {
  constructor(
    app: App,
    private readonly create: (title: string, reference: string) => Promise<void>
  ) { super(app); }

  onOpen(): void {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');
    this.contentEl.addClass('jwsd-theme');
    const content=this.contentEl;
    content.createEl('h2',{text:'Nouvel épisode d’étude'});
    content.createEl('p',{
      text:'Commence par un passage biblique. Les personnes, les lieux et les connexions seront ajoutés ensuite, sans inventer de date.'
    });
    let title='',reference='';
    new Setting(content).setName('Titre de l’épisode')
      .addText(text=>text.setPlaceholder('Ex. David et Bethsabée').onChange(value=>{title=value;}));
    new Setting(content).setName('Passage ou référence principale')
      .setDesc('Indique la source d’où part ta recherche.')
      .addText(text=>text.setPlaceholder('Ex. 2 Samuel 11').onChange(value=>{reference=value;}));
    const error=content.createEl('p',{attr:{role:'alert'}});
    new Setting(content).addButton(button=>button.setButtonText('Créer et relier les personnages').setCta().onClick(async()=>{
      button.setDisabled(true);error.setText('');
      try {
        await this.create(title.trim(),reference.trim());
        this.close();
      } catch(e){error.setText(e instanceof Error?e.message:'Création impossible.');}
      finally{button.setDisabled(false);}
    }));
  }
  onClose():void{this.contentEl.empty();}
}
