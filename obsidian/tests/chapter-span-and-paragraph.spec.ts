import {test,expect} from '@playwright/test';

const verse='Dn 1:1 – 3:30';
const rangeCode='27001001-27003030';
const pageCode='w16.06 20 § 11';
const target='https://wol.jw.org/fr/wol/d/r30/lp-f/2016442';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('a multi-chapter citation is one link and requests the full official range',async({page})=>{
 const requests:string[]=[];
 await page.route('**/json/html/**',route=>{
  requests.push(route.request().url());
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({ranges:{[rangeCode]:{
    citation:'Daniel 1:1 – 3:30',
    html:'<p>Début exact : la troisième année du règne.</p>'+
      '<p>Fin exacte : la quatrième personne ressemblait à un fils des dieux.</p>',
    footnotes:[],commentaries:[],crossReferences:[]
   }}})});
 });
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='cross-chapter-note';
  node.textContent='Étudier Dn 1:1 – 3:30 pour la suite.';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const link=page.locator('#cross-chapter-note a.biblelab-autolink');
 await expect(link).toHaveText(verse);
 await link.click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : Daniel 1:1-3:30'});
 await expect(popup).toBeVisible();
 await expect(popup).toContainText('Début exact : la troisième année du règne');
 await expect(popup).toContainText('Fin exacte : la quatrième personne');
 expect(requests).toEqual([expect.stringContaining('/json/html/'+rangeCode)]);
 await expect(popup.locator('.biblelab-popover-scripture-verse')).toHaveCount(1);
 await expect(popup.locator('.biblelab-popover-scripture-number')).toHaveText('1:1–3:30');
});

test('if the official range is unavailable, all chapters remain accessible',async({page})=>{
 await page.route('**/json/html/**',route=>route.fulfill({status:404,contentType:'application/json',body:'{}'}));
 await page.evaluate(reference=>(window as any).atlasTest.plugin.openBibleLab(reference),verse);
 const panel=page.locator('.biblelab-side');
 await expect(panel).toContainText('Le texte intégral de cette plage');
 await expect(panel).toContainText('Chapitre 1');
 await expect(panel).toContainText('Chapitre 2');
 await expect(panel).toContainText('Chapitre 3');
 const targets=await panel.locator('.biblelab-focused-reading .biblelab-reader-inline-link')
   .evaluateAll(nodes=>nodes.map(node=>node.textContent));
 expect(targets).toEqual(expect.arrayContaining([
  expect.stringContaining('Chapitre 1'),
  expect.stringContaining('Chapitre 2'),
  expect.stringContaining('Chapitre 3')
 ]));
});

test('compact Watchtower citation carries § 11 into the reading panel and highlights it',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
    '<main><div id="lookupResults"><article class="result">'+
    '<p>w16.06 p. 20</p><a href="'+target+'">La Tour de Garde — étude</a>'+
    '</article></div></main>'
 }));
 await page.route(target,route=>route.fulfill({
  status:200,contentType:'text/html',body:
    '<main class="bodyTxt"><h1>La Tour de Garde — étude</h1>'+
    '<p class="pubRef">w16.06 p. 20-24</p>'+
    '<p><span class="parNum">10</span> Un paragraphe avant la référence.</p>'+
    '<p><span class="parNum">11</span> Voici le paragraphe onze demandé.</p>'+
    '<p><span class="parNum">12</span> Une réflexion après la référence.</p>'+
    '</main>'
 }));
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='paragraph-citation';
  node.textContent='Voir w16.06 20 § 11 pour approfondir.';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const link=page.locator('#paragraph-citation a.biblelab-autolink');
 await expect(link).toHaveText(pageCode);
 await link.click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : '+pageCode});
 await expect(popup).toBeVisible();
 await expect(popup.locator('.biblelab-article-target-paragraph')).toContainText('Voici le paragraphe onze demandé');
 await popup.getByRole('button',{name:'Dans le panneau'}).click();
 const sidebar=page.locator('.biblelab-focused-reading');
 await expect(sidebar.locator('.biblelab-article-target-paragraph')).toContainText('Voici le paragraphe onze demandé');
});
