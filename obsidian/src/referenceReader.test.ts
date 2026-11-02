import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanWolUrl, extractReferenceEntries, passageUrl, linkifyReaderText } from './referenceReader.ts';
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


test('Bible references containing literal encoded nbsp are recognized and displayed cleanly',()=>{
 const refs=extractReferenceEntries('Voir !!Jean&amp;nbsp;7:24!! et Matthieu&nbsp:10:29.');
 assert.ok(refs.some(ref=>ref.label==='Jean 7:24'),JSON.stringify(refs));
 assert.ok(refs.some(ref=>ref.label==='Matthieu 10:29'),JSON.stringify(refs));
 assert.equal(passageUrl('Jean&amp;nbsp;7:24'),'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7');
});

test('Make exact scripture references clickable while preserving original prose',()=>{
 const input='L’attitude de Jésus en Marc 10:14 rejoint Jean 7:24. Marc 10:14 nous éclaire.';
 const parts=linkifyReaderText(input);
 assert.equal(parts.map(x=>x.text).join(''),input);
 assert.equal(parts.filter(x=>x.url).length,3);
 assert.deepEqual(parts.filter(x=>x.url).map(x=>x.text),['Marc 10:14','Jean 7:24','Marc 10:14']);
 assert.equal(parts.find(x=>x.text==='Jean 7:24')?.url,'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7');
});
test('Use official WOL paragraph anchors and discard malicious or off-site links',()=>{
 const text='Voir Étude complémentaire et Jean 7:24 pour la suite.';
 const p=linkifyReaderText(text,[
   {label:'Étude complémentaire',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024642'},
   {label:'Jean 7:24',url:'https://other.example/fr/wol/d/r30/lp-f/123'},
 ]);
 assert.equal(p.map(x=>x.text).join(''),text);
 assert.equal(p.find(x=>x.text==='Étude complémentaire')?.url,
  'https://wol.jw.org/fr/wol/d/r30/lp-f/2024642');
 assert.equal(p.find(x=>x.text==='Jean 7:24')?.kind,'scripture');
 assert.ok(p.every(x=>!x.url||new URL(x.url).hostname==='wol.jw.org'));
});
test('Do not treat partial words as scripture links',()=>{
 const p=linkifyReaderText('MonJean 7:24X ne doit pas être reconnu.');
 assert.equal(p.filter(x=>x.url).length,0);
});
