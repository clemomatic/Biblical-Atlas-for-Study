import {test,expect} from '@playwright/test';

const watchtower='w24 novembre p. 21-24 § 4-16';
const kingdom='km 5/00 p. 8 § 2';
const wDoc='https://wol.jw.org/fr/wol/d/r30/lp-f/2024643';
const kmDoc1='https://wol.jw.org/fr/wol/d/r30/lp-f/202000163';
const kmDoc2='https://wol.jw.org/fr/wol/d/r30/lp-f/202000164';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('November 2024 pages 21-24 resolve to the official containing article pages 20-25',async({page})=>{
 await page.route(wDoc,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Frères, vous qualifiez-vous pour devenir anciens ?</h1>'+
   '<p class="pubRef">w24 novembre p. 20-25</p>'+
   '<p><span class="parNum">4</span> Paragraphe quatre recherché dans le texte.</p>'+
   '<p><span class="parNum">16</span> Paragraphe seize recherché dans le texte.</p>'+
   '</article>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),watchtower);
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Paragraphe quatre recherché');
 await expect(pane).toContainText('Paragraphe seize recherché');
 await expect(pane.locator('.biblelab-article-target-paragraph')).toHaveCount(2);
});

test('When the verified km § 2 document is blocked, its two lookupResults remain visible',async({page})=>{
 let articleOpened=false;
 const html='<html><div id="lookupResults">'+
  '<article class="result"><a href="'+kmDoc1+'">Mis à l’épreuve quant à leurs aptitudes</a>'+
  '<p>km 5/00 p. 8</p><p>Extrait officiel du premier article sur cette page.</p></article>'+
  '<article class="result"><a href="'+kmDoc2+'">Trouvez de la joie dans votre service sacré</a>'+
  '<p>km 5/00 p. 8</p><p>Extrait officiel du deuxième article sur cette page.</p></article>'+
  '</div></html>';
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:html
 }));
 await page.route('https://wol.jw.org/fr/wol/d/**',route=>{
  articleOpened=true;
  return route.fulfill({status:403,contentType:'text/html',body:'<h1>Forbidden</h1>'});
 });
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='km-full-citation';
  node.textContent='Consulter km 5/00 p. 8 § 2.';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const citation=page.locator('#km-full-citation a.biblelab-autolink');
 await expect(citation).toHaveText(kingdom);
 await citation.click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : '+kingdom});
 await expect(pop).toContainText('Extrait officiel du premier article');
 await expect(pop).toContainText('Extrait officiel du deuxième article');
 await expect(pop).toContainText('Résultat de consultation WOL');
 expect(articleOpened).toBe(true);
});

test('When linked article is blocked, #lookupResults remains readable',async({page})=>{
 const html='<div id="lookupResults"><article class="result">'+
  '<a href="'+kmDoc1+'">Un article du Ministère</a><p>km 5/00 p. 8</p>'+
  '<p>Texte de consultation conservé même si le document est bloqué.</p>'+
  '</article></div>';
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:html
 }));
 await page.route(kmDoc1,route=>route.fulfill({
  status:403,contentType:'text/html',body:'<h1>Forbidden</h1>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),kingdom);
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Texte de consultation conservé');
 await expect(pane).toContainText('Le document complet n’a pas pu être chargé');
});

test('Without lookupResults, bibliography search can show both verified same-page choices',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<main><h1>Consulter</h1></main>'
 }));
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<div id="searchResults">'+
   '<article class="result"><h3><a href="'+kmDoc1+'">Mis à l’épreuve quant à leurs aptitudes</a></h3>'+
   '<p>km 5/00 p. 8</p></article>'+
   '<article class="result"><h3><a href="'+kmDoc2+'">Trouvez de la joie</a></h3>'+
   '<p>km 5/00 p. 8</p></article>'+
   '</div>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),kingdom);
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Plusieurs documents correspondent');
 await expect(pane).toContainText('Mis à l’épreuve');
 await expect(pane).toContainText('Trouvez de la joie');
});

test('Rendered Markdown citations crossing bold and italic spans become one link',async({page})=>{
 await page.route(wDoc,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Frères, vous qualifiez-vous pour devenir anciens ?</h1>'+
   '<p class="pubRef">w24 novembre p. 20-25</p>'+
   '<p><span class="parNum">4</span> Contenu demandé à étudier.</p>'+
   '</article>'
 }));
 await page.evaluate(()=>{
  const note=document.createElement('section');note.id='formatted-citation';
  note.innerHTML='<h2>Voir <strong>w24 novembre</strong> p. 21-24 <em>§ 4-16</em></h2>';
  document.body.appendChild(note);
  (window as any).atlasTest.plugin.markdownPostProcessor(note);
 });
 const link=page.locator('#formatted-citation h2 a.biblelab-autolink');
 await expect(link).toHaveCount(1);
 await expect(link).toHaveText(watchtower);
 await expect(link.locator('strong')).toHaveText('w24 novembre');
 await expect(link.locator('em')).toHaveText('§ 4-16');
 await link.click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : '+watchtower});
 await expect(popup).toContainText('Contenu demandé à étudier');
 await expect(popup.locator('.biblelab-article-target-paragraph')).toHaveCount(1);
});
