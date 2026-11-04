import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
const install=async(page:any)=>{
 await page.evaluate(async()=>{
  const {app,plugin}=(window as any).atlasTest;
  const base=plugin.settings.noteFolder+'/Imports';
  const directory=base+'/Demo-Revue';
  const school=base+'/Instructions-Ecole';
  const ensure=async(path:string)=>{
   if(!app.vault.getAbstractFileByPath(path))await app.vault.createFolder(path);
  };
  await ensure(base);await ensure(directory);await ensure(school);
  const publication=(symbol:string,title:string,language:number,docs:any[])=>JSON.stringify({
   schema:1,publication:{symbol,year:2026,language,title},documents:docs
  });
  const one='001 · Apprendre avec confiance.md';
  const two='002 · L’amitié véritable.md';
  await app.vault.create(directory+'/'+one,
   '---\nbible_lab_kind: jwpub-document\n---\n# Apprendre avec confiance\n\nUne phrase spéciale sur la bienveillance.');
  await app.vault.create(directory+'/'+two,
   '---\nbible_lab_kind: jwpub-document\n---\n# L’amitié véritable\n\nL’amour sincère construit des liens durables.');
  await app.vault.create(directory+'/_BIBLE_LAB_OFFLINE_INDEX.json',
   publication('w26','La Tour de Garde — édition d’étude',3,[
    {documentId:1,mepsId:2026001,title:'Apprendre avec confiance',path:one},
    {documentId:2,mepsId:2026002,title:'L’amitié véritable',path:two}
   ]));
  const schoolNote='001 · Conseils pour les élèves.md';
  await app.vault.create(school+'/'+schoolNote,
   '---\nbible_lab_kind: jwpub-document\n---\n# Conseils pour les élèves\n\nPrépare chaque leçon soigneusement.');
  await app.vault.create(school+'/_BIBLE_LAB_OFFLINE_INDEX.json',
   publication('s-38','Instructions pour une école',3,[
    {documentId:1,mepsId:null,title:'Conseils pour les élèves',path:schoolNote}
   ]));
  await plugin.openVisualLibrary();
 });
};

test('Native visual bookshelf opens in a dedicated Obsidian tab without adding sidebar tabs',async({page})=>{
 await page.evaluate(()=> (window as any).atlasTest.plugin.openBibleLab());
 await page.locator('.biblelab-overflow > summary').click();
 await page.getByRole('button',{name:'Ma bibliothèque hors ligne'}).click();
 await expect(page.locator('.bl-library-tab')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Ma bibliothèque'})).toBeVisible();
 await expect(page.locator('.bl-library-nav-item')).toHaveCount(8);
 await expect(page.getByRole('button',{name:'Importer mon premier JWPUB'})).toBeVisible();
 await expect(page.locator('.biblelab-focus-nav .biblelab-tab')).toHaveCount(4);
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests||[])).toHaveLength(0);
});

test('Publication tiles, categories and article reading work with two imported JWPUB files offline',async({page})=>{
 await install(page);
 await expect(page.getByRole('button',{name:'Ouvrir La Tour de Garde — édition d’étude'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Ouvrir Instructions pour une école'})).toBeVisible();
 await page.getByRole('button',{name:'Écoles et instructions'}).click();
 await expect(page.getByRole('button',{name:'Ouvrir La Tour de Garde — édition d’étude'})).toHaveCount(0);
 await page.getByRole('button',{name:'Ouvrir Instructions pour une école'}).click();
 await expect(page.locator('.bl-library-reader-body')).toContainText('Prépare chaque leçon soigneusement.');
 await expect(page.getByRole('button',{name:'Ouvrir la note éditable'})).toBeVisible();
 await page.getByRole('button',{name:'Ouvrir la note éditable'}).click();
 expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened))
   .toContain('Conseils pour les élèves.md');
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests||[])).toHaveLength(0);
});

test('Local full-text search finds a passage and internal JWPUB document links navigate offline',async({page})=>{
 await install(page);
 await page.getByRole('searchbox',{name:'Rechercher dans la bibliothèque locale'}).fill('bienveillance');
 await expect(page.getByRole('button',{name:'Lire Apprendre avec confiance'})).toBeVisible();
 await page.getByRole('button',{name:'Lire Apprendre avec confiance'}).click();
 await expect(page.locator('.bl-library-reader-body')).toContainText('bienveillance');
 await page.evaluate(()=>{
  const reader=document.querySelector('.bl-library-reader-body');
  const link=document.createElement('a');link.href='jwpub://p/F:2026002/';link.textContent='L’amitié véritable';
  reader?.append(link);
 });
 await page.locator('.bl-library-reader-body a[href^="jwpub"]').click();
 await expect(page.locator('.bl-library-reader-header h2')).toHaveText('L’amitié véritable');
 await expect(page.locator('.bl-library-reader-body')).toContainText('liens durables');
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests||[])).toHaveLength(0);
});

test('Dark theme and narrow Obsidian split retain accessible categories and document reader',async({page})=>{
 await page.setViewportSize({width:510,height:780});
 await page.evaluate(()=>document.body.classList.add('theme-dark'));
 await install(page);
 await expect(page.locator('.bl-library-nav-item')).toHaveCount(8);
 await page.getByRole('button',{name:'Ouvrir La Tour de Garde — édition d’étude'}).click();
 await expect(page.getByRole('button',{name:'Lire L’amitié véritable'})).toBeVisible();
 await page.getByRole('button',{name:'Lire L’amitié véritable'}).click();
 await expect(page.locator('.bl-library-reader-body')).toContainText('L’amour sincère');
});
