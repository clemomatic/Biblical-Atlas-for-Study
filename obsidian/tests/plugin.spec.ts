import { test, expect, type Page } from '@playwright/test';

const openEntity = async (page: Page, key: string, title: string) => {
  await page.evaluate(key => (window as any).atlasTest.plugin.protocol({ entity: key }), key);
  await expect(page.locator('.atlas-vault-context p')).toHaveText(title);
};
const files = (page: Page) => page.evaluate(() => (window as any).atlasTest.files() as Array<{ path: string; content: string }>);

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/obsidian/dev/index.html');
  await expect(page.locator('.atlas-plugin-shell')).toBeVisible();
  await page.waitForFunction(() => (window as any).atlasTest?.ready);
});

test('compiled plugin isolates its styles, preserves the host URL and works without tile requests', async ({ page }, testInfo) => {
  const errors: string[] = [], remote: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().startsWith('https://')) remote.push(request.url()); });
  const url = page.url();
  await openEntity(page, 'place:jerusalem', 'Jérusalem');
  await expect(page.getByText('Carte hors connexion', { exact: true })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  expect(page.url()).toBe(url);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('visible');
  expect(await page.locator('#test-header').evaluate(element => getComputedStyle(element).fontSize)).toBe('11px');
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value: string) => { (window as any).copiedAtlasLink = value; } } }); });
  await page.getByRole('button', { name: 'Copier le lien de cette vue', exact: true }).click();
  const copied = await page.evaluate(() => (window as any).copiedAtlasLink);
  expect(new URL(copied).searchParams.get('entity')).toBe('place:jerusalem');
  expect(copied).toMatch(/^obsidian:\/\/atlas-biblique/);
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await expect(page.getByRole('heading', { name: 'Mon carnet d’étude' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('atlas-notebook.png'), fullPage: true });
});

test('study notes are reused and linking an existing note preserves its body and unrelated properties', async ({ page }) => {
  await openEntity(page, 'place:jerusalem', 'Jérusalem');
  await page.getByRole('button', { name: 'Note d’étude', exact: true }).click();
  await expect.poll(async () => (await files(page)).filter(file => file.content.includes('atlas_origin: "corpus-snapshot"')).length).toBe(1);
  await page.getByRole('button', { name: 'Note d’étude', exact: true }).click();
  expect((await files(page)).filter(file => file.content.includes('atlas_origin: "corpus-snapshot"')).length).toBe(1);
  const before = await page.evaluate(() => (window as any).atlasTest.file('Mes notes/Une idée précieuse.md'));
  await page.getByRole('button', { name: 'Relier', exact: true }).click();
  await page.getByRole('button', { name: /Une idée précieuse — Mes notes/ }).click();
  const after = await page.evaluate(() => (window as any).atlasTest.file('Mes notes/Une idée précieuse.md'));
  expect(after.slice(after.indexOf('Mon texte'))).toBe(before.slice(before.indexOf('Mon texte')));
  expect(after).toContain('priorite: 3'); expect(after).toContain('personnel'); expect(after).toContain('place:jerusalem');
  await page.evaluate(() => (window as any).atlasTest.rename('Mes notes/Une idée précieuse.md', 'Mes notes/Note renommée.md'));
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await expect(page.getByRole('button', { name: 'Note renommée' })).toBeVisible();
  await page.getByRole('button', { name: 'Note renommée' }).click();
  expect(await page.evaluate(() => (window as any).atlasTest.app.workspace.lastOpened)).toBe('Mes notes/Note renommée.md');
});

