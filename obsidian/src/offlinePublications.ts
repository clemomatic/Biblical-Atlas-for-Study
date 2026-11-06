/**
 * Local-only JWPUB catalog metadata and official public publication lookup.
 * All network calls are initiated explicitly by the user from the library modal.
 */
export const PERSONAL_OFFLINE_CATALOG=[
  {label:'La Bible — édition d’étude',symbol:'nwtsty'},
  {label:'La Bible — édition standard',symbol:'nwt'},
  {label:'Assemblée régionale 2026',symbol:'co-pgm26'},
  {label:'Circonscription 2026-2027 · responsable de circonscription',symbol:'ca-copgm27'},
  {label:'Circonscription 2026-2027 · représentant de la filiale',symbol:'ca-brpgm27'}
] as const;

export interface PublicJwpub {
  symbol:string;
  issue?:string;
  title:string;
  url:string;
  filename:string;
  filesize:number;
  checksum:string;
}
export interface OfflineDocumentRecord {
  documentId:number;
  mepsId:number|null;
  title:string;
  path:string; // relative file name within this import, never an absolute path
  bookNumber?:number;
  chapterNumber?:number;
}
export interface OfflineImportIndex {
  schema:1;
  origin?:'personal'|'download';
  publication:{
    symbol:string;year:number;language:number;title:string;issue?:string
  };
  documents:OfflineDocumentRecord[];
}
export const OFFLINE_INDEX_NAME='_BIBLE_LAB_OFFLINE_INDEX.json';
export const MAX_PERSONAL_JWPUB_BYTES=150*1024*1024;
export const MAX_BIBLE_JWPUB_BYTES=400*1024*1024;
/** The current public Insight download contains both printed volumes. */
export const canonicalPublicationSymbol=(symbol:string)=>
  /^it-[12]$/i.test(symbol)?'it':symbol.toLowerCase();
export const isBiblePublication=(symbol:string)=>/^(nwt|nwtsty)$/.test(symbol.toLowerCase());
export const allowedJwpubBytes=(symbol:string)=>
  isBiblePublication(symbol)||canonicalPublicationSymbol(symbol)==='it'?MAX_BIBLE_JWPUB_BYTES:MAX_PERSONAL_JWPUB_BYTES;

export function validPublicationSymbol(value:string):string|null {
  const input=value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{0,45}$/.test(input)?input:null;
}
export function publicJwpubQuery(symbol:string,issue=''):string{
  const valid=validPublicationSymbol(symbol);
  if(!valid)throw Error('Identifiant de publication invalide.');
  if(issue&&!/^\d{4,8}$/.test(issue))throw Error('Numéro de revue invalide.');
  const url=new URL('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS');
  for(const [key,val] of Object.entries({
    output:'json',pub:canonicalPublicationSymbol(valid),fileformat:'JWPUB',alllangs:'0',langwritten:'F',txtCMSLang:'F'
  }))url.searchParams.set(key,val);
  // Official JW.org Bible download links specify booknum=0 for the whole Bible.
  // Without it the media API may return a per-book response or no JWPUB.
  if(isBiblePublication(valid))url.searchParams.set('booknum','0');
  if(issue)url.searchParams.set('issue',issue);
  return url.toString();
}
export function trustedPublicationFileUrl(raw:unknown):string|null {
  if(typeof raw!=='string')return null;
  try{
    const url=new URL(raw);
    const host=url.hostname.toLowerCase();
    const trusted=host==='b.jw-cdn.org'||host.endsWith('.jw-cdn.org')||
      /^download-[a-z]\.akamaihd\.net$/.test(host);
    if(url.protocol!=='https:'||url.username||url.password||!trusted||
      url.port&&url.port!=='443')return null;
    if(!url.pathname.startsWith('/'))return null;
    url.hash='';
    return url.toString();
  }catch{return null;}
}
const obj=(value:unknown):Record<string,any>|null=>
  value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,any>:null;

