import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,readdir} from 'node:fs/promises';
import {getWidgetSets} from '../web/widget-registry.js';
import '../web/widget-sets/core.js';
import '../web/widget-sets/special.js';
import '../web/widget-sets/gauges.js';
import '../web/widget-sets/dataflow.js';
const url=process.env.STUDIO_TEST_URL;
test('remaining built-in and bundled widgets expose properties and render editor/runtime without unintended writes',{skip:!url},async()=>{
  const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
  try{
    const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage(),errors=[],writes=[];
    page.on('pageerror',error=>errors.push(error.stack));
    for(const folder of await readdir(new URL('../packages/',import.meta.url),{withFileTypes:true})){
      if(!folder.isDirectory())continue;
      for(const file of await readdir(new URL(`../packages/${folder.name}/`,import.meta.url)))if(file.endsWith('.wg')){
        const response=await context.request.post(new URL('api/widget-packages',url).href,{headers:{'X-Package-Name':file},data:await readFile(new URL(`../packages/${folder.name}/${file}`,import.meta.url))});
        assert.ok(response.ok() || response.status()===409 || /bereits installiert/.test(await response.text()),file);
      }
    }
    const packages=(await(await context.request.get(new URL('api/widget-packages',url).href)).json()).packages;
    const groups=[...getWidgetSets().filter(set=>set.id!=='ha-grafik-core'),...packages];
    const before=await(await context.request.get(new URL('api/project',url).href)).json();let fixture;
    await page.route('**/api/project*',route=>{if(route.request().method()!=='GET')writes.push(route.request().url());return route.fulfill({json:fixture});});
    await page.route('**/api/entities*',route=>route.fulfill({json:{entities:[],states:[]}}));
    await page.route('**/api/states*',route=>route.fulfill({json:{states:[]}}));
    await page.route('**/api/*',async route=>{
      const method=route.request().method(),path=new URL(route.request().url()).pathname;
      if(method==='POST' && !/(history|forecasts)/.test(path)){writes.push(path);return route.fulfill({json:{accepted:true}});}
      return route.fallback();
    });
    let checked=0;
    for(const group of groups){
      fixture=structuredClone(before);fixture.settings={...fixture.settings,autoSave:false};
      Object.assign(fixture.pages[0].page,{width:1400,height:4000});
      fixture.pages[0].widgets=group.widgets.map((definition,index)=>({id:`audit-${index}`,generalEnabled:false,visibilityEnabled:false,signalImagesEnabled:false,extraControlEnabled:false,textColor:'#e7ecee',...structuredClone(definition.defaults),type:definition.runtimeType||definition.type,x:20+index%3*440,y:20+Math.floor(index/3)*520,visible:true}));
      const errorStart=errors.length;
      await page.goto(url);await page.locator('#audit-0').waitFor();
      for(let index=0;index<group.widgets.length;index++){
        await page.locator('#widget-selector-clear').dispatchEvent('click');
        await page.locator(`#widget-selector-list input[data-widget-id="audit-${index}"]`).evaluate(input=>{input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));});
        assert.ok((await page.locator('#properties').textContent()).includes(`audit-${index}`),`${group.id}/${group.widgets[index].type}: properties`);
        assert.equal(errors.length,errorStart,`${group.id}/${group.widgets[index].type}: ${errors.slice(errorStart).join('\n')}`);
        checked++;
      }
      for(const scheme of ['light','dark']){
        await page.emulateMedia({colorScheme:scheme});await page.goto(url+'?mode=runtime');
        await page.locator('#stage').waitFor();
        await page.locator('.widget-choice').first().waitFor({state:'attached'});
        const invalid=await page.locator('#stage svg [d], #stage svg [transform], #stage svg [points]').evaluateAll(nodes=>nodes.flatMap(node=>['d','transform','points'].filter(key=>/NaN|Infinity/.test(node.getAttribute(key)||'')).map(key=>`${node.tagName}:${key}`)));
        assert.deepEqual(invalid,[],`${group.id}: invalid SVG geometry`);
        assert.equal(errors.length,errorStart,`${group.id}: runtime ${scheme}: ${errors.slice(errorStart).join('\n')}`);
      }
      console.log(`Checked ${group.id}: ${group.widgets.length} widget types`);
    }
    assert.equal(checked,62);assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
