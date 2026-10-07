import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("heating live values, booleans, hiding, independent arrows, raster sizing and runtime",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright"),browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on("pageerror",error=>errors.push(error.message));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),def=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type==="ugso.industrial/heating");assert.ok(def);
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json(),widget={...def.defaults,type:def.type,id:"heating",x:40,y:40};fixture.pages[0].widgets=[widget];fixture.settings={...fixture.settings,autoSave:false};
  const states={};for(const [key,state] of Object.entries({heating:"55",boiler:"65",hot:"60",cold:"20",tank:"65",pump:"on",circulation:"off",burner:"on",alert:"on"})){widget[`${key}EntityId`]=`sensor.${key}`;states[`sensor.${key}`]={entity_id:`sensor.${key}`,state,attributes:{unit_of_measurement:["heating","boiler","hot","cold"].includes(key)?"°C":"%"}};}
  let saved;await page.route("**/api/project*",r=>{if(r.request().method()==="PUT"){saved=r.request().postDataJSON();return r.fulfill({json:saved});}return r.fulfill({json:fixture});});
  await page.route("**/api/states*",r=>{const ids=new URL(r.request().url()).searchParams.getAll("entity_id");return r.fulfill({json:{states:ids.map(id=>states[id]).filter(Boolean)}});});
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="65");
  assert.match(await page.locator("#heating [data-display='boiler']").textContent(),/65 °C/);assert.equal(await page.locator("#heating [data-display='circulation']").getAttribute("data-state"),"off");assert.equal(await page.locator("#heating [data-display='alert']").getAttribute("data-state"),"on");
  await page.locator("#heating").click({position:{x:15,y:15}});await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);
  await page.locator("#properties [data-property-key='hotColor']").evaluate(input=>{input.value="#12abcd";input.dispatchEvent(new Event("input",{bubbles:true}));});assert.equal(await page.locator("#heating [data-display='hot'] text").last().getAttribute("fill"),"#12abcd");
  await page.locator("#properties [data-property-key='statusLegend']").selectOption("one-zero");await page.waitForFunction(()=>document.querySelector("#heating [data-display='pump']")?.textContent.includes("1"));
  for(const key of ["heating","pump","burner"]){await page.locator(`#properties [data-property-key='${key}Visible']`).uncheck();assert.equal(await page.locator(`#heating [data-display='${key}']`).count(),0);}
  await page.locator("#properties [data-property-key='oilArrow']").uncheck();assert.equal(await page.locator("#heating [data-arrow='oil']").count(),0);assert.equal(await page.locator("#heating [data-arrow='hot']").count(),1);
  await page.locator("#properties [data-property-key='width']").first().fill("394");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"262");
  await page.locator("#save").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("gespeichert"));assert.ok(saved);assert.equal(saved.pages[0].widgets[0].oilArrow,false);
  const handle=await page.locator("#heating .resize-e").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+64,handle.y+handle.height/2);await page.mouse.up();const resized=await page.locator("#heating").boundingBox();assert.ok(resized.width>394);assert.equal((resized.width-10)/6,(resized.height-6)/4);
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="65");
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#heating").screenshot({path:join(folder,"industrial-heating.png")});
  states["sensor.tank"].state="unavailable";states["sensor.pump"].state="unavailable";await page.reload();await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="unknown");assert.equal(await page.locator("#heating [data-display='pump']").getAttribute("data-state"),"unknown");assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
