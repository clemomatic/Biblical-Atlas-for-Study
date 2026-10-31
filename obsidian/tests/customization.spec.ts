import { test, expect, type Page } from '@playwright/test';

const snapshot = (page: Page) => page.evaluate(() => { const atlas = (window as any).atlasTest.plugin.getSnapshot().atlas; return { people: atlas.dataset.people, places: atlas.dataset.places, events: atlas.dataset.events, routes: atlas.dataset.routes, hidden: [...atlas.hidden] }; });
const open = async (page: Page, key: string) => { await page.evaluate(key => (window as any).atlasTest.plugin.openAtlas(key),key); };
test.beforeEach(async ({page}) => { await page.route('https://**/*',route=>route.abort()); await page.goto('/obsidian/dev/index.html'); await page.waitForFunction(()=>(window as any).atlasTest?.ready); });

test('a corpus fiche edits its text, location and native Markdown without overwriting a concurrent edit', async ({page}) => {
  await open(page,'place:jerusalem');
  await page.getByRole('button',{name:'Modifier',exact:true}).click();
  const dialog = page.getByRole('dialog').last();
  await dialog.getByLabel('Titre',{exact:true}).fill('Jérusalem — mon étude');
  await dialog.getByLabel('Texte de la fiche',{exact:true}).fill('## Mes observations\n\n[[Une idée précieuse]]');
  await dialog.getByRole('button',{name:'Carte et étapes',exact:true}).click();
  await dialog.getByLabel('Latitude',{exact:true}).fill('31.8');
  await dialog.getByLabel('Longitude',{exact:true}).fill('35.3');
  await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.atlas-vault-context p')).toHaveText('Jérusalem — mon étude');
  expect((await snapshot(page)).places.find((p:any)=>p.id==='jerusalem').coordinates).toEqual([31.8,35.3]);
  const path = await page.evaluate(()=>(window as any).atlasTest.plugin.getSnapshot().notes.find((n:any)=>n.edit?.key==='place:jerusalem').path);
  await page.getByRole('button',{name:'Modifier',exact:true}).click();
  await page.getByRole('dialog').last().getByLabel('Titre',{exact:true}).fill('Version ouverte trop tôt');
  await page.evaluate(async path=>{ const t=(window as any).atlasTest; const file=t.app.vault.getAbstractFileByPath(path); await t.app.vault.modify(file,t.file(path)+'\n\nTexte ajouté depuis Obsidian.'); },path);
  await expect.poll(async ()=>(await snapshot(page)).places.find((p:any)=>p.id==='jerusalem').description).toContain('Texte ajouté depuis Obsidian.');
  await page.getByRole('dialog').last().getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('changé depuis');
  expect(await page.evaluate(path=>(window as any).atlasTest.file(path),path)).toContain('Texte ajouté depuis Obsidian.');
  await page.getByRole('dialog').last().getByRole('button',{name:'Annuler',exact:true}).click();
  await page.evaluate(()=>(window as any).atlasTest.restart());
  await expect.poll(async ()=>(await snapshot(page)).places.find((p:any)=>p.id==='jerusalem').name).toBe('Jérusalem — mon étude');
  expect((await snapshot(page)).places.find((p:any)=>p.id==='jerusalem').description).toContain('Texte ajouté depuis Obsidian.');
});

