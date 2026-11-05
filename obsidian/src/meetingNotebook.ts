/**
 * Meeting notebooks are ordinary Markdown files. The original publication
 * documents remain indexed for accurate offline WOL document references.
 * This module has no Obsidian dependency so it can be regression-tested.
 */
export interface NotebookMeeting {
  week:string;
  bibleReading:string;
  source:string;
  sections:{section:string;items:string[]}[];
}
export interface MeetingDocument {
  path:string;
  title:string;
  markdown:string;
  sourceUrl?:string|null;
}
export interface GeneratedNotebook {
  path:string;
  title:string;
  markdown:string;
  sources:string[];
}
const PARTS=[
  {match:/joyaux|tr.sors bibliques/i,title:'Joyaux de la Parole de Dieu',callout:'blb-jewels',symbol:'💎'},
  {match:/minist.re|pr.dication/i,title:'Applique-toi au ministère',callout:'blb-ministry',symbol:'🗣️'},
  {match:/vie chr.tienne/i,title:'Vie chrétienne',callout:'blb-life',symbol:'🌿'}
] as const;
const MONTHS='janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const WEEK_PATTERN=new RegExp('(\\d{1,2})(?:er)?\\s*(?:'+MONTHS+')?\\s*[-–—]\\s*(\\d{1,2})(?:er)?\\s+('+MONTHS+')(?:\\s+(\\d{4}))?','i');
const yaml=(text:string):string=>JSON.stringify(text);
const filename=(text:string):string=>text.replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,85);
const heading=(text:string):string=>text.replace(/[\r\n#]+/g,' ').trim().slice(0,180);
function partOf(value:string){return PARTS.find(part=>part.match.test(value));}
function noteBox(kind:string,title:string,body:string):string[]{
  return ['> [!'+kind+'] '+title,'> '+body,'>','> **Mes références :**','',''];
}
export function renderWeeklyMeetingNotebook(week:NotebookMeeting,mondayStamp:string):string{
  const blocks=[
    '---','bible_lab_kind: meeting-preparation','bible_lab_version: 2',
    'week_monday: '+mondayStamp,
    'source_url: '+yaml(week.source),'---',
    '# Carnet de réunion · '+heading(week.week),'',
    '> [!abstract] Mon programme en un coup d’œil',
    '> **Lecture biblique :** '+(week.bibleReading||'À compléter'),
    '> **Source officielle :** [Consulter le programme]('+week.source+')','',
    '## Mes trois parties','',
    '- [[#Joyaux de la Parole de Dieu]]',
    '- [[#Applique-toi au ministère]]',
    '- [[#Vie chrétienne]]',''
  ];
  const seen=new Set<string>();
  for(const section of week.sections){
    const part=partOf(section.section);
    const title=part?.title||heading(section.section);
    const kind=part?.callout||'blb-idea';
    seen.add(title);
    blocks.push('## '+title,'');
    blocks.push(...noteBox(kind,'Ce que je veux retenir','Une pensée principale à développer pendant la réunion.'));
    for(const item of section.items){
      blocks.push('### '+heading(item),'');
      blocks.push(...noteBox('blb-idea','Ma réponse / mon idée',''));
    }
  }
  for(const part of PARTS){
    if(seen.has(part.title))continue;
    blocks.push('## '+part.title,'');
    blocks.push(...noteBox(part.callout,'Mes notes',''));
  }
  blocks.push('## À préparer','',
    '- [ ] Lire les chapitres de la semaine',
    '- [ ] Examiner les références officielles',
    '- [ ] Préparer mes commentaires','',
    '## Mon bac à idées','',
    '> [!blb-idea] Pistes à explorer',
    '> Déposer ici les idées encore incomplètes, avec leurs sources.','',
    '## Ce que je veux appliquer','',
    '> [!blb-life] Une décision concrète',
    '>','','');
  return blocks.join('\n');
}
function weekMatch(doc:MeetingDocument):RegExpMatchArray|null{
  const lines=doc.markdown.split('\n')
    .filter(line=>/^#{1,4}\s/.test(line)).slice(0,18);
  for(const line of [doc.title,...lines]){
    const match=line.match(WEEK_PATTERN);
    if(match)return match;
  }
  return null;
}
function renderSource(doc:MeetingDocument):string[]{
  // The source note is kept separately for citation fidelity and offline lookup.
  const title=heading(doc.title);
  const clean=doc.markdown.trim()
    .replace(/!\[([^\]]*)\]\(assets\//g,'![$1](../assets/');
  const lines=['### '+title,'',
    '[Ouvrir le document source](<../'+doc.path.replace(/>/g,'%3E')+'>)',''];
  if(doc.sourceUrl&&/^https:\/\/wol\.jw\.org\/fr\/wol\/d\/r30\/lp-f\/\d+$/.test(doc.sourceUrl))
    lines.push('[Consulter sur WOL]('+doc.sourceUrl+')','');
  lines.push(clean,'');
  return lines;
}
/**
 * One editable notebook per explicitly identified meeting week. Documents are
 * never silently assigned to another week and are not removed from the index.
 */
export function buildJwpubMeetingNotebooks(
  symbol:string,year:number,documents:MeetingDocument[]
):GeneratedNotebook[]{
  if(symbol.toLowerCase()!=='mwb'||!Number.isSafeInteger(year)||year<1900)return [];
  const groups=new Map<string,{title:string;docs:MeetingDocument[]}>();
  for(const doc of documents){
    const m=weekMatch(doc);
    if(!m)continue;
    const label=m[0].replace(/\s+/g,' ').replace(/\s*[-–—]\s*/,'–').replace(/(\d)er\b/gi,'$1').trim();
    const documentYear=m[4]?Number(m[4]):year;
    const title=label.replace(/\s+\d{4}$/,'')+' '+documentYear;
    const key=title.toLocaleLowerCase('fr');
    const existing=groups.get(key);
    if(existing)existing.docs.push(doc);
    else groups.set(key,{title,docs:[doc]});
  }
  const notebooks:GeneratedNotebook[]=[];
  for(const group of groups.values()){
    const title='Carnet de réunion · '+group.title;
    const blocks=[
      '---','bible_lab_kind: meeting-notebook','bible_lab_version: 2',
      'source_symbol: '+yaml(symbol),'source_year: '+year,
      'source_documents: '+JSON.stringify(group.docs.map(d=>d.path)),
      '---','# '+title,'',
      '> [!abstract] Un seul espace pour toute la semaine',
      '> Les documents officiels sont conservés séparément pour que les références et la lecture hors ligne continuent de fonctionner.',
      '> Écris tes observations directement dans ce carnet : un nouvel import ne l’écrasera pas.','',
      '## Programme et références',''
    ];
    for(const doc of group.docs)blocks.push(...renderSource(doc));
    blocks.push('## Ma préparation et mes notes','');
    for(const part of PARTS){
      blocks.push('### '+part.symbol+' '+part.title,'');
      blocks.push(...noteBox(part.callout,'Ma pensée principale',''));
    }
    blocks.push('## Perles, questions et pistes','',
      ...noteBox('blb-idea','À approfondir',''),
      '## Ce que je veux appliquer','',
      ...noteBox('blb-life','Une décision concrète',''));
    notebooks.push({
      path:'Carnets/'+filename(group.title)+'.md',title,
      markdown:blocks.join('\n')+'\n',
      sources:group.docs.map(d=>d.path)
    });
  }
  return notebooks;
}
