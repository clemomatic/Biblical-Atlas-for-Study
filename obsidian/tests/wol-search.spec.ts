import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.evaluate(()=>{
  (window as any).openedSites=[];
  window.open=((url:string|URL|undefined)=>{
   (window as any).openedSites.push(String(url));return null;
  }) as typeof window.open;
  return (window as any).atlasTest.plugin.openBibleLab();
 });
 await page.locator('.biblelab-tab[aria-label="WOL"]').click();
});

test('WOL topic search shows only official source links and opens selected article in the reader',async({page})=>{
 const resultHtml='<html><main class="searchResults">'+
  '<article><h3><a href="/fr/wol/d/r30/lp-f/2024663">Comment cultiver la bonté ?</a></h3>'+
  '<p>Une idée de l’article à lire.</p></article>'+
  '<article><a href="https://wol.jw.org.evil.test/fr/wol/d/r30/lp-f/42">Lien non fiable</a></article>'+
  '<article><a href="/fr/wol/d/r30/lp-f/2024642">Rester courageux face à l’injustice</a></article>'+
  '</main></html>';
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',body:resultHtml
 }));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><h1>Comment cultiver la bonté ?</h1><p>Voici un article à consulter.</p></main></html>'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('bonté');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText('Comment cultiver la bonté ?')).toBeVisible();
 await expect(pane.getByText('Rester courageux face à l’injustice')).toBeVisible();
 await expect(pane.getByText('Lien non fiable')).toHaveCount(0);
 await pane.locator('.biblelab-search-result').filter({hasText:'Comment cultiver la bonté ?'})
  .getByRole('button',{name:'Lire ici'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Voici un article à consulter.')).toBeVisible();
});

test('Official WOL sentence and Index filters are sent only on explicit search',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await page.evaluate(()=>(window as any).atlasNetworkRequests=[]);
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('amour fidèle');
 await pane.locator('.biblelab-search-advanced').first().evaluate((node:HTMLDetailsElement)=>{node.open=true;});
 await pane.getByRole('combobox',{name:'Type de correspondance WOL'}).selectOption('sen');
 await pane.getByRole('combobox',{name:'Sources WOL'}).selectOption('index');
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:200,contentType:'text/html',
  body:'<html><main><article><a href="/fr/wol/d/r30/lp-f/1200270070">Index : amour fidèle</a><p>dx86-23 — Index 1986-2023</p></article></main></html>'
 }));
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests)).toEqual([]);
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText('Index : amour fidèle')).toBeVisible();
 const requests=await page.evaluate(()=>(window as any).atlasNetworkRequests);
 expect(requests).toHaveLength(1);
 const url=new URL(requests[0].url);
 expect(url.searchParams.get('p')).toBe('sen');
 expect(url.searchParams.get('fc[]')).toBe('dx');
 expect(url.searchParams.get('q')).toBe('amour fidèle');
});

test('JW.org and JW Library remain separate official navigation targets',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('bienveillance');
 await pane.locator('.biblelab-search-advanced').first().evaluate((node:HTMLDetailsElement)=>{node.open=true;});
 await pane.getByRole('button',{name:'Recherche JW.org'}).click();
 let urls=await page.evaluate(()=>(window as any).openedSites);
 expect(urls[0]).toBe('https://www.jw.org/fr/rechercher/?q=bienveillance');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('Matthieu 10:29');
 await pane.getByRole('button',{name:'JW Library'}).click();
 urls=await page.evaluate(()=>(window as any).openedSites);
 expect(urls[1]).toContain('https://www.jw.org/finder?wtlocale=F&bible=40010029');
});

test('WOL blocked access shows explicit source fallback, not invented results',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
  status:403,contentType:'text/html',body:'Forbidden'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('justice');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.getByText(/WOL a répondu avec le code 403/)).toBeVisible();
 await pane.getByRole('button',{name:'Continuer sur WOL'}).click();
 const opened=await page.evaluate(()=>(window as any).openedSites);
 expect(opened[0]).toContain('https://wol.jw.org/fr/wol/s/r30/lp-f');
});


test('Personal JW Library backup notes are searchable locally without any network call',async({page})=>{
 const pane=page.locator('.biblelab-side');
 await page.evaluate(async()=>{
  const {app}=(window as any).atlasTest;
  await app.vault.create('Atlas biblique/Imports/Exemple.md',[
    '---','bible_lab_kind: jw-library-note','jw_guid: "sample-01"',
    'title: "Méditation sur la douceur"','---','','Jésus montrait beaucoup de douceur.'
  ].join('\n'));
  (window as any).atlasNetworkRequests=[];
 });
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('douceur');
 await pane.locator('.biblelab-personal-search').evaluate((node:HTMLDetailsElement)=>{node.open=true;});
 await pane.getByRole('button',{name:'Chercher mes notes'}).click();
 await expect(pane.getByText('Méditation sur la douceur')).toBeVisible();
 await expect(pane.getByText(/1 résultat\(s\)/)).toBeVisible();
 expect(await page.evaluate(()=>(window as any).atlasNetworkRequests)).toEqual([]);
 await pane.getByRole('button',{name:'Ouvrir la note'}).click();
 expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace.lastOpened))
  .toBe('Atlas biblique/Imports/Exemple.md');
});


