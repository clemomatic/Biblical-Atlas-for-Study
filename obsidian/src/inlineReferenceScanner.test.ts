import test from 'node:test';
import assert from 'node:assert/strict';
import {findInlineReferences,linkReferencesInMarkdown} from './inlineReferenceScanner.ts';

test('Detect French Bible and publication citations in ordinary notes',()=>{
 const refs=findInlineReferences('Jésus en Marc 10:14 ; w18 février p. 24-26 et lmd 11.');
 assert.deepEqual(refs.map(x=>x.label),['Marc 10:14','w18 février p. 24-26','lmd 11']);
 assert.equal(refs[0].ref.kind,'scripture');
 assert.equal(refs[1].ref.kind,'publication');
 assert.equal(refs[2].ref.kind,'publication');
});
test('Do not interfere with existing links, URLs, code spans or wiki links',()=>{
 const refs=findInlineReferences('Jean 7:24, [Jean 3:16](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/3) et '+String.fromCharCode(96)+'Luc 10:21'+String.fromCharCode(96)+' [[Marc 10:14]]');
 assert.deepEqual(refs.map(x=>x.label),['Jean 7:24']);
});
test('Markdown conversion is opt-in, preserves text, and is idempotent',()=>{
 const input='Une note : Jean 7:24 et w18 février p. 24-26.\n[Marc 10:14](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/41/10)';
 const output=linkReferencesInMarkdown(input);
 assert.equal(output.count,2);
 assert.ok(output.text.includes('[Jean 7:24](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7)'));
 assert.ok(output.text.includes('[w18 février p. 24-26](https://wol.jw.org/fr/wol/l/r30/lp-f?q=w18+f%C3%A9vrier+p.+24-26)'));
 assert.equal(linkReferencesInMarkdown(output.text).count,0);
});
test('Ignore fenced code and YAML frontmatter during explicit conversion',()=>{
 const b=String.fromCharCode(96);
 const input='---\nref: Jean 3:16\n---\n'+b.repeat(3)+'md\nMarc 10:14\n'+b.repeat(3)+'\nPs 145:16';
 const result=linkReferencesInMarkdown(input);
 assert.equal(result.count,1);
 assert.ok(result.text.includes('ref: Jean 3:16'));
 assert.ok(result.text.includes(b.repeat(3)+'md\nMarc 10:14'));
 assert.ok(result.text.includes('[Ps 145:16]('));
});
test('Do not detect incomplete scripture references',()=>{
 assert.deepEqual(findInlineReferences('Jean 7: et un texte normal.'),[]);
});


test('Dotted French Bible abbreviations render exactly as typed',()=>{
 const value='Éph. 5:28-29, Ps. 145:16 et Luc 10:21';
 const refs=findInlineReferences(value);
 assert.deepEqual(refs.map(x=>x.label),['Éph. 5:28-29','Ps. 145:16','Luc 10:21']);
 assert.ok(refs.every(x=>x.ref.kind==='scripture'));
});
test('Bracketed publication citations convert to valid links without nested brackets',()=>{
 const result=linkReferencesInMarkdown('Voyez [w18 février p. 24-26] pour la suite.');
 assert.equal(result.count,1);
 assert.ok(result.text.includes('[w18 février p. 24-26](https://wol.jw.org/'));
 assert.equal(result.text.includes('[[w18'),false);
});

test('An existing Markdown citation keeps the book for subsequent semicolon chapters',()=>{
 const md='[Actes 1:8](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/1) ; 2:1-4, 32, 33 ; 3:6, 7';
 const matches=findInlineReferences(md);
 assert.deepEqual(matches.map(x=>x.label),['2:1-4, 32, 33','3:6, 7']);
 assert.deepEqual(matches.map(x=>x.ref.label),['Actes 2:1-4, 32, 33','Actes 3:6, 7']);
 assert.deepEqual(matches.map(x=>x.ref.url),[
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/2',
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/3']);
 const standalone=findInlineReferences(' ; 2:1-4 ; 3:6, 7','Actes');
 assert.deepEqual(standalone.map(x=>x.ref.label),['Actes 2:1-4','Actes 3:6, 7']);
 assert.equal(findInlineReferences(' ; 2:1-4 ; 3:6, 7').length,0);
});
