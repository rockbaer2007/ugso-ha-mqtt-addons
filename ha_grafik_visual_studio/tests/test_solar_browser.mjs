import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
const url=process.env.STUDIO_TEST_URL;

test('Solar installs, aligns a six-battery stack, packs unframed values, routes ports and persists in runtime',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1650,height:1300}}),errors=[],requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    const install=await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.solar.wg'},data:await readFile(new URL('../packages/solar/ugso.solar.wg',import.meta.url))});
    assert.ok(install.ok()||/bereits installiert/.test(await install.text()));
    const catalog=await(await page.request.get(new URL('api/widget-packages',url).href)).json();
    const definitions=catalog.packages.find(p=>p.id==='ugso.solar').widgets;
    const make=(kind,id,x,y)=>({...definitions.find(def=>def.type.endsWith('/'+kind)).defaults,type:'ugso.solar/'+kind,id,x,y,powerEntityId:'sensor.power',temperatureEntityId:'sensor.temp',socEntityId:'sensor.soc'});
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.currentPageId=fixture.pages[0].id;fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1000,height:1200});
    fixture.pages[0].widgets=[make('head','head',80,30),...Array.from({length:6},(_,i)=>make('battery','battery-'+i,80,94+169*i)),make('solo','solo',460,80),
      {id:'number',type:'sensor',x:650,y:350,width:150,height:70,digits:0,factor:1,dataInputEnabled:true},
      {id:'value-line',type:'svg-connection',dataFlowVariant:'value-connection',startWidgetId:'battery-0',startAnchor:'right-center',endWidgetId:'number',endAnchor:'left-center'}];
    fixture.pages[0].widgets[1].solarRightCenterRole='output';fixture.pages[0].widgets[1].solarRightCenterValue='soc';
    let saved;
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[{entity_id:'sensor.power',name:'Leistung'}],states:[]}}));
    await page.route('**/api/states*',route=>{requests.push(route.request().url());return route.fulfill({json:{states:[{entity_id:'sensor.power',state:'420',attributes:{unit_of_measurement:'W'}},{entity_id:'sensor.temp',state:'25.4',attributes:{unit_of_measurement:'°C'}},{entity_id:'sensor.soc',state:'78',attributes:{unit_of_measurement:'%'}}]}});});
    await page.goto(url);
    await page.waitForFunction(()=>document.querySelector('#battery-0 .solar-value')?.textContent==='420 W');
    assert.ok(requests.some(request=>request.includes('sensor.soc')));
    const rect=selector=>page.locator(selector).boundingBox();
    const head=await rect('#head'), headImage=await rect('#head .solar-graphic');
    assert.ok(Math.abs(head.y+head.height-headImage.y-headImage.height)<1);
    assert.equal(await page.locator('.solar-battery').count(),6);
    for(let i=0;i<6;i++){
      const box=await rect('#battery-'+i),image=await rect(`#battery-${i} .solar-graphic`);
      assert.ok(Math.abs(box.y-image.y)<1&&Math.abs(box.height-image.height)<1);
      if(i){const previous=await rect('#battery-'+(i-1));assert.ok(Math.abs(box.y-previous.y-previous.height)<1);}
    }
    const solo=await rect('#solo');assert.ok(solo.width/(head.width*.845)>.6&&solo.width/(head.width*.845)<.7,'solo casing is about one third narrower');
    await page.locator('#battery-5').scrollIntoViewIfNeeded();
    const last=await rect('#battery-5');
    await page.mouse.move(last.x+40,last.y+30);await page.mouse.down();await page.mouse.move(last.x+43,last.y+33,{steps:3});await page.mouse.up();
    const snapped=await rect('#battery-5');assert.ok(Math.abs(snapped.x-last.x)<1&&Math.abs(snapped.y-last.y)<1,'housing center snaps during editor dragging');
    assert.match(await page.locator('#number .value').textContent(),/78/);
    await page.locator('#battery-0').click({position:{x:40,y:35}});
    const open=()=>page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));await open();
    assert.ok(await page.locator('#properties [data-property-key="powerEntityId"]').locator('..').locator('button').count());
    assert.equal(await page.locator('#battery-0 .housing-snap-point').count(),2);
    assert.ok(await page.locator('#properties').getByText('CSS Schatten und Abstand',{exact:true}).count());
    for(const key of ['showPower','showTemperature'])await page.locator(`#properties [data-property-key="${key}"]`).uncheck();
    assert.equal(await page.locator('#battery-0 .solar-reading').count(),1);
    const box=await rect('#battery-0'),reading=await rect('#battery-0 .solar-reading');
    assert.ok(reading.y-box.y>box.height*.31&&reading.y-box.y<box.height*.4,'first remaining reading stays below first-third seam');
    assert.equal(await page.locator('#battery-0 .solar-reading').evaluate(node=>getComputedStyle(node).borderTopWidth),'0px');
    await page.locator('#properties [data-property-key="showSoc"]').uncheck();
    assert.match(await page.locator('#number .value').textContent(),/78/,'hidden display still outputs SoC');
    await page.locator('#properties [data-property-key="showPower"]').check();
    await page.locator('#properties [data-property-key="showPowerDirection"]').check();
    assert.equal(await page.locator('#battery-0 .solar-power-direction').textContent(),'↓');
    await page.locator('#properties [data-property-key="positivePowerDirection"]').selectOption('out');
    assert.equal(await page.locator('#battery-0 .solar-power-direction').textContent(),'↑');
    await page.locator('#solo').click({position:{x:12,y:12}});await open();
    for(const side of ['Left','Right','Top','Bottom']){
      await page.locator(`input[name="solo-solar${side}CenterRole"][value="output"]`).check();await open();
    }
    assert.equal(await page.locator('#solo .output-dock-point').count(),4);
    if(process.env.STUDIO_SOLAR_ARTIFACTS){await mkdir(process.env.STUDIO_SOLAR_ARTIFACTS,{recursive:true});await page.locator('#stage').screenshot({path:process.env.STUDIO_SOLAR_ARTIFACTS+'/solar-editor.png'});}
    await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets[1].showSoc,false);assert.equal(saved.pages[0].widgets[1].socEntityId,'sensor.soc');
    await page.reload();await page.waitForFunction(()=>document.querySelector('#number .value')?.textContent.includes('78'));
    await page.goto(new URL('runtime',url).href);await page.waitForFunction(()=>document.querySelector('#number .value')?.textContent.includes('78'));
    assert.equal(await page.locator('.housing-snap-point,.widget-dock-point').count(),0);
    assert.equal(await page.locator('#value-line').count(),0);assert.equal(await page.locator('.solar-battery').count(),6);
    if(process.env.STUDIO_SOLAR_ARTIFACTS)await page.locator('#stage').screenshot({path:process.env.STUDIO_SOLAR_ARTIFACTS+'/solar-runtime.png'});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});