export function parsePublicJwpubResponse(payload:unknown,symbol:string,issue=''):PublicJwpub|null{
  const input=validPublicationSymbol(symbol);
  const valid=input&&canonicalPublicationSymbol(input);
  if(!valid||(issue&&!/^\d{4,8}$/.test(issue)))return null;
  const response=obj(payload);
  if(response?.pub&&canonicalPublicationSymbol(String(response.pub))!==valid)return null;
  if(issue&&String(response?.issue||'')!==issue)return null;
  const files=obj(response?.files);
  const format=obj(files?.F)?.JWPUB;
  if(!Array.isArray(format)||format.length===0)return null;
  const first=obj(format[0]);
  if(first?.pub&&canonicalPublicationSymbol(String(first.pub))!==valid)return null;
  const item=obj(first?.file);
  const url=trustedPublicationFileUrl(item?.url);
  if(!url)return null;
  const bytes=Number(first?.filesize||0);
  if(!Number.isFinite(bytes)||bytes<0||bytes>allowedJwpubBytes(valid))return null;
  const title=String(response?.pubName||first?.title||valid).replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim().slice(0,180)||valid;
  const filename=valid+'_F'+(issue?'_'+issue:'')+'.jwpub';
  return {
    symbol:valid,...(issue?{issue}:{}),title,url,filename,filesize:bytes,
    checksum:typeof item?.checksum==='string'?item.checksum.toLowerCase():''
  };
}
export function isJwpubArchive(bytes:Uint8Array,symbol=''):boolean{
  return bytes.length>=4&&bytes.length<=allowedJwpubBytes(symbol)&&
    bytes[0]===0x50&&bytes[1]===0x4b&&[0x03,0x05,0x07].includes(bytes[2]);
}
export function validateOfflineIndex(input:unknown):OfflineImportIndex|null{
  const source=obj(input);
  if(source?.schema!==1||!obj(source.publication)||!Array.isArray(source.documents)||
    source.documents.length>20000)return null;
  const pub=source.publication;
  if(typeof pub.symbol!=='string'||pub.symbol.length>110||
    typeof pub.title!=='string'||pub.title.length>240||
    !Number.isInteger(pub.language)||!Number.isInteger(pub.year))return null;
  const documents:OfflineDocumentRecord[]=[];
  for(const entry of source.documents){
    const d=obj(entry);
    if(!d||!Number.isInteger(d.documentId)||d.documentId<0||
      (d.mepsId!==null&&(!Number.isInteger(d.mepsId)||d.mepsId<=0))||
      typeof d.title!=='string'||typeof d.path!=='string'||
      d.path.length>210||!d.path.endsWith('.md')||d.path.startsWith('/')||
      d.path.includes('\\')||d.path.split('/').includes('..'))return null;
    if((d.bookNumber!==undefined||d.chapterNumber!==undefined)&&
      (!Number.isInteger(d.bookNumber)||d.bookNumber<1||d.bookNumber>66||
      !Number.isInteger(d.chapterNumber)||d.chapterNumber<1||d.chapterNumber>200))return null;
    documents.push({documentId:d.documentId,mepsId:d.mepsId,title:d.title.slice(0,240),path:d.path,
      ...(d.bookNumber!==undefined?{bookNumber:d.bookNumber,chapterNumber:d.chapterNumber}:{})});
  }
  return {
    schema:1,
    ...(source.origin==='personal'||source.origin==='download'?{origin:source.origin}:{}),
    publication:{symbol:pub.symbol,year:pub.year,language:pub.language,title:pub.title,
      ...(typeof pub.issue==='string'&&/^\d{4,8}$/.test(pub.issue)?{issue:pub.issue}:{})},
    documents
  };
}
/** A direct document URL is unambiguous; a search result or publication listing is not. */
export function directWolMepsId(raw:string):number|null{
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.hostname!=='wol.jw.org')return null;
    const m=/^\/fr\/wol\/d\/r30\/lp-f\/(\d+)$/.exec(u.pathname);
    const id=m?Number(m[1]):0;
    return Number.isSafeInteger(id)&&id>0?id:null;
  }catch{return null;}
}
