import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const url=process.env.STUDIO_TEST_URL;

test('create value point, connect Number, configure color and hide only the branch in runtime',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1650,height:1050}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.currentPageId=fixture.pages[0].id;
    fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1000,height:700});
    fixture.pages[0].widgets=[
      {id:'parent',type:'svg-connection',pathMode:'curve',startX:80,startY:160,endX:500,endY:160,animationSource:'number',animationNumberEntityId:'sensor.flow',baseColor:'#abcdef'},
      {id:'number',type:'sensor',x:600,y:330,width:180,height:100,dataInputEnabled:true,digits:1,factor:1},
      {id:'branch',type:'svg-connection',startX:80,startY:380,endWidgetId:'number',endAnchor:'left-center'}
    ];
    let saved;
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[],states:[]}}));
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[{entity_id:'sensor.flow',state:'42.5',attributes:{unit_of_measurement:'L/min'}}]}}));
    await page.goto(url);
    const hit=page.locator('#parent .connection-hit-target');
    const originalPath=await page.locator('#parent .connection-base').getAttribute('d');
    await hit.click({force:true});
    await hit.click({force:true});
    const dialog=page.locator('.connection-point-type-dialog');
    assert.equal(await dialog.locator('input[type=radio]').count(),3);
    await dialog.locator('input[value=value]').check();
    await dialog.getByRole('button',{name:'OK',exact:true}).click();
    const marker=page.locator('#parent polygon.is-value-output');
    assert.equal(await marker.count(),1);
    assert.equal((await marker.getAttribute('points')).split(' ').length,8);
    assert.equal(await page.locator('#parent .connection-base').getAttribute('d'),originalPath,'creating a value point keeps the original curve');
    await page.locator('#branch .connection-hit-target').click({force:true});
    await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
    const start=page.locator('#properties [data-property-key="startCollector"]');
    const tap=await start.locator('option').nth(1).getAttribute('value');
    assert.ok(tap);
    assert.equal(await page.locator('#properties [data-property-key="endCollector"] option').count(),1,'value output is not an input');
    await start.selectOption(tap);
    await page.waitForFunction(()=>/42[.,]5/.test(document.querySelector('#number .value')?.textContent||''));
    const branchPath=await page.locator('#branch .connection-base').getAttribute('d');
    // Select the parent through its line, then move the output off the main path.
    await hit.click({position:{x:60,y:1},force:true});
    const before=await marker.boundingBox();
    await page.mouse.move(before.x+before.width/2,before.y+before.height/2);
    await page.mouse.down();await page.mouse.move(before.x+before.width/2+55,before.y+before.height/2+45,{steps:5});await page.mouse.up();
    assert.equal(await page.locator('#parent .connection-base').getAttribute('d'),originalPath,'moving a value point never bends the parent');
    assert.notEqual(await page.locator('#branch .connection-base').getAttribute('d'),branchPath,'display branch follows the moved point');
    await page.locator('#settings-menu').click();
    await page.locator('#settings-value-point-color').fill('#bb2288');
    await page.locator('#settings-save').click();
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('polygon.is-value-output')).fill==='rgb(187, 34, 136)');
    assert.equal(await marker.evaluate(node=>getComputedStyle(node).fill),'rgb(187, 34, 136)');
    await page.locator('#save').click();
    await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('gespeichert'));
    assert.equal(saved.settings.valuePointColor,'#bb2288');
    assert.equal(saved.pages[0].widgets.find(widget=>widget.id==='parent').connectionPoints[0].valueOutputEnabled,true);
    assert.equal(saved.pages[0].widgets.find(widget=>widget.id==='parent').pathMode,'curve');
    await page.reload();
    await page.waitForFunction(()=>{const node=document.querySelector('polygon.is-value-output');return node&&getComputedStyle(node).fill==='rgb(187, 34, 136)';});
    assert.equal(await marker.evaluate(node=>getComputedStyle(node).fill),'rgb(187, 34, 136)');
    await page.goto(new URL('runtime',url).href);
    await page.waitForFunction(()=>/42[.,]5/.test(document.querySelector('#number .value')?.textContent||''));
    assert.equal(await page.locator('#parent').count(),1);
    assert.equal(await page.locator('#branch').count(),0);
    assert.equal(await page.locator('.is-value-output').count(),0);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
