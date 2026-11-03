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
