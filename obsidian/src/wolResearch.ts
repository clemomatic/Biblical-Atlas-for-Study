import { cleanReadingText } from './readerText.ts';
/** Recherche documentaire sur les pages officielles WOL / JW.org.
 * Pas d'API privée, de proxy tiers, ni d'index personnel envoyé au réseau.
 * Le HTML WOL peut évoluer : une liste vide doit toujours proposer le site.
 */
import { cleanWolUrl } from './referenceReader.ts';

export type WolMatchMode='par'|'sen';
export type WolSearchScope='all'|'index'|'guide';
export interface WolSearchOptions {match:WolMatchMode;scope:WolSearchScope}
export interface WolSearchHit {title:string;url:string;excerpt:string;collection?:'index'|'guide'|'other'}
export const MAX_WOL_RESULTS=25;
export const JW_STUDY_TOOLS='https://www.jw.org/fr/la-bible-et-vous/outils-etude-bible/';

export function wolResearchUrl(query:string,options:WolSearchOptions):string {
 const q=query.trim().slice(0,250);
 if(!q)throw Error('Saisis un sujet ou une expression.');
 const params=new URLSearchParams();
 params.set('q',q);
 params.set('p',options.match==='sen'?'sen':'par');
 // WOL groups Index and Guide de recherche under the official Index category.
 if(options.scope==='index'||options.scope==='guide')params.append('fc[]','dx');
 return 'https://wol.jw.org/fr/wol/s/r30/lp-f?'+params.toString();
}
export function jwOrgResearchUrl(query:string):string {
 const q=query.trim().slice(0,250);
 if(!q)throw Error('Saisis un sujet ou une expression.');
 return 'https://www.jw.org/fr/rechercher/?'+new URLSearchParams({q}).toString();
}
const compact=(v:string,max=220)=>cleanReadingText(v).slice(0,max);
function officialResultHref(href:string,base:string):string|null {
 try {
  const safe=cleanWolUrl(new URL(href,base).toString());
  return safe && /^(?:\/fr\/wol\/d\/r30\/lp-f\/\d+|\/fr\/wol\/pc\/r30\/lp-f\/\d+\/\d+\/\d+\/?$)/.test(new URL(safe).pathname)?safe:null;
 }catch{return null;}
}
/** Parse links only: never insert HTML returned by WOL into the Obsidian DOM. */
export function parseWolSearchResults(html:string,requestedUrl:string):WolSearchHit[] {
 const doc=new DOMParser().parseFromString(html,'text/html');
 for(const node of [...doc.querySelectorAll('script,style,noscript,nav,footer,header,form')])node.remove();
 const roots=[...doc.querySelectorAll('#lookupResults,.lookupResults,.searchResults,.search-results,#searchResults,#results,.resultList,main,#content')];
 if(!roots.includes(doc.body))roots.push(doc.body);
 const seen=new Set<string>(),hits:WolSearchHit[]=[];
 for(const root of roots){
  for(const link of root.querySelectorAll<HTMLAnchorElement>('a[href]')){
   const url=officialResultHref(link.getAttribute('href')||'',requestedUrl);
   if(!url||seen.has(url))continue;
   const item=link.closest('li,article,.result,.searchResult,.search-result,.item')||link.parentElement;
   const heading=item?.querySelector('h2,h3,h4');
   const title=compact(link.textContent||heading?.textContent||link.getAttribute('title')||'',170);
   if(title.length<4||/^(?:image|imprimer|précédent|suivant|sommaire|ouvrir|lire|écouter|watchtower)$/i.test(title))continue;
   let excerpt='';
   if(item){
    const surrounding=compact(item.textContent||'',400);
    const small=surrounding.replace(title,'').trim();
    if(small.length>14)excerpt=compact(small,190);
   }
   // Labels from the same result entry are authoritative only when explicit.
   // Do not infer a Guide result from a matched keyword in an article excerpt.
   // item.textContent may concatenate an article title and its series code:
   // <a>Compassion</a><p>rsg19 — Guide de recherche</p> -> Compassionrsg19.
   // Read metadata nodes independently and use official series designators.
   const metadata=compact(item
      ?[...item.querySelectorAll('p,small,span,.publication,.pubTitle')]
        .map(node=>node.textContent||'').join(' ')
      :'',
      700);
   const collection:WolSearchHit['collection']=/(?:^|[^a-z0-9])rsg(?:\d{2})?\b|\bguide de recherche(?:\s|\(|,|$)/i.test(metadata)
      ?'guide'
      :/(?:^|[^a-z0-9])dx(?:\d{2}[-–]\d{2})?\b|\bindex \d{4}[-–]\d{4}\b/i.test(metadata)
      ?'index':'other';
   seen.add(url);hits.push({title,url,excerpt,collection});
   if(hits.length>=MAX_WOL_RESULTS)return hits;
  }
  // Prefer a dedicated result root when it contains matches, but permit
  // a document-wide fallback if the named result shell is empty.
  if(hits.length)break;
 }

 return hits;
}
