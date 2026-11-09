import { Modal, type App } from 'obsidian';
import type { AtlasEntityKey } from '../../src/atlasIntegration.ts';
import type { AtlasWorkspace } from './catalog.ts';
import type { EpisodeConnectionsStore } from './episodeConnectionsStore.ts';
import { renderEpisodeContext } from './episodeContextView.ts';

export interface EpisodeContextModalActions {
  openEntity: (key:AtlasEntityKey)=>void;
  readReference: (reference:string)=>void;
  editConnections: (eventId:string,onSaved:()=>Promise<void>)=>void;
}

/** Explore an undated, sourced event from a person sheet without a fake timeline entry. */
export class EpisodeContextModal extends Modal {
  constructor(app:App, private eventId:string,
    private workspace:AtlasWorkspace,
    private store:EpisodeConnectionsStore,
    private actions:EpisodeContextModalActions){super(app);}
  onOpen():void {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');
    this.contentEl.addClass('jwsd-theme');
    void this.refresh();
  }
  private refresh=async():Promise<void>=>{
    try {
      const personal=await this.store.read(this.eventId);
      if(!this.contentEl.isConnected)return;
      renderEpisodeContext(this.contentEl,this.eventId,this.workspace,{
        openEntity:key=>{this.close();this.actions.openEntity(key);},
        readReference:reference=>this.actions.readReference(reference),
        editConnections:id=>this.actions.editConnections(id,this.refresh),
        personalConnections:personal.items,
        ...(personal.personalTitle&&personal.personalReference
          ?{personalEpisode:{title:personal.personalTitle,reference:personal.personalReference}}:{})
      });
    }catch(error){
      this.contentEl.empty();
      this.contentEl.createEl('p',{text:error instanceof Error?error.message:'Contexte indisponible.'});
    }
  };
  onClose():void{this.contentEl.empty();}
}
