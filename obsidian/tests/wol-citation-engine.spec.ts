import {test,expect} from '@playwright/test';

const completeArticle='<html><article class="bodyTxt"><h1>Bonne édition</h1>'+
 '<p>Le texte intégral de la bonne édition est consultable.</p>'+
 '<p>Cette information vient de la publication demandée.</p></article></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('printed month and compact issue agree; an unrelated edition is not selected',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
   '<html><header><a href="/fr/wol/d/r30/lp-f/1999999">Navigation</a></header>'+
   '<div id="lookupResults">'+
   '<article class="result"><a href="/fr/wol/d/r30/lp-f/2024998">Autre édition</a>'+
   '<p>w24.09 25-29</p></article>'+
   '<article class="result"><a href="/fr/wol/d/r30/lp-f/2024997">Édition demandée</a>'+
   '<p>w24.08 25-29</p></article></div></html>'
 }));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024997',route=>route.fulfill({
  status:200,contentType:'text/html',body:completeArticle
 }));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024998',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Mauvaise édition</h1><p>FAUX DOCUMENT OUVERT.</p></article>'
 }));
 await page.evaluate(q=>(window as any).atlasTest.plugin.openBibleLab(q),'w24 août p. 28');
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Le texte intégral de la bonne édition');
 await expect(pane).not.toContainText('FAUX DOCUMENT OUVERT');
});

test('a unique but contradictory WOL result remains an unverified search excerpt',async({page})=>{
 let wrongArticleFetched=false;
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
   '<html><div id="lookupResults"><article class="result">'+
   '<a href="/fr/wol/d/r30/lp-f/2024998">Article de septembre</a>'+
   '<p>w24.09 25-29</p><p>Extrait du résultat de recherche.</p>'+
   '</article></div></html>'
 }));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024998',route=>{
  wrongArticleFetched=true;
  return route.fulfill({status:200,contentType:'text/html',body:completeArticle});
 });
 await page.evaluate(q=>(window as any).atlasTest.plugin.openBibleLab(q),'w24 août p. 28');
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Article de septembre');
 await expect(pane).toContainText('Résultat affiché par WOL');
 expect(wrongArticleFetched).toBe(false);
});

test('recent repeated article access reuses validated HTML',async({page})=>{
 const url='https://wol.jw.org/fr/wol/d/r30/lp-f/2024997';
 let requests=0;
 await page.route(url,route=>{
  requests++;
  return route.fulfill({status:200,contentType:'text/html',body:completeArticle});
 });
 await page.evaluate(q=>(window as any).atlasTest.plugin.openBibleLab(q),url);
 await expect(page.locator('.biblelab-side')).toContainText('Le texte intégral');
 await page.evaluate(q=>(window as any).atlasTest.plugin.openBibleLab(q),url);
 await expect(page.locator('.biblelab-side')).toContainText('Le texte intégral');
 expect(requests).toBe(1);
});
