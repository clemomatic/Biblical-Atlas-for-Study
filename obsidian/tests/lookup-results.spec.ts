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

for(const [citation,id] of [
 ['w19 juillet p. 17','2019555'],
 ['km 7/15 1','2015771'],
 ['it-2 450','1200490450'],
 ['si 142-143','1101990088']
] as const){
 test('A unique WOL lookup result opens the article for '+citation,async({page})=>{
  await page.route('https://wol.jw.org/fr/wol/l/**',route=>
   route.fulfill({status:200,contentType:'text/html',body:
    '<html><body><header><a href="/fr/wol/d/r30/lp-f/1999999">Navigation</a></header>'+
    '<div id="lookupResults"><div class="result">'+
    '<a href="/fr/wol/d/r30/lp-f/'+id+'">Article correspondant</a>'+
    '<p>Publication trouvée par le moteur de recherche WOL.</p></div></div></body></html>'}));
  await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/'+id,route=>
   route.fulfill({status:200,contentType:'text/html',body:
    '<html><article class="bodyTxt"><h1>Article recherché</h1>'+
    '<p>Premier paragraphe du texte intégral de cet article.</p>'+
    '<p>Deuxième paragraphe du texte intégral de cet article.</p></article></html>'}));
  await page.evaluate(q=>(window as any).atlasTest.plugin.openBibleLab(q),citation);
  const pane=page.locator('.biblelab-side');
  await expect(pane).toContainText('Premier paragraphe du texte intégral');
  await expect(pane).not.toContainText('Publication trouvée par le moteur');
  await expect(pane).not.toContainText('Navigation');
 });
}
test('Multiple lookup articles remain choices, never silently select first result',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<html><main><nav>Menu WOL</nav><div id="lookupResults">'+
    '<article class="result"><a href="/fr/wol/d/r30/lp-f/1200002001">Premier article</a>'+
    '<p>Le premier résultat décrit ce sujet dans une publication.</p></article>'+
    '<article class="result"><a href="/fr/wol/d/r30/lp-f/1200002002">Deuxième article</a>'+
    '<p>Le second résultat offre une autre étude sur ce sujet.</p></article>'+
    '</div></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<article class="bodyTxt"><p>MAUVAIS ARTICLE OUVERT SANS CHOIX</p></article>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-2 927'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Premier article');
 await expect(pane).toContainText('Deuxième article');
 await expect(pane).not.toContainText('MAUVAIS ARTICLE OUVERT');
});
