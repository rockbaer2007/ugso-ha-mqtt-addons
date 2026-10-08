import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import '../web/widget-sets/core.js';
import {getWidgetDefinition} from '../web/widget-registry.js';
const url=process.env.STUDIO_TEST_URL;

test('two-second autosave saves drags and recovers from failed and hung requests', {skip:!url}, async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1650,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.pages[0].widgets=[{...getWidgetDefinition('text').defaults,type:'text',id:'autosave-widget',x:100,y:100,width:280,height:180}];
    Object.assign(fixture.pages[0].page,{width:1400,height:900});fixture.currentPageId=fixture.pages[0].id;
    fixture.settings={...fixture.settings,autoSave:true,autoSaveDelaySeconds:2};
    let saved,mode='ok',requests=0;
    await page.route('**/api/project*',route=>{
      if(route.request().method()==='PUT') {
        requests++;
        if(mode==='fail')return route.fulfill({status:500,json:{error:'temporary failure'}});
        if(mode==='hang')return;
        saved=route.request().postDataJSON();
      }
      return route.fulfill({json:saved||fixture});
    });
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[]}}));
    await page.clock.install();await page.goto(url);await page.locator('#autosave-widget').waitFor();
    const move=async()=>{
      const b=await page.locator('#autosave-widget').boundingBox();
      await page.mouse.move(b.x+20,b.y+20);await page.mouse.down();await page.mouse.move(b.x+70,b.y+50,{steps:4});await page.mouse.up();
      return page.locator('#autosave-widget').evaluate(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top)}));
    };
    const position=await move();await page.clock.runFor(1750);assert.equal(requests,0,'does not save before configured delay');
    await page.clock.runFor(1000);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('automatisch gespeichert'));
    assert.equal(saved.pages[0].widgets[0].x,position.x);assert.equal(saved.pages[0].widgets[0].y,position.y);
    mode='fail';await move();await page.clock.runFor(2750);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Speichern fehlgeschlagen'));
    const failed=requests;mode='ok';await page.clock.runFor(5000);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('automatisch gespeichert'),null,{timeout:3000});
    assert.ok(requests>failed,'retries unchanged dirty project after temporary failure');
    mode='hang';await move();await page.clock.runFor(2750);
    const latest=await move();await page.clock.runFor(16000);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Zeitüberschreitung'),null,{timeout:3000});
    mode='ok';await page.clock.runFor(5000);
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('automatisch gespeichert'),null,{timeout:3000});
    assert.equal(saved.pages[0].widgets[0].x,latest.x,'latest changes survive hung save');
    assert.equal(saved.pages[0].widgets[0].y,latest.y);
    const settled=requests;await page.clock.runFor(5000);assert.equal(requests,settled,'clean project is not repeatedly saved');
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
