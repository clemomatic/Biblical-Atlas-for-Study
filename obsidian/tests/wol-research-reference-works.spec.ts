import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await page.locator('.biblelab-tab[aria-label="WOL"]').click();
});

const markup=[
  '<html><main id="searchResults">',
  '<article class="searchResultItem"><h3><a href="/fr/wol/d/r30/lp-f/1200002781">Amour</a></h3><p>it-1 — Étude perspicace (volume 1)</p></article>',
  '<article class="searchResultItem"><h3><a href="/fr/wol/d/r30/lp-f/1200273529">Amour</a></h3><p>dx86-23 — Index 1986-2023</p></article>',
  '<article class="searchResultItem"><h3><a href="/fr/wol/d/r30/lp-f/1200888344">Amour</a></h3><p>rsg — Guide de recherche</p></article>',
  '<article class="searchResultItem"><h3><a href="/fr/wol/d/r30/lp-f/2024663">Les bienfaits de l’amour</a></h3><p>w24.09 — La Tour de Garde</p></article>',
  '</main></html>'
].join('');

test('Reference works open their corresponding subject pages within the Obsidian search',async({page})=>{
  await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
    status:200,contentType:'text/html',body:markup
  }));
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Voir les résultats'}).click();
  await expect(pane.locator('.biblelab-search-result').first()).toContainText('Index');
  await pane.getByRole('button',{name:'Guide de recherche'}).click();
  await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
  await expect(pane.locator('.biblelab-search-result')).toContainText('Guide de recherche');
  await pane.getByRole('button',{name:'Perspicace'}).click();
  await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
  await expect(pane.locator('.biblelab-search-result')).toContainText('Perspicace');
  const urls=await page.evaluate(()=>(window as any).atlasNetworkRequests);
  expect(urls.some((request:{url:string})=>new URL(request.url).searchParams.get('fc[]')==='it')).toBeTruthy();
});

test('WOL anti-robot page reports the actual restriction and keeps a direct search link',async({page})=>{
  await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><body><h1>JavaScript is disabled</h1>In order to continue, we need to verify that you are not a robot.</body></html>'
  }));
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Voir les résultats'}).click();
  await expect(pane.getByText(/vérification anti-robot/)).toBeVisible();
  await expect(pane.getByRole('button',{name:'Continuer sur WOL'})).toBeVisible();
});

test('Reader text can be selected and copied separately from its source link',async({page})=>{
  await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
    status:200,contentType:'text/html',body:markup
  }));
  await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200273529',route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main><h1>Amour</h1><p>La patience accompagne l’amour.</p></main></html>'
  }));
  await page.evaluate(()=>{
    (window as any).copiedText='';
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      writeText:async(text:string)=>{(window as any).copiedText=text;}
    }});
  });
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Voir les résultats'}).click();
  await pane.locator('.biblelab-search-result').filter({hasText:'Index'}).getByRole('button',{name:'Lire ici'}).click();
  const paragraph=pane.getByText('La patience accompagne l’amour.');
  await expect(paragraph).toBeVisible();
  await paragraph.evaluate(node=>{
    const range=document.createRange();
    range.selectNodeContents(node);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  });
  await pane.getByRole('button',{name:'Copier le texte'}).click();
  expect(await page.evaluate(()=>(window as any).copiedText)).toContain('La patience accompagne l’amour.');
  const selectionStyle=await paragraph.evaluate(node=>getComputedStyle(node).userSelect);
  expect(selectionStyle).toBe('text');
});


