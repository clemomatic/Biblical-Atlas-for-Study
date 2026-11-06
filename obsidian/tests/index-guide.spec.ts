import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('Index search opens the actual WOL Index-filtered research page',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Recherche WOL"]').click();
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('miséricorde');
  await pane.getByRole('button',{name:'Index',exact:true}).click();
  await expect(pane.getByRole('button',{name:'Index',exact:true})).toHaveAttribute('aria-pressed','true');
  const search=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  const url=new URL(search);
  expect(url.searchParams.get('q')).toBe('miséricorde');
  expect(url.searchParams.get('fc[]')).toBe('dx');
});

test('Guide search keeps WOL itself responsible for result classification',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Recherche WOL"]').click();
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('compassion');
  await pane.getByRole('button',{name:'Guide de recherche',exact:true}).click();
  await expect(pane.getByRole('button',{name:'Guide de recherche',exact:true})).toHaveAttribute('aria-pressed','true');
  await pane.locator('.biblelab-wol-extras > summary').click();
  await expect(pane.getByText(/Index et Guide de recherche utilisent le filtre officiel Index/i)).toBeVisible();
  const search=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(new URL(search).searchParams.get('fc[]')).toBe('dx');
  await expect(pane.locator('.biblelab-search-result')).toHaveCount(0);
});

test('Reader contextual Index and Guide paths open official WOL searches next to notes',async({page})=>{
  const verse={ranges:{'43007024':{
    citation:'Jean 7:24',html:'<p>Jugez avec justice.</p>',
    footnotes:[],commentaries:[],crossReferences:[]}}};
  await page.route('**/json/html/43007024',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(verse)}));
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('searchbox',{name:'Rechercher dans JW Study Desk'}).fill('Jean 7:24');
  await pane.getByRole('button',{name:'Lancer une recherche'}).click();
  await expect(pane.getByRole('button',{name:'Consulter le Guide'})).toBeVisible();
  await pane.getByRole('button',{name:'Consulter le Guide'}).click();
  await expect(pane.locator('.biblelab-tab[aria-label="Recherche WOL"]')).toHaveAttribute('aria-selected','true');
  await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('Jean 7:24');
  const search=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(new URL(search).searchParams.get('fc[]')).toBe('dx');
});
