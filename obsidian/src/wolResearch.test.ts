import test from 'node:test';
import assert from 'node:assert/strict';
import {jwOrgResearchUrl,wolResearchUrl} from './wolResearch.ts';

test('WOL research search URLs contain only official query parameters',()=>{
 const url=new URL(wolResearchUrl(' amour fidèle ',{match:'sen',scope:'all'}));
 assert.equal(url.origin,'https://wol.jw.org');
 assert.equal(url.pathname,'/fr/wol/s/r30/lp-f');
 assert.equal(url.searchParams.get('q'),'amour fidèle');
 assert.equal(url.searchParams.get('p'),'sen');
 assert.equal(url.searchParams.get('r'),'occ');
 assert.equal(url.searchParams.get('st'),'a');
 assert.equal(url.searchParams.get('fc[]'),null);
});
test('Index and Guide use WOL official dx category',()=>{
 for(const scope of ['index','guide'] as const){
  const uri=new URL(wolResearchUrl('miséricorde',{match:'par',scope}));
  assert.equal(uri.searchParams.get('fc[]'),'dx');
  assert.equal(uri.searchParams.get('q'),'miséricorde');
 }
});
test('Perspicace uses it and search pagination remains official',()=>{
 const url=new URL(wolResearchUrl('amour',{match:'par',scope:'perspicace',page:2}));
 assert.equal(url.searchParams.get('fc[]'),'it');
 assert.equal(url.searchParams.get('pg'),'2');
 assert.equal(url.searchParams.get('p'),'par');
});
test('JW.org lookup always uses its official search page',()=>{
 const url=new URL(jwOrgResearchUrl(' la bonté '));
 assert.equal(url.origin,'https://www.jw.org');
 assert.equal(url.pathname,'/fr/rechercher/');
 assert.equal(url.searchParams.get('q'),'la bonté');
});
test('Blank queries are refused and long queries are bounded',()=>{
 assert.throws(()=>jwOrgResearchUrl('   '));
 assert.throws(()=>wolResearchUrl('',{match:'par',scope:'all'}));
 assert.equal(new URL(wolResearchUrl('a'.repeat(500),{match:'par',scope:'all'})).searchParams.get('q')?.length,250);
});
