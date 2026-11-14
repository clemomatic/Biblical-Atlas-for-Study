import type {ReaderLine,ReaderResult} from './referenceReader';

/** Keep downloaded verse text intact while restoring the official study apparatus.
 * This pure merge is shared by the floating popup and the sidebar.
 * Never make a remote passage replace a locally selected verse. */
export function mergeLocalBibleApparatus(local:ReaderResult,official:ReaderResult):ReaderResult {
  if(local.source!=='local'||local.kind!=='verse'||official.kind!=='verse')return local;
  const verses=local.lines.filter(line=>line.type==='verse'||line.type==='paragraph');
  if(!verses.length)return local;
  const officialVerses=official.lines.filter(line=>line.type==='verse'||line.type==='paragraph');
  const noteTypes=new Set<ReaderLine['type']>(['study','note','crossref']);
  const extras:ReaderLine[]=[];
  let position=-1;
  for(const line of official.lines){
    if(line.type==='verse'||line.type==='paragraph'){position++;continue;}
    if(!noteTypes.has(line.type))continue;
    const current=verses[Math.min(Math.max(position,0),verses.length-1)];
    const sourceNumber=officialVerses[Math.max(position,0)]?.number;
    // 'verse' is presentation metadata; 'source' remains the study-note
    // heading/expression supplied by the official publication.
    const verse=sourceNumber||current?.number||'';
    extras.push({...line,verse});
  }
  const resultLines=local.lines.map(line=>{
    if(line.type!=='verse'&&line.type!=='paragraph')return line;
    const i=verses.indexOf(line);
    const counterpart=officialVerses.find(v=>v.number&&v.number===line.number)||officialVerses[i];
    if(!counterpart?.references?.length)return line;
    // Offsets are valid only when the displayed text is byte-for-byte the same.
    // Otherwise the unobtrusive "+" is appended after the local text.
    const referenceMarkers=counterpart.text===line.text?counterpart.referenceMarkers:undefined;
    return {...line,references:counterpart.references,referenceMarkers};
  });
  const links=[...local.links];
  const unique=new Set(links.map(link=>link.label+'|'+link.url));
  for(const link of official.links){
    const id=link.label+'|'+link.url;
    if(!unique.has(id)){unique.add(id);links.push(link);}
  }
  if(!extras.length&&!links.length&&!resultLines.some(line=>line.references?.length))return local;
  return {...local,lines:[...resultLines,...extras],links,
    notice:(local.notice||'Lecture locale')+' · Compléments officiels de la Bible d’étude'};
}
