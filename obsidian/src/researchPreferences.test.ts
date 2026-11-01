import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedReaderPreferences,wolLanguageFromUrl,wolPrefix,wolRoute} from './researchPreferences.ts';

test('Legacy settings stay French and preserve readable defaults',()=>{
 const p=normalizedReaderPreferences(null);
 assert.deepEqual(p,{language:'fr',readerSize:'comfortable',showReaderNotes:true,readerRelatedLimit:20,readerCacheMinutes:30});
 assert.equal(normalizedReaderPreferences({language:'de' as any}).language,'fr');
});
test('Supported official WOL routes are exact and never inferred',()=>{
 const routes={fr:'r30/lp-f',en:'r1/lp-e',pt:'r5/lp-t',es:'r4/lp-s'} as const;
 for(const [lang,route] of Object.entries(routes)){
  assert.equal(wolRoute(lang as keyof typeof routes),route);
  assert.equal(wolLanguageFromUrl(wolPrefix(lang as keyof typeof routes)+'d/'+route+'/123456'),lang);
 }
 assert.equal(wolLanguageFromUrl('https://wol.jw.org.evil.test/fr/wol/d/r30/lp-f/123'),null);
 assert.equal(wolLanguageFromUrl('http://wol.jw.org/fr/wol/d/r30/lp-f/123'),null);
 assert.equal(wolLanguageFromUrl('https://wol.jw.org/de/wol/d/r10/lp-x/123'),null);
});
test('Preferences validate reader choices rather than trusting untyped disk data',()=>{
 const p=normalizedReaderPreferences({language:'es',readerSize:'large',showReaderNotes:false,readerRelatedLimit:35,readerCacheMinutes:0});
 assert.equal(p.language,'es');assert.equal(p.readerRelatedLimit,35);assert.equal(p.readerCacheMinutes,0);
 assert.equal(normalizedReaderPreferences({readerRelatedLimit:500 as any,readerCacheMinutes:500 as any}).readerRelatedLimit,20);
});
