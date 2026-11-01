/** Supported, verified official WOL language routes. Never guess a translation ID. */
export type BibleLabLanguage='fr'|'en'|'pt'|'es';
export type ReaderSize='compact'|'comfortable'|'large';
export const WOL_LANGUAGES={
 fr:{label:'Français',route:'r30/lp-f',jw:'F',org:'rechercher'},
 en:{label:'English',route:'r1/lp-e',jw:'E',org:'search'},
 pt:{label:'Português (Brasil)',route:'r5/lp-t',jw:'T',org:'busca'},
 es:{label:'Español',route:'r4/lp-s',jw:'S',org:'búsquedas'}
} as const;
export function normalizeLanguage(value:unknown):BibleLabLanguage{
 return value==='en'||value==='pt'||value==='es'?value:'fr';
}
export function wolPrefix(language:BibleLabLanguage='fr'):string {
 return 'https://wol.jw.org/'+language+'/wol/';
}
export function wolRoute(language:BibleLabLanguage='fr'):string {
 return WOL_LANGUAGES[language].route;
}
export function wolLanguageFromUrl(url:string):BibleLabLanguage|null {
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='wol.jw.org'||u.username||u.password)return null;
  for(const lang of ['fr','en','pt','es'] as const){
   if(u.pathname.startsWith('/'+lang+'/wol/') && u.pathname.includes('/'+WOL_LANGUAGES[lang].route+'/'))return lang;
  }
 }catch{ /* no valid URL */ }
 return null;
}
export interface ReaderPreferences {
 language:BibleLabLanguage;
 readerSize:ReaderSize;
 showReaderNotes:boolean;
 readerRelatedLimit:10|20|35;
 readerCacheMinutes:0|15|30|60;
}
export function normalizedReaderPreferences(source:Partial<ReaderPreferences>|null|undefined):ReaderPreferences {
 return {
  language:normalizeLanguage(source?.language),
  readerSize:source?.readerSize==='compact'||source?.readerSize==='large'?source.readerSize:'comfortable',
  showReaderNotes:source?.showReaderNotes!==false,
  readerRelatedLimit:[10,20,35].includes(source?.readerRelatedLimit as number)?source!.readerRelatedLimit as 10|20|35:20,
  readerCacheMinutes:[0,15,30,60].includes(source?.readerCacheMinutes as number)?source!.readerCacheMinutes as 0|15|30|60:30
 };
}
