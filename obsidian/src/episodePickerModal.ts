import { FuzzySuggestModal, type App } from 'obsidian';

export interface EpisodeChoice {
  id: string;
  title: string;
}

/** A human-readable event chooser; note authors never need to type IDs. */
export class EpisodePickerModal extends FuzzySuggestModal<EpisodeChoice> {
  constructor(
    app: App,
    private readonly choices: EpisodeChoice[],
    private readonly onChoose: (choice: EpisodeChoice) => void,
    placeholder = 'Rechercher un épisode de l’Atlas…'
  ) {
    super(app);
    this.setPlaceholder(placeholder);
    this.setInstructions([{ command: '↑↓', purpose: 'Parcourir' }, { command: '↵', purpose: 'Insérer' }]);
  }
  getItems(): EpisodeChoice[] { return this.choices; }
  getItemText(choice: EpisodeChoice): string { return choice.title; }
  onChooseItem(choice: EpisodeChoice): void { this.onChoose(choice); }
}
