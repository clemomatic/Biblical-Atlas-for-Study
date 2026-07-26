import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('mobile: carte, couches repliables, recherche et fiche', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Carte', exact: true }).click();
  await expect(page.getByTestId('map-view')).toBeVisible();

  await page.getByRole('button', { name: /Relief naturel|Carte claire/ }).first().click();
  const layers = page.getByRole('region', { name: /Couches de la carte/ });
  await expect(layers).toBeVisible();
  await expect(layers.getByRole('radiogroup', { name: 'Fond de carte' })).toBeVisible();
  await layers.getByRole('radio', { name: /Carte claire/ }).click();
  await expect(layers.getByRole('radio', { name: /Carte claire/ })).toHaveAttribute('aria-checked', 'true');
  await layers.getByRole('button', { name: 'Fermer' }).click();
  await expect(layers).toHaveCount(0);

  await page.getByRole('button', { name: 'Ouvrir la recherche globale' }).last().click();
  const search = page.getByRole('dialog', { name: 'Recherche globale' });
  await search.locator('input').fill('Rome');
  await search.getByRole('option').filter({ hasText: /^Rome/ }).first().click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();
  await expect(page.getByTestId('detail-panel')).toContainText('Rome');
});