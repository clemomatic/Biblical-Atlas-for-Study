import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await page.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await page.locator('.biblelab-manual-capture > summary').click();
});

test('A WOL excerpt and precise paragraph URL can be kept without a sentence or plan',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Une jolie découverte');
  await pane.getByRole('textbox',{name:'Lien WOL précis'})
    .fill('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3');
  await pane.getByRole('textbox',{name:'Extrait collecté'}).fill('Un paragraphe qui me fait réfléchir.');
  await pane.getByRole('textbox',{name:'Pourquoi garder cette découverte'}).fill('Pour une autre étude');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  await expect(pane.getByRole('heading',{name:'BAC À TROUVAILLES · 1'})).toBeVisible();
  const store=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection());
  expect(store.ideas).toHaveLength(0);
  expect(store.captures).toHaveLength(1);
  expect(store.captures[0].url).toBe('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3');
  expect(store.captures[0].comment).toBe('Pour une autre étude');
  await page.waitForFunction(()=>(window as any).__savedSettings?.bibleLabCollection?.captures?.length===1);
  await pane.locator('.biblelab-capture-card').first().getByRole('button',{name:'Options de la trouvaille'}).click();
  await page.getByRole('button',{name:'Ouvrir dans WOL'}).click();
  const urls=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf:any)=>leaf.view.getState().url));
  expect(urls).toContain('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3');
});

test('An idea groups sources and inserts one Markdown sentence with parenthesized links',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Jean 7:24');
  await pane.getByRole('textbox',{name:'Lien WOL précis'})
    .fill('https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();

  await pane.getByRole('button',{name:'Nouvelle fiche d’idée'}).click();
  await pane.getByRole('textbox',{name:'Phrase principale de l’idée'})
    .fill('Les anciens doivent cultiver l’amitié');
  await pane.getByRole('textbox',{name:'Phrase principale de l’idée'}).press('Tab');
  const idea=pane.locator('.biblelab-idea-card');
  await idea.getByRole('button',{name:'Ajouter cette référence'}).click();
  await expect(idea.locator('.biblelab-idea-source-text strong').filter({hasText:'Jean 7:24'})).toBeVisible();
  await expect(pane.getByRole('heading',{name:'BAC À TROUVAILLES · 0'})).toBeVisible();

  await page.evaluate(()=> (window as any).atlasTest.openMarkdownEditor('Mes notes/Une idée précieuse.md'));
  await idea.getByRole('button',{name:'Insérer dans ma note'}).click();
  const content=await page.evaluate(()=> (window as any).atlasTest.file('Mes notes/Une idée précieuse.md'));
  expect(content).toContain('Les anciens doivent cultiver l’amitié ([Jean 7:24](https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/43/7))');
  const store=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection());
  expect(store.captures).toHaveLength(1);
  expect(store.ideas[0].captureIds).toHaveLength(1);
  await idea.getByRole('button',{name:'Retirer de la fiche'}).click();
  const after=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection());
  expect(after.captures).toHaveLength(1);
  expect(after.ideas[0].captureIds).toHaveLength(0);
});

test('A citation currently being read can be added to the inbox without touching the popup engine',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await page.evaluate(()=> (window as any).atlasTest.plugin.openBibleLab('Jean 7:24'));
  await expect(pane.locator('.biblelab-focused-reading')).toBeVisible();
  await pane.getByRole('button',{name:'Garder la référence'}).click();
  await expect(pane.locator('.biblelab-tab[aria-label="Trouvailles"]')).toHaveAttribute('aria-selected','true');
  const captures=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection().captures);
  expect(captures).toHaveLength(1);
  expect(captures[0].label).toBe('Jean 7:24');
});

test('Pasted WOL browser URL remains optional; invalid external URLs are rejected',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Intuition');
  await pane.getByRole('textbox',{name:'Lien WOL précis'})
    .fill('https://wol.jw.org.attacker.example/fr/wol/d/r30/lp-f/1');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  const store=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection());
  expect(store.captures).toHaveLength(0);
  await pane.getByRole('textbox',{name:'Lien WOL précis'}).fill('');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  const saved=await page.evaluate(()=> (window as any).atlasTest.plugin.getResearchCollection());
  expect(saved.captures).toHaveLength(1);
  expect(saved.captures[0].url).toBe('');
});
