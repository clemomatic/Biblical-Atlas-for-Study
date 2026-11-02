import test from 'node:test';
import assert from 'node:assert/strict';
import {citationParagraphs,findPublicationCitations,publicationLookupLabel,verifiedPublicationUrl} from './publicationCitations.ts';
import {cleanWolUrl,passageUrl,extractReferenceEntries} from './referenceReader.ts';
import {findInlineReferences,linkReferencesInMarkdown} from './inlineReferenceScanner.ts';
import {cleanReadingText} from './readerText.ts';

test('Recognize S-38, th lesson and Watchtower paragraphs without swallowing neighbouring prose',()=>{
 const note='Voir S-38 §20, 25 puis w22 Février p. 13 §15, enfin th leçon 12.';
 const refs=findInlineReferences(note);
 assert.deepEqual(refs.map(x=>x.label),['S-38 §20, 25','w22 Février p. 13 §15','th leçon 12']);
 assert.deepEqual(citationParagraphs(refs[0].label),[20,25]);
 assert.deepEqual(citationParagraphs(refs[1].label),[15]);
 assert.equal(publicationLookupLabel(refs[1].label),'w22 Février p. 13');
 assert.equal(findPublicationCitations('Nº 18 et une note ordinaire').length,0);
});
test('Use verified original WOL document identifiers for the three examples',()=>{
 assert.equal(passageUrl('S-38 §20, 25'),'https://wol.jw.org/fr/wol/d/r30/lp-f/1201038');
 assert.equal(passageUrl('th leçon 12'),'https://wol.jw.org/fr/wol/d/r30/lp-f/1102018452');
 assert.equal(passageUrl('w22 Février p. 13 §15'),'https://wol.jw.org/fr/wol/d/r30/lp-f/2022281');
 assert.equal(verifiedPublicationUrl('w23 mars p. 12 §3'),null);
 assert.equal(passageUrl('w23 mars p. 12 §3'),'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w23+mars+p.+12');
});
test('Accept only French official jw.org document finder share URLs',()=>{
 assert.equal(cleanWolUrl('https://www.jw.org/finder?wtlocale=F&docid=1201038&srctype=wol&srcid=share&par=60'),
 'https://wol.jw.org/fr/wol/d/r30/lp-f/1201038');
 assert.equal(cleanWolUrl('https://www.jw.org/finder?wtlocale=E&docid=1201038'),null);
 assert.equal(cleanWolUrl('https://www.jw.org/finder?wtlocale=F&docid=bad'),null);
 assert.equal(cleanWolUrl('https://evil.example/finder?wtlocale=F&docid=1201038'),null);
});
test('Plain notes and opt-in link conversion include all publication references',()=>{
 const note='Voir S-38 §20, 25 ; w22 Février p. 13 §15 ; th leçon 12.';
 const entries=extractReferenceEntries(note);
 assert.equal(entries.filter(x=>x.kind==='publication').length,3);
 const linked=linkReferencesInMarkdown(note);
 assert.equal(linked.count,3);
 assert.equal(linkReferencesInMarkdown(linked.text).count,0);
 assert.ok(linked.text.includes('[S-38 §20, 25](https://wol.jw.org/fr/wol/d/r30/lp-f/1201038)'));
});
test('Decode encoded nonbreaking spaces without a browser DOM',()=>{
 assert.equal(cleanReadingText('Psaume&amp;nbsp;119:165'),'Psaume 119:165');
 // Numeric note labels are tested with a real DOMParser in Playwright.
});
