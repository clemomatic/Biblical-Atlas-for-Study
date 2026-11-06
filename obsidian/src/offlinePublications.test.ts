import test from 'node:test';
import assert from 'node:assert/strict';
import {
  publicJwpubQuery,parsePublicJwpubResponse,trustedPublicationFileUrl,
  validateOfflineIndex,directWolMepsId,isJwpubArchive
} from './offlinePublications.ts';

test('Official French catalog requests and conservative CDN URL handling',()=>{
 const url=new URL(publicJwpubQuery('ca-copgm27'));
 assert.equal(url.hostname,'b.jw-cdn.org');
 assert.equal(url.searchParams.get('pub'),'ca-copgm27');
 assert.equal(url.searchParams.get('langwritten'),'F');
 assert.equal(url.searchParams.get('fileformat'),'JWPUB');
 assert.throws(()=>publicJwpubQuery('https://example.net'),/invalide/);
 assert.equal(trustedPublicationFileUrl('https://download-a.akamaihd.net/files/pub.jwpub'),
   'https://download-a.akamaihd.net/files/pub.jwpub');
 assert.equal(trustedPublicationFileUrl('https://download-a.akamaihd.net.attacker.tld/x'),null);
 assert.equal(trustedPublicationFileUrl('http://b.jw-cdn.org/x'),null);
});
test('Official catalog results are treated as unverified until a validated JWPUB file exists',()=>{
 const answer={pubName:'Mon programme',
  files:{F:{JWPUB:[{filesize:456,file:{url:'https://download-a.akamaihd.net/p/one.jwpub',checksum:'abc'}}]}}};
 assert.deepEqual(parsePublicJwpubResponse(answer,'co-pgm26'),{
   symbol:'co-pgm26',title:'Mon programme',
   url:'https://download-a.akamaihd.net/p/one.jwpub',
   filename:'co-pgm26_F.jwpub',filesize:456,checksum:'abc'
 });
 assert.equal(parsePublicJwpubResponse({files:{E:{JWPUB:[]}}},'co-pgm26'),null);
 assert.equal(parsePublicJwpubResponse({...answer,files:{F:{JWPUB:[{filesize:100,file:{url:'https://evil.invalid/file'}}]}}},'co-pgm26'),null);
 assert.equal(isJwpubArchive(new Uint8Array([0x50,0x4b,0x03,0x04])),true);
 assert.equal(isJwpubArchive(new Uint8Array([0x50,0x4b,0x00,0x04])),false);
});
test('Index validates local paths and exact French WOL document IDs, never infers from titles',()=>{
 const manifest={schema:1,publication:{symbol:'w24',year:2024,language:3,title:'Tour de Garde'},documents:[
  {documentId:2,mepsId:2024405,title:'Titre',path:'002 · Titre.md'}
 ]};
 assert.deepEqual(validateOfflineIndex(manifest),manifest);
 assert.equal(directWolMepsId('https://wol.jw.org/fr/wol/d/r30/lp-f/2024405#h=5'),2024405);
 assert.equal(directWolMepsId('https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24'),null);
 assert.equal(directWolMepsId('https://wol.jw.org.attacker.tld/fr/wol/d/r30/lp-f/2024405'),null);
 assert.equal(validateOfflineIndex({...manifest,documents:[{...manifest.documents[0],path:'../secrets.md'}]}),null);
});


test('NWT and study Bible are discoverable and large JWPUB files are not silently rejected',()=>{
 for(const symbol of ['nwt','nwtsty']){
  const request=new URL(publicJwpubQuery(symbol));
  assert.equal(request.searchParams.get('pub'),symbol);
  assert.equal(request.searchParams.get('booknum'),'0');
  const size=220*1024*1024;
  const media={pub:symbol,pubName:symbol,files:{F:{JWPUB:[{
   filesize:size,file:{url:'https://b.jw-cdn.org/path/'+symbol+'.jwpub'}
  }]}}};
  const entry=parsePublicJwpubResponse(media,symbol);
  assert.equal(entry?.filesize,size);
  assert.equal(entry?.filename,symbol+'_F.jwpub');
 }
 const oversized={pub:'w',files:{F:{JWPUB:[{
  filesize:220*1024*1024,file:{url:'https://b.jw-cdn.org/path/w.jwpub'}
 }]}}};
 assert.equal(parsePublicJwpubResponse(oversized,'w'),null);
});

test('The real combined Insight download is accepted under either historical volume alias',()=>{
 for(const symbol of ['it','it-1','it-2']){
  assert.equal(new URL(publicJwpubQuery(symbol)).searchParams.get('pub'),'it');
  const answer={pub:'it',pubName:'Étude perspicace des Écritures',files:{F:{JWPUB:[{
   pub:'it',filesize:353748857,file:{url:'https://cfp2.jw-cdn.org/a/888b64/2/o/it_F.jwpub'}
  }]}}};
  const entry=parsePublicJwpubResponse(answer,symbol);
  assert.equal(entry?.symbol,'it');assert.equal(entry?.filename,'it_F.jwpub');assert.equal(entry?.filesize,353748857);
 }
 const wrong={pub:'nwtsty',files:{F:{JWPUB:[{pub:'it',filesize:5,file:{url:'https://cfp2.jw-cdn.org/a/pub.jwpub'}}]}}};
 assert.equal(parsePublicJwpubResponse(wrong,'nwtsty'),null);
});
