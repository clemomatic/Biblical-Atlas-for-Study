/**
 * Fallback for WOL searches whose initial HTTP response contains only a
 * navigation/JavaScript shell. Obsidian's desktop core Web viewer runs the
 * actual WOL page in an isolated Chromium <webview>, so it can show the search
 * even when requestUrl cannot read the dynamically rendered result list.
 *
 * Only public WOL search URLs are loaded. We extract bounded HTML from the
 * rendered WOL page and reuse the existing text-only, official-link parser.
 * No note content, credentials, vault information or remote scripts are
 * injected into the plugin DOM.
 */
import { type App, Platform, type WorkspaceLeaf } from 'obsidian';
import { isWolAccessChallenge, parseWolSearchResults, type WolSearchHit } from './wolResearch';

interface WolWebview extends HTMLElement {
  executeJavaScript: (script:string,userGesture?:boolean)=>Promise<unknown>;
}
interface RenderedPage {url:string; html:string; status:string;}
export interface BrowserWolSearch {
  hits:WolSearchHit[];
  html:string;
  url:string;
  /** WOL remains open in an Obsidian Web viewer tab for manual use. */
  browserOpen:boolean;
  /** Whether the desktop native Web viewer was actually available. */
  available:boolean;
}
export const WOL_WEBVIEW_SEARCH_TIMEOUT_MS=14000;

/**
 * Run only on the origin and search route selected by Bible Lab.
 * Use a constant script: never interpolate the user's query into JavaScript.
 * Return bounded HTML for parsing; we DO NOT execute returned HTML.
 */
export const WOL_RENDERED_SEARCH_SNAPSHOT=String.raw`(() => {
  const path=location.pathname;
  if(location.protocol!=='https:'||location.hostname!=='wol.jw.org'||
     !/^\/fr\/wol\/(?:s|l)\/r30\/lp-f\/?$/.test(path))
    return {url:location.href,html:'',status:'unexpected-location'};
  const selectors='ul.resultContentTopic,ul.resultContentDocument';
  const blocks=Array.from(document.querySelectorAll(selectors)).slice(0,120);
  const html=blocks.length
    ? '<main id="results">'+
      (document.querySelector('#resultsCount')?.outerHTML||'')+
      blocks.map(node=>node.outerHTML).join('')+'</main>'
    : (document.querySelector('#results,#searchResults,.searchResults,.resultList,main')?.outerHTML||'');
  return {url:location.href,html:html.slice(0,900000),
    status:blocks.length?'results':'waiting'};
})()`;

function trustedSearchUrl(raw:string):boolean{
  try{
    const url=new URL(raw);
    return url.protocol==='https:'&&url.hostname==='wol.jw.org'&&
      /^\/fr\/wol\/(?:s|l)\/r30\/lp-f\/?$/.test(url.pathname);
  }catch{return false;}
}
function snapshot(value:unknown):RenderedPage|null{
  if(!value||typeof value!=='object')return null;
  const data=value as Record<string,unknown>;
  if(typeof data.url!=='string'||!trustedSearchUrl(data.url)||
     typeof data.html!=='string'||typeof data.status!=='string')return null;
  return {url:data.url,html:data.html.slice(0,900000),status:data.status};
}
const nap=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

/**
 * Opening the official WOL page in a real browser tab is the deterministic
 * fallback. If the rendered results become available we import safe links and
 * close our temporary tab, restoring the user's previous Obsidian view.
 * Otherwise leave the official WOL tab open: the search is still usable.
 */
export async function searchRenderedWolInObsidian(
  app:App,requestedUrl:string,stale:()=>boolean
):Promise<BrowserWolSearch>{
  const empty:BrowserWolSearch={hits:[],html:'',url:requestedUrl,browserOpen:false,available:false};
  if(Platform?.isMobile||!trustedSearchUrl(requestedUrl)||stale())return empty;
  const previous=app.workspace.activeLeaf;
  let leaf:WorkspaceLeaf|undefined;
  let opened=false;
  try{
    leaf=app.workspace.getLeaf('tab');
    await leaf.setViewState({type:'webviewer',state:{url:requestedUrl,navigate:true},active:true});
    // When Web viewer core plugin is switched off, Obsidian cannot construct
    // this view. Never pretend it is showing real results.
    if(leaf.view.getViewType()!=='webviewer'){
      leaf.detach();
      return empty;
    }
    opened=true;
    await app.workspace.revealLeaf(leaf);
    const started=Date.now();
    while(!stale()&&Date.now()-started<WOL_WEBVIEW_SEARCH_TIMEOUT_MS){
      const node=leaf.view.containerEl.querySelector('webview') as WolWebview|null;
      if(node&&typeof node.executeJavaScript==='function'){
        try{
          const result=snapshot(await node.executeJavaScript(WOL_RENDERED_SEARCH_SNAPSHOT,false));
          if(result){
            if(isWolAccessChallenge(result.html))break;
            const hits=parseWolSearchResults(result.html,result.url);
            if(hits.length){
              leaf.detach();
              opened=false;
              if(previous&&previous!==leaf)await app.workspace.revealLeaf(previous);
              return {hits,html:result.html,url:result.url,browserOpen:false,available:true};
            }
          }
        }catch{
          // The <webview> is usually not ready until its first dom-ready.
          // A transient Electron error is not a failed search.
        }
      }
      await nap(450);
    }
    if(stale()){
      leaf.detach();
      return empty;
    }
    return {hits:[],html:'',url:requestedUrl,browserOpen:true,available:true};
  }catch{
    // If WOL opened correctly, keep it usable rather than dismissing it.
    return {hits:[],html:'',url:requestedUrl,browserOpen:opened,available:opened};
  }
}
