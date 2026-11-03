import { cleanWolUrl } from './referenceReader';

export interface ResearchCapture {
  id:string;
  label:string;
  excerpt:string;
  comment:string;
  url:string;
  planId:string|null;
  createdAt:number;
}
export interface ResearchIdea {
  id:string;
  statement:string;
  captureIds:string[];
  planId:string|null;
  createdAt:number;
  updatedAt:number;
}
export interface ResearchCollection {
  version:1;
  captures:ResearchCapture[];
  ideas:ResearchIdea[];
}
const object=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const line=(value:unknown,max=180):string=>typeof value==='string'
  ?value.replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const paragraph=(value:unknown,max=8000):string=>
  typeof value==='string'?value.trim().slice(0,max):'';
const id=():string=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
const now=():number=>Date.now();
const validDate=(x:unknown):number=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:0;
const safeId=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&x.length<=120;
const safeWol=(value:unknown):string=>typeof value==='string'?cleanWolUrl(value.trim())||'':'';
const optionalId=(value:unknown):string|null=>safeId(value)?value:null;
export const emptyResearchCollection=():ResearchCollection=>({version:1,captures:[],ideas:[]});

/** Fix corrupted data and remove references to deleted captures without touching user notes. */
export function normalizeResearchCollection(value:unknown):ResearchCollection{
  const raw=object(value);
  if(!raw)return emptyResearchCollection();
  const captures:ResearchCapture[]=[];
  const seenSources=new Set<string>();
  for(const entry of (Array.isArray(raw.captures)?raw.captures:[]).slice(0,1500)){
    const item=object(entry);
    if(!item||!safeId(item.id)||seenSources.has(item.id))continue;
    seenSources.add(item.id);
    captures.push({
      id:item.id,label:line(item.label)||'Trouvaille',
      excerpt:paragraph(item.excerpt),comment:paragraph(item.comment,1800),
      url:safeWol(item.url),planId:optionalId(item.planId),
      createdAt:validDate(item.createdAt)
    });
  }
  const ideas:ResearchIdea[]=[];
  const seenIdeas=new Set<string>();
  for(const entry of (Array.isArray(raw.ideas)?raw.ideas:[]).slice(0,400)){
    const item=object(entry);
    if(!item||!safeId(item.id)||seenIdeas.has(item.id))continue;
    seenIdeas.add(item.id);
    const captureIds:string[]=[];
    for(const source of (Array.isArray(item.captureIds)?item.captureIds:[])){
      if(safeId(source)&&seenSources.has(source)&&!captureIds.includes(source)&&captureIds.length<100)
        captureIds.push(source);
    }
    ideas.push({
      id:item.id,statement:line(item.statement,2000),
      captureIds,planId:optionalId(item.planId),
      createdAt:validDate(item.createdAt),
      updatedAt:validDate(item.updatedAt)
    });
  }
  return {version:1,captures,ideas};
}
export function addResearchCapture(collection:ResearchCollection,details:{
  label:string;excerpt?:string;comment?:string;url?:string;planId?:string|null
}):ResearchCollection{
  if(collection.captures.length>=1500)return collection;
  const title=line(details.label)||line(details.excerpt,110)||line(details.comment,110);
  if(!title)return collection;
  const capture:ResearchCapture={
    id:id(),label:title,excerpt:paragraph(details.excerpt),
    comment:paragraph(details.comment,1800),url:safeWol(details.url),
    planId:optionalId(details.planId),createdAt:now()
  };
  return {...collection,captures:[capture,...collection.captures]};
}
export function updateResearchCapture(collection:ResearchCollection,captureId:string,change:Partial<
  Pick<ResearchCapture,'label'|'excerpt'|'comment'|'url'|'planId'>
>):ResearchCollection{
  if(!collection.captures.some(item=>item.id===captureId))return collection;
  return {...collection,captures:collection.captures.map(item=>item.id===captureId?{
    ...item,
    label:change.label===undefined?item.label:line(change.label)||'Trouvaille',
    excerpt:change.excerpt===undefined?item.excerpt:paragraph(change.excerpt),
    comment:change.comment===undefined?item.comment:paragraph(change.comment,1800),
    url:change.url===undefined?item.url:safeWol(change.url),
    planId:change.planId===undefined?item.planId:optionalId(change.planId)
  }:item)};
}
export function removeResearchCapture(collection:ResearchCollection,captureId:string):ResearchCollection{
  if(!collection.captures.some(item=>item.id===captureId))return collection;
  return {...collection,
    captures:collection.captures.filter(item=>item.id!==captureId),
    ideas:collection.ideas.map(idea=>({...idea,
      captureIds:idea.captureIds.filter(id=>id!==captureId)}))
  };
}
export function addResearchIdea(collection:ResearchCollection,planId?:string|null):ResearchCollection{
  if(collection.ideas.length>=400)return collection;
  const timestamp=now();
  return {...collection,ideas:[{
    id:id(),statement:'',captureIds:[],planId:optionalId(planId),
    createdAt:timestamp,updatedAt:timestamp
  },...collection.ideas]};
}
export function updateResearchIdea(collection:ResearchCollection,ideaId:string,change:(
  idea:ResearchIdea
)=>ResearchIdea):ResearchCollection{
  if(!collection.ideas.some(idea=>idea.id===ideaId))return collection;
  return {...collection,ideas:collection.ideas.map(idea=>idea.id===ideaId?{
    ...change(idea),id:idea.id,createdAt:idea.createdAt,updatedAt:now()
  }:idea)};
}
export function renameResearchIdea(collection:ResearchCollection,ideaId:string,statement:string):ResearchCollection{
  return updateResearchIdea(collection,ideaId,idea=>({...idea,statement:line(statement,2000)}));
}
export function assignCaptureToIdea(collection:ResearchCollection,ideaId:string,captureId:string):ResearchCollection{
  if(!collection.captures.some(c=>c.id===captureId))return collection;
  return updateResearchIdea(collection,ideaId,idea=>
    idea.captureIds.includes(captureId)||idea.captureIds.length>=100?idea:{
    ...idea,captureIds:[...idea.captureIds,captureId]
  });
}
export function unassignCaptureFromIdea(collection:ResearchCollection,ideaId:string,captureId:string):ResearchCollection{
  return updateResearchIdea(collection,ideaId,idea=>({...idea,
    captureIds:idea.captureIds.filter(id=>id!==captureId)}));
}
export function moveIdeaCapture(collection:ResearchCollection,ideaId:string,captureId:string,offset:-1|1):ResearchCollection{
  return updateResearchIdea(collection,ideaId,idea=>{
    const refs=idea.captureIds.slice();
    const index=refs.indexOf(captureId),to=index+offset;
    if(index<0||to<0||to>=refs.length)return idea;
    [refs[index],refs[to]]=[refs[to],refs[index]];
    return {...idea,captureIds:refs};
  });
}
export function deleteResearchIdea(collection:ResearchCollection,ideaId:string):ResearchCollection{
  return {...collection,ideas:collection.ideas.filter(idea=>idea.id!==ideaId)};
}
export function unassignedResearchCaptures(collection:ResearchCollection):ResearchCapture[]{
  const assigned=new Set(collection.ideas.flatMap(idea=>idea.captureIds));
  return collection.captures.filter(item=>!assigned.has(item.id));
}
const markdownLabel=(label:string)=>line(label).replace(/[\[\]]/g,'').replace(/[\\]/g,'');
export function citationMarkdown(capture:ResearchCapture):string{
  const label=markdownLabel(capture.label)||'Source';
  return capture.url?'['+label+']('+capture.url.replace(/\)/g,'%29')+')':label;
}
/** One sentence followed immediately by parenthesized source links. */
export function ideaMarkdown(idea:ResearchIdea,collection:ResearchCollection):string{
  const byId=new Map(collection.captures.map(item=>[item.id,item]));
  const refs=idea.captureIds.map(id=>byId.get(id)).filter((item):item is ResearchCapture=>!!item);
  const statement=line(idea.statement,2000);
  const citations=refs.map(citationMarkdown).join(' ; ');
  return statement+(citations?' ('+citations+')':'');
}
