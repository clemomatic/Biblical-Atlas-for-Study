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

test('Full chapter-spanning Bible and paragraph-qualified magazine links are highlighted and convertible',()=>{
 const text='Lire Dn 1:1 – 3:30 puis w16.06 20 § 11.';
 const refs=findInlineReferences(text);
 assert.deepEqual(refs.map(x=>x.label),['Dn 1:1 – 3:30','w16.06 20 § 11']);
 assert.deepEqual(refs.map(x=>x.ref.label),['Daniel 1:1-3:30','w16.06 20 § 11']);
 assert.equal(refs[0]?.ref.kind,'scripture');
 assert.equal(refs[1]?.ref.kind,'publication');
 assert.equal(refs[0]?.ref.url,'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/27/1');
 const result=linkReferencesInMarkdown(text);
 assert.equal(result.count,2);
 assert.ok(result.text.includes('[Dn 1:1 – 3:30]('));
 assert.ok(result.text.includes('[w16.06 20 § 11]('));
 assert.equal(linkReferencesInMarkdown(result.text).count,0);
});

test('Accented Hé and Né references become complete, clickable Obsidian links',()=>{
 const text='Voir Hé 11:1, Hé. 4:12 et Né. 2:1 pour approfondir.';
 const references=findInlineReferences(text);
 assert.deepEqual(references.map(ref=>ref.label),['Hé 11:1','Hé. 4:12','Né. 2:1']);
 assert.deepEqual(references.map(ref=>ref.ref.label),[
  'Hébreux 11:1','Hébreux 4:12','Néhémie 2:1']);
 assert.deepEqual(references.map(ref=>ref.ref.url),[
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/58/11',
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/58/4',
  'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/16/2']);
 assert.ok(references.every(ref=>ref.ref.kind==='scripture'));
 const markdown=linkReferencesInMarkdown(text);
 assert.equal(markdown.count,3);
 assert.ok(markdown.text.includes('[Hé 11:1]('));
 assert.ok(markdown.text.includes('[Hé. 4:12]('));
 assert.ok(markdown.text.includes('[Né. 2:1]('));
 assert.equal(linkReferencesInMarkdown(markdown.text).count,0);
});

test('Bold, italic and Markdown headings do not split citations or change source offsets',()=>{
 const examples=[
  {
   line:'## w24 **novembre** p. 21-24 § 4-16',
   raw:'w24 **novembre** p. 21-24 § 4-16',
   canonical:'w24 novembre p. 21-24 § 4-16'
  },
  {
   line:'### *km 5/00 p. 8 § 2*',
   raw:'km 5/00 p. 8 § 2',
   canonical:'km 5/00 p. 8 § 2'
  },
  {
   line:'- km *5/00* p. 8 § 2',
   raw:'km *5/00* p. 8 § 2',
   canonical:'km 5/00 p. 8 § 2'
  },
  {
   line:'**w24 novembre p. 21-24 § 4-16**',
   raw:'w24 novembre p. 21-24 § 4-16',
   canonical:'w24 novembre p. 21-24 § 4-16'
  }
 ];
 for(const {line,raw,canonical} of examples){
  const refs=findInlineReferences(line);
  assert.equal(refs.length,1,line);
  assert.equal(line.slice(refs[0].from,refs[0].to),raw,line);
  assert.equal(refs[0].label,raw,line);
  assert.equal(refs[0].ref.label,canonical,line);
  assert.ok(refs[0].ref.url.includes('wol.jw.org'),line);
 }
 const prose='**km 5/00 p. 8 § 2** et **w24 novembre p. 21-24 § 4-16**';
 const refs=findInlineReferences(prose);
 assert.deepEqual(refs.map(x=>x.ref.label),
  ['km 5/00 p. 8 § 2','w24 novembre p. 21-24 § 4-16']);
 const converted=linkReferencesInMarkdown('## **km 5/00 p. 8 § 2**');
 assert.equal(converted.count,1);
 assert.ok(converted.text.includes('[km 5/00 p. 8 § 2]('));
 assert.equal(linkReferencesInMarkdown(converted.text).count,0);
 const code=String.fromCharCode(96);
 assert.deepEqual(findInlineReferences(code+'km 5/00 p. 8 § 2'+code),[]);
 assert.deepEqual(findInlineReferences('[km 5/00 p. 8 § 2](https://wol.jw.org/fr/wol/d/r30/lp-f/202000163)'),[]);
});
