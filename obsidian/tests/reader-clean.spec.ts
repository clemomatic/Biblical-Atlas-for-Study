import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Bible verse removes encoded spaces, superscript markers and number-only note labels',async({page})=>{
 const result={ranges:{'40010029':{
   citation:'Matthieu 10:29',
   html:'<p><span class="verseNum">29</span>Deux&nbsp;moineaux&#8239;ne se vendent-ils pas pour&nbsp;une pièce<sup class="fnRef">*</sup> de monnaie\u200b ? <a data-fnid="123" href="#fn">a</a></p>',
   footnotes:[
    {source:'<sup>a</sup>',content:'<p>Litt.&nbsp;« une pièce de monnaie ».</p>'},
    {source:'<span class="label">moineaux</span>',content:'<p>Le mot grec désigne un petit oiseau.</p>'}
   ],
   commentaries:[{source:'<span>petit oiseau</span>',content:'<p>Une note d’étude sur le contexte.</p>'}],
   crossReferences:[{source:'<sup>+</sup>',targets:[{vs:'43003016',standardCitation:'Jean 3:16'}]}]
 }}};
 await page.route('**/json/html/40010029',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Matthieu 10:29'));
 const pane=page.locator('.biblelab-side');
 const reading=pane.locator('.biblelab-verse-reading-copy');
 await expect(reading).toBeVisible();
 await expect(reading).toHaveText('Deux moineaux ne se vendent-ils pas pour une pièce de monnaie ?');
 await expect(reading).not.toContainText('*');
 await expect(reading).not.toContainText('29');
 await expect(pane.locator('.biblelab-reader-note-source')).toContainText(['moineaux','petit oiseau']);
 await expect(pane.getByText('Notes de traduction')).toBeVisible();
 await expect(pane.getByText('Notes d’étude')).toBeVisible();
 await pane.getByText('Renvois bibliques').click();
 await expect(pane.getByText('Jean 3:16',{exact:true}).first()).toBeVisible();
});

test('WOL chapter fallback only reads the requested verse and avoids reference marker artifacts',async({page})=>{
 const html='<html><main id="content"><h1>Matthieu 10</h1>'+
  '<p id="v40-10-28"><span class="verseNum">28</span> Ne craignez pas les hommes.</p>'+
  '<p id="v40-10-29"><span class="verseNum">29</span> Deux&nbsp;moineaux<sup>*</sup> tombent à terre.</p>'+
  '<p id="v40-10-30"><span class="verseNum">30</span> Les cheveux sont comptés.</p>'+
  '</main></html>';
 await page.route('https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/40/10',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Matthieu 10:29'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.locator('.biblelab-verse-reading-copy')).toHaveText('Deux moineaux tombent à terre.');
 await expect(pane.locator('.biblelab-verse-reading-copy')).not.toContainText('Ne craignez pas');
 await expect(pane.locator('.biblelab-verse-reading-copy')).not.toContainText('Les cheveux');
});

test('Long WOL article keeps section hierarchy, excludes answer widgets and progressively reveals paragraphs',async({page})=>{
 const paras=Array.from({length:22},(_,i)=>
  '<p data-pid="p'+(i+1)+'"><span class="parNum">'+(i+1)+'</span> Le paragraphe numéro '+(i+1)+' approfondit le sujet.</p>').join('');
 const html='<html><main><h1>La joie de faire le bien</h1>'+
  '<h2>UN EXEMPLE DE BONTÉ</h2>'+
  '<p class="studyQuestion">1. Que montre cet exemple ?</p><p>Ta réponse</p>'+
  paras+'</main></html>';
 await page.route('https://wol.jw.org/fr/wol/d/r30/lp-f/2024663',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
 await page.evaluate(async()=>{
  const {app}=(window as any).atlasTest;
  const file=await app.vault.create('Mes notes/Article lecture.md',
   '[Étude](https://wol.jw.org/fr/wol/d/r30/lp-f/2024663)');
  app.workspace.activeFile=file;app.workspace.trigger('file-open',file);
 });
 const pane=page.locator('.biblelab-side');
 await pane.getByRole('button',{name:'Références'}).click();
 await pane.locator('.biblelab-reader-summary').filter({hasText:'Étude'}).first().click();
 await expect(pane.getByText('UN EXEMPLE DE BONTÉ')).toBeVisible();
 await expect(pane.getByText('1. Que montre cet exemple ?')).toBeVisible();
 await expect(pane.getByText('Ta réponse')).toHaveCount(0);
 await expect(pane.locator('.biblelab-article-parnum').first()).toHaveText('1');
 await expect(pane.getByText('Le paragraphe numéro 22 approfondit le sujet.')).toHaveCount(0);
 await pane.getByRole('button',{name:/Afficher la suite/}).click();
 await expect(pane.getByText('Le paragraphe numéro 22 approfondit le sujet.')).toBeVisible();
});
