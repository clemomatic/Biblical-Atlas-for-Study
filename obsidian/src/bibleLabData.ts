import { cleanReadingText } from './readerText.ts';
/** Bible Lab link and document helpers.
 * No publication texts are shipped, and no unapproved remote service is contacted.
 */
export const WOL_SEARCH = 'https://wol.jw.org/fr/wol/s/r30/lp-f?q=';
export const WOL_LOOKUP = 'https://wol.jw.org/fr/wol/l/r30/lp-f?q=';
export const OFFICIAL_MAP_INDEX = 'https://wol.jw.org/fr/wol/d/r30/lp-f/1102003130';
export const OFFICIAL_ATLAS = 'https://www.jw.org/fr/biblioth%C3%A8que/brochures/Voyez-le-bon-pays/';

export const BOOKS = [
  'Genèse','Exode','Lévitique','Nombres','Deutéronome','Josué','Juges','Ruth',
  '1 Samuel','2 Samuel','1 Rois','2 Rois','1 Chroniques','2 Chroniques','Esdras','Néhémie',
  'Esther','Job','Psaumes','Proverbes','Ecclésiaste','Chant de Salomon','Isaïe','Jérémie',
  'Lamentations','Ézéchiel','Daniel','Osée','Joël','Amos','Obadia','Jonas','Michée','Nahoum',
  'Habacuc','Sophonie','Aggée','Zacharie','Malachie','Matthieu','Marc','Luc','Jean',
  'Actes','Romains','1 Corinthiens','2 Corinthiens','Galates','Éphésiens','Philippiens',
  'Colossiens','1 Thessaloniciens','2 Thessaloniciens','1 Timothée','2 Timothée',
  'Tite','Philémon','Hébreux','Jacques','1 Pierre','2 Pierre','1 Jean','2 Jean',
  '3 Jean','Jude','Révélation'
];
export function normalizeSearch(text: string): string {
  return cleanReadingText(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'")
    .replace(/\s+/g, ' ').trim().toLocaleLowerCase('fr');
}
const ALIASES: Record<string,number> = {};
BOOKS.forEach((name,i) => { ALIASES[normalizeSearch(name)] = i + 1; });
for (const [key,id] of Object.entries({
  psaume:19, ps:19, gn:1, ex:2, lv:3, nb:4, dt:5, jos:6, jg:7,
  '1 s':9,'2 s':10,'1 r':11,'2 r':12, es:15, ne:16, est:17,
  pr:20, ec:21, ct:22, is:23, jr:24, lm:25, ez:26, dn:27,
  os:28, jl:29, am:30, ob:31, jon:32, mi:33, na:34, hab:35,
  soph:36, ag:37, za:38, mal:39, mt:40, mc:41, lc:42, jn:43,
  ac:44, rm:45, '1 co':46,'2 co':47, ga:48, eph:49, ph:50, col:51,
  '1 th':52,'2 th':53,'1 tm':54,'2 tm':55, tt:56, phm:57,
  jer:24, heb:58, eccl:21, mat:40, matt:40, '1 cor':46, '2 cor':47,
  he:58, jc:59,'1 p':60,'2 p':61,'1 jn':62,'2 jn':63,'3 jn':64, jude:65, rev:66, ap:66
})) ALIASES[normalizeSearch(key)] = id;
// Official French Bible book abbreviations from JW.org's Bible table.
const OFFICIAL_BOOK_ALIASES:string[][]=[
 ['Gen','Gn'],['Ex'],['Lév','Lev','Lv'],['Nomb','Nb'],['Deut','Dt'],
 ['Jos'],['Juges','Jg'],['Ru'],['1 Sam','1S','1Sam'],['2 Sam','2S','2Sam'],
 ['1 R','1R'],['2 R','2R'],['1 Chron','1Ch'],['2 Chron','2Ch'],
 ['Esd'],['Néh','Né','Ne','Neh'],['Est'],['Jb'],['Ps'],['Prov','Pr'],['Eccl','Ec'],
 ['Chant de S','Ct'],['Is'],['Jér','Jer','Jr'],['Lam','Lm'],['Ézéch','Éz','Ezech','Ez'],
 ['Dan','Dn'],['Os'],['Jl'],['Am'],['Abd','Ab'],['Jon'],['Mich','Mi'],
 ['Nah','Na'],['Hab'],['Soph','Sph'],['Agg','Ag'],['Zach','Za'],['Mal','Ml'],
 ['Mat','Matt','Mt'],['Marc','Mc'],['Luc','Lc'],['Jean','Jn'],
 ['Actes','Ac'],['Rom','Rm'],['1 Cor','1Co'],['2 Cor','2Co'],
 ['Gal','Ga'],['Éph','Eph'],['Phil','Php'],['Col'],
 ['1 Thess','1Th'],['2 Thess','2Th'],['1 Tim','1Tm'],['2 Tim','2Tm'],
 ['Tite','Tt'],['Philém','Philem','Phm'],['Héb','Hé','Heb','He'],['Jacq','Jc'],
 ['1 Pierre','1P'],['2 Pierre','2P'],['1 Jean','1J'],['2 Jean','2J'],['3 Jean','3J'],
 ['Jude'],['Rév','Rev','Ré','Re']
];
OFFICIAL_BOOK_ALIASES.forEach((items,i)=>{
 for(const item of items)ALIASES[normalizeSearch(item).replace(/\.$/,'')]=i+1;
});
export interface ScriptureRef {
 label:string;book:number;chapter:number;verse:number;endVerse?:number;
 /** Final chapter of a cross-chapter passage (e.g. Daniel 1:1–3:30). */
 endChapter?:number;
 /** Exact requested verses within one chapter; a cross-chapter range uses endChapter/endVerse. */
 verses?:number[];
}
export function parseScripture(input:string):ScriptureRef|null{
 const trimmed=cleanReadingText(input);
 // Explicit chapter:verse – chapter:verse must be checked BEFORE a
 // single-chapter verse range. Do not misread Daniel 1:1–3:30 as 1:1-3.
 const cross=trimmed.match(/^(.+?)\s+(\d{1,3})\s*[:.]\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*[:.]\s*(\d{1,3})$/u);
 if(cross){
  const book=ALIASES[normalizeSearch(cross[1]).replace(/\.$/,'')];
  const chapter=Number(cross[2]),verse=Number(cross[3]);
  const endChapter=Number(cross[4]),endVerse=Number(cross[5]);
  // Limit a single expanded reading to five consecutive chapters.
  if(!book||chapter<1||chapter>150||verse<1||verse>176||
     endChapter<=chapter||endChapter>150||endChapter-chapter>5||
     endVerse<1||endVerse>176)return null;
  return {label:BOOKS[book-1]+' '+chapter+':'+verse+'-'+endChapter+':'+endVerse,
    book,chapter,verse,endChapter,endVerse};
 }
 const match=trimmed.match(/^(.+?)\s+(\d{1,3})\s*[:.]\s*(\d{1,3}(?:\s*[-–—]\s*\d{1,3})?(?:\s*,\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)*)$/u);
 if(!match)return null;
 const book=ALIASES[normalizeSearch(match[1]).replace(/\.$/,'')];
 if(!book)return null;
 const chapter=Number(match[2]);
 if(chapter<1||chapter>150)return null;
 const expressions=match[3].split(/\s*,\s*/);
 const selected:number[]=[];
 for(const expression of expressions){
  const segment=expression.match(/^(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?$/u);
  if(!segment)return null;
  const first=Number(segment[1]),last=Number(segment[2]||segment[1]);
  if(first<1||last>176||last<first||last-first>39)return null;
  for(let verse=first;verse<=last;verse++){
   if(!selected.includes(verse))selected.push(verse);
   if(selected.length>40)return null;
  }
 }
 if(!selected.length)return null;
 const first=selected[0];
 const onlyRange=expressions.length===1&&/[-–—]/u.test(expressions[0]);
 const endVerse=onlyRange?selected[selected.length-1]:undefined;
 const label=BOOKS[book-1]+' '+chapter+':'+match[3].replace(/\s*[-–—]\s*/g,'-').replace(/\s*,\s*/g,', ');
 return {label,book,chapter,verse:first,...(endVerse!==undefined?{endVerse}:{}),
   ...(selected.length>1?{verses:selected}:{})};
}
export function wolSearch(query: string): string { return WOL_SEARCH + encodeURIComponent(query.trim()); }
export function wolLookup(query: string): string { return WOL_LOOKUP + new URLSearchParams({q:query.trim()}).toString().slice(2); }
export function jwLibraryLink(query: string): string | null {
  const parsed = parseScripture(query);
  if (!parsed) return null;
  const n = (num:number,width:number) => String(num).padStart(width,'0');
  return `https://www.jw.org/finder?wtlocale=F&bible=${n(parsed.book,2)}${n(parsed.chapter,3)}${n(parsed.verse,3)}`;
}
// Compile once, recognizing an entire citation and not only its first verse.
// A comma is a list separator; a dash is a contiguous inclusive range.
// ALIASES contains accent-stripped lookup keys; those are correct for
// parseScripture but cannot match the original accented characters in a note.
// Compile the detector from the original French spellings AND their normalized
// aliases so "Hé 11:1", "Né. 2:1", "Éph." and "Jér." are all detected.
const SCRIPTURE_BOOKS=[...new Set([
  ...BOOKS,...Object.keys(ALIASES),...OFFICIAL_BOOK_ALIASES.flat()
])].sort((a,b)=>b.length-a.length);
const scriptureBookAlternates=SCRIPTURE_BOOKS
 .map(book=>book.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&')).join('|');
// Prefer a complete cross-chapter ending (3:30) before a simple verse span.
const verseTail='\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3}\\s*[:.]\\s*\\d{1,3}|'+
 '\\s*[-–—]\\s*\\d{1,3}|)(?:\\s*,\\s*\\d{1,3}(?:\\s*[-–—]\\s*\\d{1,3})?)*';
const scriptureReferencePattern=new RegExp(
  '(?<![\\p{L}\\p{N}])((?:'+scriptureBookAlternates+')\\.?\\s+\\d{1,3}\\s*[:.]\\s*'+
  verseTail+')','giu');
export interface ScriptureMention {from:number;to:number;label:string;ref:ScriptureRef}
// A semicolon followed by a chapter number inherits the last explicit book.
// Require an adjacent clause; do not link unrelated "2:15" numbers in prose.
const CONTINUED_VERSES=/^\s*[;；]\s*(\d{1,3}\s*:\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3}\s*:\s*\d{1,3}|(?:\s*[-–—]\s*\d{1,3})?(?:\s*,\s*\d{1,3}(?:\s*[-–—]\s*\d{1,3})?)*))/u;
export function findScriptureMentions(note:string,inheritedBook?:string):ScriptureMention[]{
 const mentions:ScriptureMention[]=[];
 const known=new Set<string>();
 const add=(from:number,to:number,label:string,ref:ScriptureRef):void=>{
  if(to<note.length&&/[\p{L}\p{N}:]/u.test(note[to]))return;
  // Don't silently link a truncated prefix when the remainder looks like a
  // cross-chapter citation but the whole input is invalid.
  if(/^\s*[-–—]\s*\d{1,3}\s*[:.]\s*\d/.test(note.slice(to)))return;
  const key=from+':'+to;
  if(!known.has(key)){known.add(key);mentions.push({from,to,label,ref});}
 };
 const continuations=(start:number,book:string):void=>{
  let pos=start;
  // Support Markdown's linked initial reference: [Actes 1:8](url) ; 2:1...
  if(note[pos]===']'){
   const tail=note.slice(pos).match(/^\]\(https?:\/\/[^)\r\n]{1,350}\)/);
   if(tail)pos+=tail[0].length;
  }
  const marks=(text:string)=>text.match(/^(?:\*{1,2}|_{1,2})*/)?.[0].length||0;
  pos+=marks(note.slice(pos));
  for(let i=0;i<40;i++){
   const match=note.slice(pos).match(CONTINUED_VERSES);
   if(!match)break;
   const ref=parseScripture(book+' '+match[1]);
   if(!ref)break;
   const from=pos+match[0].lastIndexOf(match[1]);
   add(from,from+match[1].length,match[1],ref);
   pos=from+match[1].length;
   pos+=marks(note.slice(pos));
  }
 };
 if(inheritedBook&&parseScripture(inheritedBook+' 1:1'))
  continuations(0,inheritedBook);
 for(const match of note.matchAll(scriptureReferencePattern)){
  const ref=parseScripture(match[1]);
  if(!ref)continue;
  const from=match.index||0,to=from+match[1].length;
  add(from,to,match[1],ref);
  continuations(to,BOOKS[ref.book-1]);
  if(mentions.length>=80)break;
 }
 return mentions.sort((a,b)=>a.from-b.from).slice(0,80);
}
export function extractReferences(note:string):string[]{
 const found=new Set<string>();
 for(const match of note.matchAll(/!!([^!\r\n]{1,220})!!/g)){
  for(const ref of match[1].split(';')){
   if(ref.trim())found.add(ref.trim());
   if(found.size>=40)return [...found];
  }
 }
 for(const mention of findScriptureMentions(note)){
  found.add(parseScripture(mention.label)?mention.label:mention.ref.label);
  if(found.size>=40)break;
 }
 return [...found];
}
export type MapLocation = {name:string; coordinates:string; pages:number[]};
export function parseMapIndex(html: string): MapLocation[] {
  const doc = new DOMParser().parseFromString(html,'text/html');
  const lines = [...doc.querySelectorAll('p')].map(p=>p.textContent?.replace(/\s+/g,' ').trim()||'');
  const entries: MapLocation[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.length < 4 || line.length > 350 || /^index|^les chiffres|^voyez le bon pays/i.test(line)) continue;
    const first = line.match(/^(.+?)\s+(\d{1,2})(?:\s+([A-I]\d{1,2}))?(?=\s|[,;]|$)/u);
    if (!first || !/\p{L}/u.test(first[1])) continue;
    const refs = [...line.slice(first[1].length).matchAll(/\b(\d{1,2})(?:\s+([A-I]\d{1,2}))?\b/g)];
    if (!refs.length) continue;
    const name=first[1].trim();
    const key=normalizeSearch(name);
    if (seen.has(key)) continue;
    const pages=[...new Set(refs.map(m=>Number(m[1])).filter(p=>p>=2&&p<=35))];
    if (!pages.length) continue;
    seen.add(key);
    entries.push({name, pages, coordinates:refs.map(m=>`p. ${m[1]}${m[2]?' · '+m[2]:''}`).join(' ; ')});
  }
  return entries.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
