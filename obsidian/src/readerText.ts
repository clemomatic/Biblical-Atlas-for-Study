/**
 * Render official biblical text as clean reading text, not a flattened HTML
 * widget tree. HTML never reaches the Obsidian reader as markup.
 */
/**
 * WOL/JW.org can contain doubly encoded HTML entities such as "&amp;nbsp;"
 * in a text node. Decode *text only*: no remote markup is injected into UI.
 * A colon sometimes appears in pasted references instead of the final
 * semicolon ("&nbsp:") and should also be treated as a space.
 */
const ENTITIES:Record<string,string>={
 amp:'&',nbsp:' ',thinsp:' ',ensp:' ',emsp:' ',shy:'',
 quot:'"',apos:"'",lt:'<',gt:'>',hellip:'…',
 ndash:'–',mdash:'—',laquo:'«',raquo:'»',
 lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',
 agrave:'à',aacute:'á',acirc:'â',eacute:'é',egrave:'è',
 ecirc:'ê',euml:'ë',icirc:'î',iuml:'ï',ocirc:'ô',
 ugrave:'ù',ucirc:'û',ccedil:'ç'
};
export function decodeReadingEntities(value:string):string {
 let result=value;
 for(let round=0;round<4;round++){
  const next=result.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]+)[;:]?/gi,(whole,entity:string)=>{
   const name=entity.toLowerCase();
   if(Object.prototype.hasOwnProperty.call(ENTITIES,name))return ENTITIES[name];
   if(name.startsWith('#')){
    const hex=name.startsWith('#x'),digits=name.slice(hex?2:1);
    const number=parseInt(digits,hex?16:10);
    if(Number.isInteger(number)&&number>0&&number<=0x10ffff&&!(number>=0xd800&&number<=0xdfff))
      return String.fromCodePoint(number);
   }
   return whole;
  });
  if(next===result)break;
  result=next;
 }
 return result;
}
export function cleanReadingText(value:string):string {
 return decodeReadingEntities(value)
  .replace(/\\u(?:00a0|202f|200b|2060)/gi,' ')
  .replace(/[\u00a0\u202f\u2000-\u200a\u205f\u3000]/g,' ')
  .replace(/[\u200b-\u200d\u2060\ufeff\u00ad]/g,'')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
  .replace(/\s+/g,' ').trim();
}

const NOISE='script,style,noscript,svg,iframe,form,button,[aria-hidden="true"],[hidden]';
const VERSE_MARKERS=[
 'sup','[data-fnid]','[data-xref]','[class~="fn"]',
 '[class~="fnRef"]','[class~="xref"]','[class~="xrefRef"]',
 '[class~="vNum"]','[class~="verseNum"]','[class~="chapNum"]',
 '[class~="parNum"]','[class~="footnoteRef"]',
 'a[href^="#fn"]','a[href^="#xref"]',
 '[role="doc-noteref"]'
].join(',');
// A note body may itself contain a wrapper with class "fn" or "xref".
// Remove its citation markers, never the body of the note.
const NOTE_MARKERS=[
 'sup','[class~="fnRef"]','[class~="xrefRef"]',
 '[class~="verseNum"]','[class~="footnoteRef"]',
 '[role="doc-noteref"]'
].join(',');
export function readableOfficialElement(element:Element,mode:'verse'|'note'|'article'='article',max=12000):string {
 const node=element.cloneNode(true) as Element;
 for(const item of [...node.querySelectorAll(NOISE)])item.remove();
 if(mode==='verse'||mode==='note'){
  const markers=mode==='verse'?VERSE_MARKERS:NOTE_MARKERS;
  for(const item of [...node.querySelectorAll(markers)])item.remove();
 }
 // Paragraph boundaries are preserved in the source; for one verse all line
 // breaks become regular spaces instead of rendering literal HTML artifacts.
 for(const br of [...node.querySelectorAll('br')])br.replaceWith(' ');
 return cleanReadingText(node.textContent||'').slice(0,max);
}
export function readableOfficialHtml(html:string,mode:'verse'|'note'|'article'='verse'):string {
 const doc=new DOMParser().parseFromString(html,'text/html');
 return readableOfficialElement(doc.body,mode);
}
/** Ignore verse/footnote marker IDs, keep a genuine word or expression. */
export function meaningfulNoteSource(html:string|undefined):string {
 if(!html)return '';
 const source=readableOfficialHtml(html,'note');
 return /^[+*†‡\da-z]$/i.test(source)||/^(?:note|renvoi|verset)\s*\d+$/i.test(source)||/^\d{1,3}:\d{1,3}$/.test(source)||/^\d{6,}$/.test(source)?'':source.slice(0,110);
}
