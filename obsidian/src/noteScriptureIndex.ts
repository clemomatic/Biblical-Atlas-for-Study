import {findScriptureMentions,parseScripture,normalizeSearch,type ScriptureRef} from './bibleLabData.ts';
import {markdownCitationScanText} from './markdownCitationScan.ts';

export interface NoteScriptureOccurrence {
  path:string;title:string;line:number;from:number;to:number;heading:string;
  idea:string;label:string;ref:ScriptureRef;
}
function cleanIdea(raw:string):string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'')
    .replace(/^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)?/,'')
    .replace(/[\[\]*_!]/g,'').replace(/\(\s*[;,:\s]*\)/g,'').replace(/\s+/g,' ').replace(/\s+([.,;:!?])/g,'$1').trim();
}
/** Source positions stay attached to occurrences, including repeated verses.
 * An idea is nearby author text, never a generated interpretation of a verse.
 */
export function noteScriptures(path:string,title:string,markdown:string):NoteScriptureOccurrence[] {
  const result:NoteScriptureOccurrence[]=[];
  let yaml=false,fence='',comment=false,heading='',previous='';
  for(const [line,raw] of markdown.split('\n').entries()){
    if(line===0&&raw.trim()==='---'){yaml=true;continue;}
    if(yaml){if(/^(---|\.\.\.)\s*$/.test(raw))yaml=false;continue;}
    const marker=/^\s*(`{3,}|~{3,})/.exec(raw);
    if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence='';continue;}
    if(fence)continue;
    let text=raw.replace(/`[^`]*`/g,m=>' '.repeat(m.length));
    text=text.replace(/<!--[\s\S]*?-->/g,m=>' '.repeat(m.length));
    if(comment){const end=text.indexOf('-->');if(end<0)continue;text=' '.repeat(end+3)+text.slice(end+3);comment=false;}
    const start=text.indexOf('<!--');if(start>=0){comment=true;text=text.slice(0,start);}
    if(/^\s*#{1,6}\s+/.test(text))heading=cleanIdea(text);
    const scan=markdownCitationScanText(text);
    const mentions=findScriptureMentions(scan);
    // Retain only a linked label, never references inside an URL.
    const visible=mentions.filter(m=>!(/https?:\/\/\S*$/.test(text.slice(0,m.from))));
    let ideaText=text;
    // Remove complete Markdown links to citations before trimming their punctuation.
    ideaText=ideaText.replace(/\[([^\]]+)\]\([^)]*\)/g,(full,label)=>parseScripture(label)?' '.repeat(full.length):full);
    for(const m of [...visible].reverse())ideaText=ideaText.slice(0,m.from)+' '.repeat(m.to-m.from)+ideaText.slice(m.to);
    const idea=cleanIdea(ideaText)||previous;
    for(const m of visible)result.push({path,title,line,from:m.from,to:m.to,heading,
      idea:idea.slice(0,800),label:m.ref.label,ref:m.ref});
    if(text.trim())previous=cleanIdea(text);else previous='';
  }
  return result;
}
function intervals(ref:ScriptureRef):Array<[number,number]> {
  if(ref.endChapter)return [[ref.chapter*1000+ref.verse,ref.endChapter*1000+(ref.endVerse||ref.verse)]];
  if(ref.verses)return ref.verses.map(v=>[ref.chapter*1000+v,ref.chapter*1000+v]);
  return [[ref.chapter*1000+ref.verse,ref.chapter*1000+(ref.endVerse||ref.verse)]];
}
export function scripturesOverlap(a:ScriptureRef,b:ScriptureRef):boolean {
  return a.book===b.book&&intervals(a).some(([s,e])=>intervals(b).some(([u,v])=>s<=v&&u<=e));
}
export function findNoteScriptures(items:NoteScriptureOccurrence[],query:string):NoteScriptureOccurrence[] {
  const reference=parseScripture(query.trim());
  if(reference)return items.filter(o=>scripturesOverlap(reference,o.ref));
  const words=normalizeSearch(query).split(/\s+/).filter(Boolean);
  return words.length?items.filter(o=>words.every(w=>normalizeSearch(o.idea+' '+o.title+' '+o.heading+' '+o.label).includes(w))):[];
}
