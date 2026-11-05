import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Opt-in discovery shows official cover cards but never downloads a publication automatically',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await expect(library.getByText('Une bibliothèque à toi')).toBeVisible();
  await library.getByRole('button',{name:'Explorer JW.org'}).click();
  await expect(library.getByRole('heading',{name:'Découvrir sur JW.org'})).toBeVisible();
  await expect(library.locator('.blb-online-book')).toHaveCount(11);
  await library.getByRole('button',{name:'Assemblées'}).click();
  await expect(library.locator('.blb-online-book')).toHaveCount(3);
  await expect(library.locator('.blb-online-book').first()).toContainText('JWPUB à vérifier');
  const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests||[]);
  expect(requests.filter((r:any)=>r.url.includes('GETPUBMEDIALINKS'))).toHaveLength(0);
  await page.screenshot({path:'test-results/bible-lab-preview-jworg-catalog.png'});
  await library.getByRole('button',{name:'Mes publications'}).click();
  await expect(library.getByText('Une bibliothèque à toi')).toBeVisible();
});

test('Magazine verification preserves its exact issue in the official API request',async({page})=>{
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>
    route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      pub:'w',issue:'202609',pubName:'La Tour de Garde',
      files:{F:{JWPUB:[{filesize:200,file:{
        url:'https://cfp2.jw-cdn.org/example.jwpub',checksum:'abc'
      }}]}}})}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await library.getByRole('button',{name:'Explorer JW.org'}).click();
  const card=library.locator('.blb-online-book').filter({hasText:'septembre 2026'});
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:'Vérifier le JWPUB'}).click();
  await expect(page.getByRole('button',{name:'Télécharger et préparer'})).toBeVisible();
  const queries=await page.evaluate(()=>(window as any).atlasNetworkRequests
    .filter((r:any)=>r.url.includes('GETPUBMEDIALINKS')).map((r:any)=>r.url));
  expect(queries).toHaveLength(1);
  expect(new URL(queries[0]).searchParams.get('pub')).toBe('w');
  expect(new URL(queries[0]).searchParams.get('issue')).toBe('202609');
});

test('Official HTML can add newly discovered publication codes; blocked pages keep curated selection',async({page})=>{
  const html='<html><body><div class="publication-card">'+
    '<a aria-label="Options de téléchargement des publications numériques Étude perspicace" '+
    'href="https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=it-1&langwritten=F&fileformat=PDF%2CJWPUB">Télécharger</a>'+
    '<img src="https://cms-imgp.jw-cdn.org/img/p/it-1/F/pt/it-1_F_lg.jpg"></div></body></html>';
  await page.route('https://www.jw.org/fr/biblioth%C3%A8que/',route=>
    route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await library.getByRole('button',{name:'Explorer JW.org'}).click();
  await library.getByRole('button',{name:'Actualiser depuis JW.org'}).click();
  await expect(library.locator('.blb-online-book').filter({hasText:'Étude perspicace'})).toBeVisible();
  await expect(library.locator('.blb-online-book')).toHaveCount(12);
  await library.getByRole('searchbox',{name:'Rechercher dans ma bibliothèque'}).fill('perspicace');
  await expect(library.locator('.blb-online-book')).toHaveCount(1);
});
