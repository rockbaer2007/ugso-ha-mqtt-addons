import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const url=process.env.STUDIO_TEST_URL;

test('Printer installs, binds entities, evenly distributes 1–6 supplies, resizes, saves and runs', {skip:!url}, async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1650,height:1100}}), errors=[], requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    const result=await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.printer.wg'},data:await readFile(new URL('../packages/printer/ugso.printer.wg',import.meta.url))});
    assert.ok(result.ok()||/bereits installiert/.test(await result.text()));
    const catalog=await(await page.request.get(new URL('api/widget-packages',url).href)).json();
    const def=catalog.packages.find(p=>p.id==='ugso.printer').widgets[0];
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.pages[0].widgets=Array.from({length:6},(_,i)=>{
      const w={...def.defaults,type:def.type,id:'printer-'+(i+1),x:20+(i%3)*500,y:20+Math.floor(i/3)*460,cartridgeCount:i+1,entityId:'sensor.printer',powerEntityId:'sensor.power',pagesEntityId:'sensor.pages'};
      for(let j=1;j<=6;j++)w[`cartridge${j}EntityId`]='sensor.ink'+j;
      return w;
    });
    fixture.currentPageId=fixture.pages[0].id;Object.assign(fixture.pages[0].page,{width:1530,height:940});
    fixture.settings={...fixture.settings,autoSave:false};
    let saved, status='printing';
    await page.route('**/api/entities*',r=>r.fulfill({json:{entities:[{entity_id:'sensor.ink6',name:'Hellcyan Füllstand'}],states:[]}}));
    await page.route('**/api/project*',r=>{if(r.request().method()==='PUT')saved=r.request().postDataJSON();return r.fulfill({json:saved||fixture});});
    await page.route('**/api/states*',r=>{
      requests.push(r.request().url());
      const states=[{entity_id:'sensor.printer',state:status,attributes:{state_message:'Druckauftrag wird verarbeitet'}},{entity_id:'sensor.power',state:'42',attributes:{unit_of_measurement:'W'}},{entity_id:'sensor.pages',state:'1234',attributes:{}},
        ...[85,66,42,18,'unavailable',100].map((v,i)=>({entity_id:'sensor.ink'+(i+1),state:String(v),attributes:{unit_of_measurement:'%'}}))];
      return r.fulfill({json:{states}});
    });
    await page.goto(url);
    await page.waitForFunction(()=>document.querySelector('#printer-6 .printer-widget')?.dataset.status==='printing');
    assert.ok(requests.some(u=>u.includes('sensor.ink6')),'editor requests cartridge sources');
    for(let i=1;i<=6;i++) {
      const supplies=page.locator(`#printer-${i} .printer-cartridge`);assert.equal(await supplies.count(),i);
      const rects=await supplies.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,width:r.width};}));
      assert.ok(rects.every(r=>Math.abs(r.width-rects[0].width)<1));
      if(i>2){const gaps=rects.slice(1).map((r,j)=>r.x-rects[j].x-rects[j].width);assert.ok(gaps.every(g=>Math.abs(g-gaps[0])<1));}
    }
    assert.match(await page.locator('#printer-6 .printer-ink-level').nth(4).textContent(),/—/);
    assert.equal(await page.locator('#printer-6 .printer-cartridge[data-low=true]').count(),1);
    await page.locator('#printer-6').click({position:{x:10,y:10}});
    await page.locator('#properties details').evaluateAll(items=>items.forEach(item=>item.open=true));
    const entity=page.locator('#properties [data-property-key="cartridge6EntityId"]');
    assert.equal(await entity.count(),1);assert.ok(await entity.locator('..').locator('button').count(),'entity picker exists');
    await entity.locator('..').getByRole('button',{name:'Home-Assistant-Entität auswählen',exact:true}).click();
    await page.locator('#entities-search').fill('sensor.ink6');
    await page.locator('#entities-tree').getByText('Hellcyan Füllstand',{exact:true}).click();
    await page.locator('#entities-insert').click();assert.equal(await entity.inputValue(),'sensor.ink6');
    for(const [key,value] of [['width','240'],['height','280']])await page.locator(`#properties [data-property-key="${key}"]`).fill(value);
    assert.ok(await page.locator('#printer-6 .printer-widget').evaluate(root=>root.scrollWidth<=root.clientWidth+1&&root.scrollHeight<=root.clientHeight+1),'minimum size fits without overflow');
    await page.locator('#properties [data-property-key="cartridgeCount"]').fill('1');
    await page.waitForFunction(()=>document.querySelectorAll('#printer-6 .printer-cartridge').length===1);
    for(const [key,value] of [['cartridgeCount','6'],['width','480'],['height','440']])await page.locator(`#properties [data-property-key="${key}"]`).fill(value);
    await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets[5].cartridgeCount,6);
    const before=requests.length;await page.goto(new URL('runtime',url).href);
    await page.waitForFunction(()=>document.querySelector('#printer-6 .printer-widget')?.dataset.status==='printing');
    assert.ok(requests.length>before,'runtime polls printer sources');
    assert.match(await page.locator('#printer-6 .printer-metrics').textContent(),/42 W/);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#printer-6 .printer-sheet').evaluate(n=>getComputedStyle(n).animationName),'none');
    const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,'studio-printer-artifacts');await mkdir(folder,{recursive:true});
    await page.locator('#printer-6').screenshot({path:join(folder,'printer-six.png')});
    await page.locator('#printer-1').screenshot({path:join(folder,'printer-one.png')});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
