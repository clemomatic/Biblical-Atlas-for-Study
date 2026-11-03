import {test,expect} from '@playwright/test';

const article='https://wol.jw.org/fr/wol/d/r30/lp-f/2024642';
const ministry='https://wol.jw.org/fr/wol/d/r30/lp-f/202000163';
const wrong='https://wol.jw.org/fr/wol/d/r30/lp-f/202000164';

const wLabel='w24 novembre p. 17-19 § 15-20';
const kLabel='km 5/00 p. 8 § 2';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('The correct Watchtower article is read despite WOL navigation appearing before the body',async({page})=>{
 await page.route(article,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Consulter</h1><p>PUBLICATIONS BIBLE RECHERCHER</p>'+
   '<div class="bodyTxt"><h1>Frères, vous qualifiez-vous pour devenir assistants ?</h1>'+
   '<p class="pubRef">w24 novembre p. 14-19</p>'+
   '<p><span class="parNum">15</span> Le paragraphe quinze répond à la question.</p>'+
   '<p><span class="parNum">20</span> Le paragraphe vingt développe la responsabilité.</p>'+
   '</div></main></html>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),wLabel);
 const pane=page.locator('.biblelab-focused-reading');
 await expect(pane).toContainText('Le paragraphe quinze répond à la question.');
 await expect(pane).toContainText('Le paragraphe vingt développe la responsabilité.');
 await expect(pane.locator('.biblelab-article-target-paragraph')).toHaveCount(2);
 await expect(pane).not.toContainText('PUBLICATIONS BIBLE RECHERCHER');
});

test('A populated lookupResults is preferred over an empty duplicate and the navigation shell',async({page})=>{
 await page.route(article,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Consulter</h1>'+
   '<p>PUBLICATIONS BIBLE RECHERCHER</p></main></html>'
 }));
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Consulter</h1><nav>MENU</nav>'+
   '<div id="lookupResults"></div><div class="lookupResults"><article class="result">'+
   '<a href="'+article+'">Frères, vous qualifiez-vous pour devenir assistants ?</a>'+
   '<p>w24 novembre p. 14-19</p>'+
   '<p>Extrait du véritable résultat WOL, au-delà de son menu.</p>'+
   '</article></div></main></html>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),wLabel);
 const pane=page.locator('.biblelab-focused-reading');
 await expect(pane).toContainText('Extrait du véritable résultat WOL');
 await expect(pane).not.toContainText('PUBLICATIONS BIBLE RECHERCHER');
});

test('The verified km § 2 target opens its full article and preserves the #h=3 WOL location',async({page})=>{
 let askedForLookup=false;
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>{askedForLookup=true;return route.abort();});
 await page.route(ministry,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Consulter</h1><article class="bodyTxt">'+
   '<h1>« Mis à l’épreuve quant à leurs aptitudes » : comment ?</h1>'+
   '<p class="pubRef">km 5/00 p. 8</p>'+
   '<p><span class="parNum">1</span> Le premier paragraphe de l’article.</p>'+
   '<p id="h3"><span class="parNum">2</span> Le rôle des anciens est essentiel.</p>'+
   '</article></main></html>'
 }));
 await page.evaluate(()=>{
  (window as any).outbound=[];
  window.open=((url:string)=>{(window as any).outbound.push(url);return null;}) as typeof window.open;
  const node=document.createElement('p');node.id='target-km';
  node.textContent='Étudier km 5/00 p. 8 § 2.';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const link=page.locator('#target-km a.biblelab-autolink');
 await expect(link).toHaveText(kLabel);
 await link.click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : '+kLabel});
 await expect(popup.locator('.biblelab-article-target-paragraph')).toContainText('Le rôle des anciens est essentiel');
 await popup.getByRole('button',{name:'WOL'}).click();
 expect(await page.evaluate(()=>(window as any).outbound)).toEqual([ministry+'#h=3']);
 expect(askedForLookup).toBe(false);
});

test('A different page with two articles is only disambiguated when § 2 is explicitly printed in WOL results',async({page})=>{
 const label='km 5/01 p. 8 § 2';
 let wrongRequested=false;
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<div id="lookupResults">'+
    '<article class="result"><a href="'+wrong+'">Premier texte</a>'+
    '<p>km 5/01 p. 8 § 1</p></article>'+
    '<article class="result"><a href="'+ministry+'#h=3">Le texte précis</a>'+
    '<p>km 5/01 p. 8 § 2</p></article>'+
    '</div>'
 }));
 await page.route(wrong,route=>{wrongRequested=true;return route.abort();});
 await page.route(ministry,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Le texte précis</h1>'+
   '<p class="pubRef">km 5/01 p. 8</p>'+
   '<p><span class="parNum">2</span> Un texte choisi grâce à une référence explicite.</p></article>'
 }));
 await page.evaluate(ref=>(window as any).atlasTest.plugin.openBibleLab(ref),label);
 const pane=page.locator('.biblelab-focused-reading');
 await expect(pane).toContainText('Un texte choisi grâce à une référence explicite');
 expect(wrongRequested).toBe(false);
});
