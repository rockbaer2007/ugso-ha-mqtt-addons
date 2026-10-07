import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("segment displays render entity values, exclusive unit lamps, power, input ports and aligned sizes",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");
 const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  const displays=definitions.filter(w=>w.render.kind==="industrial-segment").map((def,i)=>({...def.defaults,type:def.type,id:`segment-${i}`,x:80,y:100+i*100,entityId:i===0?"sensor.power":"sensor.text",segmentDigits:i===0?6:10,segmentUnit:["W","A","V"][i],segmentColor:i===1?"#42a5f5":def.defaults.segmentColor}));
  displays[1].dataInputEnabled=true;displays[1].displayInputEnabled=true;displays[1].dockAlwaysVisible=true;
  fixture.pages[0].widgets=[...displays,{id:"source",type:"red-number",x:450,y:200,width:64,height:64,state:56.78,dataOutputEnabled:true},{id:"wire",type:"svg-connection",startWidgetId:"source",startAnchor:"right-center",endWidgetId:displays[1].id,endAnchor:"value-input"},{id:"power",type:"red-number",x:450,y:350,width:64,height:64,state:1,dataOutputEnabled:true},{id:"power-wire",type:"svg-connection",startWidgetId:"power",startAnchor:"right-center",endWidgetId:displays[1].id,endAnchor:"display-power"}];
  const states={"sensor.power":{entity_id:"sensor.power",state:"647.25"},"sensor.text":{entity_id:"sensor.text",state:"SOLAR 12.3"}};
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.route("**/api/states*",r=>r.fulfill({json:{states:Object.values(states)}}));
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#segment-0 .industrial-segment")?.dataset.text==="647.25");
  assert.equal(await page.locator("#segment-1 .widget-dock-point").count(),2);assert.equal(await page.locator("#segment-1 .output-dock-point").count(),0);
  await page.locator("#segment-0 .industrial-segment").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);
  await page.locator("#properties [data-property-key='segmentSpan']").selectOption("3");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"196");
  await page.locator("#properties [data-property-key='housingSpace']").fill("3");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"204");
  for(const unit of ["A","V","off","W"]){await page.locator("#properties [data-property-key='segmentUnit']").selectOption(unit);assert.equal(await page.locator("#segment-0 .segment-unit.lit").count(),unit==="off"?0:1);if(unit!=="off")assert.equal(await page.locator("#segment-0 .segment-unit.lit").textContent(),unit);}
  const resize=await page.locator("#segment-0 .resize-e").boundingBox();
  await page.mouse.move(resize.x+resize.width/2,resize.y+resize.height/2);await page.mouse.down();await page.mouse.move(resize.x+resize.width/2+30,resize.y+resize.height/2);await page.mouse.up();
  const resized=await page.locator("#segment-0").boundingBox();assert.ok(resized.width>204);assert.equal(resized.width,resized.height*3+12);
  await page.locator("#properties [data-property-key='segmentDigits']").fill("15");assert.equal(await page.locator("#properties [data-property-key='segmentDigits']").inputValue(),"10");assert.equal(await page.locator("#segment-0 svg g").count(),10);
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#segment-1 .industrial-segment")?.dataset.text==="56.78");
  for(let i=0;i<3;i++){
   const box=await page.locator(`#segment-${i}`).boundingBox();assert.equal(box.width,262);assert.equal(box.height,64);
   assert.equal(await page.locator(`#segment-${i} .segment-unit.lit`).count(),1);
   const parts=await page.locator(`#segment-${i} svg g`).first().locator(".segment-element").count();assert.equal(parts,i===0?8:17);
  }
  assert.equal(await page.locator("#segment-0 svg g").first().locator(".lit").count(),0);
  for(const id of ["wire","power-wire"])await page.locator(`#${id}`).evaluate(el=>el.style.visibility="hidden");
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});
  for(let i=0;i<3;i++)await page.locator(`#segment-${i}`).screenshot({path:join(folder,`industrial-segment-${i}.png`)});
  fixture.pages[0].widgets.find(w=>w.id==="power").state=0;await page.reload();await page.waitForFunction(()=>document.querySelector("#segment-1 .industrial-segment")?.dataset.power==="off");assert.equal(await page.locator("#segment-1 .lit").count(),0);
  delete states["sensor.power"];await page.reload();await page.waitForFunction(()=>document.querySelector("#segment-0 .industrial-segment")?.dataset.error==="Kein Eingangswert");
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
