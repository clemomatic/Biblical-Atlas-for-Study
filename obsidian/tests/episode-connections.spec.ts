import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('un épisode personnel sans date relie une personne, un lieu et sa référence',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.command('create-personal-study-episode'));
  const create=page.getByRole('dialog').last();
  await expect(create.getByRole('heading',{name:'Nouvel épisode d’étude'})).toBeVisible();
  await create.getByRole('textbox',{name:'Titre de l’épisode'}).fill('David et Bethsabée');
  await create.getByRole('textbox',{name:'Passage ou référence principale'}).fill('2 Samuel 11');
  await create.getByRole('button',{name:'Créer et relier les personnages'}).click();

  const editor=page.getByRole('dialog').last();
  await expect(editor.getByRole('heading',{name:'Connexions de l’épisode'})).toBeVisible();
  await editor.getByRole('button',{name:'Choisir un personnage'}).click();
  const personSearch=page.getByPlaceholder('Rechercher un personnage biblique…');
  await personSearch.fill('David');
  await page.getByRole('dialog').last().getByRole('button',{name:'David',exact:true}).click();
  await editor.getByRole('button',{name:'Lieu non précisé'}).click();
  const placeSearch=page.getByPlaceholder('Rechercher un lieu de l’Atlas…');
  await placeSearch.fill('Jérusalem');
  await page.getByRole('dialog').last().getByRole('button',{name:'Jérusalem',exact:true}).first().click();
  await editor.getByRole('textbox',{name:'Référence justificative'}).fill('2 Samuel 11:1');
  await editor.getByRole('textbox',{name:'Observation personnelle (facultative)'}).fill('David est resté à Jérusalem.');
  await editor.getByRole('button',{name:'Ajouter à la fiche'}).click();
  await expect(editor.getByRole('heading',{name:'Mes connexions (1)'})).toBeVisible();
  await editor.getByRole('button',{name:'Enregistrer les connexions'}).click();
  await expect(editor).toHaveCount(0);

  const stored=await page.evaluate(()=>{
    const entry=(window as any).atlasTest.files().find((file:any)=>file.path.includes('/Connexions/')&&file.content.includes('David et Bethsabée'));
    if(!entry)return null;
    const file=(window as any).atlasTest.app.vault.getAbstractFileByPath(entry.path);
    return {path:entry.path,content:entry.content,properties:(window as any).atlasTest.app.metadataCache.getFileCache(file)?.frontmatter};
  });
  expect(stored).not.toBeNull();
  expect(stored!.content).toContain('David est resté à Jérusalem');
  expect(stored!.properties.jwsd_episode_title).toBe('David et Bethsabée');
  expect(stored!.properties.atlas_entities).toContain('person:event-david-iixp36');
  expect(stored!.properties.atlas_entities).toContain('place:jerusalem');

  await page.evaluate(async id=>{
    await (window as any).atlasTest.renderCodeBlock('jwsd','event:'+id);
  },stored!.properties.jwsd_episode_id);
  const rendered=page.locator('section[data-code-block="jwsd"] .jwsd-episode');
  await expect(rendered).toContainText('Période non établie');
  await expect(rendered).toContainText('David');
  await expect(rendered).toContainText('Jérusalem');
  await expect(rendered).toContainText('Ajout personnel');
});

test('un épisode personnel sans source est refusé avant création de fichier',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.command('create-personal-study-episode'));
  const modal=page.getByRole('dialog').last();
  await modal.getByRole('textbox',{name:'Titre de l’épisode'}).fill('Étude libre');
  await modal.getByRole('button',{name:'Créer et relier les personnages'}).click();
  await expect(modal.getByRole('alert')).toContainText('référence');
  const files=await page.evaluate(()=>(window as any).atlasTest.files().filter((file:any)=>file.path.includes('/Connexions/')));
  expect(files).toHaveLength(0);
});
