import {test,expect} from '@playwright/test';

const base='https://wol.jw.org/fr/wol/d/r30/lp-f/2024663#h=3';
const prepare=async(page:any)=>{
  await page.route('https://**/*',route=>route.abort());
  await page.goto('/obsidian/dev/index.html'+(page._dark?'?theme=dark':''));
  await page.waitForFunction(()=>(window as any).atlasTest?.ready);
  await page.evaluate(async url=>{
    const plugin=(window as any).atlasTest.plugin;
    await plugin.saveResearchDesk({
      version:1,activeId:'demo-plan',
      plans:[{id:'demo-plan',title:'Les anciens et l’amitié',
        branches:[{id:'a',title:'Les liens entre anciens'},{id:'b',title:'Confiance et amitié'}],
        createdAt:1730670000000,updatedAt:1730670000000}]
    });
    await plugin.saveResearchCollection({
      version:1,
      captures:[
        {id:'source1',label:'Jean 7:24',url,excerpt:'Jugez avec justice.',
          comment:'L’importance d’être impartial',planId:'demo-plan',createdAt:1730670000000},
        {id:'source2',label:'Une réflexion à approfondir',url:'',excerpt:'',
          comment:'À revoir pendant une autre étude',planId:'demo-plan',createdAt:1730670001000}
      ],
      ideas:[{id:'idea1',statement:'Cultiver une véritable amitié',
        captureIds:['source1'],planId:'demo-plan',createdAt:1730670000000,updatedAt:1730670000000},
        {id:'idea2',statement:'Gagner la confiance avec patience',
        captureIds:[],planId:'demo-plan',createdAt:1730670000000,updatedAt:1730670000000}]
    });
    await plugin.openBibleLab();
  },base);
};

test('Design preview — desktop light and dark study workspace',async({page})=>{
  await page.setViewportSize({width:1180,height:850});
  await prepare(page);
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByRole('heading',{name:'Que veux-tu approfondir ?'})).toBeVisible();
  await pane.screenshot({path:'test-results/bible-lab-preview-light.png'});
  await page.evaluate(()=>document.body.classList.add('theme-dark'));
  await pane.screenshot({path:'test-results/bible-lab-preview-dark.png'});
});
test('Design preview — narrow sidebar and collapsed inbox',async({page})=>{
  await page.setViewportSize({width:430,height:760});
  await prepare(page);
  const pane=page.locator('.biblelab-side');
  await expect(pane.getByRole('combobox',{name:'Recherche active'})).toBeVisible();
  await pane.screenshot({path:'test-results/bible-lab-preview-narrow.png'});
  await pane.locator('.biblelab-tab[aria-label="Trouvailles"]').click();
  await expect(pane.locator('.biblelab-manual-capture')).not.toHaveAttribute('open','');
  await pane.screenshot({path:'test-results/bible-lab-preview-inbox.png'});
});
