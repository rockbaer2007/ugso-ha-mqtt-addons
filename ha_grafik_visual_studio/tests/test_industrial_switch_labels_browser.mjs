import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("toggle and rocker custom state texts survive saving and Boolean switching",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const installed=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(installed.ok() || /bereits installiert/.test(await installed.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  let fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};
  fixture.pages[0].widgets=["switch","rocker-switch"].map((type,i)=>{const def=definitions.find(w=>w.type===`ugso.industrial/${type}`);return {...def.defaults,id:type,type:def.type,x:80+i*350,y:100,height:128,switchCount:2,label1:"Pumpe",label2:"Temperatur",switchLegend2:"custom",switchOffText2:"Kalt",switchOnText2:"Warm"};});
  await page.route("**/api/project*",r=>{if(r.request().method()==="PUT")fixture=r.request().postDataJSON();return r.fulfill({json:fixture});});
  await page.goto(url);await page.locator("#switch .industrial-switch").waitFor();
  for(const id of ["switch","rocker-switch"]){
   await page.locator(`#${id} .industrial-switch-caption`).first().click();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
   await page.locator("[data-property-key='switchLegend1']").selectOption("custom");await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
   await page.locator("[data-property-key='switchOffText1']").fill("1");await page.locator("[data-property-key='switchOnText1']").fill("2");
   assert.equal(await page.locator(`#${id} [data-channel='1'] button`).getAttribute("data-off-label"),"1");
   assert.equal(await page.locator(`#${id} [data-channel='2'] button`).getAttribute("data-on-label"),"Warm");
  }
  await page.locator("#save").click();await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("gespeichert"));
  for(const widget of fixture.pages[0].widgets){assert.equal(widget.switchLegend1,"custom");assert.equal(widget.switchOffText1,"1");assert.equal(widget.switchOnText1,"2");}
  await page.goto(new URL("runtime",url).href);await page.locator("#switch .industrial-switch").waitFor();
  for(const id of ["switch","rocker-switch"]){
   const button=page.locator(`#${id} [data-channel='1'] button`);assert.equal(await button.getAttribute("aria-checked"),"false");assert.equal(await button.getAttribute("title"),"Pumpe: 1");
   await button.click();await page.waitForFunction(id=>document.querySelector(`#${id} [data-channel='1'] button`)?.getAttribute("aria-checked")==="true",id);
   assert.equal(await button.getAttribute("title"),"Pumpe: 2");assert.equal(await button.getAttribute("data-on-label"),"2");
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
