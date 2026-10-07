import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("linear package dimensions, scale-only controls, runtime writes and entity feedback",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");
 const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1450,height:950}}),errors=[],writes=[];page.on("pageerror",e=>errors.push(e.message));
  const response=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(response.ok() || /bereits installiert/.test(await response.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  const make=(suffix,id,x,y,extra={})=>{const def=definitions.find(w=>w.type===`ugso.industrial/${suffix}`);return {...def.defaults,type:def.type,id,x,y,width:256,height:suffix==="linear"?128:64,unit:"°C",...extra};};
  const slider=make("linear","slider",60,100,{outputEntityId:"input_number.test",dataOutputEnabled:true}),gauge=make("linear","gauge",365,100,{entityId:"sensor.temp",scaleMode:"ring"});
  const slim=make("linear-slim","slim",60,280,{outputMode:"continuous",outputEntityId:"number.test"}),slimGauge=make("linear-slim","slim-gauge",365,280,{entityId:"sensor.temp"});
  fixture.pages[0].widgets=[slider,gauge,slim,slimGauge,{id:"reading",type:"red-number",x:700,y:100,width:128,height:64,dataInputEnabled:true,dockPointsEnabled:true,dock_left_center:true},{id:"wire",type:"svg-connection",connectionHidden:true,startWidgetId:"slider",startAnchor:"right-center",endWidgetId:"reading",endAnchor:"left-center"}];
  const states={"sensor.temp":{entity_id:"sensor.temp",state:"15",attributes:{unit_of_measurement:"°C"}},"input_number.test":{entity_id:"input_number.test",state:"0"},"number.test":{entity_id:"number.test",state:"0"}};
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.route("**/api/states*",r=>r.fulfill({json:{states:Object.values(states)}}));
  await page.route("**/api/industrial-value",async r=>{writes.push(r.request().postDataJSON());await r.fulfill({json:{accepted:true}});});
  await page.goto(url);await page.locator("#slider .industrial-linear").waitFor();
  for(const [id,height] of [["slider",64],["slim",32]]){
   await page.locator(`#${id} .industrial-linear`).click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
   assert.equal(await page.locator("#properties [data-property-key='scaleMode'] option").count(),1);
   for(const span of [2,3,4]){
    await page.locator("#properties [data-property-key='linearSpan']").selectOption(String(span));
    await page.locator("#properties [data-property-key='height']").first().fill(String(height));await page.locator("#properties [data-property-key='height']").first().press("Tab");
    assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),String(64*span+(span-1)*2));
   }
  }
  const resize=await page.locator("#slim .resize-e").boundingBox(),before=await page.locator("#slim").boundingBox();
  await page.mouse.move(resize.x+resize.width/2,resize.y+resize.height/2);await page.mouse.down();await page.mouse.move(resize.x+resize.width/2+32,resize.y+resize.height/2);await page.mouse.up();
  const after=await page.locator("#slim").boundingBox();assert.ok(after.width>before.width);assert.ok(Math.abs(after.width-(after.height*8+6))<1);
  assert.deepEqual(writes,[]);
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#gauge .industrial-linear")?.dataset.value==="15");
  assert.equal(await page.locator("#slider [data-linear-indicator='handle']").count(),1);assert.equal(await page.locator("#gauge [data-linear-indicator='triangle']").count(),1);
  assert.equal(await page.locator("#gauge .industrial-linear").getAttribute("role"),"img");
  assert.ok((await page.locator("#gauge text").textContent()).includes("15 °C"));
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});
  await page.locator("#wire").evaluate(el=>el.style.visibility="hidden");
  for(const id of ["slider","gauge","slim","slim-gauge"])await page.locator(`#${id}`).screenshot({path:join(folder,`industrial-linear-${id}.png`)});
  const box=await page.locator("#slider svg").boundingBox();
  await page.mouse.move(box.x+box.width*.2,box.y+box.height*.43);await page.mouse.down();await page.mouse.move(box.x+box.width-5,box.y+box.height*.43);
  await page.waitForTimeout(150);assert.deepEqual(writes,[]);
  await page.mouse.up();await page.waitForFunction(()=>document.querySelector("#slider .industrial-linear")?.dataset.value==="30");
  await page.waitForTimeout(150);assert.deepEqual(writes[0],{entity_id:"input_number.test",value:30});
  assert.ok((await page.locator("#reading").textContent()).includes("30"));
  await page.locator("#slim .industrial-linear").focus();await page.keyboard.press("End");await page.waitForTimeout(150);assert.ok(writes.some(w=>w.entity_id==="number.test" && w.value===30));
  slider.height=64;slider.width=256;slider.linearSpan=4;slim.height=32;slim.width=256;slim.linearSpan=4;
  const toggleDefinition=definitions.find(w=>w.type==="ugso.industrial/switch");
  for(let n=0;n<4;n++)fixture.pages[0].widgets.push({...toggleDefinition.defaults,type:toggleDefinition.type,id:`single-${n}`,x:60+n*66,y:420,width:64,height:64});
  await page.reload();await page.locator("#slim .industrial-linear").waitFor();
  assert.equal((await page.locator("#slim").boundingBox()).height,32);
  const lastSingle=await page.locator("#single-3").boundingBox();
  for(const id of ["slider","slim"]){const box=await page.locator(`#${id}`).boundingBox();assert.equal(box.width,262);assert.equal(box.x+box.width,lastSingle.x+lastSingle.width);}
  for(const id of ["slider","slim"])await page.locator(`#${id}`).screenshot({path:join(folder,`industrial-linear-${id}-minimum.png`)});
  delete states["sensor.temp"];await page.reload();await page.waitForFunction(()=>document.querySelector("#gauge .industrial-linear")?.dataset.value==="");
  assert.equal(await page.locator("#gauge [data-linear-indicator='triangle']").evaluate(el=>el.style.display),"none");assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
