import {test,expect} from '@playwright/test';
import {zipSync,strToU8} from 'fflate';
import {createHash,createCipheriv} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
const require=createRequire(import.meta.url);
const url='https://wol.jw.org/fr/wol/d/r30/lp-f/2026440#h=7';

async function jwpubBytes(symbol='w',mepsId:number|null=2026440){
 const SQL=await initSqlJs({locateFile:(file:string)=>require.resolve('sql.js/dist/'+file)});
 const db=new SQL.Database();
 db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER, Symbol TEXT, Year INTEGER, IssueTagNumber INTEGER)');
 db.run('CREATE TABLE Document(DocumentId INTEGER, MepsDocumentId INTEGER, Title TEXT, Content BLOB)');
 db.run("INSERT INTO Publication VALUES (3,'"+symbol+"',2026,8)");
 const code='3_'+symbol+'_2026_8';
 const hash=createHash('sha256').update(code).digest();
 const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
 const x=Buffer.from(hash.map((b,i)=>b^mask[i]));
 const crypto=createCipheriv('aes-128-cbc',x.subarray(0,16),x.subarray(16));
 const compressed=deflateSync(strToU8(
  '<html><body><h1>Comment approfondir notre amitié ?</h1><p>Une idée importante à garder hors ligne.</p></body></html>'));
 const encrypted=Buffer.concat([crypto.update(compressed),crypto.final()]);
 const statement=db.prepare('INSERT INTO Document VALUES (?,?,?,?)');
 statement.run([1,mepsId,'Comment approfondir notre amitié ?',encrypted]);statement.free();
 const dbBytes=db.export();db.close();
 return zipSync({
  'manifest.json':strToU8(JSON.stringify({publication:{title:'Bibliothèque de démonstration'}})),
  'contents':zipSync({'demo.db':dbBytes})
 });
}
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Personal library is offline-first: no catalogue requests until checking a public symbol',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openOfflineLibrary());
 await expect(page.getByRole('heading',{name:'Ma bibliothèque'})).toBeVisible();
 const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests||[]);
 expect(requests.filter((r:any)=>r.url?.includes('GETPUBMEDIALINKS'))).toHaveLength(0);
 await expect(page.locator('.blb-book-card')).toHaveCount(14);
 await expect(page.getByRole('article',{name:'Assemblée de circonscription 2026-2027 · responsable de circonscription',exact:true})).toBeVisible();
});

test('Download an explicitly selected public JWPUB then read its direct WOL source completely offline',async({page})=>{
 const archive=Buffer.from(await jwpubBytes());
 let catalogCalls=0,downloadCalls=0;
 await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>{
  catalogCalls++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   pubName:'Bibliothèque de démonstration',
   files:{F:{JWPUB:[{filesize:archive.length,file:{
    url:'https://download-a.akamaihd.net/publications/demo.jwpub',
    checksum:'not_checked_md5'
   }}]}}
  })});
 });
 await page.route('https://download-a.akamaihd.net/**',route=>{
  downloadCalls++;return route.fulfill({status:200,contentType:'application/octet-stream',body:archive});
 });
 await page.evaluate(()=>(window as any).atlasTest.plugin.openNativeBridge());
 await page.getByText('Options avancées',{exact:true}).click();
 await page.getByRole('button',{name:'Trouver une publication par son code'}).click();
 await page.getByRole('button',{name:'Vérifier'}).first().click();
 await expect(page.getByRole('button',{name:'Télécharger',exact:true})).toBeVisible();
 expect(catalogCalls).toBe(1);expect(downloadCalls).toBe(0);
 await page.getByText('Options avancées',{exact:true}).click();
 await page.getByRole('button',{name:'Télécharger en notes modifiables'}).click();
 await expect(page.getByText('documents déchiffrés')).toBeVisible();
 await page.getByRole('button',{name:'Importer dans Obsidian'}).click();
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files()
  .some((f:any)=>f.path.endsWith('_BIBLE_LAB_OFFLINE_INDEX.json')))).toBeTruthy();
 const files=await page.evaluate(()=>(window as any).atlasTest.files());
 const md=files.find((f:any)=>f.path.includes('Comment approfondir notre amitié')&&f.path.endsWith('.md'));
 expect(md?.content).toContain('source_meps_docid: 2026440');
 const index=JSON.parse(files.find((f:any)=>f.path.endsWith('_BIBLE_LAB_OFFLINE_INDEX.json')).content);
 expect(index.publication.language).toBe(3);
 expect(index.documents[0].mepsId).toBe(2026440);
 expect(files.some((f:any)=>f.path.includes('/Bibliothèque JWPUB/')&&f.path.endsWith('.jwpub'))).toBeTruthy();
 expect(downloadCalls).toBe(1);
 // All further WOL requests remain blocked by the global mock.
 await page.evaluate(async()=> {
   const {app,plugin}=(window as any).atlasTest;
   await plugin.openBibleLab();
   const side=app.workspace.getLeavesOfType('bible-lab-studio')[0]?.view||
    app.workspace.leaves.map((leaf:any)=>leaf.view).find((v:any)=>typeof v.focusReference==='function');
   side.focusReference('https://wol.jw.org/fr/wol/d/r30/lp-f/2026440#h=7',
    'Comment approfondir notre amitié ?');
 });
 const pane=page.locator('.biblelab-side');
 await expect(pane.locator('.biblelab-reader').first()).toHaveAttribute('open','');
 await expect(pane.getByText('Une idée importante à garder hors ligne.',{exact:false})).toBeVisible();
 await expect(pane.getByText('Texte issu de ta bibliothèque locale',{exact:false})).toBeVisible();
 await expect(pane.getByText('Le numéro de paragraphe WOL n’est pas confirmé',{exact:false})).toBeVisible();
});

test('Private school or instruction JWPUB imports as notes without consulting an online catalogue',async({page})=>{
 const file=Buffer.from(await jwpubBytes('s-38',null));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openNativeBridge());
 await page.getByText('Options avancées',{exact:true}).click();
 const choose=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Convertir un JWPUB en notes modifiables'}).click();
 await (await choose).setFiles({name:'instructions_ecole.jwpub',mimeType:'application/zip',buffer:file});
 await expect(page.getByText('documents déchiffrés')).toBeVisible();
 await page.getByRole('button',{name:'Importer dans Obsidian'}).click();
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files()
  .some((x:any)=>x.path.includes('/Imports/')&&x.path.includes('Comment approfondir notre amitié')))).toBeTruthy();
 const index=await page.evaluate(()=>JSON.parse((window as any).atlasTest.files()
  .find((x:any)=>x.path.endsWith('_BIBLE_LAB_OFFLINE_INDEX.json')).content));
 expect(index.publication.symbol).toBe('s-38');
 expect(index.documents[0].mepsId).toBeNull();
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests||
  [])).not.toEqual(expect.arrayContaining([expect.objectContaining({
   url:expect.stringContaining('GETPUBMEDIALINKS')
  })]));
});
