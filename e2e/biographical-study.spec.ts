import { expect, test } from '@playwright/test';

const EVENT_ID = 'event-a7-a-jesus-douze-ans-temple';
const EVENT_NAME = /À douze ans, Jésus échange avec les enseignants au Temple/;

test('affiche le ruban, le repère et l’aperçu contextuel au clavier', async ({
  page
}) => {
  await page.goto(`/?event=${EVENT_ID}`);
  await expect(page.getByTestId('timeline-view')).toBeVisible();
  await expect(page.getByTestId('selected-event-marker')).toBeVisible();

  const event = page.getByRole('button', { name: EVENT_NAME }).first();
  await expect(event).toBeVisible();
  await event.focus();

  const preview = page.getByTestId('event-context-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Âge');
  await expect(preview).toContainText(/Temple|Jérusalem/);
  await expect(page.getByTestId('biographical-ribbon').first()).toBeVisible();

  await page.getByRole('button', { name: 'Affichage' }).click();
  await expect(
    page.getByRole('region', { name: 'Légende des rubans biographiques' })
  ).toContainText(/Règne|Prophétie|Ministère/);

  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
});

test.describe('interaction tactile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('un premier appui ouvre l’aperçu, le suivant les détails', async ({
    page
  }) => {
    await page.goto(`/?event=${EVENT_ID}`);
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await page.keyboard.press('Escape');

    const event = page.getByRole('button', { name: EVENT_NAME }).first();
    await expect(event).toBeVisible();
    await event.tap();
    await expect(page.getByTestId('event-context-preview')).toBeVisible();
    await expect(page.getByTestId('detail-panel')).toHaveCount(0);

    await event.tap();
    await expect(page.getByTestId('detail-panel')).toBeVisible();
  });
});

test('l’éditeur local reste un sas staging non relu', async ({ page }) => {
  await page.goto('/edition');
  const editor = page.getByTestId('atlas-local-editor');
  await expect(editor).toBeVisible();
  await expect(editor).toContainText('Staging · jamais publié directement');

  await editor.getByLabel('Nom', { exact: true }).fill('Personne fictive E2E');
  await editor
    .getByLabel('Début, première année possible')
    .fill('0');
  await editor.getByLabel('Note d’extraction').fill(
    'Fixture E2E sans donnée historique réelle.'
  );
  await editor
    .getByRole('button', { name: 'Ajouter aux propositions à vérifier' })
    .click();
  await editor.getByRole('button', { name: 'Valider les données' }).click();
  await expect(editor).toContainText(/différente de zéro/i);

  const health = await page.request.get('/__atlas-editor/staging');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ enabled: true });
});
