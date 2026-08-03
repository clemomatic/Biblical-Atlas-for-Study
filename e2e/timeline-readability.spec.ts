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
