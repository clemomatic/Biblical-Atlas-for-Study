import { type App, Notice } from 'obsidian';
import type { DayPreview, MeetingPreview } from './studyLive';
import { safeFilename } from './model';
import { renderWeeklyMeetingNotebook } from './meetingNotebook';
const escapeYaml=(text:string)=>JSON.stringify(text);
function dateStamp(date:Date):string {
 const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
 return y+'-'+m+'-'+d;
}
export function dayStudyMarkdown(day:DayPreview,date:Date):string{
 return [
  '---','bible_lab_kind: daily-reflection','bible_lab_version: 1',
  'date: '+dateStamp(date),'source_url: '+escapeYaml(day.source),'---',
  '# Méditation · '+day.date,'',
  '> [!quote] Verset du jour',
  '> '+day.verse,'',
  '[Consulter le texte du jour sur WOL]('+day.source+')','',
  '## Comprendre','- Quel détail me touche ou m’interpelle ?','',
  '## Relier','- Quels autres textes ou expériences éclairent cette idée ?','',
  '## Méditer','- Qu’est-ce que cela m’apprend sur Jéhovah ?','',
  '## Mettre en pratique','- Quelle action précise puis-je en tirer ?','',
  '## Sources et pistes','',''
 ].join('\n');
}
export function weekStudyMarkdown(week:MeetingPreview,date:Date):string{
 const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate()-(date.getDay()+6)%7);
 return renderWeeklyMeetingNotebook(week,dateStamp(monday));
}
async function ensureFolder(app:App,folder:string):Promise<void>{
 const parts=folder.split('/').filter(Boolean);let p='';
 for(const part of parts){p=p?p+'/'+part:part;if(!app.vault.getAbstractFileByPath(p))await app.vault.createFolder(p);}
}
async function openSafe(app:App,path:string,markdown:string):Promise<void>{
 const existing=app.vault.getAbstractFileByPath(path);
 // A pre-existing note wins; never replace user work during refresh.
 const file=existing&&'extension' in existing?existing:await app.vault.create(path,markdown);
 await app.workspace.getLeaf('tab').openFile(file as import('obsidian').TFile);
 new Notice(existing?'Note existante réouverte, sans modification.':'Note de préparation créée.');
}
export async function saveDailyStudy(app:App,folder:string,day:DayPreview,date:Date):Promise<void>{
 const dest=folder+'/Méditations';
 await ensureFolder(app,dest);
 await openSafe(app,dest+'/'+dateStamp(date)+' · Texte du jour.md',dayStudyMarkdown(day,date));
}
export async function saveWeeklyStudy(app:App,folder:string,week:MeetingPreview,date:Date):Promise<void>{
 const dest=folder+'/Réunions';
 await ensureFolder(app,dest);
 const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate()-(date.getDay()+6)%7);
 await openSafe(app,dest+'/'+dateStamp(monday)+' · '+safeFilename(week.week)+'.md',weekStudyMarkdown(week,date));
}
