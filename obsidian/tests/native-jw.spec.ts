import { test, expect } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';
import { createHash, createCipheriv } from 'node:crypto';
import { createRequire } from 'node:module';
import { deflateSync } from 'node:zlib';
import initSqlJs from 'sql.js';
const require=createRequire(import.meta.url);
const GUID='11111111-2222-3333-4444-555555555555';
async function sql(){return initSqlJs({locateFile:(file:string)=>require.resolve('sql.js/dist/'+file)});}
async function backupBytes(){
 const SQL=await sql();const db=new SQL.Database();
 db.run('PRAGMA user_version=16');
 db.run('CREATE TABLE Note (NoteId INTEGER PRIMARY KEY,Guid TEXT,Title TEXT,Content TEXT,Created TEXT,LastModified TEXT,LocationId INTEGER,UserMarkId INTEGER)');
 db.run('CREATE TABLE Tag (TagId INTEGER PRIMARY KEY,Name TEXT)');
 db.run('CREATE TABLE TagMap (TagMapId INTEGER PRIMARY KEY,NoteId INTEGER,TagId INTEGER,Position INTEGER)');
 db.run('CREATE TABLE LastModified (LastModified TEXT)');
 db.run("INSERT INTO Note VALUES (1,'"+GUID+"','Mon essai','Texte d’origine',null,null,null,null)");
 db.run("INSERT INTO Tag VALUES (1,'Méditation')");
 db.run('INSERT INTO TagMap VALUES (1,1,1,0)');
 db.run("INSERT INTO LastModified VALUES ('2026-11-01')");
 const bytes=db.export();db.close();
 const hash=createHash('sha256').update(bytes).digest('hex');
 const manifest={userDataBackup:{databaseName:'userData.db',schemaVersion:16,hash,lastModifiedDate:'2026-11-01'}};
 return zipSync({'manifest.json':strToU8(JSON.stringify(manifest)),'userData.db':bytes,'cover.jpg':strToU8('original unchanged')});
}
async function jwpubBytes(){
 const SQL=await sql();const db=new SQL.Database();
 db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER, Symbol TEXT, Year INTEGER, IssueTagNumber INTEGER)');
 db.run('CREATE TABLE Document(DocumentId INTEGER, Title TEXT, Content BLOB)');
 db.run("INSERT INTO Publication VALUES (0,'w',2026,8)");
 const card='0_w_2026_8';
 const hash=createHash('sha256').update(card).digest();
 const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
 const x=Buffer.from(hash.map((byte,i)=>byte^mask[i]));
 const cipher=createCipheriv('aes-128-cbc',x.subarray(0,16),x.subarray(16));
 const compressed=deflateSync(strToU8('<html><body><h1>Article expérimental</h1><p>Un passage pour la méditation.</p></body></html>'));
 const encrypted=Buffer.concat([cipher.update(compressed),cipher.final()]);
 const stmt=db.prepare('INSERT INTO Document VALUES (?,?,?)');stmt.run([1,'Article expérimental',encrypted]);stmt.free();
 const dbBytes=db.export();db.close();
 const inner=zipSync({'publication.db':dbBytes});
 return zipSync({'manifest.json':strToU8(JSON.stringify({publication:{title:'Publication de test'}})),'contents':inner});
}
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
 await page.locator('.biblelab-side').getByRole('button',{name:'Studio'}).click();
 await page.getByRole('button',{name:'Ouvrir la passerelle'}).click();
});
test('JWPUB opens and decrypts locally, then writes an editable Markdown note',async({page})=>{
 const pick=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Importer une publication JWPUB'}).click();
 await (await pick).setFiles({name:'w_F_202608.jwpub',mimeType:'application/zip',buffer:Buffer.from(await jwpubBytes())});
 await expect(page.getByText('documents déchiffrés')).toBeVisible();
 await page.getByRole('button',{name:'Importer dans Obsidian'}).click();
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes('Article expérimental.md')))).toBeTruthy();
 const md=await page.evaluate(()=>(window as any).atlasTest.files().find((f:any)=>f.path.includes('Article expérimental.md')).content);
 expect(md).toContain('Un passage pour la méditation.');
});
test('JW Library backup imports GUIDs, tags and markdown index without Python',async({page})=>{
 const src=await backupBytes();
 const choose=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Importer une sauvegarde JW Library'}).click();
 await (await choose).setFiles({name:'example.jwlibrary',mimeType:'application/zip',buffer:Buffer.from(src)});
 await expect(page.getByText('notes personnelles')).toBeVisible();
 await page.getByRole('button',{name:'Importer dans Obsidian'}).click();
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes(GUID)))).toBeTruthy();
 const note=await page.evaluate(()=>(window as any).atlasTest.files().find((f:any)=>f.path.endsWith(GUID+'.md')).content);
 expect(note).toContain('jw_guid: "'+GUID+'"');
 expect(note).toContain('jw_tags: ["Méditation"]');
 expect(note).toContain('<!-- BIBLE_LAB_NOTE_START -->');
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes('Tableau de recherche.md')))).toBeTruthy();
});
