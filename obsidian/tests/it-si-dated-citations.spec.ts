import {test,expect} from '@playwright/test';

const textArticle=(heading:string,citation:string)=>
 '<html><article class="bodyTxt"><h1>'+heading+'</h1>'+
 '<p class="citation">'+citation+'</p>'+
 '<p>Premier paragraphe long de la publication officielle, accessible dans le lecteur.</p>'+
 '<p>Deuxième paragraphe long de la publication officielle, conservé pour l’étude.</p>'+
 '</article></html>';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('All three kinds of citations become entire automatic links in a note',async({page})=>{
 await page.evaluate(()=>{
  const el=document.createElement('p');el.id='bibliography-note';
  el.textContent='Voir it-2 « Sanctuaire » § 5 ; it-1 875 ; si p. 337-349 ; w14 15/11 28-29.';
  document.body.appendChild(el);
  (window as any).atlasTest.plugin.markdownPostProcessor(el);
 });
 const refs=page.locator('#bibliography-note a.biblelab-autolink');
 await expect(refs).toHaveCount(4);
 await expect(refs).toHaveText([
  'it-2 « Sanctuaire » § 5','it-1 875','si p. 337-349','w14 15/11 28-29']);
});
test('Old Watchtower date with page subset resolves to its precise article',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2014847',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:textArticle('Questions des lecteurs','w14 15/11 p. 28-30')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('w14 15/11 28-29'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Premier paragraphe long',{exact:false})).toBeVisible();
 await expect(pane.getByText('Questions des lecteurs',{exact:true}).first()).toBeVisible();
});
test('Insight entry title and volume resolve the proper article',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200003828',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:textArticle('SANCTUAIRE','it-2 « Sanctuaire »')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-2 « Sanctuaire » § 5'));
 await expect(page.locator('.biblelab-side').getByText('Premier paragraphe long',{exact:false}))
  .toBeVisible();
});
test('Generalized Insight volume/page resolution requires the correct volume and range',async({page})=>{
 const lookup='<html><main class="searchResults">'+
  '<article class="result"><a href="/fr/wol/d/r30/lp-f/1200123456">Esprit</a>'+
  '<span>it-2 p. 874-877</span></article>'+
  '<article class="result"><a href="/fr/wol/d/r30/lp-f/1200987654">Esprit</a>'+
  '<span>it-1 p. 874-879</span></article></main></html>';
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:lookup}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200987654',route=>route.fulfill({
  status:200,contentType:'text/html',body:textArticle('ESPRIT','it-1 p. 874-879')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 875'));
 await expect(page.locator('.biblelab-side').getByText('Deuxième paragraphe long',{exact:false}))
  .toBeVisible();
});
test('si p. 337-349 opens the exact study rather than only the WOL menu',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1101990137',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:textArticle('Étude numéro 10 : La Bible authentique et véridique','si p. 337-349')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<html><main>Menu de la bibliothèque WOL</main></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si p. 337-349'));
 await expect(page.locator('.biblelab-side').getByText('Premier paragraphe long',{exact:false}))
  .toBeVisible();
 await expect(page.locator('.biblelab-side')).not.toContainText('Menu de la bibliothèque WOL');
});
test('si page lookup resolves by containing range, not by the first WOL result',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main class="searchResults">'+
  '<article class="result"><a href="/fr/wol/d/r30/lp-f/1100000111">Étude différente</a><span>si p. 78-79</span></article>'+
  '<article class="result"><a href="/fr/wol/d/r30/lp-f/1100000222">Étude pertinente</a><span>si p. 80-85</span></article>'+
  '</main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1100000222',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:textArticle('Étude pertinente','si p. 80-85')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si p. 82'));
 await expect(page.locator('.biblelab-side').getByText('Premier paragraphe long',{exact:false}))
  .toBeVisible();
});
