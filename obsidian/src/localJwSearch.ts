/** Offline search over notes explicitly imported from a JW Library backup.
 * This file never fetches or transmits user note content.
 */
import { normalizeSearch } from './bibleLabData.ts';

export interface LocalJwHit {path:string;title:string;excerpt:string}
const normalize=(v:string)=>normalizeSearch(v.replace(/<[^>]+>/g,' ').replace(/[\r\n\t]+/g,' '));

export function parseImportedJwNote(path:string,markdown:string,query:string):LocalJwHit|null{
 if(!path.toLowerCase().includes('/imports/'))return null;
 if(!/^---\s*\n[\s\S]*?^bible_lab_kind:\s*jw-library-note\s*$/m.test(markdown))return null;
 const closing=markdown.indexOf('\n---',4);
 if(closing<0)return null;
 const front=markdown.slice(0,closing);
 const titleRaw=front.match(/^title:\s*(.+)$/m)?.[1]||'';
 let title='';
 try{title=String(JSON.parse(titleRaw));}catch{title=titleRaw.replace(/^["']|["']$/g,'');}
 const needle=normalize(query.trim()).slice(0,180);
 if(!needle)return null;
 const body=markdown.slice(closing+4).replace(/<!--[\s\S]*?-->/g,'').trim();
 const full=normalize(title+' '+body);
 if(!full.includes(needle))return null;
 const titleMatch=normalize(title).includes(needle);
 const preview=body.replace(/[#*_\`>\[\]()]/g,' ').replace(/\s+/g,' ').trim();
 const previewText=preview.length>210?preview.slice(0,207)+'…':preview;
 return {path,title:title||path.split('/').pop()||'Note importée',excerpt:titleMatch?previewText:previewText};
}
export function findImportedJwNotes(
 entries:readonly {path:string;markdown:string}[],query:string,max=30
):LocalJwHit[]{
 const results:LocalJwHit[]=[];
 for(const {path,markdown} of entries){
  const hit=parseImportedJwNote(path,markdown,query);
  if(hit)results.push(hit);
  if(results.length>=max)break;
 }
 return results;
}
