/** Recherche documentaire sur les pages officielles WOL / JW.org.
 * Pas d'API privée, de proxy tiers, ni d'index personnel envoyé au réseau.
 * Le HTML WOL peut évoluer : une liste vide doit toujours proposer le site.
 */
import { cleanWolUrl } from './referenceReader.ts';
import { wolPrefix,wolRoute,WOL_LANGUAGES,type BibleLabLanguage } from './researchPreferences.ts';

export type WolMatchMode='par'|'sen';
export type WolSearchScope='all'|'index';
export interface WolSearchOptions {match:WolMatchMode;scope:WolSearchScope;language?:BibleLabLanguage}
export interface WolSearchHit {title:string;url:string;excerpt:string}
export const MAX_WOL_RESULTS=25;
export const JW_STUDY_TOOLS='https://www.jw.org/fr/la-bible-et-vous/outils-etude-bible/';

export function wolResearchUrl(query:string,options:WolSearchOptions):string {
 const q=query.trim().slice(0,250);
 if(!q)throw Error('Saisis un sujet ou une expression.');
 const params=new URLSearchParams();
 params.set('p',options.match==='sen'?'sen':'par');
 params.set('q',q);
 params.set('r','occ');
 params.set('st','g');
 if(options.scope==='index')params.append('fc[]','dx');
 return wolPrefix(options.language)+'s/'+wolRoute(options.language)+'?'+params.toString();
}
export function jwOrgResearchUrl(query:string,language:BibleLabLanguage='fr'):string {
 const q=query.trim().slice(0,250);
 if(!q)throw Error('Saisis un sujet ou une expression.');
 return 'https://www.jw.org/'+language+'/'+WOL_LANGUAGES[language].org+'/?'+new URLSearchParams({q}).toString();
}
const compact=(v:string,max=220)=>v.replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function officialResultHref(href:string,base:string):string|null {
 try {
  const safe=cleanWolUrl(new URL(href,base).toString());
  return safe && /^\/(?:fr|en|pt|es)\/wol\/d\/r\d+\/lp-[a-z]\/\d+/.test(new URL(safe).pathname)?safe:null;
 }catch{return null;}
}
/** Parse links only: never insert HTML returned by WOL into the Obsidian DOM. */
export function parseWolSearchResults(html:string,requestedUrl:string):WolSearchHit[] {
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const node of [...doc.querySelectorAll('script,style,noscript,nav,footer,header,form')])node.remove();
 const root=doc.querySelector('.searchResults,.search-results,#searchResults,#results,main,#content')||doc.body;
 const seen=new Set<string>(),hits:WolSearchHit[]=[];
 for(const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const url=officialResultHref(link.getAttribute('href')||'',requestedUrl);
  if(!url||seen.has(url))continue;
  const title=compact(link.textContent||'',170);
  if(title.length<4||/^(?:image|imprimer|précédent|suivant|sommaire|ouvrir|lire|écouter|watchtower)$/i.test(title))continue;
  const item=link.closest('li,article,.result,.searchResult,.search-result,.item')||link.parentElement;
  let excerpt='';
  if(item){
   // Keep only context from the matching item, not the whole results page.
   const small=compact(item.textContent||'',320);
   if(small.length>title.length+25 && small.length<320)excerpt=compact(small.replace(title,''),190);
  }
  seen.add(url);hits.push({title,url,excerpt});
  if(hits.length>=MAX_WOL_RESULTS)break;
 }
 return hits;
}
