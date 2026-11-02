import {test,expect} from '@playwright/test';

const ARTICLE='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const FIGURE='<html><main class="bodyTxt"><h1>Une étude illustrée</h1>'+
 '<p>Introduction avant l’image.</p>'+
 '<figure><a href="https://cms-imgp.jw-cdn.org/img/p/example/full.jpg">'+
 '<picture><source srcset="https://cms-imgp.jw-cdn.org/img/p/example/medium.webp 700w, https://cms-imgp.jw-cdn.org/img/p/example/large.webp 1400w">'+
 '<img src="https://cms-imgp.jw-cdn.org/img/p/example/low.jpg" alt="Un chemin entre les arbres" width="900" height="540"></picture></a>'+
 '<figcaption>Un paysage qui illustre le récit biblique.</figcaption></figure>'+
 '<p>Explication après l’image.</p>'+
 '<img src="https://evil.example/hidden.png" alt="Image externe">'+
 '<img src="data:image/png;base64,abc" alt="Image incorporée">'+
 '<figure><img data-srcset="https://cms-imgp.jw-cdn.org/img/p/example/mid.jpg 750w, https://cms-imgp.jw-cdn.org/img/p/example/detail.jpg 1600w" '+
 'src="data:image/gif;base64,R0lG" width="1000" height="700" alt="Autre illustration"></figure>'+
 '</main></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.route(ARTICLE,route=>route.fulfill({status:200,contentType:'text/html',body:FIGURE}));
});

test('Sidebar preserves official article images, captions, order and proportions, without injecting off-site images',async({page})=>{
 await page.evaluate((url)=>(window as any).atlasTest.plugin.openBibleLab(url),ARTICLE);
 const pane=page.locator('.biblelab-side');
 const article=pane.locator('.biblelab-article-reading').first();
 await expect(article.locator('.biblelab-article-figure')).toHaveCount(2);
 const first=article.locator('.biblelab-article-figure').first();
 await expect(first.locator('img')).toHaveAttribute('src','https://cms-imgp.jw-cdn.org/img/p/example/full.jpg');
 await expect(first.locator('img')).toHaveAttribute('loading','lazy');
 await expect(first.locator('img')).toHaveAttribute('width','900');
 await expect(first.locator('img')).toHaveAttribute('height','540');
 await expect(first.locator('figcaption')).toHaveText('Un paysage qui illustre le récit biblique.');
 const second=article.locator('.biblelab-article-figure').nth(1);
 await expect(second.locator('img')).toHaveAttribute('src','https://cms-imgp.jw-cdn.org/img/p/example/detail.jpg');
 const order=await article.locator(':scope > *').evaluateAll(nodes=>nodes.map(n=>n.tagName+':'+(n.textContent||'').trim().slice(0,30)));
 expect(order.findIndex(x=>x.includes('Introduction'))).toBeLessThan(order.findIndex(x=>x.includes('Un paysage')));
 expect(order.findIndex(x=>x.includes('Un paysage'))).toBeLessThan(order.findIndex(x=>x.includes('Explication')));
 expect(article.locator('img[src*="evil.example"]')).toHaveCount(0);
 await first.getByRole('button',{name:'Agrandir l’illustration'}).click();
 const dialog=page.getByRole('dialog',{name:'Illustration agrandie'});
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('img')).toHaveAttribute('src','https://cms-imgp.jw-cdn.org/img/p/example/full.jpg');
 await dialog.getByRole('button',{name:'Fermer ×'}).click();
 await expect(dialog).toHaveCount(0);
});

test('Inline preview displays the identical original illustration and its caption',async({page})=>{
 await page.evaluate((url)=>{
  const p=document.createElement('p');p.id='source-note';
  p.innerHTML='<a href="'+url+'">Article illustré</a>';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 },ARTICLE);
 await page.locator('#source-note a').click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : Article illustré'});
 await expect(pop).toBeVisible();
 await expect(pop.locator('.biblelab-article-figure')).toHaveCount(2);
 await expect(pop.locator('.biblelab-article-figure').first().locator('figcaption'))
  .toHaveText('Un paysage qui illustre le récit biblique.');
 await expect(pop.locator('img[src*="evil.example"]')).toHaveCount(0);
 await pop.locator('.biblelab-article-figure').first()
   .getByRole('button',{name:'Agrandir l’illustration'}).click();
 const zoom=page.getByRole('dialog',{name:'Illustration agrandie'});
 await expect(zoom).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(zoom).toHaveCount(0);
 await expect(pop).toBeVisible();
});
