import { expect, test } from '@playwright/test';

test('charge la vue globale définie par le référentiel', async ({ page }) => {
  await page.goto('/');

  const timeline = page.getByTestId('timeline-view');
  await expect(timeline).toBeVisible();
  await expect(timeline).toContainText('Niveau 0 · Vue globale');
  await expect(timeline).toContainText('39 éléments du référentiel actifs');
  await expect(timeline).toContainText('100–1870');
  await expect(timeline).toContainText('ordre connu, dates et durées non révélées');
  await expect(page.getByLabel('1. Début de la grande tribulation')).toBeAttached();
  await expect(page.getByLabel(/4\. Armaguédon/)).toBeAttached();
});

test('remplace les groupes par leurs membres et garde les livres repliés', async ({
  page
}) => {
  await page.goto('/');

  const zoom = page.getByLabel('Niveau de détail de la frise');
  await zoom.fill('1');
  await expect(page.getByTestId('timeline-view')).toContainText(
    'Niveau 1 · Grandes périodes'
  );

  const patriarchs = page.getByRole('button', {
    name: /Patriarches et familles/
  });
  await expect(patriarchs).toHaveCount(1);
  await patriarchs.scrollIntoViewIfNeeded();
  await patriarchs.click();

  await expect(page.getByTestId('timeline-view')).toContainText(
    'Niveau 2 · Étude'
  );
  await expect(
    page.getByRole('button', { name: /Abraham/ }).first()
  ).toBeAttached();

  await page.getByRole('button', { name: 'Affichage' }).click();
  const books = page.getByLabel('Livres bibliques');
  await expect(books).not.toBeChecked();
  await books.check();
  await expect(
    page.getByRole('button', { name: /Pentateuque/ })
  ).toHaveCount(1);
});

test('ouvre une fiche depuis un élément du nouveau référentiel', async ({ page }) => {
  await page.goto('/?event=atlas-0189');

  await expect(page.getByTestId('selected-event-marker')).toBeVisible();
  const details = page.getByTestId('detail-panel');
  await expect(details).toBeVisible();
  await expect(details).toContainText('David');
  await expect(details).toContainText(/vers 1107 av\. n\. è\.|1107 av\. n\. è\./);
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
