import type { ResearchCollection, ResearchIdea } from './researchCollection.ts';
import { citationMarkdown } from './researchCollection.ts';

/** A relationship exists only when two ideas explicitly reuse the same saved finding. */
export interface IdeaConnection {
  ideaId:string;
  sharedCaptureIds:string[];
}
export function connectionsForIdea(collection:ResearchCollection,ideaId:string):IdeaConnection[]{
  const idea=collection.ideas.find(item=>item.id===ideaId);
  if(!idea)return [];
  const owned=new Set(idea.captureIds);
  return collection.ideas.filter(other=>other.id!==ideaId).map(other=>({
    ideaId:other.id,
    sharedCaptureIds:other.captureIds.filter(id=>owned.has(id)&&collection.captures.some(c=>c.id===id))
  })).filter(item=>item.sharedCaptureIds.length>0)
    .sort((a,b)=>b.sharedCaptureIds.length-a.sharedCaptureIds.length);
}
const safeHeading=(value:string):string=>value.replace(/[\r\n]+/g,' ').replace(/[#\[\]]/g,'').trim();
const cleanCell=(value:string):string=>value.replace(/\r\n?/g,'\n').trim();
/** Portable Markdown: no network, no writes, no untrusted HTML. */
export function researchDossierMarkdown(collection:ResearchCollection,planId?:string|null):string{
  const ideas=collection.ideas.filter(i=>!planId||i.planId===planId);
  const referenced=new Set(ideas.flatMap(i=>i.captureIds));
  const captures=collection.captures.filter(c=>!planId||c.planId===planId||referenced.has(c.id));
  const lines=['# Dossier de recherche Bible Lab','','> Document préparé localement à partir de mes trouvailles. Les liens pointent vers WOL ; les extraits et commentaires sont mes notes personnelles.',''];
  lines.push('## Fiches d’idées','');
  if(!ideas.length)lines.push('_Aucune fiche d’idée._','');
  for(const [index,idea] of ideas.entries()){
    lines.push('### '+(index+1)+'. '+safeHeading(idea.statement||'Idée à formuler'),'');
    const sources=idea.captureIds.map(id=>collection.captures.find(c=>c.id===id)).filter((c):c is NonNullable<typeof c>=>!!c);
    if(!sources.length)lines.push('_Aucune source associée._','');
    for(const source of sources)lines.push('- '+citationMarkdown(source)+(source.excerpt?' — '+cleanCell(source.excerpt).replace(/\n/g,' '):''));
    lines.push('');
    const related=connectionsForIdea(collection,idea.id).filter(link=>ideas.some(i=>i.id===link.ideaId));
    if(related.length)lines.push('**Idées reliées :** '+related.map(link=>{
      const other=ideas.find(i=>i.id===link.ideaId)!;
      return safeHeading(other.statement||'Idée à formuler')+' ('+link.sharedCaptureIds.length+' source(s) commune(s))';
    }).join(' ; '),'');
  }
  lines.push('## Sources et observations','');
  if(!captures.length)lines.push('_Aucune trouvaille._','');
  for(const source of captures){
    lines.push('### '+safeHeading(source.label),'',citationMarkdown(source),'');
    if(source.excerpt)lines.push('**Extrait :**', '',cleanCell(source.excerpt),'');
    if(source.comment)lines.push('**Pourquoi je garde ceci :**', '',cleanCell(source.comment),'');
  }
  return lines.join('\n').trim()+'\n';
}
