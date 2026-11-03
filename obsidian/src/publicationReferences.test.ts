import test from 'node:test';
import assert from 'node:assert/strict';
import { findPublicationMentions, publicationUrl, officialFinderUrl, finderDocumentUrl, bookChapterLocator, referencedParagraphs } from './publicationReferences.ts';
import { extractReferenceEntries, cleanWolUrl, passageUrl, linkifyReaderText } from './referenceReader.ts';
import { cleanReadingText } from './readerText.ts';

const WOL='https://wol.jw.org/fr/wol/d/r30/lp-f/';
const parsed=(s:string)=>findPublicationMentions('Lire '+s+' et poursuivre.').map(x=>x.label);
test('recognizes complete article, paragraph, lesson and document references',()=>{
 for(const reference of ['w22 Février p. 13 §15','S-38 §20, 25','S-38 §1','od 8:8','th leçon 12','w18 février p. 24-26','lmd leçon 11']){
  assert.deepEqual(parsed(reference),[reference],reference);
 }
 assert.deepEqual(parsed('S-38 §20, 25')[0],'S-38 §20, 25');
 assert.deepEqual(referencedParagraphs('S-38 §20, 25'),['20','25']);
 assert.deepEqual(referencedParagraphs('w22 Février p. 13 §15'),['15']);
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

test('Monthly kingdom ministry is recognized even without page information',()=>{
 const examples=['km 05/95','km 5/95','km 05/95 p. 2','km 12/99 p. 7'];
 for(const example of examples)
  assert.deepEqual(findPublicationMentions('Voir '+example+'.').map(x=>x.label),[example]);
 assert.equal(publicationUrl('km 05/95'),
  'https://wol.jw.org/fr/wol/l/r30/lp-f?q=km+5%2F95');
 assert.equal(publicationUrl('km 05/95 p. 2'),
  'https://wol.jw.org/fr/wol/l/r30/lp-f?q=km+5%2F95+p.+2');
 for(const invalid of ['km 00/95','km 13/95','km 34/95']){
  assert.deepEqual(findPublicationMentions(invalid),[],invalid);
 }
});

test('Historic dated Watchtower and Insight / si references are captured as complete units',()=>{
 const citations=[
  'w14 15/11 28-29',
  'w14 15/11 p. 28-30',
  'it-1 875',
  'it-2 « Sanctuaire » § 5',
  'it-1 « Esprit » § 51',
  'it « Sanctuaire »',
  'si p. 337-349',
  'si 263-264',
  'si étude 10'
 ];
 for(const citation of citations){
  const mentions=findPublicationMentions('Consulter '+citation+' pour approfondir.');
  assert.deepEqual(mentions.map(ref=>ref.label),[citation],citation);
 }
 assert.equal(publicationUrl('w14 15/11 28-29'),
  'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w14+15%2F11+p.+28-29');
 for(const invalid of ['w14 32/11 28-29','w14 15/13 28-29','w14 15/11 30-28']){
  assert.equal(findPublicationMentions(invalid).length,0,invalid);
 }
});

test('Ranges after paragraph marker are inclusive',()=>{
 assert.deepEqual(referencedParagraphs('it-1 510 § 3-4'),['3','4']);
 assert.deepEqual(referencedParagraphs('S-38 § 20, 25'),['20','25']);
});

test('Old Awake and yearbook forms are captured as a whole citation',()=>{
 for(const citation of ['g 2/12 3-13','g 11/07 3-13','yb17 197','yb96 218']){
  assert.deepEqual(parsed(citation),[citation],citation);
  assert.ok(publicationUrl(citation).startsWith('https://wol.jw.org/fr/wol/l/r30/lp-f?q='));
 }
});

test('Compact Watchtower citations preserve paragraph numbers as part of the clickable reference',()=>{
 const examples=['w16.06 20 § 11','w16.06 20 §11','w16.06 20 § 11-13',
   'w24.08 28 § 7','mwb20.03 7 § 5','g22.1 3 § 2'];
 for(const citation of examples){
   assert.deepEqual(parsed(citation),[citation],citation);
   const ref=findPublicationMentions(citation)[0];
   assert.equal(ref.from,0,citation);
   assert.equal(ref.to,citation.length,citation);
   assert.ok(ref.url.startsWith('https://wol.jw.org/fr/wol/l/'),citation);
   assert.ok(!new URL(ref.url).searchParams.get('q')?.includes('§'),
     'The WOL lookup must use the page, while the complete label keeps the paragraph');
 }
 assert.deepEqual(referencedParagraphs('w16.06 20 § 11'),['11']);
 assert.deepEqual(referencedParagraphs('w16.06 20 § 11-13'),['11','12','13']);
 const matches=extractReferenceEntries('Étudier w16.06 20 § 11 et mwb20.03 7 § 5.');
 assert.deepEqual(matches.map(item=>item.label),['w16.06 20 § 11','mwb20.03 7 § 5']);
});

test('Watchtower and Kingdom Ministry references retain full page and paragraph spans',()=>{
 const examples=[
  'w24 novembre p. 21-24 § 4-16',
  'w24 novembre p. 21-24 §4-16',
  'km 5/00 p. 8 § 2',
  'km 05/00 p. 8 §2',
  'km 5/00 8 § 2',
  'g 2/12 3-13 § 4',
  'yb17 197 § 3'
 ];
 for(const citation of examples){
  const matches=findPublicationMentions('Voir '+citation+'.');
  assert.deepEqual(matches.map(x=>x.label),[citation],citation);
  assert.ok(!new URL(matches[0].url).searchParams.get('q')?.includes('§'),citation);
 }
 assert.deepEqual(referencedParagraphs('w24 novembre p. 21-24 § 4-16'),
  Array.from({length:13},(_,i)=>String(i+4)));
 assert.deepEqual(referencedParagraphs('km 5/00 p. 8 § 2'),['2']);
 assert.equal(publicationUrl('km 5/00 p. 8 § 2'),
  'https://wol.jw.org/fr/wol/l/r30/lp-f?q=km+5%2F00+p.+8');
 assert.equal(publicationUrl('km 05/00 p. 8 §2'),
  publicationUrl('km 5/00 p. 8 § 2'));
});
