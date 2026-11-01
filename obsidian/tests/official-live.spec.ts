import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.clock.install({time:new Date('2026-11-02T12:00:00Z')});
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

const WOL_DAY='<html><main class="bodyTxt"><h2>Lundi 2&nbsp;novembre</h2>'+
 '<div><p>Si l’un de vous manque de sagesse, qu’il la demande à Dieu (Jacq. 1:5).</p>'+
 '<p>Les serviteurs de Dieu cherchent la sagesse avec humilité.</p></div>'+
 '<a href="/fr/wol/d/r30/lp-f/202026403">2-8 novembre Cahier Vie et ministère (2026)</a>'+
 '<h1>2-8 NOVEMBRE</h1><h2>JÉRÉMIE 49-50</h2>'+
 '<h3>Cantique 1 et prière | Paroles d’introduction (1 min)</h3>'+
 '<h2>JOYAUX DE LA PAROLE DE DIEU</h2>'+
 '<h3>1. Aidons les autres à bénéficier de la miséricorde de Jéhovah</h3>'+
 '<h3>2. Perles spirituelles</h3><h3>3. Lecture de la Bible</h3>'+
 '<h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>4. Engage la conversation</h3>'+
 '<h2>VIE CHRÉTIENNE</h2><h3>7. Besoins de l’assemblée</h3>'+
 '<h3>8. Étude biblique de l’assemblée</h3>'+
 '<h3>Article d’étude (2-8 novembre 2026)</h3></main></html>';

test('Actual WOL daily+week shape loads both panels from one official page',async({page})=>{
 let wolCalls=0;
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>{
  wolCalls++;return route.fulfill({status:200,contentType:'text/html',body:WOL_DAY});
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Actualiser'}).click();
 await expect(pane.getByText(/Si l’un de vous manque de sagesse/)).toBeVisible();
 await expect(pane.getByText('Aidons les autres à bénéficier de la miséricorde de Jéhovah',{exact:false})).toBeVisible();
 await expect(pane.getByText('Engage la conversation',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Préparer en note'})).toBeVisible();
 expect(wolCalls).toBe(1);
});

test('When WOL has only Daily Text, retrieve week from the JW.org publication',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<html><main><h2>Lundi 2 novembre</h2><p>Un verset pour la journée.</p><p>Une pensée biblique.</p></main></html>'
 }));
 const issue='https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/mwb-novembre-decembre-2026/';
 const programme=issue+'Programme-pour-la-r%C3%A9union-Vie-et-minist%C3%A8re-du-2-au-8-novembre-2026/';
 await page.route('https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/**',route=>
  route.fulfill({status:200,contentType:'text/html',body:route.request().url()===issue?
    '<html><main><a href="'+programme+'">2-8 novembre</a></main></html>':
    '<html><main><h1>2-8 NOVEMBRE</h1><h2>JÉRÉMIE 49-50</h2><h2>JOYAUX DE LA PAROLE DE DIEU</h2><h3>1. L’humilité dans le service</h3><h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>2. Engage la conversation</h3><h2>VIE CHRÉTIENNE</h2><h3>3. Étude biblique</h3></main></html>'}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Actualiser'}).click();
 await expect(pane.getByText('Un verset pour la journée.',{exact:false})).toBeVisible();
 await expect(pane.getByText('L’humilité dans le service',{exact:false})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Préparer en note'})).toBeVisible();
});

test('Network unavailability displays a clear failure with official source links',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({status:403,body:'Access denied'}));
 await page.route('https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/**',route=>route.fulfill({status:503,body:'Unavailable'}));
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Actualiser'}).click();
 await expect(pane.getByText(/WOL HTTP 403/).first()).toBeVisible();
 await expect(pane.getByText(/JW.org HTTP 503/).first()).toBeVisible();
 await expect(pane.getByRole('button',{name:'Lire sur WOL'})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Voir la réunion'})).toBeVisible();
 await expect(pane.getByRole('button',{name:'Préparer en note'})).toHaveCount(0);
});
