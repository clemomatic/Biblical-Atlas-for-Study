import {test,expect} from '@playwright/test';

const article=(citation:string,title:string)=>
 '<html><body><article class="bodyTxt">'+
 '<h1>'+title+'</h1><div class="pubRef">'+citation+'</div>'+
 '<p>Premier paragraphe du vrai texte officiel.</p>'+
 '<p>Deuxième paragraphe de lecture sans menu de navigation.</p>'+
 '<p>Troisième paragraphe du document recherché.</p></article></body></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Insight uses official topic-index heading page ranges, not unrelated subtopic links',async({page})=>{
 const index='<html><body><article class="bodyTxt">'+
  '<h1>INDEX PAR SUJETS</h1>'+
  '<h2>Ancien, homme d’âge mûr <a href="/fr/wol/pc/r30/lp-f/1200004775/94/0">1:116-119</a></h2>'+
  '<p>autre sujet : <a href="/fr/wol/pc/r30/lp-f/1200004775/94/2">1:118</a></p>'+
  '<h2>Tableau <a href="/fr/wol/pc/r30/lp-f/1200004775/94/4">2:116-119</a></h2>'+
  '</article></body></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200004775',
  route=>route.fulfill({status:200,contentType:'text/html',body:index}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1200004775/94/0',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:article('it-1 « Ancien, homme d’âge mûr »','ANCIEN, HOMME D’ÂGE MÛR')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:'<html><div class="bodyTxt"><p>Menu WOL</p><p>Publications</p><p>Réunions</p></div></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 118 § 1'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Premier paragraphe du vrai texte officiel');
 await expect(pane).not.toContainText('Menu WOL');
});

test('Insight resolves volume 2 without substituting the same page of volume 1',async({page})=>{
 const index='<html><h1>INDEX</h1>'+
  '<h2>Source volume 1 <a href="/fr/wol/pc/r30/lp-f/1200004775/45/0">1:450-453</a></h2>'+
  '<h2>Source volume 2 <a href="/fr/wol/pc/r30/lp-f/1200004775/45/1">2:450-452</a></h2></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200004775',
  route=>route.fulfill({status:200,contentType:'text/html',body:index}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1200004775/45/1',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:article('it-2 « Or »','OR')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-2 450'));
 await expect(page.locator('.biblelab-side')).toContainText('Premier paragraphe du vrai texte officiel');
});

test('si follows the real table of contents, then validates the article page span',async({page})=>{
 const contents='<html><p>75 <a href="/fr/wol/pc/r30/lp-f/1101990140/13/0">13 1 Chroniques</a></p>'+
  '<p>80 <a href="/fr/wol/pc/r30/lp-f/1101990140/14/0">14 2 Chroniques</a></p>'+
  '<p>85 <a href="/fr/wol/pc/r30/lp-f/1101990140/15/0">15 Ezra</a></p></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1101990140',
  route=>route.fulfill({status:200,contentType:'text/html',body:contents}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1101990140/14/0',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:article('si p. 80-84','Livre de la Bible numéro 14 — 2 Chroniques')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',
  route=>route.fulfill({status:200,contentType:'text/html',
   body:'<html><article class="bodyTxt"><h1>Consulter</h1>'+
     '<p>Menu WOL</p><p>BIBLE</p><p>PUBLICATIONS</p></article></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 81-82'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Premier paragraphe du vrai texte officiel');
 await expect(pane).not.toContainText('Menu WOL');
});

test('A non-matching SI document is never rendered as a successful article',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:article('si p. 5-6','Autre partie de la publication')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<html><article class="bodyTxt"><h1>Consulter</h1>'+
    '<p>WOL BIBLE</p><p>PUBLICATIONS</p><p>RÉUNIONS</p></article></html>'}));
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<html><h1>Rechercher</h1></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 180-183'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).not.toContainText('Autre partie de la publication');
 await expect(pane).not.toContainText('WOL BIBLE');
});

test('Direct WOL document route returning only a navigation menu cannot pass as an article',async({page})=>{
 const fakeDoc='https://wol.jw.org/fr/wol/d/r30/lp-f/1200001021';
 await page.route(fakeDoc,route=>route.fulfill({status:200,
   contentType:'text/html',
   body:'<html><article class="bodyTxt"><h1>Consulter</h1>'+
    '<p>La Bible</p><p>Publications</p><p>Réunions</p>'+
    '<p>Les publications disponibles et la navigation WOL.</p></article></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 510 § 3-4'));
 await expect(page.locator('.biblelab-side')).not.toContainText(
   'Les publications disponibles et la navigation WOL.');
});

test('SI shared printed page is resolved by the full article page span',async({page})=>{
 const contents='<html><p>13 <a href="/fr/wol/pc/r30/lp-f/1101990140/1/0">1 Genèse</a></p>'+
  '<p>19 <a href="/fr/wol/pc/r30/lp-f/1101990140/2/0">2 Exode</a></p>'+
  '<p>25 <a href="/fr/wol/pc/r30/lp-f/1101990140/3/0">3 Lévitique</a></p></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1101990140',
  route=>route.fulfill({status:200,contentType:'text/html',body:contents}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1101990140/2/0',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:article('si p. 19-25','Exode')}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1101990140/1/0',
  route=>route.fulfill({status:200,contentType:'text/html',
    body:article('si p. 13-19','Genèse')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',
  route=>route.fulfill({status:200,contentType:'text/html',body:'<h1>Consulter</h1>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 20-22'));
 await expect(page.locator('.biblelab-side')).toContainText('Premier paragraphe du vrai texte officiel');
});

test('A titled Insight citation resolves through index heading rather than WOL lookup menu',async({page})=>{
 const index='<html><h2>Sanctuaire '+
  '<a href="/fr/wol/pc/r30/lp-f/1200004775/25/0">2:881-883</a></h2>'+
  '<h2>Autre sanctuaire '+
  '<a href="/fr/wol/pc/r30/lp-f/1200004775/26/0">2:990-991</a></h2></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200004775',route=>
  route.fulfill({status:200,contentType:'text/html',body:index}));
 await page.route('https://wol.jw.org/fr/wol/pc/r30/lp-f/1200004775/25/0',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:article('it-2 « Sanctuaire »','SANCTUAIRE')}));
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>
  route.fulfill({status:200,contentType:'text/html',
   body:'<h1>Consulter</h1><p>Menu de la bibliothèque</p>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-2 « Sanctuaire » § 1'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Premier paragraphe du vrai texte officiel');
 await expect(pane).not.toContainText('Menu de la bibliothèque');
});
