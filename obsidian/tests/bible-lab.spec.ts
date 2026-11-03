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
  await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
  await expect(pane.getByPlaceholder('Sujet, publication ou verset…')).toHaveValue('');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('Jean 7:24');
  await pane.locator('.biblelab-search-advanced').first().evaluate((node:HTMLDetailsElement)=>{node.open=true;});
  await pane.getByRole('button',{name:/JW Library$/}).first().click();
  const opened=await page.evaluate(()=>(window as any).openedLabUrls);
  expect(opened[0]).toContain('bible=43007024');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  const search=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(search).toContain('https://wol.jw.org/fr/wol/s/r30/lp-f?q=Jean+7%3A24');
  // Opening a pinned verse may fetch the official study Bible in the
  // reference pane; keyword search itself must still only open the official URL.
});

test('map finder searches official grid and opens a specific verified map',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Atlas'}).click();
  await expect(pane.getByText('Cartothèque biblique')).toBeVisible();
  await pane.getByPlaceholder('Jérusalem, Capharnaüm, Our…').fill('Capharnaüm');
  await expect(pane.getByText('p. 18 · F4 ; p. 29 · E4')).toBeVisible();
  await pane.getByRole('button',{name:'Voir la carte'}).click();
  const opened=await page.evaluate(()=>(window as any).openedLabUrls);
  expect(opened[0]).toContain('La-Terre-promise/');
});

test('study Bible resources include individual maps and the main appendices',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Sources'}).click();
  await expect(pane.getByText('Appendice A',{exact:true})).toBeVisible();
  await expect(pane.getByText('Appendice B',{exact:true})).toBeVisible();
  await expect(pane.getByText('Appendice C',{exact:true})).toBeVisible();
  await expect(pane.getByText('B2 — Genèse et patriarches')).toBeVisible();
  await expect(pane.getByText('B10 — Israël au temps de Jésus')).toBeVisible();
});

test('Legacy WOL markers open a floating verse preview without altering the note',async({page})=>{
  await page.evaluate(()=>{
    const node=document.createElement('p');node.textContent='Regarder !!Jean 3:16!! dans mon étude.';
    document.body.appendChild(node);
    (window as any).atlasTest.plugin.markdownPostProcessor(node);
  });
  await page.getByText('Jean 3:16',{exact:true}).last().click();
  await expect(page.getByRole('dialog',{name:'Aperçu biblique : Jean 3:16'})).toBeVisible();
  await expect(page.locator('.biblelab-side').locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
  await page.getByRole('dialog',{name:'Aperçu biblique : Jean 3:16'})
    .getByRole('button',{name:'Fermer'}).click();
  await expect(page.getByRole('dialog',{name:'Aperçu biblique : Jean 3:16'})).toHaveCount(0);
});
