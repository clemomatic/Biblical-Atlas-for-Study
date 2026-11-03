import { test,expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('A saved WOL source can be tagged, starred, archived and recovered without losing its origin',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('L’exemple de Jésus');
  await pane.getByRole('textbox',{name:'Extrait collecté'}).fill('Jésus a manifesté son amitié.');
  await pane.getByRole('textbox',{name:'Lien WOL précis'})
    .fill('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  await pane.locator('.biblelab-capture-card').first()
    .getByRole('button',{name:'Ranger dans mon index'}).click();
  await expect(pane.getByRole('heading',{name:'BAC À TROUVAILLES · 0'})).toBeVisible();
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  const card=pane.locator('.biblelab-archive-card').first();
  await expect(card.getByText('L’exemple de Jésus')).toBeVisible();
  await card.getByRole('button',{name:'Ajouter aux favoris'}).click();
  const updatedCard=pane.locator('.biblelab-archive-card').first();
  await updatedCard.locator('details').evaluate((el:HTMLDetailsElement)=>{el.open=true});
  await updatedCard.getByRole('textbox',{name:'Étiquettes de la source'}).fill('Amitié, Jesus, amitié');
  await updatedCard.getByRole('button',{name:'Enregistrer les changements'}).click();
  await expect(pane.getByText('#Amitié · #Jesus')).toBeVisible();
  await pane.getByRole('button',{name:'Favoris',exact:true}).click();
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(1);
  await pane.getByRole('textbox',{name:'Rechercher dans mon index'}).fill('amitié');
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(1);
  await pane.getByRole('textbox',{name:'Rechercher dans mon index'}).fill('inexistant');
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(0);
  await page.waitForFunction(()=>(window as any).__savedSettings?.bibleLabArchive?.entries?.[0]?.tags?.length===2);
  const snapshot=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchArchive());
  expect(snapshot.entries[0].starred).toBe(true);
  expect(snapshot.entries[0].archived).toBe(true);
  expect(snapshot.entries[0].tags).toEqual(['Amitié','Jesus']);
  await page.evaluate(()=> (window as any).atlasTest.restart());
  await page.evaluate(()=> (window as any).atlasTest.plugin.openBibleLab());
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await expect(pane.getByText('#Amitié · #Jesus')).toBeVisible();
  const captures=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(captures[0].url).toContain('#h=3');
});

test('Recent searches are kept by research scope, can be resumed and never change a source',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amitié des anciens');
  await pane.getByRole('button',{name:'Index',exact:true}).click();
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await expect(pane.locator('.biblelab-history-row')).toHaveCount(1);
  await expect(pane.locator('.biblelab-history-row').getByText('amitié des anciens')).toBeVisible();
  await pane.locator('.biblelab-history-row').getByRole('button',{name:'Reprendre la recherche'}).click();
  const state=await page.evaluate(()=>({
    search:(window as any).atlasTest.app.workspace.getLeavesOfType('webviewer')[0].view.getState().url,
    history:(window as any).atlasTest.plugin.getResearchArchive().history
  }));
  expect(new URL(state.search).searchParams.get('fc[]')).toBe('dx');
  expect(new URL(state.search).searchParams.get('q')).toBe('amitié des anciens');
  expect(state.history).toHaveLength(1);
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await pane.locator('.biblelab-history-row').getByRole('button',{name:'Effacer cette recherche'}).click();
  expect(await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchArchive().history.length)).toBe(0);
});

test('Indexing retains ideas and makes unclassified captures searchable by comment',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Une piste');
  await pane.getByRole('textbox',{name:'Pourquoi garder cette découverte'}).fill('Courage face à l’injustice');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await pane.getByRole('textbox',{name:'Rechercher dans mon index'}).fill('injustice');
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(1);
  await pane.getByRole('button',{name:'Non classées'}).click();
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(1);
});
