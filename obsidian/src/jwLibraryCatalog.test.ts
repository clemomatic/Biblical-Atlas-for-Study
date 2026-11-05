import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'fflate';
import {
  JW_LIBRARY_CATALOG_MANIFEST,parseJwLibraryCatalogManifest,
  jwLibraryCatalogDownloadUrl,isSqliteDatabase,
  jwLibraryCatalogRow,extractJwLibraryCatalog,decodeJwLibraryCatalogPayload,
  MAX_CATALOG_GZIP_BYTES,MAX_CATALOG_SQLITE_BYTES
} from './jwLibraryCatalog.ts';

const version='815ecc5a-e72b-48ac-aa9f-e1e7d256e43b';

test('Manifest uses a strict version ID and cannot redirect the catalogue request',()=>{
  assert.equal(parseJwLibraryCatalogManifest({version:1,current:version}),version);
  assert.equal(jwLibraryCatalogDownloadUrl(version),
    'https://app.jw-cdn.org/catalogs/publications/v4/'+version+'/catalog.db.gz');
  for(const current of ['https://evil.example/catalog.db.gz','../private','a'.repeat(36)]){
    assert.throws(()=>parseJwLibraryCatalogManifest({version:1,current}));
    assert.throws(()=>jwLibraryCatalogDownloadUrl(current));
  }
  assert.throws(()=>parseJwLibraryCatalogManifest({version:0,current:version}));
  assert.ok(MAX_CATALOG_GZIP_BYTES<MAX_CATALOG_SQLITE_BYTES);
  assert.ok(JW_LIBRARY_CATALOG_MANIFEST.endsWith('/manifest.json'));
});

test('Only French public rows with real codes become bookcase entries',()=>{
  const input={MepsLanguageId:3,Symbol:'w',Year:2026,IssueTagNumber:202609,
    Title:'La Tour de Garde',IssueTitle:'Septembre 2026',Reserved:0};
  const item=jwLibraryCatalogRow(input);
  assert.equal(item?.symbol,'w');
  assert.equal(item?.issue,'202609');
  assert.match(item?.title||'',/Septembre 2026/);
  assert.equal(item?.category,'magazines');
  assert.equal(item?.coverUrl,'');
  assert.equal(jwLibraryCatalogRow({...input,MepsLanguageId:0}),null);
  assert.equal(jwLibraryCatalogRow({...input,Reserved:1}),null);
  assert.equal(jwLibraryCatalogRow({...input,Symbol:'bad/path'}),null);
  assert.equal(jwLibraryCatalogRow({...input,Symbol:'s-38',IssueTagNumber:8})?.issue,'');
});

test('SQLite discovery requires known tables, validates language and deduplicates editions',()=>{
  const publicationRows=[
    {Id:1,PublicationRootKeyID:10,MepsLanguageId:3,Symbol:'w',Year:2026,
      IssueTagNumber:202609,Title:'La Tour de Garde',IssueTitle:'Septembre 2026',Reserved:0},
    {Id:2,PublicationRootKeyID:10,MepsLanguageId:3,Symbol:'w',Year:2026,
      IssueTagNumber:202701,Title:'La Tour de Garde',IssueTitle:'Janvier 2027',Reserved:0},
    {Id:3,PublicationRootKeyID:11,MepsLanguageId:3,Symbol:'lff',Year:2026,
      IssueTagNumber:0,Title:'Vivez pour toujours !',Reserved:0},
    {Id:4,PublicationRootKeyID:11,MepsLanguageId:3,Symbol:'lff',Year:2026,
      IssueTagNumber:0,Title:'Vivez pour toujours !',Reserved:0}
  ];
  const result=(rows:Record<string,unknown>[])=>({
    columns:rows.length?Object.keys(rows[0]):[],
    values:rows.map(item=>Object.values(item))
  });
  const db={
    exec(query:string){
      if(query.includes('sqlite_master'))return [result([
        {name:'Publication'},{name:'PublicationRootKey'}])];
      if(query.includes('PRAGMA table_info("PublicationRootKey")'))
        return [result([{name:'Id'},{name:'Symbol'}])];
      if(query.includes('PRAGMA table_info("Publication")'))
        return [result([{name:'Id'},{name:'Symbol'},{name:'MepsLanguageId'}])];
      if(query.includes('SELECT Id,Symbol'))return [result([
        {Id:10,Symbol:'w'},{Id:11,Symbol:'lff'}])];
      if(query.includes('SELECT * FROM "Publication"'))
        return [result(publicationRows)];
      return [];
    }
  };
  const entries=extractJwLibraryCatalog(db);
  assert.equal(entries.length,3);
  assert.deepEqual(entries.filter(item=>item.symbol==='w').map(item=>item.issue),
    ['202701','202609']);
  assert.equal(entries.find(item=>item.symbol==='lff')?.title,'Vivez pour toujours !');
  assert.throws(()=>extractJwLibraryCatalog({exec:()=>[]}),/Table Publication/);
});

test('SQLite database signature check is binary rather than a filename guess',()=>{
  const bytes=new Uint8Array(32);
  for(const [i,char] of [...'SQLite format 3\0'].entries())bytes[i]=char.charCodeAt(0);
  assert.equal(isSqliteDatabase(bytes),true);
  bytes[0]=0;
  assert.equal(isSqliteDatabase(bytes),false);
});

test('catalog accepts gzip and transparently decoded SQLite but rejects HTML',()=>{
  const sqlite=new Uint8Array(100);
  new TextEncoder().encodeInto('SQLite format 3\0',sqlite);
  assert.equal(decodeJwLibraryCatalogPayload(sqlite).length,sqlite.length);
  const zipped=gzipSync(sqlite);
  assert.deepEqual(decodeJwLibraryCatalogPayload(zipped),sqlite);
  assert.throws(()=>decodeJwLibraryCatalogPayload(new TextEncoder().encode('<html>403 forbidden</html>')),/HTML/);
  assert.throws(()=>decodeJwLibraryCatalogPayload(new Uint8Array(0)),/vide/);
});
