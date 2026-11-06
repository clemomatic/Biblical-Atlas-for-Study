import { test,expect } from '@playwright/test';

const ARTICLE='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const PASSAGE='La véritable amitié se construit avec patience et bienveillance.';
const TITLE='Comment cultiver une véritable amitié ?';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

async function openWolWithSelection(page:any,paragraphUrl=ARTICLE+'#h=7'){
  await page.evaluate(async ({url,title,selected,deep})=>{
    const {app,plugin}=(window as any).atlasTest;
    await plugin.openWolArticleTab({label:'Article',url,kind:'document',origin:'pinned'});
    const viewer=app.workspace.getLeavesOfType('webviewer')[0].view;
    viewer.mockSnapshot={
      title,url,paragraphUrl:deep,selectionText:selected
    };
  },{url:ARTICLE,title:TITLE,selected:PASSAGE,deep:paragraphUrl});
  await page.waitForFunction(()=>
    (window as any).atlasTest.plugin.wolClipBridge?.handlers?.size>0);
}

test('Right-click a selected WOL quote, keep exact paragraph and title, then read it in the panel',async({page})=>{
  await openWolWithSelection(page);
  const used=await page.evaluate(({url,selection})=>
    (window as any).atlasTest.triggerWolContext({pageURL:url,selectionText:selection}),
    {url:ARTICLE,selection:PASSAGE});
  expect(used).toBe(true);
  await expect(page.getByRole('button',{name:'Bible Lab · Garder cette portion'})).toBeVisible();
  await page.getByRole('button',{name:'Bible Lab · Garder cette portion'}).click();
  const pane=page.locator('.biblelab-side');
  await expect(pane.locator('.biblelab-tab[aria-label="Trouvailles"]'))
    .toHaveAttribute('aria-selected','true');
  const captured=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(captured).toHaveLength(1);
  expect(captured[0].label).toBe(TITLE);
  expect(captured[0].excerpt).toBe(PASSAGE);
  expect(captured[0].url).toBe(ARTICLE+'#h=7');
  const card=pane.locator('.biblelab-capture-card').first();
  await expect(card.locator('strong').first()).toHaveText(TITLE);
  const preview=card.locator('.biblelab-quote-preview');
  await expect(preview).not.toHaveAttribute('open','');
  await preview.locator('summary').click();
  await expect(preview.locator('blockquote')).toHaveText(PASSAGE);
  await expect(preview.locator('.biblelab-quote-anchor')).toHaveText('Paragraphe lié');
  await page.route(ARTICLE,route=>route.fulfill({
    status:200,contentType:'text/html',
    body:'<html><main><h1>'+TITLE+'</h1><p>'+PASSAGE+'</p></main></html>'
  }));
  await preview.getByRole('button',{name:'Lire dans le panneau'}).click();
  await expect(pane.locator('.biblelab-focused-reading')).toBeVisible();
  await expect(pane.locator('.biblelab-focused-reading')).toContainText(TITLE);
});

test('If the WOL page offers no paragraph anchor, the quote keeps article URL (never a guessed #h)',async({page})=>{
  await openWolWithSelection(page,'');
  await page.evaluate(({url,selection})=>
    (window as any).atlasTest.triggerWolContext({pageURL:url,selectionText:selection}),
    {url:ARTICLE,selection:PASSAGE});
  await page.getByRole('button',{name:'Bible Lab · Garder cette portion'}).click();
  const captured=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(captured[0].url).toBe(ARTICLE);
  expect(captured[0].label).toBe(TITLE);
  const pane=page.locator('.biblelab-side');
  await expect(pane.locator('.biblelab-capture-card .biblelab-quote-anchor')).toHaveCount(0);
});

test('WOL lookalikes, empty selections and editable fields cannot trigger clipping',async({page})=>{
  await openWolWithSelection(page);
  for(const candidate of [
    {pageURL:'https://wol.jw.org.attacker.invalid/fr/wol/d/r30/lp-f/1',selectionText:PASSAGE},
    {pageURL:ARTICLE,selectionText:''},
    {pageURL:ARTICLE,selectionText:PASSAGE,isEditable:true},
    {pageURL:ARTICLE,frameURL:'https://another.example.com/',selectionText:PASSAGE}
  ]){
    const prevented=await page.evaluate(value=>(window as any).atlasTest.triggerWolContext(value),candidate);
    expect(prevented).toBe(false);
    await expect(page.locator('.mock-context-menu')).toHaveCount(0);
  }
  const captures=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(captures).toHaveLength(0);
});

test('Keyboard fallback captures the selection and allows old numbered titles to be refreshed',async({page})=>{
  await openWolWithSelection(page);
  await page.evaluate(()=> (window as any).atlasTest.plugin.commands
    .get('bible-lab-keep-wol-portion').callback());
  const pane=page.locator('.biblelab-side');
  await expect(pane.locator('.biblelab-capture-card').first().getByText(TITLE)).toBeVisible();
  await page.evaluate(async()=>{
    const plugin=(window as any).atlasTest.plugin;
    const store=plugin.getResearchCollection();
    await plugin.saveResearchCollection({...store,captures:[
      {...store.captures[0],id:'old-article',label:'Document WOL · 2024663',excerpt:''},
      ...store.captures
    ]});
    await plugin.openBibleLabCollection();
  });
  const old=pane.locator('.biblelab-capture-card').filter({hasText:'Document WOL · 2024663'}).first();
  await old.getByRole('button',{name:'Options de la trouvaille'}).click();
  await page.getByRole('button',{name:'Récupérer le titre de l’article'}).click();
  await expect(pane.locator('.biblelab-capture-card').filter({hasText:'Document WOL · 2024663'}))
    .toHaveCount(0);
  const saved=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(saved.find((item:any)=>item.id==='old-article')?.label).toBe(TITLE);
});
