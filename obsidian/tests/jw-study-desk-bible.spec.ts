import {test,expect,type Page} from '@playwright/test';
import {verseBiblePublicationBytes} from './fixtures/publication';
import {gzipSync,strToU8} from 'fflate';

async function install(page:Page,symbol='nwtsty'){
  const bytes=await verseBiblePublicationBytes(symbol);
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({json:{pub:symbol,files:{F:{JWPUB:[{pub:symbol,filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/'+symbol+'.jwpub'}}]}}}}));
  await page.route('https://cfp2.jw-cdn.org/test/'+symbol+'.jwpub',route=>route.fulfill({body:bytes}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  await page.locator(`[data-download-key="${symbol}|"]`).getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect.poll(()=>page.evaluate(s=>(window as any).atlasTest.plugin.publicationDownloads.get(s)?.stage,symbol)).toBe('ready');
}
async function bible(page:Page){
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.getLeavesOfType('atlas-biblique')])leaf.detach();await plugin.openStudyDesk('bible');});
  return page.locator('.jwsd-bible');
}
async function book(page:Page,value:string){
  const root=page.locator('.jwsd-bible');
  if(!await root.locator('details').evaluate((el:HTMLDetailsElement)=>el.open))await root.locator('summary').click();
  await root.getByRole('combobox',{name:'Livre de la Bible',exact:true}).selectOption(value);
}
async function preview(page:Page,label:string){
  await page.evaluate(label=>{
    document.querySelector('#local-bible-note')?.remove();
    const p=document.createElement('p');p.id='local-bible-note';p.textContent=label;document.body.appendChild(p);
    (window as any).atlasTest.plugin.markdownPostProcessor(p);
  },label);
  await page.locator('#local-bible-note a').first().click();
  return page.locator('.biblelab-inline-popover');
}
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Bible is directly accessible and the empty state opens just the Bible shelf',async({page})=>{
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])leaf.detach();await plugin.openStudyDesk();});
  await page.getByRole('button',{name:'Ouvrir la Bible',exact:true}).click();
  const root=page.locator('.jwsd-bible');
  await expect(root.getByText('Votre Bible, toujours à portée de main.')).toBeVisible();
  await root.getByRole('button',{name:'Télécharger une Bible',exact:true}).click();
  const shelf=page.locator('.blb-library');
  await expect(shelf.locator('[data-category="bible"]')).toHaveAttribute('aria-pressed','true');
  await expect(shelf.locator('[data-download-key="nwtsty|"]')).toBeVisible();
});

test('Popups use exact local verses and no remote request, including disjoint selection and poetry',async({page})=>{
  await install(page);const requests:string[]=[];page.on('request',r=>{if(r.url().startsWith('https:'))requests.push(r.url());});
  let pop=await preview(page,'Jean 7:24,26');
  await expect(pop).toContainText('Lecture locale');await expect(pop).toContainText('jugement équitable');await expect(pop).toContainText('La patience reflète');
  await expect(pop).not.toContainText('guérison');await expect(pop).not.toContainText('La bonté guide');
  await expect(pop.locator('.biblelab-popover-scripture-number')).toHaveText(['24','26']);
  await pop.getByRole('button',{name:'Fermer',exact:true}).click();
  pop=await preview(page,'Psaumes 3:1');
  await expect(pop).toContainText('Ô Jéhovah, entends ma prière.');await expect(pop).not.toContainText('Un titre à part');
  expect(requests).toEqual([]);
});

test('A new download replaces a cached web preview, and removing it restores the web fallback',async({page})=>{
  await page.route('**/json/html/43007024',route=>route.fulfill({json:{ranges:{'43007024':{citation:'Jean 7:24',html:'<p>Texte temporaire venu du web.</p>',footnotes:[],crossReferences:[],commentaries:[]}}}}));
  let pop=await preview(page,'Jean 7:24');await expect(pop).toContainText('Texte temporaire venu du web.');
  await pop.getByRole('button',{name:'Fermer',exact:true}).click();
  await install(page);pop=await preview(page,'Jean 7:24');
  await expect(pop).toContainText('Lecture locale');await expect(pop).toContainText('jugement équitable');await expect(pop).not.toContainText('Texte temporaire');
  await pop.getByRole('button',{name:'Fermer',exact:true}).click();
  await page.evaluate(async()=>{const {app}=(window as any).atlasTest;for(const file of app.vault.getFiles().filter((f:any)=>f.name==='_BIBLE_LAB_VIRTUAL_INDEX.json'))await app.vault.delete(file);});
  pop=await preview(page,'Jean 7:24');await expect(pop).toContainText('Texte temporaire venu du web.');await expect(pop).not.toContainText('Lecture locale');
});

