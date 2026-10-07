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
  const states={};for(const [key,state] of Object.entries({heating:"55",boiler:"65",hot:"60",cold:"20",return:"40",tank:"65",pump:"on",circulation:"off",burner:"on",alert:"on"})){widget[`${key}EntityId`]=`sensor.${key}`;states[`sensor.${key}`]={entity_id:`sensor.${key}`,state,attributes:{unit_of_measurement:["heating","boiler","hot","cold","return"].includes(key)?"°C":"%"}};}
  let saved;await page.route("**/api/project*",r=>{if(r.request().method()==="PUT"){saved=r.request().postDataJSON();return r.fulfill({json:saved});}return r.fulfill({json:fixture});});
  await page.route("**/api/states*",r=>{const ids=new URL(r.request().url()).searchParams.getAll("entity_id");return r.fulfill({json:{states:ids.map(id=>states[id]).filter(Boolean)}});});
  await page.goto(url);await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="65");
  const art=page.locator("#heating image[data-heating-art='reference']");assert.equal(await art.count(),1);assert.ok((await page.request.get(await art.getAttribute("href"))).ok());
  const aligned=()=>page.locator("#heating svg").evaluate(svg=>{const matrix=el=>{const m=el.getScreenCTM();return [m.a,m.b,m.c,m.d,m.e,m.f];};const expected=matrix(svg.querySelector("image"));return [...svg.querySelectorAll("[data-display]")].every(el=>matrix(el).every((value,index)=>Math.abs(value-expected[index])<.001));});
  assert.equal(await aligned(),true,"reference and readings share the same viewport transform");
  assert.match(await art.getAttribute("href"),/heating-system-return\.png/);
  assert.match(await page.locator("#heating [data-display='return']").textContent(),/Rücklauf40 °C/);
  assert.equal(await page.locator("#heating [data-arrow='return']").getAttribute("transform"),"translate(70 721) rotate(0)");
  assert.equal(await page.locator("#heating [data-display='tank'] rect").last().getAttribute("fill"),"#ee78a5");
  assert.match(await page.locator("#heating [data-display='boiler']").textContent(),/65 °C/);assert.equal(await page.locator("#heating [data-display='circulation']").getAttribute("data-state"),"off");assert.equal(await page.locator("#heating [data-display='alert']").getAttribute("data-state"),"on");
  await page.locator("#heating").click({position:{x:15,y:15}});await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);
  assert.equal(await page.locator("#properties [data-property-key='returnEntityId']").inputValue(),"sensor.return");
  assert.equal(await page.locator("#properties .property-entity-row").filter({has:page.locator("[data-property-key='returnEntityId']")}).getByRole("button",{name:"Home-Assistant-Entität auswählen"}).isEnabled(),true);
  await page.locator("#properties [data-property-key='returnColor']").evaluate(input=>{input.value="#abcdef";input.dispatchEvent(new Event("input",{bubbles:true}));});
  assert.equal(await page.locator("#heating [data-display='return'] text").last().getAttribute("fill"),"#abcdef");
  await page.locator("#properties [data-property-key='returnVisible']").uncheck();
  assert.equal(await page.locator("#heating [data-display='return']").count(),0);
  assert.equal(await page.locator("#heating [data-arrow='return']").count(),1);
  await page.locator("#properties [data-property-key='returnVisible']").check();
  await page.locator("#properties [data-property-key='returnArrow']").uncheck();
  assert.equal(await page.locator("#heating [data-arrow='return']").count(),0);
  await page.locator("#properties [data-property-key='returnArrow']").check();
  await page.locator("#properties [data-property-key='tankColor']").evaluate(input=>{input.value="#ed9829";input.dispatchEvent(new Event("input",{bubbles:true}));});
  assert.equal(await page.locator("#heating [data-display='tank'] rect").last().getAttribute("fill"),"#ed9829","custom orange remains selectable after migration");
  await page.locator("#properties [data-property-key='tankColor']").evaluate(input=>{input.value="#ee78a5";input.dispatchEvent(new Event("input",{bubbles:true}));});
  await page.locator("#properties [data-property-key='hotColor']").evaluate(input=>{input.value="#12abcd";input.dispatchEvent(new Event("input",{bubbles:true}));});assert.equal(await page.locator("#heating [data-display='hot'] text").last().getAttribute("fill"),"#12abcd");
  await page.locator("#properties [data-property-key='statusLegend']").selectOption("one-zero");await page.waitForFunction(()=>document.querySelector("#heating [data-display='pump']")?.textContent.includes("1"));
  for(const key of ["heating","pump","burner"]){await page.locator(`#properties [data-property-key='${key}Visible']`).uncheck();assert.equal(await page.locator(`#heating [data-display='${key}']`).count(),0);}
  await page.locator("#properties [data-property-key='oilArrow']").uncheck();assert.equal(await page.locator("#heating [data-arrow='oil']").count(),0);assert.equal(await page.locator("#heating [data-arrow='hot']").count(),1);
  await page.locator("#properties [data-property-key='width']").first().fill("460");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"262");
  await page.locator("#save").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("gespeichert"));assert.ok(saved);assert.equal(saved.pages[0].widgets[0].oilArrow,false);
  const handle=await page.locator("#heating .resize-e").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+64,handle.y+handle.height/2);await page.mouse.up();const resized=await page.locator("#heating").boundingBox();assert.ok(resized.width>460);assert.equal((resized.width-12)/7,(resized.height-6)/4);
  assert.equal(await aligned(),true,"readings remain aligned after resizing");
  await page.goto(new URL("runtime",url).href);await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="65");
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#heating").screenshot({path:join(folder,"industrial-heating.png")});
  states["sensor.tank"].state="unavailable";states["sensor.pump"].state="unavailable";await page.reload();await page.waitForFunction(()=>document.querySelector("#heating [data-display='tank']")?.dataset.level==="unknown");assert.equal(await page.locator("#heating [data-display='pump']").getAttribute("data-state"),"unknown");assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
