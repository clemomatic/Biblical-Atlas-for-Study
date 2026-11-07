import {test,expect,type Page} from '@playwright/test';
import {publicationBytes,verseBiblePublicationBytes} from './fixtures/publication';
import {createRequire} from 'node:module';
import initSqlJs from 'sql.js';
import {gzipSync} from 'fflate';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url);
const uuid='815ecc5a-e72b-48ac-aa9f-e1e7d256e43b';
async function notes(page:Page){
  await page.route('**/json/html/20017017',route=>route.fulfill({json:{ranges:{'20017017':{html:'<p>Texte de démonstration pour une étude sur l’amitié.</p>',commentaries:[],footnotes:[],crossReferences:[]}}}}));
  await page.evaluate(async()=>{
    const {app,plugin}=(window as any).atlasTest;
    for(const leaf of [...app.workspace.leaves])leaf.detach();
    await app.vault.create('Amitié.md','# Amitié\nLes anciens cultivent l’amitié (Pr 17:17).\nLa même idée avec une abréviation (Proverbes 17:17).');
    await app.vault.create('Autre étude.md','# Autres pistes\nNous témoignons de l’amour (Jean 3:16-18).\nUn passage distinct (Jean 3:20).');
    app.workspace.activeFile=app.vault.getAbstractFileByPath('Amitié.md');
    await plugin.openBibleLab();
    app.workspace.getLeavesOfType('bible-lab-sidebar')[0].view.focusReference('Pr 17:17');
  });
  return page.locator('.biblelab-side');
}
async function renderedReference(page:Page,label='Jean 7:24'){
  await page.evaluate(label=>{
    document.querySelector('#workflow-note')?.remove();
    const p=document.createElement('p');p.id='workflow-note';p.textContent='Cette phrase est mon application ('+label+').';document.body.append(p);
    (window as any).atlasTest.plugin.markdownPostProcessor(p);
  },label);
  await page.locator('#workflow-note a').first().click();
  return page.locator('.biblelab-inline-popover');
}
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('A verse lookup spans ordinary notes, shows the author idea and opens its source line',async({page})=>{
  const panel=await notes(page);
  await panel.getByRole('button',{name:'Dans mes notes',exact:true}).click();
  await expect(panel.locator('.biblelab-vault-results')).toContainText('2 correspondances');
  await expect(panel.locator('.biblelab-vault-hit')).toHaveCount(2);
  await expect(panel.locator('.biblelab-vault-hit').first()).toContainText('Les anciens cultivent l’amitié.');
  await page.screenshot({path:'test-results/workflow-correspondences-'+test.info().project.name+'.png'});
  const query=panel.getByRole('searchbox',{name:'Verset ou idée à retrouver'});
  await query.fill('Jean 3:17');await query.press('Enter');
  await expect(panel.locator('.biblelab-vault-results')).toContainText('1 correspondance');
  await expect(panel.locator('.biblelab-vault-hit')).toContainText('Nous témoignons de l’amour.');
  await panel.locator('.biblelab-vault-hit-title').click();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened)).toBe('Autre étude.md');
  await query.fill('Jean 3:19');await query.press('Enter');
  await expect(panel.locator('.biblelab-vault-results')).toContainText('0 correspondance');
});
test('Typed references use explicit reading or a pause, and settings persist on restart',async({page})=>{
  const panel=await notes(page),input=panel.getByRole('textbox',{name:'Référence à lire'});
  await input.fill('Jean 3:16');
  await expect(panel.locator('.biblelab-focused-reading .biblelab-reader-summary')).toContainText('Pr 17:17');
  await input.press('Enter');
  await expect(panel.locator('.biblelab-focused-reading .biblelab-reader-summary')).toContainText('Jean 3:16');
  await page.evaluate(()=>(window as any).atlasTest.plugin.setReadingSettings({automaticReference:true,closeOnOutsideClick:false,display:'expanded'}));
  await input.fill('Jean 4:');await input.press('End');
  await expect(panel.locator('.biblelab-focused-reading .biblelab-reader-summary')).toContainText('Jean 3:16');
  await input.fill('Jean 4:1');
  await expect(panel.locator('.biblelab-focused-reading .biblelab-reader-summary')).toContainText('Jean 4:1');
  await page.evaluate(()=>(window as any).atlasTest.restart());
  expect(await page.evaluate(()=>(window as any).atlasTest.plugin.getReadingSettings())).toMatchObject({automaticReference:true,closeOnOutsideClick:false,display:'expanded'});
});
test('Popup outside clicks are configurable and panel mode preserves the clicked sentence',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.setReadingSettings({closeOnOutsideClick:false}));
  const popup=await renderedReference(page);
  await expect(popup).toBeVisible();await page.locator('#test-header').click();await expect(popup).toBeVisible();
  await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
  await page.evaluate(()=>(window as any).atlasTest.plugin.setReadingSettings({closeOnOutsideClick:true}));
  await renderedReference(page);await expect(popup).toBeVisible();await page.locator('#test-header').click();await expect(popup).toHaveCount(0);
  await page.evaluate(()=>(window as any).atlasTest.plugin.setReadingSettings({mode:'panel'}));
  await renderedReference(page);
  await expect(popup).toHaveCount(0);
  await expect(page.locator('.biblelab-reference-idea').first()).toContainText('Cette phrase est mon application');
});
test('The reader follows only visible note references without changing the note scroll',async({page})=>{
  await notes(page);
  await page.evaluate(async()=>{
    const {app,plugin}=(window as any).atlasTest;
    const leaf=(window as any).atlasTest.openMarkdownEditor('Amitié.md');
    const container=document.createElement('div');container.style.cssText='position:fixed;left:0;top:40px;width:240px;height:180px;z-index:1';
    const pane=document.createElement('div');pane.className='markdown-preview-view';pane.style.cssText='height:180px;overflow:auto;background:white';
    pane.innerHTML='<p>Première idée (Pr 17:17).</p><div style="height:600px"></div><p>Deuxième idée (Jean 3:16).</p><div style="height:200px"></div>';
    container.append(pane);document.body.append(container);leaf.view.containerEl=container;
    plugin.markdownPostProcessor(pane);
    const view=app.workspace.getLeavesOfType('bible-lab-sidebar')[0].view;
    view.pinnedRef=null;view.followingPaused=false;view.syncVisibleReferences();view.render();
  });
  const list=page.locator('.biblelab-note-reference-list');
  await expect(list.locator('.biblelab-reader-summary')).toHaveCount(1);await expect(list).toContainText('Proverbes 17:17');
  await page.locator('.markdown-preview-view').evaluate((el:HTMLElement)=>el.scrollTop=590);
  await expect(list).toContainText('Jean 3:16');await expect(list).not.toContainText('Proverbes 17:17');
  expect(await page.locator('.markdown-preview-view').evaluate(el=>el.scrollTop)).toBe(590);
});
test('English study notes distinguish verified absence, keep originals and translate with quota fallback',async({page})=>{
  const official=(english:boolean)=>({ranges:{'43007024':{html:'<p>Texte biblique de démonstration.</p>',commentaries:english?[{id:2,source:'43007024',content:'<p>A synthetic study note.</p>'}]:[],footnotes:[],crossReferences:[]}}});
  await page.route('**/fr/**/json/html/43007024',route=>route.fulfill({json:official(false)}));
  await page.route('**/en/**/json/html/43007024',route=>route.fulfill({json:official(true)}));
  const sent:string[]=[];
  await page.route('https://api.mymemory.translated.net/get**',route=>{
    sent.push(new URL(route.request().url()).searchParams.get('q')||'');
    return route.fulfill({json:{responseStatus:200,responseData:{translatedText:'Une note d’étude synthétique.'}}});
  });
  await page.evaluate(()=>(window as any).atlasTest.plugin.setReadingSettings({englishNotes:true,translateEnglish:true,closeOnOutsideClick:false}));
  const pop=await renderedReference(page);
  await expect(pop).toContainText('aucune note française sur ce verset');
  await expect(pop).toContainText('Une note d’étude synthétique.');
  await expect(pop).toContainText('Traduction automatique non officielle');
  expect(sent).toEqual(['A synthetic study note.']);
  await pop.getByText('Original anglais',{exact:true}).click();await expect(pop.getByText('A synthetic study note.',{exact:true})).toBeVisible();
  await page.evaluate(()=>(window as any).atlasTest.plugin.inlinePopup.close());
  await page.route('**/fr/**/json/html/43007025',route=>route.fulfill({json:{ranges:{'43007025':{html:'<p>Autre verset.</p>',commentaries:[]}}}}));
  await page.route('**/en/**/json/html/43007025',route=>route.fulfill({json:{ranges:{'43007025':{html:'',commentaries:[{id:3,source:'43007025',content:'<p>Another synthetic note.</p>'}]}}}}));
  await page.route('https://api.mymemory.translated.net/get**',route=>route.fulfill({json:{responseStatus:403,quotaFinished:true,responseData:{translatedText:'Quota exceeded'}}}));
  await renderedReference(page,'Jean 7:25');
  await expect(pop).toContainText('quota atteint');await expect(pop.getByText('Another synthetic note.',{exact:true})).toBeVisible();
});
test('Eight-digit magazine dates survive catalogue grouping, year filtering and download',async({page})=>{
  const SQL=await initSqlJs({locateFile:(n:string)=>require.resolve('sql.js/dist/'+n)});const db=new SQL.Database();
  db.run('CREATE TABLE Publication(MepsLanguageId INTEGER, Symbol TEXT, Year INTEGER, IssueTagNumber INTEGER, Title TEXT, IssueTitle TEXT)');
  db.run("INSERT INTO Publication VALUES(3,'w',2015,20150101,'La Tour de Garde','1 janvier 2015')");
  db.run("INSERT INTO Publication VALUES(3,'w',2015,20150115,'La Tour de Garde','15 janvier 2015')");
  await page.route('**/catalogs/publications/v4/manifest.json',route=>route.fulfill({json:{version:1,current:uuid}}));
  const bytes=Buffer.from(gzipSync(db.export()));db.close();
  await page.route('**/catalogs/publications/v4/'+uuid+'/catalog.db.gz',route=>route.fulfill({body:bytes}));
  const archive=await publicationBytes('w',20150115);
  let issue='';await page.route('**/GETPUBMEDIALINKS**',route=>{
    issue=new URL(route.request().url()).searchParams.get('issue')||'';
    return route.fulfill({json:{pub:'w',issue,files:{F:{JWPUB:[{pub:'w',file:{url:'https://cfp2.jw-cdn.org/test/w.jwpub'},filesize:archive.length}]}}}});
  });
  await page.route('https://cfp2.jw-cdn.org/test/w.jwpub',route=>route.fulfill({body:archive}));
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])leaf.detach();await plugin.openVisualLibrary();});
  const library=page.locator('.blb-library');await library.getByRole('button',{name:'Revues',exact:true}).click();
  await library.locator('.blb-book-card').filter({hasText:'La Tour de Garde'}).getByRole('button',{name:'Voir les numéros'}).click();
  await library.getByRole('combobox',{name:'Année des revues'}).selectOption('2015');
  await expect(library.locator('.blb-book-card')).toHaveCount(2);
  await library.locator('[data-download-key="w|20150115"]').getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).atlasTest.plugin.publicationDownloads.get('w','20150115')?.stage)).toBe('ready');expect(issue).toBe('20150115');
  const stored=await page.evaluate(()=>(window as any).atlasTest.files());
  expect(JSON.parse(stored.find((f:any)=>f.path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json')).content).publication.issue).toBe('20150115');
});
test('Existing local Bible library reading uses clean verse data rather than flattened marker letters',async({page})=>{
  const bytes=await verseBiblePublicationBytes();
  await page.route('**/GETPUBMEDIALINKS**',route=>route.fulfill({json:{pub:'nwtsty',files:{F:{JWPUB:[{pub:'nwtsty',filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/nwtsty.jwpub'}}]}}}}));
  await page.route('https://cfp2.jw-cdn.org/test/nwtsty.jwpub',route=>route.fulfill({body:bytes}));
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])leaf.detach();await plugin.openVisualLibrary();});
  const lib=page.locator('.blb-library');await lib.locator('[data-download-key="nwtsty|"]').getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect(lib.locator('[data-download-key="nwtsty|"]').getByRole('button',{name:'Lire',exact:true})).toBeVisible();
  await lib.locator('[data-download-key="nwtsty|"]').getByRole('button',{name:'Lire',exact:true}).click();
  await lib.getByRole('combobox',{name:'Livre de la Bible'}).selectOption('19');
  await lib.getByRole('button',{name:'Lire Psaumes 3',exact:true}).click();
  await expect(lib.locator('.blb-reader-text')).toContainText('Ô Jéhovah, entends ma prière.');
  await expect(lib.locator('.blb-reader-text')).not.toContainText('prière.ab');
});
test('A file from another issue is rejected even when the API announces the requested magazine',async({page})=>{
  const bytes=await publicationBytes('w',20150101);
  await page.route('**/GETPUBMEDIALINKS**',route=>route.fulfill({json:{pub:'w',issue:'20150115',files:{F:{JWPUB:[{pub:'w',filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/wrong.jwpub'}}]}}}}));
  await page.route('https://cfp2.jw-cdn.org/test/wrong.jwpub',route=>route.fulfill({body:bytes}));
  const state=await page.evaluate(async()=>{
    const {plugin}=(window as any).atlasTest;await plugin.publicationDownloads.download('w','20150115');return plugin.publicationDownloads.get('w','20150115');
  });
  expect(state.stage).toBe('error');expect(state.error).toContain('numéro');
  expect(await page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json')).length)).toBe(0);
});
for(const [symbol,issue] of [['w','20150115'],['g','202611'],['nwt','']] as const){
  test('Real official JWPUB can be imported and read: '+symbol,async({page})=>{
    const file=path.join(process.env.ATLAS_REAL_JWPUB_DIR||'/nonexistent',symbol+'.jwpub');test.skip(!existsSync(file),'Optional real public fixture');
    const bytes=readFileSync(file);test.setTimeout(90000);
    await page.route('**/GETPUBMEDIALINKS**',route=>route.fulfill({json:{pub:symbol,issue,files:{F:{JWPUB:[{pub:symbol,filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/'+symbol+'.jwpub'}}]}}}}));
    await page.route('https://cfp2.jw-cdn.org/test/'+symbol+'.jwpub',route=>route.fulfill({body:bytes}));
    await page.evaluate(async({symbol,issue})=>{
      const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])leaf.detach();await plugin.openVisualLibrary();
      await plugin.publicationDownloads.download(symbol,issue);
    },{symbol,issue});
    expect(await page.evaluate(({symbol,issue})=>(window as any).atlasTest.plugin.publicationDownloads.get(symbol,issue)?.stage,{symbol,issue})).toBe('ready');
    const stored=await page.evaluate(()=>(window as any).atlasTest.files().filter((f:any)=>f.path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json')).map((f:any)=>JSON.parse(f.content)));
    expect(stored[0].publication.symbol.replace(/^(w|g)\d{2}$/,'$1')).toBe(symbol);if(issue)expect(stored[0].publication.issue).toBe(issue);
    if(symbol==='nwt')expect(await page.evaluate(async()=>{
      const {plugin}=(window as any).atlasTest;const edition=(await plugin.localBible.editions())[0];const bible=await plugin.localBible.load(edition);return {chapters:bible.chapters.length,text:bible.chapters.find((c:any)=>c.book===43&&c.chapter===3).verses.find((v:any)=>v.number===16).text};
    })).toMatchObject({chapters:1189,text:expect.not.stringMatching(/unique[a-z]/)});
  });
}
