import test from 'node:test';
import assert from 'node:assert/strict';
import {isBibliographicCitation,isExactBibliographicResult,normalizeBibliographicText} from './wolBibliography.ts';
test('Bibliographic citations: multiple years and accent variants',()=>{
 for(const citation of [
  'w24 Novembre p. 14-19','w24 Novembre p. 20-25',
  'w18 février p.24-26','w18 février p. 24-26','mwb24 novembre p. 4-5'
 ])assert.equal(isBibliographicCitation(citation),true);
 for(const topic of ['amour biblique','Jésus 2:4','surmonter une injustice'])assert.equal(isBibliographicCitation(topic),false);
});
test('Exact match ignores variable spacing, French accents and nonbreaking spaces',()=>{
 assert.equal(normalizeBibliographicText('w18 février p.24–26'),
  normalizeBibliographicText('w18 fevrier p. 24-26'));
 assert.ok(isExactBibliographicResult('w18 février p.24-26',
  'Français · w18\u00a0février p. 24-26 - La Tour de Garde (étude)'));
 assert.ok(isExactBibliographicResult('w24 Novembre p. 20-25',
  'Frères, vous qualifiez-vous pour devenir anciens ? w24 novembre p.20–25 - La Tour de Garde'));
});
test('Never select an unrelated result with just year and month',()=>{
 assert.equal(isExactBibliographicResult('w24 Novembre p. 20-25','w24 novembre p. 14-19'),false);
 assert.equal(isExactBibliographicResult('w18 février p.24-26','w18 février p. 20-23'),false);
 assert.equal(isExactBibliographicResult('w24 novembre p. 20-25','w24 novembre p. 20-250'),false);
});
