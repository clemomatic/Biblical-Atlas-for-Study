import {test,expect} from '@playwright/test';

const thumb='https://cms-imgp.jw-cdn.org/img/p/w/2024/11/thumbnail.jpg';
const secondThumb='https://cms-imgp.jw-cdn.org/img/p/km/2000/05/thumbnail.jpg';
const article='https://wol.jw.org/fr/wol/d/r30/lp-f/2024642';
const secondArticle='https://wol.jw.org/fr/wol/d/r30/lp-f/202000163';

const body='<article class="bodyTxt"><h1>Un article d’étude</h1>'+
 '<p>Ce document donne une réponse détaillée et accessible.</p>'+
 '<p>Un second paragraphe permet d’approfondir la réflexion.</p></article>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 // The display must not depend on contacting WOL/JW CDN during tests.
 const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+qK9cAAAAASUVORK5CYII=','base64');
 await page.route('https://cms-imgp.jw-cdn.org/**',route=>route.fulfill({
   status:200,contentType:'image/png',body:image
 }));
});

test('WOL search cards show small cardThumbnailImage next to titles, not full-size figures',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/s/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
  '<div id="searchResults">'+
    '<article class="result">'+
      '<a class="cardThumbnailImage" href="'+article+'" style="background-image:url(&quot;'+thumb+'&quot;)"></a>'+
      '<h3><a href="'+article+'">Une étude de la Tour de Garde</a></h3>'+
      '<p>w24 novembre p. 14-19</p></article>'+
    '<article class="result">'+
      '<h3><a href="'+secondArticle+'">Un autre article sans illustration</a></h3>'+
      '<p>km 5/00 p. 8</p></article>'+
    '<article class="result">'+
      '<div class="cardThumbnailImage" style="background-image:url(https://evil.example/tracker.jpg)"></div>'+
      '<h3><a href="https://wol.jw.org/fr/wol/d/r30/lp-f/2018287">Une référence sans image autorisée</a></h3>'+
      '<p>w18 février p. 24-27</p></article>'+
  '</div>'
 }));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
 await page.locator('.biblelab-tab[aria-label="WOL"]').click();
 const panel=page.locator('.biblelab-side');
 await panel.getByPlaceholder('Sujet, publication ou verset…').fill('étude');
 await panel.getByRole('button',{name:'Voir les résultats'}).click();
 const cards=panel.locator('.biblelab-search-result');
 await expect(cards).toHaveCount(3);
 const image=cards.nth(0).locator('.biblelab-card-thumbnail img');
 await expect(image).toHaveAttribute('src',thumb);
 await expect(image).toHaveAttribute('alt','');
 await expect(cards.nth(0).locator('.biblelab-article-figure')).toHaveCount(0);
 await expect(cards.nth(1).locator('.biblelab-card-thumbnail')).toHaveCount(0);
 await expect(cards.nth(1).locator('.biblelab-search-result-icon')).toHaveCount(1);
 await expect(cards.nth(2).locator('.biblelab-card-thumbnail')).toHaveCount(0);
 await expect(cards.nth(2)).toContainText('Une référence sans image autorisée');
 const box=await image.boundingBox();
 expect(box).toBeTruthy();
 expect(box!.width).toBeLessThan(85);
 expect(box!.height).toBeLessThan(65);
 await page.route(article,route=>route.fulfill({status:200,contentType:'text/html',body}));
 await cards.nth(0).getByRole('button',{name:'Lire ici'}).click();
 await expect(panel.locator('.biblelab-reader-summary>.biblelab-card-thumbnail img'))
  .toHaveAttribute('src',thumb);
 await expect(panel.locator('.biblelab-focused-reading')).toContainText('Un article d’étude');
});

test('LookupResults retains its own thumbnail on the chosen article in a floating preview',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
    '<main><h1>Consulter</h1><div id="lookupResults">'+
    '<article class="result">'+
    '<div class="cardThumbnailImage"><img width="60" height="45" data-src="'+thumb+'" alt="Vignette Tour de Garde"></div>'+
    '<a href="'+article+'">Une étude de la Tour de Garde</a>'+
    '<p>w25 janvier p. 6-9</p><p>Un extrait officiel visible dans WOL.</p>'+
    '</article></div></main>'
 }));
 await page.route(article,route=>route.fulfill({status:200,contentType:'text/html',body}));
 await page.evaluate(()=>{
   const note=document.createElement('p');note.id='thumbnail-note';
   note.textContent='Lire w25 janvier p. 6.';
   document.body.appendChild(note);
   (window as any).atlasTest.plugin.markdownPostProcessor(note);
 });
 const link=page.locator('#thumbnail-note a.biblelab-autolink');
 await expect(link).toHaveCount(1);
 await link.click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : w25 janvier p. 6'});
 await expect(popup).toContainText('Un article d’étude');
 await expect(popup).toContainText('Un second paragraphe');
 await expect(popup.locator('.biblelab-popover-preview-head .biblelab-card-thumbnail img'))
  .toHaveAttribute('src',thumb);
 await expect(popup.locator('.biblelab-article-figure')).toHaveCount(0);
});

