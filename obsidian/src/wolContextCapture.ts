import { Menu, Notice, type App, type ItemView } from 'obsidian';
import { trustedWolBrowserUrl } from './wolWebViewer';
import {
  WOL_PAGE_SNAPSHOT_SCRIPT,parseWolPageSnapshot,quoteFromWolSelection,
  type WolPageSnapshot,type WolCapturedQuote
} from './wolSelectionCapture';

interface WolContextMenuParams {
  x:number;
  y:number;
  pageURL:string;
  frameURL?:string;
  selectionText:string;
  isEditable?:boolean;
}
type WebviewElement = HTMLElement&{
  getURL?:()=>string;
  executeJavaScript?:(script:string,userGesture?:boolean)=>Promise<unknown>;
};
type WolContextEvent = Event&{params?:WolContextMenuParams};

/**
 * Obsidian's core Web viewer uses Electron <webview> on desktop.
 * Listen for its native context-menu event; never inject a content script,
 * touch credentials or attach to external pages.
 */
export class WolContextCaptureBridge {
  private observer:MutationObserver|null=null;
  private handlers=new Map<WebviewElement,EventListener>();
  private active=true;
  constructor(
    private app:App,
    private onCapture:(capture:WolCapturedQuote)=>Promise<void>
  ){}

  start():void{
    this.active=true;
    this.scan();
    if(typeof MutationObserver==='undefined')return;
    this.observer=new MutationObserver(changes=>{
      if(changes.some(change=>[...change.addedNodes].some(node=>
        node.nodeType===1 && ((node as Element).tagName==='WEBVIEW'||
          (node as Element).querySelector('webview')!==null))))this.scan();
    });
    this.observer.observe(document.body,{subtree:true,childList:true});
  }
  stop():void{
    this.active=false;
    this.observer?.disconnect();
    this.observer=null;
    for(const [webview,handler] of this.handlers)
      webview.removeEventListener('context-menu',handler,true);
    this.handlers.clear();
  }
  scan():void{
    if(!this.active)return;
    const stillPresent=new Set<WebviewElement>();
    for(const leaf of this.app.workspace.getLeavesOfType('webviewer')){
      for(const node of (leaf.view as ItemView).containerEl.querySelectorAll('webview')){
        const webview=node as WebviewElement;
        stillPresent.add(webview);
        if(this.handlers.has(webview))continue;
        const listener:EventListener=(event)=>this.onContextMenu(event as WolContextEvent,webview);
        webview.addEventListener('context-menu',listener,true);
        this.handlers.set(webview,listener);
      }
    }
    for(const [node,listener] of this.handlers){
      if(stillPresent.has(node))continue;
      node.removeEventListener('context-menu',listener,true);
      this.handlers.delete(node);
    }
  }
  private associatedUrl(node:WebviewElement):string|null{
    const actual=typeof node.getURL==='function'?node.getURL():'';
    const trusted=trustedWolBrowserUrl(actual);
    if(trusted)return trusted;
    for(const leaf of this.app.workspace.getLeavesOfType('webviewer')){
      if(!(leaf.view as ItemView).containerEl.contains(node))continue;
      const state=leaf.view.getState() as {url?:unknown};
      if(typeof state?.url==='string')return trustedWolBrowserUrl(state.url);
    }
    return null;
  }
  async readPage(requestedUrl?:string|null):Promise<WolPageSnapshot|null>{
    this.scan();
    const requested=requestedUrl?trustedWolBrowserUrl(requestedUrl):null;
    const webviews=[...this.handlers.keys()];
    const target=requested
      ?webviews.find(view=>{
        const url=this.associatedUrl(view);
        if(!url)return false;
        const a=new URL(url),b=new URL(requested);
        return a.origin===b.origin&&a.pathname===b.pathname&&a.search===b.search;
      })
      :webviews.find(view=>!!this.associatedUrl(view));
    if(!target||typeof target.executeJavaScript!=='function')return null;
    try{
      const result=await target.executeJavaScript(WOL_PAGE_SNAPSHOT_SCRIPT,true);
      const parsed=parseWolPageSnapshot(result);
      if(!parsed)return null;
      if(requested){
        const a=new URL(parsed.url),b=new URL(requested);
        if(a.origin!==b.origin||a.pathname!==b.pathname||a.search!==b.search)return null;
      }
      return parsed;
    }catch{return null;}
  }
  private onContextMenu(event:WolContextEvent,webview:WebviewElement):void{
    const params=event.params;
    const page=typeof params?.pageURL==='string'?trustedWolBrowserUrl(params.pageURL):null;
    if(!page||params?.isEditable||typeof params?.selectionText!=='string')return;
    const selected=params.selectionText.trim().slice(0,8000);
    if(!selected)return;
    // A foreign iframe inside a WOL document must not be clipped as WOL.
    if(params.frameURL&&!trustedWolBrowserUrl(params.frameURL))return;
    // The native Chromium event is handled only for explicit WOL selections.
    event.preventDefault();
    event.stopImmediatePropagation();
    const snapshotPromise=this.readPage(page);
    const menu=new Menu();
    menu.addItem(item=>item
      .setTitle('Bible Lab · Garder cette portion')
      .setIcon('bookmark-plus')
      .onClick(()=>{void this.captureSelection(page,selected,snapshotPromise);}));
    const rect=webview.getBoundingClientRect();
    const x=Math.round(rect.left+(Number.isFinite(params.x)?params.x:0));
    const y=Math.round(rect.top+(Number.isFinite(params.y)?params.y:0));
    menu.showAtPosition({x,y});
  }
  private async captureSelection(pageUrl:string,selected:string,
    snapshotPromise:Promise<WolPageSnapshot|null>):Promise<void>{
    const snapshot=await snapshotPromise;
    const quote=quoteFromWolSelection(snapshot,selected,pageUrl);
    if(!quote){new Notice('La portion sélectionnée ne correspond pas à une page WOL officielle.');return;}
    try{await this.onCapture(quote);}
    catch{new Notice('Impossible de conserver cette citation.');}
  }
}
