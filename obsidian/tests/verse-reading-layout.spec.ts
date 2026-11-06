import {test,expect} from '@playwright/test';

const wolDoc=(title:string,citation:string)=>
 '<html><main class="bodyTxt"><h1>'+title+'</h1>'+
 '<p class="pubRef">'+citation+'</p>'+
 '<p>Premier paragraphe de l’article, avec une réflexion approfondie et un contexte biblique.</p>'+
 '<p>Deuxième paragraphe de l’article, accessible sans menu de recherche.</p></main></html>';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('w16 août p. 25-29 reaches the actual article, not the WOL bibliography menu',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({status:200,
  contentType:'text/html',body:'<html><main><nav>WOL Recherche Menu</nav></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2016609',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:wolDoc('Comprends-tu l’importance de former les autres ?','w16 août p. 25-29')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('w16 août p. 25-29'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Premier paragraphe de l’article',{exact:false})).toBeVisible();
 await expect(pane).not.toContainText('WOL Recherche Menu');
 await expect(pane.locator('.biblelab-reader-actions [aria-label="Recherche WOL"]').first())
  .toBeVisible();
});
test('w20 juin p. 26 opens the article spanning pages 24-29',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({status:200,
  contentType:'text/html',body:'<html><main><nav>Menu de recherche WOL</nav></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2020441',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:wolDoc('« Revenez à moi »','w20 juin p. 24-29')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('w20 juin p. 26'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Deuxième paragraphe de l’article',{exact:false})).toBeVisible();
 await expect(pane).not.toContainText('Menu de recherche WOL');
});
test('A verse sequence stays uninterrupted; notes and cross-references sit in a separate rail',async({page})=>{
 for(const verse of [2,3]){
  const key='4000400'+verse;
  await page.route('**/json/html/'+key,route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({ranges:{[key]:{
    citation:'Matthieu 4:'+verse,
    html:'<p>Contenu biblique du verset '+verse+'.</p>',
    footnotes:[{source:'Traduction',content:'<p>Une note pour le verset '+verse+'.</p>'}],
    commentaries:[{source:'Analyse',content:'<p>Une explication pour le verset '+verse+'.</p>'}],
    crossReferences:[{source:'Matthieu 4:'+verse,
      targets:[{vs:'191190165',standardCitation:'Psaume 119:165'}]}]
   }}})}));
 }
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='sequence-verse';
  node.textContent='Mat. 4:2, 3';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 await page.locator('#sequence-verse .biblelab-ref').first().click();
 const pop=page.getByRole('dialog',{name:'Aperçu biblique : Mat. 4:2, 3'});
 await expect(pop).toBeVisible();
 const reading=pop.locator('.biblelab-popover-scripture-reading');
 await expect(reading.locator('.biblelab-popover-scripture-verse')).toHaveCount(2);
 await expect(reading).toContainText('Contenu biblique du verset 2.');
 await expect(reading).toContainText('Contenu biblique du verset 3.');
 await expect(reading).not.toContainText('Une note pour');
 await expect(reading).not.toContainText('Psaume 119:165');
 const aside=pop.locator('.biblelab-popover-scripture-aside');
 await expect(aside).toHaveCount(1);
 await expect(aside).toContainText('Une note pour le verset 2.');
 await expect(aside).toContainText('Psaume 119:165');
 // Side rail is collapsed on mobile but can still be opened.
 const wasOpen=await aside.evaluate((el:HTMLDetailsElement)=>el.open);
 if(!wasOpen)await aside.locator('summary').click();
 await expect(aside.locator('.biblelab-popover-apparatus-item').first()).toBeVisible();
});