test('Unknown WOL metadata still shows safe document links rather than a blank list',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><article><a href="/fr/wol/d/r30/lp-f/2024663">Amour et bonté</a></article></main></html>'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
 await pane.getByRole('button',{name:'Guide de recherche'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
 await expect(pane.getByText(/sans filtrage complémentaire/)).toBeVisible();
});

test('WOL pagination remains navigable when the next page is empty',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>{
  const url=new URL(route.request().url());
  const next=url.searchParams.get('pg')==='2';
  route.fulfill({
   status:200,contentType:'text/html',
   body:next?'<html><main><p>Aucun résultat</p></main></html>':
    '<html><main><article><a href="/fr/wol/d/r30/lp-f/1200273529">Amour</a></article>'+
    '<a href="/fr/wol/s/r30/lp-f?q=amour&p=par&pg=2">Suivant</a></main></html>'
  });
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await pane.getByRole('button',{name:'Page suivante'}).click();
 await expect(pane.getByText(/aucun résultat exploitable/i)).toBeVisible();
 await pane.getByRole('button',{name:'Page précédente'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
});


test('WOL native resultContentTopic and resultContentDocument rows preserve source, title and excerpt',async({page})=>{
 const html='<html><main id="results"><div id="resultsCount">263 résultats</div>'+
  '<ul class="resultContentTopic"><li class="caption"><a href="/fr/wol/d/r30/lp-f/1200273529"><strong>Amour</strong></a></li>'+
  '<li class="ref">dx86-23 — Index des publications 1986-2023</li>'+
  '<li class="resultSubheadings"><ul><li><a href="/fr/wol/d/r30/lp-f/1200001111">Sujet voisin</a></li></ul></li></ul>'+
  '<ul class="resultContentDocument"><li class="caption"><a href="/fr/wol/d/r30/lp-f/2024663">Cultivons un amour sincère</a><span class="count">4</span></li>'+
  '<li class="ref">w24.09 — La Tour de Garde</li>'+
  '<li><div class="document"><p>Jésus a montré un amour profond et désintéressé envers ses disciples.</p></div></li></ul>'+
  '<ul class="resultContentTopic"><li class="caption"><a href="/fr/wol/d/r30/lp-f/1200002781">Amour</a></li>'+
  '<li class="ref">it-1 — Étude perspicace</li></ul></main></html>';
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',body:html
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(3);
 await expect(pane.locator('.biblelab-search-result').first()).toContainText('Index');
 await expect(pane.locator('.biblelab-search-result').filter({hasText:'Cultivons un amour sincère'}))
  .toContainText('Jésus a montré un amour profond');
 await expect(pane.getByText('Sujet voisin')).toHaveCount(0);
 await pane.getByRole('button',{name:'Perspicace'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
 await expect(pane.locator('.biblelab-search-result')).toContainText('Perspicace');
 const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests);
 const searches=requests.filter((request:{url:string})=>new URL(request.url).pathname==='/fr/wol/s/r30/lp-f');
 expect(searches.length).toBeGreaterThanOrEqual(2);
 for(const request of searches){
  const params=new URL(request.url).searchParams;
  expect(params.get('r')).toBe('occ');
  expect(params.get('st')).toBe('a');
 }
});

test('A successful empty WOL HTML shell triggers official alternative rather than a false no-result error',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>{
  const target=new URL(route.request().url());
  const hasStandardOptions=target.searchParams.get('st')==='a';
  route.fulfill({status:200,contentType:'text/html',
   body:hasStandardOptions
     ?'<html><body><header><a href="/fr/wol/d/r30/lp-f/99999">Navigation WOL</a></header><main id="results"></main></body></html>'
     :'<html><main id="results"><ul class="resultContentDocument"><li class="caption">'+
      '<a href="/fr/wol/d/r30/lp-f/2024663">L’amour fidèle de Jésus</a></li>'+
      '<li class="ref">w24 — La Tour de Garde</li></ul></main></html>'});
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
 await expect(pane.getByText('L’amour fidèle de Jésus')).toBeVisible();
 await expect(pane.getByText(/aucun résultat exploitable/i)).toHaveCount(0);
 const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests);
 expect(requests.some((request:{url:string})=>new URL(request.url).searchParams.get('st')===null)).toBeTruthy();
});

test('If WOL returns a JavaScript-only results shell, explain it without claiming there are no site results',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/(?:s|l)\/r30\/lp-f/,route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<html><main id="results"><div class="loading">Recherche...</div></main></html>'}));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('bonté');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText(/sans liste de résultats lisible par Obsidian/i)).toBeVisible();
 await expect(pane.getByRole('button',{name:'Continuer sur WOL'})).toBeVisible();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(0);
});
