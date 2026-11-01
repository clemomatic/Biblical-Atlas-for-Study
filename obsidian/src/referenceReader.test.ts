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

test('Legacy WOL /s publication citations are upgraded to /l without rewriting topical searches',()=>{
  const legacy='https://wol.jw.org/fr/wol/s/r30/lp-f?q=w24%20Novembre%20p.%2014-19';
  const corrected='https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19';
  assert.equal(cleanWolUrl(legacy),corrected);
  const found=extractReferenceEntries('[Article source]('+legacy+')');
  assert.equal(found[0]?.url,corrected);
  assert.equal(found[0]?.label,'Article source');
  assert.equal(cleanWolUrl('https://wol.jw.org/fr/wol/s/r30/lp-f?q=amour%20biblique'),
    'https://wol.jw.org/fr/wol/s/r30/lp-f?q=amour%20biblique');
});


test('All bibliographic citations use /l lookup even when saved as legacy /s links',()=>{
 for(const [old,expected] of [
  ['https://wol.jw.org/fr/wol/s/r30/lp-f?q=w24%20Novembre%20p.%2020-25',
   'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+20-25'],
  ['https://wol.jw.org/fr/wol/s/r30/lp-f?q=w18%20f%C3%A9vrier%20p.24-26',
   'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w18+f%C3%A9vrier+p.24-26'],
  ['https://wol.jw.org/fr/wol/l/r30/lp-f?q=w18+f%C3%A9vrier+p.24-26',
   'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w18+f%C3%A9vrier+p.24-26']
 ]){
  assert.equal(cleanWolUrl(old),expected);
  assert.equal(extractReferenceEntries('[Ancienne référence]('+old+')')[0].url,expected);
 }
 const found=extractReferenceEntries('[w24 Novembre p. 20-25]\n[w18 février p.24-26]');
 assert.equal(found.length,2);
 assert.equal(found[0].url,'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+20-25');
 assert.equal(found[1].url,'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w18+f%C3%A9vrier+p.24-26');
});
