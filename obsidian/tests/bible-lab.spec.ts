import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>{ (window as any).openedLabUrls=[]; window.open=((url:string|URL|undefined)=>{(window as any).openedLabUrls.push(String(url));return null;}) as typeof window.open; });
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Matthieu 10:29'));
  await expect(page.locator('.biblelab-side')).toBeVisible();
});

test('research sidebar opens and sends only the current search to official URLs',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByPlaceholder('Mot, sujet ou verset…')).toHaveValue('Matthieu 10:29');
  await pane.getByPlaceholder('Mot, sujet ou verset…').fill('Jean 7:24');
  await pane.getByRole('button',{name:/JW Library$/}).first().click();
  const opened=await page.evaluate(()=>(window as any).openedLabUrls);
  expect(opened[0]).toContain('bible=43007024');
  await pane.getByRole('button',{name:'Rechercher WOL'}).click();
  const updated=await page.evaluate(()=>(window as any).openedLabUrls);
  expect(updated[1]).toBe('https://wol.jw.org/fr/wol/s/r30/lp-f?q=Jean%207%3A24');
  expect(await page.evaluate(()=>(window as any).atlasNetworkRequests??[])).toHaveLength(0);
});

test('map finder searches official grid and opens a specific verified map',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Cartes'}).click();
  await expect(pane.getByText('Cartothèque biblique')).toBeVisible();
  await pane.getByPlaceholder('Jérusalem, Capharnaüm, Our…').fill('Capharnaüm');
  await expect(pane.getByText('p. 18 · F4 ; p. 29 · E4')).toBeVisible();
  await pane.getByRole('button',{name:'Voir la carte'}).click();
  const opened=await page.evaluate(()=>(window as any).openedLabUrls);
  expect(opened[0]).toContain('La-Terre-promise/');
});

test('study Bible resources include individual maps and the main appendices',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Outils'}).click();
  await expect(pane.getByText('Appendice A',{exact:true})).toBeVisible();
  await expect(pane.getByText('Appendice B',{exact:true})).toBeVisible();
  await expect(pane.getByText('Appendice C',{exact:true})).toBeVisible();
  await expect(pane.getByText('B2 — Genèse et patriarches')).toBeVisible();
  await expect(pane.getByText('B10 — Israël au temps de Jésus')).toBeVisible();
});

test('WOL style reference markers open the search sidebar without altering the note',async({page})=>{
  await page.evaluate(()=>{
    const node=document.createElement('p');node.textContent='Regarder !!Jean 3:16!! dans mon étude.';
    document.body.appendChild(node);
    (window as any).atlasTest.plugin.markdownPostProcessor(node);
  });
  await page.getByText('Jean 3:16',{exact:true}).last().click();
  await expect(page.locator('.biblelab-side').getByPlaceholder('Mot, sujet ou verset…')).toHaveValue('Jean 3:16');
});
