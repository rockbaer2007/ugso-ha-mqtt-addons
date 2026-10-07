import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("blank housing supports section sizing, layered controls, housing-only points and runtime",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const install=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(install.ok() || /bereits installiert/.test(await install.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets.find(w=>w.type==="ugso.industrial/section");
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  fixture.pages[0].widgets=[{type:"input-value",id:"control",x:100,y:145,width:110,height:32,state:"42",textColor:"#ffffff",fontSize:18},{...definition.defaults,type:definition.type,id:"blank",x:80,y:100,height:128,sectionCount:"4",housingSnapEnabled:true,housing_top_left:true,housing_top_right:true,housing_bottom_left:true,housing_bottom_right:true,housingSnapAlwaysVisible:true}];
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.goto(url);await page.locator("#blank .industrial-section").waitFor();
  const box=await page.locator("#blank").boundingBox();assert.equal(box.width,518);assert.equal(box.height,128);
  assert.ok(Number(await page.locator("#blank").evaluate(el=>getComputedStyle(el).zIndex))<Number(await page.locator("#control").evaluate(el=>getComputedStyle(el).zIndex)));
  await page.locator("#blank .industrial-section").click({position:{x:490,y:60}});await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal(await page.locator("#properties [data-property-key='dataOutputEnabled']").count(),0);assert.equal(await page.locator("#properties [data-property-key='entityId']").count(),0);assert.equal(await page.locator("#blank .widget-dock-point").count(),0);
  await page.locator("#properties [data-property-key='sectionCount']").selectOption("2");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));assert.equal((await page.locator("#blank").boundingBox()).width,258);
  await page.locator("#properties [data-property-key='sectionRows']").selectOption("4");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));assert.equal((await page.locator("#blank").boundingBox()).height,518);
  await page.locator("#properties [data-property-key='sectionRows']").selectOption("1");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));assert.equal((await page.locator("#blank").boundingBox()).height,128);
  await page.locator("#properties [data-property-key='sectionCount']").selectOption("12");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  await page.locator("#properties [data-property-key='sectionRows']").selectOption("12");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.equal((await page.locator("#blank").boundingBox()).width,1558);assert.equal((await page.locator("#blank").boundingBox()).height,1558);
  await page.locator("#properties [data-property-key='sectionCount']").selectOption("2");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  await page.locator("#properties [data-property-key='sectionRows']").selectOption("1");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  await page.locator("#properties [data-property-key='width']").first().fill("322");assert.equal(await page.locator("#properties [data-property-key='height']").first().inputValue(),"160");
  const handle=await page.locator("#blank .resize-e").boundingBox();await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+40,handle.y+handle.height/2);await page.mouse.up();const resized=await page.locator("#blank").boundingBox();assert.equal(resized.width,resized.height*2+2);
  await page.locator("#properties [data-property-key='industrialScrewsEnabled']").uncheck();assert.equal(await page.locator("#blank .industrial-screw").count(),0);
  await page.goto(new URL("runtime",url).href);await page.locator("#blank .industrial-section").waitFor();
  assert.equal(await page.locator("#blank .industrial-screw").count(),4);
  assert.ok(await page.locator("#control").evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  const folder=process.env.STUDIO_TEST_ARTIFACTS||join(process.env.TEMP,"studio-industrial-artifacts");await mkdir(folder,{recursive:true});await page.locator("#blank").screenshot({path:join(folder,"industrial-blank-panel.png")});assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
