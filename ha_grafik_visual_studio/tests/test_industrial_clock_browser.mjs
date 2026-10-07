import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("clock modes resize, tick, blink, retain focus, show colors and obey entity/port power",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1450,height:1000}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.clock.install({time:new Date("2026-10-07T12:34:56Z")});await page.clock.pauseAt(new Date("2026-10-07T12:34:56Z"));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type==="ugso.industrial/clock");
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  const displays=["nixie","led","lcd"].map((mode,i)=>({...definition.defaults,type:definition.type,id:`clock-${mode}`,x:80,y:100+i*170,clockMode:mode,height:mode==="nixie"?128:64,clockZone:"UTC",clockLedColor:"#42a5f5"}));
  displays[1].displayInputEnabled=true;displays[1].displayEntityId="switch.power";displays[1].dockAlwaysVisible=true;
  displays[2].displayEntityId="switch.power";
  fixture.pages[0].widgets=[...displays,{id:"power",type:"red-number",x:680,y:300,width:64,height:64,state:1,dataOutputEnabled:true},{id:"wire",type:"svg-connection",startWidgetId:"power",startAnchor:"right-center",endWidgetId:"clock-led",endAnchor:"display-power"}];
  const powerState={entity_id:"switch.power",state:"on"};
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.route("**/api/states*",r=>r.fulfill({json:{states:[powerState]}}));
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#clock-nixie .industrial-clock")?.dataset.time==="12:34:56");
  await page.locator("#clock-nixie .industrial-clock").click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#clock-led .widget-dock-point").count(),1);assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);
  await page.locator("#properties [data-property-key='clockMode']").selectOption("led");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"64");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"262");
  await page.locator("#properties [data-property-key='clockSeconds']").uncheck();assert.equal(await page.locator("#clock-nixie .industrial-clock").getAttribute("data-time"),"12:34");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"196");
  await page.locator("#properties [data-property-key='height']").first().fill("80");assert.equal(await page.locator("#properties [data-property-key='width']").first().inputValue(),"244");
  await page.locator("#properties [data-property-key='clockMode']").selectOption("nixie");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"160");
  const handle=await page.locator("#clock-nixie .resize-e").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+30,handle.y+handle.height/2);await page.mouse.up();
  const resized=await page.locator("#clock-nixie").boundingBox();assert.ok(resized.height>160);assert.equal(resized.width,resized.height*3+4);
  const input=page.locator("#properties [data-property-key='height']").first();await input.focus();await page.clock.runFor(1000);assert.equal(await input.evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator("#clock-nixie .clock-colon.lit").count(),0);
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#clock-nixie .industrial-clock")?.dataset.time==="12:34:57");
  await page.clock.runFor(1000);assert.equal(await page.locator("#clock-nixie .industrial-clock").getAttribute("data-time"),"12:34:58");
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#wire").evaluate(el=>el.style.visibility="hidden");
  for(const mode of ["nixie","led","lcd"]){const box=await page.locator(`#clock-${mode}`).boundingBox();assert.equal(box.width,mode==="nixie"?518:262);assert.equal(box.height,mode==="nixie"?128:64);await page.locator(`#clock-${mode}`).screenshot({path:join(folder,`industrial-clock-${mode}.png`)});}
  assert.equal(await page.locator("#clock-nixie .clock-tube").count(),6);assert.equal(await page.locator("#clock-led .clock-digit").count(),6);assert.equal(await page.locator("#clock-led .clock-colon.lit").count(),2);
  powerState.state="off";await page.reload();await page.waitForFunction(()=>document.querySelector("#clock-lcd .industrial-clock")?.dataset.power==="off");assert.equal(await page.locator("#clock-lcd .lit").count(),0);assert.equal(await page.locator("#clock-led .industrial-clock").getAttribute("data-power"),"on");
  fixture.pages[0].widgets.find(w=>w.id==="power").state=0;await page.reload();await page.waitForFunction(()=>document.querySelector("#clock-led .industrial-clock")?.dataset.power==="off");assert.equal(await page.locator("#clock-led .lit").count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
