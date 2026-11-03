/** Local, optional research outlines. No notes or WOL content is stored here. */
export interface ResearchBranch { id:string; title:string }
export interface ResearchPlan {
  id:string; title:string; branches:ResearchBranch[];
  createdAt:number; updatedAt:number;
}
export interface ResearchDesk { version:1; activeId:string|null; plans:ResearchPlan[] }
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
const title=(value:unknown,fallback:string):string=>
  typeof value==='string' ? (value.trim().slice(0,180)||fallback) : fallback;
const record=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
export const emptyResearchDesk=():ResearchDesk=>({version:1,activeId:null,plans:[]});

/** Validate data loaded from the Obsidian plugin store; never trust a saved shape. */
export function normalizeResearchDesk(value:unknown):ResearchDesk {
  const raw=record(value);
  if(!raw||!Array.isArray(raw.plans))return emptyResearchDesk();
  const plans:ResearchPlan[]=[];
  const seen=new Set<string>();
  for(const entry of raw.plans.slice(0,50)){
    const plan=record(entry);
    if(!plan||typeof plan.id!=='string'||!plan.id||plan.id.length>120||seen.has(plan.id))continue;
    seen.add(plan.id);
    const branchIds=new Set<string>();
    const branches:ResearchBranch[]=[];
    for(const item of (Array.isArray(plan.branches)?plan.branches:[]).slice(0,150)){
      const branch=record(item);
      if(!branch||typeof branch.id!=='string'||!branch.id||branch.id.length>120||branchIds.has(branch.id))continue;
      branchIds.add(branch.id);
      branches.push({id:branch.id,title:title(branch.title,'Piste sans titre')});
    }
    const createdAt=typeof plan.createdAt==='number'&&Number.isFinite(plan.createdAt)?plan.createdAt:0;
    const updatedAt=typeof plan.updatedAt==='number'&&Number.isFinite(plan.updatedAt)?plan.updatedAt:createdAt;
    plans.push({id:plan.id,title:title(plan.title,'Recherche sans titre'),branches,createdAt,updatedAt});
  }
  const activeId=typeof raw.activeId==='string'&&plans.some(p=>p.id===raw.activeId)?raw.activeId:null;
  return {version:1,plans,activeId};
}
export const activeResearchPlan=(desk:ResearchDesk):ResearchPlan|undefined=>
  desk.plans.find(p=>p.id===desk.activeId);

export function addResearchPlan(desk:ResearchDesk):ResearchDesk {
  if(desk.plans.length>=50)return desk;
  const now=Date.now();
  const plan:ResearchPlan={id:id(),title:'Nouvelle recherche',branches:[],createdAt:now,updatedAt:now};
  return {...desk,activeId:plan.id,plans:[plan,...desk.plans]};
}
export function activateResearchPlan(desk:ResearchDesk,id:string|null):ResearchDesk {
  return {...desk,activeId:id&&desk.plans.some(p=>p.id===id)?id:null};
}
export function deleteResearchPlan(desk:ResearchDesk,planId:string):ResearchDesk {
  return {...desk,activeId:desk.activeId===planId?null:desk.activeId,
    plans:desk.plans.filter(plan=>plan.id!==planId)};
}
export function updateResearchPlan(desk:ResearchDesk,planId:string,change:(plan:ResearchPlan)=>ResearchPlan):ResearchDesk {
  if(!desk.plans.some(plan=>plan.id===planId))return desk;
  return {...desk,plans:desk.plans.map(plan=>plan.id===planId?
    {...change(plan),id:plan.id,createdAt:plan.createdAt,updatedAt:Date.now()}:plan)};
}
export function renameResearchPlan(desk:ResearchDesk,planId:string,value:string):ResearchDesk {
  return updateResearchPlan(desk,planId,plan=>({...plan,title:title(value,'Recherche sans titre')}));
}
export function addResearchBranch(desk:ResearchDesk,planId:string):ResearchDesk {
  return updateResearchPlan(desk,planId,plan=>plan.branches.length>=150?plan:{
    ...plan,branches:[...plan.branches,{id:id(),title:'Nouvelle piste'}]
  });
}
export function renameResearchBranch(desk:ResearchDesk,planId:string,branchId:string,value:string):ResearchDesk {
  return updateResearchPlan(desk,planId,plan=>({...plan,branches:plan.branches.map(branch=>
    branch.id===branchId?{...branch,title:title(value,'Piste sans titre')}:branch)}));
}
export function removeResearchBranch(desk:ResearchDesk,planId:string,branchId:string):ResearchDesk {
  return updateResearchPlan(desk,planId,plan=>({...plan,branches:plan.branches.filter(branch=>branch.id!==branchId)}));
}
export function moveResearchBranch(desk:ResearchDesk,planId:string,branchId:string,offset:-1|1):ResearchDesk {
  return updateResearchPlan(desk,planId,plan=>{
    const branches=plan.branches.slice();
    const from=branches.findIndex(branch=>branch.id===branchId);
    const to=from+offset;
    if(from<0||to<0||to>=branches.length)return plan;
    const [branch]=branches.splice(from,1);
    branches.splice(to,0,branch);
    return {...plan,branches};
  });
}
