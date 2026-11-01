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

test('w24 Novembre bibliography resolves to a real WOL article and opens its source, never the old /s URL',async({page})=>{
  const lookup='https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19';
  const direct='https://wol.jw.org/fr/wol/d/r30/lp-f/2024642';
  await page.route(lookup,route=>route.fulfill({status:200,contentType:'text/html',body:
    '<html><main><ul><li><a href="/fr/wol/d/r30/lp-f/2024642">Frères, vous qualifiez-vous pour devenir assistants ?</a><span>w24 novembre p. 14-19</span></li></ul></main></html>'}));
  await page.route(direct,route=>route.fulfill({status:200,contentType:'text/html',body:
    '<html><main><div class="bodyTxt"><h1>Frères, vous qualifiez-vous pour devenir assistants ?</h1><p>Article d’étude 46</p><p>Un texte intégral lisible depuis le volet de références.</p></div></main></html>'}));
  await page.evaluate(async()=>{
    const {app}=(window as any).atlasTest;
    const file=await app.vault.create('Mes notes/Source ancienne.md',
      '[Article ancien](https://wol.jw.org/fr/wol/s/r30/lp-f?q=w24%20Novembre%20p.%2014-19)\n\n[w24 Novembre p. 14-19]');
    app.workspace.activeFile=file;app.workspace.trigger('file-open',file);
    (window as any).outgoingWol=[];
    window.open=((url:string|URL|undefined)=>{(window as any).outgoingWol.push(String(url));return null;}) as typeof window.open;
  });
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="Références"]').click();
  const item=pane.locator('.biblelab-reader').filter({hasText:'w24 Novembre p. 14-19'}).first();
  await item.locator('.biblelab-reader-summary').first().click();
  await expect(item.getByText('Un texte intégral lisible depuis le volet de références.')).toBeVisible();
  await item.locator('.biblelab-reader-actions button[aria-label="WOL"]').click();
  expect(await page.evaluate(()=>(window as any).outgoingWol)).toContain(direct);
});
test('official JW JSON Bible API returns footnotes, study commentary and navigable cross references',async({page})=>{
  await page.route('**/json/html/40010029',route=>route.fulfill({status:200,contentType:'application/json',body:
    JSON.stringify({ranges:{'40010029':{
      citation:'Matthieu 10:29',
      html:'<p>Le texte du verset 29 de Matthieu.</p>',
      footnotes:[{source:'10:29',content:'<p>Note de la Bible d’étude.</p>'}],
      commentaries:[{source:'Un moineau',content:'<p>Explication du mot grec.</p>'}],
      crossReferences:[{source:'10:29',targets:[{vs:'43003016',standardCitation:'Jean 3:16'}]}]
    }}})}));
  await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Matthieu 10:29'));
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByText('Le texte du verset 29 de Matthieu.')).toBeVisible();
  await expect(pane.getByText(/Note de la Bible d’étude/)).toBeVisible();
  await expect(pane.getByText(/Explication du mot grec/)).toBeVisible();
  await pane.getByText('Notes et références liées').click();
  await expect(pane.locator('.biblelab-reader.is-nested').filter({hasText:'Jean 3:16'})).toBeVisible();
});
test('publication reference search opens bibliographic lookup URL with + encoded spaces',async({page})=>{
  await page.evaluate(()=>{
    (window as any).outbound=[];
    window.open=((url:string|URL|undefined)=>{(window as any).outbound.push(String(url));return null;}) as typeof window.open;
  });
  const pane=page.locator('.biblelab-side');
  await pane.locator('.biblelab-tab[aria-label="WOL"]').click();
  await pane.getByPlaceholder('Sujet, publication ou verset…').fill('w24 Novembre p. 14-19');
  await pane.locator('.biblelab-search-advanced').first().evaluate((node:HTMLDetailsElement)=>{node.open=true;});
  await pane.getByRole('button',{name:'Rechercher WOL'}).click();
  expect(await page.evaluate(()=>(window as any).outbound)).toContain(
    'https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+14-19');
});
