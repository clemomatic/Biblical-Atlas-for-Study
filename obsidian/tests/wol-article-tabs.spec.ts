import {test,expect} from '@playwright/test';

const URL_A='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const URL_B='https://wol.jw.org/fr/wol/d/r30/lp-f/2024664';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.route(URL_A,route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main class="bodyTxt"><h1>L’amour et la bonté</h1>'+
      '<p>Ce texte apparaît dans l’aperçu Bible Lab.</p></main></html>'
  }));
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Official article opens as real Obsidian Web viewer, not a rebuilt Bible Lab tab',async({page})=>{
  await page.evaluate(async url=>{
    await (window as any).atlasTest.plugin.openWolArticleTab({
      url,label:'L’amour et la bonté',kind:'document',origin:'pinned'
    });
  },URL_A);
  const viewer=page.locator('.mock-core-webviewer');
  await expect(viewer).toHaveCount(1);
  await expect(viewer.locator('.mock-webviewer-address')).toHaveText(URL_A);
  await expect(page.locator('.biblelab-article-tab')).toHaveCount(0);
  const states=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState()));
  expect(states).toEqual([{url:URL_A,navigate:true}]);
});

test('Each article gets an independent native Web viewer tab',async({page})=>{
  await page.evaluate(async([a,b])=>{
    const plugin=(window as any).atlasTest.plugin;
    await plugin.openWolArticleTab({url:a,label:'Premier',kind:'document',origin:'pinned'});
    await plugin.openWolArticleTab({url:b,label:'Deuxième',kind:'document',origin:'pinned'});
  },[URL_A,URL_B]);
  const states=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState()));
  expect(states).toEqual([{url:URL_A,navigate:true},{url:URL_B,navigate:true}]);
  await expect(page.locator('.mock-core-webviewer')).toHaveCount(2);
});

test('Floating preview opens the official WOL page in native Web viewer',async({page})=>{
  await page.evaluate(()=>{
    const node=document.createElement('p');
    node.id='wol-linked-text';
    node.innerHTML='<a href="https://wol.jw.org/fr/wol/d/r30/lp-f/2024663">L’amour et la bonté</a>';
    document.body.appendChild(node);
    (window as any).atlasTest.plugin.markdownPostProcessor(node);
  });
  await page.locator('#wol-linked-text a').click();
  const popup=page.locator('.biblelab-inline-popover');
  await expect(popup.getByText('Ce texte apparaît dans l’aperçu Bible Lab.')).toBeVisible();
  await popup.getByRole('button',{name:'Nouvel onglet'}).click();
  await expect(popup).toHaveCount(0);
  const state=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState());
  expect(state.url).toBe(URL_A);
});

test('An untrusted document URL cannot open an Obsidian browser tab',async({page})=>{
  await page.evaluate(async()=>{
    await (window as any).atlasTest.plugin.openWolArticleTab({
      url:'https://wol.jw.org.attacker.example/fr/wol/d/r30/lp-f/123',
      label:'Intrus',kind:'document',origin:'pinned'
    });
  });
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').length)).toBe(0);
});
