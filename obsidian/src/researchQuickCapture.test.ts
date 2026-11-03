import test from 'node:test';
import assert from 'node:assert/strict';
import { quickCaptureCandidate,wolSourceLabel } from './researchQuickCapture.ts';

test('Quick capture from a WOL paragraph link preserves precise anchor',()=>{
  const candidate=quickCaptureCandidate('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3');
  assert.deepEqual(candidate,{
    label:'Document WOL · 2024663',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3',
    excerpt:'',comment:''
  });
});
test('Copied quotation is stored as an excerpt with a previously selected WOL source',()=>{
  const url='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=2';
  const candidate=quickCaptureCandidate('On peut\n approfondir cette réflexion.',url);
  assert.equal(candidate?.label,'On peut approfondir cette réflexion.');
  assert.equal(candidate?.excerpt,'On peut\n approfondir cette réflexion.');
  assert.equal(candidate?.url,url);
});
test('Text never causes untrusted URL navigation and empty clipboard can still save a known WOL tab',()=>{
  const source='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
  assert.equal(quickCaptureCandidate('',source)?.url,source);
  assert.equal(quickCaptureCandidate('https://wol.jw.org.attacker.test/phish')?.url,'');
  assert.equal(quickCaptureCandidate('https://wol.jw.org.attacker.test/phish')?.excerpt,
    'https://wol.jw.org.attacker.test/phish');
  assert.equal(quickCaptureCandidate(' '),null);
  assert.equal(wolSourceLabel('https://wol.jw.org/fr/wol/s/r30/lp-f?q=amiti%C3%A9'),
    'Recherche WOL · amitié');
});
