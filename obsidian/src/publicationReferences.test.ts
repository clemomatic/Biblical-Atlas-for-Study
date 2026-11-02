import test from 'node:test';
import assert from 'node:assert/strict';
import { findPublicationMentions, publicationUrl, officialFinderUrl, finderDocumentUrl, bookChapterLocator } from './publicationReferences.ts';
import { extractReferenceEntries, cleanWolUrl, passageUrl, linkifyReaderText } from './referenceReader.ts';
import { cleanReadingText } from './readerText.ts';

const WOL='https://wol.jw.org/fr/wol/d/r30/lp-f/';
const parsed=(s:string)=>findPublicationMentions('Lire '+s+' et poursuivre.').map(x=>x.label);
test('recognizes complete article, paragraph, lesson and document references',()=>{
 for(const reference of ['w22 Février p. 13 §15','S-38 §20, 25','S-38 §1','od 8:8','th leçon 12','w18 février p. 24-26','lmd leçon 11']){
  assert.deepEqual(parsed(reference),[reference],reference);
 }
 assert.deepEqual(parsed('S-38 §20, 25')[0],'S-38 §20, 25');
});
test('official canonical references retain the exact verified paragraph destination',()=>{
 assert.equal(publicationUrl('w22 Février p. 13 §15'),WOL+'2022281');
 assert.equal(publicationUrl('th leçon 12'),WOL+'1102018452');
 assert.equal(new URL(publicationUrl('S-38 §1')).searchParams.get('par'),'31');
 assert.equal(new URL(publicationUrl('S-38 §20, 25')).searchParams.get('par'),'60');
 assert.equal(publicationUrl('od 8:8'),WOL+'1102014938');
 assert.equal(new URL(publicationUrl('S-38 §9')).searchParams.get('par'),null,
  'Do not invent an offset to guess unknown paragraphs');
});
test('official WOL index supplies book and course citation families without false positives',()=>{
 const samples=['bt chap. 3 §6','cl chapitre 20 §1','it-1 p. 24','lfb hist. 103',
  'lff leçon 27','rr chap. 14 §12','od chap. 8 p. 71-86',
  'it-1 875','od 42-43','w22.11 5-6','mwb18.04 8','km 7/15 1', ];
 for(const item of samples){
  assert.deepEqual(parsed(item),[item],item);
 }
 assert.equal(findPublicationMentions('Le mot cl apparaît ici.').length,0);
 assert.equal(findPublicationMentions('Jr 45:3 et od 8:8').some(x=>x.label==='Jr 45:3'),false);
 assert.deepEqual(parsed('od 8:8'),['od 8:8']);
 assert.deepEqual(bookChapterLocator('od 9:4'),{code:'od',chapter:9});
 assert.deepEqual(bookChapterLocator('rr chap. 14 §12'),{code:'rr',chapter:14});
});
test('validated finder URLs are accepted but arbitrary hosts and parameters are refused',()=>{
 const url=publicationUrl('od 8:8');
 assert.equal(cleanWolUrl(url),url);
 assert.equal(url,WOL+'1102014938');
 const s38=publicationUrl('S-38 §1');
 assert.equal(officialFinderUrl(s38),s38);
 assert.equal(officialFinderUrl(s38.replaceAll('&','\\&')),s38);
 assert.equal(officialFinderUrl(s38.replace('www.jw.org','jw.org')),s38);
 assert.equal(finderDocumentUrl(s38),WOL+'1201038');
 const suppliedOdFinder='https://www.jw.org/finder?wtlocale=F&docid=1102014931&srctype=wol&srcid=share&par=11';
 assert.ok(officialFinderUrl(suppliedOdFinder));
 assert.notEqual(finderDocumentUrl(suppliedOdFinder),url,
   'The supplied finder targets chapter 1, not the chapter 8 citation');
 for(const invalid of ['https://evil.example/finder?wtlocale=F&docid=1201038',
  'https://www.jw.org.evil.example/finder?wtlocale=F&docid=1201038',
  'https://www.jw.org/finder?wtlocale=F&docid=1234567&redirect=https://evil.example',
  'http://www.jw.org/finder?wtlocale=F&docid=1201038',
  'https://www.jw.org/finder?wtlocale=E&docid=1201038',
  'https://www.jw.org/finder?wtlocale=F&docid=1201038&par=-2']){
   assert.equal(officialFinderUrl(invalid),null,invalid);
 }
});
test('all citation pathways preserve publication reference and official URL',()=>{
 const refs=extractReferenceEntries('Voir S-38 §1, od 8:8, th leçon 12 et w22 Février p. 13 §15.');
 for(const label of ['S-38 §1','od 8:8','th leçon 12','w22 Février p. 13 §15']){
  const ref=refs.find(r=>r.label===label);
  assert.ok(ref,label);
  assert.equal(ref?.url,publicationUrl(label),label);
 }
 const inline=linkifyReaderText('Consulte th leçon 12 et S-38 §20, 25.');
 assert.equal(inline.map(x=>x.text).join(''),'Consulte th leçon 12 et S-38 §20, 25.');
 assert.equal(inline.filter(x=>x.url).length,2);
 assert.equal(passageUrl('od 8:8'),publicationUrl('od 8:8'));
});
test('study verse citation cleanup removes encoded spaces and numeric internal IDs',()=>{
 assert.equal(cleanReadingText('Isaïe&amp;nbsp;26:3'),'Isaïe 26:3');
 assert.equal(cleanReadingText('Psaume&nbsp;119:165'),'Psaume 119:165');
});
