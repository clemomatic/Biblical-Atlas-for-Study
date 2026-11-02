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

test('si uses verified article page metadata, not search-result menu text',async({page})=>{
 const calls:number[]=[];
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/**',route=>{
  const doc=Number(route.request().url().split('/').at(-1));
  calls.push(doc);
  if(doc<1101990061||doc>1101990137)return route.abort();
  const first=7+(doc-1101990061)*4;
  return route.fulfill({status:200,contentType:'text/html',
   body:article('si p. '+first+'-'+(first+3),'Étude de la Bible')});
 });
 await page.route('https://wol.jw.org/fr/wol/l/**',
  route=>route.fulfill({status:200,contentType:'text/html',
   body:'<html><article class="bodyTxt"><h1>Consulter</h1>'+
     '<p>Menu WOL de navigation</p><p>BIBLE</p><p>PUBLICATIONS</p></article></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 81-82'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Premier paragraphe du vrai texte officiel');
 await expect(pane).not.toContainText('Menu WOL');
 // Binary discovery must not request the 77-article book in full.
 expect(calls.length).toBeLessThanOrEqual(12);
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

test('SI adjacent printed pages choose document containing the full span',async({page})=>{
 const visited:number[]=[];
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/**',route=>{
   const doc=Number(route.request().url().split('/').at(-1));
   visited.push(doc);
   // Shared printed page at every boundary: 7-11, 11-15, etc.
   const first=7+(doc-1101990061)*4;
   return route.fulfill({status:200,contentType:'text/html',
    body:article('si p. '+first+'-'+(first+4),'Page réellement couverte')});
 });
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:'<h1>Consulter</h1>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 20-22'));
 await expect(page.locator('.biblelab-side')).toContainText('Premier paragraphe du vrai texte officiel');
 expect(visited.length).toBeLessThan(12);
});
