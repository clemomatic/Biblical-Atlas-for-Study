import {test,expect} from '@playwright/test';

const ARTICLE='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const FIGURE='<html><main class="bodyTxt"><h1>Une étude illustrée</h1>'+
 '<p>Introduction avant l’image.</p>'+
 '<figure><a href="https://wol.jw.org/fr/wol/mp/r30/lp-f/w26/2026/5">'+
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
 await expect(first.locator('img')).toHaveAttribute('src','https://cms-imgp.jw-cdn.org/img/p/example/large.webp');
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
 await expect(dialog.locator('img')).toHaveAttribute('src','https://cms-imgp.jw-cdn.org/img/p/example/large.webp');
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


const MOCK_IMAGE='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="540" viewBox="0 0 900 540">'+
 '<rect width="900" height="540" fill="#dde6f4"/></svg>';
async function mockArticleImages(page:import('@playwright/test').Page):Promise<void>{
 await page.route('https://cms-imgp.jw-cdn.org/**',route=>route.fulfill({
   status:200,contentType:'image/svg+xml',body:MOCK_IMAGE
 }));
 // Reproduce the fixed button height normally applied by Obsidian themes.
 await page.addStyleTag({content:'button {height:32px;overflow:hidden}'});
}

test('Article images are not clipped by Obsidian fixed-height buttons in the sidebar',async({page})=>{
 await mockArticleImages(page);
 await page.evaluate((url)=>(window as any).atlasTest.plugin.openBibleLab(url),ARTICLE);
 const first=page.locator('.biblelab-article-reading .biblelab-article-figure').first();
 const img=first.locator('img');
 await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalHeight)).toBe(540);
 const box=await first.evaluate(figure=>{
  const image=figure.querySelector('img')!,button=figure.querySelector('button')!;
  const a=image.getBoundingClientRect(),b=button.getBoundingClientRect(),f=figure.getBoundingClientRect();
  return {imageHeight:a.height,buttonHeight:b.height,imageWidth:a.width,figureWidth:f.width,
   naturalRatio:(image as HTMLImageElement).naturalWidth/(image as HTMLImageElement).naturalHeight,
   renderedRatio:a.width/a.height,overflow:getComputedStyle(button).overflow};
 });
 expect(box.imageHeight).toBeGreaterThan(100);
 expect(box.buttonHeight).toBeGreaterThanOrEqual(box.imageHeight-1);
 expect(box.imageWidth).toBeLessThanOrEqual(box.figureWidth+1);
 expect(box.renderedRatio).toBeCloseTo(box.naturalRatio,1);
 expect(box.overflow).toBe('visible');
});

test('Article image remains fully visible and proportional in mobile inline preview',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await mockArticleImages(page);
 await page.evaluate((url)=>{
  const p=document.createElement('p');p.id='image-height-note';
  p.innerHTML='<a href="'+url+'">Article illustré</a>';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 },ARTICLE);
 await page.locator('#image-height-note a').click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : Article illustré'});
 const img=popup.locator('.biblelab-article-figure img').first();
 await expect.poll(()=>img.evaluate(el=>(el as HTMLImageElement).naturalHeight)).toBe(540);
 const metrics=await img.evaluate(image=>{
   const a=image.getBoundingClientRect(),button=image.closest('button')!.getBoundingClientRect();
   const figure=image.closest('figure')!.getBoundingClientRect();
   return {height:a.height,buttonHeight:button.height,width:a.width,figureWidth:figure.width};
 });
 expect(metrics.height).toBeGreaterThan(100);
 expect(metrics.buttonHeight).toBeGreaterThanOrEqual(metrics.height-1);
 expect(metrics.width).toBeLessThanOrEqual(metrics.figureWidth+1);
 await popup.locator('.biblelab-article-figure').first().getByRole('button',{name:'Agrandir l’illustration'}).click();
 await expect(page.getByRole('dialog',{name:'Illustration agrandie'})).toBeVisible();
});
