import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Hé and Né with accents open the correct Bible books from a note',async({page})=>{
 for(const [code,citation,content] of [
  ['58011001','Hébreux 11:1','La foi est la certitude que ce qu’on espère se réalisera.'],
  ['16002001','Néhémie 2:1','Au mois de Nisan, dans la vingtième année du roi Artaxerxès.']
 ] as const){
  await page.route('**/json/html/'+code,route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({
    ranges:{[code]:{citation,html:'<p>'+content+'</p>',
     footnotes:[],crossReferences:[],commentaries:[]}}
   })
  }));
 }
 await page.evaluate(()=>{
  const node=document.createElement('p');
  node.id='accented-books-note';
  node.textContent='Voir Hé 11:1 et Né. 2:1.';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 const links=page.locator('#accented-books-note a.biblelab-autolink');
 await expect(links).toHaveCount(2);
 await expect(links.nth(0)).toHaveText('Hé 11:1');
 await expect(links.nth(1)).toHaveText('Né. 2:1');
 await links.nth(0).click();
 let popup=page.getByRole('dialog',{name:'Aperçu biblique : Hébreux 11:1'});
 await expect(popup).toContainText('La foi est la certitude');
 await popup.getByRole('button',{name:'Fermer'}).click();
 await links.nth(1).click();
 popup=page.getByRole('dialog',{name:'Aperçu biblique : Néhémie 2:1'});
 await expect(popup).toContainText('dans la vingtième année');
});
