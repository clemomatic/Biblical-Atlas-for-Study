import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('Study-first homepage offers one search and a calmer navigation hierarchy',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByRole('heading',{name:'Que veux-tu approfondir ?'})).toBeVisible();
  await expect(pane.locator('.biblelab-focus-nav .biblelab-tab')).toHaveCount(4);
  await expect(pane.locator('.biblelab-overflow-menu .biblelab-btn')).toHaveCount(4);
  await expect(pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'})).toBeVisible();
  await expect(pane.locator('.biblelab-overflow > summary')).toBeVisible();
  await pane.locator('.biblelab-overflow > summary').click();
  await expect(pane.getByRole('button',{name:'Atlas biblique'})).toBeVisible();
  await expect(pane.getByRole('button',{name:'Studio et outils avancés'})).toBeVisible();
});

test('Typing a verse on the homepage opens the local reader directly',async({page})=>{
 const verse={ranges:{'43007024':{
   citation:'Jean 7:24',html:'<p>Ne jugez plus sur l’apparence, mais jugez avec justice.</p>',
   footnotes:[],commentaries:[],crossReferences:[]}}};
 await page.route('**/json/html/43007024',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(verse)
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'}).fill('Jean 7:24');
 await pane.getByRole('button',{name:'Lancer une recherche'}).click();
 await expect(pane.locator('.biblelab-focused-reading')).toBeVisible();
 await expect(pane.getByText('Ne jugez plus sur l’apparence',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Insérer dans ma note'})).toBeVisible();
});

test('Topic search keeps the original question and opens genuine WOL beside the sidebar',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'}).fill('justice');
 await pane.getByRole('button',{name:'Lancer une recherche'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="WOL"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('justice');
 const url=await page.evaluate(()=>(window as any).atlasTest.app.workspace
   .getLeavesOfType('webviewer')[0].view.getState().url);
 expect(new URL(url).searchParams.get('q')).toBe('justice');
 await pane.locator('.biblelab-overflow > summary').click();
  await pane.getByRole('button',{name:'Lire les références'}).click();
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('justice');
});

test('Current note references stay tucked away while a focused source is read',async({page})=>{
 const article='<html><main class="bodyTxt"><h1>Lire avec soin</h1>'+
  '<p>Un article pour notre étude individuelle.</p>'+
  '<p>Une seconde réflexion approfondie.</p></main></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({status:200,contentType:'text/html',body:article}));
 await page.evaluate(async()=>{
  const {app,plugin}=(window as any).atlasTest;
  const f=await app.vault.create('Mes notes/Mon étude.md','Marc 10:14 et Jean 7:24');
  app.workspace.activeFile=f;app.workspace.trigger('file-open',f);
  await plugin.openBibleLab('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663');
 });
 const pane=page.locator('.biblelab-side');
 await expect(pane.locator('.biblelab-focused-reading')).toBeVisible();
 const refs=pane.locator('.biblelab-note-references');
 await expect(refs).toBeVisible();
 await expect(refs).not.toHaveAttribute('open','');
 await refs.locator(':scope > summary').click();
 await expect(refs).toHaveAttribute('open','');
 const firstReference=refs.locator('.biblelab-reader').first();
 await expect(firstReference).toBeVisible();
 await expect(firstReference.locator('.biblelab-reader-summary').first()).toHaveCount(1);
});

test('Advanced WOL actions stay progressive and separate from native search',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('paix');
 await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
 await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);
 const advanced=pane.locator('.biblelab-search-advanced').first();
 await expect(advanced).not.toHaveAttribute('open','');
 await advanced.locator('summary').click();
 await expect(pane.getByRole('button',{name:'Tester les sources'})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Recherche JW.org'})).toBeVisible();
});
