import {test,expect} from '@playwright/test';

const doc=(title:string,parts=20)=>'<html><main class="bodyTxt"><h1>'+title+'</h1>'+
 Array.from({length:parts},(_,i)=>'<p><span class="parNum">'+(i+1)+'</span> Texte du paragraphe '+(i+1)+'.</p>').join('')+
 '</main></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2022281',route=>route.fulfill({status:200,contentType:'text/html',body:doc('Écoute les paroles des sages')}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1102018452',route=>route.fulfill({status:200,contentType:'text/html',body:doc('Chaleur et empathie')}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1201038',route=>route.fulfill({status:200,contentType:'text/html',body:doc('Instructions S-38',30)}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1102014938',route=>route.fulfill({status:200,contentType:'text/html',body:doc('Organisation')}));
});
test('Reading view recognizes whole paragraph and study-lesson citations',async({page})=>{
 await page.evaluate(()=>{
  const p=document.createElement('p');p.id='references';
  p.textContent='Lire w22 Février p. 13 §15 ; S-38 §20, 25 ; S-38 §1 ; od 8:8 et th leçon 12.';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 });
 const links=page.locator('#references a.biblelab-autolink');
 await expect(links).toHaveCount(5);
 await expect(links.nth(0)).toHaveText('w22 Février p. 13 §15');
 await expect(links.nth(0)).toHaveAttribute('href','https://wol.jw.org/fr/wol/d/r30/lp-f/2022281');
 await expect(links.nth(1)).toHaveText('S-38 §20, 25');
 await expect(links.nth(1)).toHaveAttribute('href',/docid=1201038.*par=60/);
 await expect(links.nth(2)).toHaveAttribute('href',/docid=1201038.*par=31/);
 await expect(links.nth(3)).toHaveAttribute('href','https://wol.jw.org/fr/wol/d/r30/lp-f/1102014938');
 await expect(links.nth(4)).toHaveAttribute('href','https://wol.jw.org/fr/wol/d/r30/lp-f/1102018452');
 await links.nth(3).click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : od 8:8'});
 await expect(pop).toBeVisible();
 await expect(pop.getByText('Organisation')).toBeVisible();
});
test('A page-and-paragraph citation opens the verified article and highlights §15',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('w22 Février p. 13 §15'));
 const pane=page.locator('.biblelab-side');
 const focus=pane.locator('.biblelab-article-target-paragraph');
 await expect(focus).toBeVisible();
 await expect(focus.locator('.biblelab-article-parnum')).toHaveText('15');
 await expect(focus).toContainText('Texte du paragraphe 15.');
 await expect(pane.locator('.biblelab-reader-document-title')).toHaveText('Écoute les paroles des sages');
});

test('S-38 multiple paragraphs are both highlighted in the reader',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('S-38 §20, 25'));
 const pane=page.locator('.biblelab-side');
 const targets=pane.locator('.biblelab-article-target-paragraph');
 await expect(targets).toHaveCount(2);
 await expect(targets.first().locator('.biblelab-article-parnum')).toHaveText('20');
 await expect(targets.last().locator('.biblelab-article-parnum')).toHaveText('25');
});

