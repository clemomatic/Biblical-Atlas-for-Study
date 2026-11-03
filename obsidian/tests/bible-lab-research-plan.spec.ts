import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(() => (window as any).atlasTest?.ready);
  await page.evaluate(() => (window as any).atlasTest.plugin.openBibleLab());
});

test('Phase 1: begin with an optional plan, rename and reorder its research branches', async ({ page }) => {
  const pane = page.locator('.biblelab-side');
  const plan = pane.locator('.biblelab-plan-board');
  await expect(plan.getByText('Mon plan de recherche')).toBeVisible();
  await expect(plan.getByText('Recherche libre (sans plan)')).toBeVisible();

  await plan.getByRole('button', { name: 'Créer un plan' }).click();
  const title = plan.getByRole('textbox', { name: 'Titre de la recherche' });
  await title.fill('Collège des anciens et amitié');
  await title.press('Tab');
  await plan.getByRole('button', { name: 'Ajouter une piste' }).click();
  const first=plan.getByRole('textbox', { name: 'Titre de la piste 1' });
  await first.fill('Anciens');
  await first.press('Tab');
  await plan.getByRole('button', { name: 'Ajouter une piste' }).click();
  const second=plan.getByRole('textbox', { name: 'Titre de la piste 2' });
  await second.fill('Amitié');
  await second.press('Tab');
  await expect(plan.locator('.biblelab-plan-branch input')).toHaveCount(2);

  await plan.locator('.biblelab-plan-branch').nth(1)
    .getByRole('button',{name:'Monter la piste'}).click();
  await expect(plan.locator('.biblelab-plan-branch input').first()).toHaveValue('Amitié');
  await page.waitForFunction(()=>
    (window as any).__savedSettings?.bibleLabResearch?.plans?.[0]?.branches?.[0]?.title === 'Amitié');

  // A branch can launch the official WOL search without losing the outline.
  await plan.locator('.biblelab-plan-branch').first()
    .getByRole('button',{name:'Rechercher cette piste dans WOL'}).click();
  await expect(pane.locator('.biblelab-tab[aria-label="WOL"]')).toHaveAttribute('aria-selected','true');
  const url=await page.evaluate(()=>(window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer')[0].view.getState().url);
  expect(new URL(url).searchParams.get('q')).toBe('Amitié');
  await expect(pane.locator('.biblelab-plan-compact-summary')).toContainText('Collège des anciens et amitié');
});

test('Phase 1: free WOL exploration still works without creating an outline', async ({ page }) => {
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
  await expect(pane.locator('.biblelab-plan-compact-summary')).toContainText('Recherche libre');
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('la patience de Jéhovah');
  await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
  const data=await page.evaluate(()=>({
    desks:(window as any).atlasTest.plugin.getResearchDesk().plans.length,
    tabs:(window as any).atlasTest.app.workspace.getLeavesOfType('webviewer')
      .map((leaf:any)=>leaf.view.getState().url)
  }));
  expect(data.desks).toBe(0);
  expect(data.tabs).toHaveLength(1);
  expect(new URL(data.tabs[0]).searchParams.get('q')).toBe('la patience de Jéhovah');
});

test('Phase 1: the plan can be put aside without deleting it', async ({ page }) => {
  const pane=page.locator('.biblelab-side');
  const plan=pane.locator('.biblelab-plan-board');
  await plan.getByRole('button',{name:'Créer un plan'}).click();
  await plan.getByRole('textbox',{name:'Titre de la recherche'}).fill('Plan provisoire');
  await plan.getByRole('textbox',{name:'Titre de la recherche'}).press('Tab');
  await plan.getByRole('combobox',{name:'Choisir une recherche'}).selectOption('');
  await expect(plan.getByText('Recherche libre (sans plan)')).toBeVisible();
  await expect(plan.getByRole('combobox',{name:'Choisir une recherche'}).locator('option')).toHaveCount(2);
  const desk=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchDesk());
  expect(desk.plans).toHaveLength(1);
  expect(desk.activeId).toBeNull();
});
