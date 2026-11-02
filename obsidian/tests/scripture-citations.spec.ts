import {test,expect} from '@playwright/test';

const fixture=(book:string,verse:number)=>
 JSON.stringify({ranges:{[book]:{
  citation:'Matthieu 4:'+verse,
  html:'<p>Contenu exact du verset '+verse+'.</p>',
  footnotes:[],commentaries:[],crossReferences:[]
 }}});
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('Full list and range citations are single clickable spans in a reading note',async({page})=>{
 await page.evaluate(()=>{
  const p=document.createElement('p');p.id='verse-citations';
  p.textContent='Mat. 4:2, 3 et Jér. 3:1-4 puis 1Co 13:4-7 ; km 05/95.';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 });
 const links=page.locator('#verse-citations a.biblelab-autolink');
 await expect(links).toHaveCount(4);
 await expect(links.nth(0)).toHaveText('Mat. 4:2, 3');
 await expect(links.nth(1)).toHaveText('Jér. 3:1-4');
 await expect(links.nth(2)).toHaveText('1Co 13:4-7');
 await expect(links.nth(3)).toHaveText('km 05/95');
 await expect(links.nth(3)).toHaveAttribute('href',
   'https://wol.jw.org/fr/wol/l/r30/lp-f?q=km+5%2F95');
});
test('Mat. 4:2, 3 loads two distinct Bible verses, not only verse 2',async({page})=>{
 for(const verse of [2,3]){
  const code='4000400'+verse;
  await page.route('**/json/html/'+code,route=>route.fulfill({
   status:200,contentType:'application/json',body:fixture(code,verse)}));
 }
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Mat. 4:2, 3'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.locator('.biblelab-verse-reading')).toHaveCount(2);
 await expect(pane.locator('.biblelab-verse-reading-label').nth(0)).toHaveText('VERSET 2');
 await expect(pane.locator('.biblelab-verse-reading-label').nth(1)).toHaveText('VERSET 3');
 await expect(pane.getByText('Contenu exact du verset 2.')).toBeVisible();
 await expect(pane.getByText('Contenu exact du verset 3.')).toBeVisible();
});
test('Jér. 3:1-4 requests all four verses, preserving passage order',async({page})=>{
 for(const verse of [1,2,3,4]){
  const code='2400300'+verse;
  await page.route('**/json/html/'+code,route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({ranges:{[code]:{citation:'Jérémie 3:'+verse,
    html:'<p>Jérémie, texte du verset '+verse+'.</p>'}}})}));
 }
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Jér. 3:1-4'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.locator('.biblelab-verse-reading')).toHaveCount(4);
 await expect(pane.locator('.biblelab-verse-reading-label')).toHaveText([
  'VERSET 1','VERSET 2','VERSET 3','VERSET 4']);
});
