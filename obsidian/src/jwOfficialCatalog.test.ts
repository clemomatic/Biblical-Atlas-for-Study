import test from 'node:test';
import assert from 'node:assert/strict';
import {officialPageUrl,parseOfficialDownloadLink,officialCoverUrl,
 isOfficialCatalogHtmlUrl} from './jwOfficialCatalog.ts';
test('Official French library category URL and pagination are allowlisted',()=>{
 assert.equal(officialPageUrl('livres',12),
  'https://www.jw.org/fr/biblioth%C3%A8que/livres/?start=12');
 assert.throws(()=>officialPageUrl('livres',13),/invalide/);
 assert.throws(()=>officialPageUrl('livres',432),/invalide/);
 assert.equal(isOfficialCatalogHtmlUrl(officialPageUrl('programmes')),true);
 assert.equal(isOfficialCatalogHtmlUrl('https://www.jw.org.attacker.tld/fr/biblioth%C3%A8que/livres/'),false);
});
test('Download identity preserves magazine issue, refuses unsafe services',()=>{
 const href='https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?alllangs=0&fileformat=PDF%2CJWPUB&issue=202609&langwritten=F&pub=w';
 assert.deepEqual(parseOfficialDownloadLink(href),{symbol:'w',issue:'202609'});
 assert.deepEqual(parseOfficialDownloadLink(href.replace('issue=202609','issue=202701')),{symbol:'w',issue:'202701'});
 assert.equal(parseOfficialDownloadLink(href.replace('b.jw-cdn.org','evil.invalid')),null);
 assert.equal(parseOfficialDownloadLink(href.replace('issue=202609','issue=../../foo')),null);
 assert.deepEqual(parseOfficialDownloadLink('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=co-pgm26'),
 {symbol:'co-pgm26',issue:''});
});
test('Only genuine official cover hosts are accepted',()=>{
 assert.equal(officialCoverUrl('https://cms-imgp.jw-cdn.org/img/p/w/202609/F/pt/w_F_202609_lg.jpg'),
 'https://cms-imgp.jw-cdn.org/img/p/w/202609/F/pt/w_F_202609_lg.jpg');
 assert.equal(officialCoverUrl('https://evil.invalid/img/p/w/202609/F/pt/img.jpg'),null);
});
