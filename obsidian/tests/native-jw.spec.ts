import {test,expect} from '@playwright/test';
import initSqlJs from 'sql.js/dist/sql-wasm-inline.js';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {createHash,createCipheriv} from 'node:crypto';
import {deflateSync} from 'node:zlib';

const GUID1='11111111-2222-4333-8444-555555555555';
const GUID2='22222222-3333-4444-8555-666666666666';
async function syntheticBackup():Promise<Uint8Array>{
  const SQL=await initSqlJs();
  const db=new SQL.Database();
  db.run('PRAGMA user_version=16');
  db.run('CREATE TABLE Note(NoteId INTEGER PRIMARY KEY,Guid TEXT,UserMarkId INTEGER,LocationId INTEGER,Title TEXT,Content TEXT,LastModified TEXT,Created TEXT,BlockType INTEGER,BlockIdentifier INTEGER)');
  db.run('CREATE TABLE Tag(TagId INTEGER PRIMARY KEY,Type INTEGER,Name TEXT)');
  db.run('CREATE TABLE TagMap(TagMapId INTEGER PRIMARY KEY,PlaylistItemId INTEGER,LocationId INTEGER,NoteId INTEGER,TagId INTEGER,Position INTEGER)');
  db.run('CREATE TABLE LastModified(LastModified TEXT)');
  db.run('INSERT INTO Note VALUES(1,?,NULL,NULL,?,?,?, ?,NULL,NULL)',[GUID1,'Sujet 1','Ligne 1\r\nLigne 2','2026-10-31','2026-10-30']);
  db.run('INSERT INTO Note VALUES(2,?,NULL,NULL,?,?,?, ?,NULL,NULL)',[GUID2,'Sujet 2','Une autre note','2026-10-31','2026-10-30']);
  db.run('INSERT INTO Tag VALUES(1,0,?)',['Persévérance']);
  db.run('INSERT INTO TagMap VALUES(1,NULL,NULL,1,1,0)');
  db.run('INSERT INTO LastModified VALUES(?)',['2026-10-31']);
  const bytes=db.export();db.close();
  const hash=createHash('sha256').update(bytes).digest('hex');
  const manifest={name:'synthetic.jwlibrary',creationDate:'2026-11-01',version:1,type:0,userDataBackup:{
    databaseName:'userData.db',schemaVersion:16,hash,lastModifiedDate:'2026-11-01T00:00:00Z'}};
  return zipSync({'manifest.json':strToU8(JSON.stringify(manifest)),'userData.db':bytes,'photo.jpeg':Uint8Array.from([1,2,3,4])});
}
async function syntheticJwpub():Promise<Uint8Array>{
  const SQL=await initSqlJs();const db=new SQL.Database();
  db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER,Symbol TEXT,Year INTEGER,IssueTagNumber TEXT,Title TEXT)');
  db.run('CREATE TABLE Document(DocumentId INTEGER,Title TEXT,Content BLOB)');
  db.run('INSERT INTO Publication VALUES(3,?,?,?,?)',['w26',2026,'20260800','Revue test']);
  const hash=createHash('sha256').update('3_w26_2026_20260800').digest();
  const constant=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
  const xored=Buffer.from(hash.map((byte,index)=>byte^constant[index]));
  const iv=xored.subarray(16),key=xored.subarray(0,16);
  const html='<body><h1>Bonne nouvelle</h1><p>La confiance et la fidélité sont précieuses.</p><img alt="Une illustration" src="jwpub-media://photo.jpg"></body>';
  const cipher=createCipheriv('aes-128-cbc',key,iv);
  const encrypted=Buffer.concat([cipher.update(deflateSync(Buffer.from(html))),cipher.final()]);
  db.run('INSERT INTO Document VALUES(1,?,?)',['Document test',new Uint8Array(encrypted)]);
  const bytes=db.export();db.close();
  const inner=zipSync({'synthetic.db':bytes,'photo.jpg':Uint8Array.from([255,216,255,217])});
  return zipSync({'manifest.json':strToU8(JSON.stringify({name:'synthetic.jwpub',publication:{title:'Revue test'}})),'contents':inner});
}

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Native backup import creates editable notes, links and a stable GUID index without uploads',async({page})=>{
  const buffer=Buffer.from(await syntheticBackup());
  await page.evaluate(()=>(window as any).atlasTest.plugin.openJwNative('backup'));
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Choisir une archive JW').setInputFiles({name:'synthetic.jwlibrary',mimeType:'application/octet-stream',buffer});
  await expect(modal).toContainText('2 notes');
  await modal.getByRole('button',{name:'Importer dans Obsidian'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.includes('JW Library')&&f.path.endsWith('.md')).length)).toBeGreaterThanOrEqual(3);
  const files=await page.evaluate(()=>(window as any).atlasTest.files());
  expect(files.some((f:any)=>f.content.includes('jw_guid: "'+GUID1+'"'))).toBeTruthy();
  expect(files.some((f:any)=>f.path.includes('Thèmes')&&f.content.includes('Persévérance'))).toBeTruthy();
});

