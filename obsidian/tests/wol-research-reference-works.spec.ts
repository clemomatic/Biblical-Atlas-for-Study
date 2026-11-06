import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await page.locator('.biblelab-tab[aria-label="Recherche WOL"]').click();
});

test('Research results belong to real WOL: its search opens inside Obsidian without HTML parsing',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await page.evaluate(()=>(window as any).atlasNetworkRequests=[]);
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);
  await expect(pane.locator('.biblelab-search-result')).toHaveCount(0);
  const results=await page.evaluate(()=>({
    viewer:(window as any).atlasTest.app.workspace.getLeavesOfType('webviewer')[0].view.getState(),
    requests:(window as any).atlasNetworkRequests
  }));
  expect(new URL(results.viewer.url).searchParams.get('q')).toBe('amour');
  expect(results.requests.filter((request:{url:string})=>/\/wol\/s\//.test(request.url))).toHaveLength(0);
});

test('Index and Guide remain distinguishable in sidebar while WOL controls actual results',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Index',exact:true}).click();
  let urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(urls).toHaveLength(1);
  expect(new URL(urls[0]).searchParams.get('fc[]')).toBe('dx');
  await pane.getByRole('button',{name:'Guide de recherche',exact:true}).click();
  await pane.locator('.biblelab-wol-extras > summary').click();
  await expect(pane.getByText(/Index et Guide de recherche utilisent le filtre officiel Index/i)).toBeVisible();
  urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(urls).toHaveLength(1);
  expect(new URL(urls[0]).searchParams.get('fc[]')).toBe('dx');
});

test('Failed HTTP-only access does not cause a false WOL zero-results error',async({page})=>{
  await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>
    route.fulfill({status:403,contentType:'text/html',body:'Access denied'}));
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('justice');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);
  await expect(pane.getByText(/aucun résultat exploitable|vérification anti-robot/i)).toHaveCount(0);
});

test('Reader remains a distinct quick preview and text remains copyable',async({page})=>{
  await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main><h1>Amour</h1><p>La patience accompagne l’amour.</p></main></html>'
  }));
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663');
  await pane.locator('.biblelab-wol-extras > summary').click();
  await pane.getByRole('button',{name:'Lire dans le panneau'}).click();
  const paragraph=pane.getByText('La patience accompagne l’amour.');
  await expect(paragraph).toBeVisible();
  expect(await paragraph.evaluate(el=>getComputedStyle(el).userSelect)).toBe('text');
  await pane.getByRole('button',{name:'Nouvel onglet'}).first().click();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url)).toBe('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663');
});
