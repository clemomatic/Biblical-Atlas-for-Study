#!/usr/bin/env node
/**
 * Audits unlinked participant mentions in the existing, source-reviewed Atlas.
 * This script NEVER invents a person, assigns an ID, or changes reviewed data.
 * Run: node scripts/audit-unlinked-people.mjs --write
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const loadDirectory=folder=>readdirSync(resolve(root,folder)).filter(name=>name.endsWith('.json')).sort()
  .flatMap(name=>JSON.parse(readFileSync(resolve(root,folder,name),'utf8')));
const people=loadDirectory('content/reviewed/people').map(entry=>entry.person);
const events=loadDirectory('content/reviewed/events');
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLocaleLowerCase('fr');
const index=new Map();
for(const person of people)for(const name of [person.name,...(person.alternateNames??[])]){
  const alias=normalize(name),old=index.get(alias)??[];
  if(!old.some(entry=>entry.id===person.id))old.push({id:person.id,name:person.name});
  index.set(alias,old);
}
const unresolved=new Map();
for(const record of events)for(const mention of record.event.participantMentions??[]){
  if(mention.personId)continue;
  const label=mention.label.trim(),key=normalize(label),item=unresolved.get(key)??{
    label,events:new Set(),refs:new Set(),sources:new Set()
  };
  item.events.add(record.event.id);
  for(const reference of record.event.biblicalReferences??[])item.refs.add(reference);
  for(const id of record.sourceIds)item.sources.add(id);
  unresolved.set(key,item);
}
const classify=label=>{
  if(normalize(label)==='jehovah')return 'Hors fiches individuelles';
  if(/^(?:les|des|un|une|deux|trois|quatre|premiers|plusieurs)\s/i.test(label)||
    /\s+et\s+/i.test(label)||/disciples|ap[oô]tres|fr[eè]res et s[oœ]urs/i.test(label))
    return 'Collectif, composé ou anonyme';
  return 'Nom individuel à vérifier';
};
const rows=[...unresolved.values()].map(item=>{
  const exact=index.get(normalize(item.label))??[];
  const status=exact.length===1?'Correspondance unique existante':
    exact.length>1?'Identité ambiguë':classify(item.label);
  return {
    label:item.label,status,
    target:exact.length===1?exact[0].name+' — '+exact[0].id:'',
    events:[...item.events].sort(),
    references:[...item.refs].sort(),
    sourceIds:[...item.sources].sort()
  };
}).sort((a,b)=>a.status.localeCompare(b.status,'fr')||a.label.localeCompare(b.label,'fr'));
const n=rows.reduce((acc,row)=>(acc[row.status]=(acc[row.status]??0)+1,acc),{});
const q=value=>String(value).replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const markdown=[
  '# Atlas — mentions de personnes à rapprocher',
  '',
  '> Inventaire généré depuis les événements et personnes de \`content/reviewed/\`. Les intitulés groupés, anonymes et homonymes ne sont **jamais** promus automatiquement comme personnes.',
  '',
  '- Personnes indexées : **'+people.length+'**',
  '- Événements analysés : **'+events.length+'**',
  '- Mentions non reliées : **'+[...unresolved.values()].reduce((sum,item)=>sum+item.events.size,0)+'**',
  '- Libellés distincts : **'+rows.length+'**',
  ...Object.entries(n).sort(([a],[b])=>a.localeCompare(b,'fr')).map(([status,count])=>'- '+status+' : **'+count+'**'),
  '',
  '| Mention | Diagnostic | Fiche existante | Événements | Références de départ |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(row=>'| '+[q(row.label),q(row.status),q(row.target||'—'),q(row.events.join(', ')),q(row.references.slice(0,4).join(' ; ')||row.sourceIds.join(' ; '))].join(' | ')+' |'),
  '',
  '## Règles',
  '',
  '- Une mention n’est pas une preuve de participation physique, de rencontre ni de localisation.',
  '- Un nom individuel absent exige la consultation de la source, la vérification des homonymes et un identifiant stable.',
  '- La présence d’une personne sans période précise n’autorise pas le calcul de son âge.',
  '- Les corrections sont appliquées dans les données relues uniquement après vérification explicite ; ce rapport est non destructif.',
  ''
].join('\n');
const target=resolve(root,'docs/historical-person-linkage-audit.md');
if(process.argv.includes('--write'))writeFileSync(target,markdown,'utf8');
if(process.argv.includes('--verify')){
  if(readFileSync(target,'utf8')!==markdown){
    process.stderr.write('Rapport désynchronisé : node scripts/audit-unlinked-people.mjs --write\n');
    process.exitCode=1;
  }
}
if(!process.argv.includes('--write')&&!process.argv.includes('--verify'))process.stdout.write(markdown);
