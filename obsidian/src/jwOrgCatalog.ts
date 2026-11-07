import { classifyLibraryVolume } from './libraryTaxonomy.ts';
import { canonicalPublicationSymbol,validPublicationSymbol,canonicalIssue } from './offlinePublications.ts';
import type { LibraryCategory } from './libraryTaxonomy.ts';

/** The official library landing page is a discovery source, not an availability API. */
export const JW_ORG_CATALOG_PAGE='https://www.jw.org/fr/biblioth%C3%A8que/';
export interface JwCatalogEntry {
  symbol:string;
  issue:string;
  title:string;
  coverUrl:string;
  sourcePage:string;
  category:Exclude<LibraryCategory,'all'|'personal'>;
}
const featured=(symbol:string,title:string,coverUrl:string,issue=''):JwCatalogEntry=>({
  symbol,issue,title,coverUrl,sourcePage:JW_ORG_CATALOG_PAGE,
  category:classifyLibraryVolume(symbol,title)
});
/**
 * Short editorial starting selection from JW.org's French library page.
 * Never interpret membership in this list as proof that a JWPUB exists.
 */
export const FEATURED_JW_ORG:readonly JwCatalogEntry[]=[
  featured('nwt','La Bible · Traduction du monde nouveau',''),
  featured('nwtsty','La Bible · édition d’étude',''),
  featured('it','Étude perspicace des Écritures',''),
  featured('ca-copgm27','Assemblée de circonscription 2026-2027 · responsable de circonscription',
    'https://cms-imgp.jw-cdn.org/img/p/ca-copgm27/F/pt/ca-copgm27_F_lg.jpg'),
  featured('ca-brpgm27','Assemblée de circonscription 2026-2027 · représentant de la filiale',
    'https://cms-imgp.jw-cdn.org/img/p/ca-brpgm27/F/pt/ca-brpgm27_F_lg.jpg'),
  featured('co-pgm26','Assemblée régionale 2026 · Un bonheur éternel',
    'https://cms-imgp.jw-cdn.org/img/p/co-pgm26/F/pt/co-pgm26_F_lg.jpg'),
  featured('lff','Vivez pour toujours !',
    'https://cms-imgp.jw-cdn.org/img/p/lff/F/pt/lff_F_lg.jpg'),
  featured('lffi','Vivez pour toujours ! · premières leçons',
    'https://cms-imgp.jw-cdn.org/img/p/lffi/F/pt/lffi_F_lg.jpg'),
  featured('scl','Versets pour la vie chrétienne',
    'https://cms-imgp.jw-cdn.org/img/p/scl/F/pt/scl_F_lg.jpg'),
  featured('es26','Examinons les Écritures chaque jour 2026',
    'https://cms-imgp.jw-cdn.org/img/p/es26/F/pt/es26_F_lg.jpg'),
  featured('w','La Tour de Garde · édition d’étude · septembre 2026',
    'https://cms-imgp.jw-cdn.org/img/p/w/202609/F/pt/w_F_202609_lg.jpg','202609'),
  featured('w','La Tour de Garde · édition d’étude · janvier 2027',
    'https://cms-imgp.jw-cdn.org/img/p/w/202701/F/pt/w_F_202701_lg.jpg','202701'),
  featured('g','Réveillez-vous ! · numéro 1, 2026',
    'https://cms-imgp.jw-cdn.org/img/p/g/202611/F/pt/g_F_202611_lg.jpg','202611'),
  featured('co-inv26','Invitation à l’assemblée régionale 2026',
    'https://cms-imgp.jw-cdn.org/img/p/co-inv26/F/pt/co-inv26_F_lg.jpg')
];
export const validIssue=(value:string):boolean=>value===''||/^\d{4,8}$/.test(value);
export const catalogKey=(entry:Pick<JwCatalogEntry,'symbol'|'issue'>):string=>
  canonicalPublicationSymbol(entry.symbol)+'|'+canonicalIssue(entry.issue);

