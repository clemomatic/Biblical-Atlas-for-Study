import {test,expect,type Page} from '@playwright/test';

async function desk(page:Page,destination='home'){
  await page.evaluate(async d=>{
    const {app,plugin}=(window as any).atlasTest;
    for(const leaf of [...app.workspace.getLeavesOfType('atlas-biblique')])leaf.detach();
    await plugin.openStudyDesk(d);
  },destination);
  return page.locator('.jwsd-workspace');
}
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('The branded desk works offline and opens real personal notes',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const root=await desk(page);
  await expect(root.getByRole('heading',{name:'Prenez le temps d’approfondir.'})).toBeVisible();
  await expect(root.locator('.jwsd-tool-card')).toHaveCount(6);
  await expect(root).not.toContainText('Bible Lab');
  const fonts=await root.evaluate(async el=>{
    await document.fonts.ready;
    const image=el.querySelector<HTMLImageElement>('.jwsd-toolbar-label img')!;
    return {inter:document.fonts.check('400 13px "JWSD Inter"'),montserrat:document.fonts.check('700 25px "JWSD Montserrat"'),logo:image.complete&&image.naturalWidth>0,
      family:getComputedStyle(el.querySelector('h1')!).fontFamily};
  });
  expect(fonts.inter&&fonts.montserrat&&fonts.logo).toBe(true);
  expect(fonts.family).toContain('JWSD Montserrat');
  await root.getByRole('button',{name:'Ouvrir la note Une idée précieuse',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened)).toBe('Mes notes/Une idée précieuse.md');
  expect(errors).toEqual([]);
});

test('Notes remain distinct from generated publication sources and annotations',async({page})=>{
  await page.evaluate(async()=>{
    const {app}=(window as any).atlasTest;
    await app.vault.create('Mes notes/Une amitié durable.md','# Une amitié\nMon idée.');
    await app.vault.create('Mon étude/Source.md','---\nbible_lab_kind: jwpub-document\n---\nUn document public.');
  });
  const root=await desk(page,'notes');
  await expect(root.getByRole('button',{name:'Ouvrir la note Source'})).toHaveCount(0);
  await root.getByRole('searchbox',{name:'Rechercher dans mes notes'}).fill('amitie');
  await expect(root.locator('.jwsd-note-row')).toHaveCount(1);
  await root.getByRole('button',{name:'Ouvrir la note Une amitié durable'}).click();
  expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened)).toBe('Mes notes/Une amitié durable.md');
  await root.getByRole('button',{name:'Mes annotations JW Library',exact:true}).click();
  await expect(page.locator('.blb-library').getByRole('heading',{name:'Mes notes et surlignages JW Library'})).toBeVisible();
});

test('Search from the desk retains the requested scope and opens WOL',async({page})=>{
  const root=await desk(page,'search');
  await root.getByRole('searchbox',{name:'Rechercher dans JW Study Desk'}).fill('amitié');
  await root.getByRole('button',{name:'Guide de recherche',exact:true}).click();
  await expect(root.getByRole('searchbox')).toHaveValue('amitié');
  await root.getByRole('button',{name:'Rechercher',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).atlasWebviewerUrls?.at(-1)||'')).toContain('amit');
  const urls=await page.evaluate(()=>(window as any).atlasWebviewerUrls);
  expect(new URL(urls.at(-1)).searchParams.get('fc[]')).toBe('dx');
});

