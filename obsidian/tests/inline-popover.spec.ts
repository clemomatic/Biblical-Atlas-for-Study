import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Reading view transforms ordinary biblical references into clickable previews, without editing note text',async({page})=>{
 await page.route('**/json/html/43007024',route=>route.fulfill({status:200,contentType:'application/json',body:
  JSON.stringify({ranges:{'43007024':{
   citation:'Jean 7:24',html:'<p>Jugez avec justice et non selon l’apparence.</p>',
   footnotes:[],crossReferences:[],commentaries:[]}}})}));
 await page.evaluate(()=>{
  const paragraph=document.createElement('p');
  paragraph.id='test-auto-note';
  paragraph.textContent='Pour comprendre, voir Jean 7:24, Marc 10:14 et w18 février p. 24-26.';
  document.body.appendChild(paragraph);
  (window as any).atlasTest.plugin.markdownPostProcessor(paragraph);
 });
 const note=page.locator('#test-auto-note');
 await expect(note.locator('a.biblelab-autolink')).toHaveCount(3);
 await note.getByText('Jean 7:24').click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : Jean 7:24'});
 await expect(pop).toBeVisible();
 await expect(pop.getByText('Jugez avec justice et non selon l’apparence.')).toBeVisible();
 await pop.getByRole('button',{name:'Fermer'}).click();
 await expect(pop).toHaveCount(0);
 const text=await page.evaluate(()=>document.getElementById('test-auto-note')?.textContent);
 expect(text).toBe('Pour comprendre, voir Jean 7:24, Marc 10:14 et w18 février p. 24-26.');
});

test('Clicking a source URL already linked in Markdown opens preview, not external browser',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2018287',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<html><main class="bodyTxt"><h1>Deviens plus fort spirituellement !</h1>'+
   '<p>Un article lisible et bien présenté.</p><p>Autre paragraphe de réflexion.</p></main></html>'}));
 await page.evaluate(()=>{
  (window as any).outbound=[];
  window.open=((url:string)=>{(window as any).outbound.push(String(url));return null;}) as typeof window.open;
  const node=document.createElement('p');node.id='test-source';
  node.innerHTML='<a href="https://wol.jw.org/fr/wol/d/r30/lp-f/2018287">Deviens plus fort spirituellement !</a>';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 await page.locator('#test-source a').click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : Deviens plus fort spirituellement !'});
 await expect(pop).toBeVisible();
 await expect(pop.getByText('Un article lisible et bien présenté.')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).outbound)).toEqual([]);
 await pop.getByRole('button',{name:'Dans le panneau'}).click();
 await expect(page.locator('.biblelab-side .biblelab-focused-reading')).toBeVisible();
});

test('Popover closes on outside click and Escape',async({page})=>{
 await page.evaluate(()=>{
  const p=document.createElement('p');p.id='test-popup';p.textContent='Matthieu 10:29.';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 });
 await page.locator('#test-popup .biblelab-ref').click();
 await expect(page.locator('.biblelab-inline-popover')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('.biblelab-inline-popover')).toHaveCount(0);
 await page.locator('#test-popup .biblelab-ref').click();
 await page.locator('body').click({position:{x:10,y:10}});
 await expect(page.locator('.biblelab-inline-popover')).toHaveCount(0);
});

test('Reference link command registers and does not silently mutate vault notes',async({page})=>{
 const result=await page.evaluate(()=>{
  const {plugin,app}=(window as any).atlasTest;
  return {hasExtension:!!plugin.editorExtension,
   hasCommand:plugin.commands.has('link-bible-references-in-selection'),
   files:[...app.vault.files.entries()].map(([path,f]:any)=>({path,content:f.content}))};
 });
 expect(result.hasExtension).toBe(true);
 expect(result.hasCommand).toBe(true);
});


test('Real CodeMirror Live Preview auto-links citations while typing without changing source',async({page})=>{
 await page.route('**/json/html/40010029',route=>route.fulfill({status:200,contentType:'application/json',body:
  JSON.stringify({ranges:{'40010029':{
    citation:'Matthieu 10:29',html:'<p>Deux moineaux ne se vendent-ils pas pour une pièce de monnaie ?</p>',
    footnotes:[],crossReferences:[],commentaries:[]}}})}));
 await page.evaluate(()=>(window as any).atlasTest.mountInlineEditor('Matthieu 10:29 et '));
 const editor=page.locator('#test-inline-editor');
 await expect(editor.locator('.biblelab-inline-editor-ref')).toHaveCount(1);
 await page.evaluate(()=>(window as any).atlasTest.typeIntoInlineEditor('Éph. 5:28'));
 await expect(editor.locator('.biblelab-inline-editor-ref')).toHaveCount(2);
 await editor.locator('.biblelab-inline-editor-ref').first().click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : Matthieu 10:29'});
 await expect(popup).toBeVisible();
 await expect(popup.getByText('Deux moineaux ne se vendent-ils pas',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>(window as any).atlasTest.editorView.state.doc.toString()))
  .toBe('Matthieu 10:29 et Éph. 5:28');
});
