import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';

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
  expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/jwsd-real-'+symbol+'.png'});
});
