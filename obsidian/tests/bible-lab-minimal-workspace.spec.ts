import { test, expect } from '@playwright/test';

test.beforeEach(async ({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('The first screen is study-first with four clear destinations and no tools crowding the view',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await expect(pane.locator('.biblelab-focus-nav .biblelab-tab')).toHaveCount(4);
  await expect(pane.getByRole('heading',{name:'Que veux-tu approfondir ?'})).toBeVisible();
  await expect(pane.getByRole('searchbox',{name:'Rechercher dans JW Study Desk'})).toBeVisible();
  await expect(pane.getByRole('combobox',{name:'Recherche active'})).toHaveValue('');
  await expect(pane.locator('.biblelab-focus-plan-details')).not.toHaveAttribute('open','');
  await expect(pane.locator('.biblelab-focus-today')).not.toHaveAttribute('open','');
  await expect(pane.locator('.biblelab-quick-capture')).toHaveCount(0);
  await expect(pane.locator('.biblelab-focus-inbox')).toBeVisible();
  await expect(pane.locator('.biblelab-top-actions .biblelab-icon-action')).toHaveCount(3);
  await pane.locator('.biblelab-overflow > summary').click();
  await expect(pane.getByRole('button',{name:'Lire les références'})).toBeVisible();
  await expect(pane.getByRole('button',{name:'Atlas biblique'})).toBeVisible();
  await pane.getByRole('button',{name:'Lire les références'}).click();
  await expect(pane.getByRole('heading',{name:'Lecture'})).toBeVisible();
  await expect(pane.locator('.biblelab-focus-nav .biblelab-tab')).toHaveCount(4);
});

test('The plan opens on demand, then new ideas can be drafted and reopened without losing the sentence',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.getByRole('button',{name:'Nouveau sujet'}).click();
  await expect(pane.locator('.biblelab-focus-plan-details')).toHaveAttribute('open','');
  await pane.getByRole('textbox',{name:'Titre de la recherche'}).fill('Les anciens et l’amitié');
  await pane.getByRole('textbox',{name:'Titre de la recherche'}).press('Tab');
  await expect(pane.getByRole('combobox',{name:'Recherche active'})).toHaveValue(
    await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchDesk().activeId)
  );
  await pane.getByRole('button',{name:'Nouvelle idée'}).first().click();
  await expect(pane.locator('.biblelab-tab[aria-label="Trouvailles"]')).toHaveAttribute('aria-selected','true');
  const idea=pane.locator('.biblelab-idea-card').first();
  await expect(idea).toHaveAttribute('open','');
  await idea.getByRole('textbox',{name:'Phrase principale de l’idée'})
    .fill('Les anciens entretiennent une véritable amitié');
  await idea.getByRole('textbox',{name:'Phrase principale de l’idée'}).press('Tab');
  await pane.locator('.biblelab-tab[aria-label="Étude"]').click();
  await expect(pane.getByRole('button',{name:'Ouvrir l’idée : Les anciens entretiennent une véritable amitié'})).toBeVisible();
  await pane.getByRole('button',{name:'Ouvrir l’idée : Les anciens entretiennent une véritable amitié'}).click();
  await expect(pane.locator('.biblelab-idea-card').first()).toHaveAttribute('open','');
});

test('Manual capture and backup tools are accessible but folded by default',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await expect(pane.locator('.biblelab-manual-capture')).not.toHaveAttribute('open','');
  await expect(pane.getByRole('button',{name:'Garder le texte copié'})).toBeVisible();
  await pane.locator('.biblelab-manual-capture > summary').click();
  await expect(pane.getByRole('textbox',{name:'Nom de la trouvaille'})).toBeVisible();
  await pane.locator('.biblelab-tab[aria-label="Sources"]').click();
  await expect(pane.locator('.biblelab-backup-actions')).not.toHaveAttribute('open','');
  await pane.locator('.biblelab-backup-actions > summary').click();
  await expect(pane.getByRole('button',{name:'Créer une sauvegarde'})).toBeVisible();
});

test('WOL still opens official search but context and extra options are folded',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Recherche WOL"]').click();
  await expect(pane.locator('.biblelab-wol-context')).not.toHaveAttribute('open','');
  await expect(pane.locator('.biblelab-wol-extras')).not.toHaveAttribute('open','');
  await expect(pane.locator('.biblelab-research-mode')).toHaveCount(4);
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amitié');
  await pane.getByRole('button',{name:'Index',exact:true}).click();
  const url=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(new URL(url).searchParams.get('q')).toBe('amitié');
  expect(new URL(url).searchParams.get('fc[]')).toBe('dx');
});