test('An existing 0.12 download prepares itself once, and damaged caches can be rebuilt',async({page})=>{
  await install(page);
  const before=await page.evaluate(async()=>{
    const {app}=(window as any).atlasTest;
    const index=app.vault.getFiles().find((f:any)=>f.name==='_BIBLE_LAB_VIRTUAL_INDEX.json');
    const value=JSON.parse(await app.vault.read(index));delete value.sourceHash;await app.vault.modify(index,JSON.stringify(value));
    const cache=app.vault.getFiles().find((f:any)=>f.name==='_JW_STUDY_DESK_BIBLE.json.gz');await app.vault.delete(cache);
    return app.vault.getFiles().find((f:any)=>f.name==='publication.jwpub').content.byteLength;
  });
  const requests:string[]=[];page.on('request',r=>{if(r.url().startsWith('https:'))requests.push(r.url());});
  let pop=await preview(page,'Jean 7:24');await expect(pop).toContainText('Lecture locale');
  await pop.getByRole('button',{name:'Fermer',exact:true}).click();
  await page.evaluate(async()=>{const {app}=(window as any).atlasTest;const cache=app.vault.getFiles().find((f:any)=>f.name==='_JW_STUDY_DESK_BIBLE.json.gz');await app.vault.modifyBinary(cache,new Uint8Array([1,2,3]).buffer);});
  pop=await preview(page,'Jean 7:24');await expect(pop).toContainText('Lecture locale');
  const after=await page.evaluate(()=>{const files=(window as any).atlasTest.files();return {source:files.find((f:any)=>f.path.endsWith('publication.jwpub')).content.byteLength,caches:files.filter((f:any)=>f.path.endsWith('_JW_STUDY_DESK_BIBLE.json.gz')).length,md:files.filter((f:any)=>f.path.includes('/Bibliothèque virtuelle/')&&f.path.endsWith('.md')).length};});
  expect(after).toEqual({source:before,caches:1,md:0});expect(requests).toEqual([]);
});

test('An incomplete passage falls back as a whole and does not masquerade as a local reading',async({page})=>{
  await install(page);
  await page.route('**/json/html/**',route=>{
    const code=new URL(route.request().url()).pathname.split('/').at(-1)!;
    return route.fulfill({json:{ranges:{[code]:{citation:'Jean 7:26-27',html:'<p>La lecture web couvre le passage complet.</p>',footnotes:[],crossReferences:[],commentaries:[]}}}});
  });
  const pop=await preview(page,'Jean 7:26-27');
  await expect(pop).toContainText('La lecture web couvre le passage complet');
  await expect(pop).not.toContainText('Lecture locale');await expect(pop).not.toContainText('La patience reflète');
});

test('Local verse reading retains imported personal notes and chapter highlights',async({page})=>{
  await install(page);
  const index={format:'bible-lab-annotations',version:1,schema:16,sourceHash:'fixture',
    locations:[{id:1,book:43,chapter:7,document:null,issue:null,symbol:'nwtsty',language:3,type:0,specialty:null,edition:null}],
    marks:[{id:5,guid:'local-mark',color:2,style:0,location:1}],ranges:[{mark:5,blockType:1,identifier:24,start:0,end:4}],
    notes:[{id:9,guid:'local-note',title:'Mon idée',content:'Ma réflexion personnelle reste accessible',location:1,mark:5,blockType:1,blockIdentifier:24,created:null,modified:null,tags:['justice']}],bookmarks:[]};
  const bytes=Buffer.from(gzipSync(strToU8(JSON.stringify(index)))).toString('base64');
  await page.evaluate(async base64=>{
    const {app,plugin}=(window as any).atlasTest;const root=plugin.settings.noteFolder+'/Annotations JW Library';
    await app.vault.createFolder(root);await app.vault.createFolder(root+'/Test local');
    await app.vault.createBinary(root+'/Test local/annotations.json.gz',Uint8Array.from(atob(base64),c=>c.charCodeAt(0)).buffer);
    await app.vault.create(root+'/Test local/_BIBLE_LAB_ANNOTATIONS.json',JSON.stringify({format:'bible-lab-annotations',version:1}));
  },bytes);
  const pop=await preview(page,'Jean 7:24');await expect(pop).toContainText('Lecture locale');
  await expect(pop.locator('.biblelab-popover-personal-annotations')).toBeVisible();
  await pop.locator('.biblelab-popover-personal-annotations summary').click();
  await expect(pop).toContainText('Ma réflexion personnelle reste accessible');await expect(pop).toContainText('Surlignage · Vert');
});

