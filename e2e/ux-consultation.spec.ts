import { expect, test, type Page } from '@playwright/test';

const openSearch = async (page: Page) => {
  await page
    .getByRole('button', { name: 'Ouvrir la recherche globale' })
    .first()
    .click();
  return page.getByRole('dialog', { name: 'Recherche globale' });
};

test('restaure la période partagée au lieu de revenir à la vue par défaut', async ({
  page
}) => {
  await page.goto('/?view=timeline&from=-1160&to=-840');

  await expect.poll(async () => {
    const url = new URL(page.url());
    return {
      from: Number(url.searchParams.get('from')),
      to: Number(url.searchParams.get('to'))
    };
  }).toEqual({ from: -1160, to: -840 });
});

test('classe une correspondance exacte avant les mentions secondaires', async ({
  page
}) => {
  await page.goto('/');
  const search = await openSearch(page);
  await search.locator('input').fill('Samuel');

  await expect(search.getByRole('option').first()).toContainText(/^Samuel/);
});

test('affiche des onglets de fiche et conserve la navigation avec le bouton retour', async ({
  page
}) => {
  await page.goto('/');
  const search = await openSearch(page);
  await search.locator('input').fill('Samuel');
  await search.getByRole('option').first().click();

  const detail = page.getByTestId('detail-panel');
  await expect(detail.getByRole('tab', { name: 'Présentation' })).toBeVisible();
  await expect(detail.getByRole('tab', { name: 'Relations' })).toBeVisible();
  await expect(detail.getByRole('tab', { name: 'Références' })).toBeVisible();
  await expect(
    page.getByLabel('Légende et filtres de consultation')
  ).toHaveCSS('width', '72px');

  await detail.getByRole('tab', { name: 'Relations' }).click();
  await detail.getByRole('button', { name: /^Rama/ }).click();
  await expect(page).toHaveURL(/place=ramah/);

  await page.goBack();
  await expect(page).toHaveURL(/person=samuel-vie/);
  await expect(
    detail.getByRole('heading', { name: 'Samuel', exact: true }).first()
  ).toBeVisible();
});

test('affiche et cadre un itinéraire sélectionné même hors de la période visible', async ({
  page
}) => {
  await page.goto('/?view=timeline&from=-1160&to=-840');
  const search = await openSearch(page);
  await search.locator('input').fill('A7-A');
  await search.getByRole('option').first().click();

  await expect(page.getByTestId('map-view')).toBeVisible();
  await expect(page.getByText('Itinéraire sélectionné')).toBeVisible();
  await expect.poll(async () =>
    page.locator('.leaflet-overlay-pane path').count()
  ).toBeGreaterThan(0);
});

test('À ce moment-là analyse une année centrale et non toute la largeur visible', async ({
  page
}) => {
  await page.goto('/?view=timeline&from=-1160&to=-840');
  await page.getByRole('button', { name: 'À ce moment-là' }).click();

  const panel = page.getByTestId('at-this-moment-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('header')).toContainText(
    'Année centrale de la frise'
  );
  await expect(panel.locator('header')).toContainText('1000 av. n. è.');
  await expect(panel.locator('header')).not.toContainText('–');
});