test('personal events react to metadata edits, keep their IDs on rename and reject invalid dates', async ({ page }) => {
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await page.getByRole('button', { name: 'Nouvelle recherche', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre', { exact: true }).fill('Ma piste chronologique');
  await dialog.getByLabel('Type de fiche').selectOption('event');
  await dialog.getByLabel('Année de début', { exact: true }).fill('-1');
  await dialog.getByLabel('Année de fin', { exact: true }).fill('1');
  await dialog.getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(dialog).not.toBeVisible();
  const note = await page.evaluate(() => (window as any).atlasTest.plugin.getSnapshot().notes.find((note: any) => note.kind === 'event'));
  const key = `event:vault-${note.uid}`;
  await page.getByRole('button', { name: 'Fermer le carnet' }).click();
  await openEntity(page, key, 'Ma piste chronologique');
  await page.evaluate(({ path }) => (window as any).atlasTest.metadata(path, { atlas_start_year: -2 }), note);
  await expect.poll(() => page.evaluate(() => (window as any).atlasTest.plugin.getSnapshot().notes.find((note: any) => note.kind === 'event').startYear)).toBe(-2);
  await page.evaluate(({ path }) => (window as any).atlasTest.rename(path, 'Atlas biblique/Recherches/Piste renommée.md'), note);
  expect(await page.evaluate(() => (window as any).atlasTest.app.workspace.getLeavesOfType('atlas-biblique')[0].view.getState().eventId)).toBe(`vault-${note.uid}`);
  await page.evaluate(() => (window as any).atlasTest.metadata('Atlas biblique/Recherches/Piste renommée.md', { atlas_start_year: 0 }));
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await expect(page.getByText('La frise attend une année non nulle et une fin postérieure ou égale au début.')).toBeVisible();
  await page.evaluate(() => (window as any).atlasTest.remove('Atlas biblique/Recherches/Piste renommée.md'));
  expect(await page.evaluate(() => (window as any).atlasTest.plugin.getSnapshot().notes.length)).toBe(0);
});

test('a personal place appears on the map and duplicate IDs produce a visible explanation', async ({ page }) => {
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await page.getByRole('button', { name: 'Nouvelle recherche', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titre', { exact: true }).fill('Mon repère personnel');
  await dialog.getByLabel('Type de fiche').selectOption('place');
  await dialog.getByLabel('Latitude', { exact: true }).fill('31,7');
  await dialog.getByLabel('Longitude', { exact: true }).fill('35.2');
  await dialog.getByRole('button', { name: 'Créer la fiche' }).click();
  await expect(dialog).not.toBeVisible();
  const note = await page.evaluate(() => (window as any).atlasTest.plugin.getSnapshot().notes.find((note: any) => note.kind === 'place'));
  await page.getByRole('button', { name: 'Fermer le carnet' }).click();
  await openEntity(page, `place:vault-${note.uid}`, 'Mon repère personnel');
  await expect(page.getByText('Carte hors connexion', { exact: true })).toBeVisible();
  await page.evaluate(async ({ path }) => { const t = (window as any).atlasTest; await t.app.vault.create('Copie.md', t.file(path)); }, note);
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await expect(page.getByText('Identifiant personnel en double : attribue un atlas_uid différent à chaque fiche.').first()).toBeVisible();
});

test('an investigation creates an editable Canvas with real files and preserves notes on plugin unload', async ({ page }) => {
  await openEntity(page, 'place:jerusalem', 'Jérusalem');
  await page.getByRole('button', { name: 'Retenir', exact: true }).click();
  await openEntity(page, 'place:ur', 'Ur en Chaldée');
  await page.getByRole('button', { name: 'Retenir', exact: true }).click();
  await page.getByRole('button', { name: 'Enquête · 2', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ma question', { exact: true }).fill('Qu’est-ce que ces lieux m’aident à comprendre ?');
  await dialog.getByRole('button', { name: 'Créer le tableau' }).click();
  await expect(dialog).not.toBeVisible();
  const created = await files(page), canvasFile = created.find(file => file.path.endsWith('.canvas'))!;
  expect(canvasFile).toBeTruthy();
  const canvas = JSON.parse(canvasFile.content);
  const fileNodes = canvas.nodes.filter((node: any) => node.type === 'file');
  expect(fileNodes).toHaveLength(3);
  for (const node of fileNodes) expect(created.some(file => file.path === node.file)).toBe(true);
  expect(created.filter(file => file.path.includes('/Fiches/'))).toHaveLength(2);
  expect(created.find(file => file.path.includes('/Recherches/'))?.content).toContain('Qu’est-ce que ces lieux m’aident à comprendre ?');
  expect(new Set(canvas.nodes.map((node: any) => node.id)).size).toBe(canvas.nodes.length);
  for (const edge of canvas.edges) expect(canvas.nodes.some((node: any) => node.id === edge.fromNode) && canvas.nodes.some((node: any) => node.id === edge.toNode)).toBe(true);
  await page.evaluate(() => (window as any).atlasTest.plugin.unload());
  await expect(page.locator('.atlas-plugin-shell')).toHaveCount(0);
  expect(await files(page)).toEqual(created);
  await page.evaluate(() => (window as any).atlasTest.restart());
  await expect(page.locator('.atlas-plugin-shell')).toBeVisible();
  expect(await files(page)).toEqual(created);
  await expect.poll(() => page.evaluate(() => (window as any).atlasTest.plugin.getSnapshot().notes.length)).toBe(3);
});

test('a narrow desktop pane uses mobile navigation and returns from notebook links', async ({ page }, testInfo) => {
  await page.evaluate(() => { document.getElementById('surface')!.style.width = 'min(520px, 100vw)'; });
  await expect(page.locator('.atlas-plugin-workspace nav').getByRole('button', { name: 'Ouvrir la recherche globale', exact: true })).toBeVisible();
  await openEntity(page, 'place:jerusalem', 'Jérusalem');
  await page.getByRole('button', { name: 'Note d’étude', exact: true }).click();
  await page.getByRole('button', { name: /Mon carnet/ }).click();
  await page.locator('.atlas-note-links').getByRole('button', { name: 'Jérusalem', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mon carnet d’étude' })).not.toBeVisible();
  await expect(page.locator('.atlas-vault-context p')).toHaveText('Jérusalem');
  await page.evaluate(() => document.body.classList.add('theme-dark'));
  expect(await page.locator('.atlas-notebook').count()).toBe(0);
  expect(await page.locator('.atlas-vault-toolbar').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(32, 33, 39)');
  await page.screenshot({ path: testInfo.outputPath('atlas-narrow-pane.png'), fullPage: true });
});
