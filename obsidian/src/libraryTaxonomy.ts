export type LibraryCategory =
  'all'|'bible'|'books'|'magazines'|'brochures'|'assemblies'|'schools'|'personal'|'other';

export const foldLibraryText=(value:string)=>value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim();

export function classifyLibraryVolume(symbol:string,title:string):Exclude<LibraryCategory,'all'|'personal'>{
  const s=foldLibraryText(symbol),t=foldLibraryText(title);
  if(/^(nwt|nwtsty|nwtr|rbi8|bi12|bi7|nwtsp)(?:$|[-\d])/.test(s)||/\b(traduction du monde nouveau|la bible)\b/.test(t))return 'bible';
  if(/(?:^|[-_])(co-pgm|copgm|brpgm|ca-copgm|ca-brpgm)/.test('-'+s)||
    /assemblee (de circonscription|regionale)|programme (de|d')?assemblee|congres/.test(t))return 'assemblies';
  if(/^(s[-_]\d+|th|be|km|od|ks|sfl|sfg)(?:$|[-_\d])/.test(s)||
    /\b(ecole|formation|instructions?|manuel|seminaire)\b/.test(t))return 'schools';
  if(/^(w\d{0,6}|wp\d{0,6}|g\d{0,6}|mwb\d{0,6}|ws\d{0,6})$/.test(s)||
    /tour de garde|reveillez-vous|cahier vie et ministere/.test(t))return 'magazines';
  if(/^(it[-_]?\d+|lff|bh|bhs|lv|kr|cl|jy|rr|si|nwtstys)$/.test(s)||
    /etude perspicace|livre|volume|approchons-nous/.test(t))return 'books';
  if(/^(br|fg|brch|bro|t-)\d*/.test(s)||/\bbrochure\b/.test(t))return 'brochures';
  return 'other';
}

/** An internal JW Library publication link. This is not a public WOL URL. */
export function jwpubPublicationId(link:string):number|null {
  const match=/^jwpub:\/\/p\/[A-Za-z0-9_-]+:(\d+)(?:\/[^\s]*)?$/.exec(link);
  if(!match)return null;
  const id=Number(match[1]);
  return Number.isSafeInteger(id)&&id>0?id:null;
}

export const LIBRARY_FILTERS:ReadonlyArray<{
  id:LibraryCategory;title:string;icon:string
}>=[
  {id:'all',title:'Tout',icon:'library'},
  {id:'bible',title:'Bible',icon:'book-open'},
  {id:'books',title:'Livres',icon:'book'},
  {id:'magazines',title:'Revues',icon:'newspaper'},
  {id:'brochures',title:'Brochures',icon:'files'},
  {id:'assemblies',title:'Assemblées',icon:'calendar-days'},
  {id:'schools',title:'Écoles',icon:'graduation-cap'},
  {id:'personal',title:'Mes imports',icon:'folder-heart'},
  {id:'other',title:'Autres',icon:'archive'}
];

export function filteredVolumes<T extends {
  origin:'personal'|'download';
  category:Exclude<LibraryCategory,'all'|'personal'>
}>(items:T[],category:LibraryCategory):T[]{
  if(category==='all')return items;
  if(category==='personal')return items.filter(x=>x.origin==='personal');
  return items.filter(x=>x.category===category);
}
export function localDocumentUrl(volume:{language:number},doc:{mepsId:number|null}):string|null{
  if(volume.language!==3||!doc.mepsId)return null;
  return 'https://wol.jw.org/fr/wol/d/r30/lp-f/'+doc.mepsId;
}
