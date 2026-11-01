import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab());
});

test('References sidebar scans plain scripture, WOL markdown links and bracket publication citations',async({page})=>{
 await page.evaluate(async()=>{
   const {app}=(window as any).atlasTest;
   const file=await app.vault.create('Mes notes/Enquête WOL.md',[
      '# Mes pistes', 'Matthieu 10:29','!!Jean 7:24!!',
      '[w24 Novembre p. 14-19]',
      '[Article cité](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663)'
   ].join('\n'));
   app.workspace.activeFile=file;app.workspace.trigger('file-open',file);
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Références'}).click();
 await expect(pane.getByText('Enquête WOL')).toBeVisible();
 for(const label of ['Matthieu 10:29','Jean 7:24','w24 Novembre p. 14-19','Article cité'])
   await expect(pane.locator('.biblelab-reader-labels strong').filter({hasText:label})).toBeVisible();
 const item=pane.locator('.biblelab-reader').filter({hasText:'w24 Novembre p. 14-19'}).first();
 await expect(item.locator('.biblelab-reader-summary')).toBeVisible();
});

test('Study Bible verse expands in place, displaying the verse, notes and nested WOL sources',async({page})=>{
 const verse=`<html><main id="content"><h1>Matthieu 10</h1>
   <p id="v40-10-29"><span>29</span> Deux moineaux ne se vendent-ils pas pour une pièce de monnaie ?</p>
   <div><p class="studyNote">Note : pour un assarion. Voir app. B14.</p>
      <a href="/fr/wol/d/r30/lp-f/1001070610">Notes d’étude sur Matthieu 10</a></div>
   </main></html>`;
 const notes=`<html><main><h1>Notes d’étude sur Matthieu chapitre 10</h1>
   <h2>10:29</h2><p>Le mot grec strouthion désigne un petit oiseau.</p></main></html>`;
 await page.route('https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/40/10',route=>route.fulfill({status:200,contentType:'text/html',body:verse}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/1001070610',route=>route.fulfill({status:200,contentType:'text/html',body:notes}));
 const pane=page.locator('.biblelab-side');
 await page.evaluate(()=>{const node=document.createElement('p');node.textContent='!!Matthieu 10:29!!';document.body.appendChild(node);(window as any).atlasTest.plugin.markdownPostProcessor(node);});
 await page.getByText('Matthieu 10:29',{exact:true}).last().click();
 await expect(pane.getByRole('button',{name:'Références'})).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Deux moineaux ne se vendent-ils pas')).toBeVisible();
 const related=pane.getByText('Notes et références liées');
 await related.click();
 const nested=pane.locator('.biblelab-reader.is-nested').filter({hasText:'Notes d’étude sur Matthieu 10'}).first();
 await nested.locator('summary').click();
 await expect(nested.getByText('Le mot grec strouthion désigne un petit oiseau.')).toBeVisible();
});

test('Article link uses original WOL document URL and displays readable source paragraphs',async({page})=>{
 const article='<html><main><h1>Un article original</h1><p>Un raisonnement approfondi pour l’étude.</p><p>Seconde idée à méditer.</p></main></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({status:200,contentType:'text/html',body:article}));
 await page.evaluate(async()=>{
   const {app}=(window as any).atlasTest;
   const file=await app.vault.create('Mes notes/Article.md','[Article original](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663)');
   app.workspace.activeFile=file;app.workspace.trigger('file-open',file);
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Références'}).click();
 await pane.locator('.biblelab-reader-summary').filter({hasText:'Article original'}).click();
 await expect(pane.getByText('Un raisonnement approfondi pour l’étude.')).toBeVisible();
 await expect(pane.getByText('Seconde idée à méditer.')).toBeVisible();
});
