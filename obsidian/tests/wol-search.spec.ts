import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>{
  (window as any).openedSites=[];
  window.open=((url:string|URL|undefined)=>{
   (window as any).openedSites.push(String(url));return null;
  }) as typeof window.open;
  return (window as any).atlasTest.plugin.openBibleLab();
 });
 await page.locator('.biblelab-tab[aria-label="WOL"]').click();
});

test('WOL topic search shows only official source links and opens selected article in the reader',async({page})=>{
 const resultHtml='<html><main class="searchResults">'+
  '<article><h3><a href="/fr/wol/d/r30/lp-f/2024663">Comment cultiver la bonté ?</a></h3>'+
  '<p>Une idée de l’article à lire.</p></article>'+
  '<article><a href="https://wol.jw.org.evil.test/fr/wol/d/r30/lp-f/42">Lien non fiable</a></article>'+
  '<article><a href="/fr/wol/d/r30/lp-f/2024642">Rester courageux face à l’injustice</a></article>'+
  '</main></html>';
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',body:resultHtml
 }));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Comment cultiver la bonté ?</h1><p>Voici un article à consulter.</p></main></html>'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Mot, sujet ou verset…').fill('bonté');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText('Comment cultiver la bonté ?')).toBeVisible();
 await expect(pane.getByText('Rester courageux face à l’injustice')).toBeVisible();
 await expect(pane.getByText('Lien non fiable')).toHaveCount(0);
 await pane.locator('.biblelab-wol-hit').filter({hasText:'Comment cultiver la bonté ?'})
  .getByRole('button',{name:'Lire ici'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Voici un article à consulter.')).toBeVisible();
});

test('Official WOL sentence and Index filters are sent only on explicit search',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await page.evaluate(()=>(window as any).atlasNetworkRequests=[]);
 await pane.getByPlaceholder('Mot, sujet ou verset…').fill('amour fidèle');
 await pane.getByRole('combobox',{name:'Type de correspondance WOL'}).selectOption('sen');
 await pane.getByRole('combobox',{name:'Sources WOL'}).selectOption('index');
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><article><a href="/fr/wol/d/r30/lp-f/1200270070">Index : amour fidèle</a></article></main></html>'
 }));
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests)).toEqual([]);
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText('Index : amour fidèle')).toBeVisible();
 const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests);
 expect(requests).toHaveLength(1);
 const url=new URL(requests[0].url);
 expect(url.searchParams.get('p')).toBe('sen');
 expect(url.searchParams.get('fc[]')).toBe('dx');
 expect(url.searchParams.get('q')).toBe('amour fidèle');
});

test('JW.org and JW Library remain separate official navigation targets',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Mot, sujet ou verset…').fill('bienveillance');
 await pane.getByRole('button',{name:'Recherche JW.org'}).click();
 let urls=await page.evaluate(()=>(window as any).openedSites);
 expect(urls[0]).toBe('https://www.jw.org/fr/rechercher/?q=bienveillance');
 await pane.getByPlaceholder('Mot, sujet ou verset…').fill('Matthieu 10:29');
 await pane.getByRole('button',{name:'JW Library'}).click();
 urls=await page.evaluate(()=>(window as any).openedSites);
 expect(urls[1]).toContain('https://www.jw.org/finder?wtlocale=F&bible=40010029');
});

test('WOL blocked access shows explicit source fallback, not invented results',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:403,contentType:'text/html',body:'Forbidden'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Mot, sujet ou verset…').fill('justice');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText(/WOL a répondu avec le code 403/)).toBeVisible();
 await pane.getByRole('button',{name:'Continuer sur WOL'}).click();
 const opened=await page.evaluate(()=>(window as any).openedSites);
 expect(opened[0]).toContain('https://wol.jw.org/fr/wol/s/r30/lp-f');
});
