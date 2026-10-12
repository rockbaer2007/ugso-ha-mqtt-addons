import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
const url=process.env.STUDIO_TEST_URL;
test('Universal additions, radial gradients, Material icons and legacy save/load work in DE EN FR', {skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],writes=[];
    page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack);});
    const cdp=await page.context().newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    const fixture=await (await page.request.get(new URL('api/project',url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
    Object.assign(fixture.pages[0].page,{width:1200,height:1000});
    const make=(id,extra={},index=0)=>({id,type:'universal-button',x:20+(index%4)*260,y:20+Math.floor(index/4)*240,width:240,height:200,state:'0',textColor:'#e7ecee',interaction:'read-only',stateCount:'1',defaultState:{contentType:'text',text:id},visualStates:[],...extra});
    const widgets=[make('legacy',{interaction:'button',visualStates:[{value:'0',contentType:'text',text:'Legacy'},{value:'1',contentType:'text',text:'Next'}],stateCount:'2',enabledPropertyGroups:{'ue-text':false}}),
      make('fixed',{interaction:'button',buttonBehavior:'fixed',trueValue:'7'},1),make('adjust',{interaction:'adjust',valueDelta:2,adjustMax:3},2),
      make('hold',{interaction:'button',holdEnabled:true,holdValue:'on',trueValue:'on',state:'off',entityId:'switch.hold'},3),
      make('clock',{defaultState:{contentType:'analogclock',clockNumbers:true}},4),make('color',{defaultState:{contentType:'colorpicker',colorEntityId:'light.color',colorSliders:true,colorKelvin:true,colorControl:'wheel'}},5),
      make('view',{defaultState:{contentType:'view',contentPage:'child',viewScaleToFit:true}},6),make('dialog',{interaction:'dialog',targetPage:'child',dialogTitle:'Test dialog'},7),
      make('http',{interaction:'http',httpUrl:'https://example.invalid/universal-test',httpMode:'fetch',x:300,y:550,height:80},8),
      make('navigation',{interaction:'navigation',targetPage:'child',x:600,y:550,height:80},9),
      {id:'radial',type:'radial-slider',x:20,y:500,width:200,height:200,value:50,trackColor:'linear-gradient(90deg,red,blue)',trackActiveColor:'linear-gradient(to top,rgb(0,255,0),blue)',thumbColor:'#fff'}];
    fixture.pages[0].widgets=widgets;fixture.pages.push({id:'child',name:'Child',visible:true,page:{width:300,height:160},widgets:[{id:'child-text',type:'text',x:0,y:0,width:200,height:50,textContent:'Embedded sentinel'}]});
    let saved;
    await page.route('**/api/project*',route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({json:saved||fixture});});
    const states=[{entity_id:'switch.hold',state:'off',attributes:{}},{entity_id:'light.color',state:'on',attributes:{rgb_color:[255,0,0],supported_color_modes:['rgb','color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6500}}];
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[],states}}));await page.route('**/api/states*',route=>route.fulfill({json:{states}}));
    for(const path of ['material-value','universal-color','switch','helper-value'])await page.route(`**/api/${path}`,async route=>{writes.push({path,...route.request().postDataJSON()});if(path==='material-value')await new Promise(resolve=>setTimeout(resolve,120));await route.fulfill({json:{accepted:true}});});
    let httpCalls=0;await page.route('https://example.invalid/universal-test',route=>{httpCalls++;return route.fulfill({body:'ok',headers:{'Access-Control-Allow-Origin':'*'}});});
    const manifestPath=process.env.MATERIAL_MANIFEST||'../ha-grafik-visual-studio-materialdesign/manifest.json';
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    for(const widget of manifest.widgets)widget.iconData='data:image/svg+xml;base64,'+(await readFile(resolve(dirname(manifestPath),widget.icon))).toString('base64');
    await page.route('**/api/widget-packages',route=>route.fulfill({json:{packages:[manifest]}}));
    for(const locale of ['de','en','fr']){
      for(const widget of widgets)widget.interactiveLocale=locale;
      await page.goto(url);await page.locator('#clock .universal-clock').waitFor();
      assert.equal(await page.locator('#radial linearGradient').count(),2);
      await page.locator('#adjust').dispatchEvent('click');await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const body=await page.locator('#properties').textContent();assert.ok(body.includes({de:'Änderung pro Klick',en:'Change per click',fr:'Variation par clic'}[locale]));
      await page.locator('#color').dispatchEvent('click');await page.locator('#properties details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
      const format=page.locator('#properties label').filter({hasText:{de:'Farbformat',en:'Color format',fr:'Format de couleur'}[locale]}).locator('select').first();
      await format.selectOption('rgb');
      for(const theme of ['dark','light']){
        await page.emulateMedia({colorScheme:theme});
        const previews=page.locator('.widget-choice-preview[data-kind="material"]');assert.equal(await previews.count(),49);
        assert.ok(await previews.evaluateAll(nodes=>nodes.every(node=>{const icon=node.querySelector('svg,img'),style=getComputedStyle(icon);return Math.abs(parseFloat(style.width)-node.clientWidth)<1 && Math.abs(parseFloat(style.height)-node.clientHeight)<1 && getComputedStyle(node).overflow==='hidden';})));
      }
      if(locale==='fr' && process.env.STUDIO_UNIVERSAL_SCREENSHOT){const palette=page.locator('.widget-group[data-widget-set-id="ugso.materialdesign"]');await palette.evaluate(node=>node.open=true);await palette.screenshot({path:process.env.STUDIO_UNIVERSAL_SCREENSHOT.replace('.png','-material.png')});}
      await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('gespeichert'));
      assert.equal(saved.pages[0].widgets.find(w=>w.id==='legacy').enabledPropertyGroups['ue-text'],false);
      assert.equal(saved.pages[0].widgets.find(w=>w.id==='adjust').valueDelta,2);
      assert.equal(saved.pages[0].widgets.find(w=>w.id==='color').defaultState.colorFormat,'rgb');
      await page.reload();await page.locator('#clock .universal-clock').waitFor();assert.equal(await page.locator('#radial linearGradient').count(),2);saved=undefined;
    }
    assert.equal(writes.length,0,'editor and previews never write');
    await page.goto(url+'?mode=runtime');await page.locator('#fixed .universal-tile').click();await page.waitForFunction(()=>document.querySelector('#fixed .universal-widget-content').dataset.state==='7');
    const clockHand=await page.locator('#clock .universal-clock line').last().getAttribute('transform');
    await page.waitForFunction(before=>document.querySelector('#clock .universal-clock line:last-child').getAttribute('transform')!==before,clockHand);
    await page.locator('#adjust .universal-tile').click();await page.waitForFunction(()=>document.querySelector('#adjust .universal-widget-content').dataset.state==='2');
    await page.locator('#adjust .universal-tile').click();await page.waitForFunction(()=>document.querySelector('#adjust .universal-widget-content').dataset.state==='3');
    await page.locator('#legacy .universal-tile').click();await page.waitForFunction(()=>document.querySelector('#legacy .universal-widget-content').dataset.state==='1');
    await page.locator('#hold .universal-tile').dispatchEvent('pointerdown',{button:0});await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup')));
    await page.waitForFunction(()=>document.querySelector('#hold'));
    await new Promise(resolve=>setTimeout(resolve,350));assert.deepEqual(writes.filter(w=>w.path==='material-value').map(w=>w.value),['on','off']);
    await page.locator('#color input[type="color"]').evaluate(input=>{input.value='#00ff00';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
    await new Promise(resolve=>setTimeout(resolve,100));assert.deepEqual(writes.find(w=>w.path==='universal-color').value,[0,255,0]);
    await page.locator('#dialog .universal-tile').click();await page.locator('.universal-dialog[open]').waitFor();assert.equal(await page.locator('.universal-dialog iframe').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('.universal-dialog').count(),0);
    await page.locator('#http .universal-tile').click();await page.waitForFunction(()=>!document.querySelector('#http .universal-tile').hasAttribute('aria-busy'));assert.equal(httpCalls,1);
    assert.equal(await page.locator('#view iframe').count(),1);
    if(process.env.STUDIO_UNIVERSAL_SCREENSHOT)await page.screenshot({path:process.env.STUDIO_UNIVERSAL_SCREENSHOT});
    await page.locator('#navigation .universal-tile').click();await page.locator('#child-text').waitFor();
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
