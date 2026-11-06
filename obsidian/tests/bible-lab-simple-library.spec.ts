import {test,expect} from '@playwright/test';
import {publicationBytes} from './fixtures/publication';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('One library, one primary action per cover, all technical options tucked away',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
  await page.getByRole('button',{name:'Ma bibliothèque',exact:true}).click();
  const library=page.locator('.blb-library');
  await expect(library.getByRole('heading',{name:'Ma bibliothèque'})).toBeVisible();
  await expect(library.locator('.blb-head-actions > button')).toHaveCount(2);
  await expect(library.locator('.blb-card-actions')).toHaveCount(await library.locator('.blb-book-card').count());
  for(const word of ['SQLite','Markdown','MEPS','virtuel','Vérifier le JWPUB','Charger le catalogue'])
    await expect(library).not.toContainText(word);
  await expect(library.getByRole('button',{name:'Rechercher sur WOL',exact:true})).toHaveCount(0);
  await library.getByRole('button',{name:'Options de la bibliothèque'}).click();
  await expect(page.getByRole('button',{name:'Importer une sauvegarde JW Library'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Outils d’import et d’export'})).toBeVisible();
  await page.screenshot({path:'test-results/bible-lab-preview-shelf-'+test.info().project.name+'.png'});
});
test('A single download click prepares the book, preserves its origin and opens its text',async({page})=>{
  const archive=await publicationBytes();
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({pubName:'Publication de démonstration',files:{F:{JWPUB:[{filesize:archive.length,file:{url:'https://cfp2.jw-cdn.org/test/lff_F.jwpub'}}]}}})
  }));
  await page.route('https://cfp2.jw-cdn.org/test/lff_F.jwpub',route=>route.fulfill({status:200,body:archive}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await library.locator('.blb-book-card').filter({hasText:'Vivez pour toujours !'}).filter({hasNotText:'premières leçons'})
    .getByRole('button',{name:'Télécharger',exact:true}).click();
  const card=library.locator('.blb-book-card').filter({hasText:'Publication de démonstration'});
  await expect(card.getByRole('button',{name:'Lire',exact:true})).toBeVisible();
  const stored=await page.evaluate(()=>(window as any).atlasTest.files());
  const index=JSON.parse(stored.find((f:any)=>f.path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json')).content);
  expect(index.origin).toBe('download');
  expect(stored.filter((f:any)=>f.path.includes('/Bibliothèque virtuelle/')&&f.path.endsWith('.md'))).toHaveLength(0);
  await card.getByRole('button',{name:'Lire',exact:true}).click();
  await library.getByRole('button',{name:'Lire Une idée utile'}).click();
  await expect(library.locator('.blb-reader-text')).toContainText('La patience aide à comprendre');
  await library.getByRole('button',{name:'Bibliothèque',exact:true}).click();
  await library.getByRole('button',{name:'Mes imports',exact:true}).click();
  await expect(library.getByRole('button',{name:'Ouvrir Publication de démonstration'})).toHaveCount(0);
});
test('Periodical issues are grouped, and narrow dark layout stays within the pane',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/obsidian/dev/index.html?theme=dark');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(async()=>{
    const {app,plugin}=(window as any).atlasTest;
    for(const leaf of [...app.workspace.leaves])await leaf.detach();
    await plugin.openVisualLibrary();
  });
  const library=page.locator('.blb-library');
  await library.getByRole('button',{name:'Revues',exact:true}).click();
  const series=library.locator('.blb-book-card').filter({hasText:'La Tour de Garde'});
  await expect(series).toHaveCount(1);
  await series.getByRole('button',{name:'Voir les numéros'}).click();
  await expect(library.locator('.blb-book-card')).toHaveCount(2);
  expect(await library.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.screenshot({path:'test-results/bible-lab-preview-narrow-'+test.info().project.name+'.png'});
});
test('Private foreign-language publications remain available and have no automatic external source menu',async({page})=>{
  await page.evaluate(async()=>{
    const {app,plugin}=(window as any).atlasTest;
    const path=plugin.settings.noteFolder+'/Imports/English';await app.vault.createFolder(path);
    await app.vault.create(path+'/001.md','# Private\n\nPrivate reading.');
    await app.vault.create(path+'/_BIBLE_LAB_OFFLINE_INDEX.json',JSON.stringify({schema:1,origin:'personal',publication:{symbol:'s-38',year:2026,language:0,title:'My private manual'},documents:[{documentId:1,mepsId:null,title:'Private',path:'001.md'}]}));
    await plugin.openVisualLibrary();
  });
  const library=page.locator('.blb-library');
  await expect(library.getByRole('button',{name:'Ouvrir My private manual'})).toBeVisible();
  await library.getByRole('button',{name:'Options de My private manual'}).click();
  await expect(page.getByRole('button',{name:'Afficher le sommaire'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Rechercher sur WOL',exact:true})).toHaveCount(0);
});
