import { FuzzySuggestModal, Modal, Notice, Setting, TFile, type App } from 'obsidian';
import type { AtlasEntityKey, AtlasSelection } from '../../src/atlasIntegration';
import { parseYear } from './model';
import type { ResearchDraft } from './vault';

export class LinkNoteModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private choose: (file: TFile) => Promise<void>) {
    super(app); this.setPlaceholder('Chercher une note à relier à cette fiche…');
  }
  getItems(): TFile[] { return this.app.vault.getMarkdownFiles(); }
  getItemText(file: TFile): string { return `${file.basename} — ${file.path}`; }
  onChooseItem(file: TFile): void { void this.choose(file).catch(error => new Notice(error instanceof Error ? error.message : 'Impossible de relier cette note.')); }
}

export class ResearchModal extends Modal {
  constructor(app: App, private keys: AtlasEntityKey[], private save: (draft: ResearchDraft) => Promise<void>) { super(app); }
  onOpen(): void {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');this.contentEl.addClass('jwsd-theme');
    const content = this.contentEl;
    content.createEl('h2', { text: 'Une nouvelle piste d’étude' });
    content.createEl('p', { text: 'Ta fiche sera une note Markdown. Tu pourras la modifier et l’enrichir librement.' });
    let title = '', question = '', kind: ResearchDraft['kind'] = 'research';
    let start = '', end = '', latitude = '', longitude = '', references = '';
    new Setting(content).setName('Titre').addText(text => text.setPlaceholder('Ce que je souhaite comprendre…').onChange(value => { title = value; }));
    const typeSetting = new Setting(content).setName('Type de fiche');
    new Setting(content).setName('Question de départ').addTextArea(text => text.setPlaceholder('Quel détail ai-je envie d’examiner ?').onChange(value => { question = value; }));
    const yearSetting = new Setting(content).setName('Année de début').setDesc('Année négative avant notre ère, positive après. Il n’existe pas d’année zéro.').addText(text => text.setPlaceholder('Ex. −607 (saisir -607)').onChange(value => { start = value; }));
    const endSetting = new Setting(content).setName('Année de fin').setDesc('Facultative pour un événement ponctuel.').addText(text => text.onChange(value => { end = value; }));
    const latitudeSetting = new Setting(content).setName('Latitude').addText(text => text.setPlaceholder('Entre -85 et 85').onChange(value => { latitude = value; }));
    const longitudeSetting = new Setting(content).setName('Longitude').addText(text => text.setPlaceholder('Entre -180 et 180').onChange(value => { longitude = value; }));
    new Setting(content).setName('Références bibliques').setDesc('Séparées par un point-virgule.').addText(text => text.setPlaceholder('Genèse 12:1 ; Hébreux 11:8').onChange(value => { references = value; }));
    const updateFields = () => {
      yearSetting.settingEl.hidden = kind !== 'event'; endSetting.settingEl.hidden = kind !== 'event';
      latitudeSetting.settingEl.hidden = kind !== 'place'; longitudeSetting.settingEl.hidden = kind !== 'place';
    };
    typeSetting.addDropdown(dropdown => dropdown.addOptions({ research: 'Recherche libre', event: 'Événement sur la frise', place: 'Lieu sur la carte' }).onChange(value => { kind = value as ResearchDraft['kind']; updateFields(); }));
    updateFields();
    const errorEl = content.createEl('p', { attr: { role: 'alert' } });
    new Setting(content).addButton(button => button.setButtonText('Créer la fiche').setCta().onClick(async () => {
      button.setDisabled(true); errorEl.setText('');
      try {
        if (!title.trim()) throw new Error('Ajoute un titre à ta recherche.');
        const draft: ResearchDraft = { title: title.trim(), question, kind, keys: this.keys, references: references.split(';').map(value => value.trim()).filter(Boolean) };
        if (kind === 'event') {
          draft.startYear = parseYear(start.trim()); draft.endYear = end.trim() ? parseYear(end.trim()) : draft.startYear;
          if (draft.startYear === undefined || draft.endYear === undefined || draft.endYear < draft.startYear) throw new Error('Vérifie les années : pas de zéro, et une fin postérieure ou égale au début.');
        }
        if (kind === 'place') {
          draft.latitude = Number(latitude.trim().replace(',', '.')); draft.longitude = Number(longitude.trim().replace(',', '.'));
          if (!latitude.trim() || !longitude.trim() || !Number.isFinite(draft.latitude) || !Number.isFinite(draft.longitude) || Math.abs(draft.latitude) > 85 || Math.abs(draft.longitude) > 180) throw new Error('Vérifie les coordonnées du lieu.');
        }
        await this.save(draft); this.close();
      } catch (error) { errorEl.setText(error instanceof Error ? error.message : 'Création impossible.'); }
      finally { button.setDisabled(false); }
    }));
  }
  onClose(): void { this.contentEl.empty(); }
}

export class InvestigationModal extends Modal {
  constructor(app: App, private selections: AtlasSelection[], private related: AtlasSelection[], private save: (selections: AtlasSelection[], question: string) => Promise<void>) { super(app); }
  onOpen(): void {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');this.contentEl.addClass('jwsd-theme');
    this.contentEl.createEl('h2', { text: 'Ouvrir une enquête biblique' });
    this.contentEl.createEl('p', { text: 'Un tableau Canvas reliera tes fiches à une note de recherche. Tu pourras déplacer les cartes, ajouter des images et nommer les fils.' });
    let question = '', includeRelated = false;
    new Setting(this.contentEl).setName('Ma question').addTextArea(text => text.setPlaceholder(`Que m’apprend cette recherche sur ${this.selections[0]?.title ?? 'ce sujet'} ?`).onChange(value => { question = value; }));
    if (this.related.length) new Setting(this.contentEl).setName('Ajouter des fiches associées').setDesc(`${this.related.length} pistes documentées proposées. Le tableau est limité à 12 fiches.`).addToggle(toggle => toggle.onChange(value => { includeRelated = value; }));
    const errorEl = this.contentEl.createEl('p', { attr: { role: 'alert' } });
    new Setting(this.contentEl).addButton(button => button.setButtonText('Créer le tableau').setCta().onClick(async () => {
      button.setDisabled(true);
      try { await this.save(includeRelated ? [...this.selections, ...this.related] : this.selections, question); this.close(); }
      catch (error) { errorEl.setText(error instanceof Error ? error.message : 'Création impossible.'); }
      finally { button.setDisabled(false); }
    }));
  }
  onClose(): void { this.contentEl.empty(); }
}
