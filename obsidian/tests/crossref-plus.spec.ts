import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('Verse plus cues replace duplicate references and lead to the requested verse',async({page})=>{
 const samples=[
  {verse:2,ref:'Psaume 119:165',vs:'19119165'},
  {verse:3,ref:'Jean 3:16',vs:'43003016'}
 ];
 for(const sample of samples){
  const code='4000400'+sample.verse;
  await page.route('**/json/html/'+code,route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({ranges:{
    [code]:{citation:'Matthieu 4:'+sample.verse,
     html:'<p>Texte biblique du verset '+sample.verse+
      '<sup class="xref">+</sup> et sa fin.</p>',
     footnotes:[{source:'Note',content:'<p>Une note d’étude.</p>'}],
     commentaries:[],
     crossReferences:[{source:'<sup>+</sup>',targets:[
      {vs:sample.vs,standardCitation:sample.ref}]}]
    }
   }})
  }));
 }
 await page.route('**/json/html/19119165',route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({ranges:{
   '19119165':{citation:'Psaume 119:165',
    html:'<p>Une paix abondante appartient à ceux qui aiment ta loi.</p>',
    footnotes:[],commentaries:[],crossReferences:[]}
  }})
 }));
 await page.evaluate(()=>{
  const p=document.createElement('p');p.id='plus-citation';
  p.textContent='Mat. 4:2, 3';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 });
 await page.locator('#plus-citation a.biblelab-autolink').click();
 const dialog=page.getByRole('dialog',{name:'Aperçu biblique : Mat. 4:2, 3'});
 await expect(dialog).toBeVisible();
 const reading=dialog.locator('.biblelab-popover-scripture-reading');
 const plus=reading.locator('button.biblelab-popover-verse-plus');
 await expect(reading.locator('.biblelab-popover-scripture-verse')).toHaveCount(2);
 await expect(plus).toHaveCount(2);
 // Preserve the source HTML marker position, not merely append "+" at the end.
 await expect(reading.locator('.biblelab-popover-scripture-copy').first())
  .toHaveText('Texte biblique du verset 2+ et sa fin.');
 await expect(reading.locator('.biblelab-popover-scripture-copy').last())
  .toHaveText('Texte biblique du verset 3+ et sa fin.');
 await expect(plus.nth(0)).toHaveAttribute('aria-label','Afficher les renvois du verset 2');
 await expect(plus.nth(1)).toHaveAttribute('aria-label','Afficher les renvois du verset 3');
 await expect(reading).not.toContainText('Psaume 119:165');
 await expect(reading).not.toContainText('Jean 3:16');
 const aside=dialog.locator('.biblelab-popover-scripture-aside');
 await expect(aside.locator('.biblelab-popover-apparatus-heading')).toHaveText([
  'Notes de traduction','Renvois bibliques']);
 await expect(aside).not.toContainText('Autres références');
 await expect(aside.getByRole('button',{name:'Lire Psaume 119:165'})).toHaveCount(1);
 await expect(aside.getByRole('button',{name:'Lire Jean 3:16'})).toHaveCount(1);
 await plus.nth(0).click();
 await expect(aside).toHaveAttribute('open','');
 await expect(aside.getByRole('button',{name:'Lire Psaume 119:165'})).toBeFocused();
 await aside.getByRole('button',{name:'Lire Psaume 119:165'}).click();
 await expect(page.getByRole('dialog',{name:'Aperçu biblique : Psaume 119:165'})).toBeVisible();
 await expect(page.getByText('Une paix abondante appartient à ceux qui aiment ta loi.')).toBeVisible();
 await page.getByRole('button',{name:'Retour'}).click();
 await expect(page.getByRole('dialog',{name:'Aperçu biblique : Mat. 4:2, 3'})).toBeVisible();
});
test('A verse without cross-references has no artificial plus or empty side rail',async({page})=>{
 const id='43007024';
 await page.route('**/json/html/'+id,route=>route.fulfill({
  status:200,contentType:'application/json',body:JSON.stringify({ranges:{
   [id]:{citation:'Jean 7:24',html:'<p>Jugez avec justice.</p>',
    footnotes:[],commentaries:[],crossReferences:[]}
  }})
 }));
 await page.evaluate(()=>{
  const p=document.createElement('p');p.id='no-plus-citation';p.textContent='Jean 7:24';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 });
 await page.locator('#no-plus-citation a.biblelab-autolink').click();
 const dialog=page.getByRole('dialog',{name:'Aperçu biblique : Jean 7:24'});
 await expect(dialog.locator('.biblelab-popover-scripture-reading')).toContainText('Jugez avec justice.');
 await expect(dialog.locator('.biblelab-popover-verse-plus')).toHaveCount(0);
 await expect(dialog.locator('.biblelab-popover-scripture-aside')).toHaveCount(0);
});
