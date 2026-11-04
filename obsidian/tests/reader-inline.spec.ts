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
 await pane.locator('.biblelab-overflow > summary').click();
 await pane.getByRole('button',{name:'Lire les références'}).click();
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


test('Long article shows a section outline and adjustable readable typography',async({page})=>{
 const paragraphs=Array.from({length:32},(_,i)=>'<p>Paragraphe '+(i+1)+' pour approfondir.</p>');
 const article='<html><main class="bodyTxt"><h1>Étude approfondie</h1>'+
  '<h2>Premier thème</h2>'+paragraphs.slice(0,20).join('')+
  '<h2>Deuxième thème</h2>'+paragraphs.slice(20).join('')+'</main></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>
   route.fulfill({status:200,contentType:'text/html',body:article}));
 await page.evaluate(async()=>{
  const {app}=(window as any).atlasTest;
  const f=await app.vault.create('Mes notes/Longue étude.md',
    '[Lire](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663)');
  app.workspace.activeFile=f;app.workspace.trigger('file-open',f);
 });
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-overflow > summary').click();
 await pane.getByRole('button',{name:'Lire les références'}).click();
 await pane.locator('.biblelab-reader-summary').filter({hasText:'Lire'}).first().click();
 const articleNode=pane.locator('.biblelab-article-reading');
 await expect(articleNode).toBeVisible();
 await expect(pane.getByText('Plan de l’article · 2 sections')).toBeVisible();
 await expect(articleNode.getByText('Paragraphe 32 pour approfondir.')).toHaveCount(0);
 await pane.locator('.biblelab-article-outline').evaluate((node:HTMLDetailsElement)=>{node.open=true;});
 await pane.locator('.biblelab-article-outline-list').getByRole('button',{name:'Deuxième thème'}).click();
 await expect(articleNode.getByText('Deuxième thème')).toBeVisible();
 await pane.getByRole('button',{name:'Augmenter la taille du texte'}).click();
 await expect(articleNode).toHaveCSS('--bl-article-font-size','14px');
 await pane.getByRole('button',{name:'Réduire la taille du texte'}).click();
 await expect(articleNode).toHaveCSS('--bl-article-font-size','13px');
});