test('Books, chapters, previous/next and word search share the same offline Bible',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await install(page);
  const requests:string[]=[];page.on('request',r=>{if(r.url().startsWith('https:'))requests.push(r.url());});
  const root=await bible(page);await book(page,'43');
  await expect(root.getByRole('article',{name:'Jean 7',exact:true})).toBeVisible();
  await root.getByRole('button',{name:'Chapitre suivant',exact:true}).click();
  await expect(root.getByRole('heading',{name:'Jean 8',exact:true})).toBeVisible();
  await root.getByRole('button',{name:'Chapitre précédent',exact:true}).click();
  await root.getByRole('tab',{name:'Rechercher',exact:true}).click();
  const query=root.getByRole('searchbox',{name:'Mots du verset'});
  await query.fill('EQUITABLE apparence');await expect(root.locator('.jwsd-bible-result')).toHaveCount(1);
  await expect(root.locator('.jwsd-bible-result mark')).toHaveText(['apparence','équitable']);
  await root.getByRole('button',{name:'Lire Jean 7:24',exact:true}).click();
  await expect(root.locator('.jwsd-bible-verse.is-target')).toContainText('jugement équitable');
  await root.getByRole('button',{name:'Aperçu de Jean 7:24',exact:true}).click();
  await expect(page.locator('.biblelab-inline-popover')).toContainText('Lecture locale');
  await page.locator('.biblelab-inline-popover').getByRole('button',{name:'Fermer',exact:true}).click();
  await root.getByRole('tab',{name:'Rechercher',exact:true}).click();
  await query.fill('jehovah priere');await expect(root.getByRole('button',{name:'Lire Psaumes 3:1',exact:true})).toBeVisible();
  await root.getByRole('combobox',{name:'Rechercher dans un livre'}).selectOption('43');await expect(root.locator('.jwsd-bible-result')).toHaveCount(0);
  await expect(root).toContainText('Aucun verset trouvé');
  await root.getByRole('combobox',{name:'Rechercher dans un livre'}).selectOption('0');
  await query.fill('moteursecret');await expect(root).toContainText('Aucun verset trouvé');
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('Chosen edition and reading location survive reopening; layouts fit narrow panes and native button styles',async({page})=>{
  await install(page,'nwtsty');await install(page,'nwt');const root=await bible(page);await book(page,'43');
  const editions=root.getByRole('combobox',{name:'Bible téléchargée',exact:true});
  const standard=await editions.locator('option').evaluateAll(items=>items.find(e=>e.textContent?.includes('Traduction du monde nouveau'))!.getAttribute('value')!);
  await editions.selectOption(standard);await expect(root.locator('.jwsd-bible-text')).toContainText('Édition standard');
  const study=await editions.locator('option').evaluateAll(items=>items.find(e=>e.textContent?.includes('édition d’étude'))!.getAttribute('value')!);
  await editions.selectOption(study);await root.getByRole('button',{name:'Aperçu de Jean 7:24',exact:true}).click();
  await expect(page.locator('.biblelab-inline-popover')).toContainText('édition d’étude');
  await expect(page.locator('.biblelab-inline-popover')).not.toContainText('Édition standard');
  await page.locator('.biblelab-inline-popover').getByRole('button',{name:'Fermer',exact:true}).click();
  await editions.selectOption(standard);
  await root.getByRole('button',{name:'Chapitre suivant',exact:true}).click();
  const state=await page.evaluate(()=> (window as any).atlasTest.app.workspace.getLeavesOfType('jw-study-desk-bible')[0].view.getState());
  await page.evaluate(async state=>{const {app,plugin}=(window as any).atlasTest;app.workspace.getLeavesOfType('jw-study-desk-bible')[0].detach();await plugin.openStudyDesk('bible');await app.workspace.getLeavesOfType('jw-study-desk-bible')[0].view.setState(state,{});},state);
  await expect(root.getByRole('heading',{name:'Jean 8',exact:true})).toBeVisible();await expect(editions).toHaveValue(standard);
  await page.evaluate(()=>{const {app}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])if(leaf.view.getViewType()!=='jw-study-desk-bible')leaf.detach();});
  await page.addStyleTag({content:'button{height:30px;white-space:nowrap;line-height:30px}'});
  for(const width of [280,390,820,1280]){
    await page.setViewportSize({width,height:920});
    for(const dark of [false,true]){
      await page.evaluate(d=>document.body.classList.toggle('theme-dark',d),dark);
      const geometry=await root.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,reader:el.querySelector('.jwsd-bible-reader')!.getBoundingClientRect().width,toolbarButton:el.querySelector('.jwsd-toolbar .jwsd-button')!.getBoundingClientRect().height}));
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client+1);expect(geometry.reader).toBeLessThanOrEqual(width);
      expect(geometry.toolbarButton).toBeLessThanOrEqual(44);
    }
  }
  await page.setViewportSize({width:test.info().project.name==='mobile'?390:1280,height:920});
  await root.locator('.jwsd-stage').evaluate(el=>{el.scrollTop=0;});
  await page.screenshot({path:'test-results/jwsd-bible-read-'+test.info().project.name+'.png'});
});
