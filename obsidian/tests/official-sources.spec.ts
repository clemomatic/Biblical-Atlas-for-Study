import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'));
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

const dailyHtml='<html><body><main>'+
 '<h2>Dimanche 1<sup>er</sup>&nbsp;novembre</h2>'+
 '<p>Je n’éprouverai pas de rancœur (Jér. 3:12).</p>'+
 '<p>Les anciens s’efforcent d’imiter la compassion.</p>'+
 '<a href="https://wol.jw.org/fr/wol/d/r30/lp-f/202026250">26&nbsp;octobre – 1<sup>er</sup>&nbsp;novembre Cahier Vie et ministère</a>'+
 '<h1>26 OCTOBRE – 1<sup>er</sup> NOVEMBRE</h1>'+
 '<h2>JÉRÉMIE 47-48</h2>'+
 '<h2>JOYAUX DE LA PAROLE DE DIEU</h2><h3>1. Jéhovah est un juge juste et miséricordieux</h3><p>(10 min)</p>'+
 '<h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>4. Engage la conversation</h3>'+
 '<h2>VIE CHRÉTIENNE</h2><h3>7. Besoins de l’assemblée</h3>'+
 '</main></body></html>';

test('Daily Text and current meeting on WOL both appear in the homepage',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:dailyHtml}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Actualiser'}).click();
 await expect(pane.getByText('Je n’éprouverai pas de rancœur',{exact:false})).toBeVisible();
 await expect(pane.getByText('Jéhovah est un juge juste et miséricordieux',{exact:false})).toBeVisible();
 await expect(pane.getByText('Engage la conversation',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Préparer en note'})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Créer une méditation'})).toBeVisible();
});

test('JW.org monthly issue is used when the WOL page has only Daily Text',async({page})=>{
 const onlyDaily='<html><main><h2>Dimanche 1er novembre</h2>'+
  '<p>Je n’éprouverai pas de rancœur (Jér. 3:12).</p>'+
  '<p>La miséricorde est précieuse.</p></main></html>';
 const issue='<html><main><a href="/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-septembre-octobre-2026/Programme-pour-la-reunion-du-26-octobre-au-1er-novembre-2026/">'+
  '26 octobre – 1er novembre</a></main></html>';
 const meeting='<html><main><h1>26 octobre – 1er novembre</h1>'+
  '<h2>JOYAUX DE LA PAROLE DE DIEU</h2><h3>1. Jéhovah est un juge juste et miséricordieux</h3>'+
  '<h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>4. Engage la conversation</h3>'+
  '<h2>VIE CHRÉTIENNE</h2><h3>7. Besoins de l’assemblée</h3></main></html>';
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({status:200,contentType:'text/html',body:onlyDaily}));
 await page.route('https://www.jw.org/fr/**',route=>route.fulfill({status:200,contentType:'text/html',
   body:route.request().url().includes('Programme-')?meeting:issue}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Actualiser'}).click();
 await expect(pane.getByText('Je n’éprouverai pas de rancœur',{exact:false})).toBeVisible();
 await expect(pane.getByText('Jéhovah est un juge juste et miséricordieux',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Préparer en note'})).toBeVisible();
});

test('Official WOL search opens its actual page in Obsidian while quick article reading stays available',async({page})=>{
 const article='<html><main class="bodyTxt"><h1>La compassion de Jésus</h1>'+
  '<p>Jésus manifestait une compassion profonde envers autrui.</p></main></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642',route=>
  route.fulfill({status:200,contentType:'text/html',body:article}));
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.locator('input[type="search"]').first().fill('compassion');
 await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
 const url=await page.evaluate(()=>(window as any).atlasTest.app.workspace
   .getLeavesOfType('webviewer')[0].view.getState().url);
 expect(new URL(url).searchParams.get('q')).toBe('compassion');
 await pane.locator('input[type="search"]').first().fill('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642');
 await pane.getByRole('button',{name:'Lire dans le panneau'}).click();
 await expect(pane.getByText('Jésus manifestait une compassion profonde envers autrui.')).toBeVisible();
});

test('WOL HTTP 403 does not prevent opening real WOL search in Obsidian Web viewer',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({
   status:403,contentType:'text/html',body:'<html>Access denied</html>'}));
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.locator('input[type="search"]').first().fill('compassion');
 await pane.getByRole('button',{name:'Rechercher dans WOL',exact:true}).first().click();
 await expect(page.locator('.mock-core-webviewer')).toHaveCount(1);
 await expect(pane.getByText(/aucun résultat exploitable/i)).toHaveCount(0);
});
