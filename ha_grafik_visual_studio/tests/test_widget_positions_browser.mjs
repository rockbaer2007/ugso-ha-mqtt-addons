import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import '../web/widget-sets/core.js';
import {getWidgetDefinition} from '../web/widget-registry.js';
const url = process.env.STUDIO_TEST_URL;

test('printer and core widgets retain dragged positions through save, reload and runtime', {skip:!url}, async () => {
  const {chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const page = await browser.newPage({viewport:{width:1650,height:1100}}), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.printer.wg'},data:await readFile(new URL('../packages/printer/ugso.printer.wg',import.meta.url))});
    const catalog = await (await page.request.get(new URL('api/widget-packages',url).href)).json();
    const printer = catalog.packages.find(p=>p.id==='ugso.printer').widgets[0];
    const fixture = await (await page.request.get(new URL('api/project',url).href)).json();
    fixture.pages[0].widgets = [printer,getWidgetDefinition('text'),getWidgetDefinition('sensor')].map((def,i)=>({...def.defaults,type:def.type,id:`position-${i}`,x:80+i*350,y:100,width:280,height:280}));
    Object.assign(fixture.pages[0].page,{width:1400,height:900});
    fixture.currentPageId=fixture.pages[0].id;fixture.settings={...fixture.settings,autoSave:false};
    let saved,failSave=false,saveDelay=0;
    await page.context().route('**/api/project*',async route=>{
      if(route.request().method()==='PUT') {
        if(failSave)return route.fulfill({status:500,json:{error:'test save failure'}});
        const snapshot=route.request().postDataJSON();
        if(saveDelay)await new Promise(resolve=>setTimeout(resolve,saveDelay));
        saved=snapshot;
      }
      return route.fulfill({json:saved||fixture});
    });
    await page.context().route('**/api/states*',route=>route.fulfill({json:{states:[]}}));
    await page.goto(url);
    await page.locator('#position-2').waitFor();
    for (const widget of fixture.pages[0].widgets) {
      const box = await page.locator(`#${widget.id}`).boundingBox();
      await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();
      await page.mouse.move(box.x+120,box.y+100,{steps:8});await page.mouse.up();
    }
    const positions = await page.locator('#stage > .widget').evaluateAll(nodes=>nodes.map(n=>({id:n.id,x:parseFloat(n.style.left),y:parseFloat(n.style.top)})));
    assert.equal(positions.length,3);
    for(const position of positions) {const old=fixture.pages[0].widgets.find(w=>w.id===position.id);assert.ok(position.x>old.x&&position.y>old.y,'drag moved widget');}
    await page.locator('#save').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));
    for(const position of positions) {const widget=saved.pages[0].widgets.find(w=>w.id===position.id);assert.equal(widget.x,position.x);assert.equal(widget.y,position.y);}
    for (const target of [url,new URL('runtime',url).href,new URL('?mode=runtime',url).href]) {
      await page.goto(target);await page.locator('#position-2').waitFor();
      for(const position of positions) {
        const actual=await page.locator(`#${position.id}`).evaluate(n=>{const r=n.getBoundingClientRect(),s=document.querySelector('#stage').getBoundingClientRect();return {x:parseFloat(n.style.left),y:parseFloat(n.style.top),dx:r.left-s.left,dy:r.top-s.top};});
        assert.equal(actual.x,position.x);assert.equal(actual.y,position.y);
        assert.ok(Math.abs(actual.dx-position.x)<2&&Math.abs(actual.dy-position.y)<2,'rendered position matches page coordinates');
      }
    }
    await page.goto(url);await page.locator('#position-0').waitFor();
    const box=await page.locator('#position-0').boundingBox();
    await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+100,box.y+80,{steps:8});await page.mouse.up();
    const moved=await page.locator('#position-0').evaluate(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top)}));
    await page.locator('#runtime-link').click();
    await page.waitForURL(/mode=runtime/);await page.locator('#position-0').waitFor();
    assert.equal(await page.locator('#position-0').evaluate(n=>parseFloat(n.style.left)),moved.x,'runtime navigation includes unsaved drag');
    assert.equal(saved.pages[0].widgets[0].y,moved.y);
    await page.goto(url);await page.locator('#position-0').waitFor();
    saveDelay=500;
    await page.locator('#save').click();
    const current=await page.locator('#position-0').boundingBox();
    await page.mouse.move(current.x+20,current.y+20);await page.mouse.down();await page.mouse.move(current.x+70,current.y+50,{steps:4});await page.mouse.up();
    const latest=await page.locator('#position-0').evaluate(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top)}));
    const popupPromise=page.waitForEvent('popup');await page.locator('#runtime-tab-link').click();
    const popup=await popupPromise;await popup.waitForURL(/runtime/);await popup.locator('#position-0').waitFor();
    assert.equal(await popup.locator('#position-0').evaluate(n=>parseFloat(n.style.left)),latest.x,'new tab includes changes made during pending save');
    assert.equal(await popup.evaluate(()=>window.opener),null);
    await popup.close();saveDelay=0;failSave=true;
    await page.locator('#runtime-link').click();
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Speichern fehlgeschlagen'));
    assert.ok(!page.url().includes('mode=runtime'),'save failure keeps editor open');
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
