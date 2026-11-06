import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {gzipSync} from 'fflate';

const require=createRequire(import.meta.url);
const uuid='815ecc5a-e72b-48ac-aa9f-e1e7d256e43b';
const manifest='https://app.jw-cdn.org/catalogs/publications/v4/manifest.json';
const database='https://app.jw-cdn.org/catalogs/publications/v4/'+uuid+'/catalog.db.gz';

async function catalogGzip():Promise<Buffer>{
  const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
  const db=new SQL.Database();
  db.run('CREATE TABLE PublicationRootKey (Id INTEGER, Symbol TEXT)');
  db.run('CREATE TABLE Publication (Id INTEGER, PublicationRootKeyId INTEGER,'+
    'MepsLanguageId INTEGER,Symbol TEXT,Year INTEGER,IssueTagNumber INTEGER,'+
    'Title TEXT, IssueTitle TEXT,Reserved INTEGER)');
  db.run("INSERT INTO PublicationRootKey VALUES(1,'w')");
  db.run("INSERT INTO Publication VALUES(1,1,3,'w',2026,202609,'La Tour de Garde','Septembre 2026',0)");
  db.run("INSERT INTO Publication VALUES(2,1,0,'w',2026,202701,'English magazine','',0)");
  const stmt=db.prepare('INSERT INTO Publication VALUES(?,?,?,?,?,?,?,?,?)');
  for(let i=0;i<91;i++)stmt.run([
    i+3,1,3,'pub'+String(i).padStart(3,'0'),2026,0,'Publication de référence '+i,'',0
  ]);
  stmt.free();
  const bytes=db.export();db.close();
  return Buffer.from(gzipSync(bytes));
}

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Automatically loads a versioned catalogue, filters French editions and paginates covers',async({page})=>{
  await page.route(manifest,route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({version:1,current:uuid})
  }));
  const gzip=await catalogGzip();
  await page.route(database,route=>route.fulfill({
    status:200,contentType:'application/gzip',body:gzip
  }));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  let seen=await page.evaluate(()=>(window as any).atlasNetworkRequests||[]);
  await expect(library.locator('.blb-online-book')).toHaveCount(48);
  await expect(library.getByRole('button',{name:'Afficher plus'})).toBeVisible();
  await library.getByRole('button',{name:'Afficher plus'}).click();
  await expect(library.locator('.blb-online-book')).toHaveCount(96);
  const search=library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'});
  await search.fill('pub005');
  await expect(library.locator('.blb-online-book')).toHaveCount(1);
  await expect(library.locator('.blb-online-book')).toContainText('Publication de référence 5');
  await search.fill('English magazine');
  await expect(library.locator('.blb-online-book')).toHaveCount(0);
  await search.fill('Septembre 2026');
  await expect(library.locator('.blb-online-book')).toHaveCount(1);
  await expect(library.locator('.blb-online-book')).toContainText('La Tour de Garde');
  seen=await page.evaluate(()=>(window as any).atlasNetworkRequests||[]);
  expect(seen.filter((x:any)=>x.url.includes('/catalogs/publications/'))).toHaveLength(2);
  expect(seen.filter((x:any)=>x.url.includes('GETPUBMEDIALINKS'))).toHaveLength(0);
});

test('Rejected catalogue manifest never erases the existing curated JW.org shelf',async({page})=>{
  await page.route(manifest,route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({version:1,current:'https://attacker.example/catalog.db.gz'})
  }));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await expect(library.locator('.blb-catalog-notice')).toContainText('momentanément indisponible');
  await expect(library.locator('.blb-online-book')).toHaveCount(14);
  const urls=await page.evaluate(()=>(window as any).atlasNetworkRequests.map((x:any)=>x.url));
  expect(urls.some((u:string)=>u.includes('attacker.example'))).toBe(false);
});


test('Reopening the library uses the saved catalogue without downloading the database again',async({page})=>{
  await page.route(manifest,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:1,current:uuid})}));
  const gzip=await catalogGzip();
  await page.route(database,route=>route.fulfill({status:200,body:gzip}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await library.getByRole('searchbox').fill('pub005');
  await expect(library.locator('.blb-book-card')).toHaveCount(1);
  await expect(library.locator('.blb-loading')).toHaveCount(0);
  await page.evaluate(async()=>{
    await (window as any).atlasTest.restart();
    await (window as any).atlasTest.plugin.openVisualLibrary();
  });
  await library.getByRole('searchbox').fill('pub005');
  await expect(library.locator('.blb-book-card')).toHaveCount(1);
  const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests.filter((r:any)=>r.url.includes('/catalogs/publications/')));
  expect(requests).toHaveLength(2);
});