test('Idea and inbox routes edit the existing collection without duplicating it',async({page})=>{
  await page.evaluate(async()=>{
    const {plugin}=(window as any).atlasTest;
    await plugin.saveResearchCollection({version:1,captures:[{id:'capture',label:'Une source précise',excerpt:'Mon extrait',url:'https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3',comment:'À explorer',planId:null,createdAt:1}],ideas:[{id:'idea',statement:'La patience renforce l’amitié',captureIds:[],planId:null,createdAt:1,updatedAt:1}]});
  });
  const root=await desk(page,'ideas');
  await root.getByRole('button',{name:'Ouvrir l’idée La patience renforce l’amitié'}).click();
  const side=page.locator('.biblelab-side');
  await expect(side.getByRole('textbox',{name:'Phrase principale de l’idée'})).toHaveValue('La patience renforce l’amitié');
  await expect(side.locator('.biblelab-idea-card')).toHaveCount(1);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openStudyDesk('inbox'));
  await root.getByRole('button',{name:'Ouvrir la trouvaille Une source précise'}).click();
  await expect(side.locator('[data-capture-id="capture"]').first()).toBeVisible();
  const collection=await page.evaluate(()=>(window as any).atlasTest.plugin.getResearchCollection());
  expect(collection.captures).toHaveLength(1);expect(collection.ideas).toHaveLength(1);
});

test('The desk exposes saved preferences and creates a real talk outline',async({page})=>{
  const root=await desk(page,'settings');
  await root.getByRole('textbox',{name:'Dossier des recherches'}).fill('Mes études');
  await expect.poll(()=>page.evaluate(()=>(window as any).__savedSettings?.noteFolder)).toBe('Mes études');
  await page.evaluate(()=>(window as any).atlasTest.plugin.openStudyDesk('preparation'));
  await root.getByRole('button',{name:'Créer un plan de discours',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveClass(/jwsd-theme/);
  const modal=page.getByRole('dialog');
  await expect(modal.getByRole('heading',{name:/discours/i})).toBeVisible();
  await modal.getByRole('textbox',{name:'Titre',exact:true}).fill('Cultiver une amitié durable');
  await modal.getByRole('button',{name:'Créer le plan',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened)).toBe('Mes études/Discours/Cultiver une amitié durable.md');
  expect(await page.evaluate(()=>(window as any).atlasTest.file('Mes études/Discours/Cultiver une amitié durable.md'))).toContain('bible_lab_kind: discourse');
});

test('Light and dark layouts preserve contrast and fit the available pane',async({page})=>{
  for(const dark of [false,true]){
    await page.evaluate(d=>document.body.classList.toggle('theme-dark',d),dark);
    const root=await desk(page);
    await expect(root.getByRole('heading',{name:'Prenez le temps d’approfondir.'})).toBeVisible();
    expect(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    const colors=await root.evaluate(el=>{
      const s=getComputedStyle(el);return {ink:s.getPropertyValue('--jwsd-ink').trim(),bg:s.getPropertyValue('--jwsd-bg').trim()};
    });
    expect(colors.bg).toBe(dark?'#111021':'#f7f5fc');
    expect(colors.ink).toBe(dark?'#f6f3ff':'#211b3c');
    const luminance=(hex:string)=>{
      const rgb=hex.slice(1).match(/../g)!.map(value=>parseInt(value,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
      return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
    };
    const a=luminance(colors.ink),b=luminance(colors.bg);
    expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toBeGreaterThan(4.5);
    await page.screenshot({path:'test-results/jw-study-desk-'+(dark?'dark':'light')+'-'+test.info().project.name+'.png'});
  }
});

test('Mobile navigation stays reachable while scrolling and the Plus menu opens real pages',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const root=await desk(page);
  const nav=root.getByRole('navigation',{name:'Navigation mobile JW Study Desk'});
  await expect(nav).toBeVisible();
  await root.locator('.jwsd-stage').evaluate(el=>el.scrollTop=el.scrollHeight);
  await expect(nav.getByRole('button',{name:'Plus',exact:true})).toBeInViewport();
  await nav.getByRole('button',{name:'Plus',exact:true}).click();
  await page.getByRole('menu').getByRole('button',{name:'Fiches d’idées',exact:true}).click();
  await expect(root.getByRole('heading',{name:'Fiches d’idées',exact:true})).toBeVisible();
  await nav.getByRole('button',{name:'Ouvrir accueil',exact:true}).click();
  await expect(root.getByRole('heading',{name:'Prenez le temps d’approfondir.'})).toBeVisible();
  expect(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
