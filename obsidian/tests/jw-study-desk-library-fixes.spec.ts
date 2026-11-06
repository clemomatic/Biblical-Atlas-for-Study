import {test,expect} from '@playwright/test';
import {biblePublicationBytes,publicationBytes} from './fixtures/publication';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])leaf.detach();await plugin.openVisualLibrary();});
});
test('Study Bible retries inline, skips NULL navigation and reads actual chapter records',async({page})=>{
  const bytes=await biblePublicationBytes();let calls=0;
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>{
    const request=new URL(route.request().url());expect(request.searchParams.get('booknum')).toBe('0');
    calls++;return calls===1?route.fulfill({status:503}):route.fulfill({json:{pub:'nwtsty',pubName:'Bible d’étude de démonstration',files:{F:{JWPUB:[{pub:'nwtsty',filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/nwtsty.jwpub'}}]}}}});
  });
  await page.route('https://cfp2.jw-cdn.org/test/nwtsty.jwpub',route=>route.fulfill({body:bytes}));
  const root=page.locator('.blb-library'),card=root.locator('[data-download-key="nwtsty|"]');
  await card.getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect(card.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.getByRole('button',{name:'Réessayer',exact:true}).click();
  await card.getByRole('button',{name:'Lire',exact:true}).click();
  await expect(root.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'})).not.toBeVisible();
  await root.getByRole('combobox',{name:'Livre de la Bible'}).selectOption('43');
  await root.getByRole('button',{name:'Lire Jean 7',exact:true}).click();
  await expect(root.locator('.blb-reader-text')).toContainText('Chapitre de démonstration 7');
  await root.getByRole('button',{name:'Suivant',exact:true}).click();
  await expect(root.locator('.blb-reader-text')).toContainText('Chapitre de démonstration 8');
  const files=await page.evaluate(()=>(window as any).atlasTest.files());
  expect(files.filter((f:any)=>f.path.includes('/Bibliothèque virtuelle/')&&f.path.endsWith('.md'))).toHaveLength(0);
});
test('A download survives closing the library, never opens a dialog and does not steal the current page',async({page})=>{
  const bytes=await publicationBytes('it');let release:()=>void=()=>{},calls=0;
  const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',async route=>{
    calls++;expect(new URL(route.request().url()).searchParams.get('pub')).toBe('it');await held;
    await route.fulfill({json:{pub:'it',pubName:'Étude perspicace des Écritures',files:{F:{JWPUB:[{pub:'it',filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/it.jwpub'}}]}}}});
  });
  await page.route('https://cfp2.jw-cdn.org/test/it.jwpub',route=>route.fulfill({body:bytes}));
  await page.locator('[data-download-key="it|"]').getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect.poll(()=>calls).toBe(1);
  await page.evaluate(async()=>{const {app,plugin}=(window as any).atlasTest;for(const leaf of [...app.workspace.getLeavesOfType('bible-lab-personal-library')])leaf.detach();await plugin.openStudyDesk();});
  release();
  await expect.poll(()=>page.evaluate(()=>(window as any).atlasTest.plugin.publicationDownloads.get('it').stage)).toBe('ready');
  await expect(page.locator('.blb-library')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  await expect(page.locator('[data-download-key="it|"]').getByRole('button',{name:'Lire',exact:true})).toBeVisible();
  expect(calls).toBe(1);
});
test('An interrupted installation removes only its new folder and keeps personal notes intact',async({page})=>{
  const bytes=await biblePublicationBytes();
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({json:{pub:'nwtsty',files:{F:{JWPUB:[{pub:'nwtsty',filesize:bytes.length,file:{url:'https://cfp2.jw-cdn.org/test/nwtsty.jwpub'}}]}}}}));
  await page.route('https://cfp2.jw-cdn.org/test/nwtsty.jwpub',route=>route.fulfill({body:bytes}));
  await page.evaluate(()=>{
    const {app}=(window as any).atlasTest;const create=app.vault.create.bind(app.vault);
    app.vault.create=async(path:string,value:any)=>{if(path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json'))throw Error('Espace insuffisant.');return create(path,value);};
  });
  const card=page.locator('[data-download-key="nwtsty|"]');
  await card.getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect(card.getByRole('alert')).toContainText('Espace insuffisant');
  const data=await page.evaluate(()=>({paths:(window as any).atlasTest.files().map((f:any)=>f.path),personal:(window as any).atlasTest.file('Mes notes/Une idée précieuse.md')}));
  expect(data.paths.some((p:string)=>p.includes('/Bibliothèque virtuelle/nwtsty_F/'))).toBe(false);
  expect(data.personal).toContain('Mon texte personnel');
});
test('Covers remain full height under native button styles, with no overlapping metadata in narrow panes',async({page})=>{
  await page.addStyleTag({content:'button{height:30px;white-space:nowrap;line-height:30px}'});
  for(const width of [260,390,820,1280]){
    await page.setViewportSize({width,height:900});
    for(const dark of [false,true]){
      await page.evaluate(d=>document.body.classList.toggle('theme-dark',d),dark);
      const root=page.locator('.blb-library');
      const geometry=await root.evaluate(el=>{
        const card=el.querySelector('.blb-book-card')!,cover=card.querySelector('.blb-cover-link')!,art=card.querySelector('.blb-cover')!,meta=card.querySelector('.blb-book-meta')!;
        return {width:el.clientWidth,scroll:el.scrollWidth,cover:cover.getBoundingClientRect().height,art:art.getBoundingClientRect().height,coverBottom:cover.getBoundingClientRect().bottom,metaTop:meta.getBoundingClientRect().top};
      });
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
      expect(geometry.cover).toBeGreaterThan(100);
      expect(Math.abs(geometry.cover-geometry.art)).toBeLessThanOrEqual(1);
      expect(geometry.metaTop).toBeGreaterThanOrEqual(geometry.coverBottom-1);
      if(width===390)await page.screenshot({path:'test-results/jwsd-fixed-library-'+(dark?'dark':'light')+'-'+test.info().project.name+'.png'});
    }
  }
});
