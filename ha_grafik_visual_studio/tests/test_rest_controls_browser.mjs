import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const url=process.env.STUDIO_TEST_URL;
test('Climate UI is localized, capability checked and keeps native targets; old/new project fields round trip',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try{
    const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const installed=await context.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':'ugso.technic.wg'},data:await readFile(new URL('../packages/technic/ugso.technic.wg',import.meta.url))});assert.ok(installed.ok()||installed.status()===409||/bereits installiert/.test(await installed.text()));
    await page.goto(url);await page.locator('#stage').waitFor();
    const result=await page.evaluate(async()=>{
      const {renderClimateControls}=await import('./climate-controls.js');const {restText,markRestRuntime,observeRestRuntime}=await import('./rest-locales.js');
      const widget={id:'control-test',type:'ugso.technic/thermostat-temperature',heading:'Heute',targetEntityId:'climate.room',readOnly:false,climateRange:true,climateHvac:true,climateFan:true,climatePower:true};
      let entry={state:'heat',attributes:{supported_features:2|8|128|256,min_temp:5,max_temp:30,target_temp_step:.5,temperature_unit:'°C',target_temp_low:18,target_temp_high:24,hvac_modes:['heat','off'],fan_modes:['auto','low'],fan_mode:'auto'}};
      const calls=[],out=[];
      for(const locale of ['de','en','fr']){
        const root=renderClimateControls(widget,document,{runtime:true,getEntry:()=>entry,text:value=>restText(value,locale),write:async request=>calls.push(request)});document.body.append(root);
        root.querySelector('select[data-climate-action=fan]').value='low';root.querySelector('select[data-climate-action=fan]').dispatchEvent(new Event('change'));await Promise.resolve();await Promise.resolve();
        out.push({locale,text:root.textContent});root.remove();
      }
      const root=renderClimateControls(widget,document,{runtime:true,getEntry:()=>entry,write:async request=>calls.push(request)});document.body.append(root);root.querySelectorAll('input')[0].value='25';root.querySelectorAll('input')[1].value='20';root.querySelector('button').click();
      const invalid=root.querySelector('output').textContent;root.remove();
      entry={...entry,state:'unavailable'};const unavailable=renderClimateControls(widget,document,{runtime:true,getEntry:()=>entry});const disabled=[...unavailable.querySelectorAll('input,button,select')].every(el=>el.disabled);
      const readonly=renderClimateControls({...widget,readOnly:true},document,{runtime:true,getEntry:()=>({...entry,state:'heat'})});const locked=[...readonly.querySelectorAll('input,button,select')].every(el=>el.disabled);
      const editor=renderClimateControls(widget,document,{getEntry:()=>({...entry,state:'heat'})});const inert=[...editor.querySelectorAll('input,button,select')].every(el=>el.disabled);
      const user=document.createElement('div');user.append(document.createTextNode('Heute'));document.body.append(user);markRestRuntime(user,widget,{},'fr');const userText=user.textContent;user.remove();
      return {calls,out,invalid,disabled,locked,inert,userText};
    });
    assert.equal(result.calls.length,3);assert.ok(result.calls.every(call=>call.entity_id==='climate.room'&&call.action==='fan'&&call.value==='low'));
    assert.match(result.out[0].text,/Betriebsart/);assert.match(result.out[1].text,/HVAC mode/);assert.match(result.out[2].text,/Mode de fonctionnement/);assert.match(result.out[2].text,/Consigne basse/);
    assert.equal(result.invalid,'Ungültiger Temperaturbereich');assert.ok(result.disabled&&result.locked&&result.inert);assert.equal(result.userText,'Heute');assert.deepEqual(errors,[]);
    const original=(await(await context.request.get(new URL('api/project',url).href)).json());const fixture=structuredClone(original);fixture.settings={...fixture.settings,widgetLocale:'fr'};fixture.pages[0].widgets=[{id:'saved-test',type:'ugso.technic/thermostat-temperature',x:1,y:2,width:220,height:220,targetEntityId:'climate.room',tempMin:15,tempMax:28,tempStep:.5,cssFontEnabled:false,sourceOptionsEnabled:true,sourceAttribute__actualEntityId:'temperature',sourceAutoUnit__actualEntityId:true,sourceUnit__actualEntityId:'°C',climateControlsEnabled:true,climateRange:true,widgetLocale:'fr'}];
    const saved=await context.request.put(new URL('api/project',url).href,{data:fixture});assert.ok(saved.ok(),await saved.text());const loaded=await(await context.request.get(new URL('api/project',url).href)).json();assert.deepEqual(loaded.pages[0].widgets,fixture.pages[0].widgets);assert.equal(loaded.settings.widgetLocale,'fr');
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[{entity_id:'climate.room',state:'heat',attributes:{supported_features:2,min_temp:5,max_temp:30,target_temp_step:.5,temperature_unit:'°C',target_temp_low:18,target_temp_high:24}}]}}));
    const writes=[];await page.route('**/api/climate-control',route=>{writes.push(route.request().postDataJSON());return route.fulfill({json:{accepted:true}});});
    await page.goto(url+'?mode=runtime');const controls=page.locator('#saved-test .climate-controls');await controls.locator('input').first().waitFor();
    await controls.locator('input').first().fill('19');await controls.locator('input').nth(1).fill('25');await controls.getByRole('button',{name:'Appliquer la plage'}).click();await page.waitForFunction(()=>document.querySelector('.climate-controls')?.dataset.writing!=='true');
    assert.deepEqual(writes,[{entity_id:'climate.room',action:'range',value:{low:19,high:25}}]);assert.deepEqual(errors,[]);
    await context.request.put(new URL('api/project',url).href,{data:original});
  }finally{await browser.close();}
});