export const MAP_FALLBACK: MapLocation[] = [
  {name:'Jérusalem',pages:[18,19,21,29,31],coordinates:'Voir index officiel'},
  {name:'Capharnaüm',pages:[18,29],coordinates:'p. 18 · F4 ; p. 29 · E4'},
  {name:'Bethléem',pages:[18,19,29],coordinates:'p. 19 · D10 ; p. 29 · D10'},
  {name:'Nazareth',pages:[18,29],coordinates:'Voir index officiel'},
  {name:'Césarée',pages:[18,29,33],coordinates:'p. 18 · C6 ; p. 29 · B6 ; p. 33 · G4'},
  {name:'Damas',pages:[5,7,11,15,23,29,33],coordinates:'Voir index officiel'},
  {name:'Babylone',pages:[3,5,7,23,24,26,32],coordinates:'Voir index officiel'},
  {name:'Béthel',pages:[7,15,17,19],coordinates:'p. 19 · D9'},
  {name:'Cana',pages:[18,29],coordinates:'p. 18 · E4 ; p. 29 · D4'},
  {name:'Corinthe',pages:[5,33],coordinates:'p. 5 · C3 ; p. 33 · D2'},
  {name:'Athènes',pages:[5,24,26,32,33],coordinates:'p. 33 · D2'},
  {name:'Éphèse',pages:[5,26,27,33],coordinates:'p. 33 · E2'},
  {name:'Jéricho',pages:[18,19,29],coordinates:'Voir index officiel'}
];
export type Resource={id:string;title:string;section:string;url:string;subtitle?:string};
const base='https://www.jw.org/fr/biblioth%C3%A8que/bible/bible-d-etude/';
export const RESOURCES: Resource[] = [
  {id:'appendix-a',title:'Appendice A',section:'Bible d’étude',subtitle:'Traduction, texte biblique, chronologies A6 et A7',url:base+'appendice-a/'},
  {id:'appendix-b',title:'Appendice B',section:'Bible d’étude',subtitle:'Cartes B2 à B13, tabernacle, calendriers, mesures',url:base+'appendice-b/'},
  {id:'appendix-c',title:'Appendice C',section:'Bible d’étude',subtitle:'Nom divin dans les Écritures grecques',url:base+'appendice-c/'},
  {id:'b2',title:'B2 — Genèse et patriarches',section:'Cartes · Appendice B',url:base+'appendice-b/carte-genese-patriarches/'},
  {id:'b3',title:'B3 — L’Exode',section:'Cartes · Appendice B',url:base+'appendice-b/carte-exode/'},
  {id:'b4',title:'B4 — Conquête de la Terre promise',section:'Cartes · Appendice B',url:base+'appendice-b/carte-conquete-terre-promise/'},
  {id:'b5',title:'B5 — Le tabernacle et le grand prêtre',section:'Schémas · Appendice B',url:base+'appendice-b/schema-tabernacle-et-grand-pretre/'},
  {id:'b6',title:'B6 — Terre promise et villes de refuge',section:'Cartes · Appendice B',url:base+'appendice-b/carte-terre-promise-ville-de-refuge/'},
  {id:'b7',title:'B7 — Royaume de David et de Salomon',section:'Cartes · Appendice B',url:base+'appendice-b/carte-royaume-david-salomon/'},
  {id:'b9',title:'B9 — La statue de Daniel 2',section:'Schémas · Appendice B',url:base+'appendice-b/statue-daniel-2/'},
  {id:'b10',title:'B10 — Israël au temps de Jésus',section:'Cartes · Appendice B',url:base+'appendice-b/carte-israel-temps-de-jesus/'},
  {id:'b13',title:'B13 — Expansion du christianisme',section:'Cartes · Appendice B',url:base+'appendice-b/carte-expansion-du-christianisme/'},
  {id:'b15',title:'B15 — Calendrier biblique hébreu',section:'Calendriers · Appendice B',url:base+'appendice-b/calendrier-biblique-hebreu/'},
  {id:'voyez',title:'Voyez le bon pays',section:'Cartothèque',subtitle:'Atlas officiel, cartes des territoires et des voyages',url:OFFICIAL_ATLAS},
  {id:'index',title:'Index des cartes (p. 34–35)',section:'Cartothèque',subtitle:'Lieux classés et coordonnées alphanumériques',url:OFFICIAL_MAP_INDEX},
  {id:'it',title:'Étude perspicace des Écritures',section:'Encyclopédie',subtitle:'Articles par sujet et par nom',url:'https://wol.jw.org/fr/wol/library/r30/lp-f/toutes-les-publications/étude-perspicace'},
  {id:'bible',title:'Bible d’étude',section:'Texte biblique',subtitle:'Livres, notes et références croisées',url:base+'livres/'}
];
export const MAP_CHAPTERS = [
  ['Les pays de la Bible',4,OFFICIAL_ATLAS+'Les-pays-de-la-Bible/'],
  ['Le monde des patriarches',6,OFFICIAL_ATLAS+'Le-monde-des-patriarches/'],
  ['De l’Égypte à la Terre promise',8,OFFICIAL_ATLAS+'De-l%C3%89gypte-%C3%A0-la-Terre-promise/'],
  ['Israël et les nations environnantes',10,OFFICIAL_ATLAS+'Isra%C3%ABl-et-les-nations-environnantes/'],
  ['Un pays bon et vaste',12,OFFICIAL_ATLAS+'Un-pays-bon-et-vaste/'],
  ['Quand Jéhovah donnait des juges',14,OFFICIAL_ATLAS+'Quand-J%C3%A9hovah-donnait-des-juges/'],
  ['Israël aux jours de David et de Salomon',16,OFFICIAL_ATLAS+'Isra%C3%ABl-aux-jours-de-David-et-de-Salomon/'],
  ['La Terre promise',18,OFFICIAL_ATLAS+'La-Terre-promise/'],
  ['Jérusalem et le temple de Salomon',20,OFFICIAL_ATLAS+'J%C3%A9rusalem-et-le-temple-de-Salomon/'],
  ['Des empires attaquent la Terre promise',22,OFFICIAL_ATLAS+'Des-empires-attaquent-la-Terre-promise/'],
  ['Le peuple de Dieu rentre dans son pays',24,OFFICIAL_ATLAS+'Le-peuple-de-Dieu-rentre-dans-son-pays/'],
  ['L’empreinte de la Grèce et de Rome',26,OFFICIAL_ATLAS+'Lempreinte-de-la-Gr%C3%A8ce-et-de-Rome-sur-les-Juifs/'],
  ['Jésus dans le pays des Juifs',28,OFFICIAL_ATLAS+'J%C3%A9sus-dans-le-pays-des-Juifs/'],
  ['Jérusalem et le Temple au temps de Jésus',30,OFFICIAL_ATLAS+'J%C3%A9rusalem-et-le-Temple-au-temps-de-J%C3%A9sus/'],
  ['La propagation du christianisme',32,OFFICIAL_ATLAS+'La-propagation-du-christianisme/']
] as const;
export function mapChapterForPage(page:number):string {return MAP_CHAPTERS.find(([_,p])=>page>=p && page<p+2)?.[0] ?? 'Voir index';}
