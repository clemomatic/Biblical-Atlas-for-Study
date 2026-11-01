/** Consistent WOL bibliography handling; no document-specific exceptions.
 * Text normalization is for matching only: lookup URLs preserve the original query.
 */
export function isBibliographicCitation(raw:string):boolean {
 const value=raw.normalize('NFC').replace(/[\u00a0\u202f]/g,' ').trim();
 return /^(?:w\d{2}(?:\.\d{1,2})?|g\d{2}|mwb\d{2}|it-\d|km\d{2}|cl|lff|nwt)\b/i.test(value);
}
export function normalizeBibliographicText(raw:string):string{
 return raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('fr').replace(/[\u00a0\u202f]/g,' ')
  .replace(/[\u2010-\u2015\u2212]/g,'-')
  .replace(/\bp\s*\.\s*(\d)/gi,'p $1')
  .replace(/\bp\s+(\d{1,3})\s*-\s*(\d{1,3})/gi,'p $1-$2')
  .replace(/\s+/g,' ').trim();
}
/** Recognize an exact bibliographic citation inside a result row.
 * A partial match on only the month or year must not select an arbitrary article.
 */
export function isExactBibliographicResult(reference:string,resultText:string):boolean{
 if(!isBibliographicCitation(reference))return false;
 const wanted=normalizeBibliographicText(reference);
 const haystack=normalizeBibliographicText(resultText);
 const index=haystack.indexOf(wanted);
 if(index<0)return false;
 const previous=index?haystack[index-1]:' ';
 const next=haystack[index+wanted.length]||' ';
 return !/[\p{L}\p{N}]/u.test(previous) && !/[\p{L}\p{N}]/u.test(next);
}
