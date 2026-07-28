import { expect, test } from '@playwright/test';

test('s?lectionne une plage annuelle et pr?sente les limites de ? ? ce moment-l? ?', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('timeline-view')).toBeVisible();
  await page.getByRole('button', { name: '1 an', exact: true }).first().click();

  await expect.poll(async () => {
    const url = new URL(page.url());
    const from = Number(url.searchParams.get('from'));
    const to = Number(url.searchParams.get('to'));
    return Number.isFinite(from) && Number.isFinite(to) && Math.abs(to - from) <= 2;
  }).toBe(true);

  await page.getByRole('button', { name: /ce moment-l./i }).click();
  const panel = page.getByTestId('at-this-moment-panel');
  await expect(panel).toBeVisible();
  for (const title of [
    'Personnes vivantes',
    'Personnes actives',
    /v.nements$/,
    /Pr.sences document.es/,
    'Connexions remarquables',
    'Informations incertaines'
  ]) {
    await expect(panel.getByRole('heading', { name: title })).toBeVisible();
  }
  await expect(panel).toContainText(/donn.es valid.es|Aucune|Localisation inconnue/);
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('la vue de contr?le rend visibles vies, activit?s et contemporains calcul?s', async ({ page }) => {
  await page.goto('/?control=historical-overlaps');
  const dialog = page.getByRole('dialog', { name: 'Chevauchements historiques' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Vie');
  await expect(dialog).toContainText(/Activit./);
  await dialog.getByPlaceholder('Filtrer les personnages').fill('Isaac');
  await expect(dialog.getByRole('heading', { name: 'Isaac' })).toBeVisible();
  await expect(dialog).toContainText(/contemporain.*calcul./);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('timeline-view')).toBeVisible();
});