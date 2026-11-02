import {test,expect} from '@playwright/test';

const article=(title:string,pages:string)=>
 '<html><article class="bodyTxt"><h1>'+title+'</h1><p>'+pages+'</p>'+
 '<p>Un premier paragraphe vérifiable pour lire directement la publication.</p>'+
 '<p>Un deuxième paragraphe vérifiable sans afficher le menu WOL.</p>'+
 '<p>Un troisième paragraphe pour confirmer le contenu réel.</p></article></html>';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Reading view inherits Acts from an existing Markdown link across separate DOM elements',async({page})=>{
 await page.evaluate(()=>{
  const node=document.createElement('p');node.id='contextual-acts';
  node.innerHTML='<a href="https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/1">Actes 1:8</a>'+
    '<strong> ; 2:1-4, 32, 33 ; 3:6, 7 ; 7:56 ; 9:3-6, 10-16 ; 11:15-17 ; 13:2-4 ; 16:6-10</strong>';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const links=page.locator('#contextual-acts a.biblelab-autolink');
 await expect(links).toHaveCount(7);
 await expect(links).toHaveText([
   '2:1-4, 32, 33','3:6, 7','7:56','9:3-6, 10-16',
   '11:15-17','13:2-4','16:6-10']);
 await expect(links.nth(0)).toHaveAttribute('href',
   'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/2');
 await expect(links.nth(3)).toHaveAttribute('href',
   'https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/44/9');
 await links.nth(0).click();
 await expect(page.getByRole('dialog',{
   name:'Aperçu biblique : Actes 2:1-4, 32, 33'})).toBeVisible();
});

test('WOL library index pages are bypassed for the known si Acts page range',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<html><main><nav>WOL — BIBLE PUBLICATIONS RÉUNIONS</nav></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1101990105',
   route=>route.fulfill({status:200,contentType:'text/html',
     body:article('Livre de la Bible numéro 44 — Actes','si p. 199-205')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('si 203-205'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Un premier paragraphe vérifiable');
 await expect(pane).not.toContainText('BIBLE PUBLICATIONS RÉUNIONS');
});

test('it-1 510 paragraph reference opens Congrégation, not a WOL navigation shell',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/l/**',route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<html><main>Menu WOL uniquement</main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1200001021',
   route=>route.fulfill({status:200,contentType:'text/html',
     body:article('CONGRÉGATION','it-1 p. 510')}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('it-1 510 § 3-4'));
 const pane=page.locator('.biblelab-side');
 await expect(pane).toContainText('Un premier paragraphe vérifiable');
 await expect(pane).not.toContainText('Menu WOL uniquement');
});

test('No bare numerical chapter segments are linked without an initial Scripture book',async({page})=>{
 await page.evaluate(()=>{
  const el=document.createElement('p');el.id='unrelated-numbers';
  el.textContent='Nous nous retrouvons à 2:30 ; 3:15 puis réunion jeudi.';
  document.body.appendChild(el);
  (window as any).atlasTest.plugin.markdownPostProcessor(el);
 });
 await expect(page.locator('#unrelated-numbers .biblelab-autolink')).toHaveCount(0);
});
