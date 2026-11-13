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
  const rendered=page.locator('section[data-code-block="jwsd"].jwsd-episode');
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


test('l’analyse d’un passage propose une personne sans inventer sa position',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.command('create-personal-study-episode'));
  const create=page.getByRole('dialog').last();
  await create.getByRole('textbox',{name:'Titre de l’épisode'}).fill('David, Joab et Jérusalem');
  await create.getByRole('textbox',{name:'Passage ou référence principale'}).fill('2 Samuel 11');
  await create.getByRole('button',{name:'Créer et relier les personnages'}).click();

  const editor=page.getByRole('dialog').last();
  await editor.locator('summary').filter({hasText:'Analyser un passage'}).click();
  await editor.getByRole('textbox',{name:'Ou coller le passage'}).fill('1 Joab est parti vers Raba. David est resté à Jérusalem.');
  await editor.getByRole('button',{name:'Analyser le texte collé'}).click();

  const suggestion=editor.getByRole('checkbox',{name:'Confirmer David — 2 Samuel 11:1'});
  await expect(suggestion).toBeVisible();
  await expect(editor.getByText('Lieux également mentionnés').first()).toBeVisible();
  await suggestion.check();
  await editor.getByRole('button',{name:'Ajouter les propositions confirmées'}).click();
  await expect(editor.getByRole('heading',{name:'Mes connexions (1)'})).toBeVisible();
  await editor.getByRole('button',{name:'Enregistrer les connexions'}).click();

  const meta=await page.evaluate(()=>{
    const file=(window as any).atlasTest.files().find((item:any)=>item.content.includes('David, Joab et Jérusalem'));
    const obj=(window as any).atlasTest.app.vault.getAbstractFileByPath(file.path);
    return (window as any).atlasTest.app.metadataCache.getFileCache(obj).frontmatter;
  });
  expect(meta.jwsd_episode_connections).toHaveLength(1);
  expect(meta.jwsd_episode_connections[0].personId).toBe('event-david-iixp36');
  expect(meta.jwsd_episode_connections[0].reference).toBe('2 Samuel 11:1');
  expect(meta.jwsd_episode_connections[0].placeId).toBeUndefined();
  expect(meta.atlas_entities).not.toContain('place:jerusalem');
  expect(JSON.stringify(meta)).not.toContain('Joab est parti vers Raba');
});


test('2 Samuel 11 relie les personnages à la source sans inventer une date',async({page})=>{
  await page.evaluate(()=> (window as any).atlasTest.renderCodeBlock(
    'jwsd','event:event-samuel-11-david-bethsabee-joab'
  ));
  const card=page.locator('section[data-code-block="jwsd"].jwsd-episode');
  await expect(card).toContainText('David, Bethsabée et le siège de Raba');
  for(const name of ['David','Joab','Bethsabée','Urie le Hittite']){
    await expect(card.getByText(name,{exact:true}).first()).toBeVisible();
  }
  await expect(card).toContainText('L’année exacte n’est pas donnée');
  await expect(card).toContainText('Période non documentée');
  await expect(card).toContainText('Raba');
  await expect(card).toContainText('Indication du récit');
  await expect(card).toContainText('2 Samuel 11:1-27');
});

test('un fait structuré est sauvegardé et indexé depuis le personnage et le lieu, même après redémarrage', async ({page}) => {
  await page.evaluate(() => (window as any).atlasTest.command('create-personal-study-episode'));
  const create = page.getByRole('dialog').last();
  await create.getByRole('textbox',{name:'Titre de l’épisode'}).fill('Étude de David à Jérusalem');
  await create.getByRole('textbox',{name:'Passage ou référence principale'}).fill('2 Samuel 11');
  await create.getByRole('button',{name:'Créer et relier les personnages'}).click();

  const editor = page.getByRole('dialog').last();
  await expect(editor.getByRole('heading',{name:'Faits et relations documentés (0)'})).toBeVisible();
  await editor.getByRole('button',{name:'Choisir un personnage'}).click();
  await page.getByPlaceholder('Rechercher un personnage biblique…').fill('David');
  await page.getByRole('dialog').last().getByRole('button',{name:'David',exact:true}).click();
  await editor.getByRole('button',{name:'Lieu non précisé'}).click();
  await page.getByPlaceholder('Rechercher un lieu de l’Atlas…').fill('Jérusalem');
  await page.getByRole('dialog').last().getByRole('button',{name:'Jérusalem',exact:true}).first().click();
  await editor.getByRole('textbox',{name:'Référence justificative'}).fill('2 Samuel 11:1');
  await editor.getByRole('button',{name:'Ajouter le fait'}).click();
  await expect(editor.getByRole('heading',{name:'Faits et relations documentés (1)'})).toBeVisible();
  await editor.getByRole('button',{name:'Enregistrer les connexions'}).click();

  const saved=await page.evaluate(()=>{
    const t=(window as any).atlasTest;
    const file=t.files().find((item:any)=>item.content.includes('Étude de David à Jérusalem'));
    const meta=t.app.metadataCache.getFileCache(t.app.vault.getAbstractFileByPath(file.path)).frontmatter;
    const index=t.plugin.getSnapshot().studyFacts;
    return {
      eventId:meta.jwsd_episode_id,
      schema:meta.jwsd_schema,
      facts:meta.jwsd_episode_facts,
      person:(index.byPerson['event-david-iixp36']??[]).map((item:any)=>item.id),
      place:(index.byPlace.jerusalem??[]).map((item:any)=>item.id)
    };
  });
  expect(saved.schema).toBe(2);
  expect(saved.facts).toHaveLength(1);
  expect(saved.facts[0].kind).toBe('presence');
  expect(saved.facts[0].reference).toBe('2 Samuel 11:1');
  expect(saved.person).toContain(saved.eventId);
  expect(saved.place).toContain(saved.eventId);

  await page.evaluate(()=> (window as any).atlasTest.restart());
  await expect.poll(async()=>page.evaluate(id=>{
    const snap=(window as any).atlasTest.plugin.getSnapshot().studyFacts;
    return (snap.byPerson['event-david-iixp36']??[]).some((item:any)=>item.id===id) &&
      (snap.byPlace.jerusalem??[]).some((item:any)=>item.id===id);
  },saved.eventId)).toBe(true);
});
