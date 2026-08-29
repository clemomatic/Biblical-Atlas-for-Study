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

test('regroupe les vies et fonctions dans des bandes lisibles', async ({
  page
}) => {
  await page.goto('/');

  const personLane = page.locator('[data-biography-lane="people"]');
  await expect(personLane).toHaveCount(1);
  await expect(personLane).toBeVisible();
  await expect(personLane).toContainText('Personnage');
  await expect(
    personLane.locator('[data-person-subcategory="united-monarchy"]')
  ).not.toHaveCount(0);
  await expect(
    personLane.locator('[data-person-subcategory="judah-kings"]')
  ).not.toHaveCount(0);
  await expect(
    personLane.locator('[data-person-subcategory="israel-kings"]')
  ).not.toHaveCount(0);
  await expect(
    personLane.locator('[data-person-subcategory="prophets"]')
  ).not.toHaveCount(0);

  const davidLabel = page
    .getByTestId('biographical-label')
    .filter({ hasText: /^David$/ });
  await expect(davidLabel).toHaveCount(1);
  await expect(davidLabel).toBeVisible();
  await expect(
    page.getByRole('button', { name: /David - Israel \(12 Tribus\)/ })
  ).toHaveCount(0);

  await expect(
    personLane
      .locator('[data-person-subcategory="israel-kings"]')
      .getByTestId('biographical-label')
      .filter({ hasText: /^Omri$/ })
  ).toHaveCount(1);
  await expect(
    personLane.getByTestId('biographical-label').filter({
      hasText: /^Joachaz et Joas$/
    })
  ).toHaveCount(0);

  const scroller = page.getByTestId('timeline-scroll-container');
  const labelBox = await davidLabel.boundingBox();
  const scrollerBox = await scroller.boundingBox();
  expect(labelBox).not.toBeNull();
  expect(scrollerBox).not.toBeNull();
  await scroller.evaluate(
    (element, delta) => {
      element.scrollLeft += delta;
      element.dispatchEvent(new Event('scroll'));
    },
    Math.max(0, (labelBox?.x ?? 0) - (scrollerBox?.x ?? 0) + 20)
  );
  await expect(davidLabel).toBeVisible();
  const movedLabelBox = await davidLabel.boundingBox();
  expect((movedLabelBox?.x ?? 0) + (movedLabelBox?.width ?? 0)).toBeGreaterThan(
    scrollerBox?.x ?? 0
  );

  const sidebar = page.getByLabel('Légende et filtres de consultation');
  await expect(sidebar).toContainText('Rois des dix tribus');
  await expect(page.getByTestId('timeline-view')).toContainText(
    'Lecture d’un ruban'
  );

  const contextDock = page.getByTestId('timeline-context-dock');
  await expect(contextDock).toBeVisible();
  await expect(
    contextDock.locator('[data-pinned-timeline-lane="period-reigns"]')
  ).toBeVisible();
  await expect(
    contextDock.locator('[data-pinned-timeline-lane="period-covenants"]')
  ).toBeVisible();
  const dockBefore = await contextDock.boundingBox();
  await scroller.evaluate(element => {
    element.scrollTop += 320;
    element.dispatchEvent(new Event('scroll'));
  });
  const dockAfter = await contextDock.boundingBox();
  expect(dockBefore).not.toBeNull();
  expect(dockAfter).not.toBeNull();
  expect(Math.abs((dockAfter?.y ?? 0) - (dockBefore?.y ?? 0))).toBeLessThan(2);
});

test('rétablit les repères relatifs de Samuel dans une seule fiche', async ({ page }) => {
  await page.goto('/?person=samuel-vie');
  const detail = page.getByTestId('detail-panel');
  await expect(detail).toBeVisible();
  await expect(detail.getByTestId('person-chronology-summary')).toBeVisible();
  await expect(detail).toContainText('Service auprès du tabernacle');
  await expect(detail).toContainText('Juge d’Israël');
  await expect(detail).toContainText('Circuit judiciaire annuel');
  await expect(detail).toContainText('Maison, autel et activité à Rama');
  await expect(detail).toContainText('repère relatif');

  await expect(
    page.getByTestId('biographical-label').filter({ hasText: /^Samuel$/ })
  ).toHaveCount(1);
});

test('distingue la vie ouverte de Saül de son règne', async ({ page }) => {
  await page.goto('/?person=atlas-0087');
  const detail = page.getByTestId('detail-panel');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('Né avant vers 1138 av. n. è.');
  await expect(detail).toContainText('Règne de Saül');
  await expect(detail).toContainText('Au moins 21 ans');
  await expect(detail).toContainText('Au moins 60 ans');
  await expect(detail).toContainText(/permet des âges minimaux/i);

  const saulRibbon = page
    .getByTestId('biographical-ribbon')
    .filter({ has: page.getByTestId('biographical-label').filter({ hasText: /^Saül$/ }) });
  await expect(saulRibbon).toHaveCount(1);
  await expect(saulRibbon).toHaveAttribute('aria-label', /commencé avant la limite affichée/);
});

test.describe('interaction tactile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('sur la frise globale, un premier appui ouvre l’aperçu, le suivant la frise focalisée', async ({
    page
  }) => {
    await page.goto('/?view=timeline&from=1&to=20');
    await expect(page.getByTestId('timeline-view')).toBeVisible();

    const event = page.getByRole('button', { name: EVENT_NAME }).first();
    await expect(event).toBeVisible();
    await event.tap();
    await expect(page.getByTestId('event-context-preview')).toBeVisible();
    await expect(page.getByTestId('detail-panel')).toHaveCount(0);

    await event.tap();
    await expect(page.getByTestId('focused-timeline')).toBeVisible();
    await expect(page.getByTestId('detail-panel')).toBeHidden();
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
