import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const url=process.env.STUDIO_TEST_URL;

test('Basic inputs expose four sides, move connections, persist and receive values in runtime', {skip:!url}, async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1650,height:1050}}), errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.currentPageId=fixture.pages[0].id;
    fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1200,height:800});
    fixture.pages[0].widgets=['sensor','string'].flatMap((type,i)=>[
      {id:'source-'+i,type,x:40,y:40+i*240,width:220,height:120,state:i?'Heating running':'23.5',factor:1,digits:1,dockPointsEnabled:false,dataOutputEnabled:true},
      {id:'target-'+i,type,x:400,y:40+i*240,width:240,height:120,state:i?'Local':'999',factor:1,digits:1,dockPointsEnabled:false,dataOutputEnabled:false,dataInputEnabled:false},
      {id:'line-'+i,type:'svg-connection',dataFlowVariant:'value-connection',startWidgetId:'source-'+i,startAnchor:'right-center',endWidgetId:'target-'+i,endAnchor:'left-center'}
    ]);
    let saved;
    await page.route('**/api/project*',route=>{
      if(route.request().method()==='PUT')saved=route.request().postDataJSON();
      return route.fulfill({json:saved||fixture});
    });
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[],states:[]}}));
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[]}}));
    await page.goto(url);
    const readValue=i=>page.locator(`#target-${i} ${i?'.basic-string':'.value'}`).textContent();
    for(let i=0;i<2;i++) {
      assert.match(await readValue(i),i?/Local/:/999/);
      await page.locator('#target-'+i).click({position:{x:5,y:5}});
      await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      await page.locator('#properties [data-property-key="dataInputEnabled"]').check();
      await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      const inputs=page.locator(`input[name="target-${i}-dataInputAnchor"]`);
      const outputs=page.locator(`input[name="target-${i}-dataOutputAnchor"]`);
      const sides=await inputs.evaluateAll(nodes=>nodes.map(node=>node.value));
      assert.deepEqual(sides,['top-center','bottom-center','right-center','left-center']);
      assert.deepEqual(await outputs.evaluateAll(nodes=>nodes.map(node=>node.value)),sides);
      assert.match(await readValue(i),i?/Heating running/:/23[.,]5/);
      for(const side of sides) {
        await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
        await page.locator(`input[name="target-${i}-dataInputAnchor"][value="${side}"]`).check();
        assert.equal(await page.locator(`#target-${i} .input-dock-point`).getAttribute('data-anchor-id'),side);
        assert.match(await readValue(i),i?/Heating running/:/23[.,]5/);
      }
      await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      await page.locator('#properties [data-property-key="dataInputEnabled"]').uncheck();
      assert.match(await readValue(i),i?/Local/:/999/);
      await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
      await page.locator('#properties [data-property-key="dataInputEnabled"]').check();
    }
    await page.locator('#save').click();
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('gespeichert'));
    for(let i=0;i<2;i++) {
      const target=saved.pages[0].widgets.find(widget=>widget.id==='target-'+i);
      assert.equal(target.dataInputEnabled,true);
      assert.equal(target.dockPointsEnabled,false);
      assert.equal(target.dataInputAnchor,'left-center');
      assert.equal(saved.pages[0].widgets.find(widget=>widget.id==='line-'+i).endAnchor,'left-center');
    }
    await page.reload();
    assert.match(await readValue(0),/23[.,]5/);
    assert.match(await readValue(1),/Heating running/);
    await page.goto(new URL('runtime',url).href);
    assert.match(await readValue(0),/23[.,]5/);
    assert.match(await readValue(1),/Heating running/);
    assert.equal(await page.locator('.widget-dock-point').count(),0);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
