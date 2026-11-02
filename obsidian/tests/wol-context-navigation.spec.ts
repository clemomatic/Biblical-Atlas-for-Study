import {test,expect} from '@playwright/test';

const context='https://wol.jw.org/fr/wol/pc/r30/lp-f/1200004775/94/0';
const direct='https://wol.jw.org/fr/wol/d/r30/lp-f/1200001021';
const bibleContext='https://wol.jw.org/fr/wol/bc/r30/lp-f/1200001021/0/0';
const chapter='https://wol.jw.org/fr/wol/b/r30/lp-f/nwtsty/4/20';
const waitFor=async(page:any,text:string)=>
 await expect(page.locator('.biblelab-side')).toContainText(text);

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('WOL /pc/ result opens article content, not an unsupported-route error',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<main><div id="lookupResults"><div class="result">'+
       '<a href="'+context+'">Congrégation — it-1 510</a>'+
       '<p>Référence bibliographique trouvée</p></div></div></main>'
 }));
 await page.route(context,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Congrégation</h1>'+
       '<p>Voici le texte intégral de l’article lié depuis l’Index.</p>'+
       '<p>Cette lecture est indépendante du menu WOL.</p></article>'
 }));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 510'));
 await waitFor(page,'Voici le texte intégral');
 await expect(page.locator('.biblelab-side')).not.toContainText('Référence bibliographique trouvée');
});

test('when lookupResults is an excerpt only, the official publication index may still lead to the full article',async({page})=>{
 const indexUrl='https://wol.jw.org/fr/wol/d/r30/lp-f/1200004775';
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<main><div id="lookupResults"><p>Extrait seulement, pas l’article entier.</p></div></main>'
 }));
 await page.route(indexUrl,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Index</h1>'+
       '<h2>Ancien, homme d’âge mûr <a href="'+context+'">1:116-119</a></h2></article>'
 }));
 await page.route(context,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>ANCIEN, HOMME D’ÂGE MÛR</h1>'+
       '<div class="pubRef">it-1 « Ancien, homme d’âge mûr »</div>'+
       '<p>Texte complet provenant de l’ouvrage Étude perspicace.</p>'+
       '<p>Deuxième paragraphe du document attendu.</p></article>'
 }));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 118'));
 await waitFor(page,'Texte complet provenant de');
 await expect(page.locator('.biblelab-side')).not.toContainText('Extrait seulement');
});

test('WOL contextual shell follows its own canonical article, keeping the original source link',async({page})=>{
 await page.route(context,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><head><link rel="canonical" href="'+direct+'"></head>'+
    '<main><h1>Consulter</h1><p>Publications et Réunions</p></main></html>'
 }));
 await page.route(direct,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Congrégation</h1>'+
    '<p>Le contenu officiel est récupéré depuis le document canonique.</p></article>'
 }));
 await page.evaluate((url)=>(window as any).atlasTest.plugin.openBibleLab(url),context);
 await waitFor(page,'Le contenu officiel est récupéré');
 await expect(page.locator('.biblelab-focused-reading')).not.toContainText('Publications et Réunions');
});

test('WOL Bible cross-reference context can open its official canonical chapter',async({page})=>{
 await page.route(bibleContext,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><head><meta property="og:url" content="'+chapter+'"></head>'+
    '<main><h1>Rechercher</h1><p>Consulter</p></main></html>'
 }));
 await page.route(chapter,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Nombres 20</h1>'+
    '<p>Moïse réunit le peuple devant le rocher dans ce chapitre.</p></article>'
 }));
 await page.evaluate(url=>(window as any).atlasTest.plugin.openBibleLab(url),bibleContext);
 await waitFor(page,'Moïse réunit le peuple');
});

test('clicking an inline WOL /pc/ link navigates inside Bible Lab, then returns by history',async({page})=>{
 const second='https://wol.jw.org/fr/wol/pc/r30/lp-f/1200004775/94/1';
 await page.route(direct,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Première publication</h1>'+
    '<p>Une idée qui renvoie à <a href="'+second+'">une autre publication</a> pour approfondir.</p>'+
    '<p>Premier article et sa source officielle.</p></article>'
 }));
 await page.route(second,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<article class="bodyTxt"><h1>Deuxième publication</h1>'+
    '<p>Nous avons suivi le renvoi directement dans Obsidian.</p></article>'
 }));
 await page.evaluate(url=>(window as any).atlasTest.plugin.openBibleLab(url),direct);
 await waitFor(page,'Premier article et sa source');
 await page.locator('.biblelab-focused-reading .biblelab-reader-inline-link').filter({hasText:'une autre publication'}).first().click();
 await waitFor(page,'Nous avons suivi le renvoi');
 await page.locator('.biblelab-reader-history button').filter({hasText:'Précédent'}).click();
 await waitFor(page,'Premier article et sa source');
});
