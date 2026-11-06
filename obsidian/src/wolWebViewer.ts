/**
 * JW Study Desk opens WOL in Obsidian's OWN core Web viewer, not in a
 * reconstructed plugin view. Chromium runs WOL scripts, navigation and search
 * natively, with back/forward, page links and Obsidian's Reader mode.
 *
 * The plugin does not read cookies, inject scripts into WOL, or scrape
 * search results. User data never goes into a WOL URL; only explicit searches
 * and selected official references are sent to the site.
 */
import { Notice, Platform, type App, type WorkspaceLeaf } from 'obsidian';
import { cleanWolUrl } from './referenceReader';

export const WOL_NATIVE_WEB_VIEW='webviewer';
export const WOL_HOME='https://wol.jw.org/fr/wol/h/r30/lp-f';

/** Only WOL's own French pages, no jw.org lookalikes, javascript: or userinfo. */
export function trustedWolBrowserUrl(input:string):string|null{
  const clean=cleanWolUrl(input);
  if(!clean)return null;
  try{
    const url=new URL(clean);
    return url.protocol==='https:'&&url.hostname==='wol.jw.org'&&
      /^\/fr\/wol\/[a-z]+\//.test(url.pathname) ? clean : null;
  }catch{return null;}
}
export function isWolViewerLeaf(leaf:WorkspaceLeaf|null|undefined):leaf is WorkspaceLeaf {
  return !!leaf&&leaf.view?.getViewType()==='webviewer';
}

/**
 * Reuse is reserved for a leaf created by THIS plugin's search; unrelated
 * web-viewer tabs must never be hijacked when the sidebar runs a new search.
 * If the core Web viewer is disabled, recover gracefully with the official
 * site in the default browser.
 */
export async function openWolInObsidian(
  app:App,requestedUrl:string,reuse?:WorkspaceLeaf|null
):Promise<WorkspaceLeaf|null>{
  const url=trustedWolBrowserUrl(requestedUrl);
  if(!url){
    new Notice('JW Study Desk ouvre uniquement des pages WOL officielles.');
    return null;
  }
  if(Platform?.isMobile){
    window.open(url,'_blank','noopener,noreferrer');
    new Notice('La visionneuse web native est disponible sur Obsidian pour ordinateur.');
    return null;
  }
  const previous=isWolViewerLeaf(reuse) && app.workspace.getLeavesOfType(WOL_NATIVE_WEB_VIEW).includes(reuse)
    ?reuse:null;
  const leaf=previous||app.workspace.getLeaf('tab');
  try{
    await leaf.setViewState({type:WOL_NATIVE_WEB_VIEW,active:true,state:{url,navigate:true}});
    if(!isWolViewerLeaf(leaf))throw Error('Module Visionneuse web indisponible.');
    await app.workspace.revealLeaf(leaf);
    return leaf;
  }catch{
    // Never detach a tab that existed before our attempt.
    if(!previous)leaf.detach();
    new Notice('Active le module principal « Visionneuse web » d’Obsidian. Ouverture dans le navigateur par défaut.');
    window.open(url,'_blank','noopener,noreferrer');
    return null;
  }
}
