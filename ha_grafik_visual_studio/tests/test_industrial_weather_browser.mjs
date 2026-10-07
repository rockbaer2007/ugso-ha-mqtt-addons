import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("weather display loads requested attributes and forecasts, sensor overrides, layout and power",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.clock.install({time:new Date("2026-10-07T12:00:00Z")});await page.clock.pauseAt(new Date("2026-10-07T12:00:00Z"));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type==="ugso.industrial/weather");
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  fixture.pages[0].widgets=[...["lcd","led"].map((mode,i)=>({...definition.defaults,type:definition.type,id:`weather-${mode}`,x:80+i*350,y:100,weatherMode:mode,entityId:"weather.home",displayInputEnabled:i===1,displayEntityId:i===1?"switch.off":"",dockAlwaysVisible:true})),{id:"source",type:"red-number",x:500,y:400,width:64,height:64,state:1,dataOutputEnabled:true},{id:"wire",type:"svg-connection",startWidgetId:"source",startAnchor:"right-center",endWidgetId:"weather-led",endAnchor:"display-power"}];
  const states={"weather.home":{entity_id:"weather.home",state:"partlycloudy",attributes:{temperature:18.6,temperature_unit:"°C",humidity:64,wind_speed:12,wind_speed_unit:"km/h"}},"sensor.temp":{entity_id:"sensor.temp",state:"-7",attributes:{unit_of_measurement:"°C"}},"switch.off":{entity_id:"switch.off",state:"off"}};let forecastRequests=0,forecastFailure=false;
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.route("**/api/states*",r=>{
   const params=new URL(r.request().url()).searchParams,attrs=params.getAll("attribute");
   const entries=params.getAll("entity_id").map(id=>states[id]).filter(Boolean).map(entry=>({...entry,attributes:Object.fromEntries(Object.entries(entry.attributes||{}).filter(([key])=>key==="unit_of_measurement" || attrs.includes(`${entry.entity_id}|${key}`)))}));
   return r.fulfill({json:{states:entries}});
  });
  await page.route("**/api/weather-forecasts*",r=>{forecastRequests++;return forecastFailure?r.fulfill({status:503,json:{error:"No daily forecasts"}}):r.fulfill({json:{forecasts:{"weather.home":[{datetime:"2026-10-07T12:00:00Z",temperature:22,templow:12,precipitation_probability:35}]}}});});
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#weather-lcd svg")?.getAttribute("aria-label")?.includes("18.6 °C"));assert.ok(forecastRequests>0);
  assert.ok((await page.locator("#weather-lcd svg").getAttribute("aria-label")).includes("35 %"));
  await page.locator("#weather-lcd .industrial-weather").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);assert.equal(await page.locator("#weather-led .widget-dock-point").count(),1);
  await page.locator("#properties [data-property-key='temperatureEntityId']").fill("sensor.temp");await page.waitForFunction(()=>document.querySelector("#weather-lcd svg")?.getAttribute("aria-label")?.includes("-7.0 °C"));
  await page.locator("#properties [data-property-key='width']").first().fill("326");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"162");
  const handle=await page.locator("#weather-lcd .resize-e").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+30,handle.y+handle.height/2);await page.mouse.up();const resized=await page.locator("#weather-lcd").boundingBox();assert.ok(resized.width>326);assert.equal(resized.width,resized.height*2+2);
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#weather-led .industrial-weather")?.dataset.power==="on");const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#wire").evaluate(el=>el.style.visibility="hidden");
  for(const mode of ["lcd","led"]){const box=await page.locator(`#weather-${mode}`).boundingBox();assert.equal(box.width,262);assert.equal(box.height,130);await page.locator(`#weather-${mode}`).screenshot({path:join(folder,`industrial-weather-${mode}.png`)});}
  fixture.pages[0].widgets.find(w=>w.id==="source").state=0;await page.reload();await page.waitForFunction(()=>document.querySelector("#weather-led .industrial-weather")?.dataset.power==="off");assert.equal(await page.locator("#weather-led svg rect").count(),0);
  forecastFailure=true;await page.reload();await page.waitForFunction(()=>document.querySelector("#weather-lcd svg")?.getAttribute("aria-label")?.includes("18.6 °C"));assert.ok((await page.locator("#weather-lcd svg").getAttribute("aria-label")).includes("REGEN --"));
  states["weather.home"].state="unavailable";await page.reload();await page.waitForFunction(()=>document.querySelector("#weather-lcd .industrial-weather")?.dataset.condition==="unknown");assert.ok((await page.locator("#weather-lcd svg").getAttribute("aria-label")).includes("--"));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
