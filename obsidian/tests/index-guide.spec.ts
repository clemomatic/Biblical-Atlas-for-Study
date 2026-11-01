import {test,expect} from '@playwright/test';

const results='<html><main class="searchResults"><ul>'+
 '<li><a href="/fr/wol/d/r30/lp-f/1200275123">MISÉRICORDE</a>'+
 '<p>dx86-23 — Index 1986-2023 des publications des Témoins de Jéhovah</p></li>'+
 '<li><a href="/fr/wol/d/r30/lp-f/1200278123">Compassion</a>'+
 '<p>rsg19 — Guide de recherche, éd. 2019</p></li>'+
 '<li><a href="/fr/wol/d/r30/lp-f/2024642">Un article sur la bonté</a>'+
 '<p>w24 — La Tour de Garde</p></li>'+
 '</ul></main></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:results}));
});

test('Study researcher can choose Index and see only verified Index results',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('miséricorde');
 await pane.getByRole('button',{name:'Index',exact:true}).click();
 await expect(pane.getByRole('button',{name:'Index',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(pane.getByText('MISÉRICORDE',{exact:true})).toBeVisible();
 await expect(pane.getByText('Compassion',{exact:true})).toHaveCount(0);
 const req=await page.evaluate(()=>(window as any).atlasTest?.ready);
 expect(req).toBe(true);
});

test('Guide filters the same official category by publication identity',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('miséricorde');
 await pane.getByRole('button',{name:'Guide de recherche'}).click();
 await expect(pane.getByRole('button',{name:'Guide de recherche'})).toHaveAttribute('aria-pressed','true');
 await expect(pane.getByText('Compassion',{exact:true})).toBeVisible();
 await expect(pane.getByText('MISÉRICORDE',{exact:true})).toHaveCount(0);
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200278123',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<html><main class="bodyTxt"><h1>Compassion</h1><p>Une rubrique de recherche.</p><p>Une liste d’articles à consulter.</p></main></html>'}));
 await pane.getByRole('button',{name:'Lire ici'}).click();
 await expect(pane.getByText('Une rubrique de recherche.')).toBeVisible();
 await expect(pane.getByRole('button',{name:'Chercher dans l’Index'})).toBeVisible();
});

test('Unclassified WOL results are not presented as Guide entries',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('sagesse');
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<html><main class="searchResults"><a href="/fr/wol/d/r30/lp-f/123456">SAGESSE</a></main></html>'}));
 await pane.getByRole('button',{name:'Guide de recherche'}).click();
 await expect(pane.getByText('aucune entrée du Guide',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Continuer sur WOL'})).toBeVisible();
});

test('Reader offers contextual Index and Guide paths from a selected verse',async({page})=>{
 const verse={ranges:{'43007024':{
  citation:'Jean 7:24',html:'<p>Jugez avec justice.</p>',
  footnotes:[],commentaries:[],crossReferences:[]}}};
 await page.route('**/json/html/43007024',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify(verse)}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('searchbox',{name:'Rechercher dans Bible Lab'}).fill('Jean 7:24');
 await pane.getByRole('button',{name:'Lancer une recherche'}).click();
 await expect(pane.getByRole('button',{name:'Consulter le Guide'})).toBeVisible();
 await pane.getByRole('button',{name:'Consulter le Guide'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="WOL"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('Jean 7:24');
 await expect(pane.getByRole('button',{name:'Guide de recherche'})).toHaveAttribute('aria-pressed','true');
});
