import { cleanReadingText } from './readerText.ts';
/** Bible Lab live source adapters.
 * Read only public WOL pages on user action; never send notes or vault content.
 * Content is shown as a short preview with official navigation, not archived.
 */
export interface DayPreview { date:string; verse:string; excerpt:string; source:string }
export interface MeetingPreview { week:string; bibleReading:string; sections: {section:string; items:string[]}[]; source:string }
export interface StudyLive { day: DayPreview|null; meeting:MeetingPreview|null }
export function dateParts(date:Date): {year:number;month:number;day:number} {
  return {year:date.getFullYear(),month:date.getMonth()+1,day:date.getDate()};
}
export function dayLink(date:Date): string {
  const {year,month,day}=dateParts(date);
  return `https://wol.jw.org/fr/wol/dt/r30/lp-f/${year}/${month}/${day}`;
}
export function weekMonday(date:Date):Date {
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  d.setDate(d.getDate() - (d.getDay()+6)%7);
  return d;
}
export function weekTitle(date:Date):string {
  const monday=weekMonday(date), sunday=new Date(monday);
  sunday.setDate(monday.getDate()+6);
  const month=new Intl.DateTimeFormat('fr-FR',{month:'long'});
  return monday.getMonth()===sunday.getMonth()
    ? `${monday.getDate()}–${sunday.getDate()} ${month.format(monday)}`
    : `${monday.getDate()} ${month.format(monday)} – ${sunday.getDate()} ${month.format(sunday)}`;
}
const clear=(value:string):string=>cleanReadingText(value);
function keep(text:string,max=500):string {
  const normalized=clear(text);
  return normalized.length>max ? normalized.slice(0,max).replace(/\s+\S*$/,'')+'…' : normalized;
}
export function parseDailyHtml(html:string,date:Date):DayPreview|null {
  const doc=new DOMParser().parseFromString(html,'text/html');
  const heading=[...doc.querySelectorAll('h1,h2,h3')].find(el=>/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+\d+/i.test(clear(el.textContent||'')));
  if(!heading) return null;
  const siblings:Element[]=[];
  let cursor=heading.nextElementSibling;
  for(let i=0;i<10&&cursor;i++,cursor=cursor.nextElementSibling){
    if(cursor.matches('h1,h2,h3'))break;
    if(!cursor.matches('script,style,button'))siblings.push(cursor);
  }
  // WOL can put text inside a common parent rather than direct siblings.
  const passage=siblings.map(el=>clear(el.textContent||'')).filter(Boolean);
  const verse=keep(passage[0]||'',280);
  const excerpt=keep(passage.slice(1).join(' ')||'',520);
  if(!verse)return null;
  return {date:clear(heading.textContent||''),verse,excerpt,source:dayLink(date)};
}
const HEADERS:Record<string,string>={
 'JOYAUX DE LA PAROLE DE DIEU':'Trésors bibliques',
 'APPLIQUE-TOI AU MINISTÈRE':'Ministère',
 'VIE CHRÉTIENNE':'Vie chrétienne'
};
export function parseMeetingHtml(html:string,date:Date):MeetingPreview|null{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const headings=[...doc.querySelectorAll('h1,h2,h3,h4')];
  const start=headings.findIndex(el=>/\d+\s+(?:[a-zéû]+)?\s*[–-]\s*\d+.*(?:novembre|décembre|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre)/i.test(clear(el.textContent||'')));
  if(start<0)return null;
  const sections:MeetingPreview['sections']=[];
  let section:MeetingPreview['sections'][number]|null=null;
  let bibleReading='';
  for(const el of headings.slice(start+1,start+70)){
    const text=clear(el.textContent||'');
    if(!text)continue;
    if(/Article d’étude|Tour de Garde|Précédent|Suivant/i.test(text))break;
    const category=Object.entries(HEADERS).find(([key])=>text.toLocaleUpperCase('fr')===key);
    if(category){
      section={section:category[1],items:[]};sections.push(section);continue;
    }
    if(!bibleReading&&/^[A-ZÀ-ÖØ-ÞÉÈÊÏÂ][A-ZÀ-ÖØ-Þ\s]+\d+[\s\-,–\d]*$/.test(text)&&text.length<90){bibleReading=text;continue;}
    if(section && el.matches('h3,h4') && section.items.length<12) section.items.push(keep(text,125));
    if(sections.length>=3 && text.includes('Paroles de conclusion'))break;
  }
  return sections.length ? {week:weekTitle(date),bibleReading,sections,source:dayLink(date)}:null;
}
