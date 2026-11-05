import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURED_JW_ORG,decodeMediaCatalogLink,trustedJwCover,catalogKey,combineJwCatalog
} from './jwOrgCatalog.ts';
import {
  publicJwpubQuery,parsePublicJwpubResponse,validateOfflineIndex
} from './offlinePublications.ts';

test('real JW.org magazine links require both publication code and exact issue',()=>{
  const decoded=decodeMediaCatalogLink(
    'https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?alllangs=0&fileformat=PDF%2CEPUB%2CJWPUB&issue=202609&langwritten=F&output=html&pub=w&txtCMSLang=F'
  );
  assert.deepEqual(decoded,{symbol:'w',issue:'202609'});
  const query=new URL(publicJwpubQuery(decoded!.symbol,decoded!.issue));
  assert.equal(query.searchParams.get('pub'),'w');
  assert.equal(query.searchParams.get('issue'),'202609');
  assert.equal(query.searchParams.get('fileformat'),'JWPUB');
  assert.equal(query.searchParams.get('langwritten'),'F');
  assert.throws(()=>publicJwpubQuery('w','2026-09'),/invalide/);
  assert.equal(decodeMediaCatalogLink('https://evil.example/apis/pub-media/GETPUBMEDIALINKS?pub=w&fileformat=JWPUB'),null);
  assert.equal(decodeMediaCatalogLink('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=w&fileformat=PDF'),null);
  assert.equal(decodeMediaCatalogLink('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=w&fileformat=JWPUB&langwritten=E'),null);
});
test('realistic JWPUB response honours issue, French file and trusted CDN URL',()=>{
  const response={pub:'w',issue:'202609',pubName:'La Tour de Garde (édition d’étude)',
    files:{F:{JWPUB:[{filesize:2557938,file:{
      url:'https://cfp2.jw-cdn.org/a/2926796/1/o/w_F_202609.jwpub',checksum:'599dbaeb7f0bc04b8051e362f33b09b5'
    }}]}}};
  const item=parsePublicJwpubResponse(response,'w','202609');
  assert.equal(item?.filename,'w_F_202609.jwpub');
  assert.equal(item?.issue,'202609');
  assert.equal(item?.filesize,2557938);
  assert.equal(parsePublicJwpubResponse(response,'w','202701'),null);
  assert.equal(parsePublicJwpubResponse({...response,pub:'g'},'w','202609'),null);
  assert.equal(parsePublicJwpubResponse({...response,files:{F:{PDF:[]}}},'w','202609'),null);
});
test('catalogue images are limited to official cover host and issues remain distinct',()=>{
  assert.equal(trustedJwCover('https://cms-imgp.jw-cdn.org/img/p/w/202609/F/pt/w_F_202609_lg.jpg'),
    'https://cms-imgp.jw-cdn.org/img/p/w/202609/F/pt/w_F_202609_lg.jpg');
  assert.equal(trustedJwCover('https://cms-imgp.jw-cdn.org.attacker.test/img/p/w.jpg'),'');
  assert.equal(trustedJwCover('javascript:alert(1)'),'');
  const w=FEATURED_JW_ORG.filter(item=>item.symbol==='w');
  assert.equal(w.length,2);
  assert.notEqual(catalogKey(w[0]),catalogKey(w[1]));
  assert.equal(combineJwCatalog([w[0]],[w[0],w[1]]).length,2);
});
test('local index preserves a validated issue for downloaded magazines',()=>{
  const manifest={
    schema:1,origin:'download',publication:{
      symbol:'w',title:'Tour de Garde',language:3,year:2026,issue:'202609'
    },documents:[]};
  assert.deepEqual(validateOfflineIndex(manifest),manifest);
  const invalid={...manifest,publication:{...manifest.publication,issue:'../../../'}};
  assert.equal(validateOfflineIndex(invalid)?.publication.issue,undefined);
});
