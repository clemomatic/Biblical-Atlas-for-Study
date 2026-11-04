/** Pure presentation and navigation helpers for the on-device JWPUB shelf. */
export const LIBRARY_GROUPS=[
  {key:'all',label:'Tout voir',icon:'layout-grid'},
  {key:'bible',label:'Bible',icon:'book-open'},
  {key:'revue',label:'Revues',icon:'newspaper'},
  {key:'livre',label:'Livres',icon:'book'},
  {key:'brochure',label:'Brochures',icon:'book-text'},
  {key:'programme',label:'Assemblées',icon:'calendar-days'},
  {key:'ecole',label:'Écoles et instructions',icon:'graduation-cap'},
  {key:'personnel',label:'Autres publications',icon:'library'}
] as const;
export type LibraryGroup=typeof LIBRARY_GROUPS[number]['key'];

export function normalizeLibrarySearch(input:string):string{
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr')
    .replace(/\s+/g,' ').trim();
}
export function classifyLibraryPublication(symbol:string,title:string):Exclude<LibraryGroup,'all'> {
  const s=symbol.toLowerCase(),t=normalizeLibrarySearch(title);
  if(/^(nwt|bi|rbi|nwtsty|int|nwtss)/.test(s)||/(?:^|\s)(bible|saintes ecritures|traduction du monde nouveau)(?:\s|$)/.test(t))
    return 'bible';
  if(/^(w\d|wp|g\d|g!|awake|w$|g$|km)/.test(s)||/tour de garde|reveillez-vous/.test(t))
    return 'revue';
  if(/^(co-pgm|ca-(?:co|br)pgm|ca-pgm)/.test(s)||
    /assemblee regionale|assemblee de circonscription|programme d.assemblee/.test(t))
    return 'programme';
  if(/^(s-\d+|ks\d*|th\d*|tms|be$)/.test(s)||
    /ecole|formation|instruction|cours biblique/.test(t))
    return 'ecole';
  if(/^(it-|cl$|lf$|ia$|yp|rr$)/.test(s)||/etude perspicace|livre/.test(t))
    return 'livre';
  if(/^(lffi|lff|fg|bh|br|bhs|jy|jl)/.test(s)||/brochure/.test(t))
    return 'brochure';
  return 'personnel';
}
export function localBookIcon(group:LibraryGroup):string{
  return LIBRARY_GROUPS.find(g=>g.key===group)?.icon||'book';
}
/** Only visibly named cover artwork, never an arbitrary image from an article. */
export function chooseLocalCover(assets:string[]):string|null {
  const candidates=assets.filter(name=>/^assets\/[^/]+\.(?:png|jpe?g|webp)$/i.test(name)&&
    /^(?:cover|front|couverture|titlepage|title_page)(?:[_.-]|$)/i.test(name.slice(7)));
  return candidates.sort((a,b)=>a.localeCompare(b))[0]||null;
}
export function stripImportFrontmatter(content:string):string{
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/,'').trim();
}
export function documentSearchSnippet(markdown:string,query:string,maxLength=180):string{
  const text=stripImportFrontmatter(markdown)
    .replace(/!\[[^\]]*]\([^)]*\)/g,'')
    .replace(/\[([^\]]+)]\([^)]*\)/g,'$1')
    .replace(/[#*_~\x60]/g,' ')
    .replace(/\s+/g,' ').trim();
  const needle=normalizeLibrarySearch(query);
  if(!needle)return text.slice(0,maxLength);
  const lowered=normalizeLibrarySearch(text);
  const place=lowered.indexOf(needle);
  if(place<0)return text.slice(0,maxLength);
  const start=Math.max(0,place-50);
  return (start?'…':'')+text.slice(start,start+maxLength)+(text.length>start+maxLength?'…':'');
}
export function lookupLocalDocumentId(href:string):number|null{
  const match=/^jwpub:\/\/p\/[a-z0-9_-]+:(\d+)(?:\/[\d-]*)?\/?$/i.exec(href.trim());
  if(!match)return null;
  const id=Number(match[1]);
  return Number.isSafeInteger(id)&&id>0?id:null;
}
export function bibleJwpubWebLink(href:string):string|null{
  const match=/^jwpub:\/\/b\/(?:NWTR|RBI8|NWTSTY)\/(\d{1,2}):(\d{1,3})(?::\d{1,3})?(?:-\d{1,2}:\d{1,3}:\d{1,3})?$/i.exec(href.trim());
  if(!match)return null;
  const book=Number(match[1]),chapter=Number(match[2]);
  if(book<1||book>66||chapter<1||chapter>160)return null;
  return 'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/'+book+'/'+chapter;
}