test('routes can be created, reordered, dragged and extended on the map', async ({page}) => {
  await page.getByRole('button',{name:'Gérer toutes les fiches',exact:true}).click();
  await page.getByRole('button',{name:'+ Itinéraire',exact:true}).click();
  let dialog=page.getByRole('dialog').last();
  await dialog.getByLabel('Titre',{exact:true}).fill('Mon trajet de recherche');
  await dialog.getByRole('button',{name:'Carte et étapes',exact:true}).click();
  for (const [index,name,lat,lng] of [[1,'Départ',31.7,35.1],[2,'Arrivée',31.9,35.3]] as const) {
    await dialog.getByRole('button',{name:'Ajouter une étape',exact:true}).click();
    await dialog.getByLabel(`Nom de l’étape ${index}`,{exact:true}).fill(name);
    await dialog.getByLabel(`Latitude de l’étape ${index}`,{exact:true}).fill(String(lat));
    await dialog.getByLabel(`Longitude de l’étape ${index}`,{exact:true}).fill(String(lng));
  }
  await dialog.getByRole('button',{name:'Descendre l’étape 1',exact:true}).click();
  await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await page.getByRole('button',{name:'Fermer la gestion',exact:true}).click();
  const route=(await snapshot(page)).routes.find((r:any)=>r.name==='Mon trajet de recherche');
  expect(route.points.map((p:any)=>p.name)).toEqual(['Arrivée','Départ']);
  await expect(page.locator('.atlas-vault-context p')).toHaveText(route.name);
  await page.getByRole('button',{name:'Modifier la carte',exact:true}).click();
  const marker=page.locator('.atlas-route-edit-handle').first(); await expect(marker).toBeVisible();
  const box=(await marker.boundingBox())!;
  await page.mouse.move(box.x+15,box.y+15); await page.mouse.down(); await page.mouse.move(box.x+45,box.y+35,{steps:8}); await page.mouse.up();
  await expect.poll(async ()=>(await snapshot(page)).routes.find((r:any)=>r.id===route.id).points[0].coordinates).not.toEqual(route.points[0].coordinates);
  const map=page.locator('.leaflet-container'), mapBox=(await map.boundingBox())!;
  await map.click({position:{x:mapBox.width*.65,y:mapBox.height*.6}});
  await expect.poll(async ()=>(await snapshot(page)).routes.find((r:any)=>r.id===route.id).points.length).toBe(3);
  await page.locator('.atlas-route-edit-handle').last().click({button:'right'});
  await expect.poll(async ()=>(await snapshot(page)).routes.find((r:any)=>r.id===route.id).points.length).toBe(2);
  await page.getByRole('button',{name:'Terminer',exact:true}).click();
  await page.evaluate(()=>(window as any).atlasTest.restart());
  expect((await snapshot(page)).routes.find((r:any)=>r.id===route.id).points[0].coordinates).not.toEqual(route.points[0].coordinates);
});

test('hidden corpus records can be restored and the old historical roads are editable', async ({page}) => {
  expect((await snapshot(page)).routes.some((r:any)=>r.mapLayer==='road-network')).toBe(true);
  await page.getByRole('button',{name:'Gérer toutes les fiches',exact:true}).click();
  await page.getByLabel('Rechercher dans l’Atlas à modifier').fill('jerusalem');
  const row=page.locator('.ae-manager-row').filter({has:page.getByText('Jérusalem',{exact:true})});
  await row.getByRole('button',{name:'Masquer',exact:true}).click();
  await expect.poll(async ()=>(await snapshot(page)).hidden).toContain('place:jerusalem');
  expect((await snapshot(page)).places.some((p:any)=>p.id==='jerusalem')).toBe(false);
  await row.getByRole('button',{name:'Réafficher',exact:true}).click();
  await expect.poll(async ()=>(await snapshot(page)).hidden).not.toContain('place:jerusalem');
  await row.getByRole('button',{name:'Restaurer l’original',exact:true}).click();
  await expect(row.getByText('Personnalisée',{exact:false})).toHaveCount(0);
  expect((await snapshot(page)).places.find((p:any)=>p.id==='jerusalem').personalization).toBeUndefined();
  expect(await page.evaluate(()=>(window as any).atlasTest.file('Mes notes/Une idée précieuse.md'))).toContain('Mon texte personnel');
});

