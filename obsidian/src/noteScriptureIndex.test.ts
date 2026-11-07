import test from 'node:test';
import assert from 'node:assert/strict';
import {noteScriptures,findNoteScriptures,scripturesOverlap} from './noteScriptureIndex.ts';
import {parseScripture} from './bibleLabData.ts';
test('All note occurrences keep their author idea, source line and section',()=>{
  const md='# Amitié\nLes anciens cultivent l’amitié (Pr 17:17 ; Jean 15:13).\nUne autre application (Proverbes 17:17).';
  const hits=noteScriptures('Discours/Amis.md','Amis',md);
  assert.equal(hits.length,3);assert.equal(hits[0].line,1);assert.equal(hits[0].heading,'Amitié');
  assert.equal(hits[0].idea,'Les anciens cultivent l’amitié.');
  assert.equal(md.split('\n')[hits[0].line].slice(hits[0].from,hits[0].to),'Pr 17:17');
  assert.equal(findNoteScriptures(hits,'Proverbes 17:17').length,2);
  assert.equal(findNoteScriptures(hits,'anciens amitie').length,2);
});
test('Links, abbreviation inheritance, lists and crossing chapter ranges retain exact verses',()=>{
  const md='Une idée ([Jean 3:16](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/3) ; 4:1).\nUne plage (Dn 1:1–3:30).\nChoix (Jean 3:16,18).';
  const hits=noteScriptures('Etude.md','Étude',md);
  assert.equal(findNoteScriptures(hits,'Jean 4:1').length,1);
  assert.equal(findNoteScriptures(hits,'Daniel 2:8').length,1);
  assert.equal(findNoteScriptures(hits,'Jean 3:17').length,0);
  assert.equal(findNoteScriptures(hits,'Jean 3:18').length,1);
  assert.ok(hits[0].idea.startsWith('Une idée'));
});
test('Code, YAML and HTML comments do not become study references',()=>{
  const md='---\nsource: Jean 1:1\n---\n```md\nJean 2:2\n```\n`Jean 3:3`\n<!-- Jean 4:4 -->\n<!--\nJean 5:5\n-->\nUne vraie idée (Jean 6:6).';
  const hits=noteScriptures('Ordinaire.md','Ordinaire',md);
  assert.deepEqual(hits.map(h=>h.label),['Jean 6:6']);
});
test('Verse intersections do not confuse a book, neighbouring chapter or omitted verse',()=>{
  const yes=(a:string,b:string)=>scripturesOverlap(parseScripture(a)!,parseScripture(b)!);
  assert.ok(yes('Jean 3:16-18','Jn 3:18'));
  assert.ok(!yes('Jean 3:16,18','Jean 3:17'));
  assert.ok(!yes('Jean 3:16','1 Jean 3:16'));
  assert.ok(!yes('Jean 3:16','Jean 4:16'));
});
