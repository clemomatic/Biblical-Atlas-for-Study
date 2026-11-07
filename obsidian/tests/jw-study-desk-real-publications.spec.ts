import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {bibleVerseOracle} from './fixtures/bibleOracle';

// Opt-in: files downloaded directly from the official public media API.
// No publication bytes are committed to the repository.
const directory=process.env.ATLAS_REAL_JWPUB_DIR;
test.skip(!directory,'Set ATLAS_REAL_JWPUB_DIR to real it/nwtsty .jwpub files and API JSON.');
for(const symbol of ['nwtsty','it','nwt'])test('Real '+symbol+' downloads, installs and reads without leaving the library',async({page})=>{
  test.setTimeout(240_000);
  const metadata=JSON.parse(readFileSync(path.join(directory!,symbol+'.json'),'utf8'));
  const item=metadata.files.F.JWPUB[0];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.route('https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS**',route=>route.fulfill({json:metadata}));
  await page.goto('/obsidian/dev/index.html?theme=dark');
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(async({url,symbol})=>{
    (window as any).atlasFileRedirects={[url]:'/__real_jwpub/'+symbol};
    const {app,plugin}=(window as any).atlasTest;
    for(const leaf of [...app.workspace.leaves])leaf.detach();
    await plugin.openVisualLibrary();
  },{url:item.file.url,symbol});
  const library=page.locator('.blb-library');
  const title=symbol==='it'?'Étude perspicace des Écritures':symbol==='nwt'?'La Bible · Traduction du monde nouveau':'La Bible · édition d’étude';
  const start=Date.now();
  await library.getByRole('article',{name:title,exact:true}).getByRole('button',{name:'Télécharger',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(symbol=>{
    return (window as any).atlasTest.plugin.publicationDownloads.get(symbol)?.stage;
  },symbol),{timeout:210_000}).toBe('ready');
  const result=await page.evaluate(symbol=>{
    const files=(window as any).atlasTest.files();
    const record=files.filter((f:any)=>f.path.endsWith('_BIBLE_LAB_VIRTUAL_INDEX.json')).map((f:any)=>JSON.parse(f.content)).find((i:any)=>i.publication.symbol===symbol);
    return {publication:record?.publication,documents:record?.documents.length,chapters:record?.documents.filter((d:any)=>d.bookNumber).length,
      sourceBytes:files.find((f:any)=>f.path.endsWith('/publication.jwpub'))?.content.byteLength,notes:files.filter((f:any)=>f.path.includes('/Bibliothèque virtuelle/')&&f.path.endsWith('.md')).length};
  },symbol);
  console.log(JSON.stringify({symbol,elapsedSeconds:Math.round((Date.now()-start)/1000),...result}));
  expect(result.sourceBytes).toBe(item.filesize);expect(result.notes).toBe(0);expect(result.publication.language).toBe(3);
  await page.screenshot({path:'test-results/jwsd-real-'+symbol+'-shelf-'+test.info().project.name+'.png'});
  await library.locator('[data-download-key="'+symbol+'|"]').getByRole('button',{name:'Lire',exact:true}).click({timeout:15000});
  if(symbol!=='it'){
    expect(result.chapters).toBe(1189);
    await library.getByRole('combobox',{name:'Livre de la Bible'}).selectOption('43');
    await library.getByRole('button',{name:'Lire Jean 7',exact:true}).click({timeout:15000});
    await expect(library.locator('.blb-reader-text')).toContainText('apparence');
  }else{
    expect(result.documents).toBeGreaterThan(4900);
    await library.getByRole('searchbox',{name:'Rechercher dans cet ouvrage'}).fill('Aaron');
    await library.getByRole('button',{name:'Lire Aaron',exact:true}).click();
    await expect(library.locator('.blb-reader-text')).toContainText('Moïse');
  }
  if(symbol!=='it'){
    const expected=await bibleVerseOracle(path.join(directory!,symbol+'.jwpub'));
    const compared=await page.evaluate(async expected=>{
      const {plugin}=(window as any).atlasTest;
      const edition=(await plugin.localBible.editions())[0],data=await plugin.localBible.load(edition);
      const actual=new Map<string,string>();
      for(const c of data.chapters)for(const v of c.verses)actual.set(`${c.book}:${c.chapter}:${v.number}`,v.text);
      const mismatches:{key:string;actual?:string;expected:string}[]=[];let mismatchCount=0;
      const parser=new DOMParser();
      for(const [key,html] of Object.entries(expected)){
        const text=(parser.parseFromString(html,'text/html').body.textContent||'').replace(/\s+/gu,' ').trim();
        if(actual.get(key)!==text){mismatchCount++;if(mismatches.length<3)mismatches.push({key,actual:actual.get(key),expected:text});}
      }
      return {chapters:data.chapters.length,verses:actual.size,expected:Object.keys(expected).length,mismatchCount,mismatches};
    },expected);
    console.log(JSON.stringify({symbol,verseOracle:compared}));
    expect(compared.mismatchCount,JSON.stringify(compared.mismatches)).toBe(0);
    expect(compared.verses).toBe(compared.expected);expect(compared.chapters).toBe(1189);
    await page.evaluate(()=>(window as any).atlasTest.plugin.openStudyDesk('bible'));
    const bible=page.locator('.jwsd-bible');
    const books=await bible.locator('select[aria-label="Livre de la Bible"] option').evaluateAll(options=>options.map(o=>({book:Number((o as HTMLOptionElement).value),name:o.textContent!})));
    expect(books).toHaveLength(66);
    const unresolved=await page.evaluate(async books=>{
      const missing:string[]=[];const {plugin}=(window as any).atlasTest;
      for(const book of books){const ref={label:book.name+' 1:1',url:`https://wol.jw.org/fr/wol/b/r30/lp-f/nwt/${book.book}/1`,kind:'scripture',origin:'pinned'};
        const result=await plugin.localBible.resolve(ref);if(result?.source!=='local'||!result.lines.length)missing.push(ref.label);}
      return missing;
    },books);
    expect(unresolved).toEqual([]);
    if(!await bible.locator('details').evaluate((el:HTMLDetailsElement)=>el.open))await bible.locator('summary').click();
    await bible.getByRole('combobox',{name:'Livre de la Bible',exact:true}).selectOption('43');
    if(!await bible.locator('details').evaluate((el:HTMLDetailsElement)=>el.open))await bible.locator('summary').click();
    await bible.getByRole('button',{name:'Lire Jean 7',exact:true}).click();
    await bible.getByRole('button',{name:'Aperçu de Jean 7:24',exact:true}).click();
    const popup=page.locator('.biblelab-inline-popover');
    await expect(popup).toContainText('Lecture locale');await expect(popup).toContainText('apparence');
    await expect(popup.locator('.biblelab-popover-scripture-number')).toHaveText(['24']);
    await popup.getByRole('button',{name:'Fermer',exact:true}).click();
    await bible.getByRole('tab',{name:'Rechercher',exact:true}).click();
    await bible.getByRole('searchbox',{name:'Mots du verset'}).fill('apparence');
    await expect(bible.getByRole('button',{name:'Lire Jean 7:24',exact:true})).toBeVisible();
    await bible.getByRole('button',{name:'Lire Jean 7:24',exact:true}).click();
    await expect(bible.locator('.jwsd-bible-verse.is-target')).toContainText('apparence');
    await page.evaluate(()=>{const {app}=(window as any).atlasTest;for(const leaf of [...app.workspace.leaves])if(leaf.view.getViewType()!=='jw-study-desk-bible')leaf.detach();});
    await bible.locator('.jwsd-stage').evaluate(el=>{el.scrollTop=0;});
    await page.screenshot({path:'test-results/jwsd-real-bible-'+symbol+'-'+test.info().project.name+'.png'});
    // Long book names must leave room for chapter arrows in a narrow pane.
    if(!await bible.locator('details').evaluate((el:HTMLDetailsElement)=>el.open))await bible.locator('summary').click();
    await bible.getByRole('combobox',{name:'Livre de la Bible',exact:true}).selectOption('52');
    await page.setViewportSize({width:280,height:920});
    const bounds=await bible.locator('.jwsd-bible-reader-heading').evaluate(el=>{
      const title=el.querySelector('h2')!.getBoundingClientRect(),controls=el.querySelector('.jwsd-bible-chapter-nav')!.getBoundingClientRect();
      return {titleRight:title.right,controlsLeft:controls.left,right:el.getBoundingClientRect().right,controlsRight:controls.right};
    });
    expect(bounds.titleRight).toBeLessThanOrEqual(bounds.controlsLeft);
    expect(bounds.controlsRight).toBeLessThanOrEqual(bounds.right+1);
  }
  expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/jwsd-real-'+symbol+'.png'});
});
