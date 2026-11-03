import test from 'node:test';
import assert from 'node:assert/strict';
import {jwOrgResearchUrl,wolResearchUrl} from './wolResearch.ts';

test('Official WOL links encode phrase search without third-party services',()=>{
 const url=new URL(wolResearchUrl(' amour fidèle ',{match:'sen',scope:'all'}));
 assert.equal(url.origin,'https://wol.jw.org');
 assert.equal(url.pathname,'/fr/wol/s/r30/lp-f');
 assert.equal(url.searchParams.get('q'),'amour fidèle');
 assert.equal(url.searchParams.get('p'),'sen');
 assert.equal(url.searchParams.get('fc[]'),null);
});
test('Index scope maps to official WOL Index filter',()=>{
 const url=new URL(wolResearchUrl('Jéhovah',{match:'par',scope:'index'}));
 assert.equal(url.searchParams.get('fc[]'),'dx');
 assert.equal(url.searchParams.get('p'),'par');
});
test('JW.org query uses the official site, not an undocumented API',()=>{
 const url=new URL(jwOrgResearchUrl(' la bonté '));
 assert.equal(url.origin,'https://www.jw.org');
 assert.equal(url.pathname,'/fr/rechercher/');
 assert.equal(url.searchParams.get('q'),'la bonté');
});
test('Blank queries are rejected, unbounded input is capped',()=>{
 assert.throws(()=>jwOrgResearchUrl('   '));
 assert.throws(()=>wolResearchUrl('',{match:'par',scope:'all'}));
 assert.equal(new URL(jwOrgResearchUrl('a'.repeat(500))).searchParams.get('q')?.length,250);
});

test('Index and Guide use the WOL reference-works category without inventing a private endpoint',()=>{
 for(const scope of ['index','guide'] as const){
  const uri=new URL(wolResearchUrl('miséricorde',{match:'par',scope}));
  assert.equal(uri.origin,'https://wol.jw.org');
  assert.equal(uri.searchParams.get('fc[]'),'dx');
  assert.equal(uri.searchParams.get('q'),'miséricorde');
 }
});


test('Perspicace search uses the official it filter, and later pages use pg',()=>{
 const url=new URL(wolResearchUrl('amour',{match:'par',scope:'perspicace',page:2}));
 assert.equal(url.searchParams.get('fc[]'),'it');
 assert.equal(url.searchParams.get('pg'),'2');
 assert.equal(url.searchParams.get('q'),'amour');
});

test('Official WOL verification pages are not mistaken for empty search results',async()=>{
 const {isWolAccessChallenge}=await import('./wolResearch.ts');
 assert.equal(isWolAccessChallenge('<html><h1>JavaScript is disabled</h1>In order to continue, we need to verify that you are not a robot.</html>'),true);
 assert.equal(isWolAccessChallenge('<html><main><h2>Amour</h2><p>Guide de recherche</p></main></html>'),false);
});

test('Exact reference-work subjects are prioritised, and filters do not discard all other search hits',async()=>{
 const {preferredWolHits}=await import('./wolResearch.ts');
 const hits=[
  {title:'Pourquoi montrer de l’amour ?',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/111',excerpt:'',collection:'other' as const},
  {title:'Amour',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/222',excerpt:'',collection:'index' as const},
  {title:'Amour',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/333',excerpt:'',collection:'perspicace' as const},
  {title:'Amour',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/444',excerpt:'',collection:'guide' as const},
 ];
 assert.equal(preferredWolHits(hits,'amour','all')[0].collection,'index');
 assert.deepEqual(preferredWolHits(hits,'amour','guide').map(x=>x.url),[hits[3].url]);
 assert.deepEqual(preferredWolHits(hits,'amour','perspicace').map(x=>x.url),[hits[2].url]);
});
