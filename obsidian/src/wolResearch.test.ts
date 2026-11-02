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
