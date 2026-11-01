import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanWolUrl, extractReferenceEntries, passageUrl } from './referenceReader.ts';
import { wolLookup } from './bibleLabData.ts';

test('Correct WOL lookup endpoint and application/x-www-form-urlencoded encoding',()=>{
 assert.equal(wolLookup('w24 Novembre p. 14-19'),'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19');
 assert.equal(passageUrl('w24 Novembre p. 14-19'),wolLookup('w24 Novembre p. 14-19'));
 assert.equal(passageUrl('Matthieu 10:29'),'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/40/10');
});

test('Combines scripture, !!reference!!, publication brackets and linked WOL documents',()=>{
 const note=[
 '# Une recherche',
 '!!Matthieu 10:29; w24 Novembre p. 14-19!!',
 'Et Ps 145:16, Jean 7:24.',
 '[w24 Novembre p. 14-19]',
 '[Article complet](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663)',
 '[Renvoi direct](https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19)',
 '[https://wol.jw.org/fr/wol/d/r30/lp-f/1001070610]',
 '[Sans relation](https://example.com/unsafe)',
 '~~Ceci~~'
 ].join('\n');
 const r=extractReferenceEntries(note);
 for(const label of ['Matthieu 10:29','w24 Novembre p. 14-19','Ps 145:16','Jean 7:24','Article complet','Renvoi direct'])
   assert.ok(r.some(x=>x.label===label),'Missing '+label);
 assert.equal(r.filter(x=>x.label==='w24 Novembre p. 14-19').length,1);
 assert.equal(r.find(x=>x.label==='Article complet')?.url,'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663');
 assert.ok(r.every(x=>x.url.startsWith('https://wol.jw.org/fr/wol/')));
});

test('Only official WOL URLs are accepted, code and YAML links ignored',()=>{
 assert.equal(cleanWolUrl('https://wol.jw.org/fr/wol/d/r30/lp-f/1#anchor'),'https://wol.jw.org/fr/wol/d/r30/lp-f/1');
 for(const bad of ['https://wol.jw.org.evil.example/fr/wol/d/1','http://wol.jw.org/fr/wol/d/r30/lp-f/1','https://wol.jw.org@evil.example/fr/wol/d/1','https://example.com/','file:///etc/passwd'])
   assert.equal(cleanWolUrl(bad),null);
 const note=[
 '---','source: https://wol.jw.org/fr/wol/d/r30/lp-f/99','---',
 '```md','[Hidden](https://wol.jw.org/fr/wol/d/r30/lp-f/88)','```',
 'Visible [Document](https://wol.jw.org/fr/wol/d/r30/lp-f/11)'
 ].join('\n');
 const r=extractReferenceEntries(note);
 assert.equal(r.length,1);assert.equal(r[0].label,'Document');
 assert.equal(r[0].url,'https://wol.jw.org/fr/wol/d/r30/lp-f/11');
});