test('person dates update the timeline and ages at a precise cursor date', async ({page}) => {
  await page.evaluate(()=>(window as any).atlasTest.plugin.newAtlasEntity('person'));
  const dialog=page.getByRole('dialog').last();
  await dialog.getByLabel('Titre',{exact:true}).fill('Témoin des dates');
  await dialog.getByRole('button',{name:'Données complètes',exact:true}).click();
  const raw=dialog.getByLabel('Données complètes de la fiche',{exact:true});
  const draft=JSON.parse(await raw.inputValue());
  const bound=(year:number,month:number,day:number)=>({yearMin:year,yearMax:year,month,day,precision:'day',certainty:'certain',calendar:'gregorian'});
  draft.lifeSpan={start:bound(-10,6,15),end:bound(10,6,15),displayLabel:'Vie de test'};
  await raw.fill(JSON.stringify(draft)); await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  const person=(await snapshot(page)).people.find((p:any)=>p.name==='Témoin des dates');
  expect((await snapshot(page)).events.some((e:any)=>e.historicalPersonId===person.id && e.startYear===-10)).toBe(true);
  const date = async (year:string,month:string,day:string) => {
    await page.getByRole('button',{name:'Date précise',exact:true}).click();
    await page.getByLabel('Année du repère d’âge').fill(year); await page.getByLabel('Mois du repère d’âge').fill(month); await page.getByLabel('Jour du repère d’âge').fill(day);
    await page.getByRole('button',{name:'Appliquer la date',exact:true}).click();
  };
  await date('1','6','14'); await expect(page.locator('.atlas-age-selected')).toContainText('9 ans');
  await date('1','6','15'); await expect(page.locator('.atlas-age-selected')).toContainText('10 ans');
  if (await page.getByRole('button',{name:'Revenir à la frise globale',exact:true}).isVisible()) await expect(page.getByTestId('focused-person-age').first()).toContainText('10 ans');
  if (await page.getByRole('button',{name:'Revenir à la frise globale',exact:true}).isVisible()) await page.getByRole('button',{name:'Revenir à la frise globale',exact:true}).click();
  else await page.getByRole('button',{name:'Fermer la fiche',exact:true}).first().click();
  await expect(page.getByTestId('biographical-ribbon').filter({has:page.getByTestId('cursor-person-age')}).first()).toBeVisible();
  const slider=page.getByRole('slider',{name:'Curseur de calcul des âges'});
  await slider.focus(); await slider.press('ArrowRight'); await expect(slider).not.toHaveAttribute('aria-valuetext','15 juin 1');
  await page.evaluate(key=>(window as any).atlasTest.plugin.openAtlas(key),`person:${person.id}`);
  await date('40','',''); await expect(page.locator('.atlas-age-selected')).toContainText('Décédé');
  await page.getByRole('button',{name:'Tous les personnages',exact:true}).click();
  await page.getByLabel('Avant et après leur vie',{exact:true}).check();
  await page.getByLabel('Chercher un personnage pour son âge').fill('Témoin des dates');
  await expect(page.locator('.atlas-age-grid')).toContainText('Décédé');
});

test('event changes extend the date domain and duplicated customization files report a conflict', async ({page}) => {
  const event=(await snapshot(page)).events.find((e:any)=>!e.historicalPersonId && e.startYear < 0);
  await open(page,`event:${event.id}`);
  await page.getByRole('button',{name:'Modifier',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Titre',{exact:true}).fill('Mon événement révisé');
  await dialog.getByLabel('Année de début',{exact:true}).fill('-5001');
  await dialog.getByLabel('Année de fin',{exact:true}).fill('-5000');
  await dialog.getByRole('button',{name:'Enregistrer',exact:true}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.atlas-vault-context p')).toHaveText('Mon événement révisé');
  expect((await snapshot(page)).events.find((e:any)=>e.id===event.id).startYear).toBe(-5001);
  const path=await page.evaluate(id=>(window as any).atlasTest.plugin.getSnapshot().notes.find((n:any)=>n.edit?.key===`event:${id}`).path,event.id);
  await page.evaluate(async path=>{const t=(window as any).atlasTest;await t.app.vault.create('Copie de personnalisation.md',t.file(path));},path);
  await expect.poll(()=>page.evaluate(()=>(window as any).atlasTest.plugin.getSnapshot().notes.some((n:any)=>n.warnings.some((warning:string)=>warning.includes('Plusieurs personnalisations'))))).toBe(true);
  expect((await snapshot(page)).events.find((e:any)=>e.id===event.id).text).toBe(event.text);
  await page.evaluate(()=>(window as any).atlasTest.remove('Copie de personnalisation.md'));
  await expect.poll(async ()=>(await snapshot(page)).events.find((e:any)=>e.id===event.id).text).toBe('Mon événement révisé');
  await page.evaluate(()=>(window as any).atlasTest.restart());
  expect((await snapshot(page)).events.find((e:any)=>e.id===event.id).startYear).toBe(-5001);
});
