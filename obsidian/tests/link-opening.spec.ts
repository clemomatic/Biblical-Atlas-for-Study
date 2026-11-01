import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
});

test('Click on a WOL bibliography link opens the correct article immediately in sidebar',async({page})=>{
 const old='https://wol.jw.org/fr/wol/s/r30/lp-f?q=w24%20Novembre%20p.%2020-25';
 const lookup='https://wol.jw.org/fr/wol/l/r30/lp-f?q=w24+Novembre+p.+20-25';
 const article='https://wol.jw.org/fr/wol/d/r30/lp-f/202488881';
 await page.route(lookup,route=>route.fulfill({status:200,contentType:'text/html',
   body:'<html><main><li><a href="/fr/wol/d/r30/lp-f/202488881">Article pertinent</a><span>w24 novembre p.20-25</span></li></main></html>'}));
 await page.route(article,route=>route.fulfill({status:200,contentType:'text/html',
   body:'<html><main class="bodyTxt"><h1>Article pertinent</h1><p>Le bon contenu directement dans Bible Lab.</p><p>Et le deuxième paragraphe.</p></main></html>'}));
 await page.evaluate(async legacy=>{
   const {app,plugin}=(window as any).atlasTest;
   const file=await app.vault.create('Mes notes/Lecture WOL.md','[Publication]('+legacy+')\nNe jamais modifier le contenu.');
   app.workspace.activeFile=file;
   const region=document.createElement('div');
   region.id='reading-reference';
   const link=document.createElement('a');link.href=legacy;link.textContent='Publication';
   region.append(link);document.body.append(region);
   plugin.markdownPostProcessor(region);
 },old);
 const link=page.locator('#reading-reference a');
 await expect(link).toHaveAttribute('href',lookup);
 await link.click();
 const sidebar=page.locator('.biblelab-side:not(.biblelab-reference-popup)');
 await expect(sidebar.locator('.biblelab-tab[aria-label="Références"]')).toHaveAttribute('aria-selected','true');
 await expect(sidebar.getByText('Le bon contenu directement dans Bible Lab.')).toBeVisible();
 expect(await page.evaluate(()=>(window as any).atlasTest.file('Mes notes/Lecture WOL.md')))
   .toContain('Ne jamais modifier le contenu.');
});

test('Popup preference displays a scrollable official reader and keeps sidebar closed',async({page})=>{
 const article='https://wol.jw.org/fr/wol/d/r30/lp-f/202488882';
 await page.route(article,route=>route.fulfill({status:200,contentType:'text/html',
   body:'<html><main class="bodyTxt"><h1>Étudier davantage</h1><p>Lecture dans la popup.</p><p>Deuxième paragraphe.</p></main></html>'}));
 await page.evaluate(async url=>{
   const {app,plugin}=(window as any).atlasTest;
   await plugin.updateSettings({referenceOpenMode:'popup'});
   const file=await app.vault.create('Mes notes/Popup WOL.md','[Ouvrir la publication]('+url+')');
   app.workspace.activeFile=file;
   const region=document.createElement('div');region.id='popup-source';
   const link=document.createElement('a');link.href=url;link.textContent='Ouvrir la publication';
   region.append(link);document.body.append(region);
   plugin.markdownPostProcessor(region);
 },article);
 await page.locator('#popup-source a').click();
 const modal=page.getByRole('dialog').filter({has:page.locator('.biblelab-reference-popup')});
 await expect(modal.getByText('Lecture dans la popup.')).toBeVisible();
 await expect(page.locator('.biblelab-side:not(.biblelab-reference-popup)')).toHaveCount(0);
 await modal.getByRole('button',{name:'Fermer la lecture'}).click();
 await expect(page.locator('.biblelab-reference-popup')).toHaveCount(0);
});

test('Settings dropdown is persisted and legacy settings default to the sidebar',async({page})=>{
 await page.evaluate(()=>{
   const {plugin}=(window as any).atlasTest;
   plugin.settingTab.display();
   document.body.append(plugin.settingTab.containerEl);
 });
 const dropdown=page.getByRole('combobox',{name:'Clic sur un lien WOL'});
 await expect(dropdown).toHaveValue('sidebar');
 await dropdown.selectOption('popup');
 await expect.poll(async()=>page.evaluate(()=>(window as any).atlasTest.plugin.settings.referenceOpenMode)).toBe('popup');
 await expect.poll(async()=>page.evaluate(()=>window.__savedSettings?.referenceOpenMode)).toBe('popup');
 await dropdown.selectOption('browser');
 await expect.poll(async()=>page.evaluate(()=>window.__savedSettings?.referenceOpenMode)).toBe('browser');
});

test('Only official WOL references are intercepted, not unrelated or topical links',async({page})=>{
 await page.evaluate(()=>{
   const {plugin}=(window as any).atlasTest;
   const root=document.createElement('div');root.id='nonreferences';
   for(const href of [
     'https://example.com/some-article',
     'https://wol.jw.org/fr/wol/s/r30/lp-f?q=amour+biblique',
     'https://wol.jw.org.evil.test/fr/wol/d/r30/lp-f/111'
   ]){
     const link=document.createElement('a');link.href=href;link.textContent=href;
     root.append(link);
   }
   document.body.append(root);
   plugin.markdownPostProcessor(root);
 });
 await expect(page.locator('#nonreferences [data-bible-lab-bound]')).toHaveCount(0);
});

test('!!scripture!! markers also respect the popup preference',async({page})=>{
 await page.route('**/json/html/40010029',route=>route.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({ranges:{'40010029':{citation:'Matthieu 10:29',html:'<p>Deux moineaux ne se vendent-ils pas ?</p>'}}})}));
 await page.evaluate(async()=>{
   const {plugin}=(window as any).atlasTest;
   await plugin.updateSettings({referenceOpenMode:'popup'});
   const node=document.createElement('p');
   node.id='scripture-marker';
   node.textContent='Référence !!Matthieu 10:29!! à consulter.';
   document.body.append(node);
   plugin.markdownPostProcessor(node);
 });
 await page.locator('#scripture-marker a.biblelab-ref').click();
 await expect(page.locator('.biblelab-reference-popup').getByText('Deux moineaux ne se vendent-ils pas ?')).toBeVisible();
});
