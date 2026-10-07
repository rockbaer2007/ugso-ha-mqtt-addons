import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("odometer renders four grid formats, fixed digits, feedback and rolling changes",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");
 const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  const displays=[];
  for(const slim of [false,true])for(const span of [3,4]){const def=definitions.find(w=>w.type===`ugso.industrial/odometer${slim?"-slim":""}`);displays.push({...def.defaults,type:def.type,id:`odo-${slim?"slim":"normal"}-${span}`,x:span===3?80:420,y:slim?220:100,odometerSpan:span,entityId:"sensor.energy"});}
  displays[1].entityId="sensor.other";displays[1].dataInputEnabled=true;displays[1].dockAlwaysVisible=true;
  fixture.pages[0].widgets=[...displays,{id:"source",type:"red-number",x:80,y:350,width:64,height:64,state:987.65,unit:"kWh",dataOutputEnabled:true},{id:"wire",type:"svg-connection",startWidgetId:"source",startAnchor:"right-center",endWidgetId:displays[1].id,endAnchor:"value-input"}];
  const states={"sensor.energy":{entity_id:"sensor.energy",state:"123.45",attributes:{unit_of_measurement:"kWh"}},"sensor.other":{entity_id:"sensor.other",state:"999"}};
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.route("**/api/states*",r=>r.fulfill({json:{states:Object.values(states)}}));
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#odo-normal-3 .industrial-odometer")?.dataset.value==="123.45");
  assert.equal(await page.locator("#odo-normal-4 .widget-dock-point").count(),1);assert.equal(await page.locator("#odo-normal-4 .output-dock-point").count(),0);
  await page.locator("#odo-normal-3 .industrial-odometer").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);
  await page.locator("#properties [data-property-key='odometerSpan']").selectOption("4");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"262");
  await page.locator("#properties [data-property-key='housingSpace']").fill("3");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"274");
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#odo-normal-4 .industrial-odometer")?.dataset.value==="987.65");
  for(const display of displays){const box=await page.locator(`#${display.id}`).boundingBox();assert.equal(box.width,display.odometerSpan===3?196:262);assert.equal(box.height,display.height);}
  assert.equal(await page.locator("#odo-normal-3 .industrial-odometer").getAttribute("aria-label"),"123,45 kWh");
  const normalHeight=await page.locator("#odo-normal-3 .odometer-digit").first().evaluate(el=>el.getBoundingClientRect().height),slimHeight=await page.locator("#odo-slim-3 .odometer-digit").first().evaluate(el=>el.getBoundingClientRect().height);assert.equal(normalHeight,slimHeight*2);
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#wire").evaluate(el=>el.style.visibility="hidden");
  for(const display of displays)await page.locator(`#${display.id}`).screenshot({path:join(folder,`industrial-${display.id}.png`)});
  const update=await page.evaluate(async()=>{const mod=await import("./industrial-odometer.js"),w={type:"ugso.industrial/odometer",width:196,height:64,state:9,odometerDigits:2,odometerDecimals:0};mod.renderIndustrialOdometer(w,document,{runtime:true});w.state=10;const root=mod.renderIndustrialOdometer(w,document,{runtime:true});document.body.append(root);const count=root.getAnimations({subtree:true}).length;root.remove();return count;});assert.equal(update,2);
  delete states["sensor.energy"];await page.reload();await page.waitForFunction(()=>document.querySelector("#odo-normal-3 .industrial-odometer")?.dataset.error==="Kein Eingangswert");
  assert.equal(await page.locator("#odo-normal-3 .odometer-reel").count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
