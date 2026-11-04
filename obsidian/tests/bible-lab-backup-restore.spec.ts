import {test,expect} from '@playwright/test';

const PATH='Mes notes/Une idée précieuse.md';
const WOL='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('Backup and confirmed restore preserve exact WOL citation and never rewrite a Markdown note',async({page})=>{
  const pane=page.locator('.biblelab-side');
  const before=await page.evaluate(path=>(window as any).atlasTest.file(path),PATH);
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await pane.locator('.biblelab-manual-capture > summary').click();
  await pane.getByRole('textbox',{name:'Nom de la trouvaille'}).fill('Source pour plus tard');
  await pane.getByRole('textbox',{name:'Lien WOL précis'}).fill(WOL);
  await pane.getByRole('textbox',{name:'Extrait collecté'}).fill('Une phrase très utile');
  await pane.getByRole('button',{name:'Ajouter au bac'}).click();
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await pane.locator('.biblelab-backup-actions > summary').click();
  await pane.getByRole('button',{name:'Créer une sauvegarde'}).click();
  await expect.poll(async()=>page.evaluate(()=> (window as any).atlasTest.files()
    .filter((f:any)=>f.path.startsWith('Bible-Lab_Sauvegardes/')).length)).toBe(1);
  const snapshot=await page.evaluate(()=>(window as any).atlasTest.files()
    .find((f:any)=>f.path.endsWith('.json')&&f.path.startsWith('Bible-Lab_Sauvegardes/')).content);
  expect(JSON.parse(snapshot).data.collection.captures[0].url).toBe(WOL);

  // Simulate a later local loss: restoring must recover the earlier capture.
  await page.evaluate(async()=>{
    const plugin=(window as any).atlasTest.plugin;
    await plugin.saveResearchCollection({version:1,captures:[],ideas:[]});
  });
  await pane.getByRole('button',{name:'Restaurer',exact:true}).click();
  const modal=page.getByRole('dialog');
  await expect(modal.getByText(/1 trouvaille\(s\)/)).toBeVisible();
  const button=modal.getByRole('button',{name:'Restaurer cette sauvegarde'});
  await expect(button).toBeDisabled();
  await modal.getByRole('checkbox',{name:'Je confirme le remplacement de mes recherches actuelles.'}).check();
  await expect(button).toBeEnabled();
  await button.click();

  await expect(modal).toHaveCount(0);
  const result=await page.evaluate(path=>({
    captures:(window as any).atlasTest.plugin.getResearchCollection().captures,
    files:(window as any).atlasTest.files(),
    note:(window as any).atlasTest.file(path)
  }),PATH);
  expect(result.captures).toHaveLength(1);
  expect(result.captures[0].url).toBe(WOL);
  expect(result.files.filter((f:any)=>f.path.startsWith('Bible-Lab_Sauvegardes/')).length).toBe(2);
  expect(result.note).toBe(before);
  await expect(pane.locator('.biblelab-archive-card')).toHaveCount(1);
});

test('Closing the restore dialog without confirmation does not change the state',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await pane.locator('.biblelab-backup-actions > summary').click();
  await pane.getByRole('button',{name:'Créer une sauvegarde'}).click();
  await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files()
    .filter((f:any)=>f.path.startsWith('Bible-Lab_Sauvegardes/')).length)).toBe(1);
  await pane.getByRole('button',{name:'Restaurer',exact:true}).click();
  const modal=page.getByRole('dialog');
  await expect(modal.getByRole('button',{name:'Restaurer cette sauvegarde'})).toBeDisabled();
  await modal.getByRole('button',{name:'Annuler'}).click();
  await expect(modal).toHaveCount(0);
  expect(await page.evaluate(()=>(window as any).atlasTest.files()
    .filter((f:any)=>f.path.startsWith('Bible-Lab_Sauvegardes/')).length)).toBe(1);
});

test('Rejects modified or untrusted backup files before enabling restore',async({page})=>{
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Mon index"]').click();
  await pane.locator('.biblelab-backup-actions > summary').click();
  await pane.getByRole('button',{name:'Créer une sauvegarde'}).click();
  const savedPath=await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.files()
    .find((f:any)=>f.path.startsWith('Bible-Lab_Sauvegardes/')&&f.path.endsWith('.json'))?.path)).not.toBeUndefined();
  await page.evaluate(async()=>{
    const app=(window as any).atlasTest.app;
    const file=app.vault.getFiles().find((x:any)=>x.path.startsWith('Bible-Lab_Sauvegardes/')&&x.path.endsWith('.json'));
    const bad=JSON.parse(await app.vault.read(file));
    bad.data.collection.captures=[{
      id:'source-x',label:'Faux lien',excerpt:'',comment:'',planId:null,createdAt:0,
      url:'https://wol.jw.org.attacker.example/fr/wol/d/r30/lp-f/2024663'
    }];
    await app.vault.modify(file,JSON.stringify(bad));
  });
  await pane.getByRole('button',{name:'Restaurer',exact:true}).click();
  const modal=page.getByRole('dialog');
  await expect(modal.getByText(/Restauration refusée/)).toBeVisible();
  await expect(modal.getByRole('button',{name:'Restaurer cette sauvegarde'})).toBeDisabled();
});
