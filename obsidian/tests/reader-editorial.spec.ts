import { test, expect } from '@playwright/test';

const ARTICLE='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663';
const RELATED='https://wol.jw.org/fr/wol/d/r30/lp-f/2024664';
const HTML='<html><main class="bodyTxt">'+
 '<h1>Un amour qui se manifeste</h1>'+
 '<p class="sb">UN AMOUR SINCÈRE</p>'+
 '<p class="qu"><strong>1. Pourquoi est-il important d’aimer les autres ?</strong></p>'+
 '<p class="p" data-pid="3"><span class="parNum">1</span>Jésus <strong>aimait profondément</strong> '+
 'les personnes et montrait <em>une vraie compassion</em>. Il a expliqué dans '+
 '<a href="/fr/wol/d/r30/lp-f/2024664"><strong>cet autre article</strong></a> comment agir.</p>'+
 '<p class="p" data-pid="4"><span class="parNum">2</span>La bonté est un choix.</p>'+
 '<blockquote><p>Une citation en <em>italique</em> pour réfléchir.</p></blockquote>'+
 '<ul><li>Première idée pratique.</li><li>Deuxième idée pratique.</li></ul>'+
 '<p class="themeScrp">La douceur favorise la paix.</p>'+
 '</main></html>';

test.beforeEach(async ({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.route(ARTICLE,route=>route.fulfill({status:200,contentType:'text/html',body:HTML}));
 await page.route(RELATED,route=>route.fulfill({status:200,contentType:'text/html',
  body:'<html><main><h1>Article lié</h1><p>La compassion grandit.</p></main></html>'}));
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Editorial sidebar preserves original WOL headings, questions, paragraph numbers and emphasis',async({page})=>{
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab(ARTICLE,'Un amour qui se manifeste'));
 const pane=page.locator('.biblelab-side').filter({has:page.locator('.biblelab-tabs')});
 const article=pane.locator('.biblelab-article-reading');
 await expect(article.locator('.biblelab-article-heading')).toHaveText('UN AMOUR SINCÈRE');
 await expect(article.locator('.biblelab-article-question')).toHaveText('1. Pourquoi est-il important d’aimer les autres ?');
 await expect(article.locator('.biblelab-article-question strong')).toHaveText('1. Pourquoi est-il important d’aimer les autres ?');
 const first=article.locator('.biblelab-article-paragraph.is-numbered').first();
 await expect(first.locator('.biblelab-article-parnum')).toHaveText('1');
 await expect(first.locator('strong')).toContainText('aimait profondément');
 await expect(first.locator('em')).toContainText('une vraie compassion');
 await expect(first.getByRole('button',{name:'Lire la référence cet autre article'})).toHaveCount(1);
 await expect(article.locator('.biblelab-article-quote')).toContainText('Une citation en italique');
 await expect(article.locator('.biblelab-article-list-item')).toHaveCount(2);
 await expect(article.locator('.biblelab-article-theme')).toContainText('La douceur favorise la paix');
 await expect(article.locator('.biblelab-article-paragraph.is-unnumbered')).toHaveCount(0);
});

test('Native Obsidian tab uses spacious editorial styles and keeps original text selectable',async({page})=>{
 await page.evaluate(()=> (window as any).atlasTest.plugin.openWolArticleTab({
   url:ARTICLE,label:'Un amour qui se manifeste',kind:'document',origin:'pinned'
 }));
 const tab=page.locator('.biblelab-article-tab');
 await expect(tab.getByText('Un amour qui se manifeste').first()).toBeVisible();
 await expect(tab.locator('.biblelab-article-heading')).toBeVisible();
 await expect(tab.locator('.biblelab-article-question')).toBeVisible();
 const paragraph=tab.locator('.biblelab-article-paragraph p').first();
 await expect(paragraph).toContainText('Jésus aimait profondément');
 expect(await paragraph.evaluate(el=>getComputedStyle(el).userSelect)).toBe('text');
 const size=await paragraph.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 expect(size).toBeGreaterThanOrEqual(15);
 await tab.getByRole('button',{name:'Lire la référence cet autre article'}).first().click();
 await expect(tab.getByText('La compassion grandit.')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).atlasTest.app.workspace
   .getLeavesOfType('bible-lab-wol-article').length)).toBe(1);
});

test('Floating preview retains bold, italics, question styling and safe WOL links',async({page})=>{
 await page.evaluate(()=>{
  const node=document.createElement('p');
  node.id='editorial-preview-link';
  node.innerHTML='<a href="https://wol.jw.org/fr/wol/d/r30/lp-f/2024663">Un amour qui se manifeste</a>';
  document.body.appendChild(node);
  (window as any).atlasTest.plugin.markdownPostProcessor(node);
 });
 await page.locator('#editorial-preview-link a').click();
 const popup=page.locator('.biblelab-inline-popover');
 await expect(popup.locator('.biblelab-popover-heading')).toHaveText('UN AMOUR SINCÈRE');
 await expect(popup.locator('.biblelab-popover-question strong')).toHaveText('1. Pourquoi est-il important d’aimer les autres ?');
 await expect(popup.locator('.biblelab-popover-paragraph strong')).toContainText('aimait profondément');
 await expect(popup.locator('.biblelab-popover-paragraph em')).toContainText('une vraie compassion');
 await expect(popup.getByRole('button',{name:'Lire cet autre article'})).toHaveCount(1);
 await expect(popup.locator('.biblelab-popover-quote')).toBeVisible();
});

test('Unknown remote HTML is never used as executable or injected markup',async({page})=>{
 const malicious=HTML.replace('Jésus <strong>','<script>window.__wolInjected=true</script>Jésus <strong>');
 await page.route(ARTICLE,route=>route.fulfill({status:200,contentType:'text/html',body:malicious}));
 await page.evaluate(()=>(window as any).atlasTest.plugin.openBibleLab(ARTICLE,'Article sûr'));
 await expect(page.locator('.biblelab-article-reading')).toContainText('Jésus aimait profondément');
 expect(await page.evaluate(()=>(window as any).__wolInjected)).not.toBe(true);
});
