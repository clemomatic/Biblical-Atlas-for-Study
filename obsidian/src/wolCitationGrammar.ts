/**
 * WOL bibliographic issue/page grammar.
 *
 * The Index uses different formats for monthly periodicals, historical
 * day/month issues, numbered public magazines and the Kingdom Ministry.
 * We normalize the issue identity BEFORE comparing printed page spans.
 * This does not derive a WOL document ID; an official result must still
 * confirm the requested pages.
 *
 * Source: https://wol.jw.org/fr/wol/d/r30/lp-f/1200270070
 */
export interface PublicationPage {issue:string;first:number;last:number}

const MONTHS=[
 'janvier','fevrier','mars','avril','mai','juin','juillet','aout',
 'septembre','octobre','novembre','decembre'
] as const;
const monthPattern=MONTHS.join('|');
const pagePattern='\\s+(?:p\\.?\\s*)?(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?(?=\\s|$|[.,;§])';

function normal(raw:string):string {
 return raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('fr').replace(/[\u00a0\u202f]/g,' ')
  .replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
}
function pages(issue:string,firstRaw:string,lastRaw?:string):PublicationPage|null {
 const first=Number(firstRaw),last=Number(lastRaw||firstRaw);
 if(first<1||last<first||last>999)return null;
 return {issue,first,last};
}

/** Understand printed page references without guessing an article number. */
export function publicationPages(raw:string):PublicationPage|null {
 const value=normal(raw);
 let m:RegExpMatchArray|null;

 // w23.02 10; w24.08 28 § 7; wp23.1 14-15; g22.1 3;
 // mwb20.03 7. Numbers on wp/g may be ISSUE numbers, not months.
 m=value.match(new RegExp('\\b((?:w|wp|g|mwb)\\d{2})\\.(\\d{1,2})'+pagePattern));
 if(m){
  const code=m[1],number=Number(m[2]);
  if(number<1||number>12)return null;
  return pages(code+'.'+String(number).padStart(2, '0'),m[3],m[4]);
 }

 // w24 août p. 28 and w24.08 28 describe the same issue.
 m=value.match(new RegExp('\\b((?:w|g|mwb)\\d{2})\\s+('+monthPattern+')'+pagePattern));
 if(m){
  const month=MONTHS.indexOf(m[2] as typeof MONTHS[number])+1;
  return month?pages(m[1]+'.'+String(month).padStart(2,'0'),m[3],m[4]):null;
 }

 // Historical issues use day/month, not a monthly number:
 // w14 15/11 28-29, w09 1/5 13-15.
 m=value.match(new RegExp('\\b((?:w|g)\\d{2})\\s+(\\d{1,2})/(\\d{1,2})'+pagePattern));
 if(m){
  const day=Number(m[2]),month=Number(m[3]);
  if(day<1||day>31||month<1||month>12)return null;
  return pages(m[1]+' '+day+'/'+month,m[4],m[5]);
 }

 // "g 2/12" is older Réveillez-vous! month/year notation.
 m=value.match(new RegExp('\\bg\\s+(\\d{1,2})/(\\d{2})'+pagePattern));
 if(m){
  const month=Number(m[1]);
  return month>=1&&month<=12?pages('g '+month+'/'+m[2],m[3],m[4]):null;
 }

 // "km 05/95" and "km 5/95" refer to the same monthly issue.
 m=value.match(new RegExp('\\bkm\\s+(\\d{1,2})/(\\d{2})'+pagePattern));
 if(m){
  const month=Number(m[1]);
  return month>=1&&month<=12?pages('km '+month+'/'+m[2],m[3],m[4]):null;
 }

 // Yearbooks: yb17 197; their publication year disambiguates page 197.
 m=value.match(new RegExp('\\b(yb\\d{2})'+pagePattern));
 if(m)return pages(m[1],m[2],m[3]);
 return null;
}

export function matchingPublicationPages(requested:string,listing:string):boolean {
 const query=publicationPages(requested),candidate=publicationPages(listing);
 return !!query&&!!candidate&&query.issue===candidate.issue&&
  candidate.first<=query.first&&candidate.last>=query.last;
}
