import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'));
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Daily Text and weekly meeting load automatically on sidebar opening',async({page})=>{
 let dailyCalls=0;
 const html='<html><main><h2>Dimanche 1er novembre</h2>'+
 '<p>Heureux ceux qui sont doux (Mat. 5:5).</p>'+
 '<p>Cette pensée mérite notre méditation.</p>'+
 '<h2>26 octobre – 1er novembre</h2>'+
 '<h2>JOYAUX DE LA PAROLE DE DIEU</h2><h3>1. Cherchons la sagesse</h3>'+
 '<h2>APPLIQUE-TOI AU MINISTÈRE</h2><h3>2. Engage la conversation</h3>'+
 '<h2>VIE CHRÉTIENNE</h2><h3>3. Étude biblique de l’assemblée</h3>'+
 '</main></html>';
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>{
  dailyCalls++;
  return route.fulfill({status:200,contentType:'text/html',body:html});
 });
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Heureux ceux qui sont doux',{exact:false})).toBeVisible();
 await expect(pane.getByText('Cherchons la sagesse')).toBeVisible();
 expect(dailyCalls).toBe(1);
 await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
 await pane.locator('.biblelab-tab[aria-label="Accueil"]').click();
 expect(dailyCalls).toBe(1);
});

test('Ecclésiaste 4:6 can load from compact WOL verse ID after JW JSON is unavailable',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/21/4',route=>
   route.fulfill({status:200,contentType:'text/html',body:
     '<html><main id="content"><h1>Ecclésiaste 4</h1>'+
     '<p id="v21004006">6 Mieux vaut une poignée de repos que deux poignées de dur travail et de poursuite du vent.</p>'+
     '<p id="v21004007">7 Voici le verset suivant.</p></main></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Ecclésiaste 4:6'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Mieux vaut une poignée de repos',{exact:false})).toBeVisible();
 await expect(pane.getByText('Voici le verset suivant.')).toHaveCount(0);
});

test('WOL can isolate a verse marked by a span within a multi-verse paragraph',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/21/4',route=>
   route.fulfill({status:200,contentType:'text/html',body:
     '<html><main id="content"><h1>Ecclésiaste 4</h1><p>'+
     '<span id="v21004005">5</span> Le précédent verset. '+
     '<span id="v21004006">6</span> Mieux vaut une poignée de repos. '+
     '<span id="v21004007">7</span> Le verset suivant.</p></main></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Ecclésiaste 4:6'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Mieux vaut une poignée de repos.')).toBeVisible();
 await expect(pane.getByText('Le précédent verset.')).toHaveCount(0);
 await expect(pane.getByText('Le verset suivant.')).toHaveCount(0);
});

test('WOL matches pages 24-26 to a longer February 2018 article spanning pages 23-27',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:200,contentType:'text/html',body:'<html><main><h1>Recherche bibliographique</h1></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>
  route.fulfill({status:200,contentType:'text/html',body:
   '<html><main><ul>'+
   '<li><a href="/fr/wol/d/r30/lp-f/2018286">Que signifie être une personne spirituelle ?</a>'+
   '<p>w18 février p. 18-22</p></li>'+
   '<li><a href="/fr/wol/d/r30/lp-f/2018287">Deviens plus fort spirituellement !</a>'+
   '<p>w18 février p. 23-27</p></li></ul></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2018287',route=>
  route.fulfill({status:200,contentType:'text/html',body:
   '<html><main class="bodyTxt"><h1>Deviens plus fort spirituellement !</h1>'+
   '<p>Un premier paragraphe sur la spiritualité.</p>'+
   '<p>Une méditation sur la famille.</p></main></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('w18 février p. 24-26'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Un premier paragraphe sur la spiritualité.')).toBeVisible();
 await expect(pane.getByText('Une méditation sur la famille.')).toBeVisible();
});


test('Guide lesson lmd 11 opens its verified WOL document when lookup endpoints fail',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:404,body:'<html><body>Non disponible</body></html>'}));
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>
  route.fulfill({status:429,body:'<html><body>Trop de demandes</body></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1102023311',route=>
  route.fulfill({status:200,contentType:'text/html',
    body:'<html><main class="bodyTxt"><h1>Rester simple</h1>'+
      '<p>L’exemple de Jésus montre la valeur de la simplicité.</p>'+
      '<p>Nous pouvons parler avec clarté et tact.</p></main></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('lmd 11'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('L’exemple de Jésus montre la valeur de la simplicité.')).toBeVisible();
 await expect(pane.getByText('Nous pouvons parler avec clarté et tact.')).toBeVisible();
});
