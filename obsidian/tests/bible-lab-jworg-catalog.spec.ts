import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('Public covers are immediately useful without automatically downloading publication contents',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await expect(library.locator('.blb-book-card')).toHaveCount(13);
  await library.getByRole('button',{name:'Assemblées',exact:true}).click();
  await expect(library.locator('.blb-book-card')).toHaveCount(4);
  await expect(library.locator('.blb-card-actions button').first()).toHaveText('Télécharger');
  const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests||[]);
  expect(requests.filter((r:any)=>r.url.includes('GETPUBMEDIALINKS'))).toHaveLength(0);
  await page.screenshot({path:'test-results/bible-lab-preview-jworg-catalog.png'});
});
test('Magazine download details preserve the exact issue and stay in the cover menu',async({page})=>{
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pub:'w',issue:'202609',pubName:'La Tour de Garde',files:{F:{JWPUB:[{filesize:200,file:{url:'https://cfp2.jw-cdn.org/example.jwpub'}}]}}})}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await library.getByRole('searchbox').fill('septembre 2026');
  const card=library.locator('.blb-book-card');
  await expect(card).toHaveCount(1);
  await card.getByRole('button',{name:/Options de/}).click();
  await page.getByRole('button',{name:'Détails du téléchargement'}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Télécharger',exact:true})).toBeVisible();
  const queries=await page.evaluate(()=>(window as any).atlasNetworkRequests.filter((r:any)=>r.url.includes('GETPUBMEDIALINKS')).map((r:any)=>r.url));
  expect(queries).toHaveLength(1);expect(new URL(queries[0]).searchParams.get('issue')).toBe('202609');
});
test('Refreshing an unavailable catalogue keeps every fallback and local publication',async({page})=>{
  await page.evaluate(()=>(window as any).atlasTest.plugin.openVisualLibrary());
  const library=page.locator('.blb-library');
  await expect(library.locator('.blb-catalog-notice')).toBeVisible();
  await library.getByRole('button',{name:'Options de la bibliothèque'}).click();
  await page.getByRole('button',{name:'Actualiser les publications'}).click();
  await expect(library.locator('.blb-catalog-notice')).toBeVisible();
  await expect(library.locator('.blb-book-card')).toHaveCount(13);
  await library.getByRole('button',{name:'Bible',exact:true}).click();
  await expect(library.locator('.blb-book-card')).toHaveCount(2);
});
test('An official media link remains available in advanced import options',async({page})=>{
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pub:'w',issue:'202701',pubName:'La Tour de Garde',files:{F:{JWPUB:[{filesize:100,file:{url:'https://cfp2.jw-cdn.org/test/w_F_202701.jwpub'}}]}}})}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openNativeBridge());
  await page.getByText('Options avancées',{exact:true}).click();
  await page.getByRole('button',{name:'Trouver une publication par son code'}).click();
  await page.getByRole('textbox',{name:'Code ou lien officiel de téléchargement'}).fill('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?pub=w&issue=202701&langwritten=F&fileformat=PDF%2CJWPUB');
  await page.locator('.biblelab-offline-manual').getByRole('button',{name:'Vérifier'}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Télécharger',exact:true})).toBeVisible();
  const urls=await page.evaluate(()=>(window as any).atlasNetworkRequests.filter((r:any)=>r.url.includes('GETPUBMEDIALINKS')).map((r:any)=>r.url));
  expect(urls).toHaveLength(1);expect(new URL(urls[0]).searchParams.get('pub')).toBe('w');
  expect(new URL(urls[0]).searchParams.get('issue')).toBe('202701');
});
