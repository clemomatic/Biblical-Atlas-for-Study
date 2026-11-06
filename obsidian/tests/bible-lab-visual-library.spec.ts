import {test,expect} from '@playwright/test';
import {zipSync,strToU8,gzipSync} from 'fflate';
import {createHash,createCipheriv} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
const require=createRequire(import.meta.url);

async function personalJwpub():Promise<Buffer>{
 const SQL=await initSqlJs({locateFile:(name:string)=>require.resolve('sql.js/dist/'+name)});
 const db=new SQL.Database();
 db.run('CREATE TABLE Publication(MepsLanguageIndex INTEGER, Symbol TEXT, Year INTEGER, IssueTagNumber INTEGER)');
 db.run('CREATE TABLE Document(DocumentId INTEGER, MepsDocumentId INTEGER, Title TEXT, Content BLOB)');
 db.run("INSERT INTO Publication VALUES (3,'s-38',2026,8)");
 const hash=createHash('sha256').update('3_s-38_2026_8').digest();
 const mask=Buffer.from('11cbb5587e32846d4c26790c633da289f66fe5842a3a585ce1bc3a294af5ada7','hex');
 const x=Buffer.from(hash.map((b,i)=>b^mask[i]));
 const content=[
  [1, 'Enseigner avec précision','<h1>Enseigner avec précision</h1><p>La patience aide à mieux comprendre.</p>'],
  [2, 'Méthodes de recherche','<h1>Méthodes de recherche</h1><p>Une recherche attentive améliore la compréhension.</p>']
 ] as const;
 const statement=db.prepare('INSERT INTO Document VALUES (?,?,?,?)');
 for(const [id,title,html] of content){
  const cipher=createCipheriv('aes-128-cbc',x.subarray(0,16),x.subarray(16));
  const bytes=Buffer.concat([cipher.update(deflateSync(strToU8(html))),cipher.final()]);
  statement.run([id,null,title,bytes]);
 }
 statement.free();
 const data=db.export();db.close();
 return Buffer.from(zipSync({
   'manifest.json':strToU8(JSON.stringify({publication:{title:'Manuel de formation'}})),
   'contents':zipSync({'school.db':data})
 }));
}

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Library is a real Obsidian tab with an uncluttered empty shelf, not a fifth sidebar tab',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
 const library=page.locator('.blb-library');
 await expect(library.getByRole('heading',{name:'Ma bibliothèque'})).toBeVisible();
 await expect(library.getByText('Une bibliothèque à toi')).toBeVisible();
 await expect(library.getByRole('button',{name:'Télécharger une publication'})).toBeVisible();
 await expect(library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'})).toBeVisible();
 await expect(page.locator('.biblelab-side .biblelab-focus-nav .biblelab-tab')).toHaveCount(0);
 await expect(library.locator('.blb-category')).toHaveCount(9);
 const leaves=await page.evaluate(()=>(window as any).atlasTest.app.workspace.getLeavesOfType('bible-lab-personal-library').length);
 expect(leaves).toBe(1);
 await page.screenshot({path:'test-results/bible-lab-library-empty.png'});
});

