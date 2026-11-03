/**
 * Build canonical official WOL research URLs for Obsidian's native Web viewer.
 *
 * The WOL website owns results, navigation, pagination, category matching
 * and article presentation. Bible Lab does not scrape or duplicate them.
 * We only encode the query and the user's explicitly selected filters.
 */
export type WolMatchMode='par'|'sen';
export type WolSearchScope='all'|'index'|'guide'|'perspicace';
export interface WolSearchOptions {
  match:WolMatchMode;
  scope:WolSearchScope;
  page?:number;
}

export function wolResearchUrl(query:string,options:WolSearchOptions):string{
  const q=query.trim().slice(0,250);
  if(!q)throw Error('Saisis un sujet ou une expression.');
  const params=new URLSearchParams();
  params.set('q',q);
  params.set('p',options.match==='sen'?'sen':'par');
  params.set('r','occ');
  params.set('st','a');
  // WOL's category code "dx" groups the Index and Research Guide.
  if(options.scope==='index'||options.scope==='guide')params.append('fc[]','dx');
  if(options.scope==='perspicace')params.append('fc[]','it');
  const page=Math.floor(options.page||1);
  if(page>1)params.set('pg',String(Math.min(page,100)));
  return 'https://wol.jw.org/fr/wol/s/r30/lp-f?'+params.toString();
}

export function jwOrgResearchUrl(query:string):string{
  const q=query.trim().slice(0,250);
  if(!q)throw Error('Saisis un sujet ou une expression.');
  return 'https://www.jw.org/fr/rechercher/?'+new URLSearchParams({q}).toString();
}
