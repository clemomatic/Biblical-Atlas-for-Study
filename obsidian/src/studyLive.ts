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
const MONTH_NAMES=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const SLUG_MONTHS=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
/** A meeting programme is not on the Daily Text page. Resolve its own source. */
export function meetingIssueLink(date:Date):string{
 const monday=weekMonday(date);
 const begin=Math.floor(monday.getMonth()/2)*2;
 return 'https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-'+
   SLUG_MONTHS[begin]+'-'+SLUG_MONTHS[begin+1]+'-'+monday.getFullYear()+'/';
}
function simplified(text:string):string{
 return cleanReadingText(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
   .replace(/[‐‑‒–—−]/g,'-').toLocaleLowerCase('fr').trim();
}
/** Recognise e.g. "2-8 novembre", "26 octobre – 1er novembre", or "1-7 juin". */
export function isMeetingWeek(text:string,date:Date):boolean{
 const normalized=simplified(text);
 const match=normalized.match(/(?:^|\s)(\d{1,2})(?:er)?(?:\s+([a-z]+))?(?:\s+\d{4})?\s*-\s*(\d{1,2})(?:er)?(?:\s+([a-z]+))?/);
 if(!match)return false;
 const monday=weekMonday(date),sunday=new Date(monday);
 sunday.setDate(monday.getDate()+6);
 const startDay=Number(match[1]),endDay=Number(match[3]);
 if(startDay!==monday.getDate()||endDay!==sunday.getDate())return false;
 const months=MONTH_NAMES.map(simplified);
 const firstMonth=match[2]||match[4];
 const lastMonth=match[4]||match[2];
 return (!firstMonth||firstMonth===months[monday.getMonth()])&&
        (!lastMonth||lastMonth===months[sunday.getMonth()]);
}
function trustedProgrammeLink(href:string,base:string):string|null{
 try{
  const url=new URL(href,base);
  if(url.protocol!=='https:'||url.username||url.password||url.hostname!=='www.jw.org'||
   !url.pathname.startsWith('/fr/biblioth%C3%A8que/reunion-tj-cahier/'))return null;
  return url.href;
 }catch{return null;}
}
export function findMeetingProgramme(html:string,date:Date,issueUrl=meetingIssueLink(date)):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const label=cleanReadingText(a.textContent||'');
   if(!isMeetingWeek(label,date) && !isMeetingWeek(a.getAttribute('title')||'',date))continue;
   const url=trustedProgrammeLink(a.getAttribute('href')||'',issueUrl);
   if(url && new URL(url).pathname!==new URL(issueUrl).pathname)return url;
 }
 return null;
}
/** WOL daily pages also contain the official meeting program for the current week. */
export function wolMeetingLink(html:string,date:Date,base=dayLink(date)):string|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const label=cleanReadingText(a.textContent||'');
  if(!label.toLocaleLowerCase('fr').includes('cahier vie et ministère')&&!isMeetingWeek(label,date))continue;
  try{
   const url=new URL(a.getAttribute('href')||'',base);
   if(url.protocol==='https:'&&url.hostname==='wol.jw.org'&&
     /^\/fr\/wol\/d\/r30\/lp-f\/\d+/.test(url.pathname))return url.href;
  }catch{/* malformed citation */}
 }
 return null;
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
export function parseDailyHtml(html:string,date:Date):DayPreview|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const headings=[...doc.querySelectorAll('h1,h2,h3,h4')];
 const weekday=new Intl.DateTimeFormat('fr-FR',{weekday:'long'}).format(date);
 const month=MONTH_NAMES[date.getMonth()];
 const expectedDay=String(date.getDate());
 const heading=headings.find(el=>{
  const label=simplified(el.textContent||'');
  const match=label.match(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(\d{1,2})(?:er)?\s+([a-z]+)/);
  return match?.[1]===simplified(weekday)&&match[2]===expectedDay&&match[3]===simplified(month);
 });
 if(!heading)return null;
 // A flattened sequence works for both sibling <p> and nested WOL wrappers.
 const all=[...doc.querySelectorAll('h1,h2,h3,h4,p')];
 const start=all.indexOf(heading);
 const paragraphs:string[]=[];
 for(const item of all.slice(start+1,start+90)){
  if(/^H[1-4]$/.test(item.tagName)){
    const label=simplified(item.textContent||'');
    if(isMeetingWeek(label,date)||/^(?:article d.etude|joyaux de la parole de dieu)/.test(label))break;
  }
  if(item.tagName!=='P'||item.closest('nav,footer,header,aside'))continue;
  const value=clear(item.textContent||'');
  if(value.length>12&&!/^ta réponse$/i.test(value))paragraphs.push(value);
  if(paragraphs.length>=7)break;
 }
 if(!paragraphs.length)return null;
 return {date:clear(heading.textContent||''),verse:keep(paragraphs[0],420),
   excerpt:keep(paragraphs.slice(1).join(' '),700),source:dayLink(date)};
}
const HEADERS:Record<string,string>={
 'JOYAUX DE LA PAROLE DE DIEU':'Trésors bibliques',
 'APPLIQUE-TOI AU MINISTÈRE':'Ministère',
 'VIE CHRÉTIENNE':'Vie chrétienne'
};
export function parseMeetingHtml(html:string,date:Date,source=dayLink(date)):MeetingPreview|null{
 const doc=new DOMParser().parseFromString(html,'text/html');
 const headings=[...doc.querySelectorAll('h1,h2,h3,h4,h5')];
 const start=headings.findIndex(el=>isMeetingWeek(el.textContent||'',date));
 if(start<0)return null;
 const sections:MeetingPreview['sections']=[];
 let section:MeetingPreview['sections'][number]|null=null;
 let bibleReading='';
 for(const el of headings.slice(start+1,start+95)){
  const t=clear(el.textContent||''),value=simplified(t);
  if(!t)continue;
  if(isMeetingWeek(t,date))continue;
  if(/^(?:article d.etude|sommaire la tour de garde|article d.etude \()/.test(value))break;
  const category=Object.entries(HEADERS).find(([key])=>simplified(key)===value);
  if(category){
   section={section:category[1],items:[]};sections.push(section);continue;
  }
  if(!bibleReading&&/^[A-ZÀ-ÖØ-ÞÉÈÊÏÂ][A-ZÀ-ÖØ-Þ\s]+\d+[\s\-,–\d]*$/.test(t)&&t.length<90){
   bibleReading=t;continue;
  }
  // An official meeting may have captions or links inside its H3/H4 entries.
  if(section && el.matches('h3,h4,h5') && section.items.length<15 &&
   !/^(?:notes|renvois|index)$/i.test(t)){
    const sibling=el.nextElementSibling;
    const durationNode=sibling?.matches('p')?sibling:sibling?.querySelector('p');
    const duration=clear(durationNode?.textContent||'');
    const time=/^\\(\\d{1,3}\\s*min\\)/i.test(duration)?' · '+keep(duration,25):'';
    section.items.push(keep(t,160)+time);
   }
  if(sections.length>=3&&/paroles de conclusion/i.test(value))break;
 }
 return sections.length?{week:weekTitle(date),bibleReading,sections,source}:null;
}