test('Imports a private school JWPUB, shows the visual book, reads its chapters offline and opens the editable note',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
 const library=page.locator('.blb-library');
 const chooser=page.waitForEvent('filechooser');
 await library.getByRole('button',{name:'Importer mon premier JWPUB'}).click();
 await (await chooser).setFiles({
  name:'ecole_confidentielle.jwpub',mimeType:'application/zip',buffer:await personalJwpub()
 });
 await expect(page.getByText('documents déchiffrés')).toBeVisible();
 await page.getByRole('button',{name:'Importer dans Obsidian'}).click();
 await expect(library.getByRole('button',{name:'Ouvrir Manuel de formation'})).toBeVisible();
 const index=await page.evaluate(()=>{
  const file=(window as any).atlasTest.files().find((f:any)=>
    f.path.endsWith('_BIBLE_LAB_OFFLINE_INDEX.json'));
  return JSON.parse(file.content);
 });
 expect(index.origin).toBe('personal');
 expect(index.documents).toHaveLength(2);
 expect(index.publication.symbol).toBe('s-38');
 await library.getByRole('button',{name:'Écoles'}).click();
 await expect(library.getByRole('button',{name:'Ouvrir Manuel de formation'})).toBeVisible();
 await page.screenshot({path:'test-results/bible-lab-library-bookshelf.png'});
 await library.getByRole('button',{name:'Ouvrir Manuel de formation'}).click();
 await expect(library.getByRole('heading',{name:'Sommaire'})).toBeVisible();
 await expect(library.getByRole('button',{name:'Lire Enseigner avec précision'})).toBeVisible();
 await library.getByRole('button',{name:'Lire Enseigner avec précision'}).click();
 await expect(library.locator('.blb-reader-text')).toContainText('La patience aide à mieux comprendre.');
 await expect(library.getByText('Lecture locale · aucun accès Internet nécessaire')).toBeVisible();
 await expect(library.getByRole('button',{name:'Copier un lien vers cette note'})).toBeVisible();
 await page.screenshot({path:'test-results/bible-lab-library-reader.png'});
 await library.getByRole('button',{name:'Ouvrir la note modifiable'}).click();
 const last=await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened);
 expect(last).toContain('Enseigner avec précision.md');
 expect((await page.evaluate(()=>(window as any).atlasNetworkRequests||[]))
   .filter((x:any)=>x.url?.includes('GETPUBMEDIALINKS'))).toHaveLength(0);
});

test('Finds words in the full local content and can move from a search hit into the reader without Internet',async({page})=>{
 await page.evaluate(async()=>{
  const {app,plugin}=(window as any).atlasTest;
  const root=plugin.settings.noteFolder+'/Imports/Mes publications';
  await app.vault.createFolder(root);
  await app.vault.create(root+'/001 · La sagesse.md',
    '---\nbible_lab_kind: jwpub-document\n---\n# La sagesse\n\nLa persévérance et la confiance sont importantes.');
  await app.vault.create(root+'/_BIBLE_LAB_OFFLINE_INDEX.json',JSON.stringify({
    schema:1,origin:'personal',publication:{
      symbol:'it-1',year:2026,language:3,title:'Collection de recherches'},
    documents:[{documentId:1,mepsId:null,title:'La sagesse',path:'001 · La sagesse.md'}]
  }));
  await plugin.openVisualLibrary();
 });
 const library=page.locator('.blb-library');
 const field=library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'});
 await field.fill('persévérance');
 await expect(library.locator('.blb-search-result')).toHaveCount(1);
 await expect(library.locator('.blb-search-result')).toContainText('La persévérance');
 await library.getByRole('button',{name:'Lire La sagesse'}).click();
 await expect(library.locator('.blb-reader-text')).toContainText('persévérance');
 await library.getByRole('button',{name:'Bibliothèque'}).click();
 await expect(library.getByRole('button',{name:'Ouvrir Collection de recherches'})).toBeVisible();
});