test('Ambiguous WOL lookup gives every article its own small thumbnail',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
  status:200,contentType:'text/html',body:
  '<div id="lookupResults">'+
   '<article class="result"><span class="cardThumbnailImage" style="background-image:url('+thumb+')"></span>'+
     '<a href="'+article+'">Le premier article du mois</a><p>km 5/01 p. 8</p>'+
     '<p>Extrait distinct du premier article.</p></article>'+
   '<article class="result"><span class="cardThumbnailImage" data-src="'+secondThumb+'"></span>'+
     '<a href="'+secondArticle+'">Le deuxième article du mois</a><p>km 5/01 p. 8</p>'+
     '<p>Extrait distinct du second article.</p></article></div>'
 }));
 await page.evaluate(()=>{
   const note=document.createElement('p');note.id='ambiguous-image';
   note.textContent='Consulter km 5/01 p. 8.';
   document.body.appendChild(note);
   (window as any).atlasTest.plugin.markdownPostProcessor(note);
 });
 await page.locator('#ambiguous-image a.biblelab-autolink').click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : km 5/01 p. 8'});
 await expect(popup).toContainText('Extrait distinct du premier article');
 await expect(popup).toContainText('Extrait distinct du second article');
 const previews=popup.locator('.biblelab-popover-related .biblelab-card-thumbnail img');
 await expect(previews).toHaveCount(2);
 await expect(previews.nth(0)).toHaveAttribute('src',thumb);
 await expect(previews.nth(1)).toHaveAttribute('src',secondThumb);
 await expect(popup.locator('.biblelab-article-figure')).toHaveCount(0);
 await popup.getByRole('button',{name:'Dans le panneau'}).click();
 const sidebar=page.locator('.biblelab-side');
 await expect(sidebar.locator('.biblelab-reader-related-list .biblelab-card-thumbnail img')).toHaveCount(2);
});


test('A known citation opened directly still retrieves its matching WOL cardThumbnailImage',async({page})=>{
 let lookupCalls=0;
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>{
  lookupCalls++;
  return route.fulfill({status:200,contentType:'text/html',body:
    '<main><div id="lookupResults">'+
    '<article class="result"><span class="cardThumbnailImage" data-src="'+thumb+'"></span>'+
    '<a href="'+article+'">Frères, vous qualifiez-vous pour devenir assistants ?</a>'+
    '<p>w24 novembre p. 14-19</p>'+
    '<p>Un résultat correspondant au document.</p></article>'+
    '<article class="result"><span class="cardThumbnailImage" data-src="'+secondThumb+'"></span>'+
    '<a href="'+secondArticle+'">Un autre document</a>'+
    '<p>km 5/00 p. 8</p><p>Une autre publication.</p></article>'+
    '</div></main>'});
 });
 await page.route(article,route=>route.fulfill({
   status:200,contentType:'text/html',body
 }));
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='known-thumbnail-note';
  node.textContent='w24 novembre p. 17-19 § 15-20';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 await page.locator('#known-thumbnail-note a.biblelab-autolink').click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : w24 novembre p. 17-19 § 15-20'});
 await expect(popup).toContainText('Ce document donne une réponse');
 await expect(popup.locator('.biblelab-popover-preview-head .biblelab-card-thumbnail img'))
   .toHaveAttribute('src',thumb);
 expect(lookupCalls).toBeGreaterThan(0);
 await expect(popup.locator('.biblelab-article-figure')).toHaveCount(0);
});

test('A direct WOL document can use its own article illustration when the lookup has no card image',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:'<main><h1>Consulter</h1><nav>Aucun résultat</nav></main>'
 }));
 await page.route(article,route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<article class="bodyTxt"><h1>Une étude illustrée</h1>'+
    '<p>Le texte de la publication reste lisible normalement.</p>'+
    '<figure><img src="'+thumb+'" alt="Illustration de cette étude"></figure>'+
    '<p>La suite du contenu est conservée.</p></article>'
 }));
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='direct-document-note';
  node.innerHTML='<a href="'+ 'https://wol.jw.org/fr/wol/d/r30/lp-f/2024642'+
    '">Article à lire</a>';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 await page.locator('#direct-document-note a').click();
 const popup=page.getByRole('dialog',{name:'Aperçu biblique : Article à lire'});
 await expect(popup).toContainText('Le texte de la publication reste lisible');
 await expect(popup.locator('.biblelab-popover-preview-head .biblelab-card-thumbnail img'))
  .toHaveAttribute('src',thumb);
 // Original article imagery remains independently available in the reader.
 await expect(popup.locator('.biblelab-article-figure img')).toHaveAttribute('src',thumb);
});