test('Pasting a direct official WOL article URL opens the integrated reader',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642',route=>
   route.fulfill({status:200,contentType:'text/html',
     body:'<html><main><h1>Article officiel</h1><p>Un texte documentaire lisible.</p></main></html>'}));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Un texte documentaire lisible.')).toBeVisible();
});

test('An entered Bible reference opens a verse directly instead of running a keyword search',async({page})=>{
 await page.route('**/json/html/43007024',route=>route.fulfill({status:200,contentType:'application/json',body:
  JSON.stringify({ranges:{'43007024':{citation:'Jean 7:24',html:'<p>Jugez avec justice.</p>'}}})}));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('Jean 7:24');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(pane.getByText('Jugez avec justice.')).toBeVisible();
});

test('The source test shows site status without claiming inaccessible sources work',async({page})=>{
 await page.route('https://wol.jw.org/fr/wol/dt/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<html><main><h1>Daily</h1></main></html>'}));
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024642',route=>route.fulfill({status:403,body:'Forbidden'}));
 await page.route('https://www.jw.org/fr/biblioth%C3%A8que/reunion-tj-cahier/**',route=>route.fulfill({status:503,body:'Unavailable'}));
 const pane=page.locator('.biblelab-side');
 await pane.locator('.biblelab-search-advanced').first().evaluate((node:HTMLDetailsElement)=>{node.open=true;});
 await pane.getByRole('button',{name:'Tester les sources'}).click();
 await expect(pane.getByText(/Texte du jour WOL : HTML accessible, mais texte du jour non reconnu/)).toBeVisible();
 await expect(pane.getByText(/Article WOL : HTTP 403/)).toBeVisible();
 await expect(pane.getByText(/Cahier JW.org : HTTP 503/)).toBeVisible();
});


test('WOL result parsing ignores an empty results shell and finds official article links',async({page})=>{
 await page.route(/wol\.jw\.org\/fr\/wol\/s\/r30\/lp-f/,route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<html><div class="searchResults"></div><main>'+
    '<article><h3><a href="/fr/wol/d/r30/lp-f/2024642">Frères, vous qualifiez-vous pour devenir assistants ?</a></h3>'+
    '<p>Référence WOL de La Tour de Garde.</p></article></main></html>'
 }));
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('assistants');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
 await expect(pane.getByText('Frères, vous qualifiez-vous pour devenir assistants ?')).toBeVisible();
});


test('A JavaScript-only WOL search is recovered through the native Obsidian Web viewer',async({page})=>{
 const html='<html><main id="results">'+
   '<ul class="resultContentDocument"><li class="caption"><a href="/fr/wol/d/r30/lp-f/2024663">La justice selon la Bible</a></li>'+
   '<li class="ref">w24.09 — La Tour de Garde</li>'+
   '<li><div class="document"><p>Un exemple de justice et de bonté.</p></div></li></ul></main></html>';
 await page.route(/wol\.jw\.org\/fr\/wol\/(?:s|l)\/r30\/lp-f/,route=>
   route.fulfill({status:200,contentType:'text/html',
    body:'<html><main id="results"><div class="loading">Chargement...</div></main></html>'}));
 await page.evaluate((renderedHTML)=>{
   const {app}=(window as any).atlasTest;
   const original=app.workspace.getLeaf.bind(app.workspace);
   const container=document.createElement('div');
   const webview=document.createElement('webview');
   (webview as any).executeJavaScript=async (code:string)=>{
     (window as any).wolInjectedScript=code;
     return {url:'https://wol.jw.org/fr/wol/s/r30/lp-f?q=Justice',html:renderedHTML,status:'results'};
   };
   container.append(webview);
   const fakeLeaf={
     detached:false,
     view:{containerEl:container,getViewType:()=> 'webviewer'},
     setViewState:async ({state}:any)=>{(window as any).wolWebviewerUrl=state.url;},
     detach(){this.detached=true;(window as any).wolWebviewerDetached=true;}
   };
   app.workspace.getLeaf=(kind:string)=>
     kind==='tab'?fakeLeaf:original(kind);
   app.workspace.revealLeaf=async()=>{};
 },html);
 const pane=page.locator('.biblelab-side');
 await pane.getByPlaceholder('Sujet, publication ou verset…').fill('Justice');
 await pane.getByRole('button',{name:'Voir les résultats'}).click();
 await expect(pane.locator('.biblelab-search-result')).toHaveCount(1);
 await expect(pane.getByText('La justice selon la Bible')).toBeVisible();
 await expect(pane.getByText('Un exemple de justice et de bonté.')).toBeVisible();
 await expect(pane.getByText(/sans liste de résultats lisible/i)).toHaveCount(0);
 const data=await page.evaluate(()=>({
   url:(window as any).wolWebviewerUrl,
   detached:(window as any).wolWebviewerDetached,
   script:(window as any).wolInjectedScript
 }));
 expect(data.url).toContain('https://wol.jw.org/fr/wol/s/r30/lp-f');
 expect(data.detached).toBe(true);
 expect(data.script).toContain("location.hostname!=='wol.jw.org'");
});
