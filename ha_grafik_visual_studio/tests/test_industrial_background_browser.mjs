import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile} from "node:fs/promises";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("all Industrial housings retain defaults or use custom colors independently of display surfaces",{skip:!url},async()=>{
 const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||"playwright");const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER||undefined});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
  const installed=await page.request.post(new URL("api/widget-packages",url).href,{headers:{"X-Package-Name":"ugso.industrial.wg"},data:await readFile(new URL("../packages/industrial/ugso.industrial.wg",import.meta.url))});assert.ok(installed.ok() || /bereits installiert/.test(await installed.text()));
  const packages=await(await page.request.get(new URL("api/widget-packages",url).href)).json(),definitions=packages.packages.find(p=>p.id==="ugso.industrial").widgets;
  const fixture=await(await page.request.get(new URL("api/project",url).href)).json();fixture.settings={...fixture.settings,autoSave:false};fixture.pages[0].widgets=definitions.flatMap((def,i)=>[false,true].map(custom=>({...def.defaults,type:def.type,id:`bg-${i}-${custom}`,x:80+(i%3)*350,y:80+Math.floor(i/3)*250+(custom?100:0),industrialBackgroundEnabled:custom,industrialBackgroundColor:"#563412",height:64})));
  await page.route("**/api/project*",r=>r.fulfill({json:fixture}));await page.goto(url);await page.locator("#bg-0-true .industrial-gauge").waitFor();
  const root=id=>page.locator(`#${id} > .widget-content > div`).first();
  for(let i=0;i<definitions.length;i++){
   assert.equal(await root(`bg-${i}-true`).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(86, 52, 18)");
   assert.equal(await root(`bg-${i}-true`).evaluate(el=>getComputedStyle(el).backgroundImage),"none");
   assert.ok((await root(`bg-${i}-false`).evaluate(el=>getComputedStyle(el).backgroundImage)).includes("linear-gradient"));
  }
  const screen=page.locator("#bg-3-true .industrial-lcd-screen");const screenBefore=await screen.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(screenBefore,"rgb(86, 52, 18)");
  await root("bg-0-true").click({position:{x:30,y:30}});await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  await page.locator("[data-property-key='industrialBackgroundEnabled']").uncheck();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));
  assert.ok((await root("bg-0-true").evaluate(el=>getComputedStyle(el).backgroundImage)).includes("linear-gradient"));assert.equal(await page.locator("[data-property-key='industrialBackgroundColor']").isEnabled(),false);
  await page.locator("[data-property-key='industrialBackgroundEnabled']").check();await page.locator("#properties details").evaluateAll(items=>items.forEach(el=>el.open=true));assert.equal(await page.locator("[data-property-key='industrialBackgroundColor']").isEnabled(),true);
  await page.locator("[data-property-key='industrialStyle']").uncheck();assert.equal(await root("bg-0-true").evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(86, 52, 18)");
  await page.goto(new URL("runtime",url).href);await page.locator("#bg-0-true .industrial-gauge").waitFor();
  for(let i=0;i<definitions.length;i++)assert.equal(await root(`bg-${i}-true`).evaluate(el=>getComputedStyle(el).backgroundColor),"rgb(86, 52, 18)");
  assert.equal(await screen.evaluate(el=>getComputedStyle(el).backgroundColor),screenBefore);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