/** Only URLs actually found on the official JW.org page can create discoveries. */
export function decodeMediaCatalogLink(raw:string):{symbol:string;issue:string}|null{
  try{
    const url=new URL(raw,JW_ORG_CATALOG_PAGE);
    if(url.protocol!=='https:'||url.hostname!=='b.jw-cdn.org'||
      url.pathname!=='/apis/pub-media/GETPUBMEDIALINKS')return null;
    const symbol=validPublicationSymbol(url.searchParams.get('pub')||'');
    const issue=url.searchParams.get('issue')||'';
    const formats=url.searchParams.get('fileformat')||'';
    if(!symbol||!validIssue(issue)||!formats.toUpperCase().split(',').includes('JWPUB'))return null;
    const language=url.searchParams.get('langwritten');
    if(language&&language!=='F')return null;
    return {symbol,issue};
  }catch{return null;}
}
export function trustedJwCover(raw:string):string{
  try{
    const url=new URL(raw,JW_ORG_CATALOG_PAGE);
    return url.protocol==='https:'&&url.hostname==='cms-imgp.jw-cdn.org'&&
      url.pathname.startsWith('/img/p/')&&!url.username&&!url.password?'https://'+
      url.hostname+url.pathname:'';
  }catch{return '';}
}
const cleanText=(value:string):string=>value.replace(/\s+/g,' ').trim().slice(0,220);
const labelledTitle=(value:string):string=>cleanText(value.replace(
  /^(?:texte\s+)?options de téléchargement des publications numériques\s*/i,''
));
const DEFAULT_PAGE=JW_ORG_CATALOG_PAGE;
/**
 * Parse the JW.org publication cards inertly. DOMParser does not execute scripts.
 * Other domains, unknown download services and item URLs are discarded.
 */
export function parseJwOrgCatalogHtml(html:string,source=DEFAULT_PAGE):JwCatalogEntry[]{
  if(html.length>5_000_000||typeof DOMParser==='undefined')return [];
  const document=new DOMParser().parseFromString(html,'text/html');
  const found=new Map<string,JwCatalogEntry>();
  const links=document.querySelectorAll('a[href]');
  for(const link of Array.from(links).slice(0,5000)){
    const media=decodeMediaCatalogLink(link.getAttribute('href')||'');
    if(!media)continue;
    const key=catalogKey(media);
    if(found.has(key))continue;
    let title=labelledTitle(link.getAttribute('aria-label')||link.getAttribute('title')||'');
    let cover='';
    let node:Element|null=link;
    for(let depth=0;depth<6&&node;depth++,node=node.parentElement){
      if(!title){
        const heading=node.querySelector('h3,h2,[class*="title"]');
        if(heading)title=cleanText(heading.textContent||'');
      }
      const imgs=Array.from(node.querySelectorAll('img[src],img[data-src]'));
      const picture=imgs.map(img=>trustedJwCover(img.getAttribute('src')||img.getAttribute('data-src')||''))
        .find(url=>{
          if(!url)return false;
          const path=new URL(url).pathname.toLowerCase();
          return path.includes('/p/'+media.symbol+'/')&&
            (!media.issue||path.includes('/'+media.issue+'/'));
        });
      if(picture){cover=picture;break;}
    }
    title=title||media.symbol.toUpperCase()+(media.issue?' · '+media.issue:'');
    found.set(key,{
      ...media,title,coverUrl:cover,sourcePage:source,
      category:classifyLibraryVolume(media.symbol,title)
    });
    if(found.size>=200)break;
  }
  return [...found.values()];
}
export function combineJwCatalog(
  curated:readonly JwCatalogEntry[],detected:readonly JwCatalogEntry[]
):JwCatalogEntry[]{
  const result=new Map<string,JwCatalogEntry>();
  for(const raw of [...curated,...detected]){
    const symbol=canonicalPublicationSymbol(raw.symbol);
    const item={...raw,symbol,...(symbol==='it'?{title:'Étude perspicace des Écritures'}:{})};
    if(!validPublicationSymbol(item.symbol)||!validIssue(item.issue))continue;
    const key=catalogKey(item);
    const previous=result.get(key);
    result.set(key,{
      ...item,
      title:item.title.length>item.symbol.length?item.title:previous?.title||item.title,
      coverUrl:trustedJwCover(item.coverUrl)||previous?.coverUrl||''
    });
  }
  return [...result.values()];
}
