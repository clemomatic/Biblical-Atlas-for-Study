import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});
test('Read Bible citations inside a WOL article without losing the previous article',async({page})=>{
 const article='<html><main class="bodyTxt"><h1>La miséricorde et la justice</h1>'+
 '<p>Jésus a manifesté une profonde compassion (Marc 10:14). Voir aussi Jean 7:24.</p>'+
 '<p>Lire <a href="/fr/wol/d/r30/lp-f/2024663">Explication détaillée</a> pour approfondir.</p></main></html>';
 const second='<html><main class="bodyTxt"><h1>Explication détaillée</h1><p>Un complément lisible.</p></main></html>';
 const verse={ranges:{'41010014':{citation:'Marc 10:14',html:'<p>Jésus témoigna de la bonté.</p>',footnotes:[],crossReferences:[],commentaries:[]}}};
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642',route=>route.fulfill({status:200,contentType:'text/html',body:article}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({status:200,contentType:'text/html',body:second}));
 await page.route('**/json/html/41010014',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(verse)}));
 await page.evaluate(async()=>{
  const {app}=(window as any).atlasTest;
  const f=await app.vault.create('Mes notes/Sources.md','[Article](https://wol.jw.org/fr/wol/d/r30/lp-f/2024642)');
  app.workspace.activeFile=f;app.workspace.trigger('file-open',f);
 });
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-tab[aria-label="Références"]').click();
 await pane.locator('.biblelab-reader-summary').filter({hasText:'Article'}).first().click();
 const contentPane=pane.locator('.biblelab-reader-contents').first();
 await expect(contentPane.getByText('Jésus a manifesté une profonde compassion', {exact:false})).toBeVisible();
 await expect(contentPane.getByRole('button',{name:'Lire la référence Marc 10:14'})).toBeVisible();
 await expect(contentPane.getByRole('button',{name:'Lire la référence Jean 7:24'})).toBeVisible();
 await contentPane.getByRole('button',{name:'Lire la référence Marc 10:14'}).click();
 await expect(pane.locator('.biblelab-reader-history-count')).toHaveText('2 / 2');
 await expect(pane.getByText('Jésus témoigna de la bonté.')).toBeVisible();
 await pane.getByRole('button',{name:'Précédent'}).click();
 await expect(pane.locator('.biblelab-reader-history-count')).toHaveText('1 / 2');
 await expect(pane.getByRole('button',{name:'Lire la référence Marc 10:14'})).toBeVisible();
 await pane.getByRole('button',{name:'Lire la référence Explication détaillée'}).click();
 await expect(pane.getByText('Un complément lisible.')).toBeVisible();
});
