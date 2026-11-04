import { test,expect } from '@playwright/test';

const WOL_A='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3';
const WOL_B='https://wol.jw.org/fr/wol/d/r30/lp-f/2024664#h=2';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('A visible one-click action captures the known WOL paragraph without reading page content',async({page})=>{
  await page.evaluate(url=>(window as any).atlasTest.plugin.openWolArticleTab({
    label:'Article sur l’amitié',url,kind:'document',origin:'pinned'
  }),WOL_A);
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await expect(pane.locator('.biblelab-quick-capture').first()).toContainText('Document WOL · 2024663');
  await pane.locator('.biblelab-quick-capture').first()
    .getByRole('button',{name:'Garder le lien WOL'}).click();
  await expect(pane.locator('.biblelab-tab[aria-label="Trouvailles"]')).toHaveAttribute('aria-selected','true');
  const saved=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(saved.captures).toHaveLength(1);
  expect(saved.captures[0].url).toBe(WOL_A);
  expect(saved.captures[0].label).toBe('Article WOL de démonstration');
  expect(saved.captures[0].excerpt).toBe('');
  await page.waitForFunction(()=>(window as any).__savedSettings?.bibleLabCollection?.captures?.length===1);
});

test('A copied passage is captured with its known WOL source via one explicit click',async({page})=>{
  await page.evaluate(async url=>{
    await (window as any).atlasTest.plugin.openWolArticleTab({
      label:'Article',url,kind:'document',origin:'pinned'
    });
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      readText:async()=> 'L’amitié peut grandir dans les difficultés.'
    }});
  },WOL_A);
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await pane.locator('.biblelab-quick-capture').first()
    .getByRole('button',{name:'Garder le texte copié'}).click();
  await expect(pane.locator('.biblelab-tab[aria-label="Trouvailles"]')).toHaveAttribute('aria-selected','true');
  const store=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(store.captures[0].url).toBe(WOL_A);
  expect(store.captures[0].excerpt).toBe('L’amitié peut grandir dans les difficultés.');
  expect(store.captures[0].label).toBe('Article WOL de démonstration');
});

test('With several indistinguishable WOL tabs, source selection is requested before saving',async({page})=>{
  await page.evaluate(async ([first,second])=>{
    const plugin=(window as any).atlasTest.plugin;
    await plugin.openWolArticleTab({label:'Première',url:first,kind:'document',origin:'pinned'});
    await plugin.openWolArticleTab({label:'Deuxième',url:second,kind:'document',origin:'pinned'});
  },[WOL_A,WOL_B]);
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await expect(pane.locator('.biblelab-quick-capture').first())
    .toContainText('Plusieurs pages WOL');
  await pane.locator('.biblelab-quick-capture').first()
    .getByRole('button',{name:'Garder le lien WOL'}).click();
  const collection=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(collection.captures).toHaveLength(0);
  await pane.locator('.biblelab-manual-capture > summary').click();
  await pane.getByRole('combobox',{name:'Onglet WOL à conserver'}).selectOption(WOL_B);
  await pane.getByRole('button',{name:'Utiliser ce lien'}).click();
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Référence pour une autre étude');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  const saved=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(saved.captures).toHaveLength(1);
  expect(saved.captures[0].url).toBe(WOL_B);
});

test('The command palette quick-capture action can save a user-copied WOL URL',async({page})=>{
  await page.evaluate(async()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
      readText:async()=> 'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3'
    }});
    await (window as any).atlasTest.plugin.commands.get('bible-lab-quick-capture').callback();
  });
  await expect(page.locator('.biblelab-tab[aria-label="Trouvailles"]'))
    .toHaveAttribute('aria-selected','true');
  const store=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(store.captures).toHaveLength(1);
  expect(store.captures[0].url).toBe(WOL_A);
});
