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

test('mobile: focalise Samuel avec ses contemporains et événements', async ({
  page
}) => {
  await page.goto('/?view=timeline&person=samuel-vie');

  const focus = page.getByTestId('focused-timeline');
  await expect(focus).toBeVisible();
  await expect(
    focus.getByRole('heading', { name: 'Samuel', exact: true })
  ).toBeVisible();
  await expect(focus).toContainText('Vie et contemporains');
  await expect(focus.getByRole('button', { name: 'Vue entière' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(focus.getByRole('button', { name: '25 ans' })).toBeEnabled();
  await expect(focus.getByRole('button', { name: '10 ans' })).toBeEnabled();
  await expect(
    focus.getByRole('button', { name: 'Ouvrir la fiche de Samuel' })
  ).toBeVisible();
  await expect(
    focus.getByRole('group', {
      name: /Samuel, ses contemporains et les événements correspondants/
    })
  ).toBeVisible();
  await expect(page.getByTestId('detail-panel')).toBeHidden();

  await focus.getByRole('button', { name: '25 ans' }).click();
  await expect(focus.getByRole('button', { name: '25 ans' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await focus.getByRole('button', { name: 'Ouvrir la fiche de Samuel' }).click();
  await expect(page.getByTestId('detail-panel')).toBeVisible();
  await expect(page.getByTestId('detail-panel')).toContainText('Samuel');
});

test('mobile: garde la frise de Noé cohérente avec sa durée de vie', async ({
  page
}) => {
  await page.goto('/?view=timeline&person=event-noe-qdkz7y');

  const focus = page.getByTestId('focused-timeline');
  await expect(focus).toBeVisible();
  await expect(
    focus.getByRole('heading', { name: 'Noé', exact: true })
  ).toBeVisible();
  await expect(focus).toContainText('2970 av. n. è. → 2020 av. n. è.');

  await expect(
    focus.getByRole('heading', { name: 'Déluge', exact: true })
  ).toBeVisible();
  await expect(focus).toContainText(
    '17e jour du 2e mois, 2370 av. n. è. → 27e jour du 2e mois, 2369 av. n. è.'
  );
  await expect(focus).toContainText('Noé : Entre 600 et 601 ans');
  await expect(
    focus.getByRole('button', { name: /Naissance d’Abraham/ })
  ).toHaveCount(0);
  await expect(
    focus.getByRole('button', { name: /tour de Babel/i })
  ).toHaveCount(1);
});

test('mobile: distingue la période racontée de la rédaction de 1 Samuel', async ({
  page
}) => {
  await page.goto('/?view=timeline&event=event-1-samuel-186ww0d');

  const focus = page.getByTestId('focused-timeline');
  await expect(focus).toBeVisible();
  await expect(
    focus.getByRole('heading', { name: '1 Samuel', exact: true, level: 2 })
  ).toBeVisible();
  await expect(focus).toContainText('Période couverte par le récit');
  await expect(focus).toContainText('Rédaction ou compilation');
  await expect(focus).toContainText(/1078 av\. n\. è\./);
});

test('mobile: place un événement dans une fenêtre de contexte', async ({ page }) => {
  await page.goto('/?view=timeline&event=samuel-onction-saul');

  const focus = page.getByTestId('focused-timeline');
  await expect(focus).toBeVisible();
  await expect(focus).toContainText('Événement et contexte');
  await expect(focus).toContainText('Fenêtre autour de l’événement');
  await expect(focus).toContainText('Samuel oint Saül comme roi');
});
