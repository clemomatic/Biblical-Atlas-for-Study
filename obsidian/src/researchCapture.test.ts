import test from 'node:test';
import assert from 'node:assert/strict';
import { filterReferenceEntries, researchCaptureMarkdown } from './researchCapture.ts';
import type { ReferenceEntry } from './referenceReader.ts';

const scripture:ReferenceEntry={
  label:'Matthieu 10:29', url:'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/40/10',
  kind:'scripture',origin:'verse'
};
const publication:ReferenceEntry={
  label:'w24 Novembre p. 14-19',url:'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19',
  kind:'publication',origin:'brackets'
};

test('Research filter is accent insensitive and preserves source order',()=>{
  const refs=[scripture,publication,{...scripture,label:'Jérémie 45:3'}];
  assert.deepEqual(filterReferenceEntries(refs,'  NOVEMBRE  '),[publication]);
  assert.deepEqual(filterReferenceEntries(refs,'jeremie'),[refs[2]]);
  assert.deepEqual(filterReferenceEntries(refs,''),refs);
});

test('Research capture adds editable prompts, with official link not publication text',()=>{
  const result=researchCaptureMarkdown(scripture);
  assert.match(result,/\[!question\] Piste à explorer/);
  assert.match(result,/\[Matthieu 10:29\]\(https:\/\/wol\.jw\.org\/fr\/wol\/b\/r30\/lp-f\/nwt\/40\/10\)/);
  assert.match(result,/Question à approfondir/);
  assert.doesNotMatch(result,/import|manifest\.json|userData\.db/);
});

test('Resolved WOL document is preferred but external URLs are rejected',()=>{
  const resolved='https://wol.jw.org/fr/wol/d/r30/lp-f/2024642';
  assert.match(researchCaptureMarkdown(publication,resolved),/2024642/);
  assert.doesNotMatch(researchCaptureMarkdown(publication,'https://untrusted.example/malicious'),/untrusted/);
  assert.throws(()=>researchCaptureMarkdown({...scripture,url:'https://untrusted.example/x'}),/WOL/);
});

test('Research capture sanitizes Markdown and control characters from titles',()=>{
  const entry={...scripture,label:'Titre [essai]_*\n> une piste'};
  const result=researchCaptureMarkdown(entry);
  assert.match(result,/Titre \\[essai\\]\\_\\\*/);
  assert.doesNotMatch(result,/\n> une piste/);
  assert.match(result,/Source : /);
});
