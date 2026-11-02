import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('WOL lookupResults text is shown, while the surrounding navigation is never rendered',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
   route.fulfill({status:200,contentType:'text/html',
     body:'<html><body><h1>BIBLIOTHÈQUE EN LIGNE</h1>'+
     '<aside><p>BIBLE</p><p>PUBLICATIONS</p><p>RÉUNIONS</p></aside>'+
     '<div id="lookupResults"><div class="resultContent">'+
     '<h2>Article d’étude sur le sujet demandé</h2>'+
     '<p>Le paragraphe significatif figure dans le résultat bibliographique.</p>'+
     '<p>La deuxième partie est bien du texte réel de la publication.</p>'+
     '</div></div></body></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 142-143'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Le paragraphe significatif figure');
 await expect(pane).toContainText('La deuxième partie est bien du texte réel');
 await expect(pane).not.toContainText('PUBLICATIONS');
 await expect(pane).not.toContainText('RÉUNIONS');
 await expect(pane).toContainText('Résultat affiché par WOL');
});

test('A lookup result with a verified direct WOL link opens its full article',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
   route.fulfill({status:200,contentType:'text/html',
     body:'<html><body><h1>Consulter</h1><div id="lookupResults">'+
      '<article class="result"><h2>Actes</h2>'+
      '<a href="/fr/wol/d/r30/lp-f/1101990105">Actes — si p. 199-205</a>'+
      '<p>Une description courte de l’article recherché.</p></article>'+
      '</div></body></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1101990105',route=>
   route.fulfill({status:200,contentType:'text/html',
     body:'<html><article class="bodyTxt"><h1>Actes</h1>'+
      '<p>La lecture complète de l’article apparaît dans la popup.</p>'+
      '<p>Deuxième paragraphe complet de l’étude.</p></article></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 203-205'));
 await expect(page.locator('.biblelab-side')).toContainText(
   'La lecture complète de l’article apparaît');
 await expect(page.locator('.biblelab-side')).not.toContainText('Une description courte');
});

test('An empty lookupResults does not expose WOL navigation as article text',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<html><body><div id="lookupResults"></div>'+
    '<main><h1>Consulter</h1><p>BIBLE</p><p>PUBLICATIONS</p><p>RÉUNIONS</p></main></body></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 142-143'));
 await expect(page.locator('.biblelab-side')).not.toContainText('PUBLICATIONS');
});
