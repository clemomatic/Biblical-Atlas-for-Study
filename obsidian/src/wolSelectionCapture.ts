import { cleanWolUrl } from './referenceReader.ts';

export interface WolPageSnapshot {
  title:string;
  url:string;
  paragraphUrl:string;
  selectionText:string;
}
export interface WolCapturedQuote {
  label:string;
  excerpt:string;
  url:string;
  comment:string;
}

/**
 * Reads ONLY title, current URL, selection, and a nearby WOL paragraph anchor.
 * Runs in the already-open native Web viewer, on an explicit user action.
 * Does not collect cookies, browse documents or send any information away.
 */
export const WOL_PAGE_SNAPSHOT_SCRIPT = [
  '(() => {',
  ' const trim = value => typeof value === "string" ? value.replace(/\\s+/g," ").trim().slice(0,180) : "";',
  ' const selection = window.getSelection();',
  ' const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;',
  ' const start = range ? range.startContainer : null;',
  ' const node = start ? (start.nodeType === 1 ? start : start.parentElement) : null;',
  ' const paragraph = node && node.closest ? node.closest("p, [data-pid], .par, .paragraph, li, blockquote") : null;',
  ' const anchors = [];',
  ' if(node && node.closest){const linked = node.closest("a[href]");if(linked)anchors.push(linked);}',
  ' for(const parent of [paragraph, paragraph && paragraph.parentElement]){',
  '   if(!parent || !parent.querySelectorAll)continue;',
  '   const links=parent.querySelectorAll("a[href*=\\"#h=\\"],a[href*=\\"%23h%3D\\"]");',
  '   for(const link of links)anchors.push(link);',
  ' }',
  ' let paragraphUrl="";',
  ' for(const link of anchors){',
  '   try{',
  '     const candidate=new URL(link.getAttribute("href"),window.location.href);',
  '     if(candidate.origin===window.location.origin && /^#h=\\d+$/.test(candidate.hash) &&',
  '        candidate.pathname===window.location.pathname){paragraphUrl=candidate.href;break;}',
  '   }catch{}',
  ' }',
  ' const article=document.querySelector(".bodyTxt h1, article h1, #content h1, main h1");',
  ' const title=trim(article && article.textContent) ||',
  '   trim(document.querySelector("meta[property=\\"og:title\\"]")?.getAttribute("content")) ||',
  '   trim(document.title);',
  ' return {title,url:window.location.href,paragraphUrl,',
  '   selectionText:selection ? selection.toString().trim().slice(0,8000) : ""};',
  '})()'
].join('\n');

function normalized(value:unknown,max=180):string {
  return typeof value==='string' ? value.replace(/\s+/g,' ').trim().slice(0,max):'';
}
export function wolArticleTitle(value:unknown):string {
  let title=normalized(value);
  title=title.replace(/\s+[|—–-]\s+(?:BIBLIOTHÈQUE EN LIGNE Watchtower|Watchtower ONLINE LIBRARY|JW\.ORG).*$/i,'').trim();
  if(!title || /^(?:Bibliothèque en ligne|Publications|Consulter|Rechercher|Page d'accueil|Watchtower Online Library)$/i.test(title))
    return '';
  return title;
}
export function parseWolPageSnapshot(input:unknown):WolPageSnapshot|null {
  if(!input||typeof input!=='object')return null;
  const raw=input as Record<string,unknown>;
  const url=typeof raw.url==='string'?cleanWolUrl(raw.url):null;
  if(!url)return null;
  const para=typeof raw.paragraphUrl==='string'?cleanWolUrl(raw.paragraphUrl):null;
  let paragraphUrl='';
  if(para){
    const parent=new URL(url),anchor=new URL(para);
    // An anchor can only target the current WOL document, never a different page.
    if(parent.origin===anchor.origin&&parent.pathname===anchor.pathname&&
      parent.search===anchor.search&&/^#h=\d+$/.test(anchor.hash))paragraphUrl=para;
  }
  return {
    title:wolArticleTitle(raw.title),
    url,
    paragraphUrl,
    selectionText:typeof raw.selectionText==='string'?raw.selectionText.trim().slice(0,8000):''
  };
}
export function quoteFromWolSelection(snapshot:WolPageSnapshot|null,selected:string,fallbackUrl:string):WolCapturedQuote|null {
  const selection=typeof selected==='string'?selected.trim().slice(0,8000):'';
  if(!selection)return null;
  const url=cleanWolUrl(snapshot?.paragraphUrl||snapshot?.url||fallbackUrl);
  if(!url)return null;
  return {
    label:wolArticleTitle(snapshot?.title)||'Article WOL · titre à compléter',
    excerpt:selection,
    url,
    comment:''
  };
}
export function sourceFromWolPage(snapshot:WolPageSnapshot|null,fallbackUrl:string):WolCapturedQuote|null{
  const url=cleanWolUrl(snapshot?.url||fallbackUrl);
  if(!url)return null;
  return {
    label:wolArticleTitle(snapshot?.title)||'Article WOL · titre à compléter',
    excerpt:'',url,comment:''
  };
}
