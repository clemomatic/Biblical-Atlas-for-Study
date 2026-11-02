import {test,expect} from '@playwright/test';

const DOC='https://wol.jw.org/fr/wol/d/r30/lp-f/';
test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});
test('S-38 §§20,25 show the exact requested paragraphs before the full instructions',async({page})=>{
 await page.route(DOC+'1201038',route=>route.fulfill({status:200,contentType:'text/html',
  body:'<html><article class="bodyTxt"><h1>Instructions pour la réunion Vie chrétienne et ministère</h1>'+
  '<p><span class="parNum">19.</span> Une autre directive.</p>'+
  '<p><span class="parNum">20.</span> Durée des interventions.</p>'+
  '<p>25. Président de la réunion.</p></article></html>'}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('S-38 §20, 25'));
 const pane=page.locator('.biblelab-side');
 const reader=pane.locator('.biblelab-article-reading').first();
 await expect(reader.getByText('Paragraphes demandés : 20, 25')).toBeVisible();
 await expect(reader.getByText('Durée des interventions.').first()).toBeVisible();
 await expect(reader.getByText('Président de la réunion.').first()).toBeVisible();
 await expect(reader.locator('.biblelab-article-parnum').filter({hasText:'25'}).first()).toBeVisible();
 const source=pane.locator('.biblelab-reader-action[aria-label="WOL"]').first();
 await expect(source).toHaveCount(1);
});
test('Explicit Watchtower paragraph and th lesson resolve to the right WOL documents',async({page})=>{
 await page.route(DOC+'2022281',route=>route.fulfill({status:200,contentType:'text/html',
  body:'<html><main class="bodyTxt"><h1>Écoute les paroles des sages</h1>'+
  '<p><span class="parNum">15.</span> Sois demandeur.</p>'+
  '<p><span class="parNum">16.</span> Une autre pensée.</p></main></html>'}));
 await page.route(DOC+'1102018452',route=>route.fulfill({status:200,contentType:'text/html',
  body:'<html><main class="bodyTxt"><h1>Chaleur et empathie</h1><p>Parle avec une émotion sincère.</p></main></html>'}));
 const result=await page.evaluate(async()=>{
  const {plugin}= (window as any).atlasTest;
  await plugin.openBibleLab('w22 Février p. 13 §15');
 });
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Paragraphes demandés : 15')).toBeVisible();
 await expect(pane.getByText('Sois demandeur.').first()).toBeVisible();
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('th leçon 12'));
 await expect(pane.getByText('Chaleur et empathie').first()).toBeVisible();
});
test('Study verse popup hides technical note IDs and decodes HTML entities',async({page})=>{
 const entry={ranges:{'23026003':{
  citation:'Isaïe&amp;nbsp;26:3',
  html:'<p><span class="verseNum">3</span>Tu protégeras ceux qui s’appuient sur toi.</p>',
  footnotes:[{source:'23026003',content:'<p>Une expression expliquée.</p>'}],
  crossReferences:[{source:'23026003',targets:[{vs:'191190165',standardCitation:'Psaume&amp;nbsp;119:165'}]}]
 }}};
 await page.route('**/json/html/23026003',route=>route.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify(entry)}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab('Isaïe 26:3'));
 const pane=page.locator('.biblelab-side');
 await expect(pane.getByText('Isaïe 26:3').first()).toBeVisible();
 await expect(pane).not.toContainText('23026003');
 await expect(pane).not.toContainText('&nbsp');
 await pane.getByText('Renvois bibliques').click();
 await expect(pane.getByText('Psaume 119:165').first()).toBeVisible();
});