test('Native JWPUB import decrypts encrypted documents and preserves illustrations',async({page})=>{
  const buffer=Buffer.from(await syntheticJwpub());
  await page.evaluate(()=>(window as any).atlasTest.plugin.openJwNative('jwpub'));
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Choisir une archive JW').setInputFiles({name:'synthetic.jwpub',mimeType:'application/octet-stream',buffer});
  await expect(modal).toContainText('1 documents');
  await modal.getByRole('button',{name:'Importer dans Obsidian'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.endsWith('.md')&&f.content.includes('confiance et la fidélité')))).toBeTruthy();
  const paths=await page.evaluate(()=>(window as any).atlasTest.files().map((f:any)=>f.path));
  expect(paths.some((p:string)=>p.endsWith('assets/photo.jpg'))).toBeTruthy();
});

test('Native export requires explicit consent and produces a new backup containing only selected modifications',async({page})=>{
  const original=Buffer.from(await syntheticBackup());
  await page.evaluate(()=>(window as any).atlasTest.plugin.openJwNative('backup'));
  let modal=page.getByRole('dialog');
  await modal.getByLabel('Choisir une archive JW').setInputFiles({name:'synthetic.jwlibrary',mimeType:'application/octet-stream',buffer:original});
  await modal.getByRole('button',{name:'Importer dans Obsidian'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.includes('/Imports/JW Library')&&f.path.endsWith('.md')).length)).toBeGreaterThanOrEqual(3);
  await page.evaluate(async()=>{
    const app=(window as any).atlasTest.app;
    const note=app.vault.getMarkdownFiles().find((f:any)=>f.content.includes('jw_guid: "'+ '11111111-2222-4333-8444-555555555555'+'"'));
    await app.vault.modify(note,note.content+'\nAjout de vérification');
  });
  await page.evaluate(()=>(window as any).atlasTest.plugin.openJwNative('export'));
  modal=page.getByRole('dialog');
  await modal.getByLabel('Choisir une archive JW').setInputFiles({name:'synthetic.jwlibrary',mimeType:'application/octet-stream',buffer:original});
  await expect(modal).toContainText('1 notes modifiées');
  const run=modal.getByRole('button',{name:'Créer la sauvegarde'});
  await expect(run).toBeDisabled();
  await modal.getByLabel('Je veux créer une nouvelle sauvegarde').check();
  await expect(run).toBeEnabled();
  await run.click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.endsWith('.jwlibrary')))).toBeTruthy();
  const output=await page.evaluate(()=>{
    const file=(window as any).atlasTest.files().find((f:any)=>f.path.endsWith('.jwlibrary'));
    return Array.from(new Uint8Array(file.content));
  });
  const archive=unzipSync(Uint8Array.from(output));
  const manifest=JSON.parse(strFromU8(archive['manifest.json']));
  expect(createHash('sha256').update(archive['userData.db']).digest('hex')).toBe(manifest.userDataBackup.hash);
  const sql=await initSqlJs();
  const db=new sql.Database(archive['userData.db']);
  const notes=db.exec('SELECT Guid,Content FROM Note ORDER BY NoteId')[0].values;
  expect(notes[0][1]).toContain('Ajout de vérification');
  expect(notes[1][1]).toBe('Une autre note');
  db.close();
  expect(archive['photo.jpeg']).toEqual(Uint8Array.from([1,2,3,4]));
});
