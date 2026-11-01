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
  await expect(pane.locator('.biblelab-nav-primary .biblelab-tab')).toHaveCount(3);
  await expect(pane.locator('.biblelab-nav-secondary .biblelab-tab')).toHaveCount(3);
  await expect(pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'})).toBeVisible();
  await expect(pane.getByRole('button',{name:'Atlas'})).toBeVisible();
  await expect(pane.getByRole('button',{name:'Studio'})).toBeVisible();
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
 await expect(pane.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Ne jugez plus sur l’apparence',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Insérer dans ma note'})).toBeVisible();
});

test('Topic search returns articles, preserves original query after opening and returning',async({page})=>{
 const search='<html><main class="searchResults"><article>'+
   '<a href="/fr/wol/d/r30/lp-f/2024663">La justice et la bonté</a>'+
   '<p>Quelques réflexions pour approfondir.</p></article></main></html>';
 const article='<html><main class="bodyTxt"><h1>La justice et la bonté</h1>'+
   '<p>La justice véritable est liée à l’amour.</p>'+
   '<p>Les Écritures nous aident à discerner le bien.</p></main></html>';
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({status:200,contentType:'text/html',body:search}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({status:200,contentType:'text/html',body:article}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'}).fill('justice');
 await pane.getByRole('button',{name:'Lancer une recherche'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="WOL"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('La justice et la bonté',{exact:true}).first()).toBeVisible();
 await pane.getByRole('button',{name:'Lire ici'}).click();
 await expect(pane.getByText('La justice véritable est liée à l’amour.')).toBeVisible();
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('justice');
 await expect(pane.getByText('La justice et la bonté',{exact:true}).first()).toBeVisible();
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
 await refs.locator('summary').click();
 await expect(refs).toHaveAttribute('open','');
 await expect(refs.locator('.biblelab-reader-summary').first()).toBeVisible();
});

test('Search advanced actions are progressive but available after a failed source request',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({status:403,contentType:'text/html',body:'Forbidden'}));
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('paix');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText('accès automatisé limité',{exact:false})).toBeVisible();
 const advanced=pane.locator('.biblelab-search-advanced').first();
 await expect(advanced).not.toHaveAttribute('open','');
 await advanced.locator('summary').click();
 await expect(pane.getByRole('button',{name:'Tester les sources'})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Recherche JW.org'})).toBeVisible();
});
