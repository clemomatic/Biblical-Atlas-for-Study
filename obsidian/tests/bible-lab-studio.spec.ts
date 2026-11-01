import { test, expect } from '@playwright/test';
import { zipSync, strToU8 } from 'fflate';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await expect(page.locator('.biblelab-side')).toBeVisible();
});

test('Study Studio dashboard offers compact navigation and opens a structured discourse note',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByRole('heading',{name:'Un espace pour explorer.'})).toBeVisible();
  await expect(pane.locator('.biblelab-tab')).toHaveCount(6);
  await pane.getByRole('button',{name:'Studio'}).click();
  await pane.getByRole('button',{name:'Nouveau discours'}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByText('Créer un plan de discours')).toBeVisible();
  await dialog.getByRole('textbox',{name:'Titre'}).fill('Vaincre le mal par le bien');
  await dialog.getByRole('textbox',{name:'Verset central'}).fill('Romains 12:21');
  await dialog.getByRole('button',{name:'Créer le plan'}).click();
  const paths=await page.evaluate(()=>(window as any).atlasTest.files());
  const note=paths.find((f:any)=>f.path.includes('Discours')&&f.content.includes('Romains 12:21'));
  expect(note).toBeTruthy();
  expect(note.content).toContain('## 03 · Conclusion');
  expect(note.content).toContain('duration_minutes: 10');
});

test('public daily source loads only on command and meeting content remains linked',async({page})=>{
  await page.clock.install({time:new Date('2026-10-31T12:00:00Z')});
  const html=`<html><body>
    <h2>Samedi 31 octobre</h2>
    <p>Jéhovah exige un attachement sans partage (Deut. 4:24).</p>
    <p>La réflexion personnelle commence par les Écritures.</p>
    <h1>26 octobre – 1er novembre</h1><h2>JÉRÉMIE 47-48</h2>
    <h2>JOYAUX DE LA PAROLE DE DIEU</h2><h3>1. Un message pour nous</h3>
    <h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>2. Engage la conversation</h3>
    <h2>VIE CHRÉTIENNE</h2><h3>3. Étude de l’assemblée</h3>
    </body></html>`;
  await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  const issue='<html><main><a href="/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-septembre-octobre-2026/Programme-pour-la-reunion-du-26-octobre-au-1er-novembre-2026/">26 octobre – 1er novembre</a></main></html>';
  await page.route(/www\.jw\.org\/fr\/biblioth%C3%A8que\/reunion-tj-cahier\/.*/,route=>{
    const url=route.request().url();
    return route.fulfill({status:200,contentType:'text/html',
      body:url.includes('Programme-')?html:issue});
  });

  const pane=page.locator('.biblelab-side');
  await expect(pane.getByText('Aperçu disponible à la demande.')).toBeVisible();
  await pane.getByRole('button',{name:'Actualiser'}).click();
  await expect(pane.getByText('Jéhovah exige un attachement sans partage', {exact:false})).toBeVisible();
  await expect(pane.getByText('Un message pour nous')).toBeVisible();
  await pane.getByRole('button',{name:'Créer une méditation'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes('/Méditations/')))).toBeTruthy();
  await pane.getByRole('button',{name:'Préparer en note'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes('/Réunions/')))).toBeTruthy();
});

test('local JW archive inspection creates a Markdown inventory without changing source',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Studio'}).click();
  const chooserPromise=page.waitForEvent('filechooser');
  await pane.locator('.biblelab-buttons button').filter({hasText:'Inspecter'}).first().click();
  const chooser=await chooserPromise;
  const data=zipSync({
    'manifest.json':strToU8(JSON.stringify({name:'Ma sauvegarde',userDataBackup:{schemaVersion:16}})),
    'userData.db':strToU8('SQLite format 3\0synthetic test data')
  });
  await chooser.setFiles({name:'backup.jwlibrary',mimeType:'application/octet-stream',buffer:Buffer.from(data)});
  await expect.poll(async()=>await page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.includes('/Imports/')).length)).toBe(1);
  const report=await page.evaluate(()=>(window as any).atlasTest.files().find((f:any)=>f.path.includes('/Imports/')));
  expect(report.content).toContain('archive_type: jwlibrary');
  expect(report.content).toContain('Version du schéma');
});

test('converted JW Markdown ZIP imports as separate editable notes and never overwrites existing documents',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Studio'}).click();
  const payload=zipSync({
    'BibleLab_notes/Jean 3.16.md':strToU8('# Jean 3:16\n\nUne observation personnelle'),
    'BibleLab_notes/_BIBLE_LAB_IMPORT.json':strToU8('{"schema_version":16,"note_count":1}')
  });
  for(let attempt=0;attempt<2;attempt++){
    const choice=page.waitForEvent('filechooser');
    await pane.getByRole('button',{name:'Importer un ZIP Markdown'}).click();
    await (await choice).setFiles({name:'notes-jw.zip',mimeType:'application/zip',buffer:Buffer.from(payload)});
    await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.includes('Jean 3.16.md')).length)).toBe(attempt+1);
  }
  const paths=await page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.includes('Jean 3.16.md')).map((f:any)=>f.path));
  expect(paths[0]).not.toBe(paths[1]);
  expect(paths.every((x:string)=>x.includes('Imports/notes-jw'))).toBeTruthy();
});

test('ZIP import rejects path traversal instead of writing outside import root',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Studio'}).click();
  const payload=zipSync({'../intrusion.md':strToU8('must never be created')});
  const chooser=page.waitForEvent('filechooser');
  await pane.getByRole('button',{name:'Importer un ZIP Markdown'}).click();
  await (await chooser).setFiles({name:'invalid.zip',mimeType:'application/zip',buffer:Buffer.from(payload)});
  await page.waitForTimeout(350);
  expect(await page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>f.path.includes('intrusion.md')))).toBe(false);
});
