import { expect, test, type Page } from '@playwright/test';

const openSearch = async (page: Page) => {
  await page.getByRole('button', { name: 'Ouvrir la recherche globale' }).first().click();
  return page.getByRole('dialog', { name: 'Recherche globale' });
};

test('recherche une personne, consulte sa m?thode et navigue personne ? lieu ? ?v?nement', async ({ page }) => {
  await page.goto('/');
  const search = await openSearch(page);
  await search.locator('input').fill('Isaac');
  await search.getByRole('option').filter({ hasText: /^Isaac/ }).first().click();

  const detail = page.getByTestId('detail-panel');
  await expect(detail).toContainText('Isaac');
  await detail.getByText(/Sources et m.thode/).click();
  await expect(detail.getByTestId('sources-and-method')).toContainText(/Directement attest.|Calcul./);
  const sourceLink = detail.getByTestId('sources-and-method').locator('a[href]').first();
  await expect(sourceLink).toHaveAttribute('href', /^https:\/\//);

  await detail.getByRole('button', { name: /H.bron/ }).click();
  await expect(page.getByTestId('map-view')).toBeVisible();
  await expect(detail).toContainText(/H.bron/);

  await detail.getByRole('button', { name: /Alliance avec Abraham/ }).click();
  await expect(page.getByTestId('timeline-view')).toBeVisible();
  await expect(detail).toContainText('Alliance avec Abraham');
  await expect(page).toHaveURL(/view=timeline/);
});

test('la recherche au clavier s?lectionne le r?sultat actif et ?chap ferme la fiche', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  const search = page.getByRole('dialog', { name: 'Recherche globale' });
  await search.locator('input').fill('Rome');
  await expect(search.getByRole('option').filter({ hasText: /^Rome/ }).first()).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('detail-panel')).toContainText('Rome');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('detail-panel')).toHaveCount(0);
});