test('panel variants keep one output attached when switching pipe and edge positions',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try {
    const page=await browser.newPage({viewport:{width:1300,height:900}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('ha_grafik_visual_studio_language','de'));
    const install=await page.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.solar.wg'},data:await readFile(new URL('../packages/solar/ugso.solar.wg',import.meta.url))});
    assert.ok(install.ok()||/bereits installiert/.test(await install.text()));
    const catalog=await(await page.request.get(new URL('api/widget-packages',url).href)).json();
    const defaults=catalog.packages.find(p=>p.id==='ugso.solar').widgets.find(w=>w.type==='ugso.solar/panel').defaults;
    const fixture=await(await page.request.get(new URL('api/project',url).href)).json();
    fixture.currentPageId=fixture.pages[0].id;fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1000,height:600});
    fixture.pages[0].widgets=[
      {...defaults,id:'panel',type:'ugso.solar/panel',x:60,y:70,powerEntityId:'sensor.pv'},
      {...defaults,id:'mirror',type:'ugso.solar/panel',x:550,y:70,solarPanelOrientation:'mirrored',powerEntityId:'sensor.pv'},
      {id:'number',type:'sensor',x:430,y:440,width:160,height:80,dataInputEnabled:true,digits:0,factor:1},
      {id:'panel-line',type:'svg-connection',startWidgetId:'panel',startAnchor:'right-center',endWidgetId:'number',endAnchor:'left-center'}
    ];
    let saved;
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[{entity_id:'sensor.pv',name:'Solarleistung'}],states:[]}}));
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[{entity_id:'sensor.pv',state:'1.25',attributes:{unit_of_measurement:'kW'}}]}}));
    await page.goto(url);await page.waitForFunction(()=>document.querySelector('#number .value')?.textContent.replace(/\D/g,'').includes('1250'));
    assert.equal(await page.locator('#panel .solar-graphic').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    assert.equal(await page.locator('#mirror .solar-graphic').evaluate(img=>getComputedStyle(img).transform),'matrix(-1, 0, 0, 1, 0, 0)');
    await page.locator('#panel').click({position:{x:40,y:40}});
    await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(node=>node.open=true));
    assert.ok(await page.locator('#properties [data-property-key="powerEntityId"]').locator('..').locator('button').count());
    assert.equal(await page.locator('#panel .output-dock-point').count(),1);
    assert.equal(await page.locator('#panel .housing-snap-point').count(),0);
    let previousPath;
    for(const [position,x] of [['pipe',.5],['left',0],['right',1],['pipe',.5]]) {
      await page.locator('#properties [data-property-key="solarOutputPosition"]').selectOption(position);
      const box=await page.locator('#panel').boundingBox(),port=await page.locator('#panel .output-dock-point').boundingBox();
      assert.ok(Math.abs(port.x+port.width/2-(box.x+box.width*x))<1);
      assert.ok(Math.abs(port.y+port.height/2-(box.y+box.height*.89))<1);
      const path=await page.locator('#panel-line .connection-base').getAttribute('d');
      if(previousPath)assert.notEqual(path,previousPath);previousPath=path;
    }
    await page.locator('#properties [data-property-key="showPower"]').uncheck();
    assert.match((await page.locator('#number .value').textContent()).replace(/\D/g,''),/1250/);
    await page.locator('#properties [data-property-key="showPower"]').check();
    await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status')?.textContent.includes('gespeichert'));
    assert.equal(saved.pages[0].widgets[3].startAnchor,'right-center');
    await page.goto(new URL('runtime',url).href);await page.waitForFunction(()=>document.querySelector('#number .value')?.textContent.replace(/\D/g,'').includes('1250'));
    assert.equal(await page.locator('.widget-dock-point').count(),0);
    if(process.env.STUDIO_SOLAR_ARTIFACTS){await mkdir(process.env.STUDIO_SOLAR_ARTIFACTS,{recursive:true});await page.locator('#stage').screenshot({path:process.env.STUDIO_SOLAR_ARTIFACTS+'/solar-panels.png'});}
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
