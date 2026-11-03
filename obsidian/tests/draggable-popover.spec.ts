import {test,expect} from '@playwright/test';

const FIRST='https://wol.jw.org/fr/wol/d/r30/lp-f/2018287';
const SECOND='https://wol.jw.org/fr/wol/d/r30/lp-f/2018288';

test.beforeEach(async({page})=>{
 await page.route('https://**/*',route=>route.abort());
 await page.goto('/obsidian/dev/index.html');
 await page.waitForFunction(()=>(window as any).atlasTest?.ready);
 await page.route(FIRST,route=>route.fulfill({status:200,contentType:'text/html',body:
  '<main class="bodyTxt"><h1>Premier article</h1><p>Début de la lecture.</p>'+
  '<p>Consulte <a href="'+SECOND+'">Un deuxième article</a> pour aller plus loin.</p></main>'}));
 await page.route(SECOND,route=>route.fulfill({status:200,contentType:'text/html',body:
  '<main class="bodyTxt"><h1>Deuxième article</h1><p>Une étude sur une autre question.</p></main>'}));
 await page.evaluate(url=>{
  const p=document.createElement('p');
  p.id='popover-drag-note';p.innerHTML='<a href="'+url+'">Premier article</a>';
  document.body.appendChild(p);
  (window as any).atlasTest.plugin.markdownPostProcessor(p);
 },FIRST);
});

test('The preview can be dragged by its header, stays put on navigation and can be recentered',async({page})=>{
 await page.locator('#popover-drag-note a').click();
 const popup=page.locator('.biblelab-inline-popover');
 await expect(popup).toContainText('Début de la lecture.');
 const first=await popup.boundingBox();
 const header=await popup.locator('.biblelab-popover-header').boundingBox();
 expect(first&&header).toBeTruthy();
 await page.mouse.move(header!.x+20,header!.y+20);
 await page.mouse.down();
 await page.mouse.move(header!.x+135,header!.y+102,{steps:6});
 await page.mouse.up();
 const dragged=await popup.boundingBox();
 expect(dragged).toBeTruthy();
 expect(dragged!.x).toBeGreaterThan(first!.x+70);
 expect(dragged!.y).toBeGreaterThan(first!.y+50);

 // Clicking a reference no longer snaps the popup back to its original anchor.
 await popup.locator('.biblelab-popover-inline-link').filter({hasText:'Un deuxième article'}).click();
 await expect(popup).toContainText('Une étude sur une autre question.');
 const next=await popup.boundingBox();
 expect(Math.abs(next!.x-dragged!.x)).toBeLessThanOrEqual(2);
 expect(Math.abs(next!.y-dragged!.y)).toBeLessThanOrEqual(2);

 // Recenter is independent of the close button and keeps the reader usable.
 await popup.getByRole('button',{name:'Recentrer la fenêtre'}).click();
 const centered=await popup.boundingBox();
 const size=page.viewportSize()!;
 expect(centered).toBeTruthy();
 expect(Math.abs(centered!.x-(size.width-centered!.width)/2)).toBeLessThanOrEqual(2);
 expect(Math.abs(centered!.y-(size.height-centered!.height)/2)).toBeLessThanOrEqual(2);
 await popup.getByRole('button',{name:'Fermer'}).click();
 await expect(popup).toHaveCount(0);
});

test('After resizing to a narrow screen, the dragged reader stays within the viewport',async({page})=>{
 await page.locator('#popover-drag-note a').click();
 const popup=page.locator('.biblelab-inline-popover');
 await expect(popup).toContainText('Début de la lecture.');
 await popup.getByRole('button',{name:'Recentrer la fenêtre'}).click();
 await page.setViewportSize({width:390,height:780});
 const box=await popup.boundingBox();
 expect(box).toBeTruthy();
 expect(box!.x).toBeGreaterThanOrEqual(11);
 expect(box!.y).toBeGreaterThanOrEqual(11);
 expect(box!.x+box!.width).toBeLessThanOrEqual(379);
 expect(box!.y+box!.height).toBeLessThanOrEqual(769);
});

test('Touch dragging moves the preview without closing it or scrolling the article',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await page.locator('#popover-drag-note a').click();
 const popup=page.locator('.biblelab-inline-popover');
 await expect(popup).toContainText('Début de la lecture.');
 const start=await popup.boundingBox();
 const head=await popup.locator('.biblelab-popover-header').boundingBox();
 const x=head!.x+19,y=head!.y+20;
 const client=await page.context().newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+40,y:y+70,id:1}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const moved=await popup.boundingBox();
 expect(moved).toBeTruthy();
 expect(moved!.y).toBeGreaterThan(start!.y+35);
 await expect(popup).toContainText('Début de la lecture.');
 await expect(popup.getByRole('button',{name:'Fermer'})).toBeVisible();
});
