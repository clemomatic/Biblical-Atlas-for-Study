import { test, expect } from '@playwright/test';

const URL_A='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const URL_B='https://wol.jw.org/fr/wol/d/r30/lp-f/2024664';

test.beforeEach(async ({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.route('https://wol.jw.org/fr/wol/s/r30/lp-f**',route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main class="searchResults">'+
      '<article><a href="/fr/wol/d/r30/lp-f/2024663">L’amour et la bonté</a><p>w24 — Tour de Garde</p></article>'+
      '<article><a href="/fr/wol/d/r30/lp-f/2024664">La patience</a><p>w24 — Tour de Garde</p></article>'+
      '</main></html>'
  }));
  await page.route(URL_A,route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main class="bodyTxt"><h1>L’amour et la bonté</h1>'+
      '<p>Un passage que je peux sélectionner et copier dans mes notes.</p>'+
      '<p>Voir aussi <a href="/fr/wol/d/r30/lp-f/2024664">La patience</a>.</p></main></html>'
  }));
  await page.route(URL_B,route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main class="bodyTxt"><h1>La patience</h1><p>Une deuxième lecture indépendante.</p></main></html>'
  }));
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Search opens multiple independent native reading tabs without leaving Obsidian',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  const pane=page.locator('.biblelab-side').filter({has:page.locator('.biblelab-tabs')});
  await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Voir les résultats'}).click();
  await expect(pane.locator('.biblelab-search-result')).toHaveCount(2);
  await pane.locator('.biblelab-search-result').first().getByRole('button',{name:'Nouvel onglet'}).click();
  await expect(page.locator('.biblelab-article-tab')).toHaveCount(1);
  await expect(page.locator('.biblelab-article-tab').getByText('Un passage que je peux sélectionner',{exact:false})).toBeVisible();
  await pane.locator('.biblelab-search-result').nth(1).getByRole('button',{name:'Nouvel onglet'}).click();
  await expect(page.locator('.biblelab-article-tab')).toHaveCount(2);
  await expect(page.locator('.biblelab-article-tab').nth(1).getByText('Une deuxième lecture indépendante.')).toBeVisible();
  const tabs=await page.evaluate(()=> (window as any).atlasTest.app.workspace
    .getLeavesOfType('bible-lab-wol-article')
    .map((leaf:any)=>leaf.view.getState()));
  expect(tabs).toEqual([{url:URL_A,label:'L’amour et la bonté'},{url:URL_B,label:'La patience'}]);
});

test('Article links navigate inside the current tab, back works, selection remains copyable',async({page})=>{
  const initial=await page.evaluate(async(url)=>{
    const {plugin,app}=(window as any).atlasTest;
    await plugin.openWolArticleTab({label:'L’amour et la bonté',url,kind:'document',origin:'pinned'});
    return app.workspace.getLeavesOfType('bible-lab-wol-article').length;
  },URL_A);
  expect(initial).toBe(1);
  const article=page.locator('.biblelab-article-tab');
  await expect(article.getByText('Un passage que je peux sélectionner',{exact:false})).toBeVisible();
  const paragraph=article.getByText('Un passage que je peux sélectionner',{exact:false});
  await expect.poll(()=>paragraph.evaluate(el=>getComputedStyle(el).userSelect)).toBe('text');
  await article.getByRole('button',{name:'Lire la référence La patience'}).first().click();
  await expect(article.getByText('Une deuxième lecture indépendante.')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.getLeavesOfType('bible-lab-wol-article').length)).toBe(1);
  await article.getByRole('button',{name:'Précédent'}).click();
  await expect(article.getByText('Un passage que je peux sélectionner',{exact:false})).toBeVisible();
});

test('Floating WOL preview opens its currently viewed source in an Obsidian tab',async({page})=>{
  await page.evaluate(()=>{
    const node=document.createElement('p'); node.id='wol-linked-text';
    node.innerHTML='<a href="https://wol.jw.org/fr/wol/d/r30/lp-f/2024663">L’amour et la bonté</a>';
    document.body.appendChild(node);
    (window as any).atlasTest.plugin.markdownPostProcessor(node);
  });
  await page.locator('#wol-linked-text a').click();
  const popup=page.locator('.biblelab-inline-popover');
  await expect(popup.getByText('Un passage que je peux sélectionner',{exact:false})).toBeVisible();
  await popup.getByRole('button',{name:'Nouvel onglet'}).click();
  await expect(popup).toHaveCount(0);
  const article=page.locator('.biblelab-article-tab');
  await expect(article.getByText('Un passage que je peux sélectionner',{exact:false})).toBeVisible();
  const state=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('bible-lab-wol-article')[0].view.getState());
  expect(state.url).toBe(URL_A);
});

test('Native WOL article tab rejects untrusted URL state',async({page})=>{
  await page.evaluate(async()=> {
    const leaf=(window as any).atlasTest.app.workspace.getLeaf('tab');
    await leaf.setViewState({type:'bible-lab-wol-article',state:{
      url:'https://wol.jw.org.attacker.example/fr/wol/d/r30/lp-f/123',label:'Intrus'
    }});
  });
  await expect(page.locator('.biblelab-article-tab')).toHaveCount(1);
  await expect(page.locator('.biblelab-article-tab').getByText('Sélectionne un document WOL')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('bible-lab-wol-article')[0].view.getState().url)).toBe('');
});
