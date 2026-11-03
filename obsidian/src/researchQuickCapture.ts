import { cleanWolUrl } from './referenceReader.ts';

/** Values obtained only after the user explicitly clicks Capture/Clipboard. */
export interface QuickCaptureCandidate {
  label:string;
  url:string;
  excerpt:string;
  comment:string;
}

const bounded=(value:string,max:number):string=>value.replace(/\r\n?/g,'\n').trim().slice(0,max);
const singleLine=(value:string,max:number):string=>value.replace(/\s+/g,' ').trim().slice(0,max);
export function wolSourceLabel(raw:string):string{
  const valid=cleanWolUrl(raw);
  if(!valid)return 'Source WOL à identifier';
  const url=new URL(valid);
  const query=url.searchParams.get('q')?.trim();
  if(query)return 'Recherche WOL · '+singleLine(query,90);
  const document=/\/d\/r30\/lp-f\/(\d+)$/.exec(url.pathname);
  if(document)return 'Document WOL · '+document[1];
  const verse=/\/b\/r30\/lp-f\/nwt\/(\d+)\/(\d+)$/.exec(url.pathname);
  if(verse)return 'Bible WOL · livre '+verse[1]+' chapitre '+verse[2];
  return 'Page WOL à identifier';
}

/**
 * WOL is not scraped: classify the clipboard only after a user action.
 * A single official URL is a source, while all other text is an excerpt.
 * Never treat an untrusted URL as a WOL link.
 */
export function quickCaptureCandidate(
  clipboard:string,preferredUrl?:string|null
):QuickCaptureCandidate|null{
  const text=bounded(clipboard,8000);
  const direct=/^https:\/\/\S+$/i.test(text)?cleanWolUrl(text):null;
  const url=direct|| (preferredUrl?cleanWolUrl(preferredUrl):null)||'';
  if(!text&&!url)return null;
  const excerpt=direct?'':text;
  const label=excerpt?singleLine(excerpt,110):wolSourceLabel(url);
  return {label:label||wolSourceLabel(url),url,excerpt,comment:''};
}
