/**
 * Discovery from JW.org's public French library pages.
 * Nothing is bulk-crawled or sent to third parties: one page, user action.
 * The download URL itself is resolved separately via GETPUBMEDIALINKS.
 */
export const OFFICIAL_FRENCH_SECTIONS=[
  {key:'bible',label:'Bible',path:'bible'},
  {key:'livres',label:'Livres',path:'livres'},
  {key:'brochures',label:'Brochures',path:'brochures'},
  {key:'programmes',label:'Assemblées',path:'programmes'},
  {key:'revues',label:'Revues',path:'revues'},
  {key:'tracts',label:'Tracts',path:'tracts'}
] as const;
export type PublicSection=typeof OFFICIAL_FRENCH_SECTIONS[number]['key'];
export interface OfficialCatalogEntry {
  key:string;
  symbol:string;
  issue:string;
  title:string;
  coverUrl:string|null;
  pageUrl:string;
  section:PublicSection;
}
export interface OfficialCatalogPage {
  section:PublicSection;
  entries:OfficialCatalogEntry[];
  start:number;
  nextStart:number|null;
  total:number|null;
  url:string;
}
export const OFFICIAL_PAGE_SIZE=12;
export const OFFICIAL_MAX_START=240;
const BASE='https://www.jw.org/fr/biblioth%C3%A8que/';
const CDN_DOWNLOAD='/apis/pub-media/GETPUBMEDIALINKS';
export function officialPageUrl(section:PublicSection,start=0):string{
  const category=OFFICIAL_FRENCH_SECTIONS.find(x=>x.key===section);
  if(!category||!Number.isInteger(start)||start<0||start>OFFICIAL_MAX_START||
    start%OFFICIAL_PAGE_SIZE!==0)throw Error('Page du catalogue invalide.');
  const url=new URL(BASE+category.path+'/');
  if(start)url.searchParams.set('start',String(start));
  return url.toString();
}
export function isOfficialCatalogHtmlUrl(value:string):boolean{
  try{
    const u=new URL(value);
    return u.protocol==='https:'&&u.hostname==='www.jw.org'&&!u.username&&!u.password&&
      u.pathname.startsWith('/fr/biblioth%C3%A8que/')&&(!u.port||u.port==='443');
  }catch{return false;}
}
export function parseOfficialDownloadLink(value:string):{symbol:string;issue:string}|null{
  try{
    const u=new URL(value,'https://www.jw.org');
    if(u.protocol!=='https:'||u.hostname!=='b.jw-cdn.org'||u.pathname!==CDN_DOWNLOAD||
      u.username||u.password||u.port)return null;
    const symbol=(u.searchParams.get('pub')||'').trim().toLowerCase();
    const issue=(u.searchParams.get('issue')||'').trim();
    if(!/^[a-z0-9][a-z0-9-]{0,55}$/.test(symbol))return null;
    if(issue&&!/^\d{4,8}$/.test(issue))return null;
    return {symbol,issue};
  }catch{return null;}
}
export function officialCoverUrl(raw:string):string|null{
  if(!raw)return null;
  try{
    const u=new URL(raw,'https://www.jw.org');
    if(u.protocol!=='https:'||!['cms-imgp.jw-cdn.org','assetsnffrgf-a.akamaihd.net'].includes(u.hostname)
      ||!u.pathname.includes('/img/p/')&&u.hostname!=='assetsnffrgf-a.akamaihd.net'
      ||u.username||u.password)return null;
    u.hash='';
    return u.toString();
  }catch{return null;}
}
const simplify=(text:string)=>text.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
function downloadText(anchor:HTMLAnchorElement):string{
  const direct=anchor.getAttribute('aria-label')||anchor.textContent||'';
  return simplify(direct)
    .replace(/^(?:Texte\s*)?(?:Options de téléchargement des publications numériques\s*)?/i,'')
    .replace(/^Options de téléchargement des publications numériques\s*/i,'')
    .slice(0,240);
}
const safeReferenceLink=(url:string):string|null=>{
  try{
    const u=new URL(url,'https://www.jw.org');
    return u.protocol==='https:'&&u.hostname==='www.jw.org'&&
      u.pathname.startsWith('/fr/biblioth%C3%A8que/')?u.toString():null;
  }catch{return null;}
};
function candidateImage(node:Element,parsed:{symbol:string;issue:string}):string|null{
  const attrs=['src','data-src','data-srcset','srcset'];
  const images=Array.from(node.querySelectorAll('img'));
  const match=images.map(img=>{
    const variants=attrs.flatMap(attr=>(img.getAttribute(attr)||'').split(','))
      .map(v=>v.trim().split(/\s+/)[0]).filter(Boolean);
    return variants.map(value=>officialCoverUrl(value)).filter((value):value is string=>!!value);
  }).flat().filter(url=>
    url.includes('/img/p/'+parsed.symbol+'/')&&
    (!parsed.issue||url.includes('/'+parsed.issue+'/')));
  return match[0]||null;
}
/** Find the *smallest* publication card containing both the download link and a cover.
 * If JW.org changes its layout, fall back to its official download-link label,
 * rather than showing unrelated artwork or inventing a title.
 */
