import { expect, test } from '@playwright/test';

test('sépare les périodes des événements ponctuels dans des lignes sémantiques', async ({
  page
}) => {
  await page.goto('/');
  await expect(page.getByTestId('timeline-view')).toBeVisible();

  const periodLanes = page.locator('[data-timeline-kind="period"]');
  const pointLanes = page.locator('[data-timeline-kind="point"]');
  await expect(periodLanes.first()).toBeVisible();
  await expect(pointLanes.first()).toBeVisible();
  expect(await periodLanes.count()).toBeGreaterThan(1);
  expect(await pointLanes.count()).toBeGreaterThan(1);
  await expect(periodLanes.first()).toContainText('périodes');
  await expect(pointLanes.first()).toContainText('ponctuels');
});

test('présente la nouvelle organisation dans la légende de consultation', async ({
  page
}) => {
  await page.goto('/');
  const sidebar = page.getByLabel('Légende et filtres de consultation');
  await expect(sidebar).toContainText('Organisation de la frise');
  await expect(sidebar).toContainText('Périodes et contextes');
  await expect(sidebar).toContainText('Événements ponctuels');
  await expect(sidebar).toContainText('Filtres de contenu');
});

test('préserve les bornes visuelles des longues périodes sélectionnées', async ({
  page
}) => {
  await page.goto('/?event=event-adam-2peny4');

  const adam = page.getByRole('button', {
    name: /Adam, 4026 av\. n\. è\. à 3096 av\. n\. è\./
  });
  await expect(adam).toBeVisible();
  await expect(adam).toHaveCSS('transform', 'none');
});

test('réserve le zoom de la molette à la touche Ctrl', async ({ page }) => {
  await page.goto('/');

  const scroller = page.getByTestId('timeline-scroll-container');
  const zoom = page.getByLabel('Niveau de zoom de la frise');
  const initialZoom = await zoom.inputValue();

  await scroller.dispatchEvent('wheel', {
    deltaY: -120,
    deltaX: 0,
    ctrlKey: false
  });
  await expect(zoom).toHaveValue(initialZoom);

  await scroller.dispatchEvent('wheel', {
    deltaY: -120,
    deltaX: 0,
    ctrlKey: true
  });
  await expect(zoom).not.toHaveValue(initialZoom);
});

test.describe('frise lisible sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('conserve les lignes distinctes et les contrôles tactiles', async ({
    page
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('timeline-view')).toBeVisible();
    await expect(page.locator('[data-timeline-kind="point"]').first()).toBeVisible();
    await expect(page.locator('[data-timeline-kind="period"]').first()).toBeVisible();
  });
});
