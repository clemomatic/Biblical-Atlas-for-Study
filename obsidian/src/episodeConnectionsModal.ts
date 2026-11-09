import { Modal, Notice, Setting, type App, type TFile } from 'obsidian';
import type { AtlasWorkspace } from './catalog.ts';
import type { AtlasEntityKey } from '../../src/atlasIntegration.ts';
import type { PersonalEpisodeConnection } from './episodeConnections.ts';
import { validatePersonalEpisodeConnections } from './episodeConnections.ts';
import { EpisodeConnectionsStore } from './episodeConnectionsStore.ts';
import { EpisodePickerModal, type EpisodeChoice } from './episodePickerModal.ts';

interface DraftConnection {
  id?: string;
  personId?: string;
  placeId?: string;
  reference: string;
  note: string;
}

export class EpisodeConnectionsModal extends Modal {
  private items: PersonalEpisodeConnection[] = [];
  private draft: DraftConnection = { reference: '', note: '' };
  private previousRaw?: string;
  private file?: TFile;
  private busy = false;

  constructor(
    app: App,
    private eventId: string,
    private eventTitle: string,
    private workspace: AtlasWorkspace,
    private store: EpisodeConnectionsStore,
    private onSaved: (file: TFile) => Promise<void>
  ) { super(app); }

  async onOpen(): Promise<void> {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');
    this.contentEl.addClass('jwsd-theme');
    try {
      const state = await this.store.read(this.eventId);
      this.file = state.file;
      this.previousRaw = state.raw;
      this.items = validatePersonalEpisodeConnections(state.items,
        this.known('person'), this.known('place'));
      this.render();
    } catch (error) {
      this.contentEl.createEl('h2',{text:'Connexions indisponibles'});
      this.contentEl.createEl('p',{text:error instanceof Error ? error.message : 'Impossible de lire le carnet.'});
    }
  }

  private known(type: 'person' | 'place'): Set<string> {
    return new Set([...this.workspace.catalog.values()].filter(item=>item.type===type).map(item=>item.id));
  }

  private choices(type: 'person' | 'place'): EpisodeChoice[] {
    return [...this.workspace.catalog.values()].filter(item=>item.type===type)
      .map(item=>({id:item.id,title:item.title}))
      .sort((a,b)=>a.title.localeCompare(b.title,'fr'));
  }

  private name(type: 'person' | 'place', id?: string): string {
    if (!id) return type==='place' ? 'Lieu non précisé' : 'Choisir un personnage';
    return this.workspace.catalog.get((type+':'+id) as AtlasEntityKey)?.title ?? id;
  }

  private pick(type: 'person' | 'place'): void {
    new EpisodePickerModal(this.app,this.choices(type),item=>{
      if (type==='person') this.draft.personId=item.id;
      else this.draft.placeId=item.id;
      this.render();
    },type==='person'?'Rechercher un personnage biblique…':'Rechercher un lieu de l’Atlas…').open();
  }