test('Uses a cover only when a local imported asset exists',async({page})=>{
 await page.evaluate(async()=>{
   const {app,plugin}=(window as any).atlasTest;
   const root=plugin.settings.noteFolder+'/Imports/Une publication avec couverture';
   await app.vault.createFolder(root);
   await app.vault.createFolder(root+'/assets');
   await app.vault.createBinary(root+'/assets/cover.png',Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WEnKl4AAAAASUVORK5CYII='),x=>x.charCodeAt(0)).buffer);
   await app.vault.create(root+'/001 · Avant-propos.md','# Avant-propos\n\nLire et méditer.');
   await app.vault.create(root+'/_BIBLE_LAB_OFFLINE_INDEX.json',JSON.stringify({
     schema:1,origin:'personal',publication:{symbol:'lff',year:2026,language:3,title:'Publication illustrée'},
     documents:[{documentId:1,mepsId:null,title:'Avant-propos',path:'001 · Avant-propos.md'}]
   }));
   await plugin.openVisualLibrary();
 });
 const cover=page.locator('.blb-cover').first();
 await expect(cover.locator('img')).toHaveAttribute('alt','Couverture de Publication illustrée');
});


test('Virtual JWPUB import keeps one source and search cache, with no per-article Markdown files',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
 const library=page.locator('.blb-library');
 const chooser=page.waitForEvent('filechooser');
 await library.getByRole('button',{name:'Ajouter un JWPUB sans notes'}).click();
 await (await chooser).setFiles({
  name:'manuel_virtuel.jwpub',mimeType:'application/zip',buffer:await personalJwpub()
 });
 await expect(page.getByText('articles indexés sans fichiers MD')).toBeVisible();
 await page.getByRole('button',{name:'Ajouter à la bibliothèque virtuelle'}).click();
 await expect(library.getByRole('button',{name:'Ouvrir Manuel de formation'})).toBeVisible();
 const stored=await page.evaluate(()=>{
  const prefix=(window as any).atlasTest.plugin.settings.noteFolder+'/Bibliothèque virtuelle/';
  return (window as any).atlasTest.app.vault.getFiles().filter((f:any)=>f.path.startsWith(prefix))
    .map((f:any)=>f.path);
 });
 expect(stored.filter((f:string)=>f.endsWith('.md'))).toHaveLength(0);
 expect(stored.filter((f:string)=>f.endsWith('.jwpub'))).toHaveLength(1);
 expect(stored.filter((f:string)=>f.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json'))).toHaveLength(1);
 await library.getByRole('button',{name:'Ouvrir Manuel de formation'}).click();
 await library.getByRole('button',{name:'Lire Enseigner avec précision'}).click();
 await expect(library.locator('.blb-reader-text')).toContainText('La patience aide à mieux comprendre.');
 await expect(library.getByRole('button',{name:'Ouvrir la note modifiable'})).toHaveCount(0);
 await library.getByRole('button',{name:'Bibliothèque'}).click();
 const search=library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'});
 await search.fill('patience');
 await expect(library.locator('.blb-search-result')).toHaveCount(1);
 await expect(library.locator('.blb-search-result')).toContainText('La patience');
});


test('Reads imported JW Library annotations by Bible chapter and searches personal notes',async({page})=>{
 const index={
   format:'bible-lab-annotations',version:1,schema:16,sourceHash:'fixture',
   locations:[{id:31,book:41,chapter:10,document:null,issue:null,
      symbol:'nwtsty',language:3,type:0,specialty:null,edition:null}],
   marks:[{id:20,guid:'fictional-guid',color:2,style:0,location:31}],
   ranges:[{mark:20,blockType:1,identifier:14,start:2,end:6}],
   notes:[{id:21,guid:'fictional-note',title:'Une réflexion sur la justice',
     content:'Jésus réagit avec courage',location:31,mark:20,
     blockType:1,blockIdentifier:14,created:null,modified:null,tags:['Étude']}],
   bookmarks:[]
 };
 const archive=Buffer.from(gzipSync(strToU8(JSON.stringify(index)))).toString('base64');
 await page.evaluate(async(base64)=>{
   const {app,plugin}=(window as any).atlasTest;
   const base=plugin.settings.noteFolder+'/Annotations JW Library';
   await app.vault.createFolder(base);
   await app.vault.createFolder(base+'/Sauvegarde fictive');
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
   await app.vault.createBinary(base+'/Sauvegarde fictive/annotations.json.gz',bytes.buffer);
   await app.vault.create(base+'/Sauvegarde fictive/_BIBLE_LAB_ANNOTATIONS.json',
     JSON.stringify({format:'bible-lab-annotations',version:1}));
   await plugin.openVisualLibrary();
 },archive);
 const library=page.locator('.blb-library');
 await library.getByRole('button',{name:'Mes annotations'}).click();
 await expect(library.getByRole('heading',{name:'Surlignages de la Bible d’étude'})).toBeVisible();
 await library.getByRole('button',{name:/Marc \(1\)/}).click();
 await library.getByRole('button',{name:/Ch. 10 · 1 surlignage/}).click();
 await expect(library.locator('.blb-annotation-item')).toContainText(['Surlignage','Une réflexion sur la justice']);
 const search=library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'});
 await search.fill('courage');
 await expect(library.locator('.blb-bible-annotations')).toHaveCount(0);
 await expect(library.locator('.blb-annotation-item')).toHaveCount(1);
 await expect(library.locator('.blb-annotation-item')).toContainText('Jésus réagit avec courage');
});
