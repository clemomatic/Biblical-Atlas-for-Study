import { Modal, Notice, Setting, type App } from 'obsidian';
import { safeFilename } from './model';
export interface TalkDraft { title:string; duration:number; scripture:string; goal:string; kind:'public'|'meeting'|'personal' }
export function makeTalkMarkdown(draft:TalkDraft):string {
  const title=draft.title.trim()||'Nouveau discours';
  const duration=Math.max(3,Math.min(60,Math.round(draft.duration)||10));
  const intro=Math.max(1,Math.round(duration*.12)),conclusion=Math.max(1,Math.round(duration*.1));
  const body=duration-intro-conclusion;
  const quote=(s:string)=>JSON.stringify(s);
  return `---
bible_lab_kind: discourse
bible_lab_version: 1
title: ${quote(title)}
duration_minutes: ${duration}
discourse_type: ${draft.kind}
main_scripture: ${quote(draft.scripture)}
status: préparation
---
# ${title}

> [!info]- Objectif et fil conducteur
> ${draft.goal||'Quelle conviction ou action voudrais-je transmettre ?'}
> 
> Texte central : **${draft.scripture||'À définir'}**
> Durée totale : **${duration} min**

## 01 · Ouverture — ${intro} min

**Accroche :** 

**Question centrale :** 

## 02 · Développement — ${body} min

### Idée 1 — 
- **Lire :**
- **Expliquer :**
- **Illustrer :**
- **Appliquer :**

### Idée 2 —
- **Lire :**
- **Expliquer :**
- **Illustrer :**
- **Appliquer :**

### Idée 3 —
- **Lire :**
- **Expliquer :**
- **Illustrer :**
- **Appliquer :**

## 03 · Conclusion — ${conclusion} min

**Réponse à la question centrale :**

**Invitation à agir :**

## Sources vérifiables

- 

## Idées et liens à explorer

- 

## Chronométrage et répétitions

- [ ] Plan relu
- [ ] Références vérifiées
- [ ] Répétition chronométrée
- [ ] Fluidité et transitions vérifiées

> [!tip]- Notes personnelles
> Les références et illustrations doivent soutenir le raisonnement, pas le remplacer.
`;
}
export class TalkStudioModal extends Modal {
  constructor(app:App, private save:(draft:TalkDraft)=>Promise<void>){super(app);}
  onOpen():void {
    this.modalEl.addClass('jwsd-theme','jwsd-modal');this.contentEl.addClass('jwsd-theme');
    const root=this.contentEl;root.empty();root.addClass('biblelab-talk-modal');
    root.createEl('h2',{text:'Créer un plan de discours'});
    root.createEl('p',{text:'Structure claire, minuterie indicative et notes libres.'});
    const draft:TalkDraft={title:'',duration:10,scripture:'',goal:'',kind:'meeting'};
    new Setting(root).setName('Titre').addText(input=>input.setPlaceholder('Vaincre le mal par le bien').onChange(v=>draft.title=v));
    new Setting(root).setName('Type').addDropdown(list=>list
      .addOption('meeting','Partie de réunion').addOption('public','Discours public')
      .addOption('personal','Sujet personnel').setValue('meeting').onChange(v=>draft.kind=v as TalkDraft['kind']));
    new Setting(root).setName('Durée (min)').addText(input=>input.setValue('10').onChange(v=>draft.duration=Number(v)));
    new Setting(root).setName('Verset central').addText(input=>input.setPlaceholder('Romains 12:21').onChange(v=>draft.scripture=v));
    new Setting(root).setName('Objectif').addTextArea(input=>input.setPlaceholder('Ce que les auditeurs doivent comprendre, ressentir et appliquer…').onChange(v=>draft.goal=v));
    new Setting(root).addButton(button=>button.setButtonText('Créer le plan').setCta().onClick(async()=>{
      if(!draft.title.trim()){new Notice('Indique un titre pour retrouver ce plan.');return;}
      try{await this.save(draft);this.close();}catch(error){new Notice(error instanceof Error?error.message:'Création impossible');}
    }));
  }
}
export async function saveTalkToVault(app:App,folder:string,draft:TalkDraft):Promise<string>{
  const dir=folder.replace(/\/$/,'')+'/Discours';
  const parts=dir.split('/');
  for(let i=1;i<=parts.length;i++){
    const current=parts.slice(0,i).join('/');
    if(!app.vault.getAbstractFileByPath(current))await app.vault.createFolder(current);
  }
  const basename=safeFilename(draft.title).slice(0,100)||'Plan de discours';
  let path=dir+'/'+basename+'.md';
  for(let n=2;app.vault.getAbstractFileByPath(path);n++)path=dir+'/'+basename+' ('+n+').md';
  const file=await app.vault.create(path,makeTalkMarkdown(draft));
  await app.workspace.getLeaf('tab').openFile(file);
  return file.path;
}