  private render(): void {
    const parent = this.contentEl; parent.empty();
    parent.createEl('h2',{text:'Connexions de l’épisode'});
    parent.createEl('p',{text:this.eventTitle});
    parent.createEl('p',{
      cls:'jwsd-episode-muted',
      text:'Ces liens sont tes découvertes personnelles, et non des faits automatiquement validés dans le corpus historique. Chaque connexion conserve sa référence.'
    });

    if (this.items.length) {
      const list=parent.createDiv({cls:'jwsd-episode-section'});
      list.createEl('h3',{text:'Mes connexions ('+this.items.length+')'});
      for(const item of this.items){
        const card=list.createDiv({cls:'jwsd-episode-person'});
        card.createEl('strong',{text:this.name('person',item.personId)});
        card.createEl('p',{text:item.placeId?'Lieu associé : '+this.name('place',item.placeId):'Participation / relation sans lieu individuel déclaré.'});
        card.createEl('p',{text:'Référence : '+item.reference});
        if(item.note)card.createEl('p',{text:item.note});
        new Setting(card)
          .addButton(button=>button.setButtonText('Modifier').onClick(()=>{
            this.draft={id:item.id,personId:item.personId,placeId:item.placeId,reference:item.reference,note:item.note??''};
            this.render();
          }))
          .addButton(button=>button.setButtonText('Retirer').setWarning().onClick(()=>{
            this.items=this.items.filter(existing=>existing.id!==item.id);
            if(this.draft.id===item.id)this.draft={reference:'',note:''};
            this.render();
          }));
      }
    }

    parent.createEl('h3',{text:this.draft.id?'Modifier cette connexion':'Ajouter une connexion'});
    const person=new Setting(parent).setName('Personnage').setDesc('Sélectionne une fiche existante ; aucune identité n’est déduite du nom.');
    person.addButton(button=>button.setButtonText(this.name('person',this.draft.personId)).onClick(()=>this.pick('person')));
    const place=new Setting(parent).setName('Lieu précis (facultatif)').setDesc('Un lieu ne doit être associé à cette personne que si la source le justifie.');
    place.addButton(button=>button.setButtonText(this.name('place',this.draft.placeId)).onClick(()=>this.pick('place')));
    if(this.draft.placeId)place.addExtraButton(button=>button.setIcon('x').setTooltip('Ne pas préciser de lieu').onClick(()=>{
      this.draft.placeId=undefined;this.render();
    }));
    new Setting(parent).setName('Référence justificative').setDesc('Obligatoire. Ex. : 2 Samuel 11:1.').addText(text=>
      text.setPlaceholder('Référence biblique ou publication…')
        .setValue(this.draft.reference)
        .onChange(value=>{this.draft.reference=value;}));
    new Setting(parent).setName('Observation personnelle (facultative)').addTextArea(area=>
      area.setPlaceholder('Quel élément important as-tu remarqué ?')
        .setValue(this.draft.note)
        .onChange(value=>{this.draft.note=value;}));
    const error=parent.createEl('p',{attr:{role:'alert'}});
    new Setting(parent)
      .addButton(button=>button.setButtonText(this.draft.id?'Appliquer la modification':'Ajouter à la fiche').onClick(()=>{
        try {
          const candidate={
            id:this.draft.id??crypto.randomUUID(),
            personId:this.draft.personId,
            ...(this.draft.placeId?{placeId:this.draft.placeId}:{}),
            reference:this.draft.reference,
            ...(this.draft.note?{note:this.draft.note}:{})
          };
          const validated=validatePersonalEpisodeConnections([candidate],this.known('person'),this.known('place'))[0];
          this.items=this.draft.id
            ?this.items.map(item=>item.id===this.draft.id?validated:item)
            :[...this.items,validated];
          this.draft={reference:'',note:''};
          this.render();
        } catch(e){error.setText(e instanceof Error?e.message:'Connexion invalide.');}
      }))
      .addButton(button=>button.setButtonText('Effacer le formulaire').onClick(()=>{
        this.draft={reference:'',note:''};this.render();
      }));

    const info=parent.createEl('p',{cls:'jwsd-episode-muted'});
    info.setText('Enregistrer crée ou met à jour une note Markdown dans le Vault, liée automatiquement à cet épisode, aux personnages et aux lieux concernés.');
    const controls=new Setting(parent);
    controls.addButton(button=>button.setButtonText('Enregistrer les connexions').setCta().onClick(async()=>{
      if(this.busy)return;
      this.busy=true;button.setDisabled(true);error.setText('');
      try {
        this.items=validatePersonalEpisodeConnections(this.items,this.known('person'),this.known('place'));
        const file=await this.store.save(this.eventId,this.eventTitle,this.items,this.previousRaw);
        await this.onSaved(file);
        new Notice('Connexions enregistrées dans ton Vault.');this.close();
      } catch(e){error.setText(e instanceof Error?e.message:'Enregistrement impossible.');}
      finally{this.busy=false;button.setDisabled(false);}
    }));
    if(this.file)controls.addButton(button=>button.setButtonText('Ouvrir le carnet').onClick(async()=>{
      await this.app.workspace.getLeaf('tab').openFile(this.file!);this.close();
    }));
  }
  onClose(): void { this.contentEl.empty(); }
}
