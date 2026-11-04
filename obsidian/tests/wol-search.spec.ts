import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await page.locator('.biblelab-tab[aria-label="WOL"]').click();
});

test('Official search opens WOL in native Chromium tab without scraping results',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await page.evaluate(()=>(window as any).atlasNetworkRequests=[]);
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('justice');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);
  const data=await page.evaluate(()=>({
    tabs:(window as any).atlasTest.app.workspace.getLeavesOfType('webviewer')
      .map((leaf:any)=>leaf.view.getState()),
    requests:(window as any).atlasNetworkRequests
  }));
  expect(data.tabs).toHaveLength(1);
  expect(data.tabs[0].navigate).toBe(true);
  const url=new URL(data.tabs[0].url);
  expect(url.hostname).toBe('wol.jw.org');
  expect(url.pathname).toBe('/fr/wol/s/r30/lp-f');
  expect(url.searchParams.get('q')).toBe('justice');
  expect(data.requests.filter((request:{url:string})=>/\/wol\/s\//.test(request.url))).toHaveLength(0);
  await expect(pane.getByText(/aucun résultat exploitable/i)).toHaveCount(0);
});

test('Changing query reuses ONLY the search tab and keeps unrelated article tabs',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('justice');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  await page.evaluate(()=> (window as any).atlasTest.plugin.openWolArticleTab({
    label:'Article indépendant',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',
    kind:'document',origin:'pinned'
  }));
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  const tabs=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(tabs).toHaveLength(2);
  expect(new URL(tabs[0]).searchParams.get('q')).toBe('amour');
  expect(tabs[1]).toBe('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663');
});

test('Index, Guide and Perspicace use official WOL source filters',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour');
  for(const [name,code] of [['Index','dx'],['Guide de recherche','dx'],['Perspicace','it']] as const){
    await pane.getByRole('button',{name,exact:true}).click();
    await expect(pane.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true');
    const urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
      .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
    expect(urls).toHaveLength(1);
    expect(new URL(urls[0]).searchParams.get('fc[]')).toBe(code);
  }
});

test('Sentence match and bibliographic citations open correct official page',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-wol-extras > summary').click();
  await pane.locator('.biblelab-search-advanced').first().evaluate((el:HTMLDetailsElement)=>{el.open=true;});
  await pane.getByRole('combobox',{name:'Type de correspondance WOL'}).selectOption('sen');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour fidèle');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  let urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(new URL(urls[0]).searchParams.get('p')).toBe('sen');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('w24 Novembre p. 14-19');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(urls).toHaveLength(1);
  expect(urls[0]).toContain('/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19');
});

test('Direct official WOL URL opens the actual page when researched',async({page})=>{
  const pane=page.locator('.biblelab-side');
  const direct='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill(direct);
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  const url=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(url).toBe(direct);
});

test('Local reading remains a separate choice from browser-based WOL research',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await page.route('**/json/html/43007024',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({ranges:{'43007024':{citation:'Jean 7:24',html:'<p>Jugez avec justice.</p>'}}})
  }));
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('Jean 7:24');
  await pane.locator('.biblelab-wol-extras > summary').click();
  await pane.getByRole('button',{name:'Lire dans le panneau'}).click();
  await expect(pane.locator('.biblelab-focused-reading')).toBeVisible();
  await expect(pane.getByText('Jugez avec justice.')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').length)).toBe(0);
});

test('Notes JW Library are still searchable offline and open the original note',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await page.evaluate(async()=>{
    const {app}=(window as any).atlasTest;
    await app.vault.create('Atlas biblique/Imports/Exemple.md',[
      '---','bible_lab_kind: jw-library-note','jw_guid: "sample-01"',
      'title: "Méditation sur la douceur"','---','','Jésus montrait beaucoup de douceur.'
    ].join('\n'));
  });
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('douceur');
  await pane.locator('.biblelab-personal-search').evaluate((el:HTMLDetailsElement)=>{el.open=true;});
  await pane.getByRole('button',{name:'Chercher mes notes'}).click();
  await expect(pane.getByText('Méditation sur la douceur')).toBeVisible();
  await pane.getByRole('button',{name:'Ouvrir la note'}).click();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened))
    .toBe('Atlas biblique/Imports/Exemple.md');
});
