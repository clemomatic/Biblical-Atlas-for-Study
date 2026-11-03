import { test, expect } from '@playwright/test';

// Phase 0: this file is an independent regression contract.
// Do not change the reference scanner, reader, popover or WOL page rendering to satisfy it.
const ARTICLE = 'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const DEEP_LINK = ARTICLE + '#h=3';

test.beforeEach(async ({ page }) => {
  // Use deterministic local fixtures instead of making requests to WOL.
  await page.route('https://**/*', route => route.abort());
  await page.route(ARTICLE, route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<html><main class="bodyTxt"><h1>Une étude intéressante</h1>' +
      '<p>Extrait repère dans le document.</p></main></html>',
  }));
  await page.route('**/json/html/43007024', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ranges: {
        '43007024': {
          citation: 'Jean 7:24',
          html: '<p>Jugez avec justice et non selon l’apparence.</p>',
          footnotes: [],
          crossReferences: [],
          commentaries: [],
        },
      },
    }),
  }));
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(() => (window as any).atlasTest?.ready);
  await page.evaluate(() => (window as any).atlasTest.plugin.openBibleLab());
});

test('Recherche WOL et aperçus restent indépendants; les notes et liens profonds sont préservés', async ({ page }) => {
  await page.evaluate(url => {
    const note = document.createElement('p');
    note.id = 'regression-note';
    note.innerHTML =
      'Les anciens doivent cultiver l’amitié (Jean 7:24 ; ' +
      '<a href="' + url + '">Article à approfondir</a>).';
    document.body.appendChild(note);
    (window as any).atlasTest.plugin.markdownPostProcessor(note);
  }, DEEP_LINK);

  const note = page.locator('#regression-note');
  const initialText = await note.textContent();
  await expect(note.locator('a.biblelab-autolink')).toHaveCount(1);

  // Existing automatic reference reader still opens in a popup.
  await note.getByText('Jean 7:24').click();
  let popup = page.getByRole('dialog', { name: 'Aperçu biblique : Jean 7:24' });
  await expect(popup.getByText('Jugez avec justice et non selon l’apparence.')).toBeVisible();
  await popup.getByRole('button', { name: 'Fermer' }).click();

  // The new browser-backed search must not touch the existing note or popup.
  const sidebar = page.locator('.biblelab-side');
  await sidebar.locator('.biblelab-tab[aria-label="WOL"]').click();
  await sidebar.getByPlaceholder('Sujet, publication ou verset…').fill('amitié entre anciens');
  await sidebar.getByRole('button', { name: 'Rechercher dans WOL', exact: true }).first().click();
  await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);

  await note.locator('a[href*="2024663"]').click();
  popup = page.getByRole('dialog', { name: 'Aperçu biblique : Article à approfondir' });
  await expect(popup.getByText('Extrait repère dans le document.')).toBeVisible();
  await popup.getByRole('button', { name: 'Nouvel onglet' }).click();

  const urls = await page.evaluate(() => (window as any).atlasTest.app.workspace
    .getLeavesOfType('webviewer').map((leaf: any) => leaf.view.getState().url));
  expect(urls).toHaveLength(2);
  expect(urls).toContain(DEEP_LINK);
  expect(await note.textContent()).toBe(initialText);
});

test('Recherche WOL ne désactive pas les références en aperçu direct dans CodeMirror', async ({ page }) => {
  await page.evaluate(() => (window as any).atlasTest.mountInlineEditor(
    'Les anciens cultivent l’amitié (Jean 7:24).'
  ));
  const editor = page.locator('#test-inline-editor');
  await expect(editor.locator('.biblelab-inline-editor-ref')).toHaveCount(1);

  const sidebar = page.locator('.biblelab-side');
  await sidebar.locator('.biblelab-tab[aria-label="WOL"]').click();
  await sidebar.getByPlaceholder('Sujet, publication ou verset…').fill('amitié');
  await sidebar.getByRole('button', { name: 'Rechercher dans WOL', exact: true }).first().click();

  await editor.locator('.biblelab-inline-editor-ref').click();
  const popup = page.getByRole('dialog', { name: 'Aperçu biblique : Jean 7:24' });
  await expect(popup.getByText('Jugez avec justice et non selon l’apparence.')).toBeVisible();
  expect(await page.evaluate(() => (window as any).atlasTest.editorView.state.doc.toString()))
    .toBe('Les anciens cultivent l’amitié (Jean 7:24).');
});
