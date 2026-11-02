import { test, expect } from '@playwright/test';
import fixture from './fixtures/tiles.json' with { type: 'json' };

test('downloaded raster and vector tiles render after restart with the network disabled', async ({page}) => {
  let active=0,peak=0;
  await page.route('https://tiles.openfreemap.org/**',async route=>{
    active++; peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,15));
    const url=route.request().url();
    if (url.endsWith('/planet')) await route.fulfill({json:{tiles:['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf'],maxzoom:14}});
    else await route.fulfill({body:Buffer.from(url.endsWith('.png') ? fixture.relief : fixture.vector,'base64'),contentType:url.endsWith('.png') ? 'image/png' : 'application/x-protobuf'});
    active--;
  });
  await page.goto('/obsidian/dev/index.html'); await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.getByRole('button',{name:'Cartes hors connexion',exact:true}).click();
  const dialog=page.getByRole('dialog');
  for (const [label,value] of [['Ouest','35.2'],['Est','35.21'],['Sud','31.7'],['Nord','31.71']]) await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByLabel('Niveau de détail',{exact:true}).selectOption('5');
  await dialog.getByRole('button',{name:'Télécharger cette zone',exact:true}).click();
  await expect(dialog.getByRole('status')).toContainText('Zone disponible hors connexion');
  const first = await page.evaluate(()=>({state:(window as any).atlasTest.plugin.maps.getSnapshot(),requests:(window as any).atlasNetworkRequests,files:(window as any).atlasTest.files().map((f:any)=>({path:f.path,size:f.content.byteLength}))}));
  expect(first.state.regions[0].completed).toBe(first.state.regions[0].total);
  expect(first.files.some((f:any)=>f.path.endsWith('.pbf') && f.size>0)).toBe(true);
  expect(first.files.some((f:any)=>f.path.endsWith('.png') && f.size>0)).toBe(true);
  expect(peak).toBeLessThanOrEqual(4);
  expect(first.requests.every((r:any)=>r.headers['User-Agent'].startsWith('AtlasBibliqueObsidian/'))).toBe(true);
  await dialog.getByRole('button',{name:'Fermer les cartes hors connexion',exact:true}).click();
  await page.route('https://tiles.openfreemap.org/**',route=>route.abort());
  await page.evaluate(()=>(window as any).atlasTest.restart());
  await page.evaluate(()=>(window as any).atlasTest.plugin.openAtlas('place:jerusalem'));
  await expect(page.locator('.leaflet-tile canvas, canvas.leaflet-tile').first()).toBeAttached();
  await expect.poll(()=>page.evaluate(()=>{ const root=document.querySelector('.atlas-obsidian-surface')?.shadowRoot; return [...(root?.querySelectorAll('canvas.leaflet-tile') ?? [])].some((canvas:any)=>canvas.getContext('2d').getImageData(100,100,1,1).data[3]>0); })).toBe(true);
  expect(await page.evaluate(()=>(window as any).atlasNetworkRequests.length)).toBe(first.requests.length);
  expect(await page.evaluate(()=>(window as any).atlasTest.plugin.maps.getSnapshot().regions[0].status)).toBe('complete');
  await page.evaluate(()=>(window as any).atlasTest.plugin.maps.clear());
  expect(await page.evaluate(()=>(window as any).atlasTest.files().some((f:any)=>/\.(png|pbf)$/.test(f.path)))).toBe(false);
  expect(await page.evaluate(()=>(window as any).atlasTest.file('Mes notes/Une idée précieuse.md'))).toContain('Mon texte personnel');
});

test('failed downloads remain partial and oversized areas are rejected before a request', async ({page}) => {
  await page.route('https://tiles.openfreemap.org/**',route=>route.request().url().endsWith('/planet') ? route.fulfill({json:{tiles:['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf'],maxzoom:14}}) : route.fulfill({status:503,body:'unavailable'}));
  await page.goto('/obsidian/dev/index.html'); await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.maps.download('Essai interrompu',{west:35.2,east:35.21,south:31.7,north:31.71},5));
  const state=await page.evaluate(()=>(window as any).atlasTest.plugin.maps.getSnapshot());
  expect(state.busy).toBe(false); expect(state.regions[0].status).toBe('partial'); expect(state.error).toContain('503');
  await page.getByRole('button',{name:'Cartes hors connexion',exact:true}).click();
  const dialog=page.getByRole('dialog');
  for (const [label,value] of [['Ouest','-180'],['Est','180'],['Sud','-85'],['Nord','85']]) await dialog.getByLabel(label,{exact:true}).fill(value);
  await dialog.getByLabel('Niveau de détail',{exact:true}).selectOption('12');
  await expect(dialog.getByRole('button',{name:'Télécharger cette zone',exact:true})).toBeDisabled();
  await expect(dialog).toContainText('dépasse 3 000 tuiles');
});