function cardScope(anchor:HTMLAnchorElement,parsed:{symbol:string;issue:string}):Element{
  let node:Element=anchor;
  for(let steps=0;steps<7&&node.parentElement;steps++){
    const parent=node.parentElement;
    const all=parent.querySelectorAll('a[href*="GETPUBMEDIALINKS"]');
    if(all.length>1)break;
    node=parent;
    if(candidateImage(node,parsed)&&node.querySelector('h3,h4'))break;
  }
  return node;
}
export function parseOfficialCatalogHtml(html:string,section:PublicSection,start=0):OfficialCatalogPage{
  const url=officialPageUrl(section,start);
  if(typeof html!=='string'||html.length>3_000_000)throw Error('Page de catalogue trop volumineuse.');
  const doc=new DOMParser().parseFromString(html,'text/html');
  const links=Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href*="GETPUBMEDIALINKS"]'));
  const allImages=doc.documentElement;
  const list=new Map<string,OfficialCatalogEntry>();
  for(const link of links){
    const parsed=parseOfficialDownloadLink(link.href||link.getAttribute('href')||'');
    if(!parsed)continue;
    const key=parsed.symbol+':'+parsed.issue;
    if(list.has(key))continue;
    const scope=cardScope(link,parsed);
    const near=Array.from(scope.querySelectorAll('h3,h4'))
      .map(e=>simplify(e.textContent||'')).find(Boolean)||'';
    const title=downloadText(link)||near||parsed.symbol;
    const cover=candidateImage(scope,parsed)||candidateImage(allImages,parsed);
    const detail=Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href]')).map(a=>{
      const t=simplify(a.textContent||'');
      return {url:safeReferenceLink(a.href),score:t===title?3:t&&title.includes(t)?1:0};
    }).filter(v=>v.url).sort((a,b)=>b.score-a.score);
    list.set(key,{
      key,symbol:parsed.symbol,issue:parsed.issue,title,coverUrl:cover,
      pageUrl:detail[0]?.url||url,section
    });
  }
  // No unverified "download available" label for a title absent from an official link.
  const results=simplify(doc.body?.textContent||'').match(/R[ée]sultats?\s+\d+\s*[-–]\s*\d+\s+sur\s+(\d+)/i);
  const total=results?Number(results[1]):null;
  const entries=[...list.values()].slice(0,40);
  const nextStart=total!==null?
    (start+OFFICIAL_PAGE_SIZE<total?start+OFFICIAL_PAGE_SIZE:null):
    (entries.length>=OFFICIAL_PAGE_SIZE?start+OFFICIAL_PAGE_SIZE:null);
  return {section,entries,start,total,url,
    nextStart:nextStart!==null&&nextStart<=OFFICIAL_MAX_START?nextStart:null};
}
