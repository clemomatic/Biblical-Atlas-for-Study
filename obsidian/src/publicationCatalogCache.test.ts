import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePublicationCatalogCache,catalogNeedsRefresh,CATALOG_REFRESH_INTERVAL} from './publicationCatalogCache.ts';
const snapshot={schema:1,version:'815ecc5a-e72b-48ac-aa9f-e1e7d256e43b',checkedAt:100000,
  entries:[{symbol:'nwtsty',issue:'',title:'La Bible d’étude',category:'bible',coverUrl:'',sourcePage:'https://example.org'}]};
test('Public metadata is retained with a canonical source and no arbitrary fields',()=>{
  const parsed=parsePublicationCatalogCache(JSON.stringify({...snapshot,privateNotes:'must not persist'}));
  assert.equal(parsed?.entries[0].symbol,'nwtsty');
  assert.equal(parsed?.entries[0].sourcePage,'https://www.jw.org/fr/biblioth%C3%A8que/');
  assert.ok(!('privateNotes' in parsed!));
});
test('Fresh cached catalogues need no network; stale, future and missing snapshots do',()=>{
  const parsed=parsePublicationCatalogCache(JSON.stringify(snapshot));
  assert.equal(catalogNeedsRefresh(parsed,100001),false);
  assert.equal(catalogNeedsRefresh(parsed,100000+CATALOG_REFRESH_INTERVAL),true);
  assert.equal(catalogNeedsRefresh(parsed,99999),true);
  assert.equal(catalogNeedsRefresh(null),true);
});
test('Corrupt files, invalid versions, invalid categories and empty catalogues are ignored',()=>{
  for(const text of ['{','null',JSON.stringify({...snapshot,version:'------------------------------------'}),
    JSON.stringify({...snapshot,entries:[]}),JSON.stringify({...snapshot,entries:[{...snapshot.entries[0],category:'injected'}]})])
    assert.equal(parsePublicationCatalogCache(text),null);
});
test('Cached cover URLs cannot send requests to arbitrary hosts',()=>{
  const parsed=parsePublicationCatalogCache(JSON.stringify({...snapshot,entries:[{...snapshot.entries[0],coverUrl:'https://attacker.example/cover.png'}]}));
  assert.equal(parsed?.entries[0].coverUrl,'');
});
