import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const url=process.env.STUDIO_INDUSTRIAL_TEST_URL;
test("housing radius, corner flags, settings color and dragging work in the editor",{skip:!url},async()=>{
  const require=createRequire(import.meta.url);const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
  const browser=await chromium.launch({headless:true,channel:process.env.STUDIO_THEME_BROWSER || undefined});
  try {
    const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
    const packages=await(await context.request.get(new URL("api/widget-packages",url).href)).json();
    const definition=packages.packages.find(p=>p.id==="ugso.industrial").widgets[0];
    let fixture=await(await context.request.get(new URL("api/project",url).href)).json();
    const base={...definition.defaults,type:definition.type,width:128,height:128,housingSnapEnabled:true,housing_top_left:true,housing_top_right:true,housing_bottom_left:true,housing_bottom_right:true,housingSnapAlwaysVisible:true,radius:12};
    fixture.pages[0].widgets=[{...base,id:"left",x:24,y:24},{...base,id:"right",x:170,y:28}];
    fixture.settings={...fixture.settings,autoSave:false,housingSnapColor:"#c792ea"};
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.route("**/api/project*",async route=>{
      if(route.request().method()==="PUT") fixture=route.request().postDataJSON();
      await route.fulfill({json:fixture});
    });
    await page.goto(url);await page.locator("#left .industrial-gauge").waitFor();
    assert.equal(await page.locator("#left .housing-snap-point").count(),4);
    assert.equal(await page.locator("#left .industrial-gauge").evaluate(el=>getComputedStyle(el).borderRadius),"12px");
    await page.locator("#settings-menu").click();
    await page.locator("#settings-housing-snap-color").fill("#ff8800");await page.locator("#settings-save").click();
    assert.equal(fixture.settings.housingSnapColor,"#ff8800");
    await page.waitForFunction(()=>getComputedStyle(document.querySelector("#left .housing-snap-point")).borderColor==="rgb(255, 136, 0)");
    assert.equal(await page.locator("#left .housing-snap-point").first().evaluate(el=>getComputedStyle(el).borderColor),"rgb(255, 136, 0)");
    const left=await page.locator("#left").boundingBox(),right=await page.locator("#right").boundingBox();
    await page.mouse.move(right.x+right.width/2,right.y+right.height/2);await page.mouse.down();
    await page.mouse.move(left.x+left.width+5+right.width/2,left.y+2+right.height/2,{steps:8});await page.mouse.up();
    const snapped=await page.locator("#right").boundingBox();
    assert.ok(Math.abs(snapped.x-left.x-left.width-2)<.1);assert.ok(Math.abs(snapped.y-left.y)<.1);
    assert.ok((await page.locator("#properties").textContent()).includes("Gehäuse-Snappunkte"));
    await page.goto(new URL("runtime",url).href);await page.locator("#left .industrial-gauge").waitFor();
    assert.equal(await page.locator(".housing-snap-point").count(),0);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});
